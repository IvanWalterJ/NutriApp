import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../context/CompanyContext';

// ── Icons ──────────────────────────────────────────────────────────────────
const MenuIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
const ChevronLeftIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
const DashboardIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
const UsersIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const RulerIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v5H3z"/><line x1="7" y1="8" x2="7" y2="13"/><line x1="12" y1="8" x2="12" y2="11"/><line x1="17" y1="8" x2="17" y2="13"/><path d="M3 13h18v8H3z"/></svg>;
const ClipboardIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"/></svg>;
const TrendingUpIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const SparklesIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.9 5.5l.8 2.2a2.3 2.3 0 0 0 1.6 1.6l2.2.8-2.2.8a2.3 2.3 0 0 0-1.6 1.6l-.8 2.2-.8-2.2a2.3 2.3 0 0 0-1.6-1.6l-2.2-.8 2.2-.8a2.3 2.3 0 0 0 1.6-1.6l.8-2.2zM20 12l-.5 1.4a1.8 1.8 0 0 0-1.2 1.2l-1.4.5 1.4.5a1.8 1.8 0 0 0 1.2 1.2l.5 1.4.5-1.4a1.8 1.8 0 0 0 1.2-1.2l1.4-.5-1.4-.5a1.8 1.8 0 0 0-1.2-1.2L20 12zM5.5 2L5 3.4a1.8 1.8 0 0 0-1.2 1.2L2.4 5.1l1.4.5A1.8 1.8 0 0 0 5 6.8L5.5 8.2l.5-1.4A1.8 1.8 0 0 0 7.2 5.6l1.4-.5-1.4-.5a1.8 1.8 0 0 0-1.2-1.2L5.5 2z"/></svg>;
const ChefHatIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>;
const BuildingIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const XIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const LogOutIcon = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const SettingsIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const ChevronDownIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;

// ── Nav items ──────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'dashboard',      label: 'Dashboard General', Icon: DashboardIcon },
  { id: 'empleados',      label: 'Pacientes',          Icon: UsersIcon },
  { id: 'antropometria',  label: 'Antropometría',      Icon: RulerIcon },
  { id: 'nueva-consulta', label: 'Nueva Consulta',     Icon: ClipboardIcon },
  { id: 'parametros',     label: 'Parámetros OMS',     Icon: TrendingUpIcon },
  { id: 'generador',      label: 'Generador de Planes',Icon: SparklesIcon },
  { id: 'recetario',      label: 'Recetario',          Icon: ChefHatIcon },
  { id: 'empresas',       label: 'Empresas',           Icon: BuildingIcon },
];

// ── Props ──────────────────────────────────────────────────────────────────
interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  profile: any;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

