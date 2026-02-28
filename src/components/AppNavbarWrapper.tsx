'use client'

import { usePathname } from 'next/navigation'
import Navbar from '@/components/Navbar'

/**
 * Muestra la Navbar de la app (login, dashboard, etc.) solo en rutas que no son la landing.
 * En "/" se muestra la landing con su propio Navbar.
 */
export default function AppNavbarWrapper() {
  const pathname = usePathname()
  if (pathname === '/') return null
  return <Navbar />
}
