'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      alert("Error: " + error.message)
      setLoading(false)
    } else {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
      
      if (profile?.role === 'clinic_admin') {
        router.push('/dashboard-clinica')
      } else {
        // PRECARGA OPTIMISTA PARA MÉDICOS: Bajamos la info antes de que cambie de página
        const [openRes, myRes] = await Promise.all([
          supabase.from('shifts').select('*, clinic:profiles!clinic_id(full_name)').eq('status', 'open').order('date_time', { ascending: true }),
          supabase.from('shifts').select('*, clinic:profiles!clinic_id(full_name)').eq('professional_id', data.user.id).eq('status', 'filled')
        ])
        
        // Guardamos las fotos en memoria
        if (openRes.data) sessionStorage.setItem('medico_feed_cache', JSON.stringify(openRes.data))
        
        const allCalendarShifts = [...(openRes.data || []), ...(myRes.data || [])]
        sessionStorage.setItem('medico_calendar_cache', JSON.stringify(allCalendarShifts))

        // Ahora sí lo mandamos al tablero
        router.push('/dashboard-medico')
      }
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-blue-50/30 p-6">
      <div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-xl border border-blue-100/80">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Iniciar Sesión</h1>
          <p className="text-slate-500 text-sm mt-2">Ingresa tus credenciales para acceder</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Email</label>
            <input type="email" placeholder="Ej: usuario@clinica.com" className="w-full px-4 py-3 bg-blue-50/20 text-slate-900 border border-blue-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-slate-700" onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Contraseña</label>
            <input type="password" placeholder="••••••••" className="w-full px-4 py-3 bg-blue-50/20 text-slate-900 border border-blue-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-slate-700" onChange={(e) => setPassword(e.target.value)} required />
          </div>
          
          <div className="pt-2">
            <button disabled={loading} className="w-full py-3.5 bg-slate-900 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-200 disabled:opacity-70">
              {loading ? 'Ingresando...' : 'Ingresar al Sistema'}
            </button>
          </div>

          <p className="text-center text-slate-500 text-sm mt-6">
            ¿No tenés cuenta? <Link href="/registro" className="text-blue-600 hover:underline font-semibold">Registrate acá</Link>
          </p>
        </form>
      </div>
    </main>
  )
}