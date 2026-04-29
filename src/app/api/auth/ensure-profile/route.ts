import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabaseAdmin'

function mapRole(rawRole: unknown): 'doctor' | 'clinic' {
  const normalized = String(rawRole ?? '').trim().toLowerCase()
  if (normalized === 'clinic_admin' || normalized === 'clinica' || normalized === 'clinic') return 'clinic'
  return 'doctor'
}

function nullIfEmpty(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

export async function POST() {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      console.error('[ensure-profile] auth error:', authErr?.message)
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
    }

    if (!user.email) {
      return NextResponse.json(
        { ok: false, error: 'Tu cuenta no tiene email asociado en auth.' },
        { status: 400 },
      )
    }

    const admin = createSupabaseAdmin()
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>
    const role = mapRole(meta.role)
    const emailPrefix = user.email.split('@')[0]?.trim() || 'Usuario'
    const fullName =
      String(meta.full_name ?? meta.institution_name ?? emailPrefix).trim() || 'Usuario'

    const { data: existing, error: lookupErr } = await admin
      .from('accounts')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle()

    if (lookupErr) {
      console.error('[ensure-profile] lookup error:', lookupErr)
      return NextResponse.json(
        { ok: false, error: 'Error consultando perfil', details: lookupErr.message },
        { status: 500 },
      )
    }

    if (existing?.role) {
      // Cuenta ya existe — asegurar que también exista la fila de profile
      // (si quedó a medias por un fallo previo, se crea una mínima ahora)
      if (existing.role === 'doctor') {
        await admin.from('doctor_profiles').upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true })
      } else if (existing.role === 'clinic') {
        await admin.from('clinic_profiles').upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true })
      }
      return NextResponse.json({ ok: true, created: false, role: existing.role })
    }

    // Insert accounts (paso crítico — si falla, abortamos)
    const { error: accountErr } = await admin.from('accounts').insert({
      id: user.id,
      role,
      email: user.email,
      full_name: fullName,
      phone: nullIfEmpty(meta.phone),
      whatsapp: nullIfEmpty(meta.whatsapp),
    })

    if (accountErr) {
      console.error('[ensure-profile] account insert error:', accountErr)
      return NextResponse.json(
        { ok: false, error: 'No se pudo crear la cuenta', details: accountErr.message },
        { status: 500 },
      )
    }

    // Insert role-specific profile (best-effort: si falla con datos completos,
    // hacemos un insert mínimo para que el usuario pueda loguearse y completar
    // desde /perfil. No bloqueamos el login por un campo del metadata).
    if (role === 'doctor') {
      const fullPayload = {
        id: user.id,
        dni: nullIfEmpty(meta.dni),
        matricula: nullIfEmpty(meta.matricula),
        cuit: nullIfEmpty(meta.cuit),
        birth_date: nullIfEmpty(meta.birth_date),
        university: nullIfEmpty(meta.university),
        location_maps: nullIfEmpty(meta.location_maps),
        km_from_cba:
          meta.km_from_cba != null && !Number.isNaN(Number(meta.km_from_cba))
            ? Number(meta.km_from_cba)
            : null,
      }
      const { error: doctorErr } = await admin.from('doctor_profiles').insert(fullPayload)
      if (doctorErr) {
        console.error('[ensure-profile] doctor_profiles full insert failed, retrying minimal:', doctorErr)
        const { error: minimalErr } = await admin.from('doctor_profiles').insert({ id: user.id })
        if (minimalErr) {
          console.error('[ensure-profile] doctor_profiles minimal insert error:', minimalErr)
          return NextResponse.json(
            { ok: false, error: 'No se pudo crear el perfil de médico', details: minimalErr.message },
            { status: 500 },
          )
        }
      }
    } else if (role === 'clinic') {
      const clinicAddress = nullIfEmpty(meta.location_maps) ?? nullIfEmpty(meta.address)
      const fullPayload = {
        id: user.id,
        cuit: nullIfEmpty(meta.cuit),
        admin_name: nullIfEmpty(meta.admin_name),
        provider_type: nullIfEmpty(meta.provider_type),
        address: clinicAddress,
        location_maps: clinicAddress,
      }
      const { error: clinicErr } = await admin.from('clinic_profiles').insert(fullPayload)
      if (clinicErr) {
        console.error('[ensure-profile] clinic_profiles full insert failed, retrying minimal:', clinicErr)
        const { error: minimalErr } = await admin.from('clinic_profiles').insert({ id: user.id })
        if (minimalErr) {
          console.error('[ensure-profile] clinic_profiles minimal insert error:', minimalErr)
          return NextResponse.json(
            { ok: false, error: 'No se pudo crear el perfil de clínica', details: minimalErr.message },
            { status: 500 },
          )
        }
      }
    }

    return NextResponse.json({ ok: true, created: true, role })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ensure-profile] fatal:', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
