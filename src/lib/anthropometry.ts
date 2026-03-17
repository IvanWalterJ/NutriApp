// ─── Shared Anthropometry Utilities ─────────────────────────────────────────
// Extracted so they can be used in both AnthropometryForm and AnthroReportButton

export type RefGroup = {
  fatMassKg: [number, number];
  muscleMassKg: [number, number];
  boneMassKg: [number, number];
  fatSuperior: [number, number];
  fatMedia: [number, number];
  fatInferior: [number, number];
  chestCm: [number, number];
  waistCm: [number, number];
  hipCm: [number, number];
};

export const REFERENCE: Record<string, Record<string, RefGroup>> = {
  Masculino: {
    'Activa - 16 a 18 años':        { fatMassKg:[14.2,2.8], muscleMassKg:[30.0,2.5], boneMassKg:[10.8,0.7], fatSuperior:[30.1,2.8], fatMedia:[39.8,3.1], fatInferior:[30.1,3.0], chestCm:[96.2,5.1],  waistCm:[78.4,6.2],  hipCm:[94.5,5.3]  },
    'Activa - 19 a 30 años':        { fatMassKg:[16.8,2.9], muscleMassKg:[31.0,2.2], boneMassKg:[11.4,0.8], fatSuperior:[29.5,2.7], fatMedia:[40.5,3.2], fatInferior:[30.0,2.9], chestCm:[98.5,5.3],  waistCm:[82.1,6.5],  hipCm:[97.2,5.2]  },
    'Activa - 31 a 50 años':        { fatMassKg:[20.0,3.3], muscleMassKg:[31.5,2.1], boneMassKg:[11.9,0.8], fatSuperior:[29.9,2.9], fatMedia:[40.9,3.3], fatInferior:[29.2,3.1], chestCm:[101.4,5.5], waistCm:[85.9,6.8],  hipCm:[100.3,5.4] },
    'Activa - Mayor de 50 años':    { fatMassKg:[23.5,3.5], muscleMassKg:[29.8,2.3], boneMassKg:[11.2,0.9], fatSuperior:[31.2,3.1], fatMedia:[41.5,3.4], fatInferior:[27.3,3.0], chestCm:[103.2,5.8], waistCm:[90.2,7.0],  hipCm:[101.8,5.6] },
    'Sedentaria - 16 a 18 años':    { fatMassKg:[18.5,3.2], muscleMassKg:[27.5,2.4], boneMassKg:[10.5,0.7], fatSuperior:[31.5,3.0], fatMedia:[40.0,3.2], fatInferior:[28.5,3.1], chestCm:[97.5,5.5],  waistCm:[83.2,6.8],  hipCm:[96.0,5.5]  },
    'Sedentaria - 19 a 30 años':    { fatMassKg:[21.0,3.4], muscleMassKg:[28.5,2.3], boneMassKg:[11.0,0.8], fatSuperior:[30.8,2.9], fatMedia:[41.2,3.3], fatInferior:[28.0,3.0], chestCm:[100.0,5.6], waistCm:[87.5,7.0],  hipCm:[98.8,5.5]  },
    'Sedentaria - 31 a 50 años':    { fatMassKg:[25.0,3.6], muscleMassKg:[29.0,2.2], boneMassKg:[11.5,0.8], fatSuperior:[32.0,3.0], fatMedia:[41.8,3.4], fatInferior:[26.2,3.1], chestCm:[104.0,6.0], waistCm:[93.0,7.2],  hipCm:[103.0,5.8] },
    'Sedentaria - Mayor de 50 años':{ fatMassKg:[28.0,3.8], muscleMassKg:[27.5,2.4], boneMassKg:[10.8,0.9], fatSuperior:[33.5,3.2], fatMedia:[42.2,3.5], fatInferior:[24.3,3.0], chestCm:[106.5,6.2], waistCm:[97.5,7.5],  hipCm:[104.5,6.0] },
  },
  Femenino: {
    'Activa - 16 a 18 años':        { fatMassKg:[15.8,2.5], muscleMassKg:[20.5,1.8], boneMassKg:[8.5,0.6], fatSuperior:[28.5,2.6], fatMedia:[38.0,3.0], fatInferior:[33.5,3.2], chestCm:[84.5,4.8], waistCm:[68.5,5.5], hipCm:[90.0,5.0]  },
    'Activa - 19 a 30 años':        { fatMassKg:[17.5,2.8], muscleMassKg:[21.0,1.9], boneMassKg:[8.9,0.7], fatSuperior:[28.0,2.5], fatMedia:[38.5,3.1], fatInferior:[33.5,3.1], chestCm:[86.2,4.9], waistCm:[70.8,5.8], hipCm:[92.5,5.2]  },
    'Activa - 31 a 50 años':        { fatMassKg:[20.5,3.0], muscleMassKg:[21.5,2.0], boneMassKg:[9.2,0.7], fatSuperior:[29.0,2.7], fatMedia:[39.0,3.2], fatInferior:[32.0,3.0], chestCm:[88.5,5.1], waistCm:[74.0,6.0], hipCm:[95.0,5.3]  },
    'Activa - Mayor de 50 años':    { fatMassKg:[24.0,3.2], muscleMassKg:[20.5,2.1], boneMassKg:[8.8,0.8], fatSuperior:[30.5,2.9], fatMedia:[39.8,3.3], fatInferior:[29.7,3.0], chestCm:[91.0,5.3], waistCm:[79.0,6.3], hipCm:[97.5,5.5]  },
    'Sedentaria - 16 a 18 años':    { fatMassKg:[20.0,3.0], muscleMassKg:[18.5,1.7], boneMassKg:[8.2,0.6], fatSuperior:[30.0,2.8], fatMedia:[38.5,3.1], fatInferior:[31.5,3.2], chestCm:[86.0,5.0], waistCm:[73.0,6.0], hipCm:[92.5,5.2]  },
    'Sedentaria - 19 a 30 años':    { fatMassKg:[22.5,3.2], muscleMassKg:[19.0,1.8], boneMassKg:[8.6,0.7], fatSuperior:[30.5,2.8], fatMedia:[39.2,3.2], fatInferior:[30.3,3.1], chestCm:[88.5,5.2], waistCm:[76.5,6.2], hipCm:[95.0,5.4]  },
    'Sedentaria - 31 a 50 años':    { fatMassKg:[26.0,3.4], muscleMassKg:[19.5,1.9], boneMassKg:[8.9,0.7], fatSuperior:[31.5,3.0], fatMedia:[40.0,3.3], fatInferior:[28.5,3.0], chestCm:[91.5,5.4], waistCm:[81.5,6.5], hipCm:[98.0,5.6]  },
    'Sedentaria - Mayor de 50 años':{ fatMassKg:[29.5,3.6], muscleMassKg:[18.5,2.0], boneMassKg:[8.5,0.8], fatSuperior:[33.0,3.1], fatMedia:[40.8,3.4], fatInferior:[26.2,3.0], chestCm:[94.0,5.6], waistCm:[86.5,6.8], hipCm:[100.5,5.8] },
  }
};

