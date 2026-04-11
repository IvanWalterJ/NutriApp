import React, { useState, useEffect } from 'react';
import CustomSelect from './ui/CustomSelect';
import { supabase } from '../lib/supabase';
import { useCompany } from '../context/CompanyContext';
import { useToast } from '../context/ToastContext';

// -- ICONS --
const ChefHat = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>;
const Printer = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>;
const RotateCcw = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>;
const ArrowRight = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
const Clock = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const UsersIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const Star = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const Pencil = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const SaveIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const PlusIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const TrashIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;

const INTOLERANCES_LIST = [
  'Lactosa',
  'Gluten (Celíaco / Sin TACC)',
  'Colon Irritable',
  'Enfermedad Diverticular',
  'SiBO',
];

const MEAL_TYPES = [
  { value: 'Almuerzos rápidos', label: '🥗 Almuerzos rápidos', desc: 'Listos en ≤20 min' },
  { value: 'Cenas livianas', label: '🌙 Cenas livianas', desc: 'Fáciles de digerir' },
  { value: 'Desayunos y meriendas', label: '☕ Desayunos y meriendas', desc: 'Para empezar bien el día' },
  { value: 'Snacks saludables', label: '🍎 Snacks saludables', desc: 'Entre comidas' },
  { value: 'Preparaciones deportivas', label: '💪 Preparaciones deportivas', desc: 'Para rendimiento y recuperación' },
  { value: 'Comidas para llevar (vianda)', label: '🥡 Viandas para llevar', desc: 'Prácticas para el trabajo' },
];

const DIFFICULTY_COLOR: Record<string, string> = {
  'Fácil': 'bg-green-100 text-green-700 border-green-200',
  'Medio': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Difícil': 'bg-red-100 text-red-700 border-red-200',
};

