import { BaseConfig, DEFAULT_BASE_CONFIG } from './baseConfigStore';

const SITE_SETTINGS_PREFIX = 'ivos_site_settings_v1_';

export interface SitePosition {
  siteAddress: string;
  lat: number | null;
  lng: number | null;
}

export interface SiteSettings {
  baseConfig: BaseConfig;
  sitePosition: SitePosition;
  annualBudget: number;
}

function defaultSiteSettings(): SiteSettings {
  return {
    baseConfig: DEFAULT_BASE_CONFIG,
    sitePosition: { siteAddress: '', lat: null, lng: null },
    annualBudget: 0,
  };
}

export function loadSiteSettings(siteId: string): SiteSettings {
  try {
    const raw = localStorage.getItem(SITE_SETTINGS_PREFIX + siteId);
    if (!raw) return defaultSiteSettings();
    return { ...defaultSiteSettings(), ...JSON.parse(raw) };
  } catch {
    return defaultSiteSettings();
  }
}

export function saveSiteSettings(siteId: string, settings: Partial<SiteSettings>) {
  try {
    const existing = loadSiteSettings(siteId);
    const merged = { ...existing, ...settings };
    localStorage.setItem(SITE_SETTINGS_PREFIX + siteId, JSON.stringify(merged));
  } catch {
    // noop
  }
}

export function getAnnualBudgetForSite(siteId: string): number {
  try {
    const s = loadSiteSettings(siteId);
    return Number(s.annualBudget) || 0;
  } catch {
    return 0;
  }
}

export function saveAnnualBudgetForSite(siteId: string, amount: number) {
  saveSiteSettings(siteId, { annualBudget: amount });
}

export function updateSiteShifts(siteId: string, shifts: BaseConfig['shifts']) {
  saveSiteSettings(siteId, { baseConfig: { ...loadSiteSettings(siteId).baseConfig, shifts } });
}

export function updateBaseConfigForSite(siteId: string, baseConfig: Partial<BaseConfig>) {
  const existing = loadSiteSettings(siteId);
  saveSiteSettings(siteId, { baseConfig: { ...existing.baseConfig, ...baseConfig } });
}

export function updateSitePosition(siteId: string, position: SitePosition) {
  saveSiteSettings(siteId, { sitePosition: position });
}
