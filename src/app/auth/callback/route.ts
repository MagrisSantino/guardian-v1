import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  // "next" permite que diferentes flujos redirijan a distintas páginas tras el exchange
  const next = requestUrl.searchParams.get('next') ?? ''
  const redirectUrl = new URL('/login', requestUrl.origin)

  if (!code) {
    redirectUrl.searchParams.set('error', 'invalid_link')
    return NextResponse.redirect(redirectUrl)
  }

  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    redirectUrl.searchParams.set('error', 'server_config')
    return NextResponse.redirect(redirectUrl)
  }
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
  })

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    redirectUrl.searchParams.set('error', 'invalid_link')
    return NextResponse.redirect(redirectUrl)
  }

  // Si se indicó una ruta destino (ej: recupero de contraseña), redirigir allá
  if (next && next.startsWith('/')) {
    return NextResponse.redirect(new URL(next, requestUrl.origin))
  }

  redirectUrl.searchParams.set('verified', 'true')
  return NextResponse.redirect(redirectUrl)
}
