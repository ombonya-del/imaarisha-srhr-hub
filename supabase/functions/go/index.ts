// ImaarishaSRHR — tracked-link redirect
// hub.imaarishasrhr.org/go/<code>  →  logs one anonymous click  →  302 to the destination
//
// Deploy:  supabase functions deploy go --no-verify-jwt
// Secrets: supabase secrets set CLICK_SALT_SECRET=<long random string>
//          (optional) FALLBACK_URL=https://ukweli.imaarishasrhr.org
//
// Privacy: the IP address is never stored. A visitor hash is made from
// (secret + today's date + IP + user agent), so the same person counts once
// per day and the hash cannot be linked across days or reversed.

import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const FALLBACK = Deno.env.get("FALLBACK_URL") ?? "https://ukweli.imaarishasrhr.org";
const SALT_SECRET = Deno.env.get("CLICK_SALT_SECRET") ?? "";
const OWN_SITES = /^https:\/\/([a-z0-9-]+\.)?imaarishasrhr\.org(\/|$)/i;
const BOTS = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegrambot|twitterbot|linkedinbot|preview|curl|wget|python|headless/i;

function device(ua: string): string {
  if (!ua) return "unknown";
  if (BOTS.test(ua)) return "bot";          // includes WhatsApp / Facebook link-preview fetchers
  if (/ipad|tablet/i.test(ua)) return "tablet";
  if (/mobi|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}

async function visitorHash(ip: string, ua: string): Promise<string | null> {
  if (!ip || !SALT_SECRET) return null;
  const day = new Date().toISOString().slice(0, 10);
  const data = new TextEncoder().encode(`${SALT_SECRET}|${day}|${ip}|${ua}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function redirect(to: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: to, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer-when-downgrade" },
  });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const code = (url.searchParams.get("c") ?? parts[parts.length - 1] ?? "").toLowerCase();

  if (!/^[a-z0-9][a-z0-9_-]{1,63}$/.test(code) || code === "go") return redirect(FALLBACK);

  const { data: link } = await supabase
    .from("campaign_links")
    .select("code, destination_url, channel, active")
    .eq("code", code)
    .maybeSingle();

  if (!link || !link.active) return redirect(FALLBACK);

  // Our own pages get ?ref=<code> — the same partner-link parameter UkweliSRHR
  // already records — so the visit is attributed on-site.
  // Off-site destinations (YouTube, podcast apps) get standard UTM tags.
  const dest = new URL(link.destination_url);
  if (OWN_SITES.test(link.destination_url)) {
    dest.searchParams.set("ref", link.code);
  } else {
    dest.searchParams.set("utm_source", link.code);
    dest.searchParams.set("utm_medium", link.channel);
    dest.searchParams.set("utm_campaign", "imaarishasrhr");
  }

  const ua = req.headers.get("user-agent") ?? "";
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    req.headers.get("x-real-ip") || "";
  let referrerHost: string | null = null;
  try {
    const ref = req.headers.get("referer");
    if (ref) referrerHost = new URL(ref).host.slice(0, 100);
  } catch { /* ignore malformed referrers */ }

  const row = {
    code: link.code,
    visitor_hash: await visitorHash(ip, ua),
    referrer_host: referrerHost,
    device: device(ua),
    country: (req.headers.get("x-vercel-ip-country") ?? req.headers.get("cf-ipcountry") ?? "").slice(0, 2) || null,
  };

  // Log without making the visitor wait; a logging failure never blocks the redirect.
  const write = supabase.from("campaign_link_clicks").insert(row).then(({ error }) => {
    if (error) console.error("click log failed", error.message);
  });
  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime;
  if (rt?.waitUntil) rt.waitUntil(write); else await write;

  return redirect(dest.toString());
});
