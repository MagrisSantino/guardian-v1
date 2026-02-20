'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function PublicarModal({ onClose, onRefresh }: any) {
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [specialty, setSpecialty] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const { data: { session } } = await supabase.auth.getSession()
    
    await supabase.from('shifts').insert([{
      title,
      price: Number(price),
      specialty_required: specialty,
      clinic_id: session?.user.id,
      date_time: new Date().toISOString(),
      duration_hours: 12
    }])
    
    onRefresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6">Nueva Guardia</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Título" className="w-full p-3 bg-slate-800 rounded-lg outline-none" onChange={e => setTitle(e.target.value)} required />
          <input type="text" placeholder="Especialidad" className="w-full p-3 bg-slate-800 rounded-lg outline-none" onChange={e => setSpecialty(e.target.value)} required />
          <input type="number" placeholder="Monto a pagar ($)" className="w-full p-3 bg-slate-800 rounded-lg outline-none" onChange={e => setPrice(e.target.value)} required />
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-800 rounded-lg">Cancelar</button>
            <button type="submit" className="flex-1 py-3 bg-blue-600 rounded-lg font-bold">Publicar</button>
          </div>
        </form>
      </div>
    </div>
  )
}