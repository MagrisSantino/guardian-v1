'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { BadgeCheck, AlertCircle, LogOut, Save, User } from 'lucide-react'

export default function Perfil() {
  const [profile, setProfile] = useState<any>(null)
  const [fullName, setFullName] = useState('')
  const [dni, setDni] = useState('')
  const [matricula, setMatricula] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (data) {
      setProfile(data)
      const meta = session.user.user_metadata || {}
      setFullName(data.full_name || meta.full_name || '')
      setDni(data.dni || meta.dni || '')
      setMatricula(data.matricula || meta.matricula || '')
      setSpecialty(data.specialty || meta.specialty || '')
    }
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    const updateData = profile.role === 'doctor' 
      ? { full_name: fullName, dni, matricula, specialty }
      : { full_name: fullName }

    const { error } = await supabase.from('profiles').update(updateData).eq('id', profile.id)
    setSaving(false)
    if (!error) {
      alert('Perfil actualizado correctamente')
      fetchProfile() 
    } else {
      alert('Error al guardar: ' + error.message)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) return <div className="min-h-[calc(100vh-73px)] flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div></div>

  const isDoctor = profile?.role === 'doctor'
  const isVerified = profile?.is_verified

  return (
    <main className="min-h-[calc(100vh-73px)] bg-slate-50 py-10 px-4 md:px-6">
      <div className="max-w-2xl mx-auto">
        
        {/* ENCABEZADO DEL PERFIL */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 mb-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-blue-400"></div>
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center shrink-0 border-4 border-white shadow-md">
              <User className="w-10 h-10 text-slate-400" />
            </div>
            
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900">{fullName || 'Usuario'}</h1>
                {isDoctor && (
                  isVerified ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                      <BadgeCheck className="w-4 h-4" /> Perfil Verificado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 text-orange-700 text-xs font-bold rounded-full border border-orange-200">
                      <AlertCircle className="w-4 h-4" /> Pendiente de Verificación
                    </span>
                  )
                )}
              </div>
              <p className="text-slate-500 font-medium capitalize">{isDoctor ? 'Profesional Médico' : 'Institución Médica'}</p>
            </div>
          </div>

          {isDoctor && !isVerified && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-sm text-blue-800">
              <AlertCircle className="w-5 h-5 shrink-0 text-blue-600" />
              <p>
                <strong>Para poder postularte a guardias</strong>, necesitamos que completes tu DNI y Matrícula. Nuestro equipo validará tu identidad a la brevedad para darte el Tilde Azul.
              </p>
            </div>
          )}
        </div>

        {/* FORMULARIO DE DATOS */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-5">
          <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Información Personal</h2>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">{isDoctor ? "Nombre Completo" : "Razón Social"}</label>
            <input 
              type="text" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-slate-900 font-semibold"
            />
          </div>

          {isDoctor && (
            <>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">DNI</label>
                <input 
                  type="text" 
                  value={dni}
                  disabled={isVerified}
                  onChange={(e) => setDni(e.target.value)}
                  className={`w-full px-4 py-3 border border-slate-300 rounded-xl outline-none transition-all font-semibold ${isVerified ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white'}`}
                  placeholder="Sin puntos ni espacios"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Matrícula (MP/MN)</label>
                  <input 
                    type="text" 
                    value={matricula}
                    disabled={isVerified}
                    onChange={(e) => setMatricula(e.target.value)}
                    className={`w-full px-4 py-3 border border-slate-300 rounded-xl outline-none transition-all font-semibold ${isVerified ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white'}`}
                    placeholder="Ej: MP 1234"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Especialidad</label>
                  <input 
                    type="text" 
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-slate-900 font-semibold"
                    placeholder="Ej: Pediatría"
                  />
                </div>
              </div>
              
              {isVerified && (
                <p className="text-xs text-slate-500 italic flex items-center gap-1 mt-2">
                  <BadgeCheck className="w-3 h-3 text-emerald-600" />
                  Tu identidad está validada. Para modificar DNI o Matrícula contactá a soporte.
                </p>
              )}
            </>
          )}

          <div className="pt-4 flex flex-col sm:flex-row gap-4 border-t border-slate-100">
            <button 
              onClick={handleSave} 
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-xl disabled:opacity-70"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>

            <button 
              onClick={handleLogout} 
              className="flex items-center justify-center gap-2 py-3.5 px-6 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-all"
            >
              <LogOut className="w-5 h-5" />
              Cerrar Sesión
            </button>
          </div>
        </div>

      </div>
    </main>
  )
}