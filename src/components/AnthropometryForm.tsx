import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { useCompany } from '../context/CompanyContext';
import SuccessModal from './SuccessModal';

// ─── Reference Tables ───────────────────────────────────────────────────────
// Based on Argentine published reference data (same source as the Excel generator)
// Values: [mean, sd] for each component
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
    'Activa - 16 a 18 años':       { fatMassKg:[14.2,2.8], muscleMassKg:[30.0,2.5], boneMassKg:[10.8,0.7], fatSuperior:[30.1,2.8], fatMedia:[39.8,3.1], fatInferior:[30.1,3.0], chestCm:[96.2,5.1], waistCm:[78.4,6.2], hipCm:[94.5,5.3] },
    'Activa - 19 a 30 años':       { fatMassKg:[16.8,2.9], muscleMassKg:[31.0,2.2], boneMassKg:[11.4,0.8], fatSuperior:[29.5,2.7], fatMedia:[40.5,3.2], fatInferior:[30.0,2.9], chestCm:[98.5,5.3], waistCm:[82.1,6.5], hipCm:[97.2,5.2] },
    'Activa - 31 a 50 años':       { fatMassKg:[20.0,3.3], muscleMassKg:[31.5,2.1], boneMassKg:[11.9,0.8], fatSuperior:[29.9,2.9], fatMedia:[40.9,3.3], fatInferior:[29.2,3.1], chestCm:[101.4,5.5], waistCm:[85.9,6.8], hipCm:[100.3,5.4] },
    'Activa - Mayor de 50 años':   { fatMassKg:[23.5,3.5], muscleMassKg:[29.8,2.3], boneMassKg:[11.2,0.9], fatSuperior:[31.2,3.1], fatMedia:[41.5,3.4], fatInferior:[27.3,3.0], chestCm:[103.2,5.8], waistCm:[90.2,7.0], hipCm:[101.8,5.6] },
    'Sedentaria - 16 a 18 años':   { fatMassKg:[18.5,3.2], muscleMassKg:[27.5,2.4], boneMassKg:[10.5,0.7], fatSuperior:[31.5,3.0], fatMedia:[40.0,3.2], fatInferior:[28.5,3.1], chestCm:[97.5,5.5], waistCm:[83.2,6.8], hipCm:[96.0,5.5] },
    'Sedentaria - 19 a 30 años':   { fatMassKg:[21.0,3.4], muscleMassKg:[28.5,2.3], boneMassKg:[11.0,0.8], fatSuperior:[30.8,2.9], fatMedia:[41.2,3.3], fatInferior:[28.0,3.0], chestCm:[100.0,5.6], waistCm:[87.5,7.0], hipCm:[98.8,5.5] },
    'Sedentaria - 31 a 50 años':   { fatMassKg:[25.0,3.6], muscleMassKg:[29.0,2.2], boneMassKg:[11.5,0.8], fatSuperior:[32.0,3.0], fatMedia:[41.8,3.4], fatInferior:[26.2,3.1], chestCm:[104.0,6.0], waistCm:[93.0,7.2], hipCm:[103.0,5.8] },
    'Sedentaria - Mayor de 50 años':{ fatMassKg:[28.0,3.8], muscleMassKg:[27.5,2.4], boneMassKg:[10.8,0.9], fatSuperior:[33.5,3.2], fatMedia:[42.2,3.5], fatInferior:[24.3,3.0], chestCm:[106.5,6.2], waistCm:[97.5,7.5], hipCm:[104.5,6.0] },
  },
  Femenino: {
    'Activa - 16 a 18 años':       { fatMassKg:[15.8,2.5], muscleMassKg:[20.5,1.8], boneMassKg:[8.5,0.6], fatSuperior:[28.5,2.6], fatMedia:[38.0,3.0], fatInferior:[33.5,3.2], chestCm:[84.5,4.8], waistCm:[68.5,5.5], hipCm:[90.0,5.0] },
    'Activa - 19 a 30 años':       { fatMassKg:[17.5,2.8], muscleMassKg:[21.0,1.9], boneMassKg:[8.9,0.7], fatSuperior:[28.0,2.5], fatMedia:[38.5,3.1], fatInferior:[33.5,3.1], chestCm:[86.2,4.9], waistCm:[70.8,5.8], hipCm:[92.5,5.2] },
    'Activa - 31 a 50 años':       { fatMassKg:[20.5,3.0], muscleMassKg:[21.5,2.0], boneMassKg:[9.2,0.7], fatSuperior:[29.0,2.7], fatMedia:[39.0,3.2], fatInferior:[32.0,3.0], chestCm:[88.5,5.1], waistCm:[74.0,6.0], hipCm:[95.0,5.3] },
    'Activa - Mayor de 50 años':   { fatMassKg:[24.0,3.2], muscleMassKg:[20.5,2.1], boneMassKg:[8.8,0.8], fatSuperior:[30.5,2.9], fatMedia:[39.8,3.3], fatInferior:[29.7,3.0], chestCm:[91.0,5.3], waistCm:[79.0,6.3], hipCm:[97.5,5.5] },
    'Sedentaria - 16 a 18 años':   { fatMassKg:[20.0,3.0], muscleMassKg:[18.5,1.7], boneMassKg:[8.2,0.6], fatSuperior:[30.0,2.8], fatMedia:[38.5,3.1], fatInferior:[31.5,3.2], chestCm:[86.0,5.0], waistCm:[73.0,6.0], hipCm:[92.5,5.2] },
    'Sedentaria - 19 a 30 años':   { fatMassKg:[22.5,3.2], muscleMassKg:[19.0,1.8], boneMassKg:[8.6,0.7], fatSuperior:[30.5,2.8], fatMedia:[39.2,3.2], fatInferior:[30.3,3.1], chestCm:[88.5,5.2], waistCm:[76.5,6.2], hipCm:[95.0,5.4] },
    'Sedentaria - 31 a 50 años':   { fatMassKg:[26.0,3.4], muscleMassKg:[19.5,1.9], boneMassKg:[8.9,0.7], fatSuperior:[31.5,3.0], fatMedia:[40.0,3.3], fatInferior:[28.5,3.0], chestCm:[91.5,5.4], waistCm:[81.5,6.5], hipCm:[98.0,5.6] },
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
  if (label === 'Buena') return 'text-accent-dark bg-accent/10';
  if (label === 'Regular') return 'text-[#D97706] bg-warning/10';
  return 'text-danger bg-danger/10';
}

