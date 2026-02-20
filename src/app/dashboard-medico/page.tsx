'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function DashboardMedico() {
  const [shifts, setShifts] = useState<any[]>([])

  useEffect(() => {
    const fetchShifts = async () => {
      const { data } = await supabase.from('shifts').select('*').eq('status', 'open')
      if (data) setShifts(data)
    }
    fetchShifts()
  }, [])

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Guardias Disponibles</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {shifts.map(shift => (
          <div key={shift.id} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 hover:border-blue-500 transition-all">
            <div className="flex justify-between items-start">
              <span className="bg-blue-900/40 text-blue-400 text-xs font-bold px-3 py-1 rounded-full uppercase">
                {shift.specialty_required}
              </span>
              <span className="text-2xl font-bold text-green-400">${shift.price}</span>
            </div>
            <h3 className="text-xl font-bold mt-4">{shift.title}</h3>
            <p className="text-slate-400 mt-2">{shift.description || 'Sin descripción adicional.'}</p>
            <button className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold transition-all">
              Postularme Ahora
            </button>
          </div>
        ))}
      </div>
    </main>
  )
}