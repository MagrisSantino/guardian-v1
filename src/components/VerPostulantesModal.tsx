'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { MessageCircle } from 'lucide-react'

function getPublicImageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  try {
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return data?.publicUrl || null
  } catch {
    return null
  }
}

function getAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null
  const d = new Date(birthDate)
  if (Number.isNaN(d.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - d.getFullYear()
  const m = today.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--
  return age >= 0 ? age : null
}

function parseSpecialties(specialty: string | null | undefined): { name: string; matricula: string }[] {
  if (!specialty) return []
  try {
    const raw = typeof specialty === 'string' ? specialty : JSON.stringify(specialty)
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map((item: any) => ({
      name: String(item?.name ?? ''),
      matricula: String(item?.matricula ?? '')
    })).filter((x: { name: string }) => x.name.trim() !== '')
  } catch {
    return []
  }
}

function parseExperience(experienceTags: string[] | string | null | undefined): { place: string; time: string }[] {
  if (!experienceTags) return []
  const arr = Array.isArray(experienceTags) ? experienceTags : typeof experienceTags === 'string' ? [experienceTags] : []
  return arr.map((t) => {
    const [place = '', time = ''] = String(t).split(' | ')
    return { place: place.trim(), time: time.trim() }
  }).filter((x) => x.place !== '' || x.time !== '')
}

export default function VerPostulantesModal({ onClose, onRefresh, shift }: any) {
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApp, setSelectedApp] = useState<any>(null)

  const [doctorReviews, setDoctorReviews] = useState<any[]>([])
  const [loadingReviews, setLoadingReviews] = useState(false)

  useEffect(() => {
    fetchApplications()
  }, [])

  useEffect(() => {
    if (selectedApp) {
      fetchDoctorReviews(selectedApp.professional.id)
    }
  }, [selectedApp])

  async function fetchApplications() {
    const { data } = await supabase
      .from('shift_applications')
      .select('*, professional:profiles!professional_id(*)')
      .eq('shift_id', shift.id)
      .in('status', ['pending', 'accepted'])

    if (data) setApplications(data)
    setLoading(false)
  }

  async function fetchDoctorReviews(doctorId: string) {
    setLoadingReviews(true)
    const { data } = await supabase
      .from('reviews')
      .select('rating, comment, created_at, clinic:profiles!reviewer_id(full_name)')
      .eq('reviewed_id', doctorId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (data) setDoctorReviews(data)
    setLoadingReviews(false)
  }

  async function handleAccept(applicationId: string, professionalId: string) {
    if (!confirm('¿Estás seguro de asignar la guardia a este profesional?')) return
    setLoading(true)

    await supabase.from('shifts').update({ status: 'filled', professional_id: professionalId }).eq('id', shift.id)
    await supabase.from('shift_applications').update({ status: 'accepted' }).eq('id', applicationId)
    await supabase.from('shift_applications').update({ status: 'rejected' }).eq('shift_id', shift.id).eq('status', 'pending')

    // Notificación al ganador
    await supabase.from('notifications').insert([{
      user_id: professionalId,
      shift_id: shift.id,
      title: '¡Guardia Asignada!',
      message: 'La clínica te ha asignado la guardia.'
    }])

    // Notificaciones a los rechazados (demás postulantes a esta guardia)
    const { data: rejectedApps } = await supabase
      .from('shift_applications')
      .select('professional_id')
      .eq('shift_id', shift.id)
      .neq('professional_id', professionalId)
    const rejectedIds = (rejectedApps || []).map((r: { professional_id: string }) => r.professional_id)
    if (rejectedIds.length > 0) {
      await supabase.from('notifications').insert(
        rejectedIds.map((user_id: string) => ({
          user_id,
          shift_id: shift.id,
          title: 'Guardia Cubierta',
          message: 'La guardia a la que te postulaste ya fue cubierta por otro profesional.'
        }))
      )
    }

    alert('¡Médico asignado correctamente!')
    onRefresh()
    onClose()
  }

  async function handleDeleteShift() {
    if (!confirm('¿Eliminar esta guardia definitivamente?')) return
    await supabase.from('shifts').delete().eq('id', shift.id)
    onRefresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl transition-all overflow-hidden max-h-[90vh] flex flex-col">

        {selectedApp ? (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col overflow-y-auto flex-1 min-h-0">
            <button
              onClick={() => setSelectedApp(null)}
              className="text-slate-500 hover:text-blue-600 p-4 pb-2 text-sm font-bold flex items-center gap-1 transition-colors shrink-0"
            >
              &larr; Volver a la lista
            </button>

            {/* Banner + avatar estilo red social */}
            <div className="relative h-32 md:h-40 w-full shrink-0">
              {getPublicImageUrl(selectedApp.professional?.cover_url) ? (
                <img
                  src={getPublicImageUrl(selectedApp.professional?.cover_url)!}
                  alt="Portada"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400" />
              )}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white bg-slate-100 shadow-xl overflow-hidden flex items-center justify-center">
                  {getPublicImageUrl(selectedApp.professional?.avatar_url) ? (
                    <img
                      src={getPublicImageUrl(selectedApp.professional?.avatar_url)!}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl md:text-4xl">👨‍⚕️</span>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 pt-12 flex-1">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 text-center flex items-center justify-center gap-2 flex-wrap">
                {selectedApp.professional.full_name || 'Dr. Sin Nombre'}
                {selectedApp.professional.is_verified && (
                  <span className="bg-blue-600 text-white text-[10px] w-6 h-6 flex items-center justify-center rounded-full shadow-sm" title="Verificado">✓</span>
                )}
              </h2>
              {getAge(selectedApp.professional?.birth_date) != null && (
                <p className="text-center text-lg text-slate-600 font-medium mt-1">{getAge(selectedApp.professional.birth_date)} años</p>
              )}
              <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-slate-800 mt-2">
                <span className="text-amber-400 text-lg leading-none">★</span>
                <span>{selectedApp.professional.reviews_count > 0 ? Number(selectedApp.professional.rating).toFixed(2) : 'Nuevo'}</span>
                <span className="text-xs text-slate-400 font-medium">({selectedApp.professional.reviews_count} reseñas)</span>
              </div>

              {/* Bio / Presentación */}
              {selectedApp.professional?.bio && String(selectedApp.professional.bio).trim() !== '' && (
                <div className="mt-5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Presentación</p>
                  <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">{selectedApp.professional.bio}</p>
                </div>
              )}

              {/* Contacto y legales: DNI, WhatsApp, Matrícula General */}
              {((selectedApp.professional?.dni != null && String(selectedApp.professional.dni).trim() !== '') ||
                (selectedApp.professional?.whatsapp || selectedApp.professional?.phone) ||
                ((selectedApp.professional?.matricula != null && String(selectedApp.professional.matricula).trim() !== '') || (selectedApp.professional?.medical_license != null && String(selectedApp.professional.medical_license).trim() !== ''))) && (
                <div className="mt-5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Contacto y legales</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {selectedApp.professional?.dni != null && String(selectedApp.professional.dni).trim() !== '' && (
                      <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">DNI</p>
                        <p className="text-sm font-semibold text-slate-900">{selectedApp.professional.dni}</p>
                      </div>
                    )}
                    {(selectedApp.professional?.whatsapp || selectedApp.professional?.phone) && (
                      <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">WhatsApp</p>
                        <p className="text-sm font-semibold text-slate-900">{selectedApp.professional.whatsapp || selectedApp.professional.phone || '—'}</p>
                      </div>
                    )}
                    {((selectedApp.professional?.matricula != null && String(selectedApp.professional.matricula).trim() !== '') || (selectedApp.professional?.medical_license != null && String(selectedApp.professional.medical_license).trim() !== '')) && (
                      <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Matrícula General</p>
                        <p className="text-sm font-semibold text-slate-900">{selectedApp.professional.matricula || selectedApp.professional.medical_license || '—'}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Matrículas de especialidad (JSON.parse de specialty) */}
              {(() => {
                const specialties = parseSpecialties(selectedApp.professional?.specialty)
                if (specialties.length === 0) return null
                return (
                  <div className="mt-5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Matrículas por especialidad</p>
                    <ul className="space-y-2">
                      {specialties.map((s, i) => (
                        <li key={i} className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 flex justify-between items-center gap-2">
                          <span className="font-semibold text-slate-900">{s.name}</span>
                          <span className="text-xs text-slate-600 font-medium">{s.matricula || '—'}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })()}

              {/* Experiencia (split ' | ' de experience_tags) */}
              {(() => {
                const exp = parseExperience(selectedApp.professional?.experience_tags)
                if (exp.length === 0) return null
                return (
                  <div className="mt-5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Experiencia</p>
                    <ul className="space-y-2">
                      {exp.map((e, i) => (
                        <li key={i} className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                          <span className="font-semibold text-slate-900">{e.place}</span>
                          {e.time && <span className="text-slate-600 text-sm ml-2">· {e.time}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })()}

              {/* Reseñas */}
              <div className="mt-6">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  Últimas Reseñas de Clínicas
                </h3>
                <div className="space-y-3 min-h-[50px] max-h-[180px] overflow-y-auto custom-scrollbar pr-2">
                  {loadingReviews ? (
                    <p className="text-xs text-slate-500 text-center py-4">Cargando comentarios...</p>
                  ) : doctorReviews.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4 italic bg-slate-50 rounded-lg border border-slate-100">Este profesional aún no tiene comentarios escritos.</p>
                  ) : (
                    doctorReviews.map((review, idx) => (
                      <div key={idx} className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-slate-700">{review.clinic?.full_name || 'Clínica Anónima'}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-amber-400 text-xs">★</span>
                            <span className="text-xs font-bold text-slate-800">{review.rating}</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 mb-2 leading-relaxed">"{review.comment || 'Sin comentario detallado.'}"</p>
                        <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">
                          {format(new Date(review.created_at), 'MMM yyyy', { locale: es })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Botón Asignar / Contactar */}
              {selectedApp.status === 'accepted' ? (
                (() => {
                  const whatsapp = selectedApp.professional?.whatsapp || selectedApp.professional?.phone
                  const waNumber = whatsapp ? String(whatsapp).replace(/\D/g, '') : null
                  return waNumber ? (
                    <a
                      href={`https://wa.me/${waNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-3.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all text-base mt-6"
                    >
                      <MessageCircle className="h-5 w-5" />
                      Contactar a este Médico
                    </a>
                  ) : (
                    <p className="text-center text-sm text-slate-500 py-4 mt-4">Este médico no tiene WhatsApp cargado.</p>
                  )
                })()
              ) : (
                <button
                  onClick={() => handleAccept(selectedApp.id, selectedApp.professional_id)}
                  className="w-full bg-slate-900 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-md hover:shadow-blue-900/20 transition-all text-base mt-6"
                >
                  Asignar Guardia a {selectedApp.professional.full_name?.split(' ')[0] || 'este médico'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300 flex flex-col flex-1 min-h-0">
            <div className="flex justify-between items-start p-6 pb-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{shift.title}</h2>
                <p className="text-slate-500 text-sm mt-1">{format(new Date(shift.date_time), 'dd/MM/yyyy HH:mm')}hs | ${shift.price.toLocaleString()}</p>
              </div>
              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-200 uppercase whitespace-nowrap">
                {applications.length} Postulantes
              </span>
            </div>

            <div className="space-y-3 min-h-[150px] flex-1 overflow-y-auto p-4 pt-2 custom-scrollbar pr-2">
              {loading ? (
                <p className="text-center text-slate-400 mt-10">Cargando profesionales...</p>
              ) : applications.length === 0 ? (
                <p className="text-center text-slate-400 mt-10">Aún no hay profesionales postulados.</p>
              ) : (
                applications.map(app => {
                  const prof = app.professional
                  const ratingDisplay = prof.reviews_count > 0 ? Number(prof.rating).toFixed(2) : 'Nuevo'
                  const isAccepted = app.status === 'accepted'
                  const waNumber = (prof?.whatsapp || prof?.phone) && String(prof.whatsapp || prof.phone).replace(/\D/g, '')
                  const avatarSrc = getPublicImageUrl(prof?.avatar_url)
                  const age = getAge(prof?.birth_date)

                  return (
                    <div
                      key={app.id}
                      onClick={() => setSelectedApp(app)}
                      className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md hover:shadow-blue-900/5 transition-all cursor-pointer gap-4 group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-full border-2 border-slate-200 bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                          {avatarSrc ? (
                            <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl">👨‍⚕️</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-slate-900 text-base group-hover:text-blue-700 transition-colors">
                              {prof.full_name || 'Dr. Sin Nombre'}
                            </p>
                            {prof.is_verified && (
                              <span className="bg-blue-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full shrink-0" title="Verificado">✓</span>
                            )}
                            {isAccepted && (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase shrink-0">Asignado</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mt-1">
                            <span className="text-amber-400 text-sm">★</span>
                            <span>{ratingDisplay}</span>
                            <span className="text-slate-400 font-medium ml-1">
                              •{' '}
                              {prof.specialty
                                ? (() => {
                                    const sp = parseSpecialties(prof.specialty)
                                    return sp.length ? sp.map((s) => s.name).join(', ') : 'General'
                                  })()
                                : 'General'}
                            </span>
                          </div>
                          {age != null && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              Edad: <span className="font-semibold">{age} años</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {isAccepted && waNumber ? (
                        <a
                          href={`https://wa.me/${waNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 w-full sm:w-auto justify-center bg-[#25D366] hover:bg-[#20bd5a] text-white px-5 py-2 rounded-lg text-sm font-bold shadow-sm transition-all shrink-0"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Contactar
                        </a>
                      ) : !isAccepted ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAccept(app.id, app.professional_id); }}
                          className="w-full sm:w-auto bg-white border border-slate-300 hover:bg-slate-900 hover:text-white hover:border-slate-900 text-slate-700 px-5 py-2 rounded-lg text-sm font-bold shadow-sm transition-all shrink-0"
                        >
                          Asignar
                        </button>
                      ) : null}
                    </div>
                  )
                })
              )}
            </div>

            <div className="flex justify-between p-4 pt-4 border-t border-slate-100 shrink-0">
              <button onClick={handleDeleteShift} className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-bold transition-all">Eliminar Guardia</button>
              <button onClick={onClose} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-6 py-2 rounded-lg font-bold transition-all shadow-sm">Cerrar</button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