function classifyBMI(bmi: number): string {
  if (bmi < 18.5) return 'Bajo Peso';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Sobrepeso';
  if (bmi < 35) return 'Obesidad Grado I';
  if (bmi < 40) return 'Obesidad Grado II';
  return 'Obesidad Grado III';
}

function classifyWaistHip(ratio: number, sex: string): string {
  if (sex === 'Masculino') {
    if (ratio < 0.90) return 'Valores Normales';
    if (ratio < 1.0) return 'Riesgo Moderado';
    return 'Riesgo Elevado';
  } else {
    if (ratio < 0.85) return 'Valores Normales';
    if (ratio < 0.90) return 'Riesgo Moderado';
    return 'Riesgo Elevado';
  }
}

function classifyAbdominal(cm: number, sex: string): string {
  const limit = sex === 'Masculino' ? 102 : 88;
  const high = sex === 'Masculino' ? 94 : 80;
  if (cm < high) return 'Sin Riesgo';
  if (cm < limit) return 'Riesgo Incrementado';
  return 'Riesgo para la Salud Sustancialmente Incrementado';
}

// ─── Calculation engine ────────────────────────────────────────────────────
function calculateBodyComposition(data: any, sex: string, age: number) {
  const {
    weight, fold_triceps, fold_subscapular, fold_iliac_crest, fold_abdominal,
    fold_front_thigh, fold_medial_calf, fold_biceps,
    girth_arm_relaxed, girth_thigh_mid, girth_calf, girth_waist, girth_hip, girth_chest,
    diam_femur, diam_wrist, height,
  } = data;

  const sum4 = fold_triceps + fold_subscapular + fold_iliac_crest + fold_abdominal;

  // % Fat — Durnin & Womersley
  let fatPct: number;
  if (sex === 'Masculino') {
    fatPct = 0.29288 * sum4 - 0.0005 * sum4 * sum4 + 0.15845 * age - 5.76377;
  } else {
    fatPct = 0.29669 * sum4 - 0.00043 * sum4 * sum4 + 0.02963 * age + 1.4072;
  }
  fatPct = Math.max(5, Math.min(60, fatPct));

  const fatMassKg = weight * fatPct / 100;

  // Bone mass — Rocha
  const boneMassKg = 3.02 * Math.pow((height / 100) ** 2 * (diam_femur / 100) * (diam_wrist / 100) * 400, 0.712);

  // Residual mass
  const residualMassKg = sex === 'Masculino' ? weight * 0.241 : weight * 0.209;

  // Muscle mass — Martin et al.
  const muscleMassKg = (
    0.00744 * Math.pow(girth_thigh_mid - Math.PI * (fold_front_thigh / 10), 2) +
    0.00088 * Math.pow(girth_arm_relaxed - Math.PI * (fold_triceps / 10), 2) +
    0.00441 * Math.pow(girth_calf - Math.PI * (fold_medial_calf / 10), 2)
  ) + (sex === 'Masculino' ? 2.4 : 0) - 0.048 * age + height * 0.048 + 7.8;

  // Regional fat distribution (6 folds total)
  const sum6 = fold_triceps + fold_subscapular + fold_biceps + fold_iliac_crest + fold_abdominal + (fold_front_thigh + fold_medial_calf) / 2;
  const fatSuperior = (fold_triceps + fold_subscapular) / sum6 * 100;
  const fatMedia = (fold_iliac_crest + fold_abdominal) / sum6 * 100;
  const fatInferior = ((fold_front_thigh + fold_medial_calf) / 2) / sum6 * 100;

  const bmi = weight / Math.pow(height / 100, 2);
  const waistHipRatio = girth_waist / girth_hip;

  return {
    fatPct: parseFloat(fatPct.toFixed(1)),
    fatMassKg: parseFloat(fatMassKg.toFixed(1)),
    muscleMassKg: parseFloat(Math.max(5, muscleMassKg).toFixed(1)),
    boneMassKg: parseFloat(boneMassKg.toFixed(1)),
    residualMassKg: parseFloat(residualMassKg.toFixed(1)),
    musclePct: parseFloat((Math.max(5, muscleMassKg) / weight * 100).toFixed(1)),
    bonePct: parseFloat((boneMassKg / weight * 100).toFixed(1)),
    residualPct: parseFloat((residualMassKg / weight * 100).toFixed(1)),
    fatSuperior: parseFloat(fatSuperior.toFixed(1)),
    fatMedia: parseFloat(fatMedia.toFixed(1)),
    fatInferior: parseFloat(fatInferior.toFixed(1)),
    bmi: parseFloat(bmi.toFixed(1)),
    waistHipRatio: parseFloat(waistHipRatio.toFixed(2)),
    girth_chest, girth_waist, girth_hip,
  };
}

