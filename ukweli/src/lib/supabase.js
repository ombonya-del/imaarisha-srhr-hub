import { createClient } from '@supabase/supabase-js'

export const sb = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// ── Theme tokens (dark + gold, rhyming with the FemSaidia family) ────────────
export const C = {
  bg:    '#0D1117',
  surf:  '#161C25',
  card:  '#1A2035',
  card2: '#222B42',
  line:  'rgba(255,255,255,0.08)',
  gold:  '#C9A84C',
  goldDim:'rgba(201,168,76,0.15)',
  teal:  '#3D9E8A',
  red:   '#D7574B',
  txt:   '#F0E8D8',
  mut:   '#8892B0',
  serif: "'Cormorant Garamond', serif",
  sans:  "'Nunito Sans', sans-serif",
}

export function esc(s) {
  if (s == null) return ''
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

export function timeAgo(ts) {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff/60000), h = Math.floor(m/60), d = Math.floor(h/24)
  if (m < 60) return m + 'm ago'
  if (h < 24) return h + 'h ago'
  if (d === 1) return 'Yesterday'
  return d + 'd ago'
}

// Feed text often arrives with HTML encoded inside it (&lt;a href…&gt;, &#32;),
// which used to show up as raw code in Trending. Decode → strip tags (twice, for
// double-encoded feeds) → drop Reddit boilerplate, bare links and invisible chars.
const ENT = { amp:'&', lt:'<', gt:'>', quot:'"', apos:"'", nbsp:' ', hellip:'…', mdash:'—', ndash:'–',
  rsquo:'’', lsquo:'‘', rdquo:'”', ldquo:'“', laquo:'«', raquo:'»', copy:'©' }
export function cleanText(s) {
  if (s == null) return ''
  let t = String(s)
  for (let i = 0; i < 2; i++) {
    t = t.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, c) => {
      if (c[0] === '#') {
        const hex = c[1] === 'x' || c[1] === 'X'
        const n = parseInt(hex ? c.slice(2) : c.slice(1), hex ? 16 : 10)
        try { return n > 0 ? String.fromCodePoint(n) : '' } catch { return '' }
      }
      return ENT[c.toLowerCase()] ?? m
    })
    t = t.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]*>/g, ' ')
  }
  return t.replace(/<[^>]*$/, '').replace(/submitted by\s+\/?u\/\S+/gi, '').replace(/\[(link|comments)\]/gi, '')
    .replace(/https?:\/\/\S+/g, '').replace(/[​-‍﻿]/g, '').replace(/\s+/g, ' ').trim()
}
