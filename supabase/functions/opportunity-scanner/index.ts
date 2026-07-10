import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Auto-discovers SRHR-relevant opportunities and files them into the Opportunity
// Desk as PENDING (an admin approves before they appear). Source: the ReliefWeb
// API (free, structured) — jobs/consultancies and training/conferences filtered
// to Kenya. A relevance keyword pass keeps out unrelated logistics/finance posts.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const sb = createClient(SUPABASE_URL, SERVICE)
const APP = "imaarisha-srhr-hub"

const REL = ["health", "reproductive", "srhr", "gender", "hiv", "family planning",
  "youth", "adolescent", "rights", "sexual", "maternal", "contracept", "abortion",
  "fgm", "gbv", "population", "wash", "nutrition", "fellowship", "scholarship", "hpv"]
const relevant = (t: string) => { const s = (t || "").toLowerCase(); return REL.some(k => s.includes(k)) }

async function reliefweb(resource: string, kind: string) {
  const body = {
    filter: { field: "country", value: "Kenya" },
    fields: { include: ["title", "source.name", "date.closing", "url"] },
    limit: 30,
    sort: ["date.created:desc"],
  }
  try {
    const r = await fetch(`https://api.reliefweb.int/v1/${resource}?appname=${APP}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    })
    if (!r.ok) return []
    const j = await r.json()
    return (j.data || []).map((d: any) => {
      const f = d.fields || {}
      return {
        title: f.title as string,
        org: Array.isArray(f.source) ? (f.source[0]?.name ?? null) : (f.source?.name ?? null),
        deadline: f.date?.closing ? String(f.date.closing).slice(0, 10) : null,
        link: f.url ?? null,
        kind,
      }
    })
  } catch { return [] }
}

serve(async () => {
  try {
    const jobs = await reliefweb("jobs", "consultancy")
    const training = await reliefweb("training", "conference")
    const items = [...jobs, ...training].filter(x => x.title && x.link && relevant(x.title))

    let inserted = 0
    if (items.length) {
      const { data: existing } = await sb.from("opportunities").select("link").in("link", items.map(x => x.link))
      const have = new Set((existing || []).map((e: any) => e.link))
      for (const it of items) {
        if (have.has(it.link)) continue
        const { error } = await sb.from("opportunities").insert({
          title: String(it.title).slice(0, 300), kind: it.kind, org: it.org,
          description: null, deadline: it.deadline, link: it.link,
          status: "pending", submitter_name: "Auto · ReliefWeb",
        })
        if (!error) { inserted++; have.add(it.link) }
      }
    }
    return new Response(JSON.stringify({ scanned: items.length, inserted }),
      { headers: { "Content-Type": "application/json" } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
