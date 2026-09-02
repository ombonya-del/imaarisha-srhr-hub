import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Auto-discovers SRHR-relevant opportunities from several sources and files them
// into the Opportunity Desk as PENDING (an admin approves before they appear).
//
// Sources:
//   • ReliefWeb API — jobs/consultancies + training/conferences (structured)
//   • RSS aggregators — OpportunitiesForAfricans, OpportunityDesk, FundsforNGOs, Google News
//
// Each NEW candidate is enriched by Claude in one batch call, which extracts the
// REAL funder/host, type, amount, eligibility, deadline and a one-line summary —
// so the Opportunity card shows the same structured fields as the Mazingira hub,
// instead of the feed/aggregator name. If the AI step is unavailable the row is
// still filed, but with the aggregator name dropped (org left blank) rather than
// shown as the funder.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? ""
const sb = createClient(SUPABASE_URL, SERVICE)
const APP = "imaarisha-srhr-hub"
const MAX_ENRICH = 30   // bound the batch AI call per run

// isAggregator: the feed name is NOT the funder — never store it as the host.
const RSS_FEEDS = [
  { url: "https://www.opportunitiesforafricans.com/feed/", org: "OpportunitiesForAfricans", isAggregator: true },
  { url: "https://opportunitydesk.org/feed/", org: "OpportunityDesk", isAggregator: true },
  { url: "https://www2.fundsforngos.org/feed/", org: "FundsforNGOs", isAggregator: true },
  { url: "https://news.google.com/rss/search?q=Africa+%22call+for+proposals%22+(reproductive+OR+gender+OR+health+OR+youth)&hl=en", org: "Google News", isAggregator: true },
]

const AGG = new Set(RSS_FEEDS.filter(f => f.isAggregator).map(f => f.org))

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
const stripHtml = (s: string | null) => (s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()

async function fetchRss(feed: { url: string; org: string; isAggregator: boolean }) {
  try {
    const r = await fetch(feed.url, { headers: { "User-Agent": "imaarisha-opportunity-scanner" }, signal: AbortSignal.timeout(15000) })
    if (!r.ok) return { items: [] as any[], status: r.status }
    const xml = await r.text()
    const blocks = xml.split(/<item[\s>]/i).slice(1)
    const items = blocks.map(b => {
      const title = pick(b, "title")
      const link = (pick(b, "link") || "").split("<")[0].trim()
      const summary = stripHtml(pick(b, "description")).slice(0, 500)
      return title && link ? { title, link, org: feed.org, isAggregator: feed.isAggregator, kind: classify(title), deadline: null, summary } : null
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
        // ReliefWeb "source" is the posting organisation — a real host, not an aggregator.
        org: Array.isArray(f.source) ? (f.source[0]?.name ?? null) : null, isAggregator: false,
        deadline: f.date?.closing ? String(f.date.closing).slice(0, 10) : null, kind, summary: "",
      }
    })
    return { items, status: r.status }
  } catch (e) { return { items: [] as any[], status: "err:" + String(e).slice(0, 60) } }
}

const isoDate = (s: any) => (typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.trim())) ? s.trim() : null

// Batch-enrich new candidates: one Claude call returns structured fields per item.
async function enrich(cands: any[]) {
  if (!ANTHROPIC_KEY || !cands.length) return cands.map(c => ({ ...c, _enriched: false }))
  const list = cands.map((c, i) =>
    `${i + 1}. TITLE: ${c.title}\n   SOURCE-FEED: ${c.org}${c.summary ? `\n   BLURB: ${c.summary}` : ""}`).join("\n")
  const prompt = `You are curating SRHR (sexual & reproductive health and rights) and gender/GBV funding opportunities for a Kenyan coalition. For each item below, extract structured facts from the title and blurb ONLY (do not invent). Judge relevance to SRHR/gender in Africa (Kenya-eligible: Kenya, East/pan-African, or global calls open to Kenyans).

Return ONLY a JSON array, one object per item:
[{"index":1,"relevant":true,"opp_type":"grant|fellowship|scholarship|consultancy|conference|award|accelerator|job|other","funder":"the funding/hosting organisation or null if not stated — NEVER the news feed or aggregator","amount":"e.g. USD 25,000 or 'Fully funded' or null","eligibility":"who can apply, e.g. 'Kenya / East Africa' or 'Global' or null","deadline":"YYYY-MM-DD or null","summary":"one plain sentence, max 22 words"}]

Rules: funder must be the actual grant-maker/host — if the title only names a news outlet or aggregator, set funder to null. Set relevant=false for listicles, roundups, generic news, or anything not a real open call. deadline MUST be YYYY-MM-DD or null (never words).

ITEMS:
${list}

Return ONLY the JSON array.`
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-opus-4-8", max_tokens: 4000, messages: [{ role: "user", content: prompt }] }),
    })
    const data = await res.json()
    if (!res.ok || !data.content) throw new Error(data?.error?.message || `Anthropic HTTP ${res.status}`)
    const rows = JSON.parse((data.content?.[0]?.text || "[]").replace(/```json|```/g, "").trim())
    return cands.map((c, i) => {
      const e = rows.find((x: any) => x.index === i + 1) || {}
      return {
        ...c, _enriched: true,
        relevant: e.relevant !== false,
        kind: e.opp_type || c.kind,
        // real funder wins; else keep a non-aggregator feed name; else null
        org: (e.funder && String(e.funder).trim()) || (c.isAggregator ? null : c.org) || null,
        amount: (e.amount && String(e.amount).trim()) || null,
        eligibility: (e.eligibility && String(e.eligibility).trim()) || null,
        deadline: isoDate(e.deadline) || c.deadline || null,
        description: (e.summary && String(e.summary).trim()) || null,
      }
    })
  } catch (err) {
    console.error("OPP enrich FAILED:", String(err))
    // Fallback: still file the row, but never show the aggregator as the funder.
    return cands.map(c => ({ ...c, _enriched: false, relevant: true,
      org: c.isAggregator ? null : c.org, amount: null, eligibility: null, description: c.summary || null }))
  }
}

