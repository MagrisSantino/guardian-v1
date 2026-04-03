'use client'

import { usePathname } from 'next/navigation'
import Navbar from '@/components/Navbar'

/**
 * Muestra la Navbar de la app (login, dashboard, etc.) solo en rutas que no son la landing.
 * En "/" se muestra la landing con su propio Navbar.
 */
const NO_NAVBAR_PATHS = ['/', '/login', '/registro', '/restablecer-contrasena', '/verificar-email']

export default function AppNavbarWrapper() {
  const pathname = usePathname()
  if (
    !pathname ||
    NO_NAVBAR_PATHS.includes(pathname) ||
    pathname.startsWith('/auth/')
  ) return null
  return <Navbar />
}
