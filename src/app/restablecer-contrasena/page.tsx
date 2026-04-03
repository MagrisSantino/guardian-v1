'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { EmailOtpType } from '@supabase/supabase-js'
import { ArrowLeft, Eye, EyeOff, Lock, Loader2, Shield, CheckCircle2, XCircle } from 'lucide-react'

function GuardianHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 md:px-10">
      <Link href="/" className="flex items-center gap-2.5 group">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/25 transition-shadow group-hover:shadow-blue-600/40">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-semibold text-slate-800 tracking-tight">Guardian</span>
      </Link>
      <Link
        href="/login"
        className="flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-blue-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </Link>
    </header>
  )
}

function validatePassword(pwd: string): string | null {
  if (pwd.length < 8)            return 'Mínimo 8 caracteres'
  if (pwd.length > 128)          return 'Máximo 128 caracteres'
  if (!/[A-Z]/.test(pwd))        return 'Al menos una letra mayúscula'
  if (!/\d/.test(pwd))           return 'Al menos un número'
  if (!/[^A-Za-z0-9]/.test(pwd)) return 'Al menos un carácter especial (@, #, !, %...)'
  return null
}

function Requirement({ met, label }: { met: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-1.5 text-xs transition-colors ${met ? 'text-emerald-600' : 'text-slate-400'}`}>
      {met
        ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        : <XCircle className="h-3.5 w-3.5 shrink-0" />
      }
      {label}
    </li>
  )
}

function RestablecerContrasenaInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const tokenHash = searchParams?.get('token_hash') ?? null
  const tokenType = (searchParams?.get('type') ?? 'recovery') as EmailOtpType

  // Si no hay token en la URL el enlace es inválido o ya fue usado
  useEffect(() => {
    if (tokenHash === null) {
      // Pequeño delay para evitar flash antes del redirect
      const t = setTimeout(() => router.replace('/login?error=invalid_link'), 300)
      return () => clearTimeout(t)
    }
  }, [tokenHash, router])

  const pwdError = password ? validatePassword(password) : null
  const reqs = {
    length:  password.length >= 8,
    upper:   /[A-Z]/.test(password),
    digit:   /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const validationError = validatePassword(password)
    if (validationError) { setError(validationError); return }
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden.'); return }
    if (!tokenHash) { setError('El enlace no es válido. Pedí uno nuevo.'); return }

    setLoading(true)

    // Paso 1: verificar el token → crea una sesión temporal
    const { error: otpError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: tokenType,
    })
    if (otpError) {
      setError('El enlace expiró o ya fue usado. Pedí uno nuevo desde "¿Olvidaste tu contraseña?".')
      setLoading(false)
      return
    }

    // Paso 2: actualizar la contraseña (requiere la sesión recién creada)
    const { error: updateError } = await supabase.auth.updateUser({ password })

    // Paso 3: cerrar sesión inmediatamente — el usuario no debe quedar logueado
    await supabase.auth.signOut()

    if (updateError) {
      setError('No se pudo actualizar la contraseña: ' + updateError.message)
      setLoading(false)
      return
    }

    router.replace('/login?reset=true')
  }

  // Mientras se verifica si hay token, mostrar spinner
  if (tokenHash === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-slate-50 overflow-hidden">
      <GuardianHeader />
      {/* Background */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: 'radial-gradient(circle, #94a3b8 0.75px, transparent 0.75px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-blue-400/10 blur-[120px]" />
        <div className="absolute -top-20 right-0 h-[400px] w-[400px] rounded-full bg-blue-300/8 blur-[100px]" />
        <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 h-[450px] w-[450px] rounded-full bg-blue-500/6 blur-[130px]" />
      </div>

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-24">
        <div className="w-full max-w-md">
          <div className="relative rounded-3xl bg-white shadow-2xl shadow-blue-900/5 border border-slate-100/80 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500" />

            <div className="px-8 pt-10 pb-9 md:px-10">
              {/* Header */}
              <div className="flex flex-col items-center gap-3 mb-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200/50">
                  <Shield className="h-7 w-7 text-blue-600" />
                </div>
                <div className="text-center">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Nueva contraseña
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Elegí una contraseña segura para tu cuenta
                  </p>
                </div>
              </div>

              {error && (
                <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {/* Nueva contraseña */}
                <div>
                  <label htmlFor="password" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 h-[18px] w-[18px] text-slate-400" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mín. 8 caracteres"
                      required
                      className="w-full rounded-xl border-0 bg-slate-50 py-3 pl-10 pr-11 text-sm text-slate-900 placeholder:text-slate-400 ring-1 ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute top-1/2 right-3.5 -translate-y-1/2 rounded-md p-0.5 text-slate-400 transition-colors hover:text-slate-600"
                      aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
                    >
                      {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>

                  {password && (
                    <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 pl-1">
                      <Requirement met={reqs.length}  label="8+ caracteres" />
                      <Requirement met={reqs.upper}   label="Mayúscula" />
                      <Requirement met={reqs.digit}   label="Número" />
                      <Requirement met={reqs.special} label="Símbolo especial" />
                    </ul>
                  )}
                </div>

                {/* Repetir contraseña */}
                <div>
                  <label htmlFor="confirm" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                    Repetir contraseña
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 h-[18px] w-[18px] text-slate-400" />
                    <input
                      id="confirm"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repetí tu contraseña"
                      required
                      className={`w-full rounded-xl border-0 bg-slate-50 py-3 pl-10 pr-11 text-sm text-slate-900 placeholder:text-slate-400 ring-1 transition-all focus:bg-white focus:ring-2 focus:outline-none ${
                        confirmPassword && confirmPassword !== password
                          ? 'ring-red-300 focus:ring-red-400'
                          : 'ring-slate-200 focus:ring-blue-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute top-1/2 right-3.5 -translate-y-1/2 rounded-md p-0.5 text-slate-400 transition-colors hover:text-slate-600"
                      aria-label={showConfirm ? 'Ocultar' : 'Mostrar'}
                    >
                      {showConfirm ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== password && (
                    <p className="mt-1.5 text-xs text-red-500 pl-1">Las contraseñas no coinciden</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !!pwdError || password !== confirmPassword || !confirmPassword}
                  className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Guardar nueva contraseña'}
                </button>

                <p className="text-center text-[13px] text-slate-500">
                  <Link href="/login" className="font-semibold text-blue-600 transition-colors hover:text-blue-700">
                    Volver al inicio de sesión
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function RestablecerContrasenaPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <RestablecerContrasenaInner />
    </Suspense>
  )
}