// ── Main component ─────────────────────────────────────────────────────────
export default function Sidebar({
  activeTab,
  setActiveTab,
  profile,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}: SidebarProps) {
  const { selectedCompany, setSelectedCompany, companies, loadingCompanies } = useCompany();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  function handleNavClick(id: string) {
    setActiveTab(id);
    setMobileOpen(false);
  }

  function handleSelectCompany(name: string) {
    setSelectedCompany(name);
    setDropdownOpen(false);
    setMobileOpen(false);
  }

  function getInitials(name: string) {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  // Empresa actual
  const currentCompany = companies.find(c => c.name === selectedCompany);

  // ── Shared inner content ─────────────────────────────────────────────────
  const content = (isMobileDrawer = false) => (
    <div className={`flex flex-col h-full bg-surface border-r-2 border-border-color ${isMobileDrawer ? 'w-72' : ''}`}>

      {/* Logo + toggle */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border-color shrink-0">
        {(!collapsed || isMobileDrawer) && (
          <div className="font-mono font-bold text-primary text-lg tracking-tight flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center text-accent text-base">N</div>
            NU<span className="text-accent-dark">PLAN</span>
          </div>
        )}
        {collapsed && !isMobileDrawer && (
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center text-accent text-base mx-auto">N</div>
        )}
        {!isMobileDrawer && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary/8 transition-colors ml-auto"
            title={collapsed ? 'Expandir' : 'Colapsar'}
          >
            {collapsed ? <MenuIcon /> : <ChevronLeftIcon />}
          </button>
        )}
        {isMobileDrawer && (
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary/8 transition-colors"
          >
            <XIcon />
          </button>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto py-3 space-y-1 px-2">

        {/* ── Navegación ── */}
        {(!collapsed || isMobileDrawer) && (
          <p className="text-[10px] font-black uppercase tracking-widest text-text-muted px-2 pt-1 pb-1">
            Navegación
          </p>
        )}
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => handleNavClick(id)}
              title={collapsed && !isMobileDrawer ? label : undefined}
              className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 group
                ${collapsed && !isMobileDrawer ? 'justify-center px-2 py-3' : 'px-3 py-2.5'}
                ${isActive
                  ? 'bg-primary text-white font-semibold shadow-[0_4px_12px_rgba(10,77,60,0.2)]'
                  : 'text-text-muted hover:text-primary hover:bg-primary/8'}`}
            >
              <span className="shrink-0"><Icon /></span>
              {(!collapsed || isMobileDrawer) && (
                <span className="text-sm truncate">{label}</span>
              )}
            </button>
          );
        })}

        {/* ── Separador ── */}
        <div className="mx-2 my-3 border-t border-border-color" />

        {/* ── Empresa activa ── */}
        {collapsed && !isMobileDrawer ? (
          <button
            title={selectedCompany}
            className="w-full flex items-center justify-center px-2 py-3 rounded-xl text-primary bg-primary/8"
          >
            <BuildingIcon />
          </button>
        ) : (
          <div className="px-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted pb-1.5">
              Empresa activa
            </p>
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(v => !v)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary/8 border border-primary/20 text-primary hover:bg-primary/12 transition-colors text-sm font-medium"
              >
                <BuildingIcon />
                <span className="flex-1 text-left truncate">
                  {loadingCompanies ? 'Cargando...' : selectedCompany}
                </span>
                {currentCompany && (
                  <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full
                    ${currentCompany.type === 'feria'
                      ? 'bg-accent/20 text-accent-dark'
                      : 'bg-primary/15 text-primary/70'}`}>
                    {currentCompany.type === 'feria' ? 'feria' : 'fija'}
                  </span>
                )}
                <span className="shrink-0 text-primary/60"><ChevronDownIcon /></span>
              </button>

              {dropdownOpen && (
                <>
                  {/* Backdrop */}
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  {/* Dropdown */}
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-surface border-2 border-border-color rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto">
                    {companies.length === 0 ? (
                      <p className="text-xs text-text-muted italic px-4 py-3">Sin empresas registradas</p>
                    ) : (
                      <>
                        {/* Empresas fijas */}
                        {companies.filter(c => c.type === 'fija').length > 0 && (
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-text-muted px-3 pt-2.5 pb-1">Empresas fijas</p>
                            {companies.filter(c => c.type === 'fija').map(c => (
                              <button
                                key={c.id}
                                onClick={() => handleSelectCompany(c.name)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors
                                  ${selectedCompany === c.name
                                    ? 'bg-primary/10 text-primary font-semibold'
                                    : 'text-text-main hover:bg-bg'}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedCompany === c.name ? 'bg-primary' : 'bg-border-color'}`} />
                                <span className="truncate">{c.name}</span>
                                {selectedCompany === c.name && <span className="ml-auto text-[9px] font-bold uppercase text-primary/60">activa</span>}
                              </button>
                            ))}
                          </div>
                        )}
                        {/* Ferias */}
                        {companies.filter(c => c.type === 'feria').length > 0 && (
                          <div>
                            <div className="mx-3 my-1 border-t border-border-color" />
                            <p className="text-[9px] font-black uppercase tracking-widest text-text-muted px-3 pt-1.5 pb-1">Ferias / Eventos</p>
                            {companies.filter(c => c.type === 'feria').map(c => (
                              <button
                                key={c.id}
                                onClick={() => handleSelectCompany(c.name)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors
                                  ${selectedCompany === c.name
                                    ? 'bg-accent/10 text-primary font-semibold'
                                    : 'text-text-main hover:bg-bg'}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedCompany === c.name ? 'bg-accent-dark' : 'bg-border-color'}`} />
                                <span className="truncate">{c.name}</span>
                                {selectedCompany === c.name && <span className="ml-auto text-[9px] font-bold uppercase text-accent-dark/70">activa</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                    <div className="border-t border-border-color" />
                    <button
                      onClick={() => { setDropdownOpen(false); handleNavClick('empresas'); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-text-muted hover:text-primary hover:bg-primary/5 transition-colors"
                    >
                      <BuildingIcon />
                      <span>Gestionar empresas...</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Separador ── */}
        <div className="mx-2 my-3 border-t border-border-color" />

        {/* ── Ajustes (placeholder) ── */}
        <button
          title={collapsed && !isMobileDrawer ? 'Ajustes' : undefined}
          className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-text-muted hover:text-primary hover:bg-primary/8 transition-colors
            ${collapsed && !isMobileDrawer ? 'justify-center px-2' : ''}`}
          disabled
        >
          <span className="shrink-0"><SettingsIcon /></span>
          {(!collapsed || isMobileDrawer) && (
            <span className="text-sm text-text-muted/60">Ajustes <span className="text-[10px]">(próximamente)</span></span>
          )}
        </button>
      </div>

      {/* ── Footer: perfil + logout ── */}
      <div className="shrink-0 border-t border-border-color p-3 space-y-1">
        {(!collapsed || isMobileDrawer) && (
          <div className="flex items-center gap-3 px-2 py-1.5 rounded-xl">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center font-bold text-primary text-sm shrink-0 shadow-[0_2px_8px_rgba(20,241,149,0.3)]">
              {getInitials(profile?.full_name || 'U')}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-text-main truncate">{profile?.full_name || 'Usuario'}</p>
              <p className="text-[10px] text-text-muted uppercase tracking-wider font-black">{profile?.role || 'Profesional'}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => supabase.auth.signOut()}
          title={collapsed && !isMobileDrawer ? 'Cerrar sesión' : undefined}
          className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-text-muted hover:text-danger hover:bg-danger/10 transition-colors
            ${collapsed && !isMobileDrawer ? 'justify-center px-2' : ''}`}
        >
          <span className="shrink-0"><LogOutIcon /></span>
          {(!collapsed || isMobileDrawer) && <span className="text-sm">Cerrar sesión</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className={`hidden md:flex flex-col shrink-0 transition-all duration-300 ease-in-out print:hidden
          ${collapsed ? 'w-16' : 'w-60'}`}
        style={{ height: '100vh', position: 'sticky', top: 0 }}
      >
        {content(false)}
      </aside>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[100] flex print:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="relative z-10 animate-in" style={{ animationDelay: '0ms' }}>
            {content(true)}
          </div>
        </div>
      )}
    </>
  );
}