export const ACTIVITY_GROUPS = [
  'Activa - 16 a 18 años','Activa - 19 a 30 años','Activa - 31 a 50 años','Activa - Mayor de 50 años',
  'Sedentaria - 16 a 18 años','Sedentaria - 19 a 30 años','Sedentaria - 31 a 50 años','Sedentaria - Mayor de 50 años',
];

export function classify(value: number, mean: number, sd: number): string {
  if (value < mean - 1.5 * sd) return 'Excelente';
  if (value < mean - 0.5 * sd) return 'Muy Buena';
  if (value <= mean + 0.5 * sd) return 'Buena';
  if (value <= mean + 1.5 * sd) return 'Regular';
  return 'No Satisfactoria';
}

export function classifyColor(label: string): string {
  if (label === 'Excelente' || label === 'Muy Buena') return 'text-primary bg-primary/10';
  if (label === 'Buena')   return 'text-accent-dark bg-accent/10';
  if (label === 'Regular') return 'text-[#D97706] bg-warning/10';
  return 'text-danger bg-danger/10';
}

export function classifyBMI(bmi: number): string {
  if (bmi < 18.5) return 'Bajo Peso';
  if (bmi < 25)   return 'Normal';
  if (bmi < 30)   return 'Sobrepeso';
  if (bmi < 35)   return 'Obesidad Grado I';
  if (bmi < 40)   return 'Obesidad Grado II';
  return 'Obesidad Grado III';
}

