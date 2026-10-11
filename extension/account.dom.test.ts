// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import '../extension/autofill.js'
import '../extension/account.js'

/**
 * The account wall. The promise is narrow and tested as a promise: the EMAIL is written, the PASSWORD is never touched —
 * not read, not written, not generated. If a future change makes any password box change value, these fail.
 */
type Account = { kind: (d: Document) => string | null; fillEmail: (d: Document, e: string) => { filled: boolean; focused: boolean; hadEmailBox: boolean } }
let K: Account
beforeAll(() => { K = (globalThis as unknown as { SaafAccount: Account }).SaafAccount })
afterEach(() => { document.body.innerHTML = '' })
const page = (html: string) => { document.body.innerHTML = html; return document }
const $ = (sel: string) => document.querySelector(sel) as HTMLInputElement

describe('account wall', () => {
  it('knows a sign-in form, a create-account form with a confirm box, and a create-account form that says so', () => {
    expect(K.kind(page('<form><input type="email"><input type="password"><button>Sign in</button></form>'))).toBe('login')
    expect(K.kind(page('<form><input type="email"><input type="password"><input type="password"></form>'))).toBe('signup')
    expect(K.kind(page('<form><h2>Create your account</h2><input type="email"><input type="password"></form>'))).toBe('signup')
    expect(K.kind(page('<form><input type="email"><button>Apply</button></form>'))).toBeNull()
  })

  it('writes the email into the email box and leaves every password box empty', () => {
    page('<form><input id="e" type="email" name="email"><input id="p1" type="password"><input id="p2" type="password"></form>')
    const r = K.fillEmail(document, 'priya@example.com')
    expect($('#e').value).toBe('priya@example.com')
    expect($('#p1').value).toBe('')
    expect($('#p2').value).toBe('')
    expect(r).toMatchObject({ filled: true, focused: true, hadEmailBox: true })
    expect(document.activeElement).toBe($('#p1')) // the cursor is left where the browser's own password manager takes over
  })

  it('finds a username-style box, and leaves an email the person already typed alone', () => {
    page('<form><input id="u" name="username"><input type="password"></form>')
    K.fillEmail(document, 'a@b.co')
    expect($('#u').value).toBe('a@b.co')
    page('<form><input id="e" type="email" value="mine@me.co"><input type="password"></form>')
    expect(K.fillEmail(document, 'other@x.co').filled).toBe(false)
    expect($('#e').value).toBe('mine@me.co')
  })

  it('does not fill a hidden password box or a page with none', () => {
    expect(K.kind(page('<form><input type="email"><input type="password" style="display:none"></form>'))).toBeNull()
  })
})
