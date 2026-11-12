// Imara TV -> Ukweli Learn auto-feed.
// Pulls the latest videos from Imara TV's public YouTube channel (RSS, with a
// YouTube Data API fallback) every few
// hours and upserts the SRHR-relevant ones into public.ukweli_learn as embedded
// video cards (media_type 'embed'), credited to Imara TV. We only EMBED the
// public YouTube player — nothing is downloaded or rehosted. A title keyword
// filter keeps non-SRHR uploads (films, music, environment clips) out of Learn.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase         = createClient(SUPABASE_URL, SUPABASE_SERVICE)

const CHANNEL_ID = 'UCF59RXwMCGxqH-aEMOseJhg'   // Imara TV
const UPLOADS_PLAYLIST = 'UU' + CHANNEL_ID.slice(2)  // the channel's "uploads" playlist
// YouTube's RSS endpoint often answers 404/500 to cloud IPs, so we try both RSS
// forms a few times, then fall back to the YouTube Data API if a key is set
// (supabase secrets set YOUTUBE_API_KEY=...). playlistItems.list costs 1 quota unit.
const FEEDS = [
  `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`,
  `https://www.youtube.com/feeds/videos.xml?playlist_id=${UPLOADS_PLAYLIST}`,
]
const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY') || ''
const RSS_ATTEMPTS = 3

type Video = { id: string, title: string }

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function fromRSS(errors: string[]): Promise<Video[] | null> {
  for (let attempt = 1; attempt <= RSS_ATTEMPTS; attempt++) {
    for (const url of FEEDS) {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
            'Accept': 'application/atom+xml, application/xml, text/xml',
          },
        })
        if (!res.ok) { errors.push(`rss ${url.includes('playlist_id') ? 'playlist' : 'channel'} HTTP ${res.status}`); continue }
        const xml = await res.text()
        const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => m[1])
        if (!entries.length) { errors.push('rss: no entries'); continue }
        return entries.map(e => ({
          id: e.match(/<yt:videoId>([\w-]+)<\/yt:videoId>/)?.[1] || '',
          title: decode(e.match(/<title>([\s\S]*?)<\/title>/)?.[1] || ''),
        }))
      } catch (e) {
        errors.push(`rss: ${String((e as any)?.message || e)}`)
      }
    }
    if (attempt < RSS_ATTEMPTS) await sleep(1500 * attempt)
  }
  return null
}

async function fromDataAPI(errors: string[]): Promise<Video[] | null> {
  if (!YOUTUBE_API_KEY) { errors.push('api: YOUTUBE_API_KEY not set'); return null }
  const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=25` +
    `&playlistId=${UPLOADS_PLAYLIST}&key=${encodeURIComponent(YOUTUBE_API_KEY)}`
  try {
    const res = await fetch(url)
    if (!res.ok) {
      const body = await res.text()
      errors.push(`api HTTP ${res.status}: ${body.slice(0, 160)}`)
      return null
    }
    const data = await res.json()
    return (data.items || []).map((it: any) => ({
      id: it?.snippet?.resourceId?.videoId || '',
      title: it?.snippet?.title || '',
    })).filter((v: Video) => v.title !== 'Private video' && v.title !== 'Deleted video')
  } catch (e) {
    errors.push(`api: ${String((e as any)?.message || e)}`)
    return null
  }
}

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

Deno.serve(async (req: Request) => {
  try {
    // POST {"source":"api"} skips RSS, to check the YouTube key works.
    const body = await req.json().catch(() => ({}))
    const forceApi = body?.source === 'api'
    const errors: string[] = []
    let source = 'rss'
    let videos = forceApi ? null : await fromRSS(errors)
    if (!videos) { source = 'api'; videos = await fromDataAPI(errors) }
    if (!videos) return json({ ok: false, error: 'all sources failed', errors }, 200)

    const rows: any[] = []
    let seen = 0, kept = 0
    for (const { id, title } of videos) {
      seen++
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
    return json({ ok: true, source, seen, srhr_matched: kept, upserted, retried: errors }, 200)
  } catch (e) {
    return json({ ok: false, error: String((e as any)?.message || e) }, 200)
  }
})

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}
