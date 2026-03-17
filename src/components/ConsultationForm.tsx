import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Building2, Monitor } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useCompany } from '../context/CompanyContext';
import SuccessModal from './SuccessModal';

export default function ConsultationForm({ onComplete }: { onComplete?: () => void }) {
  const { showToast } = useToast();
  const { selectedCompany } = useCompany();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingPatients, setFetchingPatients] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    patient_id: '',
    session_date: new Date().toISOString().split('T')[0],
    modality: 'Presencial',
    duration_minutes: 45,
    weight: '',
    height: '',
    girth_waist: '',
    laboratorio_alterado: '',
    consumo_frutas_verduras: 3,
    hydration: true,
    physical_activity: '3-4 días',
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

  async function fetchPatients() {
    setFetchingPatients(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name')
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

      const { error: sessionError } = await supabase.from('sessions').insert([sessionData]);
      if (sessionError) throw sessionError;

      await supabase.from('patients').update({ status: formData.overall_status }).eq('id', formData.patient_id);

      setShowSuccessModal(true);
      showToast('Consulta registrada exitosamente', 'success');
      setFormData({
        patient_id: '',
        session_date: new Date().toISOString().split('T')[0],
        modality: 'Presencial',
        duration_minutes: 45,
        weight: '',
        height: '',
        girth_waist: '',
        laboratorio_alterado: '',
        consumo_frutas_verduras: 3,
        hydration: true,
        physical_activity: '3-4 días',
        adherence: 5,
        energy_level: 4,
        sleep_quality: 4,
        overall_status: 'En Progreso',
        achievements: '',
        difficulties: ''
      });
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

  return (
    <div className="bg-surface border-2 border-border-color rounded-xl p-5 md:p-8 mb-8 animate-in" style={{ animationDelay: '0.3s' }}>
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-2 mb-6">
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" /></svg>
          Nueva Consulta
        </h2>
        <div className="text-text-muted text-xs md:text-sm">Seguimiento clínico del paciente</div>
      </div>

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
            <select className={inputClass} value={formData.patient_id} onChange={e => setFormData({ ...formData, patient_id: e.target.value })} disabled={fetchingPatients}>
              <option value="">{fetchingPatients ? 'Cargando...' : 'Seleccionar paciente...'}</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.last_name}, {p.first_name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Fecha</label>
            <input type="date" className={inputClass} value={formData.session_date} onChange={e => setFormData({ ...formData, session_date: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Modalidad</label>
            <div className="relative group/mod">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none">
                {formData.modality === 'Presencial' ? <Building2 size={18} strokeWidth={2.5} /> : <Monitor size={18} strokeWidth={2.5} />}
              </div>
              <select className={`w-full pl-10 pr-4 py-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all cursor-pointer font-bold text-primary`} value={formData.modality} onChange={e => setFormData({ ...formData, modality: e.target.value })}>
                <option value="Presencial">Presencial</option>
                <option value="Online">Online</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Duración</label>
            <select className={inputClass + ' cursor-pointer'} value={formData.duration_minutes} onChange={e => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}>
              <option value="30">30 minutos</option>
              <option value="45">45 minutos</option>
              <option value="60">60 minutos</option>
            </select>
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
              <select className={inputClass + ' cursor-pointer'} value={formData.adherence} onChange={e => setFormData({ ...formData, adherence: parseInt(e.target.value) })}>
                <option value="1">1 - Muy Baja</option>
                <option value="2">2 - Baja</option>
                <option value="3">3 - Media</option>
                <option value="4">4 - Alta</option>
                <option value="5">5 - Muy Alta</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Nivel de Energía</label>
              <select className={inputClass + ' cursor-pointer'} value={formData.energy_level} onChange={e => setFormData({ ...formData, energy_level: parseInt(e.target.value) })}>
                <option value="1">1 - Muy Bajo</option>
                <option value="2">2 - Bajo</option>
                <option value="3">3 - Normal</option>
                <option value="4">4 - Alto</option>
                <option value="5">5 - Muy Alto</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Calidad de Sueño</label>
              <select className={inputClass + ' cursor-pointer'} value={formData.sleep_quality} onChange={e => setFormData({ ...formData, sleep_quality: parseInt(e.target.value) })}>
                <option value="1">1 - Muy Mala</option>
                <option value="2">2 - Mala</option>
                <option value="3">3 - Regular</option>
                <option value="4">4 - Buena</option>
                <option value="5">5 - Excelente</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Hidratación Adecuada</label>
              <select className={inputClass + ' cursor-pointer'} value={formData.hydration ? 'Sí' : 'No'} onChange={e => setFormData({ ...formData, hydration: e.target.value === 'Sí' })}>
                <option value="No">No</option>
                <option value="Sí">Sí</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Actividad Física Semanal</label>
              <select className={inputClass + ' cursor-pointer'} value={formData.physical_activity} onChange={e => setFormData({ ...formData, physical_activity: e.target.value })}>
                <option value="0 días">0 días</option>
                <option value="1-2 días">1-2 días</option>
                <option value="3-4 días">3-4 días</option>
                <option value="5+ días">5+ días</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Consumo Frutas y Verduras</label>
              <select className={inputClass + ' cursor-pointer'} value={formData.consumo_frutas_verduras} onChange={e => setFormData({ ...formData, consumo_frutas_verduras: parseInt(e.target.value) })}>
                <option value="1">1 - Muy Bajo</option>
                <option value="2">2 - Bajo</option>
                <option value="3">3 - Regular</option>
                <option value="4">4 - Bueno</option>
                <option value="5">5 - Excelente</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Estado General</label>
              <select className={inputClass + ' cursor-pointer'} value={formData.overall_status} onChange={e => setFormData({ ...formData, overall_status: e.target.value })}>
                <option value="En Progreso">En Progreso</option>
                <option value="Objetivo Alcanzado">Objetivo Alcanzado</option>
                <option value="En Riesgo">En Riesgo</option>
                <option value="Requiere Derivación">Requiere Derivación</option>
              </select>
            </div>
          </div>
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
