// Rangos de referencia y utilidades de clasificación para resultados de
// laboratorio. Las recomendaciones siguen guías ampliamente usadas (ADA, NCEP
// ATP III, Endocrine Society para vitamina D, JNC8 para presión arterial).
// Si el equipo clínico necesita ajustar umbrales, modificar este archivo.

export type LabField =
  | 'glucose'
  | 'hba1c'
  | 'total_cholesterol'
  | 'ldl'
  | 'hdl'
  | 'triglycerides'
  | 'vitamin_d'
  | 'bp_systolic'
  | 'bp_diastolic'
  | 'tg_hdl_ratio';

export type LabClassification = 'normal' | 'altered' | 'unknown';

export interface LabFieldDef {
  field: LabField;
  label: string;
  shortLabel: string;
  unit: string;
  /** true cuando un valor más alto es deseable (ej. HDL, Vitamina D) */
  higherIsBetter: boolean;
  /** Texto descriptivo del rango considerado normal */
  normalRange: string;
  /** Decimales razonables al mostrar */
  decimals: number;
}

export const LAB_FIELDS: LabFieldDef[] = [
  { field: 'glucose',           label: 'Glucemia en ayunas',  shortLabel: 'Glucemia',     unit: 'mg/dL',  higherIsBetter: false, normalRange: '< 100',          decimals: 0 },
  { field: 'hba1c',             label: 'Hemoglobina glicosilada (HbA1c)', shortLabel: 'HbA1c', unit: '%',  higherIsBetter: false, normalRange: '< 5.7',          decimals: 1 },
  { field: 'total_cholesterol', label: 'Colesterol total',    shortLabel: 'Col. Total',   unit: 'mg/dL',  higherIsBetter: false, normalRange: '< 200',          decimals: 0 },
  { field: 'ldl',               label: 'Colesterol LDL',      shortLabel: 'LDL',          unit: 'mg/dL',  higherIsBetter: false, normalRange: '< 100',          decimals: 0 },
  { field: 'hdl',               label: 'Colesterol HDL',      shortLabel: 'HDL',          unit: 'mg/dL',  higherIsBetter: true,  normalRange: '≥ 40 H · ≥ 50 M', decimals: 0 },
  { field: 'triglycerides',     label: 'Triglicéridos',       shortLabel: 'TG',           unit: 'mg/dL',  higherIsBetter: false, normalRange: '< 150',          decimals: 0 },
  { field: 'vitamin_d',         label: 'Vitamina D',          shortLabel: 'Vit. D',       unit: 'ng/mL',  higherIsBetter: true,  normalRange: '≥ 30',           decimals: 1 },
  { field: 'bp_systolic',       label: 'Presión sistólica',   shortLabel: 'PA Sist.',     unit: 'mmHg',   higherIsBetter: false, normalRange: '< 130',          decimals: 0 },
  { field: 'bp_diastolic',      label: 'Presión diastólica',  shortLabel: 'PA Diast.',    unit: 'mmHg',   higherIsBetter: false, normalRange: '< 85',           decimals: 0 },
  { field: 'tg_hdl_ratio',      label: 'Relación TG / HDL',   shortLabel: 'TG/HDL',       unit: '',       higherIsBetter: false, normalRange: '< 3.5',          decimals: 2 },
];

export const LAB_FIELD_BY_KEY: Record<LabField, LabFieldDef> = LAB_FIELDS.reduce(
  (acc, def) => { acc[def.field] = def; return acc; },
  {} as Record<LabField, LabFieldDef>,
);

export function classifyLab(field: LabField, value: number | null | undefined, sex?: string | null): LabClassification {
  if (value == null || !Number.isFinite(value)) return 'unknown';
  switch (field) {
    case 'glucose':           return value < 100 ? 'normal' : 'altered';
    case 'hba1c':             return value < 5.7 ? 'normal' : 'altered';
    case 'total_cholesterol': return value < 200 ? 'normal' : 'altered';
    case 'ldl':               return value < 100 ? 'normal' : 'altered';
    case 'hdl': {
      const min = sex === 'Masculino' ? 40 : 50;
      return value >= min ? 'normal' : 'altered';
    }
    case 'triglycerides':     return value < 150 ? 'normal' : 'altered';
    case 'vitamin_d':         return value >= 30 ? 'normal' : 'altered';
    case 'bp_systolic':       return value < 130 ? 'normal' : 'altered';
    case 'bp_diastolic':      return value < 85 ? 'normal' : 'altered';
    case 'tg_hdl_ratio':      return value < 3.5 ? 'normal' : 'altered';
    default:                  return 'unknown';
  }
}

export type LabTrend = 'improved' | 'same' | 'worsened' | 'unknown';

/** Compara un valor actual contra el anterior teniendo en cuenta si "más alto es mejor" */
export function evaluateTrend(field: LabField, current: number | null | undefined, previous: number | null | undefined): LabTrend {
  if (current == null || previous == null || !Number.isFinite(current) || !Number.isFinite(previous)) return 'unknown';
  if (current === previous) return 'same';
  const def = LAB_FIELD_BY_KEY[field];
  if (def.higherIsBetter) return current > previous ? 'improved' : 'worsened';
  return current < previous ? 'improved' : 'worsened';
}

export function tgHdlRatio(tg: number | null | undefined, hdl: number | null | undefined): number | null {
  if (tg == null || hdl == null || !hdl) return null;
  return Number((tg / hdl).toFixed(2));
}

/** Lista de campos que cuentan como "parámetros metabólicos" para la métrica
 *  agregada de "% pacientes que mejoraron al menos uno". */
export const METABOLIC_FIELDS: LabField[] = [
  'glucose',
  'hba1c',
  'total_cholesterol',
  'ldl',
  'hdl',
  'triglycerides',
];
