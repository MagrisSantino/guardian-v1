'use client'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import PublicarModal from './PublicarModal'
import { LogOut, Bell, ShieldPlus } from 'lucide-react' // <-- Sumamos el ícono ShieldPlus

export default function Navbar() {
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  
  const router = useRouter()
  const pathname = usePathname()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(n => !n.is_read).length

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      if (session?.user) {
        const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
        setRole(data?.role)
        fetchNotifications(session.user.id)
      }
    }
    checkUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      if (session?.user) {
        supabase.from('profiles').select('role').eq('id', session.user.id).single().then(({data}) => setRole(data?.role))
        fetchNotifications(session.user.id)
      } else {
        setRole(null)
        setNotifications([])
      }
    })

    const handleClickOutside = (e: any) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowNotifications(false)
    }
    document.addEventListener('mousedown', handleClickOutside)

    return () => { 
      authListener.subscription.unsubscribe() 
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  async function fetchNotifications(userId: string) {
    const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10)
    if (data) setNotifications(data)
  }

  async function handleMarkAsRead() {
    if (unreadCount === 0) return;
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', session.user.id).eq('is_read', false)
    setNotifications(notifications.map(n => ({ ...n, is_read: true })))
  }

  const toggleNotifications = async () => {
    if (!showNotifications && user) await fetchNotifications(user.id) 
    setShowNotifications(!showNotifications)
    if (showNotifications) handleMarkAsRead() 
  }

  const handleNotificationClick = async (notif: any) => {
    setShowNotifications(false);
    
    if (!notif.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id)
      setNotifications(notifications.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
    }

    if (notif.shift_id) {
      if (role === 'doctor') {
        router.push(`/calendario-medico?shiftId=${notif.shift_id}`)
      } else if (role === 'clinic_admin') {
        router.push(`/dashboard-clinica?shiftId=${notif.shift_id}`)
      }
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // --- COMPONENTE DE LOGO REUTILIZABLE ---
  const BrandLogo = () => (
    <div className="flex items-center gap-2.5 group">
      <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-1.5 rounded-lg shadow-md group-hover:scale-105 group-hover:shadow-blue-500/20 transition-all duration-300">
        <ShieldPlus className="w-5 h-5 text-white" strokeWidth={2.5} />
      </div>
      <span className="text-xl font-black tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
        Guardian
      </span>
    </div>
  )

  if (pathname === '/login' || pathname === '/registro') {
    return (
      <nav className="flex justify-between items-center px-8 py-5 bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <Link href="/" className="focus:outline-none"><BrandLogo /></Link>
        <Link href="/" className="text-slate-400 hover:text-white font-medium text-sm transition-colors">← Volver</Link>
      </nav>
    )
  }

  return (
    <>
      <nav className="flex justify-between items-center px-6 md:px-8 py-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-xl">
        <Link href="/" className="focus:outline-none"><BrandLogo /></Link>
        
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
                  <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm hidden md:block transition-all shadow-blue-900/20">+ Crear Guardia</button>
                  <Link href="/dashboard-clinica" className={`font-medium text-sm md:text-base transition-colors ${pathname === '/dashboard-clinica' ? 'text-white' : 'text-slate-400 hover:text-white'}`}>Panel</Link>
                </>
              )}
              {role === 'doctor' && (
                <>
                  <Link href="/dashboard-medico" className={`font-medium text-sm md:text-base transition-colors ${pathname === '/dashboard-medico' ? 'text-white' : 'text-slate-400 hover:text-white'}`}>Explorar</Link>
                  <Link href="/calendario-medico" className={`font-medium text-sm md:text-base transition-colors ${pathname === '/calendario-medico' ? 'text-white' : 'text-slate-400 hover:text-white'}`}>Mi Agenda</Link>
                </>
              )}
              
              <Link href="/perfil" className={`font-medium text-sm md:text-base transition-colors hidden md:block ${pathname === '/perfil' ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`}>Mi Perfil</Link>

              <div className="w-px h-6 bg-slate-700 hidden md:block"></div>
              
              <div className="relative" ref={dropdownRef}>
                <button onClick={toggleNotifications} className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-800 focus:outline-none">
                  <Bell className="h-6 w-6" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1.5 h-3.5 w-3.5 bg-red-500 rounded-full border-2 border-slate-900 shadow-sm"></span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                      <h3 className="text-sm font-bold text-slate-900">Notificaciones</h3>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="text-center text-sm text-slate-500 py-6">No tenés notificaciones nuevas.</p>
                      ) : (
                        notifications.map((notif) => (
                          <div 
                            key={notif.id} 
                            onClick={() => handleNotificationClick(notif)} 
                            className={`px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer ${notif.is_read ? 'opacity-75' : 'bg-blue-50/30'}`}
                          >
                            <p className="text-xs font-bold text-slate-900 mb-0.5">{notif.title}</p>
                            <p className="text-xs text-slate-600 leading-snug">{notif.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <button onClick={handleLogout} className="flex items-center justify-center px-3 py-2 text-sm font-medium text-red-400 bg-slate-950/50 border border-slate-800 rounded-lg hover:bg-red-500/10 hover:text-red-300 transition-colors">
                <LogOut className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Salir</span>
              </button>
            </>
          )}
        </div>
      </nav>

      {isModalOpen && <PublicarModal onClose={() => setIsModalOpen(false)} onRefresh={() => window.dispatchEvent(new Event('refresh-shifts'))} />}
    </>
  )
}