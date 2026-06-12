// SRHR Disinformation Radar — scanner + classifier + Narrative Index
// Adapted from the FemSaidia rss-scanner. Tracks the four disinformation
// typologies from the ImaarishaSRHR Phase 1 research:
//   contraceptive_myth | fertility_abortion | anti_cse | faith_healing
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_KEY    = Deno.env.get('ANTHROPIC_API_KEY') || ''
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase         = createClient(SUPABASE_URL, SUPABASE_SERVICE)

function stripHtml(s: string): string {
  return (s || '').replace(/<[^>]*>/g, '')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ').trim()
}

// ── FEEDS — Kenya SRHR discourse across news + video ─────────────────────────
const FEEDS = [
  'https://news.google.com/rss/search?q=Kenya+contraception+family+planning&hl=en-KE&gl=KE&ceid=KE:en',
  'https://news.google.com/rss/search?q=Kenya+reproductive+health+SRHR&hl=en-KE&gl=KE&ceid=KE:en',
  'https://news.google.com/rss/search?q=Kenya+abortion+reproductive+rights&hl=en-KE&gl=KE&ceid=KE:en',
  'https://news.google.com/rss/search?q=Kenya+teenage+pregnancy+adolescent&hl=en-KE&gl=KE&ceid=KE:en',
  'https://news.google.com/rss/search?q=Kenya+HIV+cure+healing+church&hl=en-KE&gl=KE&ceid=KE:en',
  'https://news.google.com/rss/search?q=Kenya+CSE+sexuality+education+schools&hl=en-KE&gl=KE&ceid=KE:en',
  'https://news.google.com/rss/search?q=Kenya+contraceptive+infertility+side+effects&hl=en-KE&gl=KE&ceid=KE:en',
  'https://news.google.com/rss/search?q=Kenya+family+planning+myth+church+pastor&hl=en-KE&gl=KE&ceid=KE:en',
]

const KENYA_TERMS = ['kenya','nairobi','mombasa','kisumu','nakuru','narok','homa bay',
  'kiambu','eldoret','kenyan','kenyans','moh','ministry of health']
const SRHR_TERMS = ['contracept','family planning','reproductive','srhr','abortion','hiv',
  'condom','depo','pill','fertility','infertility','sexuality education','cse','teen pregnan',
  'adolescent','maternal','antiretroviral','prep','sti','fgm','faith healing','healed']

function isKenyaSRHR(title: string, snippet: string): boolean {
  const text = `${title} ${snippet}`.toLowerCase()
  return KENYA_TERMS.some(t => text.includes(t)) && SRHR_TERMS.some(t => text.includes(t))
}

async function fetchFeed(url: string): Promise<any[]> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)', 'Accept': 'application/rss+xml,application/xml' },
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
    return items
  } catch { return [] }
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
      body: JSON.stringify({ model:'claude-opus-4-6', max_tokens:2500, messages:[{role:'user',content:prompt}] })
    })
    const data = await res.json()
    const scores = JSON.parse((data.content?.[0]?.text || '[]').replace(/```json|```/g,'').trim())
    return articles.map((a,i) => {
      const s = scores.find((x:any)=>x.index===i+1) || {}
      return { ...a,
        srhr_relevance: s.srhr_relevance ?? 0, harm_score: s.harm_score ?? 0,
        sentiment: s.sentiment ?? 'neutral', is_disinfo: s.is_disinfo ?? false,
        typology: s.typology ?? 'none', languages: s.languages ?? [] }
    })
  } catch {
    return articles.map(a => ({ ...a, srhr_relevance:5, harm_score:3, sentiment:'neutral', is_disinfo:false, typology:'none', languages:[] }))
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
    const toInsert = classified.filter(a => a.srhr_relevance >= 4).map(a => ({
      source_name: a.source, title: stripHtml(a.title), snippet: stripHtml((a.snippet||'').slice(0,500)),
      url: a.url, platform: a.url?.includes('youtube') ? 'youtube' : 'news',
      published_at: a.pubDate ? new Date(a.pubDate).toISOString() : null,
      srhr_relevance: a.srhr_relevance, harm_score: a.harm_score, sentiment: a.sentiment,
      typology: a.typology, is_disinfo: a.is_disinfo, languages: a.languages,
      scanned_at: new Date().toISOString(),
    }))
    if (toInsert.length) await supabase.from('radar_items').insert(toInsert)
    await updateIndex()

    return new Response(JSON.stringify({
      success: true, total: all.length, relevant: relevant.length, new: fresh.length,
      inserted: toInsert.length, disinfo: toInsert.filter(a=>a.is_disinfo).length,
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
