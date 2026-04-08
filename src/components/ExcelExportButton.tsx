import { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { useCompany } from '../context/CompanyContext';
import { FileSpreadsheet, Loader2 } from 'lucide-react';

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
      const consultasHeaders = [
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
      ];

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

      const wsConsultas = XLSX.utils.aoa_to_sheet([consultasHeaders, ...consultasRows]);

      // Ancho de columnas
      wsConsultas['!cols'] = [
        { wch: 38 }, { wch: 14 }, { wch: 16 }, { wch: 26 }, { wch: 10 },
        { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 34 },
        { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 42 }, { wch: 30 }, { wch: 30 },
      ];

      XLSX.utils.book_append_sheet(wb, wsConsultas, 'Consultas');

      // ── Hoja 2: Pacientes Nuevos ──
      const nuevosHeaders = [
        'Nombre',
        'Apellido',
        'Email',
        'WhatsApp',
        'Fecha Nacimiento (dd/mm/aaaa)',
        'Sexo (Femenino / Masculino)',
        'Departamento',
        'Peso Inicial (kg)',
        'Altura (cm)',
        'Adherencia (1-5)',
        'Hidratación (Sí/No)',
        'Actividad Física (≤150 min / +150 min)',
        'Frutas y Verduras (1-5)',
        'Energía (1-5)',
        'Sueño (1-5)',
      ];

      const wsNuevos = XLSX.utils.aoa_to_sheet([nuevosHeaders]);

      wsNuevos['!cols'] = [
        { wch: 14 }, { wch: 16 }, { wch: 26 }, { wch: 18 }, { wch: 28 },
        { wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 16 },
        { wch: 18 }, { wch: 34 }, { wch: 22 }, { wch: 12 }, { wch: 12 },
      ];

      XLSX.utils.book_append_sheet(wb, wsNuevos, 'Pacientes Nuevos');

      const fecha = new Date().toLocaleDateString('es-AR').replace(/\//g, '-');
      XLSX.writeFile(wb, `NuPlan_Feria_${selectedCompany}_${fecha}.xlsx`);
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
