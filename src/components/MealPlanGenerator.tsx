import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../context/CompanyContext';
import { useToast } from '../context/ToastContext';

// -- ICONS --
const CheckCircle = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const Sparkles = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.9 5.5l.8 2.2a2.3 2.3 0 0 0 1.6 1.6l2.2.8-2.2.8a2.3 2.3 0 0 0-1.6 1.6l-.8 2.2-.8-2.2a2.3 2.3 0 0 0-1.6-1.6l-2.2-.8 2.2-.8a2.3 2.3 0 0 0 1.6-1.6l.8-2.2zM20 12l-.5 1.4a1.8 1.8 0 0 0-1.2 1.2l-1.4.5 1.4.5a1.8 1.8 0 0 0 1.2 1.2l.5 1.4.5-1.4a1.8 1.8 0 0 0 1.2-1.2l1.4-.5-1.4-.5a1.8 1.8 0 0 0-1.2-1.2L20 12zM5.5 2L5 3.4a1.8 1.8 0 0 0-1.2 1.2L2.4 5.1l1.4.5A1.8 1.8 0 0 0 5 6.8L5.5 8.2l.5-1.4A1.8 1.8 0 0 0 7.2 5.6l1.4-.5-1.4-.5a1.8 1.8 0 0 0-1.2-1.2L5.5 2z"/></svg>;
const Printer = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>;
const RotateCcw = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>;
const Info = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
const ArrowRight = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;

// -- CALCULATIONS --
function calculateMetrics(weight: number, height: number, age: number, sex: string, activityLevel: string) {
  // Hamwi Formula
  let idealWeight = 0;
  if (sex === 'Masculino') {
    idealWeight = 48.0 + 1.06 * (height - 152.4);
  } else {
    idealWeight = 45.5 + 0.86 * (height - 152.4);
  }
  
  const bmi = weight / Math.pow(height / 100, 2);
  let adjustedIdealWeight = idealWeight;
  let calculationMethod = '';
  let calories = 0;
  
  if (bmi > 25) {
    adjustedIdealWeight = idealWeight + 0.25 * (weight - idealWeight);
    calculationMethod = 'Fórmula de Nox (Descenso)';
    calories = adjustedIdealWeight * 22; 
  } else {
    calculationMethod = 'Harris-Benedict (Mantenimiento)';
    // Harris Benedict
    if (sex === 'Masculino') {
      calories = 66.5 + (13.75 * weight) + (5.003 * height) - (6.75 * age);
    } else {
      calories = 655.1 + (9.563 * weight) + (1.850 * height) - (4.676 * age);
    }
    // Activity Factor
    if (activityLevel === 'Deportista') calories *= 1.55;
    else if (activityLevel === 'Activo') calories *= 1.375;
    else calories *= 1.2;
  }

  // Macros
  let macros = { carbs: 55, protein: 15, fats: 30 };
  if (activityLevel === 'Deportista') {
    macros = { carbs: 55, protein: 23, fats: 22 }; // Rosana: 55C/17P/22F → normalizado a 100% con proteína en 23%
  }

  return {
    idealWeight: parseFloat(idealWeight.toFixed(1)),
    adjustedIdealWeight: parseFloat(adjustedIdealWeight.toFixed(1)),
    bmi: parseFloat(bmi.toFixed(1)),
    calories: Math.round(calories),
    calculationMethod,
    macros
  };
}


