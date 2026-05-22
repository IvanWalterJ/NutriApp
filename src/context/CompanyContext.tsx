import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export interface CompanyEntry {
  id: string;
  name: string;
  type: 'fija' | 'feria';
  created_at: string;
}

interface CompanyContextType {
  selectedCompany: string;
  setSelectedCompany: (company: string) => void;
  companies: CompanyEntry[];
  fixedCompanies: CompanyEntry[];
  feriaCompanies: CompanyEntry[];
  loadingCompanies: boolean;
  addCompany: (name: string, type: 'fija' | 'feria') => Promise<void>;
  removeCompany: (id: string) => Promise<void>;
  getCompanyType: (name: string) => 'fija' | 'feria' | undefined;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const STORAGE_KEY = 'nutriapp.selectedCompany';

function readStoredCompany(): string {
  if (typeof window === 'undefined') return 'Galeno';
  try {
    return window.localStorage.getItem(STORAGE_KEY) || 'Galeno';
  } catch {
    return 'Galeno';
  }
}

function writeStoredCompany(name: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, name);
  } catch {
    // Si localStorage falla (modo privado / cuota), simplemente no persistimos.
  }
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  // Lazy init: leemos del localStorage en el primer render para que el último
  // contexto del usuario sobreviva refreshes y nuevos logins en el mismo navegador.
  const [selectedCompany, setSelectedCompanyState] = useState<string>(() => readStoredCompany());
  const [companies, setCompanies] = useState<CompanyEntry[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  const setSelectedCompany = useCallback((name: string) => {
    setSelectedCompanyState(name);
    writeStoredCompany(name);
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, []);

  async function fetchCompanies() {
    setLoadingCompanies(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, type, created_at')
        .order('type', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      const list = (data ?? []) as CompanyEntry[];
      setCompanies(list);

      // Si la empresa persistida ya no existe en la base, caer a la primera
      // disponible (sin volver a "Galeno" hardcoded).
      if (list.length > 0 && !list.some(c => c.name === selectedCompany)) {
        setSelectedCompany(list[0].name);
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
    } finally {
      setLoadingCompanies(false);
    }
  }

  async function addCompany(name: string, type: 'fija' | 'feria') {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { data, error } = await supabase
      .from('companies')
      .insert({ name: trimmed, type })
      .select('id, name, type, created_at')
      .single();
    if (error) throw error;
    setCompanies(prev => [...prev, data as CompanyEntry]);
  }

  async function removeCompany(id: string) {
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id);
    if (error) throw error;
    setCompanies(prev => prev.filter(c => c.id !== id));
    // Si la empresa eliminada era la seleccionada, caer a la primera disponible.
    const removed = companies.find(c => c.id === id);
    if (removed && removed.name === selectedCompany) {
      const fallback = companies.find(c => c.id !== id)?.name;
      if (fallback) setSelectedCompany(fallback);
    }
  }

  function getCompanyType(name: string): 'fija' | 'feria' | undefined {
    return companies.find(c => c.name === name)?.type;
  }

  const fixedCompanies = companies.filter(c => c.type === 'fija');
  const feriaCompanies = companies.filter(c => c.type === 'feria');

  return (
    <CompanyContext.Provider value={{
      selectedCompany,
      setSelectedCompany,
      companies,
      fixedCompanies,
      feriaCompanies,
      loadingCompanies,
      addCompany,
      removeCompany,
      getCompanyType,
    }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
