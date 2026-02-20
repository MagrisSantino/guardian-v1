'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function PublicarGuardia() {
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [specialty, setSpecialty] = useState('')
  const router = useRouter()

  async function handlePublicar(e: React.FormEvent) {
    e.preventDefault()
    
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      alert("Debes estar logueado como Clínica para publicar")
      router.push('/registro')
      return
    }

    const { error } = await supabase.from('shifts').insert([{
      title,
      price: Number(price),
      specialty_required: specialty,
      clinic_id: session.user.id, // ID verificado de la sesión
      date_time: new Date().toISOString(),
      duration_hours: 12,
      status: 'open'
    }])

    if (error) {
      console.error(error)
      alert(`Error: ${error.message}`)
    } else {
      alert('¡Guardia publicada profesionalmente!')
      router.push('/dashboard')
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white p-6">
      {/* ... (tu formulario actual) ... */}
    </main>
  )
}