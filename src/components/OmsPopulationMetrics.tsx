import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../context/CompanyContext';

interface OmsPopulationMetricsProps {
  dateFrom?: string;
  dateTo?: string;
  isPrinting?: boolean;
}

export default function OmsPopulationMetrics({ dateFrom, dateTo, isPrinting }: OmsPopulationMetricsProps = {}) {
  const { selectedCompany, getCompanyType } = useCompany();
  const isFeria = getCompanyType(selectedCompany) === 'feria';
  const [loading, setLoading] = useState(true);
  // hasLoaded: true después del primer fetch (aunque venga vacío). Permite
  // mostrar el último valor durante refetches (ej: cuando se inicia un print
  // y cambian dateFrom/dateTo) en lugar del skeleton — que en el PDF salía
  // como cuadros grises vacíos.
  const [hasLoaded, setHasLoaded] = useState(false);
  const [metrics, setMetrics] = useState({
    imcNormal: 0,
    imcSobrepeso: 0,
    imcBajoPeso: 0,
    totalWithImc: 0,
    adherenceAvg: 0,
    hydrationPct: 0,
    participationPct: 0,
    fruitsPct: 0,
    activityPct: 0,
  });

  // En ferias/eventos ignoramos el filtro de fechas porque la feria es por
  // definición una sesión única — el "rango de fechas" no aplica y, si el
  // rango por defecto del modal del PDF (1 del mes a hoy) no cubre la fecha
  // exacta de la feria, las sesiones se descartan y hidratación/frutas/
  // actividad colapsan a 0% (IMC sobrevive porque viene de patients.initial_weight).
  const effectiveDateFrom = isFeria ? undefined : dateFrom;
  const effectiveDateTo   = isFeria ? undefined : dateTo;

  useEffect(() => {
    // Guarda anti-race: si el usuario cambia de empresa antes de que termine el
    // fetch, descartamos el resultado para que datos de la empresa anterior no
    // pisen los de la nueva. También evita que datos vacíos de una empresa
    // sin pacientes muestren los KPIs cacheados de la empresa anterior.
    let cancelled = false;
    fetchOmsMetrics(() => cancelled);
    return () => { cancelled = true; };
  }, [selectedCompany, effectiveDateFrom, effectiveDateTo]);

  async function fetchOmsMetrics(isCancelled: () => boolean) {
    setLoading(true);
    try {
      // Fetch all patients with their sessions
      if (effectiveDateFrom || effectiveDateTo) {
        // Use a separate sessions query filtered by date
        const { data: patients, error } = await supabase
          .from('patients')
          .select('id, initial_weight, height')
          .eq('company', selectedCompany);
        if (error) throw error;
        if (isCancelled()) return;
        if (!patients || patients.length === 0) { processMetrics([], isCancelled); return; }

        let sessQ = supabase.from('sessions').select('*').in('patient_id', patients.map(p => p.id));
        if (effectiveDateFrom) sessQ = sessQ.gte('session_date', effectiveDateFrom);
        if (effectiveDateTo)   sessQ = sessQ.lte('session_date', effectiveDateTo);
        const { data: allSessions } = await sessQ;
        if (isCancelled()) return;

        const sessionsByPatient: Record<string, any[]> = {};
        (allSessions || []).forEach((s: any) => {
          if (!sessionsByPatient[s.patient_id]) sessionsByPatient[s.patient_id] = [];
          sessionsByPatient[s.patient_id].push(s);
        });

        processMetrics(patients.map(p => ({ ...p, sessions: sessionsByPatient[p.id] || [] })), isCancelled);
        return;
      }

      const { data: patients, error } = await supabase
        .from('patients')
        .select('id, initial_weight, height, sessions(*)')
        .eq('company', selectedCompany);

      if (error) throw error;
      if (isCancelled()) return;

      processMetrics(patients || [], isCancelled);
    } catch (err) {
      console.error('Error fetching OMS population metrics:', err);
      if (!isCancelled()) {
        // En caso de error, también reseteamos para no dejar datos cacheados de
        // una empresa anterior visibles bajo el indicador de carga.
        processMetrics([], isCancelled);
      }
    } finally {
      if (!isCancelled()) setLoading(false);
    }
  }

  function processMetrics(patients: any[], isCancelled?: () => boolean) {
    if (isCancelled?.()) return;
    // --- IMC Distribution ---
    let imcNormal = 0, imcSobrepeso = 0, imcBajoPeso = 0, totalWithImc = 0;
    const latestSessions: any[] = [];

    for (const p of patients) {
      const sorted = (p.sessions || []).sort(
        (a: any, b: any) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
      );
      const latest = sorted[0];
      if (latest) latestSessions.push(latest);

      const weight = latest?.weight || p.initial_weight;
      const height = p.height;
      if (weight && height) {
        const bmi = weight / Math.pow(height / 100, 2);
        totalWithImc++;
        if (bmi < 18.5) imcBajoPeso++;
        else if (bmi < 25) imcNormal++;
        else imcSobrepeso++;
      }
    }

    const adherenceValues = latestSessions.filter((s: any) => s.adherence != null).map((s: any) => s.adherence);
    const adherenceAvg = adherenceValues.length > 0
      ? adherenceValues.reduce((a: number, b: number) => a + b, 0) / adherenceValues.length : 0;

    const allSess = patients.flatMap(p => p.sessions || []);
    const sessWithHydration = allSess.filter((s: any) => s.hydration !== null && s.hydration !== undefined);
    const hydrationPct = sessWithHydration.length > 0
      ? Math.round((sessWithHydration.filter((s: any) => s.hydration === true).length / sessWithHydration.length) * 100) : 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activePatients = new Set(
      allSess.filter((s: any) => new Date(s.session_date) >= thirtyDaysAgo).map((s: any) => s.patient_id)
    );
    const participationPct = patients.length > 0 ? Math.round((activePatients.size / patients.length) * 100) : 0;

    const fruitsValues = latestSessions.filter((s: any) => s.consumo_frutas_verduras != null);
    const fruitsPct = fruitsValues.length > 0
      ? Math.round((fruitsValues.filter((s: any) => s.consumo_frutas_verduras >= 4).length / fruitsValues.length) * 100) : 0;

    const activityValues = latestSessions.filter((s: any) => s.physical_activity != null);
    const activityGood = activityValues.filter((s: any) =>
      s.physical_activity === '+150 min' || s.physical_activity === '3-4 días' || s.physical_activity === '5+ días'
    );
    const activityPct = activityValues.length > 0
      ? Math.round((activityGood.length / activityValues.length) * 100) : 0;

    setMetrics({ imcNormal, imcSobrepeso, imcBajoPeso, totalWithImc, adherenceAvg, hydrationPct, participationPct, fruitsPct, activityPct });
    setHasLoaded(true);
  }

  const imcNormalPct = metrics.totalWithImc > 0 ? Math.round((metrics.imcNormal / metrics.totalWithImc) * 100) : 0;
  const imcSobrepesoPct = metrics.totalWithImc > 0 ? Math.round((metrics.imcSobrepeso / metrics.totalWithImc) * 100) : 0;
  const imcBajoPesoPct = metrics.totalWithImc > 0 ? Math.round((metrics.imcBajoPeso / metrics.totalWithImc) * 100) : 0;

  // En ferias/eventos ocultamos métricas que requieren múltiples sesiones
  // (adherencia, índice de participación a 30 días). Las del formulario inicial
  // (IMC, hidratación, frutas/verduras, actividad) se mantienen.
  const omsCards = [
    {
      label: 'IMC Poblacional',
      value: `${imcNormalPct}%`,
      sublabel: 'Peso normal',
      detail: `${imcSobrepesoPct}% sobrepeso · ${imcBajoPesoPct}% bajo peso`,
      color: imcNormalPct >= 60 ? 'text-accent-dark' : 'text-warning',
      barPct: imcNormalPct,
      barColor: 'from-primary to-accent-dark',
      target: 'Meta OMS: >60% normopeso',
    },
    ...(isFeria ? [] : [{
      label: 'Adherencia Promedio',
      value: `${metrics.adherenceAvg.toFixed(1)}/5`,
      sublabel: '',
      detail: `Meta institucional: ≥4/5`,
      color: metrics.adherenceAvg >= 4 ? 'text-accent-dark' : 'text-warning',
      barPct: Math.round((metrics.adherenceAvg / 5) * 100),
      barColor: 'from-info to-[#60A5FA]',
      target: 'Meta OMS: ≥4/5',
    }]),
    {
      label: 'Hidratación Adecuada',
      value: `${metrics.hydrationPct}%`,
      sublabel: 'de sesiones',
      detail: 'Ref. OMS: ≥8 vasos/día',
      color: metrics.hydrationPct >= 80 ? 'text-accent-dark' : 'text-warning',
      barPct: metrics.hydrationPct,
      barColor: 'from-[#06B6D4] to-[#22D3EE]',
      target: 'Meta: ≥80%',
    },
    ...(isFeria ? [] : [{
      label: 'Índice Participación',
      value: `${metrics.participationPct}%`,
      sublabel: 'activos (30 días)',
      detail: `${(metrics.participationPct > 0 ? '' : 'Sin ')}pacientes con sesiones recientes`,
      color: metrics.participationPct >= 80 ? 'text-accent-dark' : 'text-warning',
      barPct: metrics.participationPct,
      barColor: 'from-[#8B5CF6] to-[#A78BFA]',
      target: 'Meta: ≥80%',
    }]),
    {
      label: 'Consumo Frutas/Verduras',
      value: `${metrics.fruitsPct}%`,
      sublabel: 'cumplimiento',
      detail: 'Ref. OMS: ≥400g/día (≥4/5)',
      color: metrics.fruitsPct >= 60 ? 'text-accent-dark' : 'text-warning',
      barPct: metrics.fruitsPct,
      barColor: 'from-[#10B981] to-[#34D399]',
      target: 'Meta: ≥60%',
    },
    {
      label: 'Actividad Física',
      value: `${metrics.activityPct}%`,
      sublabel: 'cumplimiento',
      detail: 'Ref. OMS: ≥150 min/semana (≥3 días)',
      color: metrics.activityPct >= 60 ? 'text-accent-dark' : 'text-warning',
      barPct: metrics.activityPct,
      barColor: 'from-[#F59E0B] to-[#FBBF24]',
      target: 'Meta: ≥60%',
    },
  ];

  return (
    <div className="mb-8 animate-in" style={{ animationDelay: '0.15s' }}>
      <div className="bg-surface border-2 border-border-color rounded-xl p-5 md:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold mb-1">Parámetros OMS Poblacionales</h3>
            <p className="text-sm text-text-muted">
              {isFeria
                ? 'Indicadores de salud de los pacientes atendidos en el evento'
                : 'Indicadores de salud de la población general de la empresa'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {omsCards.map((card, i) => (
            <div key={i} className="bg-bg rounded-xl p-4 border border-transparent hover:border-primary/20 transition-all group">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted group-hover:text-primary transition-colors">
                  {card.label}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                {loading && !hasLoaded && !isPrinting ? (
                  <div className="h-8 w-16 bg-border-color animate-pulse rounded" />
                ) : (
                  <>
                    <span className={`text-2xl font-bold font-mono ${card.color}`}>{card.value}</span>
                    {card.sublabel && <span className="text-sm text-text-muted">{card.sublabel}</span>}
                  </>
                )}
              </div>
              <div className="h-2 rounded-full bg-border-color overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${card.barColor}`}
                  style={{ width: (loading && !hasLoaded && !isPrinting) ? '0%' : `${card.barPct}%` }}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-muted">{card.detail}</span>
                <span className="text-[0.65rem] font-semibold text-text-muted opacity-60">{card.target}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
