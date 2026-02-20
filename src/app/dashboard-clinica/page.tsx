'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import PublicarModal from '@/components/PublicarModal' // Lo crearemos ahora

export default function DashboardClinica() {
  const [myShifts, setMyShifts] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    fetchMyShifts()
  }, [])

  async function fetchMyShifts() {
    const { data: { session } } = await supabase.auth.getSession()
    const { data } = await supabase
      .from('shifts')
      .select('*')
      .eq('clinic_id', session?.user.id)
    if (data) setMyShifts(data)
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Panel de Control Sanatorio</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-bold transition-all"
        >
          + Publicar Nueva Guardia
        </button>
      </div>

      <div className="grid gap-4">
        {myShifts.map(shift => (
          <div key={shift.id} className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold">{shift.title}</h3>
              <p className="text-slate-400">{shift.specialty_required} | ${shift.price}</p>
            </div>
            <div className="flex gap-3">
              <span className="bg-blue-900/30 text-blue-400 px-3 py-1 rounded-full text-sm">3 Postulantes</span>
              <button className="text-slate-300 hover:text-white underline">Ver detalles</button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && <PublicarModal onClose={() => setIsModalOpen(false)} onRefresh={fetchMyShifts} />}
    </main>
  )
}