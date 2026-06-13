// ── Activity email alerts ─────────────────────────────────────────────────────
// Fires on new rows in public.activity_log (via a Supabase Database Webhook) and
// emails the Imaarisha team. Brings back the old "email on new activity" feature;
// recipient is now imaarishasrhr@gmail.com (override with the ALERT_TO secret).
//
// Setup (see supabase/EMAIL-ALERTS.md):
//   1. supabase secrets set RESEND_API_KEY=... ALERT_TO=imaarishasrhr@gmail.com
//   2. supabase functions deploy activity-notify --no-verify-jwt
//   3. Database → Webhooks → new webhook on public.activity_log (INSERT) →
//      HTTP POST to the function URL, header x-webhook-secret = <WEBHOOK_SECRET>

const RESEND_KEY     = Deno.env.get('RESEND_API_KEY') || ''
const ALERT_TO       = Deno.env.get('ALERT_TO') || 'imaarishasrhr@gmail.com'
const ALERT_FROM     = Deno.env.get('ALERT_FROM') || 'Imaarisha Hub <onboarding@resend.dev>'
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') || ''
const HUB_URL        = Deno.env.get('HUB_URL') || 'https://hub.imaarishasrhr.org'

const esc = (s: string) => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok', { status: 200 })

  // Optional shared-secret check (set WEBHOOK_SECRET + matching webhook header)
  if (WEBHOOK_SECRET && req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return new Response('forbidden', { status: 403 })
  }

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch { /* ignore */ }
  const rec: Record<string, unknown> = (body.record || body.new || body) as Record<string, unknown>

  const desc  = String(rec.description || 'New activity on the Imaarisha Collective Hub')
  const kind  = String(rec.activity_type || 'activity')
  const title = rec.entity_title ? ` — ${rec.entity_title}` : ''
  const when  = String(rec.created_at || new Date().toISOString())

  if (!RESEND_KEY) {
    return new Response(JSON.stringify({ skipped: 'RESEND_API_KEY not set' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  const html = `
    <div style="font-family:'Nunito Sans',Arial,sans-serif;max-width:520px;margin:0 auto;padding:8px">
      <div style="height:4px;border-radius:4px;background:linear-gradient(90deg,#E8B14B,#3E9B4F,#E2552F)"></div>
      <h2 style="font-family:Georgia,serif;color:#2E3338;margin:18px 0 4px">ImaarishaSRHR Collective Hub</h2>
      <p style="color:#6E7682;font-size:12px;margin:0 0 16px;text-transform:uppercase;letter-spacing:.12em">New ${esc(kind)}</p>
      <div style="background:#F6F4FB;border-left:3px solid #3E9B4F;border-radius:8px;padding:14px 16px">
        <p style="color:#2E3338;font-size:15px;margin:0;line-height:1.5">${esc(desc)}${esc(title)}</p>
        <p style="color:#8A8597;font-size:12px;margin:8px 0 0">${esc(when)}</p>
      </div>
      <p style="margin:18px 0 0"><a href="${HUB_URL}" style="background:linear-gradient(135deg,#E8B14B,#D9822B);color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:10px 18px;border-radius:10px">Open the Hub →</a></p>
      <p style="color:#A8A4B5;font-size:11px;margin:20px 0 0;line-height:1.5">You're receiving this because activity alerts are enabled for the ImaarishaSRHR Hub.</p>
    </div>`

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: ALERT_FROM,
        to: [ALERT_TO],
        subject: `🌱 Imaarisha Hub · ${desc.slice(0, 80)}`,
        html,
      }),
    })
    const out = await r.text()
    return new Response(JSON.stringify({ ok: r.ok, status: r.status, out: out.slice(0, 300) }),
      { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }),
      { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
})
