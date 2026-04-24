# Guardian — Dominio y Reglas de Negocio

## Entidades principales

### Clínica / Centro de Salud
- Se registra con datos institucionales (nombre, CUIT, dirección, especialidades)
- Puede publicar guardias con: fecha, horario, especialidad requerida, descripción, remuneración
- Puede ver las postulaciones a sus guardias
- Puede aceptar o rechazar médicos postulados
- Solo puede gestionar SUS propias guardias

### Médico
- Se registra con datos profesionales (matrícula, especialidades, provincia)
- Puede ver guardias disponibles filtradas por especialidad/zona
- Puede postularse a guardias abiertas
- No puede postularse dos veces a la misma guardia
- No puede ver datos de otros médicos ni de otras postulaciones
- Solo puede cancelar SUS propias postulaciones

### Guardia
Estados posibles:
```
borrador → publicada → en_proceso → completada
                  ↓
              cancelada
```
- `borrador`: solo visible para la clínica que la creó
- `publicada`: visible para médicos, acepta postulaciones
- `en_proceso`: médico aceptado, no acepta más postulaciones
- `completada`: finalizada
- `cancelada`: desactivada, no acepta postulaciones

### Postulación
Estados posibles:
```
pendiente → aceptada → confirmada
    ↓            ↓
rechazada    cancelada
```
- Solo una postulación activa por médico por guardia
- Cuando se acepta una postulación → guardia pasa a `en_proceso` → resto de postulaciones pasan a `rechazada` automáticamente

---

## Reglas de negocio críticas

1. **Matrícula médica es única** — no pueden existir dos médicos con la misma matrícula
2. **Una guardia solo puede tener un médico asignado** — al aceptar, bloquear inmediatamente
3. **Clínica no puede ver datos de contacto del médico hasta que la postulación sea aceptada**
4. **Médico no puede ver qué otros médicos se postularon a la misma guardia**
5. **Cancelar una guardia publicada debe notificar a todos los postulados**
6. **Las guardias completadas son inmutables** — no se pueden editar ni cancelar

---

## Schema esperado (referencia)

```sql
-- Tablas principales que deben existir
profiles          -- datos base de todos los usuarios (linked a auth.users)
clinicas          -- perfil extendido de clínicas
medicos           -- perfil extendido de médicos (matrícula, especialidades)
guardias          -- publicaciones de guardias
postulaciones     -- médico se postula a guardia
especialidades    -- catálogo de especialidades médicas

-- Relaciones clave
guardias.clinica_id → clinicas.id
postulaciones.guardia_id → guardias.id
postulaciones.medico_id → medicos.id
medicos.user_id → profiles.id (→ auth.users.id)
clinicas.user_id → profiles.id (→ auth.users.id)
```

---

## Flujos a validar siempre

### Flujo 1: Publicación de guardia
```
Clínica crea guardia (borrador)
→ Completa datos requeridos
→ Publica (estado: publicada)
→ Queda visible en búsqueda de médicos
```
**Verificar:** que solo clínicas autenticadas puedan publicar, que la guardia quede asociada a la clínica correcta, que el estado inicial sea correcto.

### Flujo 2: Postulación de médico
```
Médico ve guardia publicada
→ Se postula
→ Clínica recibe la postulación
→ Clínica acepta o rechaza
→ Si acepta: guardia pasa a en_proceso, resto se rechazan
```
**Verificar:** que no se dupliquen postulaciones, que el cambio de estado sea atómico (idealmente en una DB function), que el médico no pueda ver otras postulaciones.

### Flujo 3: Cierre de guardia
```
Guardia en_proceso
→ Se completa la fecha/hora
→ Clínica marca como completada
→ Registro inmutable
```
**Verificar:** que no se pueda editar una guardia completada, que no se acepten nuevas postulaciones.

---

## Errores comunes en este dominio

- **Race condition en aceptación**: dos clínicas distintas aceptan al mismo médico en simultaneo → usar transacción o DB function con lock
- **Guardia visible en borrador**: falla de RLS que muestra borradores a médicos
- **Médico ve otras postulaciones**: falla de RLS en tabla postulaciones
- **Matrícula duplicada**: falta de constraint único en la columna
- **Estado inconsistente**: guardia en `en_proceso` con múltiples postulaciones en `aceptada` → debe haber exactamente una
