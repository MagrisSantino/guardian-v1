'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ShieldAlert, BadgeCheck, AlertCircle, Building2, UserCircle, ChevronDown, ChevronUp } from 'lucide-react'

type UserRow = {
  id: string
  role: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  verified_at: string | null
  dni?: string | null
  matricula?: string | null
  specialty?: string[]
  specialty_verified?: string[]
}

export default function SuperAdminDashboard() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [fetchingData, setFetchingData] = useState(false)
  const [activeTab, setActiveTab] = useState<'doctor' | 'clinic'>('doctor')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkSecurityAndFetch(true, activeTab)
  }, [])

  useEffect(() => {
    if (!initialLoading) {
      checkSecurityAndFetch(false, activeTab)
    }
  }, [activeTab])

  async function checkSecurityAndFetch(isInitial: boolean, tab: string) {
    if (isInitial) setInitialLoading(true)
    else setFetchingData(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/'); return }

    const { data: adminProfile } = await supabase.from('accounts').select('role').eq('id', user.id).single()
    if (adminProfile?.role !== 'admin') {
      router.replace('/')
      return
    }

    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, full_name, email, avatar_url, verified_at')
      .eq('role', tab)

    if (!accounts) { setInitialLoading(false); setFetchingData(false); return }

    let rows: UserRow[] = accounts.map(a => ({ ...a, role: tab }))

    if (tab === 'doctor' && accounts.length > 0) {
      const ids = accounts.map(a => a.id)
      const { data: docProfiles } = await supabase
        .from('doctor_profiles')
        .select('id, dni, matricula, specialty, specialty_verified')
        .in('id', ids)

      if (docProfiles) {
        const profileMap = new Map(docProfiles.map(p => [p.id, p]))
        rows = rows.map(r => {
          const dp = profileMap.get(r.id)
          return dp
            ? { ...r, dni: dp.dni, matricula: dp.matricula, specialty: dp.specialty ?? [], specialty_verified: dp.specialty_verified ?? [] }
            : r
        })
      }
    }

    const sorted = rows.sort((a, b) => {
      const av = !!a.verified_at, bv = !!b.verified_at
      return av === bv ? 0 : av ? 1 : -1
    })
    setUsers(sorted)
    setInitialLoading(false)
    setFetchingData(false)
  }

  async function toggleVerification(id: string, currentVerifiedAt: string | null) {
    const newVerifiedAt = currentVerifiedAt ? null : new Date().toISOString()
    setUsers(prev =>
      prev.map(u => u.id === id ? { ...u, verified_at: newVerifiedAt } : u)
         .sort((a, b) => {
           const av = !!a.verified_at, bv = !!b.verified_at
           return av === bv ? 0 : av ? 1 : -1
         })
    )
    const { error } = await supabase.from('accounts').update({ verified_at: newVerifiedAt }).eq('id', id)
    if (error) {
      alert('Error de conexión al servidor: ' + error.message)
      checkSecurityAndFetch(false, activeTab)
    }
  }

  async function toggleSpecialtyVerification(userId: string, specialty: string, currentVerified: string[]) {
    const newVerified = currentVerified.includes(specialty)
      ? currentVerified.filter(s => s !== specialty)
      : [...currentVerified, specialty]

    setUsers(prev =>
      prev.map(u => u.id === userId ? { ...u, specialty_verified: newVerified } : u)
    )
    const { error } = await supabase.from('doctor_profiles').update({ specialty_verified: newVerified }).eq('id', userId)
    if (error) {
      alert('Error al actualizar especialidad: ' + error.message)
      checkSecurityAndFetch(false, activeTab)
    }
  }

  if (initialLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-blue-500"></div>
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">

        <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-10 mb-8 shadow-2xl flex items-center gap-5">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.4)]">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">Centro de Mando</h1>
            <p className="text-slate-400 font-medium mt-1">Nivel de Acceso: Super Admin</p>
          </div>
        </div>

        <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-200 mb-6 w-full max-w-md relative">
          <button
            onClick={() => setActiveTab('doctor')}
            className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'doctor' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <UserCircle className="w-5 h-5" /> Médicos
          </button>
          <button
            onClick={() => setActiveTab('clinic')}
            className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'clinic' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <Building2 className="w-5 h-5" /> Clínicas
          </button>
          {fetchingData && (
            <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
          )}
        </div>

        <div className="space-y-3">
          {users.length === 0 && !fetchingData && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-10 text-center text-slate-500 font-bold text-lg">
              No hay registros para mostrar.
            </div>
          )}

          {users.map(user => {
            const specialties = user.specialty ?? []
            const specialtyVerified = user.specialty_verified ?? []
            const hasPendingSpecialties = specialties.some(s => !specialtyVerified.includes(s))
            const isExpanded = expandedId === user.id
            const isVerified = !!user.verified_at

            return (
              <div key={user.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 p-5">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-slate-900 text-base truncate">{user.full_name || 'Sin nombre'}</p>
                      {isVerified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-black rounded-full border border-emerald-200 shrink-0">
                          <BadgeCheck className="w-3.5 h-3.5" /> APROBADO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-800 text-xs font-black rounded-full border border-orange-200 shrink-0">
                          <AlertCircle className="w-3.5 h-3.5" /> EN REVISIÓN
                        </span>
                      )}
                      {activeTab === 'doctor' && hasPendingSpecialties && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-black rounded-full border border-amber-200 shrink-0">
                          <AlertCircle className="w-3.5 h-3.5" /> ESPEC. PENDIENTE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-bold mt-0.5">{user.email || 'Sin email'}</p>
                    {activeTab === 'doctor' && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        DNI: <span className="font-bold">{user.dni || '-'}</span>
                        {' · '}Matrícula: <span className="font-bold">{user.matricula || '-'}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {activeTab === 'doctor' && specialties.length > 0 && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : user.id)}
                        className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all border border-slate-200"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        <span className="hidden sm:inline">Especialidades</span>
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-slate-300 text-slate-700 rounded-full text-xs font-black">{specialties.length}</span>
                      </button>
                    )}
                    <button
                      onClick={() => toggleVerification(user.id, user.verified_at)}
                      className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
                        isVerified
                          ? 'bg-slate-100 text-slate-500 hover:bg-red-500 hover:text-white border border-slate-200'
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/30'
                      }`}
                    >
                      {isVerified ? 'Revocar' : 'Validar'}
                    </button>
                  </div>
                </div>

                {isExpanded && specialties.length > 0 && (
                  <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Especialidades declaradas</p>
                    <div className="space-y-2">
                      {specialties.map((spec, idx) => {
                        const verified = specialtyVerified.includes(spec)
                        return (
                          <div key={idx} className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-900 text-sm">{spec || <em className="text-slate-400">Sin nombre</em>}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {verified ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                                  <BadgeCheck className="w-4 h-4" /> Verificada
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700">
                                  <AlertCircle className="w-4 h-4" /> Pendiente
                                </span>
                              )}
                              <button
                                onClick={() => toggleSpecialtyVerification(user.id, spec, specialtyVerified)}
                                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                                  verified
                                    ? 'bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-700 border border-slate-200'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                }`}
                              >
                                {verified ? 'Revocar' : 'Validar'}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

      </div>
    </main>
  )
}
