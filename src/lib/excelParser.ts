/**
 * Parser de Excel para alta masiva de pacientes nuevos.
 * Las hojas se buscan por nombre y se valida cada fila contra los headers
 * definidos en excelSchemas.ts.
 */

import * as XLSX from 'xlsx';
import {
  PACIENTES_NUEVOS_HEADERS,
  CONSULTAS_HEADERS,
  SEX_VALUES,
  HYDRATION_VALUES,
  ACTIVITY_VALUES,
  STATUS_VALUES,
  type ParsedNewPatient,
  type ParsedConsulta,
  type ParseRowResult,
  type SexValue,
  type ActivityValue,
  type StatusValue,
} from './excelSchemas';

/** Coerce a cell value to trimmed non-empty string, or null. */
function asString(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

/** Coerce to finite number or null. */
function asNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const n = Number(v.replace(',', '.').trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Coerce 1-5 rating: returns null if outside range. */
function asRating(v: unknown): number | null {
  const n = asNumber(v);
  if (n === null) return null;
  const r = Math.round(n);
  return r >= 1 && r <= 5 ? r : null;
}

/**
 * Convierte una celda Excel a ISO date (yyyy-mm-dd).
 * Acepta:
 *   - serial number (Excel internal date format)
 *   - "dd/mm/aaaa", "dd-mm-aaaa"
 *   - "aaaa-mm-dd" (ISO)
 */
function asDate(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') {
    // Excel serial: días desde 1899-12-30 (epoch 1900 con leap bug compensado).
    const ms = (v - 25569) * 86400 * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
  }
  if (typeof v === 'string') {
    const s = v.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {
      const day = parseInt(m[1], 10);
      const month = parseInt(m[2], 10);
      let year = parseInt(m[3], 10);
      if (year < 100) year += 2000;
      if (day < 1 || day > 31 || month < 1 || month > 12) return null;
      const d = new Date(Date.UTC(year, month - 1, day));
      return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    }
  }
  return null;
}

function asSex(v: unknown): SexValue | null {
  const s = asString(v);
  if (!s) return null;
  const lower = s.toLowerCase();
  if (lower === 'f' || lower === 'femenino' || lower === 'mujer') return 'Femenino';
  if (lower === 'm' || lower === 'masculino' || lower === 'hombre' || lower === 'varón' || lower === 'varon') return 'Masculino';
  return SEX_VALUES.includes(s as SexValue) ? (s as SexValue) : null;
}

function asHydration(v: unknown): boolean | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  if (['sí', 'si', 'yes', 'y', '1', 'true', 'verdadero'].includes(s)) return true;
  if (['no', 'n', '0', 'false', 'falso'].includes(s)) return false;
  return null;
}

function asStatus(v: unknown): StatusValue | null {
  const s = asString(v);
  if (!s) return null;
  const lower = s.toLowerCase();
  if (lower.includes('progres')) return 'En Progreso';
  if (lower.includes('alcanz') || lower.includes('logr')) return 'Objetivo Alcanzado';
  if (lower.includes('riesg')) return 'En Riesgo';
  return STATUS_VALUES.includes(s as StatusValue) ? (s as StatusValue) : null;
}

function asActivity(v: unknown): ActivityValue | null {
  const s = asString(v);
  if (!s) return null;
  if (s.includes('+150') || s.toLowerCase().includes('mas de') || s.toLowerCase().includes('más de')) return '+150 min';
  if (s.includes('≤150') || s.includes('<=150') || s.toLowerCase().includes('menos')) return '≤150 min';
  if (ACTIVITY_VALUES.includes(s as ActivityValue)) return s as ActivityValue;
  return null;
}

function asEmail(v: unknown): string | null {
  const s = asString(v);
  if (!s) return null;
  // Validación liviana — el server-side de Supabase no chequea formato, así
  // que un email malformado se acepta pero no romperá nada.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : null;
}

/**
 * Detecta si los headers ya matchean el schema oficial (sin necesidad de IA).
 * Considera que matchean cuando al menos el 60% de los headers esperados
 * críticos están presentes (admitiendo case/trim/whitespace).
 *
 * Si devuelve false, conviene ofrecer al usuario el normalizador con IA.
 */
