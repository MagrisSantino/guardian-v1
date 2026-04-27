import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createSupabaseAdmin } from '@/lib/supabaseAdmin'
type Body = {
  shift_id?: string
  application_id?: string
  professional_id?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body
    const shiftId = body.shift_id?.trim()
    const applicationId = body.application_id?.trim()
    const professionalId = body.professional_id?.trim()
    if (!shiftId || !applicationId || !professionalId) {
      return NextResponse.json({ ok: false, error: 'Faltan datos' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { ok: false, error: 'Configuración del servidor incompleta' },
        { status: 500 },
      )
    }
    const supabaseAuth = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(list) {
          try {
            list.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            /* set desde Route Handler */
          }
        },
      },
    })

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
    }

    const admin = createSupabaseAdmin()

    const { data: userProfile, error: profileErr } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileErr || !userProfile) {
      return NextResponse.json(
        { error: 'Acceso denegado. Rol no autorizado.' },
        { status: 403 },
      )
    }

    if (userProfile.role !== 'clinic_admin' && userProfile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Acceso denegado. Rol no autorizado.' },
        { status: 403 },
      )
    }

    const { data: shift, error: shiftErr } = await admin
      .from('shifts')
      .select('id, clinic_id, status, date_time, duration_hours, title')
      .eq('id', shiftId)
      .single()

    if (shiftErr || !shift) {
      return NextResponse.json({ ok: false, error: 'Guardia no encontrada' }, { status: 404 })
    }
    if (shift.clinic_id !== user.id) {
      return NextResponse.json({ ok: false, error: 'No tenés permiso sobre esta guardia' }, { status: 403 })
    }
    if (shift.status !== 'open') {
      return NextResponse.json({ ok: false, error: 'La guardia no está abierta' }, { status: 409 })
    }

    const { data: application, error: appErr } = await admin
      .from('shift_applications')
      .select('id, shift_id, professional_id, status')
      .eq('id', applicationId)
      .single()

    if (appErr || !application) {
      return NextResponse.json({ ok: false, error: 'Postulación no encontrada' }, { status: 404 })
    }
    if (application.shift_id !== shiftId || application.professional_id !== professionalId) {
      return NextResponse.json({ ok: false, error: 'Datos de postulación inconsistentes' }, { status: 400 })
    }
    if (application.status !== 'pending') {
      return NextResponse.json({ ok: false, error: 'La postulación ya no está pendiente' }, { status: 409 })
    }

    const { data: sameShiftPendingLosers } = await admin
      .from('shift_applications')
      .select('professional_id')
      .eq('shift_id', shiftId)
      .eq('status', 'pending')
      .neq('id', applicationId)

    const loserIds = (sameShiftPendingLosers || []).map(
      (r: { professional_id: string }) => r.professional_id,
    )

    // Llamada atómica: acepta la postulación, rechaza las demás y maneja solapamientos
    // en una sola transacción DB (elimina la race condition de los 4 UPDATEs separados).
    const { data: rpcResult, error: rpcErr } = await supabaseAuth.rpc('accept_shift_application', {
      p_application_id: applicationId,
      p_shift_id: shiftId,
      p_professional_id: professionalId,
    })

    if (rpcErr) {
      console.error('[assign] rpc accept_shift_application:', rpcErr.message)
      if (rpcErr.message.includes('SHIFT_NOT_OPEN'))
        return NextResponse.json({ ok: false, error: 'La guardia ya no está abierta' }, { status: 409 })
      if (rpcErr.message.includes('APPLICATION_NOT_PENDING'))
        return NextResponse.json({ ok: false, error: 'La postulación ya no está pendiente' }, { status: 409 })
      if (rpcErr.message.includes('NOT_AUTHORIZED'))
        return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 })
      return NextResponse.json({ ok: false, error: 'Error al asignar la guardia' }, { status: 500 })
    }

    const crossShiftRejectAppIds: string[] = (rpcResult as { rejected_cross_shift?: string[] } | null)?.rejected_cross_shift ?? []

    try {
      const notifWinner = {
        user_id: professionalId,
        shift_id: shiftId,
        title: '¡Guardia Asignada!',
        message: 'La clínica te ha asignado la guardia.',
      }
      await admin.from('notifications').insert([notifWinner])

      if (loserIds.length > 0) {
        await admin.from('notifications').insert(
          loserIds.map((user_id: string) => ({
            user_id,
            shift_id: shiftId,
            title: 'Guardia Cubierta',
            message: 'La guardia a la que te postulaste ya fue cubierta por otro profesional.',
          })),
        )
      }

      if (crossShiftRejectAppIds.length > 0) {
        const { data: crossApps } = await admin
          .from('shift_applications')
          .select('id, shift_id')
          .in('id', crossShiftRejectAppIds)
        if (crossApps && crossApps.length > 0) {
          await admin.from('notifications').insert(
            crossApps.map((a) => ({
              user_id: professionalId,
              shift_id: a.shift_id as string,
              title: 'Postulación retirada',
              message: 'Tu postulación se rechazó automáticamente: hay solapamiento con otra guardia que te asignaron.',
            })),
          )
        }
      }
    } catch (notifErr) {
      console.error('[assign] notificaciones in-app (no aborta respuesta):', notifErr)
    }

    try {
      const notifHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
      const internalSecret = process.env.NOTIFICATIONS_INTERNAL_SECRET
      if (internalSecret) notifHeaders['X-Internal-Secret'] = internalSecret

      const res = await fetch(`${request.nextUrl.origin}/api/notifications`, {
        method: 'POST',
        headers: notifHeaders,
        body: JSON.stringify({
          action: 'SHIFT_ASSIGNED',
          shift_id: shiftId,
          professional_id: professionalId,
          clinic_id: shift.clinic_id,
        }),
      })
      if (!res.ok) {
        const t = await res.text().catch(() => '')
        console.error('[assign] /api/notifications SHIFT_ASSIGNED status=', res.status, t)
      }
    } catch (mailErr) {
      console.error('[assign] correo SHIFT_ASSIGNED (no aborta respuesta):', mailErr)
    }

    return NextResponse.json({
      ok: true,
      rejected_cross_shift: crossShiftRejectAppIds.length,
    })
  } catch (e) {
    console.error('[assign]', e)
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }
}
