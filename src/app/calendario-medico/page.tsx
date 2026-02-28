'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import DetalleGuardiaMedicoModal from '@/components/DetalleGuardiaMedicoModal'
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  eachDayOfInterval,
  parseISO,
} from 'date-fns'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  List,
  Clock,
  DollarSign,
  MapPin,
  CalendarDays,
  UserCheck,
  CheckCircle2,
} from 'lucide-react'

/* ─────────────────────────────────────────────
   TYPES & STATUS (estados del médico: disponible, postulado, confirmado, completada)
   ───────────────────────────────────────────── */

type UserStatus = 'disponible' | 'postulado' | 'confirmado' | 'completada'

interface StatusConfig {
  label: string
  bgClass: string
  textClass: string
  dotClass: string
  mobileBorderClass: string
}

const STATUS_CONFIG: Record<UserStatus, StatusConfig> = {
  disponible: {
    label: 'Disponible',
    bgClass: 'bg-blue-50/80 border-blue-200',
    textClass: 'text-blue-700',
    dotClass: 'bg-blue-500',
    mobileBorderClass: 'border-l-blue-500',
  },
  postulado: {
    label: 'Postulado',
    bgClass: 'bg-orange-50/80 border-orange-300',
    textClass: 'text-orange-800',
    dotClass: 'bg-orange-500',
    mobileBorderClass: 'border-l-orange-500',
  },
  confirmado: {
    label: 'Confirmado',
    bgClass: 'bg-emerald-50/80 border-emerald-300',
    textClass: 'text-emerald-800',
    dotClass: 'bg-emerald-500',
    mobileBorderClass: 'border-l-emerald-500',
  },
  completada: {
    label: 'Completada',
    bgClass: 'bg-slate-100/80 border-slate-300',
    textClass: 'text-slate-500',
    dotClass: 'bg-slate-400',
    mobileBorderClass: 'border-l-slate-400',
  },
}

const DAYS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const DAYS_FULL = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const DAYS_LONG = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

/* ─────────────────────────────────────────────
   SUB-COMPONENTS (UI only; getUserStatus inyectado por padre)
   ───────────────────────────────────────────── */

function StatusBadge({ status }: { status: UserStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all duration-200 ${config.bgClass} ${config.textClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`} />
      {config.label}
    </span>
  )
}

function StatusLegend() {
  const statuses: UserStatus[] = ['disponible', 'postulado', 'confirmado', 'completada']
  return (
    <div className="flex flex-wrap items-center gap-2">
      {statuses.map((s) => (
        <StatusBadge key={s} status={s} />
      ))}
    </div>
  )
}

/** Desktop: tarjeta compacta dentro de la celda del calendario */
function GuardiaCard({
  shift,
  getUserStatus,
  onShiftClick,
}: {
  shift: any
  getUserStatus: (shift: any) => UserStatus
  onShiftClick: (shift: any) => void
}) {
  const status = getUserStatus(shift)
  const config = STATUS_CONFIG[status]
  const shiftDate = parseISO(shift.date_time)
  const amount = `${Math.round(shift.price / 1000)}k`
  const clinicName = shift.clinic?.full_name || 'Clínica'
  const specialty = shift.specialty_required

  return (
    <button
      type="button"
      onClick={() => onShiftClick(shift)}
      className={`group w-full cursor-pointer rounded-xl border p-2 text-left transition-all duration-300 hover:shadow-md hover:scale-[1.02] xl:p-2.5 ${config.bgClass} ${status === 'completada' ? 'opacity-80' : ''}`}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${config.dotClass}`} />
        <span className={`truncate text-[11px] font-semibold leading-tight xl:text-xs ${config.textClass}`}>
          {clinicName}
        </span>
      </div>
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 text-slate-500">
          <Clock className="h-3 w-3" />
          <span className="text-[10px] xl:text-[11px]">{format(shiftDate, 'HH:mm')}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <DollarSign className="h-3 w-3 text-emerald-600" />
          <span className="text-[11px] font-bold text-emerald-700 xl:text-xs">{amount}</span>
        </div>
      </div>
      {specialty && (
        <div className="mt-1">
          <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-[9px] font-medium text-slate-600 xl:text-[10px]">
            {specialty}
          </span>
        </div>
      )}
    </button>
  )
}