export function headersMatchSchema(actualHeaders: unknown[], expected: readonly string[]): boolean {
  const idx = buildHeaderIndex(actualHeaders, expected);
  // Los 3 campos requeridos para alta:
  const critical = ['Nombre', 'Apellido', 'Sexo (Femenino / Masculino)'];
  const hasAllCritical = critical.every(c => idx.has(c));
  // Y al menos 60% del total
  const ratio = idx.size / expected.length;
  return hasAllCritical && ratio >= 0.6;
}

/** Mapea headers de la fila contra los esperados — admite variaciones case-insensitive y trim. */
function buildHeaderIndex(actualHeaders: unknown[], expected: readonly string[]): Map<string, number> {
  const idx = new Map<string, number>();
  for (const exp of expected) {
    const normalized = exp.toLowerCase().replace(/\s+/g, ' ').trim();
    for (let i = 0; i < actualHeaders.length; i++) {
      const actual = asString(actualHeaders[i]);
      if (!actual) continue;
      if (actual.toLowerCase().replace(/\s+/g, ' ').trim() === normalized) {
        idx.set(exp, i);
        break;
      }
    }
  }
  return idx;
}

/**
 * Parsea la hoja "Pacientes Nuevos" del workbook.
 * Devuelve un resultado por fila con la data tipada o los errores.
 */
export function parseNewPatientsSheet(workbook: XLSX.WorkBook): {
  rows: ParseRowResult<ParsedNewPatient>[];
  sheetMissing: boolean;
  headerErrors: string[];
} {
  const sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('pacientes nuevos') || n.toLowerCase().includes('nuevos'));
  if (!sheetName) {
    return { rows: [], sheetMissing: true, headerErrors: [] };
  }

  const ws = workbook.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null });
  if (aoa.length === 0) {
    return { rows: [], sheetMissing: false, headerErrors: ['Hoja vacía'] };
  }

  const headers = aoa[0] as unknown[];
  const headerIdx = buildHeaderIndex(headers, PACIENTES_NUEVOS_HEADERS);
  const headerErrors: string[] = [];
  const required = ['Nombre', 'Apellido', 'Sexo (Femenino / Masculino)'];
  for (const r of required) {
    if (!headerIdx.has(r)) headerErrors.push(`Falta columna requerida: "${r}"`);
  }

  const cell = (row: unknown[], header: string): unknown => {
    const i = headerIdx.get(header);
    return i === undefined ? null : row[i];
  };

  const rows: ParseRowResult<ParsedNewPatient>[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const row = aoa[i];
    if (!row || row.every(c => c === null || c === undefined || c === '')) continue; // skip vacías

    const errors: string[] = [];
    const first_name = asString(cell(row, 'Nombre'));
    const last_name  = asString(cell(row, 'Apellido'));
    const sex        = asSex(cell(row, 'Sexo (Femenino / Masculino)'));

    if (!first_name) errors.push('Nombre requerido');
    if (!last_name)  errors.push('Apellido requerido');
    if (!sex)        errors.push('Sexo inválido (usá "Femenino" o "Masculino")');

    const initial_weight = asNumber(cell(row, 'Peso Inicial (kg)'));
    if (initial_weight !== null && (initial_weight < 20 || initial_weight > 300)) {
      errors.push(`Peso fuera de rango plausible (${initial_weight} kg)`);
    }
    const height = asNumber(cell(row, 'Altura (cm)'));
    if (height !== null && (height < 80 || height > 250)) {
      errors.push(`Altura fuera de rango plausible (${height} cm)`);
    }

    const data: ParsedNewPatient | null = (errors.length === 0 && first_name && last_name && sex) ? {
      first_name,
      last_name,
      email:      asEmail(cell(row, 'Email')),
      phone:      asString(cell(row, 'WhatsApp')),
      birth_date: asDate(cell(row, 'Fecha Nacimiento (dd/mm/aaaa)')),
      sex,
      area:       asString(cell(row, 'Departamento')),
      initial_weight,
      height,
      first_session_date:       asDate(cell(row, 'Fecha 1ra Consulta (dd/mm/aaaa)')),
      adherence:  asRating(cell(row, 'Adherencia (1-5)')),
      hydration:  asHydration(cell(row, 'Hidratación (Sí/No)')),
      physical_activity:        asActivity(cell(row, 'Actividad Física (≤150 min / +150 min)')),
      consumo_frutas_verduras:  asRating(cell(row, 'Frutas y Verduras (1-5)')),
      energy_level:             asRating(cell(row, 'Energía (1-5)')),
      sleep_quality:            asRating(cell(row, 'Sueño (1-5)')),
    } : null;

    rows.push({ rowIndex: i - 1, data, errors, isDuplicate: false });
  }

  return { rows, sheetMissing: false, headerErrors };
}

