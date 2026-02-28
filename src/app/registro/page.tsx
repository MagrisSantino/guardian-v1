'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  Eye,
  EyeOff,
  FileText,
  IdCard,
  ChevronRight,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Shield,
  Stethoscope,
  User,
} from 'lucide-react'

/* ────────────────────────────────
   Types & Constants
   ──────────────────────────────── */

type Role = 'doctor' | 'clinic_admin'

const STEPS = [
  { id: 1, label: 'Perfil' },
  { id: 2, label: 'Datos' },
  { id: 3, label: 'Acceso' },
] as const

/* ────────────────────────────────
   Utility: cn
   ──────────────────────────────── */

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

/* ────────────────────────────────
   Background: dots + orbs (v0 style)
   ──────────────────────────────── */

function RegistroBackground() {
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

/* ────────────────────────────────
   GuardianHeader
   ──────────────────────────────── */

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

/* ────────────────────────────────
   RoleSelector (medico/clinica → doctor/clinic_admin)
   ──────────────────────────────── */

function RoleSelector({
  selectedRole,
  onRoleChange,
}: {
  selectedRole: Role
  onRoleChange: (role: Role) => void
}) {
  const roles: { key: Role; label: string; icon: typeof Stethoscope }[] = [
    { key: 'doctor', label: 'Soy Medico', icon: Stethoscope },
    { key: 'clinic_admin', label: 'Soy Clinica', icon: Building2 },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {roles.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onRoleChange(key)}
          className={cn(
            'group relative flex flex-col items-center gap-2.5 rounded-2xl border-2 px-4 py-5 transition-all duration-200',
            selectedRole === key
              ? 'border-blue-500 bg-blue-50/70 shadow-md shadow-blue-500/10'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
          )}
        >
          <div
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200',
              selectedRole === key
                ? 'bg-blue-600 shadow-lg shadow-blue-600/25'
                : 'bg-slate-100 group-hover:bg-slate-200'
            )}
          >
            <Icon
              className={cn(
                'h-5 w-5 transition-colors duration-200',
                selectedRole === key ? 'text-white' : 'text-slate-500'
              )}
            />
          </div>
          <span
            className={cn(
              'text-sm font-semibold transition-colors duration-200',
              selectedRole === key ? 'text-blue-700' : 'text-slate-600'
            )}
          >
            {label}
          </span>
          {selectedRole === key && (
            <div className="absolute -top-px -right-px h-3 w-3 rounded-full border-2 border-white bg-blue-500" />
          )}
        </button>
      ))}
    </div>
  )
}

/* ────────────────────────────────
   StepIndicator
   ──────────────────────────────── */

function StepIndicator({
  currentStep,
  onStepClick,
}: {
  currentStep: number
  onStepClick: (step: number) => void
}) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (s.id < currentStep) onStepClick(s.id)
            }}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200',
              currentStep === s.id &&
                'bg-blue-600 text-white shadow-md shadow-blue-600/25',
              currentStep > s.id &&
                'bg-blue-50 text-blue-600 cursor-pointer hover:bg-blue-100',
              currentStep < s.id && 'bg-slate-100 text-slate-400'
            )}
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold">
              {currentStep > s.id ? '\u2713' : s.id}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
          </button>
          {i < STEPS.length - 1 && (
            <ChevronRight className="h-3 w-3 text-slate-300" />
          )}
        </div>
      ))}
    </div>
  )
}

/* ────────────────────────────────
   FormInput
   ──────────────────────────────── */

function FormInput({
  id,
  label,
  icon: Icon,
  type = 'text',
  placeholder,
  value,
  onChange,
  trailing,
  required,
}: {
  id: string
  label: string
  icon: typeof User
  type?: string
  placeholder: string
  value: string
  onChange: (val: string) => void
  trailing?: React.ReactNode
  required?: boolean
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-slate-700 mb-1.5"
      >
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className={cn(
            'w-full rounded-xl border-0 bg-slate-50 py-3 pl-10 text-sm text-slate-900 placeholder:text-slate-400',
            'ring-1 ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none',
            trailing ? 'pr-11' : 'pr-4'
          )}
        />
        {trailing}
      </div>
    </div>
  )
}

/* ────────────────────────────────
   Main: RegistroPage (integrado con Supabase)
   ──────────────────────────────── */

