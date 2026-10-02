// turnstile-verify — verify a Cloudflare Turnstile token, then insert a public
// form submission with the service role. Client payloads are sanitised against a
// per-table column whitelist, and status is forced server-side, so a manipulated
// form cannot inject fields (e.g. status:"published").
//
// Deploy:  supabase functions deploy turnstile-verify --project-ref uwxtqyqyrhhxqagaqelg --no-verify-jwt
// Secret:  supabase secrets set TURNSTILE_SECRET=<your-secret> --project-ref uwxtqyqyrhhxqagaqelg
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Only these columns are accepted from the client, per table. Anything else is dropped.
const ALLOWED: Record<string, string[]> = {
  uliza_questions:   ['question', 'language', 'keep_private'],
  fika_suggestions:  ['name', 'county', 'area', 'note', 'language'],
  fika_reviews:      ['facility_id', 'rating', 'attributes', 'comment', 'language'],
  ukweli_submissions:['caption', 'media_url', 'media_type', 'language'],
}
// Tables whose rows must always start as 'pending' (never client-controlled).
const STATUS_PENDING = new Set(['uliza_questions', 'fika_suggestions', 'fika_reviews', 'ukweli_submissions'])

// Uliza private codes: the client generates a random code and keeps it; we store
// only its SHA-256 (hex) so nobody — not even admins — can read the code back.
// Normalisation must match public.uliza_lookup(): uppercase, alphanumerics only.
const normCode = (c: unknown) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
async function sha256hex(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

  try {
    if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405)

    const { token, table, payload } = await req.json().catch(() => ({}))
    if (!token) return json({ ok: false, error: 'Missing verification token.' })
    const cols = ALLOWED[table]
    if (!cols) return json({ ok: false, error: 'Unknown form.' }, 400)

    // 1) Verify the Turnstile token with Cloudflare.
    const secret = Deno.env.get('TURNSTILE_SECRET') || ''
    if (!secret) return json({ ok: false, error: 'Verification is not configured.' }, 500)
    const ip = (req.headers.get('CF-Connecting-IP') || req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    const body = new URLSearchParams({ secret, response: String(token) })
    if (ip) body.set('remoteip', ip)
    const vr = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body })
    const outcome = await vr.json().catch(() => ({ success: false }))
    if (!outcome.success) return json({ ok: false, error: 'Verification failed. Please try again.' })

    // 2) Build a clean row from the whitelist only.
    const row: Record<string, unknown> = {}
    for (const k of cols) if (payload && payload[k] !== undefined) row[k] = payload[k]
    if (STATUS_PENDING.has(table)) row.status = 'pending'
    if (table === 'uliza_questions') {
      const q = String(row.question || '').trim()
      if (q.length < 8 || q.length > 2000) return json({ ok: false, error: 'Please write a question between 8 and 2000 characters.' })
      row.question = q
      row.keep_private = row.keep_private === true
      const code = normCode(payload?.ticket)
      if (code.length >= 10 && code.length <= 32) row.ticket_hash = await sha256hex(code)
    }

    // 3) Insert with the service role (row is already sanitised).
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { error } = await admin.from(table).insert([row])
    if (error) return json({ ok: false, error: error.code === '23505'
      ? 'This looks like a duplicate — it may already have been submitted.'
      : 'Could not save your submission.' })

    return json({ ok: true })
  } catch (_e) {
    return json({ ok: false, error: 'Unexpected error.' }, 500)
  }
})
