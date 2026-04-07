import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../context/CompanyContext';
import { useToast } from '../context/ToastContext';
import CustomSelect from './ui/CustomSelect';

// -- ICONS --
const CheckCircle = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const Sparkles = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.9 5.5l.8 2.2a2.3 2.3 0 0 0 1.6 1.6l2.2.8-2.2.8a2.3 2.3 0 0 0-1.6 1.6l-.8 2.2-.8-2.2a2.3 2.3 0 0 0-1.6-1.6l-2.2-.8 2.2-.8a2.3 2.3 0 0 0 1.6-1.6l.8-2.2zM20 12l-.5 1.4a1.8 1.8 0 0 0-1.2 1.2l-1.4.5 1.4.5a1.8 1.8 0 0 0 1.2 1.2l.5 1.4.5-1.4a1.8 1.8 0 0 0 1.2-1.2l1.4-.5-1.4-.5a1.8 1.8 0 0 0-1.2-1.2L20 12zM5.5 2L5 3.4a1.8 1.8 0 0 0-1.2 1.2L2.4 5.1l1.4.5A1.8 1.8 0 0 0 5 6.8L5.5 8.2l.5-1.4A1.8 1.8 0 0 0 7.2 5.6l1.4-.5-1.4-.5a1.8 1.8 0 0 0-1.2-1.2L5.5 2z"/></svg>;
const Printer = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>;
const RotateCcw = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>;
const Info = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
const ArrowRight = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
const Pencil = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const SaveIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;

// -- CALCULATIONS --
// ── Factores de Actividad (Harris-Benedict estándar) usados para normopeso/bajo peso ──
const ACTIVITY_FACTORS_HB: Record<string, { factor: number; label: string }> = {
  'Sedentario':    { factor: 1.2,   label: 'TMB × 1.2' },
  'Ligera':        { factor: 1.375, label: 'TMB × 1.375' },
  'Moderada':      { factor: 1.55,  label: 'TMB × 1.55' },
  'Intensa':       { factor: 1.725, label: 'TMB × 1.725' },
  'Muy Intensa':   { factor: 1.9,   label: 'TMB × 1.9' },
};

// ── Factores de Actividad del Excel (por sexo) — sólo para mostrar el GMT ──
const ACTIVITY_FACTORS_GMT_M: Record<string, { factor: number; label: string }> = {
  'Sedentario':    { factor: 1.3,   label: 'GMR × 1.3 (muy leve)' },
  'Ligera':        { factor: 1.6,   label: 'GMR × 1.6 (leve H)' },
  'Moderada':      { factor: 1.7,   label: 'GMR × 1.7 (mod H)' },
  'Intensa':       { factor: 2.1,   label: 'GMR × 2.1 (intensa H)' },
  'Muy Intensa':   { factor: 2.1,   label: 'GMR × 2.1 (intensa H)' },
};
const ACTIVITY_FACTORS_GMT_F: Record<string, { factor: number; label: string }> = {
  'Sedentario':    { factor: 1.3,   label: 'GMR × 1.3 (muy leve)' },
  'Ligera':        { factor: 1.5,   label: 'GMR × 1.5 (leve M)' },
  'Moderada':      { factor: 1.6,   label: 'GMR × 1.6 (mod M)' },
  'Intensa':       { factor: 1.9,   label: 'GMR × 1.9 (intensa M)' },
  'Muy Intensa':   { factor: 1.9,   label: 'GMR × 1.9 (intensa M)' },
};

function calculateMetrics(weight: number, height: number, age: number, sex: string, activityLevel: string) {
  // ── Peso Ideal — fórmula del Excel ──
  // Hombre: =47.7 + (altura - 150) × 2.72 / 2.5
  // Mujer:  =45.5 + (altura - 150) × 2.27 / 2.5
  const idealWeight = sex === 'Masculino'
    ? 47.7 + (height - 150) * 2.72 / 2.5
    : 45.5 + (height - 150) * 2.27 / 2.5;

  const bmi = weight / Math.pow(height / 100, 2);
  let bmiCategory = '';

  // ── GMR (Harris-Benedict exacto del Excel) ──
  // Hombre: =66 + 13.7*peso + 5*talla - 6.8*edad
  // Mujer:  =655 + 9.7*peso + 1.8*talla - 4.7*edad
  const gmr = sex === 'Masculino'
    ? 66 + 13.7 * weight + 5 * height - 6.8 * age
    : 655 + 9.7 * weight + 1.8 * height - 4.7 * age;

  // GMT (para mostrar informativo, con FA del Excel por sexo)
  const gmtTable = sex === 'Masculino' ? ACTIVITY_FACTORS_GMT_M : ACTIVITY_FACTORS_GMT_F;
  const gmtFa = gmtTable[activityLevel] ?? gmtTable['Sedentario'];
  const gmt = gmr * gmtFa.factor;

  // ── PIC (Peso Ideal Corregido) ──
  // PIC = Peso Ideal + 0.25 × (Peso Real − Peso Ideal)
  const pic = idealWeight + 0.25 * (weight - idealWeight);

  // ── Calorías objetivo (VCT) ──
  // Factores HB estándar para normopeso
  const hbFa = ACTIVITY_FACTORS_HB[activityLevel] ?? ACTIVITY_FACTORS_HB['Sedentario'];
  let calories = 0;
  let calculationMethod = '';

  if (bmi >= 25) {
    // Sobrepeso / Obesidad → Knox: PIC × 22
    bmiCategory = 'Sobrepeso / Obesidad';
    calories = pic * 22;
    calculationMethod = `Knox: PIC (${pic.toFixed(1)} kg) × 22 kcal`;
  } else if (bmi < 18.5) {
    // Bajo peso → densidad calórica: Harris-Benedict × FA + 10%
    bmiCategory = 'Bajo Peso';
    calories = gmr * hbFa.factor * 1.1;
    calculationMethod = `Harris-Benedict × ${hbFa.label} + 10% (bajo peso)`;
  } else {
    // Normopeso / Deportista → Harris-Benedict × FA
    bmiCategory = 'Normopeso';
    calories = gmr * hbFa.factor;
    calculationMethod = `Harris-Benedict × ${hbFa.label}`;
  }

  // ── Proteínas ──
  const isAthlete = activityLevel === 'Intensa' || activityLevel === 'Muy Intensa';
  const proteinGPerKg = isAthlete ? 1.8 : 1.3;
  // Para sobrepeso usamos PIC como referencia de peso proteico
  const refWeight = bmi >= 25 ? pic : weight;
  const proteinGrams = Math.round(proteinGPerKg * refWeight);

  // ── Distribución de macros (porcentajes fijos según indicación de Rosana) ──
  // Normal:    55% CHO / 15% PRO / 30% GRASAS
  // Deportista: 55% CHO / 17% PRO / 28% GRASAS
  const macros = isAthlete
    ? { carbs: 55, protein: 17, fats: 28 }
    : { carbs: 55, protein: 15, fats: 30 };

  return {
    idealWeight:         parseFloat(idealWeight.toFixed(3)),
    pic:                 parseFloat(pic.toFixed(3)),
    gmr:                 parseFloat(gmr.toFixed(1)),
    gmt:                 parseFloat(gmt.toFixed(2)),
    bmi:                 parseFloat(bmi.toFixed(2)),
    bmiCategory,
    proteinGPerKg,
    proteinGrams,
    calories:            Math.round(calories),
    calculationMethod,
    macros
  };
}