export default function RecipeGenerator() {
  const { selectedCompany, getCompanyType } = useCompany();
  const { showToast } = useToast();

  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientData, setPatientData] = useState<any>(null);
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [reportCompanyName, setReportCompanyName] = useState(selectedCompany);

  const [mealTypes, setMealTypes] = useState<string[]>(['Almuerzos rápidos']);
  const [objective, setObjective] = useState('');
  const [dietType, setDietType] = useState('Normal');
  const [intolerances, setIntolerances] = useState<string[]>([]);
  const [foodRestrictions, setFoodRestrictions] = useState('');
  const [count, setCount] = useState(3);

  function toggleMealType(value: string) {
    setMealTypes(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  }

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  // editedResult is the working copy; editingCards tracks which recipe cards are in edit mode
  const [editedResult, setEditedResult] = useState<any>(null);
  const [editingCards, setEditingCards] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetchPatients();
    setReportCompanyName(selectedCompany);
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

  useEffect(() => {
    if (!selectedPatientId) {
      setPatientData(null);
      return;
    }
    const load = async () => {
      setLoadingPatient(true);
      try {
        const p = patients.find(x => x.id === selectedPatientId);
        if (!p) return;
        let age = 30;
        if (p.birth_date) {
          const today = new Date(), dob = new Date(p.birth_date);
          age = today.getFullYear() - dob.getFullYear();
          if (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate())) age--;
        }
        const { data: sessionData } = await supabase
          .from('sessions')
          .select('weight')
          .eq('patient_id', p.id)
          .not('weight', 'is', null)
          .order('session_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1);
        setPatientData({
          firstName: p.first_name,
          lastName: p.last_name,
          age,
          sex: p.sex || 'Masculino',
          weight: sessionData?.[0]?.weight || 70,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingPatient(false);
      }
    };
    load();
  }, [selectedPatientId]);

  function toggleIntolerance(intol: string) {
    setIntolerances(prev =>
      prev.includes(intol) ? prev.filter(i => i !== intol) : [...prev, intol]
    );
  }

  async function generate() {
    setLoading(true);
    try {
      const response = await fetch('/api/generate-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientInfo: patientData, mealTypes, objective, dietType, intolerances, foodRestrictions, count })
      });
      if (!response.ok) throw new Error('Error en la generación');
      const data = await response.json();
      setResult(data);
      setEditedResult(JSON.parse(JSON.stringify(data)));
      setEditingCards({});
      showToast(`¡${data.recipes?.length || count} recetas generadas!`, 'success');
      setTimeout(() => {
        window.scrollTo({ top: document.getElementById('recipes-result')?.offsetTop || 0, behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      console.error(err);
      showToast('Ocurrió un error al generar las recetas.', 'error');
    } finally {
      setLoading(false);
    }
  }

  function downloadPDF() {
    const originalTitle = document.title;
    const label = patientData ? `${patientData.firstName} ${patientData.lastName} - ` : '';
    document.title = `${label}Recetas ${mealTypes.join(', ')} - NuPlan`;

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

    // Constrain the recipe view to A4 width (794px) so nothing overflows the right margin
    const recipesEl = document.getElementById('recipes-result');
    const prevMaxW = recipesEl ? recipesEl.style.maxWidth : '';
    const prevW    = recipesEl ? recipesEl.style.width    : '';
    if (recipesEl) {
      recipesEl.style.maxWidth = '794px';
      recipesEl.style.width    = '794px';
    }

    window.print();

    const restore = () => {
      document.title = originalTitle;
      unlocked.forEach(({ el, overflow, height, maxHeight, flex }) => {
        el.style.overflow = overflow;
        el.style.height = height;
        el.style.maxHeight = maxHeight;
        el.style.flex = flex;
      });
      if (recipesEl) {
        recipesEl.style.maxWidth = prevMaxW;
        recipesEl.style.width    = prevW;
      }
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    setTimeout(restore, 3000);
  }

  function handleReset() {
    setResult(null);
    setEditedResult(null);
    setEditingCards({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Mutate editedResult immutably
  function mut(updater: (r: any) => void) {
    setEditedResult((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev));
      updater(next);
      return next;
    });
  }

  function toggleCard(idx: number) {
    setEditingCards(prev => {
      const wasEditing = !!prev[idx];
      if (wasEditing) {
        // Save: commit editedResult to result
        setResult(JSON.parse(JSON.stringify(editedResult)));
      }
      return { ...prev, [idx]: !wasEditing };
    });
  }

  const anyEditing = Object.values(editingCards).some(Boolean);

  const inputCls = "w-full p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all";
  const labelCls = "block text-[0.85rem] font-semibold uppercase tracking-widest mb-1.5";
  const editInputCls = "w-full border border-amber-300 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors";

  // ── FORM VIEW ──
  if (!result) {
    return (
      <div className="animate-in max-w-4xl mx-auto" style={{ animationDelay: '0.2s' }}>
        <div className="bg-surface border-2 border-border-color rounded-xl p-6 md:p-8 shadow-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
              <ChefHat />
            </div>
            <h1 className="text-3xl font-black text-primary uppercase tracking-tight">Recetario</h1>
            <p className="text-text-muted mt-2">Generá recetas personalizadas para tu paciente, adaptadas a sus restricciones y objetivos, en el mismo formato profesional del plan.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left column */}
            <div className="space-y-6">
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

              <div>
                <label className={labelCls}>1. PACIENTE (Opcional)</label>
                {loadingPatient ? (
                  <div className="flex items-center gap-2 text-sm text-text-muted p-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
                    Cargando datos...
                  </div>
                ) : (
                  <CustomSelect
                    value={selectedPatientId}
                    onChange={setSelectedPatientId}
                    placeholder="Sin paciente específico"
                    options={[{value:'', label:'Sin paciente específico'}, ...patients.map(p => ({ value: p.id, label: `${p.last_name}, ${p.first_name}` }))]}
                  />
                )}
                {patientData && (
                  <div className="mt-2 p-2.5 bg-primary/5 border border-primary/20 rounded-lg text-xs text-primary font-semibold">
                    ✓ {patientData.firstName} {patientData.lastName} · {patientData.age} años · {patientData.weight}kg
                  </div>
                )}
              </div>

              <div>
                <label className={labelCls}>2. TIPO DE RECETAS <span className="normal-case text-[10px] font-normal tracking-normal text-text-muted">(podés elegir varios)</span></label>
                <div className="grid grid-cols-1 gap-2">
                  {MEAL_TYPES.map(mt => (
                    <label key={mt.value} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${mealTypes.includes(mt.value) ? 'border-primary bg-primary/5 text-primary' : 'border-border-color bg-bg hover:border-primary/40'}`}>
                      <input type="checkbox" checked={mealTypes.includes(mt.value)} onChange={() => toggleMealType(mt.value)} className="w-4 h-4 rounded accent-primary cursor-pointer" />
                      <div>
                        <div className="font-semibold text-sm">{mt.label}</div>
                        <div className="text-xs text-text-muted">{mt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              <div>
                <label className={labelCls}>3. OBJETIVO NUTRICIONAL</label>
                <textarea
                  className={inputCls}
                  placeholder="Ej: ganar masa muscular, reducir sodio, mejorar digestión, bajar de peso..."
                  rows={3}
                  value={objective}
                  onChange={e => setObjective(e.target.value)}
                />
              </div>

              <div>
                <label className={labelCls}>4. TIPO DE ALIMENTACIÓN</label>
                <CustomSelect
                  value={dietType}
                  onChange={setDietType}
                  options={[
                    {value:'Normal', label:'Normal (Omnívora)'},
                    {value:'Vegetariana', label:'Vegetariana'},
                    {value:'Vegana', label:'Vegana'},
                    {value:'Pesco-vegetariana', label:'Pesco-vegetariana'},
                  ]}
                />
              </div>

              <div>
                <label className={labelCls}>5. INTOLERANCIAS / PATOLOGÍAS</label>
                <div className="grid grid-cols-1 gap-2">
                  {INTOLERANCES_LIST.map(intol => (
                    <label key={intol} className="flex items-center gap-3 p-2.5 rounded-lg border-2 border-border-color bg-bg cursor-pointer hover:border-primary/40 transition-colors">
                      <input
                        type="checkbox"
                        checked={intolerances.includes(intol)}
                        onChange={() => toggleIntolerance(intol)}
                        className="w-4 h-4 rounded accent-primary cursor-pointer"
                      />
                      <span className="text-sm font-medium text-text-main">{intol}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>6. ALIMENTOS QUE NO PUEDE CONSUMIR</label>
                <textarea
                  className={inputCls}
                  placeholder="Ej: mariscos, nueces, huevo..."
                  rows={2}
                  value={foodRestrictions}
                  onChange={e => setFoodRestrictions(e.target.value)}
                />
              </div>

              <div>
                <label className={labelCls}>7. CANTIDAD DE RECETAS</label>
                <div className="flex gap-2">
                  {[1, 3, 5, 6].map(n => (
                    <button
                      key={n}
                      onClick={() => setCount(n)}
                      className={`flex-1 py-2.5 rounded-lg border-2 font-bold text-sm transition-all ${count === n ? 'bg-primary text-white border-primary' : 'bg-bg border-border-color text-text-muted hover:border-primary/40'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t-2 border-border-color pt-6 text-center">
            <button
              onClick={generate}
              disabled={loading || mealTypes.length === 0}
              className="w-full md:w-auto inline-flex items-center justify-center gap-3 bg-gradient-to-br from-primary to-primary-light text-white px-10 py-4 rounded-xl font-bold text-lg hover:-translate-y-1 hover:shadow-xl transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  Generando recetas...
                </>
              ) : (
                <>
                  Generar {count} {count === 1 ? 'Receta' : 'Recetas'} <ArrowRight />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── RESULTS VIEW ──
  const recipes: any[] = (editedResult || result).recipes || [];

  return (
    <div id="recipes-result" className="max-w-[1000px] mx-auto fade-in">
      {/* Header */}
      <div className="bg-primary text-white p-6 rounded-t-2xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <div className="text-xs font-bold tracking-[3px] text-white/70">RECETARIO PERSONALIZADO</div>
          <h2 className="text-3xl font-black mt-1">{mealType}</h2>
          <div className="text-sm mt-1 text-white/90">
            {patientData ? `Para: ${patientData.firstName} ${patientData.lastName} · ` : ''}{reportCompanyName.toUpperCase()}
          </div>
          {(editedResult || result).context && (
            <div className="mt-2 text-sm text-white/80 italic max-w-lg">{(editedResult || result).context}</div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 print:hidden">
          <button
            onClick={downloadPDF}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg px-4 py-2 font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Printer /> Descargar PDF
          </button>
          <button
            onClick={handleReset}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg px-4 py-2 font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw /> Nueva Consulta
          </button>
        </div>
      </div>

      {/* Objective banner */}
      {objective && (
        <div className="bg-[#f0fdf4] border-x-2 border-[#86efac] px-6 py-3 flex items-center gap-3">
          <span className="text-2xl">🎯</span>
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#166534]">Objetivo: </span>
            <span className="text-sm text-[#14532d] font-semibold">{objective}</span>
          </div>
        </div>
      )}

      {/* Patient banner */}
      {patientData && (
        <div className="bg-blue-50 border-x-2 border-blue-200 px-6 py-3 flex items-center gap-3">
          <span className="text-2xl">👤</span>
          <div className="text-sm text-blue-800 font-semibold">
            {patientData.firstName} {patientData.lastName} · {patientData.age} años · {patientData.sex} · {patientData.weight}kg
            {intolerances.length > 0 && (
              <span className="ml-2 text-amber-700">· Intolerancias: {intolerances.join(', ')}</span>
            )}
          </div>
        </div>
      )}

      {/* Floating save button when any card is editing */}
      {anyEditing && (
        <div className="print:hidden fixed bottom-6 right-6 z-50">
          <button
            onClick={() => {
              setResult(JSON.parse(JSON.stringify(editedResult)));
              setEditingCards({});
              showToast('Cambios guardados', 'success');
            }}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-3 rounded-xl font-bold shadow-xl transition-all hover:-translate-y-0.5"
          >
            <SaveIcon /> Guardar todos los cambios
          </button>
        </div>
      )}

      {/* Recipe cards */}
      <div className="bg-bg border-x-2 border-b-2 border-border-color rounded-b-2xl p-6 md:p-8">
        <div className="grid grid-cols-1 gap-6">
          {recipes.map((recipe: any, idx: number) => {
            const isE = !!editingCards[idx];
            return (
              <div key={idx} className={`border-2 rounded-2xl overflow-hidden shadow-sm transition-all ${isE ? 'border-amber-400 shadow-amber-100' : 'border-border-color bg-surface'}`}>

                {/* Recipe header */}
                <div className={`border-b-2 p-5 ${isE ? 'bg-amber-50 border-amber-300' : 'bg-gradient-to-r from-primary/8 to-primary/3 border-border-color'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold uppercase tracking-widest text-text-muted mb-1">
                        Receta {idx + 1}
                      </div>
                      {isE ? (
                        <input
                          className={`${editInputCls} text-lg font-black`}
                          value={recipe.title}
                          onChange={e => mut(r => { r.recipes[idx].title = e.target.value; })}
                        />
                      ) : (
                        <h3 className="text-xl font-black text-primary leading-tight">{recipe.title}</h3>
                      )}
                      {isE ? (
                        <input
                          className={`${editInputCls} mt-2 text-sm`}
                          placeholder="Objetivo de la receta..."
                          value={recipe.objective || ''}
                          onChange={e => mut(r => { r.recipes[idx].objective = e.target.value; })}
                        />
                      ) : (
                        recipe.objective && <p className="text-sm text-text-muted mt-1 italic">{recipe.objective}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Metadata badges — editable */}
                      {isE ? (
                        <div className="flex flex-col gap-1.5">
                          <input
                            className="border border-amber-300 bg-white rounded px-2 py-1 text-xs w-24 focus:outline-none focus:border-amber-500"
                            placeholder="Tiempo"
                            value={recipe.prepTime || ''}
                            onChange={e => mut(r => { r.recipes[idx].prepTime = e.target.value; })}
                          />
                          <input
                            className="border border-amber-300 bg-white rounded px-2 py-1 text-xs w-24 focus:outline-none focus:border-amber-500"
                            placeholder="Porciones"
                            value={recipe.servings || ''}
                            onChange={e => mut(r => { r.recipes[idx].servings = e.target.value; })}
                          />
                          <select
                            className="border border-amber-300 bg-white rounded px-2 py-1 text-xs w-24 focus:outline-none focus:border-amber-500"
                            value={recipe.difficulty || 'Fácil'}
                            onChange={e => mut(r => { r.recipes[idx].difficulty = e.target.value; })}
                          >
                            <option>Fácil</option>
                            <option>Medio</option>
                            <option>Difícil</option>
                          </select>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {recipe.prepTime && (
                            <span className="flex items-center gap-1.5 text-xs font-semibold bg-white border border-border-color text-text-muted px-2.5 py-1.5 rounded-full">
                              <Clock /> {recipe.prepTime}
                            </span>
                          )}
                          {recipe.servings && (
                            <span className="flex items-center gap-1.5 text-xs font-semibold bg-white border border-border-color text-text-muted px-2.5 py-1.5 rounded-full">
                              <UsersIcon /> {recipe.servings}
                            </span>
                          )}
                          {recipe.difficulty && (
                            <span className={`flex items-center gap-1.5 text-xs font-semibold border px-2.5 py-1.5 rounded-full ${DIFFICULTY_COLOR[recipe.difficulty] || DIFFICULTY_COLOR['Fácil']}`}>
                              <Star /> {recipe.difficulty}
                            </span>
                          )}
                        </div>
                      )}
                      {/* Edit / Save toggle */}
                      <button
                        onClick={() => toggleCard(idx)}
                        className={`print:hidden flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ml-1 ${isE ? 'bg-green-500 text-white border-green-400 hover:bg-green-600' : 'bg-white/60 text-primary border-primary/30 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300'}`}
                      >
                        {isE ? <><SaveIcon /> Guardar</> : <><Pencil /> Editar</>}
                      </button>
                    </div>
                  </div>
                </div>

                <div className={`p-5 grid grid-cols-1 md:grid-cols-2 gap-5 ${isE ? 'bg-amber-50/30' : 'bg-surface'}`}>
                  {/* Ingredients */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">🛒</span>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-text-muted">Ingredientes</h4>
                    </div>
                    <ul className="space-y-1.5">
                      {(recipe.ingredients || []).map((ing: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          {isE ? (
                            <>
                              <input
                                className={`${editInputCls} flex-1`}
                                value={ing}
                                onChange={e => mut(r => { r.recipes[idx].ingredients[i] = e.target.value; })}
                              />
                              <button
                                onClick={() => mut(r => { r.recipes[idx].ingredients.splice(i, 1); })}
                                className="text-red-400 hover:text-red-600 p-1 mt-1 transition-colors shrink-0"
                                title="Eliminar"
                              >
                                <TrashIcon />
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>
                              <span className="text-sm text-text-main">{ing}</span>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                    {isE && (
                      <button
                        onClick={() => mut(r => { r.recipes[idx].ingredients.push(''); })}
                        className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 border border-dashed border-primary/30 rounded-lg px-3 py-1.5 w-full justify-center transition-colors"
                      >
                        <PlusIcon /> Agregar ingrediente
                      </button>
                    )}
                  </div>

                  {/* Preparation */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">👨‍🍳</span>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-text-muted">Preparación</h4>
                    </div>
                    <ol className="space-y-2">
                      {(recipe.preparation || []).map((step: string, i: number) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-1">
                            {i + 1}
                          </span>
                          {isE ? (
                            <>
                              <textarea
                                className={`${editInputCls} flex-1 resize-none`}
                                rows={2}
                                value={step}
                                onChange={e => mut(r => { r.recipes[idx].preparation[i] = e.target.value; })}
                              />
                              <button
                                onClick={() => mut(r => { r.recipes[idx].preparation.splice(i, 1); })}
                                className="text-red-400 hover:text-red-600 p-1 mt-1 transition-colors shrink-0"
                                title="Eliminar"
                              >
                                <TrashIcon />
                              </button>
                            </>
                          ) : (
                            <span className="text-sm text-text-main">{step}</span>
                          )}
                        </li>
                      ))}
                    </ol>
                    {isE && (
                      <button
                        onClick={() => mut(r => { r.recipes[idx].preparation.push(''); })}
                        className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 border border-dashed border-primary/30 rounded-lg px-3 py-1.5 w-full justify-center transition-colors"
                      >
                        <PlusIcon /> Agregar paso
                      </button>
                    )}
                  </div>
                </div>

                {/* Footer: nutritional highlight + tip */}
                <div className={`border-t-2 p-4 flex flex-col sm:flex-row gap-3 ${isE ? 'border-amber-300 bg-amber-50/50' : 'border-border-color bg-bg'}`}>
                  <div className="flex items-start gap-2 flex-1">
                    <span className="text-base shrink-0">📊</span>
                    {isE ? (
                      <textarea
                        className={`${editInputCls} flex-1 resize-none text-xs`}
                        rows={2}
                        placeholder="Aporte nutricional..."
                        value={recipe.nutritionalHighlight || ''}
                        onChange={e => mut(r => { r.recipes[idx].nutritionalHighlight = e.target.value; })}
                      />
                    ) : (
                      recipe.nutritionalHighlight && (
                        <p className="text-xs text-text-muted">
                          <span className="font-bold text-text-main">Aporte nutricional:</span> {recipe.nutritionalHighlight}
                        </p>
                      )
                    )}
                  </div>
                  <div className="flex items-start gap-2 flex-1">
                    <span className="text-base shrink-0">💡</span>
                    {isE ? (
                      <textarea
                        className={`${editInputCls} flex-1 resize-none text-xs`}
                        rows={2}
                        placeholder="Consejo práctico..."
                        value={recipe.tip || ''}
                        onChange={e => mut(r => { r.recipes[idx].tip = e.target.value; })}
                      />
                    ) : (
                      recipe.tip && (
                        <p className="text-xs text-text-muted">
                          <span className="font-bold text-text-main">Consejo:</span> {recipe.tip}
                        </p>
                      )
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>

        {/* Footer branding */}
        <div className="mt-8 pt-4 border-t border-border-color text-center text-xs text-text-muted print:mt-4">
          NuPlan · {reportCompanyName.toUpperCase()} · {new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
      </div>
    </div>
  );
}
