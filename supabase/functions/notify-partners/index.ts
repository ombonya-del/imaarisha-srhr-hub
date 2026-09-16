import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// notify-partners — admin-gated. Emails matched partner organisations about an
// opportunity / resource / event (via Resend) and, optionally, fires a web-push
// broadcast to members (reusing the existing send-push function). Every send is
// written to public.partner_notifications.
//
// Body: { item_type, item_id, org_ids?: string[], channels?: {email?:bool, push?:bool}, note?: string }
// Deploy: supabase functions deploy notify-partners
// Secrets used: RESEND_API_KEY, (optional) NOTIFY_FROM, HUB_URL

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } })
const esc = (s: string) => (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  try {
    const URL = Deno.env.get("SUPABASE_URL") ?? ""
    const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? ""
    const FROM = Deno.env.get("NOTIFY_FROM") ?? "Imaarisha Hub <onboarding@resend.dev>"
    const HUB_URL = (Deno.env.get("HUB_URL") ?? "https://imaarishasrhr.org").replace(/\/$/, "")
    const authHeader = req.headers.get("Authorization") ?? ""

    // 1) caller must be a hub admin
    const authClient = createClient(URL, ANON, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return json({ error: "Not signed in" }, 401)
    const svc = createClient(URL, SERVICE)
    const { data: prof } = await svc.from("profiles").select("is_admin").eq("id", user.id).single()
    if (!prof?.is_admin) return json({ error: "Admins only" }, 403)

    const { item_type, item_id, org_ids = [], channels = { email: true, push: true }, note = "" } = await req.json()
    if (!["opportunity", "resource", "event"].includes(item_type) || !item_id)
      return json({ error: "Bad request" }, 400)

    // 2) load the item
    const table = item_type === "opportunity" ? "opportunities" : item_type === "resource" ? "resources" : "events"
    const { data: item } = await svc.from(table).select("*").eq("id", item_id).single()
    if (!item) return json({ error: "Item not found" }, 404)

    const title = item.title || "New " + item_type
    const funder = item.org || item.source_org || ""
    const deadline = item.deadline ? new Date(item.deadline).toLocaleDateString() : ""
    const link = item.link || item.file_url || HUB_URL
    const pieces = [
      funder && `From: ${funder}`,
      item.amount && `Value: ${item.amount}`,
      deadline && `Closes: ${deadline}`,
      item.eligibility && `Who can apply: ${item.eligibility}`,
      item.event_date && `Date: ${new Date(item.event_date).toLocaleDateString()}`,
      item.location && `Where: ${item.location}`,
    ].filter(Boolean)
    const summary = item.description ? String(item.description).slice(0, 400) : ""
    const kindLabel = item_type === "opportunity" ? "opportunity" : item_type === "resource" ? "resource" : "event"

    const results: any[] = []
    const logRows: any[] = []

    // 3) email matched partner orgs
    let emailed = 0, failed = 0, skipped = 0
    if (channels.email && org_ids.length) {
      const { data: orgs } = await svc.from("organizations")
        .select("id, name, short_name, contact_email, notify_opt_in").in("id", org_ids)
      for (const o of (orgs || [])) {
        const to = (o.contact_email || "").trim()
        if (!o.notify_opt_in) { skipped++; logRows.push({ item_type, item_id, item_title: title, org_id: o.id, org_name: o.short_name || o.name, channel: "email", status: "skipped", detail: "opted out", sent_by: user.id }); continue }
        if (!to) { skipped++; logRows.push({ item_type, item_id, item_title: title, org_id: o.id, org_name: o.short_name || o.name, channel: "email", status: "skipped", detail: "no contact email", sent_by: user.id }); continue }
        if (!RESEND_KEY) { failed++; logRows.push({ item_type, item_id, item_title: title, org_id: o.id, org_name: o.short_name || o.name, channel: "email", status: "failed", detail: "RESEND_API_KEY not set", sent_by: user.id }); continue }
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#2E3338">
            <p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#D99A26;font-weight:800;margin:0 0 6px">New SRHR ${esc(kindLabel)} · ImaarishaSRHR</p>
            <h2 style="margin:0 0 8px;color:#2E3338">${esc(title)}</h2>
            ${note ? `<p style="margin:0 0 10px;color:#6E7682">${esc(note)}</p>` : ""}
            ${pieces.length ? `<p style="margin:0 0 10px;font-size:14px">${pieces.map((p: string) => esc(p)).join(" &middot; ")}</p>` : ""}
            ${summary ? `<p style="margin:0 0 14px;line-height:1.6;font-size:14px">${esc(summary)}</p>` : ""}
            <p style="margin:0 0 18px"><a href="${esc(link)}" style="background:#D99A26;color:#171204;text-decoration:none;font-weight:800;padding:10px 18px;border-radius:8px;display:inline-block">View / apply &rarr;</a></p>
            <p style="font-size:12px;color:#6E7682;margin:0">Shared with ${esc(o.short_name || o.name || "your organisation")} because it matches your focus area. From the ImaarishaSRHR partner network.</p>
          </div>`
        try {
          const r = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ from: FROM, to: [to], subject: `New SRHR ${kindLabel}: ${title}`, html }),
          })
          if (r.ok) { emailed++; logRows.push({ item_type, item_id, item_title: title, org_id: o.id, org_name: o.short_name || o.name, channel: "email", status: "sent", detail: to, sent_by: user.id }) }
          else { failed++; const tx = await r.text(); logRows.push({ item_type, item_id, item_title: title, org_id: o.id, org_name: o.short_name || o.name, channel: "email", status: "failed", detail: tx.slice(0, 180), sent_by: user.id }) }
        } catch (e) { failed++; logRows.push({ item_type, item_id, item_title: title, org_id: o.id, org_name: o.short_name || o.name, channel: "email", status: "failed", detail: String(e).slice(0, 180), sent_by: user.id }) }
      }
    }

    // 4) web-push broadcast to members (reuse the tested send-push function)
    let pushed = false
    if (channels.push) {
      try {
        const r = await fetch(`${URL}/functions/v1/send-push`, {
          method: "POST",
          headers: { Authorization: authHeader, apikey: ANON, "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `New SRHR ${kindLabel}`, body: title,
            url: item_type === "event" ? "/#events" : "/#exchange", tag: `notify-${item_type}`, group: "hub_members",
          }),
        })
        pushed = r.ok
        logRows.push({ item_type, item_id, item_title: title, org_id: null, org_name: "hub members", channel: "push", status: r.ok ? "sent" : "failed", detail: r.ok ? "broadcast" : (await r.text()).slice(0, 180), sent_by: user.id })
      } catch (e) {
        logRows.push({ item_type, item_id, item_title: title, org_id: null, org_name: "hub members", channel: "push", status: "failed", detail: String(e).slice(0, 180), sent_by: user.id })
      }
    }

    if (logRows.length) { try { await svc.from("partner_notifications").insert(logRows) } catch (_e) { /* log table optional */ } }

    return json({ ok: true, emailed, failed, skipped, pushed })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
