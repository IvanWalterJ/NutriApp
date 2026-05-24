/**
 * Página pública del formulario pre-consulta.
 *
 * Se renderiza fuera del shell con auth — el paciente sólo necesita el link
 * o el QR. Lee el form por slug (RLS permite SELECT anónimo si is_active
 * y no vencido), submitea a form_responses (RLS permite INSERT anónimo
 * para forms vivos).
 */

import { useEffect, useState, useMemo, type FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { BRAND } from '../../lib/branding';
import type { FormField, FormRecord } from '../../lib/formTypes';

interface Props {
  slug: string;
}

type FieldValue = string | number | boolean | null;

export default function PublicFormPage({ slug }: Props) {
  const [form, setForm] = useState<FormRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [values, setValues] = useState<Record<string, FieldValue>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('forms')
        .select('id, slug, company, title, description, fields, expires_at, is_active, created_at')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setForm(data as FormRecord);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const fields = useMemo<FormField[]>(() => (form?.fields ?? []) as FormField[], [form]);

  function setValue(key: string, value: FieldValue) {
    setValues(prev => ({ ...prev, [key]: value }));
    if (validationErrors[key]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    for (const f of fields) {
      if (f.required) {
        const v = values[f.key];
        if (v === undefined || v === null || v === '') {
          errs[f.key] = 'Este campo es obligatorio';
        }
      }
      if (f.type === 'email' && values[f.key]) {
        const s = String(values[f.key]);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
          errs[f.key] = 'Email inválido';
        }
      }
    }
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { error } = await supabase.from('form_responses').insert({
        form_id: form.id,
        data: values,
        user_agent: navigator.userAgent.slice(0, 300),
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      console.error('Form submit error:', err);
      setSubmitError(err?.message || 'No pudimos enviar tu respuesta. Probá de nuevo en un minuto.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (notFound || !form) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-surface rounded-2xl shadow-xl border-2 border-border-color p-8 text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold mb-2 text-text-main">Formulario no disponible</h2>
          <p className="text-text-muted">
            Este link ya no está activo o expiró. Si necesitás completar tu formulario,
            contactá a tu nutricionista para que te genere uno nuevo.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-surface rounded-2xl shadow-xl border-2 border-border-color p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold mb-3 text-text-main">¡Listo!</h2>
          <p className="text-text-muted mb-2">
            Recibimos tu información. {BRAND.professional} la va a revisar antes de tu consulta.
          </p>
          <p className="text-text-muted text-sm">
            Ya podés cerrar esta página.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg py-6 px-4 sm:py-12">
      <div className="max-w-2xl mx-auto">
        <header className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-accent text-base font-black">N</div>
            <span className="font-mono font-bold text-base tracking-tight">
              <span className="text-text-main">NU</span><span className="text-primary">PLAN</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-text-main">{form.title}</h1>
          {form.description && (
            <p className="text-text-muted mt-2 text-sm sm:text-base">{form.description}</p>
          )}
        </header>

        <form
          onSubmit={handleSubmit}
          className="bg-surface rounded-2xl shadow-xl border-2 border-border-color p-5 sm:p-8 space-y-5"
        >
          {fields.map((f: FormField) => (
            <FieldRenderer
              key={f.key}
              field={f}
              value={values[f.key]}
              error={validationErrors[f.key]}
              onChange={v => setValue(f.key, v)}
            />
          ))}

          {submitError && (
            <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg text-sm text-danger">
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-primary text-white rounded-xl font-bold text-base hover:bg-primary-light transition-all disabled:opacity-50 active:scale-95"
          >
            {submitting ? 'Enviando…' : 'Enviar formulario'}
          </button>
        </form>

        <p className="text-center text-xs text-text-muted mt-6">
          Tus datos se envían directamente a {BRAND.professional}. No los compartimos con terceros.
        </p>
      </div>
    </div>
  );
}

interface FieldRendererProps {
  /** React reconciliation key — declarado para satisfacer al checker en este setup */
  key?: string;
  field: FormField;
  value: FieldValue | undefined;
  error: string | undefined;
  onChange: (v: FieldValue) => void;
}

function FieldRenderer({ field, value, error, onChange }: FieldRendererProps) {
  const baseInputCls = `w-full px-3 py-2 border-2 rounded-lg bg-bg text-text-main focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${
    error ? 'border-danger' : 'border-border-color focus:border-primary'
  }`;

  return (
    <div>
      <label className="block text-sm font-bold text-text-main mb-1.5">
        {field.label}
        {field.required && <span className="text-danger ml-1">*</span>}
      </label>
      {field.helpText && (
        <p className="text-xs text-text-muted mb-1.5">{field.helpText}</p>
      )}

      {field.type === 'textarea' ? (
        <textarea
          rows={4}
          value={(value ?? '') as string}
          placeholder={field.placeholder}
          onChange={e => onChange(e.target.value)}
          className={baseInputCls}
        />
      ) : field.type === 'select' ? (
        <select
          value={(value ?? '') as string}
          onChange={e => onChange(e.target.value)}
          className={baseInputCls}
        >
          <option value="">— Elegí una opción —</option>
          {(field.options ?? []).map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : field.type === 'yesno' ? (
        <div className="flex gap-2">
          {(['Sí', 'No'] as const).map(opt => {
            const boolVal = opt === 'Sí';
            const selected = value === boolVal;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(boolVal)}
                className={`flex-1 py-2 rounded-lg border-2 font-semibold transition-colors ${
                  selected
                    ? 'bg-primary text-white border-primary'
                    : 'bg-bg text-text-main border-border-color hover:border-primary'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      ) : field.type === 'rating1to5' ? (
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(n => {
            const selected = value === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                className={`flex-1 py-2 rounded-lg border-2 font-bold transition-colors ${
                  selected
                    ? 'bg-primary text-white border-primary'
                    : 'bg-bg text-text-main border-border-color hover:border-primary'
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
      ) : (
        <input
          type={field.type}
          value={(value ?? '') as string}
          placeholder={field.placeholder}
          onChange={e => {
            const raw = e.target.value;
            if (field.type === 'number') {
              const n = raw === '' ? null : Number(raw);
              onChange(Number.isFinite(n as number) ? (n as number) : null);
            } else {
              onChange(raw);
            }
          }}
          className={baseInputCls}
        />
      )}

      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}
