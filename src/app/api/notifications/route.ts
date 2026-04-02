import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  sendBajaDeMedicoEmail,
  sendGuardiaAsignadaEmail,
  sendNuevaGuardiaPublicadaEmail,
  sendNuevaPostulacionEmail,
} from '@/lib/mailer'
import { GENERAL_SPECIALTIES } from '@/lib/specialties'

type NotificationAction =
  | 'NEW_SHIFT'
  | 'SHIFT_ASSIGNED'
  | 'NEW_APPLICATION'
  | 'DOCTOR_CANCELLED'

type ProfilesRow = {
  id: string
  role: string | null
  full_name: string | null
  admin_name: string | null
  is_verified: boolean | null
  specialty?: string | null
}

type ShiftRow = {
  id: string
  title: string | null
  shift_category: string | null
  specialty_required: string | null
  date_time: string | null
  duration_hours: number | null
  price: number | null
  clinic_id: string
  professional_id: string | null
}

type NotificationsRequestBody = {
  action: NotificationAction
  shift_id?: string
  professional_id?: string
  doctor_id?: string
}

function getActionBodyGuard(body: unknown): NotificationsRequestBody | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Partial<NotificationsRequestBody>
  if (!b.action) return null
  return b as NotificationsRequestBody
}

/** Para logs: no imprimir el correo completo en terminal. */
function maskEmail(email: string): string {
  const at = email.indexOf('@')
  if (at <= 0) return '***'
  const user = email.slice(0, at)
  const domain = email.slice(at + 1)
  const prefix = user.length <= 2 ? user : `${user.slice(0, 2)}…`
  return `${prefix}@${domain}`
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY'
  )
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function getEmailByUserId(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId)
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

async function getShiftOrThrow(shiftId: string): Promise<ShiftRow> {
  const { data, error } = await supabaseAdmin
    .from('shifts')
    .select('id,title,shift_category,specialty_required,date_time,duration_hours,price,clinic_id,professional_id')
    .eq('id', shiftId)
    .single()

  if (error) throw new Error(`Error consultando shift: ${error.message}`)
  if (!data) throw new Error('Shift no encontrada')

  return data as unknown as ShiftRow
}

async function getProfileOrThrow(profileId: string): Promise<ProfilesRow> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id,role,full_name,admin_name,is_verified')
    .eq('id', profileId)
    .single()

  if (error) throw new Error(`Error consultando profile: ${error.message}`)
  if (!data) throw new Error('Profile no encontrada')

  return data as unknown as ProfilesRow
}

async function getVerifiedDoctors(): Promise<ProfilesRow[]> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id,role,full_name,admin_name,is_verified,specialty')
    .eq('role', 'doctor')
    .eq('is_verified', true)

  if (error) throw new Error(`Error consultando médicos verificados: ${error.message}`)
  return (data ?? []) as unknown as ProfilesRow[]
}

/**
 * Determina si un médico debe recibir el mail de una guardia con la especialidad dada.
 * - Guardias generales (Generalista, Médico Clínico, Medicina de Emergencias): todos los médicos verificados.
 * - Guardias con especialidad específica: solo médicos que tengan esa especialidad en su perfil
 *   (con verified=true, o sin campo verified para compatibilidad con registros previos).
 */
