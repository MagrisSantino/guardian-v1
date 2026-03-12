'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { BadgeCheck, AlertCircle, LogOut, Save, User, Camera, Loader2, Trash } from 'lucide-react'

export default function Perfil() {
  const [profile, setProfile] = useState<any>(null)
  const [fullName, setFullName] = useState('')
  const [dni, setDni] = useState('')
  const [matricula, setMatricula] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [bio, setBio] = useState('')
  const [birthDate, setBirthDate] = useState<string>('')
  const [specialtiesList, setSpecialtiesList] = useState<{ name: string; matricula: string }[]>([])
  const [experienceList, setExperienceList] = useState<{ place: string; time: string }[]>([])
  
  // Nuevos estados para la foto de perfil
  const [avatarUrl, setAvatarUrl] = useState<string>('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [coverUrl, setCoverUrl] = useState<string>('')
  const [uploadingCover, setUploadingCover] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Estados prestador (clinic_admin)
  const [providerType, setProviderType] = useState('')
  const [providerTypeOther, setProviderTypeOther] = useState('')
  const [institutionDescription, setInstitutionDescription] = useState('')
  const [address, setAddress] = useState('')
  const [provincia, setProvincia] = useState('')
  const [localidad, setLocalidad] = useState('')
  const [complexityTags, setComplexityTags] = useState<string[]>([])
  const [resourceTags, setResourceTags] = useState<string[]>([])
  const [numDoctors, setNumDoctors] = useState<string>('')
  const [numNurses, setNumNurses] = useState<string>('')
  const [serviceTags, setServiceTags] = useState<string[]>([])
  const [serviceInputValue, setServiceInputValue] = useState('')
  const [contactWhatsapp, setContactWhatsapp] = useState('')
  const [kmFromCba, setKmFromCba] = useState<number | null>(null)

  const PROVIDER_TYPE_OPTIONS = ['Clínica', 'Hospital', 'CAPS', 'Dispensario', 'Servicio de traslado', 'Medicina a domicilio', 'Telemedicina', 'Otro'] as const
  const COMPLEXITY_OPTIONS = ['UTI', 'UCI', 'Internado', 'Consultorio', 'Guardia'] as const
  const RESOURCE_OPTIONS = ['Rx', 'Laboratorio', 'Cocina', 'Habitación/es'] as const
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
      const birthFromProfile = (data as any).birth_date || ''
      const birthFromMeta = meta.birth_date || ''

      setFullName(data.full_name || meta.full_name || '')
      setDni(data.dni || meta.dni || '')
      setMatricula(data.matricula || meta.matricula || '')
      setBirthDate(birthFromProfile || birthFromMeta || '')
      setWhatsapp(data.whatsapp || meta.whatsapp || '')
      setBio(data.bio || meta.bio || '')
      setAvatarUrl(data.avatar_url || '')
      setCoverUrl(data.cover_url || '')
      setKmFromCba((data as any).km_from_cba ?? null)

      // Backfill: si el perfil no tiene birth_date pero el user_metadata sí,
      // lo sincronizamos a la tabla profiles para que las clínicas vean la edad.
      if (!birthFromProfile && birthFromMeta) {
        supabase
          .from('profiles')
          .update({ birth_date: birthFromMeta })
          .eq('id', session.user.id)
          .then(() => {
            // no hace falta manejar nada en UI; en el próximo fetch ya viene sincronizado
          })
      }

      // Especialidades dinámicas: specialty guarda un JSON string
      const rawSpecialties = data.specialty || meta.specialty
      try {
        if (rawSpecialties) {
          const parsed = JSON.parse(rawSpecialties as string)
          if (Array.isArray(parsed)) {
            setSpecialtiesList(
              parsed.map((item: any) => ({
                name: String(item?.name ?? ''),
                matricula: String(item?.matricula ?? ''),
              }))
            )
          }
        }
      } catch {
        // Si hay algún problema con el JSON, no rompemos la vista
        setSpecialtiesList([])
      }

      // Experiencia dinámica: experience_tags se guarda como text[]
      const tags = data.experience_tags
      const tagsArray: string[] =
        Array.isArray(tags) ? tags : typeof tags === 'string' ? (tags ? [tags] : []) : []
      setExperienceList(
        tagsArray.map((t) => {
          const [place = '', time = ''] = String(t).split(' | ')
          return { place, time }
        })
      )
      
      if (data.role === 'clinic_admin') {
        const pt = data.prestador_type || meta.prestador_type || ''
        const providerOptionsList = ['Clínica', 'Hospital', 'CAPS', 'Dispensario', 'Servicio de traslado', 'Medicina a domicilio', 'Telemedicina', 'Otro']
        if (providerOptionsList.includes(pt)) {
          setProviderType(pt)
          setProviderTypeOther('')
        } else {
          setProviderType('Otro')
          setProviderTypeOther(pt)
        }
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

  // Función para subir la foto a Supabase Storage con límite de tamaño
  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploadingAvatar(true)
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Debes seleccionar una imagen.')
      }
      
      const file = event.target.files[0]

      // --- VALIDACIONES DE SEGURIDAD ---
      // 1. Validar tamaño (Límite: 2MB)
      const maxSizeInBytes = 2 * 1024 * 1024; // 2 Megabytes
      if (file.size > maxSizeInBytes) {
        throw new Error('La imagen es demasiado pesada. El tamaño máximo permitido es 2MB.')
      }

      // 2. Validar que sea estrictamente una imagen
      if (!file.type.startsWith('image/')) {
        throw new Error('Formato inválido. Por favor, sube solo archivos de imagen (JPG, PNG, etc).')
      }
      // ---------------------------------

      const fileExt = file.name.split('.').pop()
      const filePath = `${profile.id}-${Math.random()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      setAvatarUrl(data.publicUrl)
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      // Limpiamos el input para que el usuario pueda volver a intentar si se equivocó
      event.target.value = ''
      setUploadingAvatar(false)
    }
  }

  async function uploadCover(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploadingCover(true)

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Debes seleccionar una imagen.')
      }

      const file = event.target.files[0]

      const maxSizeInBytes = 2 * 1024 * 1024 // 2MB
      if (file.size > maxSizeInBytes) {
        throw new Error('La imagen es demasiado pesada. El tamaño máximo permitido es 2MB.')
      }

      if (!file.type.startsWith('image/')) {
        throw new Error('Formato inválido. Por favor, sube solo archivos de imagen (JPG, PNG, etc).')
      }

      const fileExt = file.name.split('.').pop()
      const filePath = `cover-${profile.id}-${Math.random()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      setCoverUrl(data.publicUrl)
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      event.target.value = ''
      setUploadingCover(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    const updateData = profile.role === 'doctor'
      ? { 
          full_name: fullName, 
          dni, 
          matricula, 
          specialty: specialtiesList.length ? JSON.stringify(specialtiesList) : null,
          whatsapp: whatsapp || null, 
          bio: bio || null, 
          experience_tags: experienceList.map((exp) => `${exp.place} | ${exp.time}`),
          avatar_url: avatarUrl,
          cover_url: coverUrl,
        }
      : {
          full_name: fullName,
          prestador_type: providerType === 'Otro' ? providerTypeOther : providerType,
          bio: institutionDescription || null,
          location_maps: [address, localidad, provincia].filter(Boolean).join(', ') || null,
          whatsapp: contactWhatsapp || null,
          complexity: complexityTags,
          resources: resourceTags,
          services: serviceTags,
          avatar_url: avatarUrl,
          cover_url: coverUrl,
          km_from_cba: kmFromCba,
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

  const calculatedAge = (() => {
    if (!birthDate) return null
    const birth = new Date(birthDate)
    if (Number.isNaN(birth.getTime())) return null
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age >= 0 ? age : null
  })()

  return (
    <main className="min-h-[calc(100vh-73px)] bg-slate-50 py-10 px-4 md:px-6">
      <div className="max-w-2xl mx-auto">
        
        {/* ENCABEZADO DEL PERFIL */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-6 relative overflow-hidden">
          {isDoctor ? (
            <>
              {/* Portada clickeable */}
              <label className="block h-32 md:h-40 w-full relative cursor-pointer group overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-slate-600">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={uploadCover}
                  disabled={uploadingCover}
                />
                {coverUrl ? (
                  <img src={coverUrl} alt="Portada" className="w-full h-full object-cover" />
                ) : (
                  <span className="sr-only" aria-hidden />
                )}
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploadingCover ? (
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  ) : (
                    <>
                      <Camera className="w-6 h-6 text-white mb-1" />
                      <span className="text-white text-xs font-bold">Cambiar Portada</span>
                    </>
                  )}
                </div>
              </label>
              <div className="px-6 md:px-8 pb-6 -mt-14 md:-mt-16 relative pt-14 md:pt-16">
                <p className="text-[10px] md:text-xs text-slate-500 text-center md:text-left mb-1">
                  Sugerencia: Foto de tu recibida o trabajando
                </p>
                {/* Contenedor de la Foto de Perfil Interactiva */}
                <div className="w-28 h-28 md:w-32 md:h-32 bg-white rounded-full flex flex-col items-center justify-center shrink-0 border-4 border-white shadow-lg shadow-slate-200/80 mx-auto md:mx-0 relative group overflow-hidden">
                  <label className="absolute inset-0 w-full h-full cursor-pointer z-10">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={uploadAvatar} 
                      disabled={uploadingAvatar} 
                    />
                    {/* Overlay que aparece al pasar el mouse */}
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-6 h-6 text-white mb-1" />
                      <span className="text-white text-xs font-bold">Cambiar</span>
                    </div>
                  </label>
                  
                  {uploadingAvatar ? (
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  ) : avatarUrl ? (
                    <img src={avatarUrl} alt="Foto de perfil" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-14 h-14 md:w-16 md:h-16 text-slate-400" />
                  )}
                </div>
                
                <p className="text-[10px] md:text-xs text-slate-500 text-center md:text-left mt-2">
                  Sugerencia: Foto clara de tu rostro
                </p>
                <p className="text-[10px] md:text-xs text-slate-500 text-center md:text-left mt-0.5">
                  <span className="text-red-500 font-bold">*</span> Foto obligatoria para verificar
                </p>

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
                  {calculatedAge !== null && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {calculatedAge} años
                    </p>
                  )}
                </div>
              </div>

              {/* Banners de advertencia */}
              {!isVerified && (
                <div className="flex flex-col gap-3 mx-6 md:mx-8 mb-6">
                  {!avatarUrl && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-sm text-amber-800">
                      <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
                      <p>
                        <strong>⚠️ Foto de perfil faltante:</strong> Sube una foto tuya clara (tipo carnet) haciendo clic en el círculo de arriba. Nuestro equipo la necesita para validar tu identidad.
                      </p>
                    </div>
                  )}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-sm text-blue-800">
                    <AlertCircle className="w-5 h-5 shrink-0 text-blue-600" />
                    <p>
                      <strong>Para poder postularte a guardias</strong>, necesitamos que completes tu DNI y Matrícula. Nuestro equipo validará tu identidad a la brevedad para darte el Tilde Azul.
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="relative">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-blue-400 z-10" aria-hidden />
              {/* Portada clickeable (prestador) */}
              <label className="block h-32 md:h-40 w-full relative cursor-pointer group overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-slate-600">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={uploadCover}
                  disabled={uploadingCover}
                />
                {coverUrl ? (
                  <img src={coverUrl} alt="Portada" className="w-full h-full object-cover" />
                ) : (
                  <span className="sr-only" aria-hidden />
                )}
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploadingCover ? (
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  ) : (
                    <>
                      <Camera className="w-6 h-6 text-white mb-1" />
                      <span className="text-white text-xs font-bold">Cambiar Portada</span>
                    </>
                  )}
                </div>
              </label>
              <p className="text-[10px] md:text-xs text-slate-500 px-6 md:px-8 pt-1.5">
                Sugerencia: Foto de la fachada de la institución
              </p>
              <div className="p-6 md:p-8 relative">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  {/* Logo de la clínica (avatar) */}
                  <div className="w-24 h-24 bg-white rounded-full flex flex-col items-center justify-center shrink-0 border-4 border-white shadow-md shadow-slate-200/80 relative group overflow-hidden">
                    <label className="absolute inset-0 w-full h-full cursor-pointer z-10">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={uploadAvatar}
                        disabled={uploadingAvatar}
                      />
                      <div className="absolute inset-0 bg-black/35 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-6 h-6 text-white mb-1" />
                        <span className="text-white text-[11px] font-bold">Cambiar logo</span>
                      </div>
                    </label>
                    {uploadingAvatar ? (
                      <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
                    ) : avatarUrl ? (
                      <img src={avatarUrl} alt="Logo de la clínica" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                      <h1 className="text-2xl md:text-3xl font-black text-slate-900">
                        {fullName || 'Usuario'}
                      </h1>
                    </div>
                    <p className="text-slate-500 font-medium capitalize">Prestador de Salud</p>
                  </div>
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
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-slate-700">Especialidades</label>
                  <button
                    type="button"
                    onClick={() =>
                      setSpecialtiesList((prev) => [...prev, { name: '', matricula: '' }])
                    }
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    + Agregar especialidad
                  </button>
                </div>
                {specialtiesList.length === 0 && (
                  <p className="text-xs text-slate-400 mb-2">
                    Podés cargar tus especialidades con su matrícula correspondiente.
                  </p>
                )}
                <div className="space-y-3">
                  {specialtiesList.map((spec, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 sm:grid-cols-[1.5fr,1.2fr,auto] gap-3 items-center"
                    >
                      <input
                        type="text"
                        value={spec.name}
                        onChange={(e) => {
                          const value = e.target.value
                          setSpecialtiesList((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, name: value } : item
                            )
                          )
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm text-slate-900"
                        placeholder="Especialidad (ej: Pediatría)"
                      />
                      <input
                        type="text"
                        value={spec.matricula}
                        onChange={(e) => {
                          const value = e.target.value
                          setSpecialtiesList((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, matricula: value } : item
                            )
                          )
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm text-slate-900"
                        placeholder="Matrícula (ej: MP 1234)"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setSpecialtiesList((prev) =>
                            prev.filter((_, i) => i !== index)
                          )
                        }
                        className="inline-flex items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100 p-2"
                        aria-label="Eliminar especialidad"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
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
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-slate-700">Experiencia laboral</label>
                  <button
                    type="button"
                    onClick={() =>
                      setExperienceList((prev) => [...prev, { place: '', time: '' }])
                    }
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    + Agregar experiencia
                  </button>
                </div>
                {experienceList.length === 0 && (
                  <p className="text-xs text-slate-400 mb-2">
                    Contanos dónde trabajaste o qué tipo de tareas realizaste y por cuánto tiempo.
                  </p>
                )}
                <div className="space-y-3">
                  {experienceList.map((exp, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 sm:grid-cols-[1.5fr,1.2fr,auto] gap-3 items-center"
                    >
                      <input
                        type="text"
                        value={exp.place}
                        onChange={(e) => {
                          const value = e.target.value
                          setExperienceList((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, place: value } : item
                            )
                          )
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm text-slate-900"
                        placeholder="Lugar / Tarea (ej: Guardia central)"
                      />
                      <input
                        type="text"
                        value={exp.time}
                        onChange={(e) => {
                          const value = e.target.value
                          setExperienceList((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, time: value } : item
                            )
                          )
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm text-slate-900"
                        placeholder="Tiempo (ej: 2 años)"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setExperienceList((prev) =>
                            prev.filter((_, i) => i !== index)
                          )
                        }
                        className="inline-flex items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100 p-2"
                        aria-label="Eliminar experiencia"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
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
                  {providerType === 'Otro' && (
                    <input
                      type="text"
                      value={providerTypeOther}
                      onChange={(e) => setProviderTypeOther(e.target.value)}
                      placeholder="Escribí tu tipo de institución"
                      className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-slate-900 font-semibold"
                    />
                  )}
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
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">N° de médicos por turno</label>
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
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">N° de enfermeras por turno</label>
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
                <div className="flex flex-wrap gap-2 items-center mb-2">
                  <input
                    type="text"
                    value={serviceInputValue}
                    onChange={(e) => setServiceInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (serviceInputValue.trim()) {
                          setServiceTags((prev) => [...prev, serviceInputValue.trim()])
                          setServiceInputValue('')
                        }
                      }
                    }}
                    placeholder="Ej: Consultorio a demanda"
                    className="flex-1 min-w-[180px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (serviceInputValue.trim()) {
                        setServiceTags((prev) => [...prev, serviceInputValue.trim()])
                        setServiceInputValue('')
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Añadir
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {serviceTags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => setServiceTags((prev) => prev.filter((_, i) => i !== index))}
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-200/80 hover:bg-red-100 hover:text-red-700 text-blue-700 transition-colors"
                        aria-label="Quitar servicio"
                      >
                        ×
                      </button>
                    </span>
                  ))}
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