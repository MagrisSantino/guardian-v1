'use client'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import PublicarModal from './PublicarModal'

export default function Navbar() {
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false) // Control del modal
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
      <nav className="flex justify-between items-center px-8 py-5 bg-slate-950 text-white sticky top-0 z-50">
        <Link href="/" className="text-2xl font-bold text-blue-500 tracking-tight">Guardian</Link>
        <Link href="/" className="text-slate-400 hover:text-white font-medium text-sm">← Volver</Link>
      </nav>
    )
  }

  const dashboardLink = role === 'clinic_admin' ? '/dashboard-clinica' : '/dashboard-medico'

  return (
    <>
      <nav className="flex justify-between items-center px-8 py-4 bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40">
        <Link href="/" className="text-2xl font-bold text-blue-500 tracking-tight hover:opacity-80">
          Guardian
        </Link>
        
        <div className="flex gap-4 items-center">
          {!user ? (
            <>
              <Link href="/login" className="text-slate-300 hover:text-white font-medium">Ingresar</Link>
              <Link href="/registro" className="bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-xl font-bold">Crear Cuenta</Link>
            </>
          ) : (
            <>
              {/* Botón exclusivo para clínicas en el Navbar */}
              {role === 'clinic_admin' && (
                <button 
                  onClick={() => setIsModalOpen(true)} 
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm mr-2 shadow-lg shadow-green-900/20"
                >
                  + Crear Guardia
                </button>
              )}
              
              <Link href="/perfil" className="text-slate-300 hover:text-white font-medium hidden md:block">Mi Perfil</Link>
              <Link href={dashboardLink} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-lg font-bold">
                Mi Panel
              </Link>
              <button onClick={handleLogout} className="text-red-400 hover:text-red-300 font-bold ml-2">Salir</button>
            </>
          )}
        </div>
      </nav>

      {/* El Modal vive acá y dispara un evento global cuando termina para avisarle al calendario que se recargue */}
      {isModalOpen && (
        <PublicarModal 
          onClose={() => setIsModalOpen(false)} 
          onRefresh={() => window.dispatchEvent(new Event('refresh-shifts'))} 
        />
      )}
    </>
  )
}