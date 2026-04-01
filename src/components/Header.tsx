import { supabase } from '../lib/supabase';
import { useCompany, Company } from '../context/CompanyContext';
import { Building2, LogOut } from 'lucide-react';
import CustomSelect from './ui/CustomSelect';

interface HeaderProps {
  profile: any;
}

export default function Header({ profile }: HeaderProps) {
  const { selectedCompany, setSelectedCompany } = useCompany();

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <header className="bg-surface/80 backdrop-blur-md border-b-2 border-border-color px-4 md:px-8 py-3 md:py-4 sticky top-0 z-50 shadow-[0_2px_15px_rgba(0,0,0,0.03)] card-transition">
      <div className="max-w-[1600px] mx-auto flex justify-between items-center">
        <div className="font-mono text-xl md:text-2xl font-bold text-primary tracking-tight hover-lift cursor-pointer flex items-center gap-2 group">
          <div className="w-7 h-7 md:w-8 md:h-8 bg-primary rounded-lg flex items-center justify-center text-accent text-base md:text-lg transition-transform group-hover:rotate-12">N</div>
          NU<span className="text-accent-dark">PLAN</span>
        </div>
        <div className="flex items-center gap-8">
          <div className="hidden sm:block">
            <CustomSelect
              value={selectedCompany}
              onChange={(v) => setSelectedCompany(v as Company)}
              options={[
                { value: 'Galeno', label: 'Galeno' },
                { value: 'Swiss Medical', label: 'Swiss Medical' },
                { value: 'Ferias', label: 'Ferias' },
                { value: 'Consultorio Privado', label: 'Consultorio Privado' },
                { value: 'Mercado Libre', label: 'Mercado Libre' },
                { value: 'Mercado Libre Virtual', label: 'Mercado Libre Virtual' },
              ]}
              className="w-52"
              dropdownClassName="right-0 left-auto"
            />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 md:gap-3 group cursor-pointer hover-lift">
              <div className="text-right transition-all group-hover:translate-x-[-4px] hidden xs:block">
                <div className="font-bold text-xs md:text-sm group-hover:text-primary transition-colors whitespace-nowrap">{profile?.full_name || 'Usuario'}</div>
                <div className="text-[9px] md:text-[10px] text-text-muted uppercase tracking-tighter font-black">{profile?.role || 'Profesional'}</div>
              </div>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center font-bold text-primary shadow-[0_4px_10px_rgba(20,241,149,0.3)] transition-transform group-hover:scale-110 group-hover:rotate-3 text-sm md:text-base">
                {getInitials(profile?.full_name || 'U')}
              </div>
            </div>
            <div className="w-px h-6 bg-border-color hidden xs:block"></div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="p-2 text-text-muted hover:text-danger hover:bg-danger/10 rounded-xl transition-all active:scale-90"
              title="Cerrar sesión"
            >
              <LogOut size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
