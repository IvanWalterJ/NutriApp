import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, Edit2, Save, Trash2, X, AlertTriangle, Loader2, CalendarDays, Activity,
  TrendingUp, Ruler, Heart, FlaskConical, FileText, Plus, Stethoscope,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { formatLocalDate, todayLocalISODate } from '../lib/dateUtils';
import { useToast } from '../context/ToastContext';
import LabTimeline from './LabTimeline';
import LabResultsForm, { EMPTY_LAB_VALUES, LabFormValues, labFormToPayload } from './LabResultsForm';
import AnthroReportButton from './AnthroReportButton';
import { assessPatientRisk, deriveStatus, RiskFlag } from '../lib/patientRisk';
import { CONSULTATION_REASONS } from '../lib/nutritionConstants';

// ─── Helpers ──────────────────────────────────────────────────────────────

function getStatusClasses(color?: string): string {
  switch (color) {
    case 'success': return 'bg-accent/10 text-primary border border-accent/30';
    case 'danger':  return 'bg-danger/10 text-danger border border-danger/30';
    default:        return 'bg-warning/10 text-warning border border-warning/30';
  }
}

function getStatusDotClasses(color?: string): string {
  switch (color) {
    case 'success': return 'bg-primary';
    case 'danger':  return 'bg-danger';
    default:        return 'bg-warning';
  }
}

function processPatient(p: any, latestLab?: any) {
  const sessions = (p.sessions ?? []) as any[];

  const lastSession = sessions.reduce((best: any, current: any) => {
    if (!best) return current;
    const diff = new Date(current.session_date).getTime() - new Date(best.session_date).getTime();
    return diff >= 0 ? current : best;
  }, null);

  const lastWithWeight = sessions.reduce((best: any, current: any) => {
    if (current.weight == null) return best;
    if (!best) return current;
    const diff = new Date(current.session_date).getTime() - new Date(best.session_date).getTime();
    return diff >= 0 ? current : best;
  }, null);

  const lastWithHeight = sessions.reduce((best: any, current: any) => {
    if (current.height == null) return best;
    if (!best) return current;
    const diff = new Date(current.session_date).getTime() - new Date(best.session_date).getTime();
    return diff >= 0 ? current : best;
  }, null);

  const currentWeight = lastWithWeight?.weight ?? p.initial_weight ?? null;
  const currentHeight = lastWithHeight?.height ?? p.height ?? null;
  const weightChangeNum = lastWithWeight && p.initial_weight
    ? Number((lastWithWeight.weight - p.initial_weight).toFixed(1))
    : 0;
  const lossPctNum = lastWithWeight && p.initial_weight
    ? Number((((lastWithWeight.weight - p.initial_weight) / p.initial_weight) * 100).toFixed(1))
    : 0;
  const imc = currentWeight && currentHeight
    ? Number((currentWeight / Math.pow(currentHeight / 100, 2)).toFixed(1))
    : null;

  const lastWithWaist = sessions.reduce((best: any, current: any) => {
    if (current.girth_waist == null) return best;
    if (!best) return current;
    const diff = new Date(current.session_date).getTime() - new Date(best.session_date).getTime();
    return diff >= 0 ? current : best;
  }, null);

  const assessment = assessPatientRisk({
    sex: p.sex,
    height: currentHeight,
    weight: currentWeight,
    waist: lastWithWaist?.girth_waist ?? null,
    lab: latestLab ?? null,
  });

  const manualStatus = p.status ?? lastSession?.overall_status ?? 'En Progreso';
  const status = deriveStatus(manualStatus, assessment);
  const statusColor = status === 'Objetivo Alcanzado' ? 'success'
    : status === 'En Riesgo' ? 'danger'
    : 'warning';

  return {
    ...p,
    name: `${p.first_name} ${p.last_name}`,
    sessions,
    currentWeight,
    currentHeight,
    weightChangeNum,
    lossPctNum,
    imc,
    lastAdherence: lastSession?.adherence ?? 0,
    manualStatus,
    status,
    statusColor,
    riskFlags: assessment.flags as RiskFlag[],
  };
}

// ─── Componente ──────────────────────────────────────────────────────────

interface PatientDetailViewProps {
  patientId: string;
  onBack: () => void;
  /** Navegar a un tab del sidebar (ej. 'consulta') con el paciente preseleccionado */
  onNavigate?: (tab: string, patientId: string) => void;
}

type TabKey = 'resumen' | 'laboratorio' | 'medidas' | 'historial';

const TAB_DEFS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'resumen',     label: 'Resumen',     icon: <TrendingUp size={16} strokeWidth={2.5} /> },
  { key: 'laboratorio', label: 'Laboratorio', icon: <FlaskConical size={16} strokeWidth={2.5} /> },
  { key: 'medidas',     label: 'Medidas',     icon: <Ruler size={16} strokeWidth={2.5} /> },
  { key: 'historial',   label: 'Historial',   icon: <CalendarDays size={16} strokeWidth={2.5} /> },
];

