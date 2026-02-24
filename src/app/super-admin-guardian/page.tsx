'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ShieldAlert, BadgeCheck, AlertCircle, Building2, UserCircle } from 'lucide-react'

export default function SuperAdminDashboard() {
  const [users, setUsers] = useState<any[]>([])
  const [initialLoading, setInitialLoading] = useState(true) 
  const [fetchingData, setFetchingData] = useState(false) 
  const [activeTab, setActiveTab] = useState<'doctor' | 'clinic_admin'>('doctor')
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

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/'); return }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
    if (profile?.role !== 'super_admin') {
      router.replace('/')
      return
    }

    const { data } = await supabase.from('profiles').select('*').eq('role', tab)
    if (data) {
      const sorted = data.sort((a, b) => (a.is_verified === b.is_verified) ? 0 : a.is_verified ? 1 : -1)
      setUsers(sorted)
    }
    
    setInitialLoading(false)
    setFetchingData(false)
  }

  async function toggleVerification(id: string, currentStatus: boolean) {
    setUsers(currentUsers => 
      currentUsers.map(user => 
        user.id === id ? { ...user, is_verified: !currentStatus } : user
      ).sort((a, b) => (a.is_verified === b.is_verified) ? 0 : a.is_verified ? 1 : -1)
    );

    const { error } = await supabase
      .from('profiles')
      .update({ is_verified: !currentStatus })
      .eq('id', id)
      
    if (error) {
      alert('Error de conexión al servidor: ' + error.message)
      checkSecurityAndFetch(false, activeTab) 
    }
  }

  if (initialLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-950"><div className="animate-spin rounded-full h-10 w-10 border-b-4 border-blue-500"></div></div>

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Cabecera del Centro de Mando */}
        <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-10 mb-8 shadow-2xl flex items-center gap-5">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.4)]">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">Centro de Mando</h1>
            <p className="text-slate-400 font-medium mt-1">Nivel de Acceso: Super Admin</p>
          </div>
        </div>

        {/* Pestañas (Tabs) */}
        <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-200 mb-6 w-full max-w-md relative">
          <button 
            onClick={() => setActiveTab('doctor')} 
            className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'doctor' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <UserCircle className="w-5 h-5" /> Médicos
          </button>
          <button 
            onClick={() => setActiveTab('clinic_admin')} 
            className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'clinic_admin' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <Building2 className="w-5 h-5" /> Clínicas
          </button>
          
          {/* Indicador de carga sutil */}
          {fetchingData && (
             <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
          )}
        </div>

        {/* Tabla de Usuarios */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-100/50 text-slate-500 text-xs uppercase tracking-widest">
                  <th className="p-5 font-bold border-b border-slate-200">Entidad</th>
                  {activeTab === 'doctor' && <th className="p-5 font-bold border-b border-slate-200">DNI</th>}
                  {activeTab === 'doctor' && <th className="p-5 font-bold border-b border-slate-200">Matrícula / Espec.</th>}
                  <th className="p-5 font-bold border-b border-slate-200">Contacto</th>
                  <th className="p-5 font-bold border-b border-slate-200 text-center">Auditoría</th>
                  <th className="p-5 font-bold border-b border-slate-200 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-blue-50/50 transition-colors group">
                    <td className="p-5">
                      <p className="font-black text-slate-900 text-lg">{user.full_name || 'Sin nombre'}</p>
                      <p className="text-xs font-bold text-slate-400">ID: {user.id.slice(0,8)}...</p>
                    </td>
                    
                    {activeTab === 'doctor' && (
                      <td className="p-5 font-bold text-slate-700">{user.dni || '-'}</td>
                    )}
                    
                    {activeTab === 'doctor' && (
                      <td className="p-5">
                        <p className="font-bold text-slate-900">{user.matricula || '-'}</p>
                        <p className="text-sm font-semibold text-slate-500">{user.specialty || '-'}</p>
                      </td>
                    )}

                    <td className="p-5 font-bold text-slate-600">{user.email || 'Oculto'}</td>
                    
                    <td className="p-5 text-center">
                      {user.is_verified ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-black rounded-full border border-emerald-200">
                          <BadgeCheck className="w-4 h-4" /> APROBADO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-800 text-xs font-black rounded-full border border-orange-200">
                          <AlertCircle className="w-4 h-4" /> EN REVISIÓN
                        </span>
                      )}
                    </td>
                    <td className="p-5 text-center">
                      <button
                        onClick={() => toggleVerification(user.id, user.is_verified)}
                        className={`px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-sm w-full max-w-[140px] ${
                          user.is_verified 
                            ? 'bg-slate-100 text-slate-500 hover:bg-red-500 hover:text-white border border-slate-200' 
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/30'
                        }`}
                      >
                        {user.is_verified ? 'Revocar' : 'Validar'}
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && !fetchingData && (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-500 font-bold text-lg">
                      No hay registros para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  )
}