import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../context/CompanyContext';

export default function Parameters() {
  const { selectedCompany } = useCompany();
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientData, setPatientData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, [selectedCompany]);

  async function fetchPatients() {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name')
        .eq('company', selectedCompany)
        .order('last_name', { ascending: true });
      if (error) throw error;
      setPatients(data || []);
      if (data && data.length > 0) {
        setSelectedPatientId(data[0].id);
      } else {
        setSelectedPatientId('');
        setPatientData(null);
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
    }
  }

  useEffect(() => {
    if (selectedPatientId) {
      fetchPatientSessions();
    }
  }, [selectedPatientId]);

  async function fetchPatientSessions() {
    setLoading(true);
    try {
      // Fetch patient with all sessions
      const { data, error } = await supabase
        .from('patients')
        .select(`*, sessions (*)`)
        .eq('id', selectedPatientId)
        .single();
      if (error) throw error;

      // Fetch total patients in this company for participation index
      const { count: totalPatients } = await supabase
        .from('patients')
        .select('id', { count: 'exact', head: true })
        .eq('company', data.company || 'Galeno');

      const sortedSessions = (data.sessions || []).sort((a: any, b: any) =>
        new Date(a.session_date).getTime() - new Date(b.session_date).getTime()
      );

      const initial = sortedSessions[0] || { weight: data.initial_weight };
      const latest = sortedSessions[sortedSessions.length - 1] || initial;

      // ── IMC ──
      const imcInitial = data.height && data.initial_weight
        ? (data.initial_weight / Math.pow(data.height / 100, 2)).toFixed(1) : '-';
      const imcActual = data.height && latest.weight
        ? (latest.weight / Math.pow(data.height / 100, 2)).toFixed(1) : '-';
      const imcVal = parseFloat(imcActual);
      const imcOk = imcVal >= 18.5 && imcVal < 25;

      // ── Adherencia ──
      const adherenceOk = (latest.adherence || 0) >= 4;

      // ── Hidratación (% sesiones con hidratación adecuada) ──
      const sessionsWithHydration = sortedSessions.filter((s: any) => s.hydration === true).length;
      const hydrationPct = sortedSessions.length > 0
        ? Math.round((sessionsWithHydration / sortedSessions.length) * 100) : 0;
      const hydrationOk = hydrationPct >= 80;

      // ── Índice de participación (% pacientes empresa con ≥1 sesión en 30 días) ──
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: activePatientsData } = await supabase
        .from('sessions')
        .select('patient_id')
        .eq('company', data.company || 'Galeno')
        .gte('session_date', thirtyDaysAgo.toISOString().split('T')[0]);
      const uniqueActive = new Set((activePatientsData || []).map((s: any) => s.patient_id)).size;
      const participationPct = totalPatients ? Math.round((uniqueActive / totalPatients) * 100) : 0;
      const participationOk = participationPct >= 80;

      // ── Consumo frutas y verduras (% sesiones con puntaje ≥4) ──
      const sessionsWithFruits = sortedSessions.filter((s: any) => (s.consumo_frutas_verduras || 0) >= 4).length;
      const fruitsPct = sortedSessions.length > 0
        ? Math.round((sessionsWithFruits / sortedSessions.length) * 100) : 0;
      const fruitsOk = fruitsPct >= 60;

      // ── Actividad física (% sesiones con ≥3 días/semana) ──
      const sessionsWithActivity = sortedSessions.filter((s: any) =>
        s.physical_activity === '3-4 días' || s.physical_activity === '5+ días'
      ).length;
      const activityPct = sortedSessions.length > 0
        ? Math.round((sessionsWithActivity / sortedSessions.length) * 100) : 0;
      const activityOk = activityPct >= 60;

      const latestFruitsScore = latest.consumo_frutas_verduras || 0;
      const fruitLabel = latestFruitsScore >= 4 ? 'Adecuado' : latestFruitsScore >= 2 ? 'Mejorable' : 'Insuficiente';

      const params = [
        {
          name: 'Índice de Masa Corporal (IMC)',
          initial: imcInitial,
          actual: imcActual,
          target: '18.5–24.9',
          progress: imcOk ? 100 : Math.max(10, 100 - Math.abs(imcVal - 22) * 8),
          status: imcOk ? 'Normal' : imcVal < 18.5 ? 'Bajo Peso' : 'Sobrepeso',
          statusColor: imcOk ? 'normal' : 'alert',
          note: 'OMS: 18.5–24.9 = Normal',
          noteValue: latest.weight && data.initial_weight ? `${(latest.weight - data.initial_weight).toFixed(1)} kg` : '—'
        },
        {
          name: 'Adherencia al Plan',
          initial: initial.adherence || '-',
          actual: latest.adherence || '-',
          target: '5',
          progress: ((latest.adherence || 0) / 5) * 100,
          status: adherenceOk ? 'Cumple' : 'En Riesgo',
          statusColor: adherenceOk ? 'normal' : 'risk',
          note: 'Meta institucional: ≥4/5',
          noteValue: `${latest.adherence || 0}/5`
        },
        {
          name: 'Hidratación',
          initial: '-',
          actual: `${hydrationPct}%`,
          target: '≥80%',
          progress: hydrationPct,
          status: hydrationOk ? 'Adecuada' : 'Mejorar',
          statusColor: hydrationOk ? 'normal' : 'alert',
          note: 'OMS: ≥8 vasos/día recomendados',
          noteValue: `${sessionsWithHydration}/${sortedSessions.length} sesiones`
        },
        {
          name: 'Índice de Participación',
          initial: '-',
          actual: `${participationPct}%`,
          target: '≥80%',
          progress: participationPct,
          status: participationOk ? 'Óptimo' : participationPct >= 60 ? 'Moderado' : 'Bajo',
          statusColor: participationOk ? 'normal' : participationPct >= 60 ? 'alert' : 'risk',
          note: `Pacientes activos en últimos 30 días`,
          noteValue: `${uniqueActive}/${totalPatients || '?'}`
        },
        {
          name: 'Consumo de Frutas y Verduras',
          initial: '-',
          actual: fruitLabel,
          target: '≥60% sesiones',
          progress: fruitsPct,
          status: fruitsOk ? 'Adecuado' : 'Mejorar',
          statusColor: fruitsOk ? 'normal' : 'alert',
          note: 'OMS: ≥400g frutas y verduras/día',
          noteValue: `Último: ${latestFruitsScore}/5`
        },
        {
          name: 'Actividad Física',
          initial: initial.physical_activity || '-',
          actual: latest.physical_activity || '-',
          target: '≥3 días/sem',
          progress: activityPct,
          status: activityOk ? 'Cumple' : 'Insuficiente',
          statusColor: activityOk ? 'normal' : 'risk',
          note: 'OMS: ≥150 min moderada/semana',
          noteValue: `${sessionsWithActivity}/${sortedSessions.length} sesiones`
        },
      ];

      setPatientData({
        ...data,
        name: `${data.first_name} ${data.last_name}`,
        params,
        eval: {
          cumple: params.filter(p => p.statusColor === 'normal').length,
          total: params.length,
          text: 'Continuar con el monitoreo regular.',
          rec: params.filter(p => p.statusColor !== 'normal').map(p => p.name).join(', ')
            ? `Trabajar en: ${params.filter(p => p.statusColor !== 'normal').map(p => p.name).join(', ')}.`
            : 'Todos los parámetros están dentro del rango óptimo. ¡Excelente trabajo!'
        }
      });
    } catch (err) {
      console.error('Error fetching patient sessions:', err);
    } finally {
      setLoading(false);
    }
  }

  const getStatusClasses = (statusColor: string) => {
    switch (statusColor) {
      case 'normal':
        return 'bg-accent/15 text-primary';
      case 'alert':
        return 'bg-warning/15 text-[#D97706]';
      case 'risk':
        return 'bg-danger/15 text-danger';
      default:
        return '';
    }
  };

  const getProgressClasses = (statusColor: string) => {
    switch (statusColor) {
      case 'normal':
        return 'bg-accent-dark';
      case 'alert':
        return 'bg-warning';
      case 'risk':
        return 'bg-danger';
      default:
        return '';
    }
  };

  if (!patientData && patients.length > 0) return (
    <div className="bg-surface border-2 border-border-color rounded-xl p-8 mb-8 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
    </div>
  );

  if (patients.length === 0) return (
    <div className="bg-surface border-2 border-border-color rounded-xl p-8 mb-8 text-center text-text-muted">
      No hay pacientes registrados para esta empresa.
    </div>
  );

  return (
    <div className="bg-surface border-2 border-border-color rounded-xl p-8 mb-8 animate-in" style={{ animationDelay: '0.4s' }}>
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">📈 Parámetros OMS</h2>
          <div className="text-text-muted text-sm">Evolución según estándares internacionales</div>
        </div>
        <div className="flex items-center gap-3 relative">
          <label className="text-[0.85rem] font-semibold uppercase tracking-widest text-text-muted">Paciente:</label>
          <select
            className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all font-semibold w-[250px] cursor-pointer"
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
          >
            {patients.map(p => (
              <option key={p.id} value={p.id}>{p.last_name}, {p.first_name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="text-text-muted">Analizando evolución...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {patientData.params.map((param: any, i: number) => (
              <div key={i} className="bg-bg border-l-4 border-primary rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-base">{param.name}</span>
                  <span className={`px-3 py-1 rounded-md text-[0.8rem] font-semibold ${getStatusClasses(param.statusColor)}`}>
                    {param.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-[0.75rem] text-text-muted uppercase mb-1">Inicial</div>
                    <div className="font-mono font-bold text-[1.1rem]">{param.initial}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[0.75rem] text-text-muted uppercase mb-1">Actual</div>
                    <div className="font-mono font-bold text-[1.1rem] text-accent-dark">{param.actual}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[0.75rem] text-text-muted uppercase mb-1">Objetivo</div>
                    <div className="font-mono font-bold text-[1.1rem]">{param.target}</div>
                  </div>
                </div>
                <div className="h-2 bg-border-color rounded-full relative overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${getProgressClasses(param.statusColor)}`} style={{ width: `${param.progress}%` }}></div>
                </div>
                <div className="mt-3 text-[0.85rem] text-text-muted">
                  {param.note} <strong className="text-accent-dark">{param.noteValue}</strong>
                </div>
              </div>
            ))}
          </div>

          <div className={`rounded-xl p-8 mt-8 text-white ${patientData.eval.cumple >= 2 ? 'bg-gradient-to-br from-primary to-primary-light' : 'bg-gradient-to-br from-danger to-red-700'}`}>
            <h3 className="text-[1.3rem] font-bold mb-4">
              {patientData.eval.cumple >= 2 ? '✅' : '⚠️'} Evaluación General OMS
            </h3>
            <div className="text-[1.1rem] leading-[1.8]">
              <strong>{patientData.name}</strong> cumple con <strong>{patientData.eval.cumple} de {patientData.eval.total}</strong> parámetros evaluados.<br />
              <strong>{patientData.eval.text}</strong><br />
              <strong>Recomendación:</strong> {patientData.eval.rec}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
