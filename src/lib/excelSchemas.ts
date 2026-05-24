/**
 * Esquemas de las hojas Excel — fuente única de verdad para export e import.
 * Cualquier cambio en columnas debe hacerse acá; ExcelExportButton y
 * ExcelImportButton consumen estas constantes.
 */

/** Hoja "Consultas" — para registrar sesiones en ferias sin internet. */
export const CONSULTAS_HEADERS = [
  'ID Paciente',
  'Nombre',
  'Apellido',
  'Fecha Consulta (dd/mm/aaaa)',
  'Peso (kg)',
  'Altura (cm)',
  'Cintura (cm)',
  'Adherencia (1-5)',
  'Hidratación (Sí/No)',
  'Actividad Física (≤150 min / +150 min)',
  'Frutas y Verduras (1-5)',
  'Energía (1-5)',
  'Sueño (1-5)',
  'Estado (En Progreso / Objetivo Alcanzado / En Riesgo)',
  'Logros',
  'Dificultades',
] as const;

export const CONSULTAS_COL_WIDTHS = [
  { wch: 38 }, { wch: 14 }, { wch: 16 }, { wch: 26 }, { wch: 10 },
  { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 34 },
  { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 42 }, { wch: 30 }, { wch: 30 },
];

/** Hoja "Pacientes Nuevos" — para alta masiva.
 *  La columna "Fecha 1ra Consulta" es opcional: si está vacía, la sesión inicial
 *  se crea con fecha de hoy. Permite backdatar el alta cuando se importa histórico.
 */
export const PACIENTES_NUEVOS_HEADERS = [
  'Nombre',
  'Apellido',
  'Email',
  'WhatsApp',
  'Fecha Nacimiento (dd/mm/aaaa)',
  'Sexo (Femenino / Masculino)',
  'Departamento',
  'Peso Inicial (kg)',
  'Altura (cm)',
  'Fecha 1ra Consulta (dd/mm/aaaa)',
  'Adherencia (1-5)',
  'Hidratación (Sí/No)',
  'Actividad Física (≤150 min / +150 min)',
  'Frutas y Verduras (1-5)',
  'Energía (1-5)',
  'Sueño (1-5)',
] as const;

export const PACIENTES_NUEVOS_COL_WIDTHS = [
  { wch: 14 }, { wch: 16 }, { wch: 26 }, { wch: 18 }, { wch: 28 },
  { wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 28 },
  { wch: 16 }, { wch: 18 }, { wch: 34 }, { wch: 22 }, { wch: 12 }, { wch: 12 },
];

/** Valores aceptados en columnas con dominio cerrado. */
export const SEX_VALUES = ['Femenino', 'Masculino'] as const;
export const HYDRATION_VALUES = ['Sí', 'Si', 'No'] as const;
export const ACTIVITY_VALUES = ['≤150 min', '+150 min'] as const;
export const STATUS_VALUES = ['En Progreso', 'Objetivo Alcanzado', 'En Riesgo'] as const;

export type SexValue = typeof SEX_VALUES[number];
export type HydrationValue = typeof HYDRATION_VALUES[number];
export type ActivityValue = typeof ACTIVITY_VALUES[number];
export type StatusValue = typeof STATUS_VALUES[number];

/** Fila parseada del Excel para alta de paciente nuevo. */
export interface ParsedNewPatient {
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;          // ISO yyyy-mm-dd
  sex: SexValue;
  area: string | null;
  initial_weight: number | null;
  height: number | null;
  /** Fecha de la 1ra consulta. Si es null se usa today() al insertar. */
  first_session_date: string | null;  // ISO yyyy-mm-dd
  adherence: number | null;
  hydration: boolean | null;
  physical_activity: ActivityValue | null;
  consumo_frutas_verduras: number | null;
  energy_level: number | null;
  sleep_quality: number | null;
}

/**
 * Fila parseada de la hoja "Consultas" — sesión histórica de un paciente.
 * patient_id puede ser null cuando se importa por nombre (matcheamos en cliente).
 * session_date es OBLIGATORIO (sin fecha, no se puede ubicar en la línea de tiempo).
 */
export interface ParsedConsulta {
  patient_id: string | null;          // UUID si vino en la planilla
  first_name: string;
  last_name: string;
  session_date: string;               // ISO yyyy-mm-dd (requerido)
  weight: number | null;
  height: number | null;
  waist: number | null;
  adherence: number | null;
  hydration: boolean | null;
  physical_activity: ActivityValue | null;
  consumo_frutas_verduras: number | null;
  energy_level: number | null;
  sleep_quality: number | null;
  status: StatusValue | null;
  achievements: string | null;
  difficulties: string | null;
}

export interface ParseRowResult<T> {
  rowIndex: number;       // 0-based, sin contar header
  data: T | null;
  errors: string[];       // mensajes legibles por fila
  isDuplicate: boolean;
}
