import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { shift_id?: string; reason?: string }
    const shiftId = body.shift_id?.trim()
    if (!shiftId) {
      return NextResponse.json({ ok: false, error: 'Falta shift_id' }, { status: 400 })
    }
    const reason = body.reason?.trim() ?? null

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

    if (account?.role !== 'clinic' && account?.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rpcResult, error: rpcErr } = await (supabase as any).rpc('cancel_shift', {
      p_shift_id: shiftId,
      p_reason: reason,
    })

    if (rpcErr) {
      const msg = rpcErr.message ?? ''
      if (msg.includes('SHIFT_NOT_FOUND')) {
        return NextResponse.json({ ok: false, error: 'Guardia no encontrada' }, { status: 404 })
      }
      if (msg.includes('NOT_AUTHORIZED')) {
        return NextResponse.json({ ok: false, error: 'No tenés permiso sobre esta guardia' }, { status: 403 })
      }
      if (msg.includes('SHIFT_TERMINAL_STATE')) {
        return NextResponse.json({ ok: false, error: 'La guardia ya está en estado terminal' }, { status: 409 })
      }
      return NextResponse.json({ ok: false, error: 'Error al cancelar la guardia' }, { status: 500 })
    }

    void rpcResult

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[shifts/cancel]', e)
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }
}
