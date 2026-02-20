'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Registro() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'doctor' | 'clinic_admin'>('doctor')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { 
          full_name: name,
          role: role 
        }
      }
    })
    setLoading(false)
    
    if (error) {
      alert(error.message)
    } else {
      alert('¡Cuenta creada con éxito! Por favor, iniciá sesión.')
      router.push('/login') // Vuelve a la página de login
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white p-6">
      <form onSubmit={handleSignUp} className="bg-slate-900 p-8 rounded-2xl border border-slate-800 w-full max-w-md shadow-2xl">
        <h2 className="text-3xl font-bold mb-2 text-blue-500 text-center">Unirse a Guardian</h2>
        <p className="text-slate-400 text-center mb-6 text-sm">Seleccioná tu tipo de perfil para comenzar</p>
        
        {/* Selector de Rol Profesional */}
        <div className="flex gap-2 mb-6 bg-slate-800 p-1 rounded-xl">
          <button 
            type="button"
            onClick={() => setRole('doctor')}
            className={`flex-1 py-2 rounded-lg font-bold transition-all ${role === 'doctor' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            Soy Médico
          </button>
          <button 
            type="button"
            onClick={() => setRole('clinic_admin')}
            className={`flex-1 py-2 rounded-lg font-bold transition-all ${role === 'clinic_admin' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            Soy Clínica
          </button>
        </div>

        <input type="text" placeholder={role === 'doctor' ? "Nombre Completo" : "Razón Social de la Clínica"} className="w-full p-3 mb-4 bg-slate-800 border border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all" onChange={(e) => setName(e.target.value)} required />
        <input type="email" placeholder="Email profesional" className="w-full p-3 mb-4 bg-slate-800 border border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all" onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Contraseña (mínimo 6 caracteres)" className="w-full p-3 mb-6 bg-slate-800 border border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all" onChange={(e) => setPassword(e.target.value)} required />
        
        <button disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 rounded-xl font-bold transition-all mb-4">
          {loading ? 'Creando cuenta...' : 'Crear mi cuenta'}
        </button>

        <p className="text-center text-slate-400 text-sm">
          ¿Ya tenés cuenta? <Link href="/login" className="text-blue-400 hover:underline font-bold">Iniciá sesión acá</Link>
        </p>
      </form>
    </main>
  )
}