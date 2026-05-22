import { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { useCompany } from '../context/CompanyContext';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { BRAND } from '../lib/branding';
import {
  CONSULTAS_HEADERS,
  CONSULTAS_COL_WIDTHS,
  PACIENTES_NUEVOS_HEADERS,
  PACIENTES_NUEVOS_COL_WIDTHS,
} from '../lib/excelSchemas';

export default function ExcelExportButton() {
  const { selectedCompany } = useCompany();
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const { data: patients, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, email, initial_weight, height')
        .eq('company', selectedCompany)
        .order('last_name', { ascending: true });

      if (error) throw error;

      const wb = XLSX.utils.book_new();

      // ── Hoja 1: Consultas ──
      const consultasRows = (patients || []).map(p => [
        p.id,
        p.first_name,
        p.last_name,
        '',
        '',
        p.height || '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        'En Progreso',
        '',
        '',
      ]);

      const wsConsultas = XLSX.utils.aoa_to_sheet([[...CONSULTAS_HEADERS], ...consultasRows]);
      wsConsultas['!cols'] = CONSULTAS_COL_WIDTHS;
      XLSX.utils.book_append_sheet(wb, wsConsultas, 'Consultas');

      // ── Hoja 2: Pacientes Nuevos ──
      const wsNuevos = XLSX.utils.aoa_to_sheet([[...PACIENTES_NUEVOS_HEADERS]]);
      wsNuevos['!cols'] = PACIENTES_NUEVOS_COL_WIDTHS;
      XLSX.utils.book_append_sheet(wb, wsNuevos, 'Pacientes Nuevos');

      const fecha = new Date().toLocaleDateString('es-AR').replace(/\//g, '-');
      XLSX.writeFile(wb, `${BRAND.name}_Feria_${selectedCompany}_${fecha}.xlsx`);
    } catch (err) {
      console.error('Error generando Excel:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 border-2 border-primary text-primary rounded-xl font-semibold hover:bg-primary hover:text-white transition-all active:scale-95 disabled:opacity-50"
      title="Descargar planilla Excel para ferias sin internet"
    >
      {loading
        ? <Loader2 size={16} className="animate-spin" />
        : <FileSpreadsheet size={16} />
      }
      <span className="hidden sm:inline">Planilla Feria</span>
    </button>
  );
}
