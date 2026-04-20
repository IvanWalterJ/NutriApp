import { GoogleGenAI } from '@google/genai';
import Anthropic from '@anthropic-ai/sdk';

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
  console.log(`[Planes] OK con Claude (${CLAUDE_MODEL})`);
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
          console.log(`[Planes] OK con key ...${key.slice(-4)} y modelo ${model}`);
          return result;
        }
      } catch (e: any) {
        const msg = `key ...${key.slice(-4)} + ${model}: ${e?.message?.substring(0, 80)}`;
        console.warn(`[Planes] Falló ${msg}`);
        errors.push(msg);
      }
    }
  }

  console.warn('[Planes] Gemini agotado, cayendo a Claude como respaldo');
  try {
    return await generateWithClaudeFallback(params.contents);
  } catch (e: any) {
    const msg = `Claude: ${e?.message?.substring(0, 120)}`;
    console.warn(`[Planes] Falló ${msg}`);
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
      patientInfo,
      metrics,
      preferences
    } = req.body;

    const intolerancesList: string[] = preferences.intolerances || [];
    const pregnancyStage: string = preferences.pregnancyStage || '';
    const hideCalories: boolean = !!preferences.hideCalories;
    const isPregnant: boolean = intolerancesList.includes('Embarazo y Lactancia');
    const omitCaloriesInPlan: boolean = hideCalories || isPregnant;

    // Build specific intolerance / condition rules
    const intoleranceRules = intolerancesList.map((intol: string) => {
      if (intol.includes('Lactosa')) return 'INTOLERANCIA A LA LACTOSA: Prohibido cualquier lácteo con lactosa. Usar leche deslactosada, bebida de almendras, de avena o de soja. Quesos duros (mínimo de lactosa) o queso sin lactosa. Yogur deslactosado.';
      if (intol.includes('Gluten') || intol.includes('Celíaco')) return 'CELÍACO / SIN TACC: Prohibido estrictamente trigo, avena, cebada y centeno (TACC) en cualquier forma. Usar harina de arroz, fécula de mandioca, harina de maíz, copos de arroz, galletitas de arroz, pan sin TACC. Verificar que todos los procesados sean certificados sin TACC.';
      if (intol.includes('Colon Irritable')) return 'COLON IRRITABLE (SII): Seguir pauta baja en FODMAP. Evitar: cebolla, ajo, legumbres, lactosa, trigo en exceso, manzana, pera, mango, miel, fructosa. Preferir: arroz, papa, zanahoria, zapallo, pollo, pescado, huevo, arándanos, frutillas, naranja, mandarina. Cocciones simples, sin frituras ni condimentos irritantes.';
      if (intol.includes('Diverticular')) return 'ENFERMEDAD DIVERTICULAR: Dieta alta en fibra soluble. Evitar semillas pequeñas (chía, sésamo, amapola), frutas con semillas incrustadas (frutillas, higos, kiwi en exceso), porotos enteros. Preferir fibra soluble: avena, zanahoria, calabaza, banana, arroz integral. Buena hidratación.';
      if (intol.includes('SiBO')) return 'SIBO (Sobrecrecimiento Bacteriano Intestinal) — ETAPA INICIAL estricta baja en FODMAP. EVITAR lácteos fermentables (crema de leche, helado, leche, quesos blandos, yogur). Frutos secos y frutas altas en FODMAP: almendras, castañas de cajú, caqui, cereza, ciruela y ciruela desecada, damasco, dátil, durazno, frutas enlatadas, granada, higo, mango, manzana, orejón, pasa de uva, pelón, pera, pistacho, sandía. Vegetales fermentables: ajo, alcaucil, apio, arveja, batata, brócoli, calabaza, cebolla, choclo, coliflor, espárrago, mandioca, puerro, remolacha, repollo. Cereales con gluten y fermentables: trigo, centeno, cebada, amaranto, arroz integral. Legumbres: garbanzo, lenteja, poroto rojo, soja. Dulces y edulcorantes: azúcar, caramelos, chocolate, golosinas, galletitas, edulcorantes terminados en "ol" (sorbitol, manitol, xilitol, maltitol), JMAF, miel, jarabe de arce. Bebidas: bebida de soja, jugos industrializados, ron, vino blanco, gaseosas, cerveza. PERMITIR: arroz blanco, papa, carne, pollo, pescado, huevo, zanahoria, espinaca, lechuga, tomate cherry, arándanos, frutillas, kiwi, naranja, leche sin lactosa, queso duro en poca cantidad. Estrategia: probar tolerancia progresivamente y luego transicionar hacia una DIETA MEDITERRÁNEA.';
      if (intol.includes('Hipertensión')) return 'HIPERTENSIÓN ARTERIAL: Restricción estricta de sodio. EVITAR: embutidos, fiambres, quesos maduros, snacks salados (papas fritas, palitos), comida rápida, sopas instantáneas, caldos en cubo, conservas con sal, aderezos comerciales, salsa de soja, encurtidos. INCLUIR: pescado 2 veces/semana (sardina, salmón, caballa, atún), aceite de oliva extra virgen, palta, frutos secos sin sal, vegetales y frutas frescas, legumbres, cereales integrales. Priorizar hierbas y especias (orégano, pimentón, comino, laurel, ajo fresco) en lugar de sal. Patrón DASH.';
      if (intol.includes('Diabetes')) return 'DIABETES: EVITAR azúcares simples, miel, jarabe de maíz de alta fructosa y alcohol. Evitar preparaciones que generen picos glucémicos como licuados, puré o jugos exprimidos de frutas. INCLUIR fibra en cada comida (verduras, legumbres, semillas de chía y lino), cereales integrales (arroz integral, avena, quinoa, pan integral) y EVITAR harinas refinadas. No pasar más de 4 horas sin comer y distribuir los hidratos en todas las comidas. Elegir frutas enteras con piel en lugar de jugos.';
      if (intol.includes('Colesterol')) return 'COLESTEROL ALTO (Hipercolesterolemia): Restringir grasa saturada (<7% VCT) y colesterol dietario (<200 mg/día). Priorizar omega-3: aumentar consumo de pescado fresco 2-3 veces/semana (salmón, caballa, atún, anchoa, arenque, sardina, mariscos). Carnes rojas magras máximo 2 veces/semana y pollo sin piel. Aumentar fibra alimentaria total — fibra soluble: avena, legumbres (arvejas, porotos, garbanzos, soja, lentejas), manzana, pera, cebada, cítricos, zanahoria, brócoli; también arroz o fideos integrales, pastas semoladas de trigo candeal, salvado de trigo, quinoa, amaranto. Esteroles vegetales. Aceites y semillas: oliva extra virgen, canola, soja, lino, chía, sésamo, frutos secos (almendras, nueces, castañas de cajú). EVITAR: fiambres, embutidos, vísceras (hígado, riñón), piel de pollo, lácteos enteros, manteca, crema, bollería, margarina, fritos y ultraprocesados.';
      if (intol.includes('Triglicéridos')) return 'TRIGLICÉRIDOS ALTOS (Hipertrigliceridemia): Reducir azúcares simples y fructosa libre al mínimo. Alcohol CERO. Limitar harinas refinadas y productos de panadería. Aumentar omega-3 (pescado azul 2-3 veces/semana: caballa, sardina, jurel, salmón, atún) y fibra soluble. Fomentar ejercicio aeróbico. EVITAR: jugos de fruta (incluso naturales), gaseosas, bebidas azucaradas, miel, dulces, mermeladas, pastelería, helados, cereales azucarados. SUGERIR como suplemento: cápsulas de chía u omega-3 de alta concentración.';
      if (intol.includes('Fructosa')) return 'INTOLERANCIA A LA FRUCTOSA: Evitar fructosa libre y polioles. PROHIBIDAS: coco, granada, mango, manzana, melón, papaya, pera, sandía, ciruela, membrillo, durazno, damasco. Jugos de manzana y pera, frutas deshidratadas, jugos industriales. EVITAR ingredientes: fructosa, jarabe de fructosa, jarabe de maíz de alta fructosa, sorbitol, maltitol, xilitol, isomalt, agave, miel. Bebidas prohibidas: whisky, vermouth. Condimentos: ketchup y salsas comerciales que contengan jarabe de maíz o fructosa. PERMITIDAS CON MODERACIÓN: bananas bien maduras, frutillas, arándanos, kiwi, limón, naranja.';
      if (intol.includes('Deportista')) return 'DEPORTISTA: Cubrir 1.7 g/kg de proteínas (ya aplicado en el requerimiento). Priorizar timing nutricional: proteína post-entreno (20-30 g de proteína de alta calidad dentro de los 30-60 min siguientes). Hidratos de absorción lenta pre-entreno (avena, arroz integral, batata); hidratos de absorción rápida post-entreno (banana, dátiles, arroz blanco). Incluir 2-3 colaciones proteicas-energéticas entre comidas. Hidratación 35-40 ml/kg + 500 ml adicionales por hora de entrenamiento. Electrolitos en sesiones >60 min.';
      if (intol.includes('Embarazo y Lactancia')) {
        const stageLabel = pregnancyStage ? ` (ETAPA: ${pregnancyStage})` : '';
        return `EMBARAZO Y LACTANCIA${stageLabel}: Proteína a 1.5 g/kg (aplicado). Calcio 1200 mg/día (lácteos 3-4 porciones/día, almendras, brócoli, kale, espinaca, sardinas con espina, tofu con calcio). Hierro 27 mg/día (carne roja magra 2-3 veces/semana, lentejas con vitamina C, espinaca, morcilla cocida — combinar con cítricos para absorción). Ácido fólico 600 mcg (verduras de hoja verde oscuro, legumbres, cítricos, palta). Omega-3 DHA (pescado azul bajo en mercurio: sardina, caballa, salmón 2 veces/semana — EVITAR ESTRICTAMENTE atún rojo, pez espada, tiburón, caballa rey por alto contenido de mercurio). Yodo (sal yodada, lácteos). PROHIBIDOS: embutidos crudos, quesos blandos no pasteurizados (brie, camembert, feta, roquefort sin pasteurizar), pescado y carne crudos (sushi, ceviche, carpaccio), alcohol, cafeína >200 mg/día (máximo 2 tazas café), paté, vísceras, huevos crudos. ESQUEMA: 3 comidas principales + 2-3 colaciones (evitar ayunos prolongados, náuseas). Incluir porción de lácteo en desayuno, merienda y una colación.`;
      }
      if (intol.includes('Menopausia')) return 'MENOPAUSIA: Proteína a 1.0 g/kg (aplicado) para preservar masa magra. Calcio 1200 mg/día (lácteos descremados 3 porciones, sardinas con espina, almendras, semillas de sésamo, tofu con calcio, brócoli). EVITAR inhibidores de absorción de calcio: café, té, mate, bebidas energizantes, exceso de sodio en snacks salados, fiambres, embutidos y ultraprocesados; bebidas colas (fósforo). Promover REMOJO de legumbres y cereales para eliminar fitatos y mejorar absorción de calcio/hierro. Vitamina D (exposición solar 15 min/día + pescado azul + yema de huevo, considerar suplementación). Magnesio (frutos secos, palta, cacao amargo 70%+, semillas de zapallo). Fitoestrógenos (soja, tofu, tempeh, lino molido, legumbres). Carbohidratos de absorción lenta (legumbres, cereales integrales). Reducir azúcares simples y grasas saturadas. Limitar cafeína y alcohol (impactan densidad ósea y sofocos). Priorizar alimentos que apoyen salud cardiovascular post-menopáusica. RECOMENDACIÓN: sumar ejercicio de fuerza 2-3 veces/semana para densidad ósea.';
      if (intol.includes('GLP-1')) return 'MEDICACIÓN ANÁLOGA DE GLP-1 (Saxenda / liraglutide / semaglutide): Priorizar saciedad con calidad nutricional. PROTEÍNAS MAGRAS en cada comida (pollo, pescado, huevo, yogur, legumbres). FIBRA clave: verduras (eje de cada comida), frutas enteras, avena, semillas. GRASAS SALUDABLES en pequeñas cantidades (palta, frutos secos, aceite de oliva). CARBOHIDRATOS DE ABSORCIÓN LENTA (avena, arroz integral, legumbres). Comer lento y fraccionado — 4 a 5 comidas chicas/día para evitar síntomas gastrointestinales (náuseas, reflujo). EVITAR: comidas grasas o fritas, alcohol, bebidas gaseosas, cargas altas en una sola comida.';
      return '';
    }).filter(Boolean).join('\n');

    const prompt = `Eres un nutricionista clínico experto argentino. Genera un plan alimentario personalizado en formato JSON.
Datos del paciente:
- Nombre: ${patientInfo.firstName} ${patientInfo.lastName}
- Sexo: ${patientInfo.sex}, Edad: ${patientInfo.age} años
- Peso Actual: ${patientInfo.weight}kg, Talla: ${patientInfo.height}cm${isPregnant ? ' (paciente en embarazo/lactancia — NO calcular ni mencionar IMC ni categoría de peso)' : `, IMC: ${metrics.bmi} (${metrics.bmiCategory})`}
${isPregnant ? '' : `- Peso Ideal (Hamwi): ${metrics.idealWeight}kg${metrics.bmiCategory !== 'Normopeso' ? ` / Peso Ideal Corregido (PIC): ${metrics.adjustedIdealWeight}kg` : ''}`}
- Proteínas requeridas: ${metrics.proteinGrams}g/día (${metrics.proteinGPerKg} g/kg · fórmula Rosana)
${omitCaloriesInPlan
  ? `- Calorías: OMITIR el requerimiento calórico (${isPregnant ? 'embarazo/lactancia' : 'indicación clínica — posible TCA'}). NO incluir kcal en el JSON ni mencionar calorías en ninguna recomendación. Enfocar el plan en calidad nutricional, saciedad y variedad.`
  : `- Calorías Objetivo: ${metrics.calories} kcal/día (${metrics.calculationMethod})`}
- Distribución de Macros: ${metrics.macros.carbs}% Carbohidratos · ${metrics.macros.protein}% Proteínas · ${metrics.macros.fats}% Grasas
- Tipo de alimentación: ${preferences.dietType}
- Intolerancias / Patologías / Condiciones: ${intolerancesList.length > 0 ? intolerancesList.join(', ') : 'Ninguna'}${pregnancyStage ? ` (Etapa: ${pregnancyStage})` : ''}
- Nivel de Actividad: ${preferences.activityLevel}
- Alimentos que NO puede consumir: ${preferences.foodRestrictions || 'Ninguno'}
- Objetivos para la próxima consulta: ${preferences.objectives || 'Mejorar hábitos generales'}

REGLAS OBLIGATORIAS:
1. TIPO DE ALIMENTACIÓN "${preferences.dietType}": NO incluyas alimentos prohibidos por este tipo de dieta. Si es Vegana: sin carnes, lácteos ni huevo. Si es Vegetariana: sin carnes ni pescado. Si es Pesco-vegetariana: sin carnes rojas ni aves, sí pescado y mariscos.
2. ALIMENTOS PROHIBIDOS: "${preferences.foodRestrictions || 'ninguno'}" — no aparezcan en ninguna parte del JSON.
3. INTOLERANCIAS — Seguir estrictamente estas pautas clínicas:
${intoleranceRules || '   (Sin intolerancias declaradas)'}
4. CARBOHIDRATOS: Usar exclusivamente de absorción lenta / integrales. Incluir papa, batata, boniato, choclo y mandioca como carbohidratos. Ej: arroz integral, papa cocida, batata, boniato, avena, pan integral, fideos integrales, choclo, mandioca.
5. PORCIONES: ${omitCaloriesInPlan ? 'Las cantidades deben ser razonables y equilibradas según la distribución de macros. NO mencionar kcal en ninguna parte del JSON.' : `Las cantidades deben ser coherentes con ${metrics.calories} kcal y la distribución de macros indicada.`} Dar siempre cantidades en gramos, tazas o medidas caseras argentinas.${isPregnant ? '\n5b. EMBARAZO / LACTANCIA: El plan debe tener ESQUEMA de 3 comidas principales + 2-3 colaciones (evitar ayunos prolongados). Incluir porción de lácteo en desayuno, merienda y una colación. Priorizar micronutrientes críticos: calcio, hierro, ácido fólico, omega-3 DHA, yodo. NO mencionar déficit, pérdida de peso ni categoría de IMC.' : ''}
6. NOMBRES ARGENTINOS: Usar exclusivamente la denominación argentina de los alimentos. Ejemplos: "fideos" (no pasta), "galletitas" (no galletas), "remera/muslo de pollo" (no pechuga si no se especifica), "bife" (no bistec), "zapallo" (no calabaza), "choclo" (no maíz), "batata" (no camote), "arvejas" (no guisantes), "porotos" (no frijoles), "mandioca" (no yuca), "ananá" (no piña), "durazno" (no melocotón), "ricota" (no requesón), "queso cremoso/port salut", "pan lactal", "medialunas", "facturas", "mate/té de hierbas".
7. HEALTHYPLATE: carbsPct=${metrics.macros.carbs}, proteinsPct=${metrics.macros.protein}, fatsPct=${metrics.macros.fats}, vegetablesPct=0. Suma debe ser exactamente 100.
8. Devolver 2 recomendaciones o recetas prácticas alineadas a los objetivos del paciente.
9. CLASIFICACIÓN DE GRUPOS: Los LÁCTEOS (yogur, leche, queso) son PROTEÍNAS, NO grasas. Las GRASAS son solo aceites, frutos secos y semillas. Papa, batata, boniato, choclo y mandioca son CARBOHIDRATOS.
10. ESQUEMA ALIMENTARIO: El dailyPlan debe ser un MODELO GENERAL (no un menú fijo). NO incluir horarios. En cada comida, presentar opciones con "/" u "o" para que el paciente elija. Usar prefijos como "Elegir 1:", "Agregar:", "Opcional:". Los tipos de comida deben ser: Desayuno y Merienda, Colaciones (opcionales), Almuerzo, Cena. En almuerzo y cena, agrupar items por categoría (Proteínas:, Vegetales:, Grasas:, Carbohidratos:, Postre:).

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
    "carbsAndLegumes": ["Arroz integral", "Papa", "Batata", "Boniato", "Choclo", "Mandioca", "Avena", "Porotos", "Fideos integrales"],
    "proteins": ["Carne vacuna magra", "Pollo sin piel", "Huevo", "Pescado fresco"],
    "dairy": ["Yogur descremado", "Leche descremada", "Queso cremoso descremado", "Queso port salut light", "Ricota descremada"],
    "vegetablesAndFruits": ["Espinaca", "Zanahoria", "Tomate", "Lechuga", "Manzana", "Banana", "Naranja"],
    "fats": ["Aceite de oliva", "Palta", "Almendras", "Nueces", "Semillas de girasol", "Semillas de lino"],
    "canned": ["Atún al natural", "Jurel al natural", "Caballa al natural", "Legumbres en lata", "Vegetales en lata"],
    "frozen": ["Mix de vegetales congelados", "Pollo en porciones"]
  },
  "foodGroupsDetail": {
    "carbs": ["Arroz integral o parbolizado: 1 pocillo crudo", "Papa, batata o boniato: 1 unidad mediana", "Choclo: 1 unidad", "Mandioca: 1 trozo mediano", "Fideos integrales: 80g crudo", "Avena: 1/2 taza"],
    "proteins": ["Carne vacuna magra (lomo/nalga/peceto): 200g, 2 veces/semana", "Pollo sin piel: 1 pata-muslo o 1 pechuga, 2 veces/semana", "Pescado (merluza/atún/caballa): 200g, 1-2 veces/semana", "Huevo: hasta 1 por día", "Yogur descremado: 1 pote/día", "Leche descremada: 1 vaso (200ml)/día", "Queso descremado: 1 porción (30g)"],
    "fats": ["Aceite de oliva: 1 cucharada sopera por comida", "Palta: 1/4 unidad", "Frutos secos: 6 a 8 unidades", "Semillas (girasol, lino, chía): 1 cucharada"],
    "vegetablesA": ["Acelga", "Achicoria", "Ají", "Apio", "Berenjena", "Berro", "Brócoli", "Cardo", "Coliflor", "Escarola", "Espinaca", "Espárrago", "Endibia", "Hinojo", "Hongos", "Lechuga", "Nabiza", "Pepino", "Rábano", "Rabanito", "Radicha", "Radicheta", "Repollo", "Repollito de Bruselas", "Rúcula", "Tomate", "Zapallitos"],
    "vegetablesB": ["Alcaucil", "Arvejas frescas", "Cebolla", "Cebolla de verdeo", "Brotes de soja", "Chauchas", "Habas", "Nabo", "Palmitos", "Puerro", "Remolacha", "Zanahoria", "Zapallo"],
    "fruits": ["Manzana", "Banana", "Naranja", "Mandarina", "Pera", "Durazno", "Ananá", "Frutillas", "Arándanos", "Kiwi", "Uva", "Ciruela"]
  },
  "dailyPlan": [
    {
      "type": "Desayuno y Merienda",
      "title": "Desayuno y Merienda",
      "items": ["Infusión a gusto (té, café o mate)", "1 vaso (200ml) de leche descremada o 1 yogur descremado", "Elegir 1: 1 rebanada de pan integral / 2-3 tostadas integrales / 3-4 cdas de granola / 4 galletitas integrales", "Agregar: 1 cda queso untable descremado o 1 huevo o frutos secos (6-8 unidades)", "Opcional: 1 fruta"],
      "tip": "Las meriendas siguen el mismo esquema que el desayuno"
    },
    {
      "type": "Colaciones",
      "title": "Colaciones (opcionales)",
      "items": ["1 fruta chica", "Ensalada de frutas sin azúcar", "1 yogur descremado", "7-10 almendras o nueces"],
      "tip": "Elegir 1 opción entre comidas principales si se tiene hambre"
    },
    {
      "type": "Almuerzo",
      "title": "Almuerzo",
      "items": ["Proteínas: 150g carne / pollo / pescado o 2 huevos o legumbres", "Vegetales: 1-2 tazas de vegetales cocidos o crudos + hojas verdes a gusto", "Grasas: 1 cda de aceite de oliva", "Carbohidratos: 1 taza (arroz integral, fideos integrales, papa, quinoa, choclo)", "Postre: 1 fruta"],
      "tip": "Armar el plato con todos los grupos para una comida completa"
    },
    {
      "type": "Cena",
      "title": "Cena",
      "items": ["Vegetales: 1-2 tazas + hojas verdes a gusto", "Proteínas: 1 porción (similar al almuerzo)", "Carbohidratos: opcional según objetivo calórico", "Grasas: 1 cda de aceite de oliva", "Postre: 1 fruta"],
      "tip": "Cena más liviana que el almuerzo, priorizar vegetales"
    }
  ],
  "menuIdeas": {
    "carbsIdeas": ["Wok de arroz integral con vegetales y aceite de oliva", "Fideos integrales con salsa de tomates cherry y aceitunas", "Tortilla de papa y espinaca al horno"],
    "proteinIdeas": ["Bife a la criolla con puré de zapallo", "Pollo al horno con ensalada verde y batata", "Merluza al horno con vegetales grillados"]
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

    const response = await generateWithFallbacks({
      contents: prompt,
      config: { responseMimeType: "application/json", temperature: 0.7 },
    });

    if (!response.text) throw new Error("No text from AI providers");
    const planText = response.text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    res.status(200).json(JSON.parse(planText));
  } catch (error: any) {
    console.error('Error generating plan:', error);
    res.status(500).json({ error: error.message });
  }
}
