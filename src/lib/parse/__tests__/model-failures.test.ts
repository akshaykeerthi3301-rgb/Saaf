import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { callJsonModel, readResumeWithModel, ModelBusyError } from '../llm'

/**
 * QA-26: every model failure returned null with nothing logged, so a failed
 * rewrite could not be diagnosed. Each failure now writes one line — and never
 * the prompt, the résumé or the reply.
 */
const SECRET = 'Priya Iyer grew merchant revenue at Paytm'

const realFetch = globalThis.fetch
let lines: string[] = []

beforeEach(() => {
  process.env.GROQ_API_KEY = 'test'
  delete process.env.GEMINI_API_KEY
  lines = []
  vi.spyOn(console, 'warn').mockImplementation((msg: unknown) => { lines.push(String(msg)) })
})
afterEach(() => {
  globalThis.fetch = realFetch
  vi.restoreAllMocks()
  delete process.env.GROQ_API_KEY
})

const logged = () => lines.filter((l) => l.startsWith('[model] ')).map((l) => JSON.parse(l.slice(8)))

describe('model failures are logged, never silent', () => {
  it('logs an HTTP failure with its status', async () => {
    globalThis.fetch = (async () => new Response('down', { status: 503 })) as typeof fetch
    expect(await callJsonModel({ prompt: SECRET, system: 's', schema: {}, caller: 'rewrite-document' })).toBeNull()
    expect(logged()).toEqual([expect.objectContaining({ caller: 'rewrite-document', provider: 'groq', kind: 'http', status: 503 })])
  })

  it('logs a timeout as a timeout', async () => {
    globalThis.fetch = (async () => { throw new DOMException('timed out', 'TimeoutError') }) as typeof fetch
    await callJsonModel({ prompt: SECRET, system: 's', schema: {}, caller: 'rewrite-bullet' })
    expect(logged()[0]).toMatchObject({ caller: 'rewrite-bullet', kind: 'timeout' })
  })

  it('logs a rate limit and still tells the caller it is busy', async () => {
    globalThis.fetch = (async () => new Response('', { status: 429, headers: { 'retry-after': '30' } })) as typeof fetch
    await expect(callJsonModel({ prompt: SECRET, system: 's', schema: {} })).rejects.toBeInstanceOf(ModelBusyError)
    expect(logged()[0]).toMatchObject({ kind: 'rate-limited', status: 429 })
  })

  it('logs an unreadable reply on the résumé read', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: 'not json at all' } }] }), { status: 200 })) as typeof fetch
    expect(await readResumeWithModel(SECRET)).toBeNull()
    expect(logged()[0]).toMatchObject({ caller: 'parse-resume', kind: 'bad-json' })
  })

  it('logs the provider\'s error code, never its failed generation', async () => {
    // The shape Groq returns when its JSON mode rejects the model's output.
    globalThis.fetch = (async () => new Response(JSON.stringify({
      error: { message: 'Failed to generate JSON.', type: 'invalid_request_error', code: 'json_validate_failed', failed_generation: SECRET },
    }), { status: 400 })) as typeof fetch
    await callJsonModel({ prompt: 'p', system: 's', schema: {}, caller: 'rewrite-document' })
    expect(logged()[0]).toMatchObject({ kind: 'http', status: 400, code: 'json_validate_failed' })
    for (const l of lines) expect(l).not.toContain('Priya')
  })

  it('never writes the prompt, the résumé or the reply into the log', async () => {
    globalThis.fetch = (async () => new Response(SECRET, { status: 500 })) as typeof fetch
    await callJsonModel({ prompt: SECRET, system: SECRET, schema: {} })
    await readResumeWithModel(SECRET)
    expect(lines.length).toBeGreaterThan(0)
    for (const l of lines) expect(l).not.toContain('Priya')
  })
})

describe('the Groq JSON call gives the reply room to finish (TASK-105)', () => {
  it('sends a completion budget large enough for reasoning plus the JSON', async () => {
    let body: { max_completion_tokens?: number; response_format?: { type: string } } | undefined
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      body = JSON.parse(String(init?.body)) as typeof body
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"line":"x"}' } }] }), { status: 200 })
    }) as typeof fetch
    const res = await callJsonModel({ prompt: 'p', system: 's', schema: {} })
    expect(res?.raw).toBe('{"line":"x"}')
    // Below this, gpt-oss's reasoning exhausted the default budget mid-JSON on
    // ~half of whole-document rewrites (400 json_validate_failed).
    expect(body?.max_completion_tokens).toBeGreaterThanOrEqual(8192)
    expect(body?.response_format?.type).toBe('json_object')
  })
})
