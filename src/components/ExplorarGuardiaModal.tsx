'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { AlertCircle, Activity, CalendarDays, Ambulance, MapPin, Clock, DollarSign, Briefcase } from 'lucide-react'
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api'

const CBA_CAPITAL = { lat: -31.4201, lng: -64.1888 }

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

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

export default function ExplorarGuardiaModal({
  shift,
  onClose,
  onRefresh,
  onApply,
  onWithdraw,
  hasApplied: hasAppliedProp,
  loadingBtn,
  hasOverlap = false
}: {
  shift: any
  onClose: () => void
  onRefresh?: () => void
  onApply?: (shiftId: string) => Promise<void>
  onWithdraw?: (shiftId: string) => void
  hasApplied?: boolean
  loadingBtn?: string | null
  hasOverlap?: boolean
}) {
  const [loading, setLoading] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [hasApplied, setHasApplied] = useState(false)
  const [clinicProfile, setClinicProfile] = useState<{ avatar_url?: string | null; cover_url?: string | null } | null>(null)
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [distanceKm, setDistanceKm] = useState<number | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(false)

  const clinicId = shift?.clinic_id || shift?.clinic?.id

  useEffect(() => {
    async function checkVerification() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data } = await supabase.from('profiles').select('is_verified').eq('id', session.user.id).single()
        setIsVerified(data?.is_verified === true)
      }
      setCheckingAuth(false)
    }
    checkVerification()
  }, [])

  useEffect(() => {
    if (!shift?.id || !clinicId) return

    async function fetchClinicProfileAndApplication() {
      const [profileRes, sessionRes] = await Promise.all([
        supabase.from('profiles').select('avatar_url, cover_url').eq('id', clinicId).single(),
        supabase.auth.getSession()
      ])

      if (profileRes.data) {
        setClinicProfile({
          avatar_url: profileRes.data.avatar_url ?? null,
          cover_url: profileRes.data.cover_url ?? null
        })
      }

      const session = sessionRes.data?.session
      if (session?.user?.id) {
        const { data: app } = await supabase
          .from('shift_applications')
          .select('id')
          .eq('shift_id', shift.id)
          .eq('professional_id', session.user.id)
          .maybeSingle()
        setHasApplied(!!app)
      }
    }

    fetchClinicProfileAndApplication()
  }, [shift?.id, clinicId])

  async function handleApply() {
    if (!isVerified || hasOverlap || hasApplied) return
    if (onApply) {
      await onApply(shift.id)
      setHasApplied(true)
      onRefresh?.()
      onClose()
    } else {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      await supabase.from('shift_applications').insert([{ shift_id: shift.id, professional_id: session?.user.id, status: 'pending' }])
      if (clinicId) {
        await supabase.from('notifications').insert([{ user_id: clinicId, shift_id: shift.id, title: '¡Nueva Postulación! 👨‍⚕️', message: `Un profesional se acaba de postular a tu guardia: ${shift.title}.` }])
      }
      setHasApplied(true)
      alert('¡Postulación enviada exitosamente!')
      onRefresh?.()
      onClose()
    }
  }

  const { isLoaded: mapsLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places'],
  })

  const coverUrl = getPublicImageUrl(clinicProfile?.cover_url) || null
  const avatarUrl = getPublicImageUrl(clinicProfile?.avatar_url) || null
  const category = shift?.shift_category || 'Guardia'
  const CategoryIcon = category === 'Guardia' ? Activity : category === 'Consultorio' ? CalendarDays : Ambulance
  const categoryIconClass = category === 'Guardia' ? 'text-red-500' : category === 'Consultorio' ? 'text-blue-600' : 'text-emerald-600'
  const location = shift?.clinic?.location_maps || shift?.clinic?.address || '—'
  const viaticos = shift?.viaticos ?? 'No'
  const paymentTimeframe = shift?.payment_timeframe ?? null

  useEffect(() => {
    if (!mapsLoaded || !location || coordinates) return
    const g = (window as any).google?.maps
    if (!g?.Geocoder) return
    const geocoder = new g.Geocoder()
    geocoder.geocode({ address: location }, (results: any, status: string) => {
      if (status === 'OK' && results && results[0]) {
        const loc = results[0].geometry.location
        const lat = loc.lat()
        const lng = loc.lng()
        setCoordinates({ lat, lng })
        const d = haversineKm(lat, lng, CBA_CAPITAL.lat, CBA_CAPITAL.lng)
        setDistanceKm(Math.round(d))
      } else {
        setMapError('Mapa no disponible para esta ubicación')
      }
    })
  }, [mapsLoaded, location, coordinates])

  const distanceLabel =
    distanceKm != null
      ? `a ${distanceKm}km de Córdoba Capital`
      : 'a 0km de Córdoba Capital'

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 relative overflow-hidden my-8">
        {/* Banner con portada del prestador */}
        <div className="relative h-36 md:h-44 w-full">
          {coverUrl ? (
            <img src={coverUrl} alt="Portada" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400" />
          )}
          {/* Logo de la clínica superpuesto (estilo red social) */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white bg-slate-100 shadow-xl overflow-hidden flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl md:text-4xl">🏥</span>
              )}
            </div>
          </div>
        </div>

        <div className="pt-12 pb-6 px-6 md:px-8">
          {hasOverlap && (
            <div className="mb-4 bg-red-100 border-2 border-red-300 text-red-800 px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-2">
              ⚠️ Superposición de Horarios (Incompatible)
            </div>
          )}

          <h2 className="text-xl font-black text-slate-900 text-center leading-tight mt-2">
            {shift?.clinic?.full_name || 'Clínica'}
          </h2>
          <div className="flex justify-center mt-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black bg-slate-100 text-slate-600 px-3 py-1 rounded-full uppercase tracking-widest">
              <CategoryIcon className={`h-3.5 w-3.5 ${categoryIconClass}`} />
              {shift?.specialty_required}
            </span>
          </div>

          <h3 className="text-lg font-bold text-slate-800 mt-5 leading-snug">{shift?.title}</h3>

          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <CalendarDays className="h-5 w-5 text-slate-500 shrink-0" />
              <div className="flex flex-col">
                <p className="text-slate-700 font-bold text-sm">
                  {shift?.date_time ? format(new Date(shift.date_time), 'dd/MM/yyyy') : '—'}
                </p>
                {shift?.date_time && (
                  <p className="text-slate-600 text-xs font-medium">
                    Hora inicio: {format(new Date(shift.date_time), 'HH:mm')} hs
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-500" />
                <span className="text-slate-700 font-semibold text-sm">{Number(shift?.duration_hours ?? 0)} hs</span>
              </div>
              <p className="text-emerald-600 font-black text-xl">${Number(shift?.price || 0).toLocaleString()}</p>
            </div>
            <div className="flex flex-col gap-1 text-slate-600 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" />
                <div className="flex flex-col">
                  <span>{location}</span>
                  <span className="text-xs text-slate-500">{distanceLabel}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMap((prev) => !prev)}
                className="ml-6 text-xs font-semibold text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline"
              >
                Ver en el mapa
              </button>
              {showMap && (
                <div className="mt-2 h-64 w-full overflow-hidden rounded-xl border border-slate-200">
                  {mapsLoaded && coordinates ? (
                    <GoogleMap
                      center={coordinates}
                      zoom={14}
                      mapContainerClassName="w-full h-full"
                    >
                      <Marker position={coordinates} />
                    </GoogleMap>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                      {mapError || 'Mapa no disponible para esta ubicación'}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <CategoryIcon className={`h-5 w-5 shrink-0 ${categoryIconClass}`} />
              <span className="text-sm font-semibold text-slate-700 uppercase tracking-wider">{category}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                <Briefcase className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-700">Viáticos: {viaticos}</span>
              </div>
              {paymentTimeframe != null && String(paymentTimeframe).trim() !== '' && (
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                  <DollarSign className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-semibold text-slate-700">Días a pagar: {paymentTimeframe}</span>
                </div>
              )}
            </div>
          </div>

          {checkingAuth ? (
            <div className="py-4 text-center text-slate-500 font-bold animate-pulse">Verificando credenciales...</div>
          ) : hasApplied ? (
            <button
              disabled
              className="w-full bg-slate-300 text-slate-600 py-4 rounded-xl font-black text-lg cursor-not-allowed mt-6"
            >
              Ya te postulaste a esta guardia
            </button>
          ) : isVerified ? (
            <button
              onClick={handleApply}
              disabled={loading || hasOverlap}
              className="w-full bg-slate-900 hover:bg-blue-700 text-white py-4 rounded-xl font-black text-lg transition-all shadow-xl hover:shadow-blue-900/20 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 mt-6"
            >
              {loading || loadingBtn === shift?.id ? 'Procesando...' : 'Postularme a esta Guardia'}
            </button>
          ) : (
            <div className="bg-red-50 border-2 border-red-100 rounded-xl p-4 text-center mt-6">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-700 font-bold text-sm leading-tight">Acción Bloqueada</p>
              <p className="text-red-600/80 text-xs font-semibold mt-1">Tu identidad médica aún no ha sido validada por Guardian. Completá tu perfil para poder postularte.</p>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full mt-4 text-slate-400 hover:text-slate-700 font-black text-sm py-2 transition-colors uppercase tracking-widest"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  )
}
