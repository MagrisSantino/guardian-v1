'use client'

/**
 * CÓMO FUNCIONA EL FLUJO DE EMAIL EN SUPABASE
 * ─────────────────────────────────────────────
 * Hay tres formatos posibles de URL al redirigir desde un link de email:
 *
 *  A) ?token_hash=XXX&type=signup   → OTP sin PKCE (ideal, funciona en cualquier dispositivo)
 *  B) ?code=XXX                     → PKCE code exchange (requiere code_verifier del mismo navegador)
 *  C) #access_token=XXX&...         → Implicit grant (sin PKCE, tokens en el hash)
 *
 * Con flowType='implicit' (configurado en lib/supabase.ts) los registros nuevos usan (A) o (C).
 * Links viejos (antes del cambio) pueden traer (B) y fallarán en otros dispositivos.
 *
 * SESIÓN TRAS LA VERIFICACIÓN
 * ─────────────────────────────
 * Supabase siempre crea una sesión al verificar el OTP/token.
 * Para flujos de CONFIRMACIÓN de email:  cerramos la sesión antes de ir al login,
 *   para que el usuario deba iniciar sesión explícitamente (ver mensaje verde).
 * Para flujo de RECUPERACIÓN de contraseña: mantenemos la sesión activa,
 *   la página /restablecer-contrasena la necesita para llamar updateUser().
 *   Esa página hace signOut() luego de actualizar la contraseña.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import type { Session, EmailOtpType } from '@supabase/supabase-js'
import { isRecoverySession, parseEmailOtpType } from '@/lib/auth-callback-helpers'

const ERROR_URL = '/login?error=invalid_link'
const RECOVERY_PATH = '/restablecer-contrasena'

/** Cliente dedicado al callback, sin singleton, para evitar races con initialize(). */
function makeCallbackClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createBrowserClient(url, key, { isSingleton: false })
}

function isRecovery(session: Session, type?: string | null): boolean {
  return type === 'recovery' || isRecoverySession(session)
}

function destination(session: Session, type?: string | null): string {
  if (isRecovery(session, type)) return RECOVERY_PATH
  const next = new URLSearchParams(window.location.search).get('next') ?? ''
  return next.startsWith('/') ? next : '/login?verified=true'
}

