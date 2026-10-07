import { describe, it, expect } from 'vitest'
import { listenOnce, speechSupported, voiceError } from '../voice-input'

class Fake {
  static last: Fake
  lang = ''; interimResults = false; continuous = true; maxAlternatives = 0
  onresult: ((e: { results: { 0: { transcript: string }; isFinal: boolean }[] }) => void) | null = null
  onerror: ((e: { error: string }) => void) | null = null
  onend: (() => void) | null = null
  started = false; stopped = false
  constructor() { Fake.last = this }
  start() { this.started = true }
  stop() { this.stopped = true }
}
const root = { webkitSpeechRecognition: Fake } as unknown as Record<string, unknown>

describe('voice input', () => {
  it('is unsupported, and returns null, where the browser has no speech recognition', () => {
    expect(speechSupported({})).toBe(false)
    expect(listenOnce({ onText: () => {}, onEnd: () => {}, onError: () => {} }, { root: {} })).toBeNull()
  })

  it('listens once in Indian English and hands the transcript to the box unsent', () => {
    const got: string[] = []
    let ended = 0
    const stop = listenOnce({ onText: (t) => got.push(t), onEnd: () => { ended++ }, onError: () => {} }, { root })
    expect(stop).toBeTypeOf('function')
    expect(Fake.last).toMatchObject({ lang: 'en-IN', interimResults: true, continuous: false, started: true })
    Fake.last.onresult!({ results: [{ 0: { transcript: 'remote  product' }, isFinal: false }, { 0: { transcript: 'manager jobs' }, isFinal: true }] })
    expect(got).toEqual(['remote product manager jobs'])
    Fake.last.onend!(); Fake.last.onend!()
    expect(ended).toBe(1)
    stop!()
    expect(Fake.last.stopped).toBe(true)
  })

  it('reports a blocked microphone in words, never a raw code, and ends exactly once', () => {
    const errs: string[] = []
    let ended = 0
    listenOnce({ onText: () => {}, onEnd: () => { ended++ }, onError: (m) => errs.push(m) }, { root })
    Fake.last.onerror!({ error: 'not-allowed' })
    Fake.last.onend!()
    expect(errs[0]).toMatch(/microphone is blocked/)
    expect(ended).toBe(1)
    expect(voiceError('weird-new-code')).not.toContain('weird-new-code')
  })

  it('ignores an empty transcript', () => {
    const got: string[] = []
    listenOnce({ onText: (t) => got.push(t), onEnd: () => {}, onError: () => {} }, { root })
    Fake.last.onresult!({ results: [{ 0: { transcript: '  ' }, isFinal: false }] })
    expect(got).toEqual([])
  })
})
