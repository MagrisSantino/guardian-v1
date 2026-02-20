'use client'
import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="flex justify-between items-center p-6 bg-slate-900 border-b border-slate-800 text-white">
      <Link href="/" className="text-2xl font-bold text-blue-500">Guardian</Link>
      <div className="flex gap-6">
        <Link href="/registro" className="hover:text-blue-400">Registro</Link>
        <Link href="/perfil" className="hover:text-blue-400">Mi Perfil</Link>
        <Link href="/dashboard" className="bg-blue-600 px-4 py-2 rounded-lg font-bold">Panel Guardias</Link>
      </div>
    </nav>
  )
}