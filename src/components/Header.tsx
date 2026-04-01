import { supabase } from '../lib/supabase';
import { useCompany } from '../context/CompanyContext';

const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

const TAB_LABELS: Record<string, string> = {
  dashboard:       'Dashboard General',
  empleados:       'Pacientes',
  antropometria:   'Antropometría',
  'nueva-consulta':'Nueva Consulta',
  parametros:      'Parámetros OMS',
  generador:       'Generador de Planes',
  recetario:       'Recetario',
};

interface HeaderProps {
  profile: any;
  activeTab: string;
  onMenuClick: () => void;
}

export default function Header({ profile, activeTab, onMenuClick }: HeaderProps) {
  const { selectedCompany, getCompanyType } = useCompany();
  const isFeria = getCompanyType(selectedCompany) === 'feria';

  return (
    <header className="bg-surface/80 backdrop-blur-md border-b-2 border-border-color px-4 md:px-6 py-3 sticky top-0 z-40 shadow-[0_2px_15px_rgba(0,0,0,0.03)] print:hidden shrink-0">
      <div className="flex items-center justify-between gap-4">

        {/* Left: hamburger (mobile) + título sección */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-xl text-text-muted hover:text-primary hover:bg-primary/8 transition-colors shrink-0"
            aria-label="Abrir menú"
          >
            <MenuIcon />
          </button>
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-bold text-text-main truncate">
              {TAB_LABELS[activeTab] ?? 'NuPlan'}
            </h1>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isFeria ? 'bg-accent-dark' : 'bg-primary'}`} />
              <span className="text-xs text-text-muted truncate">
                {selectedCompany}
                {isFeria && <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-accent-dark/80">Feria</span>}
              </span>
            </div>
          </div>
        </div>

        {/* Right: avatar + nombre (desktop) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-bold text-text-main leading-tight">{profile?.full_name || 'Usuario'}</p>
            <p className="text-[10px] text-text-muted uppercase tracking-wider font-black">{profile?.role || 'Profesional'}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center font-bold text-primary shadow-[0_2px_8px_rgba(20,241,149,0.3)] text-sm shrink-0">
            {(profile?.full_name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)}
          </div>
        </div>
      </div>
    </header>
  );
}
