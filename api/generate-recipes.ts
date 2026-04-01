import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { patientInfo, mealType, objective, dietType, intolerances, foodRestrictions, count } = req.body;

    const intolerancesList: string[] = intolerances || [];
    const recipeCount = count || 4;

    const intoleranceRules = intolerancesList.map((intol: string) => {
      if (intol.includes('Lactosa')) return 'INTOLERANCIA A LA LACTOSA: Sin lácteos con lactosa. Usar leche deslactosada, bebida de almendras o avena, quesos duros, yogur deslactosado.';
      if (intol.includes('Gluten') || intol.includes('Celíaco')) return 'CELÍACO / SIN TACC: Prohibido trigo, avena, cebada y centeno. Usar harinas de arroz, fécula de mandioca, maíz. Todos los ingredientes procesados deben ser certificados sin TACC.';
      if (intol.includes('Colon Irritable')) return 'COLON IRRITABLE (SII): Pauta baja en FODMAP. Evitar cebolla, ajo, legumbres, lactosa, manzana, pera, miel. Preferir arroz, papa, zanahoria, zapallo, pollo, pescado, huevo, arándanos, frutillas.';
      if (intol.includes('Diverticular')) return 'ENFERMEDAD DIVERTICULAR: Alta en fibra soluble. Evitar semillas pequeñas (chía, sésamo), frutas con semillas incrustadas, porotos enteros. Preferir avena, zanahoria, calabaza, banana.';
      if (intol.includes('SiBO')) return 'SIBO: Dieta FODMAP estricta. Evitar legumbres, lactosa, fructosa, ajo, cebolla, repollo, coliflor, brócoli, manzana, pera. Permitir arroz, papa, carne, pollo, pescado, huevo, zanahoria, lechuga, tomate.';
      return '';
    }).filter(Boolean).join('\n');

    const patientContext = patientInfo
      ? `Paciente: ${patientInfo.firstName} ${patientInfo.lastName}, ${patientInfo.sex}, ${patientInfo.age} años, ${patientInfo.weight}kg.`
      : 'Sin paciente específico.';

    const prompt = `Eres un nutricionista clínico experto argentino. Genera exactamente ${recipeCount} recetas del tipo "${mealType}" en formato JSON.

Contexto:
- ${patientContext}
- Tipo de alimentación: ${dietType || 'Normal (Omnívora)'}
- Objetivo nutricional: ${objective || 'Alimentación saludable general'}
- Alimentos que NO puede consumir: ${foodRestrictions || 'Ninguno'}
- Intolerancias / Patologías:
${intoleranceRules || '  (Sin intolerancias declaradas)'}

REGLAS OBLIGATORIAS:
1. TIPO DE ALIMENTACIÓN "${dietType || 'Normal'}": NO incluyas alimentos prohibidos. Vegana: sin carnes/lácteos/huevo. Vegetariana: sin carnes/pescado. Pesco-vegetariana: sin carnes rojas ni aves.
2. ALIMENTOS PROHIBIDOS: "${foodRestrictions || 'ninguno'}" — no aparezcan en ningún ingrediente.
3. Respetar ESTRICTAMENTE las intolerancias indicadas.
4. NOMBRES ARGENTINOS: fideos, galletitas, zapallo, choclo, batata, ananá, durazno, ricota, porotos, arvejas, mandioca, bife, pan lactal, medialunas, mate.
5. Cantidades en medidas caseras argentinas (pocillo, taza, cda, cdita, unidad).
6. Recetas prácticas, rápidas (≤30 min de preparación cuando el tipo lo requiera) y alineadas al objetivo.
7. Cada receta debe tener ingredientes precisos con cantidades y pasos claros de preparación.

Devuelve UN OBJETO JSON PURO válido con esta estructura exacta:
{
  "context": "Descripción breve del tipo de recetas generadas y su objetivo",
  "recipes": [
    {
      "title": "Nombre de la receta",
      "category": "${mealType}",
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
      "nutritionalHighlight": "Aporta aproximadamente X proteínas, Y carbohidratos. Ideal para...",
      "tip": "Consejo práctico de preparación o conservación"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.8,
      }
    });

    if (!response.text) throw new Error('No text from Gemini');
    res.status(200).json(JSON.parse(response.text));
  } catch (error: any) {
    console.error('Error generating recipes:', error);
    res.status(500).json({ error: error.message });
  }
}
