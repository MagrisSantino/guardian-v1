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
        const [openRes, myRes] = await Promise.all([
          supabase.from('shifts').select('*, clinic:profiles!clinic_id(full_name)').eq('status', 'open').order('date_time', { ascending: true }),
          supabase.from('shifts').select('*, clinic:profiles!clinic_id(full_name)').eq('professional_id', data.user.id).eq('status', 'filled')
        ])
        
        if (openRes.data) sessionStorage.setItem('medico_feed_cache', JSON.stringify(openRes.data))
        
        const allCalendarShifts = [...(openRes.data || []), ...(myRes.data || [])]
        sessionStorage.setItem('medico_calendar_cache', JSON.stringify(allCalendarShifts))

        router.push('/dashboard-medico')
      }
    }
  }

  return (
    <main 
      className="flex min-h-screen flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{
        /* SIN COMILLAS en la url() para evitar el bug de Next.js, y usando la imagen que YA FUNCIONA en tu inicio */
        backgroundImage: `linear-gradient(to bottom, rgba(248, 250, 252, 0.2), rgba(248, 250, 252, 0.4)), url(https://images.unsplash.com/photo-1516549655169-df83a0774514)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* EL RECUADRO DE CRISTAL EXACTO AL DEL INICIO */}
      <div className="relative z-10 w-full max-w-md bg-white/40 backdrop-blur-md p-8 md:p-10 rounded-[2.5rem] border border-white/50 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 drop-shadow-sm">Iniciar Sesión</h1>
          <p className="text-slate-800 font-semibold text-sm mt-2 drop-shadow-sm">Ingresá tus credenciales para acceder</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-1.5 ml-1 drop-shadow-sm">Email</label>
            <input 
              type="email" 
              placeholder="Ej: usuario@clinica.com" 
              className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-semibold text-slate-900 placeholder:text-slate-600 shadow-sm" 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-900 mb-1.5 ml-1 drop-shadow-sm">Contraseña</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-semibold text-slate-900 placeholder:text-slate-600 shadow-sm" 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          
          <div className="pt-2">
            <button disabled={loading} className="w-full py-3.5 bg-slate-900 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-xl hover:shadow-blue-900/20 disabled:opacity-70">
              {loading ? 'Ingresando...' : 'Ingresar al Sistema'}
            </button>
          </div>

          <p className="text-center text-slate-800 font-semibold text-sm mt-6 drop-shadow-sm">
            ¿No tenés cuenta? <Link href="/registro" className="text-blue-800 hover:text-blue-900 hover:underline font-black">Registrate acá</Link>
          </p>
        </form>
      </div>
    </main>
  )
}