export default function MealPlanGenerator() {
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();
  
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientData, setPatientData] = useState<any>(null);
  const [loadingPatient, setLoadingPatient] = useState(false);
  
  const [preferences, setPreferences] = useState({
    dietType: 'Normal',
    activityLevel: 'Sedentario',
    objectives: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPatients();
  }, [selectedCompany]);

  async function fetchPatients() {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, birth_date, sex')
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
    if (!selectedPatientId) {
      setPatientData(null);
      setMetrics(null);
      return;
    }
    const loadPatientDetails = async () => {
      setLoadingPatient(true);
      try {
        const p = patients.find(x => x.id === selectedPatientId);
        if (!p) return;
        
        let age = 30;
        if (p.birth_date) {
            const today = new Date(), dob = new Date(p.birth_date);
            age = today.getFullYear() - dob.getFullYear();
        }

        // Get latest weight and height from sessions (either Anteopometría or Consulta)
        const { data: sessionData } = await supabase
          .from('sessions')
          .select('weight, height')
          .eq('patient_id', p.id)
          .not('weight', 'is', null)
          .not('height', 'is', null)
          .order('session_date', { ascending: false })
          .limit(1);

        const weight = sessionData?.[0]?.weight || 70; // fallback default
        const height = sessionData?.[0]?.height || 165;
        
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
        console.error(e);
      } finally {
        setLoadingPatient(false);
      }
    };
    loadPatientDetails();
  }, [selectedPatientId]);

  // Update metrics when activity level changes
  useEffect(() => {
    if (patientData) {
      updateMetrics(patientData, preferences.activityLevel);
    }
  }, [preferences.activityLevel]);

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
      setGeneratedPlan(planJson);
      showToast('¡Plan generado con éxito!', 'success');
      
      setTimeout(() => {
        window.scrollTo({ top: document.getElementById('generated-plan-view')?.offsetTop || 0, behavior: 'smooth' });
      }, 100);
      
    } catch (err: any) {
      console.error(err);
      showToast('Ocurrió un error al generar el plan con IA.', 'error');
    } finally {
      setLoading(false);
    }
  }

  function downloadPDF() {
    // html2pdf fails with modern Tailwind V4 oklch colors. 
    // The native window.print() is 100% robust, vector-based, and generates much better PDFs.
    window.print();
  }

  function handleReset() {
    setGeneratedPlan(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }


  const PieChart = ({ pV, pP, pC, pF }: { pV: number, pP: number, pC: number, pF: number }) => {
    const size = 200;
    const cx = size/2, cy = size/2, r = size/2 - 15;
    const slices = [
      { pct: pV/100, color: 'url(#grad-v)', label: 'VEGETALES' },
      { pct: pP/100, color: 'url(#grad-p)', label: 'PROTEÍNAS' },
      { pct: pC/100, color: 'url(#grad-C)', label: 'CARBOHIDRATOS' },
      { pct: pF/100, color: 'url(#grad-f)', label: 'GRASAS' }
    ];
    let cum = -Math.PI / 2;
    return (
      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="filter overflow-visible">
          <defs>
            <linearGradient id="grad-v" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#4ade80"/><stop offset="100%" stopColor="#16a34a"/></linearGradient>
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
              <h1 className="text-3xl font-black text-primary uppercase tracking-tight">Generador de Planes con IA</h1>
              <p className="text-text-muted mt-2">Configura los parámetros del paciente y genera un plan alimentario personalizado en segundos.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Form Section */}
              <div className="space-y-6">
                <div>
                  <label className={labelCls}>1. PACIENTE</label>
                  <select className={inputCls} value={selectedPatientId} onChange={e => setSelectedPatientId(e.target.value)}>
                    <option value="">Selecciona un paciente...</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.last_name}, {p.first_name}</option>)}
                  </select>
                </div>

                {patientData && (
                  <>
                    <div>
                      <label className={labelCls}>2. PREFERENCIA DIETARIA</label>
                      <select className={inputCls} value={preferences.dietType} onChange={e => setPreferences({...preferences, dietType: e.target.value})}>
                        <option value="Normal">Normal (Omnívora)</option>
                        <option value="Vegetariano">Vegetariana</option>
                        <option value="Vegano">Vegana</option>
                        <option value="Celiaco (Sin Tacc)">Celíaco (Sin TACC)</option>
                        <option value="Sin lactosa">Sin Lactosa</option>
                      </select>
                    </div>

                    <div>
                      <label className={labelCls}>3. NIVEL DE ACTIVIDAD</label>
                      <select className={inputCls} value={preferences.activityLevel} onChange={e => setPreferences({...preferences, activityLevel: e.target.value})}>
                        <option value="Sedentario">Sedentario</option>
                        <option value="Activo">Activo (1-3 días x sem)</option>
                        <option value="Deportista">Deportista (+4 días x sem)</option>
                      </select>
                    </div>

                    <div>
                      <label className={labelCls}>4. OBJETIVOS ESPECÍFICOS (Opcional)</label>
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
                    <div className="space-y-4 text-sm">
                      <div className="bg-white p-3 rounded-lg border border-border-color flex justify-between">
                        <span className="text-text-muted">Biometría</span>
                        <span className="font-bold">{patientData.weight}kg | {patientData.height}cm | IMC {metrics.bmi}</span>
                      </div>
                      
                      <div className="bg-white p-3 rounded-lg border border-border-color flex justify-between">
                        <span className="text-text-muted">Formula utilizada</span>
                        <span className="font-bold text-accent-dark">{metrics.calculationMethod}</span>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-border-color">
                        <div className="flex justify-between mb-2">
                          <span className="text-text-muted">Valor Calórico Objetivo</span>
                          <span className="font-bold text-lg text-primary">{metrics.calories} kcal/día</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                          <div className="bg-primary h-2 rounded-full" style={{ width: '100%' }}></div>
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-border-color">
                        <span className="text-text-muted block mb-2">Distribución de Macros Estimada</span>
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
                    Procesando con IA...
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
                Índice de Bienestar Nutricional NuPlan · {selectedCompany.toUpperCase()}
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

          <div ref={pdfRef} className="bg-bg">
            <div className="p-6 md:p-8 space-y-6">

              {/* Tu Perfil de Hábitos */}
              <div className="bg-white border-2 border-border-color rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-lg text-center mb-6 uppercase tracking-widest text-[#2c3e50]">Tu Perfil de Hábitos</h3>
                
                <div className="space-y-5">
                  {[
                    { label: 'Hidratación', cur: generatedPlan.habitProfile.hydration.current, max: generatedPlan.habitProfile.hydration.max, color: 'bg-[#3b82f6]' },
                    { label: 'Alimentación & Fibra', cur: generatedPlan.habitProfile.foodAndFiber.current, max: generatedPlan.habitProfile.foodAndFiber.max, color: 'bg-[#22c55e]' },
                    { label: 'Actividad Física', cur: generatedPlan.habitProfile.physicalActivity.current, max: generatedPlan.habitProfile.physicalActivity.max, color: 'bg-[#f59e0b]' }
                  ].map((h, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm font-semibold text-text-muted mb-1.5">
                        <span>{h.label}</span>
                        <span>{h.cur} / {h.max} pts ({Math.round(h.cur/h.max*100)}%)</span>
                      </div>
                      <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${h.color}`} style={{ width: `${Math.round(h.cur/h.max*100)}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>

                {generatedPlan.habitProfile.insufficientHydrationAlert && (
                  <div className="mt-6 bg-[#fef3c7] border border-[#fde68a] text-[#92400e] p-4 rounded-xl text-sm font-medium flex gap-3 items-start">
                    <span className="text-xl">⚠️</span>
                    <p><strong>Hidratación insuficiente:</strong> Tu consumo de agua está por debajo de lo recomendado. Intentá llevar siempre una botella de 500ml y completar al menos {generatedPlan.hydrationPlan.equivalentGlasses / 2} recargas al día.</p>
                  </div>
                )}
              </div>

              {/* Plato Saludable Recomendado */}
              <div className="bg-white border-2 border-border-color rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center gap-8">
                <div className="shrink-0 relative flex flex-col items-center">
                  <div className="text-xs font-bold text-text-muted mb-2 tracking-widest uppercase">Distribución Ideal</div>
                  <PieChart 
                    pV={generatedPlan.healthyPlate.vegetablesPct} 
                    pP={generatedPlan.healthyPlate.proteinsPct} 
                    pC={generatedPlan.healthyPlate.carbsPct} 
                    pF={generatedPlan.healthyPlate.fatsPct} 
                  />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-3 uppercase tracking-widest text-[#2c3e50]">Tu Plato Saludable Recomendado</h3>
                  <p className="text-sm text-text-muted leading-relaxed mb-6">
                    Para tu objetivo, tu plato prioriza <strong className="text-[#059669]">vegetales ({generatedPlan.healthyPlate.vegetablesPct}%)</strong>, 
                    seguido de <strong className="text-[#2563eb]">proteínas ({generatedPlan.healthyPlate.proteinsPct}%)</strong> y una porción moderada de <strong className="text-[#d97706]">carbohidratos ({generatedPlan.healthyPlate.carbsPct}%)</strong>. 
                    Las grasas saludables se incorporan como complemento.
                  </p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm font-bold">
                    <div className="bg-[#ecfdf5] border border-[#d1fae5] rounded-xl p-3 text-[#059669]">
                      🥦 Vegetales<br/><span className="text-2xl mt-1 block">{generatedPlan.healthyPlate.vegetablesPct}%</span>
                    </div>
                    <div className="bg-[#eff6ff] border border-[#dbeafe] rounded-xl p-3 text-[#2563eb]">
                      🍗 Proteínas<br/><span className="text-2xl mt-1 block">{generatedPlan.healthyPlate.proteinsPct}%</span>
                    </div>
                    <div className="bg-[#fffbeb] border border-[#fef3c7] rounded-xl p-3 text-[#d97706]">
                      🍞 Carbos<br/><span className="text-2xl mt-1 block">{generatedPlan.healthyPlate.carbsPct}%</span>
                    </div>
                    <div className="bg-[#faf5ff] border border-[#f3e8ff] rounded-xl p-3 text-[#9333ea]">
                      🥑 Grasas<br/><span className="text-2xl mt-1 block">{generatedPlan.healthyPlate.fatsPct}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Plan Diario */}
              <div className="bg-white border-2 border-border-color rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-lg text-center mb-6 uppercase tracking-widest text-[#2c3e50]">Plan Alimentario Diario Completo</h3>
                
                <div className="space-y-6">
                  {generatedPlan.dailyPlan.map((meal: any, i: number) => (
                    <div key={i} className="flex gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                      <div className="w-16 shrink-0 text-center border-r border-gray-200 pr-4">
                        <div className="font-black text-gray-800 text-lg">{meal.time}</div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wide font-bold">{meal.type}</div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-[#0A4D3C] text-[15px] mb-2">{meal.title}</h4>
                        <ul className="space-y-1 mb-3">
                          {meal.items.map((item: string, j: number) => (
                            <li key={j} className="text-[13px] text-gray-700 flex items-start gap-2">
                              <span className="text-primary mt-1 shadow-none bg-transparent h-auto">{"•"}</span> 
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                        {meal.tip && (
                          <div className="inline-block bg-[#e0fcf2] text-[#047857] px-3 py-1 rounded-md text-[11px] font-medium border border-[#a7f3d0]">
                            💡 {meal.tip}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hidratación y Compras */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Hidratacion */}
                <div className="bg-white border-2 border-border-color rounded-2xl p-6 shadow-sm">
                  <h3 className="font-bold text-[15px] mb-4 uppercase tracking-widest text-center">Plan de Hidratación</h3>
                  <div className="bg-[#eff6ff] rounded-xl p-4 text-center border border-[#bfdbfe] mb-4">
                    <div className="text-primary text-xs font-bold uppercase tracking-wider mb-1">Meta Diaria</div>
                    <div className="text-2xl font-black text-[#1e3a8a]">{generatedPlan.hydrationPlan.targetLiters} litros de agua</div>
                    <div className="text-xs text-[#3b82f6] mt-1 font-medium">Equivale a {generatedPlan.hydrationPlan.equivalentGlasses} vasos de 250ml</div>
                    <div className="flex justify-center gap-1 mt-3">
                      {Array.from({length: Math.min(generatedPlan.hydrationPlan.equivalentGlasses, 12)}).map((_,i) => (
                        <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="#60a5fa" stroke="#3b82f6" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 space-y-2 text-[11px]">
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 p-2 rounded-lg">
                      <span className="text-lg">🌅</span><span className="text-gray-600 font-medium">{generatedPlan.hydrationPlan.wakeupTip}</span>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 p-2 rounded-lg">
                      <span className="text-lg">💻</span><span className="text-gray-600 font-medium">{generatedPlan.hydrationPlan.workDayTip}</span>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 p-2 rounded-lg">
                      <span className="text-lg">🌙</span><span className="text-gray-600 font-medium">{generatedPlan.hydrationPlan.nightTip}</span>
                    </div>
                  </div>
                </div>

                {/* Compras */}
                <div className="bg-white border-2 border-border-color rounded-2xl p-6 shadow-sm">
                  <h3 className="font-bold text-[15px] mb-4 uppercase tracking-widest text-center">Lista de Compras Base</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-[11px] font-bold text-[#059669] mb-2 uppercase border-b pb-1">Vegetales y Frutas</h4>
                      <ul className="text-[10px] text-gray-600 space-y-1">
                        {generatedPlan.shoppingList.vegetablesAndFruits.slice(0, 5).map((t: string) => <li key={t}>✓ {t}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-[#2563eb] mb-2 uppercase border-b pb-1">Proteínas</h4>
                      <ul className="text-[10px] text-gray-600 space-y-1">
                        {generatedPlan.shoppingList.proteins.slice(0, 5).map((t: string) => <li key={t}>✓ {t}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-[#d97706] mb-2 uppercase border-b pb-1">Carbos/Legumbres</h4>
                      <ul className="text-[10px] text-gray-600 space-y-1">
                        {generatedPlan.shoppingList.carbsAndLegumes.slice(0, 5).map((t: string) => <li key={t}>✓ {t}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-[#9333ea] mb-2 uppercase border-b pb-1">Grasas Saludables</h4>
                      <ul className="text-[10px] text-gray-600 space-y-1">
                        {generatedPlan.shoppingList.fatsAndDairy.slice(0, 5).map((t: string) => <li key={t}>✓ {t}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>

              </div>

              {/* Suplementos y Sustitutos */}
              {(generatedPlan.supplements?.length > 0 || generatedPlan.substitutes?.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                  {generatedPlan.supplements?.length > 0 && (
                    <div className="bg-white border-2 border-border-color rounded-2xl p-6 shadow-sm break-inside-avoid">
                      <h3 className="font-bold text-[15px] mb-4 uppercase tracking-widest text-center text-primary">Suplementación Sugerida</h3>
                      <div className="space-y-3">
                        {generatedPlan.supplements.map((s: any, i: number) => (
                          <div key={i} className="p-3 bg-[#e8fae8] border border-[#bbf7d0] rounded-xl">
                            <div className="font-bold text-sm text-[#0A4D3C]">{s.name}</div>
                            {s.dosage && <div className="text-xs text-[#0A4D3C]/70 mb-1 font-mono">{s.dosage}</div>}
                            <div className="text-[11px] text-gray-700 mt-1">💡 {s.reason}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {generatedPlan.substitutes?.length > 0 && (
                    <div className="bg-white border-2 border-border-color rounded-2xl p-6 shadow-sm break-inside-avoid">
                      <h3 className="font-bold text-[15px] mb-4 uppercase tracking-widest text-center text-accent-dark">Opciones de Sustitución</h3>
                      <div className="space-y-4">
                        {generatedPlan.substitutes.map((sub: any, i: number) => (
                          <div key={i}>
                            <h4 className="text-[11px] font-bold text-gray-800 uppercase mb-1.5">{sub.category}</h4>
                            <div className="flex flex-wrap gap-1.5">
                              {sub.options.map((opt: string, j: number) => (
                                <span key={j} className="text-[10px] px-2 py-1 bg-surface border border-border-color rounded-md text-gray-700 shadow-sm">
                                  {opt}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Recomendaciones y Recetas */}
              {generatedPlan.recommendationsAndRecipes?.length > 0 && (
                <div className="bg-white border-2 border-border-color rounded-2xl p-6 shadow-sm pb-6 break-inside-avoid">
                  <h3 className="font-bold text-[15px] mb-4 uppercase tracking-widest text-center text-primary">Recomendaciones & Recetas Clave</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {generatedPlan.recommendationsAndRecipes.map((rec: any, i: number) => (
                      <div key={i} className="bg-bg border border-border-color rounded-xl p-4">
                        <div className="font-bold text-sm text-text-main mb-2">✦ {rec.title}</div>
                        <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{rec.content}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
