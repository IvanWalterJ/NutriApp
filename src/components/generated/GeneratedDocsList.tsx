/**
 * Lista del historial de documentos generados (planes o recetarios).
 * Reutilizable: el componente se monta dentro de la sección "Generador de
 * Planes" y "Recetario", filtrando por type. Filtro por empresa es siempre
 * obligatorio (lo aplica el service).
 */

import { useEffect, useMemo, useState } from 'react';
import { useCompany } from '../../context/CompanyContext';
import { useToast } from '../../context/ToastContext';
import { listGeneratedDocs, deleteGeneratedDoc, type GeneratedDocSummary, type GeneratedDocType } from '../../lib/generatedDocsService';
import { Sparkles, Plus, Trash2, User, Calendar, FileText, ChefHat, Loader2, Search, RefreshCw } from 'lucide-react';
import ConfirmDialog from '../ui/ConfirmDialog';

interface Props {
  type: GeneratedDocType;
  /** Texto del título de la sección — ej. "Generador de Planes". */
  sectionTitle: string;
  /** Descripción que va debajo del título. */
  sectionDescription: string;
  /** Texto del botón "Nuevo …". */
  newButtonLabel: string;
  /** Callback para abrir el editor de creación (vista 'create'). */
  onCreateNew: () => void;
  /** Callback para abrir un doc existente (vista 'view'). */
  onOpen: (id: string) => void;
  /** Trigger externo para refrescar (incrementar el number cuando algo cambió). */
  refreshKey?: number;
}

export default function GeneratedDocsList({
  type,
  sectionTitle,
  sectionDescription,
  newButtonLabel,
  onCreateNew,
  onOpen,
  refreshKey,
}: Props) {
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();

  const [docs, setDocs] = useState<GeneratedDocSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<GeneratedDocSummary | null>(null);

  async function load() {
    setLoading(true);
    try {
      const rows = await listGeneratedDocs(selectedCompany, type);
      setDocs(rows);
    } catch (err: any) {
      console.error('Load generated docs error:', err);
      showToast(err?.message || 'No se pudo cargar el historial', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [selectedCompany, type, refreshKey]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter(d =>
      d.title.toLowerCase().includes(q)
      || (d.patient_name || '').toLowerCase().includes(q),
    );
  }, [docs, search]);

  const TypeIcon = type === 'meal_plan' ? FileText : ChefHat;
  const accentClass = type === 'meal_plan' ? 'text-primary' : 'text-[#d97706]';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-text-main flex items-center gap-2">
            <Sparkles className={accentClass} size={22} /> {sectionTitle}
          </h2>
          <p className="text-sm text-text-muted mt-1">{sectionDescription}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-bg border-2 border-border-color rounded-xl text-sm font-semibold hover:border-primary disabled:opacity-50"
            title="Refrescar"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={onCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-semibold hover:bg-primary-light transition-all active:scale-95 shadow-sm"
          >
            <Plus size={16} strokeWidth={2.5} /> {newButtonLabel}
          </button>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar por título o paciente…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 border-2 border-border-color rounded-xl bg-bg focus:outline-none focus:border-primary text-sm"
        />
      </div>

      {loading && (
        <div className="text-center py-12 text-text-muted">
          <Loader2 size={28} className="animate-spin mx-auto mb-2" />
          Cargando…
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="bg-surface rounded-2xl border-2 border-dashed border-border-color p-10 text-center">
          <TypeIcon size={36} className={`mx-auto mb-3 ${accentClass} opacity-60`} />
          {search ? (
            <>
              <p className="font-semibold text-text-main mb-1">Sin resultados para "{search}"</p>
              <p className="text-sm text-text-muted">Probá con otro término o limpiá la búsqueda.</p>
            </>
          ) : docs.length === 0 ? (
            <>
              <p className="font-semibold text-text-main mb-1">
                Todavía no hay {type === 'meal_plan' ? 'planes' : 'recetarios'} guardados para <strong>{selectedCompany}</strong>.
              </p>
              <p className="text-sm text-text-muted mb-4">
                Generá el primero y se guarda automáticamente para que puedas volver a verlo o reimprimirlo cuando quieras.
              </p>
              <button
                onClick={onCreateNew}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary-light"
              >
                <Plus size={16} strokeWidth={2.5} /> {newButtonLabel}
              </button>
            </>
          ) : null}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(doc => (
            <div
              key={doc.id}
              className="group bg-surface border-2 border-border-color hover:border-primary rounded-2xl p-5 flex flex-col gap-3 transition-colors"
            >
              <button
                onClick={() => onOpen(doc.id)}
                className="text-left flex-1 cursor-pointer"
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className={`w-9 h-9 shrink-0 rounded-xl bg-primary/10 ${accentClass} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <TypeIcon size={18} />
                  </div>
                  <h3 className="font-bold text-text-main leading-tight line-clamp-2 flex-1">{doc.title}</h3>
                </div>
                <div className="space-y-1 text-xs text-text-muted">
                  {doc.patient_name && (
                    <div className="flex items-center gap-1.5">
                      <User size={11} />
                      <span className="font-semibold truncate">{doc.patient_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Calendar size={11} />
                    <span>{new Date(doc.created_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                  {doc.updated_at !== doc.created_at && (
                    <div className="text-[10px] italic opacity-70">
                      Editado: {new Date(doc.updated_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  )}
                </div>
              </button>

              <div className="flex gap-2 pt-2 border-t border-border-color">
                <button
                  onClick={() => onOpen(doc.id)}
                  className="flex-1 px-3 py-1.5 bg-bg border border-border-color rounded-lg text-xs font-semibold hover:border-primary transition-colors"
                >
                  Abrir
                </button>
                <button
                  onClick={() => setConfirmDelete(doc)}
                  className="px-3 py-1.5 bg-bg border border-border-color rounded-lg text-xs font-semibold text-danger hover:border-danger transition-colors"
                  title="Borrar este documento"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        variant="danger"
        title={type === 'meal_plan' ? 'Borrar plan' : 'Borrar recetario'}
        message={
          confirmDelete ? (
            <>¿Borrar <strong className="text-text-main">"{confirmDelete.title}"</strong>?</>
          ) : ''
        }
        detail="Esta acción es permanente. Si lo necesitás más adelante vas a tener que regenerarlo."
        confirmLabel="Borrar"
        onConfirm={async () => {
          if (!confirmDelete) return;
          try {
            await deleteGeneratedDoc(confirmDelete.id);
            showToast('Eliminado', 'success');
            await load();
          } catch (err: any) {
            showToast(err?.message || 'No se pudo borrar', 'error');
          } finally {
            setConfirmDelete(null);
          }
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
