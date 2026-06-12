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
