import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../context/CompanyContext';
import { LogOut, ChevronDown, Plus, X, Check, Loader2 } from 'lucide-react';

interface HeaderProps {
  profile: any;
}

export default function Header({ profile }: HeaderProps) {
  const {
    selectedCompany,
    setSelectedCompany,
    fixedCompanies,
    feriaCompanies,
    loadingCompanies,
    addCompany,
    removeCompany,
  } = useCompany();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Estado para agregar empresa fija
  const [addingFija, setAddingFija] = useState(false);
  const [newFijaName, setNewFijaName] = useState('');
  const [savingFija, setSavingFija] = useState(false);

  // Estado para agregar feria
  const [addingFeria, setAddingFeria] = useState(false);
  const [newFeriaName, setNewFeriaName] = useState('');
  const [savingFeria, setSavingFeria] = useState(false);

  // Cierra al hacer click fuera
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setAddingFija(false);
        setAddingFeria(false);
        setNewFijaName('');
        setNewFeriaName('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Cierra con Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        setAddingFija(false);
        setAddingFeria(false);
        setNewFijaName('');
        setNewFeriaName('');
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  async function handleAddFija() {
    if (!newFijaName.trim() || savingFija) return;
    setSavingFija(true);
    try {
      await addCompany(newFijaName, 'fija');
      setSelectedCompany(newFijaName.trim());
      setNewFijaName('');
      setAddingFija(false);
      setOpen(false);
    } catch {
      // nombre duplicado u otro error
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
      setOpen(false);
    } catch {
      // nombre duplicado u otro error
    } finally {
      setSavingFeria(false);
    }
  }

  async function handleRemove(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await removeCompany(id);
    } catch {
      // ignorar
    }
  }

  const getInitials = (name: string) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  return (
    <header className="bg-surface/80 backdrop-blur-md border-b-2 border-border-color px-4 md:px-8 py-3 md:py-4 sticky top-0 z-50 shadow-[0_2px_15px_rgba(0,0,0,0.03)] card-transition">
      <div className="max-w-[1600px] mx-auto flex justify-between items-center">
        <div className="font-mono text-xl md:text-2xl font-bold text-primary tracking-tight hover-lift cursor-pointer flex items-center gap-2 group">
          <div className="w-7 h-7 md:w-8 md:h-8 bg-primary rounded-lg flex items-center justify-center text-accent text-base md:text-lg transition-transform group-hover:rotate-12">N</div>
          NU<span className="text-accent-dark">PLAN</span>
        </div>

        <div className="flex items-center gap-8">
          {/* Selector de empresa con grupos */}
          <div ref={containerRef} className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              disabled={loadingCompanies}
              className={`flex items-center justify-between gap-2 px-3 py-2.5 w-56 border-2 border-border-color rounded-lg text-sm bg-surface transition-all cursor-pointer select-none
                ${open ? 'border-primary ring-3 ring-primary/10' : 'hover:border-primary/40'}
                ${loadingCompanies ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex flex-col items-start min-w-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-text-muted leading-none mb-0.5">
                  {loadingCompanies ? 'Cargando...' : (feriaCompanies.some(f => f.name === selectedCompany) ? 'Feria' : 'Empresa')}
                </span>
                <span className="text-text-main font-semibold truncate w-full text-left">
                  {selectedCompany}
                </span>
              </div>
              <ChevronDown size={16} className={`shrink-0 text-text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
              <div className="absolute right-0 left-auto z-50 mt-1.5 w-64 bg-surface border-2 border-primary/30 rounded-xl shadow-xl overflow-hidden">
                <div className="max-h-96 overflow-y-auto">

                  {/* ── EMPRESAS FIJAS ── */}
                  <div className="px-3 pt-3 pb-1 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Empresas Fijas</span>
                  </div>

                  {fixedCompanies.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setSelectedCompany(c.name); setOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors group
                        ${selectedCompany === c.name
                          ? 'bg-primary text-white font-semibold'
                          : 'text-text-main hover:bg-primary/8 hover:text-primary'}`}
                    >
                      <span className="truncate flex-1">{c.name}</span>
                      {selectedCompany === c.name && (
                        <Check size={14} className="shrink-0 ml-auto" />
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleRemove(c.id, e)}
                        className={`shrink-0 p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100
                          ${selectedCompany === c.name
                            ? 'hover:bg-white/20 text-white'
                            : 'hover:bg-danger/10 text-danger'}`}
                        title="Eliminar empresa"
                      >
                        <X size={12} />
                      </button>
                    </button>
                  ))}

                  {/* Agregar empresa fija */}
                  {addingFija ? (
                    <div className="px-3 py-2 flex items-center gap-2">
                      <input
                        autoFocus
                        value={newFijaName}
                        onChange={e => setNewFijaName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddFija(); if (e.key === 'Escape') { setAddingFija(false); setNewFijaName(''); } }}
                        placeholder="Nombre empresa..."
                        className="flex-1 text-sm bg-bg border border-border-color rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary"
                      />
                      <button type="button" onClick={handleAddFija} disabled={savingFija} className="p-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
                        {savingFija ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      </button>
                      <button type="button" onClick={() => { setAddingFija(false); setNewFijaName(''); }} className="p-1.5 rounded-lg hover:bg-danger/10 text-danger transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setAddingFija(true); setAddingFeria(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs text-text-muted hover:text-primary hover:bg-primary/5 transition-colors"
                    >
                      <Plus size={12} /> Agregar empresa fija
                    </button>
                  )}

                  <div className="mx-3 my-1.5 border-t border-border-color" />

                  {/* ── FERIAS ── */}
                  <div className="px-3 pt-1 pb-1 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Ferias / Eventos</span>
                  </div>

                  {feriaCompanies.length === 0 && (
                    <div className="px-4 py-2 text-xs text-text-muted italic">Sin ferias registradas</div>
                  )}

                  {feriaCompanies.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setSelectedCompany(c.name); setOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors group
                        ${selectedCompany === c.name
                          ? 'bg-primary text-white font-semibold'
                          : 'text-text-main hover:bg-primary/8 hover:text-primary'}`}
                    >
                      <span className="truncate flex-1">{c.name}</span>
                      {selectedCompany === c.name && (
                        <Check size={14} className="shrink-0 ml-auto" />
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleRemove(c.id, e)}
                        className={`shrink-0 p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100
                          ${selectedCompany === c.name
                            ? 'hover:bg-white/20 text-white'
                            : 'hover:bg-danger/10 text-danger'}`}
                        title="Eliminar feria"
                      >
                        <X size={12} />
                      </button>
                    </button>
                  ))}

                  {/* Agregar feria */}
                  {addingFeria ? (
                    <div className="px-3 py-2 flex items-center gap-2">
                      <input
                        autoFocus
                        value={newFeriaName}
                        onChange={e => setNewFeriaName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddFeria(); if (e.key === 'Escape') { setAddingFeria(false); setNewFeriaName(''); } }}
                        placeholder="Nombre feria / evento..."
                        className="flex-1 text-sm bg-bg border border-border-color rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary"
                      />
                      <button type="button" onClick={handleAddFeria} disabled={savingFeria} className="p-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
                        {savingFeria ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      </button>
                      <button type="button" onClick={() => { setAddingFeria(false); setNewFeriaName(''); }} className="p-1.5 rounded-lg hover:bg-danger/10 text-danger transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setAddingFeria(true); setAddingFija(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs text-text-muted hover:text-primary hover:bg-primary/5 transition-colors"
                    >
                      <Plus size={12} /> Agregar feria / evento
                    </button>
                  )}

                  <div className="pb-1" />
                </div>
              </div>
            )}
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
