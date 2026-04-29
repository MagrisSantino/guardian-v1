import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  sendBajaDeMedicoEmail,
  sendGuardiaAsignadaEmail,
  sendNuevaGuardiaPublicadaEmail,
  sendNuevaPostulacionEmail,
} from '@/lib/mailer'
import { isGeneralSpecialty } from '@/lib/specialties'

type NotificationAction =
  | 'NEW_SHIFT'
  | 'SHIFT_ASSIGNED'
  | 'NEW_APPLICATION'
  | 'DOCTOR_CANCELLED'

const _rateLimitMap = new Map<string, number>()
const RATE_LIMIT_MS = 30_000

function isRateLimited(key: string): boolean {
  const last = _rateLimitMap.get(key)
  const now = Date.now()
  if (last && now - last < RATE_LIMIT_MS) return true
  _rateLimitMap.set(key, now)
  if (_rateLimitMap.size > 10_000) {
    for (const [k, v] of _rateLimitMap) {
      if (now - v > RATE_LIMIT_MS * 2) _rateLimitMap.delete(k)
    }
  }
  return false
}

type AccountRow = {
  id: string
  role: string | null
  full_name: string | null
  verified_at: string | null
}

type DoctorPublicRow = {
  id: string
  full_name: string | null
  specialty: string[] | null
  specialty_verified: string[] | null
}

type ShiftRow = {
  id: string
  title: string | null
  shift_category: string | null
  specialty_required: string | null
  starts_at: string | null
  ends_at: string | null
  price: number | null
  clinic_id: string
  assigned_doctor_id: string | null
}

type NotificationsRequestBody = {
  action: NotificationAction
  shift_id?: string
  doctor_id?: string
}

function getActionBodyGuard(body: unknown): NotificationsRequestBody | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Partial<NotificationsRequestBody>
  if (!b.action) return null
  return b as NotificationsRequestBody
}

function maskEmail(email: string): string {
  const at = email.indexOf('@')
  if (at <= 0) return '***'
  const user = email.slice(0, at)
  const domain = email.slice(at + 1)
  const prefix = user.length <= 2 ? user : `${user.slice(0, 2)}…`
  return `${prefix}@${domain}`
}

function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdmin>

async function getEmailByUserId(admin: SupabaseAdminClient, userId: string): Promise<string | null> {
  try {
    const { data, error } = await admin.auth.admin.getUserById(userId)
    if (error) {
      console.error(`Error obteniendo email de userId=${userId}: ${error.message}`)
      return null
    }
    return data?.user?.email ?? null
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`Error obteniendo email de userId=${userId}: ${msg}`)
    return null
  }
}

async function getShiftOrThrow(admin: SupabaseAdminClient, shiftId: string): Promise<ShiftRow> {
  const { data, error } = await admin
    .from('shifts')
    .select('id,title,shift_category,specialty_required,starts_at,ends_at,price,clinic_id,assigned_doctor_id')
    .eq('id', shiftId)
    .single()

  if (error) throw new Error(`Error consultando shift: ${error.message}`)
  if (!data) throw new Error('Shift no encontrada')

  return data as unknown as ShiftRow
}

async function getAccountOrThrow(admin: SupabaseAdminClient, accountId: string): Promise<AccountRow> {
  const { data, error } = await admin
    .from('accounts')
    .select('id,role,full_name,verified_at')
    .eq('id', accountId)
    .single()

  if (error) throw new Error(`Error consultando account: ${error.message}`)
  if (!data) throw new Error('Account no encontrada')

  return data as unknown as AccountRow
}

async function getVerifiedDoctors(admin: SupabaseAdminClient): Promise<DoctorPublicRow[]> {
  const { data, error } = await admin
    .from('accounts_public')
    .select('id,full_name,specialty,specialty_verified')
    .eq('role', 'doctor')
    .eq('is_verified', true)

  if (error) throw new Error(`Error consultando médicos verificados: ${error.message}`)
  return (data ?? []) as unknown as DoctorPublicRow[]
}

function doctorMatchesSpecialty(doctor: DoctorPublicRow, shiftSpecialty: string | null): boolean {
  if (isGeneralSpecialty(shiftSpecialty)) return true
  if (!shiftSpecialty) return false
  return doctor.specialty_verified?.includes(shiftSpecialty) ?? false
}

