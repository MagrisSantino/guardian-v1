# Guardian

Plataforma para gestión de guardias médicas. Las clínicas y centros de salud publican vacantes (guardias, consultorios, ambulancias) y los profesionales de la salud se postulan. Una vez asignado un profesional, ambas partes pueden coordinarse vía WhatsApp.

## Stack

- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS 4
- **Backend/DB:** Supabase (PostgreSQL + Auth + Storage + RLS)
- **Email:** Nodemailer (Gmail) → migrar a Resend en producción
- **Maps:** Google Maps JS API + Places API
- **Deploy:** Vercel

## Roles

| Rol | Descripción |
|-----|-------------|
| `doctor` | Médico/profesional de salud. Ve el feed de guardias, se postula, gestiona su calendario. |
| `clinic_admin` | Clínica o centro de salud. Publica guardias, ve postulantes, asigna profesionales. |
| `super_admin` | Administrador de Guardian. Verifica perfiles, accede a panel de administración. |

## Flujo principal

```
Clínica crea guardia (open)
  → Médico la ve en su panel/calendario
  → Médico se postula
  → Clínica ve postulantes y sus perfiles
  → Clínica asigna al elegido (shift pasa a filled)
  → Ambos pueden contactarse por WhatsApp
  → Guardia se completa (completed)
```

## Rutas

### Públicas
| Ruta | Descripción |
|------|-------------|
| `/` | Landing page |
| `/login` | Inicio de sesión |
| `/registro` | Registro (médico o clínica) |
| `/verificar-email` | Instrucciones post-registro |
| `/restablecer-contrasena` | Reset de contraseña |
| `/auth/callback` | Callback OAuth/email |
| `/auth/confirm` | Confirmación de email |
| `/legales` | Términos y privacidad |
| `/offline` | Página offline (PWA) |

### Médico (`doctor`)
| Ruta | Descripción |
|------|-------------|
| `/dashboard-medico` | Feed de guardias disponibles |
| `/calendario-medico` | Calendario del mes con estados de guardias |
| `/mis-guardias` | Historial, stats y lista de guardias propias |
| `/perfil` | Edición de perfil profesional |

### Clínica (`clinic_admin`)
| Ruta | Descripción |
|------|-------------|
| `/dashboard-clinica` | Calendario para crear y gestionar guardias |
| `/panel-clinica` | Vista lista/card de guardias propias |
| `/publicar` | Formulario de nueva guardia |
| `/perfil` | Edición de perfil institucional |

### Admin (`super_admin`)
| Ruta | Descripción |
|------|-------------|
| `/super-admin-guardian` | Panel de administración |

### API Routes (server-only)
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/auth/ensure-profile` | POST | Crea/actualiza profile en primer login |
| `/api/shifts/assign` | POST | Asigna profesional a guardia (atómico) |
| `/api/notifications` | POST | Envía emails transaccionales |

## Base de datos

### Tablas principales
| Tabla | Descripción |
|-------|-------------|
| `profiles` | Datos de todos los usuarios (linked a `auth.users`) |
| `shifts` | Guardias publicadas por clínicas |
| `shift_applications` | Postulaciones de médicos a guardias |
| `reviews` | Calificaciones post-turno |
| `notifications` | Notificaciones in-app |

### Estados de guardia (`shifts.status`)
```
open → filled → completed
          ↓
       cancelled
```

### Estados de postulación (`shift_applications.status`)
```
pending → accepted
    ↓
rejected / cancelled
```

## Setup local

### Prerrequisitos
- Node.js 20+
- Cuenta en [Supabase](https://supabase.com) con proyecto creado
- Cuenta de Gmail con [contraseña de aplicación](https://myaccount.google.com/apppasswords)
- API Key de [Google Maps](https://console.cloud.google.com) con Maps JS + Places habilitados

### Instalación

```bash
# 1. Clonar y instalar dependencias
git clone <repo-url>
cd guardian-v1
npm install

# 2. Variables de entorno
cp .env.example .env.local
# Completar los valores en .env.local

# 3. Migraciones de base de datos
# Ejecutar en orden en el SQL Editor de Supabase:
# supabase/migrations/20260422_rls_security.sql
# supabase/migrations/20260424_rls_tables.sql

# 4. Levantar en desarrollo
npm run dev
```

### Tipos de TypeScript (Supabase)

```bash
# Instalar Supabase CLI si no está
npm install -g supabase

# Reemplazar <your-project-ref> en package.json con tu project ID
# (Supabase Dashboard → Project Settings → General → Reference ID)

npm run db:types
```

Esto genera `src/lib/database.types.ts` con los tipos del schema actual.

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo en `localhost:3000` |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | ESLint |
| `npm run db:types` | Genera tipos TypeScript desde el schema de Supabase |

## Estructura del proyecto

```
guardian-v1/
├── middleware.ts              # Auth y routing por rol
├── src/
│   ├── app/                   # Rutas (Next.js App Router)
│   │   ├── api/               # API Routes (server-only)
│   │   ├── auth/              # Callbacks de autenticación
│   │   ├── dashboard-medico/
│   │   ├── dashboard-clinica/
│   │   ├── calendario-medico/
│   │   ├── mis-guardias/
│   │   ├── panel-clinica/
│   │   ├── publicar/
│   │   ├── perfil/
│   │   ├── super-admin-guardian/
│   │   └── ...auth pages
│   ├── components/            # Componentes React compartidos
│   │   └── landing/           # Componentes exclusivos del landing
│   └── lib/                   # Utilidades y clientes
│       ├── supabase.ts        # Cliente browser (singleton)
│       ├── supabaseAdmin.ts   # Cliente admin (service role, solo server)
│       ├── mailer.ts          # Envío de emails
│       ├── shiftOverlap.ts    # Lógica de solapamiento de horarios
│       └── database.types.ts  # Tipos generados (npm run db:types)
├── supabase/migrations/       # Migraciones SQL en orden cronológico
├── public/
│   ├── sw.js                  # Service Worker (PWA)
│   └── manifest.json          # Web App Manifest (PWA)
└── scripts/                   # Scripts SQL de soporte
```

## Consideraciones de seguridad

- El cliente browser nunca recibe la `SUPABASE_SERVICE_ROLE_KEY`.
- RLS habilitado en todas las tablas.
- `getUser()` (valida JWT con Supabase) en lugar de `getSession()` en rutas protegidas.
- Uploads de imágenes validados por tipo (solo imágenes) y tamaño (máx. 2MB).
- Triggers de DB previenen auto-verificación de `is_verified` y `specialty.verified`.
