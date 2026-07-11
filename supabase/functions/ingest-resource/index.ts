import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Admin-only: fetch a resource's external PDF, store it in the PRIVATE resources
// bucket, and flip the resource to a hosted file. Once hosted it downloads through
// the watermark function (per-member stamp) and short-lived signed URLs — so it's
// gated, trackable and un-shareable. Only real PDFs are accepted; HTML pages and
// other file types are rejected so we never store a "web page" masquerading as a doc.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } })

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  try {
    const URL = Deno.env.get("SUPABASE_URL") ?? ""
    const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

    // 1) require a hub admin
    const authClient = createClient(URL, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } })
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return json({ error: "Not signed in" }, 401)
    const svc = createClient(URL, SERVICE)
    const { data: prof } = await svc.from("profiles").select("is_admin").eq("id", user.id).single()
    if (!prof?.is_admin) return json({ error: "Admins only" }, 403)

    // 2) resolve the source URL. Business errors return 200 with { ok:false }
    //    so the admin UI can show a clear message.
    const { resource_id, url } = await req.json()
    const { data: res } = await svc.from("resources").select("id, title, file_url").eq("id", resource_id).single()
    if (!res) return json({ ok: false, error: "Resource not found" })
    const src = String(url || res.file_url || "").trim()
    if (!src) return json({ ok: false, error: "No source URL to fetch" })

    // 3) fetch it server-side (no CORS limits)
    let r: Response
    try {
      r = await fetch(src, { headers: { "User-Agent": "Mozilla/5.0 (compatible; ImaarishaBot/1.0)" }, redirect: "follow", signal: AbortSignal.timeout(45000) })
    } catch (e) { return json({ ok: false, error: `Could not reach the source: ${String(e).slice(0, 80)}` }) }
    if (!r.ok) return json({ ok: false, error: `Source returned HTTP ${r.status}` })

    const ct = (r.headers.get("content-type") || "").toLowerCase()
    const buf = new Uint8Array(await r.arrayBuffer())
    // must be a real PDF: content-type says so OR the magic bytes are %PDF
    const magicPdf = buf.length > 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46
    if (!ct.includes("pdf") && !magicPdf) {
      return json({ ok: false, error: "That link isn't a direct PDF (it looks like a web page). Paste the actual 'Download PDF' URL.", content_type: ct })
    }
    if (buf.length > 50 * 1048576) return json({ ok: false, error: "File is over 50 MB." })

    // 4) store in the private bucket
    const safe = String(res.title || "resource").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60)
    const path = `ingested/${resource_id}/${Date.now()}-${safe}.pdf`
    const { error: upErr } = await svc.storage.from("resources").upload(path, buf, { contentType: "application/pdf", upsert: true })
    if (upErr) return json({ ok: false, error: "Upload failed: " + upErr.message })

    // 5) flip the resource to a hosted file
    const sizeH = buf.length < 1048576 ? Math.max(1, Math.round(buf.length / 1024)) + " KB" : (buf.length / 1048576).toFixed(1) + " MB"
    const { error: updErr } = await svc.from("resources").update({ file_path: path, file_url: null, file_type: "PDF", file_size: sizeH }).eq("id", resource_id)
    if (updErr) return json({ ok: false, error: "Saved the file but couldn't update the record: " + updErr.message })

    return json({ ok: true, path, size: sizeH })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
