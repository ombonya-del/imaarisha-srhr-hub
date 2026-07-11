import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "npm:web-push"

// Admin-gated web-push sender for the Imaarisha hub. The caller must be a hub
// admin (verified from their JWT). Sends a JSON payload { title, body, url, tag }
// to every subscriber in the target group (default 'hub_members'). Dead
// subscriptions (410/404) are pruned.

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
    const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? ""
    const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? ""

    // 1) identify the caller from their bearer token, require hub admin
    const authClient = createClient(URL, ANON, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    })
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return json({ error: "Not signed in" }, 401)

    const svc = createClient(URL, SERVICE)
    const { data: prof } = await svc.from("profiles").select("is_admin").eq("id", user.id).single()
    if (!prof?.is_admin) return json({ error: "Admins only" }, 403)

    // 2) send
    const { title, body, url, tag, group } = await req.json()
    webpush.setVapidDetails("mailto:hub@imaarishasrhr.org", VAPID_PUBLIC, VAPID_PRIVATE)

    let q = svc.from("push_subscriptions").select("*")
    if (group) q = q.eq("subscription_group", group)
    const { data: subs } = await q
    if (!subs || subs.length === 0) return json({ sent: 0, total: 0, message: "No subscribers" })

    const payload = JSON.stringify({
      title: title || "ImaarishaSRHR Hub",
      body: body || "",
      url: url || "/",
      tag: tag || "imaarisha",
    })

    let sent = 0
    for (const s of subs) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 120 })
        sent++
      } catch (e: any) {
        if (e.statusCode === 410 || e.statusCode === 404) await svc.from("push_subscriptions").delete().eq("id", s.id)
      }
    }
    return json({ sent, total: subs.length })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