export async function POST(request: NextRequest) {
  try {
    const internalSecret = process.env.NOTIFICATIONS_INTERNAL_SECRET
    const providedSecret = request.headers.get('X-Internal-Secret')
    const isInternalCall = internalSecret && providedSecret === internalSecret

    if (!isInternalCall) {
      const cookieStore = await cookies()
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!supabaseUrl || !supabaseAnonKey) {
        return NextResponse.json({ ok: false, error: 'Configuración del servidor incompleta' }, { status: 500 })
      }
      const supabaseAuth = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(list) {
            try { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
          },
        },
      })
      const { data: { user } } = await supabaseAuth.auth.getUser()
      if (!user) {
        return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
      }
    }

    const supabaseAdmin = createSupabaseAdmin()

    const body = getActionBodyGuard(await request.json())
    if (!body) {
      return NextResponse.json({ ok: false, error: 'Body inválido' }, { status: 400 })
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const rlKey = `${ip}:${body.action}:${body.shift_id ?? ''}`
    if (isRateLimited(rlKey)) {
      return NextResponse.json({ ok: false, error: 'Demasiadas solicitudes' }, { status: 429 })
    }

    if (!body.shift_id) {
      return NextResponse.json({ ok: false, error: 'Falta shift_id' }, { status: 400 })
    }

    const shift = await getShiftOrThrow(supabaseAdmin, body.shift_id)

    const shiftTitle = shift.title || 'Guardia'

    const flowLabel: Record<NotificationAction, string> = {
      NEW_SHIFT: 'Clínica publica guardia → mail a cada médico verificado',
      NEW_APPLICATION: 'Médico se postula → mail a la clínica',
      SHIFT_ASSIGNED: 'Clínica asigna médico → mail al médico',
      DOCTOR_CANCELLED: 'Médico se da de baja (asignado) → mail a la clínica',
    }

    console.log('[notifications] inicio', {
      flujo: flowLabel[body.action],
      action: body.action,
      shift_id: body.shift_id,
      guardia: shiftTitle,
    })

    const tasks: Array<Promise<unknown>> = []

    if (body.action === 'NEW_SHIFT') {
      const clinicAccount = await getAccountOrThrow(supabaseAdmin, shift.clinic_id)
      const clinicName = clinicAccount.full_name || null

      const allDoctors = await getVerifiedDoctors(supabaseAdmin)
      const doctors = allDoctors.filter(doc => doctorMatchesSpecialty(doc, shift.specialty_required))
      console.log(
        `[notifications] NEW_SHIFT: ${doctors.length}/${allDoctors.length} médico(s) coinciden con especialidad "${shift.specialty_required ?? 'general'}" → enviando correos`,
      )
      for (const doc of doctors) {
        tasks.push((async () => {
          const email = await getEmailByUserId(supabaseAdmin, doc.id)
          if (!email) {
            console.log(
              `[notifications] NEW_SHIFT omitido: sin email en Auth | médico_id=${doc.id} nombre=${doc.full_name ?? '—'}`,
            )
            return
          }
          try {
            await sendNuevaGuardiaPublicadaEmail({
              toEmail: email,
              toName: doc.full_name,
              shiftTitle,
              clinicName,
              shiftCategory: shift.shift_category,
              specialtyRequired: shift.specialty_required,
              dateTime: shift.starts_at,
              price: shift.price,
            })
            console.log(
              `[notifications] mail OK NEW_SHIFT → ${maskEmail(email)} | ${doc.full_name ?? doc.id}`,
            )
          } catch (e) {
            console.error(
              `[notifications] mail fallido NEW_SHIFT → ${maskEmail(email)} | ${doc.full_name ?? doc.id}:`,
              e,
            )
          }
        })())
      }
    }

    if (body.action === 'SHIFT_ASSIGNED') {
      if (!shift.assigned_doctor_id) {
        return NextResponse.json({ ok: false, error: 'Falta assigned_doctor_id en la guardia' }, { status: 400 })
      }

      const doctorAccount = await getAccountOrThrow(supabaseAdmin, shift.assigned_doctor_id)
      const clinicAccount = await getAccountOrThrow(supabaseAdmin, shift.clinic_id)
      const clinicName = clinicAccount.full_name || null

      tasks.push((async () => {
        const email = await getEmailByUserId(supabaseAdmin, doctorAccount.id)
        if (!email) {
          console.log(
            `[notifications] SHIFT_ASSIGNED omitido: médico sin email en Auth | id=${doctorAccount.id}`,
          )
          return
        }
        try {
          await sendGuardiaAsignadaEmail({
            toEmail: email,
            toName: doctorAccount.full_name,
            shiftTitle,
            clinicName,
            dateTime: shift.starts_at,
          })
          console.log(
            `[notifications] mail OK SHIFT_ASSIGNED → ${maskEmail(email)} | ${doctorAccount.full_name ?? doctorAccount.id} | clínica: ${clinicName ?? '—'}`,
          )
        } catch (e) {
          console.error(`[notifications] mail fallido SHIFT_ASSIGNED → ${maskEmail(email)}:`, e)
        }
      })())
    }

    if (body.action === 'NEW_APPLICATION') {
      const doctorId = body.doctor_id
      let doctorAccount: AccountRow | null = null

      if (doctorId) {
        doctorAccount = await getAccountOrThrow(supabaseAdmin, doctorId)
      } else {
        const { data, error } = await supabaseAdmin
          .from('shift_applications')
          .select('doctor_id')
          .eq('shift_id', body.shift_id)
          .eq('status', 'pending')
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) throw new Error(`Error consultando aplicación: ${error.message}`)
        const did = data?.doctor_id as string | undefined
        if (did) doctorAccount = await getAccountOrThrow(supabaseAdmin, did)
      }

      if (!doctorAccount) {
        return NextResponse.json({ ok: false, error: 'No se pudo determinar doctor_id' }, { status: 400 })
      }

      const clinicAccount = await getAccountOrThrow(supabaseAdmin, shift.clinic_id)

      tasks.push((async () => {
        const email = await getEmailByUserId(supabaseAdmin, clinicAccount.id)
        if (!email) {
          console.log(
            `[notifications] NEW_APPLICATION omitido: clínica sin email en Auth | clinic_id=${clinicAccount.id}`,
          )
          return
        }
        try {
          await sendNuevaPostulacionEmail({
            toEmail: email,
            clinicName: clinicAccount.full_name,
            doctorName: doctorAccount.full_name,
            shiftTitle,
            dateTime: shift.starts_at,
          })
          console.log(
            `[notifications] mail OK NUEVA_POSTULACION → ${maskEmail(email)} | clínica: ${clinicAccount.full_name ?? clinicAccount.id} | postulante: ${doctorAccount.full_name ?? doctorAccount.id}`,
          )
        } catch (e) {
          console.error(`[notifications] mail fallido NEW_APPLICATION → ${maskEmail(email)}:`, e)
        }
      })())
    }

    if (body.action === 'DOCTOR_CANCELLED') {
      const clinicAccount = await getAccountOrThrow(supabaseAdmin, shift.clinic_id)

      tasks.push((async () => {
        const email = await getEmailByUserId(supabaseAdmin, clinicAccount.id)
        if (!email) {
          console.log(
            `[notifications] DOCTOR_CANCELLED omitido: clínica sin email en Auth | clinic_id=${clinicAccount.id}`,
          )
          return
        }
        try {
          await sendBajaDeMedicoEmail({
            toEmail: email,
            clinicName: clinicAccount.full_name,
            shiftTitle,
            dateTime: shift.starts_at,
          })
          console.log(
            `[notifications] mail OK BAJA_MEDICO → ${maskEmail(email)} | clínica: ${clinicAccount.full_name ?? clinicAccount.id}`,
          )
        } catch (e) {
          console.error(`[notifications] mail fallido DOCTOR_CANCELLED → ${maskEmail(email)}:`, e)
        }
      })())
    }

    if (tasks.length === 0) {
      console.log('[notifications] fin (sin tareas)', {
        flujo: flowLabel[body.action],
        action: body.action,
        nota: 'Ningún envío encolado (revisá condiciones del action)',
      })
      return NextResponse.json({ ok: true, action: body.action, dispatched: 0, note: 'Sin destinatarios con email' })
    }

    const results = await Promise.allSettled(tasks)
    const rejected = results.filter((r) => r.status === 'rejected')
    if (rejected.length > 0) {
      for (const r of rejected) {
        if (r.status === 'rejected') {
          console.error('[notifications] envío fallido:', r.reason)
        }
      }
    }
    console.log('[notifications] fin resumen', {
      flujo: flowLabel[body.action],
      action: body.action,
      tareas_encoladas: results.length,
      exitosas: results.length - rejected.length,
      fallidas: rejected.length,
    })

    return NextResponse.json({ ok: true, action: body.action, dispatched: tasks.length })
  } catch (err) {
    console.error('[notifications] error fatal:', err)
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }
}
