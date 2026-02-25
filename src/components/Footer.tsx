export default function Footer() {
  return (
    <footer className="bg-surface border-t-2 border-border-color p-8 mt-16 text-center text-text-muted">
      <div className="flex flex-wrap gap-4 justify-center mb-6">
        <button className="px-6 py-3 bg-surface border-2 border-border-color rounded-lg font-semibold flex items-center gap-2 transition-all hover:border-primary hover:text-primary hover:-translate-y-0.5">
          📄 Descargar PDF Mensual
        </button>
        <button className="px-6 py-3 bg-surface border-2 border-border-color rounded-lg font-semibold flex items-center gap-2 transition-all hover:border-primary hover:text-primary hover:-translate-y-0.5">
          📊 Exportar a Excel
        </button>
        <button className="px-6 py-3 bg-surface border-2 border-border-color rounded-lg font-semibold flex items-center gap-2 transition-all hover:border-primary hover:text-primary hover:-translate-y-0.5">
          📧 Enviar Reporte por Email
        </button>
      </div>
      <div className="text-[0.9rem] leading-relaxed">
        <strong>NuPlan Dashboard Empresarial</strong> • Sistema Profesional de Gestión Nutricional<br />
        Datos actualizados en tiempo real • Cumple con estándares OMS y protocolos de privacidad médica
      </div>
    </footer>
  );
}
