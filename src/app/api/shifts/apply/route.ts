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
      .select('role, verified_at')
      .eq('id', user.id)
      .single()

    if (account?.role !== 'doctor') {
      return NextResponse.json({ ok: false, error: 'Solo médicos pueden postularse' }, { status: 403 })
    }
    if (!account?.verified_at) {
      return NextResponse.json({ ok: false, error: 'Tu perfil no ha sido verificado' }, { status: 403 })
    }

    const { data: shift, error: shiftErr } = await admin
      .from('shifts')
      .select('id, clinic_id, status, title, starts_at')
      .eq('id', shiftId)
      .single()

    if (shiftErr || !shift) {
      return NextResponse.json({ ok: false, error: 'Guardia no encontrada' }, { status: 404 })
    }
    if (shift.status !== 'open') {
      return NextResponse.json({ ok: false, error: 'La guardia no está disponible' }, { status: 409 })
    }

    const { error: insertErr } = await admin
      .from('shift_applications')
      .insert({ shift_id: shiftId, doctor_id: user.id, status: 'pending' })

    if (insertErr) {
      if (insertErr.code === '23505' || insertErr.message.toLowerCase().includes('unique')) {
        return NextResponse.json({ ok: false, error: 'Ya tenés una postulación para esta guardia' }, { status: 409 })
      }
      if (insertErr.message.includes('SHIFT_OVERLAP')) {
        return NextResponse.json(
          { ok: false, error: 'Ya tenés una guardia asignada que se superpone con este horario' },
          { status: 409 },
        )
      }
      console.error('[apply] insert:', insertErr.message)
      return NextResponse.json({ ok: false, error: 'Error al registrar la postulación' }, { status: 500 })
    }

    await admin.from('notifications').insert({
      user_id: shift.clinic_id,
      shift_id: shiftId,
      type: 'new_application',
      title: 'Nueva postulación',
      body: `Un médico se postuló a tu guardia: ${shift.title}.`,
      link: '/panel-clinica',
    })

    void fetch(`${request.nextUrl.origin}/api/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.NOTIFICATIONS_INTERNAL_SECRET
          ? { 'X-Internal-Secret': process.env.NOTIFICATIONS_INTERNAL_SECRET }
          : {}),
      },
      body: JSON.stringify({ action: 'NEW_APPLICATION', shift_id: shiftId, doctor_id: user.id }),
    }).catch((err) => console.error('[apply] email (no aborta):', err))

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[apply]', e)
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }
}
