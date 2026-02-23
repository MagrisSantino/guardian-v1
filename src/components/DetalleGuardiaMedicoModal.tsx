'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format, differenceInHours, parseISO } from 'date-fns'
import { AlertCircle } from 'lucide-react'

export default function DetalleGuardiaMedicoModal({ onClose, onRefresh, shift, userStatus }: any) {
  const [loading, setLoading] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [isCheckingSecurity, setIsCheckingSecurity] = useState(true)
  
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [hasRated, setHasRated] = useState(false)

  useEffect(() => {
    checkSecurity()
    if (userStatus === 'completada') checkExistingReview()
  }, [])

  // AL ENTRAR AL MODAL, CHEQUEAMOS SI EL MÉDICO ES LEGAL
  async function checkSecurity() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return;
    const { data } = await supabase.from('profiles').select('is_verified').eq('id', session.user.id).single()
    setIsVerified(data?.is_verified || false)
    setIsCheckingSecurity(false)
  }

  async function checkExistingReview() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return;
    const { data } = await supabase.from('reviews').select('id').eq('shift_id', shift.id).eq('reviewer_id', session.user.id).single()
    if (data) setHasRated(true)
  }

  async function handleApply() {
    if (!isVerified) {
      alert("Acceso denegado: Tu perfil aún no ha sido verificado por Guardian.")
      return;
    }

    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.from('shift_applications').insert([{ shift_id: shift.id, professional_id: session?.user.id, status: 'pending' }])
    
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
    
    await supabase.from('shifts').update({ status: 'open', professional_id: null }).eq('id', shift.id)
    await supabase.from('shift_applications').delete().eq('shift_id', shift.id).eq('professional_id', session?.user.id)
    
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative overflow-hidden">
        
        {/* Adorno superior estilo cristal */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-blue-400"></div>

        <div className="mb-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4 mb-3">
            <div className="h-14 w-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-3xl border border-blue-100 shadow-sm">🏥</div>
            <div>
              <h2 className="text-xl font-black text-slate-900 leading-tight">{shift.clinic?.full_name || 'Clínica'}</h2>
              <span className="inline-block mt-1 text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase tracking-widest">{shift.specialty_required}</span>
            </div>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mt-5 leading-snug">{shift.title}</h3>
          <div className="flex items-center justify-between mt-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <p className="text-slate-700 font-bold text-sm flex items-center gap-2">
              <span className="text-lg">📅</span> {format(new Date(shift.date_time), 'dd/MM/yyyy HH:mm')}hs
            </p>
            <p className="text-emerald-600 font-black text-xl">${(shift.price / 1000)}k</p>
          </div>
        </div>

        {isCheckingSecurity ? (
          <div className="py-4 text-center text-slate-500 font-bold animate-pulse">Verificando credenciales...</div>
        ) : (
          <>
            {userStatus === 'disponible' && (
              isVerified ? (
                <button onClick={handleApply} disabled={loading} className="w-full bg-slate-900 hover:bg-blue-700 text-white py-4 rounded-xl font-black text-lg transition-all shadow-xl hover:shadow-blue-900/20 hover:-translate-y-0.5">
                  {loading ? 'Procesando...' : 'Postularme a esta Guardia'}
                </button>
              ) : (
                <div className="bg-red-50 border-2 border-red-100 rounded-xl p-4 text-center">
                  <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                  <p className="text-red-700 font-bold text-sm leading-tight">Acción Bloqueada</p>
                  <p className="text-red-600/80 text-xs font-semibold mt-1">Tu identidad médica aún no ha sido validada (Falta Tilde Azul). Completá tu perfil para poder postularte.</p>
                </div>
              )
            )}
          </>
        )}

        {/* Mismos botones que tenías para los otros estados (Postulado, Confirmado, Finalizado) */}
        {userStatus === 'postulado' && (
          <div className="text-center">
            <p className="text-orange-600 font-bold mb-4 bg-orange-50 py-3 rounded-xl border border-orange-100">⏳ Postulación en revisión</p>
            <button onClick={handleWithdraw} disabled={loading} className="w-full bg-white border-2 border-slate-200 hover:border-red-200 text-slate-600 hover:text-red-600 py-3 rounded-xl font-bold transition-all">
              {loading ? '...' : 'Retirar Postulación'}
            </button>
          </div>
        )}

        {userStatus === 'confirmado' && (
          <div className="text-center">
            <p className="text-emerald-600 font-bold mb-4 bg-emerald-50 py-3 rounded-xl border border-emerald-100 shadow-inner">✅ Guardia Asignada Confirmada</p>
            <button onClick={handleCancelShift} disabled={loading} className="w-full bg-red-50 hover:bg-red-600 text-red-600 hover:text-white py-3 rounded-xl font-bold transition-all border border-red-200 hover:border-transparent">
              {loading ? '...' : 'Cancelar mi asistencia (Aviso)'}
            </button>
          </div>
        )}

        {userStatus === 'completada' && (
          <div>
            <p className="text-slate-500 font-bold mb-4 bg-slate-100 py-3 rounded-xl border border-slate-200 text-center uppercase tracking-wider text-sm">🏁 Guardia Finalizada</p>
            {hasRated ? (
              <p className="text-center text-sm font-black text-emerald-600 mt-4 bg-emerald-50 py-2 rounded-lg">⭐ Ya calificaste a esta clínica.</p>
            ) : (
              <form onSubmit={handleRateClinic} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 mt-4">
                <p className="text-sm font-bold text-slate-800 text-center mb-3">Calificá a la Clínica</p>
                <div className="flex justify-center gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" onClick={() => setRating(star)} className={`text-3xl transition-all hover:scale-125 ${star <= rating ? 'text-amber-400 drop-shadow-md' : 'text-slate-300'}`}>★</button>
                  ))}
                </div>
                <textarea 
                  value={comment} 
                  onChange={e => setComment(e.target.value)} 
                  placeholder="¿Te pagaron a tiempo? ¿Buen trato?" 
                  rows={2} 
                  className="w-full px-4 py-3 text-sm bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 mb-4 resize-none text-slate-900 font-semibold placeholder:font-medium placeholder:text-slate-400 shadow-sm" 
                />
                <button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-colors">Enviar Evaluación</button>
              </form>
            )}
          </div>
        )}

        <button onClick={onClose} className="w-full mt-4 text-slate-400 hover:text-slate-700 font-black text-sm py-2 transition-colors uppercase tracking-widest">Cerrar Ventana</button>
      </div>
    </div>
  )
}