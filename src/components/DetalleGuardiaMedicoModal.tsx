'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { format, differenceInHours, parseISO } from 'date-fns'
import { AlertCircle, MessageCircle, X, CalendarDays, Clock, MapPin } from 'lucide-react'

function getPublicImageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  try { return supabase.storage.from('avatars').getPublicUrl(path).data?.publicUrl || null } catch { return null }
}

export default function DetalleGuardiaMedicoModal({ onClose, onRefresh, shift, userStatus, hasOverlap = false }: any) {
  const [loading, setLoading] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [isCheckingSecurity, setIsCheckingSecurity] = useState(true)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [hasRated, setHasRated] = useState(false)
  const [coordinatorPhone, setCoordinatorPhone] = useState<string | null>(null)
  const [clinicExtras, setClinicExtras] = useState<{
    num_doctors?: number | null; num_nurses?: number | null
    resources?: string[]; rating?: number | null; reviews_count?: number | null
    avatar_url?: string | null; cover_url?: string | null
  } | null>(null)

  useEffect(() => {
    checkSecurity()
    if (userStatus === 'completada') checkExistingReview()
    const clinicId = shift.clinic_id || shift.clinic?.id
    if (clinicId) {
      const parseArr = (v: unknown): string[] => {
        if (Array.isArray(v)) return v as string[]
        if (typeof v === 'string' && v.trim()) { try { const p = JSON.parse(v); return Array.isArray(p) ? p : [v] } catch { return [v] } }
        return []
      }
      supabase.from('profiles').select('num_doctors, num_nurses, resources, rating, reviews_count, avatar_url, cover_url')
        .eq('id', clinicId).single()
        .then(({ data }) => {
          if (!data) return
          setClinicExtras({ num_doctors: data.num_doctors, num_nurses: data.num_nurses, resources: parseArr(data.resources), rating: data.rating, reviews_count: data.reviews_count, avatar_url: data.avatar_url, cover_url: data.cover_url })
        })
    }
  }, [])

  useEffect(() => {
    if (userStatus !== 'confirmado') return
    const phone = shift.clinic?.whatsapp || shift.clinic?.phone
    if (phone) { setCoordinatorPhone(phone.replace(/\D/g, '')); return }
    const clinicId = shift.clinic_id || shift.clinic?.id
    if (clinicId) {
      supabase.from('profiles').select('whatsapp, phone').eq('id', clinicId).single()
        .then(({ data }) => { const n = data?.whatsapp || data?.phone; if (n) setCoordinatorPhone(n.replace(/\D/g, '')) })
    }
  }, [userStatus, shift?.clinic_id, shift?.clinic])

  async function checkSecurity() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase.from('profiles').select('is_verified').eq('id', session.user.id).single()
    setIsVerified(data?.is_verified || false)
    setIsCheckingSecurity(false)
  }

  async function checkExistingReview() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase.from('reviews').select('id').eq('shift_id', shift.id).eq('reviewer_id', session.user.id).single()
    if (data) setHasRated(true)
  }

  async function handleApply() {
    if (!isVerified) { alert('Tu perfil no ha sido verificado por Guardian.'); return }
    if (hasOverlap) return
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.from('shift_applications').insert([{ shift_id: shift.id, professional_id: session?.user.id, status: 'pending' }])
    const clinicId = shift.clinic_id || shift.clinic?.id
    if (clinicId) {
      await supabase.from('notifications').insert([{ user_id: clinicId, shift_id: shift.id, title: '¡Nueva Postulación! 👨‍⚕️', message: `Un médico se postula a tu guardia: ${shift.title}.` }])
    }
    alert('¡Postulación enviada!'); onRefresh(); onClose()
  }

  async function handleWithdraw() {
    if (!confirm('¿Querés retirar tu postulación?')) return
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.from('shift_applications').delete().eq('shift_id', shift.id).eq('professional_id', session?.user.id)
    alert('Postulación retirada.'); onRefresh(); onClose()
  }

  async function handleCancelShift() {
    const h = differenceInHours(parseISO(shift.date_time), new Date())
    const msg = h <= 24 && h > 0
      ? `⚠️ Faltan ${h} horas. Cancelar afectará tu reputación. ¿Continuar?`
      : `¿Dar de baja tu asistencia en ${shift.clinic?.full_name}?`
    if (!confirm(msg)) return
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.from('shifts').update({ status: 'open', professional_id: null }).eq('id', shift.id)
    await supabase.from('shift_applications').delete().eq('shift_id', shift.id).eq('professional_id', session?.user.id)
    const clinicId = shift.clinic_id || shift.clinic?.id
    if (clinicId) {
      await supabase.from('notifications').insert([{ user_id: clinicId, shift_id: shift.id, title: '¡Baja de Profesional! ⚠️', message: `El médico se dio de baja de "${shift.title}". Vuelve a estar abierta.` }])
    }

    // Notificación en segundo plano (sin bloquear la UI)
    void fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'DOCTOR_CANCELLED',
        shift_id: shift.id,
        professional_id: session?.user.id,
        clinic_id: clinicId || null,
      }),
    }).catch(() => {})

    alert('Guardia cancelada.'); onRefresh(); onClose()
  }

  async function handleRateClinic(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const { error } = await supabase.from('reviews').insert([{ shift_id: shift.id, reviewer_id: session?.user.id, reviewed_id: shift.clinic_id, rating, comment }])
    if (error) alert('Error: ' + error.message)
    else { alert('¡Gracias por calificar!'); onRefresh(); onClose() }
    setLoading(false)
  }

  const location = shift.clinic?.location_maps || shift.clinic?.address || 'Ubicación no especificada'
  const shiftDate = new Date(shift.date_time)
  const coverUrl = getPublicImageUrl(clinicExtras?.cover_url)
  const avatarUrl = getPublicImageUrl(clinicExtras?.avatar_url)

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 z-50 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative my-4 overflow-hidden flex flex-col md:flex-row">

        {/* Barra acento */}
        <div className="absolute top-0 left-0 w-full md:w-1 md:h-full h-1 bg-gradient-to-r md:bg-gradient-to-b from-blue-600 to-blue-400 z-10" />

        {/* ── FOTO PORTADA: arriba mobile, izquierda desktop ── */}
        <div className="relative h-52 md:min-h-[260px] md:w-60 lg:w-72 shrink-0 overflow-hidden">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={shift.clinic?.full_name || 'Clínica'}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 288px"
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-700 via-blue-500 to-slate-600" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/60 via-black/20 to-transparent" />

          {/* Avatar + nombre */}
          <div className="absolute bottom-4 left-4 right-4 flex items-end gap-3">
            <div className="relative w-11 h-11 rounded-xl border-2 border-white bg-slate-100 overflow-hidden shrink-0 shadow-md">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="Logo" fill className="object-cover" sizes="44px" unoptimized />
              ) : (
                <span className="text-2xl flex items-center justify-center h-full">🏥</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-black text-white text-sm leading-tight drop-shadow-md truncate">{shift.clinic?.full_name || 'Clínica'}</p>
              <span className="inline-block text-[10px] font-bold bg-white/20 backdrop-blur-sm text-white px-2 py-0.5 rounded-full">{shift.specialty_required}</span>
            </div>
          </div>

          <button onClick={onClose} className="absolute top-3 right-3 text-white bg-black/30 hover:bg-black/50 backdrop-blur-sm rounded-full p-1.5 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── CONTENIDO ── */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

          {/* Detalles */}
          <div className="flex-1 p-5 space-y-4 border-b md:border-b-0 md:border-r border-slate-100 overflow-y-auto">

            {hasOverlap && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-xl font-bold text-xs">⚠️ Superposición de Horarios</div>
            )}

            <h3 className="text-base font-black text-slate-900 leading-snug">{shift.title}</h3>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <CalendarDays className="h-4 w-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-800">{format(shiftDate, 'dd/MM/yyyy')}</p>
                  <p className="text-[11px] text-slate-500">Inicio: {format(shiftDate, 'HH:mm')}hs</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-800">{shift.duration_hours ?? '—'} hs</p>
                  <p className="text-emerald-600 font-black text-sm">${Number(shift.price / 1000).toFixed(0)}k</p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-slate-600">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
              <span>{location}</span>
            </div>

            {/* Acciones según estado */}
            {userStatus === 'postulado' && (
              <div className="space-y-2">
                <p className="text-orange-600 font-bold text-xs bg-orange-50 py-2 px-3 rounded-xl border border-orange-100 text-center">⏳ Postulación en revisión</p>
                <button onClick={handleWithdraw} disabled={loading} className="w-full bg-white border-2 border-slate-200 hover:border-red-200 text-slate-600 hover:text-red-600 py-2.5 rounded-xl font-bold text-sm transition-all">
                  {loading ? '...' : 'Retirar Postulación'}
                </button>
              </div>
            )}

            {userStatus === 'confirmado' && (
              <div className="space-y-2">
                <p className="text-emerald-600 font-bold text-xs bg-emerald-50 py-2 px-3 rounded-xl border border-emerald-100 text-center">✅ Guardia Asignada</p>
                {coordinatorPhone ? (
                  <a href={`https://wa.me/${coordinatorPhone}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-2.5 rounded-xl font-bold text-sm transition-all">
                    <MessageCircle className="h-4 w-4" />Contactar por WhatsApp
                  </a>
                ) : <p className="text-xs text-slate-500 text-center">Sin número de contacto.</p>}
                <button onClick={handleCancelShift} disabled={loading} className="w-full bg-red-50 hover:bg-red-600 text-red-600 hover:text-white py-2.5 rounded-xl font-bold text-sm transition-all border border-red-200 hover:border-transparent">
                  {loading ? '...' : 'Cancelar mi asistencia'}
                </button>
              </div>
            )}

            {userStatus === 'completada' && (
              <div>
                <p className="text-slate-500 font-bold text-xs bg-slate-100 py-2 px-3 rounded-xl border text-center uppercase tracking-wider">🏁 Guardia Finalizada</p>
                {hasRated ? (
                  <p className="text-center text-sm font-black text-emerald-600 mt-3 bg-emerald-50 py-2 rounded-lg">⭐ Ya calificaste esta clínica.</p>
                ) : (
                  <form onSubmit={handleRateClinic} className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-3 space-y-3">
                    <p className="text-xs font-bold text-slate-800 text-center">Calificá a la Clínica</p>
                    <div className="flex justify-center gap-1.5">
                      {[1,2,3,4,5].map(star => (
                        <button key={star} type="button" onClick={() => setRating(star)} className={`text-2xl transition-all hover:scale-125 ${star <= rating ? 'text-amber-400' : 'text-slate-300'}`}>★</button>
                      ))}
                    </div>
                    <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="¿Te pagaron a tiempo? ¿Buen trato?" rows={2} className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-500 resize-none text-slate-900 font-medium" />
                    <button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold text-sm transition-colors">Enviar Evaluación</button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Info hospital + CTA disponible */}
          <div className="w-full md:w-56 lg:w-64 p-5 flex flex-col gap-4">
            {clinicExtras && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2.5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Hospital</p>
                {clinicExtras.reviews_count != null && clinicExtras.reviews_count > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-400 text-base">★</span>
                    <span className="font-bold text-slate-800 text-sm">{Number(clinicExtras.rating ?? 0).toFixed(1)}</span>
                    <span className="text-[11px] text-slate-500">({clinicExtras.reviews_count} reseñas)</span>
                  </div>
                ) : <p className="text-[11px] text-slate-400 italic">Sin calificaciones aún</p>}
                {(clinicExtras.num_doctors != null || clinicExtras.num_nurses != null) && (
                  <div className="flex flex-col gap-1">
                    {clinicExtras.num_doctors != null && <span className="text-xs font-semibold text-slate-700">👨‍⚕️ {clinicExtras.num_doctors} médico{clinicExtras.num_doctors !== 1 ? 's' : ''} por turno</span>}
                    {clinicExtras.num_nurses != null && <span className="text-xs font-semibold text-slate-700">🩺 {clinicExtras.num_nurses} enfermero{clinicExtras.num_nurses !== 1 ? 's' : ''} por turno</span>}
                  </div>
                )}
                {Array.isArray(clinicExtras.resources) && clinicExtras.resources.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {clinicExtras.resources.map((r, i) => <span key={i} className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{r}</span>)}
                  </div>
                )}
              </div>
            )}

            {userStatus === 'disponible' && (
              <div className="mt-auto">
                {isCheckingSecurity ? (
                  <div className="py-3 text-center text-slate-500 text-xs animate-pulse">Verificando...</div>
                ) : isVerified ? (
                  <button onClick={handleApply} disabled={loading || hasOverlap} className="w-full bg-slate-900 hover:bg-blue-700 text-white py-3 rounded-xl font-black text-sm transition-all shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0">
                    {loading ? 'Procesando...' : 'Postularme a esta Guardia'}
                  </button>
                ) : (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                    <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-1" />
                    <p className="text-red-700 font-bold text-xs">Perfil no verificado</p>
                    <p className="text-red-600/80 text-[11px] mt-0.5">Completá tu perfil para postularte.</p>
                  </div>
                )}
              </div>
            )}

            <button onClick={onClose} className="w-full text-slate-400 hover:text-slate-700 font-bold text-xs py-1.5 transition-colors uppercase tracking-widest mt-auto">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  )
}