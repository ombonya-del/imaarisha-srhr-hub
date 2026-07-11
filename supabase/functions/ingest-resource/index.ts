import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Auto-hosts resource documents as private, watermarked files.
//   • Single:  { resource_id, url? }  → host one resource
//   • Batch:   { all: true, limit? }  → sweep every eligible link-resource
//
// If a link is a direct PDF it's stored as-is. If it's a publication WEB PAGE on a
// known document host, we fetch the page and DISCOVER the real "Download PDF" link
// automatically (citation_pdf_url meta, .pdf hrefs, IRIS bitstream links), so no
// one has to hand-find PDF URLs. Videos, portals, homepages and news articles have
// no downloadable PDF and are simply left as tracked links.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } })

// Domains whose publication pages we trust to auto-discover a PDF from.
const DOC_HOSTS = ["who.int", "iris.who.int", "unfpa.org", "guttmacher.org", "ippf.org",
  "dhsprogram.com", "health.go.ke", "nacc.or.ke", "measureevaluation.org", "unesdoc.unesco.org",
  "ncbi.nlm.nih.gov", "afidep.org", "population.gov.ke", "prb.org"]
// Domains that are never documents (video / social / portals) — skipped in batch.
const SKIP_HOSTS = /youtube\.com|youtu\.be|x\.com|twitter\.com|facebook\.com|tiktok\.com|instagram\.com|drive\.google\.com/i
const isDirectPdf = (u: string) => /\.pdf(\?|#|$)/i.test(u)
const UA = "Mozilla/5.0 (compatible; ImaarishaBot/1.0)"

function looksPdf(ct: string, buf: Uint8Array) {
  return ct.includes("pdf") || (buf.length > 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46)
}

// Pull candidate PDF URLs out of an HTML page.
function pdfCandidates(html: string, base: string): string[] {
  const found = new Set<string>()
  const meta = html.match(/<meta[^>]+(?:citation_pdf_url|og:pdf)[^>]+content=["']([^"']+)["']/i)
  if (meta) found.add(meta[1])
  const re = /href=["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const h = m[1]
    if (isDirectPdf(h) || /\/bitstreams\/[^"']+\/content/i.test(h) || /download=true/i.test(h) || /\/pdf\//i.test(h)) found.add(h)
  }
  return [...found].map((h) => { try { return new URL(h, base).href } catch { return "" } }).filter(Boolean)
}

async function fetchBytes(url: string): Promise<{ bytes?: Uint8Array; ct?: string; status?: number; err?: string }> {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow", signal: AbortSignal.timeout(45000) })
    if (!r.ok) return { status: r.status, err: `HTTP ${r.status}` }
    const ct = (r.headers.get("content-type") || "").toLowerCase()
    const bytes = new Uint8Array(await r.arrayBuffer())
    return { bytes, ct }
  } catch (e) { return { err: `reach: ${String(e).slice(0, 60)}` } }
}

// Resolve a source URL to actual PDF bytes (direct, or discovered from its page).
async function resolvePdf(src: string): Promise<{ bytes?: Uint8Array; err?: string }> {
  const first = await fetchBytes(src)
  if (first.err) return { err: first.err }
  if (looksPdf(first.ct!, first.bytes!)) return { bytes: first.bytes }
  // Not a PDF. If it's an HTML page on a trusted doc host, discover the PDF link.
  let host = ""
  try { host = new URL(src).hostname.replace(/^www\./, "") } catch { /* ignore */ }
  if (!DOC_HOSTS.some((h) => host.endsWith(h))) return { err: "not a PDF (web page)" }
  const html = new TextDecoder().decode(first.bytes!)
  for (const cand of pdfCandidates(html, src).slice(0, 6)) {
    const got = await fetchBytes(cand)
    if (!got.err && got.bytes && looksPdf(got.ct!, got.bytes)) return { bytes: got.bytes }
  }
  return { err: "no PDF found on the page" }
}

async function ingestOne(svc: any, resource: { id: string; title: string; file_url: string | null }, urlOverride?: string) {
  const src = String(urlOverride || resource.file_url || "").trim()
  if (!src) return { ok: false, error: "No source URL" }
  const { bytes, err } = await resolvePdf(src)
  if (err || !bytes) return { ok: false, error: err || "could not fetch" }
  if (bytes.length > 60 * 1048576) return { ok: false, error: "over 60 MB" }
  const safe = String(resource.title || "resource").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60)
  const path = `ingested/${resource.id}/${Date.now()}-${safe}.pdf`
  const { error: upErr } = await svc.storage.from("resources").upload(path, bytes, { contentType: "application/pdf", upsert: true })
  if (upErr) return { ok: false, error: "upload: " + upErr.message }
  const sizeH = bytes.length < 1048576 ? Math.max(1, Math.round(bytes.length / 1024)) + " KB" : (bytes.length / 1048576).toFixed(1) + " MB"
  const { error: updErr } = await svc.from("resources").update({ file_path: path, file_url: null, file_type: "PDF", file_size: sizeH }).eq("id", resource.id)
  if (updErr) return { ok: false, error: "db: " + updErr.message }
  return { ok: true, size: sizeH }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  try {
    const URL_ = Deno.env.get("SUPABASE_URL") ?? ""
    const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

    const body = await req.json().catch(() => ({}))
    const svc = createClient(URL_, SERVICE)

    // Access: either an admin (JWT) or the scheduled job (shared CRON_SECRET).
    const cronSecret = Deno.env.get("CRON_SECRET") ?? ""
    const cronOk = !!(cronSecret && req.headers.get("x-cron-secret") === cronSecret)
    if (!cronOk) {
      const authClient = createClient(URL_, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } })
      const { data: { user } } = await authClient.auth.getUser()
      if (!user) return json({ error: "Not signed in" }, 401)
      const { data: prof } = await svc.from("profiles").select("is_admin").eq("id", user.id).single()
      if (!prof?.is_admin) return json({ error: "Admins only" }, 403)
    }

    // ── Batch: sweep eligible link-resources (capped per run; call until remaining=0)
    if (body?.all) {
      const limit = Math.min(Math.max(1, body.limit ?? 4), 6)
      const { data: rows } = await svc.from("resources").select("id, title, file_url, file_path")
        .is("file_path", null).not("file_url", "is", null).eq("status", "approved").order("title")
      const eligible = (rows ?? []).filter((r: any) =>
        r.file_url && !SKIP_HOSTS.test(r.file_url) && (isDirectPdf(r.file_url) || DOC_HOSTS.some((h) => { try { return new URL(r.file_url).hostname.replace(/^www\./, "").endsWith(h) } catch { return false } })))
      const slice = eligible.slice(0, limit)
      const results = []
      for (const r of slice) results.push({ title: String(r.title).slice(0, 46), ...(await ingestOne(svc, r)) })
      return json({ processed: slice.length, remaining: eligible.length - slice.length,
        hosted: results.filter((x) => x.ok).length, results })
    }

    // ── Single
    const { data: res } = await svc.from("resources").select("id, title, file_url").eq("id", body.resource_id).single()
    if (!res) return json({ ok: false, error: "Resource not found" })
    return json(await ingestOne(svc, res, body.url))
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
