import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { application_id?: string }
    const applicationId = body.application_id?.trim()
    if (!applicationId) {
      return NextResponse.json({ ok: false, error: 'Falta application_id' }, { status: 400 })
    }

    const supabase = await createSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
    }

    const admin = createSupabaseAdmin()
    const { data: account, error: accountErr } = await admin
      .from('accounts')
      .select('role')
      .eq('id', user.id)
      .single()

    if (accountErr || !account) {
      return NextResponse.json({ ok: false, error: 'Cuenta no encontrada' }, { status: 403 })
    }
    if (account.role !== 'clinic' && account.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Acceso denegado. Rol no autorizado.' }, { status: 403 })
    }

    const { data: app, error: appErr } = await admin
      .from('shift_applications')
      .select('shift_id, doctor_id')
      .eq('id', applicationId)
      .single()

    if (appErr || !app) {
      return NextResponse.json({ ok: false, error: 'Postulación no encontrada' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: rpcErr } = await (supabase as any).rpc('accept_shift_application', {
      p_application_id: applicationId,
    })

    if (rpcErr) {
      console.error('[assign] rpc accept_shift_application:', rpcErr.message)
      if (rpcErr.message.includes('APPLICATION_NOT_FOUND'))
        return NextResponse.json({ ok: false, error: 'Postulación no encontrada' }, { status: 404 })
      if (rpcErr.message.includes('APPLICATION_NOT_PENDING'))
        return NextResponse.json({ ok: false, error: 'La postulación ya no está pendiente' }, { status: 409 })
      if (rpcErr.message.includes('SHIFT_NOT_OPEN'))
        return NextResponse.json({ ok: false, error: 'La guardia ya no está abierta' }, { status: 409 })
      if (rpcErr.message.includes('NOT_AUTHORIZED'))
        return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 })
      return NextResponse.json({ ok: false, error: 'Error al asignar la guardia' }, { status: 500 })
    }

    void (async () => {
      try {
        const notifHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
        const internalSecret = process.env.NOTIFICATIONS_INTERNAL_SECRET
        if (internalSecret) notifHeaders['X-Internal-Secret'] = internalSecret
        const res = await fetch(`${request.nextUrl.origin}/api/notifications`, {
          method: 'POST',
          headers: notifHeaders,
          body: JSON.stringify({
            action: 'SHIFT_ASSIGNED',
            shift_id: app.shift_id,
            doctor_id: app.doctor_id,
          }),
        })
        if (!res.ok) {
          const t = await res.text().catch(() => '')
          console.error('[assign] /api/notifications SHIFT_ASSIGNED status=', res.status, t)
        }
      } catch (mailErr) {
        console.error('[assign] correo SHIFT_ASSIGNED (no aborta respuesta):', mailErr)
      }
    })()

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[assign]', e)
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }
}