// ─── Component ─────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  patient_id: '',
  session_date: new Date().toISOString().split('T')[0],
  activity_group: 'Activa - 31 a 50 años',
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
};

export default function AnthropometryForm({ onComplete }: { onComplete?: () => void }) {
  const { showToast } = useToast();
  const { selectedCompany } = useCompany();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingPatients, setFetchingPatients] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [results, setResults] = useState<any | null>(null);
  const [patientInfo, setPatientInfo] = useState<any | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  useEffect(() => { fetchPatients(); }, [selectedCompany]);

  async function fetchPatients() {
    setFetchingPatients(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, birth_date, sex')
        .eq('company', selectedCompany)
        .order('last_name', { ascending: true });
      if (error) throw error;
      setPatients(data || []);
    } catch (err) {
      console.error('Error fetching patients:', err);
    } finally {
      setFetchingPatients(false);
    }
  }

  function getAge(birthDate: string): number {
    if (!birthDate) return 30;
    const today = new Date();
    const dob = new Date(birthDate);
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  }

  const REQUIRED_FIELDS = [
    'weight','height','fold_triceps','fold_subscapular','fold_biceps','fold_iliac_crest',
    'fold_abdominal','fold_front_thigh','fold_medial_calf',
    'girth_arm_relaxed','girth_chest','girth_waist','girth_hip','girth_thigh_mid','girth_calf',
    'diam_femur','diam_wrist'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patient_id) {
      setMessage({ type: 'error', text: 'Por favor selecciona un paciente.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const missing = REQUIRED_FIELDS.filter(k => (formData as any)[k] === '');
    if (missing.length > 0) {
      setMessage({ type: 'error', text: 'Hay campos obligatorios vacíos. Completalos o ingresá 0 si no tenés el dato.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const patient = patients.find(p => p.id === formData.patient_id);
      const sex = patient?.sex || 'Masculino';
      const age = getAge(patient?.birth_date);

      const numericData: any = {};
      Object.entries(formData).forEach(([k, v]) => {
        if (k !== 'patient_id' && k !== 'session_date' && k !== 'activity_group') {
          numericData[k] = v === '' ? null : parseFloat(v as string);
        }
      });

      const sessionPayload = {
        patient_id: formData.patient_id,
        nutritionist_id: userData.user?.id,
        session_date: formData.session_date,
        modality: 'Presencial',
        company: selectedCompany,
        session_type: 'Antropometría',
        ...numericData,
      };

      const { error } = await supabase.from('sessions').insert([sessionPayload]);
      if (error) throw error;

      // Calculate results
      const calcData = { ...numericData };
      const calc = calculateBodyComposition(calcData, sex, age);
      const ref = (REFERENCE[sex] || REFERENCE['Masculino'])[formData.activity_group] || REFERENCE['Masculino']['Activa - 31 a 50 años'];

      setResults({ ...calc, ref, sex, age, activity_group: formData.activity_group, weight: numericData.weight, height: numericData.height, session_date: formData.session_date });
      setPatientInfo(patient);
      setShowSuccessModal(false);
      showToast('Evaluación antropométrica guardada', 'success');
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } catch (err: any) {
      const errorText = err.message || 'Error al guardar la evaluación';
      setMessage({ type: 'error', text: errorText });
      showToast(errorText, 'error');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  async function downloadPDF() {
    if (!pdfRef.current) return;
    const html2pdf = (await import('html2pdf.js')).default;
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `Antropometria_${patientInfo?.last_name}_${results?.session_date}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    pdfRef.current.style.display = 'block';
    await html2pdf().set(opt).from(pdfRef.current).save();
    pdfRef.current.style.display = 'none';
  }

  const inputClass = 'p-2 border border-border-color rounded-md bg-surface font-mono text-sm focus:outline-none focus:border-primary';
  const labelClass = 'text-[0.75rem] font-semibold uppercase tracking-wider text-text-muted';

  function MeasureGroup({ title, fields }: { title: string; fields: string[] }) {
    return (
      <div className="mb-4">
        <h4 className="font-semibold text-text-main mb-3 mt-6 border-b border-border-color pb-1">{title}</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {fields.map(field => {
            const [key, label] = field.split('|');
            const isRequired = REQUIRED_FIELDS.includes(key);
            return (
              <div key={key} className="flex flex-col gap-1">
                <label className={labelClass}>{label}{isRequired && <span className="text-danger ml-0.5">*</span>}</label>
                <input type="number" step="0.1" className={inputClass} value={(formData as any)[key]}
                  onChange={e => setFormData({ ...formData, [key]: e.target.value })} />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Pie chart SVG ──
  function PieChart({ fat, muscle, bone, residual }: { fat: number; muscle: number; bone: number; residual: number }) {
    const total = fat + muscle + bone + residual;
    const slices = [
      { pct: fat / total, color: '#E05252', label: 'Adiposa' },
      { pct: muscle / total, color: '#0A4D3C', label: 'Muscular' },
      { pct: bone / total, color: '#7CB9A0', label: 'Ósea' },
      { pct: residual / total, color: '#C0C0C0', label: 'Residual' },
    ];
    let cumAngle = -Math.PI / 2;
    const cx = 80, cy = 80, r = 70;
    const paths = slices.map(s => {
      const startAngle = cumAngle;
      const endAngle = cumAngle + s.pct * 2 * Math.PI;
      cumAngle = endAngle;
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArc = s.pct > 0.5 ? 1 : 0;
      return { ...s, d: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z` };
    });
    return (
      <div className="flex flex-col md:flex-row items-center gap-6">
        <svg width="160" height="160" viewBox="0 0 160 160">
          {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} stroke="#fff" strokeWidth="1.5" />)}
        </svg>
        <div className="flex flex-col gap-2">
          {slices.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="font-semibold text-text-muted">{s.label}</span>
              <span className="font-bold ml-auto">{(s.pct * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function ResultRow({ label, value, unit, mean, sd }: { label: string; value: number; unit: string; mean: number; sd: number }) {
    const diff = (value - mean).toFixed(1);
    const classification = classify(value, mean, sd);
    return (
      <tr className="border-b border-border-color">
        <td className="py-2 pr-4 font-medium text-sm">{label}</td>
        <td className="py-2 pr-4 font-mono font-bold text-sm">{value} {unit}</td>
        <td className="py-2 pr-4 text-text-muted text-sm">{mean.toFixed(1)} ± {sd.toFixed(1)} {unit}</td>
        <td className="py-2 pr-4 font-mono text-sm">{parseFloat(diff) > 0 ? '+' : ''}{diff} {unit}</td>
        <td className="py-2">
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${classifyColor(classification)}`}>{classification}</span>
        </td>
      </tr>
    );
  }

  // ── PDF Template ──
  function PdfReport() {
    if (!results || !patientInfo) return null;
    const r = results;
    const ref = r.ref as RefGroup;
    return (
      <div ref={pdfRef} style={{ display: 'none', fontFamily: 'Arial, sans-serif', color: '#1a1a1a', padding: '20px', maxWidth: '794px' }}>
        {/* Header */}
        <div style={{ background: '#0A4D3C', color: 'white', padding: '16px 20px', borderRadius: '8px', marginBottom: '20px' }}>
          <div style={{ fontSize: '22px', fontWeight: 'bold' }}>EVALUACIÓN ANTROPOMÉTRICA</div>
          <div style={{ fontSize: '13px', marginTop: '4px', opacity: 0.85 }}>Informe profesional de composición corporal</div>
        </div>

        {/* Demographics */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '13px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '6px 12px', background: '#f0f7f4', fontWeight: 'bold', width: '25%' }}>Apellido y Nombre</td>
              <td style={{ padding: '6px 12px' }}>{patientInfo.last_name}, {patientInfo.first_name}</td>
              <td style={{ padding: '6px 12px', background: '#f0f7f4', fontWeight: 'bold', width: '20%' }}>Sexo</td>
              <td style={{ padding: '6px 12px' }}>{r.sex}</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 12px', background: '#f0f7f4', fontWeight: 'bold' }}>Fecha de Evaluación</td>
              <td style={{ padding: '6px 12px' }}>{r.session_date}</td>
              <td style={{ padding: '6px 12px', background: '#f0f7f4', fontWeight: 'bold' }}>Edad</td>
              <td style={{ padding: '6px 12px' }}>{r.age} años</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 12px', background: '#f0f7f4', fontWeight: 'bold' }}>Grupo de Referencia</td>
              <td colSpan={3} style={{ padding: '6px 12px' }}>{r.activity_group}</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 12px', background: '#f0f7f4', fontWeight: 'bold' }}>Peso</td>
              <td style={{ padding: '6px 12px' }}>{r.weight} kg</td>
              <td style={{ padding: '6px 12px', background: '#f0f7f4', fontWeight: 'bold' }}>Talla</td>
              <td style={{ padding: '6px 12px' }}>{r.height} cm</td>
            </tr>
          </tbody>
        </table>

        {/* Body Composition */}
        <div style={{ background: '#f0f7f4', padding: '10px 14px', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px', color: '#0A4D3C', marginBottom: '10px' }}>
          COMPOSICIÓN CORPORAL
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '20px' }}>
          <thead>
            <tr style={{ background: '#0A4D3C', color: 'white' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Componente</th>
              <th style={{ padding: '8px 12px', textAlign: 'center' }}>%</th>
              <th style={{ padding: '8px 12px', textAlign: 'center' }}>kg</th>
              <th style={{ padding: '8px 12px', textAlign: 'center' }}>Referencia (Media ± DE)</th>
              <th style={{ padding: '8px 12px', textAlign: 'center' }}>Clasificación</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'Masa Adiposa', pct: r.fatPct, kg: r.fatMassKg, mean: ref.fatMassKg[0], sd: ref.fatMassKg[1] },
              { name: 'Masa Muscular', pct: r.musclePct, kg: r.muscleMassKg, mean: ref.muscleMassKg[0], sd: ref.muscleMassKg[1] },
              { name: 'Masa Ósea', pct: r.bonePct, kg: r.boneMassKg, mean: ref.boneMassKg[0], sd: ref.boneMassKg[1] },
              { name: 'Masa Residual', pct: r.residualPct, kg: r.residualMassKg, mean: null, sd: null },
            ].map((row, i) => {
              const cls = row.mean !== null ? classify(row.kg, row.mean!, row.sd!) : '—';
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>{row.name}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>{row.pct}%</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 'bold' }}>{row.kg} kg</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', color: '#555' }}>
                    {row.mean !== null ? `${row.mean.toFixed(1)} ± ${row.sd!.toFixed(1)} kg` : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <span style={{ background: cls === 'Excelente' || cls === 'Muy Buena' ? '#d1fae5' : cls === 'Buena' ? '#dcfce7' : cls === 'Regular' ? '#fef9c3' : cls === '—' ? '#f3f4f6' : '#fee2e2', color: cls === 'Excelente' || cls === 'Muy Buena' ? '#065f46' : cls === 'Regular' ? '#92400e' : cls === '—' ? '#6b7280' : '#991b1b', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>{cls}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Adiposity */}
        <div style={{ background: '#f0f7f4', padding: '10px 14px', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px', color: '#0A4D3C', marginBottom: '10px' }}>
          ÍNDICES DE ADIPOSIDAD
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '20px' }}>
          <tbody>
            <tr style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>IMC</td>
              <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>{r.bmi}</td>
              <td style={{ padding: '8px 12px', color: '#555' }}>Normal: 18.5 – 24.9</td>
              <td style={{ padding: '8px 12px' }}><span style={{ fontWeight: 'bold', color: r.bmi >= 18.5 && r.bmi < 25 ? '#065f46' : '#991b1b' }}>{classifyBMI(r.bmi)}</span></td>
            </tr>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>Índice Cintura-Cadera</td>
              <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>{r.waistHipRatio}</td>
              <td style={{ padding: '8px 12px', color: '#555' }}>{r.sex === 'Masculino' ? 'Normal: < 0.90' : 'Normal: < 0.85'}</td>
              <td style={{ padding: '8px 12px' }}><span style={{ fontWeight: 'bold' }}>{classifyWaistHip(r.waistHipRatio, r.sex)}</span></td>
            </tr>
            <tr style={{ background: '#fff' }}>
              <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>Perímetro Abdominal</td>
              <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>{r.girth_waist} cm</td>
              <td style={{ padding: '8px 12px', color: '#555' }}>{r.sex === 'Masculino' ? 'Sin riesgo: < 94 cm' : 'Sin riesgo: < 80 cm'}</td>
              <td style={{ padding: '8px 12px' }}><span style={{ fontWeight: 'bold' }}>{classifyAbdominal(r.girth_waist, r.sex)}</span></td>
            </tr>
          </tbody>
        </table>

        {/* Regional fat */}
        <div style={{ background: '#f0f7f4', padding: '10px 14px', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px', color: '#0A4D3C', marginBottom: '10px' }}>
          DISTRIBUCIÓN REGIONAL DE GRASA
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '20px' }}>
          <thead>
            <tr style={{ background: '#0A4D3C', color: 'white' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Región</th>
              <th style={{ padding: '8px 12px', textAlign: 'center' }}>% Grasa Regional</th>
              <th style={{ padding: '8px 12px', textAlign: 'center' }}>Referencia (Media ± DE)</th>
              <th style={{ padding: '8px 12px', textAlign: 'center' }}>Clasificación</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'Región Superior', value: r.fatSuperior, mean: ref.fatSuperior[0], sd: ref.fatSuperior[1] },
              { name: 'Región Media', value: r.fatMedia, mean: ref.fatMedia[0], sd: ref.fatMedia[1] },
              { name: 'Región Inferior', value: r.fatInferior, mean: ref.fatInferior[0], sd: ref.fatInferior[1] },
            ].map((row, i) => {
              const cls = classify(row.value, row.mean, row.sd);
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>{row.name}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 'bold' }}>{row.value}%</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', color: '#555' }}>{row.mean.toFixed(1)} ± {row.sd.toFixed(1)}%</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <span style={{ fontWeight: 'bold' }}>{cls}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Perimeters */}
        <div style={{ background: '#f0f7f4', padding: '10px 14px', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px', color: '#0A4D3C', marginBottom: '10px' }}>
          PERÍMETROS MUSCULARES
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '20px' }}>
          <thead>
            <tr style={{ background: '#0A4D3C', color: 'white' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Perímetro</th>
              <th style={{ padding: '8px 12px', textAlign: 'center' }}>Medido</th>
              <th style={{ padding: '8px 12px', textAlign: 'center' }}>Referencia</th>
              <th style={{ padding: '8px 12px', textAlign: 'center' }}>Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'Tórax', value: r.girth_chest, mean: ref.chestCm[0] },
              { name: 'Cintura', value: r.girth_waist, mean: ref.waistCm[0] },
              { name: 'Cadera', value: r.girth_hip, mean: ref.hipCm[0] },
            ].map((row, i) => {
              const diff = (row.value - row.mean).toFixed(1);
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>{row.name}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 'bold' }}>{row.value} cm</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', color: '#555' }}>{row.mean.toFixed(1)} cm</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 'bold', color: parseFloat(diff) > 0 ? '#991b1b' : '#065f46' }}>
                    {parseFloat(diff) > 0 ? '+' : ''}{diff} cm
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ fontSize: '11px', color: '#888', borderTop: '1px solid #e5e7eb', paddingTop: '10px', textAlign: 'center' }}>
          Informe generado por NutriApp · Los datos se comparan con población argentina de referencia según grupos de actividad y edad.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border-2 border-border-color rounded-xl p-5 md:p-8 mb-8 animate-in" style={{ animationDelay: '0.3s' }}>
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-2 mb-6">
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M3 3h18v5H3z" /><line x1="7" y1="8" x2="7" y2="13" /><line x1="12" y1="8" x2="12" y2="11" /><line x1="17" y1="8" x2="17" y2="13" /><path d="M3 13h18v8H3z" /></svg>
          Evaluación Antropométrica
        </h2>
        <div className="text-text-muted text-xs md:text-sm">Composición corporal completa con informe PDF</div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 text-sm font-semibold ${message.type === 'success' ? 'bg-primary/10 text-primary border border-primary' : 'bg-danger/10 text-danger border border-danger'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Header row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 border-b-2 border-border-color pb-6">
          <div className="flex flex-col gap-2">
            <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Paciente</label>
            <select className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary transition-all" value={formData.patient_id} onChange={e => setFormData({ ...formData, patient_id: e.target.value })} disabled={fetchingPatients}>
              <option value="">{fetchingPatients ? 'Cargando...' : 'Seleccionar paciente...'}</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.last_name}, {p.first_name}{p.sex ? ` (${p.sex === 'Masculino' ? 'M' : 'F'})` : ''}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Fecha</label>
            <input type="date" className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary transition-all" value={formData.session_date} onChange={e => setFormData({ ...formData, session_date: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Grupo de Referencia</label>
            <select className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary transition-all cursor-pointer" value={formData.activity_group} onChange={e => setFormData({ ...formData, activity_group: e.target.value })}>
              {['Activa - 16 a 18 años','Activa - 19 a 30 años','Activa - 31 a 50 años','Activa - Mayor de 50 años','Sedentaria - 16 a 18 años','Sedentaria - 19 a 30 años','Sedentaria - 31 a 50 años','Sedentaria - Mayor de 50 años'].map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-bg p-4 md:p-6 rounded-2xl mb-6 border border-border-color shadow-sm">
          <h3 className="text-lg font-bold mb-2 text-primary flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
            Mediciones Antropométricas
          </h3>
          <p className="text-xs text-text-muted mb-4">Los campos marcados con <span className="text-danger font-bold">*</span> son obligatorios para los cálculos.</p>

          <MeasureGroup title="Datos Básicos (kg / cm)" fields={['weight|Peso*','height|Talla','sitting_height|Talla sentado','arm_span|Envergadura']} />
          <MeasureGroup title="Pliegues Cutáneos (mm)" fields={['fold_triceps|Tríceps*','fold_subscapular|Subescapular*','fold_biceps|Bíceps*','fold_iliac_crest|Cresta ilíaca*','fold_supraspinale|Supraespinal','fold_abdominal|Abdominal*','fold_front_thigh|Muslo anterior*','fold_medial_calf|Pantorrilla medial*']} />
          <MeasureGroup title="Perímetros (cm)" fields={['girth_head|Cabeza','girth_neck|Cuello','girth_arm_relaxed|Brazo relajado*','girth_arm_flexed|Brazo flexionado','girth_forearm|Antebrazo','girth_wrist|Muñeca','girth_chest|Tórax*','girth_waist|Cintura*','girth_hip|Cadera*','girth_thigh_max|Muslo máximo','girth_thigh_mid|Muslo medial*','girth_calf|Pantorrilla*','girth_ankle|Tobillo']} />
          <MeasureGroup title="Diámetros Óseos (cm)" fields={['diam_biacromial|Biacromial','diam_biiliocristal|Bi-iliocrestídeo','diam_transverse_chest|Tórax transverso','diam_ap_chest|Tórax A-P','diam_humerus|Húmero','diam_femur|Fémur*','diam_wrist|Muñeca*','diam_ankle|Tobillo']} />
          <MeasureGroup title="Longitudes y Alturas (cm)" fields={['len_acromiale_radiale|Acromio-radial','len_radiale_stylion|Radial-estiloidea','len_midstylion_dactylion|M-E a dactiloidea','len_iliospinale|Ilioespinal','len_trochanterion|Trocantérea','len_trochanterion_tibiale_laterale|Troc.-tibial lat.','len_tibiale_laterale|Tibial lateral','len_tibiale_mediale_sphyrion_tibiale|Tibial med.-maleolar','len_foot|Long. del pie']} />
        </div>

        <div className="flex flex-col-reverse md:flex-row gap-4 justify-end pt-4 border-t-2 border-border-color">
          <button type="button" className="w-full md:w-auto px-8 py-3.5 bg-bg text-text-main border-2 border-border-color rounded-xl font-bold text-base transition-all hover:bg-surface hover:border-primary active:scale-95" onClick={() => window.location.reload()}>
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="w-full md:w-auto px-8 py-3.5 bg-gradient-to-br from-primary to-primary-light text-white rounded-xl font-bold text-base transition-all hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(10,77,60,0.3)] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white" /> : (
              <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>Calcular y Guardar</>
            )}
          </button>
        </div>
      </form>

      {/* ── Results panel ── */}
      {results && patientInfo && (() => {
        const r = results;
        const ref = r.ref as RefGroup;
        return (
          <div className="mt-10 border-t-2 border-border-color pt-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h3 className="text-xl font-bold">Informe de Composición Corporal</h3>
                <p className="text-text-muted text-sm mt-1">{patientInfo.last_name}, {patientInfo.first_name} · {r.activity_group} · {r.session_date}</p>
              </div>
              <button onClick={downloadPDF} className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:-translate-y-1 hover:shadow-lg transition-all active:scale-95">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                Descargar PDF
              </button>
            </div>

            {/* Composition + Pie */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-bg border border-border-color rounded-2xl p-6">
                <h4 className="font-bold text-base mb-4 text-primary">Composición Corporal</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-border-color">
                        <th className="text-left py-2 pr-4 text-text-muted font-semibold">Componente</th>
                        <th className="text-left py-2 pr-4 text-text-muted font-semibold">Medido</th>
                        <th className="text-left py-2 pr-4 text-text-muted font-semibold">Ref. (Media±DE)</th>
                        <th className="text-left py-2 pr-4 text-text-muted font-semibold">Dif.</th>
                        <th className="text-left py-2 text-text-muted font-semibold">Clasif.</th>
                      </tr>
                    </thead>
                    <tbody>
                      <ResultRow label="Masa Adiposa" value={r.fatMassKg} unit="kg" mean={ref.fatMassKg[0]} sd={ref.fatMassKg[1]} />
                      <ResultRow label="Masa Muscular" value={r.muscleMassKg} unit="kg" mean={ref.muscleMassKg[0]} sd={ref.muscleMassKg[1]} />
                      <ResultRow label="Masa Ósea" value={r.boneMassKg} unit="kg" mean={ref.boneMassKg[0]} sd={ref.boneMassKg[1]} />
                      <tr>
                        <td className="py-2 pr-4 font-medium text-sm">Masa Residual</td>
                        <td className="py-2 pr-4 font-mono font-bold text-sm">{r.residualMassKg} kg</td>
                        <td className="py-2 pr-4 text-text-muted text-sm">—</td>
                        <td className="py-2 pr-4 text-sm">—</td>
                        <td className="py-2 text-sm">—</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="bg-bg border border-border-color rounded-2xl p-6 flex flex-col items-center justify-center">
                <h4 className="font-bold text-base mb-4 text-primary self-start">Distribución Visual</h4>
                <PieChart fat={r.fatMassKg} muscle={r.muscleMassKg} bone={r.boneMassKg} residual={r.residualMassKg} />
              </div>
            </div>

            {/* Adiposity */}
            <div className="bg-bg border border-border-color rounded-2xl p-6 mb-6">
              <h4 className="font-bold text-base mb-4 text-primary">Índices de Adiposidad</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { name: 'IMC', value: r.bmi, extra: classifyBMI(r.bmi), ok: r.bmi >= 18.5 && r.bmi < 25 },
                  { name: 'Índice Cintura-Cadera', value: r.waistHipRatio, extra: classifyWaistHip(r.waistHipRatio, r.sex), ok: classifyWaistHip(r.waistHipRatio, r.sex) === 'Valores Normales' },
                  { name: 'Perímetro Abdominal', value: `${r.girth_waist} cm`, extra: classifyAbdominal(r.girth_waist, r.sex), ok: classifyAbdominal(r.girth_waist, r.sex) === 'Sin Riesgo' },
                ].map((item, i) => (
                  <div key={i} className={`rounded-xl p-4 border-l-4 ${item.ok ? 'border-primary bg-primary/5' : 'border-danger bg-danger/5'}`}>
                    <div className="text-xs text-text-muted uppercase tracking-wider mb-1">{item.name}</div>
                    <div className="text-2xl font-bold font-mono mb-1">{item.value}</div>
                    <div className={`text-xs font-bold ${item.ok ? 'text-primary' : 'text-danger'}`}>{item.extra}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Regional fat */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-bg border border-border-color rounded-2xl p-6">
                <h4 className="font-bold text-base mb-4 text-primary">Distribución Regional de Grasa</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-border-color">
                      <th className="text-left py-2 pr-4 text-text-muted">Región</th>
                      <th className="text-left py-2 pr-4 text-text-muted">%</th>
                      <th className="text-left py-2 pr-4 text-text-muted">Ref.</th>
                      <th className="text-left py-2 text-text-muted">Clasif.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: 'Superior', value: r.fatSuperior, mean: ref.fatSuperior[0], sd: ref.fatSuperior[1] },
                      { name: 'Media', value: r.fatMedia, mean: ref.fatMedia[0], sd: ref.fatMedia[1] },
                      { name: 'Inferior', value: r.fatInferior, mean: ref.fatInferior[0], sd: ref.fatInferior[1] },
                    ].map((row, i) => {
                      const cls = classify(row.value, row.mean, row.sd);
                      return (
                        <tr key={i} className="border-b border-border-color">
                          <td className="py-2 pr-4 font-medium">{row.name}</td>
                          <td className="py-2 pr-4 font-mono font-bold">{row.value}%</td>
                          <td className="py-2 pr-4 text-text-muted">{row.mean.toFixed(1)} ± {row.sd.toFixed(1)}%</td>
                          <td className="py-2"><span className={`px-2 py-0.5 rounded text-xs font-bold ${classifyColor(cls)}`}>{cls}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="bg-bg border border-border-color rounded-2xl p-6">
                <h4 className="font-bold text-base mb-4 text-primary">Perímetros Musculares</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-border-color">
                      <th className="text-left py-2 pr-4 text-text-muted">Perímetro</th>
                      <th className="text-left py-2 pr-4 text-text-muted">Medido</th>
                      <th className="text-left py-2 pr-4 text-text-muted">Ref.</th>
                      <th className="text-left py-2 text-text-muted">Dif.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: 'Tórax', value: r.girth_chest, mean: ref.chestCm[0] },
                      { name: 'Cintura', value: r.girth_waist, mean: ref.waistCm[0] },
                      { name: 'Cadera', value: r.girth_hip, mean: ref.hipCm[0] },
                    ].map((row, i) => {
                      const diff = (row.value - row.mean).toFixed(1);
                      return (
                        <tr key={i} className="border-b border-border-color">
                          <td className="py-2 pr-4 font-medium">{row.name}</td>
                          <td className="py-2 pr-4 font-mono font-bold">{row.value} cm</td>
                          <td className="py-2 pr-4 text-text-muted">{row.mean.toFixed(1)} cm</td>
                          <td className={`py-2 font-mono font-bold ${parseFloat(diff) > 0 ? 'text-danger' : 'text-primary'}`}>
                            {parseFloat(diff) > 0 ? '+' : ''}{diff} cm
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary banner */}
            <div className={`rounded-xl p-6 text-white ${r.bmi >= 18.5 && r.bmi < 25 ? 'bg-gradient-to-br from-primary to-primary-light' : 'bg-gradient-to-br from-[#D97706] to-[#B45309]'}`}>
              <h3 className="text-lg font-bold mb-2">Evaluación General</h3>
              <p className="leading-relaxed">
                <strong>{patientInfo.last_name}, {patientInfo.first_name}</strong> · Peso: <strong>{r.weight} kg</strong> · Talla: <strong>{r.height} cm</strong> · IMC: <strong>{r.bmi}</strong> ({classifyBMI(r.bmi)})<br />
                Masa Adiposa: <strong>{r.fatMassKg} kg ({r.fatPct}%)</strong> · Masa Muscular: <strong>{r.muscleMassKg} kg ({r.musclePct}%)</strong> · Masa Ósea: <strong>{r.boneMassKg} kg ({r.bonePct}%)</strong>
              </p>
            </div>
          </div>
        );
      })()}

      <PdfReport />

      <SuccessModal isOpen={showSuccessModal} onClose={() => { setShowSuccessModal(false); if (onComplete) onComplete(); }} title="¡Evaluación Guardada!" message="La evaluación antropométrica ha sido registrada exitosamente." />
    </div>
  );
}
