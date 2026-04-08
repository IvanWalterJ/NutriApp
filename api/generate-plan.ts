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

    const intolerancesList: string[] = preferences.intolerances || [];

    // Build specific intolerance rules
    const intoleranceRules = intolerancesList.map((intol: string) => {
      if (intol.includes('Lactosa')) return 'INTOLERANCIA A LA LACTOSA: Prohibido cualquier lácteo con lactosa. Usar leche deslactosada, bebida de almendras, de avena o de soja. Quesos duros (mínimo de lactosa) o queso sin lactosa. Yogur deslactosado.';
      if (intol.includes('Gluten') || intol.includes('Celíaco')) return 'CELÍACO / SIN TACC: Prohibido estrictamente trigo, avena, cebada y centeno (TACC) en cualquier forma. Usar harina de arroz, fécula de mandioca, harina de maíz, copos de arroz, galletitas de arroz, pan sin TACC. Verificar que todos los procesados sean certificados sin TACC.';
      if (intol.includes('Colon Irritable')) return 'COLON IRRITABLE (SII): Seguir pauta baja en FODMAP. Evitar: cebolla, ajo, legumbres, lactosa, trigo en exceso, manzana, pera, mango, miel, fructosa. Preferir: arroz, papa, zanahoria, zapallo, pollo, pescado, huevo, arándanos, frutillas, naranja, mandarina. Cocciones simples, sin frituras ni condimentos irritantes.';
      if (intol.includes('Diverticular')) return 'ENFERMEDAD DIVERTICULAR: Dieta alta en fibra soluble. Evitar semillas pequeñas (chía, sésamo, amapola), frutas con semillas incrustadas (frutillas, higos, kiwi en exceso), porotos enteros. Preferir fibra soluble: avena, zanahoria, calabaza, banana, arroz integral. Buena hidratación.';
      if (intol.includes('SiBO')) return 'SIBO (Sobrecrecimiento Bacteriano Intestinal): Dieta FODMAP estricta baja en fermentables. Evitar: legumbres, lácteos con lactosa, fructosa libre, polioles, ajo, cebolla, puerro, repollo, coliflor, brócoli, manzana, pera, sandía, miel, edulcorantes tipo sorbitol/manitol. Permitir: arroz, papa, carne, pollo, pescado, huevo, zanahoria, espinaca, lechuga, tomate cherry, arándanos, frutillas, kiwi, naranja.';
      return '';
    }).filter(Boolean).join('\n');

    const prompt = `Eres un nutricionista clínico experto argentino. Genera un plan alimentario personalizado en formato JSON.
Datos del paciente:
- Nombre: ${patientInfo.firstName} ${patientInfo.lastName}
- Sexo: ${patientInfo.sex}, Edad: ${patientInfo.age} años
- Peso Actual: ${patientInfo.weight}kg, Talla: ${patientInfo.height}cm, IMC: ${metrics.bmi} (${metrics.bmiCategory})
- Peso Ideal (Hamwi): ${metrics.idealWeight}kg${metrics.bmiCategory !== 'Normopeso' ? ` / Peso Ideal Corregido (PIC): ${metrics.adjustedIdealWeight}kg` : ''}
- Proteínas requeridas: ${metrics.proteinGrams}g/día (${metrics.proteinGPerKg} g/kg · fórmula Rosana)
- Calorías Objetivo: ${metrics.calories} kcal/día (${metrics.calculationMethod})
- Distribución de Macros: ${metrics.macros.carbs}% Carbohidratos · ${metrics.macros.protein}% Proteínas · ${metrics.macros.fats}% Grasas
- Tipo de alimentación: ${preferences.dietType}
- Intolerancias / Patologías: ${intolerancesList.length > 0 ? intolerancesList.join(', ') : 'Ninguna'}
- Nivel de Actividad: ${preferences.activityLevel}
- Alimentos que NO puede consumir: ${preferences.foodRestrictions || 'Ninguno'}
- Objetivos para la próxima consulta: ${preferences.objectives || 'Mejorar hábitos generales'}

REGLAS OBLIGATORIAS:
1. TIPO DE ALIMENTACIÓN "${preferences.dietType}": NO incluyas alimentos prohibidos por este tipo de dieta. Si es Vegana: sin carnes, lácteos ni huevo. Si es Vegetariana: sin carnes ni pescado. Si es Pesco-vegetariana: sin carnes rojas ni aves, sí pescado y mariscos.
2. ALIMENTOS PROHIBIDOS: "${preferences.foodRestrictions || 'ninguno'}" — no aparezcan en ninguna parte del JSON.
3. INTOLERANCIAS — Seguir estrictamente estas pautas clínicas:
${intoleranceRules || '   (Sin intolerancias declaradas)'}
4. CARBOHIDRATOS: Usar exclusivamente de absorción lenta / integrales. Ej: arroz integral, papa cocida, batata, avena, pan integral, fideos integrales.
5. PORCIONES: Las cantidades deben ser coherentes con ${metrics.calories} kcal y la distribución de macros indicada. Dar siempre cantidades en gramos, tazas o medidas caseras argentinas.
6. NOMBRES ARGENTINOS: Usar exclusivamente la denominación argentina de los alimentos. Ejemplos: "fideos" (no pasta), "galletitas" (no galletas), "remera/muslo de pollo" (no pechuga si no se especifica), "bife" (no bistec), "zapallo" (no calabaza), "choclo" (no maíz), "batata" (no camote), "arvejas" (no guisantes), "porotos" (no frijoles), "mandioca" (no yuca), "ananá" (no piña), "durazno" (no melocotón), "ricota" (no requesón), "queso cremoso/port salut", "pan lactal", "medialunas", "facturas", "mate/té de hierbas".
7. HEALTHYPLATE: carbsPct=${metrics.macros.carbs}, proteinsPct=${metrics.macros.protein}, fatsPct=${metrics.macros.fats}, vegetablesPct=0. Suma debe ser exactamente 100.
8. Devolver 2 recomendaciones o recetas prácticas alineadas a los objetivos del paciente.

Debes devolver obligatoriamente la respuesta como UN OBJETO JSON PURO válido y parseable, con la siguiente estructura exacta:
{
  "planObjective": "Frase corta describiendo el objetivo clínico del plan (ej: Reducir masa adiposa preservando masa muscular)",
  "healthyPlate": {
    "vegetablesPct": 0,
    "proteinsPct": ${metrics.macros.protein},
    "carbsPct": ${metrics.macros.carbs},
    "fatsPct": ${metrics.macros.fats}
  },
  "shoppingList": {
    "carbsAndLegumes": ["Arroz integral", "Papa", "Avena", "Porotos", "Fideos integrales"],
    "proteins": ["Carne vacuna magra", "Pollo sin piel", "Atún al natural", "Huevo"],
    "vegetablesAndFruits": ["Espinaca", "Zanahoria", "Tomate", "Manzana"],
    "fatsAndDairy": ["Aceite de oliva", "Palta", "Almendras", "Queso descremado"],
    "canned": ["Atún al natural", "Tomates en lata", "Arvejas en lata"],
    "frozen": ["Mix de vegetales congelados", "Pollo en porciones"]
  },
  "foodGroupsDetail": {
    "carbs": ["Arroz integral o parbolizado: 1 pocillo crudo", "Papa o batata: 1 unidad mediana", "Fideos integrales: 80g crudo", "Avena: 1/2 taza"],
    "proteins": ["Carne vacuna magra (lomo/nalga/peceto): 200g, 2 veces/semana", "Pollo sin piel: 1 pata-muslo o 1 pechuga, 2 veces/semana", "Pescado (atún/caballa/merluza): 200g, 1-2 veces/semana", "Huevo: 3 unidades"],
    "fats": ["Aceite de oliva: 1 cucharada sopera por comida", "Palta: 1/4 unidad", "Frutos secos: 6 a 8 unidades"]
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
      "title": "Snack",
      "items": ["Snack 1"],
      "tip": "Tip"
    },
    {
      "time": "13:00",
      "type": "Almuerzo",
      "title": "Almuerzo",
      "items": ["Plato compuesto con medidas..."],
      "tip": "Tip de saciedad"
    },
    {
      "time": "16:30",
      "type": "Merienda",
      "title": "Merienda",
      "items": ["Item 1"],
      "tip": "Tip"
    },
    {
      "time": "20:00",
      "type": "Cena",
      "title": "Cena",
      "items": ["Item 1"],
      "tip": "Tip de digestión"
    }
  ],
  "menuIdeas": {
    "carbsIdeas": ["Wok de arroz integral con vegetales y aceite de oliva", "Fideos con salsa de tomates cherry y aceitunas"],
    "proteinIdeas": ["Bife a la criolla con puré de zapallo", "Tortilla de espinaca al horno con ensalada"]
  },
  "recommendedGroups": {
    "vegetablesA": ["Acelga", "Espinaca", "Lechuga", "Tomate", "Pepino"],
    "vegetablesB": ["Zanahoria", "Remolacha", "Zapallo", "Choclo", "Arvejas"],
    "leanProteins": ["..."],
    "wholeCarbs": ["..."],
    "healthyFats": ["..."],
    "fruits": ["..."]
  },
  "hydrationPlan": {
    "targetLiters": ${parseFloat((patientInfo.weight * 35 / 1000).toFixed(1))},
    "equivalentGlasses": ${Math.round(patientInfo.weight * 35 / 250)},
    "wakeupTip": "1 vaso al despertar",
    "workDayTip": "Botella visible en el escritorio",
    "nightTip": "No beber justo antes de dormir"
  },
  "supplements": [
    { "name": "Ejemplo: Vitamina B12", "dosage": "Dosis...", "reason": "Justificación..." }
  ],
  "substitutes": [
    { "category": "Carbohidratos Base", "options": ["Arroz Integral", "Quinoa", "Batata"] },
    { "category": "Proteína Base", "options": ["Pollo magro", "Pescado", "Tofu"] }
  ],
  "recommendationsAndRecipes": [
    { "title": "Receta / Recomendación alineada al objetivo", "content": "Pasos o descripción..." }
  ]
}
`;

    const generateWithFallback = async () => {
      try {
        return await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: { responseMimeType: "application/json", temperature: 0.7 },
        });
      } catch {
        return await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: prompt,
          config: { responseMimeType: "application/json", temperature: 0.7 },
        });
      }
    };

    const response = await generateWithFallback();

    if (!response.text) throw new Error("No text from Gemini");
    const planText = response.text;
    res.status(200).json(JSON.parse(planText));
  } catch (error: any) {
    console.error('Error generating plan:', error);
    res.status(500).json({ error: error.message });
  }
}
