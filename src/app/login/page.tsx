'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Loader2,
  Mail,
  Shield,
} from 'lucide-react'

/* ─────────────────────────────────────────────
   Guardian Login — Visual match with Registration
   Dot Grid + Gradient Orbs + Premium Card
   ───────────────────────────────────────────── */

function LoginBackground() {
  return (
    <>
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'radial-gradient(circle, #94a3b8 0.75px, transparent 0.75px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-blue-400/10 blur-[120px]" />
        <div className="absolute -top-20 right-0 h-[400px] w-[400px] rounded-full bg-blue-300/8 blur-[100px]" />
        <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 h-[450px] w-[450px] rounded-full bg-blue-500/6 blur-[130px]" />
      </div>
    </>
  )
}

function GuardianHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 md:px-10">
      <Link href="/" className="flex items-center gap-2.5 group">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/25 transition-shadow group-hover:shadow-blue-600/40">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-semibold text-slate-800 tracking-tight">
          Guardian
        </span>
      </Link>
      <Link
        href="/"
        className="flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-blue-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </Link>
    </header>
  )
}

interface LoginFormProps {
  email: string
  setEmail: (v: string) => void
  password: string
  setPassword: (v: string) => void
  showPassword: boolean
  setShowPassword: (v: boolean) => void
  loading: boolean
  onSubmit: (e: React.FormEvent) => void
}

function LoginForm({
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  loading,
  onSubmit,
}: LoginFormProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-[13px] font-semibold text-slate-700">
          Email Corporativo
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400">
            <Mail className="h-[18px] w-[18px]" />
          </div>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
            className="w-full rounded-xl border-0 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 ring-1 ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-[13px] font-semibold text-slate-700">
            Contraseña
          </label>
          <span className="text-xs font-medium text-slate-400">Olvidaste tu contraseña?</span>
        </div>
        <div className="relative">
          <div className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400">
            <Lock className="h-[18px] w-[18px]" />
          </div>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            required
            className="w-full rounded-xl border-0 bg-slate-50 py-3 pl-10 pr-11 text-sm text-slate-900 placeholder:text-slate-400 ring-1 ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute top-1/2 right-3.5 -translate-y-1/2 rounded-md p-0.5 text-slate-400 transition-colors hover:text-slate-600"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? (
              <EyeOff className="h-[18px] w-[18px]" />
            ) : (
              <Eye className="h-[18px] w-[18px]" />
            )}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="group relative mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 hover:shadow-blue-700/30 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            Ingresar al Sistema
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </>
        )}
      </button>

      <div className="my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs text-slate-400">o</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <p className="text-center text-[13px] text-slate-500">
        ¿No tenés cuenta?{' '}
        <Link href="/registro" className="font-semibold text-blue-600 transition-colors hover:text-blue-700">
          Registrate acá
        </Link>
      </p>
    </form>
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCheckingSession(false)
      if (!session) return
      supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
        .then(({ data: profile }) => {
          if (profile?.role === 'super_admin') window.location.href = '/super-admin-guardian'
          else if (profile?.role === 'clinic_admin') window.location.href = '/dashboard-clinica'
          else window.location.href = '/dashboard-medico'
        })
    })
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      alert('Error de acceso: ' + error.message)
      setLoading(false)
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profile?.role === 'super_admin') {
        window.location.href = '/super-admin-guardian'
      } else if (profile?.role === 'clinic_admin') {
        window.location.href = '/dashboard-clinica'
      } else {
        const [openRes, myRes] = await Promise.all([
          supabase
            .from('shifts')
            .select('*, clinic:profiles!clinic_id(full_name)')
            .eq('status', 'open')
            .order('date_time', { ascending: true }),
          supabase
            .from('shifts')
            .select('*, clinic:profiles!clinic_id(full_name)')
            .eq('professional_id', data.user.id)
            .eq('status', 'filled'),
        ])
        if (openRes.data) sessionStorage.setItem('medico_feed_cache', JSON.stringify(openRes.data))
        const allCalendarShifts = [...(openRes.data || []), ...(myRes.data || [])]
        sessionStorage.setItem('medico_calendar_cache', JSON.stringify(allCalendarShifts))
        window.location.href = '/dashboard-medico'
      }
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-slate-50">
        <p className="text-slate-600 font-medium">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-slate-50 overflow-hidden">
      <LoginBackground />

      <GuardianHeader />

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-24">
        <div className="w-full max-w-md mx-auto">
          <div className="relative rounded-3xl bg-white shadow-2xl shadow-blue-900/5 border border-slate-100/80 overflow-hidden">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500" />

            <div className="flex flex-col items-center gap-3 px-8 pt-10 pb-1 md:px-10">
              <div className="flex justify-center mb-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200/50">
                  <Shield className="h-7 w-7 text-blue-600" />
                </div>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 text-balance">
                Iniciar Sesión
              </h1>
              <p className="text-sm text-slate-500">Portal de acceso a la red médica</p>
            </div>

            <div className="px-8 pt-7 pb-9 md:px-10">
              <LoginForm
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                loading={loading}
                onSubmit={handleLogin}
              />
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-slate-400">
            2026 Guardian. Plataforma de Salud. Todos los derechos reservados.
          </p>
        </div>
      </main>
    </div>
  )
}
