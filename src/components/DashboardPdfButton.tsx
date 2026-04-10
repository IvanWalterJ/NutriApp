import { useEffect, useRef, useState } from 'react';
import { useCompany } from '../context/CompanyContext';
import { FileDown, Loader2, X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface DashboardPdfButtonProps {
  onPrint: (dateFrom: string, dateTo: string, company: string) => void;
  isPrinting: boolean;
}

export default function DashboardPdfButton({ onPrint, isPrinting }: DashboardPdfButtonProps) {
  const { selectedCompany } = useCompany();
  const [showModal, setShowModal] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0];

  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo]     = useState(today);

  function handleConfirm() {
    setShowModal(false);
    onPrint(dateFrom, dateTo, selectedCompany);
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={isPrinting}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-semibold hover:bg-primary-light transition-all active:scale-95 disabled:opacity-50 shadow-sm"
        title="Descargar informe del Dashboard como PDF"
      >
        {isPrinting
          ? <Loader2 size={16} className="animate-spin" />
          : <FileDown size={16} />
        }
        <span className="hidden sm:inline">{isPrinting ? 'Generando...' : 'Descargar Informe PDF'}</span>
      </button>

      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] px-4">
          <div className="bg-surface rounded-2xl p-8 w-full max-w-sm shadow-2xl border border-white/20 animate-scale-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Rango del Informe</h3>
              <button onClick={() => setShowModal(false)} className="text-text-muted hover:text-text-main">
                <X size={22} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-text-muted mb-1">Desde</label>
                <input
                  type="date"
                  className="w-full p-3 border-2 border-border-color rounded-lg focus:border-primary focus:outline-none"
                  value={dateFrom}
                  max={dateTo}
                  onChange={e => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-muted mb-1">Hasta</label>
                <input
                  type="date"
                  className="w-full p-3 border-2 border-border-color rounded-lg focus:border-primary focus:outline-none"
                  value={dateTo}
                  min={dateFrom}
                  max={today}
                  onChange={e => setDateTo(e.target.value)}
                />
              </div>
            </div>

            <div className="text-xs text-text-muted mb-5 bg-bg rounded-lg p-3">
              Se filtrará la información del período seleccionado para <strong>{selectedCompany}</strong>.
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2 border-2 border-border-color rounded-lg font-semibold hover:bg-bg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                className="px-5 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-light transition-colors flex items-center gap-2"
              >
                <FileDown size={15} />
                Descargar PDF
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
