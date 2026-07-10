import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Auto-discovers SRHR-relevant opportunities from several sources and files them
// into the Opportunity Desk as PENDING (an admin approves before they appear).
//
// Sources:
//   • ReliefWeb API — jobs/consultancies + training/conferences (structured)
//   • RSS aggregators — OpportunitiesForAfricans, OpportunityDesk, FundsforNGOs
// Add more by dropping a feed URL in RSS_FEEDS.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const sb = createClient(SUPABASE_URL, SERVICE)
const APP = "imaarisha-srhr-hub"

const RSS_FEEDS = [
  { url: "https://www.opportunitiesforafricans.com/feed/", org: "OpportunitiesForAfricans" },
  { url: "https://opportunitydesk.org/feed/", org: "OpportunityDesk" },
  { url: "https://www2.fundsforngos.org/feed/", org: "FundsforNGOs" },
  { url: "https://news.google.com/rss/search?q=Africa+%22call+for+proposals%22+(reproductive+OR+gender+OR+health+OR+youth)&hl=en", org: "Google News" },
]

const QUERY = "reproductive health OR family planning OR sexual health OR gender OR HIV " +
  "OR adolescent OR SRHR OR maternal OR contraception OR scholarship OR fellowship OR youth"

const REL = ["health", "reproductive", "srhr", "gender", "hiv", "family planning",
  "youth", "adolescent", "rights", "sexual", "maternal", "contracept", "abortion",
  "fgm", "gbv", "population", "wash", "nutrition", "fellowship", "scholarship", "hpv",
  "advocacy", "adolescents", "women", "girls"]
const relevant = (t: string) => { const s = (t || "").toLowerCase(); return REL.some(k => s.includes(k)) }

function classify(t: string): string {
  const s = (t || "").toLowerCase()
  if (/scholarship/.test(s)) return "scholarship"
  if (/fellowship/.test(s)) return "fellowship"
  if (/conference|summit|symposium|forum|workshop|webinar/.test(s)) return "conference"
  if (/consultan|tender|request for proposal|\brfp\b|expression of interest|\beoi\b/.test(s)) return "consultancy"
  if (/grant|fund|call for proposal|award/.test(s)) return "funding"
  if (/job|vacancy|position|officer|manager|recruit/.test(s)) return "job"
  return "other"
}

function pick(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"))
  return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").trim() : null
}

async function fetchRss(feed: { url: string; org: string }) {
  try {
    const r = await fetch(feed.url, { headers: { "User-Agent": "imaarisha-opportunity-scanner" }, signal: AbortSignal.timeout(15000) })
    if (!r.ok) return { items: [] as any[], status: r.status }
    const xml = await r.text()
    const blocks = xml.split(/<item[\s>]/i).slice(1)
    const items = blocks.map(b => {
      const title = pick(b, "title")
      const link = (pick(b, "link") || "").split("<")[0].trim()
      return title && link ? { title, link, org: feed.org, kind: classify(title), deadline: null } : null
    }).filter(Boolean)
    return { items, status: r.status }
  } catch (e) { return { items: [] as any[], status: "err:" + String(e).slice(0, 60) } }
}

async function reliefweb(resource: string, kind: string) {
  const body = {
    query: { value: QUERY, operator: "OR" },
    fields: { include: ["title", "source", "date", "url"] },
    limit: 40, sort: ["date.created:desc"],
  }
  try {
    const r = await fetch(`https://api.reliefweb.int/v1/${resource}?appname=${APP}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body), signal: AbortSignal.timeout(20000),
    })
    if (!r.ok) return { items: [] as any[], status: r.status }
    const j = await r.json()
    const items = (j.data || []).map((d: any) => {
      const f = d.fields || {}
      return {
        title: f.title, link: f.url ?? null,
        org: Array.isArray(f.source) ? (f.source[0]?.name ?? "ReliefWeb") : "ReliefWeb",
        deadline: f.date?.closing ? String(f.date.closing).slice(0, 10) : null, kind,
      }
    })
    return { items, status: r.status }
  } catch (e) { return { items: [] as any[], status: "err:" + String(e).slice(0, 60) } }
}

serve(async () => {
  try {
    const debug: Record<string, unknown> = {}
    let all: any[] = []

    for (const f of RSS_FEEDS) {
      const res = await fetchRss(f); debug[f.org] = `${res.status}/${res.items.length}`; all = all.concat(res.items)
    }

    const items = all.filter(x => x.title && x.link && relevant(x.title))
    let inserted = 0
    if (items.length) {
      const { data: existing } = await sb.from("opportunities").select("link").in("link", items.map(x => x.link))
      const have = new Set((existing || []).map((e: any) => e.link))
      for (const it of items) {
        if (have.has(it.link)) continue
        const { error } = await sb.from("opportunities").insert({
          title: String(it.title).slice(0, 300), kind: it.kind, org: it.org,
          description: null, deadline: it.deadline, link: it.link,
          status: "pending", submitter_name: "Auto",
        })
        if (!error) { inserted++; have.add(it.link) }
      }
    }
    return new Response(JSON.stringify({ scanned: items.length, inserted, before_relevance: all.length, debug }),
      { headers: { "Content-Type": "application/json" } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
