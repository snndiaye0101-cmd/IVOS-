import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { countryStore } from '../services/countryStore';
import { DEFAULT_COUNTRY_ALPHA3, DEFAULT_COUNTRY_ALPHA2 } from '../constants';

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
  // Valeurs par défaut — forcer Sénégal si disponible
  countryStore.seedDefaults();
  const seededCountry = (() => {
    const cs = countryStore.getCountries();
    if (!cs || cs.length === 0) return null;
    const found = cs.find(c => c.codeIso === DEFAULT_COUNTRY_ALPHA3 || c.codeIso === DEFAULT_COUNTRY_ALPHA2 || /sénégal|senegal/i.test(c.name)) || cs[0];
    if (!found) return null;
    const sites = countryStore.getSitesByCountry(found.id).map(s => ({ code: s.code, name: s.name }));
    return { code: found.codeIso, name: found.name, flag: found.flagEmoji, sites } as Country;
  })();

  const [countryState, setCountryState] = useState<Country | null>(seededCountry);
  const [siteState, setSiteState] = useState<Site | null>(seededCountry && seededCountry.sites.length > 0 ? seededCountry.sites[0] : null);

  // Keep country fixed (no UI country selection in Senegal-only mode)
  const setCountry = (_country: Country) => {
    // no-op intentionally — country is fixed to Sénégal
    // eslint-disable-next-line no-console
    console.warn('Country selection is disabled in Sénégal-only mode');
  };
  const setSite = (s: Site | null) => setSiteState(s);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  return (
    <Context.Provider value={{ country: countryState, site: siteState, year, setCountry, setSite, setYear }}>
      {children}
    </Context.Provider>
  );
};

export const useContextSelector = () => {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useContextSelector must be used within ContextProvider');
  return ctx;
};
