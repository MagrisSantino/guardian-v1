'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AlertCircle, X } from 'lucide-react'

export default function PublicarModal({ onClose, onRefresh }: any) {
  const [title, setTitle] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [dateTime, setDateTime] = useState('')
  const [price, setPrice] = useState('')
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isVerified) return; // Doble barrera
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    
    const { error } = await supabase.from('shifts').insert([{
      clinic_id: session?.user.id,
      title,
      specialty_required: specialty,
      date_time: dateTime,
      price: parseFloat(price),
      status: 'open'
    }])

    setLoading(false)
    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('Guardia publicada exitosamente')
      onRefresh()
      onClose()
    }
  }

  if (checkingAuth) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-blue-500"></div>
      </div>
    )
  }

  // SI NO ESTÁ VERIFICADA, MOSTRAMOS PANTALLA DE BLOQUEO EN VEZ DEL FORMULARIO
  if (!isVerified) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
        <div className="bg-white p-8 rounded-3xl w-full max-w-md text-center shadow-2xl relative">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-slate-900 mb-2">Clínica en Revisión</h2>
          <p className="text-slate-600 mb-8 font-medium leading-relaxed">Por motivos de seguridad legal, tu institución debe ser verificada por el equipo de Guardian antes de poder publicar guardias en la red.</p>
          <button onClick={onClose} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold transition-all">Entendido</button>
        </div>
      </div>
    )
  }

  // SI ESTÁ VERIFICADA, MOSTRAMOS EL FORMULARIO NORMAL
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-blue-400"></div>
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-slate-900">Publicar Guardia</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full p-2 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Título de la Guardia</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Ej: Guardia 24hs Pediatría" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-semibold text-slate-900" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Especialidad Requerida</label>
            <input type="text" value={specialty} onChange={e => setSpecialty(e.target.value)} required placeholder="Ej: Pediatría" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-semibold text-slate-900" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Fecha y Hora</label>
              <input type="datetime-local" value={dateTime} onChange={e => setDateTime(e.target.value)} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-semibold text-slate-900" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Pago Ofrecido ($)</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} required min="0" placeholder="Ej: 150000" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-semibold text-slate-900" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full mt-4 bg-slate-900 hover:bg-blue-700 text-white py-4 rounded-xl font-black transition-all shadow-xl hover:shadow-blue-900/20 hover:-translate-y-0.5">
            {loading ? 'Publicando...' : 'Publicar Guardia'}
          </button>
        </form>
      </div>
    </div>
  )
}