import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createSupabaseAdmin } from '@/lib/supabaseAdmin'

type Body = {
  shift_id?: string
  actor?: 'doctor' | 'clinic'
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body
    const shiftId = body.shift_id?.trim()
    const actor = body.actor

    if (!shiftId || !actor || (actor !== 'doctor' && actor !== 'clinic')) {
      return NextResponse.json({ ok: false, error: 'Faltan datos' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ ok: false, error: 'Configuración del servidor incompleta' }, { status: 500 })
    }

    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(list) {
          try { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    })

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
    }

    const admin = createSupabaseAdmin()

    const { data: userProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = userProfile?.role
    if (actor === 'doctor' && role !== 'doctor') {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 })
    }
    if (actor === 'clinic' && role !== 'clinic_admin' && role !== 'super_admin') {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 })
    }

    const { data: shift, error: shiftErr } = await admin
      .from('shifts')
      .select('id, clinic_id, professional_id, status, title, date_time')
      .eq('id', shiftId)
      .single()

    if (shiftErr || !shift) {
      return NextResponse.json({ ok: false, error: 'Guardia no encontrada' }, { status: 404 })
    }
    if (shift.status !== 'filled') {
      return NextResponse.json({ ok: false, error: 'La guardia no tiene un médico asignado' }, { status: 409 })
    }

    if (actor === 'doctor' && shift.professional_id !== user.id) {
      return NextResponse.json({ ok: false, error: 'No sos el médico asignado a esta guardia' }, { status: 403 })
    }
    if (actor === 'clinic' && shift.clinic_id !== user.id) {
      return NextResponse.json({ ok: false, error: 'No tenés permiso sobre esta guardia' }, { status: 403 })
    }

    const previousProfessionalId = shift.professional_id as string
    const clinicId = shift.clinic_id as string

    // Reabrir la guardia
    await admin
      .from('shifts')
      .update({ status: 'open', professional_id: null })
      .eq('id', shiftId)

    if (actor === 'doctor') {
      // 'withdrawn' = médico cancela una asignación ya aceptada (distinto de
      // 'cancelled' que es retirar una postulación aún pendiente)
      await admin
        .from('shift_applications')
        .update({ status: 'withdrawn' })
        .eq('shift_id', shiftId)
        .eq('professional_id', user.id)
        .eq('status', 'accepted')
    } else {
      // Clínica desasigna: reabrir la postulación del médico
      await admin
        .from('shift_applications')
        .update({ status: 'pending' })
        .eq('shift_id', shiftId)
        .eq('professional_id', previousProfessionalId)
    }

    // Reabrir postulaciones rechazadas de otros médicos
    await admin
      .from('shift_applications')
      .update({ status: 'pending' })
      .eq('shift_id', shiftId)
      .eq('status', 'rejected')

    // Notificación in-app al otro lado
    try {
      if (actor === 'doctor') {
        await admin.from('notifications').insert([{
          user_id: clinicId,
          shift_id: shiftId,
          title: '¡Baja de Profesional!',
          message: `El médico se dio de baja de "${shift.title}". La guardia vuelve a estar abierta.`,
        }])
      } else {
        await admin.from('notifications').insert([{
          user_id: previousProfessionalId,
          shift_id: shiftId,
          title: 'Guardia desasignada',
          message: `La institución canceló tu asignación para la guardia "${shift.title}". Podés postularte nuevamente.`,
        }])
      }
    } catch (notifErr) {
      console.error('[cancel-assignment] notif in-app (no aborta):', notifErr)
    }

    // Email al otro lado (solo para doctor → clínica)
    if (actor === 'doctor') {
      try {
        const notifHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
        const internalSecret = process.env.NOTIFICATIONS_INTERNAL_SECRET
        if (internalSecret) notifHeaders['X-Internal-Secret'] = internalSecret

        await fetch(`${request.nextUrl.origin}/api/notifications`, {
          method: 'POST',
          headers: notifHeaders,
          body: JSON.stringify({
            action: 'DOCTOR_CANCELLED',
            shift_id: shiftId,
            professional_id: previousProfessionalId,
          }),
        })
      } catch (mailErr) {
        console.error('[cancel-assignment] email (no aborta):', mailErr)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[cancel-assignment]', e)
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }
}
