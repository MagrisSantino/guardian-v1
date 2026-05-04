import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { shift_id?: string }
    const shiftId = body.shift_id?.trim()
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

      const { error: shiftUpdateErr } = await admin
        .from('shifts')
        .update({ status: 'open', assigned_doctor_id: null })
        .eq('id', shiftId)

      if (shiftUpdateErr) {
        console.error('[cancel-assignment] clinic shift reset:', shiftUpdateErr.message)
        return NextResponse.json({ ok: false, error: 'Error al desasignar la guardia' }, { status: 500 })
      }

      await admin
        .from('shift_applications')
        .update({ status: 'pending' })
        .eq('shift_id', shiftId)
        .eq('status', 'accepted')

      return NextResponse.json({ ok: true })
    }

    if (account?.role !== 'doctor') {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rpcResult, error: rpcErr } = await (supabase as any).rpc('withdraw_application', {
      p_shift_id: shiftId,
    })

    if (rpcErr) {
      return NextResponse.json({ ok: false, error: rpcErr.message ?? 'Error al retirar la postulación' }, { status: 500 })
    }

    const result = rpcResult as { ok: boolean; was_accepted: boolean } | null
    void result

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[cancel-assignment]', e)
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }
}
