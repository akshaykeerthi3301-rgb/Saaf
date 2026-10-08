import { NextResponse, type NextRequest } from 'next/server'
import { REF_COOKIE, REF_COOKIE_MAX_AGE, cleanRef, isRefShape } from '@/lib/credits'

/**
 * An invite link: /r/<code>. Public by design — it is how a stranger arrives. It does
 * nothing but remember the code in an httpOnly cookie and send them to sign-in; the
 * credit is granted later, by the database, only if the account that signs in is new.
 * A code of the wrong shape is dropped silently rather than echoed anywhere.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const response = NextResponse.redirect(new URL('/signin', request.nextUrl.origin))
  if (isRefShape(code)) {
    response.cookies.set(REF_COOKIE, cleanRef(code), {
      httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: REF_COOKIE_MAX_AGE,
    })
  }
  return response
}