export default function AuthEmailCallbackClient() {
  const router = useRouter()
  const [hint, setHint] = useState('Confirmando…')

  useEffect(() => {
    let cancelled = false

    function go(path: string) {
      if (!cancelled) router.replace(path)
    }

    /**
     * Después de verificar el token Supabase crea una sesión automáticamente.
     * - Flujo recuperación → la mantenemos (la necesita /restablecer-contrasena).
     * - Flujo confirmación → la cerramos para que el usuario inicie sesión manualmente.
     */
    async function settle(
      client: ReturnType<typeof makeCallbackClient>,
      session: Session,
      type?: string | null,
    ) {
      const dest = destination(session, type)
      if (dest !== RECOVERY_PATH) {
        // Cerrar sesión: el usuario verá el mensaje y deberá iniciar sesión.
        try { await client.auth.signOut() } catch { /* sin bloquear el redirect */ }
      }
      go(dest)
    }

    async function run() {
      try {
        const client = makeCallbackClient()

        // ── Parsear query params ──────────────────────────────────────────
        const qs         = new URLSearchParams(window.location.search)
        const token_hash = qs.get('token_hash')
        const qType      = qs.get('type')
        const qTypeOtp   = parseEmailOtpType(qType)
        const code       = qs.get('code')
        const email      = qs.get('email')
        const token      = qs.get('token')

        // ── Parsear hash (implicit grant: #access_token=...&refresh_token=...) ──
        const hash        = window.location.hash.startsWith('#')
          ? new URLSearchParams(window.location.hash.slice(1))
          : null
        const hashAccess  = hash?.get('access_token')  ?? null
        const hashRefresh = hash?.get('refresh_token') ?? null
        const hashType    = hash?.get('type')          ?? null

        // ─────────────────────────────────────────────────────────────────
        // 1. token_hash en query → OTP sin PKCE (funciona en cualquier dispositivo)
        // ─────────────────────────────────────────────────────────────────
        if (token_hash && qTypeOtp) {
          // Recovery: NO crear sesión aquí. Pasar el token a la página de reset
          // para que verifyOtp ocurra solo en el instante del submit y la sesión
          // exista por milisegundos. El usuario nunca está "logueado".
          if (qTypeOtp === 'recovery') {
            go(`/restablecer-contrasena?token_hash=${encodeURIComponent(token_hash)}&type=recovery`)
            return
          }
          setHint('Verificando correo…')
          const { data, error } = await client.auth.verifyOtp({ token_hash, type: qTypeOtp })
          if (cancelled) return
          if (error || !data.session) { go(ERROR_URL); return }
          await settle(client, data.session, qType)
          return
        }

        // ─────────────────────────────────────────────────────────────────
        // 2. email + token en query → OTP alternativo (funciona en cualquier dispositivo)
        // ─────────────────────────────────────────────────────────────────
        if (email && token && qTypeOtp) {
          setHint('Verificando correo…')
          const { data, error } = await client.auth.verifyOtp({
            email,
            token,
            type: qTypeOtp as EmailOtpType,
          })
          if (cancelled) return
          if (error || !data.session) { go(ERROR_URL); return }
          await settle(client, data.session, qType)
          return
        }

        // ─────────────────────────────────────────────────────────────────
        // 3. PKCE code → solo funciona en el mismo navegador donde se registró
        // ─────────────────────────────────────────────────────────────────
        if (code) {
          setHint('Iniciando sesión…')
          const { data, error } = await client.auth.exchangeCodeForSession(code)
          if (cancelled) return
          if (error || !data.session) { go(ERROR_URL); return }
          await settle(client, data.session, qType)
          return
        }

        // ─────────────────────────────────────────────────────────────────
        // 4. Hash tokens (implicit grant sin PKCE) — tokens en el fragmento #
        //    Recovery con hash: el access_token ya es una sesión de recuperación;
        //    redirigir directo a reset con el token para que no quede sesión activa.
        //    Otros flujos: usamos setSession() directamente.
        // ─────────────────────────────────────────────────────────────────
        if (hashAccess && hashRefresh) {
          if (hashType === 'recovery') {
            // No crear sesión; llevar al usuario a reset sin estar logueado.
            // El token_hash no está disponible en este formato, pero el
            // access_token mismo puede usarse como sesión temporal en el submit.
            // Fallback: usar el flujo de sesión completo con bloqueo de navegación.
            setHint('Redirigiendo…')
            const { data, error } = await client.auth.setSession({
              access_token:  hashAccess,
              refresh_token: hashRefresh,
            })
            if (cancelled) return
            if (error || !data.session) { go(ERROR_URL); return }
            // Sesión de recovery activa — proxy la bloquea a /restablecer-contrasena
            go(RECOVERY_PATH)
            return
          }
          setHint('Iniciando sesión…')
          const { data, error } = await client.auth.setSession({
            access_token:  hashAccess,
            refresh_token: hashRefresh,
          })
          if (cancelled) return
          if (error || !data.session) { go(ERROR_URL); return }
          await settle(client, data.session, hashType)
          return
        }

        // ─────────────────────────────────────────────────────────────────
        // 5. Fallback: initialize() del singleton puede haber procesado hash
        //    tokens en la carga inicial de la página (fresh load).
        // ─────────────────────────────────────────────────────────────────
        const { supabase } = await import('@/lib/supabase')
        await supabase.auth.initialize()
        if (cancelled) return
        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData.session) {
          await settle(client, sessionData.session, hashType || qType)
          return
        }

        go(ERROR_URL)
      } catch {
        if (!cancelled) go(ERROR_URL)
      }
    }

    void run()
    return () => { cancelled = true }
  }, [router])

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4 text-slate-600">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
        aria-hidden
      />
      <p className="text-sm">{hint}</p>
    </div>
  )
}
