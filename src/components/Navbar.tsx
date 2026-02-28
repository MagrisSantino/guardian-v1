'use client'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import PublicarModal from './PublicarModal'
import { LogOut, Bell, Shield, Menu, X, LayoutDashboard, Calendar, User, Plus } from 'lucide-react'

export default function Navbar() {
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<string | null>(null)
  const [profileName, setProfileName] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifications, setShowNotifications] = useState(false)

  const router = useRouter()
  const pathname = usePathname()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(n => !n.is_read).length

  // Cerramos el menú móvil automáticamente al cambiar de ruta
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      if (session?.user) {
        const { data } = await supabase.from('profiles').select('role, full_name').eq('id', session.user.id).single()
        setRole(data?.role ?? null)
        setProfileName(data?.full_name ?? null)
        fetchNotifications(session.user.id)
      }
    }
    checkUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      if (session?.user) {
        supabase.from('profiles').select('role, full_name').eq('id', session.user.id).single().then(({ data }) => {
          setRole(data?.role ?? null)
          setProfileName(data?.full_name ?? null)
        })
        fetchNotifications(session.user.id)
      } else {
        setRole(null)
        setProfileName(null)
        setNotifications([])
      }
    })

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (dropdownRef.current && !dropdownRef.current.contains(target)) setShowNotifications(false)
      if (userMenuRef.current && !userMenuRef.current.contains(target)) setShowUserMenu(false)
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
      if (role === 'doctor') router.push(`/calendario-medico?shiftId=${notif.shift_id}`)
      else if (role === 'clinic_admin') router.push(`/dashboard-clinica?shiftId=${notif.shift_id}`)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/' // <--- Esto fuerza la limpieza de memoria
  }

  const displayName = profileName || user?.email?.split('@')[0] || 'Usuario'
  const initials = (displayName || 'U').split(/\s+/).map((s: string) => s[0]).join('').toUpperCase().slice(0, 2)

  const BrandLogo = () => (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-md">
        <Shield className="h-5 w-5 text-white" />
      </div>
      <span className="text-lg font-semibold tracking-tight text-slate-900">Guardian</span>
    </div>
  )

  // Login y registro tienen su propio header integrado; no mostrar navbar global para evitar doble header
  if (pathname === '/login' || pathname === '/registro') {
    return null
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="focus:outline-none cursor-default select-none"><BrandLogo /></div>
            ) : (
              <Link href="/" className="focus:outline-none"><BrandLogo /></Link>
            )}
          </div>

          {/* Desktop nav */}
          {user && (
            <nav className="hidden items-center gap-1 md:flex">
              {role === 'super_admin' && (
                <Link
                  href="/super-admin-guardian"
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${pathname === '/super-admin-guardian' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Centro de Mando
                </Link>
              )}
              {role === 'clinic_admin' && (
                <>
                  <Link
                    href="/dashboard-clinica"
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${pathname === '/dashboard-clinica' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Panel
                  </Link>
                  <Link
                    href="/dashboard-clinica"
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${pathname === '/dashboard-clinica' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
                  >
                    <Calendar className="h-4 w-4" />
                    Calendario
                  </Link>
                </>
              )}
              {role === 'doctor' && (
                <>
                  <Link
                    href="/dashboard-medico"
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${pathname === '/dashboard-medico' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Panel
                  </Link>
                  <Link
                    href="/calendario-medico"
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${pathname === '/calendario-medico' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
                  >
                    <Calendar className="h-4 w-4" />
                    Calendario
                  </Link>
                </>
              )}
            </nav>
          )}

          {/* Desktop right: Crear Guardia, Bell, User dropdown / Login-Registro */}
          <div className="flex items-center gap-2 sm:gap-3">
            {!user ? (
              <>
                <Link href="/login" className="hidden md:inline-flex text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Ingresar</Link>
                <Link href="/registro" className="hidden md:inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-blue-600/20 transition-all hover:shadow-lg hover:shadow-blue-600/30">Crear Cuenta</Link>
              </>
            ) : (
              <>
                {role === 'clinic_admin' && (
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="hidden md:inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-blue-600/20 transition-all hover:shadow-lg hover:shadow-blue-600/30"
                  >
                    <Plus className="h-4 w-4" />
                    Crear Guardia
                  </button>
                )}

                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={toggleNotifications}
                    className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    <Bell className="h-[18px] w-[18px]" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-[320px] sm:w-80 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden z-50">
                      <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
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

                <div className="relative hidden md:block" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 rounded-xl pl-1.5 py-1.5 pr-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                      {initials}
                    </div>
                    <span className="max-w-[120px] truncate">{displayName}</span>
                  </button>
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-xl z-50">
                      <Link
                        href="/perfil"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <User className="h-4 w-4" />
                        Mi Perfil
                      </Link>
                      <div className="my-1 h-px bg-slate-100" />
                      <button
                        type="button"
                        onClick={() => { setShowUserMenu(false); handleLogout(); }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                        Cerrar Sesión
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Mobile: hamburger */}
            <div className="flex items-center gap-2 md:hidden">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
                aria-label="Abrir menú"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile drawer (estilo v0) */}
        {isMobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white md:hidden">
            <div className="mx-auto max-w-[1440px] px-4 py-4">
              {!user ? (
                <div className="flex flex-col gap-2">
                  <Link href="/login" className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-slate-600 hover:bg-slate-100 font-medium">Ingresar</Link>
                  <Link href="/registro" className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-white py-3 font-bold">Crear Cuenta</Link>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
                      <p className="text-xs text-slate-500">
                        {role === 'clinic_admin' ? 'Panel de Clínica' : role === 'doctor' ? 'Médico' : role === 'super_admin' ? 'Administrador' : 'Usuario'}
                      </p>
                    </div>
                  </div>
                  <nav className="flex flex-col gap-1">
                    {role === 'super_admin' && (
                      <Link href="/super-admin-guardian" className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${pathname === '/super-admin-guardian' ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
                        <LayoutDashboard className="h-4 w-4" />
                        Centro de Mando
                      </Link>
                    )}
                    {role === 'clinic_admin' && (
                      <>
                        <Link href="/dashboard-clinica" className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${pathname === '/dashboard-clinica' ? 'bg-blue-50 font-medium text-blue-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
                          <LayoutDashboard className="h-4 w-4" />
                          Panel
                        </Link>
                        <Link href="/dashboard-clinica" className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${pathname === '/dashboard-clinica' ? 'bg-blue-50 font-medium text-blue-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
                          <Calendar className="h-4 w-4" />
                          Calendario
                        </Link>
                      </>
                    )}
                    {role === 'doctor' && (
                      <>
                        <Link href="/dashboard-medico" className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${pathname === '/dashboard-medico' ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
                          <LayoutDashboard className="h-4 w-4" />
                          Panel
                        </Link>
                        <Link href="/calendario-medico" className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${pathname === '/calendario-medico' ? 'bg-blue-50 font-medium text-blue-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
                          <Calendar className="h-4 w-4" />
                          Calendario
                        </Link>
                      </>
                    )}
                    <Link href="/perfil" className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${pathname === '/perfil' ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
                      <User className="h-4 w-4" />
                      Mi Perfil
                    </Link>
                  </nav>
                  <div className="my-3 border-t border-slate-200" />
                  <div className="flex flex-col gap-2">
                    {role === 'clinic_admin' && (
                      <button
                        type="button"
                        onClick={() => { setIsMobileMenuOpen(false); setIsModalOpen(true); }}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-medium text-white shadow-md shadow-blue-600/20"
                      >
                        <Plus className="h-4 w-4" />
                        Crear Guardia
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl py-3 font-medium text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Cerrar Sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {isModalOpen && <PublicarModal onClose={() => setIsModalOpen(false)} onRefresh={() => window.dispatchEvent(new Event('refresh-shifts'))} />}
    </>
  )
}