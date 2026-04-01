import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { useCompany, CompanyEntry } from '../context/CompanyContext';

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
const PlusIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const XIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const CheckIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const LogOutIcon = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const SettingsIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const AlertTriangleIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const LoaderIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;

// ── Nav items ──────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'dashboard',      label: 'Dashboard General', Icon: DashboardIcon },
  { id: 'empleados',      label: 'Pacientes',          Icon: UsersIcon },
  { id: 'antropometria',  label: 'Antropometría',      Icon: RulerIcon },
  { id: 'nueva-consulta', label: 'Nueva Consulta',     Icon: ClipboardIcon },
  { id: 'parametros',     label: 'Parámetros OMS',     Icon: TrendingUpIcon },
  { id: 'generador',      label: 'Generador de Planes',Icon: SparklesIcon },
  { id: 'recetario',      label: 'Recetario',          Icon: ChefHatIcon },
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

// ── Delete confirmation modal ──────────────────────────────────────────────
function DeleteModal({
  company,
  onConfirm,
  onCancel,
}: {
  company: CompanyEntry;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Card */}
      <div className="relative z-10 bg-surface rounded-2xl shadow-2xl border-2 border-border-color max-w-sm w-full p-6 animate-scale-in">
        <div className="flex items-start gap-4 mb-5">
          <div className="shrink-0 w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center text-danger">
            <AlertTriangleIcon />
          </div>
          <div>
            <h3 className="font-bold text-lg text-text-main">Eliminar empresa</h3>
            <p className="text-sm text-text-muted mt-1">
              ¿Segura que querés eliminar <strong className="text-text-main">"{company.name}"</strong>?
            </p>
          </div>
        </div>

        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 mb-6 text-sm text-text-main">
          <p className="font-semibold text-warning mb-1">Importante</p>
          <p>
            Los pacientes y todos sus datos registrados bajo esta empresa <strong>NO se pierden</strong> — siguen existiendo en la base de datos. Solo desaparece la empresa de la lista de selección.
          </p>
          <p className="mt-2 text-text-muted">Esta acción no se puede deshacer.</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border-2 border-border-color text-text-main font-semibold hover:bg-bg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-danger text-white font-semibold hover:bg-danger/90 transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
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
  const {
    selectedCompany,
    setSelectedCompany,
    fixedCompanies,
    feriaCompanies,
    addCompany,
    removeCompany,
  } = useCompany();

  // Empresa pendiente de eliminar (abre modal)
  const [confirmDelete, setConfirmDelete] = useState<CompanyEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Agregar empresa fija
  const [addingFija, setAddingFija] = useState(false);
  const [newFijaName, setNewFijaName] = useState('');
  const [savingFija, setSavingFija] = useState(false);
  const inputFijaRef = useRef<HTMLInputElement>(null);

  // Agregar feria
  const [addingFeria, setAddingFeria] = useState(false);
  const [newFeriaName, setNewFeriaName] = useState('');
  const [savingFeria, setSavingFeria] = useState(false);
  const inputFeriaRef = useRef<HTMLInputElement>(null);

  // Focus inputs al abrir
  useEffect(() => { if (addingFija) inputFijaRef.current?.focus(); }, [addingFija]);
  useEffect(() => { if (addingFeria) inputFeriaRef.current?.focus(); }, [addingFeria]);

  function handleNavClick(id: string) {
    setActiveTab(id);
    setMobileOpen(false);
  }

  function handleSelectCompany(name: string) {
    setSelectedCompany(name);
    setMobileOpen(false);
  }

  async function handleAddFija() {
    if (!newFijaName.trim() || savingFija) return;
    setSavingFija(true);
    try {
      await addCompany(newFijaName, 'fija');
      setSelectedCompany(newFijaName.trim());
      setNewFijaName('');
      setAddingFija(false);
    } catch {
      // nombre duplicado
    } finally {
      setSavingFija(false);
    }
  }

  async function handleAddFeria() {
    if (!newFeriaName.trim() || savingFeria) return;
    setSavingFeria(true);
    try {
      await addCompany(newFeriaName, 'feria');
      setSelectedCompany(newFeriaName.trim());
      setNewFeriaName('');
      setAddingFeria(false);
    } catch {
      // nombre duplicado
    } finally {
      setSavingFeria(false);
    }
  }

  async function handleConfirmDelete() {
    if (!confirmDelete || deleting) return;
    setDeleting(true);
    try {
      await removeCompany(confirmDelete.id);
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  }

  function getInitials(name: string) {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

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

        {/* ── Empresas ── */}
        {(!collapsed || isMobileDrawer) && (
          <p className="text-[10px] font-black uppercase tracking-widest text-text-muted px-2 pb-1">
            Empresas Fijas
          </p>
        )}

        {collapsed && !isMobileDrawer ? (
          // Colapsado: solo ícono del edificio, tooltip de empresa seleccionada
          <button
            title={selectedCompany}
            className="w-full flex items-center justify-center px-2 py-3 rounded-xl text-primary bg-primary/8"
          >
            <BuildingIcon />
          </button>
        ) : (
          <>
            {/* Empresas fijas */}
            {fixedCompanies.map(c => {
              const isSelected = selectedCompany === c.name;
              return (
                <div
                  key={c.id}
                  className={`group flex items-center rounded-xl transition-all duration-200
                    ${isSelected ? 'bg-primary/8 text-primary' : 'text-text-muted hover:bg-bg hover:text-text-main'}`}
                >
                  <button
                    onClick={() => handleSelectCompany(c.name)}
                    className="flex-1 flex items-center gap-2.5 px-3 py-2 text-sm text-left"
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-primary' : 'bg-border-color'}`} />
                    <span className="truncate font-medium">{c.name}</span>
                    {isSelected && <span className="ml-auto shrink-0 text-[10px] font-bold uppercase tracking-wider text-primary/70">activa</span>}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(c)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 mr-1 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-all shrink-0"
                    title="Eliminar"
                  >
                    <XIcon />
                  </button>
                </div>
              );
            })}

            {/* Agregar empresa fija */}
            {addingFija ? (
              <div className="flex items-center gap-1.5 px-2 py-1.5">
                <input
                  ref={inputFijaRef}
                  value={newFijaName}
                  onChange={e => setNewFijaName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddFija();
                    if (e.key === 'Escape') { setAddingFija(false); setNewFijaName(''); }
                  }}
                  placeholder="Nombre empresa..."
                  className="flex-1 text-sm bg-bg border border-border-color rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary"
                />
                <button onClick={handleAddFija} disabled={savingFija} className="p-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors shrink-0">
                  {savingFija ? <LoaderIcon /> : <CheckIcon />}
                </button>
                <button onClick={() => { setAddingFija(false); setNewFijaName(''); }} className="p-1.5 rounded-lg hover:bg-danger/10 text-text-muted hover:text-danger transition-colors shrink-0">
                  <XIcon />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setAddingFija(true); setAddingFeria(false); setNewFeriaName(''); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-muted hover:text-primary hover:bg-primary/5 rounded-xl transition-colors"
              >
                <PlusIcon /> Agregar empresa fija
              </button>
            )}

            {/* ── Ferias ── */}
            <div className="mx-2 my-1.5 border-t border-border-color" />
            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted px-2 pb-1">
              Ferias / Eventos
            </p>

            {feriaCompanies.length === 0 && (
              <p className="text-xs text-text-muted italic px-3 py-1">Sin ferias registradas</p>
            )}

            {feriaCompanies.map(c => {
              const isSelected = selectedCompany === c.name;
              return (
                <div
                  key={c.id}
                  className={`group flex items-center rounded-xl transition-all duration-200
                    ${isSelected ? 'bg-accent/10 text-primary' : 'text-text-muted hover:bg-bg hover:text-text-main'}`}
                >
                  <button
                    onClick={() => handleSelectCompany(c.name)}
                    className="flex-1 flex items-center gap-2.5 px-3 py-2 text-sm text-left"
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-accent-dark' : 'bg-border-color'}`} />
                    <span className="truncate font-medium">{c.name}</span>
                    {isSelected && <span className="ml-auto shrink-0 text-[10px] font-bold uppercase tracking-wider text-accent-dark/80">activa</span>}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(c)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 mr-1 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-all shrink-0"
                    title="Eliminar"
                  >
                    <XIcon />
                  </button>
                </div>
              );
            })}

            {/* Agregar feria */}
            {addingFeria ? (
              <div className="flex items-center gap-1.5 px-2 py-1.5">
                <input
                  ref={inputFeriaRef}
                  value={newFeriaName}
                  onChange={e => setNewFeriaName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddFeria();
                    if (e.key === 'Escape') { setAddingFeria(false); setNewFeriaName(''); }
                  }}
                  placeholder="Nombre feria / evento..."
                  className="flex-1 text-sm bg-bg border border-border-color rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary"
                />
                <button onClick={handleAddFeria} disabled={savingFeria} className="p-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors shrink-0">
                  {savingFeria ? <LoaderIcon /> : <CheckIcon />}
                </button>
                <button onClick={() => { setAddingFeria(false); setNewFeriaName(''); }} className="p-1.5 rounded-lg hover:bg-danger/10 text-text-muted hover:text-danger transition-colors shrink-0">
                  <XIcon />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setAddingFeria(true); setAddingFija(false); setNewFijaName(''); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-muted hover:text-primary hover:bg-primary/5 rounded-xl transition-colors"
              >
                <PlusIcon /> Agregar feria / evento
              </button>
            )}
          </>
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

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <DeleteModal
          company={confirmDelete}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </>
  );
}
