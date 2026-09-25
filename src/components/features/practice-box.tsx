'use client'

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from 'react'
import { ChevronRight, Loader2, Mic, Sparkles, Square, Volume2 } from 'lucide-react'
import { scorePracticeAnswer, type ScoreAnswerResult } from '@/app/actions/copilot-tools'
import { ScoreRing } from '@/components/ui/score-ring'

/**
 * Mock-interview practice for one question: type an answer, get a score out of
 * ten, what worked, what to change, and a sample answer built only from the
 * candidate's own profile (grounded server-side; [Tags] where we do not know).
 *
 * Collapsed by default so the question list stays readable; the draft survives
 * collapsing, because losing a typed answer to a click is the worst outcome
 * this box can have.
 */
/**
 * Speaking the answer (2026-09-25, Jobright parity). The browser's own Web
 * Speech API — ₹0, no key, no server of ours. Where it is missing (Firefox,
 * most in-app browsers) the controls are not rendered and typing still works.
 *
 * ⚠️ IN CHROME THE AUDIO GOES TO GOOGLE'S SPEECH SERVICE, not to Saaf. The box
 * says so under the mic, because "nothing about your search is shared" is a
 * product guarantee and a silent third party would break it.
 */
type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
}
type RecognitionCtor = new () => Recognition

const noop = () => () => {}

function recognitionCtor(): RecognitionCtor | null {
  const w = globalThis as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function PracticeBox({ roleId, question }: { roleId: string; question: string }) {
  const [open, setOpen] = useState(false)
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<ScoreAnswerResult>()
  const [pending, start] = useTransition()
  // Feature detection that is false on the server and real in the browser,
  // without a hydration mismatch or a setState-in-effect.
  const canSpeak = useSyncExternalStore(noop, () => recognitionCtor() !== null, () => false)
  const canHear = useSyncExternalStore(noop, () => 'speechSynthesis' in window, () => false)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [micNote, setMicNote] = useState<string | null>(null)
  const rec = useRef<Recognition | null>(null)

  useEffect(() => () => rec.current?.stop(), [])

  function toggleMic() {
    if (listening) { rec.current?.stop(); return }
    const Ctor = recognitionCtor()
    if (!Ctor) return
    const r = new Ctor()
    r.lang = 'en-IN'
    r.continuous = true
    r.interimResults = true
    r.onresult = (e) => {
      let finalText = ''
      let pendingText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        if (res.isFinal) finalText += res[0].transcript
        else pendingText += res[0].transcript
      }
      if (finalText) setAnswer((a) => `${a}${a && !/\s$/.test(a) ? ' ' : ''}${finalText.trim()}`)
      setInterim(pendingText)
    }
    r.onerror = (e) => {
      setMicNote(e.error === 'not-allowed' ? 'Microphone access was blocked. Allow it in the address bar, or type instead.' : 'Voice input stopped. Try again, or type instead.')
    }
    r.onend = () => { setListening(false); setInterim('') }
    rec.current = r
    setMicNote(null)
    r.start()
    setListening(true)
  }

  function readQuestion() {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(question)
    u.lang = 'en-IN'
    window.speechSynthesis.speak(u)
  }

  function submit() {
    start(async () => {
      const r = await scorePracticeAnswer({ roleId, question, answer })
        .catch((): ScoreAnswerResult => ({ ok: false, error: 'Check your connection and try again.' }))
      setResult(r)
    })
  }

  return (
    <div className="mt-4 border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent"
      >
        <ChevronRight className={`size-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
        Practise this answer
      </button>

      {open ? (
        <div className="mt-3 space-y-3">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={6}
            placeholder="Answer as you would out loud. Situation, what you did, what came of it."
            aria-label={`Your answer to: ${question}`}
            className="w-full rounded-xl border border-input bg-background p-3 text-sm leading-6 text-primary outline-none focus:border-accent"
          />
          {interim ? <p className="-mt-2 text-xs italic text-muted-foreground" aria-live="polite">{interim}</p> : null}
          {canSpeak || canHear ? (
            <div className="flex flex-wrap items-center gap-2">
              {canHear ? (
                <button
                  type="button"
                  onClick={readQuestion}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-primary"
                >
                  <Volume2 className="size-3.5" /> Hear the question
                </button>
              ) : null}
              {canSpeak ? (
                <button
                  type="button"
                  onClick={toggleMic}
                  aria-pressed={listening}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold ${listening ? 'border-accent text-accent' : 'border-border text-primary'}`}
                >
                  {listening ? <Square className="size-3.5" /> : <Mic className="size-3.5" />}
                  {listening ? 'Stop' : 'Speak your answer'}
                </button>
              ) : null}
              {canSpeak ? (
                <span className="text-[10px] text-muted-foreground">Your browser turns speech into text — in Chrome that is Google&apos;s speech service, not Saaf.</span>
              ) : null}
            </div>
          ) : null}
          {micNote ? <p role="status" className="text-xs text-muted-foreground">{micNote}</p> : null}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={pending || answer.trim().length === 0}
              className="bg-brand-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-50"
            >
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              {pending ? 'Scoring…' : 'Score my answer'}
            </button>
            <span className="text-[11px] text-muted-foreground">{answer.trim().split(/\s+/).filter(Boolean).length} words</span>
          </div>

          {result && !result.ok ? <p className="text-xs text-muted-foreground">{result.error}</p> : null}
          {result?.ok ? (
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center gap-4">
                <ScoreRing score={result.feedback.score * 10} size={64} label={`${result.feedback.score}/10`} />
                <p className="text-xs leading-5 text-muted-foreground">
                  {result.providerLabel
                    ? `Scored by ${result.providerLabel} against the question and this role.`
                    : 'Scored on structure, specificity and relevance — the writing model was unavailable, so there is no sample answer this time.'}
                </p>
              </div>
              {result.feedback.strengths.length ? (
                <div className="mt-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-score-high">What worked</p>
                  <ul className="mt-1 space-y-1 text-sm leading-6 text-primary">
                    {result.feedback.strengths.map((s) => <li key={s}>· {s}</li>)}
                  </ul>
                </div>
              ) : null}
              {result.feedback.improvements.length ? (
                <div className="mt-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-score-mid">Make it stronger</p>
                  <ul className="mt-1 space-y-1 text-sm leading-6 text-primary">
                    {result.feedback.improvements.map((s) => <li key={s}>· {s}</li>)}
                  </ul>
                </div>
              ) : null}
              {result.feedback.modelAnswer ? (
                <details className="mt-3">
                  <summary className="cursor-pointer list-none text-xs font-semibold text-accent">See a sample answer</summary>
                  <p className="mt-2 whitespace-pre-wrap rounded-lg bg-secondary/60 p-3 text-sm leading-6 text-primary">
                    {result.feedback.modelAnswer}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">Built only from your profile. Replace any [Tag] with your own specifics.</p>
                </details>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
