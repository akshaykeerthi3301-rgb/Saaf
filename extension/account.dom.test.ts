// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import '../extension/autofill.js'
import '../extension/account.js'

/**
 * The account wall. The person saves ONE password in the extension; one click then fills their email and that password and
 * presses the site's own button. Two promises stay narrow and are tested as promises: the extension never ticks an agreement
 * box (accepting terms is the person's), and filling the EMAIL never touches a password box. The password values below are
 * test values.
 */
type Account = {
  kind: (d: Document) => string | null
  fillEmail: (d: Document, e: string) => { filled: boolean; hadEmailBox: boolean }
  passwordProblem: (p: string) => string | null
  fillPassword: (d: Document, p: string, k: string) => number
  proceed: (d: Document, k: string) => { pressed: boolean; waitingOn: HTMLElement[]; hadButton: boolean }
}
let K: Account
beforeAll(() => { K = (globalThis as unknown as { SaafAccount: Account }).SaafAccount })
afterEach(() => { document.body.innerHTML = '' })
const page = (html: string) => { document.body.innerHTML = html; return document }
const $ = (sel: string) => document.querySelector(sel) as HTMLInputElement
const TEST_PW = 'Test-Pass-1234!'
/** Count presses of the element matching `sel`. */
const presses = (sel: string) => { const c = { n: 0 }; $(sel).addEventListener('click', () => { c.n++ }); return c }

describe('account wall — what kind of form', () => {
  it('knows a sign-in form, a create-account form with a confirm box, and a create-account form that says so', () => {
    expect(K.kind(page('<form><input type="email"><input type="password"><button>Sign in</button></form>'))).toBe('login')
    expect(K.kind(page('<form><input type="email"><input type="password"><input type="password"></form>'))).toBe('signup')
    expect(K.kind(page('<form><h2>Create your account</h2><input type="email"><input type="password"></form>'))).toBe('signup')
    expect(K.kind(page('<form><input type="email"><button>Apply</button></form>'))).toBeNull()
  })
  it('does not count a hidden password box', () => {
    expect(K.kind(page('<form><input type="email"><input type="password" style="display:none"></form>'))).toBeNull()
  })
})

describe('the email', () => {
  it('is written into the email box and no password box is touched', () => {
    page('<form><input id="e" type="email"><input id="p1" type="password"><input id="p2" type="password"></form>')
    expect(K.fillEmail(document, 'priya@example.com')).toMatchObject({ filled: true, hadEmailBox: true })
    expect($('#e').value).toBe('priya@example.com')
    expect($('#p1').value).toBe('')
    expect($('#p2').value).toBe('')
  })
  it('finds a username box, and leaves an email the person already typed alone', () => {
    page('<form><input id="u" name="username"><input type="password"></form>')
    K.fillEmail(document, 'a@b.co')
    expect($('#u').value).toBe('a@b.co')
    page('<form><input id="e" type="email" value="mine@me.co"><input type="password"></form>')
    expect(K.fillEmail(document, 'other@x.co').filled).toBe(false)
    expect($('#e').value).toBe('mine@me.co')
  })
})

describe('the saved password', () => {
  it('is refused up front when most sites would refuse it', () => {
    expect(K.passwordProblem('short1A!')).toMatch(/10 characters/)
    expect(K.passwordProblem('alllowercase1!')).toMatch(/upper-case/)
    expect(K.passwordProblem('NoDigitsHere!!')).toMatch(/number/)
    expect(K.passwordProblem('NoSymbols12345')).toMatch(/symbol/)
    expect(K.passwordProblem(TEST_PW)).toBeNull()
  })
  it('fills the password AND confirm boxes on a create-account form, only the first on a sign-in form', () => {
    page('<form><input id="p1" type="password"><input id="p2" type="password"></form>')
    expect(K.fillPassword(document, TEST_PW, 'signup')).toBe(2)
    expect($('#p1').value).toBe(TEST_PW)
    expect($('#p2').value).toBe(TEST_PW)
    page('<form><input id="p1" type="password"><input id="p2" type="password"></form>')
    expect(K.fillPassword(document, TEST_PW, 'login')).toBe(1)
    expect($('#p2').value).toBe('')
  })
  it('never overwrites what the person typed', () => {
    page('<form><input id="p1" type="password" value="mine"><input id="p2" type="password"></form>')
    K.fillPassword(document, TEST_PW, 'signup')
    expect($('#p1').value).toBe('mine')
  })
})

describe('pressing the site’s own button', () => {
  const SIGNUP = (box: string) => `<form><input type="email"><input type="password"><input type="password">${box}
    <a id="signin" href="#">Already have an account? Sign in</a><button id="google" type="button">Sign up with Google</button>
    <button id="create" type="button">Create Account</button></form>`

  it('presses Create Account when there is nothing left for the person to tick', () => {
    page(SIGNUP(''))
    const create = presses('#create'); const google = presses('#google')
    expect(K.proceed(document, 'signup')).toMatchObject({ pressed: true })
    expect(create.n).toBe(1)
    expect(google.n).toBe(0) // never the "Sign up with Google" button, never the "Already have an account" link
  })

  it('does NOT tick the agreement box or press anything while it is unticked — it outlines the box and waits', () => {
    page(SIGNUP('<label><input id="agree" type="checkbox"> I acknowledge the terms and privacy notice</label>'))
    const create = presses('#create')
    const out = K.proceed(document, 'signup')
    expect(out.pressed).toBe(false)
    expect(out.waitingOn).toHaveLength(1)
    expect($('#agree').checked).toBe(false)
    expect(create.n).toBe(0)
    expect($('#agree').style.outline).not.toBe('')
  })

  it('presses on the next try once the person has ticked it themselves', () => {
    page(SIGNUP('<label><input id="agree" type="checkbox"> I agree to the terms</label>'))
    const create = presses('#create')
    $('#agree').checked = true // the person
    expect(K.proceed(document, 'signup').pressed).toBe(true)
    expect(create.n).toBe(1)
  })

  it('presses Sign in on a sign-in form — not the social buttons, not "Forgot password"', () => {
    page('<form><input type="email"><input type="password"><button id="fb" type="button">Continue with Google</button><a id="fp" href="#" role="button">Forgot password?</a><button id="go" type="button">Sign In</button></form>')
    const go = presses('#go'); const fb = presses('#fb'); const fp = presses('#fp')
    expect(K.proceed(document, 'login').pressed).toBe(true)
    expect([go.n, fb.n, fp.n]).toEqual([1, 0, 0])
  })

  it('says so, and presses nothing, when it cannot find the site’s button', () => {
    page('<form><input type="email"><input type="password"><input type="password"></form>')
    expect(K.proceed(document, 'signup')).toMatchObject({ pressed: false, hadButton: false })
  })

  it('also finds a button the site draws as a div with role=button (Workday does)', () => {
    page('<form><input type="email"><input type="password"><input type="password"><div id="create" role="button" aria-label="Create Account">Create Account</div></form>')
    const create = presses('#create')
    expect(K.proceed(document, 'signup').pressed).toBe(true)
    expect(create.n).toBe(1)
  })
})
