import { describe, it, expect, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { cronRoute } from '../cron-route'

/**
 * The guard on /api/cron/{ingest,recompute,audit,digest}.
 *
 * ⚠️ THE FIRST TEST IS THE WHOLE REASON THIS FILE EXISTS. The original guard
 * read `if (process.env.CRON_SECRET && auth !== ...)`, which is open when the
 * variable is unset — so a deploy that lost the env var turned four routes that
 * hammer third-party ATS providers, rescore every profile and email every user
 * into public buttons, silently and with no failing test anywhere.
 */
const req = (auth?: string) =>
  new NextRequest('https://saaf.test/api/cron/ingest', {
    headers: auth ? { authorization: auth } : {},
  })

const original = process.env.CRON_SECRET
afterEach(() => {
  if (original === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = original
})

describe('cronRoute', () => {
  it('refuses to run at all when CRON_SECRET is unset', async () => {
    delete process.env.CRON_SECRET
    let ran = false
    const res = await cronRoute('ingest', async () => { ran = true })(req('Bearer anything'))
    expect(res.status).toBe(503)
    expect(ran).toBe(false)
  })

  it('refuses when CRON_SECRET is set but empty', async () => {
    process.env.CRON_SECRET = ''
    let ran = false
    const res = await cronRoute('ingest', async () => { ran = true })(req())
    expect(res.status).toBe(503)
    expect(ran).toBe(false)
  })

  it('rejects a wrong bearer token', async () => {
    process.env.CRON_SECRET = 'right'
    let ran = false
    const res = await cronRoute('ingest', async () => { ran = true })(req('Bearer wrong'))
    expect(res.status).toBe(401)
    expect(ran).toBe(false)
  })

  it('rejects a missing authorization header', async () => {
    process.env.CRON_SECRET = 'right'
    const res = await cronRoute('ingest', async () => ({}))(req())
    expect(res.status).toBe(401)
  })

  // The positive control. A guard that denies everything passes every denial
  // test above and ships four crons that never run.
  it('runs with the correct bearer token, and reports the stage', async () => {
    process.env.CRON_SECRET = 'right'
    const res = await cronRoute('ingest', async () => ({ boards: 3 }))(req('Bearer right'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ ok: true, stage: 'ingest', boards: 3 })
  })
})
