'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function CalificarMedicoModal({ onClose, onRefresh, shift }: any) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [doctor, setDoctor] = useState<any>(null)

  useEffect(() => {
    fetchDoctor()
  }, [])

  async function fetchDoctor() {
    // Buscamos los datos del médico que cubrió esta guardia
    const { data } = await supabase
      .from('profiles')
      .select('full_name, is_verified')
      .eq('id', shift.professional_id)
      .single()
    if (data) setDoctor(data)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return;

    // 1. Insertamos la reseña en la tabla nueva
    const { error: reviewError } = await supabase.from('reviews').insert([{
      shift_id: shift.id,
      reviewer_id: session.user.id,
      reviewed_id: shift.professional_id,
      rating: rating,
      comment: comment
    }])

    if (reviewError) {
      alert('Error al calificar: ' + reviewError.message)
      setLoading(false)
      return;
    }

    // 2. Cambiamos el estado de la guardia a 'completed' para cerrar el ciclo
    await supabase.from('shifts').update({ status: 'completed' }).eq('id', shift.id)

    setLoading(false)
    alert('¡Calificación enviada! El perfil del profesional ha sido actualizado.')
    onRefresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-slate-200 p-8 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        <div className="text-center mb-6">
          <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-3 shadow-sm border border-blue-100">
            ⭐
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Calificar Guardia</h2>
          <p className="text-slate-500 text-sm mt-1">
            Evaluá el desempeño de <strong className="text-slate-700">{doctor?.full_name || 'este profesional'}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Selector de Estrellas Interactivo */}
          <div className="flex flex-col items-center justify-center space-y-2">
            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Puntuación</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`text-4xl transition-all hover:scale-110 focus:outline-none ${star <= rating ? 'text-amber-400 drop-shadow-sm' : 'text-slate-200 hover:text-amber-200'}`}
                >
                  ★
                </button>
              ))}
            </div>
            <span className="text-xs font-bold text-slate-500">
              {rating === 5 ? 'Excelente' : rating === 4 ? 'Muy Bueno' : rating === 3 ? 'Regular' : rating === 2 ? 'Malo' : 'Muy Malo'}
            </span>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Comentario (Opcional)</label>
            <textarea 
              value={comment} 
              onChange={e => setComment(e.target.value)} 
              placeholder="¿Cómo fue la experiencia? Ej: Llegó a horario y tuvo excelente trato." 
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-slate-700 resize-none" 
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-3 rounded-xl font-bold transition-all shadow-sm">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 bg-slate-900 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-bold shadow-md transition-all disabled:opacity-70">
              {loading ? 'Enviando...' : 'Finalizar y Calificar'}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}