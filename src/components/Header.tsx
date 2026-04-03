import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../context/CompanyContext';

const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);
const BuildingIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const ChevronDownIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;

const TAB_LABELS: Record<string, string> = {
  dashboard:       'Dashboard General',
  empleados:       'Pacientes',
  antropometria:   'Antropometría',
  'nueva-consulta':'Nueva Consulta',
  parametros:      'Parámetros OMS',
  generador:       'Generador de Planes',
  recetario:       'Recetario',
  empresas:        'Empresas',
};

interface HeaderProps {
  profile: any;
  activeTab: string;
  onMenuClick: () => void;
}

export default function Header({ profile, activeTab, onMenuClick }: HeaderProps) {
  const { selectedCompany, setSelectedCompany, companies, getCompanyType } = useCompany();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isFeria = getCompanyType(selectedCompany) === 'feria';

  function handleSelectCompany(name: string) {
    setSelectedCompany(name);
    setDropdownOpen(false);
  }

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
          </div>
        </div>

        {/* Right: company dropdown + avatar + nombre */}
        <div className="flex items-center gap-3 shrink-0">

          {/* Company dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(v => !v)}
              className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-colors text-sm font-semibold
                ${isFeria
                  ? 'border-accent-dark/30 bg-accent/8 text-accent-dark hover:bg-accent/15'
                  : 'border-primary/20 bg-primary/8 text-primary hover:bg-primary/12'}`}
            >
              <BuildingIcon />
              <span className="max-w-[140px] truncate">{selectedCompany}</span>
              {isFeria && (
                <span className="text-[9px] font-bold uppercase tracking-wider bg-accent/20 text-accent-dark px-1.5 py-0.5 rounded-full">
                  feria
                </span>
              )}
              <span className="opacity-60"><ChevronDownIcon /></span>
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-1.5 z-50 bg-surface border-2 border-border-color rounded-2xl shadow-xl overflow-hidden min-w-[200px] max-h-80 overflow-y-auto">
                  {/* Empresas fijas */}
                  {companies.filter(c => c.type === 'fija').length > 0 && (
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-text-muted px-4 pt-3 pb-1.5">Empresas fijas</p>
                      {companies.filter(c => c.type === 'fija').map(c => (
                        <button
                          key={c.id}
                          onClick={() => handleSelectCompany(c.name)}
                          className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors
                            ${selectedCompany === c.name
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'text-text-main hover:bg-bg'}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedCompany === c.name ? 'bg-primary' : 'bg-border-color'}`} />
                          <span className="truncate">{c.name}</span>
                          {selectedCompany === c.name && (
                            <span className="ml-auto text-[9px] font-bold uppercase text-primary/60">activa</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Ferias */}
                  {companies.filter(c => c.type === 'feria').length > 0 && (
                    <div>
                      <div className="mx-3 my-1 border-t border-border-color" />
                      <p className="text-[9px] font-black uppercase tracking-widest text-text-muted px-4 pt-2 pb-1.5">Ferias / Eventos</p>
                      {companies.filter(c => c.type === 'feria').map(c => (
                        <button
                          key={c.id}
                          onClick={() => handleSelectCompany(c.name)}
                          className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors
                            ${selectedCompany === c.name
                              ? 'bg-accent/10 text-primary font-semibold'
                              : 'text-text-main hover:bg-bg'}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedCompany === c.name ? 'bg-accent-dark' : 'bg-border-color'}`} />
                          <span className="truncate">{c.name}</span>
                          {selectedCompany === c.name && (
                            <span className="ml-auto text-[9px] font-bold uppercase text-accent-dark/70">activa</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="pb-1" />
                </div>
              </>
            )}
          </div>

          {/* User info */}
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
