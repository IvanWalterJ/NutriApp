/**
 * Sección "Formularios" del sidebar. Envuelve los dos sub-tabs:
 *   - Crear (FormsAdmin): genera links/QR para ferias
 *   - Bandeja (FormResponsesInbox): revisa y promueve respuestas
 */

import { useState } from 'react';
import FormsAdmin from './FormsAdmin';
import FormResponsesInbox from './FormResponsesInbox';
import { FileText, Inbox } from 'lucide-react';

type SubTab = 'crear' | 'bandeja';

export default function FormsSection() {
  const [subTab, setSubTab] = useState<SubTab>('crear');

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-bg rounded-xl p-1 border border-border-color w-fit">
        <button
          onClick={() => setSubTab('crear')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold rounded-lg transition-colors ${
            subTab === 'crear' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-main'
          }`}
        >
          <FileText size={14} /> Crear / Listar
        </button>
        <button
          onClick={() => setSubTab('bandeja')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold rounded-lg transition-colors ${
            subTab === 'bandeja' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-main'
          }`}
        >
          <Inbox size={14} /> Bandeja
        </button>
      </div>

      {subTab === 'crear' && <FormsAdmin />}
      {subTab === 'bandeja' && <FormResponsesInbox />}
    </div>
  );
}
