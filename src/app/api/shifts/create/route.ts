import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createSupabaseAdmin } from '@/lib/supabaseAdmin'
import { MEDICAL_SPECIALTIES } from '@/lib/specialties'

const VALID_CATEGORIES = ['Guardia', 'Consultorio', 'Ambulancia'] as const
type ShiftCategory = typeof VALID_CATEGORIES[number]

type Body = {
  shift_category?: string
  specialty_required?: string
  date_time?: string
  duration_hours?: number
  price?: number
  viaticos?: string
  payment_timeframe?: string | null
  description?: string | null
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body

    // ── Server-side validation ────────────────────────────────────────────
    const category = body.shift_category?.trim() as ShiftCategory
    if (!VALID_CATEGORIES.includes(category))
      return NextResponse.json({ ok: false, error: 'Categoría inválida' }, { status: 400 })

    const specialty = body.specialty_required?.trim()
    if (!specialty || !(MEDICAL_SPECIALTIES as readonly string[]).includes(specialty))
      return NextResponse.json({ ok: false, error: 'Especialidad inválida' }, { status: 400 })

    const dateTime = body.date_time ? new Date(body.date_time) : null
    if (!dateTime || Number.isNaN(dateTime.getTime()))
      return NextResponse.json({ ok: false, error: 'Fecha inválida' }, { status: 400 })
    if (dateTime <= new Date())
      return NextResponse.json({ ok: false, error: 'La fecha debe ser en el futuro' }, { status: 400 })

    const duration = Number(body.duration_hours)
    if (!duration || duration <= 0 || duration > 48)
      return NextResponse.json({ ok: false, error: 'Duración inválida (1–48 horas)' }, { status: 400 })

    const price = Number(body.price)
    if (!price || price <= 0 || price > 9_999_999)
      return NextResponse.json({ ok: false, error: 'Precio inválido' }, { status: 400 })

    // ── Auth ──────────────────────────────────────────────────────────────
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey)
      return NextResponse.json({ ok: false, error: 'Configuración incompleta' }, { status: 500 })

    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(list) { try { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
      },
    })

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })

    const admin = createSupabaseAdmin()
    const { data: profile } = await admin.from('profiles').select('role, is_verified').eq('id', user.id).single()

    if (profile?.role !== 'clinic_admin' && profile?.role !== 'super_admin')
      return NextResponse.json({ ok: false, error: 'Solo clínicas pueden publicar guardias' }, { status: 403 })
    if (!profile?.is_verified)
      return NextResponse.json({ ok: false, error: 'Tu clínica aún no fue verificada' }, { status: 403 })

    // ── Insert ────────────────────────────────────────────────────────────
    const title = `${category} de ${specialty}`
    const { data: inserted, error: insertErr } = await admin
      .from('shifts')
      .insert([{
        clinic_id: user.id,
        title,
        shift_category: category,
        specialty_required: specialty,
        date_time: dateTime.toISOString(),
        duration_hours: duration,
        price,
        viaticos: body.viaticos ?? 'No',
        payment_timeframe: body.payment_timeframe || null,
        description: body.description || null,
        status: 'open',
      }])
      .select('id')
      .single()

    if (insertErr) {
      console.error('[shifts/create] insert:', insertErr.message)
      return NextResponse.json({ ok: false, error: 'Error al publicar la guardia' }, { status: 500 })
    }

    const shiftId = inserted?.id
    if (shiftId) {
      try {
        const notifHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
        const secret = process.env.NOTIFICATIONS_INTERNAL_SECRET
        if (secret) notifHeaders['X-Internal-Secret'] = secret
        void fetch(`${request.nextUrl.origin}/api/notifications`, {
          method: 'POST',
          headers: notifHeaders,
          body: JSON.stringify({ action: 'NEW_SHIFT', shift_id: shiftId }),
        }).catch((e) => console.error('[shifts/create] notif email:', e))
      } catch {}
    }

    return NextResponse.json({ ok: true, shift_id: shiftId })
  } catch (e) {
    console.error('[shifts/create]', e)
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }
}
