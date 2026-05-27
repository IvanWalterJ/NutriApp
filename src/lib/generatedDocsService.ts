/**
 * Service para persistir y recuperar documentos generados por IA
 * (planes nutricionales y recetarios).
 *
 * El filtrado por empresa es siempre obligatorio — ningún documento se
 * lista o lee fuera de su company para no mezclar pacientes entre empresas.
 */

import { supabase } from './supabase';

export type GeneratedDocType = 'meal_plan' | 'recipes';

export interface GeneratedDocSummary {
  id: string;
  type: GeneratedDocType;
  title: string;
  company: string;
  patient_id: string | null;
  patient_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface GeneratedDoc<TInput = unknown, TOutput = unknown> extends GeneratedDocSummary {
  input: TInput | null;
  output: TOutput;
}

export interface SaveGeneratedDocInput<TInput, TOutput> {
  type: GeneratedDocType;
  title: string;
  company: string;
  patient_id?: string | null;
  patient_name?: string | null;
  input?: TInput | null;
  output: TOutput;
}

/**
 * Crea un nuevo documento generado. Si ya existe uno con el mismo título,
 * paciente y tipo en la última hora, se REEMPLAZA en lugar de duplicar
 * — útil cuando el usuario regenera/ajusta el mismo plan varias veces.
 */
export async function saveGeneratedDoc<TInput, TOutput>(
  data: SaveGeneratedDocInput<TInput, TOutput>,
): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  // Detección de regeneración reciente: mismo tipo + empresa + paciente +
  // título en la última hora. Reemplazamos para no llenar la lista de
  // versiones casi-idénticas mientras el usuario itera.
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  let existingId: string | null = null;
  if (data.patient_id) {
    const { data: existing } = await supabase
      .from('generated_documents')
      .select('id')
      .eq('type', data.type)
      .eq('company', data.company)
      .eq('patient_id', data.patient_id)
      .eq('title', data.title)
      .gte('created_at', oneHourAgo)
      .maybeSingle();
    if (existing) existingId = existing.id;
  }

  if (existingId) {
    const { error } = await supabase
      .from('generated_documents')
      .update({
        input: data.input ?? null,
        output: data.output,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingId);
    if (error) throw error;
    return existingId;
  }

  const { data: inserted, error } = await supabase
    .from('generated_documents')
    .insert({
      type: data.type,
      title: data.title,
      company: data.company,
      patient_id: data.patient_id ?? null,
      patient_name: data.patient_name ?? null,
      nutritionist_id: user.id,
      input: data.input ?? null,
      output: data.output,
    })
    .select('id')
    .single();
  if (error) throw error;
  return inserted.id;
}

/** Lista resumida (sin output) — para mostrar la grilla del historial. */
export async function listGeneratedDocs(
  company: string,
  type: GeneratedDocType,
): Promise<GeneratedDocSummary[]> {
  const { data, error } = await supabase
    .from('generated_documents')
    .select('id, type, title, company, patient_id, patient_name, created_at, updated_at')
    .eq('company', company)
    .eq('type', type)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []) as GeneratedDocSummary[];
}

/** Trae un documento completo (con input y output) para re-renderizar. */
export async function getGeneratedDoc<TInput = unknown, TOutput = unknown>(
  id: string,
): Promise<GeneratedDoc<TInput, TOutput>> {
  const { data, error } = await supabase
    .from('generated_documents')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as GeneratedDoc<TInput, TOutput>;
}

export async function deleteGeneratedDoc(id: string): Promise<void> {
  const { error } = await supabase.from('generated_documents').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Actualiza el output (y opcionalmente input) de un documento ya guardado.
 * Se usa cuando la nutri edita manualmente un plan/recetario cargado del
 * historial — los cambios persisten sobre la misma fila en lugar de crear
 * una versión nueva.
 */
export async function updateGeneratedDoc<TOutput, TInput = unknown>(
  id: string,
  patch: { output: TOutput; input?: TInput | null },
): Promise<void> {
  const payload: Record<string, unknown> = {
    output: patch.output,
    updated_at: new Date().toISOString(),
  };
  if (patch.input !== undefined) payload.input = patch.input;
  const { error } = await supabase
    .from('generated_documents')
    .update(payload)
    .eq('id', id);
  if (error) throw error;
}

/**
 * Helper de título: arma algo legible que la nutri reconozca de un vistazo
 * en el historial. Si tiene paciente lo incluye; sino usa la fecha.
 */
export function defaultDocTitle(opts: {
  type: GeneratedDocType;
  patientName?: string | null;
  hint?: string;
}): string {
  const base = opts.type === 'meal_plan' ? 'Plan nutricional' : 'Recetario';
  const today = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
  const parts: string[] = [base];
  if (opts.patientName) parts.push(opts.patientName);
  if (opts.hint) parts.push(opts.hint);
  parts.push(today);
  return parts.join(' · ');
}