// Is the caller an admin? Scheduled runs pass the service key as bearer (allowed);
// a member-triggered call passes their JWT, which we resolve to profiles.is_admin.
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

// One-time / on-demand: re-enrich EXISTING pending opportunities that came in thin
// (aggregator or blank funder, or missing amount/eligibility). Additive — only fills
// gaps and replaces an aggregator funder; never wipes good data an admin has entered.
async function reenrich(req: Request) {
  if (!(await callerIsAdmin(req)))
    return new Response(JSON.stringify({ error: "admin only" }), { status: 403, headers: { "Content-Type": "application/json" } })

  const { data: rows } = await sb.from("opportunities")
    .select("id,title,kind,org,deadline,link,amount,eligibility,description")
    .eq("status", "pending").order("created_at", { ascending: false }).limit(200)
  const thin = (rows || []).filter((o: any) =>
    !o.org || AGG.has(o.org) || !o.amount || !o.eligibility).slice(0, MAX_ENRICH)
  if (!thin.length) return new Response(JSON.stringify({ candidates: 0, updated: 0 }), { headers: { "Content-Type": "application/json" } })

  const cands = thin.map((o: any) => ({ ...o, isAggregator: !o.org || AGG.has(o.org), summary: o.description || "" }))
  const enriched = await enrich(cands)
  let updated = 0
  for (let i = 0; i < enriched.length; i++) {
    const e = enriched[i], orig = thin[i]
    if (!e._enriched) continue
    const patch: Record<string, unknown> = {}
    // Replace funder only when the current one is blank/aggregator and we found a real one.
    if ((!orig.org || AGG.has(orig.org)) && e.org && !AGG.has(e.org)) patch.org = e.org
    if (!orig.amount && e.amount) patch.amount = e.amount
    if (!orig.eligibility && e.eligibility) patch.eligibility = e.eligibility
    if (!orig.deadline && e.deadline) patch.deadline = e.deadline
    if (!orig.description && e.description) patch.description = e.description
    if (e.kind && e.kind !== orig.kind) patch.kind = e.kind
    if (Object.keys(patch).length) {
      const { error } = await sb.from("opportunities").update(patch).eq("id", orig.id)
      if (!error) updated++
    }
  }
  return new Response(JSON.stringify({ candidates: thin.length, updated }), { headers: { "Content-Type": "application/json" } })
}

serve(async (req) => {
  try {
    let body: any = {}
    try { body = await req.json() } catch { /* GET / scheduled run — no body */ }
    if (body?.reenrich) return await reenrich(req)

    const debug: Record<string, unknown> = {}
    let all: any[] = []

    for (const f of RSS_FEEDS) {
      const res = await fetchRss(f); debug[f.org] = `${res.status}/${res.items.length}`; all = all.concat(res.items)
    }
    // ReliefWeb structured sources (jobs + training) — real hosts, real deadlines.
    for (const [resource, kind] of [["jobs", "job"], ["training", "conference"]] as const) {
      const res = await reliefweb(resource, kind); debug["reliefweb:" + resource] = `${res.status}/${res.items.length}`; all = all.concat(res.items)
    }

    const items = all.filter(x => x.title && x.link && relevant(x.title))
    let inserted = 0, enrichedOK = false
    if (items.length) {
      const { data: existing } = await sb.from("opportunities").select("link").in("link", items.map(x => x.link))
      const have = new Set((existing || []).map((e: any) => e.link))
      // Only enrich NEW, unseen candidates (bounded), so the AI call stays cheap.
      const fresh: any[] = []
      for (const it of items) { if (!have.has(it.link)) { fresh.push(it); have.add(it.link) } }
      const toEnrich = fresh.slice(0, MAX_ENRICH)
      const enriched = await enrich(toEnrich)
      enrichedOK = enriched.some((e: any) => e._enriched)
      for (const it of enriched) {
        if (it.relevant === false) continue
        const { error } = await sb.from("opportunities").insert({
          title: String(it.title).slice(0, 300), kind: it.kind, org: it.org,
          description: it.description ?? null, deadline: it.deadline, link: it.link,
          amount: it.amount ?? null, eligibility: it.eligibility ?? null,
          status: "pending", submitter_name: "Auto",
        })
        if (!error) inserted++
      }
    }
    return new Response(JSON.stringify({ scanned: items.length, inserted, enrichedOK, before_relevance: all.length, debug }),
      { headers: { "Content-Type": "application/json" } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
