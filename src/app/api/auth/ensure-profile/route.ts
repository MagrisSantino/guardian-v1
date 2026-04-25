import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

function mapRole(rawRole: unknown): 'doctor' | 'clinic_admin' {
  const normalized = String(rawRole ?? '').trim().toLowerCase()
  if (normalized === 'clinic_admin' || normalized === 'clinica') return 'clinic_admin'
  return 'doctor'
}

export async function POST() {
  try {
    const cookieStore = await cookies()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { ok: false, error: 'Configuración del servidor incompleta' },
        { status: 500 },
      )
    }

    const supabaseAuth = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(list) {
          try {
            list.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Route Handler
          }
        },
      },
    })

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
    }

    const { data: existingProfile, error: profileErr } = await supabaseAuth
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileErr) {
      return NextResponse.json({ ok: false, error: profileErr.message }, { status: 500 })
    }

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>
    const role = mapRole(meta.role)
    const emailPrefix = (user.email ?? '').split('@')[0]?.trim() || 'Usuario'
    const fullName =
      String(
        meta.full_name ??
          meta.institution_name ??
          meta.admin_name ??
          emailPrefix,
      ).trim() || 'Usuario'

    if (existingProfile) {
      const { data: fullProfile } = await supabaseAuth
        .from('profiles')
        .select('role, location_maps, whatsapp')
        .eq('id', user.id)
        .single()

      const needsRolePatch = !existingProfile.role
      const needsWhatsappPatch = !fullProfile?.whatsapp && meta.whatsapp
      const needsLocationPatch = !fullProfile?.location_maps && meta.location_maps
      const needsMetaPatch = needsWhatsappPatch || needsLocationPatch

      if (needsRolePatch || needsMetaPatch) {
        const updatePayload: Record<string, unknown> = {}
        if (needsRolePatch) { updatePayload.role = role; updatePayload.full_name = fullName }
        if (needsMetaPatch) {
          if (needsWhatsappPatch) updatePayload.whatsapp = meta.whatsapp
          if (needsLocationPatch) {
            updatePayload.location_maps = meta.location_maps ?? null
            updatePayload.km_from_cba = meta.km_from_cba ?? null
            updatePayload.cuit = meta.cuit ?? null
            updatePayload.dni = meta.dni ?? null
            updatePayload.matricula = meta.matricula ?? null
            updatePayload.birth_date = meta.birth_date ?? null
          }
        }
        let { error: updateErr } = await supabaseAuth
          .from('profiles')
          .update(updatePayload)
          .eq('id', user.id)
        if (updateErr && /row-level security|permission denied/i.test(updateErr.message)) {
          try {
            const { createSupabaseAdmin } = await import('@/lib/supabaseAdmin')
            const admin = createSupabaseAdmin()
            const adminUpdate = await admin.from('profiles').update(updatePayload).eq('id', user.id)
            updateErr = adminUpdate.error ?? null
          } catch {}
        }
        if (updateErr) {
          return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 })
        }
      }
      return NextResponse.json({ ok: true, created: false, role: existingProfile.role || role })
    }

    const insertPayload: Record<string, unknown> = {
      id: user.id,
      role,
      full_name: fullName,
      email: user.email ?? null,
      whatsapp: meta.whatsapp ?? null,
      location_maps: meta.location_maps ?? null,
      km_from_cba: meta.km_from_cba ?? null,
      cuit: meta.cuit ?? null,
      dni: meta.dni ?? null,
      matricula: meta.matricula ?? null,
      birth_date: meta.birth_date ?? null,
    }

    let { error: insertErr } = await supabaseAuth.from('profiles').insert(insertPayload)
    if (insertErr && /row-level security|permission denied/i.test(insertErr.message)) {
      try {
        const { createSupabaseAdmin } = await import('@/lib/supabaseAdmin')
        const admin = createSupabaseAdmin()
        const adminInsert = await admin.from('profiles').insert(insertPayload)
        insertErr = adminInsert.error ?? null
      } catch (fallbackErr) {
        const msg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)
        console.error('[ensure-profile] fallback admin failed:', msg)
      }
    }

    if (insertErr) {
      console.error('[ensure-profile] insert failed:', insertErr.message)
      return NextResponse.json({ ok: false, error: insertErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, created: true, role })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
