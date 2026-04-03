import React from 'react';
import { supabase } from '../lib/supabase';

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
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

// ── Main component ─────────────────────────────────────────────────────────
export default function Sidebar({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}: SidebarProps) {

  function handleNavClick(id: string) {
    setActiveTab(id);
    setMobileOpen(false);
  }

  // ── Shared inner content ─────────────────────────────────────────────────
  const content = (isMobileDrawer = false) => (
    <div
      className={`flex flex-col h-full border-r border-white/10 ${isMobileDrawer ? 'w-72' : ''}`}
      style={{ backgroundColor: '#0A4D3C' }}
    >

      {/* Logo + toggle */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 shrink-0">
        {(!collapsed || isMobileDrawer) && (
          <div className="font-mono font-bold text-lg tracking-tight flex items-center gap-2">
            <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center text-primary text-base font-black">N</div>
            <span className="text-white">NU</span><span className="text-accent">PLAN</span>
          </div>
        )}
        {collapsed && !isMobileDrawer && (
          <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center text-primary text-base font-black mx-auto">N</div>
        )}
        {!isMobileDrawer && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors ml-auto"
            title={collapsed ? 'Expandir' : 'Colapsar'}
          >
            {collapsed ? <MenuIcon /> : <ChevronLeftIcon />}
          </button>
        )}
        {isMobileDrawer && (
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <XIcon />
          </button>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">

        {(!collapsed || isMobileDrawer) && (
          <p className="text-[10px] font-black uppercase tracking-widest text-white/35 px-2 pt-1 pb-1.5">
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
              className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200
                ${collapsed && !isMobileDrawer ? 'justify-center px-2 py-3' : 'px-3 py-2.5'}
                ${isActive
                  ? 'bg-accent text-primary font-bold shadow-[0_4px_12px_rgba(20,241,149,0.25)]'
                  : 'text-white/60 hover:text-white hover:bg-white/10'}`}
            >
              <span className="shrink-0"><Icon /></span>
              {(!collapsed || isMobileDrawer) && (
                <span className="text-sm truncate">{label}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Footer: ajustes + logout ── */}
      <div className="shrink-0 border-t border-white/10 p-2 space-y-0.5">
        {/* Ajustes placeholder */}
        <button
          title={collapsed && !isMobileDrawer ? 'Ajustes' : undefined}
          className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-white/30 transition-colors cursor-not-allowed
            ${collapsed && !isMobileDrawer ? 'justify-center px-2' : ''}`}
          disabled
        >
          <span className="shrink-0"><SettingsIcon /></span>
          {(!collapsed || isMobileDrawer) && (
            <span className="text-sm">Ajustes <span className="text-[10px]">(próximamente)</span></span>
          )}
        </button>

        {/* Logout — rojo destacado */}
        <button
          onClick={() => supabase.auth.signOut()}
          title={collapsed && !isMobileDrawer ? 'Cerrar sesión' : undefined}
          className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold transition-colors
            text-red-400 hover:text-white hover:bg-red-500/80
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
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 animate-in" style={{ animationDelay: '0ms' }}>
            {content(true)}
          </div>
        </div>
      )}
    </>
  );
}
