import { GoogleGenAI } from '@google/genai';
import Anthropic from '@anthropic-ai/sdk';
import { buildIntoleranceRules } from '../src/lib/intoleranceRules';

const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
].filter(Boolean) as string[];

const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];

const CLAUDE_MODEL = 'claude-sonnet-4-6';
const CLAUDE_MAX_TOKENS = 16384;

async function generateWithClaudeFallback(prompt: string): Promise<{ text: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY no configurada');

  const client = new Anthropic({ apiKey });
  const systemInstruction =
    'Eres un nutricionista clínico experto argentino. Devolvés SIEMPRE un único objeto JSON puro, válido y parseable, sin texto adicional, sin markdown, sin backticks. La respuesta debe empezar con { y terminar con }.';

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: CLAUDE_MAX_TOKENS,
    system: systemInstruction,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  console.log(`[Recetario] OK con Claude (${CLAUDE_MODEL})`);
  return { text };
}

async function generateWithFallbacks(params: { contents: string; config?: object }): Promise<any> {
  const errors: string[] = [];
  for (const key of GEMINI_KEYS) {
    for (const model of MODELS) {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        const result = await ai.models.generateContent({ model, ...params });
        if (result.text) {
          console.log(`[Recetario] OK con key ...${key.slice(-4)} y modelo ${model}`);
          return result;
        }
      } catch (e: any) {
        const msg = `key ...${key.slice(-4)} + ${model}: ${e?.message?.substring(0, 80)}`;
        console.warn(`[Recetario] Falló ${msg}`);
        errors.push(msg);
      }
    }
  }

  console.warn('[Recetario] Gemini agotado, cayendo a Claude como respaldo');
  try {
    return await generateWithClaudeFallback(params.contents);
  } catch (e: any) {
    const msg = `Claude: ${e?.message?.substring(0, 120)}`;
    console.warn(`[Recetario] Falló ${msg}`);
    errors.push(msg);
    throw new Error(`Todos los modelos y claves fallaron:\n${errors.join('\n')}`);
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      patientInfo, mealType, mealTypes, objective, dietType,
      intolerances, pregnancyStage, hideCalories,
      foodRestrictions, count,
    } = req.body;

    const intolerancesList: string[] = intolerances || [];
    const recipeCount = count || 3;
    const resolvedMealTypes: string[] = mealTypes || (mealType ? [mealType] : ['Almuerzos rápidos']);
    const stage: string = pregnancyStage || '';
    const omitCalories: boolean =
      !!hideCalories || intolerancesList.includes('Embarazo y Lactancia');

    const intoleranceRules = buildIntoleranceRules(intolerancesList, stage);

    const patientContext = patientInfo
      ? `Paciente: ${patientInfo.firstName} ${patientInfo.lastName}, ${patientInfo.sex}, ${patientInfo.age} años, ${patientInfo.weight}kg.`
      : 'Sin paciente específico.';

    const mealTypesStr = resolvedMealTypes.join(', ');

    const prompt = `Eres un nutricionista clínico experto argentino. Genera exactamente ${recipeCount} recetas en formato JSON.
${resolvedMealTypes.length > 1 ? `IMPORTANTE: Generar exactamente 1 receta por cada uno de estos tipos: ${mealTypesStr}. Total: ${resolvedMealTypes.length} recetas. Cada receta debe ser de un tipo distinto.` : `Todas las recetas deben ser del tipo: ${mealTypesStr}.`}

Contexto:
- ${patientContext}
- Tipo de alimentación: ${dietType || 'Normal (Omnívora)'}
- Objetivo nutricional: ${objective || 'Alimentación saludable general'}
- Alimentos que NO puede consumir: ${foodRestrictions || 'Ninguno'}
- Intolerancias / Patologías / Condiciones:
${intoleranceRules || '  (Sin intolerancias declaradas)'}

REGLAS OBLIGATORIAS:
1. TIPO DE ALIMENTACIÓN "${dietType || 'Normal'}": NO incluyas alimentos prohibidos. Vegana: sin carnes/lácteos/huevo. Vegetariana: sin carnes/pescado. Pesco-vegetariana: sin carnes rojas ni aves.
2. ALIMENTOS PROHIBIDOS: "${foodRestrictions || 'ninguno'}" — no aparezcan en ningún ingrediente.
3. Respetar ESTRICTAMENTE todas las intolerancias, patologías y condiciones clínicas indicadas arriba (no usar ningún alimento marcado como evitado/prohibido).
4. NOMBRES ARGENTINOS: fideos, galletitas, zapallo, choclo, batata, ananá, durazno, ricota, porotos, arvejas, mandioca, bife, pan lactal, medialunas, mate.
5. Cantidades en medidas caseras argentinas (pocillo, taza, cda, cdita, unidad).
6. Recetas prácticas, rápidas (≤30 min de preparación cuando el tipo lo requiera) y alineadas al objetivo.
7. Cada receta debe tener ingredientes precisos con cantidades y pasos claros de preparación.
8. ${omitCalories
    ? 'NO mencionar calorías, kcal ni valor calórico en ninguna parte del JSON (ni en "nutritionalHighlight" ni en "tip"). Enfocar los destacados nutricionales en macronutrientes cualitativos, fibra, vitaminas, minerales o beneficios funcionales.'
    : 'En "nutritionalHighlight" podés mencionar aportes cualitativos y, si aporta claridad, una estimación breve de energía.'}

Devuelve UN OBJETO JSON PURO válido con esta estructura exacta:
{
  "context": "Descripción breve del tipo de recetas generadas y su objetivo",
  "recipes": [
    {
      "title": "Nombre de la receta",
      "category": "La categoría correspondiente (${mealTypesStr})",
      "prepTime": "15 min",
      "servings": "1 porción",
      "difficulty": "Fácil",
      "objective": "Aporta proteínas de calidad / Carbohidratos de absorción lenta / etc.",
      "ingredients": [
        "150g pechuga de pollo",
        "1 pocillo de arroz integral cocido",
        "1 cdita de aceite de oliva"
      ],
      "preparation": [
        "Paso 1 detallado.",
        "Paso 2 detallado.",
        "Paso 3 detallado."
      ],
      "nutritionalHighlight": "${omitCalories ? 'Destacado nutricional cualitativo (sin mencionar kcal).' : 'Aporta aproximadamente X proteínas, Y carbohidratos. Ideal para...'}",
      "tip": "Consejo práctico de preparación o conservación"
    }
  ]
}`;

    const response = await generateWithFallbacks({
      contents: prompt,
      config: { responseMimeType: 'application/json', temperature: 0.8 },
    });

    if (!response.text) throw new Error('No text from AI providers');
    const cleaned = response.text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    res.status(200).json(JSON.parse(cleaned));
  } catch (error: any) {
    console.error('Error generating recipes:', error);
    res.status(500).json({ error: error.message });
  }
}
