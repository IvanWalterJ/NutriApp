// Constantes clínicas compartidas entre el generador de planes y el recetario.
// Cualquier cambio en estas listas se refleja en ambas pantallas.

export const INTOLERANCES_LIST = [
  'Lactosa',
  'Gluten (Celíaco / Sin TACC)',
  'Colon Irritable',
  'Enfermedad Diverticular',
  'SiBO',
  'Hipertensión',
  'Diabetes',
  'Colesterol Alto',
  'Triglicéridos Altos',
  'Intolerancia a la Fructosa',
  'Medicación GLP-1 (Saxenda / liraglutide)',
] as const;

// "Deportista" va separado del nivel de actividad: el nivel define el VCT
// (factor de actividad sobre TMB), mientras que "Deportista" define 1.7 g/kg
// de proteína y distribución de macros atlética (17% PRO). Permite subir
// proteína sin alterar el aporte calórico.
export const CONDITIONS_LIST = [
  'Embarazo y Lactancia',
  'Menopausia',
  'Deportista',
] as const;

export interface PregnancyStage {
  value: string;
  kcalExtra: number;
  label: string;
}

export const PREGNANCY_STAGES: PregnancyStage[] = [
  { value: 'Primer trimestre',  kcalExtra: 0,   label: 'Primer trimestre (sin kcal extra)' },
  { value: 'Segundo trimestre', kcalExtra: 340, label: 'Segundo trimestre (+340 kcal)' },
  { value: 'Tercer trimestre',  kcalExtra: 450, label: 'Tercer trimestre (+450 kcal)' },
  { value: 'Lactancia',         kcalExtra: 500, label: 'Lactancia (+500 kcal)' },
];

// Nivel de actividad física — determina el factor de corrección sobre el GMR
// y define el VCT. Rosana pidió volver a los 5 niveles granulares porque el
// factor de corrección cambia por categoría.
export interface GmtFactorBySex {
  factor: number;
  label: string;
}

export interface ActivityLevel {
  value: string;
  label: string;
  faHB: number;     // Factor Harris-Benedict estándar (para VCT en normopeso/bajo peso)
  labelHB: string;  // Etiqueta mostrada en "Fórmula utilizada"
  // Factores del Excel para el GMT informativo (varían por sexo)
  faGMT: { m: GmtFactorBySex; f: GmtFactorBySex };
}

export const ACTIVITY_LEVELS: ActivityLevel[] = [
  {
    value: 'Sedentario',
    label: 'Sedentario — poco o ningún ejercicio',
    faHB: 1.2,
    labelHB: 'TMB × 1.2',
    faGMT: {
      m: { factor: 1.3, label: 'GMR × 1.3 (muy leve)' },
      f: { factor: 1.3, label: 'GMR × 1.3 (muy leve)' },
    },
  },
  {
    value: 'Ligera',
    label: 'Ligera — 1 a 3 días por semana',
    faHB: 1.375,
    labelHB: 'TMB × 1.375',
    faGMT: {
      m: { factor: 1.6, label: 'GMR × 1.6 (leve H)' },
      f: { factor: 1.5, label: 'GMR × 1.5 (leve M)' },
    },
  },
  {
    value: 'Moderada',
    label: 'Moderada — 3 a 5 días por semana',
    faHB: 1.55,
    labelHB: 'TMB × 1.55',
    faGMT: {
      m: { factor: 1.7, label: 'GMR × 1.7 (mod H)' },
      f: { factor: 1.6, label: 'GMR × 1.6 (mod M)' },
    },
  },
  {
    value: 'Intensa',
    label: 'Intensa — 6 a 7 días por semana',
    faHB: 1.725,
    labelHB: 'TMB × 1.725',
    faGMT: {
      m: { factor: 2.1, label: 'GMR × 2.1 (intensa H)' },
      f: { factor: 1.9, label: 'GMR × 1.9 (intensa M)' },
    },
  },
  {
    value: 'Muy Intensa',
    label: 'Muy Intensa — entrenamiento doble o trabajo físico',
    faHB: 1.9,
    labelHB: 'TMB × 1.9',
    faGMT: {
      m: { factor: 2.1, label: 'GMR × 2.1 (intensa H)' },
      f: { factor: 1.9, label: 'GMR × 1.9 (intensa M)' },
    },
  },
];

export function getActivityLevel(value: string): ActivityLevel {
  return ACTIVITY_LEVELS.find(a => a.value === value) ?? ACTIVITY_LEVELS[0];
}

export function getGmtFactor(level: ActivityLevel, sex: string): GmtFactorBySex {
  return sex === 'Masculino' ? level.faGMT.m : level.faGMT.f;
}
