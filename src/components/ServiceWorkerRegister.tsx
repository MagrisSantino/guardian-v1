'use client'

import { useEffect, useState } from 'react'

export default function ServiceWorkerRegister() {
  const [showUpdate, setShowUpdate] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (!newWorker) return
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker)
              setShowUpdate(true)
            }
          })
        })
      })
      .catch((err) => console.error('[SW] Error al registrar:', err))
  }, [])

  function handleUpdate() {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  }

  if (!showUpdate) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold animate-in fade-in slide-in-from-bottom-4">
      <span>Hay una nueva versión disponible</span>
      <button
        onClick={handleUpdate}
        className="bg-blue-500 hover:bg-blue-400 text-white px-3 py-1 rounded-lg text-xs font-bold transition-colors"
      >
        Actualizar
      </button>
      <button onClick={() => setShowUpdate(false)} className="text-slate-400 hover:text-white text-xs transition-colors">
        Luego
      </button>
    </div>
  )
}
