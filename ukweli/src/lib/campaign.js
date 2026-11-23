// Campaign tracking for the Imaarisha media (videos, podcast clips, toolkit).
//
// Separate from track.js on purpose: the donor indicator needs "watched or
// listened to at least half", which the general usage counts don't measure.
// Same privacy rules: a random id kept on this device (no name, no IP, no
// cookies), and the partner link (?ref=) that track.js already remembers.
// Writes go through log_campaign_event() / submit_campaign_quiz(); the tables
// themselves can't be read from here.

import { useEffect, useRef } from 'react'

const URL_ = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const ls = {
  get: (k) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { localStorage.setItem(k, v) } catch {} },
}
const uuid = () => {
  try { return crypto.randomUUID() } catch {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 3) | 8).toString(16)
    })
  }
}
let memId = null
export function campaignSession() {
  let id = ls.get('imc_sid')
  if (!id) { id = uuid(); ls.set('imc_sid', id) }
  return id || (memId = memId || uuid())
}
const ref = () => ls.get('ukweli_ref')

function rpc(fn, body) {
  if (!URL_ || !KEY) return Promise.reject(new Error('not configured'))
  return fetch(`${URL_}/rest/v1/rpc/${fn}`, {
    method: 'POST', keepalive: true,
    headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${KEY}` },
    body: JSON.stringify(body),
  })
}

const sent = new Set()
// once=true: each milestone counts once per asset per page load
export function campaignEvent(event, assetSlug = null, { once = true, target = null } = {}) {
  const key = event + '|' + (assetSlug || '')
  if (once && sent.has(key)) return
  sent.add(key)
  rpc('log_campaign_event', {
    p_session: campaignSession(), p_event: event, p_asset_slug: assetSlug,
    p_surface: 'ukweli', p_via: ref(), p_share_target: target, p_path: location.hash.slice(0, 200) || '/',
  }).catch(() => {})
}

export function progress(slug, current, duration) {
  if (!duration || duration <= 0 || !(current >= 0)) return
  const p = current / duration
  if (p > 0) campaignEvent('play_start', slug)
  if (p >= 0.25) campaignEvent('progress_25', slug)
  if (p >= 0.5) campaignEvent('progress_50', slug)
  if (p >= 0.75) campaignEvent('progress_75', slug)
  if (p >= 0.95) campaignEvent('complete', slug)
}

// <audio>/<video> element props
export function mediaHandlers(slug, onHalf) {
  return {
    onPlay: () => campaignEvent('play_start', slug),
    onTimeUpdate: (e) => {
      const el = e.currentTarget
      progress(slug, el.currentTime, el.duration)
      if (onHalf && el.duration && el.currentTime / el.duration >= 0.5) onHalf()
    },
    onEnded: () => { campaignEvent('complete', slug); onHalf && onHalf() },
  }
}

// YouTube iframe progress via the IFrame API (iframe src needs enablejsapi=1)
let ytReady = null
function loadYT() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT)
  if (ytReady) return ytReady
  ytReady = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => { prev && prev(); resolve(window.YT) }
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'; s.async = true
    document.head.appendChild(s)
  })
  return ytReady
}
export function useYouTubeProgress(iframeRef, slug, onHalf) {
  const half = useRef(onHalf); half.current = onHalf
  useEffect(() => {
    if (!iframeRef.current) return
    let player, timer, dead = false
    loadYT().then((YT) => {
      if (dead || !iframeRef.current) return
      player = new YT.Player(iframeRef.current, {
        events: {
          onStateChange: (e) => {
            clearInterval(timer)
            if (e.data === 1) {
              campaignEvent('play_start', slug)
              timer = setInterval(() => {
                try {
                  const c = player.getCurrentTime(), d = player.getDuration()
                  progress(slug, c, d)
                  if (d && c / d >= 0.5 && half.current) half.current()
                } catch {}
              }, 2000)
            } else if (e.data === 0) { campaignEvent('complete', slug); half.current && half.current() }
          },
        },
      })
    }).catch(() => {})
    return () => { dead = true; clearInterval(timer); try { player && player.destroy && player.destroy() } catch {} }
  }, [iframeRef, slug])
}

export function shareWhatsApp(slug, text) {
  const u = new URL(window.location.href)
  u.searchParams.delete('ref')
  campaignEvent('share', slug, { once: false, target: 'whatsapp' })
  window.open('https://wa.me/?text=' + encodeURIComponent((text ? text + ' ' : '') + u.toString()), '_blank', 'noopener')
}

// ── Knowledge check ─────────────────────────────────────────────────────────
export const baselineDone = () => ls.get('imc_baseline') === '1'
export const markBaseline = () => ls.set('imc_baseline', '1')

export async function submitQuiz(answers, { language = 'en', assetSlug = null, county = null, ageBand = null, gender = null } = {}) {
  const wave = baselineDone() ? 'post' : 'baseline'
  campaignEvent('quiz_start', assetSlug)
  const r = await rpc('submit_campaign_quiz', {
    p_session: campaignSession(), p_wave: wave, p_answers: answers, p_language: language,
    p_asset_slug: assetSlug, p_via: ref(), p_county: county, p_age_band: ageBand, p_gender: gender,
  })
  const body = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(body.message || 'Not saved')
  if (wave === 'baseline') markBaseline()
  return { ...body, wave }
}
