import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { EmailOtpType } from '@supabase/supabase-js'
import type { Session } from '@supabase/supabase-js'

const EMAIL_OTP_TYPES = new Set<string>([
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
])

function parseEmailOtpType(raw: string | null): EmailOtpType | null {
  if (!raw || !EMAIL_OTP_TYPES.has(raw)) return null
  return raw as EmailOtpType
}

/** JWT de Supabase: flujo recuperación suele incluir amr con method "recovery". */
function isRecoverySession(session: Session | null): boolean {
  if (!session?.access_token) return false
  const parts = session.access_token.split('.')
  if (parts.length < 2) return false
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    const json = atob(padded)
    const payload = JSON.parse(json) as { amr?: { method?: string }[] }
    return payload.amr?.some((e) => e.method === 'recovery') ?? false
  } catch {
    return false
  }
}

export async function handleAuthCallback(request: Request): Promise<NextResponse> {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const token = requestUrl.searchParams.get('token')
  const email = requestUrl.searchParams.get('email')
  const type = parseEmailOtpType(requestUrl.searchParams.get('type'))
  const next = requestUrl.searchParams.get('next') ?? ''

  const errorUrl = new URL('/login?error=invalid_link', requestUrl.origin)
  const verifiedUrl = new URL('/login?verified=true', requestUrl.origin)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(new URL('/login?error=server_config', requestUrl.origin))
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(list) {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          /* Route Handler: cookies pueden fallar en algunos contextos */
        }
      },
    },
  })

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (error) return NextResponse.redirect(errorUrl)
    if (type === 'recovery') {
      return NextResponse.redirect(new URL('/restablecer-contrasena', requestUrl.origin))
    }
    return NextResponse.redirect(verifiedUrl)
  }

  if (email && token && type) {
    const { error } = await supabase.auth.verifyOtp({ email, token, type })
    if (error) return NextResponse.redirect(errorUrl)
    if (type === 'recovery') {
      return NextResponse.redirect(new URL('/restablecer-contrasena', requestUrl.origin))
    }
    return NextResponse.redirect(verifiedUrl)
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return NextResponse.redirect(errorUrl)
    if (isRecoverySession(data.session)) {
      return NextResponse.redirect(new URL('/restablecer-contrasena', requestUrl.origin))
    }
    if (next && next.startsWith('/')) {
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }
    return NextResponse.redirect(verifiedUrl)
  }

  return NextResponse.redirect(errorUrl)
}
