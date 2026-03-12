'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarDays, CheckCircle2 } from 'lucide-react'
import DetalleGuardiaMedicoModal from '@/components/DetalleGuardiaMedicoModal'

export default function MisGuardiasPage() {
  const [myGuardias, setMyGuardias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedShift, setSelectedShift] = useState<any | null>(null)
  const [selectedUserStatus, setSelectedUserStatus] = useState<'confirmado' | 'completada' | ''>('')
  const router = useRouter()

  async function fetchMyGuardias() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
    if (profile?.role !== 'doctor') {
      router.push('/dashboard-medico')
      return
    }
    const { data } = await supabase
      .from('shifts')
      .select('*, clinic:profiles!clinic_id(full_name)')
      .eq('professional_id', session.user.id)
      .in('status', ['filled', 'completed'])
      .order('date_time', { ascending: true })
    setMyGuardias(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchMyGuardias()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const guardiasPorHacer = myGuardias.filter(s => s.status === 'filled')
  const guardiasTerminadas = myGuardias.filter(s => s.status === 'completed')
  const dineroGanado = guardiasTerminadas.reduce((sum, s) => sum + (Number(s.price) || 0), 0)

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-73px)] bg-slate-50 p-6 md:p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900" />
      </main>
    )
  }

  return (
    <main className="min-h-[calc(100vh-73px)] bg-slate-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-slate-900">Mis guardias</h1>
            <p className="text-slate-500 text-base">Guardias que ya agendaste y las que terminaste.</p>
          </div>
          <Link href="/calendario-medico" className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            Ver en calendario
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Por hacer</p>
            <p className="text-2xl font-bold text-amber-600">{guardiasPorHacer.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Terminadas</p>
            <p className="text-2xl font-bold text-emerald-600">{guardiasTerminadas.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Dinero ganado</p>
            <p className="text-2xl font-bold text-slate-900">${dineroGanado.toLocaleString()}</p>
          </div>
        </div>

        {myGuardias.length > 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <ul className="divide-y divide-slate-100">
              {myGuardias.map((g) => {
                const d = parseISO(g.date_time)
                const isCompleted = g.status === 'completed'
                return (
                  <li
                    key={g.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-slate-50/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedShift(g)
                      setSelectedUserStatus(isCompleted ? 'completada' : 'confirmado')
                    }}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{g.title}</p>
                      <p className="text-sm text-slate-500">{g.clinic?.full_name || 'Prestador'}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {format(d, "EEEE d MMM", { locale: es })} · {format(d, 'HH:mm')}hs
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                          isCompleted ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isCompleted ? 'Terminada' : 'Por hacer'}
                      </span>
                      <span className="text-sm font-bold text-emerald-600">
                        ${Number(g.price).toLocaleString()}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 font-medium">Aún no tenés guardias agendadas ni terminadas.</p>
            <p className="text-sm text-slate-400 mt-1">Postulate a ofertas desde el Panel y cuando te asignen aparecerán acá.</p>
            <Link href="/dashboard-medico" className="inline-block mt-4 text-blue-600 font-semibold hover:text-blue-700">
              Ir al Panel
            </Link>
          </div>
        )}
      </div>

      {selectedShift && (
        <DetalleGuardiaMedicoModal
          shift={selectedShift}
          userStatus={selectedUserStatus}
          hasOverlap={false}
          onClose={() => setSelectedShift(null)}
          onRefresh={fetchMyGuardias}
        />
      )}
    </main>
  )
}

