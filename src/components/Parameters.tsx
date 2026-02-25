import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Parameters() {
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientData, setPatientData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  async function fetchPatients() {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name')
        .order('last_name', { ascending: true });
      if (error) throw error;
      setPatients(data || []);
      if (data && data.length > 0) {
        setSelectedPatientId(data[0].id);
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
      const { data, error } = await supabase
        .from('patients')
        .select(`
          *,
          sessions (*)
        `)
        .eq('id', selectedPatientId)
        .single();

      if (error) throw error;

      // Sort sessions by date
      const sortedSessions = data.sessions?.sort((a: any, b: any) =>
        new Date(a.session_date).getTime() - new Date(b.session_date).getTime()
      ) || [];

      const initial = sortedSessions[0] || { weight: data.initial_weight };
      const latest = sortedSessions[sortedSessions.length - 1] || initial;

      // Mocking some baseline targets/notes for the demo based on OMS standards
      const params = [
        {
          name: 'Índice de Masa Corporal (IMC)',
          initial: data.height ? (data.initial_weight / Math.pow(data.height / 100, 2)).toFixed(1) : '-',
          actual: data.height && latest.weight ? (latest.weight / Math.pow(data.height / 100, 2)).toFixed(1) : '-',
          target: '24.9',
          progress: 80, // Mocked progress
          status: 'Normal',
          statusColor: 'normal',
          note: 'OMS: 18.5-24.9 = Normal',
          noteValue: latest.weight && data.initial_weight ? `${(latest.weight - data.initial_weight).toFixed(1)}kg` : '0kg'
        },
        {
          name: 'Presión Arterial',
          initial: initial.systolic_bp ? `${initial.systolic_bp}/${initial.diastolic_bp}` : '-',
          actual: latest.systolic_bp ? `${latest.systolic_bp}/${latest.diastolic_bp}` : '-',
          target: '120/80',
          progress: 90,
          status: latest.systolic_bp && latest.systolic_bp < 130 ? 'Normal' : 'Alerta',
          statusColor: latest.systolic_bp && latest.systolic_bp < 130 ? 'normal' : 'alert',
          note: 'OMS: <120/80 = Óptima',
          noteValue: 'Estable'
        },
        {
          name: 'Adherencia al Plan',
          initial: initial.adherence || '-',
          actual: latest.adherence || '-',
          target: '5',
          progress: (latest.adherence / 5) * 100 || 0,
          status: latest.adherence >= 4 ? 'Cumple' : 'En Riesgo',
          statusColor: latest.adherence >= 4 ? 'normal' : 'risk',
          note: 'Nivel auto-reportado',
          noteValue: `${latest.adherence}/5`
        }
      ];

      setPatientData({
        ...data,
        name: `${data.first_name} ${data.last_name}`,
        params,
        eval: {
          cumple: params.filter(p => p.statusColor === 'normal').length,
          total: params.length,
          text: 'Continuar con el monitoreo regular.',
          rec: 'Se recomienda mantener la hidratación y el nivel de actividad actual.'
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

  if (!patientData) return null;

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
