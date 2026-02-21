'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function VerPostulantesModal({ onClose, onRefresh, shift }: any) {
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApp, setSelectedApp] = useState<any>(null) 
  
  // Nuevos estados para las reseñas
  const [doctorReviews, setDoctorReviews] = useState<any[]>([])
  const [loadingReviews, setLoadingReviews] = useState(false)

  useEffect(() => {
    fetchApplications()
  }, [])

  // Disparamos la búsqueda de reseñas SOLO cuando se selecciona un médico
  useEffect(() => {
    if (selectedApp) {
      fetchDoctorReviews(selectedApp.professional.id)
    }
  }, [selectedApp])

  async function fetchApplications() {
    const { data } = await supabase
      .from('shift_applications')
      .select('*, professional:profiles!professional_id(*)')
      .eq('shift_id', shift.id)
      .eq('status', 'pending')
    
    if (data) setApplications(data)
    setLoading(false)
  }

  // Función para buscar los comentarios que le dejaron otras clínicas
  async function fetchDoctorReviews(doctorId: string) {
    setLoadingReviews(true)
    const { data } = await supabase
      .from('reviews')
      .select('rating, comment, created_at, clinic:profiles!reviewer_id(full_name)')
      .eq('reviewed_id', doctorId)
      .order('created_at', { ascending: false })
      .limit(5) // Traemos las últimas 5 para no saturar
    
    if (data) setDoctorReviews(data)
    setLoadingReviews(false)
  }

  async function handleAccept(applicationId: string, professionalId: string) {
    if (!confirm('¿Estás seguro de asignar la guardia a este profesional?')) return;
    setLoading(true)

    await supabase.from('shifts').update({ status: 'filled', professional_id: professionalId }).eq('id', shift.id)
    await supabase.from('shift_applications').update({ status: 'accepted' }).eq('id', applicationId)
    await supabase.from('shift_applications').update({ status: 'rejected' }).eq('shift_id', shift.id).eq('status', 'pending')

    alert('¡Médico asignado correctamente!')
    onRefresh()
    onClose()
  }

  async function handleDeleteShift() {
    if (!confirm('¿Eliminar esta guardia definitivamente?')) return;
    await supabase.from('shifts').delete().eq('id', shift.id)
    onRefresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-2xl w-full max-w-xl shadow-2xl transition-all">
        
        {selectedApp ? (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <button 
              onClick={() => setSelectedApp(null)} 
              className="text-slate-500 hover:text-blue-600 mb-6 text-sm font-bold flex items-center gap-1 transition-colors"
            >
              &larr; Volver a la lista
            </button>

            <div className="flex items-center gap-4 mb-6">
               <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-3xl border border-blue-100 shadow-sm shrink-0">
                 👨‍⚕️
               </div>
               <div>
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    {selectedApp.professional.full_name || 'Dr. Sin Nombre'}
                    {selectedApp.professional.is_verified && (
                      <span className="bg-blue-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full shadow-sm" title="Verificado">✓</span>
                    )}
                  </h2>
                  <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800 mt-1">
                    <span className="text-amber-400 text-lg leading-none">★</span>
                    <span>{selectedApp.professional.reviews_count > 0 ? Number(selectedApp.professional.rating).toFixed(2) : 'Nuevo'}</span>
                    <span className="text-xs text-slate-400 font-medium">({selectedApp.professional.reviews_count} reseñas)</span>
                  </div>
               </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4 mb-6 shadow-inner">
               <div>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Especialidades</p>
                 <p className="font-semibold text-slate-900">{selectedApp.professional.specialties || 'No especificadas'}</p>
               </div>
               <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200/60">
                 <div>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Matrícula</p>
                   <p className="font-semibold text-slate-900">{selectedApp.professional.medical_license || 'No especificada'}</p>
                 </div>
                 <div>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Experiencia</p>
                   <p className="font-semibold text-slate-900">{selectedApp.professional.experience_years ? `${selectedApp.professional.experience_years} años` : 'No especificada'}</p>
                 </div>
               </div>
            </div>

            {/* --- SECCIÓN DE RESEÑAS --- */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                Últimas Reseñas de Clínicas
              </h3>
              
              <div className="space-y-3 min-h-[50px] max-h-[180px] overflow-y-auto custom-scrollbar pr-2">
                {loadingReviews ? (
                  <p className="text-xs text-slate-500 text-center py-4">Cargando comentarios...</p>
                ) : doctorReviews.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4 italic bg-slate-50 rounded-lg border border-slate-100">Este profesional aún no tiene comentarios escritos.</p>
                ) : (
                  doctorReviews.map((review, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-slate-700">{review.clinic?.full_name || 'Clínica Anónima'}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-amber-400 text-xs">★</span>
                          <span className="text-xs font-bold text-slate-800">{review.rating}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 mb-2 leading-relaxed">"{review.comment || 'Sin comentario detallado.'}"</p>
                      <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">
                        {format(new Date(review.created_at), 'MMM yyyy', { locale: es })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button 
              onClick={() => handleAccept(selectedApp.id, selectedApp.professional_id)} 
              className="w-full bg-slate-900 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-md hover:shadow-blue-900/20 transition-all text-base"
            >
               Asignar Guardia a {selectedApp.professional.full_name?.split(' ')[0] || 'este médico'}
            </button>
          </div>
        ) : (
          
          <div className="animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{shift.title}</h2>
                <p className="text-slate-500 text-sm mt-1">{format(new Date(shift.date_time), 'dd/MM/yyyy HH:mm')}hs | ${shift.price.toLocaleString()}</p>
              </div>
              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-200 uppercase whitespace-nowrap">
                {applications.length} Postulantes
              </span>
            </div>
            
            <div className="space-y-3 min-h-[150px] max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              {loading ? (
                <p className="text-center text-slate-400 mt-10">Cargando profesionales...</p>
              ) : applications.length === 0 ? (
                <p className="text-center text-slate-400 mt-10">Aún no hay profesionales postulados.</p>
              ) : (
                applications.map(app => {
                  const prof = app.professional;
                  const ratingDisplay = prof.reviews_count > 0 ? Number(prof.rating).toFixed(2) : 'Nuevo';

                  return (
                    <div 
                      key={app.id} 
                      onClick={() => setSelectedApp(app)}
                      className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md hover:shadow-blue-900/5 transition-all cursor-pointer gap-4 group"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-slate-900 text-base group-hover:text-blue-700 transition-colors">{prof.full_name || 'Dr. Sin Nombre'}</p>
                          {prof.is_verified && (
                            <span className="bg-blue-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full" title="Verificado">✓</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                          <span className="text-amber-400 text-sm">★</span> 
                          <span>{ratingDisplay}</span>
                          <span className="text-slate-400 font-medium ml-1">
                            • {prof.specialties || 'General'}
                          </span>
                        </div>
                      </div>

                      <button 
                        onClick={(e) => { e.stopPropagation(); handleAccept(app.id, app.professional_id); }}
                        className="w-full sm:w-auto bg-white border border-slate-300 hover:bg-slate-900 hover:text-white hover:border-slate-900 text-slate-700 px-5 py-2 rounded-lg text-sm font-bold shadow-sm transition-all"
                      >
                        Asignar
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            <div className="flex justify-between mt-6 pt-6 border-t border-slate-100">
              <button onClick={handleDeleteShift} className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-bold transition-all">Eliminar Guardia</button>
              <button onClick={onClose} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-6 py-2 rounded-lg font-bold transition-all shadow-sm">Cerrar</button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}