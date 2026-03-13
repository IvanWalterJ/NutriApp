import { supabase } from '../lib/supabase';
export default function Footer() {
  return (
    <footer className="bg-surface border-t-2 border-border-color p-8 mt-16 text-center text-text-muted no-print">
      <div className="text-[0.9rem] leading-relaxed">
        <strong>NuPlan Dashboard Empresarial</strong> • Sistema Profesional de Gestión Nutricional<br />
        Datos actualizados en tiempo real • Cumple con estándares OMS y protocolos de privacidad médica
      </div>
    </footer>
  );
}
