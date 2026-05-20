// ============================================
// Country & Site Store (localStorage-backed)
// Manages countries, sites, exchange rates
// ============================================

export interface ICountry {
  id: string;
  name: string;
  codeIso: string; // ISO 3166-1 alpha-3
  currencyCode: string; // ISO 4217 (XOF, GNF, EUR)
  currencySymbol: string; // Display (F CFA, FG, €)
  flagEmoji: string;
  isActive: boolean;
  createdAt: string;
}

export interface ISite {
  id: string;
  name: string;
  code: string; // Short code (DKR, CKY, ABJ)
  countryId: string;
  address: string;
  isActive: boolean;
  createdAt: string;
}

export interface IExchangeRate {
  id: string;
  sourceCurrency: string;
  targetCurrency: string; // Reference currency (default XOF)
  rate: number;
  effectiveDate: string;
  createdAt: string;
}

const COUNTRIES_KEY = 'ivos_countries';
const SITES_KEY = 'ivos_sites';
const RATES_KEY = 'ivos_exchange_rates';
const REFERENCE_CURRENCY_KEY = 'ivos_reference_currency';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const countryStore = {
  // ─── Countries ──────────────────────────────────
  getCountries(): ICountry[] {
    try {
      const raw = localStorage.getItem(COUNTRIES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveCountries(countries: ICountry[]) {
    localStorage.setItem(COUNTRIES_KEY, JSON.stringify(countries));
  },

  addCountry(data: Omit<ICountry, 'id' | 'createdAt'>): ICountry {
    const countries = this.getCountries();
    const country: ICountry = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    countries.push(country);
    this.saveCountries(countries);
    return country;
  },

  updateCountry(id: string, data: Partial<ICountry>): boolean {
    const countries = this.getCountries();
    const idx = countries.findIndex((c) => c.id === id);
    if (idx < 0) return false;
    countries[idx] = { ...countries[idx], ...data };
    this.saveCountries(countries);
    return true;
  },

  deleteCountry(id: string): boolean {
    // Prevent deletion if sites reference this country
    const sites = this.getSites().filter((s) => s.countryId === id);
    if (sites.length > 0) return false;
    const countries = this.getCountries().filter((c) => c.id !== id);
    this.saveCountries(countries);
    return true;
  },

  getCountryById(id: string): ICountry | undefined {
    return this.getCountries().find((c) => c.id === id);
  },

  // ─── Sites ──────────────────────────────────────
  getSites(): ISite[] {
    try {
      const raw = localStorage.getItem(SITES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveSites(sites: ISite[]) {
    localStorage.setItem(SITES_KEY, JSON.stringify(sites));
  },

  addSite(data: Omit<ISite, 'id' | 'createdAt'>): ISite {
    const sites = this.getSites();
    const site: ISite = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    sites.push(site);
    this.saveSites(sites);
    return site;
  },

  updateSite(id: string, data: Partial<ISite>): boolean {
    const sites = this.getSites();
    const idx = sites.findIndex((s) => s.id === id);
    if (idx < 0) return false;
    sites[idx] = { ...sites[idx], ...data };
    this.saveSites(sites);
    return true;
  },

  deleteSite(id: string): boolean {
    const sites = this.getSites().filter((s) => s.id !== id);
    this.saveSites(sites);
    return true;
  },

  getSiteById(id: string): ISite | undefined {
    return this.getSites().find((s) => s.id === id);
  },

  getSitesByCountry(countryId: string): ISite[] {
    return this.getSites().filter((s) => s.countryId === countryId);
  },

  // ─── Exchange Rates ─────────────────────────────
  getExchangeRates(): IExchangeRate[] {
    try {
      const raw = localStorage.getItem(RATES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveExchangeRates(rates: IExchangeRate[]) {
    localStorage.setItem(RATES_KEY, JSON.stringify(rates));
  },

  setExchangeRate(sourceCurrency: string, targetCurrency: string, rate: number): IExchangeRate {
    const rates = this.getExchangeRates();
    const today = new Date().toISOString().split('T')[0];
    // Upsert: update existing or add new
    const existing = rates.find(
      (r) =>
        r.sourceCurrency === sourceCurrency &&
        r.targetCurrency === targetCurrency &&
        r.effectiveDate === today
    );
    if (existing) {
      existing.rate = rate;
      this.saveExchangeRates(rates);
      return existing;
    }
    const newRate: IExchangeRate = {
      id: generateId(),
      sourceCurrency,
      targetCurrency,
      rate,
      effectiveDate: today,
      createdAt: new Date().toISOString(),
    };
    rates.push(newRate);
    this.saveExchangeRates(rates);
    return newRate;
  },

  getLatestRate(sourceCurrency: string, targetCurrency: string): number | null {
    const rates = this.getExchangeRates()
      .filter((r) => r.sourceCurrency === sourceCurrency && r.targetCurrency === targetCurrency)
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
    return rates.length > 0 ? rates[0].rate : null;
  },

  convertAmount(amount: number, fromCurrency: string, toCurrency: string): number | null {
    if (fromCurrency === toCurrency) return amount;
    const rate = this.getLatestRate(fromCurrency, toCurrency);
    if (rate === null) return null;
    return amount * rate;
  },

  // ─── Reference Currency ─────────────────────────
  getReferenceCurrency(): string {
    return localStorage.getItem(REFERENCE_CURRENCY_KEY) || 'XOF';
  },

  setReferenceCurrency(code: string) {
    localStorage.setItem(REFERENCE_CURRENCY_KEY, code);
  },

  // ─── Currency info helpers ──────────────────────
  getCurrencyForSite(siteId: string): { code: string; symbol: string } {
    const site = this.getSiteById(siteId);
    if (!site) return { code: 'XOF', symbol: 'F CFA' };
    const country = this.getCountryById(site.countryId);
    if (!country) return { code: 'XOF', symbol: 'F CFA' };
    return { code: country.currencyCode, symbol: country.currencySymbol };
  },

  getCurrencyForCountry(countryId: string): { code: string; symbol: string } {
    const country = this.getCountryById(countryId);
    if (!country) return { code: 'XOF', symbol: 'F CFA' };
    return { code: country.currencyCode, symbol: country.currencySymbol };
  },

  // ─── Seeding ────────────────────────────────────
  seedDefaults() {
    if (this.getCountries().length > 0) return;
    const senegal = this.addCountry({
      name: 'Sénégal',
      codeIso: 'SEN',
      currencyCode: 'XOF',
      currencySymbol: 'F CFA',
      flagEmoji: '🇸🇳',
      isActive: true,
    });
    this.addSite({
      name: 'Dakar (Siège)',
      code: 'DKR',
      countryId: senegal.id,
      address: 'Zone Industrielle, Dakar',
      isActive: true,
    });
  },
};
