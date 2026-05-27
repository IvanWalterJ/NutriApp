/**
 * Sección "Formularios" del sidebar. Envuelve los dos sub-tabs:
 *   - Crear (FormsAdmin): genera links/QR para ferias
 *   - Bandeja (FormResponsesInbox): revisa y promueve respuestas
 *
 * Mostramos un contador de respuestas pendientes en el tab "Bandeja" con
 * una campanita titilante para que las nutricionistas detecten al instante
 * que hay altas por revisar (no tienen que entrar al tab para enterarse).
 */

import { useCallback, useEffect, useState } from 'react';
import FormsAdmin from './FormsAdmin';
import FormResponsesInbox from './FormResponsesInbox';
import { FileText, Inbox, Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../context/CompanyContext';

type SubTab = 'crear' | 'bandeja';

export default function FormsSection() {
  const { selectedCompany } = useCompany();
  const [subTab, setSubTab] = useState<SubTab>('crear');
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPending = useCallback(async () => {
    // Trae IDs de forms de la empresa y cuenta respuestas pending sobre ellos.
    // Hacemos dos queries por simplicidad — el filtro por company queda en JS.
    const { data: forms } = await supabase
      .from('forms')
      .select('id')
      .eq('company', selectedCompany);
    const ids = (forms || []).map(f => f.id);
    if (ids.length === 0) { setPendingCount(0); return; }
    const { count } = await supabase
      .from('form_responses')
      .select('id', { count: 'exact', head: true })
      .in('form_id', ids)
      .eq('status', 'pending');
    setPendingCount(count ?? 0);
  }, [selectedCompany]);

  useEffect(() => {
    void refreshPending();
    // Refresca cada 30s para reflejar respuestas nuevas sin tener que
    // recargar la página. Si el usuario está en otro tab, igual ve el badge.
    const t = window.setInterval(refreshPending, 30_000);
    return () => window.clearInterval(t);
  }, [refreshPending]);

  const hasPending = pendingCount > 0;

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-bg rounded-xl p-1 border border-border-color w-fit">
        <button
          onClick={() => { setSubTab('crear'); void refreshPending(); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold rounded-lg transition-colors ${
            subTab === 'crear' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-main'
          }`}
        >
          <FileText size={14} /> Crear / Listar
        </button>
        <button
          onClick={() => { setSubTab('bandeja'); void refreshPending(); }}
          className={`relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold rounded-lg transition-colors ${
            subTab === 'bandeja' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-main'
          }`}
        >
          {/* Campanita: aparece sólo cuando hay pendientes. Anima con un
              latido suave para llamar la atención sin ser estridente. */}
          {hasPending ? (
            <Bell size={14} className={subTab === 'bandeja' ? 'text-white animate-pulse' : 'text-danger animate-pulse'} />
          ) : (
            <Inbox size={14} />
          )}
          Bandeja
          {hasPending && (
            <span
              className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black border ${
                subTab === 'bandeja'
                  ? 'bg-white text-danger border-white'
                  : 'bg-danger text-white border-danger animate-pulse'
              }`}
              title={`${pendingCount} ${pendingCount === 1 ? 'respuesta pendiente' : 'respuestas pendientes'}`}
            >
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {subTab === 'crear' && <FormsAdmin />}
      {subTab === 'bandeja' && <FormResponsesInbox onMutated={refreshPending} />}
    </div>
  );
}