/**
 * Valida filas ya normalizadas (que vienen del endpoint /api/normalize-excel).
 * Aplica las MISMAS reglas de validación que parseNewPatientsSheet, así nada
 * que la IA pueda haber generado se cuela sin pasar por el schema.
 */
export function parseNormalizedRows(rows: any[]): ParseRowResult<ParsedNewPatient>[] {
  const out: ParseRowResult<ParsedNewPatient>[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] || {};
    const errors: string[] = [];

    const first_name = asString(r.first_name);
    const last_name  = asString(r.last_name);
    const sex        = asSex(r.sex);

    if (!first_name) errors.push('Nombre requerido');
    if (!last_name)  errors.push('Apellido requerido');
    if (!sex)        errors.push('Sexo inválido');

    const initial_weight = asNumber(r.initial_weight);
    if (initial_weight !== null && (initial_weight < 20 || initial_weight > 300)) {
      errors.push(`Peso fuera de rango plausible (${initial_weight} kg)`);
    }
    const height = asNumber(r.height);
    if (height !== null && (height < 80 || height > 250)) {
      errors.push(`Altura fuera de rango plausible (${height} cm)`);
    }

    const data: ParsedNewPatient | null = (errors.length === 0 && first_name && last_name && sex) ? {
      first_name,
      last_name,
      email:      asEmail(r.email),
      phone:      asString(r.phone),
      birth_date: asDate(r.birth_date),
      sex,
      area:       asString(r.area),
      initial_weight,
      height,
      first_session_date:      asDate(r.first_session_date),
      adherence:               asRating(r.adherence),
      hydration:               asHydration(r.hydration),
      physical_activity:       asActivity(r.physical_activity),
      consumo_frutas_verduras: asRating(r.consumo_frutas_verduras),
      energy_level:            asRating(r.energy_level),
      sleep_quality:           asRating(r.sleep_quality),
    } : null;

    out.push({ rowIndex: i, data, errors, isDuplicate: false });
  }
  return out;
}

/**
 * Parsea la hoja "Consultas" del workbook — sesiones históricas por fecha,
 * típicamente exportadas y devueltas por la nutricionista después de una feria.
 * Cada fila se tipa con session_date (requerido) y el ID o nombre del paciente.
 */
export function parseConsultasSheet(workbook: XLSX.WorkBook): {
  rows: ParseRowResult<ParsedConsulta>[];
  sheetMissing: boolean;
  headerErrors: string[];
} {
  const sheetName = workbook.SheetNames.find(n => n.toLowerCase().trim() === 'consultas');
  if (!sheetName) return { rows: [], sheetMissing: true, headerErrors: [] };

  const ws = workbook.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null });
  if (aoa.length === 0) return { rows: [], sheetMissing: false, headerErrors: ['Hoja vacía'] };

  const headers = aoa[0] as unknown[];
  const headerIdx = buildHeaderIndex(headers, CONSULTAS_HEADERS);
  const headerErrors: string[] = [];
  const required = ['Nombre', 'Apellido', 'Fecha Consulta (dd/mm/aaaa)'];
  for (const r of required) {
    if (!headerIdx.has(r)) headerErrors.push(`Falta columna requerida: "${r}"`);
  }

  const cell = (row: unknown[], header: string): unknown => {
    const i = headerIdx.get(header);
    return i === undefined ? null : row[i];
  };

  const rows: ParseRowResult<ParsedConsulta>[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const row = aoa[i];
    if (!row || row.every(c => c === null || c === undefined || c === '')) continue;

    const errors: string[] = [];
    const patient_id = asString(cell(row, 'ID Paciente'));
    const first_name = asString(cell(row, 'Nombre'));
    const last_name  = asString(cell(row, 'Apellido'));
    const session_date = asDate(cell(row, 'Fecha Consulta (dd/mm/aaaa)'));

    if (!first_name) errors.push('Nombre requerido');
    if (!last_name)  errors.push('Apellido requerido');
    if (!session_date) errors.push('Fecha de consulta inválida o vacía');

    const weight = asNumber(cell(row, 'Peso (kg)'));
    if (weight !== null && (weight < 20 || weight > 300)) {
      errors.push(`Peso fuera de rango plausible (${weight} kg)`);
    }
    const height = asNumber(cell(row, 'Altura (cm)'));
    if (height !== null && (height < 80 || height > 250)) {
      errors.push(`Altura fuera de rango plausible (${height} cm)`);
    }

    const data: ParsedConsulta | null = (errors.length === 0 && first_name && last_name && session_date) ? {
      patient_id,
      first_name,
      last_name,
      session_date,
      weight,
      height,
      waist:                   asNumber(cell(row, 'Cintura (cm)')),
      adherence:               asRating(cell(row, 'Adherencia (1-5)')),
      hydration:               asHydration(cell(row, 'Hidratación (Sí/No)')),
      physical_activity:       asActivity(cell(row, 'Actividad Física (≤150 min / +150 min)')),
      consumo_frutas_verduras: asRating(cell(row, 'Frutas y Verduras (1-5)')),
      energy_level:            asRating(cell(row, 'Energía (1-5)')),
      sleep_quality:           asRating(cell(row, 'Sueño (1-5)')),
      status:                  asStatus(cell(row, 'Estado (En Progreso / Objetivo Alcanzado / En Riesgo)')),
      achievements:            asString(cell(row, 'Logros')),
      difficulties:            asString(cell(row, 'Dificultades')),
    } : null;

    rows.push({ rowIndex: i - 1, data, errors, isDuplicate: false });
  }

  return { rows, sheetMissing: false, headerErrors };
}

