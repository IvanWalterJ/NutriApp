/**
 * CMS de formularios públicos pre-consulta.
 *
 * Lista todos los forms de la empresa seleccionada, permite crear uno nuevo
 * (con la plantilla por defecto de feria), copiar el link / mostrar el QR,
 * activar/desactivar y borrar.
 */

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../context/CompanyContext';
import { useToast } from '../../context/ToastContext';
import { Plus, Link2, QrCode, Trash2, Eye, EyeOff, Loader2, Copy, X, Building2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { DEFAULT_FAIR_FORM_FIELDS, slugify, type FormRecord } from '../../lib/formTypes';
import ConfirmDialog from '../ui/ConfirmDialog';

export default function FormsAdmin() {
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();

  const [forms, setForms] = useState<FormRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showQrFor, setShowQrFor] = useState<FormRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<FormRecord | null>(null);
  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});

  // Form fields del modal de creación
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newExpiresAt, setNewExpiresAt] = useState('');

  useEffect(() => {
    void loadForms();
  }, [selectedCompany]);

  async function loadForms() {
    setLoading(true);
    const { data, error } = await supabase
      .from('forms')
      .select('id, slug, company, title, description, fields, expires_at, is_active, created_at')
      .eq('company', selectedCompany)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error loading forms:', error);
      showToast('No se pudieron cargar los formularios', 'error');
      setForms([]);
      setLoading(false);
      return;
    }
    const list = (data || []) as FormRecord[];
    setForms(list);

    // Conteo de respuestas pendientes por form
    if (list.length > 0) {
      const { data: counts } = await supabase
        .from('form_responses')
        .select('form_id, status')
        .in('form_id', list.map(f => f.id));
      const map: Record<string, number> = {};
      (counts || []).forEach((r: any) => {
        if (r.status === 'pending') map[r.form_id] = (map[r.form_id] || 0) + 1;
      });
      setResponseCounts(map);
    }
    setLoading(false);
  }

  async function handleCreate() {
    if (!newTitle.trim()) {
      showToast('Poné un título al formulario', 'error');
      return;
    }
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      // Slug único: base + sufijo random si ya existe en la empresa.
      const base = slugify(`${selectedCompany}-${newTitle}`) || 'formulario';
      let slug = base;
      let attempt = 0;
      while (attempt < 5) {
        const { data: existing } = await supabase.from('forms').select('id').eq('slug', slug).maybeSingle();
        if (!existing) break;
        attempt++;
        slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
      }

      const { error } = await supabase.from('forms').insert({
        slug,
        company: selectedCompany,
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        fields: DEFAULT_FAIR_FORM_FIELDS,
        expires_at: newExpiresAt ? new Date(newExpiresAt).toISOString() : null,
        is_active: true,
        created_by: user.id,
      });
      if (error) throw error;

      showToast('Formulario creado', 'success');
      setShowCreate(false);
      setNewTitle('');
      setNewDescription('');
      setNewExpiresAt('');
      await loadForms();
    } catch (err: any) {
      console.error('Create form error:', err);
      showToast(err?.message || 'No se pudo crear el formulario', 'error');
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(form: FormRecord) {
    const { error } = await supabase
      .from('forms')
      .update({ is_active: !form.is_active })
      .eq('id', form.id);
    if (error) {
      showToast('No se pudo actualizar', 'error');
      return;
    }
    showToast(form.is_active ? 'Formulario desactivado' : 'Formulario activado', 'success');
    await loadForms();
  }

  async function handleDelete(form: FormRecord) {
    const { error } = await supabase.from('forms').delete().eq('id', form.id);
    if (error) {
      showToast('No se pudo borrar', 'error');
      return;
    }
    showToast('Formulario borrado', 'success');
    await loadForms();
  }

  function publicLink(form: FormRecord): string {
    return `${window.location.origin}/public/form/${form.slug}`;
  }

  function copyLink(form: FormRecord) {
    const url = publicLink(form);
    navigator.clipboard.writeText(url).then(
      () => showToast('Link copiado al portapapeles', 'success'),
      () => showToast('No se pudo copiar — copialo manual', 'error'),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-black text-text-main">Formularios pre-consulta</h2>
          <p className="text-sm text-text-muted mt-1">
            Generá un link para cada feria/evento. Los pacientes lo completan desde su celular antes de la consulta — vos los revisás en la Bandeja.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-semibold hover:bg-primary-light transition-all active:scale-95"
        >
          <Plus size={16} /> Nuevo formulario
        </button>
      </div>

      {loading && (
        <div className="text-center py-12 text-text-muted">
          <Loader2 size={32} className="animate-spin mx-auto mb-2" />
          Cargando formularios…
        </div>
      )}

      {!loading && forms.length === 0 && (
        <div className="bg-surface rounded-2xl border-2 border-dashed border-border-color p-8 text-center text-text-muted">
          <p className="mb-2">Todavía no tenés ningún formulario para <strong>{selectedCompany}</strong>.</p>
          <p className="text-sm">Creá el primero para empezar a recibir altas previas a la consulta.</p>
        </div>
      )}

      {!loading && forms.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {forms.map(form => {
            const pending = responseCounts[form.id] || 0;
            const expired = form.expires_at && new Date(form.expires_at).getTime() < Date.now();
            return (
              <div
                key={form.id}
                className={`bg-surface rounded-2xl border-2 p-5 flex flex-col gap-3 ${
                  expired || !form.is_active ? 'border-border-color opacity-70' : 'border-primary/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-text-main truncate">{form.title}</h3>
                    <div className="flex items-center gap-1 text-[11px] text-text-muted mt-0.5">
                      <Building2 size={11} />
                      <span className="font-semibold">{form.company}</span>
                    </div>
                    {form.description && (
                      <p className="text-xs text-text-muted line-clamp-2 mt-1">{form.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 items-end shrink-0">
                    {!form.is_active && (
                      <span className="text-[10px] font-bold uppercase tracking-widest bg-text-muted/15 text-text-muted px-2 py-0.5 rounded-full">
                        Inactivo
                      </span>
                    )}
                    {expired && (
                      <span className="text-[10px] font-bold uppercase tracking-widest bg-danger/15 text-danger px-2 py-0.5 rounded-full">
                        Vencido
                      </span>
                    )}
                    {pending > 0 && (
                      <span
                        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest bg-danger/15 text-danger border border-danger/30 px-2 py-0.5 rounded-full animate-pulse"
                        title={`${pending} respuesta(s) sin revisar — ir a la Bandeja`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-danger"></span>
                        {pending} pendiente{pending === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs text-text-muted font-mono bg-bg rounded-lg px-3 py-2 truncate" title={publicLink(form)}>
                  /public/form/{form.slug}
                </div>

                <div className="flex flex-wrap gap-2 mt-auto">
                  <button
                    onClick={() => copyLink(form)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-bg border border-border-color rounded-lg text-xs font-semibold hover:border-primary transition-colors"
                    title="Copiar link público"
                  >
                    <Copy size={12} /> Link
                  </button>
                  <button
                    onClick={() => setShowQrFor(form)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-bg border border-border-color rounded-lg text-xs font-semibold hover:border-primary transition-colors"
                  >
                    <QrCode size={12} /> QR
                  </button>
                  <button
                    onClick={() => window.open(publicLink(form), '_blank')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-bg border border-border-color rounded-lg text-xs font-semibold hover:border-primary transition-colors"
                  >
                    <Link2 size={12} /> Abrir
                  </button>
                  <button
                    onClick={() => toggleActive(form)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-bg border border-border-color rounded-lg text-xs font-semibold hover:border-primary transition-colors"
                  >
                    {form.is_active ? <><EyeOff size={12} /> Desactivar</> : <><Eye size={12} /> Activar</>}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(form)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-bg border border-border-color rounded-lg text-xs font-semibold text-danger hover:border-danger transition-colors ml-auto"
                    title="Borrar formulario"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear */}
      {showCreate && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-surface rounded-2xl shadow-2xl border-2 border-border-color max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text-main">Nuevo formulario</h3>
              <button onClick={() => setShowCreate(false)} className="p-2 rounded-lg hover:bg-bg text-text-muted">
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 p-3 bg-primary/5 border-2 border-primary/30 rounded-lg flex items-start gap-2.5">
              <Building2 size={18} className="text-primary shrink-0 mt-0.5" />
              <div className="text-sm">
                <div>Este formulario se va a crear para <strong className="text-primary">{selectedCompany}</strong>.</div>
                <div className="text-xs text-text-muted mt-1">
                  Los pacientes que lo completen aparecen en la Bandeja de esta empresa y se crean acá al confirmarlos. Si querés crearlo para otra feria/evento, cancelá y cambiá la empresa en el switcher arriba a la derecha primero.
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-text-muted mb-1">Título</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Ej: Feria Pampa - Junio 2026"
                  className="w-full px-3 py-2 border-2 border-border-color rounded-lg bg-bg focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-text-muted mb-1">Descripción (opcional)</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Completá este formulario antes de tu consulta..."
                  className="w-full px-3 py-2 border-2 border-border-color rounded-lg bg-bg focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-text-muted mb-1">Vence el (opcional)</label>
                <input
                  type="date"
                  value={newExpiresAt}
                  onChange={e => setNewExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-border-color rounded-lg bg-bg focus:outline-none focus:border-primary"
                />
                <p className="text-[11px] text-text-muted mt-1">Después de esta fecha, el link deja de funcionar automáticamente.</p>
              </div>
              <div className="bg-info/5 border border-info/30 rounded-lg p-3 text-xs text-text-muted">
                Empieza con la plantilla por defecto (nombre, peso, hábitos OMS, objetivo). Más adelante vas a poder editar los campos.
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowCreate(false)}
                disabled={creating}
                className="px-4 py-2 bg-bg border-2 border-border-color rounded-xl font-semibold hover:border-primary"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newTitle.trim()}
                className="px-4 py-2 bg-primary text-white rounded-xl font-semibold hover:bg-primary-light disabled:opacity-50 flex items-center gap-2"
              >
                {creating && <Loader2 size={16} className="animate-spin" />}
                Crear
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Modal QR */}
      {showQrFor && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-surface rounded-2xl shadow-2xl border-2 border-border-color max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text-main">QR del formulario</h3>
              <button onClick={() => setShowQrFor(null)} className="p-2 rounded-lg hover:bg-bg text-text-muted">
                <X size={20} />
              </button>
            </div>
            <div className="text-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(publicLink(showQrFor))}`}
                alt="QR del formulario"
                className="mx-auto rounded-lg border-2 border-border-color"
                width={300}
                height={300}
              />
              <p className="text-xs text-text-muted mt-3 break-all font-mono">{publicLink(showQrFor)}</p>
              <p className="text-xs text-text-muted mt-2">
                Mostralo en la feria o mandalo por WhatsApp/email a los pacientes.
              </p>
              <div className="flex gap-2 justify-center mt-4">
                <button
                  onClick={() => copyLink(showQrFor)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-bg border border-border-color rounded-lg text-xs font-semibold hover:border-primary"
                >
                  <Copy size={12} /> Copiar link
                </button>
                <a
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(publicLink(showQrFor))}&download=1`}
                  download={`qr-${showQrFor.slug}.png`}
                  className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-light"
                >
                  Descargar PNG
                </a>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Confirmación de borrado */}
      <ConfirmDialog
        open={confirmDelete !== null}
        variant="danger"
        title="Borrar formulario"
        message={
          confirmDelete ? (
            <>
              ¿Borrar <strong className="text-text-main">"{confirmDelete.title}"</strong>?
            </>
          ) : ''
        }
        detail={
          confirmDelete && (responseCounts[confirmDelete.id] || 0) > 0 ? (
            <span className="text-danger font-semibold">
              Atención: este formulario tiene {responseCounts[confirmDelete.id]} respuesta(s) sin revisar. Al borrarlo se eliminan también esas respuestas. Esta acción no se puede deshacer.
            </span>
          ) : (
            'Esta acción es permanente.'
          )
        }
        confirmLabel="Borrar formulario"
        onConfirm={async () => {
          if (!confirmDelete) return;
          await handleDelete(confirmDelete);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
