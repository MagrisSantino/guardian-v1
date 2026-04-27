import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createSupabaseAdmin } from '@/lib/supabaseAdmin'

type Body = {
  shift_id?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body
    const shiftId = body.shift_id?.trim()
    if (!shiftId) {
      return NextResponse.json({ ok: false, error: 'Falta shift_id' }, { status: 400 })
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

    const { data: profile } = await admin
      .from('profiles')
      .select('role, is_verified')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'doctor') {
      return NextResponse.json({ ok: false, error: 'Solo médicos pueden postularse' }, { status: 403 })
    }
    if (!profile?.is_verified) {
      return NextResponse.json({ ok: false, error: 'Tu perfil no ha sido verificado' }, { status: 403 })
    }

    const { data: shift, error: shiftErr } = await admin
      .from('shifts')
      .select('id, clinic_id, status, title, date_time, duration_hours')
      .eq('id', shiftId)
      .single()

    if (shiftErr || !shift) {
      return NextResponse.json({ ok: false, error: 'Guardia no encontrada' }, { status: 404 })
    }
    if (shift.status !== 'open') {
      return NextResponse.json({ ok: false, error: 'La guardia no está disponible' }, { status: 409 })
    }

    // Duplicate check
    const { data: existing } = await admin
      .from('shift_applications')
      .select('id, status')
      .eq('shift_id', shiftId)
      .eq('professional_id', user.id)
      .maybeSingle()

    if (existing && existing.status === 'pending') {
      return NextResponse.json({ ok: false, error: 'Ya tenés una postulación activa para esta guardia' }, { status: 409 })
    }

    const { error: insertErr } = await admin
      .from('shift_applications')
      .insert([{ shift_id: shiftId, professional_id: user.id, status: 'pending' }])

    if (insertErr) {
      console.error('[apply] insert application:', insertErr.message)
      if (insertErr.message.includes('unique') || insertErr.code === '23505') {
        return NextResponse.json({ ok: false, error: 'Ya tenés una postulación para esta guardia' }, { status: 409 })
      }
      return NextResponse.json({ ok: false, error: 'Error al registrar la postulación' }, { status: 500 })
    }

    // In-app notification for clinic
    try {
      await admin.from('notifications').insert([{
        user_id: shift.clinic_id,
        shift_id: shiftId,
        title: '¡Nueva Postulación! 👨‍⚕️',
        message: `Un médico se postula a tu guardia: ${shift.title}.`,
      }])
    } catch (notifErr) {
      console.error('[apply] notif in-app (no aborta):', notifErr)
    }

    // Email notification (background, non-blocking)
    try {
      const notifHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
      const internalSecret = process.env.NOTIFICATIONS_INTERNAL_SECRET
      if (internalSecret) notifHeaders['X-Internal-Secret'] = internalSecret

      void fetch(`${request.nextUrl.origin}/api/notifications`, {
        method: 'POST',
        headers: notifHeaders,
        body: JSON.stringify({
          action: 'NEW_APPLICATION',
          shift_id: shiftId,
          professional_id: user.id,
        }),
      }).catch((err) => console.error('[apply] email (no aborta):', err))
    } catch {}

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[apply]', e)
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }
}
