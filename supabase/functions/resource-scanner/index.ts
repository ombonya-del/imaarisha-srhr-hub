import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Continuously discovers SRHR knowledge resources (reports, policies, guidelines,
// toolkits, research) from the web and files them into the Exchange as PENDING.
// An admin approves; on approval the hub auto-hosts the PDF as a watermarked file
// (via ingest-resource) when the source is fetchable. Add feeds to FEEDS.
//
// Auth: a hub admin (JWT) OR the scheduled job (x-cron-secret).

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } })

const FEEDS = [
  { url: "https://news.google.com/rss/search?q=Kenya+(reproductive+health+OR+family+planning+OR+SRHR)+(policy+OR+guideline+OR+report+OR+strategy+OR+toolkit)&hl=en-KE&gl=KE&ceid=KE:en", org: "Google News" },
  { url: "https://news.google.com/rss/search?q=Africa+(sexual+reproductive+health+OR+adolescent+health)+(report+OR+guideline+OR+framework+OR+toolkit)&hl=en&gl=KE&ceid=KE:en", org: "Google News" },
  { url: "https://news.google.com/rss/search?q=Kenya+(gender+based+violence+OR+femicide+OR+FGM+OR+HIV)+(report+OR+study+OR+policy+OR+guideline)&hl=en-KE&gl=KE&ceid=KE:en", org: "Google News" },
  { url: "https://reliefweb.int/updates/rss.xml?advanced-search=%28PC131%29", org: "ReliefWeb Kenya" },
]

const REL = ["reproductive", "sexual health", "srhr", "family planning", "contracept", "maternal",
  "adolescent", "hiv", "aids", "abortion", "gender", "fgm", "gbv", "femicide", "youth", "women",
  "girls", "fertility", "hpv", "\bsti\b", "menstrual", "safe motherhood", "srh"]
const DOCWORD = ["policy", "guideline", "report", "strategy", "toolkit", "manual", "framework",
  "assessment", "study", "survey", "research", "review", "estimates", "handbook", "guide", "brief"]
const relevant = (t: string) => {
  const s = (t || "").toLowerCase()
  return REL.some((k) => new RegExp(k).test(s)) && DOCWORD.some((k) => s.includes(k))
}

function classify(t: string): string {
  const s = (t || "").toLowerCase()
  if (/policy|strategy|\bact\b|declaration|charter/.test(s)) return "policy"
  if (/toolkit|manual|handbook|guide\b|guidance/.test(s)) return "toolkit"
  if (/guideline/.test(s)) return "guide"
  if (/study|research|survey|evidence|journal|estimates|assessment/.test(s)) return "research"
  return "report"
}

function pick(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"))
  return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").replace(/<[^>]+>/g, "").trim() : null
}

async function fetchRss(feed: { url: string; org: string }) {
  try {
    const r = await fetch(feed.url, { headers: { "User-Agent": "imaarisha-resource-scanner" }, signal: AbortSignal.timeout(15000) })
    if (!r.ok) return { items: [] as any[], status: r.status }
    const xml = await r.text()
    const blocks = xml.split(/<item[\s>]/i).slice(1)
    const items = blocks.map((b) => {
      const title = pick(b, "title")
      const link = (pick(b, "link") || "").split("<")[0].trim()
      const src = pick(b, "source") || feed.org
      return title && link ? { title, link, org: src, type: classify(title) } : null
    }).filter(Boolean)
    return { items, status: r.status }
  } catch (e) { return { items: [] as any[], status: "err:" + String(e).slice(0, 50) } }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  try {
    const URL_ = Deno.env.get("SUPABASE_URL") ?? "", ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "", SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const svc = createClient(URL_, SERVICE)
    const cronSecret = Deno.env.get("CRON_SECRET") ?? ""
    const cronOk = !!(cronSecret && req.headers.get("x-cron-secret") === cronSecret)
    if (!cronOk) {
      const auth = createClient(URL_, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } })
      const { data: { user } } = await auth.auth.getUser()
      if (!user) return json({ error: "Not signed in" }, 401)
      const { data: prof } = await svc.from("profiles").select("is_admin").eq("id", user.id).single()
      if (!prof?.is_admin) return json({ error: "Admins only" }, 403)
    }

    const debug: Record<string, unknown> = {}
    let all: any[] = []
    for (const f of FEEDS) {
      const res = await fetchRss(f); debug[f.org] = `${res.status}/${res.items.length}`; all = all.concat(res.items)
    }
    const items = all.filter((x) => x.title && x.link && relevant(x.title))

    let inserted = 0
    if (items.length) {
      const links = items.map((x) => x.link)
      const { data: existing } = await svc.from("resources").select("file_url").in("file_url", links)
      const have = new Set((existing || []).map((e: any) => e.file_url))
      for (const it of items) {
        if (have.has(it.link)) continue
        const { error } = await svc.from("resources").insert({
          title: String(it.title).slice(0, 300), type: it.type, source_org: it.org,
          description: null, file_url: it.link, is_restricted: false,
          status: "pending", submitter_name: "Auto · web scan",
        })
        if (!error) { inserted++; have.add(it.link) }
      }
    }
    return json({ scanned: items.length, inserted, before_relevance: all.length, debug })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
