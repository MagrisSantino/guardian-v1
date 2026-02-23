'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Registro() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [dni, setDni] = useState('')
  const [matricula, setMatricula] = useState('')
  const [specialty, setSpecialty] = useState('')
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
          role: role,
          dni: role === 'doctor' ? dni : null,
          matricula: role === 'doctor' ? matricula : null,
          specialty: role === 'doctor' ? specialty : null
        } 
      } 
    })
    
    setLoading(false)
    if (error) alert(error.message)
    else {
      alert('¡Cuenta creada con éxito! Por favor, iniciá sesión.')
      router.push('/login')
    }
  }

  return (
    <main 
      className="flex min-h-screen flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(248, 250, 252, 0.2), rgba(248, 250, 252, 0.4)), url(https://images.unsplash.com/photo-1516549655169-df83a0774514)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="relative z-10 w-full max-w-md bg-white/40 backdrop-blur-md p-8 md:p-10 rounded-[2.5rem] border border-white/50 shadow-2xl my-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 drop-shadow-sm">Crear Cuenta</h1>
          <p className="text-slate-800 font-semibold text-sm mt-2 drop-shadow-sm">Seleccioná tu perfil para comenzar</p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="flex gap-2 bg-white/50 p-1.5 rounded-xl border border-white/60 backdrop-blur-sm shadow-sm mb-2">
            <button type="button" onClick={() => setRole('doctor')} className={`flex-1 py-2.5 rounded-lg font-bold transition-all text-sm ${role === 'doctor' ? 'bg-white text-blue-700 shadow-sm border border-white' : 'text-slate-800 hover:bg-white/50'}`}>
              Soy Médico
            </button>
            <button type="button" onClick={() => setRole('clinic_admin')} className={`flex-1 py-2.5 rounded-lg font-bold transition-all text-sm ${role === 'clinic_admin' ? 'bg-white text-blue-700 shadow-sm border border-white' : 'text-slate-800 hover:bg-white/50'}`}>
              Soy Clínica
            </button>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-900 mb-1.5 ml-1 drop-shadow-sm">{role === 'doctor' ? "Nombre Completo" : "Razón Social"}</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-semibold text-slate-900 shadow-sm" 
              onChange={(e) => setName(e.target.value)} 
              required 
            />
          </div>

          {role === 'doctor' && (
            <>
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-1.5 ml-1 drop-shadow-sm">DNI</label>
                <input 
                  type="text" 
                  placeholder="Sin puntos ni espacios"
                  className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-semibold text-slate-900 placeholder:text-slate-500 shadow-sm text-sm" 
                  onChange={(e) => setDni(e.target.value)} 
                  required 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-1.5 ml-1 drop-shadow-sm">Matrícula</label>
                  <input 
                    type="text" 
                    placeholder="Ej: MP 1234"
                    className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-semibold text-slate-900 placeholder:text-slate-500 shadow-sm text-sm" 
                    onChange={(e) => setMatricula(e.target.value)} 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-1.5 ml-1 drop-shadow-sm">Especialidad</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Pediatría"
                    className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-semibold text-slate-900 placeholder:text-slate-500 shadow-sm text-sm" 
                    onChange={(e) => setSpecialty(e.target.value)} 
                    required 
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-900 mb-1.5 ml-1 drop-shadow-sm">Email</label>
            <input 
              type="email" 
              className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-semibold text-slate-900 shadow-sm" 
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
          
          <div className="pt-4">
            <button disabled={loading} className="w-full py-3.5 bg-slate-900 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-xl hover:shadow-blue-900/20 disabled:opacity-70">
              {loading ? 'Creando cuenta...' : 'Crear mi cuenta'}
            </button>
          </div>

          <p className="text-center text-slate-800 font-semibold text-sm mt-6 drop-shadow-sm">
            ¿Ya tenés cuenta? <Link href="/login" className="text-blue-800 hover:text-blue-900 hover:underline font-black">Iniciá sesión acá</Link>
          </p>
        </form>
      </div>
    </main>
  )
}