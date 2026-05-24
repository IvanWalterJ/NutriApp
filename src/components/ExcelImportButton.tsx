import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { useCompany } from '../context/CompanyContext';
import { useToast } from '../context/ToastContext';
import { FileUp, X, AlertTriangle, CheckCircle2, Loader2, Info, Sparkles } from 'lucide-react';
import {
  parseNewPatientsSheet,
  parseConsultasSheet,
  parseNormalizedRows,
  markDuplicates,
  headersMatchSchema,
  resolveConsultaPatientIds,
  type PatientCandidate,
} from '../lib/excelParser';
import {
  PACIENTES_NUEVOS_HEADERS,
  type ParseRowResult,
  type ParsedNewPatient,
  type ParsedConsulta,
} from '../lib/excelSchemas';

type DupePolicy = 'skip' | 'update';
type Source = 'oficial' | 'ia';

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

interface Props {
  onImported?: () => void;
}

export default function ExcelImportButton({ onImported }: Props) {
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [filename, setFilename] = useState<string>('');
  const [rows, setRows] = useState<ParseRowResult<ParsedNewPatient>[]>([]);
  // Sesiones históricas (hoja "Consultas"). Se cargan en paralelo a los pacientes
  // nuevos para permitir backdate de múltiples sesiones por paciente.
  const [consultas, setConsultas] = useState<ParseRowResult<ParsedConsulta>[]>([]);
  const [headerErrors, setHeaderErrors] = useState<string[]>([]);
  const [sheetMissing, setSheetMissing] = useState(false);
  const [dupePolicy, setDupePolicy] = useState<DupePolicy>('skip');
  const [importing, setImporting] = useState(false);

  // Estado para el flujo IA
  const [needsAI, setNeedsAI] = useState(false);
  const [aiLoading, setAILoading] = useState(false);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [source, setSource] = useState<Source>('oficial');
  const rawDataRef = useRef<{ headers: unknown[]; rows: unknown[][] } | null>(null);

  function reset() {
    setRows([]);
    setConsultas([]);
    setHeaderErrors([]);
    setSheetMissing(false);
    setFilename('');
    setNeedsAI(false);
    setColumnMapping({});
    setSource('oficial');
    rawDataRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);

    try {
      // Detectamos CSV por extensión y lo leemos como string UTF-8 — si lo
      // leemos como ArrayBuffer, xlsx por default asume codepage Windows-1252
      // y rompe los acentos (María → MarÃa).
      const isCSV = /\.csv$/i.test(file.name);
      const wb = isCSV
        ? XLSX.read(await file.text(), { type: 'string', cellDates: false })
        : XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });

      // Camino rápido: si los headers de "Pacientes Nuevos" matchean el schema oficial,
      // usamos el parser determinístico (sin costo de IA). Procesamos también la
      // hoja "Consultas" si está presente — permite cargar histórico multi-fecha
      // en una sola subida.
      const parsed = parseNewPatientsSheet(wb);
      const parsedConsultas = parseConsultasSheet(wb);
      const hasNewPatients = !parsed.sheetMissing && parsed.headerErrors.length === 0 && parsed.rows.length > 0;
      const hasConsultas   = !parsedConsultas.sheetMissing && parsedConsultas.headerErrors.length === 0 && parsedConsultas.rows.length > 0;
      if (hasNewPatients || hasConsultas) {
        await applyDedupAndShow(parsed.rows, parsedConsultas.rows, 'oficial');
        return;
      }

      // Camino IA: extraemos la PRIMERA hoja del archivo y dejamos que el usuario
      // confirme antes de pagar la llamada al modelo.
      const firstSheetName = wb.SheetNames[0];
      if (!firstSheetName) {
        showToast('El archivo no tiene hojas legibles', 'error');
        return;
      }
      const aoa = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[firstSheetName], { header: 1, raw: true, defval: null });
      const nonEmpty = aoa.filter(r => Array.isArray(r) && r.some(c => c !== null && c !== undefined && c !== ''));
      if (nonEmpty.length < 2) {
        showToast('El archivo está vacío o solo tiene headers', 'error');
        return;
      }

      rawDataRef.current = {
        headers: nonEmpty[0] as unknown[],
        rows: nonEmpty.slice(1) as unknown[][],
      };

      // Si los headers de la primera hoja ya matchean el schema oficial,
      // procesamos como si fuera la planilla oficial — sin IA.
      if (headersMatchSchema(nonEmpty[0] as unknown[], PACIENTES_NUEVOS_HEADERS)) {
        // Re-parseamos con el sheet name correcto. parseNewPatientsSheet busca por nombre,
        // así que renombramos virtualmente la hoja.
        const ws = wb.Sheets[firstSheetName];
        wb.Sheets['Pacientes Nuevos'] = ws;
        if (!wb.SheetNames.includes('Pacientes Nuevos')) wb.SheetNames.push('Pacientes Nuevos');
        const reparsed = parseNewPatientsSheet(wb);
        await applyDedupAndShow(reparsed.rows, [], 'oficial');
        return;
      }

      // Headers no coinciden → ofrecemos mapeo con IA
      setNeedsAI(true);
      setShowModal(true);
    } catch (err: any) {
      console.error('Error parsing Excel:', err);
      showToast(err?.message || 'No se pudo leer el archivo', 'error');
      reset();
    }
  }

  async function applyDedupAndShow(
    parsedRows: ParseRowResult<ParsedNewPatient>[],
    parsedConsultas: ParseRowResult<ParsedConsulta>[],
    src: Source,
  ) {
    // 1. Dedup de pacientes nuevos contra DB.
    const { data: existingFull } = await supabase
      .from('patients')
      .select('id, email, first_name, last_name, birth_date')
      .eq('company', selectedCompany);
    const existing = existingFull || [];
    markDuplicates(parsedRows, existing);

    // 2. Resolver patient_id en cada consulta: matchea contra pacientes DB +
    //    pacientes nuevos que vamos a importar (para que histórico funcione
    //    en una sola subida).
    const candidates: PatientCandidate[] = existing.map(e => ({
      id: e.id, first_name: e.first_name, last_name: e.last_name, birth_date: e.birth_date,
    }));
    // Pacientes nuevos válidos que aún no están en DB: usamos un ID placeholder
    // que reemplazaremos por el ID real después del insert.
    for (let i = 0; i < parsedRows.length; i++) {
      const r = parsedRows[i];
      if (r.data && r.errors.length === 0 && !r.isDuplicate) {
        candidates.push({
          id: `__pending_${i}__`,
          first_name: r.data.first_name,
          last_name: r.data.last_name,
          birth_date: r.data.birth_date,
        });
      }
    }
    resolveConsultaPatientIds(parsedConsultas, candidates);

    setRows(parsedRows);
    setConsultas(parsedConsultas);
    setHeaderErrors([]);
    setSheetMissing(false);
    setSource(src);
    setNeedsAI(false);
    setShowModal(true);
  }

  async function handleNormalizeWithAI() {
    if (!rawDataRef.current) return;
    setAILoading(true);
    try {
      const response = await fetch('/api/normalize-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rawDataRef.current),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || `HTTP ${response.status}`);
      }
      const payload = await response.json() as { column_mapping: Record<string, string>; rows: any[] };

      // VALIDACIÓN POSTERIOR: las filas de la IA pasan por el mismo schema
      // que las del archivo oficial. Esto descarta cualquier dato que el modelo
      // pueda haber generado mal (o inventado).
      const normalized = parseNormalizedRows(payload.rows || []);
      setColumnMapping(payload.column_mapping || {});
      // El camino IA no procesa hoja Consultas (sólo Pacientes Nuevos).
      await applyDedupAndShow(normalized, [], 'ia');
    } catch (err: any) {
      console.error('Error normalizando con IA:', err);
      showToast(err?.message || 'No se pudo normalizar con IA', 'error');
    } finally {
      setAILoading(false);
    }
  }

  async function handleConfirm() {
    setImporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      // 1. Crear el batch
      const { data: batch, error: batchError } = await supabase
        .from('import_batches')
        .insert([{
          company: selectedCompany,
          nutritionist_id: user.id,
          filename,
        }])
        .select('id')
        .single();
      if (batchError) throw batchError;

      // 2. Filtrar pacientes nuevos a insertar
      const toInsert = rows.filter(r => {
        if (!r.data || r.errors.length > 0) return false;
        if (r.isDuplicate && dupePolicy === 'skip') return false;
        return true;
      });

      let inserted = 0;
      let skipped = rows.length - toInsert.length;

      // Mapa __pending_<idx>__ → ID real del paciente recién creado.
      // Lo usamos para reescribir patient_id en las consultas.
      const pendingToReal = new Map<string, string>();

      // 3. Insertar pacientes en lotes de 50
      const batches = chunk<ParseRowResult<ParsedNewPatient>>(toInsert, 50);
      // Necesito el índice original (en `rows`) para reconstruir el placeholder.
      const indexInRows = new Map<ParseRowResult<ParsedNewPatient>, number>();
      rows.forEach((r, i) => indexInRows.set(r, i));

      for (const grupo of batches) {
        const payload = grupo.map(r => ({
          first_name:      r.data!.first_name,
          last_name:       r.data!.last_name,
          email:           r.data!.email,
          phone:           r.data!.phone,
          birth_date:      r.data!.birth_date,
          sex:             r.data!.sex,
          area:            r.data!.area,
          initial_weight:  r.data!.initial_weight,
          height:          r.data!.height,
          status:          'En Progreso',
          company:         selectedCompany,
          created_by:      user.id,
          import_batch_id: batch.id,
          imported_at:     new Date().toISOString(),
        }));
        const { data: created, error: insErr } = await supabase
          .from('patients')
          .insert(payload)
          .select('id');
        if (insErr) {
          console.error('Insert error en batch:', insErr);
          skipped += grupo.length;
          continue;
        }
        inserted += created?.length ?? 0;

        // 4. Crear sesión inicial por cada paciente recién creado.
        //    Usamos first_session_date si vino en la planilla, sino hoy.
        if (created && created.length > 0) {
          const today = new Date().toISOString().slice(0, 10);
          const sessionsPayload = created.map((p, i) => {
            const src = grupo[i].data!;
            // Registrar el mapeo placeholder → ID real
            const originalIdx = indexInRows.get(grupo[i]);
            if (originalIdx !== undefined) {
              pendingToReal.set(`__pending_${originalIdx}__`, p.id);
            }
            return {
              patient_id: p.id,
              nutritionist_id: user.id,
              session_date: src.first_session_date ?? today,
              company: selectedCompany,
              session_type: 'Consulta',
              weight: src.initial_weight,
              height: src.height,
              adherence: src.adherence,
              hydration: src.hydration,
              physical_activity: src.physical_activity,
              consumo_frutas_verduras: src.consumo_frutas_verduras,
              energy_level: src.energy_level,
              sleep_quality: src.sleep_quality,
            };
          }).filter(s => s.weight !== null || s.adherence !== null || s.consumo_frutas_verduras !== null);
          if (sessionsPayload.length > 0) {
            const { error: sErr } = await supabase.from('sessions').insert(sessionsPayload);
            if (sErr) console.error('Sessions insert error (no bloquea import):', sErr);
          }
        }
      }

      // 5. Insertar sesiones históricas de la hoja "Consultas".
      //    Si el patient_id es un placeholder __pending_*__, lo reemplazamos por
      //    el ID real generado en el paso anterior. Si el paciente nuevo falló,
      //    saltamos su consulta (no nos podemos vincular a un patient que no existe).
      let consultasInserted = 0;
      let consultasSkipped = 0;
      type ConsultaToInsert = { row: ParseRowResult<ParsedConsulta>; patient_id: string };
      const validConsultas: ConsultaToInsert[] = consultas
        .filter(c => c.data && c.errors.length === 0)
        .map(c => {
          let pid: string | null = c.data!.patient_id;
          if (pid && pid.startsWith('__pending_')) {
            pid = pendingToReal.get(pid) ?? null;
          }
          return { row: c, patient_id: pid };
        })
        .filter((x): x is ConsultaToInsert => x.patient_id !== null);

      consultasSkipped = consultas.length - validConsultas.length;

      const consultaBatches = chunk<ConsultaToInsert>(validConsultas, 50);
      for (const grupo of consultaBatches) {
        const payload = grupo.map(({ row, patient_id }) => ({
          patient_id,
          nutritionist_id: user.id,
          session_date: row.data!.session_date,
          company: selectedCompany,
          session_type: 'Consulta',
          weight:                   row.data!.weight,
          height:                   row.data!.height,
          girth_waist:              row.data!.waist,
          adherence:                row.data!.adherence,
          hydration:                row.data!.hydration,
          physical_activity:        row.data!.physical_activity,
          consumo_frutas_verduras:  row.data!.consumo_frutas_verduras,
          energy_level:             row.data!.energy_level,
          sleep_quality:            row.data!.sleep_quality,
          laboratorio_alterado:     null,
          consultation_notes:       [row.data!.achievements, row.data!.difficulties]
            .filter(Boolean).join('\n---\n') || null,
        }));
        const { data: insertedSessions, error: sErr } = await supabase
          .from('sessions')
          .insert(payload)
          .select('id, patient_id');
        if (sErr) {
          console.error('Consultas insert error en batch:', sErr);
          consultasSkipped += grupo.length;
          continue;
        }
        consultasInserted += insertedSessions?.length ?? 0;

        // Si la consulta trae un status (En Progreso / Objetivo Alcanzado / En Riesgo),
        // lo aplicamos al paciente — la última consulta inserta gana porque vamos en orden.
        for (const { row } of grupo) {
          if (row.data!.status && row.data!.patient_id && !row.data!.patient_id.startsWith('__pending_')) {
            await supabase
              .from('patients')
              .update({ status: row.data!.status })
              .eq('id', row.data!.patient_id);
          }
        }
      }

      // 6. Actualizar el batch con conteos finales
      const totalInserted = inserted + consultasInserted;
      const totalSkipped  = skipped + consultasSkipped;
      await supabase
        .from('import_batches')
        .update({ rows_inserted: totalInserted, rows_skipped: totalSkipped })
        .eq('id', batch.id);

      const parts: string[] = [];
      if (inserted > 0)           parts.push(`${inserted} ${inserted === 1 ? 'paciente' : 'pacientes'}`);
      if (consultasInserted > 0)  parts.push(`${consultasInserted} ${consultasInserted === 1 ? 'consulta' : 'consultas'}`);
      const msg = parts.length > 0
        ? `Import completo: ${parts.join(' + ')}${totalSkipped > 0 ? ` (${totalSkipped} ignorad${totalSkipped === 1 ? 'a' : 'as'})` : ''}`
        : 'Nada se importó — revisá errores.';
      showToast(msg, parts.length > 0 ? 'success' : 'info');
      setShowModal(false);
      reset();
      onImported?.();
    } catch (err: any) {
      console.error('Error en import:', err);
      showToast(err?.message || 'Error al importar', 'error');
    } finally {
      setImporting(false);
    }
  }

  // Contadores para el preview — pacientes nuevos
  const total = rows.length;
  const validRows = rows.filter(r => r.data && r.errors.length === 0).length;
  const errorRows = rows.filter(r => r.errors.length > 0).length;
  const dupeRows  = rows.filter(r => r.isDuplicate).length;
  const willInsert = rows.filter(r => r.data && r.errors.length === 0 && !(r.isDuplicate && dupePolicy === 'skip')).length;

  // Contadores para el preview — consultas históricas
  const totalConsultas = consultas.length;
  const validConsultas = consultas.filter(c => c.data && c.errors.length === 0).length;
  const errorConsultas = consultas.filter(c => c.errors.length > 0).length;
  const willInsertConsultas = validConsultas;
  const hasAnyConsultas = totalConsultas > 0;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFile}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-2 px-4 py-2 border-2 border-primary text-primary rounded-xl font-semibold hover:bg-primary hover:text-white transition-all active:scale-95"
        title="Importar pacientes desde Excel o CSV (la IA mapea archivos desorganizados)"
      >
        <FileUp size={16} />
        <span className="hidden sm:inline">Importar Excel/CSV</span>
      </button>

      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-2xl border-2 border-border-color max-w-4xl w-full max-h-[90vh] flex flex-col animate-scale-in">
            <div className="sticky top-0 bg-surface border-b-2 border-border-color px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                  <FileUp size={20} className="text-primary" /> Importar pacientes desde archivo
                  {source === 'ia' && (
                    <span className="text-[10px] font-black uppercase tracking-widest bg-info/15 text-info border border-info/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles size={10} /> Mapeado por IA
                    </span>
                  )}
                </h3>
                <p className="text-xs text-text-muted mt-1">{filename} → {selectedCompany}</p>
              </div>
              <button
                onClick={() => { if (!importing) { setShowModal(false); reset(); } }}
                className="p-2 rounded-lg hover:bg-bg text-text-muted"
                disabled={importing}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {needsAI && (
                <div className="p-5 bg-info/5 border-2 border-info/30 rounded-xl mb-4">
                  <div className="flex items-start gap-3">
                    <Sparkles size={22} className="text-info shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-bold text-text-main mb-1">Las columnas no coinciden con la plantilla</h4>
                      <p className="text-sm text-text-muted mb-3">
                        El archivo parece tener un formato propio. La IA puede mapear cada columna al schema oficial sin inventar datos: si un valor no está en el archivo, se deja vacío para que lo completes en la consulta.
                      </p>
                      <p className="text-xs text-text-muted mb-3">
                        <strong>Columnas detectadas:</strong> {Array.isArray(rawDataRef.current?.headers) ? rawDataRef.current.headers.filter(h => h != null && h !== '').join(' · ') : '—'}
                      </p>
                      <p className="text-xs text-text-muted mb-3">
                        <strong>Filas a procesar:</strong> {rawDataRef.current?.rows.length ?? 0}
                      </p>
                      <button
                        onClick={handleNormalizeWithAI}
                        disabled={aiLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-info text-white rounded-xl font-semibold hover:bg-info/90 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        {aiLoading ? 'Mapeando con IA…' : 'Mapear con IA'}
                      </button>
                      <p className="text-[11px] text-text-muted mt-2">
                        Vas a poder revisar cada fila antes de importar. Costo aproximado: 1-5 centavos USD por archivo.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {sheetMissing && !needsAI && (
                <div className="flex items-center gap-2 p-4 bg-danger/5 border-2 border-danger/30 rounded-xl text-danger text-sm">
                  <AlertTriangle size={20} />
                  <span>No se encontró la hoja "Pacientes Nuevos" en el archivo. Usá la plantilla generada por el botón "Planilla Feria".</span>
                </div>
              )}

              {headerErrors.length > 0 && !needsAI && (
                <div className="p-4 bg-warning/5 border-2 border-warning/30 rounded-xl text-sm space-y-1 mb-4">
                  <div className="font-bold text-[#92400e] flex items-center gap-2"><AlertTriangle size={16} /> Columnas faltantes</div>
                  {headerErrors.map((e, i) => <div key={i} className="text-[#92400e] ml-6">• {e}</div>)}
                </div>
              )}

              {source === 'ia' && Object.keys(columnMapping).length > 0 && (
                <div className="mb-4 p-3 bg-bg rounded-lg border border-border-color">
                  <div className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2 flex items-center gap-1.5">
                    <Sparkles size={12} className="text-info" />
                    Mapeo de columnas detectado
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {Object.entries(columnMapping).map(([src, dst]) => (
                      <div key={src} className="flex items-center gap-2">
                        <span className="font-mono text-text-muted truncate">{src}</span>
                        <span className="text-info">→</span>
                        <span className="font-semibold text-text-main truncate">{dst}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!needsAI && !sheetMissing && (total > 0 || hasAnyConsultas) && (
                <>
                  {total > 0 && (
                    <>
                      <div className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2">
                        Pacientes nuevos
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                        <Stat label="Filas leídas" value={total} color="text-text-main" />
                        <Stat label="Válidas" value={validRows} color="text-accent-dark" />
                        <Stat label="Con errores" value={errorRows} color="text-danger" />
                        <Stat label="Duplicadas" value={dupeRows} color="text-warning" />
                      </div>
                    </>
                  )}

                  {hasAnyConsultas && (
                    <>
                      <div className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2 mt-2">
                        Consultas históricas (hoja "Consultas")
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
                        <Stat label="Filas leídas" value={totalConsultas} color="text-text-main" />
                        <Stat label="Válidas" value={validConsultas} color="text-accent-dark" />
                        <Stat label="Con errores" value={errorConsultas} color="text-danger" />
                      </div>
                      <p className="text-[11px] text-text-muted -mt-3 mb-4">
                        Cada fila se inserta como sesión separada con su fecha. Los pacientes se matchean por ID o Nombre + Apellido (incluye los nuevos de esta misma subida).
                      </p>
                    </>
                  )}

                  {dupeRows > 0 && (
                    <div className="mb-4 p-3 bg-bg rounded-lg border border-border-color">
                      <div className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2">Política para duplicadas</div>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" value="skip" checked={dupePolicy === 'skip'} onChange={() => setDupePolicy('skip')} />
                          Saltar (recomendado)
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-text-muted line-through" title="Próximamente">
                          <input type="radio" value="update" disabled />
                          Actualizar existentes
                        </label>
                      </div>
                    </div>
                  )}

                  {total > 0 && (
                    <div className="border-2 border-border-color rounded-xl overflow-hidden mb-4">
                      <div className="bg-bg px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-text-muted border-b border-border-color">
                        Pacientes nuevos ({total})
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-bg sticky top-0">
                            <tr>
                              <th className="text-left p-2 text-xs font-bold uppercase tracking-wider text-text-muted w-20">Fila</th>
                              <th className="text-left p-2 text-xs font-bold uppercase tracking-wider text-text-muted">Paciente</th>
                              <th className="text-left p-2 text-xs font-bold uppercase tracking-wider text-text-muted">Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map(r => {
                              const isErr = r.errors.length > 0;
                              const isDupe = r.isDuplicate;
                              const willSkip = isErr || (isDupe && dupePolicy === 'skip');
                              const rowClass = isErr
                                ? 'bg-danger/5'
                                : isDupe
                                  ? 'bg-warning/5'
                                  : 'bg-accent/5';
                              return (
                                <tr key={r.rowIndex} className={`border-t border-border-color ${rowClass}`}>
                                  <td className="p-2 font-mono text-xs">{r.rowIndex + 2}</td>
                                  <td className="p-2">
                                    {r.data
                                      ? <span className="font-semibold">{r.data.first_name} {r.data.last_name}</span>
                                      : <span className="text-text-muted italic">Inválida</span>}
                                    {isErr && (
                                      <div className="text-xs text-danger mt-1">{r.errors.join(' · ')}</div>
                                    )}
                                  </td>
                                  <td className="p-2">
                                    {isErr && <Badge variant="danger" label="Error" />}
                                    {!isErr && isDupe && <Badge variant="warning" label="Duplicada" />}
                                    {!isErr && !isDupe && <Badge variant="success" label="Lista" />}
                                    {willSkip && !isErr && <span className="ml-1 text-[10px] uppercase text-text-muted">se omite</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {hasAnyConsultas && (
                    <div className="border-2 border-border-color rounded-xl overflow-hidden">
                      <div className="bg-bg px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-text-muted border-b border-border-color">
                        Consultas históricas ({totalConsultas})
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-bg sticky top-0">
                            <tr>
                              <th className="text-left p-2 text-xs font-bold uppercase tracking-wider text-text-muted w-20">Fila</th>
                              <th className="text-left p-2 text-xs font-bold uppercase tracking-wider text-text-muted">Paciente</th>
                              <th className="text-left p-2 text-xs font-bold uppercase tracking-wider text-text-muted w-32">Fecha</th>
                              <th className="text-left p-2 text-xs font-bold uppercase tracking-wider text-text-muted">Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {consultas.map(c => {
                              const isErr = c.errors.length > 0;
                              const rowClass = isErr ? 'bg-danger/5' : 'bg-accent/5';
                              const displayName = c.data
                                ? `${c.data.first_name} ${c.data.last_name}`
                                : 'Inválida';
                              return (
                                <tr key={c.rowIndex} className={`border-t border-border-color ${rowClass}`}>
                                  <td className="p-2 font-mono text-xs">{c.rowIndex + 2}</td>
                                  <td className="p-2">
                                    <span className={c.data ? 'font-semibold' : 'text-text-muted italic'}>{displayName}</span>
                                    {isErr && (
                                      <div className="text-xs text-danger mt-1">{c.errors.join(' · ')}</div>
                                    )}
                                  </td>
                                  <td className="p-2 font-mono text-xs">
                                    {c.data?.session_date ?? '—'}
                                  </td>
                                  <td className="p-2">
                                    {isErr
                                      ? <Badge variant="danger" label="Error" />
                                      : <Badge variant="success" label="Lista" />}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}

              {!needsAI && !sheetMissing && total === 0 && !hasAnyConsultas && headerErrors.length === 0 && (
                <div className="text-center py-8 text-text-muted flex flex-col items-center gap-2">
                  <Info size={32} />
                  <span>No se encontraron filas válidas en la hoja.</span>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-surface border-t-2 border-border-color px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div className="text-sm text-text-muted">
                {needsAI
                  ? 'Confirmá el mapeo con IA para ver el preview.'
                  : (willInsert + willInsertConsultas) > 0
                    ? <>
                        Se importarán a <strong className="text-text-main">{selectedCompany}</strong>:
                        {willInsert > 0 && <> <strong className="text-text-main font-bold">{willInsert}</strong> {willInsert === 1 ? 'paciente' : 'pacientes'}</>}
                        {willInsert > 0 && willInsertConsultas > 0 && <> +</>}
                        {willInsertConsultas > 0 && <> <strong className="text-text-main font-bold">{willInsertConsultas}</strong> {willInsertConsultas === 1 ? 'consulta' : 'consultas'}</>}
                        .
                      </>
                    : 'Nada para importar — corregí los errores o cambiá la política.'}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowModal(false); reset(); }}
                  disabled={importing || aiLoading}
                  className="px-5 py-2 bg-bg border-2 border-border-color rounded-xl font-semibold hover:bg-surface hover:border-primary transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                {!needsAI && (
                  <button
                    onClick={handleConfirm}
                    disabled={importing || (willInsert + willInsertConsultas) === 0}
                    className="px-5 py-2 bg-primary text-white rounded-xl font-semibold hover:bg-primary-light transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {importing && <Loader2 size={16} className="animate-spin" />}
                    <CheckCircle2 size={16} /> Importar {(willInsert + willInsertConsultas) > 0 ? `(${willInsert + willInsertConsultas})` : ''}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-bg border border-border-color rounded-lg p-3 text-center">
      <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-text-muted font-bold">{label}</div>
    </div>
  );
}

function Badge({ variant, label }: { variant: 'success' | 'warning' | 'danger'; label: string }) {
  const cls =
    variant === 'success' ? 'bg-accent/15 text-accent-dark border-accent/30'
    : variant === 'warning' ? 'bg-warning/15 text-[#92400e] border-warning/30'
    : 'bg-danger/15 text-danger border-danger/30';
  return (
    <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cls}`}>
      {label}
    </span>
  );
}