export function classifyWaistHip(ratio: number, sex: string): string {
  if (sex === 'Masculino') {
    if (ratio < 0.90) return 'Valores Normales';
    if (ratio < 1.0)  return 'Riesgo Moderado';
    return 'Riesgo Elevado';
  }
  if (ratio < 0.85) return 'Valores Normales';
  if (ratio < 0.90) return 'Riesgo Moderado';
  return 'Riesgo Elevado';
}

export function classifyAbdominal(cm: number, sex: string): string {
  const limit = sex === 'Masculino' ? 102 : 88;
  const high  = sex === 'Masculino' ? 94  : 80;
  if (cm < high)  return 'Sin Riesgo';
  if (cm < limit) return 'Riesgo Incrementado';
  return 'Riesgo para la Salud Sustancialmente Incrementado';
}

export function calculateBodyComposition(data: any, sex: string, age: number) {
  const { weight, fold_triceps, fold_subscapular, fold_iliac_crest, fold_abdominal,
    fold_front_thigh, fold_medial_calf, fold_biceps,
    girth_arm_relaxed, girth_thigh_mid, girth_calf, girth_waist, girth_hip, girth_chest,
    diam_femur, diam_wrist, height } = data;

  const sum4 = fold_triceps + fold_subscapular + fold_iliac_crest + fold_abdominal;
  let fatPct = sex === 'Masculino'
    ? 0.29288 * sum4 - 0.0005 * sum4 * sum4 + 0.15845 * age - 5.76377
    : 0.29669 * sum4 - 0.00043 * sum4 * sum4 + 0.02963 * age + 1.4072;
  fatPct = Math.max(5, Math.min(60, fatPct));

  const fatMassKg      = weight * fatPct / 100;
  const boneMassKg     = 3.02 * Math.pow((height/100)**2 * (diam_femur/100) * (diam_wrist/100) * 400, 0.712);
  const residualMassKg = sex === 'Masculino' ? weight * 0.241 : weight * 0.209;
  const muscleMassKg   = (
    0.00744 * Math.pow(girth_thigh_mid   - Math.PI * (fold_front_thigh / 10), 2) +
    0.00088 * Math.pow(girth_arm_relaxed - Math.PI * (fold_triceps     / 10), 2) +
    0.00441 * Math.pow(girth_calf        - Math.PI * (fold_medial_calf / 10), 2)
  ) + (sex === 'Masculino' ? 2.4 : 0) - 0.048 * age + height * 0.048 + 7.8;

  const sum6        = fold_triceps + fold_subscapular + fold_biceps + fold_iliac_crest + fold_abdominal + (fold_front_thigh + fold_medial_calf) / 2;
  const fatSuperior = (fold_triceps + fold_subscapular) / sum6 * 100;
  const fatMedia    = (fold_iliac_crest + fold_abdominal) / sum6 * 100;
  const fatInferior = ((fold_front_thigh + fold_medial_calf) / 2) / sum6 * 100;
  const bmi         = weight / Math.pow(height / 100, 2);
  const waistHipRatio = girth_waist / girth_hip;

  return {
    fatPct:           parseFloat(fatPct.toFixed(1)),
    fatMassKg:        parseFloat(fatMassKg.toFixed(1)),
    muscleMassKg:     parseFloat(Math.max(5, muscleMassKg).toFixed(1)),
    boneMassKg:       parseFloat(boneMassKg.toFixed(1)),
    residualMassKg:   parseFloat(residualMassKg.toFixed(1)),
    musclePct:        parseFloat((Math.max(5, muscleMassKg) / weight * 100).toFixed(1)),
    bonePct:          parseFloat((boneMassKg / weight * 100).toFixed(1)),
    residualPct:      parseFloat((residualMassKg / weight * 100).toFixed(1)),
    fatSuperior:      parseFloat(fatSuperior.toFixed(1)),
    fatMedia:         parseFloat(fatMedia.toFixed(1)),
    fatInferior:      parseFloat(fatInferior.toFixed(1)),
    bmi:              parseFloat(bmi.toFixed(1)),
    waistHipRatio:    parseFloat(waistHipRatio.toFixed(2)),
    girth_chest, girth_waist, girth_hip,
  };
}

