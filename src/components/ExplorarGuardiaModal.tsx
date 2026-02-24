'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { AlertCircle } from 'lucide-react'

export default function ExplorarGuardiaModal({ shift, onClose, onRefresh }: any) {
  const [loading, setLoading] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    async function checkVerification() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data } = await supabase.from('profiles').select('is_verified').eq('id', session.user.id).single()
        setIsVerified(data?.is_verified === true)
      }
      setCheckingAuth(false)
    }
    checkVerification()
  }, [])

  async function handleApply() {
    if (!isVerified) return; // Doble barrera de seguridad
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    
    await supabase.from('shift_applications').insert([{ 
      shift_id: shift.id, 
      professional_id: session?.user.id, 
      status: 'pending' 
    }])
    
    const targetClinicId = shift.clinic_id || shift.clinic?.id;
    if (targetClinicId) {
      await supabase.from('notifications').insert([{
        user_id: targetClinicId,
        shift_id: shift.id,
        title: '¡Nueva Postulación! 👨‍⚕️',
        message: `Un profesional se acaba de postular a tu guardia: ${shift.title}.`
      }])
    }

    alert('¡Postulación enviada exitosamente!')
    onRefresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 relative overflow-hidden">
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

        {checkingAuth ? (
          <div className="py-4 text-center text-slate-500 font-bold animate-pulse">Verificando credenciales...</div>
        ) : isVerified ? (
          <button onClick={handleApply} disabled={loading} className="w-full bg-slate-900 hover:bg-blue-700 text-white py-4 rounded-xl font-black text-lg transition-all shadow-xl hover:shadow-blue-900/20 hover:-translate-y-0.5">
            {loading ? 'Procesando...' : 'Postularme a esta Guardia'}
          </button>
        ) : (
          <div className="bg-red-50 border-2 border-red-100 rounded-xl p-4 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-700 font-bold text-sm leading-tight">Acción Bloqueada</p>
            <p className="text-red-600/80 text-xs font-semibold mt-1">Tu identidad médica aún no ha sido validada por Guardian. Completá tu perfil para poder postularte.</p>
          </div>
        )}

        <button onClick={onClose} className="w-full mt-4 text-slate-400 hover:text-slate-700 font-black text-sm py-2 transition-colors uppercase tracking-widest">Cerrar Ventana</button>
      </div>
    </div>
  )
}