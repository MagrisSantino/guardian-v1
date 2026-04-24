---
name: guardian
description: >
  Skill especializada para el proyecto Guardian — plataforma de gestión de guardias médicas donde clínicas publican guardias y médicos se postulan. Usá esta skill SIEMPRE que el usuario mencione "guardian", "guardias médicas", "postulaciones", "clínicas", "turnos médicos", o pida auditar, arreglar, limpiar, o llevar a producción este proyecto. También triggerear para: revisar bugs, corregir vulnerabilidades, arreglar inconsistencias, preparar para deploy, o cualquier tarea de mejora sobre el codebase de Guardian.
---

# Guardian Skill — Auditoría y Fix Autónomo

Sistema de gestión de guardias médicas. Dos tipos de usuarios: **clínicas/centros de salud** (publican guardias) y **médicos** (se postulan). Backend en Supabase.

## Modo de operación

**Arreglá primero, reportá después.** No pidas confirmación para cada cambio. No expliques lo que vas a hacer antes de hacerlo. Leé el código, identificá todos los problemas, aplicá los fixes directamente en los archivos, y al final entregá un resumen compacto de qué cambió y por qué.

**Formato de output al terminar:**
```
✅ FIXES APLICADOS
[archivo] — [qué se arregló] — [severidad: CRÍTICO/MEDIO/MENOR]

⚠️  PENDIENTE MANUAL
[solo lo que genuinamente necesita decisión del usuario]
```

Sin introducciones. Sin explicar el plan antes de ejecutar. Sin repetir código que no cambió.

---

## Paso 1 — Lectura del proyecto

Antes de cualquier fix, leer:
1. Estructura de carpetas completa
2. Schema de Supabase (migrations o types generados)
3. Todas las rutas/pages que manejan auth
4. Todos los archivos que tocan Supabase directamente

→ Ver `references/domain.md` para entender las reglas de negocio de Guardian antes de tocar lógica de postulaciones o guardias.

---

## Paso 2 — Auditoría (ejecutar en orden)

### A. Seguridad crítica (leer `references/security-fixes.md`)
Prioridad máxima. Un bug acá puede exponer datos médicos o permitir fraude.

Orden de revisión:
1. RLS en todas las tablas
2. Separación de roles clínica vs médico
3. Auth en rutas protegidas (`getUser()` no `getSession()`)
4. Variables de entorno expuestas
5. IDORs en endpoints de postulaciones y guardias

### B. Bugs funcionales
- Flujos rotos: postulación, publicación de guardia, aceptación/rechazo
- Estados inconsistentes (guardia publicada sin médico asignado, postulación huérfana)
- Validaciones faltantes en formularios críticos
- Manejo de errores ausente (operaciones Supabase sin catch)

### C. Calidad de código
- Queries N+1
- Datos sensibles en logs o respuestas de error
- Tipos TypeScript ausentes o `any` en lugares críticos
- Imports y dependencias sin usar

---

## Paso 3 — Aplicar fixes

Aplicar todos los cambios directamente. Para cada archivo modificado, tocar solo lo necesario — no reformatear código que no tiene bugs.

Si un fix requiere una migración SQL nueva, crearla en la carpeta de migraciones del proyecto con nombre descriptivo: `YYYYMMDD_descripcion.sql`.

---

## Referencias

| Archivo | Leer cuando |
|---|---|
| `references/domain.md` | Necesitás entender reglas de negocio antes de tocar lógica |
| `references/security-fixes.md` | Auditoría de seguridad y RLS |
