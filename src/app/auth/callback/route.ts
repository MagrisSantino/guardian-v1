import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirectUrl = new URL('/login', requestUrl.origin)

  if (!code) {
    redirectUrl.searchParams.set('error', 'invalid_link')
    return NextResponse.redirect(redirectUrl)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(list) {
          try {
            list.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // No-op: Next maneja cookies en Route Handlers.
          }
        },
      },
    },
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    redirectUrl.searchParams.set('error', 'invalid_link')
    return NextResponse.redirect(redirectUrl)
  }

  redirectUrl.searchParams.set('verified', 'true')
  return NextResponse.redirect(redirectUrl)
}
