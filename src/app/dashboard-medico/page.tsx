'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import ExplorarGuardiaModal from '@/components/ExplorarGuardiaModal'
import SkeletonGuardia from '@/components/SkeletonGuardia'
import { FilterBar } from '@/components/FilterBar'
import { GuardiaCard } from '@/components/GuardiaCard'
import { format, parseISO } from 'date-fns'
import { hasIncompatibleAssignedShift, type AssignedShiftBlock } from '@/lib/shiftOverlap'
import { es } from 'date-fns/locale'
import { Activity, CalendarDays, Ambulance } from 'lucide-react'

export default function DashboardMedico() {
  const [shifts, setShifts] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('medico_feed_cache')
        if (cached) {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed)) return parsed
        }
      } catch {
        sessionStorage.removeItem('medico_feed_cache')
      }
    }
    return []
  })

  // --- MAGIA: CACHÉ SÍNCRONO DE POSTULACIONES ---
  const [myApplications, setMyApplications] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('medico_apps_cache')
        if (cached) {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed)) return parsed
        }
      } catch {
        sessionStorage.removeItem('medico_apps_cache')
      }
    }
    return []
  })
  
  const [loadingBtn, setLoadingBtn] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isFetching, setIsFetching] = useState(true) 
  const [selectedShift, setSelectedShift] = useState<any>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [filterFromDate, setFilterFromDate] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedSpecialty, setSelectedSpecialty] = useState('Todas')
  const [sortBy, setSortBy] = useState<'recent' | 'price_high' | 'price_low'>('recent')
  const [myConfirmedShifts, setMyConfirmedShifts] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('medico_confirmed_cache')
        if (cached) {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed)) return parsed
        }
      } catch {
        sessionStorage.removeItem('medico_confirmed_cache')
      }
    }
    return []
  })

  // Especialidades del médico (objetos completos con verified) — para filtrar el feed y el modal
  // null = todavía no se cargó del server; [] = sin especialidades (ve todo); [...] = lista
  const [doctorSpecialties, setDoctorSpecialties] = useState<{name: string; verified: boolean}[] | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('medico_specialties_cache')
        if (cached) {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed)) return parsed
        }
      } catch {
        sessionStorage.removeItem('medico_specialties_cache')
      }
    }
    return null
  })

  function checkOverlap(shiftDate: Date, durationHours: number, excludeShiftId?: string): boolean {
    const blocks: AssignedShiftBlock[] = myConfirmedShifts.map((c) => ({
      id: c.id,
      date_time: c.date_time,
      duration_hours: c.duration_hours ?? null,
    }))
    return hasIncompatibleAssignedShift(
      shiftDate,
      durationHours,
      blocks,
      excludeShiftId ?? '',
    )
  }

  useEffect(() => { 
    setMounted(true)
    fetchShiftsAndApplications() 
  }, [])

  const fetchShiftsAndApplications = async () => {
    setIsFetching(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return;

    const [shiftsRes, appsRes, confirmedRes, profileRes] = await Promise.all([
      supabase
        .from('shifts')
        .select('*, clinic:profiles!clinic_id(*)')
        .eq('status', 'open')
        .order('date_time', { ascending: true })
        .limit(50),
      supabase
        .from('shift_applications')
        .select('shift_id')
        .eq('professional_id', session.user.id)
        .eq('status', 'pending')
        .order('id', { ascending: false }),
      supabase
        .from('shifts')
        .select('id, date_time, duration_hours')
        .eq('professional_id', session.user.id)
        .eq('status', 'filled')
        .order('date_time', { ascending: true }),
      supabase
        .from('profiles')
        .select('is_verified, specialty')
        .eq('id', session.user.id)
        .single(),
    ])

    if (shiftsRes.data) {
      setShifts(shiftsRes.data)
      sessionStorage.setItem('medico_feed_cache', JSON.stringify(shiftsRes.data))
    }
    if (appsRes.data) {
      const apps = appsRes.data.map((a: any) => a.shift_id)
      setMyApplications(apps)
      sessionStorage.setItem('medico_apps_cache', JSON.stringify(apps))
    }
    if (confirmedRes.data) {
      setMyConfirmedShifts(confirmedRes.data)
      sessionStorage.setItem('medico_confirmed_cache', JSON.stringify(confirmedRes.data))
    }
    if (profileRes.data) {
      const p = profileRes.data
      sessionStorage.setItem('medico_is_verified', String(p.is_verified === true))
      // Guardar objetos completos {name, verified} para que el modal pueda decidir por especialidad
      let specialtyObjects: {name: string; verified: boolean}[] = []
      if (p.specialty) {
        try {
          const parsed = JSON.parse(p.specialty)
          if (Array.isArray(parsed)) {
            specialtyObjects = parsed
              .map((s: any) => ({ name: String(s.name || ''), verified: s.verified === true }))
              .filter(s => s.name)
          }
        } catch {}
      }
      setDoctorSpecialties(specialtyObjects)
      sessionStorage.setItem('medico_specialties_cache', JSON.stringify(specialtyObjects))
    }

    setIsFetching(false)
  }

  const handleApply = async (shiftId: string) => {
    setLoadingBtn(shiftId)
    const { data: { session } } = await supabase.auth.getSession()
    
    const { error } = await supabase.from('shift_applications').insert([{ shift_id: shiftId, professional_id: session?.user.id, status: 'pending' }])
    
    if (error) {
      alert('Error al postularse: ' + error.message)
      setLoadingBtn(null)
      return;
    }

    const shift = shifts.find(s => s.id === shiftId);
    if (shift && shift.clinic_id) {
      await supabase.from('notifications').insert([{
        user_id: shift.clinic_id,
        shift_id: shiftId,
        title: '¡Nueva Postulación! 👨‍⚕️',
        message: `Un profesional se acaba de postular a tu guardia: ${shift.title}.`
      }])
    }

    // Notificación en segundo plano (sin bloquear la UI)
    void fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'NEW_APPLICATION',
        shift_id: shiftId,
        professional_id: session?.user.id,
        clinic_id: shift?.clinic_id || null,
      }),
    }).catch(() => {})

    alert('¡Postulación enviada a la clínica con éxito!')
    
    // --- ACTUALIZAMOS ESTADO Y CACHÉ AL INSTANTE ---
    const newApps = [...myApplications, shiftId]
    setMyApplications(newApps)
    sessionStorage.setItem('medico_apps_cache', JSON.stringify(newApps))
    
    setLoadingBtn(null)
  }

  const handleCancelApplication = async (shiftId: string) => {
    if (!confirm('¿Querés retirar tu postulación para esta guardia?')) return;
    setLoadingBtn(shiftId)
    const { data: { session } } = await supabase.auth.getSession()
    
    const { error } = await supabase.from('shift_applications').delete().eq('shift_id', shiftId).eq('professional_id', session?.user.id)
    
    if (error) {
      alert('Error al cancelar: ' + error.message)
      setLoadingBtn(null)
      return;
    }

    // --- ACTUALIZAMOS ESTADO Y CACHÉ AL INSTANTE ---
    const newApps = myApplications.filter(id => id !== shiftId)
    setMyApplications(newApps)
    sessionStorage.setItem('medico_apps_cache', JSON.stringify(newApps))
    
    setLoadingBtn(null)
  }

  const filteredShifts = shifts.filter(shift => {
    const matchesSearch = (shift.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shift.clinic?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSpecialty = selectedSpecialty === 'Todas' || shift.specialty_required === selectedSpecialty;
    if (filterFromDate) {
      const shiftDay = format(parseISO(shift.date_time), 'yyyy-MM-dd');
      if (shiftDay < filterFromDate) return false;
    }
    return matchesSearch && matchesSpecialty;
  })

  const sortedShifts = [...filteredShifts].sort((a, b) => {
    if (sortBy === 'recent') return new Date(a.date_time).getTime() - new Date(b.date_time).getTime()
    if (sortBy === 'price_high') return (b.price ?? 0) - (a.price ?? 0)
    if (sortBy === 'price_low') return (a.price ?? 0) - (b.price ?? 0)
    return 0
  })

  const uniqueSpecialties = ['Todas', ...Array.from(new Set(shifts.map(s => s.specialty_required).filter(Boolean)))]

  if (!mounted) return <main className="min-h-[calc(100vh-73px)] bg-slate-50"></main>

  return (
    <main className="min-h-[calc(100vh-73px)] bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">Guardias disponibles</h1>
          <p className="mt-1 text-sm text-slate-500">
            Explora detalles de la clínica, sus reseñas y postúlate.
          </p>
        </div>

        <FilterBar
          viewMode={viewMode}
          setViewMode={setViewMode}
          filterFromDate={filterFromDate}
          setFilterFromDate={setFilterFromDate}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedSpecialty={selectedSpecialty}
          setSelectedSpecialty={setSelectedSpecialty}
          sortBy={sortBy}
          setSortBy={setSortBy}
          uniqueSpecialties={uniqueSpecialties as string[]}
        />

        {isFetching && shifts.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonGuardia /><SkeletonGuardia /><SkeletonGuardia />
          </div>
        ) : sortedShifts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm">
            <p className="text-slate-500 font-medium">No se encontraron guardias con esos filtros.</p>
            <button onClick={() => { setSearchTerm(''); setSelectedSpecialty('Todas'); setFilterFromDate(''); }} className="mt-4 text-blue-600 font-bold hover:underline">
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div
            className={
              viewMode === 'list'
                ? 'flex flex-col gap-4'
                : 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3'
            }
          >
            {sortedShifts.map((shift) => {
              const shiftDate = parseISO(shift.date_time)
              const hasApplied = myApplications.includes(shift.id)
              const hasOverlap =
                shift.status === 'open' &&
                checkOverlap(shiftDate, Number(shift.duration_hours) || 0, shift.id)

              return (
                <GuardiaCard
                  key={shift.id}
                  shift={shift}
                  viewMode={viewMode}
                  hasApplied={hasApplied}
                  isConfirmed={myConfirmedShifts.some(c => c.id === shift.id)}
                  hasOverlap={hasOverlap}
                  onClick={() => setSelectedShift(shift)}
                />
              )
            })}
          </div>
        )}
      </div>

      {selectedShift && (
        <ExplorarGuardiaModal 
          shift={selectedShift}
          hasApplied={myApplications.includes(selectedShift.id)}
          hasOverlap={selectedShift.status === 'open' && checkOverlap(parseISO(selectedShift.date_time), Number(selectedShift.duration_hours) || 0, selectedShift.id)}
          onClose={() => setSelectedShift(null)}
          onApply={handleApply}
          onWithdraw={handleCancelApplication}
          loadingBtn={loadingBtn}
        />
      )}
    </main>
  )
}