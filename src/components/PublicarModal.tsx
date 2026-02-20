'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function PublicarModal({ onClose, onRefresh }: any) {
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [dateTime, setDateTime] = useState('') // Nuevo estado para la fecha
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    
    await supabase.from('shifts').insert([{
      title,
      price: Number(price),
      specialty_required: specialty,
      clinic_id: session?.user.id,
      date_time: new Date(dateTime).toISOString(), // Guardamos la fecha elegida
      duration_hours: 12,
      status: 'open'
    }])
    
    setLoading(false)
    if (onRefresh) onRefresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-md shadow-2xl">
        <h2 className="text-2xl font-bold mb-6 text-white">Publicar Nueva Guardia</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Título (Ej: Guardia UTI)" className="w-full p-3 bg-slate-800 text-white border border-slate-700 rounded-xl outline-none focus:border-blue-500" onChange={e => setTitle(e.target.value)} required />
          <input type="text" placeholder="Especialidad (Ej: Pediatría)" className="w-full p-3 bg-slate-800 text-white border border-slate-700 rounded-xl outline-none focus:border-blue-500" onChange={e => setSpecialty(e.target.value)} required />
          <input type="number" placeholder="Monto a pagar ($)" className="w-full p-3 bg-slate-800 text-white border border-slate-700 rounded-xl outline-none focus:border-blue-500" onChange={e => setPrice(e.target.value)} required />
          
          {/* Selector de Fecha y Hora */}
          <div className="flex flex-col">
            <label className="text-sm text-slate-400 mb-1">Fecha y Hora de inicio</label>
            <input type="datetime-local" className="w-full p-3 bg-slate-800 text-white border border-slate-700 rounded-xl outline-none focus:border-blue-500" onChange={e => setDateTime(e.target.value)} required />
          </div>

          <div className="flex gap-3 mt-8">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-800 text-white hover:bg-slate-700 rounded-xl transition-all">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 py-3 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-800 rounded-xl font-bold transition-all">
              {loading ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}