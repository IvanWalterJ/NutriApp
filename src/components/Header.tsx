import { supabase } from '../lib/supabase';

interface HeaderProps {
  profile: any;
}

export default function Header({ profile }: HeaderProps) {
  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <header className="bg-surface border-b-2 border-border-color px-8 py-6 sticky top-0 z-50 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <div className="max-w-[1600px] mx-auto flex justify-between items-center">
        <div className="font-mono text-2xl font-bold text-primary tracking-tight">
          NU<span className="text-accent-dark">PLAN</span>
        </div>
        <div className="flex items-center gap-8">
          <div className="bg-gradient-to-br from-primary to-primary-light text-white px-5 py-2 rounded-lg font-semibold text-sm">
            🏢 Galeno Seguros
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="font-semibold text-sm">{profile?.full_name || 'Usuario'}</div>
                <div className="text-xs text-text-muted capitalize">{profile?.role || 'Profesional'}</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center font-bold text-primary">
                {getInitials(profile?.full_name || 'U')}
              </div>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="p-2 text-text-muted hover:text-danger transition-colors"
              title="Cerrar sesión"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