export default function RegistroPage() {
  const [step, setStep] = useState(1)
  const [role, setRole] = useState<Role>('doctor')
  const [showPassword, setShowPassword] = useState(false)

  const [name, setName] = useState('')
  const [dni, setDni] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [matricula, setMatricula] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [institutionName, setInstitutionName] = useState('')
  const [address, setAddress] = useState('')

  const [loading, setLoading] = useState(false)
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
          if (profile?.role === 'super_admin')
            window.location.href = '/super-admin-guardian'
          else if (profile?.role === 'clinic_admin')
            window.location.href = '/dashboard-clinica'
          else window.location.href = '/dashboard-medico'
        })
    })
  }, [router])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          role,
          dni: role === 'doctor' ? dni : null,
          matricula: role === 'doctor' ? matricula : null,
          specialty: role === 'doctor' ? specialty : null,
          phone: phone || null,
          institution_name: role === 'clinic_admin' ? institutionName : null,
          address: role === 'clinic_admin' ? address : null,
        },
      },
    })

    setLoading(false)
    if (error) {
      alert(error.message)
    } else {
      alert('¡Cuenta creada con éxito! Por favor, iniciá sesión.')
      router.push('/login')
    }
  }

  function handleNext() {
    if (step < 3) setStep(step + 1)
  }

  function handleBack() {
    if (step > 1) setStep(step - 1)
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
      <RegistroBackground />

      <GuardianHeader />

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-24">
        <div className="w-full max-w-md mx-auto">
          <div className="relative rounded-3xl bg-white shadow-2xl shadow-blue-900/5 border border-slate-100/80 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500" />

            <div className="px-8 pt-10 pb-8 md:px-10">
              <div className="flex justify-center mb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200/50">
                  <Shield className="h-7 w-7 text-blue-600" />
                </div>
              </div>

              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight text-balance">
                  Crear Cuenta
                </h1>
                <p className="mt-1.5 text-sm text-slate-500">
                  Registrate en la red medica Guardian
                </p>
              </div>

              <StepIndicator
                currentStep={step}
                onStepClick={(s) => setStep(s)}
              />

              <form onSubmit={handleSignUp}>
                {step === 1 && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <p className="text-sm font-medium text-slate-700 mb-3">
                      Selecciona tu perfil para comenzar
                    </p>
                    <RoleSelector selectedRole={role} onRoleChange={setRole} />
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <FormInput
                      id="fullName"
                      label="Nombre Completo"
                      icon={User}
                      placeholder="Ingresa tu nombre completo"
                      value={name}
                      onChange={setName}
                      required
                    />
                    <FormInput
                      id="dni"
                      label="DNI"
                      icon={IdCard}
                      placeholder="Sin puntos ni espacios"
                      value={dni}
                      onChange={setDni}
                      required
                    />
                    <FormInput
                      id="email"
                      label="Email"
                      icon={Mail}
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={setEmail}
                      required
                    />
                    <FormInput
                      id="phone"
                      label="Teléfono (opcional)"
                      icon={Phone}
                      type="tel"
                      placeholder="11 1234 5678"
                      value={phone}
                      onChange={setPhone}
                    />
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {role === 'doctor' ? (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <FormInput
                            id="matricula"
                            label="Matricula"
                            icon={FileText}
                            placeholder="Ej: MP 1234"
                            value={matricula}
                            onChange={setMatricula}
                            required
                          />
                          <FormInput
                            id="especialidad"
                            label="Especialidad"
                            icon={Briefcase}
                            placeholder="Ej: Pediatria"
                            value={specialty}
                            onChange={setSpecialty}
                            required
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <FormInput
                          id="institucion"
                          label="Nombre de la Institucion"
                          icon={Building2}
                          placeholder="Nombre de la clinica"
                          value={institutionName}
                          onChange={setInstitutionName}
                          required
                        />
                        <FormInput
                          id="direccion"
                          label="Direccion"
                          icon={MapPin}
                          placeholder="Direccion de la clinica"
                          value={address}
                          onChange={setAddress}
                          required
                        />
                      </>
                    )}

                    <div>
                      <label
                        htmlFor="password"
                        className="block text-sm font-medium text-slate-700 mb-1.5"
                      >
                        Contrasena
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Minimo 6 caracteres"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={6}
                          className="w-full rounded-xl border-0 bg-slate-50 py-3 pl-10 pr-11 text-sm text-slate-900 placeholder:text-slate-400 ring-1 ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          aria-label={
                            showPassword
                              ? 'Ocultar contrasena'
                              : 'Mostrar contrasena'
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-8 flex items-center gap-3">
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50 hover:border-slate-300"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Atras
                    </button>
                  )}

                  {step < 3 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 hover:shadow-blue-700/30 active:scale-[0.98]"
                    >
                      Continuar
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 hover:shadow-blue-700/30 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Crear mi cuenta
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>

              <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs text-slate-400">o</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <p className="text-center text-sm text-slate-500">
                {'Ya tenes cuenta? '}
                <Link
                  href="/login"
                  className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Inicia sesion aca
                </Link>
              </p>
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
