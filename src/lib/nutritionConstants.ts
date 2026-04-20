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

// "Deportista" ya no es una condición fisiológica — se deriva del nivel de actividad.
export const CONDITIONS_LIST = [
  'Embarazo y Lactancia',
  'Menopausia',
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

// Nivel de actividad simplificado según indicación de Rosana (umbral OMS de 150 min/semana).
// - Bajo: paciente sedentario o con actividad leve ocasional.
// - Alto: paciente que cumple o supera las recomendaciones de actividad aeróbica.
export interface ActivityLevel {
  value: string;
  label: string;
  descShort: string;
  faHB: number;     // Factor Harris-Benedict (para calcular VCT en normopeso/bajo peso)
  faGMT: number;    // Factor para mostrar GMT informativo en el resumen
  labelHB: string;  // Etiqueta que se muestra en "Fórmula utilizada"
  labelGMT: string; // Etiqueta para el GMT informativo
  isHigh: boolean;  // Activa distribución de macros tipo atleta
}

export const ACTIVITY_LEVELS: ActivityLevel[] = [
  {
    value: 'Menos de 150 min/semana',
    label: 'Menos de 150 min/semana — sedentario o actividad leve',
    descShort: '<150 min/sem',
    faHB: 1.375,
    faGMT: 1.4,
    labelHB: 'TMB × 1.375 (<150 min/sem)',
    labelGMT: 'GMR × 1.4',
    isHigh: false,
  },
  {
    value: '150 min/semana o más',
    label: '150 min/semana o más — actividad regular',
    descShort: '≥150 min/sem',
    faHB: 1.55,
    faGMT: 1.7,
    labelHB: 'TMB × 1.55 (≥150 min/sem)',
    labelGMT: 'GMR × 1.7',
    isHigh: true,
  },
];

export function getActivityLevel(value: string): ActivityLevel {
  return ACTIVITY_LEVELS.find(a => a.value === value) ?? ACTIVITY_LEVELS[0];
}
