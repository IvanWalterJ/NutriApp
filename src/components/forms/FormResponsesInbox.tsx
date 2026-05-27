/**
 * Bandeja de respuestas a formularios pre-consulta.
 *
 * Muestra todas las respuestas pending del company seleccionado, agrupadas
 * por formulario. La nutricionista revisa cada una y la "promueve" a paciente:
 * crea (o reusa) un registro en patients + sesión inicial OMS, y marca la
 * respuesta como processed.
 *
 * Si la respuesta es spam o un duplicado, se puede descartar.
 */

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../context/CompanyContext';
import { useToast } from '../../context/ToastContext';
import { Inbox, CheckCircle2, Trash2, User, Calendar, Loader2, RefreshCw, AlertCircle, FileText, Building2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { FormRecord, FormResponseRecord } from '../../lib/formTypes';

interface ResponseWithForm extends FormResponseRecord {
  /**
   * Snapshot del form que originó la respuesta. `company` viene de acá
   * porque es el dato autoritativo de DÓNDE pertenece el paciente — no
   * el switcher actual del sidebar, que puede haber cambiado entre que
   * la respuesta entró y la nutri la confirma.
   */
  form: Pick<FormRecord, 'id' | 'title' | 'slug' | 'fields' | 'company'>;
}

interface InboxProps {
  /** Callback opcional para que el padre refresque su contador de pending
   *  cuando se procesa o descarta una respuesta desde acá. */
  onMutated?: () => void;
}

export default function FormResponsesInbox({ onMutated }: InboxProps = {}) {
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();

  const [responses, setResponses] = useState<ResponseWithForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'processed' | 'discarded'>('pending');
  const [activeResponse, setActiveResponse] = useState<ResponseWithForm | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    void loadResponses();
  }, [selectedCompany, filter]);

  async function loadResponses() {
    setLoading(true);
    // Traemos solo forms del company seleccionado, y joinamos sus respuestas filtradas por status.
    const { data: forms, error: formsErr } = await supabase
      .from('forms')
      .select('id, title, slug, fields, company')
      .eq('company', selectedCompany);
    if (formsErr) {
      console.error(formsErr);
      showToast('No se pudo cargar la bandeja', 'error');
      setLoading(false);
      return;
    }
    const formMap = new Map<string, Pick<FormRecord, 'id' | 'title' | 'slug' | 'fields' | 'company'>>();
    (forms || []).forEach(f => formMap.set(f.id, f as any));
    if (formMap.size === 0) {
      setResponses([]);
      setLoading(false);
      return;
    }

    const { data: resps, error: respsErr } = await supabase
      .from('form_responses')
      .select('id, form_id, data, status, patient_id, submitted_at, processed_at, user_agent')
      .in('form_id', Array.from(formMap.keys()))
      .eq('status', filter)
      .order('submitted_at', { ascending: false });
    if (respsErr) {
      console.error(respsErr);
      showToast('No se pudieron cargar las respuestas', 'error');
      setLoading(false);
      return;
    }

    const enriched: ResponseWithForm[] = (resps || []).map(r => ({
      ...(r as FormResponseRecord),
      form: formMap.get(r.form_id)!,
    }));
    setResponses(enriched);
    setLoading(false);
  }

  /**
   * Promoción: respuesta → paciente real + 1ra sesión OMS.
   * - El paciente se crea en la empresa del FORM (resp.form.company), NO
   *   en la del switcher actual. Esto es lo correcto porque el form se
   *   diseñó para una empresa/feria específica al momento de su creación.
   * - Si ya existe paciente con mismo email (en esa misma empresa), lo reusa.
   * - Marca la respuesta como processed y la linkea por patient_id.
   */
  async function handlePromote(resp: ResponseWithForm) {
    setConfirming(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      const targetCompany = resp.form.company;
      const d = resp.data as Record<string, any>;
      const firstName = String(d.first_name || '').trim();
      const lastName  = String(d.last_name || '').trim();
      if (!firstName || !lastName) throw new Error('La respuesta no tiene nombre y apellido');

      const email = d.email ? String(d.email).trim().toLowerCase() : null;
      const phone = d.phone ? String(d.phone) : null;
      const birthDate = d.birth_date || null;
      const sex = d.sex === 'Masculino' ? 'Masculino' : d.sex === 'Femenino' ? 'Femenino' : null;
      const weight = numOrNull(d.weight);
      const height = numOrNull(d.height);

      // Match por email DENTRO de la empresa del form
      let patientId: string | null = null;
      if (email) {
        const { data: match } = await supabase
          .from('patients')
          .select('id')
          .eq('company', targetCompany)
          .ilike('email', email)
          .maybeSingle();
        if (match) patientId = match.id;
      }

      // Sino, alta nueva en la empresa del form.
      // `area` es NOT NULL en patients (departamento dentro de la empresa).
      // El form público no lo pide por default, así que lo defaulteamos a
      // 'Sin especificar' — Rosana lo edita después desde el detalle del paciente.
      if (!patientId) {
        const { data: created, error: insErr } = await supabase
          .from('patients')
          .insert({
            first_name: firstName,
            last_name: lastName,
            email,
            phone,
            birth_date: birthDate,
            sex,
            initial_weight: weight,
            height,
            area: (d.area as string) || 'Sin especificar',
            status: 'En Progreso',
            company: targetCompany,
            created_by: user.id,
          })
          .select('id')
          .single();
        if (insErr) throw insErr;
        patientId = created.id;
      }

      // Sesión inicial OMS si vinieron mediciones (también en la empresa del form)
      const hasOmsData = weight !== null
        || d.hydration !== undefined
        || d.activity !== undefined
        || d.fruits !== undefined
        || d.sleep !== undefined
        || d.energy !== undefined;
      if (hasOmsData) {
        const today = new Date().toISOString().slice(0, 10);
        await supabase.from('sessions').insert({
          patient_id: patientId,
          nutritionist_id: user.id,
          session_date: today,
          company: targetCompany,
          session_type: 'Consulta',
          weight,
          height,
          hydration: d.hydration === true ? true : d.hydration === false ? false : null,
          physical_activity: d.activity === true ? '+150 min' : d.activity === false ? '≤150 min' : null,
          consumo_frutas_verduras: ratingOrNull(d.fruits),
          energy_level: ratingOrNull(d.energy),
          sleep_quality: ratingOrNull(d.sleep),
          consultation_reason: d.goal || null,
          consultation_notes: d.notes || null,
        });
      }

      // Marcar respuesta como processed
      await supabase
        .from('form_responses')
        .update({
          status: 'processed',
          patient_id: patientId,
          processed_at: new Date().toISOString(),
          processed_by: user.id,
        })
        .eq('id', resp.id);

      showToast(`Paciente creado en "${targetCompany}"`, 'success');
      setActiveResponse(null);
      await loadResponses();
      onMutated?.();
    } catch (err: any) {
      console.error('Promote error:', err);
      showToast(err?.message || 'No se pudo promover a paciente', 'error');
    } finally {
      setConfirming(false);
    }
  }

  async function handleDiscard(resp: ResponseWithForm) {
    if (!window.confirm('¿Descartar esta respuesta? Podés recuperarla con el filtro "Descartadas".')) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('form_responses')
      .update({ status: 'discarded', processed_at: new Date().toISOString(), processed_by: user?.id })
      .eq('id', resp.id);
    if (error) {
      showToast('No se pudo descartar', 'error');
      return;
    }
    showToast('Respuesta descartada', 'success');
    await loadResponses();
    onMutated?.();
  }

  const counts = useMemo(() => responses.length, [responses]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-black text-text-main flex items-center gap-2">
            <Inbox size={24} className="text-primary" /> Bandeja de respuestas
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Respuestas que los pacientes enviaron por el link público. Revisalas antes de la consulta.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadResponses}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-bg border-2 border-border-color rounded-xl text-sm font-semibold hover:border-primary"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refrescar
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-bg rounded-xl p-1 border border-border-color w-fit">
        {(['pending', 'processed', 'discarded'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors ${
              filter === s ? 'bg-primary text-white' : 'text-text-muted hover:text-text-main'
            }`}
          >
            {s === 'pending' ? 'Pendientes' : s === 'processed' ? 'Procesadas' : 'Descartadas'}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-12 text-text-muted">
          <Loader2 size={32} className="animate-spin mx-auto mb-2" />
          Cargando…
        </div>
      )}

      {!loading && counts === 0 && (
        <div className="bg-surface rounded-2xl border-2 border-dashed border-border-color p-8 text-center text-text-muted">
          {filter === 'pending' ? (
            <>
              <p className="mb-2">No hay respuestas pendientes para <strong>{selectedCompany}</strong>.</p>
              <p className="text-sm">Cuando un paciente complete tu link público, aparece acá.</p>
            </>
          ) : filter === 'processed' ? (
            <p>Todavía no procesaste ninguna respuesta.</p>
          ) : (
            <p>No hay respuestas descartadas.</p>
          )}
        </div>
      )}

      {!loading && counts > 0 && (
        <div className="space-y-3">
          {responses.map(r => {
            const d = r.data as Record<string, any>;
            const name = `${d.first_name || ''} ${d.last_name || ''}`.trim() || '(sin nombre)';
            const submittedAt = new Date(r.submitted_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
            return (
              <button
                key={r.id}
                onClick={() => setActiveResponse(r)}
                className="w-full text-left bg-surface rounded-xl border-2 border-border-color hover:border-primary p-4 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <User size={14} className="text-primary shrink-0" />
                      <span className="font-bold text-text-main truncate">{name}</span>
                      {filter === 'pending' && (
                        <span className="text-[10px] font-black uppercase tracking-widest bg-accent/15 text-accent-dark px-2 py-0.5 rounded-full">
                          Pendiente
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-text-muted flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1"><FileText size={11} /> {r.form.title}</span>
                      <span className="flex items-center gap-1"><Calendar size={11} /> {submittedAt}</span>
                      {d.email && <span className="font-mono truncate">· {d.email}</span>}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Modal de detalle */}
      {activeResponse && createPortal(
        <ResponseDetailModal
          resp={activeResponse}
          onClose={() => setActiveResponse(null)}
          onPromote={() => handlePromote(activeResponse)}
          onDiscard={() => handleDiscard(activeResponse)}
          confirming={confirming}
          readOnly={filter !== 'pending'}
        />,
        document.body,
      )}
    </div>
  );
}

interface ResponseDetailModalProps {
  resp: ResponseWithForm;
  onClose: () => void;
  onPromote: () => void;
  onDiscard: () => void;
  confirming: boolean;
  readOnly: boolean;
}

function ResponseDetailModal({ resp, onClose, onPromote, onDiscard, confirming, readOnly }: ResponseDetailModalProps) {
  const d = resp.data as Record<string, any>;
  const fields = resp.form.fields ?? [];
  const submittedAt = new Date(resp.submitted_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-surface rounded-2xl shadow-2xl border-2 border-border-color max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b-2 border-border-color flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-text-main">{`${d.first_name || ''} ${d.last_name || ''}`.trim() || '(sin nombre)'}</h3>
            <p className="text-xs text-text-muted">{resp.form.title} · {submittedAt}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-bg text-text-muted">✕</button>
        </div>

        {!readOnly && (
          <div className="px-6 py-3 bg-primary/5 border-b border-border-color flex items-center gap-2 text-sm">
            <Building2 size={16} className="text-primary shrink-0" />
            <span className="text-text-muted">Al confirmar, el paciente se crea en:</span>
            <span className="font-bold text-primary">{resp.form.company}</span>
          </div>
        )}

        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {fields.length === 0 && (
            <div className="flex items-center gap-2 text-warning text-sm">
              <AlertCircle size={16} />
              El formulario original no tiene campos guardados — mostrando datos crudos.
            </div>
          )}

          {fields.map(f => {
            const v = d[f.key];
            return (
              <div key={f.key} className="grid grid-cols-3 gap-3 py-1.5 border-b border-border-color">
                <div className="col-span-1 text-xs text-text-muted font-semibold">{f.label}</div>
                <div className="col-span-2 text-sm text-text-main">{renderValue(v)}</div>
              </div>
            );
          })}

          {fields.length === 0 && Object.entries(d).map(([k, v]) => (
            <div key={k} className="grid grid-cols-3 gap-3 py-1.5 border-b border-border-color">
              <div className="col-span-1 text-xs text-text-muted font-mono">{k}</div>
              <div className="col-span-2 text-sm text-text-main">{renderValue(v)}</div>
            </div>
          ))}
        </div>

        {!readOnly && (
          <div className="px-6 py-4 border-t-2 border-border-color flex flex-col sm:flex-row gap-2 justify-end">
            <button
              onClick={onDiscard}
              disabled={confirming}
              className="px-4 py-2 bg-bg border-2 border-border-color rounded-xl font-semibold text-danger hover:border-danger disabled:opacity-50 flex items-center gap-2"
            >
              <Trash2 size={14} /> Descartar
            </button>
            <button
              onClick={onPromote}
              disabled={confirming}
              className="px-4 py-2 bg-primary text-white rounded-xl font-semibold hover:bg-primary-light disabled:opacity-50 flex items-center gap-2"
            >
              {confirming ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Confirmar y crear paciente
            </button>
          </div>
        )}

        {readOnly && resp.patient_id && (
          <div className="px-6 py-4 border-t-2 border-border-color text-sm text-text-muted">
            Ya procesada — paciente creado con ID <span className="font-mono">{resp.patient_id.slice(0, 8)}…</span>
          </div>
        )}
      </div>
    </div>
  );
}

function renderValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  return String(v);
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function ratingOrNull(v: unknown): number | null {
  const n = numOrNull(v);
  if (n === null) return null;
  const r = Math.round(n);
  return r >= 1 && r <= 5 ? r : null;
}
