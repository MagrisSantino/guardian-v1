import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createSupabaseAdmin } from '@/lib/supabaseAdmin'
import { pendingShiftConflictsWithAssignedShift, type AssignedShiftBlock } from '@/lib/shiftOverlap'

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
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
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
      },
    )

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

    const { data: otherPendingApps } = await admin
      .from('shift_applications')
      .select('id, shift_id')
      .eq('professional_id', professionalId)
      .eq('status', 'pending')
      .neq('shift_id', shiftId)
      .order('id', { ascending: false })

    const otherShiftIds = [...new Set((otherPendingApps || []).map((r: { shift_id: string }) => r.shift_id))]

    let shiftsById = new Map<string, { id: string; date_time: string; duration_hours: number | null }>()
    if (otherShiftIds.length > 0) {
      const { data: otherShifts, error: osErr } = await admin
        .from('shifts')
        .select('id, date_time, duration_hours')
        .in('id', otherShiftIds)
      if (osErr) {
        console.error('[assign] shifts otras:', osErr.message)
        return NextResponse.json({ ok: false, error: 'Error al validar otras postulaciones' }, { status: 500 })
      }
      for (const row of otherShifts || []) {
        shiftsById.set(row.id, {
          id: row.id,
          date_time: row.date_time as string,
          duration_hours: row.duration_hours,
        })
      }
    }

    const assignedBlock: AssignedShiftBlock = {
      id: shift.id,
      date_time: shift.date_time as string,
      duration_hours: shift.duration_hours,
    }

    const crossShiftRejectAppIds: string[] = []
    for (const row of otherPendingApps || []) {
      const sid = row.shift_id as string
      const other = shiftsById.get(sid)
      if (!other) continue
      if (
        pendingShiftConflictsWithAssignedShift(
          other.date_time,
          other.duration_hours,
          assignedBlock,
        )
      ) {
        crossShiftRejectAppIds.push(row.id as string)
      }
    }

    const { error: upShiftErr } = await admin
      .from('shifts')
      .update({ status: 'filled', professional_id: professionalId })
      .eq('id', shiftId)

    if (upShiftErr) {
      console.error('[assign] update shift:', upShiftErr.message)
      return NextResponse.json({ ok: false, error: upShiftErr.message }, { status: 500 })
    }

    const { error: upAccErr } = await admin
      .from('shift_applications')
      .update({ status: 'accepted' })
      .eq('id', applicationId)

    if (upAccErr) {
      console.error('[assign] accept app:', upAccErr.message)
      return NextResponse.json({ ok: false, error: upAccErr.message }, { status: 500 })
    }

    await admin
      .from('shift_applications')
      .update({ status: 'rejected' })
      .eq('shift_id', shiftId)
      .eq('status', 'pending')

    if (crossShiftRejectAppIds.length > 0) {
      const { error: rejErr } = await admin
        .from('shift_applications')
        .update({ status: 'rejected' })
        .in('id', crossShiftRejectAppIds)

      if (rejErr) {
        console.error('[assign] reject cross-shift:', rejErr.message)
      }
    }

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
        const rejectSet = new Set(crossShiftRejectAppIds)
        const appMeta = (otherPendingApps || []).filter((a) => rejectSet.has(a.id as string))
        await admin.from('notifications').insert(
          appMeta.map((a) => ({
            user_id: professionalId,
            shift_id: a.shift_id as string,
            title: 'Postulación retirada',
            message:
              'Tu postulación se rechazó automáticamente: hay solapamiento con otra guardia que te asignaron.',
          })),
        )
      }
    } catch (notifErr) {
      console.error('[assign] notificaciones in-app (no aborta respuesta):', notifErr)
    }

    try {
      const res = await fetch(`${request.nextUrl.origin}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    if (msg.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      return NextResponse.json({ ok: false, error: 'Configuración del servidor incompleta' }, { status: 500 })
    }
    console.error('[assign]', e)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
