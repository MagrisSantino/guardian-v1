'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  AlertTriangle,
  Ambulance,
  Building2,
  Calendar,
  Clock,
  MapPin,
  Activity,
  ClipboardList,
} from 'lucide-react'
import { useLoadScript } from '@react-google-maps/api'
import { Briefcase } from 'lucide-react'

type ViewMode = 'grid' | 'list'

interface GuardiaCardProps {
  shift: any
  viewMode: ViewMode
  hasApplied?: boolean
  isConfirmed?: boolean
  hasOverlap?: boolean
  onClick?: () => void
}

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

function formatPrice(price: number | null | undefined): string {
  const value = Number(price || 0)
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function GuardiaCard({ shift, viewMode, hasApplied, isConfirmed, hasOverlap, onClick }: GuardiaCardProps) {
  const isGrid = viewMode === 'grid'
  const clinic = shift.clinic || shift.profiles || shift.profile || {}
  const clinicName = clinic.full_name || 'Clínica'
  const location = clinic.location_maps || clinic.address || 'Ubicación no especificada'
  const coverUrl = clinic.cover_url || clinic.avatar_url || null

  const shiftDate = parseISO(shift.date_time)
  const durationHours = shift.duration_hours ?? 0
  const category: string = shift.shift_category || 'Guardia'
  const viaticos = shift.viaticos ?? 'No'

  const CategoryIcon =
    category === 'Guardia' ? Activity : category === 'Consultorio' ? ClipboardList : Ambulance
  const categoryClass =
    category === 'Guardia'
      ? 'border-blue-100 bg-blue-50 text-blue-700'
      : category === 'Consultorio'
        ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
        : 'border-rose-100 bg-rose-50 text-rose-700'

  const incompatible = !!hasOverlap
  const { isLoaded: mapsLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places'],
  })
  const geoKey = `geo_${location}`
  const [distanceKm, setDistanceKm] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem(geoKey)
      return cached !== null ? Number(cached) : null
    }
    return null
  })

  useEffect(() => {
    if (!mapsLoaded || distanceKm != null || !location) return
    const g = (window as any).google?.maps
    if (!g?.Geocoder) return
    new g.Geocoder().geocode({ address: location }, (results: any, status: string) => {
      if (status === 'OK' && results?.[0]) {
        const loc = results[0].geometry.location
        const d = Math.round(haversineKm(loc.lat(), loc.lng(), CBA_CAPITAL.lat, CBA_CAPITAL.lng))
        setDistanceKm(d)
        sessionStorage.setItem(geoKey, String(d))
      }
    })
  }, [mapsLoaded, location, distanceKm, geoKey])

  const distanceLabel = distanceKm != null ? `a ${distanceKm}km de Córdoba Capital` : null

  const handleClick = () => {
    if (onClick) onClick()
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/40 ${
        isGrid ? 'flex flex-col' : 'flex flex-row items-center'
      } ${incompatible ? 'border-l-4 border-l-amber-400' : isConfirmed ? 'border-l-4 border-l-emerald-500' : hasApplied ? 'border-l-4 border-l-orange-400' : ''}`}
      onClick={handleClick}
    >
      {/* Imagen / portada */}
      {isGrid && (
        <div className="relative h-32 w-full overflow-hidden">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={clinicName}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 400px"
              unoptimized
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/90 backdrop-blur-sm overflow-hidden">
              {clinic.avatar_url ? (
                <Image
                  src={clinic.avatar_url}
                  alt={clinicName}
                  width={36}
                  height={36}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <Building2 className="h-4 w-4 text-blue-600" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold capitalize text-white drop-shadow-md">
                {clinicName}
              </p>
              {hasApplied && !incompatible && (
                <p className="mt-0.5 text-[11px] font-semibold text-orange-200">Ya postulado ✓</p>
              )}
            </div>
          </div>
          {/* Badges superpuestos en la foto (grid) */}
          {isConfirmed && (
            <div className="absolute left-3 top-3">
              <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-black text-white shadow-md">
                <span>✓</span> ASIGNADO
              </div>
            </div>
          )}
          {!isConfirmed && hasApplied && !incompatible && (
            <div className="absolute left-3 top-3">
              <div className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-black text-white shadow-md">
                <span>✓</span> YA POSTULADO
              </div>
            </div>
          )}
          {incompatible && (
            <div className="absolute left-3 top-3">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-500 px-2.5 py-1 text-[10px] font-semibold text-white shadow-md">
                <AlertTriangle className="h-3 w-3" />
                SUPERPOSICIÓN DE HORARIOS
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mini imagen en modo lista */}
      {!isGrid && (
        <div className="relative w-44 sm:w-56 min-h-[96px] shrink-0 self-stretch overflow-hidden rounded-l-2xl">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={clinicName}
              fill
              className="object-cover"
              sizes="224px"
              unoptimized
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400" />
          )}
          {incompatible && (
            <div className="absolute left-2 top-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                <AlertTriangle className="h-3 w-3" />
              </div>
            </div>
          )}
        </div>
      )}

      <div className={`flex-1 ${isGrid ? 'p-5' : 'flex flex-col justify-center gap-2 px-4 py-3'}`}>
        {/* Nombre clínica (solo lista, en grid ya va en la imagen) */}
        {!isGrid && (
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 overflow-hidden shrink-0">
              {clinic.avatar_url ? (
                <Image
                  src={clinic.avatar_url}
                  alt={clinicName}
                  width={36}
                  height={36}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <Building2 className="h-4 w-4 text-blue-600" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold capitalize text-slate-900">{clinicName}</p>
              {isConfirmed && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black text-white">
                  ✓ Asignado
                </span>
              )}
              {!isConfirmed && hasApplied && !incompatible && (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-black text-white">
                  ✓ Ya postulado
                </span>
              )}
            </div>
          </div>
        )}

        {/* Dirección + distancia */}
        <div className="mt-1 mb-3 flex items-start gap-2 text-xs sm:text-sm text-slate-600">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div className="flex flex-col">
            <span>{location}</span>
            <span className="text-[11px] text-slate-500">{distanceLabel}</span>
          </div>
        </div>

        {/* Fecha, hora inicio, duración, viáticos */}
        <div className="mb-3 flex flex-col gap-1 text-xs sm:text-sm text-slate-600">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="capitalize">
              {format(shiftDate, "EEEE d 'de' MMMM", { locale: es })}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="font-medium">
              Hora inicio: {format(shiftDate, 'HH:mm')} hs
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="font-medium">{durationHours} hs</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Briefcase className="h-4 w-4 text-slate-400" />
            <span className="font-medium">
              Viáticos: {String(viaticos).toLowerCase() === 'sí' || String(viaticos).toLowerCase() === 'si' ? 'Sí' : 'No'}
            </span>
          </div>
        </div>

          {/* Grid mode: badge + precio + botón al pie */}
          {isGrid && (
            <>
              <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
                <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${categoryClass}`}>
                  <CategoryIcon className="h-3.5 w-3.5" />
                  <span className="uppercase tracking-wide">{category}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-500">Honorarios</p>
                  <p className="text-lg sm:text-xl font-bold tracking-tight text-emerald-600">{formatPrice(shift.price)}</p>
                </div>
              </div>
              <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
                <button type="button" onClick={handleClick} className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700">
                  Ver detalles y postularme
                </button>
              </div>
            </>
          )}
        </div>

        {/* List mode: columna derecha con badge + precio + botón, centrados verticalmente */}
        {!isGrid && (
          <div className="flex shrink-0 flex-col items-center justify-center gap-3 border-l border-slate-100 px-5 py-4">
            <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${categoryClass}`}>
              <CategoryIcon className="h-3.5 w-3.5" />
              <span className="uppercase tracking-wide">{category}</span>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-slate-500">Honorarios</p>
              <p className="text-xl font-bold tracking-tight text-emerald-600">{formatPrice(shift.price)}</p>
            </div>
            <button type="button" onClick={handleClick} className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 whitespace-nowrap">
              Ver detalles
            </button>
          </div>
        )}
    </div>
  )
}