/**
 * Resuelve el patient_id para cada fila de Consultas:
 *   1. Si la planilla trae el UUID y matchea un paciente real → usa ese.
 *   2. Si no, busca por (first_name + last_name) — case-insensitive.
 *   3. Si hay múltiples matches con el mismo nombre, queda sin resolver
 *      y se reporta como error (pidiendo desambiguación manual).
 *
 * El parámetro `extraCandidates` permite incluir pacientes recién importados
 * (Pacientes Nuevos en la misma subida) que aún no están en DB.
 */
export interface PatientCandidate {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
}

export function resolveConsultaPatientIds(
  rows: ParseRowResult<ParsedConsulta>[],
  candidates: PatientCandidate[],
): void {
  const byId = new Map<string, PatientCandidate>();
  const byName = new Map<string, PatientCandidate[]>();
  for (const c of candidates) {
    byId.set(c.id, c);
    const key = `${c.first_name.toLowerCase().trim()}|${c.last_name.toLowerCase().trim()}`;
    const list = byName.get(key) ?? [];
    list.push(c);
    byName.set(key, list);
  }

  for (const row of rows) {
    if (!row.data) continue;
    if (row.data.patient_id && byId.has(row.data.patient_id)) continue; // ya resuelto

    const key = `${row.data.first_name.toLowerCase().trim()}|${row.data.last_name.toLowerCase().trim()}`;
    const matches = byName.get(key) ?? [];
    if (matches.length === 1) {
      row.data.patient_id = matches[0].id;
    } else if (matches.length === 0) {
      row.errors.push('Paciente no encontrado (ni por ID ni por nombre)');
      row.data = null;
    } else {
      row.errors.push(`Ambigüedad: ${matches.length} pacientes con nombre "${row.data.first_name} ${row.data.last_name}"`);
      row.data = null;
    }
  }
}

/** Marca como duplicadas las filas que matchean un paciente ya existente. */
export function markDuplicates(
  rows: ParseRowResult<ParsedNewPatient>[],
  existing: { email: string | null; first_name: string; last_name: string; birth_date: string | null }[],
): void {
  const byEmail = new Map<string, true>();
  const byNameDob = new Map<string, true>();
  for (const e of existing) {
    if (e.email) byEmail.set(e.email.toLowerCase(), true);
    const key = `${e.first_name.toLowerCase()}|${e.last_name.toLowerCase()}|${e.birth_date ?? ''}`;
    byNameDob.set(key, true);
  }
  for (const row of rows) {
    if (!row.data) continue;
    if (row.data.email && byEmail.has(row.data.email.toLowerCase())) {
      row.isDuplicate = true;
      continue;
    }
    const key = `${row.data.first_name.toLowerCase()}|${row.data.last_name.toLowerCase()}|${row.data.birth_date ?? ''}`;
    if (byNameDob.has(key)) {
      row.isDuplicate = true;
    }
  }
}
