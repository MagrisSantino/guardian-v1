import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabaseAdmin'
import { createShiftSchemaRefined } from '@/lib/schemas/shift'

export async function POST(request: NextRequest) {
  try {
    const parsed = createShiftSchemaRefined.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 })
    }
    const data = parsed.data

    const supabase = await createSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
    }

    const admin = createSupabaseAdmin()
    const { data: account, error: accountErr } = await admin
      .from('accounts')
      .select('role, verified_at')
      .eq('id', user.id)
      .single()

    if (accountErr || !account) {
      return NextResponse.json({ ok: false, error: 'Cuenta no encontrada' }, { status: 403 })
    }
    if (account.role !== 'clinic') {
      return NextResponse.json({ ok: false, error: 'Solo clínicas pueden publicar guardias' }, { status: 403 })
    }
    if (!account.verified_at) {
      return NextResponse.json({ ok: false, error: 'Tu clínica aún no fue verificada' }, { status: 403 })
    }

    const categoryLower = data.shift_category.toLowerCase()
    const categoryLabel = categoryLower.charAt(0).toUpperCase() + categoryLower.slice(1)
    const generatedTitle = data.title?.trim() || `${categoryLabel} de ${data.specialty_required}`

    const { data: inserted, error: insertErr } = await admin
      .from('shifts')
      .insert([{
        clinic_id: user.id,
        title: generatedTitle,
        specialty_required: data.specialty_required,
        starts_at: data.starts_at,
        ends_at: data.ends_at,
        price: data.price,
        payment_timeframe: data.payment_timeframe || null,
        viaticos: data.viaticos || null,
        shift_category: categoryLower,
        description: data.description || null,
        status: 'open',
      }])
      .select('id')
      .single()

    if (insertErr) {
      console.error('[shifts/create] insert:', insertErr.message)
      return NextResponse.json({ ok: false, error: 'Error al publicar la guardia' }, { status: 500 })
    }

    const shiftId = inserted?.id
    if (shiftId) {
      const notifHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
      const secret = process.env.NOTIFICATIONS_INTERNAL_SECRET
      if (secret) notifHeaders['X-Internal-Secret'] = secret
      void fetch(`${request.nextUrl.origin}/api/notifications`, {
        method: 'POST',
        headers: notifHeaders,
        body: JSON.stringify({ action: 'NEW_SHIFT', shift_id: shiftId }),
      }).catch((e) => console.error('[shifts/create] notif email:', e))
    }

    return NextResponse.json({ ok: true, shift_id: shiftId })
  } catch (e) {
    console.error('[shifts/create]', e)
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }
}
