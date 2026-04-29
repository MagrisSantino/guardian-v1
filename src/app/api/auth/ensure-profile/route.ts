import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabaseAdmin'

function mapRole(rawRole: unknown): 'doctor' | 'clinic' {
  const normalized = String(rawRole ?? '').trim().toLowerCase()
  if (normalized === 'clinic_admin' || normalized === 'clinica' || normalized === 'clinic') return 'clinic'
  return 'doctor'
}

export async function POST() {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
    }

    const admin = createSupabaseAdmin()
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>
    const role = mapRole(meta.role)
    const emailPrefix = (user.email ?? '').split('@')[0]?.trim() || 'Usuario'
    const fullName =
      String(meta.full_name ?? meta.institution_name ?? emailPrefix).trim() || 'Usuario'

    const { data: existing, error: lookupErr } = await admin
      .from('accounts')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle()

    if (lookupErr) {
      return NextResponse.json({ ok: false, error: lookupErr.message }, { status: 500 })
    }

    if (existing) {
      return NextResponse.json({ ok: true, created: false, role: existing.role })
    }

    const { error: accountErr } = await admin.from('accounts').insert({
      id: user.id,
      role,
      email: user.email ?? null,
      full_name: fullName,
      phone: (meta.phone as string) ?? null,
      whatsapp: (meta.whatsapp as string) ?? null,
    })

    if (accountErr) {
      return NextResponse.json({ ok: false, error: accountErr.message }, { status: 500 })
    }

    if (role === 'doctor') {
      const { error: doctorErr } = await admin.from('doctor_profiles').insert({
        id: user.id,
        dni: (meta.dni as string) ?? null,
        matricula: (meta.matricula as string) ?? null,
        cuit: (meta.cuit as string) ?? null,
        birth_date: (meta.birth_date as string) ?? null,
      })
      if (doctorErr) {
        return NextResponse.json({ ok: false, error: doctorErr.message }, { status: 500 })
      }
    }

    if (role === 'clinic') {
      const { error: clinicErr } = await admin.from('clinic_profiles').insert({
        id: user.id,
        cuit: (meta.cuit as string) ?? null,
        admin_name: (meta.admin_name as string) ?? null,
        provider_type: (meta.provider_type as string) ?? null,
      })
      if (clinicErr) {
        return NextResponse.json({ ok: false, error: clinicErr.message }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true, created: true, role })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
