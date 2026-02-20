'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, eachDayOfInterval, parseISO 
} from 'date-fns'
import { es } from 'date-fns/locale'

export default function DashboardClinica() {
  const [myShifts, setMyShifts] = useState<any[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    fetchMyShifts()
    
    // Escuchamos el evento del Navbar para recargar los datos cuando se crea una guardia
    const handleRefresh = () => fetchMyShifts()
    window.addEventListener('refresh-shifts', handleRefresh)
    
    return () => window.removeEventListener('refresh-shifts', handleRefresh)
  }, [])

  async function fetchMyShifts() {
    const { data: { session } } = await supabase.auth.getSession()
    const { data } = await supabase
      .from('shifts')
      .select('*')
      .eq('clinic_id', session?.user.id)
    if (data) setMyShifts(data)
  }

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

  // Lógica matemática del calendario
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }) // Lunes
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-8">
      
      {/* Controles del Calendario */}
      <div className="flex justify-between items-center mb-8 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <h1 className="text-2xl font-bold text-blue-400 capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: es })}
        </h1>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold">&larr; Mes Anterior</button>
          <button onClick={nextMonth} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold">Mes Siguiente &rarr;</button>
        </div>
      </div>

      {/* Grilla del Calendario */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        {/* Cabecera de los días */}
        <div className="grid grid-cols-7 bg-slate-950 border-b border-slate-800">
          {weekDays.map(day => (
            <div key={day} className="p-3 text-center text-sm font-bold text-slate-500 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Celdas de los días */}
        <div className="grid grid-cols-7 auto-rows-fr bg-slate-800 gap-[1px]">
          {calendarDays.map((day, idx) => {
            // Buscamos si hay guardias publicadas para este día específico
            const dayShifts = myShifts.filter(shift => isSameDay(parseISO(shift.date_time), day))
            const isCurrentMonth = isSameMonth(day, monthStart)
            const isToday = isSameDay(day, new Date())

            return (
              <div 
                key={day.toString()} 
                className={`min-h-[140px] p-3 transition-colors ${isCurrentMonth ? 'bg-slate-900' : 'bg-slate-950 opacity-50'} hover:bg-slate-800/80`}
              >
                {/* Número del día */}
                <div className={`flex justify-end mb-2`}>
                  <span className={`text-sm font-bold h-7 w-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
                    {format(day, 'd')}
                  </span>
                </div>

                {/* Lista de guardias de ese día */}
                <div className="space-y-2">
                  {dayShifts.map(shift => (
                    <div 
                      key={shift.id} 
                      className={`text-xs p-2 rounded-md border ${
                        shift.status === 'open' 
                          ? 'bg-blue-900/30 border-blue-500/50 text-blue-300' // Guardia Libre (Azul)
                          : 'bg-green-900/30 border-green-500/50 text-green-300' // Guardia Cubierta (Verde)
                      }`}
                    >
                      <div className="font-bold truncate">{shift.title}</div>
                      <div className="flex justify-between mt-1 items-center">
                        <span>{format(parseISO(shift.date_time), 'HH:mm')}hs</span>
                        <span className="font-bold">${shift.price}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      
    </main>
  )
}