/** Mobile: tarjeta expandida en lista/semana */
function GuardiaCardMobile({
  shift,
  getUserStatus,
  onShiftClick,
}: {
  shift: any
  getUserStatus: (shift: any) => UserStatus
  onShiftClick: (shift: any) => void
}) {
  const status = getUserStatus(shift)
  const config = STATUS_CONFIG[status]
  const shiftDate = parseISO(shift.date_time)
  const amount = `${Math.round(shift.price / 1000)}k`
  const clinicName = shift.clinic?.full_name || 'Clínica'
  const specialty = shift.specialty_required

  return (
    <button
      type="button"
      onClick={() => onShiftClick(shift)}
      className={`w-full cursor-pointer rounded-xl border border-l-[3px] bg-white p-3.5 text-left shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.01] ${config.mobileBorderClass} ${status === 'completada' ? 'opacity-80' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${config.dotClass}`} />
            <span className="truncate text-sm font-semibold text-slate-900">{clinicName}</span>
            <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ${config.bgClass} ${config.textClass}`}>
              {config.label}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {format(shiftDate, 'HH:mm')} hs
            </span>
            {specialty && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {specialty}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-emerald-50 px-2.5 py-1.5">
          <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-sm font-bold text-emerald-700">{amount}</span>
        </div>
      </div>
    </button>
  )
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  accentClass,
}: {
  title: string
  value: string
  subtitle: string
  icon: React.ReactNode
  accentClass: string
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.02]">
      <div className="flex items-center gap-4 p-4 sm:p-5">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${accentClass}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs">{title}</p>
          <p className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{value}</p>
          <p className="truncate text-[11px] text-slate-500 sm:text-xs">{subtitle}</p>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   MAIN CONTENT (lógica de negocio intacta)
   ───────────────────────────────────────────── */

function CalendarioMedicoContent() {
  const [shifts, setShifts] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('medico_calendar_cache')
      return cached ? JSON.parse(cached) : []
    }
    return []
  })

  const [myApplications, setMyApplications] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('medico_apps_cache')
      return cached ? JSON.parse(cached) : []
    }
    return []
  })

  const [currentDate, setCurrentDate] = useState(new Date())
  const [userId, setUserId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [selectedShift, setSelectedShift] = useState<any>(null)
  const [selectedUserStatus, setSelectedUserStatus] = useState<string>('')
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const [legendOpen, setLegendOpen] = useState(false)

  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const shiftIdParam = searchParams?.get('shiftId')

  useEffect(() => {
    setMounted(true)
    fetchData()
  }, [shiftIdParam])

  async function fetchData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setUserId(session.user.id)

    const { data: openShifts } = await supabase.from('shifts').select('*, clinic:profiles!clinic_id(full_name)').eq('status', 'open')
    const { data: myShifts } = await supabase.from('shifts').select('*, clinic:profiles!clinic_id(full_name)').eq('professional_id', session.user.id)
    const { data: appsData } = await supabase.from('shift_applications').select('shift_id').eq('professional_id', session.user.id).eq('status', 'pending')

    if (appsData) {
      const apps = appsData.map((a: { shift_id: string }) => a.shift_id)
      setMyApplications(apps)
      sessionStorage.setItem('medico_apps_cache', JSON.stringify(apps))
    }

    const combined = [...(openShifts || []), ...(myShifts || [])]
    const uniqueShifts = Array.from(new Map(combined.map((item: any) => [item.id, item])).values())
    setShifts(uniqueShifts)
    sessionStorage.setItem('medico_calendar_cache', JSON.stringify(uniqueShifts))
  }

  useEffect(() => {
    if (shiftIdParam && userId) {
      fetchData().then(() => {
        supabase
          .from('shifts')
          .select('*, clinic:profiles!clinic_id(full_name)')
          .eq('id', shiftIdParam)
          .single()
          .then(({ data: shift }) => {
            if (shift) {
              supabase
                .from('shift_applications')
                .select('id')
                .eq('shift_id', shift.id)
                .eq('professional_id', userId)
                .eq('status', 'pending')
                .single()
                .then(({ data: app }) => {
                  let status = 'disponible'
                  if (shift.status === 'completed' && shift.professional_id === userId) status = 'completada'
                  else if (shift.status === 'filled' && shift.professional_id === userId) status = 'confirmado'
                  else if (app) status = 'postulado'

                  setSelectedShift(shift)
                  setSelectedUserStatus(status)
                  router.replace(pathname, { scroll: false })
                })
            }
          })
      })
    }
  }, [shiftIdParam, userId, pathname, router])

  const getUserStatus = (shift: any): UserStatus => {
    if (shift.status === 'completed' && shift.professional_id === userId) return 'completada'
    if (shift.status === 'filled' && shift.professional_id === userId) return 'confirmado'
    if (shift.status === 'open' && myApplications.includes(shift.id)) return 'postulado'
    return 'disponible'
  }

  const handleShiftClick = (shift: any) => {
    const status = getUserStatus(shift)
    setSelectedShift(shift)
    setSelectedUserStatus(status)
  }

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
    setSelectedWeek(null)
  }
  const prevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
    setSelectedWeek(null)
  }
  const goToday = () => {
    setCurrentDate(new Date())
    setSelectedWeek(null)
  }

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })
  const now = new Date()

  const guardiasByDate = useMemo(() => {
    const map: Record<string, any[]> = {}
    shifts.forEach((shift) => {
      const key = format(parseISO(shift.date_time), 'yyyy-MM-dd')
      if (!map[key]) map[key] = []
      map[key].push(shift)
    })
    return map
  }, [shifts])

  const monthShifts = useMemo(() => {
    return shifts.filter((s) => isSameMonth(parseISO(s.date_time), currentDate))
  }, [shifts, currentDate])

  const stats = useMemo(() => {
    const total = monthShifts.length
    const disponibles = monthShifts.filter((s) => getUserStatus(s) === 'disponible').length
    const postuladas = monthShifts.filter((s) => getUserStatus(s) === 'postulado').length
    const confirmadas = monthShifts.filter((s) => getUserStatus(s) === 'confirmado').length
    const completadas = monthShifts.filter((s) => getUserStatus(s) === 'completada').length
    return {
      total: String(total),
      disponibles: String(disponibles),
      postuladas: String(postuladas),
      confirmadas: String(confirmadas),
      completadas: String(completadas),
    }
  }, [monthShifts, userId, myApplications])

  const totalWeeks = Math.ceil(calendarDays.length / 7)
  const todayDate = new Date()
  const todayIndex = calendarDays.findIndex(
    (d) => isSameDay(d, todayDate) && isSameMonth(d, currentDate)
  )
  const currentWeekIndex = selectedWeek ?? (todayIndex >= 0 ? Math.floor(todayIndex / 7) : 0)

  const getWeekDays = (weekIndex: number) => {
    const start = weekIndex * 7
    return calendarDays.slice(start, start + 7)
  }

  const isToday = (day: Date) => isSameDay(day, now)

  if (!mounted) {
    return (
      <main className="min-h-[calc(100vh-73px)] bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Cargando...</p>
      </main>
    )
  }

  return (
    <main className="min-h-[calc(100vh-73px)] bg-slate-50">
      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 sm:py-8">
        <div className="mb-5 space-y-1 sm:mb-8">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-3xl">
            Mi Agenda
          </h1>
          <p className="text-xs text-slate-500 sm:text-sm">
            Guardias disponibles, postulaciones y turnos confirmados
          </p>
        </div>

        {/* Stats bar */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 sm:mb-8">
          <StatCard
            title="Total Guardias"
            value={stats.total}
            subtitle="Este mes"
            icon={<CalendarDays className="h-5 w-5 text-blue-600" />}
            accentClass="bg-blue-50"
          />
          <StatCard
            title="Disponibles"
            value={stats.disponibles}
            subtitle="Para postularte"
            icon={<CalendarDays className="h-5 w-5 text-blue-600" />}
            accentClass="bg-blue-50"
          />
          <StatCard
            title="Postuladas"
            value={stats.postuladas}
            subtitle="Pendientes de confirmación"
            icon={<Clock className="h-5 w-5 text-amber-600" />}
            accentClass="bg-amber-50"
          />
          <StatCard
            title="Confirmadas"
            value={stats.confirmadas}
            subtitle="Completadas"
            icon={<UserCheck className="h-5 w-5 text-emerald-600" />}
            accentClass="bg-emerald-50"
          />
        </div>

        {/* Calendar section */}
        <div className="space-y-4 md:space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:gap-2">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-all duration-200 hover:text-slate-900"
                  aria-label="Mes anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-1.5 px-2 sm:gap-2 sm:px-3">
                  <CalendarIcon className="hidden h-4 w-4 text-blue-600 sm:block" />
                  <h2 className="text-sm font-semibold text-slate-900 sm:text-base md:text-lg">
                    {MONTHS_ES[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-all duration-200 hover:text-slate-900"
                  aria-label="Mes siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={goToday}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-all duration-200 hover:bg-slate-100"
              >
                Hoy
              </button>
            </div>
            <div className="hidden md:block">
              <StatusLegend />
            </div>
            <div className="md:hidden">
              <button
                type="button"
                onClick={() => setLegendOpen(!legendOpen)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900"
              >
                <List className="h-3.5 w-3.5" />
                {legendOpen ? 'Ocultar leyenda' : 'Ver leyenda'}
              </button>
              {legendOpen && (
                <div className="mt-2">
                  <StatusLegend />
                </div>
              )}
            </div>
          </div>

          {/* Mobile: mini mes + timeline por semana */}
          <div className="md:hidden">
            <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/80">
                {DAYS_SHORT.map((d, i) => (
                  <div
                    key={d}
                    className={`py-2 text-center text-[10px] font-semibold uppercase tracking-wider ${i >= 5 ? 'text-blue-600/80' : 'text-slate-500'}`}
                  >
                    {d}
                  </div>
                ))}
              </div>
              <div>
                {Array.from({ length: totalWeeks }).map((_, weekIdx) => {
                  const weekDays = getWeekDays(weekIdx)
                  const isActive = currentWeekIndex === weekIdx
                  return (
                    <button
                      key={weekIdx}
                      type="button"
                      className={`grid w-full grid-cols-7 border-b border-slate-100 last:border-b-0 transition-colors ${isActive ? 'bg-blue-500/10' : 'hover:bg-slate-50'}`}
                      onClick={() => setSelectedWeek(weekIdx)}
                    >
                      {weekDays.map((day, ci) => {
                        const dateKey = format(day, 'yyyy-MM-dd')
                        const hasGuardias = (guardiasByDate[dateKey] || []).length > 0
                        const isCurrentMonth = isSameMonth(day, monthStart)
                        const isTodayCell = isCurrentMonth && isToday(day)
                        return (
                          <div
                            key={dateKey}
                            className={`relative flex flex-col items-center justify-center py-2.5 ${!isCurrentMonth ? 'opacity-30' : ''}`}
                          >
                            <span
                              className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium ${
                                isTodayCell
                                  ? 'bg-blue-600 font-bold text-white shadow-sm'
                                  : ci >= 5
                                    ? 'text-blue-600/80'
                                    : 'text-slate-900'
                              }`}
                            >
                              {format(day, 'd')}
                            </span>
                            {hasGuardias && (
                              <span className="mt-0.5 h-1 w-1 rounded-full bg-blue-500" />
                            )}
                          </div>
                        )
                      })}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Semana {currentWeekIndex + 1} de {MONTHS_ES[currentDate.getMonth()].toLowerCase()}
              </p>
              <div className="space-y-1">
                {getWeekDays(currentWeekIndex).map((day, ci) => {
                  const dateKey = format(day, 'yyyy-MM-dd')
                  const guardias = guardiasByDate[dateKey] || []
                  const isCurrentMonth = isSameMonth(day, monthStart)
                  const isTodayCell = isCurrentMonth && isToday(day)
                  return (
                    <div
                      key={dateKey}
                      className={`rounded-xl border bg-white transition-all duration-200 ${
                        isTodayCell ? 'border-blue-300 shadow-sm shadow-blue-500/10' : 'border-slate-200'
                      } ${!isCurrentMonth ? 'opacity-40' : ''}`}
                    >
                      <div
                        className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 ${guardias.length > 0 ? 'border-b border-slate-100' : ''}`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                            isTodayCell
                              ? 'bg-blue-600 text-white shadow-sm'
                              : ci >= 5
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {format(day, 'd')}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className={`text-sm font-semibold ${isTodayCell ? 'text-blue-700' : 'text-slate-900'}`}>
                            {DAYS_LONG[ci]}
                          </span>
                          {isTodayCell && (
                            <span className="ml-2 rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                              HOY
                            </span>
                          )}
                        </div>
                        {guardias.length > 0 && (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                            {guardias.length}
                          </span>
                        )}
                      </div>
                      {guardias.length > 0 && (
                        <div className="space-y-2 p-3">
                          {guardias.map((g) => (
                            <GuardiaCardMobile
                              key={g.id}
                              shift={g}
                              getUserStatus={getUserStatus}
                              onShiftClick={handleShiftClick}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Desktop: grilla 7 columnas */}
          <div className="hidden md:block">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80">
                {DAYS_FULL.map((day, index) => (
                  <div
                    key={day}
                    className={`px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 ${
                      index < 6 ? 'border-r border-slate-200/60' : ''
                    } ${index >= 5 ? 'text-blue-600/80' : ''}`}
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {calendarDays.map((day, cellIndex) => {
                  const dateKey = format(day, 'yyyy-MM-dd')
                  const guardias = guardiasByDate[dateKey] || []
                  const isCurrentMonth = isSameMonth(day, monthStart)
                  const dayOfWeek = day.getDay()
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
                  const isTodayCell = isCurrentMonth && isToday(day)
                  const isLastInRow = cellIndex % 7 === 6

                  return (
                    <div
                      key={dateKey}
                      className={`group relative min-h-[110px] border-b border-slate-100 p-2 transition-colors duration-200 hover:bg-blue-500/5 lg:min-h-[130px] ${!isLastInRow ? 'border-r border-slate-100' : ''} ${isWeekend ? 'bg-slate-50/50' : ''}`}
                    >
                      <div className="mb-1.5 flex items-start">
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-sm transition-all duration-200 ${
                            isTodayCell
                              ? 'bg-blue-600 font-bold text-white shadow-md shadow-blue-500/30'
                              : isWeekend
                                ? 'font-medium text-blue-600/80 group-hover:bg-blue-500/10'
                                : 'font-medium text-slate-700 group-hover:bg-slate-100'
                          }`}
                        >
                          {format(day, 'd')}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {guardias.map((shift) => (
                          <GuardiaCard
                            key={shift.id}
                            shift={shift}
                            getUserStatus={getUserStatus}
                            onShiftClick={handleShiftClick}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedShift && (
        <DetalleGuardiaMedicoModal
          shift={selectedShift}
          userStatus={selectedUserStatus}
          onClose={() => setSelectedShift(null)}
          onRefresh={fetchData}
        />
      )}
    </main>
  )
}

export default function CalendarioMedico() {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center text-slate-500">Cargando...</div>}>
      <CalendarioMedicoContent />
    </Suspense>
  )
}
