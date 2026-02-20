'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      alert(error.message)
    } else {
      // Buscamos el rol del usuario para saber a dónde mandarlo
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profile?.role === 'clinic_admin') {
        router.push('/dashboard-clinica')
      } else {
        router.push('/dashboard-medico')
      }
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white p-6">
      <form onSubmit={handleLogin} className="bg-slate-900 p-8 rounded-2xl border border-slate-800 w-full max-w-md">
        <h2 className="text-3xl font-bold mb-6 text-blue-500 text-center">Ingresar a Guardian</h2>
        <input type="email" placeholder="Email" className="w-full p-3 mb-4 bg-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Contraseña" className="w-full p-3 mb-6 bg-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" onChange={(e) => setPassword(e.target.value)} />
        <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-all">Entrar</button>
      </form>
    </main>
  )
}