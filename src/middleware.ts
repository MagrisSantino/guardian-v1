import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type Role = 'doctor' | 'clinic_admin' | 'super_admin' | string | null

function isPublicPath(pathname: string): boolean {
  if (pathname === '/' || pathname === '') return true
  if (pathname.startsWith('/login')) return true
  if (pathname.startsWith('/registro')) return true
  if (pathname.startsWith('/verificar-email')) return true
  if (pathname.startsWith('/auth/callback')) return true
  if (pathname.startsWith('/legales')) return true
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

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    },
  )

  const pathname = request.nextUrl.pathname

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    if (!isPublicPath(pathname)) {
      return NextResponse.redirect(new URL('/login', request.url))
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
    console.error('[middleware] profiles:', profileError.message)
  }

  if (!role) {
    if (!isPublicPath(pathname)) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }

  if (matchesAny(pathname, ['/super-admin-guardian'])) {
    if (role !== 'super_admin') {
      const dest = dashboardForRole(role)
      return NextResponse.redirect(new URL(dest, request.url))
    }
    return response
  }

  if (role === 'doctor' && matchesAny(pathname, CLINIC_ONLY_PREFIXES)) {
    return NextResponse.redirect(new URL('/dashboard-medico', request.url))
  }

  if (role === 'clinic_admin' && matchesAny(pathname, DOCTOR_ONLY_PREFIXES)) {
    return NextResponse.redirect(new URL('/dashboard-clinica', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|pdf)$).*)',
  ],
}
