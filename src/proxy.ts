import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Next.js 16 renamed the `middleware.ts` file convention to `proxy.ts`, and the
 * exported function from `middleware` to `proxy`. The old convention is
 * deprecated. Most tutorials and most model training data still show
 * `middleware.ts` — they are out of date.
 *
 * This refreshes the Supabase session and guards the signed-in routes.
 *
 * It is UX, not security. RLS is the access control: even if this were bypassed
 * entirely, a request could not read another user's rows, because every policy
 * filters on auth.uid(). This exists so a signed-out visitor sees a sign-in
 * page rather than an empty list.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser(), never getSession(): getSession reads the cookie without
  // revalidating it against the auth server and can be spoofed.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/signin'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/today/:path*', '/applications/:path*', '/profile/:path*', '/start/:path*'],
}
