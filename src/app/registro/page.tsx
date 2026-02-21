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
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name, role: role } } })
    setLoading(false)
    if (error) alert(error.message)
    else {
      alert('¡Cuenta creada con éxito! Por favor, iniciá sesión.')
      router.push('/login')
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-xl border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Crear Cuenta</h1>
          <p className="text-slate-500 text-sm mt-2">Seleccioná tu perfil para comenzar</p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-5">
          <div className="flex gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button type="button" onClick={() => setRole('doctor')} className={`flex-1 py-2.5 rounded-lg font-semibold transition-all text-sm ${role === 'doctor' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
              Soy Médico
            </button>
            <button type="button" onClick={() => setRole('clinic_admin')} className={`flex-1 py-2.5 rounded-lg font-semibold transition-all text-sm ${role === 'clinic_admin' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
              Soy Clínica
            </button>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">{role === 'doctor' ? "Nombre Completo" : "Razón Social"}</label>
            <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-slate-700" onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Email</label>
            <input type="email" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-slate-700" onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Contraseña</label>
            <input type="password" placeholder="••••••••" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-slate-700" onChange={(e) => setPassword(e.target.value)} required />
          </div>
          
          <div className="pt-2">
            <button disabled={loading} className="w-full py-3.5 bg-slate-900 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-200 disabled:opacity-70">
              {loading ? 'Creando cuenta...' : 'Crear mi cuenta'}
            </button>
          </div>

          <p className="text-center text-slate-500 text-sm mt-6">
            ¿Ya tenés cuenta? <Link href="/login" className="text-blue-600 hover:underline font-semibold">Iniciá sesión acá</Link>
          </p>
        </form>
      </div>
    </main>
  )
}