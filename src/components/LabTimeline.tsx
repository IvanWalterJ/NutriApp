import React, { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import { FlaskConical, TrendingDown, TrendingUp, Minus, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatLocalDate, parseLocalDate } from '../lib/dateUtils';
import {
  LAB_FIELDS,
  LabField,
  LabFieldDef,
  classifyLab,
  evaluateTrend,
  tgHdlRatio,
} from '../lib/labReferences';

interface LabRow {
  id: string;
  patient_id: string;
  session_id: string | null;
  lab_date: string;
  glucose: number | null;
  hba1c: number | null;
  total_cholesterol: number | null;
  ldl: number | null;
  hdl: number | null;
  triglycerides: number | null;
  vitamin_d: number | null;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  notes: string | null;
}

interface LabTimelineProps {
  patientId: string;
  patientSex?: string | null;
  /** Refresh trigger — cualquier cambio re-fetchea los datos */
  refreshKey?: number | string;
}

function getThreshold(field: LabField, sex?: string | null): number | null {
  switch (field) {
    case 'glucose':           return 100;
    case 'hba1c':             return 5.7;
    case 'total_cholesterol': return 200;
    case 'ldl':               return 100;
    case 'hdl':               return sex === 'Masculino' ? 40 : 50;
    case 'triglycerides':     return 150;
    case 'vitamin_d':         return 30;
    case 'bp_systolic':       return 130;
    case 'bp_diastolic':      return 85;
    case 'tg_hdl_ratio':      return 3.5;
    default:                  return null;
  }
}

function trendIcon(trend: string) {
  if (trend === 'improved') return <TrendingDown size={14} className="text-primary" />;
  if (trend === 'worsened') return <TrendingUp size={14} className="text-danger" />;
  if (trend === 'same') return <Minus size={14} className="text-text-muted" />;
  return null;
}

function trendLabel(trend: string) {
  if (trend === 'improved') return 'Mejoró';
  if (trend === 'worsened') return 'Empeoró';
  if (trend === 'same') return 'Igual';
  return '—';
}

interface MiniChartProps {
  data: { date: string; v: number }[];
  field: LabField;
  def: LabFieldDef;
  sex?: string;
}

function MiniChart({ data, field, def, sex }: MiniChartProps) {
  const threshold = getThreshold(field, sex);
  const hasEnough = data.length >= 1;

  const last = data.length > 0 ? data[data.length - 1].v : null;
  const prev = data.length > 1 ? data[data.length - 2].v : null;
  const cls = last != null ? classifyLab(field, last, sex) : 'unknown';
  const trend = evaluateTrend(field, last, prev);

  return (
    <div className={`bg-surface rounded-xl border-2 p-3 ${
      cls === 'normal' ? 'border-accent/30' :
      cls === 'altered' ? 'border-danger/30' :
      'border-border-color'
    }`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted">{def.shortLabel}</div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono font-bold text-lg text-text-main">
              {last != null ? last.toFixed(def.decimals) : '—'}
            </span>
            <span className="text-[10px] text-text-muted">{def.unit}</span>
          </div>
          <div className="text-[10px] text-text-muted">Normal: {def.normalRange}</div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {cls !== 'unknown' && (
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
              cls === 'normal'
                ? 'bg-accent/10 text-primary border border-accent/30'
                : 'bg-danger/10 text-danger border border-danger/30'
            }`}>
              {cls === 'normal' ? 'Normal' : 'Alterado'}
            </span>
          )}
          {trend !== 'unknown' && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-text-muted">
              {trendIcon(trend)} {trendLabel(trend)}
            </span>
          )}
        </div>
      </div>

      <div className="h-20 -mx-1">
        {hasEnough ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="date" hide />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ fontSize: 11, padding: '4px 8px', borderRadius: 6 }}
                labelFormatter={(v) => formatLocalDate(v as string, { day: '2-digit', month: 'short', year: 'numeric' }, 'es-AR')}
                formatter={(v: any) => [`${Number(v).toFixed(def.decimals)} ${def.unit}`, def.shortLabel]}
              />
              {threshold != null && (
                <ReferenceLine y={threshold} stroke="#dc2626" strokeDasharray="3 3" strokeWidth={1} />
              )}
              <Line
                type="monotone"
                dataKey="v"
                stroke="#0A4D3C"
                strokeWidth={2}
                dot={{ r: 3, fill: '#0A4D3C' }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-[11px] text-text-muted/60">
            Sin datos
          </div>
        )}
      </div>
    </div>
  );
}

export default function LabTimeline({ patientId, patientSex, refreshKey }: LabTimelineProps) {
  const [rows, setRows] = useState<LabRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      const { data, error } = await supabase
        .from('lab_results')
        .select('*')
        .eq('patient_id', patientId)
        .order('lab_date', { ascending: true });
      if (cancelled) return;
      if (error) {
        setError(error.message || 'No se pudieron cargar los resultados de laboratorio');
        setRows([]);
      } else {
        setRows((data as LabRow[]) || []);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [patientId, refreshKey]);

  // Series por campo, omitiendo entries con null en ese campo.
  const seriesByField = useMemo(() => {
    const out: Record<string, { date: string; v: number }[]> = {};
    const fields: LabField[] = LAB_FIELDS.map(f => f.field);
    for (const f of fields) out[f] = [];
    for (const r of rows) {
      for (const f of LAB_FIELDS) {
        if (f.field === 'tg_hdl_ratio') {
          const ratio = tgHdlRatio(r.triglycerides, r.hdl);
          if (ratio != null) out[f.field].push({ date: r.lab_date, v: ratio });
        } else {
          const v = (r as any)[f.field] as number | null;
          if (v != null && Number.isFinite(v)) out[f.field].push({ date: r.lab_date, v: Number(v) });
        }
      }
    }
    return out;
  }, [rows]);

  if (loading) {
    return (
      <div className="bg-bg rounded-2xl border border-border-color p-6 flex items-center justify-center gap-3 text-text-muted">
        <Loader2 size={18} className="animate-spin" /> Cargando resultados de laboratorio…
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-danger/5 rounded-2xl border border-danger/30 p-4 text-sm text-danger">
        {error}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="bg-bg rounded-2xl border-2 border-dashed border-border-color p-6 text-center">
        <FlaskConical size={28} className="text-text-muted/50 mx-auto mb-2" />
        <p className="text-sm font-semibold text-text-muted">Sin resultados de laboratorio cargados</p>
        <p className="text-xs text-text-muted/70 mt-1">Cargá valores desde "Nueva Consulta" o desde el alta del paciente para ver el progreso.</p>
      </div>
    );
  }

  // Resumen: cuántos parámetros mejoraron entre el primero y el último lab
  const summary = (() => {
    if (rows.length < 2) return null;
    const first = rows[0];
    const last = rows[rows.length - 1];
    let improved = 0, same = 0, worsened = 0;
    const tracked: LabField[] = ['glucose','hba1c','total_cholesterol','ldl','hdl','triglycerides'];
    for (const f of tracked) {
      const t = evaluateTrend(f, (last as any)[f], (first as any)[f]);
      if (t === 'improved') improved++;
      else if (t === 'worsened') worsened++;
      else if (t === 'same') same++;
    }
    return { improved, same, worsened, firstDate: first.lab_date, lastDate: last.lab_date };
  })();

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <FlaskConical size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-main">Laboratorio · Línea del tiempo</h3>
            <p className="text-xs text-text-muted">{rows.length} resultado{rows.length === 1 ? '' : 's'} cargado{rows.length === 1 ? '' : 's'}</p>
          </div>
        </div>

        {summary && (
          <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
            <span className="px-3 py-1.5 rounded-lg bg-accent/10 text-primary border border-accent/30 flex items-center gap-1.5">
              <TrendingDown size={13} /> Mejoró: <strong>{summary.improved}</strong>
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-bg text-text-muted border border-border-color flex items-center gap-1.5">
              <Minus size={13} /> Igual: <strong>{summary.same}</strong>
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-danger/10 text-danger border border-danger/30 flex items-center gap-1.5">
              <TrendingUp size={13} /> Empeoró: <strong>{summary.worsened}</strong>
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-surface text-text-muted border border-border-color hidden md:inline-flex items-center">
              {formatLocalDate(summary.firstDate, { day: '2-digit', month: 'short' }, 'es-AR')} → {formatLocalDate(summary.lastDate, { day: '2-digit', month: 'short', year: '2-digit' }, 'es-AR')}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {LAB_FIELDS.map(def => (
          <div key={def.field}>
            <MiniChart
              data={seriesByField[def.field] || []}
              field={def.field}
              def={def}
              sex={patientSex ?? undefined}
            />
          </div>
        ))}
      </div>

      {/* Tabla compacta para revisión */}
      <details className="bg-bg rounded-2xl border border-border-color">
        <summary className="cursor-pointer p-4 font-semibold text-sm text-text-main flex items-center gap-2">
          <span>Ver tabla detallada de laboratorios ({rows.length})</span>
        </summary>
        <div className="overflow-x-auto px-4 pb-4">
          <table className="w-full text-xs">
            <thead className="bg-surface">
              <tr>
                <th className="text-left p-2 font-bold uppercase tracking-wider text-text-muted">Fecha</th>
                {LAB_FIELDS.filter(f => f.field !== 'tg_hdl_ratio').map(f => (
                  <th key={f.field} className="text-right p-2 font-bold uppercase tracking-wider text-text-muted">{f.shortLabel}</th>
                ))}
                <th className="text-right p-2 font-bold uppercase tracking-wider text-text-muted">TG/HDL</th>
              </tr>
            </thead>
            <tbody>
              {[...rows].sort((a, b) => {
                const da = parseLocalDate(a.lab_date)?.getTime() ?? 0;
                const db = parseLocalDate(b.lab_date)?.getTime() ?? 0;
                return db - da;
              }).map(r => {
                const ratio = tgHdlRatio(r.triglycerides, r.hdl);
                return (
                  <tr key={r.id} className="border-t border-border-color">
                    <td className="p-2 font-mono">{formatLocalDate(r.lab_date, { day: '2-digit', month: '2-digit', year: 'numeric' }, 'es-AR')}</td>
                    {LAB_FIELDS.filter(f => f.field !== 'tg_hdl_ratio').map(f => {
                      const v = (r as any)[f.field] as number | null;
                      const cls = classifyLab(f.field, v, patientSex);
                      return (
                        <td key={f.field} className={`p-2 text-right font-mono ${cls === 'altered' ? 'text-danger font-bold' : ''}`}>
                          {v != null ? Number(v).toFixed(f.decimals) : '—'}
                        </td>
                      );
                    })}
                    <td className={`p-2 text-right font-mono ${ratio != null && ratio >= 3.5 ? 'text-danger font-bold' : ''}`}>
                      {ratio != null ? ratio.toFixed(2) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
