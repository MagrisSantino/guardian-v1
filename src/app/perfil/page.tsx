'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Perfil() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Estados del formulario
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [medicalLicense, setMedicalLicense] = useState('')
  const [specialties, setSpecialties] = useState('')
  const [experience, setExperience] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (data) {
      setProfile(data)
      setFullName(data.full_name || '')
      setPhone(data.phone || '')
      setAddress(data.address || '')
      setMedicalLicense(data.medical_license || '')
      setSpecialties(data.specialties || '')
      setExperience(data.experience_years?.toString() || '')
    }
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) return;

    const updates = {
      full_name: fullName,
      phone,
      address: profile.role === 'clinic_admin' ? address : null,
      medical_license: profile.role === 'doctor' ? medicalLicense : null,
      specialties: profile.role === 'doctor' ? specialties : null,
      experience_years: profile.role === 'doctor' ? Number(experience) : null,
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase.from('profiles').update(updates).eq('id', session.user.id)
    
    setSaving(false)
    if (error) alert('Error al guardar: ' + error.message)
    else alert('¡Perfil actualizado correctamente!')
  }

  if (loading) return <main className="min-h-[calc(100vh-73px)] bg-slate-50 flex justify-center items-center"><p className="text-slate-500">Cargando perfil...</p></main>

  return (
    <main className="min-h-[calc(100vh-73px)] bg-slate-50 p-6 md:p-8 flex justify-center items-start">
      <div className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-sm border border-slate-200 mt-4 md:mt-10">
        
        <div className="flex justify-between items-start mb-8 pb-6 border-b border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Configuración de Perfil</h1>
            <p className="text-slate-500 text-sm mt-1">
              Completá tus datos para dar mayor confianza en la red Guardian.
            </p>
          </div>
          
          {/* Badge de Verificación solo para médicos */}
          {profile?.role === 'doctor' && (
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${profile.is_verified ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
              {profile.is_verified ? '✓ Profesional Verificado' : 'Pendiente de Verificación'}
            </span>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Campos Comunes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">
                {profile?.role === 'doctor' ? 'Nombre y Apellido' : 'Razón Social'}
              </label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-slate-700" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Teléfono de Contacto</label>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+54 9 351..." className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-slate-700" />
            </div>
          </div>

          {/* Campos Exclusivos para Clínicas */}
          {profile?.role === 'clinic_admin' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Dirección Exacta</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Ej: Av. Colón 1234, Córdoba Capital" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-slate-700" required />
            </div>
          )}

          {/* Campos Exclusivos para Médicos */}
          {profile?.role === 'doctor' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Matrícula (MP/MN)</label>
                  <input type="text" value={medicalLicense} onChange={e => setMedicalLicense(e.target.value)} placeholder="Ej: MP 34567" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-slate-700" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Años de Experiencia</label>
                  <input type="number" value={experience} onChange={e => setExperience(e.target.value)} placeholder="Ej: 5" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-slate-700" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Especialidades</label>
                <input type="text" value={specialties} onChange={e => setSpecialties(e.target.value)} placeholder="Ej: Clínica Médica, Terapia Intensiva" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-slate-700" />
              </div>
            </>
          )}

          <div className="pt-6 mt-6 border-t border-slate-100 flex justify-end">
            <button type="submit" disabled={saving} className="px-8 py-3 bg-slate-900 hover:bg-blue-700 text-white rounded-xl font-medium shadow-sm transition-all disabled:opacity-70">
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}