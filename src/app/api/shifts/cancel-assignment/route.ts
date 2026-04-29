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

    if (account?.role !== 'doctor') {
      return NextResponse.json({ ok: false, error: 'Solo médicos pueden retirarse de una guardia' }, { status: 403 })
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
