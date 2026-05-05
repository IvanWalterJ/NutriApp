// Reglas para derivar automáticamente si un paciente está "En Riesgo"
// a partir de factores clínicos (IMC, cintura, laboratorio).
// Un paciente entra en riesgo si tiene AL MENOS UN factor en rojo,
// salvo que esté manualmente marcado como "Objetivo Alcanzado"
// (eso no se pisa: respetamos la decisión clínica de la nutricionista).

export type RiskCategory = 'imc' | 'cintura' | 'glucemia' | 'hba1c' | 'colesterol' | 'ldl' | 'hdl' | 'triglyc' | 'tg_hdl' | 'pa_sis' | 'pa_dia';

export interface RiskFlag {
  code: RiskCategory;
  label: string;
  value: number;
  thresholdLabel: string;
}

export interface PatientRiskInput {
  sex?: string | null;
  /** Última talla disponible (sesiones más reciente que tenga talla, o patients.height) */
  height?: number | null;
  /** Último peso (de sesiones, o initial_weight) */
  weight?: number | null;
  /** Última cintura (girth_waist) */
  waist?: number | null;
  /** Último laboratorio del paciente (puede ser null) */
  lab?: {
    glucose?: number | null;
    hba1c?: number | null;
    total_cholesterol?: number | null;
    ldl?: number | null;
    hdl?: number | null;
    triglycerides?: number | null;
    bp_systolic?: number | null;
    bp_diastolic?: number | null;
  } | null;
}

export interface PatientRiskAssessment {
  flags: RiskFlag[];
  atRisk: boolean;
}

function isFiniteNumber(v: any): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function assessPatientRisk(input: PatientRiskInput): PatientRiskAssessment {
  const flags: RiskFlag[] = [];
  const sex = input.sex || null;

  // ── IMC ≥ 30 (obesidad)
  if (isFiniteNumber(input.weight) && isFiniteNumber(input.height) && input.height > 0) {
    const imc = Number((input.weight / Math.pow(input.height / 100, 2)).toFixed(1));
    if (imc >= 30) {
      flags.push({ code: 'imc', label: 'IMC en obesidad', value: imc, thresholdLabel: '≥ 30' });
    }
  }

  // ── Cintura > 94 H / 80 M (riesgo cardiovascular elevado)
  if (isFiniteNumber(input.waist)) {
    const threshold = sex === 'Masculino' ? 94 : 80;
    if (input.waist > threshold) {
      flags.push({
        code: 'cintura',
        label: 'Cintura elevada',
        value: input.waist,
        thresholdLabel: `> ${threshold} cm (${sex === 'Masculino' ? 'H' : 'M'})`,
      });
    }
  }

  // ── Laboratorio
  const lab = input.lab;
  if (lab) {
    if (isFiniteNumber(lab.glucose) && lab.glucose >= 100) {
      flags.push({ code: 'glucemia', label: 'Glucemia alterada', value: lab.glucose, thresholdLabel: '≥ 100 mg/dL' });
    }
    if (isFiniteNumber(lab.hba1c) && lab.hba1c >= 5.7) {
      flags.push({ code: 'hba1c', label: 'HbA1c elevada', value: lab.hba1c, thresholdLabel: '≥ 5.7%' });
    }
    if (isFiniteNumber(lab.total_cholesterol) && lab.total_cholesterol >= 200) {
      flags.push({ code: 'colesterol', label: 'Colesterol total elevado', value: lab.total_cholesterol, thresholdLabel: '≥ 200 mg/dL' });
    }
    if (isFiniteNumber(lab.ldl) && lab.ldl >= 100) {
      flags.push({ code: 'ldl', label: 'LDL elevado', value: lab.ldl, thresholdLabel: '≥ 100 mg/dL' });
    }
    if (isFiniteNumber(lab.hdl)) {
      const min = sex === 'Masculino' ? 40 : 50;
      if (lab.hdl < min) {
        flags.push({ code: 'hdl', label: 'HDL bajo', value: lab.hdl, thresholdLabel: `< ${min} mg/dL (${sex === 'Masculino' ? 'H' : 'M'})` });
      }
    }
    if (isFiniteNumber(lab.triglycerides) && lab.triglycerides >= 150) {
      flags.push({ code: 'triglyc', label: 'Triglicéridos elevados', value: lab.triglycerides, thresholdLabel: '≥ 150 mg/dL' });
    }
    if (isFiniteNumber(lab.triglycerides) && isFiniteNumber(lab.hdl) && lab.hdl > 0) {
      const ratio = Number((lab.triglycerides / lab.hdl).toFixed(2));
      if (ratio >= 3.5) {
        flags.push({ code: 'tg_hdl', label: 'Ratio TG/HDL elevado', value: ratio, thresholdLabel: '≥ 3.5' });
      }
    }
    if (isFiniteNumber(lab.bp_systolic) && lab.bp_systolic >= 130) {
      flags.push({ code: 'pa_sis', label: 'Presión sistólica elevada', value: lab.bp_systolic, thresholdLabel: '≥ 130 mmHg' });
    }
    if (isFiniteNumber(lab.bp_diastolic) && lab.bp_diastolic >= 85) {
      flags.push({ code: 'pa_dia', label: 'Presión diastólica elevada', value: lab.bp_diastolic, thresholdLabel: '≥ 85 mmHg' });
    }
  }

  return { flags, atRisk: flags.length > 0 };
}

/** Devuelve el estado efectivo del paciente combinando el status manual con el riesgo derivado.
 *  - Si la nutricionista marcó "Objetivo Alcanzado" o "Requiere Derivación", se respeta.
 *  - Si hay al menos un factor en rojo → "En Riesgo".
 *  - Sino → respeta el status manual (default "En Progreso"). */
export function deriveStatus(
  manualStatus: string | null | undefined,
  assessment: PatientRiskAssessment,
): string {
  const manual = manualStatus || 'En Progreso';
  if (manual === 'Objetivo Alcanzado' || manual === 'Requiere Derivación') return manual;
  if (assessment.atRisk) return 'En Riesgo';
  return manual;
}
