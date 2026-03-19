import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { 
      patientInfo, 
      metrics, 
      preferences 
    } = req.body;

    const prompt = `Eres un nutricionista experto. Genera un plan alimentario personalizado en formato JSON.
Datos del paciente:
- Nombre: ${patientInfo.firstName} ${patientInfo.lastName}
- Sexo: ${patientInfo.sex}, Edad: ${patientInfo.age}
- Peso Actual: ${metrics.weight}kg, Talla: ${metrics.height}cm, IMC: ${metrics.bmi}
- Peso Ideal Calculado: ${metrics.idealWeight}kg
- Calorías Objetivo Calculadas: ${metrics.calories} kcal/día
- Distribución de Macros Requerida: ${metrics.macros.carbs}% Carbohidratos, ${metrics.macros.protein}% Proteínas, ${metrics.macros.fats}% Grasas
- Preferencia / Tipo de dieta: ${preferences.dietType}
- Nivel de Actividad: ${preferences.activityLevel}
- Objetivos específicos que lograr para la próxima consulta: ${preferences.objectives || 'Mejorar hábitos generales'}

IMPORTANTE REGLAS DE ORO: 
1. El paciente sigue una dieta de tipo: ${preferences.dietType}. NO incluyas alimentos que rompan esta regla bajo ninguna circunstancia (Ej: si es vegano/vegetariano, prohíbe las carnes de todo tipo. Si es Celíaco, debe ser estricto sin TACC. Si es sin lactosa, usa opciones vegetales o deslactosadas).
2. Prioriza carbohidratos de absorción lenta / integrales.
3. Las porciones en el plan diario deben aproximadamente coincidir con las calorías objetivo (${metrics.calories} kcal) y distribución de macros indicada. Da cantidades en gramos, tazas o medidas caseras.

Debes devolver obligatoriamente la respuesta como UN OBJETO JSON PURO válido y parseable, con la siguiente estructura exacta:
{
  "habitProfile": {
    "score": 85,
    "hydration": { "current": 20, "max": 30 },
    "foodAndFiber": { "current": 35, "max": 40 },
    "physicalActivity": { "current": 30, "max": 30 },
    "insufficientHydrationAlert": false
  },
  "healthyPlate": {
    "vegetablesPct": 50,
    "proteinsPct": 25,
    "carbsPct": 20,
    "fatsPct": 5
  },
  "dailyPlan": [
    {
      "time": "08:00",
      "type": "Desayuno",
      "title": "Desayuno Completo",
      "items": ["Item 1 con medida", "Item 2 con medida"],
      "tip": "Tip motivacional o sugerencia"
    },
    {
      "time": "10:30",
      "type": "Media mañana",
      "title": "Snack Saludable",
      "items": ["Snack 1"],
      "tip": "Tip"
    },
    {
      "time": "13:00",
      "type": "Almuerzo",
      "title": "Almuerzo Principal",
      "items": ["Plato compuesto..."],
      "tip": "Tip de saciedad"
    },
    {
      "time": "16:30",
      "type": "Merienda",
      "title": "Merienda Energética",
      "items": ["Item 1"],
      "tip": "Tip"
    },
    {
      "time": "20:00",
      "type": "Cena",
      "title": "Cena Ligera",
      "items": ["Item 1"],
      "tip": "Tip de digestión"
    }
  ],
  "recommendedGroups": {
    "vegetablesA": ["..."],
    "vegetablesB": ["..."],
    "leanProteins": ["..."],
    "wholeCarbs": ["..."],
    "healthyFats": ["..."],
    "fruits": ["..."]
  },
  "hydrationPlan": {
    "targetLiters": ${parseFloat((metrics.weight * 35 / 1000).toFixed(1))},
    "equivalentGlasses": ${Math.round(metrics.weight * 35 / 250)},
    "wakeupTip": "1 vaso al despertar",
    "workDayTip": "Botella visible en el escritorio",
    "nightTip": "No beber justo antes de dormir"
  },
  "shoppingList": {
    "vegetablesAndFruits": ["..."],
    "proteins": ["..."],
    "carbsAndLegumes": ["..."],
    "fatsAndDairy": ["..."]
  }
}
`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            temperature: 0.7,
        }
    });

    if (!response.text) throw new Error("No text from Gemini");
    const planText = response.text;
    res.status(200).json(JSON.parse(planText));
  } catch (error: any) {
    console.error('Error generating plan:', error);
    res.status(500).json({ error: error.message });
  }
}
