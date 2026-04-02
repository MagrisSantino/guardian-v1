# Guardian — Templates de Email para Supabase Dashboard

Ve a: **Supabase Dashboard → Authentication → Email Templates**

---

## 1. Confirm signup (Confirmación de cuenta)

**Subject:**
```
Guardian | Confirmá tu cuenta
```

**Body (HTML):**
```html
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f8fafc;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"
            style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
            <tr>
              <td style="padding:22px 24px;background:linear-gradient(90deg,#2563eb,#3b82f6);">
                <div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:18px;color:#ffffff;font-weight:900;">
                  Guardian
                </div>
                <div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:13px;color:rgba(255,255,255,0.9);margin-top:4px;">
                  Plataforma de Guardias Médicas
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px 12px 24px;">
                <p style="margin:0 0 16px 0;font-family:ui-sans-serif,system-ui,sans-serif;font-size:22px;font-weight:800;color:#0f172a;">
                  ¡Confirmá tu cuenta!
                </p>
                <p style="margin:0 0 24px 0;font-family:ui-sans-serif,system-ui,sans-serif;font-size:14px;color:#334155;line-height:1.6;">
                  Gracias por unirte a Guardian. Hacé clic en el siguiente botón para activar tu cuenta y comenzar a usar la plataforma.
                </p>
                <a href="{{ .ConfirmationURL }}"
                  style="display:inline-block;background:#2563eb;color:#ffffff;font-family:ui-sans-serif,system-ui,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:12px;box-shadow:0 4px 12px rgba(37,99,235,0.3);">
                  Confirmar mi cuenta
                </a>
                <p style="margin:20px 0 0 0;font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px;color:#94a3b8;">
                  Si no creaste una cuenta en Guardian, podés ignorar este correo.
                  Este enlace expira en 24 horas.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 24px 24px 24px;">
                <div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;background:#f8fafc;">
                  <div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:11px;color:#64748b;">
                    Guardian — Este es un correo automático, no respondas a este mensaje.
                  </div>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## 2. Reset password (Recuperar contraseña)

**Subject:**
```
Guardian | Restablecer contraseña
```

**Body (HTML):**
```html
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f8fafc;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"
            style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
            <tr>
              <td style="padding:22px 24px;background:linear-gradient(90deg,#2563eb,#3b82f6);">
                <div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:18px;color:#ffffff;font-weight:900;">
                  Guardian
                </div>
                <div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:13px;color:rgba(255,255,255,0.9);margin-top:4px;">
                  Plataforma de Guardias Médicas
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px 12px 24px;">
                <p style="margin:0 0 16px 0;font-family:ui-sans-serif,system-ui,sans-serif;font-size:22px;font-weight:800;color:#0f172a;">
                  Restablecer contraseña
                </p>
                <p style="margin:0 0 24px 0;font-family:ui-sans-serif,system-ui,sans-serif;font-size:14px;color:#334155;line-height:1.6;">
                  Recibimos una solicitud para restablecer la contraseña de tu cuenta en Guardian.
                  Hacé clic en el botón para crear una nueva contraseña.
                </p>
                <a href="{{ .ConfirmationURL }}"
                  style="display:inline-block;background:#2563eb;color:#ffffff;font-family:ui-sans-serif,system-ui,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:12px;box-shadow:0 4px 12px rgba(37,99,235,0.3);">
                  Restablecer contraseña
                </a>
                <p style="margin:20px 0 0 0;font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px;color:#94a3b8;">
                  Si no solicitaste este cambio, podés ignorar este correo. Tu contraseña no será modificada.
                  Este enlace expira en 1 hora.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 24px 24px 24px;">
                <div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;background:#f8fafc;">
                  <div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:11px;color:#64748b;">
                    Guardian — Este es un correo automático, no respondas a este mensaje.
                  </div>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## Dónde configurarlo en Supabase

1. Ir a **Authentication → Email Templates** en el sidebar
2. Seleccionar "Confirm signup" y pegar el template 1
3. Seleccionar "Reset password" y pegar el template 2
4. Guardar cambios

**Nota:** Supabase Free Plan tiene un límite de 3 emails por hora. Para producción
configurar un proveedor SMTP externo en **Authentication → SMTP Settings**
(por ejemplo el mismo Gmail que usa el sistema o Resend.com).
