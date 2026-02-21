'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function ExplorarGuardiaModal({ onClose, shift, hasApplied, onApply, onWithdraw, loadingBtn }: any) {
  const [reviews, setReviews] = useState<any[]>([])
  const [loadingReviews, setLoadingReviews] = useState(true)
  
  const clinic = shift.clinic;
  const ratingDisplay = clinic?.reviews_count > 0 ? Number(clinic.rating).toFixed(2) : 'Nueva';

  useEffect(() => {
    fetchReviews()
  }, [])

  async function fetchReviews() {
    const { data } = await supabase
      .from('reviews')
      .select('rating, comment, created_at, doctor:profiles!reviewer_id(full_name)')
      .eq('reviewed_id', shift.clinic_id)
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (data) setReviews(data)
    setLoadingReviews(false)
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-2xl w-full max-w-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Info de la Clínica y Reputación */}
        <div className="flex items-center gap-4 mb-6">
           <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-3xl border border-blue-100 shadow-sm shrink-0">
             🏥
           </div>
           <div>
              <h2 className="text-2xl font-bold text-slate-900">{clinic?.full_name || 'Clínica Confidencial'}</h2>
              <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800 mt-1">
                <span className="text-amber-400 text-lg leading-none">★</span>
                <span>{ratingDisplay}</span>
                <span className="text-xs text-slate-400 font-medium">({clinic?.reviews_count || 0} reseñas)</span>
              </div>
           </div>
        </div>

        {/* Detalles Técnicos de la Oferta */}
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4 mb-6 shadow-inner">
           <div className="flex justify-between items-start">
             <div>
               <h3 className="text-lg font-bold text-slate-800">{shift.title}</h3>
               <span className="text-xs font-bold bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded mt-1 inline-block uppercase tracking-wider">{shift.specialty_required}</span>
             </div>
             <p className="text-emerald-600 font-bold text-xl">${shift.price.toLocaleString()}</p>
           </div>
           
           <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200/60">
             <div>
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha y Hora</p>
               <p className="font-semibold text-slate-900">{format(new Date(shift.date_time), 'dd/MM/yyyy HH:mm')}hs</p>
             </div>
             <div>
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Duración</p>
               <p className="font-semibold text-slate-900">{shift.duration_hours} horas</p>
             </div>
             <div className="col-span-2">
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Ubicación</p>
               <p className="font-semibold text-slate-900">{shift.location || 'Córdoba Capital'}</p>
             </div>
           </div>
        </div>

        {/* Reseñas Reales */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            Reseñas de otros médicos
          </h3>
          <div className="space-y-3 min-h-[50px] max-h-[150px] overflow-y-auto custom-scrollbar pr-2">
            {loadingReviews ? (
              <p className="text-xs text-slate-500 text-center py-4">Cargando comentarios...</p>
            ) : reviews.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4 italic bg-slate-50 rounded-lg border border-slate-100">Esta clínica aún no tiene reseñas.</p>
            ) : (
              reviews.map((review, idx) => (
                <div key={idx} className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-bold text-slate-700">{review.doctor?.full_name || 'Médico Anónimo'}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-amber-400 text-xs">★</span>
                      <span className="text-xs font-bold text-slate-800">{review.rating}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-900 mb-2 leading-relaxed">"{review.comment || 'Sin comentario.'}"</p>
                  <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">
                    {format(new Date(review.created_at), 'MMM yyyy', { locale: es })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-3">
          <button onClick={onClose} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-6 py-3 rounded-xl font-bold transition-all shadow-sm">
            Cerrar
          </button>
          
          {hasApplied ? (
            <button onClick={() => { onWithdraw(shift.id); onClose(); }} disabled={loadingBtn === shift.id} className="flex-1 bg-orange-50 hover:bg-red-50 border border-orange-200 hover:border-red-200 text-orange-700 hover:text-red-600 rounded-xl font-bold shadow-sm transition-all">
              {loadingBtn === shift.id ? '...' : 'Postulado ✓ (Retirar)'}
            </button>
          ) : (
            <button onClick={() => { onApply(shift.id); onClose(); }} disabled={loadingBtn === shift.id} className="flex-1 bg-slate-900 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-xl font-bold shadow-md transition-all">
              {loadingBtn === shift.id ? 'Enviando...' : 'Postularme'}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}