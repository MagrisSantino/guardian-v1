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

export function parseEmailOtpType(raw: string | null): EmailOtpType | null {
  if (!raw || !EMAIL_OTP_TYPES.has(raw)) return null
  return raw as EmailOtpType
}

export function isRecoverySession(session: Session | null): boolean {
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
