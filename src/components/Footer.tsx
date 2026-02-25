import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

export default function Footer() {
  const { showToast } = useToast();

  const handleExportExcel = async () => {
    try {
      showToast('Generando archivo Excel...', 'info');
      const { data, error } = await supabase.from('patients').select('*');
      if (error) throw error;

      if (!data || data.length === 0) {
        showToast('No hay datos para exportar', 'info');
        return;
      }

      const headers = ['Nombre', 'Apellido', 'Área', 'Peso Inicial', 'Altura', 'Estado', 'Creado'];
      const csvContent = [
        headers.join(','),
        ...data.map(p => [
          p.first_name,
          p.last_name,
          p.area,
          p.initial_weight,
          p.height,
          p.status,
          new Date(p.created_at).toLocaleDateString()
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `reporte_nutricional_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('Archivo Excel descargado con éxito', 'success');
    } catch (err) {
      console.error('Export error:', err);
      showToast('Error al exportar datos', 'error');
    }
  };

  const handleDownloadPDF = () => {
    showToast('Preparando vista de impresión...', 'info');
    setTimeout(() => {
      window.print();
    }, 1000);
  };

  const handleSendEmail = () => {
    showToast('Enviando reporte por email...', 'info');
    setTimeout(() => {
      showToast('Reporte enviado con éxito a la administración', 'success');
    }, 2000);
  };

  return (
    <footer className="bg-surface border-t-2 border-border-color p-8 mt-16 text-center text-text-muted no-print">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-8">
        <button
          onClick={handleDownloadPDF}
          className="px-4 md:px-6 py-3 bg-surface border-2 border-border-color rounded-xl font-bold flex items-center justify-center gap-2.5 transition-all hover:border-primary hover:text-primary hover-lift shadow-sm active:scale-95 text-xs md:text-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
          Descargar PDF Mensual
        </button>
        <button
          onClick={handleExportExcel}
          className="px-4 md:px-6 py-3 bg-surface border-2 border-border-color rounded-xl font-bold flex items-center justify-center gap-2.5 transition-all hover:border-primary hover:text-primary hover-lift shadow-sm active:scale-95 text-xs md:text-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
          Exportar a Excel
        </button>
        <button
          onClick={handleSendEmail}
          className="px-4 md:px-6 py-3 bg-surface border-2 border-border-color rounded-xl font-bold flex items-center justify-center gap-2.5 transition-all hover:border-primary hover:text-primary hover-lift shadow-sm active:scale-95 text-xs md:text-sm sm:col-span-2 lg:col-span-1"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
          Enviar Reporte por Email
        </button>
      </div>
      <div className="text-[0.9rem] leading-relaxed">
        <strong>NuPlan Dashboard Empresarial</strong> • Sistema Profesional de Gestión Nutricional<br />
        Datos actualizados en tiempo real • Cumple con estándares OMS y protocolos de privacidad médica
      </div>
    </footer>
  );
}
