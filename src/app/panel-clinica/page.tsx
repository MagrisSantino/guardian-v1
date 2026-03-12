'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import PublicarModal from '@/components/PublicarModal'
import VerPostulantesModal from '@/components/VerPostulantesModal'
import CalificarMedicoModal from '@/components/CalificarMedicoModal'
import VerGuardiaAsignadaModal from '@/components/VerGuardiaAsignadaModal'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { Clock, CalendarDays, Plus, Calendar } from 'lucide-react'

type GuardiaStatus = 'creada' | 'con_postulantes' | 'asignada' | 'finalizada'

const STATUS_CONFIG: Record<GuardiaStatus, { label: string; bgClass: string; textClass: string; dotClass: string }> = {
  creada: {
    label: 'Creada',
    bgClass: 'bg-blue-50/80 border-blue-200/60',
    textClass: 'text-blue-700',
    dotClass: 'bg-blue-500',
  },
  con_postulantes: {
    label: 'Con Postulantes',
    bgClass: 'bg-amber-50/80 border-amber-200/60',
    textClass: 'text-amber-700',
    dotClass: 'bg-amber-500',
  },
  asignada: {
    label: 'Asignada',
    bgClass: 'bg-emerald-50/80 border-emerald-200/60',
    textClass: 'text-emerald-700',
    dotClass: 'bg-emerald-500',
  },
  finalizada: {
    label: 'Finalizada',
    bgClass: 'bg-slate-100/80 border-slate-200/60',
    textClass: 'text-slate-600',
    dotClass: 'bg-slate-400',
  },
}

function getGuardiaStatus(shift: any): GuardiaStatus {
  if (shift.status === 'completed') return 'finalizada'
  if (shift.status === 'filled') return 'asignada'
  const pendingApps = shift.applicants?.filter((a: any) => a.status === 'pending') || []
  if (shift.status === 'open' && pendingApps.length > 0) return 'con_postulantes'
  return 'creada'
}

