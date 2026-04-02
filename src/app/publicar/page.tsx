'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Esta ruta está reservada para clínicas.
 * La publicación de guardias se realiza desde el panel de la clínica
 * a través del modal PublicarModal. Esta página redirige al dashboard.
 */
export default function PublicarGuardia() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard-clinica')
  }, [router])

  return null
}