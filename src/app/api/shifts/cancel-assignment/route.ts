import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { shift_id?: string; actor?: string }
    const shiftId = body.shift_id?.trim()
    const actor = body.actor?.trim()
    if (!shiftId) {
      return NextResponse.json({ ok: false, error: 'Falta shift_id' }, { status: 400 })
    }

    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
    }

    const admin = createSupabaseAdmin()

    const { data: account } = await admin
      .from('accounts')
      .select('role')
      .eq('id', user.id)
      .single()

    // ── Clínica desasigna médico ──────────────────────────────────────────────
    if (account?.role === 'clinic') {
      const { data: shift, error: shiftErr } = await admin
        .from('shifts')
        .select('id, clinic_id, status, assigned_doctor_id')
        .eq('id', shiftId)
        .single()

      if (shiftErr || !shift) {
        return NextResponse.json({ ok: false, error: 'Guardia no encontrada' }, { status: 404 })
      }
      if (shift.clinic_id !== user.id) {
        return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 })
      }
      if (shift.status !== 'filled') {
        return NextResponse.json({ ok: false, error: 'La guardia no tiene un médico asignado' }, { status: 409 })
      }

      const assignedDoctorId = shift.assigned_doctor_id

      const { error: shiftUpdateErr } = await admin
        .from('shifts')
        .update({ status: 'open', assigned_doctor_id: null })
        .eq('id', shiftId)

      if (shiftUpdateErr) {
        console.error('[cancel-assignment] clinic shift reset:', shiftUpdateErr.message)
        return NextResponse.json({ ok: false, error: 'Error al desasignar la guardia' }, { status: 500 })
      }

      // El médico desasignado vuelve a ser postulante (pending)
      if (assignedDoctorId) {
        const { error: appUpdateErr, data: updatedRows } = await admin
          .from('shift_applications')
          .update({ status: 'pending' })
          .eq('shift_id', shiftId)
          .eq('doctor_id', assignedDoctorId)
          .select()

        if (appUpdateErr) {
          console.error('[cancel-assignment] app reset error:', appUpdateErr.message)
        } else if (!updatedRows || updatedRows.length === 0) {
          // No existe la aplicación — la recreamos para que quede postulado
          console.warn('[cancel-assignment] no app row found for doctor, inserting pending')
          const { error: insertErr } = await admin
            .from('shift_applications')
            .insert({ shift_id: shiftId, doctor_id: assignedDoctorId, status: 'pending' })
          if (insertErr) {
            console.error('[cancel-assignment] app recreate error:', insertErr.message)
          }
        }
      }

      return NextResponse.json({ ok: true })
    }

    if (account?.role !== 'doctor') {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 })
    }

    // ── Médico cancela guardia confirmada (actor: 'doctor') ───────────────────
    if (actor === 'doctor') {
      const { data: shift, error: shiftErr } = await admin
        .from('shifts')
        .select('id, status, assigned_doctor_id')
        .eq('id', shiftId)
        .single()

      if (shiftErr || !shift) {
        return NextResponse.json({ ok: false, error: 'Guardia no encontrada' }, { status: 404 })
      }
      if (shift.status !== 'filled' || shift.assigned_doctor_id !== user.id) {
        return NextResponse.json({ ok: false, error: 'No podés cancelar esta guardia' }, { status: 409 })
      }

      const { error: shiftUpdateErr } = await admin
        .from('shifts')
        .update({ status: 'open', assigned_doctor_id: null })
        .eq('id', shiftId)

      if (shiftUpdateErr) {
        console.error('[cancel-assignment] doctor shift reset:', shiftUpdateErr.message)
        return NextResponse.json({ ok: false, error: 'Error al cancelar la guardia' }, { status: 500 })
      }

      await admin
        .from('shift_applications')
        .update({ status: 'withdrawn' })
        .eq('shift_id', shiftId)
        .eq('doctor_id', user.id)

      return NextResponse.json({ ok: true })
    }

    // ── Médico retira postulación pendiente ───────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: rpcErr } = await (supabase as any).rpc('withdraw_application', {
      p_shift_id: shiftId,
    })

    if (rpcErr) {
      return NextResponse.json({ ok: false, error: rpcErr.message ?? 'Error al retirar la postulación' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[cancel-assignment]', e)
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }
}
