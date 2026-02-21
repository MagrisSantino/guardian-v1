'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import ExplorarGuardiaModal from '@/components/ExplorarGuardiaModal'
import SkeletonGuardia from '@/components/SkeletonGuardia' // <--- IMPORTAMOS EL SKELETON
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Search, Filter } from 'lucide-react' // <--- ICONOS PARA EL BUSCADOR

export default function DashboardMedico() {
  const [shifts, setShifts] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('medico_feed_cache')
      return cached ? JSON.parse(cached) : []
    }
    return []
  })
  
  const [myApplications, setMyApplications] = useState<string[]>([]) 
  const [loadingBtn, setLoadingBtn] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isFetching, setIsFetching] = useState(true) // <--- ESTADO PARA SABER SI ESTÁ CARGANDO DE LA BD
  const [selectedShift, setSelectedShift] = useState<any>(null)

  // ESTADOS PARA FILTROS
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSpecialty, setSelectedSpecialty] = useState('Todas')

  useEffect(() => { 
    setMounted(true)
    fetchShiftsAndApplications() 
  }, [])

  const fetchShiftsAndApplications = async () => {
    setIsFetching(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return;

    const { data: shiftsData } = await supabase.from('shifts').select('*, clinic:profiles!clinic_id(*)').eq('status', 'open').order('date_time', { ascending: true })
    const { data: appsData } = await supabase.from('shift_applications').select('shift_id').eq('professional_id', session.user.id).eq('status', 'pending')

    if (shiftsData) {
      setShifts(shiftsData)
      sessionStorage.setItem('medico_feed_cache', JSON.stringify(shiftsData))
    }
    if (appsData) setMyApplications(appsData.map(a => a.shift_id))
    
    setIsFetching(false)
  }

  const handleApply = async (shiftId: string) => {
    setLoadingBtn(shiftId)
    const { data: { session } } = await supabase.auth.getSession()
    
    await supabase.from('shift_applications').insert([{ shift_id: shiftId, professional_id: session?.user.id, status: 'pending' }])
    
    // AVISO A LA CLÍNICA
    const shift = shifts.find(s => s.id === shiftId);
    if (shift && shift.clinic_id) {
      await supabase.from('notifications').insert([{
        user_id: shift.clinic_id,
        shift_id: shiftId,
        title: '¡Nueva Postulación! 👨‍⚕️',
        message: `Un profesional se acaba de postular a tu guardia: ${shift.title}.`
      }])
    }

    alert('¡Postulación enviada a la clínica con éxito!')
    setMyApplications([...myApplications, shiftId])
    setLoadingBtn(null)
  }

  const handleCancelApplication = async (shiftId: string) => {
    if (!confirm('¿Querés retirar tu postulación para esta guardia?')) return;
    setLoadingBtn(shiftId)
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.from('shift_applications').delete().eq('shift_id', shiftId).eq('professional_id', session?.user.id)
    setMyApplications(myApplications.filter(id => id !== shiftId))
    setLoadingBtn(null)
  }

  // --- LÓGICA DE FILTRADO ---
  const filteredShifts = shifts.filter(shift => {
    const matchesSearch = (shift.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           shift.clinic?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSpecialty = selectedSpecialty === 'Todas' || shift.specialty_required === selectedSpecialty;
    return matchesSearch && matchesSpecialty;
  });

  // Extraemos especialidades únicas para armar el dropdown automáticamente
  const uniqueSpecialties = ['Todas', ...Array.from(new Set(shifts.map(s => s.specialty_required).filter(Boolean)))];

  if (!mounted) return <main className="min-h-[calc(100vh-73px)] bg-slate-50 p-6 md:p-8"></main>

  return (
    <main className="min-h-[calc(100vh-73px)] bg-slate-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-slate-900">Bolsa de Trabajo</h1>
            <p className="text-slate-500 text-base">Explora detalles de la clínica, sus reseñas y postulate.</p>
          </div>
          <span className="bg-blue-100 text-blue-800 text-sm font-bold px-4 py-2 rounded-full border border-blue-200">
            {shifts.length} Guardias Disponibles
          </span>
        </div>

        {/* --- BARRA DE BÚSQUEDA Y FILTROS --- */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-8 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por clínica o puesto..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium text-slate-700"
            />
          </div>
          <div className="w-full md:w-64 relative">
            <Filter className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <select 
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium text-slate-700 appearance-none cursor-pointer"
            >
              {uniqueSpecialties.map(spec => (
                <option key={spec as string} value={spec as string}>{spec}</option>
              ))}
            </select>
          </div>
        </div>

        {/* --- GRILLA DE RESULTADOS --- */}
        {isFetching && shifts.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonGuardia />
            <SkeletonGuardia />
            <SkeletonGuardia />
          </div>
        ) : filteredShifts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm">
            <p className="text-slate-500 font-medium">No se encontraron guardias con esos filtros.</p>
            <button onClick={() => {setSearchTerm(''); setSelectedSpecialty('Todas');}} className="mt-4 text-blue-600 font-bold hover:underline">
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredShifts.map(shift => {
               const shiftDate = parseISO(shift.date_time)
               const hasApplied = myApplications.includes(shift.id)

               return (
                <div 
                  key={shift.id} 
                  onClick={() => setSelectedShift(shift)}
                  className={`bg-white p-6 rounded-xl border-2 transition-all flex flex-col justify-between group cursor-pointer relative shadow-sm hover:shadow-md ${hasApplied ? 'border-orange-300 hover:border-orange-400' : 'border-slate-200 hover:border-blue-400'}`}
                >
                  {hasApplied && (
                    <div className="absolute top-4 right-4 bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-1 rounded border border-orange-200 uppercase tracking-wider">
                       Postulado ✓
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-sm text-slate-900 font-bold mb-1 group-hover:text-blue-600 transition-colors pr-16">{shift.clinic?.full_name || 'Sanatorio Confidencial'}</h4>
                        <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">{shift.specialty_required}</span>
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-bold mb-4 text-slate-800">{shift.title}</h3>
                    <p className="text-2xl font-bold text-emerald-600 mb-4">${shift.price.toLocaleString()}</p>
                    
                    <div className="space-y-2.5 pt-4 border-t border-slate-100">
                      <div className="flex items-center text-slate-600 text-sm gap-3"><span className="text-slate-400">📅</span> <span className="capitalize font-medium">{format(shiftDate, "EEEE d 'de' MMMM", { locale: es })}</span></div>
                      <div className="flex items-center text-slate-600 text-sm gap-3"><span className="text-slate-400">⏰</span> <span>{format(shiftDate, 'HH:mm')}hs ({shift.duration_hours}hs)</span></div>
                    </div>
                  </div>
                </div>
               )
            })}
          </div>
        )}
      </div>

      {selectedShift && (
        <ExplorarGuardiaModal 
          shift={selectedShift}
          hasApplied={myApplications.includes(selectedShift.id)}
          onClose={() => setSelectedShift(null)}
          onApply={handleApply}
          onWithdraw={handleCancelApplication}
          loadingBtn={loadingBtn}
        />
      )}
    </main>
  )
}