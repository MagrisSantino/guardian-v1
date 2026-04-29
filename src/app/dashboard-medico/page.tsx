'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import ExplorarGuardiaModal from '@/components/ExplorarGuardiaModal'
import SkeletonGuardia from '@/components/SkeletonGuardia'
import { FilterBar } from '@/components/FilterBar'
import { GuardiaCard } from '@/components/GuardiaCard'
import { format, parseISO } from 'date-fns'
import { hasConflict, type AssignedShiftBlock } from '@/lib/shiftOverlap'

export default function DashboardMedico() {
  const [shifts, setShifts] = useState<any[]>([])
  const [myApplications, setMyApplications] = useState<string[]>([])
  const [myConfirmedShifts, setMyConfirmedShifts] = useState<AssignedShiftBlock[]>([])
  const [isVerified, setIsVerified] = useState(false)
  const [doctorSpecialty, setDoctorSpecialty] = useState<string[]>([])
  const [doctorSpecialtyVerified, setDoctorSpecialtyVerified] = useState<string[]>([])
  const [loadingBtn, setLoadingBtn] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [selectedShift, setSelectedShift] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterFromDate, setFilterFromDate] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedSpecialty, setSelectedSpecialty] = useState('Todas')
  const [sortBy, setSortBy] = useState<'recent' | 'price_high' | 'price_low'>('recent')

  useEffect(() => {
    setMounted(true)
    fetchAll()
  }, [])

  async function fetchAll() {
    setIsFetching(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [shiftsRes, appsRes, confirmedRes, accountRes, profileRes] = await Promise.all([
      supabase
        .from('shifts')
        .select('*, clinic:accounts_public!clinic_id(id,full_name,avatar_url,cover_url,clinic_location,clinic_rating,clinic_reviews_count,num_doctors,num_nurses,resources,complexity)')
        .eq('status', 'open')
        .order('starts_at', { ascending: true })
        .limit(50),
      supabase
        .from('shift_applications')
        .select('shift_id')
        .eq('doctor_id', user.id)
        .eq('status', 'pending'),
      supabase
        .from('shifts')
        .select('id, starts_at, ends_at')
        .eq('assigned_doctor_id', user.id)
        .eq('status', 'filled'),
      supabase
        .from('accounts')
        .select('verified_at')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('doctor_profiles')
        .select('specialty, specialty_verified')
        .eq('id', user.id)
        .maybeSingle(),
    ])

    if (shiftsRes.data) setShifts(shiftsRes.data)
    if (appsRes.data) setMyApplications(appsRes.data.map((a: any) => a.shift_id))
    if (confirmedRes.data) setMyConfirmedShifts(confirmedRes.data)
    if (accountRes.data) setIsVerified(!!accountRes.data.verified_at)
    if (profileRes.data) {
      setDoctorSpecialty(profileRes.data.specialty ?? [])
      setDoctorSpecialtyVerified(profileRes.data.specialty_verified ?? [])
    }
    setIsFetching(false)
  }

  function checkOverlap(shift: any): boolean {
    return hasConflict(
      { id: shift.id, starts_at: shift.starts_at, ends_at: shift.ends_at },
      myConfirmedShifts,
    )
  }

  async function handleApply(shiftId: string) {
    setLoadingBtn(shiftId)
    try {
      const res = await fetch('/api/shifts/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift_id: shiftId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { alert(data.error || 'Error al postularse.'); setLoadingBtn(null); return }
    } catch {
      alert('Error de conexión.'); setLoadingBtn(null); return
    }
    alert('¡Postulación enviada!')
    setMyApplications(prev => [...prev, shiftId])
    setLoadingBtn(null)
  }

  async function handleCancelApplication(shiftId: string) {
    if (!confirm('¿Querés retirar tu postulación para esta guardia?')) return
    setLoadingBtn(shiftId)
    try {
      const res = await fetch('/api/shifts/cancel-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift_id: shiftId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { alert(data.error || 'Error al retirar postulación.'); setLoadingBtn(null); return }
    } catch {
      alert('Error de conexión.'); setLoadingBtn(null); return
    }
    setMyApplications(prev => prev.filter(id => id !== shiftId))
    setLoadingBtn(null)
  }

  const filteredShifts = shifts.filter(s => {
    const matchesSearch = s.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.clinic?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSpecialty = selectedSpecialty === 'Todas' || s.specialty_required === selectedSpecialty
    if (filterFromDate) {
      const day = format(parseISO(s.starts_at), 'yyyy-MM-dd')
      if (day < filterFromDate) return false
    }
    return matchesSearch && matchesSpecialty
  })

  const sortedShifts = [...filteredShifts].sort((a, b) => {
    if (sortBy === 'recent') return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    if (sortBy === 'price_high') return (b.price ?? 0) - (a.price ?? 0)
    if (sortBy === 'price_low') return (a.price ?? 0) - (b.price ?? 0)
    return 0
  })

  const uniqueSpecialties = ['Todas', ...Array.from(new Set(shifts.map(s => s.specialty_required).filter(Boolean)))]

  if (!mounted) return <main className="min-h-[calc(100vh-73px)] bg-slate-50" />

  return (
    <main className="min-h-[calc(100vh-73px)] bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">Guardias disponibles</h1>
          <p className="mt-1 text-sm text-slate-500">Explora detalles de la clínica, sus reseñas y postúlate.</p>
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
          uniqueSpecialties={uniqueSpecialties}
        />

        {isFetching && shifts.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonGuardia /><SkeletonGuardia /><SkeletonGuardia />
          </div>
        ) : sortedShifts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm">
            <p className="text-slate-500 font-medium">No se encontraron guardias con esos filtros.</p>
            <button onClick={() => { setSearchTerm(''); setSelectedSpecialty('Todas'); setFilterFromDate('') }}
              className="mt-4 text-blue-600 font-bold hover:underline">
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className={viewMode === 'list' ? 'flex flex-col gap-4' : 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3'}>
            {sortedShifts.map((shift) => (
              <GuardiaCard
                key={shift.id}
                shift={shift}
                viewMode={viewMode}
                hasApplied={myApplications.includes(shift.id)}
                isConfirmed={myConfirmedShifts.some(c => c.id === shift.id)}
                hasOverlap={checkOverlap(shift)}
                onClick={() => setSelectedShift(shift)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedShift && (
        <ExplorarGuardiaModal
          shift={selectedShift}
          hasApplied={myApplications.includes(selectedShift.id)}
          hasOverlap={checkOverlap(selectedShift)}
          onClose={() => setSelectedShift(null)}
          onApply={handleApply}
          onWithdraw={handleCancelApplication}
          loadingBtn={loadingBtn}
          isVerified={isVerified}
          doctorSpecialty={doctorSpecialty}
          doctorSpecialtyVerified={doctorSpecialtyVerified}
        />
      )}
    </main>
  )
}