export default function PatientDetailView({ patientId, onBack, onNavigate }: PatientDetailViewProps) {
  const { showToast } = useToast();
  const [patient, setPatient] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('resumen');

  // Estado para edición / borrado / sesión seleccionada
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteSession, setConfirmDeleteSession] = useState<any | null>(null);
  const [deletingSession, setDeletingSession] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [editingSession, setEditingSession] = useState(false);
  const [sessionEditData, setSessionEditData] = useState<any>({});
  const [savingSession, setSavingSession] = useState(false);

  // Modal "Cargar nuevo laboratorio" en tab Laboratorio
  const [showLabModal, setShowLabModal] = useState(false);
  const [labForm, setLabForm] = useState<LabFormValues>(EMPTY_LAB_VALUES);
  const [savingLab, setSavingLab] = useState(false);
  const [labRefreshKey, setLabRefreshKey] = useState(0);

  async function fetchPatient() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*, sessions (*)')
        .eq('id', patientId)
        .single();
      if (error) throw error;
      const { data: labs } = await supabase
        .from('lab_results')
        .select('lab_date, glucose, hba1c, total_cholesterol, ldl, hdl, triglycerides, bp_systolic, bp_diastolic')
        .eq('patient_id', patientId)
        .order('lab_date', { ascending: false })
        .limit(1);
      const latestLab = labs?.[0] ?? null;
      setPatient(processPatient(data, latestLab));
    } catch (err) {
      console.error('Error fetching patient:', err);
      showToast('No se pudo cargar el paciente', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPatient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  async function handleSaveEdit() {
    if (savingEdit) return;
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('patients')
        .update({
          area: editData.area,
          email: editData.email || null,
          phone: editData.phone || null,
          birth_date: editData.birth_date || null,
        })
        .eq('id', patientId);
      if (error) throw error;
      showToast('Datos actualizados', 'success');
      setIsEditing(false);
      fetchPatient();
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'No se pudo actualizar', 'error');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeletePatient() {
    if (deleting) return;
    setDeleting(true);
    try {
      const { error: sessionsError } = await supabase
        .from('sessions')
        .delete()
        .eq('patient_id', patientId);
      if (sessionsError) throw sessionsError;
      const { data, error } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('No se pudo eliminar el paciente. Verificá los permisos (RLS) en Supabase.');
      }
      showToast('Paciente eliminado correctamente', 'success');
      setConfirmDelete(false);
      onBack();
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'Error al eliminar paciente', 'error');
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteSession() {
    const target = confirmDeleteSession;
    if (!target || deletingSession) return;
    setDeletingSession(true);
    try {
      const { data, error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', target.id)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('No se pudo eliminar la consulta. Verificá los permisos (RLS) en Supabase.');
      }
      showToast('Consulta eliminada del historial', 'success');
      setConfirmDeleteSession(null);
      // Cerramos el detalle si era la sesión abierta y recargamos: las métricas,
      // gráficos y KPIs del paciente se recalculan desde las sesiones restantes.
      setSelectedSession(prev => (prev && prev.id === target.id ? null : prev));
      setEditingSession(false);
      setSessionEditData({});
      await fetchPatient();
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'Error al eliminar la consulta', 'error');
    } finally {
      setDeletingSession(false);
    }
  }

  async function handleSaveLab() {
    if (savingLab) return;
    const payload = labFormToPayload(labForm, patientId, null, todayLocalISODate());
    if (!payload) {
      showToast('Cargá al menos un valor', 'error');
      return;
    }
    setSavingLab(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('lab_results').insert([{
        ...payload,
        created_by: user?.id,
      }]);
      if (error) throw error;
      showToast('Laboratorio cargado', 'success');
      setLabForm(EMPTY_LAB_VALUES);
      setShowLabModal(false);
      setLabRefreshKey(k => k + 1);
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'No se pudo guardar el laboratorio', 'error');
    } finally {
      setSavingLab(false);
    }
  }

  async function handleSaveSessionEdit() {
    if (!selectedSession || savingSession) return;
    setSavingSession(true);
    try {
      const toNumOrNull = (v: any) => {
        if (v === '' || v === null || v === undefined) return null;
        const n = typeof v === 'number' ? v : parseFloat(String(v));
        return Number.isFinite(n) ? n : null;
      };
      const numericKeys = [
        'weight', 'height', 'girth_waist', 'duration_minutes',
        'adherence', 'energy_level', 'sleep_quality', 'consumo_frutas_verduras',
      ];
      const textKeys = [
        'session_date', 'modality', 'physical_activity', 'overall_status',
        'laboratorio_alterado', 'achievements', 'difficulties',
        'consultation_reason', 'consultation_notes',
      ];
      const patch: Record<string, any> = {};
      for (const k of numericKeys) {
        if (k in sessionEditData) patch[k] = toNumOrNull(sessionEditData[k]);
      }
      for (const k of textKeys) {
        if (k in sessionEditData) patch[k] = sessionEditData[k] === '' ? null : sessionEditData[k];
      }
      if ('hydration' in sessionEditData) {
        patch.hydration = sessionEditData.hydration === true || sessionEditData.hydration === 'true';
      }
      if (!patch.session_date) {
        showToast('La fecha de la sesión es obligatoria', 'error');
        setSavingSession(false);
        return;
      }
      const { error } = await supabase.from('sessions').update(patch).eq('id', selectedSession.id);
      if (error) throw error;
      showToast('Sesión actualizada', 'success');
      setEditingSession(false);
      setSessionEditData({});
      const updated = await fetchAndReturnSession(selectedSession.id);
      if (updated) setSelectedSession(updated);
      fetchPatient();
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'No se pudo actualizar la sesión', 'error');
    } finally {
      setSavingSession(false);
    }
  }

  async function fetchAndReturnSession(sessionId: string): Promise<any | null> {
    const { data } = await supabase.from('sessions').select('*').eq('id', sessionId).single();
    return data ?? null;
  }

  // ─── Render ──

  if (loading || !patient) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PatientHeader
        patient={patient}
        isEditing={isEditing}
        editData={editData}
        savingEdit={savingEdit}
        onBack={onBack}
        onStartEdit={() => {
          setEditData({
            area: patient.area || '',
            email: patient.email || '',
            phone: patient.phone || '',
            birth_date: patient.birth_date || '',
          });
          setIsEditing(true);
        }}
        onCancelEdit={() => setIsEditing(false)}
        onChangeEdit={(k, v) => setEditData((prev: any) => ({ ...prev, [k]: v }))}
        onSaveEdit={handleSaveEdit}
        onAskDelete={() => setConfirmDelete(true)}
      />

      <KpiCards patient={patient} />

      <Tabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'resumen' && <TabResumen patient={patient} />}

      {activeTab === 'laboratorio' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowLabModal(true)}
              className="px-4 py-2 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary-light transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus size={16} strokeWidth={2.5} /> Cargar nuevo laboratorio
            </button>
          </div>
          <LabTimeline patientId={patient.id} patientSex={patient.sex} refreshKey={labRefreshKey} />
        </div>
      )}

      {activeTab === 'medidas' && (
        <TabMedidas patient={patient} onSelectSession={setSelectedSession} />
      )}

      {activeTab === 'historial' && (
        <TabHistorial
          patient={patient}
          onSelectSession={setSelectedSession}
          onEditSession={(s) => {
            setSelectedSession(s);
            setSessionEditData({ ...s });
            setEditingSession(true);
          }}
          onNewConsultation={() => onNavigate?.('consulta', patient.id)}
          onNewAnthropometry={() => onNavigate?.('antropometria', patient.id)}
          onPatientUpdated={fetchPatient}
        />
      )}

      {/* Modal: Cargar nuevo laboratorio */}
      {showLabModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-2xl border-2 border-border-color max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="sticky top-0 bg-surface border-b-2 border-border-color px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                <FlaskConical size={20} className="text-primary" /> Cargar nuevo laboratorio
              </h3>
              <button onClick={() => { if (!savingLab) { setShowLabModal(false); setLabForm(EMPTY_LAB_VALUES); } }} className="p-2 rounded-lg hover:bg-bg text-text-muted">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <LabResultsForm value={labForm} onChange={setLabForm} patientSex={patient.sex} title="Valores" />
            </div>
            <div className="sticky bottom-0 bg-surface border-t-2 border-border-color px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => { setShowLabModal(false); setLabForm(EMPTY_LAB_VALUES); }}
                disabled={savingLab}
                className="px-5 py-2 bg-bg border-2 border-border-color rounded-xl font-semibold hover:bg-surface hover:border-primary transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveLab}
                disabled={savingLab}
                className="px-5 py-2 bg-gradient-to-br from-primary to-primary-light text-white rounded-xl font-semibold hover:-translate-y-0.5 hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {savingLab && <Loader2 size={16} className="animate-spin" />} Guardar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: detalle / edición de sesión */}
      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          editing={editingSession}
          editData={sessionEditData}
          saving={savingSession}
          onClose={() => { setSelectedSession(null); setEditingSession(false); setSessionEditData({}); }}
          onStartEdit={() => { setSessionEditData({ ...selectedSession }); setEditingSession(true); }}
          onCancelEdit={() => { setEditingSession(false); setSessionEditData({}); }}
          onChangeEdit={(k, v) => setSessionEditData((prev: any) => ({ ...prev, [k]: v }))}
          onSave={handleSaveSessionEdit}
          onDelete={() => setConfirmDeleteSession(selectedSession)}
        />
      )}

      {/* Modal: confirmar borrado */}
      {confirmDelete && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !deleting && setConfirmDelete(false)} />
          <div className="relative z-10 bg-surface rounded-2xl shadow-2xl border-2 border-border-color max-w-sm w-full p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="shrink-0 w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center text-danger">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-text-main">Eliminar paciente</h3>
                <p className="text-sm text-text-muted mt-1">
                  ¿Segura que querés eliminar a <strong className="text-text-main">"{patient.name}"</strong>?
                </p>
              </div>
            </div>
            <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 mb-6 text-sm text-text-main">
              <p className="font-semibold text-warning mb-1">Importante</p>
              <p>Se eliminarán también <strong>todas las sesiones, antropometrías y laboratorios</strong> registrados de este paciente.</p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="px-4 py-2 bg-bg border-2 border-border-color rounded-xl font-semibold hover:bg-surface hover:border-primary transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeletePatient}
                disabled={deleting}
                className="px-4 py-2 bg-danger text-white rounded-xl font-semibold hover:bg-danger/90 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {deleting && <Loader2 size={16} className="animate-spin" />} Eliminar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: confirmar borrado de una consulta del historial */}
      {confirmDeleteSession && createPortal(
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !deletingSession && setConfirmDeleteSession(null)} />
          <div className="relative z-10 bg-surface rounded-2xl shadow-2xl border-2 border-border-color max-w-sm w-full p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="shrink-0 w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center text-danger">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-text-main">Eliminar consulta</h3>
                <p className="text-sm text-text-muted mt-1">
                  ¿Segura que querés eliminar la consulta del{' '}
                  <strong className="text-text-main">{formatLocalDate(confirmDeleteSession.session_date)}</strong>
                  {confirmDeleteSession.session_type ? ` (${confirmDeleteSession.session_type})` : ''}?
                </p>
              </div>
            </div>
            <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 mb-6 text-sm text-text-main">
              <p className="font-semibold text-warning mb-1">Importante</p>
              <p>Se quitará del historial y de <strong>todos los cálculos, métricas y gráficos</strong> del paciente. Esta acción no se puede deshacer.</p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteSession(null)}
                disabled={deletingSession}
                className="px-4 py-2 bg-bg border-2 border-border-color rounded-xl font-semibold hover:bg-surface hover:border-primary transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteSession}
                disabled={deletingSession}
                className="px-4 py-2 bg-danger text-white rounded-xl font-semibold hover:bg-danger/90 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {deletingSession && <Loader2 size={16} className="animate-spin" />} Eliminar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────

interface PatientHeaderProps {
  patient: any;
  isEditing: boolean;
  editData: any;
  savingEdit: boolean;
  onBack: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onChangeEdit: (key: string, value: string) => void;
  onSaveEdit: () => void;
  onAskDelete: () => void;
}

