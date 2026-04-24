# Guardian — Security Fixes & RLS

## RLS por tabla

### profiles
```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Cada usuario ve y edita solo su propio perfil
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
```

### clinicas
```sql
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;

-- Lectura pública (nombre de clínica visible para médicos)
CREATE POLICY "clinicas_select_public" ON public.clinicas
  FOR SELECT USING (true);

-- Solo la clínica dueña puede editar su perfil
CREATE POLICY "clinicas_update_own" ON public.clinicas
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "clinicas_insert_own" ON public.clinicas
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### medicos
```sql
ALTER TABLE public.medicos ENABLE ROW LEVEL SECURITY;

-- Médico ve su propio perfil completo
CREATE POLICY "medicos_select_own" ON public.medicos
  FOR SELECT USING (auth.uid() = user_id);

-- Clínicas ven datos básicos SOLO de médicos que se postularon a sus guardias
-- y SOLO si la postulación fue aceptada
CREATE POLICY "medicos_select_clinica" ON public.medicos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.postulaciones p
      JOIN public.guardias g ON g.id = p.guardia_id
      WHERE p.medico_id = medicos.id
        AND g.clinica_id = (
          SELECT id FROM public.clinicas WHERE user_id = auth.uid()
        )
        AND p.estado = 'aceptada'
    )
  );

CREATE POLICY "medicos_update_own" ON public.medicos
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "medicos_insert_own" ON public.medicos
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### guardias
```sql
ALTER TABLE public.guardias ENABLE ROW LEVEL SECURITY;

-- Médicos ven solo guardias publicadas
CREATE POLICY "guardias_select_medico" ON public.guardias
  FOR SELECT USING (
    estado = 'publicada'
    OR (
      -- La clínica dueña ve todas sus guardias (incluso borradores)
      clinica_id = (SELECT id FROM public.clinicas WHERE user_id = auth.uid())
    )
  );

-- Solo la clínica dueña puede insertar/modificar/borrar sus guardias
CREATE POLICY "guardias_insert_clinica" ON public.guardias
  FOR INSERT WITH CHECK (
    clinica_id = (SELECT id FROM public.clinicas WHERE user_id = auth.uid())
  );

CREATE POLICY "guardias_update_clinica" ON public.guardias
  FOR UPDATE USING (
    clinica_id = (SELECT id FROM public.clinicas WHERE user_id = auth.uid())
    AND estado != 'completada'  -- guardias completadas son inmutables
  ) WITH CHECK (
    clinica_id = (SELECT id FROM public.clinicas WHERE user_id = auth.uid())
  );

CREATE POLICY "guardias_delete_clinica" ON public.guardias
  FOR DELETE USING (
    clinica_id = (SELECT id FROM public.clinicas WHERE user_id = auth.uid())
    AND estado IN ('borrador', 'cancelada')
  );
```

### postulaciones
```sql
ALTER TABLE public.postulaciones ENABLE ROW LEVEL SECURITY;

-- Médico ve solo SUS postulaciones
CREATE POLICY "postulaciones_select_medico" ON public.postulaciones
  FOR SELECT USING (
    medico_id = (SELECT id FROM public.medicos WHERE user_id = auth.uid())
  );

-- Clínica ve postulaciones de SUS guardias
CREATE POLICY "postulaciones_select_clinica" ON public.postulaciones
  FOR SELECT USING (
    guardia_id IN (
      SELECT id FROM public.guardias
      WHERE clinica_id = (SELECT id FROM public.clinicas WHERE user_id = auth.uid())
    )
  );

-- Médico puede postularse (INSERT)
CREATE POLICY "postulaciones_insert_medico" ON public.postulaciones
  FOR INSERT WITH CHECK (
    medico_id = (SELECT id FROM public.medicos WHERE user_id = auth.uid())
  );

-- Médico puede cancelar su propia postulación pendiente
CREATE POLICY "postulaciones_update_medico" ON public.postulaciones
  FOR UPDATE USING (
    medico_id = (SELECT id FROM public.medicos WHERE user_id = auth.uid())
    AND estado = 'pendiente'
  ) WITH CHECK (estado = 'cancelada');

-- Clínica puede aceptar/rechazar postulaciones de sus guardias
CREATE POLICY "postulaciones_update_clinica" ON public.postulaciones
  FOR UPDATE USING (
    guardia_id IN (
      SELECT id FROM public.guardias
      WHERE clinica_id = (SELECT id FROM public.clinicas WHERE user_id = auth.uid())
    )
    AND estado = 'pendiente'
  ) WITH CHECK (estado IN ('aceptada', 'rechazada'));
```

---

## DB Function: aceptar postulación (atómico)

Esta operación DEBE ser atómica para evitar race conditions:

