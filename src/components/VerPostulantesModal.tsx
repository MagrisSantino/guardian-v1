'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { MessageCircle } from 'lucide-react'

function getPublicImageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  try { return supabase.storage.from('avatars').getPublicUrl(path).data?.publicUrl || null } catch { return null }
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

function parseExperience(experienceTags: string[] | null | undefined): { place: string; time: string }[] {
  if (!experienceTags || !Array.isArray(experienceTags)) return []
  return experienceTags.map((t) => {
    const [place = '', time = ''] = String(t).split(' | ')
    return { place: place.trim(), time: time.trim() }
  }).filter((x) => x.place !== '' || x.time !== '')
}

export default function VerPostulantesModal({ onClose, onRefresh, shift }: any) {
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApp, setSelectedApp] = useState<any>(null)
  const [selectedProfile, setSelectedProfile] = useState<any>(null)
  const [selectedContact, setSelectedContact] = useState<{ whatsapp?: string | null; phone?: string | null } | null>(null)
  const [doctorReviews, setDoctorReviews] = useState<any[]>([])
  const [loadingReviews, setLoadingReviews] = useState(false)

  useEffect(() => { fetchApplications() }, [shift?.id])

  useEffect(() => {
    if (!selectedApp) return
    const doctorId = selectedApp.doctor?.id
    if (!doctorId) return
    setLoadingReviews(true)
    Promise.all([
      supabase.from('doctor_profiles')
        .select('birth_date, university, dni, matricula, specialty_verified')
        .eq('id', doctorId)
        .single(),
      selectedApp.status === 'accepted'
        ? supabase.from('accounts').select('whatsapp, phone').eq('id', doctorId).single()
        : Promise.resolve({ data: null }),
      supabase.from('reviews')
        .select('rating, comment, created_at, clinic:accounts_public!reviewer_id(full_name)')
        .eq('reviewed_id', doctorId)
        .order('created_at', { ascending: false })
        .limit(5),
    ]).then(([profileRes, contactRes, reviewsRes]) => {
      if (profileRes.data) setSelectedProfile(profileRes.data)
      if (contactRes.data) setSelectedContact(contactRes.data)
      if (reviewsRes.data) setDoctorReviews(reviewsRes.data)
      setLoadingReviews(false)
    })
  }, [selectedApp])

  async function fetchApplications() {
    setLoading(true)
    const { data } = await supabase
      .from('shift_applications')
      .select(`
        *,
        doctor:accounts_public!doctor_id(
          id, full_name, avatar_url, cover_url, is_verified,
          specialty, doctor_bio, experience_tags, km_from_cba,
          doctor_rating, doctor_reviews_count
        )
      `)
      .eq('shift_id', shift.id)
      .in('status', ['pending', 'accepted'])
      .order('id', { ascending: false })
    if (data) setApplications(data)
    setLoading(false)
  }

  async function handleAccept(applicationId: string) {
    if (!confirm('¿Estás seguro de asignar la guardia a este profesional?')) return
    setLoading(true)
    const res = await fetch('/api/shifts/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ application_id: applicationId }),
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok || !payload?.ok) {
      alert(typeof payload?.error === 'string' ? payload.error : 'No se pudo asignar la guardia.')
      setLoading(false)
      return
    }
    alert('¡Médico asignado correctamente!')
    onRefresh()
    onClose()
  }

  async function handleDeleteShift() {
    if (!confirm('¿Cancelar esta guardia? Los postulantes serán notificados automáticamente.')) return
    setLoading(true)
    try {
      const res = await fetch('/api/shifts/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift_id: shift.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { alert(data.error || 'Error al cancelar la guardia.'); setLoading(false); return }
    } catch {
      alert('Error de conexión. Intentá de nuevo.'); setLoading(false); return
    }
    onRefresh()
    onClose()
  }

  const shiftStartLabel = shift?.starts_at
    ? format(new Date(shift.starts_at), 'dd/MM/yyyy HH:mm')
    : '—'

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl transition-all overflow-hidden max-h-[90vh] flex flex-col">

        {selectedApp ? (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col overflow-y-auto flex-1 min-h-0">
            <button onClick={() => { setSelectedApp(null); setSelectedProfile(null); setSelectedContact(null); setDoctorReviews([]) }}
              className="text-slate-500 hover:text-blue-600 p-4 pb-2 text-sm font-bold flex items-center gap-1 transition-colors shrink-0">
              &larr; Volver a la lista
            </button>

            <div className="relative h-32 md:h-40 w-full shrink-0 overflow-hidden">
              {getPublicImageUrl(selectedApp.doctor?.cover_url) ? (
                <Image src={getPublicImageUrl(selectedApp.doctor.cover_url)!} alt="Portada" fill className="object-cover" sizes="100vw" unoptimized />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400" />
              )}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
                <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white bg-slate-100 shadow-xl overflow-hidden flex items-center justify-center">
                  {getPublicImageUrl(selectedApp.doctor?.avatar_url) ? (
                    <Image src={getPublicImageUrl(selectedApp.doctor.avatar_url)!} alt="Avatar" fill className="object-cover" sizes="96px" unoptimized />
                  ) : (
                    <span className="text-3xl md:text-4xl">👨‍⚕️</span>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 pt-12 flex-1">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 text-center flex items-center justify-center gap-2 flex-wrap">
                {selectedApp.doctor?.full_name || 'Dr. Sin Nombre'}
                {selectedApp.doctor?.is_verified && (
                  <span className="bg-blue-600 text-white text-[10px] w-6 h-6 flex items-center justify-center rounded-full shadow-sm" title="Verificado">✓</span>
                )}
              </h2>
              {selectedProfile && getAge(selectedProfile.birth_date) != null && (
                <p className="text-center text-lg text-slate-600 font-medium mt-1">{getAge(selectedProfile.birth_date)} años</p>
              )}
              <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-slate-800 mt-2">
                <span className="text-amber-400 text-lg leading-none">★</span>
                <span>{(selectedApp.doctor?.doctor_reviews_count ?? 0) > 0 ? Number(selectedApp.doctor.doctor_rating).toFixed(2) : 'Nuevo'}</span>
                <span className="text-xs text-slate-400 font-medium">({selectedApp.doctor?.doctor_reviews_count ?? 0} reseñas)</span>
              </div>
              {selectedProfile?.university && (
                <div className="flex items-center justify-center mt-3">
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                    🎓 {selectedProfile.university}
                  </span>
                </div>
              )}

              {selectedApp.doctor?.doctor_bio && (
                <div className="mt-5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Presentación</p>
                  <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">{selectedApp.doctor.doctor_bio}</p>
                </div>
              )}

              {(selectedProfile?.dni || selectedProfile?.matricula || (selectedApp.status === 'accepted' && (selectedContact?.whatsapp || selectedContact?.phone))) && (
                <div className="mt-5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Contacto y legales</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {selectedProfile?.dni && (
                      <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">DNI</p>
                        <p className="text-sm font-semibold text-slate-900">{selectedProfile.dni}</p>
                      </div>
                    )}
                    {selectedApp.status === 'accepted' && (selectedContact?.whatsapp || selectedContact?.phone) && (
                      <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">WhatsApp</p>
                        <p className="text-sm font-semibold text-slate-900">{selectedContact.whatsapp || selectedContact.phone}</p>
                      </div>
                    )}
                    {selectedProfile?.matricula && (
                      <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Matrícula</p>
                        <p className="text-sm font-semibold text-slate-900">{selectedProfile.matricula}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedProfile?.specialty_verified && selectedProfile.specialty_verified.length > 0 && (
                <div className="mt-5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Especialidades verificadas</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedProfile.specialty_verified.map((s: string, i: number) => (
                      <span key={i} className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {(() => {
                const exp = parseExperience(selectedApp.doctor?.experience_tags)
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

              <div className="mt-6">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Últimas Reseñas de Clínicas</h3>
                <div className="space-y-3 min-h-[50px] max-h-[180px] overflow-y-auto pr-2">
                  {loadingReviews ? (
                    <p className="text-xs text-slate-500 text-center py-4">Cargando comentarios...</p>
                  ) : doctorReviews.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4 italic bg-slate-50 rounded-lg border border-slate-100">Sin comentarios aún.</p>
                  ) : (
                    doctorReviews.map((review, idx) => (
                      <div key={idx} className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-slate-700">{(review.clinic as any)?.full_name || 'Clínica Anónima'}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-amber-400 text-xs">★</span>
                            <span className="text-xs font-bold text-slate-800">{review.rating}</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 mb-2 leading-relaxed">&ldquo;{review.comment || 'Sin comentario.'}&rdquo;</p>
                        <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">
                          {format(new Date(review.created_at), 'MMM yyyy', { locale: es })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {selectedApp.status === 'accepted' ? (
                (() => {
                  const waNumber = (selectedContact?.whatsapp || selectedContact?.phone)?.replace(/\D/g, '')
                  return waNumber ? (
                    <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-3.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all text-base mt-6">
                      <MessageCircle className="h-5 w-5" />
                      Contactar a este Médico
                    </a>
                  ) : (
                    <p className="text-center text-sm text-slate-500 py-4 mt-4">Este médico no tiene WhatsApp cargado.</p>
                  )
                })()
              ) : (
                <button onClick={() => handleAccept(selectedApp.id)}
                  className="w-full bg-slate-900 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-md transition-all text-base mt-6">
                  Asignar Guardia a {selectedApp.doctor?.full_name?.split(' ')[0] || 'este médico'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300 flex flex-col flex-1 min-h-0">
            <div className="flex justify-between items-start p-6 pb-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{shift.title}</h2>
                <p className="text-slate-500 text-sm mt-1">{shiftStartLabel}hs{shift.price != null ? ` | $${shift.price.toLocaleString()}` : ''}</p>
              </div>
              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-200 uppercase whitespace-nowrap">
                {applications.length} Postulantes
              </span>
            </div>

            <div className="space-y-3 min-h-[150px] flex-1 overflow-y-auto p-4 pt-2 pr-2">
              {loading ? (
                <p className="text-center text-slate-400 mt-10">Cargando profesionales...</p>
              ) : applications.length === 0 ? (
                <p className="text-center text-slate-400 mt-10">Aún no hay profesionales postulados.</p>
              ) : (
                applications.map(app => {
                  const doc = app.doctor
                  const ratingDisplay = (doc?.doctor_reviews_count ?? 0) > 0 ? Number(doc.doctor_rating).toFixed(2) : 'Nuevo'
                  const isAccepted = app.status === 'accepted'
                  const avatarSrc = getPublicImageUrl(doc?.avatar_url)
                  const specialtyLabel = Array.isArray(doc?.specialty) && doc.specialty.length > 0 ? doc.specialty.join(', ') : 'General'

                  return (
                    <div key={app.id} onClick={() => setSelectedApp(app)}
                      className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all cursor-pointer gap-4 group">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-full border-2 border-slate-200 bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                          {avatarSrc ? (
                            <Image src={avatarSrc} alt="" width={48} height={48} className="w-full h-full object-cover" unoptimized />
                          ) : (
                            <span className="text-xl">👨‍⚕️</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-slate-900 text-base group-hover:text-blue-700 transition-colors">{doc?.full_name || 'Dr. Sin Nombre'}</p>
                            {doc?.is_verified && (
                              <span className="bg-blue-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full shrink-0" title="Verificado">✓</span>
                            )}
                            {isAccepted && (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase shrink-0">Asignado</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mt-1">
                            <span className="text-amber-400 text-sm">★</span>
                            <span>{ratingDisplay}</span>
                            <span className="text-slate-400 font-medium ml-1">• {specialtyLabel}</span>
                          </div>
                        </div>
                      </div>
                      {!isAccepted && (
                        <button onClick={(e) => { e.stopPropagation(); handleAccept(app.id) }}
                          className="w-full sm:w-auto bg-white border border-slate-300 hover:bg-slate-900 hover:text-white hover:border-slate-900 text-slate-700 px-5 py-2 rounded-lg text-sm font-bold shadow-sm transition-all shrink-0">
                          Asignar
                        </button>
                      )}
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
