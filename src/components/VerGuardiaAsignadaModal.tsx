'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format, parseISO, isBefore, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { MessageCircle, Calendar, Clock } from 'lucide-react'

export default function VerGuardiaAsignadaModal({ onClose, onRefresh, shift, onFinalize }: { onClose: () => void; onRefresh: () => void; shift: any; onFinalize: () => void }) {
  const [doctor, setDoctor] = useState<any>(null)
  const [contact, setContact] = useState<{ whatsapp?: string | null; phone?: string | null } | null>(null)
  const [unassigning, setUnassigning] = useState(false)

  const shiftDate = shift?.starts_at ? parseISO(shift.starts_at) : null
  const todayStart = startOfDay(new Date())
  const shiftDayStart = shiftDate ? startOfDay(shiftDate) : null
  const canFinalize = shiftDayStart != null && !isBefore(todayStart, shiftDayStart)

  useEffect(() => {
    const doctorId = shift?.assigned_doctor_id
    if (!doctorId) return
    Promise.all([
      supabase
        .from('accounts_public')
        .select('full_name, is_verified')
        .eq('id', doctorId)
        .single(),
      supabase
        .from('accounts')
        .select('whatsapp, phone')
        .eq('id', doctorId)
        .single(),
    ]).then(([pubRes, contactRes]) => {
      if (pubRes.data) setDoctor(pubRes.data)
      if (contactRes.data) setContact(contactRes.data)
    })
  }, [shift?.assigned_doctor_id])

  const waNumber = (contact?.whatsapp || contact?.phone)?.replace(/\D/g, '')

  async function handleUnassign() {
    if (!confirm('¿Desasignar a este médico? La guardia volverá a estar abierta para que otro profesional se postule.')) return
    setUnassigning(true)
    try {
      const res = await fetch('/api/shifts/cancel-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift_id: shift.id }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Error al desasignar. Intentá de nuevo.')
        setUnassigning(false)
        return
      }
    } catch {
      alert('Error de conexión. Intentá de nuevo.')
      setUnassigning(false)
      return
    }
    setUnassigning(false)
    onRefresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="relative bg-white border border-slate-200 p-6 md:p-8 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-t-2xl" />

        <h2 className="text-xl font-bold text-slate-900 mb-1">Guardia asignada</h2>
        <p className="text-slate-500 text-sm mb-6">{shift?.title}</p>

        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-4 space-y-2">
          <div className="flex items-center gap-2 text-slate-700">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="font-medium">{shiftDate ? format(shiftDate, "EEEE d 'de' MMMM", { locale: es }) : '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="font-medium">
              {shiftDate ? format(shiftDate, 'HH:mm') : '—'}
              {shift?.ends_at ? ` — ${format(parseISO(shift.ends_at), 'HH:mm')}` : ''}
              {' '}hs · ${shift?.price?.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Profesional asignado</p>
          <div className="flex items-center justify-between gap-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div>
              <p className="font-bold text-slate-900">{doctor?.full_name || '—'}</p>
              {doctor?.is_verified && (
                <span className="text-xs text-emerald-700 font-medium">Verificado</span>
              )}
            </div>
            {waNumber ? (
              <a
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 shrink-0 bg-[#25D366] hover:bg-[#20bd5a] text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm"
              >
                <MessageCircle className="h-4 w-4" />
                Contactar
              </a>
            ) : (
              <span className="text-xs text-slate-500">Sin WhatsApp</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onFinalize}
            disabled={!canFinalize}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold transition-all shadow-md disabled:opacity-80"
          >
            Finalizar guardia
          </button>
          <button
            type="button"
            onClick={handleUnassign}
            disabled={unassigning}
            className="w-full bg-white border-2 border-slate-200 hover:border-red-200 text-slate-600 hover:text-red-600 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-70"
          >
            {unassigning ? '...' : 'Desasignar médico'}
          </button>
          <button type="button" onClick={onClose} className="w-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 py-2.5 rounded-xl font-bold text-sm transition-all">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
