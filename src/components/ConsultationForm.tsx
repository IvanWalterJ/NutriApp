import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { todayLocalISODate, parseLocalDate } from '../lib/dateUtils';
import { useToast } from '../context/ToastContext';
import { useCompany } from '../context/CompanyContext';
import CustomSelect from './ui/CustomSelect';
import SuccessModal from './SuccessModal';
import LabResultsForm, { EMPTY_LAB_VALUES, LabFormValues, labFormToPayload } from './LabResultsForm';
import { History, X as IconX } from 'lucide-react';

function shiftISODate(iso: string, days: number): string {
  const d = parseLocalDate(iso);
  if (!d) return todayLocalISODate();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface ConsultationFormProps {
  onComplete?: () => void;
  /** Si se pasa, el paciente queda preseleccionado al montar el componente */
  preselectedPatientId?: string | null;
}

export default function ConsultationForm({ onComplete, preselectedPatientId }: ConsultationFormProps) {
  const { showToast } = useToast();
  const { selectedCompany } = useCompany();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingPatients, setFetchingPatients] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [historicalMode, setHistoricalMode] = useState(false);
  const [historicalCount, setHistoricalCount] = useState(0);
  const [labValues, setLabValues] = useState<LabFormValues>(EMPTY_LAB_VALUES);
  const [patientSex, setPatientSex] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    patient_id: preselectedPatientId || '',
    session_date: todayLocalISODate(),
    modality: 'Presencial',
    duration_minutes: 45,
    weight: '',
    height: '',
    girth_waist: '',
    laboratorio_alterado: '',
    consumo_frutas_verduras: 3,
    hydration: true,
    physical_activity: '+150 min',
    adherence: 5,
    energy_level: 4,
    sleep_quality: 4,
    overall_status: 'En Progreso',
    achievements: '',
    difficulties: ''
  });

  useEffect(() => {
    fetchPatients();
  }, [selectedCompany]);

  // Precargar peso, talla y cintura con el último valor no nulo del paciente
  // (la nutricionista los puede editar si la medida cambió en esta consulta).
  useEffect(() => {
    let cancelled = false;
    if (!formData.patient_id) return;

    const prefillMeasurements = async () => {
      const latestMeasure = async (column: 'weight' | 'height' | 'girth_waist'): Promise<number | null> => {
        let query = supabase
          .from('sessions')
          .select('weight, height, girth_waist, session_date')
          .eq('patient_id', formData.patient_id)
          .not(column, 'is', null);
        // En modo histórico, sólo mirar sesiones anteriores a la fecha que se está cargando
        // para evitar prefillear con valores de consultas más recientes.
        if (historicalMode && formData.session_date) {
          query = query.lt('session_date', formData.session_date);
        }
        const { data } = await query
          .order('session_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1);
        const row = data?.[0] as any;
        return row?.[column] ?? null;
      };

      try {
        const [latestWeight, latestHeight, latestWaist] = await Promise.all([
          latestMeasure('weight'),
          latestMeasure('height'),
          latestMeasure('girth_waist'),
        ]);
        if (cancelled) return;

        setFormData(prev => ({
          ...prev,
          weight: latestWeight != null ? String(latestWeight) : prev.weight,
          height: latestHeight != null ? String(latestHeight) : prev.height,
          girth_waist: latestWaist != null ? String(latestWaist) : prev.girth_waist,
        }));
      } catch (err) {
        if (!cancelled) console.error('Error precargando medidas del paciente:', err);
      }
    };

    prefillMeasurements();
    return () => { cancelled = true; };
    // En modo histórico re-disparamos el prefill cuando cambia la fecha porque
    // la última medida "anterior" depende de session_date.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.patient_id, historicalMode ? formData.session_date : null]);

  async function fetchPatients() {
    setFetchingPatients(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, sex')
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

  // Mantenemos sincronizado el sexo del paciente para clasificar HDL correctamente
  useEffect(() => {
    if (!formData.patient_id) { setPatientSex(null); return; }
    const p = patients.find(x => x.id === formData.patient_id);
    setPatientSex(p?.sex ?? null);
  }, [formData.patient_id, patients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.patient_id) {
      setMessage({ type: 'error', text: 'Por favor selecciona un paciente.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!formData.session_date) {
      setMessage({ type: 'error', text: 'Por favor indica la fecha de la consulta.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { data: userData } = await supabase.auth.getUser();

      const sessionData: any = {
        patient_id: formData.patient_id,
        nutritionist_id: userData.user?.id,
        session_date: formData.session_date,
        modality: formData.modality,
        duration_minutes: formData.duration_minutes,
        company: selectedCompany,
        session_type: 'Consulta',
        adherence: formData.adherence,
        energy_level: formData.energy_level,
        sleep_quality: formData.sleep_quality,
        hydration: formData.hydration,
        physical_activity: formData.physical_activity,
        overall_status: formData.overall_status,
        achievements: formData.achievements,
        difficulties: formData.difficulties,
        laboratorio_alterado: formData.laboratorio_alterado || null,
        consumo_frutas_verduras: formData.consumo_frutas_verduras,
      };

      if (formData.weight) sessionData.weight = parseFloat(formData.weight);
      if (formData.height) sessionData.height = parseFloat(formData.height);
      if (formData.girth_waist) sessionData.girth_waist = parseFloat(formData.girth_waist);

      const { data: sessionInserted, error: sessionError } = await supabase
        .from('sessions')
        .insert([sessionData])
        .select('id')
        .single();
      if (sessionError) throw sessionError;
      const newSessionId: string | null = sessionInserted?.id ?? null;

      // Si hay valores de laboratorio cargados, insertamos un row asociado a la
      // consulta. Si falla, no rompemos el guardado de la consulta — sólo
      // mostramos un warning en consola y un toast informativo.
      const labPayload = labFormToPayload(labValues, formData.patient_id, newSessionId, formData.session_date);
      if (labPayload) {
        try {
          const { error: labError } = await supabase.from('lab_results').insert([{
            ...labPayload,
            created_by: userData.user?.id,
          }]);
          if (labError) {
            console.error('Error guardando laboratorio:', labError);
            showToast('La consulta se guardó pero el laboratorio no pudo registrarse', 'error');
          }
        } catch (labErr) {
          console.error('Error guardando laboratorio:', labErr);
        }
      }

      // En modo histórico evitamos pisar el estado del paciente con la consulta
      // que se está cargando, porque puede ser una consulta antigua y dejaría el
      // estado actual del paciente desactualizado.
      if (!historicalMode) {
        const { error: patientError } = await supabase.from('patients').update({ status: formData.overall_status }).eq('id', formData.patient_id);
        if (patientError) throw patientError;
      }

      if (historicalMode) {
        // No mostramos el modal (rompería el flujo de carga rápida) y mantenemos
        // el paciente seleccionado. Sugerimos una fecha 30 días anterior a la
        // recién cargada como punto de partida para la próxima.
        const nextDate = shiftISODate(formData.session_date, -30);
        setHistoricalCount(c => c + 1);
        showToast('Consulta histórica cargada', 'success');
        setFormData(prev => ({
          ...prev,
          session_date: nextDate,
          // limpiamos sólo los campos que cambian de consulta a consulta
          weight: '',
          height: '',
          girth_waist: '',
          laboratorio_alterado: '',
          achievements: '',
          difficulties: ''
        }));
        // El laboratorio sí se limpia siempre — cada consulta tiene su propio set
        setLabValues(EMPTY_LAB_VALUES);
      } else {
        setShowSuccessModal(true);
        showToast('Consulta registrada exitosamente', 'success');
        setFormData({
          patient_id: '',
          session_date: todayLocalISODate(),
          modality: 'Presencial',
          duration_minutes: 45,
          weight: '',
          height: '',
          girth_waist: '',
          laboratorio_alterado: '',
          consumo_frutas_verduras: 3,
          hydration: true,
          physical_activity: '+150 min',
          adherence: 5,
          energy_level: 4,
          sleep_quality: 4,
          overall_status: 'En Progreso',
          achievements: '',
          difficulties: ''
        });
        setLabValues(EMPTY_LAB_VALUES);
      }
    } catch (err: any) {
      const errorText = err.message || 'Error al guardar la consulta';
      setMessage({ type: 'error', text: errorText });
      showToast(errorText, 'error');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all';
  const labelClass = 'text-[0.85rem] font-semibold uppercase tracking-widest';

  function activateHistoricalMode() {
    setHistoricalMode(true);
    setHistoricalCount(0);
    setMessage(null);
    // Sugerimos arrancar 30 días atrás para diferenciarlo de "consulta de hoy"
    setFormData(prev => ({
      ...prev,
      session_date: shiftISODate(todayLocalISODate(), -30),
    }));
  }

  function exitHistoricalMode() {
    setHistoricalMode(false);
    setHistoricalCount(0);
    setMessage(null);
    setFormData({
      patient_id: '',
      session_date: todayLocalISODate(),
      modality: 'Presencial',
      duration_minutes: 45,
      weight: '',
      height: '',
      girth_waist: '',
      laboratorio_alterado: '',
      consumo_frutas_verduras: 3,
      hydration: true,
      physical_activity: '+150 min',
      adherence: 5,
      energy_level: 4,
      sleep_quality: 4,
      overall_status: 'En Progreso',
      achievements: '',
      difficulties: ''
    });
    setLabValues(EMPTY_LAB_VALUES);
  }

  const selectedPatientLabel = (() => {
    const p = patients.find(x => x.id === formData.patient_id);
    return p ? `${p.last_name}, ${p.first_name}` : null;
  })();

  return (
    <div className="bg-surface border-2 border-border-color rounded-xl p-5 md:p-8 mb-8 animate-in" style={{ animationDelay: '0.3s' }}>
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 mb-6">
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" /></svg>
          {historicalMode ? 'Cargar Consultas Históricas' : 'Nueva Consulta'}
        </h2>
        <div className="flex items-center gap-3">
          <div className="text-text-muted text-xs md:text-sm hidden md:block">
            {historicalMode ? 'Carga rápida de consultas pasadas' : 'Seguimiento clínico del paciente'}
          </div>
          {!historicalMode ? (
            <button
              type="button"
              onClick={activateHistoricalMode}
              className="px-4 py-2 border-2 border-primary/40 bg-primary/5 text-primary rounded-lg font-semibold text-xs md:text-sm transition-all hover:bg-primary hover:text-white active:scale-95 flex items-center gap-2"
              title="Cargar varias consultas pasadas del mismo paciente sin reseleccionarlo cada vez"
            >
              <History size={15} strokeWidth={2.5} />
              Cargar consultas históricas
            </button>
          ) : (
            <button
              type="button"
              onClick={exitHistoricalMode}
              className="px-4 py-2 border-2 border-border-color text-text-main rounded-lg font-semibold text-xs md:text-sm transition-all hover:bg-bg active:scale-95 flex items-center gap-2"
            >
              <IconX size={15} strokeWidth={2.5} />
              Terminar carga histórica
            </button>
          )}
        </div>
      </div>

      {historicalMode && (
        <div className="mb-6 p-4 rounded-lg border-2 border-primary/30 bg-primary/5 text-sm flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <History size={16} strokeWidth={2.5} />
            <span>
              Modo histórico activo
              {selectedPatientLabel ? ` · Paciente: ${selectedPatientLabel}` : ' · Seleccioná un paciente'}
            </span>
          </div>
          <div className="text-text-muted text-xs md:text-sm">
            Consultas cargadas en esta sesión: <strong className="text-primary">{historicalCount}</strong>
          </div>
        </div>
      )}

      {message && (
        <div className={`p-4 rounded-lg mb-6 text-sm font-semibold ${message.type === 'success' ? 'bg-primary/10 text-primary border border-primary' : 'bg-danger/10 text-danger border border-danger'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Header row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 border-b-2 border-border-color pb-6">
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Paciente</label>
            <CustomSelect
              value={formData.patient_id}
              onChange={v => setFormData({ ...formData, patient_id: v })}
              disabled={fetchingPatients}
              placeholder={fetchingPatients ? 'Cargando...' : 'Seleccionar paciente...'}
              options={patients.map(p => ({ value: p.id, label: `${p.last_name}, ${p.first_name}` }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Fecha</label>
            <input type="date" className={inputClass} value={formData.session_date} onChange={e => setFormData({ ...formData, session_date: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Modalidad</label>
            <CustomSelect
              value={formData.modality}
              onChange={v => setFormData({ ...formData, modality: v })}
              options={[
                { value: 'Presencial', label: 'Presencial', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
                { value: 'Online', label: 'Online', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
              ]}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Duración</label>
            <CustomSelect
              value={String(formData.duration_minutes)}
              onChange={v => setFormData({ ...formData, duration_minutes: parseInt(v) })}
              options={[
                { value: '30', label: '30 minutos' },
                { value: '45', label: '45 minutos' },
                { value: '60', label: '60 minutos' },
              ]}
            />
          </div>
        </div>

        {/* Medidas básicas */}
        <div className="bg-bg p-4 md:p-6 rounded-2xl mb-6 border border-border-color shadow-sm">
          <h3 className="text-lg font-bold mb-4 text-primary flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v5H3z" /><line x1="7" y1="8" x2="7" y2="13" /><line x1="12" y1="8" x2="12" y2="11" /><line x1="17" y1="8" x2="17" y2="13" /><path d="M3 13h18v8H3z" /></svg>
            Medidas de la Consulta
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Peso (kg)</label>
              <input type="number" step="0.1" placeholder="Ej: 72.5" className={inputClass + ' font-mono'} value={formData.weight} onChange={e => setFormData({ ...formData, weight: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Talla (cm)</label>
              <input type="number" step="0.1" placeholder="Ej: 165.0" className={inputClass + ' font-mono'} value={formData.height} onChange={e => setFormData({ ...formData, height: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Circunferencia de Cintura (cm)</label>
              <input type="number" step="0.1" placeholder="Ej: 85.0" className={inputClass + ' font-mono'} value={formData.girth_waist} onChange={e => setFormData({ ...formData, girth_waist: e.target.value })} />
            </div>
          </div>
          <div className="mt-4">
            <label className={labelClass}>Laboratorio Alterado</label>
            <textarea
              className={inputClass + ' w-full mt-2 min-h-[90px] resize-y'}
              placeholder="Ej: Glucemia en ayunas 115 mg/dL (elevada). Colesterol total 220 mg/dL. Triglicéridos normales."
              value={formData.laboratorio_alterado}
              onChange={e => setFormData({ ...formData, laboratorio_alterado: e.target.value })}
            />
          </div>
        </div>

        {/* Evaluación nutricional */}
        <div className="bg-bg p-4 md:p-6 rounded-2xl mb-6 border border-border-color shadow-sm">
          <h3 className="text-lg font-bold mb-4 text-primary flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            Evaluación Nutricional
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Adherencia al Plan</label>
              <CustomSelect value={String(formData.adherence)} onChange={v => setFormData({ ...formData, adherence: parseInt(v) })} options={[{value:'1',label:'1 - Muy Baja'},{value:'2',label:'2 - Baja'},{value:'3',label:'3 - Media'},{value:'4',label:'4 - Alta'},{value:'5',label:'5 - Muy Alta'}]} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Nivel de Energía</label>
              <CustomSelect value={String(formData.energy_level)} onChange={v => setFormData({ ...formData, energy_level: parseInt(v) })} options={[{value:'1',label:'1 - Muy Bajo'},{value:'2',label:'2 - Bajo'},{value:'3',label:'3 - Normal'},{value:'4',label:'4 - Alto'},{value:'5',label:'5 - Muy Alto'}]} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Calidad de Sueño</label>
              <CustomSelect value={String(formData.sleep_quality)} onChange={v => setFormData({ ...formData, sleep_quality: parseInt(v) })} options={[{value:'1',label:'1 - Muy Mala'},{value:'2',label:'2 - Mala'},{value:'3',label:'3 - Regular'},{value:'4',label:'4 - Buena'},{value:'5',label:'5 - Excelente'}]} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Hidratación Adecuada</label>
              <CustomSelect value={formData.hydration ? 'Sí' : 'No'} onChange={v => setFormData({ ...formData, hydration: v === 'Sí' })} options={[{value:'No',label:'No'},{value:'Sí',label:'Sí'}]} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Actividad Física Semanal</label>
              <CustomSelect value={formData.physical_activity} onChange={v => setFormData({ ...formData, physical_activity: v })} options={[{value:'≤150 min',label:'≤150 min/semana'},{value:'+150 min',label:'+150 min/semana'}]} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Consumo Frutas y Verduras</label>
              <CustomSelect value={String(formData.consumo_frutas_verduras)} onChange={v => setFormData({ ...formData, consumo_frutas_verduras: parseInt(v) })} options={[{value:'1',label:'1 - Muy Bajo'},{value:'2',label:'2 - Bajo'},{value:'3',label:'3 - Regular'},{value:'4',label:'4 - Bueno'},{value:'5',label:'5 - Excelente'}]} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Estado General</label>
              <CustomSelect value={formData.overall_status} onChange={v => setFormData({ ...formData, overall_status: v })} options={[{value:'En Progreso',label:'En Progreso'},{value:'Objetivo Alcanzado',label:'Objetivo Alcanzado'},{value:'En Riesgo',label:'En Riesgo'},{value:'Requiere Derivación',label:'Requiere Derivación'}]} />
            </div>
          </div>
        </div>

        {/* Laboratorio (opcional, plegable) */}
        <div className="mb-6">
          <LabResultsForm
            value={labValues}
            onChange={setLabValues}
            patientSex={patientSex}
            collapsible
            title="Laboratorio (opcional)"
            subtitle="Glucemia, lípidos, vitamina D, presión — para seguimiento metabólico"
          />
        </div>

        {/* Logros y dificultades */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Principales Logros</label>
            <textarea
              className={inputClass + ' min-h-[100px] resize-y'}
              placeholder="Ej: Completó 4 días de actividad física. Mejoró hidratación."
              value={formData.achievements}
              onChange={e => setFormData({ ...formData, achievements: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Dificultades y Ajustes</label>
            <textarea
              className={inputClass + ' min-h-[100px] resize-y'}
              placeholder="Ej: Dificultad para cenar temprano. Ajustamos distribución de macros."
              value={formData.difficulties}
              onChange={e => setFormData({ ...formData, difficulties: e.target.value })}
            />
          </div>
        </div>

        <div className="flex flex-col-reverse md:flex-row gap-4 justify-end mt-8 pt-6 border-t-2 border-border-color">
          <button type="button" className="w-full md:w-auto px-8 py-3.5 bg-bg text-text-main border-2 border-border-color rounded-xl font-bold text-base transition-all hover:bg-surface hover:border-primary active:scale-95" onClick={() => window.location.reload()}>
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="w-full md:w-auto px-8 py-3.5 bg-gradient-to-br from-primary to-primary-light text-white rounded-xl font-bold text-base transition-all hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(10,77,60,0.3)] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Registrar Consulta
              </>
            )}
          </button>
        </div>
      </form>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => { setShowSuccessModal(false); if (onComplete) onComplete(); }}
        title="¡Consulta Guardada!"
        message="La consulta del paciente ha sido registrada y los datos han sido actualizados."
      />
    </div>
  );
}