function PatientHeader({
  patient, isEditing, editData, savingEdit,
  onBack, onStartEdit, onCancelEdit, onChangeEdit, onSaveEdit, onAskDelete,
}: PatientHeaderProps) {
  const initials = (patient.first_name?.[0] || '') + (patient.last_name?.[0] || '');
  return (
    <div className="bg-surface border-2 border-border-color rounded-2xl p-5 md:p-6 shadow-sm">
      <button
        onClick={onBack}
        className="text-sm font-semibold text-text-muted hover:text-primary flex items-center gap-1.5 mb-4 transition-colors"
      >
        <ArrowLeft size={16} strokeWidth={2.5} /> Volver a Pacientes
      </button>

      <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
        <div className="shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-light text-white flex items-center justify-center text-2xl font-black uppercase shadow-md">
          {initials || '?'}
        </div>
        <div className="grow">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-text-main flex items-center gap-3 flex-wrap">
                {patient.name}
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusClasses(patient.statusColor)}`}>
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${getStatusDotClasses(patient.statusColor)}`}></span>
                  {patient.status}
                </span>
              </h2>
              {!isEditing && (
                <>
                  <div className="text-sm text-text-muted mt-1">
                    {patient.email || 'Sin email'} {patient.phone ? `· ${patient.phone}` : ''}
                  </div>
                  {patient.riskFlags && patient.riskFlags.length > 0 && (
                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs font-bold">
                      <AlertTriangle size={14} strokeWidth={2.5} />
                      {patient.riskFlags.length} factor{patient.riskFlags.length === 1 ? '' : 'es'} de salud en rojo
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-2 shrink-0">
              {!isEditing ? (
                <>
                  <button
                    onClick={onStartEdit}
                    className="px-3 py-2 border-2 border-border-color bg-surface hover:border-primary hover:text-primary rounded-xl transition-all shadow-sm active:scale-95 text-text-muted flex items-center gap-1.5 text-sm font-bold"
                  >
                    <Edit2 size={15} /> Editar
                  </button>
                  <button
                    onClick={onAskDelete}
                    className="px-3 py-2 border-2 border-border-color bg-surface hover:border-danger hover:text-danger hover:bg-danger/5 rounded-xl transition-all shadow-sm active:scale-95 text-text-muted flex items-center gap-1.5 text-sm font-bold"
                  >
                    <Trash2 size={15} /> Eliminar
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onCancelEdit}
                    disabled={savingEdit}
                    className="px-3 py-2 border-2 border-border-color bg-surface hover:bg-bg rounded-xl text-sm font-bold text-text-muted disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={onSaveEdit}
                    disabled={savingEdit}
                    className="px-4 py-2 bg-primary text-white rounded-xl shadow-md hover:bg-primary-light transition-all flex items-center gap-1.5 font-bold text-sm disabled:opacity-50"
                  >
                    {savingEdit ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    Guardar cambios
                  </button>
                </>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 bg-bg p-4 rounded-xl border border-border-color">
              <div>
                <label className="block text-[11px] font-bold text-primary mb-1 uppercase tracking-wider">Área</label>
                <select
                  className="w-full p-2 border border-border-color rounded text-sm bg-surface focus:outline-none focus:border-primary"
                  value={editData.area || ''}
                  onChange={e => onChangeEdit('area', e.target.value)}
                >
                  <option>Administración</option><option>Operaciones</option><option>Marketing</option>
                  <option>IT</option><option>Ventas</option><option>Finanzas</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-primary mb-1 uppercase tracking-wider">Email</label>
                <input type="email" className="w-full p-2 border border-border-color rounded text-sm bg-surface focus:outline-none focus:border-primary" value={editData.email || ''} onChange={e => onChangeEdit('email', e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-primary mb-1 uppercase tracking-wider">WhatsApp</label>
                <input type="text" className="w-full p-2 border border-border-color rounded text-sm bg-surface focus:outline-none focus:border-primary" value={editData.phone || ''} onChange={e => onChangeEdit('phone', e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-primary mb-1 uppercase tracking-wider">F. Nacimiento</label>
                <input type="date" className="w-full p-2 border border-border-color rounded text-sm bg-surface focus:outline-none focus:border-primary" value={editData.birth_date || ''} onChange={e => onChangeEdit('birth_date', e.target.value)} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCards({ patient }: { patient: any }) {
  const cards = [
    { label: 'Peso actual',     value: patient.currentWeight != null ? `${patient.currentWeight} kg` : '—', accent: 'primary' },
    { label: 'Altura',          value: patient.currentHeight != null ? `${patient.currentHeight} cm` : '—', accent: 'neutral' },
    { label: 'IMC',             value: patient.imc != null ? `${patient.imc}` : '—', accent: 'neutral' },
    { label: 'Adherencia',      value: patient.lastAdherence > 0 ? '⭐'.repeat(patient.lastAdherence) : '—', accent: 'neutral' },
    { label: 'Sesiones',        value: `${patient.sessions.length}`, accent: 'neutral' },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
      {cards.map((c, i) => (
        <div key={i} className={`p-4 rounded-xl border ${c.accent === 'primary' ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20' : 'bg-bg border-border-color'}`}>
          <h4 className={`text-[10px] uppercase tracking-widest font-black mb-1 ${c.accent === 'primary' ? 'text-primary/70' : 'text-text-muted'}`}>{c.label}</h4>
          <p className={`text-lg font-mono font-bold ${c.accent === 'primary' ? 'text-primary' : 'text-text-main'} tracking-tight`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

function Tabs({ activeTab, onChange }: { activeTab: TabKey; onChange: (k: TabKey) => void }) {
  return (
    <div className="bg-surface border-2 border-border-color rounded-2xl p-1.5 inline-flex gap-1 shadow-sm overflow-x-auto max-w-full">
      {TAB_DEFS.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === t.key
              ? 'bg-primary text-white shadow-sm'
              : 'text-text-muted hover:text-primary hover:bg-primary/5'
          }`}
        >
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Tab: Resumen ────────────────────────────────────────────────────────

function TabResumen({ patient }: { patient: any }) {
  const weightSeries = useMemo(() => {
    return [...(patient.sessions as any[])]
      .filter(s => s.weight != null)
      .sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime())
      .map(s => ({
        date: s.session_date,
        label: formatLocalDate(s.session_date, { day: '2-digit', month: 'short' }, 'es-AR'),
        weight: Number(s.weight),
      }));
  }, [patient]);

  const latestWaist = useMemo(() => {
    return (patient.sessions as any[])
      ?.filter((s: any) => s.girth_waist != null)
      .sort((a: any, b: any) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())[0];
  }, [patient]);

  const cvThreshold = patient.sex === 'Masculino' ? 94 : 80;
  const isCvRisk = latestWaist ? latestWaist.girth_waist > cvThreshold : false;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Evolución de peso (col 2 en desktop) */}
      <div className="lg:col-span-2 bg-surface border-2 border-border-color rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><TrendingUp size={18} /></div>
          <div>
            <h3 className="font-bold text-text-main">Evolución de peso</h3>
            <p className="text-xs text-text-muted">A partir de las sesiones registradas</p>
          </div>
        </div>
        {weightSeries.length >= 2 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightSeries} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} unit=" kg" />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  labelFormatter={(_v, payload: any) => {
                    const item = payload?.[0]?.payload;
                    return item ? formatLocalDate(item.date, { day: '2-digit', month: 'long', year: 'numeric' }, 'es-AR') : '';
                  }}
                  formatter={(v: any) => [`${v} kg`, 'Peso']}
                />
                <Line type="monotone" dataKey="weight" stroke="#E8472A" strokeWidth={2.5} dot={{ r: 4, fill: '#E8472A' }} activeDot={{ r: 6 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center bg-bg/50 border-2 border-dashed border-border-color rounded-xl">
            <Activity size={36} className="text-border-color mb-2" />
            <p className="text-sm font-semibold text-text-muted">Cargá al menos 2 sesiones con peso para ver la curva</p>
          </div>
        )}
      </div>

      {/* Variación de peso */}
      <div className="bg-surface border-2 border-border-color rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Stethoscope size={18} /></div>
          <h3 className="font-bold text-text-main">Variación de peso</h3>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-baseline border-b border-border-color pb-2">
            <span className="text-xs uppercase tracking-widest text-text-muted">Peso inicial</span>
            <span className="font-mono font-bold text-text-main">{patient.initial_weight} kg</span>
          </div>
          <div className="flex justify-between items-baseline border-b border-border-color pb-2">
            <span className="text-xs uppercase tracking-widest text-text-muted">Peso actual</span>
            <span className="font-mono font-bold text-primary">{patient.currentWeight ?? '—'} kg</span>
          </div>
          <div className="flex justify-between items-baseline border-b border-border-color pb-2">
            <span className="text-xs uppercase tracking-widest text-text-muted">Variación</span>
            <span className={`font-mono font-bold ${patient.weightChangeNum <= 0 ? 'text-accent-dark' : 'text-danger'}`}>
              {patient.weightChangeNum > 0 ? '+' : ''}{patient.weightChangeNum} kg
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-xs uppercase tracking-widest text-text-muted">Pérdida</span>
            <span className={`font-mono font-bold ${patient.lossPctNum <= 0 ? 'text-accent-dark' : 'text-danger'}`}>
              {patient.lossPctNum > 0 ? '+' : ''}{patient.lossPctNum}%
            </span>
          </div>
        </div>
      </div>

      {/* Contacto e identidad */}
      <div className="bg-surface border-2 border-border-color rounded-2xl p-5 shadow-sm lg:col-span-1">
        <h3 className="font-bold text-text-main mb-3 flex items-center gap-2">
          <FileText size={18} className="text-primary" /> Contacto e identidad
        </h3>
        <div className="space-y-2 text-sm">
          <Row label="Email" value={patient.email} />
          <Row label="WhatsApp" value={patient.phone} />
          <Row label="F. Nacimiento" value={patient.birth_date ? formatLocalDate(patient.birth_date, { day: '2-digit', month: '2-digit', year: 'numeric' }, 'es-AR') : null} />
          <Row label="Sexo" value={patient.sex} />
          <Row label="Área" value={patient.area} />
          <Row label="Empresa" value={patient.company} />
        </div>
      </div>

      {/* Riesgo cardiovascular */}
      <div className="lg:col-span-2 bg-surface border-2 border-border-color rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-text-main mb-3 flex items-center gap-2">
          <Heart size={18} className={isCvRisk ? 'text-danger' : 'text-primary'} /> Riesgo cardiovascular
        </h3>
        {latestWaist ? (
          <div className={`p-4 rounded-xl border-2 flex items-center gap-4 ${isCvRisk ? 'bg-danger/5 border-danger/20' : 'bg-accent/5 border-accent/20'}`}>
            <div className="text-3xl">{isCvRisk ? '⚠️' : '✅'}</div>
            <div className="grow">
              <div className="text-[10px] uppercase tracking-widest font-bold text-text-muted">Circunferencia de cintura</div>
              <div className="text-xl font-mono font-bold">{latestWaist.girth_waist} cm</div>
              <div className="text-xs text-text-muted">Umbral: {cvThreshold} cm ({patient.sex === 'Masculino' ? 'hombres' : 'mujeres'})</div>
            </div>
            <div className={`text-xs font-bold px-3 py-1.5 rounded-full ${isCvRisk ? 'bg-danger/10 text-danger' : 'bg-accent/10 text-primary'}`}>
              {isCvRisk ? 'Riesgo elevado' : 'Sin riesgo'}
            </div>
          </div>
        ) : (
          <div className="bg-bg/50 border-2 border-dashed border-border-color rounded-xl p-4 text-sm text-text-muted">
            Sin medición de cintura registrada todavía.
          </div>
        )}
      </div>

      {/* Factores de salud en rojo (derivados automáticamente de IMC, cintura y lab) */}
      <div className="lg:col-span-3 bg-surface border-2 border-border-color rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-text-main mb-3 flex items-center gap-2">
          <AlertTriangle size={18} className={patient.riskFlags?.length ? 'text-danger' : 'text-primary'} />
          Factores de salud
          {patient.riskFlags?.length > 0 && (
            <span className="text-xs font-semibold text-danger bg-danger/10 border border-danger/30 px-2 py-0.5 rounded">
              {patient.riskFlags.length} en rojo
            </span>
          )}
        </h3>
        {patient.riskFlags && patient.riskFlags.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {patient.riskFlags.map((f: RiskFlag) => (
              <div key={f.code} className="bg-danger/5 border-2 border-danger/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-danger shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-text-main">{f.label}</div>
                    <div className="text-xs text-text-muted mt-0.5">
                      Valor actual: <span className="font-mono font-bold text-danger">{f.value}</span>
                      <span className="text-text-muted/70"> · Umbral: {f.thresholdLabel}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-accent/5 border-2 border-accent/20 rounded-xl p-4 flex items-center gap-3 text-sm">
            <span className="text-2xl">✅</span>
            <span className="text-text-main">Sin factores de salud en rojo según las últimas mediciones y laboratorio.</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between items-center border-b border-border-color/60 last:border-b-0 pb-1.5 last:pb-0">
      <span className="text-[11px] uppercase tracking-widest text-text-muted font-semibold">{label}</span>
      <span className="font-medium text-text-main">{value || <span className="opacity-50 italic">—</span>}</span>
    </div>
  );
}

// ─── Tab: Medidas ────────────────────────────────────────────────────────

interface MeasureKpiDef {
  key: string;
  label: string;
  unit: string;
  decimals: number;
  /** Función que extrae el valor desde una sesión (puede calcular ratios o sumas) */
  getValue: (s: any) => number | null;
  /** Si bajar es mejor (peso, IMC, cintura, pliegues) o subir (masa muscular, etc.) */
  lowerIsBetter?: boolean;
}

function num(v: any): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function sumOrNull(values: (number | null)[]): number | null {
  if (values.some(v => v == null)) return null;
  return (values as number[]).reduce((a, b) => a + b, 0);
}

const MEASURE_KPIS: MeasureKpiDef[] = [
  { key: 'weight',  label: 'Peso',          unit: 'kg', decimals: 1, lowerIsBetter: true,
    getValue: s => num(s.weight) },
  { key: 'imc',     label: 'IMC',           unit: '',   decimals: 1, lowerIsBetter: true,
    getValue: s => {
      const w = num(s.weight); const h = num(s.height);
      return (w != null && h != null && h > 0) ? Number((w / Math.pow(h / 100, 2)).toFixed(1)) : null;
    } },
  { key: 'bodyFatYuhasz', label: '% Grasa (Yuhasz)', unit: '%', decimals: 1, lowerIsBetter: true,
    getValue: s => {
      const sum6 = sumOrNull([
        num(s.fold_triceps), num(s.fold_subscapular), num(s.fold_supraspinale),
        num(s.fold_abdominal), num(s.fold_front_thigh), num(s.fold_medial_calf),
      ]);
      if (sum6 == null) return null;
      // Yuhasz: Hombre 0.097·Σ6 + 3.64 · Mujer 0.143·Σ6 + 4.56
      const isMale = s.__sex === 'Masculino';
      const pct = isMale ? 0.097 * sum6 + 3.64 : 0.143 * sum6 + 4.56;
      return Number(pct.toFixed(1));
    } },
  { key: 'waist',   label: 'Cintura',       unit: 'cm', decimals: 1, lowerIsBetter: true,
    getValue: s => num(s.girth_waist) },
  { key: 'hip',     label: 'Cadera',        unit: 'cm', decimals: 1, lowerIsBetter: false,
    getValue: s => num(s.girth_hip) },
  { key: 'whr',     label: 'Cintura/Cadera',unit: '',   decimals: 2, lowerIsBetter: true,
    getValue: s => {
      const w = num(s.girth_waist); const h = num(s.girth_hip);
      return (w != null && h != null && h > 0) ? Number((w / h).toFixed(2)) : null;
    } },
  { key: 'sumFolds6', label: 'Σ 6 pliegues',  unit: 'mm', decimals: 1, lowerIsBetter: true,
    getValue: s => sumOrNull([
      num(s.fold_triceps), num(s.fold_subscapular), num(s.fold_supraspinale),
      num(s.fold_abdominal), num(s.fold_front_thigh), num(s.fold_medial_calf),
    ]) },
  { key: 'sumFolds8', label: 'Σ 8 pliegues',  unit: 'mm', decimals: 1, lowerIsBetter: true,
    getValue: s => sumOrNull([
      num(s.fold_triceps), num(s.fold_subscapular), num(s.fold_biceps),
      num(s.fold_iliac_crest), num(s.fold_supraspinale), num(s.fold_abdominal),
      num(s.fold_front_thigh), num(s.fold_medial_calf),
    ]) },
  { key: 'neck',    label: 'Cuello',         unit: 'cm', decimals: 1, lowerIsBetter: true,
    getValue: s => num(s.girth_neck) },
  { key: 'arm',     label: 'Brazo relajado', unit: 'cm', decimals: 1, lowerIsBetter: false,
    getValue: s => num(s.girth_arm_relaxed) },
  { key: 'thigh',   label: 'Muslo medial',   unit: 'cm', decimals: 1, lowerIsBetter: false,
    getValue: s => num(s.girth_thigh_mid) },
];

function MeasureMiniChart({ def, series }: { def: MeasureKpiDef; series: { date: string; v: number }[] }) {
  const last = series.length > 0 ? series[series.length - 1].v : null;
  const first = series.length > 0 ? series[0].v : null;
  const delta = (last != null && first != null) ? Number((last - first).toFixed(def.decimals)) : null;
  const isImprovement = delta != null && delta !== 0
    ? (def.lowerIsBetter ? delta < 0 : delta > 0)
    : null;

  return (
    <div className="bg-surface rounded-xl border-2 border-border-color p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted">{def.label}</div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono font-bold text-lg text-text-main">
              {last != null ? last.toFixed(def.decimals) : '—'}
            </span>
            <span className="text-[10px] text-text-muted">{def.unit}</span>
          </div>
        </div>
        {delta != null && (
          <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
            isImprovement === true ? 'bg-accent/10 text-primary border border-accent/30' :
            isImprovement === false ? 'bg-danger/10 text-danger border border-danger/30' :
            'bg-bg text-text-muted border border-border-color'
          }`}>
            {delta > 0 ? '+' : ''}{delta.toFixed(def.decimals)} {def.unit}
          </span>
        )}
      </div>
      <div className="h-20 -mx-1">
        {series.length >= 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="date" hide />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ fontSize: 11, padding: '4px 8px', borderRadius: 6 }}
                labelFormatter={(v) => formatLocalDate(v as string, { day: '2-digit', month: 'short', year: 'numeric' }, 'es-AR')}
                formatter={(v: any) => [`${Number(v).toFixed(def.decimals)} ${def.unit}`, def.label]}
              />
              <Line type="monotone" dataKey="v" stroke="#E8472A" strokeWidth={2} dot={{ r: 3, fill: '#E8472A' }} activeDot={{ r: 5 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-[11px] text-text-muted/60">Sin datos</div>
        )}
      </div>
    </div>
  );
}

function TabMedidas({ patient, onSelectSession }: { patient: any; onSelectSession: (s: any) => void }) {
  const sortedSessions = useMemo(() => {
    // Inyectamos __sex en cada sesión para que los getValue que dependan del
    // sexo del paciente (% grasa Yuhasz) puedan calcularlo sin recibir el
    // paciente por separado.
    return [...(patient.sessions as any[])]
      .map(s => ({ ...s, __sex: patient.sex }))
      .sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime());
  }, [patient]);

  // Series por KPI: solo sesiones donde el KPI tiene valor
  const seriesByKpi = useMemo(() => {
    const out: Record<string, { date: string; v: number }[]> = {};
    for (const def of MEASURE_KPIS) {
      out[def.key] = sortedSessions
        .map(s => ({ date: s.session_date, v: def.getValue(s) }))
        .filter((p): p is { date: string; v: number } => p.v != null);
    }
    return out;
  }, [sortedSessions]);

  // Tabla histórica: filas con al menos un dato relevante
  const tableRows = useMemo(() => {
    return [...sortedSessions]
      .reverse()
      .filter(s => s.weight != null || s.height != null || s.girth_waist != null || s.girth_hip != null)
      .map(s => {
        const imc = MEASURE_KPIS.find(k => k.key === 'imc')!.getValue(s);
        const whr = MEASURE_KPIS.find(k => k.key === 'whr')!.getValue(s);
        const sumFolds = MEASURE_KPIS.find(k => k.key === 'sumFolds6')!.getValue(s);
        const bodyFat = MEASURE_KPIS.find(k => k.key === 'bodyFatYuhasz')!.getValue(s);
        return { ...s, imc, whr, sumFolds, bodyFat };
      });
  }, [sortedSessions]);

  // Última antropometría para mostrar el detalle completo
  const lastAnthro = useMemo(() => {
    return [...sortedSessions]
      .reverse()
      .find(s => s.session_type === 'Antropometría');
  }, [sortedSessions]);

  if (tableRows.length === 0 && !lastAnthro) {
    return (
      <div className="bg-surface border-2 border-dashed border-border-color rounded-2xl p-12 text-center">
        <Ruler size={36} className="text-border-color mx-auto mb-3" />
        <h4 className="text-base font-bold text-text-muted">Aún no hay medidas registradas</h4>
        <p className="text-sm text-text-muted/70 mt-1">Registrá una sesión con peso/talla o una antropometría completa para empezar a ver la evolución.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Línea del tiempo de KPIs antropométricos */}
      <div className="bg-surface border-2 border-border-color rounded-2xl p-4 md:p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Ruler size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-main">Progreso de medidas</h3>
            <p className="text-xs text-text-muted">Evolución de los KPIs antropométricos · {sortedSessions.length} sesiones</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {MEASURE_KPIS.map(def => (
            <div key={def.key}>
              <MeasureMiniChart def={def} series={seriesByKpi[def.key]} />
            </div>
          ))}
        </div>
      </div>

      {/* Tabla histórica */}
      {tableRows.length > 0 && (
        <div className="bg-surface border-2 border-border-color rounded-2xl p-4 md:p-5 shadow-sm">
          <h3 className="font-bold text-text-main mb-3 flex items-center gap-2">
            <CalendarDays size={18} className="text-primary" /> Histórico
            <span className="text-xs text-text-muted font-normal">· {tableRows.length} mediciones</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg">
                <tr>
                  {['Fecha', 'Tipo', 'Peso (kg)', 'Talla (cm)', 'IMC', '% Grasa', 'Cintura', 'Cadera', 'C/C', 'Σ 6 plieg.'].map(h => (
                    <th key={h} className="text-left p-3 text-[11px] font-black uppercase tracking-widest text-text-muted border-b-2 border-border-color whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => onSelectSession(r)}
                    className="cursor-pointer hover:bg-primary/5 transition-colors border-b border-border-color"
                  >
                    <td className="p-3 font-mono whitespace-nowrap">{formatLocalDate(r.session_date, { day: '2-digit', month: '2-digit', year: 'numeric' }, 'es-AR')}</td>
                    <td className="p-3">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${r.session_type === 'Antropometría' ? 'bg-primary/15 text-primary' : 'bg-[#6366f1]/10 text-[#4f46e5]'}`}>
                        {r.session_type === 'Antropometría' ? 'Antropo.' : 'Consulta'}
                      </span>
                    </td>
                    <td className="p-3 font-mono">{r.weight ?? '—'}</td>
                    <td className="p-3 font-mono">{r.height ?? '—'}</td>
                    <td className="p-3 font-mono font-bold">{r.imc ?? '—'}</td>
                    <td className="p-3 font-mono">{r.bodyFat != null ? `${r.bodyFat}%` : '—'}</td>
                    <td className="p-3 font-mono">{r.girth_waist ?? '—'}</td>
                    <td className="p-3 font-mono">{r.girth_hip ?? '—'}</td>
                    <td className="p-3 font-mono">{r.whr ?? '—'}</td>
                    <td className="p-3 font-mono">{r.sumFolds != null ? r.sumFolds.toFixed(1) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detalle de la última antropometría */}
      {lastAnthro && (
        <DetailedAnthropometryCard session={lastAnthro} />
      )}
    </div>
  );
}

function DetailedAnthropometryCard({ session: s }: { session: any }) {
  const has = (v: any) => v != null && v !== '';
  const foldFields: [string, string][] = [
    ['fold_triceps', 'Tríceps'], ['fold_subscapular', 'Subescapular'], ['fold_biceps', 'Bíceps'],
    ['fold_iliac_crest', 'Cresta ilíaca'], ['fold_supraspinale', 'Supraespinal'], ['fold_abdominal', 'Abdominal'],
    ['fold_front_thigh', 'Muslo anterior'], ['fold_medial_calf', 'Pantorrilla medial'],
  ];
  const girthFields: [string, string][] = [
    ['girth_neck', 'Cuello'], ['girth_arm_relaxed', 'Brazo relajado'], ['girth_arm_flexed', 'Brazo flexionado'],
    ['girth_forearm', 'Antebrazo'], ['girth_wrist', 'Muñeca'], ['girth_chest', 'Tórax'],
    ['girth_thigh_max', 'Muslo máximo'], ['girth_thigh_mid', 'Muslo medial'],
    ['girth_calf', 'Pantorrilla'], ['girth_ankle', 'Tobillo'],
  ];
  const diamFields: [string, string][] = [
    ['diam_biacromial', 'Biacromial'], ['diam_biiliocristal', 'Bi-iliocrestídeo'],
    ['diam_humerus', 'Húmero'], ['diam_femur', 'Fémur'],
    ['diam_wrist', 'Muñeca'], ['diam_ankle', 'Tobillo'],
  ];

  const renderGroup = (title: string, unit: string, fields: [string, string][]) => {
    const present = fields.filter(([k]) => has(s[k]));
    if (present.length === 0) return null;
    return (
      <div>
        <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-2 border-b border-primary/20 pb-1">{title}</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {present.map(([k, label]) => (
            <div key={k} className="bg-bg p-2.5 rounded-lg border border-border-color">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{label}</p>
              <p className="text-sm font-mono font-semibold">{s[k]} <span className="text-[10px] text-text-muted">{unit}</span></p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <details className="bg-surface border-2 border-border-color rounded-2xl shadow-sm">
      <summary className="cursor-pointer p-4 md:p-5 font-bold text-text-main flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <Ruler size={18} />
        </div>
        <span>Última antropometría completa</span>
        <span className="text-xs text-text-muted font-normal">· {formatLocalDate(s.session_date, { day: '2-digit', month: 'long', year: 'numeric' }, 'es-AR')}</span>
      </summary>
      <div className="px-5 pb-5 space-y-4 border-t border-border-color pt-4">
        {renderGroup('Pliegues cutáneos', 'mm', foldFields)}
        {renderGroup('Perímetros', 'cm', girthFields)}
        {renderGroup('Diámetros óseos', 'cm', diamFields)}
      </div>
    </details>
  );
}

// ─── Tab: Historial ──────────────────────────────────────────────────────

interface TabHistorialProps {
  patient: any;
  onSelectSession: (s: any) => void;
  onEditSession: (s: any) => void;
  onNewConsultation: () => void;
  onNewAnthropometry: () => void;
  onPatientUpdated: () => void;
}

function TabHistorial({ patient, onSelectSession, onEditSession, onNewConsultation, onNewAnthropometry, onPatientUpdated }: TabHistorialProps) {
  const sessions = (patient.sessions as any[]) ?? [];
  const lastConsult = useMemo(() => {
    return [...sessions]
      .filter(s => s.session_type === 'Consulta')
      .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())[0] ?? null;
  }, [sessions]);

  const { showToast } = useToast();
  const [editingInitial, setEditingInitial] = useState(false);
  const [initialDraft, setInitialDraft] = useState<{ weight: string; height: string }>({ weight: '', height: '' });
  const [savingInitial, setSavingInitial] = useState(false);

  function openInitialEditor() {
    setInitialDraft({
      weight: patient.initial_weight != null ? String(patient.initial_weight) : '',
      height: patient.height != null ? String(patient.height) : '',
    });
    setEditingInitial(true);
  }

  async function saveInitial() {
    if (savingInitial) return;
    const weightNum = initialDraft.weight === '' ? null : Number(initialDraft.weight.replace(',', '.'));
    const heightNum = initialDraft.height === '' ? null : Number(initialDraft.height.replace(',', '.'));
    if (weightNum !== null && (!Number.isFinite(weightNum) || weightNum < 20 || weightNum > 300)) {
      showToast('Peso inicial fuera de rango plausible (20-300 kg)', 'error');
      return;
    }
    if (heightNum !== null && (!Number.isFinite(heightNum) || heightNum < 80 || heightNum > 250)) {
      showToast('Altura fuera de rango plausible (80-250 cm)', 'error');
      return;
    }
    setSavingInitial(true);
    try {
      const { error } = await supabase
        .from('patients')
        .update({ initial_weight: weightNum, height: heightNum })
        .eq('id', patient.id);
      if (error) throw error;
      showToast('Datos iniciales actualizados', 'success');
      setEditingInitial(false);
      onPatientUpdated();
    } catch (err: any) {
      console.error('saveInitial error:', err);
      showToast(err?.message || 'No se pudo actualizar', 'error');
    } finally {
      setSavingInitial(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <CalendarDays size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-main">Historial de Sesiones</h3>
            <p className="text-xs text-text-muted">Total registradas: {sessions.length}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onNewConsultation}
            className="px-4 py-2 bg-surface border-2 border-border-color hover:border-primary text-text-main rounded-xl font-semibold text-sm flex items-center gap-2 transition-all shadow-sm active:scale-95"
          >
            <Plus size={15} strokeWidth={2.5} /> Nueva consulta
          </button>
          <button
            onClick={onNewAnthropometry}
            className="px-4 py-2 bg-primary text-white rounded-xl font-semibold text-sm flex items-center gap-2 transition-all shadow-sm hover:bg-primary-light active:scale-95"
          >
            <Plus size={15} strokeWidth={2.5} /> Nueva antropometría
          </button>
        </div>
      </div>

      {/* Datos iniciales del paciente — editables inline porque a veces se
          cargan mal en el alta (ej. peso 854 cuando era 85.4) y eso rompía
          la variación de peso sin forma fácil de corregirlo desde la UI. */}
      <div className="bg-bg border-2 border-dashed border-primary/30 rounded-xl p-4 md:p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="bg-primary/10 text-primary font-mono font-bold px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-widest shadow-sm whitespace-nowrap">
              Datos iniciales
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-text-muted uppercase tracking-widest text-[9px] font-bold">Peso inicial:</span>
                <span className="font-mono font-bold">{patient.initial_weight != null ? `${patient.initial_weight} kg` : '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-muted uppercase tracking-widest text-[9px] font-bold">Altura:</span>
                <span className="font-mono font-bold">{patient.height != null ? `${patient.height} cm` : '—'}</span>
              </div>
              {patient.created_at && (
                <div className="flex items-center gap-2">
                  <span className="text-text-muted uppercase tracking-widest text-[9px] font-bold">Alta:</span>
                  <span className="font-mono text-text-muted">{formatLocalDate(patient.created_at, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={openInitialEditor}
            title="Corregir peso inicial o altura"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors"
          >
            <Edit2 size={13} /> Editar
          </button>
        </div>
      </div>

      {/* Modal: editar datos iniciales */}
      {editingInitial && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-2xl border-2 border-border-color max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text-main">Editar datos iniciales</h3>
              <button onClick={() => { if (!savingInitial) setEditingInitial(false); }} className="p-2 rounded-lg hover:bg-bg text-text-muted">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-text-muted mb-4">
              Estos valores se cargan al dar de alta al paciente. Si se cargaron mal, podés corregirlos acá y las métricas de variación de peso se recalculan automáticamente.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-text-muted mb-1.5">Peso inicial (kg)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="20"
                  max="300"
                  value={initialDraft.weight}
                  onChange={e => setInitialDraft(prev => ({ ...prev, weight: e.target.value }))}
                  placeholder="Ej: 85.4"
                  className="w-full p-2.5 border-2 border-border-color rounded-lg bg-bg text-text-main focus:outline-none focus:border-primary"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-text-muted mb-1.5">Altura (cm)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="80"
                  max="250"
                  value={initialDraft.height}
                  onChange={e => setInitialDraft(prev => ({ ...prev, height: e.target.value }))}
                  placeholder="Ej: 170"
                  className="w-full p-2.5 border-2 border-border-color rounded-lg bg-bg text-text-main focus:outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setEditingInitial(false)}
                disabled={savingInitial}
                className="px-4 py-2 bg-bg border-2 border-border-color rounded-xl font-semibold hover:border-primary disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={saveInitial}
                disabled={savingInitial}
                className="px-4 py-2 bg-primary text-white rounded-xl font-semibold hover:bg-primary-light disabled:opacity-50 flex items-center gap-2"
              >
                {savingInitial ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Guardar
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {sessions.length > 0 ? (
        <div className="space-y-3">
          {[...sessions]
            .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())
            .map((session) => {
              const isAnthro = session.session_type === 'Antropometría';
              return (
                <div
                  key={session.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectSession(session)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectSession(session); } }}
                  title="Ver detalle de la sesión"
                  className={`cursor-pointer bg-bg border-2 rounded-xl p-4 md:p-5 hover:border-primary/60 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                    isAnthro ? 'border-primary/30 bg-gradient-to-br from-bg to-primary/[0.02]' : 'border-border-color'
                  }`}
                >
                  <div className="flex flex-col md:flex-row justify-between md:items-start gap-3">
                    <div className="flex flex-wrap items-center gap-3 md:gap-6">
                      <div className="bg-primary text-white font-mono font-bold px-3 py-1.5 rounded-lg text-sm shadow-sm">
                        {formatLocalDate(session.session_date, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isAnthro
                          ? 'bg-primary/15 text-primary border border-primary/20'
                          : 'bg-[#6366f1]/10 text-[#4f46e5] border border-[#6366f1]/20'
                      }`}>
                        {isAnthro ? 'Antropometría' : 'Consulta'}
                      </span>
                      {session.weight && (
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <span className="text-text-muted uppercase tracking-widest text-[9px]">Peso:</span>
                          <span className="font-mono">{session.weight} kg</span>
                        </div>
                      )}
                      {session.modality && (
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <span className="text-text-muted uppercase tracking-widest text-[9px]">Modalidad:</span>
                          <span className="bg-surface px-2 shadow-sm py-0.5 rounded border border-border-color text-primary font-bold">{session.modality}</span>
                        </div>
                      )}
                      {session.adherence > 0 && (
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <span className="text-text-muted uppercase tracking-widest text-[9px]">Adherencia:</span>
                          <span className="tracking-tighter">{'⭐'.repeat(session.adherence)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {session.overall_status && (
                        <span className="text-xs font-bold uppercase tracking-wider text-text-muted bg-surface px-3 py-1.5 rounded-md border border-border-color">
                          {session.overall_status}
                        </span>
                      )}
                      {isAnthro && (
                        <AnthroReportButton session={session} patient={patient} latestConsult={lastConsult} />
                      )}
                      <button
                        type="button"
                        onClick={() => onEditSession(session)}
                        title="Editar sesión"
                        className="p-2 rounded-lg bg-surface border border-border-color text-text-muted hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all"
                      >
                        <Edit2 size={15} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>

                  {(session.achievements || session.difficulties || session.laboratorio_alterado || session.consultation_reason || session.consultation_notes) && (
                    <div className="mt-4 pt-4 border-t border-border-color grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(session.consultation_reason || session.consultation_notes) && (
                        <div className="md:col-span-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Motivo de consulta</p>
                          <p className="text-sm text-text-muted bg-primary/5 p-3 rounded-lg border border-primary/20">
                            {session.consultation_reason && <span className="font-semibold text-text-main">{session.consultation_reason}</span>}
                            {session.consultation_reason && session.consultation_notes && <span> · </span>}
                            {session.consultation_notes}
                          </p>
                        </div>
                      )}
                      {session.laboratorio_alterado && (
                        <div className="md:col-span-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-[#92400e] mb-1">Laboratorio Alterado</p>
                          <p className="text-sm text-text-muted bg-warning/5 p-3 rounded-lg border border-warning/20">{session.laboratorio_alterado}</p>
                        </div>
                      )}
                      {session.achievements && (
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-accent-dark mb-1">Logros</p>
                          <p className="text-sm text-text-muted bg-surface/50 p-3 rounded-lg border border-border-color/50 h-full">{session.achievements}</p>
                        </div>
                      )}
                      {session.difficulties && (
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-warning mb-1">Desafíos</p>
                          <p className="text-sm text-text-muted bg-surface/50 p-3 rounded-lg border border-border-color/50 h-full">{session.difficulties}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ) : (
        <div className="bg-surface border-2 border-dashed border-border-color rounded-2xl p-12 text-center">
          <Activity size={48} className="text-border-color mx-auto mb-4" />
          <h4 className="text-lg font-bold text-text-muted">Aún no hay sesiones</h4>
          <p className="text-sm text-text-muted/70 mt-1">Cuando registres métricas para este paciente, aparecerán aquí de forma detallada.</p>
        </div>
      )}
    </div>
  );
}

// ─── Modal: detalle / edición de sesión ──────────────────────────────────

interface SessionDetailModalProps {
  session: any;
  editing: boolean;
  editData: any;
  saving: boolean;
  onClose: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onChangeEdit: (key: string, value: any) => void;
  onSave: () => void;
  onDelete: () => void;
}

function SessionDetailModal({ session, editing, editData, saving, onClose, onStartEdit, onCancelEdit, onChangeEdit, onSave, onDelete }: SessionDetailModalProps) {
  const isAnthroSel = session.session_type === 'Antropometría';
  const has = (v: any) => v !== null && v !== undefined && v !== '';
  const fmtDate = (d: string) => formatLocalDate(d, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const hydrationLabel = session.hydration === true ? 'Sí' : session.hydration === false ? 'No' : null;
  const rating = (n: number) => '⭐'.repeat(n) + ` (${n}/5)`;

  const editVal = (key: string) => editData[key] ?? '';

  const renderField = (key: string, label: string, value: any, unit?: string) => (
    <div key={key} className="bg-bg p-3 rounded-lg border border-border-color">
      <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">{label}</p>
      <p className="text-sm font-mono font-semibold text-text-main">{value}{unit ? ` ${unit}` : ''}</p>
    </div>
  );

  const editInput = (key: string, label: string, type: 'number' | 'text' | 'date' = 'number', unit?: string) => (
    <div key={key} className="bg-bg p-3 rounded-lg border border-border-color">
      <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">{label}{unit ? ` (${unit})` : ''}</label>
      <input
        type={type}
        step={type === 'number' ? '0.1' : undefined}
        value={editVal(key)}
        onChange={(e) => onChangeEdit(key, e.target.value)}
        className="w-full p-2 text-sm font-mono border border-border-color rounded-md bg-surface focus:outline-none focus:border-primary"
      />
    </div>
  );

  const editSelect = (key: string, label: string, options: { value: string; label: string }[]) => (
    <div key={key} className="bg-bg p-3 rounded-lg border border-border-color">
      <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">{label}</label>
      <select
        value={editVal(key) === '' || editVal(key) === null ? '' : String(editVal(key))}
        onChange={(e) => onChangeEdit(key, e.target.value)}
        className="w-full p-2 text-sm border border-border-color rounded-md bg-surface focus:outline-none focus:border-primary"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );

  const ratingOptions = [
    { value: '1', label: '1 - Muy baja' }, { value: '2', label: '2 - Baja' },
    { value: '3', label: '3 - Media' }, { value: '4', label: '4 - Alta' },
    { value: '5', label: '5 - Muy alta' },
  ];

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
      <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-3 border-b border-primary/20 pb-1">{title}</h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{children}</div>
    </div>
  );

  const foldFields: [string, string][] = [
    ['fold_triceps', 'Tríceps'], ['fold_subscapular', 'Subescapular'], ['fold_biceps', 'Bíceps'],
    ['fold_iliac_crest', 'Cresta ilíaca'], ['fold_supraspinale', 'Supraespinal'], ['fold_abdominal', 'Abdominal'],
    ['fold_front_thigh', 'Muslo anterior'], ['fold_medial_calf', 'Pantorrilla medial'],
  ];
  const girthFields: [string, string][] = [
    ['girth_head', 'Cabeza'], ['girth_neck', 'Cuello'], ['girth_arm_relaxed', 'Brazo relajado'],
    ['girth_arm_flexed', 'Brazo flexionado'], ['girth_forearm', 'Antebrazo'], ['girth_wrist', 'Muñeca'],
    ['girth_chest', 'Tórax'], ['girth_hip', 'Cadera'], ['girth_thigh_max', 'Muslo máximo'],
    ['girth_thigh_mid', 'Muslo medial'], ['girth_calf', 'Pantorrilla'], ['girth_ankle', 'Tobillo'],
  ];
  const diamFields: [string, string][] = [
    ['diam_biacromial', 'Biacromial'], ['diam_biiliocristal', 'Bi-iliocrestídeo'],
    ['diam_transverse_chest', 'Tórax transverso'], ['diam_ap_chest', 'Tórax A-P'],
    ['diam_humerus', 'Húmero'], ['diam_femur', 'Fémur'], ['diam_wrist', 'Muñeca'], ['diam_ankle', 'Tobillo'],
  ];
  const lenFields: [string, string][] = [
    ['len_acromiale_radiale', 'Acromio-radial'], ['len_radiale_stylion', 'Radial-estiloidea'],
    ['len_midstylion_dactylion', 'M-E a dactiloidea'], ['len_iliospinale', 'Ilioespinal'],
    ['len_trochanterion', 'Trocantérea'], ['len_trochanterion_tibiale_laterale', 'Troc.-tibial lat.'],
    ['len_tibiale_laterale', 'Tibial lateral'], ['len_tibiale_mediale_sphyrion_tibiale', 'Tibial med.-maleolar'],
    ['len_foot', 'Long. del pie'],
  ];
  const anyInGroup = (group: [string, string][]) => group.some(([k]) => has(session[k]));

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { if (!editing) onClose(); }} />
      <div className="relative z-10 bg-surface rounded-2xl shadow-2xl border-2 border-border-color max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface border-b-2 border-border-color px-6 py-4 flex items-start justify-between z-10">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${isAnthroSel ? 'bg-primary/15 text-primary border border-primary/20' : 'bg-[#6366f1]/10 text-[#4f46e5] border border-[#6366f1]/20'}`}>
                {isAnthroSel ? 'Antropometría' : 'Consulta'}
              </span>
              {editing
                ? <span className="text-xs font-bold text-[#D97706] uppercase tracking-wider">Editando</span>
                : <span className="text-xs text-text-muted">{session.modality || '—'} · {session.duration_minutes ? `${session.duration_minutes} min` : '—'}</span>
              }
            </div>
            <h3 className="text-lg font-bold text-text-main capitalize">{fmtDate(session.session_date)}</h3>
          </div>
          <div className="flex items-center gap-2">
            {!editing && (
              <button onClick={onStartEdit} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-semibold text-sm">
                <Edit2 size={16} /> Editar
              </button>
            )}
            <button onClick={onClose} disabled={saving} className="p-2 rounded-lg hover:bg-bg transition-colors text-text-muted disabled:opacity-50">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {editing ? (
            <>
              <Section title="Fecha y Modalidad">
                {editInput('session_date', 'Fecha de la sesión', 'date')}
                {editSelect('modality', 'Modalidad', [{ value: 'Presencial', label: 'Presencial' }, { value: 'Online', label: 'Online' }])}
                {editSelect('duration_minutes', 'Duración', [{ value: '30', label: '30 minutos' }, { value: '45', label: '45 minutos' }, { value: '60', label: '60 minutos' }])}
              </Section>
              <Section title="Medidas Básicas">
                {editInput('weight', 'Peso', 'number', 'kg')}
                {editInput('height', 'Talla', 'number', 'cm')}
                {editInput('girth_waist', 'Cintura', 'number', 'cm')}
              </Section>
              {!isAnthroSel && (
                <Section title="Evaluación Nutricional">
                  {editSelect('adherence', 'Adherencia', ratingOptions)}
                  {editSelect('energy_level', 'Energía', ratingOptions)}
                  {editSelect('sleep_quality', 'Calidad de sueño', ratingOptions)}
                  {editSelect('hydration', 'Hidratación', [{ value: 'true', label: 'Sí' }, { value: 'false', label: 'No' }])}
                  {editSelect('physical_activity', 'Actividad física', [{ value: '≤150 min', label: '≤150 min/semana' }, { value: '+150 min', label: '+150 min/semana' }])}
                  {editSelect('consumo_frutas_verduras', 'Frutas y verduras', ratingOptions)}
                  {editSelect('overall_status', 'Estado general', [{ value: 'En Progreso', label: 'En Progreso' }, { value: 'Objetivo Alcanzado', label: 'Objetivo Alcanzado' }, { value: 'En Riesgo', label: 'En Riesgo' }, { value: 'Requiere Derivación', label: 'Requiere Derivación' }])}
                </Section>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-primary mb-2 border-b border-primary/20 pb-1">Motivo de consulta</label>
                  <select
                    value={editVal('consultation_reason')}
                    onChange={(e) => onChangeEdit('consultation_reason', e.target.value)}
                    className="w-full p-3 border border-border-color rounded-lg bg-surface text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="">— Seleccionar —</option>
                    {CONSULTATION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-primary mb-2 border-b border-primary/20 pb-1">Notas del motivo</label>
                  <textarea value={editVal('consultation_notes')} onChange={(e) => onChangeEdit('consultation_notes', e.target.value)} className="w-full p-3 border border-border-color rounded-lg bg-surface text-sm min-h-[60px] focus:outline-none focus:border-primary" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-[#92400e] mb-2 border-b border-warning/20 pb-1">Laboratorio Alterado</label>
                <textarea value={editVal('laboratorio_alterado')} onChange={(e) => onChangeEdit('laboratorio_alterado', e.target.value)} className="w-full p-3 border border-border-color rounded-lg bg-surface text-sm min-h-[80px] focus:outline-none focus:border-primary" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-accent-dark mb-2 border-b border-accent/20 pb-1">Logros</label>
                  <textarea value={editVal('achievements')} onChange={(e) => onChangeEdit('achievements', e.target.value)} className="w-full p-3 border border-border-color rounded-lg bg-surface text-sm min-h-[80px] focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-warning mb-2 border-b border-warning/20 pb-1">Dificultades</label>
                  <textarea value={editVal('difficulties')} onChange={(e) => onChangeEdit('difficulties', e.target.value)} className="w-full p-3 border border-border-color rounded-lg bg-surface text-sm min-h-[80px] focus:outline-none focus:border-primary" />
                </div>
              </div>
              {isAnthroSel && (anyInGroup(foldFields) || anyInGroup(girthFields) || anyInGroup(diamFields) || anyInGroup(lenFields)) && (
                <div className="bg-bg/60 border border-border-color rounded-lg p-4 text-sm text-text-muted">
                  Las mediciones antropométricas detalladas no se editan desde acá. Para corregirlas, eliminá la sesión y cargala nuevamente.
                </div>
              )}
            </>
          ) : (
            <>
              {(has(session.weight) || has(session.height) || has(session.girth_waist) || has(session.sitting_height) || has(session.arm_span)) && (
                <Section title="Medidas Básicas">
                  {has(session.weight) && renderField('weight', 'Peso', session.weight, 'kg')}
                  {has(session.height) && renderField('height', 'Talla', session.height, 'cm')}
                  {has(session.girth_waist) && renderField('girth_waist', 'Cintura', session.girth_waist, 'cm')}
                  {has(session.sitting_height) && renderField('sitting_height', 'Talla sentado', session.sitting_height, 'cm')}
                  {has(session.arm_span) && renderField('arm_span', 'Envergadura', session.arm_span, 'cm')}
                </Section>
              )}
              {(has(session.adherence) || has(session.energy_level) || has(session.sleep_quality) || hydrationLabel || has(session.physical_activity) || has(session.consumo_frutas_verduras) || has(session.overall_status)) && (
                <Section title="Evaluación Nutricional">
                  {has(session.adherence) && renderField('adherence', 'Adherencia', rating(session.adherence))}
                  {has(session.energy_level) && renderField('energy_level', 'Energía', rating(session.energy_level))}
                  {has(session.sleep_quality) && renderField('sleep_quality', 'Calidad de sueño', rating(session.sleep_quality))}
                  {hydrationLabel && renderField('hydration', 'Hidratación', hydrationLabel)}
                  {has(session.physical_activity) && renderField('physical_activity', 'Actividad física', session.physical_activity)}
                  {has(session.consumo_frutas_verduras) && renderField('consumo_frutas_verduras', 'Frutas y verduras', rating(session.consumo_frutas_verduras))}
                  {has(session.overall_status) && renderField('overall_status', 'Estado general', session.overall_status)}
                </Section>
              )}
              {(has(session.consultation_reason) || has(session.consultation_notes)) && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-2 border-b border-primary/20 pb-1">Motivo de consulta</h4>
                  <p className="text-sm text-text-main bg-primary/5 p-3 rounded-lg border border-primary/20 whitespace-pre-wrap">
                    {has(session.consultation_reason) && <span className="font-semibold">{session.consultation_reason}</span>}
                    {has(session.consultation_reason) && has(session.consultation_notes) && <span> · </span>}
                    {has(session.consultation_notes) && <span>{session.consultation_notes}</span>}
                  </p>
                </div>
              )}
              {has(session.laboratorio_alterado) && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#92400e] mb-2 border-b border-warning/20 pb-1">Laboratorio Alterado</h4>
                  <p className="text-sm text-text-main bg-warning/5 p-3 rounded-lg border border-warning/20 whitespace-pre-wrap">{session.laboratorio_alterado}</p>
                </div>
              )}
              {(has(session.achievements) || has(session.difficulties)) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {has(session.achievements) && (
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-accent-dark mb-2 border-b border-accent/20 pb-1">Logros</h4>
                      <p className="text-sm text-text-main bg-accent/5 p-3 rounded-lg border border-accent/20 whitespace-pre-wrap">{session.achievements}</p>
                    </div>
                  )}
                  {has(session.difficulties) && (
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-warning mb-2 border-b border-warning/20 pb-1">Dificultades</h4>
                      <p className="text-sm text-text-main bg-warning/5 p-3 rounded-lg border border-warning/20 whitespace-pre-wrap">{session.difficulties}</p>
                    </div>
                  )}
                </div>
              )}
              {anyInGroup(foldFields) && (<Section title="Pliegues Cutáneos (mm)">{foldFields.filter(([k]) => has(session[k])).map(([k, label]) => renderField(k, label, session[k], 'mm'))}</Section>)}
              {anyInGroup(girthFields) && (<Section title="Perímetros (cm)">{girthFields.filter(([k]) => has(session[k])).map(([k, label]) => renderField(k, label, session[k], 'cm'))}</Section>)}
              {anyInGroup(diamFields) && (<Section title="Diámetros Óseos (cm)">{diamFields.filter(([k]) => has(session[k])).map(([k, label]) => renderField(k, label, session[k], 'cm'))}</Section>)}
              {anyInGroup(lenFields) && (<Section title="Longitudes y Alturas (cm)">{lenFields.filter(([k]) => has(session[k])).map(([k, label]) => renderField(k, label, session[k], 'cm'))}</Section>)}
            </>
          )}
        </div>

        <div className="sticky bottom-0 bg-surface border-t-2 border-border-color px-6 py-4 flex justify-end gap-3">
          {editing ? (
            <>
              <button onClick={onCancelEdit} disabled={saving} className="px-5 py-2 bg-bg border-2 border-border-color rounded-xl font-semibold hover:bg-surface hover:border-primary transition-all disabled:opacity-50">Cancelar</button>
              <button onClick={onSave} disabled={saving} className="px-5 py-2 bg-gradient-to-br from-primary to-primary-light text-white rounded-xl font-semibold hover:-translate-y-0.5 hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 size={16} className="animate-spin" />} <Save size={16} /> Guardar cambios
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onDelete}
                className="mr-auto px-4 py-2 bg-danger/10 text-danger border-2 border-danger/30 rounded-xl font-semibold hover:bg-danger hover:text-white transition-all flex items-center gap-2"
              >
                <Trash2 size={16} /> Eliminar consulta
              </button>
              <button onClick={onClose} className="px-5 py-2 bg-bg border-2 border-border-color rounded-xl font-semibold hover:bg-surface hover:border-primary transition-all">Cerrar</button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
