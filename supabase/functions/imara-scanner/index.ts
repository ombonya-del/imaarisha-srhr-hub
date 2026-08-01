// Imara TV -> Ukweli Learn auto-feed.
// Pulls the latest videos from Imara TV's public YouTube channel RSS every few
// hours and upserts the SRHR-relevant ones into public.ukweli_learn as embedded
// video cards (media_type 'embed'), credited to Imara TV. We only EMBED the
// public YouTube player — nothing is downloaded or rehosted. A title keyword
// filter keeps non-SRHR uploads (films, music, environment clips) out of Learn.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase         = createClient(SUPABASE_URL, SUPABASE_SERVICE)

const CHANNEL_ID = 'UCF59RXwMCGxqH-aEMOseJhg'   // Imara TV
const FEED = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`

// Only auto-add uploads whose title signals SRHR relevance. Curated highlights
// (added by hand in SQL) are unaffected — this filter is just the auto gate.
const SRHR_TERMS = [
  'condom','hiv','aids','arv','sex','sexual','reproductive','contracept','family planning',
  'pregnan','consent','harassment','gender','sti','abortion','menstru','period','puberty',
  'relationship','defilement','fgm','teen','adolescent','uzazi','mimba','ukimwi','ngono',
  'health','srhr','prep','fertility',
]
function isSRHR(title: string): boolean {
  const t = (title || '').toLowerCase()
  return SRHR_TERMS.some(term => t.includes(term))
}

// Map an Imara TV title to one of the six Learn themes (best-effort keywords).
const TOPIC_RULES: [string, string[]][] = [
  ['gbv', ['harass','gbv','gender-based','gender based','rape','defilement','abuse','assault','violence','campusmetoo','sponsor','married too early','she said no']],
  ['hiv', ['hiv','aids','arv',' sti','stis','prep','ukimwi']],
  ['contraception', ['condom','contracept','family planning',' pill','implant','injection','morning after','emergency pill','pregnan','uzazi wa mpango','kondomu']],
  ['consent', ['consent','healthy relationship','relationship','ridhaa']],
  ['rights', ['your rights','the law','legal','haki']],
  ['body', ['puberty','menstru','period','growing up','your body','adolescen','mwili']],
]
function classifyTopic(title: string): string | null {
  const t = (title || '').toLowerCase()
  for (const [cat, ws] of TOPIC_RULES) { if (ws.some(w => t.includes(w))) return cat }
  return null
}

function decode(s: string): string {
  return (s || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'").trim()
}

Deno.serve(async (_req: Request) => {
  try {
    const res = await fetch(FEED, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ImaarishaBot/1.0)', 'Accept': 'application/atom+xml, application/xml, text/xml' },
    })
    if (!res.ok) return json({ ok: false, error: `feed HTTP ${res.status}` }, 200)
    const xml = await res.text()

    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => m[1])
    const rows: any[] = []
    let seen = 0, kept = 0
    for (const e of entries) {
      seen++
      const id = e.match(/<yt:videoId>([\w-]+)<\/yt:videoId>/)?.[1]
      const title = decode(e.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '')
      if (!id || !title) continue
      if (!isSRHR(title)) continue
      kept++
      rows.push({
        ext_id: `imara-${id}`,
        title: title.slice(0, 200),
        topic: classifyTopic(title),
        intro: 'From Imara TV.',
        points: [],
        color: '#00C2A8',
        emoji: '▶',
        language: 'en',
        media_url: `https://www.youtube.com/watch?v=${id}`,
        media_type: 'embed',
        active: true,
        sort_order: 60,
      })
    }

    let upserted = 0
    if (rows.length) {
      // ignoreDuplicates so we never clobber a curated/edited card sharing an ext_id.
      const { error, count } = await supabase
        .from('ukweli_learn')
        .upsert(rows, { onConflict: 'ext_id', ignoreDuplicates: true, count: 'exact' })
      if (error) return json({ ok: false, error: error.message }, 200)
      upserted = count ?? rows.length
    }
    return json({ ok: true, seen, srhr_matched: kept, upserted }, 200)
  } catch (e) {
    return json({ ok: false, error: String((e as any)?.message || e) }, 200)
  }
})

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}