const INTOLERANCES_LIST = [
  'Lactosa',
  'Gluten (Celíaco / Sin TACC)',
  'Colon Irritable',
  'Enfermedad Diverticular',
  'SiBO',
];


export default function MealPlanGenerator() {
  const { selectedCompany, getCompanyType } = useCompany();
  const { showToast } = useToast();

  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientData, setPatientData] = useState<any>(null);
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [reportCompanyName, setReportCompanyName] = useState(selectedCompany);
  
  const [preferences, setPreferences] = useState({
    dietType: 'Normal',
    intolerances: [] as string[],
    activityLevel: 'Sedentario',
    objectives: '',
    foodRestrictions: ''
  });

  function toggleIntolerance(intolerance: string) {
    setPreferences(prev => ({
      ...prev,
      intolerances: prev.intolerances.includes(intolerance)
        ? prev.intolerances.filter(i => i !== intolerance)
        : [...prev.intolerances, intolerance]
    }));
  }
  
  const [loading, setLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  // editedPlan is always the working copy; sections independently toggle editing
  const [editedPlan, setEditedPlan] = useState<any>(null);
  const [editingSections, setEditingSections] = useState<Record<string, boolean>>({});

  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPatients();
    setReportCompanyName(selectedCompany);
  }, [selectedCompany]);

  async function fetchPatients() {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, birth_date, sex, initial_weight, height')
        .eq('company', selectedCompany)
        .order('last_name', { ascending: true });
      if (error) throw error;
      setPatients(data || []);
    } catch (err) {
      console.error(err);
    }
  }

  // When patient changes, fetch latest data to calculate metrics
  useEffect(() => {
    let cancelled = false;

    if (!selectedPatientId) {
      setPatientData(null);
      setMetrics(null);
      return () => { cancelled = true; };
    }
    const loadPatientDetails = async () => {
      setLoadingPatient(true);
      try {
        const p = patients.find(x => x.id === selectedPatientId);
        if (!p || cancelled) return;

        let age = 30;
        if (p.birth_date) {
            const today = new Date(), dob = new Date(p.birth_date);
            age = today.getFullYear() - dob.getFullYear();
        }

        // Get latest weight and height from sessions (either Antropometría or Consulta)
        const { data: sessionData } = await supabase
          .from('sessions')
          .select('weight, height')
          .eq('patient_id', p.id)
          .not('weight', 'is', null)
          .not('height', 'is', null)
          .order('session_date', { ascending: false })
          .limit(1);

        if (cancelled) return;

        const weight = sessionData?.[0]?.weight || p.initial_weight || 70;
        const height = sessionData?.[0]?.height || p.height || 165;

        const dataForGen = {
          firstName: p.first_name,
          lastName: p.last_name,
          age,
          sex: p.sex || 'Masculino',
          weight,
          height
        };

        setPatientData(dataForGen);
        updateMetrics(dataForGen, preferences.activityLevel);

      } catch (e) {
        if (!cancelled) console.error(e);
      } finally {
        if (!cancelled) setLoadingPatient(false);
      }
    };
    loadPatientDetails();
    return () => { cancelled = true; };
  }, [selectedPatientId, patients]);

  // Update metrics when activity level changes
  useEffect(() => {
    if (patientData) {
      updateMetrics(patientData, preferences.activityLevel);
    }
  }, [preferences.activityLevel, patientData]);

  function updateMetrics(data: any, activity: string) {
    const calc = calculateMetrics(data.weight, data.height, data.age, data.sex, activity);
    setMetrics(calc);
  }

  async function generatePlan() {
    if (!patientData || !metrics) {
      showToast('Faltan datos del paciente para generar el plan.', 'error');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientInfo: patientData,
          metrics,
          preferences
        })
      });

      if (!response.ok) {
        throw new Error('Error en la generación del servidor');
      }

      const planJson = await response.json();
      // Override hydration (deterministic 35ml/kg)
      const targetLiters = parseFloat((patientData.weight * 35 / 1000).toFixed(1));
      planJson.hydrationPlan.targetLiters = targetLiters;
      planJson.hydrationPlan.equivalentGlasses = Math.round(targetLiters * 1000 / 250);
      // Override macros so the plan always matches the pre-generation summary
      planJson.healthyPlate = {
        proteinsPct: metrics.macros.protein,
        carbsPct:    metrics.macros.carbs,
        fatsPct:     metrics.macros.fats,
      };
      setGeneratedPlan(planJson);
      setEditedPlan(JSON.parse(JSON.stringify(planJson)));
      setEditingSections({});
      showToast('¡Plan generado con éxito!', 'success');
      
      setTimeout(() => {
        window.scrollTo({ top: document.getElementById('generated-plan-view')?.offsetTop || 0, behavior: 'smooth' });
      }, 100);
      
    } catch (err: any) {
      console.error(err);
      showToast('Ocurrió un error al generar el plan.', 'error');
    } finally {
      setLoading(false);
    }
  }

  function downloadPDF() {
    const originalTitle = document.title;
    document.title = `Plan Nutricional - ${patientData.firstName} ${patientData.lastName}`;

    // Unlock flex/h-screen containers so all pages are captured
    const unlocked: { el: HTMLElement; overflow: string; height: string; maxHeight: string; flex: string }[] = [];
    document.querySelectorAll<HTMLElement>('body > div, body > div > div, body > div > div > div, main').forEach(el => {
      const s = el.style;
      unlocked.push({ el, overflow: s.overflow, height: s.height, maxHeight: s.maxHeight, flex: s.flex });
      s.overflow = 'visible';
      s.height = 'auto';
      s.maxHeight = 'none';
      s.flex = 'none';
    });

    // Constrain the plan view to A4 width (794px) so nothing overflows the right margin
    const planEl = document.getElementById('generated-plan-view');
    const prevMaxW = planEl ? planEl.style.maxWidth : '';
    const prevW    = planEl ? planEl.style.width    : '';
    if (planEl) {
      planEl.style.maxWidth = '794px';
      planEl.style.width    = '794px';
    }

    window.print();

    const restore = () => {
      document.title = originalTitle;
      unlocked.forEach(({ el, overflow, height, maxHeight, flex }) => {
        el.style.overflow = overflow;
        el.style.height   = height;
        el.style.maxHeight = maxHeight;
        el.style.flex     = flex;
      });
      if (planEl) {
        planEl.style.maxWidth = prevMaxW;
        planEl.style.width    = prevW;
      }
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    setTimeout(restore, 3000);
  }

  function updateMealItem(mealIdx: number, itemIdx: number, value: string) {
    setEditedPlan((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev));
      next.dailyPlan[mealIdx].items[itemIdx] = value;
      return next;
    });
  }

  function updateMealTip(mealIdx: number, value: string) {
    setEditedPlan((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev));
      next.dailyPlan[mealIdx].tip = value;
      return next;
    });
  }

  function updateMealTitle(mealIdx: number, value: string) {
    setEditedPlan((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev));
      next.dailyPlan[mealIdx].title = value;
      return next;
    });
  }

  function addMealItem(mealIdx: number) {
    setEditedPlan((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev));
      next.dailyPlan[mealIdx].items.push('');
      return next;
    });
  }

  function removeMealItem(mealIdx: number, itemIdx: number) {
    setEditedPlan((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev));
      next.dailyPlan[mealIdx].items.splice(itemIdx, 1);
      return next;
    });
  }

  function saveEdits() {
    setGeneratedPlan(JSON.parse(JSON.stringify(editedPlan)));
    setEditingSections({});
  }

  function toggleSection(section: string) {
    setEditingSections(prev => ({ ...prev, [section]: !prev[section] }));
  }

  const anyEditing = Object.values(editingSections).some(Boolean);

  // Generic deep mutator for editedPlan
  function mut(updater: (plan: any) => void) {
    setEditedPlan((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev));
      updater(next);
      return next;
    });
  }

  function handleReset() {
    setGeneratedPlan(null);
    setEditedPlan(null);
    setEditingSections({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }


  const veggieEmojiMap: Record<string, string> = {
    tomate: '🍅', zanahoria: '🥕', brócoli: '🥦', brocoli: '🥦', espinaca: '🥬', lechuga: '🥬',
    pepino: '🥒', cebolla: '🧅', ajo: '🧄', pimiento: '🫑', berenjena: '🍆', zapallo: '🎃',
    zucchini: '🥒', apio: '🌿', remolacha: '🫚', papa: '🥔', batata: '🍠', boniato: '🍠',
    choclo: '🌽', maíz: '🌽', arveja: '🫛', poroto: '🫘', lenteja: '🫘', garbanzo: '🫘',
    repollo: '🥬', coliflor: '🥦', acelga: '🥬', hinojo: '🌿', rúcula: '🥬',
    puerro: '🥬', nabo: '🫚', alcaucil: '🌿', chaucha: '🫛',
  };
  function getVeggieEmoji(name: string): string {
    const lower = name.toLowerCase();
    for (const [key, emoji] of Object.entries(veggieEmojiMap)) {
      if (lower.includes(key)) return emoji;
    }
    return '🥦';
  }

  const PieChart = ({ pP, pC, pF }: { pP: number, pC: number, pF: number }) => {
    const size = 200;
    const cx = size/2, cy = size/2, r = size/2 - 15;
    const slices = [
      { pct: pP/100, color: 'url(#grad-p)', label: 'PROTEÍNAS' },
      { pct: pC/100, color: 'url(#grad-C)', label: 'CARBOHIDRATOS' },
      { pct: pF/100, color: 'url(#grad-f)', label: 'GRASAS' }
    ];
    let cum = -Math.PI / 2;
    return (
      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="filter overflow-visible">
          <defs>
            <linearGradient id="grad-p" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#60a5fa"/><stop offset="100%" stopColor="#2563eb"/></linearGradient>
            <linearGradient id="grad-C" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#d97706"/></linearGradient>
            <linearGradient id="grad-f" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#c084fc"/><stop offset="100%" stopColor="#9333ea"/></linearGradient>
            <filter id="pie-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000000" floodOpacity="0.15" />
              <feDropShadow dx="-2" dy="-2" stdDeviation="3" floodColor="#ffffff" floodOpacity="0.5" />
            </filter>
          </defs>
          <g filter="url(#pie-shadow)">
            {slices.map((s, i) => {
              if (s.pct === 0) return null;
              const start = cum, end = cum + s.pct * 2 * Math.PI; cum = end;
              const x1 = cx + r*Math.cos(start), y1 = cy + r*Math.sin(start);
              const x2 = cx + r*Math.cos(end), y2 = cy + r*Math.sin(end);
              const largeArc = s.pct > 0.5 ? 1 : 0;
              return <path key={i} d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`} fill={s.color} stroke="#ffffff" strokeWidth="2.5" />;
            })}
          </g>
        </svg>
      </div>
    );
  };

  const inputCls = "w-full p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all";
  const labelCls = "block text-[0.85rem] font-semibold uppercase tracking-widest mb-1.5";

  return (
    <div className="animate-in" style={{ animationDelay: '0.2s' }}>
      {!generatedPlan ? (
        <div className="max-w-4xl mx-auto">
          <div className="bg-surface border-2 border-border-color rounded-xl p-6 md:p-8 shadow-sm">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
                <Sparkles />
              </div>
              <h1 className="text-3xl font-black text-primary uppercase tracking-tight">Generador de Planes</h1>
              <p className="text-text-muted mt-2">Configura los parámetros del paciente y genera un plan alimentario personalizado en segundos.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Form Section */}
              <div className="space-y-6">
                <div>
                  <label className={labelCls}>1. PACIENTE</label>
                  <CustomSelect
                    value={selectedPatientId}
                    onChange={setSelectedPatientId}
                    placeholder="Selecciona un paciente..."
                    options={patients.map(p => ({ value: p.id, label: `${p.last_name}, ${p.first_name}` }))}
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    Empresa para el informe
                    {getCompanyType(selectedCompany) === 'feria' && (
                      <span className="ml-2 text-[10px] font-normal normal-case text-primary/70 tracking-normal">
                        (feria — podés editarlo)
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={reportCompanyName}
                    onChange={e => setReportCompanyName(e.target.value)}
                    className={inputCls}
                    placeholder="Nombre de empresa para el informe..."
                  />
                </div>

                {patientData && (
                  <>
                    <div>
                      <label className={labelCls}>2. TIPO DE ALIMENTACIÓN</label>
                      <CustomSelect
                        value={preferences.dietType}
                        onChange={v => setPreferences({...preferences, dietType: v})}
                        options={[
                          {value:'Normal', label:'Normal (Omnívora)'},
                          {value:'Vegetariana', label:'Vegetariana'},
                          {value:'Vegana', label:'Vegana'},
                          {value:'Pesco-vegetariana', label:'Pesco-vegetariana'},
                        ]}
                      />
                    </div>

                    <div>
                      <label className={labelCls}>3. INTOLERANCIAS / PATOLOGÍAS</label>
                      <div className="grid grid-cols-1 gap-2 mt-1">
                        {INTOLERANCES_LIST.map(intol => (
                          <label key={intol} className="flex items-center gap-3 p-2.5 rounded-lg border-2 border-border-color bg-bg cursor-pointer hover:border-primary/40 transition-colors">
                            <input
                              type="checkbox"
                              checked={preferences.intolerances.includes(intol)}
                              onChange={() => toggleIntolerance(intol)}
                              className="w-4 h-4 rounded accent-primary cursor-pointer"
                            />
                            <span className="text-sm font-medium text-text-main">{intol}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className={labelCls}>4. NIVEL DE ACTIVIDAD FÍSICA</label>
                      <CustomSelect
                        value={preferences.activityLevel}
                        onChange={v => setPreferences({...preferences, activityLevel: v})}
                        options={[
                          {value:'Sedentario', label:'Sedentario — poco o ningún ejercicio'},
                          {value:'Ligera', label:'Ligera — 1 a 3 días por semana'},
                          {value:'Moderada', label:'Moderada — 3 a 5 días por semana'},
                          {value:'Intensa', label:'Intensa — 6 a 7 días por semana'},
                          {value:'Muy Intensa', label:'Muy Intensa — entrenamiento doble o trabajo físico'},
                        ]}
                      />
                    </div>

                    <div>
                      <label className={labelCls}>5. ALIMENTOS QUE NO PUEDE CONSUMIR (Opcional)</label>
                      <textarea
                        className={inputCls}
                        placeholder="Ej: mariscos, nueces, lácteos, huevo..."
                        rows={2}
                        value={preferences.foodRestrictions}
                        onChange={e => setPreferences({...preferences, foodRestrictions: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className={labelCls}>6. OBJETIVOS ESPECÍFICOS (Opcional)</label>
                      <textarea
                        className={inputCls}
                        placeholder="Ej: Bajar índice glucémico, reducir inflamación intestinal..."
                        rows={3}
                        value={preferences.objectives}
                        onChange={e => setPreferences({...preferences, objectives: e.target.value})}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Summary Section */}
              <div>
                <div className="bg-bg border border-border-color rounded-xl p-5 h-full">
                  <h3 className="text-sm font-bold uppercase tracking-widest mb-4 border-b border-border-color pb-2">Resumen de Cálculos</h3>
                  
                  {!selectedPatientId ? (
                    <div className="flex flex-col items-center justify-center h-48 text-text-muted text-sm text-center px-4">
                      <Info />
                      <span className="mt-2">Selecciona un paciente para calcular sus requerimientos nutricionales automáticamente.</span>
                    </div>
                  ) : loadingPatient ? (
                    <div className="flex items-center justify-center h-48">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                    </div>
                  ) : metrics ? (
                    <div className="space-y-3 text-sm">
                      <div className="bg-white p-3 rounded-lg border border-border-color flex justify-between items-center">
                        <span className="text-text-muted">Biometría</span>
                        <span className="font-bold">{patientData.weight}kg · {patientData.height}cm · IMC {metrics.bmi}</span>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-border-color flex justify-between items-center">
                        <span className="text-text-muted">Categoría IMC</span>
                        <span className={`font-bold text-xs px-2 py-1 rounded-full ${metrics.bmiCategory === 'Normopeso' ? 'bg-green-100 text-green-700' : metrics.bmiCategory === 'Bajo Peso' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{metrics.bmiCategory}</span>
                      </div>

                      {/* Peso Ideal y PIC */}
                      <div className="bg-white p-3 rounded-lg border border-border-color">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-text-muted text-xs">Peso Ideal (Hamwi)</span>
                          <span className="font-bold text-sm">{metrics.idealWeight} kg</span>
                        </div>
                        {metrics.bmiCategory !== 'Normopeso' && metrics.bmiCategory !== 'Bajo Peso' && (
                          <div className="flex justify-between items-center pt-1 border-t border-border-color mt-1">
                            <span className="text-xs font-semibold text-orange-600">PIC (Peso Ideal Corregido)</span>
                            <span className="font-bold text-sm text-orange-600">{metrics.pic} kg</span>
                          </div>
                        )}
                      </div>

                      {/* GMR y GMT */}
                      <div className="bg-white p-3 rounded-lg border border-border-color">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-text-muted text-xs">GMR (Reposo / Harris-Benedict)</span>
                          <span className="font-bold text-sm">{metrics.gmr} kcal</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-border-color mt-1">
                          <span className="text-text-muted text-xs">GMT (Total × FA actividad)</span>
                          <span className="font-bold text-sm">{metrics.gmt} kcal</span>
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-border-color">
                        <span className="text-text-muted block text-xs mb-1">Fórmula utilizada</span>
                        <span className="font-bold text-accent-dark text-xs">{metrics.calculationMethod}</span>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-border-color flex justify-between items-center">
                        <span className="text-text-muted">Valor Calórico Objetivo (VCT)</span>
                        <span className="font-bold text-lg text-primary">{metrics.calories} kcal/día</span>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-border-color flex justify-between items-center">
                        <span className="text-text-muted">Proteínas ({metrics.proteinGPerKg} g/kg)</span>
                        <span className="font-bold text-[#2563eb]">{metrics.proteinGrams} g/día</span>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-border-color">
                        <span className="text-text-muted block mb-2">Distribución de Macros</span>
                        <div className="flex gap-1 h-3 rounded-full overflow-hidden mb-2">
                          <div style={{width:`${metrics.macros.carbs}%`}} className="bg-[#facc15]" title="Carbohidratos"></div>
                          <div style={{width:`${metrics.macros.protein}%`}} className="bg-[#fb923c]" title="Proteínas"></div>
                          <div style={{width:`${metrics.macros.fats}%`}} className="bg-[#f43f5e]" title="Grasas"></div>
                        </div>
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-[#eab308] border-b-2 border-[#facc15] pb-0.5">CHO {metrics.macros.carbs}%</span>
                          <span className="text-[#ea580c] border-b-2 border-[#fb923c] pb-0.5">PRO {metrics.macros.protein}%</span>
                          <span className="text-[#e11d48] border-b-2 border-[#f43f5e] pb-0.5">GRASAS {metrics.macros.fats}%</span>
                        </div>
                      </div>

                      {preferences.intolerances.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                          <span className="text-amber-700 text-xs font-bold block mb-1.5">Intolerancias activas:</span>
                          <div className="flex flex-wrap gap-1">
                            {preferences.intolerances.map(i => (
                              <span key={i} className="text-[10px] bg-amber-100 border border-amber-300 text-amber-800 px-2 py-0.5 rounded-full font-medium">{i}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-8 border-t-2 border-border-color pt-6 text-center">
              <button 
                onClick={generatePlan}
                disabled={loading || !metrics}
                className="w-full md:w-auto inline-flex items-center justify-center gap-3 bg-gradient-to-br from-primary to-primary-light text-white px-10 py-4 rounded-xl font-bold text-lg hover:-translate-y-1 hover:shadow-xl transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    Generar Plan Alimentario <ArrowRight />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        // ================== GENERATED PLAN VIEW ==================
        <div id="generated-plan-view" className="max-w-[1000px] mx-auto fade-in">
          
          <div className="bg-primary text-white p-6 rounded-t-2xl flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <div className="text-xs font-bold tracking-[3px] text-white/70">PLAN ALIMENTARIO PERSONALIZADO</div>
              <h2 className="text-3xl font-black mt-1">
                {patientData.firstName} {patientData.lastName}
              </h2>
              <div className="text-sm mt-1 text-white/90">
                Índice de Bienestar Nutricional NuPlan · {reportCompanyName.toUpperCase()}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 print:hidden">
              <button 
                onClick={downloadPDF} 
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg px-4 py-2 font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer relative z-10 shadow-sm"
              >
                <Printer /> 
                Descargar PDF
              </button>
              <button onClick={handleReset} className="bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg px-4 py-2 font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer relative z-10 shadow-sm">
                <RotateCcw /> Volver a Empezar
              </button>
            </div>
          </div>

          <div ref={pdfRef} className="bg-bg print:pt-10">
            <div className="p-6 md:p-8 print:p-0 space-y-6">

              {/* ── HELPER: inline edit/save button ── */}
              {/* Used in each section header */}

              {/* 1. OBJETIVO DEL PLAN */}
              {(editedPlan || generatedPlan).planObjective != null && (() => {
                const sec = 'objective';
                const isE = !!editingSections[sec];
                const dp  = editedPlan || generatedPlan;
                return (
                  <div className={`border-2 rounded-2xl p-5 shadow-sm ${isE ? 'bg-amber-50 border-amber-400' : 'bg-[#f0fdf4] border-[#86efac]'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl shrink-0">🎯</div>
                        <div className="text-xs font-bold uppercase tracking-widest text-[#166534]">Objetivo del Plan</div>
                      </div>
                      <button onClick={() => toggleSection(sec)} className={`print:hidden flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${isE ? 'bg-green-500 text-white border-green-400 hover:bg-green-600' : 'bg-white/60 text-[#166534] border-[#86efac] hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300'}`}>
                        {isE ? <><SaveIcon /> Guardar</> : <><Pencil /> Editar</>}
                      </button>
                    </div>
                    {isE
                      ? <textarea className="w-full border border-amber-300 bg-white rounded-lg p-3 text-[#14532d] text-sm font-semibold focus:outline-none focus:border-amber-500 resize-none" rows={3} value={dp.planObjective} onChange={e => mut(p => { p.planObjective = e.target.value; })} />
                      : <p className="text-[#14532d] font-semibold text-base">{dp.planObjective}</p>
                    }
                  </div>
                );
              })()}

              {/* 2. LISTA DE COMPRAS */}
              {(() => {
                const sec = 'shoppingList';
                const isE = !!editingSections[sec];
                const dp  = editedPlan || generatedPlan;
                const cats = [
                  { key: 'carbsAndLegumes',     label: 'Carbohidratos',    color: 'text-[#d97706]', border: 'border-[#fde68a]', bg: 'bg-[#fffbeb]', icon: '🍞' },
                  { key: 'proteins',            label: 'Proteínas',        color: 'text-[#2563eb]', border: 'border-[#bfdbfe]', bg: 'bg-[#eff6ff]', icon: '🥩' },
                  { key: 'vegetablesAndFruits', label: 'Verduras y Frutas',color: 'text-[#059669]', border: 'border-[#a7f3d0]', bg: 'bg-[#ecfdf5]', icon: '🥦' },
                  { key: 'fatsAndDairy',        label: 'Grasas Saludables',color: 'text-[#7c3aed]', border: 'border-[#ddd6fe]', bg: 'bg-[#f5f3ff]', icon: '🥑' },
                  { key: 'canned',              label: 'Enlatados',        color: 'text-[#0891b2]', border: 'border-[#a5f3fc]', bg: 'bg-[#ecfeff]', icon: '🥫' },
                  { key: 'frozen',              label: 'Congelados',       color: 'text-[#6366f1]', border: 'border-[#c7d2fe]', bg: 'bg-[#eef2ff]', icon: '❄️' },
                ];
                return (
                  <div className={`bg-white border-2 rounded-2xl p-6 shadow-sm break-inside-avoid ${isE ? 'border-amber-400 ring-2 ring-amber-200' : 'border-border-color'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg uppercase tracking-widest text-[#2c3e50]">Lista de Compras</h3>
                      <button onClick={() => toggleSection(sec)} className={`print:hidden flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${isE ? 'bg-green-500 text-white border-green-400 hover:bg-green-600' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300'}`}>
                        {isE ? <><SaveIcon /> Guardar sección</> : <><Pencil /> Editar</>}
                      </button>
                    </div>
                    {!isE && <p className="text-center text-xs text-text-muted mb-5">Llevar una alimentación saludable empieza por tener estos alimentos en casa</p>}
                    <div className="grid grid-cols-2 md:grid-cols-3 print:grid-cols-2 gap-4 mt-4">
                      {cats.map(({ key, label, color, border, bg, icon }) => {
                        const items: string[] = dp.shoppingList?.[key] || [];
                        if (!isE && !items.length) return null;
                        return (
                          <div key={key} className={`${bg} border ${isE ? 'border-amber-200' : border} rounded-xl p-3`}>
                            <h4 className={`text-[11px] font-bold ${color} uppercase mb-2 flex items-center gap-1`}>{icon} {label}</h4>
                            {isE ? (
                              <div className="space-y-1">
                                {items.map((t, idx) => (
                                  <div key={idx} className="flex gap-1">
                                    <input className="flex-1 text-[11px] border border-amber-200 bg-white rounded px-1.5 py-1 focus:outline-none" value={t} onChange={e => mut(p => { p.shoppingList[key][idx] = e.target.value; })} />
                                    <button onClick={() => mut(p => { p.shoppingList[key].splice(idx,1); })} className="text-red-400 hover:text-red-600 text-base leading-none px-1">×</button>
                                  </div>
                                ))}
                                <button onClick={() => mut(p => { p.shoppingList[key].push(''); })} className="text-[10px] text-amber-600 border border-amber-300 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-full mt-1">+ Agregar</button>
                              </div>
                            ) : (
                              <ul className="text-[10px] text-gray-700 space-y-1">
                                {items.map((t) => <li key={t} className="flex items-start gap-1"><span className="shrink-0">✓</span>{t}</li>)}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* 3. GRUPOS DE ALIMENTOS */}
              {(editedPlan || generatedPlan).foodGroupsDetail && (() => {
                const sec = 'foodGroups';
                const isE = !!editingSections[sec];
                const dp  = editedPlan || generatedPlan;
                const groups = [
                  { key: 'carbs',    label: 'Carbohidratos',    icon: '🍞', bg: 'bg-[#fffbeb]', border: 'border-[#fde68a]', color: 'text-[#92400e]' },
                  { key: 'proteins', label: 'Proteínas',         icon: '🥩', bg: 'bg-[#eff6ff]', border: 'border-[#bfdbfe]', color: 'text-[#1e40af]' },
                  { key: 'fats',     label: 'Grasas Saludables', icon: '🥑', bg: 'bg-[#f5f3ff]', border: 'border-[#ddd6fe]', color: 'text-[#4c1d95]' },
                ];
                return (
                  <div className={`bg-white border-2 rounded-2xl p-6 shadow-sm break-inside-avoid ${isE ? 'border-amber-400 ring-2 ring-amber-200' : 'border-border-color'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg uppercase tracking-widest text-[#2c3e50]">Grupos de Alimentos</h3>
                      <button onClick={() => toggleSection(sec)} className={`print:hidden flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${isE ? 'bg-green-500 text-white border-green-400 hover:bg-green-600' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300'}`}>
                        {isE ? <><SaveIcon /> Guardar sección</> : <><Pencil /> Editar</>}
                      </button>
                    </div>
                    {!isE && <p className="text-center text-xs text-text-muted mb-5">Porciones recomendadas para tu requerimiento diario</p>}
                    <div className="grid grid-cols-1 md:grid-cols-3 print:grid-cols-2 gap-4 mt-4">
                      {groups.map(({ key, label, icon, bg, border, color }) => {
                        const items: string[] = dp.foodGroupsDetail?.[key] || [];
                        return (
                          <div key={key} className={`${bg} border ${isE ? 'border-amber-200' : border} rounded-xl p-4`}>
                            <h4 className={`text-sm font-bold ${color} mb-3 flex items-center gap-2`}>{icon} {label}</h4>
                            {isE ? (
                              <div className="space-y-1">
                                {items.map((item, idx) => (
                                  <div key={idx} className="flex gap-1">
                                    <input className="flex-1 text-[12px] border border-amber-200 bg-white rounded px-2 py-1 focus:outline-none" value={item} onChange={e => mut(p => { p.foodGroupsDetail[key][idx] = e.target.value; })} />
                                    <button onClick={() => mut(p => { p.foodGroupsDetail[key].splice(idx,1); })} className="text-red-400 hover:text-red-600 text-base leading-none px-1">×</button>
                                  </div>
                                ))}
                                <button onClick={() => mut(p => { p.foodGroupsDetail[key].push(''); })} className="text-[10px] text-amber-600 border border-amber-300 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-full mt-1">+ Agregar</button>
                              </div>
                            ) : (
                              <ul className="space-y-2">
                                {items.map((item, i) => <li key={i} className="text-[12px] text-gray-700 flex items-start gap-2"><span className="text-gray-400 shrink-0 mt-0.5">•</span><span>{item}</span></li>)}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* 4. PLAN DIARIO — already done above */}
              {(() => {
                const sec = 'dailyPlan';
                const isEditing = !!editingSections[sec];
                const plan = editedPlan || generatedPlan;
                return (
                  <div className={`bg-white border-2 rounded-2xl p-6 shadow-sm ${isEditing ? 'border-amber-400 ring-2 ring-amber-200' : 'border-border-color'}`}>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-lg uppercase tracking-widest text-[#2c3e50]">Esquema Alimentario Diario</h3>
                      <button onClick={() => toggleSection(sec)} className={`print:hidden flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${isEditing ? 'bg-green-500 text-white border-green-400 hover:bg-green-600' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300'}`}>
                        {isEditing ? <><SaveIcon /> Guardar sección</> : <><Pencil /> Editar</>}
                      </button>
                    </div>
                    <div className="space-y-4">
                      {plan.dailyPlan.map((meal: any, i: number) => (
                        <div key={i} className={`flex gap-4 p-4 rounded-xl border bg-gray-50/50 ${isEditing ? 'border-amber-200' : 'border-gray-100'}`}>
                          <div className="w-16 shrink-0 text-center border-r border-gray-200 pr-4">
                            <div className="font-black text-gray-800 text-lg">{meal.time}</div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-wide font-bold">{meal.type}</div>
                          </div>
                          <div className="flex-1">
                            {isEditing
                              ? <input className="font-bold text-[#0A4D3C] text-[15px] mb-2 w-full border-b-2 border-amber-300 bg-amber-50 px-2 py-1 rounded focus:outline-none" value={meal.title} onChange={e => updateMealTitle(i, e.target.value)} />
                              : <h4 className="font-bold text-[#0A4D3C] text-[15px] mb-2">{meal.title}</h4>
                            }
                            <ul className="space-y-1 mb-3">
                              {meal.items.map((item: string, j: number) => (
                                <li key={j} className="text-[13px] text-gray-700 flex items-start gap-2">
                                  {isEditing ? (
                                    <>
                                      <span className="text-amber-400 mt-2">•</span>
                                      <input className="flex-1 border border-amber-200 bg-amber-50 rounded px-2 py-1 text-[13px] focus:outline-none" value={item} onChange={e => updateMealItem(i, j, e.target.value)} />
                                      <button onClick={() => removeMealItem(i, j)} className="text-red-400 hover:text-red-600 text-lg leading-none shrink-0 mt-1" title="Eliminar ítem">×</button>
                                    </>
                                  ) : (
                                    <><span className="text-primary mt-1">•</span><span>{item}</span></>
                                  )}
                                </li>
                              ))}
                            </ul>
                            {isEditing && <button onClick={() => addMealItem(i)} className="text-xs text-amber-600 border border-amber-300 bg-amber-50 hover:bg-amber-100 px-3 py-1 rounded-full mb-2 transition-colors">+ Agregar ítem</button>}
                            {isEditing
                              ? <div className="flex items-center gap-2"><span className="text-[11px] text-[#047857]">💡</span><input className="flex-1 text-[11px] border border-amber-200 bg-amber-50 rounded px-2 py-1 focus:outline-none" value={meal.tip || ''} placeholder="Consejo (opcional)" onChange={e => updateMealTip(i, e.target.value)} /></div>
                              : meal.tip ? <div className="inline-block bg-[#e0fcf2] text-[#047857] px-3 py-1 rounded-md text-[11px] font-medium border border-[#a7f3d0]">💡 {meal.tip}</div> : null
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* 5. IDEAS DE MENÚ */}
              {(editedPlan || generatedPlan).menuIdeas && (() => {
                const sec = 'menuIdeas';
                const isE = !!editingSections[sec];
                const dp  = editedPlan || generatedPlan;
                return (
                  <div className={`bg-white border-2 rounded-2xl p-6 shadow-sm break-inside-avoid ${isE ? 'border-amber-400 ring-2 ring-amber-200' : 'border-border-color'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg uppercase tracking-widest text-[#2c3e50]">Ideas de Menú</h3>
                      <button onClick={() => toggleSection(sec)} className={`print:hidden flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${isE ? 'bg-green-500 text-white border-green-400' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300'}`}>
                        {isE ? <><SaveIcon /> Guardar sección</> : <><Pencil /> Editar</>}
                      </button>
                    </div>
                    {!isE && <p className="text-center text-xs text-text-muted mb-5">Opciones para armar tus platos del día a día</p>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      {[
                        { listKey: 'carbsIdeas',   label: '🍞 Con Carbohidratos', color: 'text-[#d97706]', bg: 'bg-[#fffbeb]', border: 'border-[#fef3c7]' },
                        { listKey: 'proteinIdeas', label: '🥩 Con Proteínas',     color: 'text-[#2563eb]', bg: 'bg-[#eff6ff]', border: 'border-[#dbeafe]' },
                      ].map(({ listKey, label, color, bg, border }) => {
                        const ideas: string[] = dp.menuIdeas?.[listKey] || [];
                        return (
                          <div key={listKey}>
                            <h4 className={`text-xs font-bold ${color} uppercase tracking-widest mb-3 flex items-center gap-2`}>{label}</h4>
                            {isE ? (
                              <div className="space-y-1.5">
                                {ideas.map((idea, idx) => (
                                  <div key={idx} className="flex gap-1.5">
                                    <input className="flex-1 text-[13px] border border-amber-200 bg-amber-50 rounded px-2 py-1.5 focus:outline-none" value={idea} onChange={e => mut(p => { p.menuIdeas[listKey][idx] = e.target.value; })} />
                                    <button onClick={() => mut(p => { p.menuIdeas[listKey].splice(idx,1); })} className="text-red-400 hover:text-red-600 text-base leading-none px-1">×</button>
                                  </div>
                                ))}
                                <button onClick={() => mut(p => { p.menuIdeas[listKey].push(''); })} className="text-xs text-amber-600 border border-amber-300 bg-amber-50 hover:bg-amber-100 px-3 py-1 rounded-full">+ Agregar</button>
                              </div>
                            ) : (
                              <ul className="space-y-2">
                                {ideas.map((idea, i) => <li key={i} className={`text-[13px] text-gray-700 flex items-start gap-2 p-2 ${bg} rounded-lg border ${border}`}><span className={`${color} shrink-0`}>›</span>{idea}</li>)}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* 6. PLATO SALUDABLE / MACROS — no editable (es display del cálculo) */}
              <div className="bg-white border-2 border-border-color rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center gap-8 break-inside-avoid">
                <div className="shrink-0 flex flex-col items-center">
                  <div className="text-xs font-bold text-text-muted mb-2 tracking-widest uppercase">Plato Saludable</div>
                  <PieChart pP={(editedPlan||generatedPlan).healthyPlate.proteinsPct} pC={(editedPlan||generatedPlan).healthyPlate.carbsPct} pF={(editedPlan||generatedPlan).healthyPlate.fatsPct} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-3 uppercase tracking-widest text-[#2c3e50]">Distribución de Macronutrientes</h3>
                  <p className="text-sm text-text-muted leading-relaxed mb-4">
                    Tu plan se basa en <strong className="text-[#d97706]">carbohidratos de absorción lenta ({(editedPlan||generatedPlan).healthyPlate.carbsPct}%)</strong>,
                    con aporte proteico de <strong className="text-[#2563eb]">{(editedPlan||generatedPlan).healthyPlate.proteinsPct}%</strong> y
                    grasas saludables del <strong className="text-[#9333ea]">{(editedPlan||generatedPlan).healthyPlate.fatsPct}%</strong>.
                  </p>
                  <div className="grid grid-cols-3 gap-3 text-center text-sm font-bold">
                    <div className="bg-[#eff6ff] border border-[#dbeafe] rounded-xl p-3 text-[#2563eb]">🍗 Proteínas<br/><span className="text-2xl mt-1 block">{(editedPlan||generatedPlan).healthyPlate.proteinsPct}%</span></div>
                    <div className="bg-[#fffbeb] border border-[#fef3c7] rounded-xl p-3 text-[#d97706]">🍞 Carbos<br/><span className="text-2xl mt-1 block">{(editedPlan||generatedPlan).healthyPlate.carbsPct}%</span></div>
                    <div className="bg-[#faf5ff] border border-[#f3e8ff] rounded-xl p-3 text-[#9333ea]">🥑 Grasas<br/><span className="text-2xl mt-1 block">{(editedPlan||generatedPlan).healthyPlate.fatsPct}%</span></div>
                  </div>
                </div>
              </div>

              {/* 7. VERDURAS RECOMENDADAS */}
              {(editedPlan || generatedPlan).recommendedGroups && (() => {
                const sec = 'vegetables';
                const isE = !!editingSections[sec];
                const dp  = editedPlan || generatedPlan;
                return (
                  <div className={`bg-white border-2 rounded-2xl p-6 shadow-sm break-inside-avoid ${isE ? 'border-amber-400 ring-2 ring-amber-200' : 'border-border-color'}`}>
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-bold text-lg uppercase tracking-widest text-[#2c3e50]">Verduras Recomendadas</h3>
                      <button onClick={() => toggleSection(sec)} className={`print:hidden flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${isE ? 'bg-green-500 text-white border-green-400' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300'}`}>
                        {isE ? <><SaveIcon /> Guardar sección</> : <><Pencil /> Editar</>}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[
                        { gk: 'vegetablesA', label: '🥗 Grupo A — Sin almidón', color: 'text-[#059669]', bg: 'bg-[#ecfdf5]', border: 'border-[#a7f3d0]', txt: 'text-[#065f46]' },
                        { gk: 'vegetablesB', label: '🥕 Grupo B — Con almidón', color: 'text-[#047857]', bg: 'bg-[#f0fdf4]', border: 'border-[#bbf7d0]', txt: 'text-[#166534]' },
                      ].map(({ gk, label, color, bg, border, txt }) => {
                        const vegs: string[] = dp.recommendedGroups?.[gk] || [];
                        if (!isE && !vegs.length) return null;
                        return (
                          <div key={gk}>
                            <h4 className={`text-xs font-bold ${color} uppercase tracking-widest mb-3`}>{label}</h4>
                            {isE ? (
                              <div className="space-y-1.5">
                                {vegs.map((v, idx) => (
                                  <div key={idx} className="flex gap-1.5">
                                    <input className="flex-1 text-sm border border-amber-200 bg-amber-50 rounded px-2 py-1 focus:outline-none" value={v} onChange={e => mut(p => { p.recommendedGroups[gk][idx] = e.target.value; })} />
                                    <button onClick={() => mut(p => { p.recommendedGroups[gk].splice(idx,1); })} className="text-red-400 hover:text-red-600 text-base leading-none px-1">×</button>
                                  </div>
                                ))}
                                <button onClick={() => mut(p => { p.recommendedGroups[gk].push(''); })} className="text-xs text-amber-600 border border-amber-300 bg-amber-50 hover:bg-amber-100 px-3 py-1 rounded-full">+ Agregar</button>
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {vegs.map((v, i) => <span key={i} className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 ${bg} border ${border} ${txt} rounded-full font-medium`}>{getVeggieEmoji(v)} {v}</span>)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* 8. HIDRATACIÓN */}
              {(() => {
                const sec = 'hydration';
                const isE = !!editingSections[sec];
                const dp  = editedPlan || generatedPlan;
                return (
                  <div className={`bg-white border-2 rounded-2xl p-6 shadow-sm ${isE ? 'border-amber-400 ring-2 ring-amber-200' : 'border-border-color'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-[15px] uppercase tracking-widest">Plan de Hidratación</h3>
                      <button onClick={() => toggleSection(sec)} className={`print:hidden flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${isE ? 'bg-green-500 text-white border-green-400' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300'}`}>
                        {isE ? <><SaveIcon /> Guardar sección</> : <><Pencil /> Editar</>}
                      </button>
                    </div>
                    <div className="bg-[#eff6ff] rounded-xl p-4 text-center border border-[#bfdbfe] mb-4">
                      <div className="text-primary text-xs font-bold uppercase tracking-wider mb-1">Meta Diaria</div>
                      {isE
                        ? <input type="number" step="0.1" className="text-2xl font-black text-[#1e3a8a] w-24 text-center border-b-2 border-amber-300 bg-transparent focus:outline-none" value={dp.hydrationPlan.targetLiters} onChange={e => mut(p => { p.hydrationPlan.targetLiters = parseFloat(e.target.value) || 0; p.hydrationPlan.equivalentGlasses = Math.round(parseFloat(e.target.value)*1000/250) || 0; })} />
                        : <div className="text-2xl font-black text-[#1e3a8a]">{dp.hydrationPlan.targetLiters} litros de agua</div>
                      }
                      <div className="text-xs text-[#3b82f6] mt-1 font-medium">Equivale a {dp.hydrationPlan.equivalentGlasses} vasos de 250ml</div>
                      <div className="flex justify-center gap-1 mt-3">
                        {Array.from({length: Math.min(dp.hydrationPlan.equivalentGlasses, 12)}).map((_,i) => (
                          <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="#60a5fa" stroke="#3b82f6" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-[11px]">
                      {[
                        { field: 'wakeupTip',  icon: '🌅' },
                        { field: 'workDayTip', icon: '💧' },
                        { field: 'nightTip',   icon: '🌙' },
                      ].map(({ field, icon }) => (
                        <div key={field} className="flex items-center gap-3 bg-gray-50 border border-gray-100 p-2 rounded-lg">
                          <span className="text-lg">{icon}</span>
                          {isE
                            ? <input className="flex-1 text-[11px] border border-amber-200 bg-amber-50 rounded px-2 py-1 focus:outline-none" value={dp.hydrationPlan[field] || ''} onChange={e => mut(p => { p.hydrationPlan[field] = e.target.value; })} />
                            : <span className="text-gray-600 font-medium">{dp.hydrationPlan[field]}</span>
                          }
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* 9. SUPLEMENTOS Y SUSTITUTOS */}
              {((editedPlan||generatedPlan).supplements?.length > 0 || (editedPlan||generatedPlan).substitutes?.length > 0) && (() => {
                const secS = 'supplements';
                const secSub = 'substitutes';
                const isES = !!editingSections[secS];
                const isESub = !!editingSections[secSub];
                const dp = editedPlan || generatedPlan;
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                    {dp.supplements?.length > 0 && (
                      <div className={`bg-white border-2 rounded-2xl p-6 shadow-sm break-inside-avoid ${isES ? 'border-amber-400 ring-2 ring-amber-200' : 'border-border-color'}`}>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-[15px] uppercase tracking-widest text-center text-primary">Suplementación Sugerida</h3>
                          <button onClick={() => toggleSection(secS)} className={`print:hidden flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${isES ? 'bg-green-500 text-white border-green-400' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300'}`}>
                            {isES ? <><SaveIcon /> Guardar</> : <><Pencil /> Editar</>}
                          </button>
                        </div>
                        <div className="space-y-3">
                          {dp.supplements.map((s: any, i: number) => (
                            <div key={i} className={`p-3 rounded-xl ${isES ? 'border border-amber-200 bg-amber-50' : 'bg-[#e8fae8] border border-[#bbf7d0]'}`}>
                              {isES ? (
                                <div className="space-y-1.5">
                                  <input className="w-full font-bold text-sm text-[#0A4D3C] border-b border-amber-300 bg-transparent focus:outline-none" value={s.name} placeholder="Nombre" onChange={e => mut(p => { p.supplements[i].name = e.target.value; })} />
                                  <input className="w-full text-xs text-[#0A4D3C]/70 font-mono border-b border-amber-200 bg-transparent focus:outline-none" value={s.dosage||''} placeholder="Dosis" onChange={e => mut(p => { p.supplements[i].dosage = e.target.value; })} />
                                  <div className="flex gap-1"><span className="text-[11px] text-gray-500">💡</span><input className="flex-1 text-[11px] border border-amber-200 bg-white rounded px-1.5 py-1 focus:outline-none" value={s.reason||''} placeholder="Motivo" onChange={e => mut(p => { p.supplements[i].reason = e.target.value; })} /><button onClick={() => mut(p => { p.supplements.splice(i,1); })} className="text-red-400 hover:text-red-600 text-base px-1">×</button></div>
                                </div>
                              ) : (
                                <>
                                  <div className="font-bold text-sm text-[#0A4D3C]">{s.name}</div>
                                  {s.dosage && <div className="text-xs text-[#0A4D3C]/70 mb-1 font-mono">{s.dosage}</div>}
                                  <div className="text-[11px] text-gray-700 mt-1">💡 {s.reason}</div>
                                </>
                              )}
                            </div>
                          ))}
                          {isES && <button onClick={() => mut(p => { p.supplements.push({ name: '', dosage: '', reason: '' }); })} className="text-xs text-amber-600 border border-amber-300 bg-amber-50 hover:bg-amber-100 px-3 py-1 rounded-full">+ Agregar suplemento</button>}
                        </div>
                      </div>
                    )}
                    {dp.substitutes?.length > 0 && (
                      <div className={`bg-white border-2 rounded-2xl p-6 shadow-sm break-inside-avoid ${isESub ? 'border-amber-400 ring-2 ring-amber-200' : 'border-border-color'}`}>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-[15px] uppercase tracking-widest text-center text-accent-dark">Opciones de Sustitución</h3>
                          <button onClick={() => toggleSection(secSub)} className={`print:hidden flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${isESub ? 'bg-green-500 text-white border-green-400' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300'}`}>
                            {isESub ? <><SaveIcon /> Guardar</> : <><Pencil /> Editar</>}
                          </button>
                        </div>
                        <div className="space-y-4">
                          {dp.substitutes.map((sub: any, si: number) => (
                            <div key={si}>
                              {isESub
                                ? <input className="w-full text-[11px] font-bold text-gray-800 uppercase border-b border-amber-300 bg-transparent focus:outline-none mb-1.5" value={sub.category} onChange={e => mut(p => { p.substitutes[si].category = e.target.value; })} />
                                : <h4 className="text-[11px] font-bold text-gray-800 uppercase mb-1.5">{sub.category}</h4>
                              }
                              <div className="flex flex-wrap gap-1.5">
                                {sub.options.map((opt: string, oi: number) => (
                                  isESub
                                    ? <div key={oi} className="flex gap-0.5"><input className="text-[10px] px-2 py-1 border border-amber-200 bg-amber-50 rounded-md focus:outline-none w-28" value={opt} onChange={e => mut(p => { p.substitutes[si].options[oi] = e.target.value; })} /><button onClick={() => mut(p => { p.substitutes[si].options.splice(oi,1); })} className="text-red-400 text-sm leading-none px-0.5">×</button></div>
                                    : <span key={oi} className="text-[10px] px-2 py-1 bg-surface border border-border-color rounded-md text-gray-700 shadow-sm">{opt}</span>
                                ))}
                                {isESub && <button onClick={() => mut(p => { p.substitutes[si].options.push(''); })} className="text-[10px] text-amber-600 border border-amber-300 bg-amber-50 px-2 py-1 rounded-md">+ Opción</button>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 10. RECOMENDACIONES Y RECETAS */}
              {(editedPlan||generatedPlan).recommendationsAndRecipes?.length > 0 && (() => {
                const sec = 'recommendations';
                const isE = !!editingSections[sec];
                const dp  = editedPlan || generatedPlan;
                return (
                  <div className={`bg-white border-2 rounded-2xl p-6 shadow-sm pb-6 break-inside-avoid ${isE ? 'border-amber-400 ring-2 ring-amber-200' : 'border-border-color'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-[15px] uppercase tracking-widest text-center text-primary">Recomendaciones &amp; Recetas Clave</h3>
                      <button onClick={() => toggleSection(sec)} className={`print:hidden flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${isE ? 'bg-green-500 text-white border-green-400' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300'}`}>
                        {isE ? <><SaveIcon /> Guardar sección</> : <><Pencil /> Editar</>}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {dp.recommendationsAndRecipes.map((rec: any, i: number) => (
                        <div key={i} className={`rounded-xl p-4 ${isE ? 'border border-amber-200 bg-amber-50' : 'bg-bg border border-border-color'}`}>
                          {isE ? (
                            <div className="space-y-2">
                              <div className="flex gap-1"><input className="flex-1 font-bold text-sm text-text-main border-b border-amber-300 bg-transparent focus:outline-none" value={rec.title} placeholder="Título" onChange={e => mut(p => { p.recommendationsAndRecipes[i].title = e.target.value; })} /><button onClick={() => mut(p => { p.recommendationsAndRecipes.splice(i,1); })} className="text-red-400 hover:text-red-600 text-base px-1">×</button></div>
                              <textarea className="w-full text-sm border border-amber-200 bg-white rounded p-2 focus:outline-none resize-none" rows={4} value={rec.content} onChange={e => mut(p => { p.recommendationsAndRecipes[i].content = e.target.value; })} />
                            </div>
                          ) : (
                            <>
                              <div className="font-bold text-sm text-text-main mb-2">✦ {rec.title}</div>
                              <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{rec.content}</div>
                            </>
                          )}
                        </div>
                      ))}
                      {isE && <button onClick={() => mut(p => { p.recommendationsAndRecipes.push({ title: '', content: '' }); })} className="text-sm text-amber-600 border-2 border-dashed border-amber-300 bg-amber-50 hover:bg-amber-100 rounded-xl p-4 text-center transition-colors">+ Agregar recomendación</button>}
                    </div>
                  </div>
                );
              })()}


            </div>
          </div>

          {/* Floating save button when any section is being edited */}
          {anyEditing && (
            <div className="print:hidden fixed bottom-6 right-6 z-50 animate-in fade-in">
              <button
                onClick={saveEdits}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold px-5 py-3 rounded-full shadow-2xl transition-all hover:-translate-y-0.5 text-sm"
              >
                <SaveIcon /> Guardar todos los cambios
              </button>
            </div>
          )}
          
        </div>
      )}
    </div>
  );
}
