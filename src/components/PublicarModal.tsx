'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

export default function PublicarModal({ onClose, onRefresh, selectedDate, shiftToEdit }: any) {
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [dateTime, setDateTime] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (shiftToEdit) {
      setTitle(shiftToEdit.title)
      setPrice(shiftToEdit.price.toString())
      setSpecialty(shiftToEdit.specialty_required)
      setDateTime(format(new Date(shiftToEdit.date_time), "yyyy-MM-dd'T'HH:mm"))
    } else if (selectedDate) {
      setDateTime(format(selectedDate, "yyyy-MM-dd'T'12:00"))
    }
  }, [shiftToEdit, selectedDate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    
    if (shiftToEdit) {
      await supabase.from('shifts').update({ title, price: Number(price), specialty_required: specialty, date_time: new Date(dateTime).toISOString() }).eq('id', shiftToEdit.id)
    } else {
      await supabase.from('shifts').insert([{ title, price: Number(price), specialty_required: specialty, clinic_id: session?.user.id, date_time: new Date(dateTime).toISOString(), duration_hours: 12, status: 'open' }])
    }
    
    setLoading(false)
    if (onRefresh) onRefresh()
    onClose()
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar esta guardia? Esta acción no se puede deshacer.')) return
    setLoading(true)
    await supabase.from('shifts').delete().eq('id', shiftToEdit.id)
    setLoading(false)
    if (onRefresh) onRefresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-slate-200 p-8 rounded-2xl w-full max-w-md shadow-xl">
        <h2 className="text-xl font-bold mb-6 text-slate-900">
          {shiftToEdit ? 'Editar Guardia' : 'Publicar Nueva Guardia'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Título</label>
            <input type="text" value={title} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-slate-700" onChange={e => setTitle(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Especialidad</label>
            <input type="text" value={specialty} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-slate-700" onChange={e => setSpecialty(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Monto ($)</label>
            <input type="number" value={price} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-slate-700" onChange={e => setPrice(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Fecha y Hora</label>
            <input type="datetime-local" value={dateTime} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-slate-700" onChange={e => setDateTime(e.target.value)} required />
          </div>

          <div className="flex gap-3 mt-8 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-xl font-medium transition-all shadow-sm">Cancelar</button>
            {shiftToEdit && <button type="button" onClick={handleDelete} className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2.5 rounded-xl font-medium transition-all">Eliminar</button>}
            <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm transition-all">{loading ? '...' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}