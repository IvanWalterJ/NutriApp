/**
 * Tipos compartidos para Formularios públicos pre-consulta.
 *
 * Los campos son declarativos (jsonb en DB) para que la nutricionista pueda
 * armar formularios distintos por feria sin tocar código.
 */

export type FormFieldType =
  | 'text'        // input single-line
  | 'email'
  | 'tel'
  | 'date'
  | 'number'
  | 'select'      // dropdown
  | 'textarea'
  | 'rating1to5'  // 1..5
  | 'yesno';      // Sí / No

export interface FormField {
  /** key estable que se usa para guardar la respuesta en data jsonb */
  key: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  /** opciones del select (sólo para type === 'select') */
  options?: string[];
  placeholder?: string;
  helpText?: string;
}

export interface FormRecord {
  id: string;
  slug: string;
  company: string;
  title: string;
  description: string | null;
  fields: FormField[];
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface FormResponseRecord {
  id: string;
  form_id: string;
  data: Record<string, unknown>;
  status: 'pending' | 'processed' | 'discarded';
  patient_id: string | null;
  submitted_at: string;
  processed_at: string | null;
  user_agent: string | null;
}

/**
 * Plantilla por defecto para formulario pre-consulta de feria.
 * Replicamos los campos que Rosana hace hoy a mano (OMS + datos básicos).
 */
export const DEFAULT_FAIR_FORM_FIELDS: FormField[] = [
  { key: 'first_name', label: 'Nombre',                    type: 'text',  required: true,  placeholder: 'María' },
  { key: 'last_name',  label: 'Apellido',                  type: 'text',  required: true,  placeholder: 'Pérez' },
  { key: 'email',      label: 'Email',                     type: 'email', required: true,  placeholder: 'maria@email.com' },
  { key: 'phone',      label: 'WhatsApp',                  type: 'tel',   required: false, placeholder: '+54 9 11 ...' },
  { key: 'birth_date', label: 'Fecha de nacimiento',       type: 'date',  required: true },
  { key: 'sex',        label: 'Sexo',                      type: 'select', required: true, options: ['Femenino', 'Masculino'] },
  { key: 'weight',     label: 'Peso actual (kg)',          type: 'number', required: false, placeholder: '70' },
  { key: 'height',     label: 'Altura (cm)',               type: 'number', required: false, placeholder: '170' },
  { key: 'goal',       label: '¿Cuál es tu objetivo?',     type: 'select', required: true,
    options: ['Descenso de peso', 'Aumento de peso', 'Descenso de grasa corporal', 'Ganar masa muscular', 'Laboratorio', 'Educación alimentaria', 'Otro'] },
  { key: 'hydration',  label: '¿Tomás 2 L de agua por día?', type: 'yesno', required: true },
  { key: 'activity',   label: '¿Hacés más de 150 min de actividad por semana?', type: 'yesno', required: true },
  { key: 'fruits',     label: 'Consumo de frutas y verduras (1 = casi nunca, 5 = todos los días)', type: 'rating1to5', required: true },
  { key: 'sleep',      label: 'Calidad del sueño (1 = muy mala, 5 = excelente)', type: 'rating1to5', required: true },
  { key: 'energy',     label: 'Nivel de energía durante el día (1 = muy bajo, 5 = excelente)', type: 'rating1to5', required: true },
  { key: 'notes',      label: '¿Algo más que quieras contarnos?', type: 'textarea', required: false,
    placeholder: 'Alergias, intolerancias, medicación, motivo de consulta...' },
];

/** Slug-safe a partir de un texto libre: minúsculas, espacios→guiones, sin acentos. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
