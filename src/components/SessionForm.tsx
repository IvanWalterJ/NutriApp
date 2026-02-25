import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import SuccessModal from './SuccessModal';

export default function SessionForm({ onComplete }: { onComplete?: () => void }) {
  const { showToast } = useToast();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingPatients, setFetchingPatients] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [formData, setFormData] = useState({
    patient_id: '',
    session_date: new Date().toISOString().split('T')[0],
    duration_minutes: 45,
    weight: '',
    body_fat_pct: '',
    waist_cm: '',
    systolic_bp: '',
    diastolic_bp: '',
    heart_rate: '',
    adherence: 5,
    energy_level: 4,
    sleep_quality: 4,
    hydration: true,
    physical_activity: '3-4 días',
    overall_status: 'En Progreso',
    achievements: '',
    difficulties: ''
  });

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
    } catch (err) {
      console.error('Error fetching patients:', err);
    } finally {
      setFetchingPatients(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patient_id) {
      setMessage({ type: 'error', text: 'Por favor selecciona un paciente' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error: sessionError } = await supabase
        .from('sessions')
        .insert([{
          patient_id: formData.patient_id,
          nutritionist_id: userData.user?.id,
          session_date: formData.session_date,
          duration_minutes: formData.duration_minutes,
          weight: parseFloat(formData.weight),
          body_fat_pct: formData.body_fat_pct ? parseFloat(formData.body_fat_pct) : null,
          waist_cm: formData.waist_cm ? parseFloat(formData.waist_cm) : null,
          systolic_bp: formData.systolic_bp ? parseInt(formData.systolic_bp) : null,
          diastolic_bp: formData.diastolic_bp ? parseInt(formData.diastolic_bp) : null,
          heart_rate: formData.heart_rate ? parseInt(formData.heart_rate) : null,
          adherence: formData.adherence,
          energy_level: formData.energy_level,
          sleep_quality: formData.sleep_quality,
          hydration: formData.hydration,
          physical_activity: formData.physical_activity,
          overall_status: formData.overall_status,
          achievements: formData.achievements,
          difficulties: formData.difficulties
        }]);

      if (sessionError) throw sessionError;

      // Update patient status
      const { error: patientError } = await supabase
        .from('patients')
        .update({ status: formData.overall_status })
        .eq('id', formData.patient_id);

      if (patientError) throw patientError;

      setMessage({ type: 'success', text: 'Sesión registrada exitosamente' });
      setShowSuccessModal(true);
      showToast('Sesión registrada exitosamente', 'success');
      // Reset form
      setFormData({
        ...formData,
        patient_id: '',
        weight: '',
        body_fat_pct: '',
        waist_cm: '',
        systolic_bp: '',
        diastolic_bp: '',
        heart_rate: '',
        achievements: '',
        difficulties: ''
      });
    } catch (err: any) {
      console.error('Error saving session:', err);
      setMessage({ type: 'error', text: err.message || 'Error al guardar la sesión' });
      showToast(err.message || 'Error al guardar la sesión', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface border-2 border-border-color rounded-xl p-8 mb-8 animate-in" style={{ animationDelay: '0.3s' }}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" /></svg>
          Registro de Sesión
        </h2>
        <div className="text-text-muted text-sm">Completar después de cada consulta (2-3 minutos)</div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 text-sm font-semibold ${message.type === 'success' ? 'bg-primary/10 text-primary border border-primary' : 'bg-danger/10 text-danger border border-danger'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="flex flex-col gap-2">
            <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Paciente</label>
            <select
              required
              className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all cursor-pointer"
              value={formData.patient_id}
              onChange={e => setFormData({ ...formData, patient_id: e.target.value })}
              disabled={fetchingPatients}
            >
              <option value="">{fetchingPatients ? 'Cargando...' : 'Seleccionar paciente...'}</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.last_name}, {p.first_name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Fecha Sesión</label>
            <input
              type="date"
              required
              className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all"
              value={formData.session_date}
              onChange={e => setFormData({ ...formData, session_date: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Duración</label>
            <select
              className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all cursor-pointer"
              value={formData.duration_minutes}
              onChange={e => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
            >
              <option value="30">30 minutos</option>
              <option value="45">45 minutos</option>
              <option value="60">60 minutos</option>
            </select>
          </div>
        </div>

        <div className="bg-bg p-6 rounded-2xl mb-6 border border-border-color hover-lift card-transition shadow-sm group">
          <h3 className="text-lg font-bold mb-4 text-primary flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
            Métricas Físicas (OMS)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Peso Actual (kg)</label>
              <input
                type="number"
                step="0.1"
                required
                className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all font-mono font-bold"
                placeholder="68.5"
                value={formData.weight}
                onChange={e => setFormData({ ...formData, weight: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[0.85rem] font-semibold uppercase tracking-widest">% Grasa Corporal</label>
              <input
                type="number"
                step="0.1"
                className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all font-mono font-bold"
                placeholder="24.3"
                value={formData.body_fat_pct}
                onChange={e => setFormData({ ...formData, body_fat_pct: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Perímetro Cintura (cm)</label>
              <input
                type="number"
                step="0.1"
                className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all font-mono font-bold"
                placeholder="82.5"
                value={formData.waist_cm}
                onChange={e => setFormData({ ...formData, waist_cm: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Presión Sistólica</label>
              <input
                type="number"
                className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all font-mono font-bold"
                placeholder="120"
                value={formData.systolic_bp}
                onChange={e => setFormData({ ...formData, systolic_bp: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Presión Diastólica</label>
              <input
                type="number"
                className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all font-mono font-bold"
                placeholder="80"
                value={formData.diastolic_bp}
                onChange={e => setFormData({ ...formData, diastolic_bp: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Frecuencia Cardíaca</label>
              <input
                type="number"
                className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all font-mono font-bold"
                placeholder="72"
                value={formData.heart_rate}
                onChange={e => setFormData({ ...formData, heart_rate: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="bg-bg p-6 rounded-2xl mb-6 border border-border-color hover-lift card-transition shadow-sm group">
          <h3 className="text-lg font-bold mb-4 text-primary flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            Evaluación Nutricional
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Adherencia al Plan</label>
              <select
                className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all cursor-pointer"
                value={formData.adherence}
                onChange={e => setFormData({ ...formData, adherence: parseInt(e.target.value) })}
              >
                <option value="1">1 - Muy Baja</option>
                <option value="2">2 - Baja</option>
                <option value="3">3 - Media</option>
                <option value="4">4 - Alta</option>
                <option value="5">5 - Muy Alta</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Nivel de Energía</label>
              <select
                className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all cursor-pointer"
                value={formData.energy_level}
                onChange={e => setFormData({ ...formData, energy_level: parseInt(e.target.value) })}
              >
                <option value="1">1 - Muy Bajo</option>
                <option value="2">2 - Bajo</option>
                <option value="3">3 - Normal</option>
                <option value="4">4 - Alto</option>
                <option value="5">5 - Muy Alto</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Calidad de Sueño</label>
              <select
                className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all cursor-pointer"
                value={formData.sleep_quality}
                onChange={e => setFormData({ ...formData, sleep_quality: parseInt(e.target.value) })}
              >
                <option value="1">1 - Muy Mala</option>
                <option value="2">2 - Mala</option>
                <option value="3">3 - Regular</option>
                <option value="4">4 - Buena</option>
                <option value="5">5 - Excelente</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Hidratación Adecuada</label>
              <select
                className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all cursor-pointer"
                value={formData.hydration ? 'Sí' : 'No'}
                onChange={e => setFormData({ ...formData, hydration: e.target.value === 'Sí' })}
              >
                <option value="No">No</option>
                <option value="Sí">Sí</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Actividad Física Semanal</label>
              <select
                className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all cursor-pointer"
                value={formData.physical_activity}
                onChange={e => setFormData({ ...formData, physical_activity: e.target.value })}
              >
                <option value="0 días">0 días</option>
                <option value="1-2 días">1-2 días</option>
                <option value="3-4 días">3-4 días</option>
                <option value="5+ días">5+ días</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Estado General</label>
              <select
                className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all cursor-pointer"
                value={formData.overall_status}
                onChange={e => setFormData({ ...formData, overall_status: e.target.value })}
              >
                <option value="En Progreso">En Progreso</option>
                <option value="Objetivo Alcanzado">Objetivo Alcanzado</option>
                <option value="En Riesgo">En Riesgo</option>
                <option value="Requiere Derivación">Requiere Derivación</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Principales Logros</label>
            <textarea
              className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all min-h-[100px] resize-y"
              placeholder="Ej: Completó 4 días de actividad física. Mejoró hidratación. Redujo consumo de azúcares."
              value={formData.achievements}
              onChange={e => setFormData({ ...formData, achievements: e.target.value })}
            ></textarea>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Dificultades y Ajustes</label>
            <textarea
              className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all min-h-[100px] resize-y"
              placeholder="Ej: Dificultad para cenar temprano por horarios laborales. Ajustamos distribución de macros."
              value={formData.difficulties}
              onChange={e => setFormData({ ...formData, difficulties: e.target.value })}
            ></textarea>
          </div>
        </div>

        <div className="flex gap-4 justify-end mt-8 pt-6 border-t-2 border-border-color">
          <button
            type="button"
            className="px-8 py-4 bg-bg text-text-main border-2 border-border-color rounded-xl font-bold text-base transition-all hover:bg-surface hover:border-primary active:scale-95"
            onClick={() => window.location.reload()}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-4 bg-gradient-to-br from-primary to-primary-light text-white rounded-xl font-bold text-base transition-all hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(10,77,60,0.3)] active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
            ) : '✓ Registrar Sesión'}
          </button>
        </div>
      </form>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          if (onComplete) onComplete();
        }}
        title="¡Sesión Guardada!"
        message="La sesión del paciente ha sido registrada y los datos han sido actualizados."
      />
    </div>
  );
}
