// ── Optional photo with a question ────────────────────────────────────────────
// Privacy-first: the image is redrawn on a canvas before upload, which strips
// ALL metadata (EXIF: GPS location, phone model, time taken) and shrinks it.
// It goes to a PRIVATE bucket that only admins can read, and the admin app
// deletes it as soon as the question is answered or hidden.
const MAX_SIDE = 1600

export async function cleanPhoto(file) {
  if (!file || !/^image\//.test(file.type)) throw new Error('not-image')
  let bmp
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }) }
  catch {
    // Older browsers: fall back to an <img> element
    const url = URL.createObjectURL(file)
    bmp = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url })
  }
  const w0 = bmp.width, h0 = bmp.height
  const k = Math.min(1, MAX_SIDE / Math.max(w0, h0))
  const c = document.createElement('canvas')
  c.width = Math.round(w0 * k); c.height = Math.round(h0 * k)
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.82))
  if (!blob) throw new Error('encode-failed')
  return blob
}

export async function uploadPhoto(sb, blob) {
  const id = (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2))
  const path = `q/${id}.jpg`
  const { error } = await sb.storage.from('uliza-photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  return path
}

// Speech-to-text for people who'd rather talk than type. Uses the browser's own
// speech service (on most Android phones that is Google's), so we say so plainly.
export function speechSupported() {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}
export function startDictation(lang, onText, onEnd) {
  const R = window.SpeechRecognition || window.webkitSpeechRecognition
  const r = new R()
  r.lang = lang === 'sw' ? 'sw-KE' : 'en-KE'
  r.interimResults = false
  r.continuous = true
  r.onresult = (e) => {
    let t = ''
    for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) t += e.results[i][0].transcript
    if (t) onText(t.trim())
  }
  r.onerror = () => onEnd()
  r.onend = () => onEnd()
  r.start()
  return () => { try { r.stop() } catch {} }
}