function OfertaStatusBadge({ status }: { status: GuardiaStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${config.bgClass} ${config.textClass}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`} />
      {config.label}
    </span>
  )
}

function OfertaCard({
  shift,
  onClick,
}: {
  shift: any
  onClick: () => void
}) {
  const d = parseISO(shift.date_time)
  const category = shift.shift_category || 'Guardia'
  const specialty = shift.specialty_required || '—'
  const guardiaStatus = getGuardiaStatus(shift)

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
              {category}
            </span>
            <OfertaStatusBadge status={guardiaStatus} />
          </div>
          <p className="text-sm font-semibold text-slate-900">{specialty}</p>
          <p className="mt-1 text-xs text-slate-500">
            {format(d, "EEEE d MMM yyyy", { locale: es })} · {format(d, 'HH:mm')} hs
          </p>
        </div>
        <div className="flex items-center gap-1 text-slate-400">
          <Clock className="h-4 w-4" />
        </div>
      </div>
    </button>
  )
}

function PanelClinicaContent() {
  const [shifts, setShifts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isPublicarOpen, setIsPublicarOpen] = useState(false)
  const [isPostulantesOpen, setIsPostulantesOpen] = useState(false)
  const [isVerGuardiaAsignadaOpen, setIsVerGuardiaAsignadaOpen] = useState(false)
  const [isCalificarOpen, setIsCalificarOpen] = useState(false)
  const [selectedDateForModal, setSelectedDateForModal] = useState<Date | null>(null)
  const [shiftToManage, setShiftToManage] = useState<any>(null)

  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const shiftIdParam = searchParams?.get('shiftId')

  useEffect(() => {
    fetchShifts()
    const handleRefresh = () => fetchShifts()
    window.addEventListener('refresh-shifts', handleRefresh)
    return () => window.removeEventListener('refresh-shifts', handleRefresh)
  }, [])

  async function fetchShifts() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setLoading(true)
    const { data } = await supabase
      .from('shifts')
      .select('*, applicants:shift_applications(status)')
      .eq('clinic_id', session.user.id)
      .order('date_time', { ascending: false })
    setShifts(data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (shiftIdParam) {
      fetchShifts().then(() => {
        supabase
          .from('shifts')
          .select('*, applicants:shift_applications(status)')
          .eq('id', shiftIdParam)
          .single()
          .then(({ data: shift }) => {
            if (shift) {
              setShiftToManage(shift)
              setIsPostulantesOpen(false)
              setIsVerGuardiaAsignadaOpen(false)
              setIsCalificarOpen(false)
              if (shift.status === 'open') setIsPostulantesOpen(true)
              else if (shift.status === 'filled') setIsVerGuardiaAsignadaOpen(true)
              else if (shift.status === 'completed') alert('Esta guardia ya fue completada y el profesional fue calificado.')
              router.replace(pathname, { scroll: false })
            }
          })
      })
    }
  }, [shiftIdParam, pathname, router])

  const openCrearGuardia = () => {
    setSelectedDateForModal(null)
    setIsPublicarOpen(true)
  }

  return (
    <main className="min-h-[calc(100vh-73px)] bg-slate-50">
      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 sm:py-8">
        <div className="mb-5 space-y-1 sm:mb-8">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-3xl">
            Panel de ofertas
          </h1>
          <p className="text-xs text-slate-500 sm:text-sm">
            Todas tus ofertas de guardias, consultorio y ambulancia listas para gestionar
          </p>
          <Link
            href="/dashboard-clinica"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 mt-2"
          >
            <Calendar className="h-4 w-4" />
            Ver calendario
          </Link>
        </div>

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900" />
          </div>
        ) : shifts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm md:p-12">
            <CalendarDays className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-3 text-lg font-semibold text-slate-700">Aún no has publicado ninguna oferta</h3>
            <p className="mt-1 text-sm text-slate-500">Publicá tu primera guardia u oferta para que los médicos puedan postularse.</p>
            <button
              type="button"
              onClick={openCrearGuardia}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700"
            >
              <Plus className="h-5 w-5" />
              Publicar oferta
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">{shifts.length} oferta{shifts.length !== 1 ? 's' : ''} publicada{shifts.length !== 1 ? 's' : ''}</p>
              <button
                type="button"
                onClick={openCrearGuardia}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
                Publicar guardia
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {shifts.map((shift) => (
                <OfertaCard
                  key={shift.id}
                  shift={shift}
                  onClick={() => {
                    setShiftToManage(shift)
                    setIsPostulantesOpen(true)
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div className="fixed right-4 bottom-6 z-40 md:hidden">
          <button
            type="button"
            onClick={openCrearGuardia}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/30 transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-blue-500/40"
          >
            <Plus className="h-6 w-6" />
            <span className="sr-only">Crear Guardia</span>
          </button>
        </div>
      </div>

      {isPublicarOpen && (
        <PublicarModal
          onClose={() => setIsPublicarOpen(false)}
          onRefresh={fetchShifts}
          selectedDate={selectedDateForModal}
        />
      )}
      {isPostulantesOpen && shiftToManage && (
        <VerPostulantesModal
          onClose={() => setIsPostulantesOpen(false)}
          onRefresh={fetchShifts}
          shift={shiftToManage}
        />
      )}
      {isVerGuardiaAsignadaOpen && shiftToManage && (
        <VerGuardiaAsignadaModal
          onClose={() => setIsVerGuardiaAsignadaOpen(false)}
          onRefresh={fetchShifts}
          shift={shiftToManage}
          onFinalize={() => {
            setIsVerGuardiaAsignadaOpen(false)
            setIsCalificarOpen(true)
          }}
        />
      )}
      {isCalificarOpen && (
        <CalificarMedicoModal
          onClose={() => setIsCalificarOpen(false)}
          onRefresh={fetchShifts}
          shift={shiftToManage}
        />
      )}
    </main>
  )
}

export default function PanelClinica() {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center text-slate-500">Cargando...</div>}>
      <PanelClinicaContent />
    </Suspense>
  )
}
