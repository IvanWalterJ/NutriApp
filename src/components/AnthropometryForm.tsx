import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import CustomSelect from './ui/CustomSelect';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { useCompany } from '../context/CompanyContext';
import SuccessModal from './SuccessModal';

// ─── Reference Tables ───────────────────────────────────────────────────────
type RefGroup = {
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

const REFERENCE: Record<string, Record<string, RefGroup>> = {
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

function classify(value: number, mean: number, sd: number): string {
  if (value < mean - 1.5 * sd) return 'Excelente';
  if (value < mean - 0.5 * sd) return 'Muy Buena';
  if (value <= mean + 0.5 * sd) return 'Buena';
  if (value <= mean + 1.5 * sd) return 'Regular';
  return 'No Satisfactoria';
}
function classifyColor(label: string): string {
  if (label === 'Excelente' || label === 'Muy Buena') return 'text-primary bg-primary/10';
  if (label === 'Buena')   return 'text-accent-dark bg-accent/10';
  if (label === 'Regular') return 'text-[#D97706] bg-warning/10';
  return 'text-danger bg-danger/10';
}
function classifyBMI(bmi: number): string {
  if (bmi < 18.5) return 'Bajo Peso';
  if (bmi < 25)   return 'Normal';
  if (bmi < 30)   return 'Sobrepeso';
  if (bmi < 35)   return 'Obesidad Grado I';
  if (bmi < 40)   return 'Obesidad Grado II';
  return 'Obesidad Grado III';
}
function classifyWaistHip(ratio: number, sex: string): string {
  if (sex === 'Masculino') {
    if (ratio < 0.90) return 'Valores Normales';
    if (ratio < 1.0)  return 'Riesgo Moderado';
    return 'Riesgo Elevado';
  }
  if (ratio < 0.85) return 'Valores Normales';
  if (ratio < 0.90) return 'Riesgo Moderado';
  return 'Riesgo Elevado';
}
function classifyAbdominal(cm: number, sex: string): string {
  const limit = sex === 'Masculino' ? 102 : 88;
  const high  = sex === 'Masculino' ? 94  : 80;
  if (cm < high)  return 'Sin Riesgo';
  if (cm < limit) return 'Riesgo Incrementado';
  return 'Riesgo para la Salud Sustancialmente Incrementado';
}

function calculateBodyComposition(data: any, sex: string, age: number) {
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

// ─── Shared style constants ──────────────────────────────────────────────────
const INPUT_CLS = 'w-full p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all';
const INPUT_FILLED_CLS = 'w-full p-3 border-2 border-primary/50 rounded-lg text-base bg-primary/5 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all';
const LABEL_CLS = 'block text-[0.85rem] font-semibold uppercase tracking-widest mb-1.5';
const REQUIRED_FIELDS = [
  'weight','height','fold_triceps','fold_subscapular','fold_biceps','fold_iliac_crest',
  'fold_abdominal','fold_front_thigh','fold_medial_calf',
  'girth_arm_relaxed','girth_chest','girth_waist','girth_hip','girth_thigh_mid','girth_calf',
  'diam_femur','diam_wrist',
];

// ─── MeasureGroup (defined OUTSIDE component to prevent remount on re-render) ─
interface MeasureGroupProps {
  title: string;
  subtitle?: string;
  fields: string[];
  formData: Record<string, any>;
  onChange: (key: string, value: string) => void;
}
function MeasureGroup({ title, subtitle, fields, formData, onChange }: MeasureGroupProps) {
  return (
    <div className="mb-6">
      <div className="mb-3">
        <h4 className="font-bold text-text-main">{title}</h4>
        {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {fields.map(field => {
          const [key, label] = field.split('|');
          const req = REQUIRED_FIELDS.includes(key);
          return (
            <div key={key}>
              <label className={LABEL_CLS}>
                {label}{req && <span className="text-danger ml-0.5">*</span>}
              </label>
              <input
                type="number"
                step="0.1"
                className={INPUT_CLS}
                value={formData[key] ?? ''}
                onChange={e => onChange(key, e.target.value)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Valoración Morfológica auto-narrative ───────────────────────────────────
function generateValoracion(r: any, firstName: string, lastName: string, ref: RefGroup): string {
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

  const actGroup = r.activity_group.toLowerCase();

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

// ─── Wizard steps config ─────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Datos Personales' },
  { id: 2, label: 'Medidas Base'     },
  { id: 3, label: 'Pliegues'         },
  { id: 4, label: 'Perímetros'       },
  { id: 5, label: 'Diámetros'        },
  { id: 6, label: 'Informe'          },
];

const ACTIVITY_GROUPS = [
  'Activa - 16 a 18 años','Activa - 19 a 30 años','Activa - 31 a 50 años','Activa - Mayor de 50 años',
  'Sedentaria - 16 a 18 años','Sedentaria - 19 a 30 años','Sedentaria - 31 a 50 años','Sedentaria - Mayor de 50 años',
];

const EMPTY_FORM = {
  patient_id: '', observation_number: '1',
  session_date: new Date().toISOString().split('T')[0],
  birth_date: '', sex: '', activity_group: '', race_ethnicity: 'Blanca o Hispánica',
  weight: '', height: '', sitting_height: '', arm_span: '',
  fold_triceps: '', fold_subscapular: '', fold_biceps: '', fold_iliac_crest: '',
  fold_supraspinale: '', fold_abdominal: '', fold_front_thigh: '', fold_medial_calf: '',
  girth_head: '', girth_neck: '', girth_arm_relaxed: '', girth_arm_flexed: '',
  girth_forearm: '', girth_wrist: '', girth_chest: '', girth_waist: '', girth_hip: '',
  girth_thigh_max: '', girth_thigh_mid: '', girth_calf: '', girth_ankle: '',
  diam_biacromial: '', diam_biiliocristal: '', diam_transverse_chest: '', diam_ap_chest: '',
  diam_humerus: '', diam_femur: '', diam_wrist: '', diam_ankle: '',
  len_acromiale_radiale: '', len_radiale_stylion: '', len_midstylion_dactylion: '',
  len_iliospinale: '', len_trochanterion: '', len_trochanterion_tibiale_laterale: '',
  len_tibiale_laterale: '', len_tibiale_mediale_sphyrion_tibiale: '', len_foot: '',
} as Record<string, string>;

// ─── Main component ──────────────────────────────────────────────────────────
export default function AnthropometryForm({ onComplete }: { onComplete?: () => void }) {
  const { showToast }       = useToast();
  const { selectedCompany } = useCompany();
  const [patients, setPatients]           = useState<any[]>([]);
  const [loading, setLoading]             = useState(false);
  const [fetchingPatients, setFetchingPatients] = useState(true);
  const [results, setResults]             = useState<any | null>(null);
  const [patientInfo, setPatientInfo]     = useState<any | null>(null);
  const [currentStep, setCurrentStep]     = useState(1);
  const [formData, setFormData]           = useState<Record<string, string>>({ ...EMPTY_FORM });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [latestConsultation, setLatestConsultation] = useState<any | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const prevTitle = useRef('');
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchPatients(); }, [selectedCompany]);

  async function fetchPatients() {
    setFetchingPatients(true);
    try {
      const { data, error } = await supabase
        .from('patients').select('id, first_name, last_name, birth_date, sex')
        .eq('company', selectedCompany).order('last_name', { ascending: true });
      if (error) throw error;
      setPatients(data || []);
    } catch (err) { console.error(err); }
    finally { setFetchingPatients(false); }
  }

  async function fetchLatestConsultation(patientId: string) {
    if (!patientId) { setLatestConsultation(null); return; }
    try {
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('patient_id', patientId)
        .eq('session_type', 'Consulta')
        .order('session_date', { ascending: false })
        .limit(1);
      setLatestConsultation(data && data.length > 0 ? data[0] : null);
    } catch { setLatestConsultation(null); }
  }

  function handlePatientChange(patientId: string) {
    const p = patients.find((x: any) => x.id === patientId);
    setFormData(prev => ({
      ...prev,
      patient_id: patientId,
      ...(p?.birth_date ? { birth_date: p.birth_date } : {}),
      ...(p?.sex        ? { sex: p.sex }               : {}),
    }));
    fetchLatestConsultation(patientId);
  }

  function getAge(birthDate: string): number {
    if (!birthDate) return 30;
    const today = new Date(), dob = new Date(birthDate);
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  }

  const calculatedAge = formData.birth_date ? getAge(formData.birth_date) : null;
  const selectedPatient = patients.find((p: any) => p.id === formData.patient_id);
  const patientHasBirth = !!selectedPatient?.birth_date;
  const patientHasSex   = !!selectedPatient?.sex;

  // Stable onChange handler for MeasureGroup — prevents remount
  const handleMeasureChange = useCallback((key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  function handleNext() {
    if (currentStep === 1) {
      if (!formData.patient_id)    { showToast('Seleccioná un paciente', 'error'); return; }
      if (!formData.birth_date)    { showToast('Ingresá la fecha de nacimiento', 'error'); return; }
      if (!formData.sex)           { showToast('Seleccioná el sexo', 'error'); return; }
      if (!formData.activity_group){ showToast('Seleccioná el grupo de referencia', 'error'); return; }
    }
    setCurrentStep(s => Math.min(s + 1, 6));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleBack() {
    setCurrentStep(s => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit() {
    const missing = REQUIRED_FIELDS.filter(k => formData[k] === '');
    if (missing.length > 0) {
      showToast('Completá los campos obligatorios (*) o ingresá 0 si no tenés el dato.', 'error');
      return;
    }
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const sex = formData.sex || 'Masculino';
      const age = getAge(formData.birth_date);
      const patient = patients.find((p: any) => p.id === formData.patient_id);

      const skipKeys = new Set(['patient_id','session_date','activity_group','birth_date','sex','observation_number','race_ethnicity']);
      const numericData: Record<string, number | null> = {};
      Object.entries(formData).forEach(([k, v]) => {
        if (!skipKeys.has(k)) numericData[k] = (v as string) === '' ? null : parseFloat(v as string);
      });

      const { error } = await supabase.from('sessions').insert([{
        patient_id: formData.patient_id,
        nutritionist_id: userData.user?.id,
        session_date: formData.session_date,
        modality: 'Presencial',
        company: selectedCompany,
        session_type: 'Antropometría',
        activity_group: formData.activity_group,
        ...numericData,
      }]);
      if (error) throw error;

      const calc = calculateBodyComposition({ ...numericData }, sex, age);
      const ref  = (REFERENCE[sex] || REFERENCE['Masculino'])[formData.activity_group]
                  || REFERENCE['Masculino']['Activa - 31 a 50 años'];

      setResults({
        ...calc, ref, sex, age,
        activity_group:      formData.activity_group,
        observation_number:  formData.observation_number,
        race_ethnicity:      formData.race_ethnicity,
        weight:              numericData.weight,
        height:              numericData.height,
        session_date:        formData.session_date,
        rawData:             { ...numericData },
        consultation:        latestConsultation,
      });
      setPatientInfo(patient);
      showToast('Evaluación antropométrica guardada', 'success');
      setCurrentStep(6);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      showToast(err.message || 'Error al guardar la evaluación', 'error');
    } finally {
      setLoading(false);
    }
  }

  function downloadPDF() {
    if (!results || !patientInfo) return;
    prevTitle.current = document.title;
    document.title = `Antropometria_${patientInfo.last_name}_${results.session_date}`;
    setIsPrinting(true);
  }

  useEffect(() => {
    if (!isPrinting) return;
    document.body.classList.add('anthro-printing');
    window.print();
    const cleanup = () => {
      document.title = prevTitle.current;
      document.body.classList.remove('anthro-printing');
      setIsPrinting(false);
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
  }, [isPrinting]);

  // ── sub-components defined INSIDE (no inputs, so remount is harmless) ──────

  function PieChart({ fat, muscle, bone, residual, size = 150 }: { fat: number; muscle: number; bone: number; residual: number; size?: number }) {
    const total  = fat + muscle + bone + residual;
    const slices = [
      { pct: fat/total,      color: '#E05252', label: 'Adiposa',  value: fat      },
      { pct: muscle/total,   color: '#0A4D3C', label: 'Muscular', value: muscle   },
      { pct: bone/total,     color: '#7CB9A0', label: 'Ósea',     value: bone     },
      { pct: residual/total, color: '#C0C0C0', label: 'Residual', value: residual },
    ];
    let cum = -Math.PI / 2;
    const cx = size/2, cy = size/2, r = size/2 - 8;
    const paths = slices.map(s => {
      const start = cum, end = cum + s.pct * 2 * Math.PI; cum = end;
      const x1 = cx + r*Math.cos(start), y1 = cy + r*Math.sin(start);
      const x2 = cx + r*Math.cos(end),   y2 = cy + r*Math.sin(end);
      return { ...s, d: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${s.pct>0.5?1:0},1 ${x2},${y2} Z` };
    });
    return (
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
          {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} stroke="#fff" strokeWidth="2" />)}
        </svg>
        <div className="flex flex-col gap-2.5 w-full">
          {slices.map((s, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: s.color }} />
              <span className="text-sm text-text-muted flex-1">{s.label}</span>
              <span className="text-sm font-bold font-mono">{s.value} kg</span>
              <span className="text-xs text-text-muted w-12 text-right">{(s.pct*100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function ResultRow({ label, value, unit, mean, sd }: { label: string; value: number; unit: string; mean: number; sd: number }) {
    const diff = (value - mean).toFixed(1);
    const cls  = classify(value, mean, sd);
    return (
      <tr className="border-b border-border-color">
        <td className="py-2 pr-3 font-medium text-sm">{label}</td>
        <td className="py-2 pr-3 font-mono font-bold text-sm">{value} {unit}</td>
        <td className="py-2 pr-3 text-text-muted text-xs">{mean.toFixed(1)} ± {sd.toFixed(1)}</td>
        <td className="py-2 pr-3 font-mono text-xs">{parseFloat(diff)>0?'+':''}{diff}</td>
        <td className="py-2"><span className={`px-2 py-0.5 rounded text-xs font-bold ${classifyColor(cls)}`}>{cls}</span></td>
      </tr>
    );
  }

  // ── Step header card ─────────────────────────────────────────────────────
  function StepCard({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
    return (
      <div className="flex items-center gap-4 mb-6 pb-5 border-b border-border-color">
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white flex-shrink-0 shadow-md">
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-bold text-text-main">{title}</h3>
          <p className="text-sm text-text-muted">{subtitle}</p>
        </div>
      </div>
    );
  }

  // ── Nav buttons ──────────────────────────────────────────────────────────
  function NavButtons({ onNext, nextLabel = 'Continuar', nextDisabled = false, showBack = true }:
    { onNext: () => void; nextLabel?: string; nextDisabled?: boolean; showBack?: boolean }) {
    return (
      <div className="flex justify-between items-center pt-6 mt-6 border-t border-border-color">
        {showBack
          ? <button type="button" onClick={handleBack} className="flex items-center gap-2 px-5 py-2.5 border border-border-color rounded-lg text-sm font-semibold text-text-muted hover:bg-bg transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Atrás
            </button>
          : <div />
        }
        <button type="button" onClick={onNext} disabled={nextDisabled}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:-translate-y-0.5 hover:shadow-lg transition-all active:scale-95 disabled:opacity-50">
          {nextDisabled && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {nextLabel}
          {!nextDisabled && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>}
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PDF REPORT TEMPLATE
  // ─────────────────────────────────────────────────────────────────────────
  function PdfReport() {
    if (!results || !patientInfo) return null;
    const r   = results;
    const ref = r.ref as RefGroup;
    const rd  = r.rawData || {};
    const consult = r.consultation || null;

    // ── PDF inline-SVG chart helpers ──────────────────────────────────────
    // Zone bar: positions a value on a mean±SD spectrum (red/yellow/green/yellow/red)
    const ZoneBar = (value: number, mean: number, sd: number) => {
      const W = 160, H = 16;
      const minV = mean - 3 * sd, maxV = mean + 3 * sd;
      const p = (v: number) => Math.max(0, Math.min(1, (v - minV) / (maxV - minV))) * W;
      const z = [mean - 1.5 * sd, mean - 0.5 * sd, mean + 0.5 * sd, mean + 1.5 * sd].map(p);
      const vx = p(value), mx = p(mean);
      const cols = ['#fecaca', '#fde68a', '#bbf7d0', '#fde68a', '#fecaca'];
      const xs   = [0, z[0], z[1], z[2], z[3]];
      const ws   = [z[0], z[1]-z[0], z[2]-z[1], z[3]-z[2], W-z[3]];
      return (
        <svg width={W} height={H} style={{ display: 'block' }}>
          {cols.map((c, i) => <rect key={i} x={xs[i]} y={2} width={Math.max(0, ws[i])} height={H-4} fill={c} />)}
          <line x1={mx} y1={0} x2={mx} y2={H} stroke="#0A4D3C" strokeWidth={1.5} opacity={0.5} strokeDasharray="2,1" />
          <circle cx={vx} cy={H/2} r={4} fill="#0A4D3C" />
          <circle cx={vx} cy={H/2} r={2} fill="white" />
        </svg>
      );
    };

    // BMI gauge with hard thresholds
    const BMIBar = (bmi: number) => {
      const W = 160, H = 16, minV = 14, maxV = 42;
      const p = (v: number) => Math.max(0, Math.min(1, (v - minV) / (maxV - minV))) * W;
      const zones = [
        { min: 14, max: 18.5, color: '#bfdbfe' },
        { min: 18.5, max: 25, color: '#bbf7d0' },
        { min: 25, max: 30,  color: '#fde68a' },
        { min: 30, max: 35,  color: '#fdba74' },
        { min: 35, max: 42,  color: '#fca5a5' },
      ];
      const vx = p(bmi);
      return (
        <svg width={W} height={H} style={{ display: 'block' }}>
          {zones.map((z, i) => <rect key={i} x={p(z.min)} y={2} width={Math.max(0, p(z.max)-p(z.min))} height={H-4} fill={z.color} />)}
          <circle cx={vx} cy={H/2} r={4} fill="#0A4D3C" />
          <circle cx={vx} cy={H/2} r={2} fill="white" />
        </svg>
      );
    };

    // ICC gauge
    const ICCBar = (icc: number, sex: string) => {
      const W = 160, H = 16;
      const minV = 0.6, maxV = 1.15;
      const p = (v: number) => Math.max(0, Math.min(1, (v - minV) / (maxV - minV))) * W;
      const t1 = sex === 'Masculino' ? 0.90 : 0.85;
      const t2 = sex === 'Masculino' ? 1.00 : 0.90;
      const zones = [
        { min: minV, max: t1,  color: '#bbf7d0' },
        { min: t1,   max: t2,  color: '#fde68a' },
        { min: t2,   max: maxV, color: '#fca5a5' },
      ];
      const vx = p(icc);
      return (
        <svg width={W} height={H} style={{ display: 'block' }}>
          {zones.map((z, i) => <rect key={i} x={p(z.min)} y={2} width={Math.max(0, p(z.max)-p(z.min))} height={H-4} fill={z.color} />)}
          <circle cx={vx} cy={H/2} r={4} fill="#0A4D3C" />
          <circle cx={vx} cy={H/2} r={2} fill="white" />
        </svg>
      );
    };

    // Abdominal perimeter gauge
    const AbdBar = (cm: number, sex: string) => {
      const W = 160, H = 16;
      const minV = 55, maxV = 130;
      const p = (v: number) => Math.max(0, Math.min(1, (v - minV) / (maxV - minV))) * W;
      const t1 = sex === 'Masculino' ? 94  : 80;
      const t2 = sex === 'Masculino' ? 102 : 88;
      const zones = [
        { min: minV, max: t1,  color: '#bbf7d0' },
        { min: t1,   max: t2,  color: '#fde68a' },
        { min: t2,   max: maxV, color: '#fca5a5' },
      ];
      const vx = p(cm);
      return (
        <svg width={W} height={H} style={{ display: 'block' }}>
          {zones.map((z, i) => <rect key={i} x={p(z.min)} y={2} width={Math.max(0, p(z.max)-p(z.min))} height={H-4} fill={z.color} />)}
          <circle cx={vx} cy={H/2} r={4} fill="#0A4D3C" />
          <circle cx={vx} cy={H/2} r={2} fill="white" />
        </svg>
      );
    };

    // Stacked bar for regional fat distribution (patient vs reference)
    const FatDistBar = (sup: number, med: number, inf: number, rSup: number, rMed: number, rInf: number) => {
      const W = 220, H = 28;
      const tot  = sup + med + inf;
      const rTot = rSup + rMed + rInf;
      const s1 = (sup/tot)*W, m1 = (med/tot)*W;
      const rs1 = (rSup/rTot)*W, rm1 = (rMed/rTot)*W;
      return (
        <svg width={W} height={H + 6} style={{ display: 'block' }}>
          {/* Patient bar */}
          <rect x={0}    y={0}  width={s1}      height={13} fill="#E05252" rx="1" />
          <rect x={s1}   y={0}  width={m1}      height={13} fill="#D97706" rx="1" />
          <rect x={s1+m1} y={0} width={W-s1-m1} height={13} fill="#7CB9A0" rx="1" />
          {s1 > 18 && <text x={s1/2} y={9.5} fill="white" fontSize={7.5} textAnchor="middle" fontWeight="bold">{sup.toFixed(0)}%</text>}
          {m1 > 18 && <text x={s1+m1/2} y={9.5} fill="white" fontSize={7.5} textAnchor="middle" fontWeight="bold">{med.toFixed(0)}%</text>}
          {W-s1-m1 > 18 && <text x={s1+m1+(W-s1-m1)/2} y={9.5} fill="white" fontSize={7.5} textAnchor="middle" fontWeight="bold">{inf.toFixed(0)}%</text>}
          {/* Reference bar */}
          <rect x={0}      y={16} width={rs1}       height={8} fill="#E05252" opacity={0.25} rx="1" />
          <rect x={rs1}    y={16} width={rm1}        height={8} fill="#D97706" opacity={0.25} rx="1" />
          <rect x={rs1+rm1} y={16} width={W-rs1-rm1} height={8} fill="#7CB9A0" opacity={0.25} rx="1" />
        </svg>
      );
    };

    // Comparison bar: shows value vs mean (centered, green=below mean, red=above)
    const CompBar = (value: number, mean: number, maxDiff: number) => {
      const W = 140, H = 12, cx = W/2;
      const scale = (W/2) / maxDiff;
      const vx = Math.max(4, Math.min(W-4, cx + (value - mean) * scale));
      const isHigh = value > mean;
      return (
        <svg width={W} height={H} style={{ display: 'block' }}>
          <rect x={0} y={4} width={W} height={H-8} fill="#f3f4f6" rx="2" />
          {isHigh
            ? <rect x={cx} y={4} width={vx - cx} height={H-8} fill="#fca5a5" rx="0" />
            : <rect x={vx} y={4} width={cx - vx}  height={H-8} fill="#6ee7b7" rx="0" />
          }
          <line x1={cx} y1={1} x2={cx} y2={H-1} stroke="#9ca3af" strokeWidth={1} />
          <circle cx={vx} cy={H/2} r={4} fill={isHigh ? '#ef4444' : '#059669'} />
          <circle cx={vx} cy={H/2} r={2} fill="white" />
        </svg>
      );
    };

    const total = r.fatMassKg + r.muscleMassKg + r.boneMassKg + r.residualMassKg;
    const pieSlices = [
      { pct: r.fatMassKg/total,      color: '#E05252', label: 'Adiposa',  pctVal: r.fatPct,      kg: r.fatMassKg      },
      { pct: r.muscleMassKg/total,   color: '#0A4D3C', label: 'Muscular', pctVal: r.musclePct,   kg: r.muscleMassKg   },
      { pct: r.boneMassKg/total,     color: '#7CB9A0', label: 'Ósea',     pctVal: r.bonePct,     kg: r.boneMassKg     },
      { pct: r.residualMassKg/total, color: '#B0B0B0', label: 'Residual', pctVal: r.residualPct, kg: r.residualMassKg },
    ];
    let cum = -Math.PI / 2;
    const cx = 80, cy = 80, rr = 68;
    const piePaths = pieSlices.map(s => {
      const start = cum, end = cum + s.pct * 2 * Math.PI; cum = end;
      const x1 = cx+rr*Math.cos(start), y1 = cy+rr*Math.sin(start);
      const x2 = cx+rr*Math.cos(end),   y2 = cy+rr*Math.sin(end);
      return { ...s, d: `M${cx},${cy} L${x1},${y1} A${rr},${rr} 0 ${s.pct>0.5?1:0},1 ${x2},${y2} Z` };
    });

    const clsBg = (cls: string) => {
      if (cls === 'Excelente' || cls === 'Muy Buena') return { bg: '#d1fae5', color: '#065f46' };
      if (cls === 'Buena')   return { bg: '#dcfce7', color: '#166534' };
      if (cls === 'Regular') return { bg: '#fef9c3', color: '#92400e' };
      if (cls === '—')       return { bg: '#f3f4f6', color: '#6b7280' };
      return { bg: '#fee2e2', color: '#991b1b' };
    };

    const tdL = { padding: '5px 8px', fontWeight: 'bold' as const, fontSize: '11px' };
    const tdV = { padding: '5px 8px', textAlign: 'center' as const, fontSize: '11px' };
    const tdM = { padding: '5px 8px', textAlign: 'center' as const, fontSize: '11px', color: '#555' };

    const valoracion = generateValoracion(r, patientInfo.first_name, patientInfo.last_name, ref);

    if (!isPrinting) return null;

    return createPortal(
      <div id="anthro-print-portal" ref={pdfRef} style={{
        position: 'absolute', top: '-99999px', left: 0,
        visibility: 'hidden', pointerEvents: 'none',
        width: '190mm', fontFamily: 'Arial, sans-serif', color: '#111',
        padding: '8mm 10mm', background: '#fff',
      }}>

        {/* ── Header ── */}
        <div style={{ background: 'linear-gradient(135deg, #0A4D3C 0%, #0d6b52 100%)', color: '#fff', padding: '18px 24px', borderRadius: '10px', marginBottom: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '3px', opacity: 0.6, marginBottom: '4px' }}>NUPLAN · {selectedCompany.toUpperCase()}</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', letterSpacing: '0.5px', lineHeight: 1.1 }}>EVALUACIÓN ANTROPOMÉTRICA</div>
              <div style={{ fontSize: '11px', marginTop: '5px', opacity: 0.8 }}>Valoración morfológica · Composición corporal</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '11px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '13px' }}>Obs. N° {r.observation_number || 1}</div>
              <div style={{ marginTop: '3px', opacity: 0.85 }}>{r.session_date}</div>
            </div>
          </div>
        </div>
        {/* Lic. sub-header */}
        <div style={{ background: '#e8f5f0', border: '1px solid #c8e0d6', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '6px 24px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#0A4D3C' }}>
          <span><strong>Lic. Rosana Roldán</strong> · Licenciada en Nutrición</span>
          <span style={{ fontWeight: 'bold' }}>www.nuplan.com.ar</span>
        </div>

        {/* ── Demographics ── */}
        <div style={{background:'#f4f9f7',border:'1px solid #c8e0d6',borderRadius:'8px',padding:'12px 16px',marginBottom:'14px',pageBreakInside:'avoid'}}>
          <div style={{ fontSize: '9px', fontWeight: 'bold', letterSpacing: '2px', color: '#0A4D3C', marginBottom: '8px', textTransform: 'uppercase' }}>Datos del Evaluado</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', fontSize: '12px' }}>
            {[
              { l: 'Apellido y Nombre',   v: `${patientInfo.last_name}, ${patientInfo.first_name}` },
              { l: 'Sexo',                v: r.sex },
              { l: 'Edad',                v: `${r.age} años` },
              { l: 'Fecha de Evaluación', v: r.session_date },
              { l: 'Grupo de Referencia', v: r.activity_group },
              { l: 'Raza / Etnia',        v: r.race_ethnicity || '—' },
              { l: 'Peso',                v: `${r.weight} kg` },
              { l: 'Talla',               v: `${r.height} cm` },
            ].map((item, i) => (
              <div key={i}>
                <div style={{ fontSize: '9px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.l}</div>
                <div style={{ fontWeight: 'bold', marginTop: '1px' }}>{item.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Raw Measurements ── */}
        <div style={{marginBottom:'14px',pageBreakInside:'avoid'}}>
          <div style={{ background: '#0A4D3C', color: '#fff', padding: '7px 12px', borderRadius: '6px 6px 0 0', fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px' }}>
            MEDICIONES ANTROPOMÉTRICAS
          </div>
          <div style={{ border: '1px solid #c8e0d6', borderTop: 'none', borderRadius: '0 0 6px 6px', padding: '10px 12px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0' }}>

            {/* Col 1: Datos Básicos */}
            <div style={{ paddingRight: '10px', borderRight: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#0A4D3C', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Datos Básicos</div>
              {[
                ['Peso',             rd.weight,          'kg'],
                ['Talla',            rd.height,          'cm'],
                ['Talla sentado',    rd.sitting_height,  'cm'],
                ['Envergadura',      rd.arm_span,        'cm'],
              ].map(([lbl, val, unit]) => val != null ? (
                <div key={String(lbl)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', padding: '2px 0', borderBottom: '1px dotted #e5e7eb' }}>
                  <span style={{ color: '#444' }}>{lbl}</span>
                  <span style={{ fontWeight: 'bold' }}>{val} {unit}</span>
                </div>
              ) : null)}
              <div style={{ marginTop: '10px', fontSize: '9px', fontWeight: 'bold', color: '#0A4D3C', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Diámetros Óseos (cm)</div>
              {[
                ['Biacromial',       rd.diam_biacromial],
                ['Bi-iliocrestídeo', rd.diam_biiliocristal],
                ['Tórax transverso', rd.diam_transverse_chest],
                ['Tórax A-P',        rd.diam_ap_chest],
                ['Húmero',           rd.diam_humerus],
                ['Fémur',            rd.diam_femur],
                ['Muñeca',           rd.diam_wrist],
                ['Tobillo',          rd.diam_ankle],
              ].map(([lbl, val]) => val != null ? (
                <div key={String(lbl)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', padding: '2px 0', borderBottom: '1px dotted #e5e7eb' }}>
                  <span style={{ color: '#444' }}>{lbl}</span>
                  <span style={{ fontWeight: 'bold' }}>{val}</span>
                </div>
              ) : null)}
            </div>

            {/* Col 2: Pliegues */}
            <div style={{ paddingLeft: '10px', paddingRight: '10px', borderRight: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#0A4D3C', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Pliegues Cutáneos (mm)</div>
              {[
                ['Tríceps',          rd.fold_triceps],
                ['Subescapular',     rd.fold_subscapular],
                ['Bíceps',           rd.fold_biceps],
                ['Cresta ilíaca',    rd.fold_iliac_crest],
                ['Supraespinal',     rd.fold_supraspinale],
                ['Abdominal',        rd.fold_abdominal],
                ['Muslo anterior',   rd.fold_front_thigh],
                ['Pantorrilla med.', rd.fold_medial_calf],
              ].map(([lbl, val]) => val != null ? (
                <div key={String(lbl)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', padding: '2px 0', borderBottom: '1px dotted #e5e7eb' }}>
                  <span style={{ color: '#444' }}>{lbl}</span>
                  <span style={{ fontWeight: 'bold' }}>{val}</span>
                </div>
              ) : null)}
            </div>

            {/* Col 3: Perímetros */}
            <div style={{ paddingLeft: '10px', paddingRight: '10px', borderRight: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#0A4D3C', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Perímetros (cm)</div>
              {[
                ['Cabeza',           rd.girth_head],
                ['Cuello',           rd.girth_neck],
                ['Brazo relajado',   rd.girth_arm_relaxed],
                ['Brazo flexionado', rd.girth_arm_flexed],
                ['Antebrazo',        rd.girth_forearm],
                ['Muñeca',           rd.girth_wrist],
                ['Tórax',            rd.girth_chest],
                ['Cintura',          rd.girth_waist],
                ['Cadera',           rd.girth_hip],
                ['Muslo máximo',     rd.girth_thigh_max],
                ['Muslo medial',     rd.girth_thigh_mid],
                ['Pantorrilla',      rd.girth_calf],
                ['Tobillo',          rd.girth_ankle],
              ].map(([lbl, val]) => val != null ? (
                <div key={String(lbl)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', padding: '2px 0', borderBottom: '1px dotted #e5e7eb' }}>
                  <span style={{ color: '#444' }}>{lbl}</span>
                  <span style={{ fontWeight: 'bold' }}>{val}</span>
                </div>
              ) : null)}
            </div>

            {/* Col 4: Longitudes */}
            <div style={{ paddingLeft: '10px' }}>
              <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#0A4D3C', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Longitudes (cm)</div>
              {[
                ['Acromio-radial',     rd.len_acromiale_radiale],
                ['Radial-estiloidea',  rd.len_radiale_stylion],
                ['M-E a dactiloidea',  rd.len_midstylion_dactylion],
                ['Ilioespinal',        rd.len_iliospinale],
                ['Trocantérea',        rd.len_trochanterion],
                ['Troc.-tibial lat.',  rd.len_trochanterion_tibiale_laterale],
                ['Tibial lateral',     rd.len_tibiale_laterale],
                ['Tibial med.-maleo.', rd.len_tibiale_mediale_sphyrion_tibiale],
                ['Long. del pie',      rd.len_foot],
              ].map(([lbl, val]) => val != null ? (
                <div key={String(lbl)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', padding: '2px 0', borderBottom: '1px dotted #e5e7eb' }}>
                  <span style={{ color: '#444' }}>{lbl}</span>
                  <span style={{ fontWeight: 'bold' }}>{val}</span>
                </div>
              ) : null)}
            </div>
          </div>
        </div>

        {/* ── Body Composition + Pie ── */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 175px',gap:'14px',marginBottom:'14px',pageBreakInside:'avoid'}}>
          <div>
            <div style={{ background: '#0A4D3C', color: '#fff', padding: '7px 12px', borderRadius: '6px 6px 0 0', fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px' }}>COMPOSICIÓN CORPORAL</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#f4f9f7' }}>
                  <th style={{ ...tdL }}>Componente</th>
                  <th style={{ ...tdV }}>%</th>
                  <th style={{ ...tdV }}>kg</th>
                  <th style={{ ...tdV }}>Ref. (M ± DE)</th>
                  <th style={{ ...tdV }}>Clasif.</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Masa Adiposa',  pct: r.fatPct,      kg: r.fatMassKg,      mean: ref.fatMassKg[0],    sd: ref.fatMassKg[1]    },
                  { name: 'Masa Muscular', pct: r.musclePct,   kg: r.muscleMassKg,   mean: ref.muscleMassKg[0], sd: ref.muscleMassKg[1] },
                  { name: 'Masa Ósea',     pct: r.bonePct,     kg: r.boneMassKg,     mean: ref.boneMassKg[0],   sd: ref.boneMassKg[1]   },
                  { name: 'Masa Residual', pct: r.residualPct, kg: r.residualMassKg, mean: null as any,         sd: null as any         },
                ].map((row, i) => {
                  const cls = row.mean !== null ? classify(row.kg, row.mean, row.sd) : '—';
                  const c = clsBg(cls);
                  return (
                    <tr key={i} style={{ background: i%2===0?'#fff':'#fafafa', borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ ...tdL }}>{row.name}</td>
                      <td style={{ ...tdV }}>{row.pct}%</td>
                      <td style={{ ...tdV, fontWeight: 'bold' }}>{row.kg} kg</td>
                      <td style={{ ...tdM }}>{row.mean!==null?`${row.mean.toFixed(1)} ± ${row.sd.toFixed(1)} kg`:'—'}</td>
                      <td style={{ ...tdV }}>
                        <span style={{ background: c.bg, color: c.color, padding: '1px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: 'bold' }}>{cls}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ border: '1px solid #c8e0d6', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f4f9f7' }}>
            <div style={{ fontSize: '9px', fontWeight: 'bold', letterSpacing: '1px', color: '#0A4D3C', marginBottom: '6px', textAlign: 'center', textTransform: 'uppercase' }}>Distribución</div>
            <svg width="100" height="100" viewBox="0 0 160 160">
              {piePaths.map((p, i) => <path key={i} d={p.d} fill={p.color} stroke="#fff" strokeWidth="2" />)}
            </svg>
            <div style={{ marginTop: '8px', width: '100%' }}>
              {pieSlices.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px', fontSize: '9px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '1px', background: s.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, color: '#444' }}>{s.label}</span>
                  <span style={{ fontWeight: 'bold' }}>{s.pctVal}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Adiposity ── */}
        <div style={{ marginBottom: '22px', pageBreakInside: 'avoid' }}>
          <div style={{ background: '#0A4D3C', color: '#fff', padding: '8px 14px', borderRadius: '6px 6px 0 0', fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px' }}>ÍNDICES DE ADIPOSIDAD</div>
          <div style={{ border: '1px solid #c8e0d6', borderTop: 'none', borderRadius: '0 0 6px 6px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#f4f9f7' }}>
                  <th style={{ ...tdL }}>Índice</th>
                  <th style={{ ...tdV }}>Valor</th>
                  <th style={{ ...tdM }}>Referencia</th>
                  <th style={{ ...tdV }}>Clasificación</th>
                  <th style={{ ...tdV, width: '175px' }}>Posición en escala</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    name: 'IMC (kg/m²)', value: `${r.bmi}`,
                    ref2: 'Normal: 18.5 – 24.9', cls: classifyBMI(r.bmi),
                    chart: BMIBar(r.bmi),
                  },
                  {
                    name: 'Índice Cintura-Cadera', value: `${r.waistHipRatio}`,
                    ref2: r.sex==='Masculino'?'Normal: < 0.90':'Normal: < 0.85',
                    cls: classifyWaistHip(r.waistHipRatio, r.sex),
                    chart: ICCBar(r.waistHipRatio, r.sex),
                  },
                  {
                    name: 'Perímetro Abdominal', value: `${r.girth_waist} cm`,
                    ref2: r.sex==='Masculino'?'Sin riesgo: < 94 cm':'Sin riesgo: < 80 cm',
                    cls: classifyAbdominal(r.girth_waist, r.sex),
                    chart: AbdBar(r.girth_waist, r.sex),
                  },
                ].map((row, i) => {
                  const c = clsBg(row.cls);
                  return (
                    <tr key={i} style={{ background: i%2===0?'#fff':'#fafafe', borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ ...tdL, paddingTop: '8px', paddingBottom: '8px' }}>{row.name}</td>
                      <td style={{ ...tdV, fontWeight: 'bold', fontSize: '12px' }}>{row.value}</td>
                      <td style={{ ...tdM }}>{row.ref2}</td>
                      <td style={{ ...tdV }}>
                        <span style={{ background: c.bg, color: c.color, padding: '2px 7px', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{row.cls}</span>
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'center' }}>{row.chart}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Regional fat + Perimeters ── */}
        <div style={{ marginBottom: '22px' }}>
          {/* Regional fat — full width to avoid page cuts */}
          <div style={{marginBottom:'14px',pageBreakInside:'avoid'}}>
            <div style={{background:'#0A4D3C',color:'#fff',padding:'7px 12px',borderRadius:'6px 6px 0 0',fontSize:'10px',fontWeight:'bold',letterSpacing:'1px'}}>DISTRIBUCIÓN REGIONAL DE GRASA</div>
            <div style={{border:'1px solid #c8e0d6',borderTop:'none',borderRadius:'0 0 6px 6px',padding:'10px 12px'}}>
              <div style={{display:'flex',gap:'16px',alignItems:'flex-start'}}>
                <table style={{flex:1,borderCollapse:'collapse',fontSize:'11px'}}>
                  <thead><tr style={{background:'#f4f9f7'}}><th style={tdL}>Región</th><th style={tdV}>%</th><th style={tdM}>Ref.</th><th style={tdV}>Clasif.</th></tr></thead>
                  <tbody>{[
                    {name:'Superior',value:r.fatSuperior,mean:ref.fatSuperior[0],sd:ref.fatSuperior[1]},
                    {name:'Media',   value:r.fatMedia,    mean:ref.fatMedia[0],   sd:ref.fatMedia[1]},
                    {name:'Inferior',value:r.fatInferior, mean:ref.fatInferior[0],sd:ref.fatInferior[1]},
                  ].map((row,i)=>{ const cls=classify(row.value,row.mean,row.sd); const c=clsBg(cls); return (
                    <tr key={i} style={{background:i%2===0?'#fff':'#fafafe',borderBottom:'1px solid #e5e7eb'}}>
                      <td style={{...tdL,paddingTop:'7px',paddingBottom:'7px'}}>{row.name}</td>
                      <td style={{...tdV,fontWeight:'bold'}}>{row.value}%</td>
                      <td style={tdM}>{row.mean.toFixed(1)}±{row.sd.toFixed(1)}%</td>
                      <td style={tdV}><span style={{background:c.bg,color:c.color,padding:'1px 5px',borderRadius:'3px',fontSize:'9px',fontWeight:'bold'}}>{cls}</span></td>
                    </tr>
                  );})}
                  </tbody>
                </table>
                <div style={{paddingTop:'4px'}}>
                  <div style={{fontSize:'8px',color:'#666',marginBottom:'4px',fontWeight:'bold',textTransform:'uppercase' as const, letterSpacing: '0.5px'}}>Distribución %</div>
                  {FatDistBar(r.fatSuperior, r.fatMedia, r.fatInferior, ref.fatSuperior[0], ref.fatMedia[0], ref.fatInferior[0])}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px', fontSize: '7.5px', color: '#666' }}>
                    <span><span style={{ color: '#E05252', fontWeight: 'bold' }}>■</span> Superior</span>
                    <span><span style={{ color: '#D97706', fontWeight: 'bold' }}>■</span> Media</span>
                    <span><span style={{ color: '#7CB9A0', fontWeight: 'bold' }}>■</span> Inferior</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Perimeters — full width */}
          <div style={{marginBottom:'14px',pageBreakInside:'avoid'}}>
            <div style={{background:'#0A4D3C',color:'#fff',padding:'7px 12px',borderRadius:'6px 6px 0 0',fontSize:'10px',fontWeight:'bold',letterSpacing:'1px'}}>PERÍMETROS MUSCULARES</div>
            <div style={{border:'1px solid #c8e0d6',borderTop:'none',borderRadius:'0 0 6px 6px',overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px'}}>
                <thead><tr style={{background:'#f4f9f7'}}><th style={tdL}>Perímetro</th><th style={tdV}>Medido</th><th style={tdM}>Ref.</th><th style={tdV}>Dif.</th><th style={tdV}>Gráfico</th></tr></thead>
                <tbody>{[
                  {name:'Tórax',   value:r.girth_chest,mean:ref.chestCm[0],sd:ref.chestCm[1]},
                  {name:'Cintura', value:r.girth_waist, mean:ref.waistCm[0],sd:ref.waistCm[1]},
                  {name:'Cadera',  value:r.girth_hip,   mean:ref.hipCm[0],  sd:ref.hipCm[1]},
                ].map((row,i)=>{ const diff=(row.value-row.mean).toFixed(1); return (
                  <tr key={i} style={{background:i%2===0?'#fff':'#fafafe',borderBottom:'1px solid #e5e7eb'}}>
                    <td style={{...tdL,paddingTop:'7px',paddingBottom:'7px'}}>{row.name}</td>
                    <td style={{...tdV,fontWeight:'bold'}}>{row.value} cm</td>
                    <td style={tdM}>{row.mean.toFixed(1)} cm</td>
                    <td style={{...tdV,fontWeight:'bold',color:parseFloat(diff)>0?'#991b1b':'#065f46'}}>{parseFloat(diff)>0?'+':''}{diff} cm</td>
                    <td style={{padding:'4px 8px',textAlign:'center'}}>
                      {CompBar(row.value, row.mean, Math.max(row.sd*3, 15))}
                    </td>
                  </tr>
                );})}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Valoración Morfológica ── */}
        <div style={{ marginBottom: '14px', pageBreakInside: 'avoid' }}>
          <div style={{ background: '#0A4D3C', color: '#fff', padding: '7px 14px', borderRadius: '6px 6px 0 0', fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px' }}>
            VALORACIÓN MORFOLÓGICA PERSONAL
          </div>
          <div style={{ border: '1px solid #c8e0d6', borderTop: 'none', borderRadius: '0 0 6px 6px', background: '#fafffe', padding: '14px 16px' }}>
            {valoracion.split('\n').map((line, i) => (
              line === ''
                ? <div key={i} style={{ height: '6px' }} />
                : <p key={i} style={{ margin: 0, fontSize: '11px', lineHeight: '1.6', color: line.startsWith('•') ? '#1a1a1a' : '#444' }}>
                    {line}
                  </p>
            ))}
          </div>
        </div>

        {/* ── Última Consulta Nutricional (si existe) ── */}
        {consult && (
          <div style={{ marginBottom: '14px', pageBreakInside: 'avoid' }}>
            <div style={{ background: '#0A4D3C', color: '#fff', padding: '7px 14px', borderRadius: '6px 6px 0 0', fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px' }}>
              ÚLTIMA CONSULTA NUTRICIONAL · {consult.session_date}
            </div>
            <div style={{ border: '1px solid #c8e0d6', borderTop: 'none', borderRadius: '0 0 6px 6px', padding: '12px 16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '10px' }}>
                {([
                  { l: 'Fecha', v: consult.session_date },
                  { l: 'Modalidad', v: consult.modality || '—' },
                  { l: 'Duración', v: consult.duration_minutes ? `${consult.duration_minutes} min` : '—' },
                  { l: 'Estado General', v: consult.overall_status || '—' },
                  ...(consult.weight   ? [{ l: 'Peso Consulta',  v: `${consult.weight} kg`   }] : []),
                  ...(consult.girth_waist ? [{ l: 'Cintura Consulta', v: `${consult.girth_waist} cm` }] : []),
                  { l: 'Adherencia al Plan', v: `${consult.adherence}/5` },
                  { l: 'Nivel de Energía',   v: `${consult.energy_level}/5`  },
                  { l: 'Calidad de Sueño',   v: `${consult.sleep_quality}/5` },
                  { l: 'Hidratación',        v: consult.hydration ? 'Adecuada' : 'Insuficiente' },
                  { l: 'Actividad Física',   v: consult.physical_activity || '—' },
                  { l: 'Frutas y Verduras',  v: consult.consumo_frutas_verduras ? `${consult.consumo_frutas_verduras}/5` : '—' },
                ] as { l: string; v: string }[]).map((item, i) => (
                  <div key={i}>
                    <div style={{ fontSize: '9px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>{item.l}</div>
                    <div style={{ fontWeight: 'bold', marginTop: '1px', fontSize: '11px' }}>{item.v}</div>
                  </div>
                ))}
              </div>
              {consult.laboratorio_alterado && (
                <div style={{ marginBottom: '8px', background: '#fff8f0', border: '1px solid #fde68a', borderRadius: '4px', padding: '8px 10px' }}>
                  <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#92400e', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '3px' }}>Laboratorio Alterado</div>
                  <div style={{ fontSize: '10px', color: '#333', lineHeight: '1.5' }}>{consult.laboratorio_alterado}</div>
                </div>
              )}
              {(consult.achievements || consult.difficulties) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {consult.achievements && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '4px', padding: '8px 10px' }}>
                      <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#065f46', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '3px' }}>Principales Logros</div>
                      <div style={{ fontSize: '10px', color: '#333', lineHeight: '1.5' }}>{consult.achievements}</div>
                    </div>
                  )}
                  {consult.difficulties && (
                    <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: '4px', padding: '8px 10px' }}>
                      <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#92400e', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '3px' }}>Dificultades y Ajustes</div>
                      <div style={{ fontSize: '10px', color: '#333', lineHeight: '1.5' }}>{consult.difficulties}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

          {/* ── Footer ── */}
          <div style={{ borderTop: '2px solid #0A4D3C', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', color: '#555' }}>
            <div>
              <span style={{ fontWeight: 'bold', color: '#0A4D3C' }}>Lic. Rosana Roldán</span>
              {' · '}
              <span style={{ fontWeight: 'bold', color: '#0A4D3C' }}>www.nuplan.com.ar</span>
            </div>
            <div>{selectedCompany} · Datos comparados con población argentina de referencia.</div>
          </div>
      </div>,
      document.body
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP RENDERS
  // ─────────────────────────────────────────────────────────────────────────
  const SECTION_TAG = 'inline-flex items-center px-3 py-1 border border-border-color rounded text-[0.65rem] font-bold uppercase tracking-widest text-text-muted mb-4 bg-bg';

  function renderStep1() {
    return (
      <div>
        <StepCard
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
          title="Datos Demográficos"
          subtitle="Información personal del paciente evaluado"
        />

        {/* IDENTIFICACIÓN */}
        <div className="mb-7">
          <div className={SECTION_TAG}>Identificación</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>Nombre y Apellido <span className="text-danger">*</span></label>
              <CustomSelect
                value={formData.patient_id}
                onChange={handlePatientChange}
                disabled={fetchingPatients}
                placeholder={fetchingPatients ? 'Cargando...' : '— Seleccionar —'}
                options={patients.map((p: any) => ({ value: p.id, label: `${p.last_name}, ${p.first_name}${p.sex ? ` (${p.sex==='Masculino'?'M':'F'})` : ''}` }))}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Número de Observación</label>
              <input
                type="number"
                min="1"
                className={INPUT_CLS}
                value={formData.observation_number}
                onChange={e => setFormData(prev => ({ ...prev, observation_number: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* FECHAS */}
        <div className="mb-7">
          <div className={SECTION_TAG}>Fechas</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={LABEL_CLS}>Fecha de Medición <span className="text-danger">*</span></label>
              <input
                type="date"
                className={INPUT_CLS}
                value={formData.session_date}
                onChange={e => setFormData(prev => ({ ...prev, session_date: e.target.value }))}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>
                Fecha de Nacimiento <span className="text-danger">*</span>
                {patientHasBirth && <span className="ml-1.5 text-[0.6rem] text-primary font-normal normal-case tracking-normal">(del paciente)</span>}
              </label>
              <input
                type="date"
                className={patientHasBirth ? INPUT_FILLED_CLS : INPUT_CLS}
                value={formData.birth_date}
                onChange={e => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Edad (Calculada)</label>
              <input
                readOnly
                className={`${INPUT_CLS} bg-bg text-text-muted cursor-default`}
                value={calculatedAge !== null ? `${calculatedAge} años` : '–'}
              />
            </div>
          </div>
        </div>

        {/* PERFIL BIOLÓGICO */}
        <div>
          <div className={SECTION_TAG}>Perfil Biológico</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={LABEL_CLS}>
                Sexo <span className="text-danger">*</span>
                {patientHasSex && <span className="ml-1.5 text-[0.6rem] text-primary font-normal normal-case tracking-normal">(del paciente)</span>}
              </label>
              <CustomSelect
                value={formData.sex}
                onChange={v => setFormData(prev => ({ ...prev, sex: v }))}
                placeholder="— Seleccionar —"
                options={[{value:'Masculino',label:'Masculino'},{value:'Femenino',label:'Femenino'}]}
                className={patientHasSex ? 'ring-2 ring-primary/20' : ''}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>
                Actividad / Referencia <span className="text-danger">*</span>
                <span className="ml-1 text-[0.6rem] font-normal normal-case tracking-normal">(grupo de comparación)</span>
              </label>
              <CustomSelect
                value={formData.activity_group}
                onChange={v => setFormData(prev => ({ ...prev, activity_group: v }))}
                placeholder="— Seleccionar —"
                options={ACTIVITY_GROUPS.map(g => ({ value: g, label: g }))}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>
                Raza / Etnia
                <span className="ml-1 text-[0.6rem] font-normal normal-case tracking-normal">(referencia)</span>
              </label>
              <CustomSelect
                value={formData.race_ethnicity}
                onChange={v => setFormData(prev => ({ ...prev, race_ethnicity: v }))}
                options={[
                  {value:'Blanca o Hispánica', label:'Blanca o Hispánica (0)'},
                  {value:'Afroamericana', label:'Afroamericana (+1)'},
                  {value:'Asiática', label:'Asiática (−1)'},
                  {value:'Otra', label:'Otra'},
                ]}
              />
            </div>
          </div>
        </div>

        <NavButtons onNext={handleNext} showBack={false} />
      </div>
    );
  }

  const sectionCard = 'bg-bg p-4 md:p-6 rounded-2xl mb-6 border border-border-color shadow-sm';
  const sectionTitle = 'text-lg font-bold mb-4 text-primary flex items-center gap-2';

  function renderStep2() {
    return (
      <div>
        <StepCard
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
          title="Medidas Base"
          subtitle="Peso corporal y medidas estructurales principales"
        />
        <div className={sectionCard}>
          <h3 className={sectionTitle}>
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Datos Básicos — Peso en kg · Tallas en cm
          </h3>
          <MeasureGroup title="" fields={['weight|Peso','height|Talla','sitting_height|Talla sentado','arm_span|Envergadura']}
            formData={formData} onChange={handleMeasureChange} />
        </div>
        <NavButtons onNext={handleNext} />
      </div>
    );
  }

  function renderStep3() {
    return (
      <div>
        <StepCard
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
          title="Pliegues Cutáneos"
          subtitle="Medición de tejido adiposo subcutáneo · en milímetros (mm)"
        />
        <div className={sectionCard}>
          <h3 className={sectionTitle}>
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Pliegues Cutáneos (mm)
          </h3>
          <MeasureGroup title=""
            fields={[
              'fold_triceps|Tríceps','fold_subscapular|Subescapular','fold_biceps|Bíceps','fold_iliac_crest|Cresta ilíaca',
              'fold_supraspinale|Supraespinal','fold_abdominal|Abdominal','fold_front_thigh|Muslo anterior','fold_medial_calf|Pantorrilla medial',
            ]}
            formData={formData} onChange={handleMeasureChange} />
        </div>
        <NavButtons onNext={handleNext} />
      </div>
    );
  }

  function renderStep4() {
    return (
      <div>
        <StepCard
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>}
          title="Perímetros"
          subtitle="Medición de circunferencias corporales · en centímetros (cm)"
        />
        <div className={sectionCard}>
          <h3 className={sectionTitle}>
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Perímetros (cm)
          </h3>
          <MeasureGroup title=""
            fields={[
              'girth_head|Cabeza','girth_neck|Cuello','girth_arm_relaxed|Brazo relajado','girth_arm_flexed|Brazo flexionado',
              'girth_forearm|Antebrazo','girth_wrist|Muñeca','girth_chest|Tórax','girth_waist|Cintura',
              'girth_hip|Cadera','girth_thigh_max|Muslo máximo','girth_thigh_mid|Muslo medial','girth_calf|Pantorrilla',
              'girth_ankle|Tobillo',
            ]}
            formData={formData} onChange={handleMeasureChange} />
        </div>
        <NavButtons onNext={handleNext} />
      </div>
    );
  }

  function renderStep5() {
    return (
      <div>
        <StepCard
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>}
          title="Diámetros y Longitudes"
          subtitle="Diámetros óseos y longitudes segmentarias · en centímetros (cm)"
        />
        <div className={sectionCard}>
          <h3 className={sectionTitle}>
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Diámetros Óseos (cm)
          </h3>
          <MeasureGroup title=""
            fields={[
              'diam_biacromial|Biacromial','diam_biiliocristal|Bi-iliocrestídeo','diam_transverse_chest|Tórax transverso','diam_ap_chest|Tórax A-P',
              'diam_humerus|Húmero','diam_femur|Fémur','diam_wrist|Muñeca','diam_ankle|Tobillo',
            ]}
            formData={formData} onChange={handleMeasureChange} />
        </div>
        <div className={sectionCard}>
          <h3 className={sectionTitle}>
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Longitudes y Alturas (cm)
          </h3>
          <MeasureGroup title=""
            fields={[
              'len_acromiale_radiale|Acromio-radial','len_radiale_stylion|Radial-estiloidea','len_midstylion_dactylion|M-E a dactiloidea',
              'len_iliospinale|Ilioespinal','len_trochanterion|Trocantérea','len_trochanterion_tibiale_laterale|Troc.-tibial lat.',
              'len_tibiale_laterale|Tibial lateral','len_tibiale_mediale_sphyrion_tibiale|Tibial med.-maleolar','len_foot|Long. del pie',
            ]}
            formData={formData} onChange={handleMeasureChange} />
        </div>
        <NavButtons onNext={handleSubmit} nextLabel="Calcular y Guardar" nextDisabled={loading} />
      </div>
    );
  }

  function renderStep6() {
    if (!results || !patientInfo) {
      return (
        <div className="text-center py-16 text-text-muted">
          <p>Completá los pasos anteriores para ver el informe.</p>
        </div>
      );
    }
    const r   = results;
    const ref = r.ref as RefGroup;

    // ── App-side inline SVG chart helpers ─────────────────────────────────
    const AppBMIBar = ({ bmi }: { bmi: number }) => {
      const W = 220, H = 20, minV = 14, maxV = 42;
      const p = (v: number) => Math.max(0, Math.min(1, (v - minV) / (maxV - minV))) * W;
      const zones = [
        { min: 14, max: 18.5, color: '#bfdbfe' },
        { min: 18.5, max: 25, color: '#bbf7d0' },
        { min: 25, max: 30,  color: '#fde68a' },
        { min: 30, max: 35,  color: '#fdba74' },
        { min: 35, max: 42,  color: '#fca5a5' },
      ];
      const labels = ['Bajo\nPeso','Normal','Sobre\npeso','Ob. I','Ob. II/III'];
      const vx = p(bmi);
      return (
        <svg width={W} height={H + 14} style={{ display: 'block', overflow: 'visible' }}>
          {zones.map((z, i) => <rect key={i} x={p(z.min)} y={0} width={Math.max(0, p(z.max)-p(z.min))} height={H} rx="2" fill={z.color} />)}
          <circle cx={vx} cy={H/2} r={5} fill="#0A4D3C" />
          <circle cx={vx} cy={H/2} r={2.5} fill="white" />
          <line x1={vx} y1={H} x2={vx} y2={H+6} stroke="#0A4D3C" strokeWidth={1} />
          <text x={vx} y={H+14} textAnchor="middle" fontSize="9" fill="#0A4D3C" fontWeight="bold">{bmi}</text>
        </svg>
      );
    };

    const AppICCBar = ({ icc, sex }: { icc: number; sex: string }) => {
      const W = 220, H = 20, minV = 0.6, maxV = 1.15;
      const p = (v: number) => Math.max(0, Math.min(1, (v - minV) / (maxV - minV))) * W;
      const t1 = sex === 'Masculino' ? 0.90 : 0.85;
      const t2 = sex === 'Masculino' ? 1.00 : 0.90;
      const zones = [
        { min: minV, max: t1,  color: '#bbf7d0' },
        { min: t1,   max: t2,  color: '#fde68a' },
        { min: t2,   max: maxV, color: '#fca5a5' },
      ];
      const vx = p(icc);
      return (
        <svg width={W} height={H + 14} style={{ display: 'block', overflow: 'visible' }}>
          {zones.map((z, i) => <rect key={i} x={p(z.min)} y={0} width={Math.max(0, p(z.max)-p(z.min))} height={H} rx="2" fill={z.color} />)}
          <circle cx={vx} cy={H/2} r={5} fill="#0A4D3C" />
          <circle cx={vx} cy={H/2} r={2.5} fill="white" />
          <line x1={vx} y1={H} x2={vx} y2={H+6} stroke="#0A4D3C" strokeWidth={1} />
          <text x={vx} y={H+14} textAnchor="middle" fontSize="9" fill="#0A4D3C" fontWeight="bold">{icc}</text>
        </svg>
      );
    };

    const AppAbdBar = ({ cm, sex }: { cm: number; sex: string }) => {
      const W = 220, H = 20, minV = 55, maxV = 130;
      const p = (v: number) => Math.max(0, Math.min(1, (v - minV) / (maxV - minV))) * W;
      const t1 = sex === 'Masculino' ? 94  : 80;
      const t2 = sex === 'Masculino' ? 102 : 88;
      const zones = [
        { min: minV, max: t1,  color: '#bbf7d0' },
        { min: t1,   max: t2,  color: '#fde68a' },
        { min: t2,   max: maxV, color: '#fca5a5' },
      ];
      const vx = p(cm);
      return (
        <svg width={W} height={H + 14} style={{ display: 'block', overflow: 'visible' }}>
          {zones.map((z, i) => <rect key={i} x={p(z.min)} y={0} width={Math.max(0, p(z.max)-p(z.min))} height={H} rx="2" fill={z.color} />)}
          <circle cx={vx} cy={H/2} r={5} fill="#0A4D3C" />
          <circle cx={vx} cy={H/2} r={2.5} fill="white" />
          <line x1={vx} y1={H} x2={vx} y2={H+6} stroke="#0A4D3C" strokeWidth={1} />
          <text x={vx} y={H+14} textAnchor="middle" fontSize="9" fill="#0A4D3C" fontWeight="bold">{cm}</text>
        </svg>
      );
    };

    const AppCompBar = ({ value, mean, maxDiff }: { value: number; mean: number; maxDiff: number }) => {
      const W = 180, H = 16, cx = W/2;
      const scale = (W/2) / maxDiff;
      const vx = Math.max(4, Math.min(W-4, cx + (value - mean) * scale));
      const isHigh = value > mean;
      return (
        <svg width={W} height={H} style={{ display: 'block' }}>
          <rect x={0} y={4} width={W} height={H-8} fill="#f3f4f6" rx="3" />
          {isHigh
            ? <rect x={cx} y={4} width={Math.max(0,vx - cx)} height={H-8} fill="#fca5a5" rx="0" />
            : <rect x={vx} y={4} width={Math.max(0,cx - vx)}  height={H-8} fill="#6ee7b7" rx="0" />
          }
          <line x1={cx} y1={1} x2={cx} y2={H-1} stroke="#9ca3af" strokeWidth={1} />
          <circle cx={vx} cy={H/2} r={5} fill={isHigh ? '#ef4444' : '#059669'} />
          <circle cx={vx} cy={H/2} r={2.5} fill="white" />
        </svg>
      );
    };

    const AppFatDistBar = ({ sup, med, inf }: { sup: number; med: number; inf: number }) => {
      const W = 260, H = 28;
      const tot = sup + med + inf;
      const s1 = (sup/tot)*W, m1 = (med/tot)*W;
      const rSup = ref.fatSuperior[0], rMed = ref.fatMedia[0], rInf = ref.fatInferior[0];
      const rTot = rSup + rMed + rInf;
      const rs1 = (rSup/rTot)*W, rm1 = (rMed/rTot)*W;
      return (
        <svg width={W} height={H + 6} style={{ display: 'block' }}>
          <rect x={0}     y={0}  width={s1}       height={16} fill="#E05252" rx="2" />
          <rect x={s1}    y={0}  width={m1}        height={16} fill="#D97706" rx="2" />
          <rect x={s1+m1} y={0}  width={W-s1-m1}  height={16} fill="#7CB9A0" rx="2" />
          {s1 > 22 && <text x={s1/2} y={11} fill="white" fontSize={8} textAnchor="middle" fontWeight="bold">{sup.toFixed(0)}%</text>}
          {m1 > 22 && <text x={s1+m1/2} y={11} fill="white" fontSize={8} textAnchor="middle" fontWeight="bold">{med.toFixed(0)}%</text>}
          {W-s1-m1 > 22 && <text x={s1+m1+(W-s1-m1)/2} y={11} fill="white" fontSize={8} textAnchor="middle" fontWeight="bold">{inf.toFixed(0)}%</text>}
          <rect x={0}      y={20} width={rs1}       height={8} fill="#E05252" opacity={0.3} rx="1" />
          <rect x={rs1}    y={20} width={rm1}        height={8} fill="#D97706" opacity={0.3} rx="1" />
          <rect x={rs1+rm1} y={20} width={W-rs1-rm1} height={8} fill="#7CB9A0" opacity={0.3} rx="1" />
        </svg>
      );
    };
    return (
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-5 border-b border-border-color">
          <div>
            <h3 className="text-xl font-bold text-text-main">Informe de Composición Corporal</h3>
            <p className="text-sm text-text-muted mt-1">
              {patientInfo.last_name}, {patientInfo.first_name} · {r.activity_group} · {r.session_date}
            </p>
          </div>
          <button onClick={downloadPDF}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-bold text-sm hover:-translate-y-0.5 hover:shadow-lg transition-all active:scale-95">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Descargar PDF
          </button>
        </div>

        {/* Composición + Pie */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <div className="bg-bg border border-border-color rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <h4 className="font-bold text-base mb-4 text-primary">Composición Corporal</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-border-color">
                    <th className="text-left py-2 pr-3 text-text-muted font-semibold text-xs">Componente</th>
                    <th className="text-left py-2 pr-3 text-text-muted font-semibold text-xs">Medido</th>
                    <th className="text-left py-2 pr-3 text-text-muted font-semibold text-xs">Ref.</th>
                    <th className="text-left py-2 pr-3 text-text-muted font-semibold text-xs">Dif.</th>
                    <th className="text-left py-2 text-text-muted font-semibold text-xs">Clasif.</th>
                  </tr>
                </thead>
                <tbody>
                  <ResultRow label="Masa Adiposa"  value={r.fatMassKg}    unit="kg" mean={ref.fatMassKg[0]}    sd={ref.fatMassKg[1]}    />
                  <ResultRow label="Masa Muscular" value={r.muscleMassKg} unit="kg" mean={ref.muscleMassKg[0]} sd={ref.muscleMassKg[1]} />
                  <ResultRow label="Masa Ósea"     value={r.boneMassKg}   unit="kg" mean={ref.boneMassKg[0]}   sd={ref.boneMassKg[1]}   />
                  <tr>
                    <td className="py-2 pr-3 font-medium text-sm">Masa Residual</td>
                    <td className="py-2 pr-3 font-mono font-bold text-sm">{r.residualMassKg} kg</td>
                    <td className="py-2 pr-3 text-text-muted text-xs">—</td>
                    <td className="py-2 pr-3 text-xs">—</td>
                    <td className="py-2 text-xs">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-bg border border-border-color rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <h4 className="font-bold text-base mb-4 text-primary">Porcentajes de los Componentes Corporales</h4>
            <PieChart fat={r.fatMassKg} muscle={r.muscleMassKg} bone={r.boneMassKg} residual={r.residualMassKg} size={160} />
          </div>
        </div>

        {/* Adiposity with visual bars */}
        <div className="bg-bg border border-border-color rounded-2xl p-5 mb-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <h4 className="font-bold text-base mb-4 text-primary">Índices de Adiposidad</h4>
          <div className="space-y-4">
            {[
              {
                name: 'Índice de Masa Corporal (IMC)', value: r.bmi, unit: 'kg/m²',
                cls: classifyBMI(r.bmi), ok: r.bmi>=18.5&&r.bmi<25,
                ref: 'Normal: 18.5 – 24.9',
                bar: <AppBMIBar bmi={r.bmi} />
              },
              {
                name: 'Índice Cintura-Cadera', value: r.waistHipRatio, unit: '',
                cls: classifyWaistHip(r.waistHipRatio,r.sex), ok: classifyWaistHip(r.waistHipRatio,r.sex)==='Valores Normales',
                ref: r.sex==='Masculino'?'Normal: < 0.90':'Normal: < 0.85',
                bar: <AppICCBar icc={r.waistHipRatio} sex={r.sex} />
              },
              {
                name: 'Perímetro Abdominal', value: r.girth_waist, unit: 'cm',
                cls: classifyAbdominal(r.girth_waist,r.sex), ok: classifyAbdominal(r.girth_waist,r.sex)==='Sin Riesgo',
                ref: r.sex==='Masculino'?'Sin riesgo: < 94 cm':'Sin riesgo: < 80 cm',
                bar: <AppAbdBar cm={r.girth_waist} sex={r.sex} />
              },
            ].map((item, i) => (
              <div key={i} className={`rounded-xl p-4 border-l-4 ${item.ok?'border-primary bg-primary/5':'border-danger bg-danger/5'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="text-xs text-text-muted uppercase tracking-wider mb-0.5">{item.name}</div>
                    <div className="text-2xl font-bold font-mono">{item.value}{item.unit ? ` ${item.unit}` : ''}</div>
                    <div className={`text-xs font-bold mt-0.5 ${item.ok?'text-primary':'text-danger'}`}>{item.cls}</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-text-muted">{item.ref}</span>
                    {item.bar}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Regional fat + Perimeters */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <div className="bg-bg border border-border-color rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <h4 className="font-bold text-base mb-4 text-primary">Distribución Regional de Grasa</h4>
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="border-b-2 border-border-color">
                  <th className="text-left py-2 pr-3 text-text-muted text-xs">Región</th>
                  <th className="text-left py-2 pr-3 text-text-muted text-xs">%</th>
                  <th className="text-left py-2 pr-3 text-text-muted text-xs">Ref.</th>
                  <th className="text-left py-2 text-text-muted text-xs">Clasif.</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Superior', value: r.fatSuperior, mean: ref.fatSuperior[0], sd: ref.fatSuperior[1] },
                  { name: 'Media',    value: r.fatMedia,    mean: ref.fatMedia[0],    sd: ref.fatMedia[1]    },
                  { name: 'Inferior', value: r.fatInferior, mean: ref.fatInferior[0], sd: ref.fatInferior[1] },
                ].map((row, i) => {
                  const cls = classify(row.value, row.mean, row.sd);
                  return (
                    <tr key={i} className="border-b border-border-color">
                      <td className="py-2 pr-3 font-medium">{row.name}</td>
                      <td className="py-2 pr-3 font-mono font-bold">{row.value}%</td>
                      <td className="py-2 pr-3 text-text-muted text-xs">{row.mean.toFixed(1)}±{row.sd.toFixed(1)}%</td>
                      <td className="py-2"><span className={`px-2 py-0.5 rounded text-xs font-bold ${classifyColor(cls)}`}>{cls}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-2">
              <div className="text-xs text-text-muted font-semibold mb-1.5 uppercase tracking-wider">Distribución % — Paciente vs. Referencia</div>
              <AppFatDistBar sup={r.fatSuperior} med={r.fatMedia} inf={r.fatInferior} />
              <div className="flex gap-4 mt-2 text-xs text-text-muted">
                <span><span style={{color:'#E05252'}} className="font-bold">■</span> Superior</span>
                <span><span style={{color:'#D97706'}} className="font-bold">■</span> Media</span>
                <span><span style={{color:'#7CB9A0'}} className="font-bold">■</span> Inferior</span>
                <span className="ml-auto opacity-60">Barra inferior = referencia</span>
              </div>
            </div>
          </div>
          <div className="bg-bg border border-border-color rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <h4 className="font-bold text-base mb-4 text-primary">Perímetros Musculares</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-border-color">
                  <th className="text-left py-2 pr-3 text-text-muted text-xs">Perímetro</th>
                  <th className="text-left py-2 pr-3 text-text-muted text-xs">Medido</th>
                  <th className="text-left py-2 pr-3 text-text-muted text-xs">Ref.</th>
                  <th className="text-left py-2 pr-3 text-text-muted text-xs">Dif.</th>
                  <th className="text-left py-2 text-text-muted text-xs">Posición</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Tórax',   value: r.girth_chest, mean: ref.chestCm[0], sd: ref.chestCm[1]  },
                  { name: 'Cintura', value: r.girth_waist, mean: ref.waistCm[0], sd: ref.waistCm[1]  },
                  { name: 'Cadera',  value: r.girth_hip,   mean: ref.hipCm[0],   sd: ref.hipCm[1]    },
                ].map((row, i) => {
                  const diff = (row.value - row.mean).toFixed(1);
                  return (
                    <tr key={i} className="border-b border-border-color">
                      <td className="py-2.5 pr-3 font-medium">{row.name}</td>
                      <td className="py-2.5 pr-3 font-mono font-bold">{row.value} cm</td>
                      <td className="py-2.5 pr-3 text-text-muted text-xs">{row.mean.toFixed(1)} cm</td>
                      <td className={`py-2.5 pr-3 font-mono font-bold text-sm ${parseFloat(diff)>0?'text-danger':'text-primary'}`}>
                        {parseFloat(diff)>0?'+':''}{diff}
                      </td>
                      <td className="py-2.5">
                        <AppCompBar value={row.value} mean={row.mean} maxDiff={Math.max(row.sd * 3, 15)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Valoración Morfológica */}
        <div className="bg-bg border border-border-color rounded-2xl p-5 mb-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <h4 className="font-bold text-base mb-1 text-primary flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Valoración Morfológica Personal
          </h4>
          <p className="text-xs text-text-muted mb-4">Interpretación narrativa automática basada en los resultados calculados</p>
          <div className="space-y-2">
            {generateValoracion(r, patientInfo.first_name, patientInfo.last_name, ref).split('\n').map((line, i) =>
              line === ''
                ? <div key={i} className="h-1" />
                : <p key={i} className={`text-sm leading-relaxed ${line.startsWith('•') ? 'pl-2 border-l-2 border-primary/30 text-text-main' : 'text-text-muted'}`}>{line}</p>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className={`rounded-xl p-5 text-white mb-4 ${r.bmi>=18.5&&r.bmi<25?'bg-gradient-to-br from-primary to-primary-light':'bg-gradient-to-br from-[#D97706] to-[#B45309]'}`}>
          <h3 className="font-bold mb-1">Evaluación General</h3>
          <p className="text-sm leading-relaxed opacity-95">
            <strong>{patientInfo.last_name}, {patientInfo.first_name}</strong> · Peso: <strong>{r.weight} kg</strong> · Talla: <strong>{r.height} cm</strong> · IMC: <strong>{r.bmi}</strong> ({classifyBMI(r.bmi)})<br />
            Adiposa: <strong>{r.fatMassKg} kg ({r.fatPct}%)</strong> · Muscular: <strong>{r.muscleMassKg} kg ({r.musclePct}%)</strong> · Ósea: <strong>{r.boneMassKg} kg ({r.bonePct}%)</strong>
          </p>
        </div>

        <div className="pt-4 border-t border-border-color">
          <button type="button" onClick={handleBack}
            className="flex items-center gap-2 px-5 py-2.5 border border-border-color rounded-lg text-sm font-semibold text-text-muted hover:bg-surface transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Volver a Diámetros
          </button>
        </div>
      </div>
    );
  }

  const stepRenders = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5, renderStep6];

  // ─────────────────────────────────────────────────────────────────────────
  // STEPPER
  // ─────────────────────────────────────────────────────────────────────────
  function Stepper() {
    return (
      <div className="flex items-center overflow-x-auto pb-1">
        {STEPS.map((step, idx) => {
          const isActive    = step.id === currentStep;
          const isCompleted = step.id < currentStep;
          return (
            <React.Fragment key={step.id}>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isActive ? (
                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-primary rounded-full shadow-sm">
                    <span className="text-white font-bold text-sm">{step.id}</span>
                    <span className="text-white font-bold text-sm whitespace-nowrap">{step.label}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isCompleted?'border-primary bg-primary/10':'border-border-color'}`}>
                      {isCompleted
                        ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><polyline points="20 6 9 17 4 12"/></svg>
                        : <span className="text-xs font-bold text-text-muted">{step.id}</span>
                      }
                    </div>
                    <span className="text-sm text-text-muted whitespace-nowrap hidden sm:block">{step.label}</span>
                  </div>
                )}
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`h-px flex-1 mx-3 min-w-[12px] ${step.id<currentStep?'bg-primary/40':'bg-border-color'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="animate-in" style={{ animationDelay: '0.2s' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-text-main">Evaluación Antropométrica</h2>
          <p className="text-sm text-text-muted mt-0.5">Composición corporal completa con informe PDF</p>
        </div>
        <div className="text-xs font-semibold text-text-muted bg-bg border border-border-color px-3 py-1.5 rounded-lg hidden sm:block">
          {selectedCompany}
        </div>
      </div>

      {/* Stepper bar */}
      <div className="bg-surface border border-border-color rounded-2xl px-5 py-4 mb-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <Stepper />
      </div>

      {/* Step content */}
      <div className="bg-surface border border-border-color rounded-2xl p-5 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.07)]">
        {stepRenders[currentStep - 1]()}
      </div>

      <PdfReport />
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => { setShowSuccessModal(false); if (onComplete) onComplete(); }}
        title="¡Evaluación Guardada!"
        message="La evaluación antropométrica ha sido registrada exitosamente."
      />
    </div>
  );
}