```sql
CREATE OR REPLACE FUNCTION public.aceptar_postulacion(p_postulacion_id UUID)
RETURNS void AS $$
DECLARE
  v_guardia_id UUID;
  v_clinica_id UUID;
  v_caller_clinica_id UUID;
BEGIN
  -- Obtener datos de la postulación
  SELECT guardia_id INTO v_guardia_id
  FROM public.postulaciones
  WHERE id = p_postulacion_id AND estado = 'pendiente';

  IF v_guardia_id IS NULL THEN
    RAISE EXCEPTION 'Postulación no encontrada o ya procesada';
  END IF;

  -- Verificar que el caller es la clínica dueña de la guardia
  SELECT clinica_id INTO v_clinica_id
  FROM public.guardias WHERE id = v_guardia_id;

  SELECT id INTO v_caller_clinica_id
  FROM public.clinicas WHERE user_id = auth.uid();

  IF v_clinica_id != v_caller_clinica_id THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Aceptar la postulación elegida
  UPDATE public.postulaciones
  SET estado = 'aceptada', updated_at = NOW()
  WHERE id = p_postulacion_id;

  -- Rechazar todas las demás postulaciones de esa guardia
  UPDATE public.postulaciones
  SET estado = 'rechazada', updated_at = NOW()
  WHERE guardia_id = v_guardia_id
    AND id != p_postulacion_id
    AND estado = 'pendiente';

  -- Cambiar estado de la guardia
  UPDATE public.guardias
  SET estado = 'en_proceso', updated_at = NOW()
  WHERE id = v_guardia_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos
REVOKE ALL ON FUNCTION public.aceptar_postulacion FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aceptar_postulacion TO authenticated;
```

---

## Checklist de vulnerabilidades específicas de Guardian

### 1. Borrador visible a médicos
```sql
-- Verificar: médico NO debe poder ver guardias en borrador
-- Test:
SELECT * FROM guardias WHERE estado = 'borrador'; 
-- Ejecutar como médico autenticado → debe devolver 0 filas
```

### 2. Médico ve otras postulaciones
```sql
-- Verificar: médico solo ve sus postulaciones
-- Test:
SELECT * FROM postulaciones WHERE medico_id != <mi_medico_id>;
-- Debe devolver 0 filas
```

### 3. Clínica ve datos de médico antes de aceptar
```sql
-- Verificar: datos sensibles del médico no expuestos hasta aceptación
-- Revisar que la query del frontend filtre por estado = 'aceptada'
-- Y que la RLS de medicos valide lo mismo
```

### 4. Postulación duplicada
```sql
-- Constraint que debe existir:
ALTER TABLE public.postulaciones 
ADD CONSTRAINT unique_medico_guardia 
UNIQUE (medico_id, guardia_id);
-- Si no existe, agregarlo en una migración
```

### 5. Matrícula duplicada
```sql
-- Constraint que debe existir:
ALTER TABLE public.medicos
ADD CONSTRAINT unique_matricula
UNIQUE (matricula);
```

### 6. Edición de guardia completada
```sql
-- La política UPDATE ya lo bloquea a nivel DB
-- Verificar también en el frontend que el botón editar no aparezca
-- y en el API que se valide antes de hacer el UPDATE
```

---

## Auth pattern correcto (Next.js + Supabase)

```typescript
// ❌ INSEGURO — no usar en rutas protegidas
const { data: { session } } = await supabase.auth.getSession()

// ✅ SEGURO — siempre en server-side
const { data: { user }, error } = await supabase.auth.getUser()
if (error || !user) redirect('/login')

// Helper para obtener el rol del usuario
async function getUserRole(supabase: SupabaseClient, userId: string) {
  const { data: clinica } = await supabase
    .from('clinicas')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (clinica) return { role: 'clinica', entityId: clinica.id }

  const { data: medico } = await supabase
    .from('medicos')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (medico) return { role: 'medico', entityId: medico.id }

  return { role: null, entityId: null }
}
```

---

## Variables de entorno — verificar

```bash
# Estos NO deben aparecer en archivos del cliente ni en logs:
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL

# Buscar en el proyecto:
# grep -r "service_role" --include="*.ts" --include="*.tsx" --include="*.js"
# Si aparece en algún archivo sin "server-only" o fuera de /api → BUG CRÍTICO
```

---

## Queries a optimizar

```typescript
// ❌ N+1: query por cada guardia para traer postulaciones
const guardias = await supabase.from('guardias').select('*')
for (const g of guardias.data) {
  const posts = await supabase.from('postulaciones').select('*').eq('guardia_id', g.id)
}

// ✅ Join en un query
const { data } = await supabase
  .from('guardias')
  .select(`
    *,
    clinica:clinicas(nombre, direccion),
    postulaciones(id, estado, medico_id)
  `)
  .eq('estado', 'publicada')
  .order('fecha', { ascending: true })
```
