'use client'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { AlertCircle, Clock, X } from 'lucide-react'

const HOUR_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2)
  const m = (i % 2) * 30
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
})

const SHIFT_CATEGORY_OPTIONS = ['Guardia', 'Consultorio', 'Ambulancia'] as const
const SPECIALTY_OPTIONS = ['Generalista', 'Clínico', 'Pediatría', 'Gineco/obstetricia', 'Cirugía general', 'Traumatología', 'Cardiología', 'Urología', 'Otro'] as const
const DURATION_PILLS = [4, 6, 8, 12, 24, 'Otro'] as const

function getEndTime(start: string, durationHours: number): string {
  const [h, m] = start.split(':').map(Number)
  const totalMins = h * 60 + m + durationHours * 60
  const endH = Math.floor(totalMins / 60) % 24
  const endM = totalMins % 60
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
}

export default function PublicarModal({ onClose, onRefresh, selectedDate = null }: { onClose: () => void; onRefresh: () => void; selectedDate?: Date | null }) {
  const [shiftCategory, setShiftCategory] = useState<'Guardia' | 'Consultorio' | 'Ambulancia'>('Guardia')
  const [specialty, setSpecialty] = useState<string>('Generalista')
  const [specialtyOther, setSpecialtyOther] = useState('')
  const [date, setDate] = useState('')
  const [timeStart, setTimeStart] = useState('08:00')
  const [durationPreset, setDurationPreset] = useState<4 | 6 | 8 | 12 | 24 | 'Otro'>(8)
  const [durationHoursCustom, setDurationHoursCustom] = useState('')
  const [price, setPrice] = useState('')
  const [viaticosExtra, setViaticosExtra] = useState<'Sí' | 'No'>('No')
  const [tiempoAPagar, setTiempoAPagar] = useState('')
  const [detallesAdicionales, setDetallesAdicionales] = useState('')
  const [loading, setLoading] = useState(false)
  
  const [isVerified, setIsVerified] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    async function checkVerification() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data } = await supabase.from('profiles').select('is_verified').eq('id', session.user.id).single()
        setIsVerified(data?.is_verified === true)
      }
      setCheckingAuth(false)
    }
    checkVerification()
  }, [])

  useEffect(() => {
    if (selectedDate) {
      setDate(format(selectedDate, 'yyyy-MM-dd'))
    } else {
      setDate(format(new Date(), 'yyyy-MM-dd'))
    }
  }, [selectedDate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isVerified) return; // Doble barrera
    setLoading(true)

    const specialtyRequired = specialty === 'Otro' ? specialtyOther.trim() : specialty
    if (!specialtyRequired) {
      alert('Completá la especialidad requerida.')
      setLoading(false)
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    const durationHours = durationPreset === 'Otro'
      ? (parseFloat(durationHoursCustom) || 0)
      : durationPreset

    const dateTimeISO = `${date}T${timeStart}:00`
    const title = `${shiftCategory} de ${specialtyRequired}`

    const insertPayload: Record<string, unknown> = {
      clinic_id: session?.user.id,
      title,
      shift_category: shiftCategory,
      specialty_required: specialtyRequired,
      date_time: dateTimeISO,
      duration_hours: durationHours,
      price: parseFloat(price),
      viaticos: viaticosExtra,
      payment_timeframe: tiempoAPagar || null,
      description: detallesAdicionales || null,
      status: 'open'
    }

    const { error } = await supabase.from('shifts').insert([insertPayload])

    setLoading(false)
    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('Guardia publicada exitosamente')
      onRefresh()
      onClose()
    }
  }

  if (checkingAuth) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-blue-500"></div>
      </div>
    )
  }

  if (!isVerified) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
        <div className="bg-white p-8 rounded-3xl w-full max-w-md text-center shadow-2xl relative">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-slate-900 mb-2">Clínica en Revisión</h2>
          <p className="text-slate-600 mb-8 font-medium leading-relaxed">Por motivos de seguridad legal, tu institución debe ser verificada por el equipo de Guardian antes de poder publicar guardias en la red.</p>
          <button onClick={onClose} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold transition-all">Entendido</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-2xl shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-blue-400"></div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-slate-900">Publicar Guardia</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full p-2 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Tipo de Servicio</label>
              <select
                value={shiftCategory}
                onChange={e => setShiftCategory(e.target.value as 'Guardia' | 'Consultorio' | 'Ambulancia')}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-semibold text-slate-900"
              >
                {SHIFT_CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Especialidad Requerida</label>
              <select
                value={specialty}
                onChange={e => setSpecialty(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-semibold text-slate-900"
              >
                {SPECIALTY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {specialty === 'Otro' && (
                <input
                  type="text"
                  value={specialtyOther}
                  onChange={e => setSpecialtyOther(e.target.value)}
                  placeholder="Escribí la especialidad"
                  className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-semibold text-slate-900"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Fecha</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-semibold text-slate-900 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Duración (horas)</label>
              <div className="flex flex-wrap gap-2">
                {DURATION_PILLS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setDurationPreset(val)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                      durationPreset === val ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {val === 'Otro' ? 'Otro' : `${val} hs`}
                  </button>
                ))}
              </div>
              {durationPreset === 'Otro' && (
                <input
                  type="number"
                  min={1}
                  value={durationHoursCustom}
                  onChange={e => setDurationHoursCustom(e.target.value)}
                  placeholder="Horas"
                  className="mt-2 w-full max-w-[120px] px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none font-semibold text-slate-900"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Hora inicio</label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <select value={timeStart} onChange={e => setTimeStart(e.target.value)} className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-semibold text-slate-900 appearance-none cursor-pointer bg-[length:1.25rem] bg-[position:right_0.75rem_center] bg-no-repeat" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")' }}>
                  {HOUR_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                Termina a las {getEndTime(timeStart, durationPreset === 'Otro' ? (parseFloat(durationHoursCustom) || 0) : durationPreset)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Pago Ofrecido ($)</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} required min="0" placeholder="Ej: 150000" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-semibold text-slate-900" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Viáticos</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setViaticosExtra('Sí')}
                  className={`flex-1 px-4 py-3 rounded-full text-sm font-semibold transition-colors ${viaticosExtra === 'Sí' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  Sí
                </button>
                <button
                  type="button"
                  onClick={() => setViaticosExtra('No')}
                  className={`flex-1 px-4 py-3 rounded-full text-sm font-semibold transition-colors ${viaticosExtra === 'No' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  No
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1.5">A coordinar con el médico</p>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Tiempo a pagar</label>
              <input type="number" value={tiempoAPagar} onChange={e => setTiempoAPagar(e.target.value)} min={0} placeholder="Cantidad de días a pagar" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-semibold text-slate-900" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Detalles adicionales (opcional)</label>
            <textarea value={detallesAdicionales} onChange={e => setDetallesAdicionales(e.target.value)} maxLength={150} rows={3} placeholder="Información extra para los postulantes..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-semibold text-slate-900 resize-y" />
            <p className="text-xs text-slate-500 mt-1">{detallesAdicionales.length}/150</p>
          </div>

          <button type="submit" disabled={loading} className="w-full mt-4 bg-slate-900 hover:bg-blue-700 text-white py-4 rounded-xl font-black transition-all shadow-xl hover:shadow-blue-900/20 hover:-translate-y-0.5">
            {loading ? 'Publicando...' : 'Publicar Guardia'}
          </button>
        </form>
      </div>
    </div>
  )
}