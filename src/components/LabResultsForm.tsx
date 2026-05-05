import React, { useState } from 'react';
import { ChevronDown, ChevronUp, FlaskConical } from 'lucide-react';
import {
  LAB_FIELDS,
  LabField,
  LabFieldDef,
  classifyLab,
  tgHdlRatio,
} from '../lib/labReferences';
import { todayLocalISODate } from '../lib/dateUtils';

// Todos los campos viajan como string para evitar mezcla de "" y NaN.
export interface LabFormValues {
  lab_date: string;
  glucose: string;
  hba1c: string;
  total_cholesterol: string;
  ldl: string;
  hdl: string;
  triglycerides: string;
  vitamin_d: string;
  bp_systolic: string;
  bp_diastolic: string;
  notes: string;
}

export const EMPTY_LAB_VALUES: LabFormValues = {
  lab_date: '',
  glucose: '',
  hba1c: '',
  total_cholesterol: '',
  ldl: '',
  hdl: '',
  triglycerides: '',
  vitamin_d: '',
  bp_systolic: '',
  bp_diastolic: '',
  notes: '',
};

/** Devuelve true si al menos un campo numérico tiene valor cargado */
export function hasAnyLabValue(v: LabFormValues): boolean {
  return [
    v.glucose, v.hba1c, v.total_cholesterol, v.ldl, v.hdl,
    v.triglycerides, v.vitamin_d, v.bp_systolic, v.bp_diastolic,
  ].some(s => s !== '' && s != null);
}

/** Convierte el form a payload para insertar en la tabla lab_results.
 *  Devuelve null si el usuario no cargó ningún valor (omitir el insert). */
export function labFormToPayload(
  v: LabFormValues,
  patientId: string,
  sessionId: string | null,
  fallbackDate: string,
): Record<string, any> | null {
  if (!hasAnyLabValue(v) && !v.notes) return null;
  const num = (s: string) => (s === '' ? null : Number(s));
  return {
    patient_id: patientId,
    session_id: sessionId,
    lab_date: v.lab_date || fallbackDate || todayLocalISODate(),
    glucose: num(v.glucose),
    hba1c: num(v.hba1c),
    total_cholesterol: num(v.total_cholesterol),
    ldl: num(v.ldl),
    hdl: num(v.hdl),
    triglycerides: num(v.triglycerides),
    vitamin_d: num(v.vitamin_d),
    bp_systolic: v.bp_systolic === '' ? null : parseInt(v.bp_systolic, 10),
    bp_diastolic: v.bp_diastolic === '' ? null : parseInt(v.bp_diastolic, 10),
    notes: v.notes || null,
  };
}

interface LabResultsFormProps {
  value: LabFormValues;
  onChange: (next: LabFormValues) => void;
  /** Sexo del paciente — afecta la clasificación del HDL */
  patientSex?: string | null;
  /** Si se pasa, el componente arranca colapsado y se muestra como sección plegable */
  collapsible?: boolean;
  /** Estado inicial cuando es plegable (default: true = abierto si ya hay datos, cerrado si no) */
  defaultOpen?: boolean;
  /** Texto del título cuando es plegable */
  title?: string;
  /** Subtítulo opcional */
  subtitle?: string;
}

const NUMERIC_FIELDS: { field: LabField; key: keyof LabFormValues }[] = [
  { field: 'glucose',           key: 'glucose' },
  { field: 'hba1c',             key: 'hba1c' },
  { field: 'total_cholesterol', key: 'total_cholesterol' },
  { field: 'ldl',               key: 'ldl' },
  { field: 'hdl',               key: 'hdl' },
  { field: 'triglycerides',     key: 'triglycerides' },
  { field: 'vitamin_d',         key: 'vitamin_d' },
  { field: 'bp_systolic',       key: 'bp_systolic' },
  { field: 'bp_diastolic',      key: 'bp_diastolic' },
];

function ClassificationBadge({ field, raw, sex }: { field: LabField; raw: string; sex?: string | null }) {
  if (raw === '') return null;
  const v = Number(raw);
  if (!Number.isFinite(v)) return null;
  const cls = classifyLab(field, v, sex);
  if (cls === 'unknown') return null;
  const isNormal = cls === 'normal';
  return (
    <span className={`mt-1 inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
      isNormal
        ? 'bg-accent/10 text-primary border border-accent/30'
        : 'bg-danger/10 text-danger border border-danger/30'
    }`}>
      {isNormal ? '✓ Normal' : '⚠ Alterado'}
    </span>
  );
}

