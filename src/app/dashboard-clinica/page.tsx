'use client'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import PublicarModal from '@/components/PublicarModal'
import VerPostulantesModal from '@/components/VerPostulantesModal'
import CalificarMedicoModal from '@/components/CalificarMedicoModal' 
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, eachDayOfInterval, parseISO, differenceInHours, isAfter } from 'date-fns'
import { es } from 'date-fns/locale'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'

function DashboardClinicaContent() {
  const [myShifts, setMyShifts] = useState<any[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isPublicarOpen, setIsPublicarOpen] = useState(false)
  const [isPostulantesOpen, setIsPostulantesOpen] = useState(false)
  const [isCalificarOpen, setIsCalificarOpen] = useState(false) 
  const [selectedDateForModal, setSelectedDateForModal] = useState<Date | null>(null)
  const [shiftToManage, setShiftToManage] = useState<any>(null)

  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const shiftIdParam = searchParams?.get('shiftId')

  useEffect(() => {
    fetchMyShifts()
    const handleRefresh = () => fetchMyShifts()
    window.addEventListener('refresh-shifts', handleRefresh)
    return () => window.removeEventListener('refresh-shifts', handleRefresh)
  }, [])

  async function fetchMyShifts() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return;
    const { data } = await supabase.from('shifts').select('*, applicants:shift_applications(status)').eq('clinic_id', session.user.id)
    if (data) setMyShifts(data)
  }

  // --- LÓGICA DE NOTIFICACIONES CORREGIDA (DEEP LINK AGRESIVO) ---
  useEffect(() => {
    if (shiftIdParam) {
      // 1. Refrescamos la lista de guardias en el fondo
      fetchMyShifts().then(() => {
        // 2. Vamos a buscar la guardia exacta de la notificación 100% fresca a la BD
        supabase.from('shifts')
          .select('*, applicants:shift_applications(status)')
          .eq('id', shiftIdParam)
          .single()
          .then(({ data: shift }) => {
            if (shift) {
              setShiftToManage(shift);
              setIsPostulantesOpen(false); // Cerramos por si había otro abierto
              setIsCalificarOpen(false);
              
              // 3. Abrimos el correcto
              if (shift.status === 'open') setIsPostulantesOpen(true);
              else if (shift.status === 'filled') setIsCalificarOpen(true);
              else if (shift.status === 'completed') alert('Esta guardia ya fue completada y el profesional fue calificado.');
              
              // 4. Limpiamos la URL para no reabrirlo al refrescar
              router.replace(pathname, { scroll: false });
            }
          });
      });
    }
  }, [shiftIdParam, pathname, router])

  const handleDayClick = (day: Date) => { setSelectedDateForModal(day); setIsPublicarOpen(true); }

  const handleShiftClick = (e: React.MouseEvent, shift: any) => { 
    e.stopPropagation(); 
    setShiftToManage(shift); 
    setIsPostulantesOpen(false);
    setIsCalificarOpen(false);
    
    if (shift.status === 'open') setIsPostulantesOpen(true); 
    else if (shift.status === 'filled') setIsCalificarOpen(true);
    else if (shift.status === 'completed') alert('Esta guardia ya fue completada y el profesional fue calificado.');
  }

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

  const monthStart = startOfMonth(currentDate); const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })
  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']; const now = new Date()

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
          <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-blue-500 mr-1.5"></div>Creada</div>
          <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-orange-500 mr-1.5"></div>Con Postulantes</div>
          <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-emerald-500 mr-1.5"></div>Asignada</div>
          <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-slate-400 mr-1.5"></div>Finalizada</div>
        </div>
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-xl border-2 border-slate-900 overflow-hidden min-h-0">
          <div className="grid grid-cols-7 bg-slate-900 border-b border-slate-900 shrink-0">
            {weekDays.map(day => (<div key={day} className="py-3 text-center text-xs font-bold text-white uppercase tracking-wider">{day}</div>))}
          </div>
          <div className="flex-1 overflow-y-auto bg-slate-200 custom-scrollbar">
            <div className="grid grid-cols-7 auto-rows-[minmax(120px,auto)] md:auto-rows-[minmax(140px,auto)] gap-[1px]">
              {calendarDays.map((day) => {
                const dayShifts = myShifts.filter(shift => isSameDay(parseISO(shift.date_time), day))
                const isCurrentMonth = isSameMonth(day, monthStart)
                const isToday = isSameDay(day, new Date())

                return (
                  <div key={day.toString()} onClick={() => handleDayClick(day)} className={`p-2 transition-colors ${isCurrentMonth ? 'bg-white' : 'bg-slate-50'} hover:bg-slate-50 flex flex-col cursor-pointer group`}>
                    <div className="flex justify-end mb-2 shrink-0"><span className={`text-xs font-bold h-7 w-7 flex items-center justify-center rounded-full ${isToday ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500'}`}>{format(day, 'd')}</span></div>
                    <div className="flex flex-col space-y-1.5 pb-1">
                      {dayShifts.map(shift => {
                        const shiftDate = parseISO(shift.date_time); 
                        const hoursUntil = differenceInHours(shiftDate, now); 
                        const isFuture = isAfter(shiftDate, now);
                        const pendingApps = shift.applicants?.filter((a: any) => a.status === 'pending') || [];
                        let cardStyle = 'bg-blue-50 border border-blue-200 text-blue-700 shadow-sm' 
                        if (shift.status === 'filled') cardStyle = 'bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-sm'
                        else if (shift.status === 'completed') cardStyle = 'bg-slate-100 border border-slate-300 text-slate-500 opacity-80'
                        else if (shift.status === 'open' && pendingApps.length > 0) cardStyle = 'bg-orange-50 border border-orange-300 text-orange-800 shadow-sm hover:bg-orange-100 animate-pulse'
                        else if (shift.status === 'open' && isFuture && hoursUntil <= 24) cardStyle = 'bg-red-50 border border-red-200 text-red-600 animate-pulse'

                        return (
                          <div key={shift.id} onClick={(e) => handleShiftClick(e, shift)} className={`text-xs p-2 rounded-lg transition-all cursor-pointer ${cardStyle}`}>
                            <div className="font-semibold truncate">{shift.title}</div>
                            <div className="flex justify-between items-center mt-1"><span className="opacity-80">{format(shiftDate, 'HH:mm')}</span><span className="font-bold">${shift.price / 1000}k</span></div>
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
      {isPublicarOpen && <PublicarModal onClose={() => setIsPublicarOpen(false)} onRefresh={fetchMyShifts} selectedDate={selectedDateForModal} />}
      {isPostulantesOpen && <VerPostulantesModal onClose={() => setIsPostulantesOpen(false)} onRefresh={fetchMyShifts} shift={shiftToManage} />}
      {isCalificarOpen && <CalificarMedicoModal onClose={() => setIsCalificarOpen(false)} onRefresh={fetchMyShifts} shift={shiftToManage} />}
    </main>
  )
}

export default function DashboardClinica() {
  return (<Suspense fallback={<div>Cargando...</div>}><DashboardClinicaContent /></Suspense>)
}