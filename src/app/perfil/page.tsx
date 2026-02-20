'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Perfil() {
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [license, setLicense] = useState('')
  const [specialty, setSpecialty] = useState('')

  useEffect(() => {
    getProfile()
  }, [])

  async function getProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setFullName(data.full_name || '')
        setLicense(data.license_number || '')
        setSpecialty(data.specialty || '')
      }
    }
    setLoading(false)
  }

  async function updateProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  
  // Si no hay usuario, el sistema frena aquí y te avisa
  if (!user) {
    alert('Debes iniciar sesión para guardar tu perfil')
    return
  }

  const updates = {
    id: user.id, // Ahora estamos seguros de que existe
    full_name: fullName,
    license_number: license,
    specialty: specialty,
  }

  const { error } = await supabase.from('profiles').upsert(updates)
  if (error) alert(error.message)
  else alert('¡Perfil actualizado con éxito!')
}

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Cargando...</div>

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white p-6">
      <div className="bg-slate-900 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-800">
        <h2 className="text-3xl font-bold mb-6 text-blue-500">Mi Perfil Profesional</h2>
        
        <label className="block text-sm text-slate-400 mb-1">Nombre Completo</label>
        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full p-3 mb-4 bg-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
        
        <label className="block text-sm text-slate-400 mb-1">Matrícula Provincial</label>
        <input type="text" value={license} onChange={(e) => setLicense(e.target.value)} className="w-full p-3 mb-4 bg-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
        
        <label className="block text-sm text-slate-400 mb-1">Especialidad</label>
        <input type="text" value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="w-full p-3 mb-6 bg-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />

        <button onClick={updateProfile} className="w-full py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold transition-all">
          Guardar Cambios
        </button>
      </div>
    </main>
  )
}