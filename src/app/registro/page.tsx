'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Registro() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'doctor' | 'clinic_admin'>('doctor') // Rol por defecto
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { 
          full_name: name,
          role: role // Guardamos el rol en la metadata
        }
      }
    })
    if (error) alert(error.message)
    else {
      alert('¡Cuenta creada! Confirmá tu email.')
      router.push('/login')
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white p-6">
      <form onSubmit={handleSignUp} className="bg-slate-900 p-8 rounded-2xl border border-slate-800 w-full max-w-md">
        <h2 className="text-3xl font-bold mb-6 text-blue-500">Unirse a Guardian</h2>
        
        {/* Selector de Rol Profesional */}
        <div className="flex gap-2 mb-6 bg-slate-800 p-1 rounded-xl">
          <button 
            type="button"
            onClick={() => setRole('doctor')}
            className={`flex-1 py-2 rounded-lg font-medium transition-all ${role === 'doctor' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
          >
            Soy Médico
          </button>
          <button 
            type="button"
            onClick={() => setRole('clinic_admin')}
            className={`flex-1 py-2 rounded-lg font-medium transition-all ${role === 'clinic_admin' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
          >
            Soy Clínica
          </button>
        </div>

        <input type="text" placeholder="Nombre o Razón Social" className="w-full p-3 mb-4 bg-slate-800 rounded-lg outline-none" onChange={(e) => setName(e.target.value)} required />
        <input type="email" placeholder="Email institucional/profesional" className="w-full p-3 mb-4 bg-slate-800 rounded-lg outline-none" onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Contraseña" className="w-full p-3 mb-6 bg-slate-800 rounded-lg outline-none" onChange={(e) => setPassword(e.target.value)} required />
        
        <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-all">
          Crear cuenta como {role === 'doctor' ? 'Médico' : 'Clínica'}
        </button>
      </form>
    </main>
  )
}