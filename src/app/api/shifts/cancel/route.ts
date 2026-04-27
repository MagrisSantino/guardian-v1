import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { shift_id?: string }
    const shiftId = body.shift_id?.trim()
    if (!shiftId) return NextResponse.json({ ok: false, error: 'Falta shift_id' }, { status: 400 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey)
      return NextResponse.json({ ok: false, error: 'Configuración incompleta' }, { status: 500 })

    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(list) { try { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
      },
    })

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })

    const admin = createSupabaseAdmin()

    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'clinic_admin' && profile?.role !== 'super_admin')
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 })

    const { data: shift, error: shiftErr } = await admin
      .from('shifts')
      .select('id, clinic_id, status, title, professional_id')
      .eq('id', shiftId)
      .single()

    if (shiftErr || !shift) return NextResponse.json({ ok: false, error: 'Guardia no encontrada' }, { status: 404 })
    if (shift.clinic_id !== user.id && profile?.role !== 'super_admin')
      return NextResponse.json({ ok: false, error: 'No tenés permiso sobre esta guardia' }, { status: 403 })
    if (shift.status === 'completed' || shift.status === 'cancelled')
      return NextResponse.json({ ok: false, error: 'La guardia ya está en estado terminal' }, { status: 409 })

    // If filled, mark the assigned doctor's application as withdrawn first
    if (shift.status === 'filled' && shift.professional_id) {
      await admin
        .from('shift_applications')
        .update({ status: 'withdrawn' })
        .eq('shift_id', shiftId)
        .eq('professional_id', shift.professional_id)
        .eq('status', 'accepted')
    }

    // Cancel the shift (trigger guardian_notify_shift_cancelled fires automatically)
    const { error: updateErr } = await admin
      .from('shifts')
      .update({ status: 'cancelled', professional_id: null })
      .eq('id', shiftId)

    if (updateErr) {
      console.error('[shifts/cancel] update:', updateErr.message)
      return NextResponse.json({ ok: false, error: 'Error al cancelar la guardia' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[shifts/cancel]', e)
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }
}
