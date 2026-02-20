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
      // Magia de ruteo: Buscamos el rol del usuario en la base de datos
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      // Redirección perfecta según quién sea
      if (profile?.role === 'clinic_admin') {
        router.push('/dashboard-clinica')
      } else {
        router.push('/dashboard-medico')
      }
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white p-6">
      <form onSubmit={handleLogin} className="bg-slate-900 p-8 rounded-2xl border border-slate-800 w-full max-w-md shadow-2xl">
        <h2 className="text-3xl font-bold mb-2 text-blue-500 text-center">Ingresar a Guardian</h2>
        <p className="text-slate-400 text-center mb-8 text-sm">Accedé a tu panel de control</p>
        
        <input type="email" placeholder="Email" className="w-full p-3 mb-4 bg-slate-800 border border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all" onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Contraseña" className="w-full p-3 mb-6 bg-slate-800 border border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all" onChange={(e) => setPassword(e.target.value)} required />
        
        <button disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 rounded-xl font-bold transition-all mb-4">
          {loading ? 'Ingresando...' : 'Entrar'}
        </button>

        <p className="text-center text-slate-400 text-sm">
          ¿No tenés cuenta? <Link href="/registro" className="text-blue-400 hover:underline font-bold">Registrate acá</Link>
        </p>
      </form>
    </main>
  )
}