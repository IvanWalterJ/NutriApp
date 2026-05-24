# Migraciones SQL — NutriApp

Todas las migraciones de Supabase ordenadas por feature. Cada archivo es **idempotente**: usa `IF NOT EXISTS` / `DROP POLICY IF EXISTS` para que se pueda reaplicar sin romper estado existente.

## Orden de ejecución

Aplicar en orden numérico (las posteriores asumen tablas/columnas creadas en las anteriores).

| # | Archivo | Qué hace |
|---|---------|----------|
| 001 | [`001_base_schema.sql`](001_base_schema.sql) | Columnas base en `profiles`, `patients`, `sessions` + antropometría ISAK completa |
| 002 | [`002_companies.sql`](002_companies.sql) | Tabla `companies` (fija/feria) + RLS + seed inicial |
| 003 | [`003_patient_sex_session_fields.sql`](003_patient_sex_session_fields.sql) | `patients.sex` + `sessions.session_type/laboratorio_alterado/consumo_frutas_verduras` |
| 004 | [`004_auth_trigger.sql`](004_auth_trigger.sql) | Trigger `handle_new_user` + backfill de perfiles huérfanos |
| 005 | [`005_sessions_created_at.sql`](005_sessions_created_at.sql) | `sessions.created_at` para desempatar sesiones del mismo día |
| 006 | [`006_delete_policies.sql`](006_delete_policies.sql) | Políticas RLS `DELETE` para `patients` y `sessions` |
| 007 | [`007_lab_results.sql`](007_lab_results.sql) | Tabla `lab_results` (glucosa, HbA1c, colesterol, presión...) + RLS |
| 008 | [`008_consultation_reason.sql`](008_consultation_reason.sql) | `sessions.consultation_reason` + `sessions.consultation_notes` |
| 009 | [`009_import_batches.sql`](009_import_batches.sql) | Tabla `import_batches` + `patients.import_batch_id/imported_at` + RLS |
| 010 | [`010_forms_public.sql`](010_forms_public.sql) | Tablas `forms` + `form_responses` con RLS para INSERT público anónimo |

## Cómo aplicar

### Opción 1 — Una sola corrida (recomendado para un proyecto nuevo)

Copiá y pegá el contenido de [`apply_all.sql`](apply_all.sql) en el SQL Editor de Supabase y dale Run. Trae todas las migraciones concatenadas, en orden.

### Opción 2 — Migración por migración (recomendado en producción)

Abrí cada archivo numerado y pegalo de a uno en el SQL Editor. Esto te permite ver errores de forma aislada y verificar el estado después de cada bloque.

### Opción 3 — Supabase CLI (si lo configurás más adelante)

```bash
supabase db push
```

> **Importante**: si reaplicás una migración ya corrida, no debería romper nada (todas son idempotentes). Si ves errores tipo `policy "..." already exists`, revisá que el archivo tenga el `DROP POLICY IF EXISTS` correspondiente arriba del `CREATE POLICY`.

## Cómo agregar una migración nueva

1. Numerá con el siguiente número disponible (ej. `011_email_log.sql`).
2. Empezá el archivo con un bloque de comentarios explicando QUÉ y POR QUÉ:
   ```sql
   -- ───────────────────────────────────────────────────────────────────────────
   -- 011 — Log de emails enviados a pacientes (Sprint 4).
   --
   -- Tabla independiente para rastrear status (sent/bounced/delivered) sin
   -- contaminar la tabla `sessions`.
   -- ───────────────────────────────────────────────────────────────────────────
   ```
3. Usá `IF NOT EXISTS` para tablas/columnas y `DROP POLICY IF EXISTS` antes de cada `CREATE POLICY`.
4. Actualizá la tabla de arriba y la lista de `apply_all.sql`.
5. Commiteá con `feat(db): <descripción corta>`.

## Convenciones

- Una migración por feature. Si una feature toca múltiples tablas, va todo junto en el mismo archivo.
- **Nunca** modificar una migración ya pusheada — siempre crear una nueva. Si necesitás revertir, hacé una migración inversa explícita.
- **Nunca** hacer `DROP COLUMN` salvo que estés 100% seguro que ningún ambiente lo usa. Preferí marcar como deprecado en el código y dejar la columna.
- RLS siempre habilitado en tablas nuevas: si una tabla no tiene RLS, Supabase la bloquea por default a clientes anónimos pero la deja expuesta para `service_role`.
- Los policies se nombran descriptivamente: `"Authenticated users can read X"`, `"Public can read active X"`, etc.
