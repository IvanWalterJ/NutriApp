/**
 * Endpoint: POST /api/normalize-excel
 *
 * Recibe filas crudas de una planilla desorganizada (Excel/CSV de Rosana) y
 * las mapea al schema oficial usando Claude Sonnet 4.6 con tool_use, lo cual
 * fuerza un output JSON tipado.
 *
 * Garantías contra invención:
 *   1. Temperature 0
 *   2. Tool schema estricto (sin propiedades libres)
 *   3. System prompt explícito: "nunca inventes valores"
 *   4. Validación post-IA en el cliente con el parser existente
 *
 * Costos esperados: ~$0.03-0.10 por archivo según tamaño.
 */

import Anthropic from '@anthropic-ai/sdk';

const CLAUDE_MODEL = 'claude-sonnet-4-6';
const MAX_ROWS = 500;     // Límite de filas por archivo (más → splitting)
const MAX_TOKENS = 16384;

const SYSTEM_PROMPT = `Eres un parser estricto de planillas Excel/CSV. Tu única tarea es MAPEAR columnas de un archivo desorganizado al schema oficial de pacientes, sin transformar ni inventar datos.

REGLAS CRÍTICAS (no negociables):
1. NUNCA inventes valores. Si una celda está vacía o no podés determinar a qué campo corresponde, dejala omitida del objeto (equivale a null).
2. NUNCA infieras emails, teléfonos, fechas de nacimiento ni nombres a partir de otros campos. Copialos solo si están literalmente en el archivo.
3. NO traduzcas, NO cambies acentos, NO corrijas typos de nombres propios.
4. Para enums (sexo, hidratación, actividad física), normalizá SOLO si la intención del valor es 100% inequívoca:
   - "F", "Fem", "Femenino", "femenino", "MUJER" → "Femenino"
   - "M", "Masc", "Masculino", "HOMBRE", "Varón" → "Masculino"
   - Cualquier otra cosa → omitir
5. Fechas: convertí "15/03/1980", "15-03-1980", "1980-03-15", o serial Excel a formato ISO "1980-03-15". Si el formato es ambiguo (ej. "03/05/1980" podría ser mar o may), DEJÁ EL CAMPO VACÍO.
6. Si una fila tiene "Apellido y Nombre" combinados como "Pérez, Juan" o "Pérez Juan", separalos en last_name y first_name respectivamente.
7. Altura: el schema espera centímetros. Si ves valores como 1.62, 1.78 (en metros), MULTIPLICÁ por 100 para convertir a cm. Si ya está en cm (>80), dejá el valor literal.
8. Si una fila no tiene nombre o apellido claros, devolvela igual con esos campos vacíos — el sistema la descartará.
9. Mantené el ORDEN ORIGINAL de las filas.
10. Devolvé EXCLUSIVAMENTE la llamada a la tool submit_normalized_patients. No expliques nada.`;

const TOOL_SCHEMA = {
  name: 'submit_normalized_patients',
  description: 'Devolvé las filas mapeadas al schema oficial de pacientes.',
  input_schema: {
    type: 'object' as const,
    properties: {
      column_mapping: {
        type: 'object' as const,
        description: 'Diccionario de header original → nombre del campo del schema oficial al que se mapeó.',
        additionalProperties: { type: 'string' as const },
      },
      rows: {
        type: 'array' as const,
        description: 'Filas mapeadas en el mismo orden del archivo. Omitir un campo equivale a null.',
        items: {
          type: 'object' as const,
          properties: {
            first_name: { type: 'string' as const },
            last_name:  { type: 'string' as const },
            email:      { type: 'string' as const },
            phone:      { type: 'string' as const },
            birth_date: { type: 'string' as const, description: 'ISO yyyy-mm-dd' },
            sex:        { type: 'string' as const, enum: ['Femenino', 'Masculino'] },
            area:       { type: 'string' as const },
            initial_weight: { type: 'number' as const, description: 'kg' },
            height:         { type: 'number' as const, description: 'cm' },
            adherence:               { type: 'integer' as const, minimum: 1, maximum: 5 },
            hydration:               { type: 'boolean' as const },
            physical_activity:       { type: 'string' as const, enum: ['≤150 min', '+150 min'] },
            consumo_frutas_verduras: { type: 'integer' as const, minimum: 1, maximum: 5 },
            energy_level:            { type: 'integer' as const, minimum: 1, maximum: 5 },
            sleep_quality:           { type: 'integer' as const, minimum: 1, maximum: 5 },
          },
        },
      },
    },
    required: ['column_mapping', 'rows'],
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurada en .env.local (o en Vercel para producción).' });
  }

  try {
    const { headers, rows } = req.body as { headers: unknown[]; rows: unknown[][] };

    if (!Array.isArray(headers) || !Array.isArray(rows)) {
      return res.status(400).json({ error: 'Body inválido: faltan headers o rows.' });
    }
    if (rows.length === 0) {
      return res.status(400).json({ error: 'No hay filas para procesar.' });
    }
    if (rows.length > MAX_ROWS) {
      return res.status(400).json({ error: `Archivo demasiado grande (${rows.length} filas > ${MAX_ROWS}). Subí en partes.` });
    }

    const userPrompt = `Mapeá las siguientes filas de planilla al schema de pacientes oficial usando la tool submit_normalized_patients.

Headers del archivo (en orden):
${JSON.stringify(headers)}

Filas (cada fila es un array en el mismo orden que los headers):
${JSON.stringify(rows)}

Devolvé también un column_mapping que indique a qué campo se mapeó cada header. Solo incluí los headers que pudiste identificar — los desconocidos se omiten.`;

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0,
      system: SYSTEM_PROMPT,
      tools: [TOOL_SCHEMA],
      tool_choice: { type: 'tool', name: 'submit_normalized_patients' },
      messages: [{ role: 'user', content: userPrompt }],
    });

    const toolUse = response.content.find(c => c.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      console.error('[normalize-excel] No tool_use en respuesta:', JSON.stringify(response.content).slice(0, 500));
      return res.status(500).json({ error: 'Claude no devolvió un mapeo estructurado.' });
    }

    const payload = toolUse.input as { column_mapping: Record<string, string>; rows: any[] };
    console.log(`[normalize-excel] OK: ${payload.rows?.length ?? 0} filas mapeadas, ${Object.keys(payload.column_mapping ?? {}).length} columnas mapeadas`);

    return res.status(200).json({
      column_mapping: payload.column_mapping ?? {},
      rows: payload.rows ?? [],
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    });
  } catch (error: any) {
    console.error('Error en normalize-excel:', error);
    return res.status(500).json({ error: error?.message || 'Error desconocido en el normalizador' });
  }
}
