'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { AlertCircle, Activity, CalendarDays, Ambulance, MapPin, Clock, DollarSign, Briefcase, X } from 'lucide-react'
import { GoogleMap, Marker } from '@react-google-maps/api'
import { useGoogleMapsLoaded } from '@/components/GoogleMapsProvider'
import { isGeneralSpecialty, specialtiesMatch } from '@/lib/specialties'

const CBA_CAPITAL = { lat: -31.4201, lng: -64.1888 }

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function getPublicImageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  try { return supabase.storage.from('avatars').getPublicUrl(path).data?.publicUrl || null } catch { return null }
}

export default function ExplorarGuardiaModal({
  shift, onClose, onRefresh, onApply, onWithdraw, hasApplied: hasAppliedProp, loadingBtn, hasOverlap = false
}: {
  shift: any; onClose: () => void; onRefresh?: () => void
  onApply?: (shiftId: string) => Promise<void>; onWithdraw?: (shiftId: string) => void
  hasApplied?: boolean; loadingBtn?: string | null; hasOverlap?: boolean
}) {
  const clinicId = shift?.clinic_id || shift?.clinic?.id

  // parseArr helper (needed for resources from shift.clinic which may be JSON string)
  const parseArr = (v: unknown): string[] => {
    if (Array.isArray(v)) return v as string[]
    if (typeof v === 'string' && v.trim()) { try { const p = JSON.parse(v); return Array.isArray(p) ? p : [v] } catch { return [v] } }
    return []
  }

  // ── Init states with already-available data from the shift join ──────────
  const c = shift?.clinic || {}
  const [loading, setLoading] = useState(false)
  // Verificación: leemos caché de sessionStorage para evitar el flash "Verificando"
  const cachedVerified = typeof window !== 'undefined' ? sessionStorage.getItem('medico_is_verified') : null
  const [isVerified, setIsVerified] = useState(cachedVerified === 'true')

  // Especialidades del médico (objetos {name, verified}) para gate por especialidad
  const doctorSpecialties: {name: string; verified: boolean}[] = (() => {
    if (typeof window === 'undefined') return []
    try {
      const cached = sessionStorage.getItem('medico_specialties_cache')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed)) return parsed
      }
    } catch {}
    return []
  })()
  const [checkingAuth, setCheckingAuth] = useState(cachedVerified === null) // solo spinner si no hay caché
  const [hasApplied, setHasApplied] = useState(hasAppliedProp ?? false)
  const [clinicProfile, setClinicProfile] = useState<{
    avatar_url?: string | null; cover_url?: string | null
    num_doctors?: number | null; num_nurses?: number | null
    resources?: string[] | null; rating?: number | null; reviews_count?: number | null
  }>({
    avatar_url: c.avatar_url ?? null,
    cover_url: c.cover_url ?? null,
    num_doctors: c.num_doctors ?? null,
    num_nurses: c.num_nurses ?? null,
    resources: parseArr(c.resources),
    rating: c.rating ?? null,
    reviews_count: c.reviews_count ?? null,
  })
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [distanceKm, setDistanceKm] = useState<number | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(false)

  useEffect(() => {
    // Auth: si ya tenemos caché no hacemos query
    if (cachedVerified !== null) return
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('is_verified').eq('id', user.id).single()
          .then(({ data }) => {
            const v = data?.is_verified === true
            setIsVerified(v)
            sessionStorage.setItem('medico_is_verified', String(v))
          })
      }
      setCheckingAuth(false)
    })
  }, [])

  useEffect(() => {
    if (!shift?.id || !clinicId) return
    Promise.all([
      supabase.from('profiles').select('avatar_url, cover_url, num_doctors, num_nurses, resources, rating, reviews_count').eq('id', clinicId).single(),
      supabase.auth.getUser()
    ]).then(([profileRes, userRes]) => {
      if (profileRes.data) {
        const r = profileRes.data
        setClinicProfile({ avatar_url: r.avatar_url, cover_url: r.cover_url, num_doctors: r.num_doctors, num_nurses: r.num_nurses, resources: parseArr(r.resources), rating: r.rating, reviews_count: r.reviews_count })
      }
      // Solo chequeamos postulación si el padre no nos pasó hasApplied ya
      const user = userRes.data?.user
      if (user?.id && hasAppliedProp === undefined) {
        supabase.from('shift_applications').select('id').eq('shift_id', shift.id).eq('professional_id', user.id).maybeSingle()
          .then(({ data }) => setHasApplied(!!data))
      }
    })
  }, [shift?.id, clinicId])

  async function handleApply() {
    if (!isVerified || hasOverlap || hasApplied) return
    if (onApply) { await onApply(shift.id); setHasApplied(true); onRefresh?.(); onClose(); return }
    setLoading(true)
    try {
      const res = await fetch('/api/shifts/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift_id: shift.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { alert(data.error || 'Error al postularse. Intentá de nuevo.'); setLoading(false); return }
    } catch {
      alert('Error de conexión. Intentá de nuevo.'); setLoading(false); return
    }
    setHasApplied(true); alert('¡Postulación enviada!'); onRefresh?.(); onClose()
  }

  const mapsLoaded = useGoogleMapsLoaded()

  const coverUrl = getPublicImageUrl(clinicProfile?.cover_url)
  const avatarUrl = getPublicImageUrl(clinicProfile?.avatar_url)
  const category = shift?.shift_category || 'Guardia'
  const CategoryIcon = category === 'Guardia' ? Activity : category === 'Consultorio' ? CalendarDays : Ambulance
  const categoryColor = category === 'Guardia' ? 'text-red-500' : category === 'Consultorio' ? 'text-blue-600' : 'text-emerald-600'
  const location = shift?.clinic?.location_maps || shift?.clinic?.address || '—'
  const viaticos = shift?.viaticos ?? 'No'
  const paymentTimeframe = shift?.payment_timeframe ?? null

  useEffect(() => {
    if (!mapsLoaded || !location || coordinates) return
    const g = (window as any).google?.maps
    if (!g?.Geocoder) return
    new g.Geocoder().geocode({ address: location }, (results: any, status: string) => {
      if (status === 'OK' && results?.[0]) {
        const loc = results[0].geometry.location
        setCoordinates({ lat: loc.lat(), lng: loc.lng() })
        setDistanceKm(Math.round(haversineKm(loc.lat(), loc.lng(), CBA_CAPITAL.lat, CBA_CAPITAL.lng)))
      } else setMapError('Mapa no disponible para esta ubicación')
    })
  }, [mapsLoaded, location, coordinates])

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 z-50 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl shadow-2xl animate-in fade-in zoom-in-95 relative my-4 overflow-hidden flex flex-col md:flex-row">

        {/* ── FOTO PORTADA: arriba en mobile, columna izquierda en desktop ── */}
        <div className="relative h-52 md:min-h-[280px] md:w-64 lg:w-80 shrink-0 overflow-hidden">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={shift?.clinic?.full_name || 'Clínica'}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 320px"
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-700 via-blue-500 to-slate-600" />
          )}
          {/* Degradé inferior en mobile / lateral en desktop */}
          <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/60 via-black/20 to-transparent" />

          {/* Avatar + nombre encima de la foto */}
          <div className="absolute bottom-4 left-4 right-4 flex items-end gap-3">
            <div className="relative w-12 h-12 rounded-xl border-2 border-white bg-slate-100 overflow-hidden shrink-0 shadow-md">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="Logo" fill className="object-cover" sizes="48px" unoptimized />
              ) : (
                <span className="text-2xl flex items-center justify-center h-full">🏥</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-black text-white text-sm leading-tight drop-shadow-md truncate">{shift?.clinic?.full_name || 'Clínica'}</p>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-white/20 backdrop-blur-sm text-white px-2 py-0.5 rounded-full">
                <CategoryIcon className={`h-3 w-3 ${categoryColor}`} />
                {shift?.specialty_required}
              </span>
            </div>
          </div>

          {/* Botón cerrar sobre la foto */}
          <button onClick={onClose} className="absolute top-3 right-3 text-white bg-black/30 hover:bg-black/50 backdrop-blur-sm rounded-full p-1.5 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── CONTENIDO: detalles + info hospital + CTA ────────────────── */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

          {/* Detalles de la guardia */}
          <div className="flex-1 p-5 space-y-4 border-b md:border-b-0 md:border-r border-slate-100 overflow-y-auto">

            {hasOverlap && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-xl font-bold text-xs">⚠️ Superposición de Horarios</div>
            )}

            <h3 className="text-base font-black text-slate-900 leading-snug">{shift?.title}</h3>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <CalendarDays className="h-4 w-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-800">{shift?.date_time ? format(new Date(shift.date_time), 'dd/MM/yyyy') : '—'}</p>
                  {shift?.date_time && <p className="text-[11px] text-slate-500">Inicio: {format(new Date(shift.date_time), 'HH:mm')}hs</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-800">{Number(shift?.duration_hours ?? 0)} hs</p>
                  <p className="text-emerald-600 font-black text-sm">${Number(shift?.price || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 text-slate-600 text-xs">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
              <div>
                <span className="font-medium">{location}</span>
                {distanceKm != null && <span className="block text-slate-400">a {distanceKm}km de Córdoba Capital</span>}
                <button type="button" onClick={() => setShowMap(p => !p)} className="mt-1 font-semibold text-blue-600 hover:underline underline-offset-2">
                  {showMap ? 'Ocultar mapa' : 'Ver en el mapa'}
                </button>
              </div>
            </div>

            {showMap && (
              <div className="h-44 w-full overflow-hidden rounded-xl border border-slate-200">
                {mapsLoaded && coordinates ? (
                  <GoogleMap center={coordinates} zoom={14} mapContainerClassName="w-full h-full"><Marker position={coordinates} /></GoogleMap>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-500">{mapError || 'Cargando mapa...'}</div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${category === 'Guardia' ? 'border-red-100 bg-red-50 text-red-700' : category === 'Consultorio' ? 'border-blue-100 bg-blue-50 text-blue-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
                <CategoryIcon className="h-3 w-3" />{category}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                <Briefcase className="h-3 w-3" />Viáticos: {viaticos}
              </span>
              {paymentTimeframe && String(paymentTimeframe).trim() !== '' && (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                  <DollarSign className="h-3 w-3" />Días a pagar: {paymentTimeframe}
                </span>
              )}
            </div>
          </div>

          {/* Info hospital + CTA */}
          <div className="w-full md:w-60 lg:w-68 p-5 flex flex-col gap-4">
            {clinicProfile && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2.5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Hospital</p>
                {clinicProfile.reviews_count != null && clinicProfile.reviews_count > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-400 text-base">★</span>
                    <span className="font-bold text-slate-800 text-sm">{Number(clinicProfile.rating ?? 0).toFixed(1)}</span>
                    <span className="text-[11px] text-slate-500">({clinicProfile.reviews_count} reseñas)</span>
                  </div>
                ) : <p className="text-[11px] text-slate-400 italic">Sin calificaciones aún</p>}

                {(clinicProfile.num_doctors != null || clinicProfile.num_nurses != null) && (
                  <div className="flex flex-col gap-1">
                    {clinicProfile.num_doctors != null && <span className="text-xs font-semibold text-slate-700">👨‍⚕️ {clinicProfile.num_doctors} médico{clinicProfile.num_doctors !== 1 ? 's' : ''} por turno</span>}
                    {clinicProfile.num_nurses != null && <span className="text-xs font-semibold text-slate-700">🩺 {clinicProfile.num_nurses} enfermero{clinicProfile.num_nurses !== 1 ? 's' : ''} por turno</span>}
                  </div>
                )}
                {Array.isArray(clinicProfile.resources) && clinicProfile.resources.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {clinicProfile.resources.map((r, i) => <span key={i} className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{r}</span>)}
                  </div>
                )}
                {shift?.clinic?.complexity && (
                  <span className="inline-block rounded-full border border-purple-100 bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700">{shift.clinic.complexity}</span>
                )}
              </div>
            )}

            <div className="mt-auto space-y-2">
              {checkingAuth ? (
                <div className="py-3 text-center text-slate-500 text-xs animate-pulse">Verificando...</div>
              ) : hasApplied ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-1.5 rounded-xl bg-orange-50 border border-orange-200 py-2.5 text-sm font-bold text-orange-700">
                    <span>⏳</span> Postulación enviada
                  </div>
                  <button
                    onClick={async () => {
                      if (!confirm('¿Querés retirar tu postulación a esta guardia?')) return
                      if (onWithdraw) {
                        onWithdraw(shift.id)
                        onClose()
                      }
                    }}
                    className="w-full border-2 border-slate-200 hover:border-red-300 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 py-2.5 rounded-xl font-bold text-sm transition-all"
                  >
                    Retirar Postulación
                  </button>
                </div>
              ) : (() => {
                if (!isVerified) {
                  return (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                      <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-1" />
                      <p className="text-red-700 font-bold text-xs">Perfil no verificado</p>
                      <p className="text-red-600/80 text-[11px] mt-0.5">Completá tu perfil para postularte.</p>
                    </div>
                  )
                }
                const shiftSpecialty = shift?.specialty_required
                const isGeneralShift = isGeneralSpecialty(shiftSpecialty)
                if (!isGeneralShift) {
                  const matchingSpec = doctorSpecialties.find(s => specialtiesMatch(s.name, shiftSpecialty))
                  if (!matchingSpec) {
                    // El médico no tiene esta especialidad cargada en su perfil
                    return (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                        <AlertCircle className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                        <p className="text-slate-700 font-bold text-xs">Especialidad requerida: {shiftSpecialty}</p>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          Agregá esta especialidad desde tu <a href="/perfil" className="font-semibold text-blue-600 underline underline-offset-2">perfil</a> para poder postularte.
                        </p>
                      </div>
                    )
                  }
                  if (!matchingSpec.verified) {
                    // Tiene la especialidad pero aún no fue verificada por el admin
                    return (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                        <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                        <p className="text-amber-800 font-bold text-xs">Especialidad pendiente de verificación</p>
                        <p className="text-amber-700/80 text-[11px] mt-0.5">
                          Tu especialidad <strong>{shiftSpecialty}</strong> aún no fue validada por el equipo de Guardian. Una vez aprobada podrás postularte.
                        </p>
                      </div>
                    )
                  }
                }
                return (
                  <button onClick={handleApply} disabled={loading || hasOverlap} className="w-full bg-slate-900 hover:bg-blue-700 text-white py-3 rounded-xl font-black text-sm transition-all shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0">
                    {loading || loadingBtn === shift?.id ? 'Procesando...' : 'Postularme a esta Guardia'}
                  </button>
                )
              })()}
              <button onClick={onClose} className="w-full text-slate-400 hover:text-slate-700 font-bold text-xs py-1.5 transition-colors uppercase tracking-widest">Cerrar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
