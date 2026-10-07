/**
 * Voice input for the feed's search box (F-203, TASK-172): the browser's own
 * speech recognition, no model and no cost on our side. Chrome and Safari offer
 * one; Firefox does not, and there the microphone button is simply not drawn.
 *
 * ⚠️ THE AUDIO LEAVES THE DEVICE — to the browser vendor's speech service, not to
 * Saaf. The button's tooltip says so; Saaf never receives or stores audio, only
 * the text the browser returns, which lands in the box for the candidate to edit
 * before anything is searched.
 */
type RecognitionResult = { 0: { transcript: string }; isFinal: boolean }
type Recognition = {
  lang: string; interimResults: boolean; maxAlternatives: number; continuous: boolean
  onresult: ((e: { results: ArrayLike<RecognitionResult> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void; stop: () => void
}
type Ctor = new () => Recognition

function ctor(root: Record<string, unknown> = globalThis as unknown as Record<string, unknown>): Ctor | null {
  return ((root.SpeechRecognition ?? root.webkitSpeechRecognition) as Ctor | undefined) ?? null
}

export const speechSupported = (root?: Record<string, unknown>) => ctor(root) !== null

const ERRORS: Record<string, string> = {
  'not-allowed': 'The microphone is blocked for this site. Allow it in the browser’s address bar, or type instead.',
  'service-not-allowed': 'The microphone is blocked for this site. Allow it in the browser’s address bar, or type instead.',
  'no-speech': 'I did not hear anything. Try again, or type instead.',
  'audio-capture': 'No microphone was found.',
  network: 'Speech recognition needs a connection.',
}

/** Words for a recognition error code; unknown codes get a plain sentence, never the raw code. */
export const voiceError = (code: string) => ERRORS[code] ?? 'Voice input did not work this time. Type instead.'

/**
 * Listen once. Calls `onText` with the transcript so far (the caller shows it in
 * the box, unsent) and `onEnd` exactly once. Returns a stop function, or null
 * when the browser has no speech recognition.
 */
export function listenOnce(
  { onText, onEnd, onError }: { onText: (text: string) => void; onEnd: () => void; onError: (message: string) => void },
  opts: { lang?: string; root?: Record<string, unknown> } = {},
): (() => void) | null {
  const C = ctor(opts.root)
  if (!C) return null
  const r = new C()
  r.lang = opts.lang ?? 'en-IN'
  r.interimResults = true
  r.continuous = false
  r.maxAlternatives = 1
  let ended = false
  const end = () => { if (!ended) { ended = true; onEnd() } }
  r.onresult = (e) => {
    const text = Array.from(e.results).map((x) => x[0].transcript).join(' ').replace(/\s+/g, ' ').trim()
    if (text) onText(text)
  }
  r.onerror = (e) => { onError(voiceError(e.error)); end() }
  r.onend = end
  try { r.start() } catch { onError(voiceError('')); end(); return null }
  return () => { try { r.stop() } catch { /* already stopped */ } }
}
