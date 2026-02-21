'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format, differenceInHours, parseISO } from 'date-fns'

export default function DetalleGuardiaMedicoModal({ onClose, onRefresh, shift, userStatus }: any) {
  const [loading, setLoading] = useState(false)
  
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [hasRated, setHasRated] = useState(false)

  useEffect(() => {
    if (userStatus === 'completada') checkExistingReview()
  }, [])

  async function checkExistingReview() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return;
    const { data } = await supabase.from('reviews').select('id').eq('shift_id', shift.id).eq('reviewer_id', session.user.id).single()
    if (data) setHasRated(true)
  }

  async function handleApply() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.from('shift_applications').insert([{ shift_id: shift.id, professional_id: session?.user.id, status: 'pending' }])
    
    // AVISO A LA CLÍNICA (Nueva postulación)
    const targetClinicId = shift.clinic_id || shift.clinic?.id;
    if (targetClinicId) {
      await supabase.from('notifications').insert([{
        user_id: targetClinicId,
        shift_id: shift.id,
        title: '¡Nueva Postulación! 👨‍⚕️',
        message: `Un profesional se acaba de postular a tu guardia: ${shift.title}.`
      }])
    }

    alert('¡Postulación enviada a la clínica!')
    onRefresh(); onClose();
  }

  async function handleWithdraw() {
    if (!confirm('¿Querés retirar tu postulación?')) return;
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.from('shift_applications').delete().eq('shift_id', shift.id).eq('professional_id', session?.user.id)
    alert('Postulación retirada.')
    onRefresh(); onClose();
  }

  async function handleCancelShift() {
    const hoursUntil = differenceInHours(parseISO(shift.date_time), new Date());
    let msg = `¿Dar de baja tu asistencia en ${shift.clinic?.full_name}?`
    if (hoursUntil <= 24 && hoursUntil > 0) msg = `⚠️ ALERTA: Faltan solo ${hoursUntil} horas. Cancelar ahora dejará a la clínica sin cobertura y afectará tu reputación. ¿Continuar?`;
    
    if (!confirm(msg)) return;
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    
    // 1. Liberamos la guardia y borramos la postulación
    await supabase.from('shifts').update({ status: 'open', professional_id: null }).eq('id', shift.id)
    await supabase.from('shift_applications').delete().eq('shift_id', shift.id).eq('professional_id', session?.user.id)
    
    // 2. AVISO DE EMERGENCIA A LA CLÍNICA
    const targetClinicId = shift.clinic_id || shift.clinic?.id;
    if (targetClinicId) {
      await supabase.from('notifications').insert([{
        user_id: targetClinicId,
        shift_id: shift.id,
        title: '¡Baja de Profesional! ⚠️',
        message: `El médico asignado se dio de baja. Tu guardia "${shift.title}" vuelve a estar abierta para postulaciones.`
      }])
    }

    alert('Guardia cancelada.')
    onRefresh(); onClose();
  }

  async function handleRateClinic(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    
    const { error } = await supabase.from('reviews').insert([{
      shift_id: shift.id,
      reviewer_id: session?.user.id,
      reviewed_id: shift.clinic_id,
      rating: rating,
      comment: comment
    }])

    if (error) alert('Error: ' + error.message)
    else { alert('¡Gracias por calificar a la clínica!'); onRefresh(); onClose(); }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="mb-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-2xl border border-blue-100">🏥</div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{shift.clinic?.full_name || 'Clínica'}</h2>
              <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase tracking-wider">{shift.specialty_required}</span>
            </div>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mt-4">{shift.title}</h3>
          <p className="text-slate-600 text-sm mt-1">📅 {format(new Date(shift.date_time), 'dd/MM/yyyy HH:mm')}hs</p>
          <p className="text-emerald-600 font-bold text-lg mt-2">${shift.price.toLocaleString()}</p>
        </div>

        {userStatus === 'disponible' && (
          <button onClick={handleApply} disabled={loading} className="w-full bg-slate-900 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold transition-all shadow-md">
            {loading ? 'Procesando...' : 'Postularme a esta Guardia'}
          </button>
        )}

        {userStatus === 'postulado' && (
          <div className="text-center">
            <p className="text-orange-600 font-bold mb-4 bg-orange-50 py-2 rounded-lg border border-orange-100">⏳ Postulación en revisión</p>
            <button onClick={handleWithdraw} disabled={loading} className="w-full bg-white border-2 border-slate-200 hover:border-red-200 text-slate-600 hover:text-red-600 py-3 rounded-xl font-bold transition-all">
              {loading ? '...' : 'Retirar Postulación'}
            </button>
          </div>
        )}

        {userStatus === 'confirmado' && (
          <div className="text-center">
            <p className="text-emerald-600 font-bold mb-4 bg-emerald-50 py-2 rounded-lg border border-emerald-100">✅ Guardia Asignada</p>
            <button onClick={handleCancelShift} disabled={loading} className="w-full bg-red-50 hover:bg-red-600 text-red-600 hover:text-white py-3 rounded-xl font-bold transition-all border border-red-200 hover:border-transparent">
              {loading ? '...' : 'Cancelar mi asistencia'}
            </button>
          </div>
        )}

        {userStatus === 'completada' && (
          <div>
            <p className="text-slate-500 font-bold mb-4 bg-slate-100 py-2 rounded-lg border border-slate-200 text-center">🏁 Guardia Finalizada</p>
            {hasRated ? (
              <p className="text-center text-sm font-bold text-emerald-600 mt-4">⭐ Ya calificaste a esta clínica.</p>
            ) : (
              <form onSubmit={handleRateClinic} className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4">
                <p className="text-sm font-bold text-slate-700 text-center mb-2">Calificá a la Clínica</p>
                <div className="flex justify-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" onClick={() => setRating(star)} className={`text-3xl transition-all hover:scale-110 ${star <= rating ? 'text-amber-400' : 'text-slate-300'}`}>★</button>
                  ))}
                </div>
                <textarea 
                  value={comment} 
                  onChange={e => setComment(e.target.value)} 
                  placeholder="¿Te pagaron a tiempo? ¿Buen trato?" 
                  rows={2} 
                  className="w-full px-4 py-3 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 mb-3 resize-none text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal" 
                />
                <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-bold">Enviar Calificación</button>
              </form>
            )}
          </div>
        )}

        <button onClick={onClose} className="w-full mt-4 text-slate-500 hover:text-slate-800 font-bold text-sm py-2">Cerrar</button>
      </div>
    </div>
  )
}