function doctorMatchesSpecialty(doctor: ProfilesRow, shiftSpecialty: string | null): boolean {
  if (!shiftSpecialty || GENERAL_SPECIALTIES.has(shiftSpecialty)) return true

  if (!doctor.specialty) return false
  try {
    const specialties = JSON.parse(doctor.specialty)
    if (!Array.isArray(specialties)) return false
    return specialties.some(
      (s: any) =>
        String(s?.name ?? '') === shiftSpecialty &&
        // Si el campo verified no existe (registro pre-implementación) lo consideramos válido
        (s?.verified === true || s?.verified === undefined)
    )
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = getActionBodyGuard(await request.json())
    if (!body) {
      return NextResponse.json({ ok: false, error: 'Body inválido' }, { status: 400 })
    }

    if (!body.shift_id) {
      return NextResponse.json({ ok: false, error: 'Falta shift_id' }, { status: 400 })
    }

    const shift = await getShiftOrThrow(body.shift_id)

    const shiftTitle = shift.title || 'Guardia'

    const flowLabel: Record<NotificationAction, string> = {
      NEW_SHIFT: 'Clínica publica guardia → mail a cada médico verificado',
      NEW_APPLICATION: 'Médico se postula → mail a la clínica',
      SHIFT_ASSIGNED: 'Clínica asigna médico → mail al médico',
      DOCTOR_CANCELLED: 'Médico se da de baja (asignado) → mail a la clínica',
    }

    console.log('[notifications] ▶ inicio', {
      flujo: flowLabel[body.action],
      action: body.action,
      shift_id: body.shift_id,
      guardia: shiftTitle,
    })

    const tasks: Array<Promise<unknown>> = []

    if (body.action === 'NEW_SHIFT') {
      const clinicProfile = await getProfileOrThrow(shift.clinic_id)
      const clinicName = clinicProfile.full_name || null

      const allDoctors = await getVerifiedDoctors()
      const doctors = allDoctors.filter(doc => doctorMatchesSpecialty(doc, shift.specialty_required))
      console.log(
        `[notifications] NEW_SHIFT: ${doctors.length}/${allDoctors.length} médico(s) coinciden con especialidad "${shift.specialty_required ?? 'general'}" → enviando correos`,
      )
      for (const doc of doctors) {
        tasks.push((async () => {
          const email = await getEmailByUserId(doc.id)
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
              dateTime: shift.date_time,
              price: shift.price,
            })
            console.log(
              `[notifications] ✓ mail OK NEW_SHIFT → ${maskEmail(email)} | ${doc.full_name ?? doc.id}`,
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
      if (!shift.professional_id) {
        return NextResponse.json({ ok: false, error: 'Falta professional_id en la guardia' }, { status: 400 })
      }

      const doctorProfile = await getProfileOrThrow(shift.professional_id)
      const clinicProfile = await getProfileOrThrow(shift.clinic_id)

      const clinicName = clinicProfile.full_name || null

      tasks.push((async () => {
        const email = await getEmailByUserId(doctorProfile.id)
        if (!email) {
          console.log(
            `[notifications] SHIFT_ASSIGNED omitido: médico sin email en Auth | id=${doctorProfile.id}`,
          )
          return
        }
        try {
          await sendGuardiaAsignadaEmail({
            toEmail: email,
            toName: doctorProfile.full_name,
            shiftTitle,
            clinicName,
            dateTime: shift.date_time,
          })
          console.log(
            `[notifications] ✓ mail OK SHIFT_ASSIGNED → ${maskEmail(email)} | ${doctorProfile.full_name ?? doctorProfile.id} | clínica: ${clinicName ?? '—'}`,
          )
        } catch (e) {
          console.error(`[notifications] mail fallido SHIFT_ASSIGNED → ${maskEmail(email)}:`, e)
        }
      })())
    }

    if (body.action === 'NEW_APPLICATION') {
      const professionalId = body.professional_id ?? body.doctor_id
      let doctorProfile: ProfilesRow | null = null

      if (professionalId) {
        doctorProfile = await getProfileOrThrow(professionalId)
      } else {
        const { data, error } = await supabaseAdmin
          .from('shift_applications')
          .select('professional_id')
          .eq('shift_id', body.shift_id)
          .eq('status', 'pending')
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) throw new Error(`Error consultando aplicación: ${error.message}`)
        const pid = data?.professional_id as string | undefined
        if (pid) doctorProfile = await getProfileOrThrow(pid)
      }

      if (!doctorProfile) {
        return NextResponse.json({ ok: false, error: 'No se pudo determinar professional_id' }, { status: 400 })
      }

      const clinicProfile = await getProfileOrThrow(shift.clinic_id)

      tasks.push((async () => {
        const email = await getEmailByUserId(clinicProfile.id)
        if (!email) {
          console.log(
            `[notifications] NEW_APPLICATION omitido: clínica sin email en Auth | clinic_id=${clinicProfile.id}`,
          )
          return
        }
        try {
          await sendNuevaPostulacionEmail({
            toEmail: email,
            clinicName: clinicProfile.full_name,
            doctorName: doctorProfile.full_name,
            shiftTitle,
            dateTime: shift.date_time,
          })
          console.log(
            `[notifications] ✓ mail OK NUEVA_POSTULACIÓN → ${maskEmail(email)} | clínica: ${clinicProfile.full_name ?? clinicProfile.id} | postulante: ${doctorProfile.full_name ?? doctorProfile.id}`,
          )
        } catch (e) {
          console.error(`[notifications] mail fallido NEW_APPLICATION → ${maskEmail(email)}:`, e)
        }
      })())
    }

    if (body.action === 'DOCTOR_CANCELLED') {
      const clinicProfile = await getProfileOrThrow(shift.clinic_id)

      tasks.push((async () => {
        const email = await getEmailByUserId(clinicProfile.id)
        if (!email) {
          console.log(
            `[notifications] DOCTOR_CANCELLED omitido: clínica sin email en Auth | clinic_id=${clinicProfile.id}`,
          )
          return
        }
        try {
          await sendBajaDeMedicoEmail({
            toEmail: email,
            clinicName: clinicProfile.full_name,
            shiftTitle,
            dateTime: shift.date_time,
          })
          console.log(
            `[notifications] ✓ mail OK BAJA_MÉDICO → ${maskEmail(email)} | clínica: ${clinicProfile.full_name ?? clinicProfile.id}`,
          )
        } catch (e) {
          console.error(`[notifications] mail fallido DOCTOR_CANCELLED → ${maskEmail(email)}:`, e)
        }
      })())
    }

    if (tasks.length === 0) {
      console.log('[notifications] ■ fin (sin tareas)', {
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
          console.error('[notifications] ✗ envío fallido:', r.reason)
        }
      }
    }
    console.log('[notifications] ■ fin resumen', {
      flujo: flowLabel[body.action],
      action: body.action,
      tareas_encoladas: results.length,
      exitosas: results.length - rejected.length,
      fallidas: rejected.length,
    })

    return NextResponse.json({ ok: true, action: body.action, dispatched: tasks.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[notifications] ✗ error fatal:', message, err)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
