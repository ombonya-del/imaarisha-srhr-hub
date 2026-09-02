import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Uliza answer-drafting: given a young person's anonymous SRHR question, Claude
// drafts an answer that an admin then reviews / edits / approves before it is
// published back to the asker in the Ukweli youth app. The AI never publishes —
// it only proposes a draft. Admin-gated, CORS-enabled for the browser.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? ""
const sb = createClient(SUPABASE_URL, SERVICE)

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } })

async function callerIsAdmin(req: Request): Promise<boolean> {
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim()
  if (!jwt) return false
  if (jwt === SERVICE) return true
  try {
    const { data } = await sb.auth.getUser(jwt)
    const uid = data?.user?.id
    if (!uid) return false
    const { data: p } = await sb.from("profiles").select("is_admin").eq("id", uid).single()
    return !!p?.is_admin
  } catch { return false }
}

const SYSTEM = `You are drafting an answer for UkweliSRHR, a Kenyan youth sexual & reproductive health and rights (SRHR) service. A young person has asked an anonymous question. Draft the answer a warm, trusted, non-judgmental Kenyan health worker would give.

Requirements:
- Medically accurate and evidence-based. Never guess; if the question needs a clinical exam, test, or diagnosis, say so and encourage seeing a health worker or youth-friendly clinic.
- Warm, plain, age-appropriate language a teenager understands. No shaming, no moralising, no assumptions about the asker's choices, gender, or activity.
- Kenya context: mention that services like contraception, HIV testing and counselling are available and often free/confidential at public facilities and youth-friendly centres; refer to a clinic or a helpline for anything urgent.
- Safety: for signs of abuse, violence, self-harm, or a medical emergency, gently urge reaching a trusted adult, a health facility, or emergency help, and keep the tone caring.
- 90–180 words. No markdown, no headings, no lists — just a few short paragraphs of plain text. Do not address the asker by name or invent personal details.
- This is a DRAFT for a human professional to review and edit before it is sent. Write only the answer text.`

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  try {
    if (!(await callerIsAdmin(req))) return json({ error: "admin only" }, 403)
    if (!ANTHROPIC_KEY) return json({ error: "ANTHROPIC_API_KEY not set" }, 500)
    const body = await req.json().catch(() => ({}))
    const question = String(body?.question || "").trim()
    const language = String(body?.language || "en").trim()
    if (!question) return json({ error: "no question" }, 400)

    const langLine = language && language !== "en"
      ? `\n\nThe asker wrote in language code "${language}". Write the answer in that same language.` : ""
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-opus-4-8", max_tokens: 700, system: SYSTEM,
        messages: [{ role: "user", content: `Question: ${question}${langLine}` }],
      }),
    })
    const data = await res.json()
    if (!res.ok || !data.content) return json({ error: data?.error?.message || `Anthropic HTTP ${res.status}` }, 502)
    const draft = (data.content?.[0]?.text || "").trim()
    return json({ draft })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
