'use client'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import PublicarModal from './PublicarModal'
import { LogOut } from 'lucide-react' 

export default function Navbar() {
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      if (session?.user) {
        const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
        setRole(data?.role)
      }
    }
    checkUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      if (session?.user) {
        supabase.from('profiles').select('role').eq('id', session.user.id).single().then(({data}) => {
          setRole(data?.role)
        })
      } else {
        setRole(null)
      }
    })
    return () => { authListener.subscription.unsubscribe() }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (pathname === '/login' || pathname === '/registro') {
    return (
      <nav className="flex justify-between items-center px-8 py-5 bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <Link href="/" className="text-2xl font-bold tracking-wider text-blue-400">CONFORTO S.R.L.</Link>
        <Link href="/" className="text-slate-400 hover:text-white font-medium text-sm transition-colors">← Volver</Link>
      </nav>
    )
  }

  return (
    <>
      <nav className="flex justify-between items-center px-6 md:px-8 py-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-xl">
        <Link href="/" className="text-2xl font-bold tracking-wider text-blue-400 hover:text-blue-300 transition-colors">
          GUARDIAN
        </Link>
        
        <div className="flex gap-4 md:gap-6 items-center">
          {!user ? (
            <>
              <Link href="/login" className="text-slate-400 hover:text-white font-medium text-sm md:text-base transition-colors">Ingresar</Link>
              <Link href="/registro" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-all text-sm md:text-base">Crear Cuenta</Link>
            </>
          ) : (
            <>
              {role === 'clinic_admin' && (
                <>
                  <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm hidden md:block transition-all shadow-blue-900/20">
                    + Crear Guardia
                  </button>
                  <Link href="/dashboard-clinica" className={`font-medium text-sm md:text-base transition-colors ${pathname === '/dashboard-clinica' ? 'text-white' : 'text-slate-400 hover:text-white'}`}>Panel</Link>
                </>
              )}

              {role === 'doctor' && (
                <>
                  <Link href="/dashboard-medico" className={`font-medium text-sm md:text-base transition-colors ${pathname === '/dashboard-medico' ? 'text-white' : 'text-slate-400 hover:text-white'}`}>
                    Explorar
                  </Link>
                  <Link href="/calendario-medico" className={`font-medium text-sm md:text-base transition-colors ${pathname === '/calendario-medico' ? 'text-white' : 'text-slate-400 hover:text-white'}`}>
                    Mi Agenda
                  </Link>
                </>
              )}
              
              {/* --- NUEVO BOTÓN DE PERFIL PARA AMBOS ROLES --- */}
              <Link href="/perfil" className={`font-medium text-sm md:text-base transition-colors ${pathname === '/perfil' ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`}>
                Mi Perfil
              </Link>

              <div className="w-px h-6 bg-slate-700 hidden md:block"></div>
              
              <button 
                onClick={handleLogout} 
                className="flex items-center justify-center px-4 py-2 text-sm font-medium text-red-400 bg-slate-950/50 border border-slate-800 rounded-lg hover:bg-red-500/10 hover:text-red-300 transition-colors"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Salir
              </button>
            </>
          )}
        </div>
      </nav>

      {isModalOpen && (
        <PublicarModal 
          onClose={() => setIsModalOpen(false)} 
          onRefresh={() => window.dispatchEvent(new Event('refresh-shifts'))} 
        />
      )}
    </>
  )
}