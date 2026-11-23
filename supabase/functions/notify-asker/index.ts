// notify-asker — when an anonymous Uliza question is answered, send a privacy-
// safe web-push nudge to whoever asked to be notified for that question. The
// payload carries NO question text and NO code: the asker opens "My questions"
// on their own device (where the code lives) to read the answer.
//
// Called only by the DB trigger public.ukweli_notify_asker(), authenticated by a
// shared secret. Reuses the project's existing VAPID keypair (the same one the
// hub's send-push function uses).
//
// Deploy:  supabase functions deploy notify-asker --project-ref uwxtqyqyrhhxqagaqelg --no-verify-jwt
// Secrets: supabase secrets set ASK_PUSH_WEBHOOK_SECRET=<long random string> --project-ref uwxtqyqyrhhxqagaqelg
//          (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are already set for send-push)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import * as webpushMod from "npm:web-push@3.6.7"
const webpush: any = (webpushMod as any).default ?? webpushMod

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } })

// One privacy-safe message per language. No answer, no question, no code.
const MSG: Record<string, { title: string; body: string }> = {
  en: { title: "Your Ukweli answer is ready 🌿", body: "A health worker has replied. Open “My questions” to read it." },
  sw: { title: "Jibu lako la Ukweli liko tayari 🌿", body: "Mhudumu wa afya amejibu. Fungua “Maswali yangu” kulisoma." },
  sheng: { title: "Jibu yako ya Ukweli iko ready 🌿", body: "Health worker amereply. Fungua “Maswali yangu” uisome." },
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405)

    const secret = Deno.env.get("ASK_PUSH_WEBHOOK_SECRET") ?? ""
    if (!secret || req.headers.get("x-webhook-secret") !== secret) return json({ ok: false, error: "Unauthorized" }, 401)

    const { ticket_hash } = await req.json().catch(() => ({}))
    if (typeof ticket_hash !== "string" || !/^[0-9a-f]{64}$/.test(ticket_hash)) return json({ ok: false, error: "Bad hash" }, 400)

    const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? ""
    const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? ""
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) return json({ ok: false, error: "VAPID not configured" }, 500)
    webpush.setVapidDetails("mailto:hub@imaarishasrhr.org", VAPID_PUBLIC, VAPID_PRIVATE)

    const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    const { data: subs } = await svc.from("ukweli_ask_push").select("*").eq("ticket_hash", ticket_hash).is("notified_at", null)
    if (!subs || subs.length === 0) return json({ ok: true, sent: 0 })

    let sent = 0
    const dead: string[] = []
    for (const s of subs) {
      const m = MSG[s.lang as string] ?? MSG.en
      const payload = JSON.stringify({ title: m.title, body: m.body, url: "/#ask/mine", tag: "ukweli-answer" })
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
        sent++
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) dead.push(s.endpoint)   // gone — prune
      }
    }
    // Mark these as notified so a later edit of the same question doesn't re-nudge.
    await svc.from("ukweli_ask_push").update({ notified_at: new Date().toISOString() }).eq("ticket_hash", ticket_hash).is("notified_at", null)
    if (dead.length) await svc.from("ukweli_ask_push").delete().in("endpoint", dead)

    return json({ ok: true, sent, pruned: dead.length })
  } catch (_e) {
    return json({ ok: false, error: "Unexpected error" }, 500)
  }
})