export function generateValoracion(r: any, firstName: string, lastName: string, ref: RefGroup): string {
  const posComp = (cls: string) => {
    if (cls === 'Excelente' || cls === 'Muy Buena') return 'Menor al comparativo';
    if (cls === 'Buena') return 'Similar al modelo';
    if (cls === 'Regular') return 'Ligeramente Superior al comparativo';
    return 'Superior al comparativo';
  };
  const clsFat    = classify(r.fatMassKg,    ref.fatMassKg[0],    ref.fatMassKg[1]);
  const clsMuscle = classify(r.muscleMassKg, ref.muscleMassKg[0], ref.muscleMassKg[1]);
  const clsBone   = classify(r.boneMassKg,   ref.boneMassKg[0],   ref.boneMassKg[1]);
  const clsSuper  = classify(r.fatSuperior,  ref.fatSuperior[0],  ref.fatSuperior[1]);
  const clsMedia  = classify(r.fatMedia,     ref.fatMedia[0],     ref.fatMedia[1]);
  const clsInfer  = classify(r.fatInferior,  ref.fatInferior[0],  ref.fatInferior[1]);

  const perims = [
    { name: 'la Circunferencia Torácica', value: r.girth_chest, mean: ref.chestCm[0] },
    { name: 'el Contorno de la Cintura',  value: r.girth_waist, mean: ref.waistCm[0] },
    { name: 'el Contorno de la Cadera',   value: r.girth_hip,   mean: ref.hipCm[0]   },
  ].map(p => ({ ...p, absDiff: Math.abs(p.value - p.mean), diff: parseFloat((p.value - p.mean).toFixed(1)) }));
  const similar   = perims.reduce((a, b) => a.absDiff < b.absDiff ? a : b);
  const different = perims.reduce((a, b) => a.absDiff > b.absDiff ? a : b);
  const fmt = (d: number) => (d > 0 ? `+${d}` : `${d}`);

  const actGroup = (r.activity_group || '').toLowerCase();

  return [
    `En este documento se ofrecen los valores de ${lastName}, ${firstName}, que fueron cotejados con su referencia específica (personas ${actGroup}, del mismo rango etario y sexo).`,
    ``,
    `Los datos obtenidos en porcentajes (%), en kilogramos (kg) y en centímetros (cm) se contrastan con medias (promedios) y/o desvíos (dispersiones estándares) del perfil modelo de referencia.`,
    ``,
    `Así entonces puede entenderse que:`,
    ``,
    `• La Masa Adiposa (en kg) es calificada como ${clsFat}.`,
    `• El Tejido Muscular (en kg) es clasificado como ${clsMuscle}.`,
    `• El Peso Óseo (en kg) es categorizado como ${clsBone}.`,
    ``,
    `• La Distribución de la Adiposidad (en %) indica que, en la Región Superior su valor es ${posComp(clsSuper)}, en la Región Media es ${posComp(clsMedia)}, y en la Región Inferior es ${posComp(clsInfer)}.`,
    ``,
    `• Puede catalogarse su Índice de Masa Corporal como "${classifyBMI(r.bmi)}", su Índice Cintura-Cadera como "${classifyWaistHip(r.waistHipRatio, r.sex)}", y su Perímetro Abdominal como "${classifyAbdominal(r.girth_waist, r.sex)}".`,
    ``,
    `• La cifra (en cm) más semejante con los Perímetros Musculares de la muestra "${r.activity_group}" es ${similar.name} (${fmt(similar.diff)} cm), y la más diferente es ${different.name} (${fmt(different.diff)} cm).`,
  ].join('\n');
}
