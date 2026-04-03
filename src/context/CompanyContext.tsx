import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [selectedCompany, setSelectedCompany] = useState<string>('Galeno');
  const [companies, setCompanies] = useState<CompanyEntry[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

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
      setCompanies(data as CompanyEntry[]);
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
    // Si la empresa eliminada era la seleccionada, volver a la primera
    const removed = companies.find(c => c.id === id);
    if (removed && removed.name === selectedCompany) {
      setSelectedCompany(companies.find(c => c.id !== id)?.name ?? 'Galeno');
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
