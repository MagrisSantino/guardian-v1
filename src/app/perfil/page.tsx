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
  const [age, setAge] = useState<string>('')
  const [whatsapp, setWhatsapp] = useState('')
  const [bio, setBio] = useState('')
  const [experienceTags, setExperienceTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Estados prestador (clinic_admin)
  const [providerType, setProviderType] = useState('')
  const [institutionDescription, setInstitutionDescription] = useState('')
  const [address, setAddress] = useState('')
  const [provincia, setProvincia] = useState('')
  const [localidad, setLocalidad] = useState('')
  const [complexityTags, setComplexityTags] = useState<string[]>([])
  const [resourceTags, setResourceTags] = useState<string[]>([])
  const [numDoctors, setNumDoctors] = useState<string>('')
  const [numNurses, setNumNurses] = useState<string>('')
  const [serviceTags, setServiceTags] = useState<string[]>([])
  const [contactWhatsapp, setContactWhatsapp] = useState('')

  const EXPERIENCE_OPTIONS = ['Guardia central', 'Consultorio', 'Internado', 'Traslados', 'Domicilios', '107', 'Eventos', 'Ecografía'] as const
  const PROVIDER_TYPE_OPTIONS = ['Clínica', 'Hospital', 'CAPS', 'Dispensario', 'Servicio de traslado', 'Medicina a domicilio', 'Telemedicina'] as const
  const COMPLEXITY_OPTIONS = ['UTI', 'UCI', 'Internado', 'Consultorio'] as const
  const RESOURCE_OPTIONS = ['Rx', 'Laboratorio', 'Cocina'] as const
  const SERVICE_OPTIONS = ['Consultorio a demanda', 'Urgencias', 'Obstetricia', 'Pediatría', 'Domicilios', 'Traslados'] as const
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
      setAge(data.age != null ? String(data.age) : '')
      setWhatsapp(data.whatsapp || meta.whatsapp || '')
      setBio(data.bio || meta.bio || '')
      const tags = data.experience_tags
      setExperienceTags(Array.isArray(tags) ? tags : (typeof tags === 'string' ? (tags ? [tags] : []) : []))
      if (data.role === 'clinic_admin') {
        setProviderType(data.prestador_type || meta.prestador_type || '')
        setInstitutionDescription(data.bio ?? '')
        const loc = data.location_maps || meta.location_maps || ''
        if (loc) {
          const parts = loc.split(',').map((s: string) => s.trim())
          setAddress(parts[0] || '')
          setLocalidad(parts[1] || '')
          setProvincia(parts[2] || '')
        } else {
          setAddress(meta.address || '')
          setLocalidad(meta.localidad || '')
          setProvincia(meta.provincia || '')
        }
        setContactWhatsapp(data.whatsapp || meta.whatsapp || '')
        setNumDoctors(data.num_doctors != null ? String(data.num_doctors) : '')
        setNumNurses(data.num_nurses != null ? String(data.num_nurses) : '')
        const arr = (v: unknown) => (Array.isArray(v) ? v : typeof v === 'string' ? (v ? [v] : []) : []) as string[]
        setComplexityTags(arr(data.complexity))
        setResourceTags(arr(data.resources))
        setServiceTags(arr(data.services))
      }
    }
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    const updateData = profile.role === 'doctor'
      ? { full_name: fullName, dni, matricula, specialty, age: age ? Number(age) : null, whatsapp: whatsapp || null, bio: bio || null, experience_tags: experienceTags }
      : {
          full_name: fullName,
          prestador_type: providerType || null,
          bio: institutionDescription || null,
          location_maps: [address, localidad, provincia].filter(Boolean).join(', ') || null,
          whatsapp: contactWhatsapp || null,
          complexity: complexityTags,
          resources: resourceTags,
          services: serviceTags,
        }

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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-6 relative overflow-hidden">
          {isDoctor ? (
            /* Vista tipo red social: portada + avatar circular */
            <>
              <div className="h-32 md:h-40 w-full bg-gradient-to-br from-blue-600 via-blue-500 to-slate-600" aria-hidden />
              <div className="px-6 md:px-8 pb-6 -mt-14 md:-mt-16 relative">
                <div className="w-28 h-28 md:w-32 md:h-32 bg-white rounded-full flex items-center justify-center shrink-0 border-4 border-white shadow-lg shadow-slate-200/80 mx-auto md:mx-0">
                  <User className="w-14 h-14 md:w-16 md:h-16 text-slate-400" />
                </div>
                <div className="text-center md:text-left mt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-center md:justify-start gap-2 mb-1">
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900">{fullName || 'Usuario'}</h1>
                    {isVerified ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 w-fit mx-auto md:mx-0">
                        <BadgeCheck className="w-4 h-4" /> Perfil Verificado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 text-orange-700 text-xs font-bold rounded-full border border-orange-200 w-fit mx-auto md:mx-0">
                        <AlertCircle className="w-4 h-4" /> Pendiente de Verificación
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 font-medium">Profesional Médico</p>
                </div>
              </div>
              {!isVerified && (
                <div className="mx-6 md:mx-8 mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-sm text-blue-800">
                  <AlertCircle className="w-5 h-5 shrink-0 text-blue-600" />
                  <p>
                    <strong>Para poder postularte a guardias</strong>, necesitamos que completes tu DNI y Matrícula. Nuestro equipo validará tu identidad a la brevedad para darte el Tilde Azul.
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Prestador: layout original */
            <div className="p-6 md:p-8 relative">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-blue-400"></div>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center shrink-0 border-4 border-white shadow-md">
                  <User className="w-10 h-10 text-slate-400" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900">{fullName || 'Usuario'}</h1>
                  </div>
                  <p className="text-slate-500 font-medium capitalize">Prestador de Salud</p>
                </div>
              </div>
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

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Edad</label>
                <input 
                  type="number" 
                  min={18}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-slate-900 font-semibold"
                  placeholder="Ej: 35"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Teléfono (para contacto por WhatsApp)</label>
                <input 
                  type="text" 
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-slate-900 font-semibold"
                  placeholder="+549351..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Descripción Personal</label>
                <textarea 
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-slate-900 font-semibold resize-y"
                  placeholder="Breve presentación profesional..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Experiencia laboral</label>
                <div className="flex flex-wrap gap-2">
                  {EXPERIENCE_OPTIONS.map((tag) => {
                    const selected = experienceTags.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setExperienceTags((prev) =>
                            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                          )
                        }}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {tag}
                      </button>
                    )
                  })}
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

          {!isDoctor && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">Datos del Prestador de Salud</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Tipo de Prestador</label>
                  <select
                    value={providerType}
                    onChange={(e) => setProviderType(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-slate-900 font-semibold"
                  >
                    <option value="">Seleccionar...</option>
                    {PROVIDER_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Breve descripción de la institución</label>
                  <textarea
                    value={institutionDescription}
                    onChange={(e) => setInstitutionDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-slate-900 font-semibold resize-y"
                    placeholder="Describí tu institución o servicio..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Dirección</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-slate-900 font-semibold"
                    placeholder="Dirección del prestador"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Provincia</label>
                  <input
                    type="text"
                    value={provincia}
                    onChange={(e) => setProvincia(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-slate-900 font-semibold"
                    placeholder="Ej: Córdoba"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Localidad</label>
                  <input
                    type="text"
                    value={localidad}
                    onChange={(e) => setLocalidad(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-slate-900 font-semibold"
                    placeholder="Ej: Córdoba Capital"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">WhatsApp / Teléfono de contacto</label>
                  <input
                    type="text"
                    value={contactWhatsapp}
                    onChange={(e) => setContactWhatsapp(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-slate-900 font-semibold"
                    placeholder="+549351... (lo verán los médicos para contactarte)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Complejidad</label>
                <div className="flex flex-wrap gap-2">
                  {COMPLEXITY_OPTIONS.map((tag) => {
                    const selected = complexityTags.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setComplexityTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Recursos</label>
                <div className="flex flex-wrap gap-2 items-center mb-3">
                  {RESOURCE_OPTIONS.map((tag) => {
                    const selected = resourceTags.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setResourceTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">N° de médicos</label>
                    <input
                      type="number"
                      min={0}
                      value={numDoctors}
                      onChange={(e) => setNumDoctors(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-slate-900 font-semibold"
                      placeholder="Ej: 5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">N° de enfermeras</label>
                    <input
                      type="number"
                      min={0}
                      value={numNurses}
                      onChange={(e) => setNumNurses(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-slate-900 font-semibold"
                      placeholder="Ej: 3"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Servicios</label>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_OPTIONS.map((tag) => {
                    const selected = serviceTags.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setServiceTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
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