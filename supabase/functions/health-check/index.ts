import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ── PER-PROJECT CONFIG ────────────────────────────────────────────────────────
const CFG = {
  project: "ImaarishaSRHR",
  to:   "imaarishasrhr@gmail.com",
  from: "alerts@imaarishasrhr.org",               // domain already verified in Resend
  sites: [
    { name: "hub.imaarishasrhr.org",    url: "https://hub.imaarishasrhr.org" },
    { name: "ukweli.imaarishasrhr.org", url: "https://ukweli.imaarishasrhr.org" },
  ],
  // radar_items is the Disinformation Radar feed; scanned_at = when the scanner wrote the row.
  freshness: [ { name: "Radar scan (radar_items)", table: "radar_items", col: "scanned_at", staleHours: 48 } ],
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SERVICE      = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const RESEND       = Deno.env.get("RESEND_API_KEY") ?? ""
const ANTHROPIC    = Deno.env.get("ANTHROPIC_API_KEY") ?? ""
const sb = createClient(SUPABASE_URL, SERVICE)
type Check = { name: string; ok: boolean; detail: string }

const sites = async (): Promise<Check[]> => Promise.all(CFG.sites.map(async (s) => {
  try { const r = await fetch(s.url, { method: "HEAD", signal: AbortSignal.timeout(8000) })
    return { name: s.name, ok: r.ok || r.status === 301 || r.status === 302, detail: `HTTP ${r.status}` } }
  catch (e) { return { name: s.name, ok: false, detail: `unreachable: ${String(e).slice(0, 50)}` } }
}))

const fresh = async (): Promise<Check[]> => Promise.all(CFG.freshness.map(async (f) => {
  try { const { data, error } = await sb.from(f.table).select(f.col).order(f.col, { ascending: false }).limit(1)
    if (error) return { name: f.name, ok: false, detail: `query error: ${error.message}` }
    const ts = (data?.[0] as any)?.[f.col]; if (!ts) return { name: f.name, ok: false, detail: "no rows found" }
    const h = (Date.now() - new Date(ts).getTime()) / 3600000
    return { name: f.name, ok: h < f.staleHours, detail: `last write ${h.toFixed(1)}h ago (alert if > ${f.staleHours}h)` } }
  catch (e) { return { name: f.name, ok: false, detail: String(e).slice(0, 60) } }
}))

const secrets = (): Check[] => [
  { name: "SERVICE_ROLE key",       ok: !!SERVICE,   detail: SERVICE   ? "configured" : "MISSING" },
  { name: "RESEND key (email)",     ok: !!RESEND,    detail: RESEND    ? "configured" : "MISSING" },
  { name: "ANTHROPIC key (scanners)", ok: !!ANTHROPIC, detail: ANTHROPIC ? "configured" : "MISSING — classifier scans will fail" },
]

async function email(checks: Check[]) {
  const fails = checks.filter((c) => !c.ok)
  if (!fails.length) return { sent: false, reason: "all green (alert-only, no email)" }
  if (!RESEND) return { sent: false, reason: "no RESEND_API_KEY" }
  const now = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC"
  const rows = checks.map((c) =>
    `<tr style="background:${c.ok ? "#F0FFF4" : "#FFF0F0"};border-bottom:1px solid #eee">
      <td style="padding:8px 12px;font-size:15px">${c.ok ? "✅" : "❌"}</td>
      <td style="padding:8px 12px;font-weight:600;font-size:13px">${c.name}</td>
      <td style="padding:8px 12px;font-size:12px;color:#555">${c.detail}</td></tr>`).join("")
  const html = `<div style="font-family:system-ui,Arial,sans-serif;max-width:560px;margin:0 auto">
    <h2 style="font-size:18px;color:#0b3b4a;margin:0 0 4px">${CFG.project} — health alert</h2>
    <p style="font-size:12px;color:#888;margin:0 0 12px">${now} · ${fails.length} issue(s) detected</p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:8px;overflow:hidden">${rows}</table>
    <p style="font-size:12px;color:#B3261E;font-weight:600;margin-top:12px">Action needed on the ❌ items above.</p></div>`
  const r = await fetch("https://api.resend.com/emails", { method: "POST",
    headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: `${CFG.project} Health <${CFG.from}>`, to: [CFG.to],
      subject: `⚠️ ${CFG.project} health: ${fails.length} issue(s)`, html }) })
  return { sent: r.ok, reason: r.ok ? `alert emailed to ${CFG.to}` : `resend HTTP ${r.status}` }
}

Deno.serve(async (req) => {
  if (req.method === "GET") return new Response(JSON.stringify({ status: "ok", project: CFG.project }), { headers: { "Content-Type": "application/json" } })
  const checks = [ ...(await sites()), ...(await fresh()), ...secrets() ]
  const em = await email(checks)
  return new Response(JSON.stringify({ project: CFG.project, ok: checks.every((c) => c.ok), checks, email: em }, null, 2),
    { headers: { "Content-Type": "application/json" } })
})
