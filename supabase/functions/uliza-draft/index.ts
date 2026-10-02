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

const SYSTEM = `You are drafting an answer for UkweliSRHR, a Kenyan youth sexual & reproductive health and rights (SRHR) service. A young person (usually 15–24) has asked an anonymous question. Draft the reply a warm, trusted, non-judgmental Kenyan youth-friendly health worker would give.

Answer THE question that was asked:
- Open with the direct answer to their exact question in the first sentence or two. Do not open with praise ("Great question"), a restatement of the question, or a generic introduction.
- Address the specific details they gave (age, method, timing, symptom, situation). Do not drift into a general lecture on the topic.
- If the question is unclear or could mean two things, answer the most likely meaning and briefly cover the other.
- If it needs a clinical exam, test or diagnosis, say exactly what kind of visit or test and why — once, not as a refrain.

Accuracy and safety:
- Medically accurate and in line with Kenya Ministry of Health and WHO guidance. Never guess. Give concrete numbers only when they are well established (e.g. emergency contraception within 72 hours; PEP within 72 hours).
- Kenya context where useful: contraception, HIV testing and counselling are often free and confidential at public facilities and youth-friendly centres. Helplines: One2One 1190 (youth sexual health, free), GBV 1195, Childline 116, Kenya Red Cross 1199 (emotional support), emergency 999/112. Mention only the one that fits.
- For abuse, violence, self-harm, suicidal thoughts or a medical emergency, put the safety step first and keep the tone caring.

Voice:
- Plain, warm, correct grammar. Short sentences. Say "you". Sound like a real person from Kenya, not a pamphlet or a chatbot.
- No shaming, moralising, or assumptions about the asker's gender, relationship or choices.
- Avoid filler and AI-sounding phrases ("It's important to note", "Remember that", "In conclusion", "navigate", "journey", "empower").
- 80–170 words. Plain text only: no markdown, headings, bullet lists or emojis. A few short paragraphs.
- Never invent personal details or address the asker by name.

This is a DRAFT a human professional will check and edit before it is published. Write only the answer text.`

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  try {
    if (!(await callerIsAdmin(req))) { console.error("uliza-draft: caller is not an admin (or no/expired login token)"); return json({ error: "admin only — sign out and back in, and check profiles.is_admin" }, 403) }
    if (!ANTHROPIC_KEY) { console.error("uliza-draft: ANTHROPIC_API_KEY secret is not set"); return json({ error: "ANTHROPIC_API_KEY not set" }, 500) }
    const body = await req.json().catch(() => ({}))
    const question = String(body?.question || "").trim()
    const language = String(body?.language || "en").trim()
    if (!question) return json({ error: "no question" }, 400)

    const LANG_LINE: Record<string, string> = {
      sw: "Write the answer in clear, standard Kiswahili (Kenyan usage), with correct grammar.",
      sheng: "The asker used the Sheng version of the app. Reply in simple, everyday Kenyan English with light, natural Kiswahili/Sheng where it helps — never forced slang, and keep every medical term clear.",
    }
    const langLine = LANG_LINE[language] ? `\n\n${LANG_LINE[language]}` : ""
    // Try the configured model, then fall back, so a retired or unavailable
    // model id never silently breaks drafting. Override with ULIZA_MODEL.
    const models = [Deno.env.get("ULIZA_MODEL"), "claude-opus-5-5", "claude-sonnet-5-5"].filter(Boolean) as string[]
    let lastErr = ""
    for (const model of [...new Set(models)]) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model, max_tokens: 700, system: SYSTEM,
          messages: [{ role: "user", content: `The young person asked:\n"""\n${question}\n"""${langLine}` }],
        }),
      })
      const data = await res.json().catch(() => ({}))
      const draft = (data?.content?.find((b: any) => b.type === "text")?.text || "").trim()
      if (res.ok && draft) { console.log(`uliza-draft: ok via ${model}`); return json({ draft, model }) }
      lastErr = `${model}: ${data?.error?.message || `Anthropic HTTP ${res.status}`}`
      console.error(`uliza-draft: Anthropic ${res.status} — ${lastErr}`)
      // Only fall through to the next model for model-specific problems.
      if (![400, 404, 529].includes(res.status)) break
    }
    return json({ error: lastErr || "No draft returned" }, 502)
  } catch (e) {
    console.error("uliza-draft: crashed —", String(e))
    return json({ error: String(e) }, 500)
  }
})
