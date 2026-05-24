# Test data — Import masivo

Archivos para probar el botón **Importar Excel/CSV** del dashboard.

## `pacientes-ordenado.csv`

Plantilla oficial con 10 pacientes. Camino rápido (sin IA).

Incluye la nueva columna **`Fecha 1ra Consulta`** (opcional):
- Si tiene fecha → la sesión inicial se crea backdated a esa fecha (no a hoy).
- Si está vacía → la sesión inicial usa la fecha de import (hoy).

## `pacientes-desordenado.csv`

Headers custom ("Apellido y Nombre", "DNI", "Genero", "Cel", "kg", "Talla", "Observaciones").
Disparará el camino **IA con Claude Sonnet 4.6** para mapear las columnas al schema oficial sin inventar datos. Requiere `ANTHROPIC_API_KEY` o `VITE_PROD_API_URL`.

## Histórico multi-fecha (hoja "Consultas")

Para probar la carga de varias sesiones por paciente en distintas fechas:

1. Desde el dashboard, click en **Planilla Feria** (descarga un Excel con DOS hojas: "Consultas" + "Pacientes Nuevos").
2. En la hoja "Consultas", una fila por sesión histórica con `Fecha Consulta` distinta. Los pacientes se matchean por `ID Paciente` (si vino en la export) o por `Nombre + Apellido` — incluyendo pacientes que se acaban de agregar en la hoja "Pacientes Nuevos" de la misma subida.
3. Volvé al dashboard → **Importar Excel/CSV** → seleccioná el archivo modificado.
4. El preview muestra dos bloques de estadísticas (Pacientes nuevos + Consultas históricas) y dos tablas separadas.
5. Confirmar → cada consulta se inserta como sesión con su fecha correcta, y las métricas de evolución funcionan.

> Importante: la hoja "Consultas" ya no se ignora — antes el import solo cargaba una sesión inicial por paciente (fecha = hoy), que rompía las métricas de evolución cuando se cargaba un histórico de varias visitas.

## Formularios públicos pre-consulta

Una vez aplicada la migración [`supabase/migrations/010_forms_public.sql`](../supabase/migrations/010_forms_public.sql) (o el `apply_all.sql` consolidado):

1. Sidebar → **Formularios** → tab "Crear / Listar" → "Nuevo formulario".
2. Poné título (ej. "Feria Pampa - Junio 2026") y opcionalmente una fecha de vencimiento.
3. El formulario aparece en la grilla con tres acciones: **Link** (copia al clipboard), **QR** (descargable PNG), **Abrir** (previsualización).
4. El paciente abre el link sin login, completa los campos, envía.
5. Sidebar → **Formularios** → tab "Bandeja" → ver respuestas pendientes.
6. Click en cualquier respuesta → revisar datos → "Confirmar y crear paciente" (matchea por email; si existe lo reusa, sino lo crea + sesión inicial OMS).
