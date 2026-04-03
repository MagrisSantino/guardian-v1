import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type Role = 'doctor' | 'clinic_admin' | 'super_admin' | string | null

/** Decodifica el payload JWT y devuelve true si el token es de recuperación de contraseña. */
function isRecoveryToken(accessToken: string): boolean {
  try {
    const b64 = accessToken.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/')
    if (!b64) return false
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    const payload = JSON.parse(atob(padded)) as { amr?: { method?: string }[] }
    return payload.amr?.some((e) => e.method === 'recovery') ?? false
  } catch {
    return false
  }
}

function isPublicPath(pathname: string): boolean {
  // Service worker y manifest deben servirse sin redirect (requisito del navegador).
  if (pathname === '/sw.js' || pathname === '/manifest.json') return true
  if (pathname === '/' || pathname === '') return true
  if (pathname.startsWith('/login')) return true
  if (pathname.startsWith('/registro')) return true
  if (pathname.startsWith('/verificar-email')) return true
  if (pathname.startsWith('/auth/callback')) return true
  if (pathname.startsWith('/auth/confirm')) return true
  if (pathname.startsWith('/restablecer-contrasena')) return true
  if (pathname.startsWith('/legales')) return true
  if (pathname.startsWith('/offline')) return true
  return false
}

const CLINIC_ONLY_PREFIXES = ['/dashboard-clinica', '/panel-clinica', '/publicar'] as const
const DOCTOR_ONLY_PREFIXES = ['/dashboard-medico', '/calendario-medico', '/mis-guardias'] as const

function matchesAny(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

function dashboardForRole(role: Role): string {
  if (role === 'doctor') return '/dashboard-medico'
  if (role === 'clinic_admin') return '/dashboard-clinica'
  if (role === 'super_admin') return '/super-admin-guardian'
  return '/login'
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[proxy] Faltan variables de entorno de Supabase')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options })
        response = NextResponse.next({ request: { headers: request.headers } })
        response.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options })
        response = NextResponse.next({ request: { headers: request.headers } })
        response.cookies.set({ name, value: '', ...options })
      },
    },
  })

  /**
   * Los redirects de NextResponse.redirect() no llevan las cookies que
   * set/remove actualizaron en `response`. Esta helper las copia.
   */
  function redirect(url: URL) {
    const r = NextResponse.redirect(url)
    response.cookies.getAll().forEach((c) => r.cookies.set(c))
    return r
  }

  const pathname = request.nextUrl.pathname

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    if (!isPublicPath(pathname)) {
      return redirect(new URL('/login', request.url))
    }
    return response
  }

  // Sesión de recuperación de contraseña: solo puede acceder a /restablecer-contrasena.
  // El callback de email mantiene la sesión activa para que updateUser() funcione,
  // pero el usuario no debe poder navegar el resto de la app.
  const { data: sessionData } = await supabase.auth.getSession()
  if (sessionData.session && isRecoveryToken(sessionData.session.access_token)) {
    if (!pathname.startsWith('/restablecer-contrasena')) {
      return redirect(new URL('/restablecer-contrasena', request.url))
    }
    return response
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const role = (profile?.role as Role) ?? null

  if (profileError) {
    console.error('[proxy] profiles:', profileError.message)
  }

  if (!role) {
    if (!isPublicPath(pathname)) {
      return redirect(new URL('/login', request.url))
    }
    return response
  }

  // Redirigir usuarios autenticados que visitan /login o /registro a su dashboard.
  // Excepción: si hay query params de post-auth (?verified, ?reset, ?error),
  // dejar pasar para que la página muestre el mensaje y haga signOut client-side.
  if (pathname.startsWith('/login') || pathname.startsWith('/registro')) {
    const sp = request.nextUrl.searchParams
    const hasPostAuthParams = sp.has('verified') || sp.has('reset') || sp.has('error')
    if (!hasPostAuthParams) {
      return redirect(new URL(dashboardForRole(role), request.url))
    }
    return response
  }

  if (matchesAny(pathname, ['/super-admin-guardian'])) {
    if (role !== 'super_admin') {
      return redirect(new URL(dashboardForRole(role), request.url))
    }
    return response
  }

  if (role === 'doctor' && matchesAny(pathname, CLINIC_ONLY_PREFIXES)) {
    return redirect(new URL('/dashboard-medico', request.url))
  }

  if (role === 'clinic_admin' && matchesAny(pathname, DOCTOR_ONLY_PREFIXES)) {
    return redirect(new URL('/dashboard-clinica', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|pdf)$).*)',
  ],
}
