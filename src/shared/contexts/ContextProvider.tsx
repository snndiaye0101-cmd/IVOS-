import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Country = {
  code: string; // ex: SEN
  name: string; // ex: Sénégal
  flag: string; // emoji ou url
  sites: Site[];
};

export type Site = {
  code: string; // ex: DKR
  name: string; // ex: Dakar
};

export type ContextState = {
  country: Country | null;
  site: Site | null;
  year: number;
  setCountry: (country: Country) => void;
  setSite: (site: Site) => void;
  setYear: (year: number) => void;
};

const Context = createContext<ContextState | undefined>(undefined);

export const ContextProvider = ({ children }: { children: ReactNode }) => {
  // Valeurs par défaut (à remplacer par fetch API plus tard)
  const [country, setCountry] = useState<Country | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  return (
    <Context.Provider value={{ country, site, year, setCountry, setSite, setYear }}>
      {children}
    </Context.Provider>
  );
};

export const useContextSelector = () => {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useContextSelector must be used within ContextProvider');
  return ctx;
};
