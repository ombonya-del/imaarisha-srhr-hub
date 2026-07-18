// SRHR Disinformation Radar — scanner + classifier + Narrative Index
// Adapted from the FemSaidia rss-scanner. Tracks the four disinformation
// typologies from the ImaarishaSRHR Phase 1 research:
//   contraceptive_myth | fertility_abortion | anti_cse | faith_healing
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_KEY    = Deno.env.get('ANTHROPIC_API_KEY') || ''
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase         = createClient(SUPABASE_URL, SUPABASE_SERVICE)

// ── Classifier-down email alert (Resend) — mirrors the FemSaidia safeguard so a
// scoring outage (dead model / depleted Anthropic credits) is caught in hours. If
// RESEND_API_KEY isn't set in this project it just logs and skips.
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const ALERT_TO       = Deno.env.get('RADAR_ALERT_TO')   || 'ombonya@gmail.com'
const ALERT_FROM     = Deno.env.get('RADAR_ALERT_FROM') || 'Imaarisha Radar <alerts@imaarishasrhr.org>'
async function sendClassifierAlert(count: number, err: string): Promise<boolean> {
  if (!RESEND_API_KEY) { console.log('Radar alert skipped — RESEND_API_KEY not set'); return false }
  const esc = (s: string) => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
    <div style="background:#7A1030;padding:16px 22px;border-radius:12px 12px 0 0"><p style="margin:0;color:#fff;font-size:12px;font-weight:800;letter-spacing:.08em">SRHR RADAR CLASSIFIER DOWN</p></div>
    <div style="background:#fff;border:1px solid #e4e4e7;border-top:none;border-radius:0 0 12px 12px;padding:22px">
      <p style="font-size:14px;line-height:1.6;color:#18181b">The Radar could not score <b>${count}</b> new item(s) this run, so it <b>skipped inserting them</b> (no default-scored junk, no floored Narrative Index).</p>
      <pre style="padding:12px;background:#fef2f2;border-radius:8px;font-size:12px;color:#B3261E;white-space:pre-wrap">${esc(err)}</pre>
      <p style="font-size:13px;line-height:1.6;color:#3f3f46">If this is a credit balance error, top up at console.anthropic.com and confirm the ANTHROPIC_API_KEY set on the imaarisha project draws from that account.</p>
    </div></div>`
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: ALERT_FROM, to: [ALERT_TO], subject: `Imaarisha Radar: classifier down (${count} items skipped)`, html }),
    })
    return r.ok
  } catch (e) { console.error('sendClassifierAlert error:', String(e)); return false }
}

function stripHtml(s: string): string {
  return (s || '').replace(/<[^>]*>/g, '')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ').trim()
}

// ── FEEDS — Kenya SRHR discourse across news, social & video ─────────────────
// Structured around the four disinfo typologies. Neutral Google-News queries mostly
// return factual reporting (near-zero disinfo), so each typology gets myth-FRAMED
// queries in English AND Swahili/Sheng. NOTE: Google-News `site:tiktok/youtube` does
// NOT work — it returns opaque news.google redirect links (tagged 'news', not
// embeddable), so those were removed. Real social content now comes from: direct
// YouTube channel RSS (YOUTUBE_CHANNELS below), Reddit search RSS, and admin-curated
// post URLs (hub Admin → Trending). Native TikTok firehose needs a paid API key.

// Kenyan YouTube channels that push SRHR disinfo / faith-healing / anti-CSE content.
// Add channel IDs (YouTube → the channel → About/Share → "Copy channel ID", starts
// "UC…"). These yield real youtube.com URLs — Atom-parsed, embeddable, tagged 'youtube'.
const YOUTUBE_CHANNELS: string[] = [
  // 'UCxxxxxxxxxxxxxxxxxxxxxx',
]

const FEEDS = [
  // Baseline / positive coverage — the index needs healthy content to stay honest
  'https://news.google.com/rss/search?q=Kenya+contraception+family+planning&hl=en-KE&gl=KE&ceid=KE:en',
  'https://news.google.com/rss/search?q=Kenya+reproductive+health+SRHR&hl=en-KE&gl=KE&ceid=KE:en',

  // 1 · Contraceptive myths
  'https://news.google.com/rss/search?q=Kenya+family+planning+side+effects+infertility+OR+barren&hl=en-KE&gl=KE&ceid=KE:en',
  'https://news.google.com/rss/search?q=Kenya+contraceptive+OR+Depo+cancer+OR+infertility+church+OR+pastor&hl=en-KE&gl=KE&ceid=KE:en',
  'https://news.google.com/rss/search?q=uzazi+wa+mpango+madhara+OR+ugumba+Kenya&hl=sw&gl=KE&ceid=KE:sw',

  // 2 · Fertility & abortion fear
  'https://news.google.com/rss/search?q=Kenya+abortion+womb+OR+infertility+OR+regret+danger&hl=en-KE&gl=KE&ceid=KE:en',
  'https://news.google.com/rss/search?q=Kenya+morning+after+pill+OR+emergency+contraception+danger&hl=en-KE&gl=KE&ceid=KE:en',
  'https://news.google.com/rss/search?q=utoaji+mimba+hatari+OR+madhara+Kenya&hl=sw&gl=KE&ceid=KE:sw',

  // 3 · Anti-CSE rhetoric
  'https://news.google.com/rss/search?q=Kenya+sexuality+education+schools+promiscuity+OR+homosexuality+OR+agenda&hl=en-KE&gl=KE&ceid=KE:en',
  'https://news.google.com/rss/search?q=Kenya+CSE+curriculum+parents+OR+church+OR+ban+OR+%22foreign+values%22&hl=en-KE&gl=KE&ceid=KE:en',

  // 4 · Faith-healing claims
  'https://news.google.com/rss/search?q=Kenya+HIV+cured+OR+healed+prayer+OR+miracle+OR+pastor&hl=en-KE&gl=KE&ceid=KE:en',
  'https://news.google.com/rss/search?q=Kenya+%22healed+of+HIV%22+OR+%22stop+taking+ARVs%22+church&hl=en-KE&gl=KE&ceid=KE:en',
  'https://news.google.com/rss/search?q=ukimwi+kuponywa+maombi+OR+muujiza+Kenya&hl=sw&gl=KE&ceid=KE:sw',

  // Direct social feeds — real URLs, platform-tagged & embeddable
  ...YOUTUBE_CHANNELS.map(id => `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`),
  'https://old.reddit.com/r/Kenya/search.rss?q=contraception+OR+abortion+OR+HIV+OR+%22sexuality+education%22&restrict_sr=on&sort=new&limit=25',
  'https://old.reddit.com/r/Nairobi/search.rss?q=family+planning+OR+abortion+OR+HIV+cure&restrict_sr=on&sort=new&limit=25',
]

const KENYA_TERMS = ['kenya','nairobi','mombasa','kisumu','nakuru','narok','homa bay',
  'kiambu','eldoret','kenyan','kenyans','moh','ministry of health']
const SRHR_TERMS = ['contracept','family planning','reproductive','srhr','abortion','hiv',
  'condom','depo','pill','fertility','infertility','sexuality education','cse','teen pregnan',
  'adolescent','maternal','antiretroviral','prep','sti','fgm','faith healing','healed','arv',
  // Swahili / Sheng — where much of the myth framing actually circulates
  'uzazi wa mpango','uzazi','mimba','ukimwi','kondomu','utoaji','ugumba','elimu ya ngono','maombi']

function isKenyaSRHR(title: string, snippet: string): boolean {
  const text = `${title} ${snippet}`.toLowerCase()
  return KENYA_TERMS.some(t => text.includes(t)) && SRHR_TERMS.some(t => text.includes(t))
}

async function fetchFeed(url: string): Promise<any[]> {
  try {
    // Reddit rejects the Googlebot UA (403); a normal browser UA fares better. Google
    // News prefers Googlebot. YouTube/others are happy with either.
    const ua = /reddit\.com/.test(url)
      ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      : 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
    const res = await fetch(url, {
      headers: { 'User-Agent': ua, 'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return []
    const text = await res.text()
    const items: any[] = []
    const itemRx = /<item>([\s\S]*?)<\/item>/g
    let m
    while ((m = itemRx.exec(text)) !== null) {
      const item = m[1]
      const tm = item.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title[^>]*>([\s\S]*?)<\/title>/)
      const title = (tm?.[1] || tm?.[2] || '').trim()
      const dm = item.match(/<description[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description[^>]*>([\s\S]*?)<\/description>/)
      const desc = (dm?.[1] || dm?.[2] || '').trim()
      const linkClean = (item.match(/<link[^>]*>([\s\S]*?)<\/link>/)?.[1]?.trim() || '').replace(/<[^>]+>/g,'').trim()
      const realUrl = linkClean.match(/url=([^&]+)/)?.[1]
      const link = realUrl ? decodeURIComponent(realUrl) : linkClean
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || ''
      const source = item.match(/<source[^>]*>(.*?)<\/source>/)?.[1] || new URL(url).hostname
      const snippet = stripHtml(desc).slice(0, 500)
      if (title) items.push({ source, title, snippet, url: link, pubDate })
    }
    // Atom <entry> feeds (Reddit search.rss, YouTube channel feeds) — RSS <item> parsing
    // above misses these, so handle Atom explicitly.
    const entryRx = /<entry>([\s\S]*?)<\/entry>/g
    while ((m = entryRx.exec(text)) !== null) {
      const item = m[1]
      const tm = item.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title[^>]*>([\s\S]*?)<\/title>/)
      const title = stripHtml((tm?.[1] || tm?.[2] || '').trim())
      const cm = item.match(/<media:description[^>]*>([\s\S]*?)<\/media:description>|<content[^>]*>([\s\S]*?)<\/content>|<summary[^>]*>([\s\S]*?)<\/summary>/)
      const desc = (cm?.[1] || cm?.[2] || cm?.[3] || '').trim()
      const link = (item.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/)?.[1]
                 || item.match(/<link[^>]*href=["']([^"']+)["']/)?.[1] || '').trim()
      const pubDate = item.match(/<published>(.*?)<\/published>/)?.[1] || item.match(/<updated>(.*?)<\/updated>/)?.[1] || ''
      const source = item.match(/<author[^>]*>[\s\S]*?<name>(.*?)<\/name>/)?.[1] || new URL(url).hostname
      const snippet = stripHtml(desc).slice(0, 500)
      if (title) items.push({ source, title, snippet, url: link, pubDate })
    }
    return items
  } catch { return [] }
}

// Tag each item by where it lives so the TikTok/Social Disinfo tab can filter on it.
function platformOf(url: string): string {
  const u = (url || '').toLowerCase()
  if (u.includes('tiktok')) return 'tiktok'
  if (u.includes('youtube') || u.includes('youtu.be')) return 'youtube'
  if (u.includes('reddit')) return 'reddit'
  if (u.includes('facebook') || u.includes('fb.watch')) return 'facebook'
  if (u.includes('twitter.com') || u.includes('x.com')) return 'x'
  if (u.includes('instagram')) return 'instagram'
  return 'news'
}

async function getExistingTitles(): Promise<Set<string>> {
  const since = new Date(Date.now() - 30*24*60*60*1000).toISOString()
  const { data } = await supabase.from('radar_items').select('title').gte('scanned_at', since)
  const set = new Set<string>()
  for (const r of data || []) if (r.title) set.add(r.title.slice(0,80).toLowerCase().trim())
  return set
}

async function classify(articles: any[]): Promise<any[]> {
  if (!articles.length) return []
  const list = articles.map((a,i) => `${i+1}. SOURCE: ${a.source}\nTITLE: ${a.title}\nSNIPPET: ${(a.snippet||'').slice(0,200)}`).join('\n\n')
  const prompt = `You are an SRHR disinformation analyst studying Kenyan media. For each article return a JSON array.

Each object: "index"(1-based), "srhr_relevance"(0-10), "harm_score"(0-10 how misleading/harmful to SRHR), "sentiment"("alarming"|"negative"|"neutral"|"positive"), "is_disinfo"(bool), "typology"(one of "contraceptive_myth"|"fertility_abortion"|"anti_cse"|"faith_healing"|"none"), "languages"(array of "en"|"sw"|"sheng").

TYPOLOGY RULES (from field research):
- contraceptive_myth: claims contraception causes infertility/barrenness/cancer, "Depo makes you barren", pill side-effect scares. harm_score 7-10.
- fertility_abortion: "abortion destroys the womb", termination causes lifelong infertility, anti-abortion fear framed as health fact. harm_score 7-10.
- anti_cse: comprehensive sexuality education framed as promoting promiscuity/homosexuality/"foreign values"/cultural contamination. harm_score 6-9.
- faith_healing: claims HIV/disease cured by divine intervention/prayer, #ScienceBows-type content, miracle-cure testimony replacing medical care. harm_score 8-10, sentiment alarming.
- Affirming, medically-accurate, rights/health-positive content: is_disinfo=false, typology="none", sentiment="positive".

ARTICLES:
${list}

Return ONLY the JSON array.`
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01' },
      body: JSON.stringify({ model:'claude-opus-4-8', max_tokens:2500, messages:[{role:'user',content:prompt}] })
    })
    const data = await res.json()
    // Surface API failures (bad model, depleted credits) instead of silently scoring 0.
    if (!res.ok || !data.content) throw new Error(data?.error?.message || `Anthropic HTTP ${res.status}`)
    const scores = JSON.parse((data.content?.[0]?.text || '[]').replace(/```json|```/g,'').trim())
    return articles.map((a,i) => {
      const s = scores.find((x:any)=>x.index===i+1) || {}
      return { ...a,
        srhr_relevance: s.srhr_relevance ?? 0, harm_score: s.harm_score ?? 0,
        sentiment: s.sentiment ?? 'neutral', is_disinfo: s.is_disinfo ?? false,
        typology: s.typology ?? 'none', languages: s.languages ?? [] }
    })
  } catch (e) {
    console.error('RADAR classify FAILED:', String(e))
    // SAFEGUARD: never fabricate passing scores — that pollutes radar_items and floors the
    // Narrative Index. Tag as failed with 0 relevance so the srhr_relevance>=4 insert filter
    // drops them, and the run logs a loud "classifier down" line.
    return articles.map(a => ({ ...a, _classifyFailed:true, _classifyError:String(e), srhr_relevance:0, harm_score:0, sentiment:'neutral', is_disinfo:false, typology:'none', languages:[] }))
  }
}

async function updateIndex() {
  const since7 = new Date(Date.now() - 7*24*60*60*1000).toISOString()
  const today  = new Date().toISOString().split('T')[0]
  const yest   = new Date(Date.now() - 24*60*60*1000).toISOString().split('T')[0]
  const { data: all } = await supabase.from('radar_items')
    .select('harm_score,sentiment,is_disinfo,typology,srhr_relevance').gte('scanned_at', since7)
  if (!all?.length) return
  const n = all.length
  const disinfo = all.filter((a:any)=>a.is_disinfo).length
  const harmful = all.filter((a:any)=>a.harm_score>=7).length
  const alarming = all.filter((a:any)=>a.sentiment==='alarming'||a.sentiment==='negative').length
  const positive = all.filter((a:any)=>a.sentiment==='positive').length
  // Narrative-harm index: higher = worse environment
  const score = Math.min(100, Math.round((disinfo/n)*40 + (harmful/n)*25 + (alarming/n)*25 - (positive/n)*10 + 10))
  const { data: yd } = await supabase.from('radar_index').select('score').eq('date',yest).single()
  await supabase.from('radar_index').upsert({
    date: today, score, prev_score: yd?.score ?? score, item_count: n,
    positive_share: Math.round((positive/n)*1000)/10,
    disinfo_count: disinfo,
    myth_signals:      all.filter((a:any)=>a.typology==='contraceptive_myth').length,
    fertility_signals: all.filter((a:any)=>a.typology==='fertility_abortion').length,
    cse_signals:       all.filter((a:any)=>a.typology==='anti_cse').length,
    faith_signals:     all.filter((a:any)=>a.typology==='faith_healing').length,
    high_alert: score >= 60, updated_at: new Date().toISOString(),
  }, { onConflict: 'date' })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'GET') return new Response(JSON.stringify({status:'ok'}), {headers:{'Content-Type':'application/json'}})
  try {
    const all: any[] = []
    for (let i = 0; i < FEEDS.length; i += 4) {
      const r = await Promise.all(FEEDS.slice(i, i+4).map(f => fetchFeed(f)))
      r.forEach(items => all.push(...items))
    }
    const seen = new Set<string>()
    const unique = all.filter(a => { if (!a.url||seen.has(a.url)) return false; seen.add(a.url); return true })
    const relevant = unique.filter(a => isKenyaSRHR(a.title, a.snippet||''))
    if (!relevant.length) { await updateIndex(); return new Response(JSON.stringify({success:true,message:'no relevant',total:all.length}),{status:200}) }

    const existing = await getExistingTitles()
    const fresh = relevant.filter(a => !existing.has(a.title.slice(0,80).toLowerCase().trim()))
    if (!fresh.length) { await updateIndex(); return new Response(JSON.stringify({success:true,message:'all stored',relevant:relevant.length,new:0}),{status:200}) }

    const toClassify = fresh.slice(0, 24)
    const classified: any[] = []
    for (let i = 0; i < toClassify.length; i += 8) {
      classified.push(...await classify(toClassify.slice(i, i+8)))
      if (i + 8 < toClassify.length) await new Promise(r => setTimeout(r, 400))
    }
    const classifierFailed = classified.filter(a => a._classifyFailed).length
    if (classifierFailed) {
      console.error(`RADAR CLASSIFIER DOWN — ${classifierFailed} items skipped (not inserted). Check ANTHROPIC_API_KEY credits/model in the imaarisha project.`)
      await sendClassifierAlert(classifierFailed, (classified.find(a => a._classifyError)?._classifyError) || 'AI classifier failed (bad model or depleted Anthropic credits)')
    }
    const toInsert = classified.filter(a => a.srhr_relevance >= 4).map(a => ({
      source_name: a.source, title: stripHtml(a.title), snippet: stripHtml((a.snippet||'').slice(0,500)),
      url: a.url, platform: platformOf(a.url),
      published_at: a.pubDate ? new Date(a.pubDate).toISOString() : null,
      srhr_relevance: a.srhr_relevance, harm_score: a.harm_score, sentiment: a.sentiment,
      typology: a.typology, is_disinfo: a.is_disinfo, languages: a.languages,
      scanned_at: new Date().toISOString(),
    }))
    if (toInsert.length) await supabase.from('radar_items').insert(toInsert)
    await updateIndex()

    return new Response(JSON.stringify({
      success: true, total: all.length, relevant: relevant.length, new: fresh.length,
      inserted: toInsert.length, classifier_failed: classifierFailed, disinfo: toInsert.filter(a=>a.is_disinfo).length,
      typologies: {
        contraceptive_myth: toInsert.filter(a=>a.typology==='contraceptive_myth').length,
        fertility_abortion: toInsert.filter(a=>a.typology==='fertility_abortion').length,
        anti_cse:           toInsert.filter(a=>a.typology==='anti_cse').length,
        faith_healing:      toInsert.filter(a=>a.typology==='faith_healing').length,
      },
    }), {status:200, headers:{'Content-Type':'application/json'}})
  } catch (e: any) {
    return new Response(JSON.stringify({error:String(e)}), {status:500, headers:{'Content-Type':'application/json'}})
  }
})
