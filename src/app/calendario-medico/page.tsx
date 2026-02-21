'use client'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import DetalleGuardiaMedicoModal from '@/components/DetalleGuardiaMedicoModal' 
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, eachDayOfInterval, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useSearchParams, usePathname, useRouter } from 'next/navigation' 

function CalendarioMedicoContent() {
  // --- CARGA SÍNCRONA DE GUARDIAS DE LA CACHÉ ---
  const [shifts, setShifts] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('medico_calendar_cache')
      return cached ? JSON.parse(cached) : []
    }
    return []
  })

  // --- CARGA SÍNCRONA DE POSTULACIONES DE LA CACHÉ ---
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
    if (!session) return;
    setUserId(session.user.id)
    
    const { data: openShifts } = await supabase.from('shifts').select('*, clinic:profiles!clinic_id(full_name)').eq('status', 'open')
    const { data: myShifts } = await supabase.from('shifts').select('*, clinic:profiles!clinic_id(full_name)').eq('professional_id', session.user.id)
    const { data: appsData } = await supabase.from('shift_applications').select('shift_id').eq('professional_id', session.user.id).eq('status', 'pending')
    
    // Guardamos las nuevas postulaciones en estado y caché
    if (appsData) {
      const apps = appsData.map(a => a.shift_id)
      setMyApplications(apps)
      sessionStorage.setItem('medico_apps_cache', JSON.stringify(apps))
    }

    const combined = [...(openShifts || []), ...(myShifts || [])]
    const uniqueShifts = Array.from(new Map(combined.map(item => [item.id, item])).values())
    setShifts(uniqueShifts)
    sessionStorage.setItem('medico_calendar_cache', JSON.stringify(uniqueShifts))
  }

  useEffect(() => {
    if (shiftIdParam && userId) {
      fetchData().then(() => {
        supabase.from('shifts')
          .select('*, clinic:profiles!clinic_id(full_name)')
          .eq('id', shiftIdParam)
          .single()
          .then(({ data: shift }) => {
            if (shift) {
              supabase.from('shift_applications')
                .select('id')
                .eq('shift_id', shift.id)
                .eq('professional_id', userId)
                .eq('status', 'pending')
                .single()
                .then(({ data: app }) => {
                  let status = 'disponible';
                  if (shift.status === 'completed' && shift.professional_id === userId) status = 'completada';
                  else if (shift.status === 'filled' && shift.professional_id === userId) status = 'confirmado';
                  else if (app) status = 'postulado';
                  
                  setSelectedShift(shift);
                  setSelectedUserStatus(status);
                  router.replace(pathname, { scroll: false }); 
                });
            }
          });
      });
    }
  }, [shiftIdParam, userId, pathname, router])

  const getUserStatus = (shift: any) => {
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

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

  const monthStart = startOfMonth(currentDate); const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate }); const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  if (!mounted) return <main className="h-[calc(100vh-73px)] bg-slate-50 p-4 md:p-6 overflow-hidden"></main>

  return (
    <main className="h-[calc(100vh-73px)] flex justify-center items-start bg-slate-50 p-4 md:p-6 overflow-hidden">
      <div className="w-full max-w-[1400px] h-full flex flex-col">
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 bg-slate-900 p-4 rounded-xl shadow-lg border border-slate-800 shrink-0">
          <h1 className="text-xl md:text-2xl font-bold text-white capitalize">{format(currentDate, 'MMMM yyyy', { locale: es })}</h1>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 px-4 py-2 rounded-lg font-medium transition-all shadow-sm">&larr; Ant</button>
            <button onClick={nextMonth} className="bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 px-4 py-2 rounded-lg font-medium transition-all shadow-sm">Sig &rarr;</button>
          </div>
        </div>
        <div className="flex gap-4 mb-2 text-[10px] md:text-xs justify-end px-2 shrink-0 font-medium text-slate-500 flex-wrap">
          <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-blue-500 mr-1.5"></div>Disponible</div>
          <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-orange-500 mr-1.5"></div>Postulado</div>
          <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-emerald-500 mr-1.5"></div>Confirmado</div>
          <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-slate-400 mr-1.5"></div>Finalizada</div>
        </div>
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-xl border-2 border-slate-900 overflow-hidden min-h-0">
          <div className="grid grid-cols-7 bg-slate-900 border-b border-slate-900 shrink-0">
            {weekDays.map(day => (<div key={day} className="py-3 text-center text-xs font-bold text-white uppercase tracking-wider">{day}</div>))}
          </div>
          <div className="flex-1 overflow-y-auto bg-slate-200 custom-scrollbar">
            <div className="grid grid-cols-7 auto-rows-[minmax(120px,auto)] md:auto-rows-[minmax(140px,auto)] gap-[1px]">
              {calendarDays.map((day) => {
                const dayShifts = shifts.filter(shift => isSameDay(parseISO(shift.date_time), day))
                const isCurrentMonth = isSameMonth(day, monthStart)
                const isToday = isSameDay(day, new Date())

                return (
                  <div key={day.toString()} className={`p-2 transition-colors ${isCurrentMonth ? 'bg-white' : 'bg-slate-50'} flex flex-col`}>
                    <div className={`flex justify-end mb-2 shrink-0`}><span className={`text-xs font-bold h-7 w-7 flex items-center justify-center rounded-full ${isToday ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500'}`}>{format(day, 'd')}</span></div>
                    <div className="flex flex-col space-y-1.5 pb-1">
                      {dayShifts.map(shift => {
                        const status = getUserStatus(shift);
                        const shiftDate = parseISO(shift.date_time);
                        let cardStyle = '';
                        if (status === 'completada') cardStyle = 'bg-slate-100 border border-slate-300 text-slate-500 hover:bg-slate-200 opacity-80'
                        else if (status === 'confirmado') cardStyle = 'bg-emerald-50 border border-emerald-300 text-emerald-800 shadow-sm hover:bg-emerald-100'
                        else if (status === 'postulado') cardStyle = 'bg-orange-50 border border-orange-300 text-orange-800 shadow-sm hover:bg-orange-100'
                        else cardStyle = 'bg-blue-50 border border-blue-200 text-blue-700 shadow-sm hover:bg-blue-100' 

                        return (
                          <div key={shift.id} onClick={() => handleShiftClick(shift)} className={`text-xs p-2 rounded-lg transition-all cursor-pointer group ${cardStyle}`}>
                            <div className="font-semibold truncate">{shift.clinic?.full_name || 'Clínica'}</div>
                            <div className={`flex justify-between items-center mt-1`}><span>{format(shiftDate, 'HH:mm')}</span><span className="font-bold">${shift.price / 1000}k</span></div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      {selectedShift && (<DetalleGuardiaMedicoModal shift={selectedShift} userStatus={selectedUserStatus} onClose={() => setSelectedShift(null)} onRefresh={fetchData} />)}
    </main>
  )
}

export default function CalendarioMedico() {
  return (<Suspense fallback={<div>Cargando...</div>}><CalendarioMedicoContent /></Suspense>)
}