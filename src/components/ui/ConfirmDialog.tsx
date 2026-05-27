/**
 * Modal de confirmación reutilizable con el estilo de la app.
 *
 * Reemplazo de window.confirm — que mostraba el popup nativo del navegador
 * (feo, fuera de estilo, sin loading state durante operaciones async).
 *
 * Uso típico:
 *   const [ask, setAsk] = useState(false);
 *   <button onClick={() => setAsk(true)}>Borrar</button>
 *   <ConfirmDialog
 *     open={ask}
 *     variant="danger"
 *     title="Borrar formulario"
 *     message="Esta acción no se puede deshacer."
 *     confirmLabel="Borrar"
 *     onConfirm={async () => { await deleteIt(); setAsk(false); }}
 *     onCancel={() => setAsk(false)}
 *   />
 */

import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, Info, Loader2, X } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Cuerpo del modal. Puede ser un string corto o JSX para incluir énfasis. */
  message: ReactNode;
  /** Texto adicional debajo del mensaje principal — color text-muted, opcional. */
  detail?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger = rojo (borrado), warning = amarillo (alerta), info = primary (default). */
  variant?: ConfirmVariant;
  /** Si onConfirm es async, este flag bloquea botones mientras corre. */
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  detail,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  loading: externalLoading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Loading interno se activa cuando onConfirm devuelve una Promise.
  // El consumidor también puede forzarlo via prop `loading`.
  const [internalLoading, setInternalLoading] = useState(false);
  const isLoading = externalLoading ?? internalLoading;

  if (!open) return null;

  const palette =
    variant === 'danger'
      ? { iconBg: 'bg-danger/10', iconColor: 'text-danger', btn: 'bg-danger hover:bg-danger/90', Icon: Trash2 }
      : variant === 'warning'
        ? { iconBg: 'bg-warning/10', iconColor: 'text-warning', btn: 'bg-warning hover:bg-warning/90', Icon: AlertTriangle }
        : { iconBg: 'bg-primary/10', iconColor: 'text-primary', btn: 'bg-primary hover:bg-primary-light', Icon: Info };

  async function handleConfirm() {
    try {
      const maybePromise = onConfirm();
      if (maybePromise && typeof (maybePromise as Promise<void>).then === 'function') {
        setInternalLoading(true);
        await maybePromise;
      }
    } finally {
      setInternalLoading(false);
    }
  }

  const PaletteIcon = palette.Icon;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => { if (!isLoading) onCancel(); }}
      />
      <div className="relative z-10 bg-surface rounded-2xl shadow-2xl border-2 border-border-color max-w-sm w-full p-6 animate-scale-in">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-bg text-text-muted disabled:opacity-30 transition-colors"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-4 mb-5">
          <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${palette.iconBg} ${palette.iconColor}`}>
            <PaletteIcon size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="confirm-dialog-title" className="font-bold text-lg text-text-main leading-tight">{title}</h3>
            <div className="text-sm text-text-main mt-2">{message}</div>
            {detail && <div className="text-xs text-text-muted mt-2">{detail}</div>}
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl border-2 border-border-color text-text-main font-semibold hover:bg-bg transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl text-white font-semibold transition-colors flex items-center gap-2 disabled:opacity-60 ${palette.btn}`}
          >
            {isLoading && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