export default function LabResultsForm({
  value,
  onChange,
  patientSex,
  collapsible = false,
  defaultOpen,
  title = 'Laboratorio',
  subtitle = 'Opcional · Permite seguimiento metabólico',
}: LabResultsFormProps) {
  const startOpen = defaultOpen ?? hasAnyLabValue(value);
  const [open, setOpen] = useState(collapsible ? startOpen : true);

  const setField = (key: keyof LabFormValues, v: string) => {
    onChange({ ...value, [key]: v });
  };

  const ratio = tgHdlRatio(
    value.triglycerides === '' ? null : Number(value.triglycerides),
    value.hdl === '' ? null : Number(value.hdl),
  );
  const ratioCls = ratio != null ? classifyLab('tg_hdl_ratio', ratio) : 'unknown';

  const inputClass =
    'w-full p-2.5 border-2 border-border-color rounded-lg bg-surface focus:border-primary focus:outline-none font-mono text-sm';
  const labelClass = 'block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1';

  const fieldByKey = (key: LabField): LabFieldDef => {
    const def = LAB_FIELDS.find(f => f.field === key);
    if (!def) throw new Error(`LabField not found: ${key}`);
    return def;
  };

  const body = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Fecha del laboratorio</label>
          <input
            type="date"
            className={inputClass}
            value={value.lab_date}
            onChange={e => setField('lab_date', e.target.value)}
          />
          <p className="mt-1 text-[10px] text-text-muted">Si no se carga, se usa la fecha de la consulta</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {NUMERIC_FIELDS.map(({ field, key }) => {
          const def = fieldByKey(field);
          return (
            <div key={field}>
              <label className={labelClass}>{def.shortLabel} <span className="text-text-muted/60 normal-case">({def.unit})</span></label>
              <input
                type="number"
                step={def.decimals === 0 ? '1' : '0.1'}
                inputMode="decimal"
                placeholder={`Normal: ${def.normalRange}`}
                className={inputClass}
                value={value[key] as string}
                onChange={e => setField(key, e.target.value)}
              />
              <ClassificationBadge field={field} raw={value[key] as string} sex={patientSex} />
            </div>
          );
        })}

        {/* TG/HDL calculado */}
        <div className="bg-bg/60 border border-dashed border-border-color rounded-lg p-2.5">
          <span className={labelClass}>TG / HDL <span className="text-text-muted/60 normal-case">(calculado)</span></span>
          <div className="font-mono font-bold text-lg">
            {ratio != null ? ratio.toFixed(2) : <span className="text-text-muted/60 text-sm font-normal">—</span>}
          </div>
          {ratio != null && ratioCls !== 'unknown' && (
            <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
              ratioCls === 'normal'
                ? 'bg-accent/10 text-primary border border-accent/30'
                : 'bg-danger/10 text-danger border border-danger/30'
            }`}>
              {ratioCls === 'normal' ? '✓ Normal' : '⚠ Alterado'}
            </span>
          )}
        </div>
      </div>

      <div>
        <label className={labelClass}>Notas / Observaciones</label>
        <textarea
          rows={2}
          className={`${inputClass} font-sans resize-y`}
          placeholder="Comentarios del laboratorio (opcional)"
          value={value.notes}
          onChange={e => setField('notes', e.target.value)}
        />
      </div>
    </div>
  );

  if (!collapsible) {
    return (
      <div className="bg-bg p-4 md:p-6 rounded-2xl border border-border-color shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <FlaskConical size={18} className="text-primary" />
          <h3 className="text-lg font-bold text-primary">{title}</h3>
          <span className="text-xs text-text-muted">{subtitle}</span>
        </div>
        {body}
      </div>
    );
  }

  return (
    <div className="bg-bg rounded-2xl border border-border-color shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 p-4 md:p-5 hover:bg-primary/5 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <FlaskConical size={18} className="text-primary" />
          <div>
            <div className="font-bold text-primary">{title}</div>
            <div className="text-xs text-text-muted">{subtitle}</div>
          </div>
          {hasAnyLabValue(value) && (
            <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              cargado
            </span>
          )}
        </div>
        {open ? <ChevronUp size={20} className="text-text-muted" /> : <ChevronDown size={20} className="text-text-muted" />}
      </button>
      {open && (
        <div className="px-4 pb-4 md:px-6 md:pb-6 border-t border-border-color">
          <div className="pt-4">{body}</div>
        </div>
      )}
    </div>
  );
}
