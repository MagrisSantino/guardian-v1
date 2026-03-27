import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

type SafeHtmlText = string | number | null | undefined

function escapeHtml(input: SafeHtmlText): string {
  const s = input == null ? '' : String(input)
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function formatDateTimeEs(dateTime: string | null | undefined): string {
  if (!dateTime) return '—'
  const d = new Date(dateTime)
  if (Number.isNaN(d.getTime())) return '—'
  const formatter = new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  return formatter.format(d)
}

const GUARDIAN_BRAND_PRIMARY = '#2563eb' // blue-600
const GUARDIAN_BRAND_SECONDARY = '#3b82f6' // blue-500

function renderBaseTemplate(params: {
  title: string
  subtitle?: string
  heading: string
  lead?: string
  details: Array<{ label: string; value: SafeHtmlText }>
}) {
  const detailsHtml = params.details
    .map(
      (d) => `
        <tr>
          <td class="label">${escapeHtml(d.label)}</td>
          <td class="value">${escapeHtml(d.value)}</td>
        </tr>
      `,
    )
    .join('')

  return `<!doctype html>
  <html>
    <body style="margin:0;padding:0;background:#f8fafc;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc;">
        <tr>
          <td align="center" style="padding:24px 12px;">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
              <tr>
                <td style="padding:22px 24px;background:linear-gradient(90deg, ${GUARDIAN_BRAND_PRIMARY}, ${GUARDIAN_BRAND_SECONDARY});">
                  <div style="display:flex;align-items:center;gap:12px;">
                    <div style="width:38px;height:38px;border-radius:12px;background:rgba(255,255,255,0.18);display:flex;align-items:center;justify-content:center;">
                      <span style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,'Apple Color Emoji','Segoe UI Emoji';color:#ffffff;font-weight:900;">G</span>
                    </div>
                    <div>
                      <div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial;font-size:12px;letter-spacing:0.12em;color:rgba(255,255,255,0.9);text-transform:uppercase;">
                        ${escapeHtml(params.title)}
                      </div>
                      <div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial;font-size:18px;color:#ffffff;font-weight:900;">
                        ${escapeHtml(params.heading)}
                      </div>
                      ${params.subtitle ? `<div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial;font-size:13px;color:rgba(255,255,255,0.95);margin-top:4px;">${escapeHtml(params.subtitle)}</div>` : ''}
                    </div>
                  </div>
                </td>
              </tr>

              <tr>
                <td style="padding:20px 24px 8px 24px;">
                  ${params.lead ? `<p style="margin:0 0 14px 0;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial;font-size:14px;color:#334155;line-height:1.55;">${escapeHtml(params.lead)}</p>` : ''}
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                    <tbody>
                      ${detailsHtml}
                    </tbody>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding:14px 24px 24px 24px;">
                  <div style="border:1px solid #e2e8f0;border-radius:14px;padding:14px 14px;background:#f8fafc;">
                    <div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial;font-size:12px;letter-spacing:0.10em;text-transform:uppercase;color:#64748b;font-weight:800;">
                      Guardian
                    </div>
                    <div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial;font-size:13px;color:#334155;line-height:1.45;margin-top:6px;">
                      Este es un correo automático del sistema de notificaciones.
                    </div>
                  </div>
                </td>
              </tr>
            </table>

            <style>
              .label{width:40%;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial;font-size:13px;color:#64748b;font-weight:700;padding:8px 0;border-bottom:1px solid #f1f5f9;}
              .value{width:60%;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial;font-size:13px;color:#0f172a;font-weight:800;padding:8px 0;border-bottom:1px solid #f1f5f9;}
              tr:last-child .label, tr:last-child .value{border-bottom:none;}
            </style>
          </td>
        </tr>
      </table>
    </body>
  </html>`
}

let transporterCache: Transporter | null = null

function getTransporter(): Transporter {
  if (transporterCache) return transporterCache

  const user = process.env.EMAIL_USER
  const pass = process.env.EMAIL_PASS

  if (!user || !pass) {
    throw new Error('Faltan variables de entorno EMAIL_USER y/o EMAIL_PASS en el servidor.')
  }

  transporterCache = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })

  return transporterCache
}

async function sendHtmlEmail(params: {
  to: string
  subject: string
  html: string
}) {
  const user = process.env.EMAIL_USER
  if (!user) throw new Error('Falta EMAIL_USER en el servidor.')

  const transporter = getTransporter()

  await transporter.sendMail({
    from: `"Guardian" <${user}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
  })
}

export type NuevaGuardiaPublicadaEmailParams = {
  toEmail: string
  toName?: string | null
  shiftTitle: string
  clinicName?: string | null
  shiftCategory?: string | null
  specialtyRequired?: string | null
  dateTime?: string | null
  price?: number | null
}

export async function sendNuevaGuardiaPublicadaEmail(params: NuevaGuardiaPublicadaEmailParams) {
  const html = renderBaseTemplate({
    title: 'Nueva Guardia Publicada',
    subtitle: params.clinicName ? `Clínica: ${params.clinicName}` : 'Hay una nueva guardia disponible',
    heading: '¡Te llegó una oportunidad!',
    lead: params.toName ? `Hola ${params.toName},` : undefined,
    details: [
      { label: 'Servicio', value: params.shiftCategory || '—' },
      { label: 'Especialidad', value: params.specialtyRequired || '—' },
      { label: 'Guardia', value: params.shiftTitle },
      { label: 'Fecha y horario', value: formatDateTimeEs(params.dateTime) },
      { label: 'Precio', value: params.price != null ? `$${params.price}` : '—' },
    ],
  })

  await sendHtmlEmail({
    to: params.toEmail,
    subject: 'Guardian | Nueva Guardia Publicada',
    html,
  })
}

export type GuardiaAsignadaEmailParams = {
  toEmail: string
  toName?: string | null
  shiftTitle: string
  clinicName?: string | null
  dateTime?: string | null
}

export async function sendGuardiaAsignadaEmail(params: GuardiaAsignadaEmailParams) {
  const html = renderBaseTemplate({
    title: 'Guardia Asignada',
    subtitle: params.clinicName ? `Clínica: ${params.clinicName}` : undefined,
    heading: '¡Guardia asignada con éxito!',
    lead: params.toName ? `Hola ${params.toName},` : undefined,
    details: [
      { label: 'Guardia', value: params.shiftTitle },
      { label: 'Fecha y horario', value: formatDateTimeEs(params.dateTime) },
    ],
  })

  await sendHtmlEmail({
    to: params.toEmail,
    subject: 'Guardian | Guardia Asignada',
    html,
  })
}

export type NuevaPostulacionEmailParams = {
  toEmail: string
  clinicName?: string | null
  doctorName?: string | null
  shiftTitle: string
  dateTime?: string | null
}

export async function sendNuevaPostulacionEmail(params: NuevaPostulacionEmailParams) {
  const html = renderBaseTemplate({
    title: 'Nueva Postulación',
    subtitle: params.clinicName ? `Para: ${params.clinicName}` : 'Tenés una nueva postulación',
    heading: 'Nuevo postulante',
    lead: params.doctorName ? `Se postuló: ${params.doctorName}.` : undefined,
    details: [
      { label: 'Guardia', value: params.shiftTitle },
      { label: 'Fecha y horario', value: formatDateTimeEs(params.dateTime) },
    ],
  })

  await sendHtmlEmail({
    to: params.toEmail,
    subject: 'Guardian | Nueva Postulación',
    html,
  })
}

export type BajaDeMedicoEmailParams = {
  toEmail: string
  clinicName?: string | null
  shiftTitle: string
  dateTime?: string | null
}

export async function sendBajaDeMedicoEmail(params: BajaDeMedicoEmailParams) {
  const html = renderBaseTemplate({
    title: 'Baja de Médico',
    subtitle: params.clinicName ? `Para: ${params.clinicName}` : undefined,
    heading: 'La guardia vuelve a estar abierta',
    lead: 'El profesional dio de baja su asistencia. Podés volver a gestionar la publicación.',
    details: [
      { label: 'Guardia', value: params.shiftTitle },
      { label: 'Fecha y horario', value: formatDateTimeEs(params.dateTime) },
    ],
  })

  await sendHtmlEmail({
    to: params.toEmail,
    subject: 'Guardian | Baja de Médico',
    html,
  })
}

