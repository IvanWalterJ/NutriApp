import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Company = 'Galeno' | 'Swiss Medical' | 'Ferias' | 'Consultorio Privado';

interface CompanyContextType {
  selectedCompany: Company;
  setSelectedCompany: (company: Company) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [selectedCompany, setSelectedCompany] = useState<Company>('Galeno');

  return (
    <CompanyContext.Provider value={{ selectedCompany, setSelectedCompany }}>
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
