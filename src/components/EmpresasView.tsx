import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { useCompany, CompanyEntry } from '../context/CompanyContext';

// ── Icons ──────────────────────────────────────────────────────────────────
const PlusIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const BuildingIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const TrashIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
const UsersIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const AlertTriangleIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const CheckIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const XIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const LoaderIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;

// ── Types ──────────────────────────────────────────────────────────────────
interface CompanyWithStats extends CompanyEntry {
  patient_count: number;
}

// ── Delete Confirmation Modal ──────────────────────────────────────────────
function DeleteModal({
  company,
  onConfirm,
  onCancel,
  loading,
}: {
  company: CompanyWithStats;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 bg-surface rounded-2xl shadow-2xl border-2 border-border-color max-w-sm w-full p-6">
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
            Los pacientes y todos sus datos registrados bajo esta empresa <strong>NO se pierden</strong> — siguen existiendo en la base de datos. Solo desaparece la empresa de la lista.
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
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-danger text-white font-semibold hover:bg-danger/90 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <LoaderIcon /> : null}
            Eliminar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Add Company Modal ──────────────────────────────────────────────────────
function AddModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: (name: string, type: 'fija' | 'feria') => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'fija' | 'feria'>('fija');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSubmit() {
    if (!name.trim()) { setError('El nombre es obligatorio.'); return; }
    setSaving(true);
    setError('');
    try {
      await onConfirm(name.trim(), type);
    } catch {
      setError('Ya existe una empresa con ese nombre.');
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 bg-surface rounded-2xl shadow-2xl border-2 border-border-color max-w-sm w-full p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <BuildingIcon />
          </div>
          <h3 className="font-bold text-lg text-text-main">Nueva empresa</h3>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-text-muted block mb-1.5">Nombre</label>
            <input
              ref={inputRef}
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onCancel(); }}
              placeholder="Ej: Swiss Medical"
              className="w-full bg-bg border-2 border-border-color rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-text-muted block mb-1.5">Tipo</label>
            <div className="flex gap-2">
              <button
                onClick={() => setType('fija')}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-colors
                  ${type === 'fija' ? 'border-primary bg-primary/10 text-primary' : 'border-border-color text-text-muted hover:border-primary/50'}`}
              >
                Empresa fija
              </button>
              <button
                onClick={() => setType('feria')}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-colors
                  ${type === 'feria' ? 'border-accent-dark bg-accent/10 text-accent-dark' : 'border-border-color text-text-muted hover:border-accent-dark/50'}`}
              >
                Feria / Evento
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border-2 border-border-color text-text-main font-semibold hover:bg-bg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <LoaderIcon /> : <CheckIcon />}
            Agregar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function EmpresasView() {
  const { companies, addCompany, removeCompany, selectedCompany, setSelectedCompany } = useCompany();
  const [patientCounts, setPatientCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<CompanyWithStats | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<'todas' | 'fija' | 'feria'>('todas');

  useEffect(() => {
    fetchPatientCounts();
  }, [companies]);

  async function fetchPatientCounts() {
    if (companies.length === 0) { setLoadingCounts(false); return; }
    setLoadingCounts(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('company');
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        if (row.company) counts[row.company] = (counts[row.company] ?? 0) + 1;
      }
      setPatientCounts(counts);
    } catch (err) {
      console.error('Error fetching patient counts:', err);
    } finally {
      setLoadingCounts(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete || deleting) return;
    setDeleting(true);
    try {
      await removeCompany(confirmDelete.id);
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  async function handleAdd(name: string, type: 'fija' | 'feria') {
    await addCompany(name, type);
    setShowAdd(false);
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const companiesWithStats: CompanyWithStats[] = companies.map(c => ({
    ...c,
    patient_count: patientCounts[c.name] ?? 0,
  }));

  const filtered = companiesWithStats.filter(c => filter === 'todas' || c.type === filter);

  const totalPacientes = companiesWithStats.reduce((sum, c) => sum + c.patient_count, 0);
  const totalFijas = companies.filter(c => c.type === 'fija').length;
  const totalFerias = companies.filter(c => c.type === 'feria').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Empresas</h1>
          <p className="text-sm text-text-muted mt-0.5">Base de datos de empresas y organizaciones</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors shadow-[0_4px_12px_rgba(10,77,60,0.2)]"
        >
          <PlusIcon /> Nueva empresa
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface rounded-2xl border border-border-color p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">Total empresas</p>
          <p className="text-3xl font-bold text-text-main">{companies.length}</p>
        </div>
        <div className="bg-surface rounded-2xl border border-border-color p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">Fijas</p>
          <p className="text-3xl font-bold text-primary">{totalFijas}</p>
        </div>
        <div className="bg-surface rounded-2xl border border-border-color p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">Ferias / Eventos</p>
          <p className="text-3xl font-bold text-accent-dark">{totalFerias}</p>
        </div>
        <div className="bg-surface rounded-2xl border border-border-color p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">Total pacientes</p>
          <p className="text-3xl font-bold text-text-main">{loadingCounts ? '—' : totalPacientes}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-bg rounded-xl w-fit border border-border-color">
        {(['todas', 'fija', 'feria'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors capitalize
              ${filter === f ? 'bg-surface text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'}`}
          >
            {f === 'todas' ? 'Todas' : f === 'fija' ? 'Fijas' : 'Ferias'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl border border-border-color overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center text-primary mb-4">
              <BuildingIcon />
            </div>
            <p className="font-semibold text-text-main">No hay empresas</p>
            <p className="text-sm text-text-muted mt-1">Agregá la primera empresa con el botón de arriba.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-color">
                  <th className="text-left text-xs font-black uppercase tracking-wider text-text-muted px-5 py-3.5">Empresa</th>
                  <th className="text-left text-xs font-black uppercase tracking-wider text-text-muted px-5 py-3.5">Tipo</th>
                  <th className="text-left text-xs font-black uppercase tracking-wider text-text-muted px-5 py-3.5">Fecha de alta</th>
                  <th className="text-left text-xs font-black uppercase tracking-wider text-text-muted px-5 py-3.5">
                    <span className="flex items-center gap-1.5"><UsersIcon /> Pacientes</span>
                  </th>
                  <th className="text-left text-xs font-black uppercase tracking-wider text-text-muted px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color">
                {filtered.map(c => {
                  const isActive = selectedCompany === c.name;
                  return (
                    <tr
                      key={c.id}
                      className={`group transition-colors ${isActive ? 'bg-primary/4' : 'hover:bg-bg'}`}
                    >
                      {/* Nombre */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0
                            ${c.type === 'feria'
                              ? 'bg-accent/15 text-accent-dark'
                              : 'bg-primary/10 text-primary'}`}>
                            {c.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-text-main">{c.name}</p>
                          </div>
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider
                          ${c.type === 'feria'
                            ? 'bg-accent/15 text-accent-dark'
                            : 'bg-primary/10 text-primary'}`}>
                          {c.type === 'feria' ? 'Feria / Evento' : 'Empresa fija'}
                        </span>
                      </td>

                      {/* Fecha */}
                      <td className="px-5 py-4 text-sm text-text-muted">
                        {formatDate(c.created_at)}
                      </td>

                      {/* Pacientes */}
                      <td className="px-5 py-4">
                        {loadingCounts ? (
                          <span className="text-text-muted text-sm">—</span>
                        ) : (
                          <span className={`text-sm font-bold ${c.patient_count > 0 ? 'text-text-main' : 'text-text-muted'}`}>
                            {c.patient_count}
                          </span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="px-5 py-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-primary/10 text-primary">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            Activa
                          </span>
                        ) : (
                          <button
                            onClick={() => setSelectedCompany(c.name)}
                            className="text-[11px] font-semibold text-text-muted hover:text-primary transition-colors px-2.5 py-1 rounded-lg hover:bg-primary/8"
                          >
                            Activar
                          </button>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setConfirmDelete(c)}
                          className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-all"
                          title="Eliminar empresa"
                        >
                          <TrashIcon />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {confirmDelete && (
        <DeleteModal
          company={confirmDelete}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
          loading={deleting}
        />
      )}
      {showAdd && (
        <AddModal
          onConfirm={handleAdd}
          onCancel={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
