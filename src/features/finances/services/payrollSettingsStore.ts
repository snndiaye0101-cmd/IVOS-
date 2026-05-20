const KEY = 'ivos_payroll_settings_v1';
const EVENT_NAME = 'payroll-settings:updated';

export interface PayrollBracket {
  upTo: number;
  rate: number;
}

export interface PayrollDatedValue<T> {
  startDate: string;
  endDate?: string;
  value: T;
}

export interface PayrollCountryRatePatch {
  ipresGeneral: number;
  ipresGeneralEmployer: number;
  ipresCadre: number;
  ipresCadreEmployer: number;
  cssAccidentTravail: number;
  cssPrestationsFamiliales: number;
  ipm: number;
  ipresGeneralCap: number;
  ipresCadreCap: number;
  transportExemptCap: number;
  housingExemptCap: number;
  cfce: number;
  tfpEmployer: number;
}

export interface PayrollCountryFiscalHistory {
  rateTimeline: PayrollDatedValue<Partial<PayrollCountryRatePatch>>[];
  bracketTimeline: PayrollDatedValue<PayrollBracket[]>[];
}

export interface PayrollCountrySettings {
  ipresGeneral: number;
  ipresGeneralEmployer: number;
  ipresCadre: number;
  ipresCadreEmployer: number;
  cssAccidentTravail: number;
  cssPrestationsFamiliales: number;
  ipm: number;
  ipresGeneralCap: number;
  ipresCadreCap: number;
  transportExemptCap: number;
  housingExemptCap: number;
  irBrackets: PayrollBracket[];
  cfce: number;
  tfpEmployer: number;
  overtime15: number;
  overtime40: number;
  overtime60: number;
  nightMajoration: number;
  fiscalHistory: PayrollCountryFiscalHistory;
}

export interface PayrollAutomationSettings {
  globalAutoFiscal: boolean;
  useTransportExemptCap: boolean;
  useFiscalParts: boolean;
}

export interface PayrollSettings {
  automation: PayrollAutomationSettings;
  countries: Record<string, PayrollCountrySettings>;
}

const defaultSettings: PayrollSettings = {
  automation: {
    globalAutoFiscal: true,
    useTransportExemptCap: true,
    useFiscalParts: true,
  },
  countries: {
    SN: {
      ipresGeneral: 0.056,
      ipresGeneralEmployer: 0.084,
      ipresCadre: 0.024,
      ipresCadreEmployer: 0.036,
      cssAccidentTravail: 0.01,
      cssPrestationsFamiliales: 0.07,
      ipm: 0.03,
      ipresGeneralCap: 300000,
      ipresCadreCap: 300000,
      transportExemptCap: 20800,
      housingExemptCap: 0,
      irBrackets: [
        { upTo: 630000, rate: 0 },
        { upTo: 1500000, rate: 0.2 },
        { upTo: 4000000, rate: 0.3 },
        { upTo: 8000000, rate: 0.35 },
        { upTo: Number.POSITIVE_INFINITY, rate: 0.4 },
      ],
      cfce: 0.03,
      tfpEmployer: 0,
      overtime15: 0.15,
      overtime40: 0.4,
      overtime60: 0.6,
      nightMajoration: 0.35,
      fiscalHistory: {
        rateTimeline: [],
        bracketTimeline: [],
      },
    },
    CI: {
      ipresGeneral: 0.063,
      ipresGeneralEmployer: 0.077,
      ipresCadre: 0.03,
      ipresCadreEmployer: 0.036,
      cssAccidentTravail: 0.012,
      cssPrestationsFamiliales: 0.0575,
      ipm: 0.025,
      ipresGeneralCap: 3375000,
      ipresCadreCap: 3375000,
      transportExemptCap: 30000,
      housingExemptCap: 0,
      irBrackets: [
        { upTo: 1000000, rate: 0 },
        { upTo: 3000000, rate: 0.1 },
        { upTo: 5000000, rate: 0.15 },
        { upTo: Number.POSITIVE_INFINITY, rate: 0.2 },
      ],
      cfce: 0.02,
      tfpEmployer: 0,
      overtime15: 0.15,
      overtime40: 0.4,
      overtime60: 0.6,
      nightMajoration: 0.35,
      fiscalHistory: {
        rateTimeline: [],
        bracketTimeline: [],
      },
    },
    GN: {
      ipresGeneral: 0.05,
      ipresGeneralEmployer: 0.18,
      ipresCadre: 0,
      ipresCadreEmployer: 0,
      cssAccidentTravail: 0,
      cssPrestationsFamiliales: 0,
      ipm: 0,
      ipresGeneralCap: 15000000,
      ipresCadreCap: 15000000,
      transportExemptCap: 600000,
      housingExemptCap: 1200000,
      irBrackets: [
        { upTo: 5000000, rate: 0 },
        { upTo: 10000000, rate: 0.05 },
        { upTo: 20000000, rate: 0.1 },
        { upTo: 40000000, rate: 0.15 },
        { upTo: Number.POSITIVE_INFINITY, rate: 0.2 },
      ],
      cfce: 0,
      tfpEmployer: 0.03,
      overtime15: 0.15,
      overtime40: 0.4,
      overtime60: 0.6,
      nightMajoration: 0.35,
      fiscalHistory: {
        rateTimeline: [],
        bracketTimeline: [],
      },
    },
  },
};

function normalizeDateString(value: string | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

const RATE_TIMELINE_KEYS: Array<keyof PayrollCountryRatePatch> = [
  'ipresGeneral',
  'ipresGeneralEmployer',
  'ipresCadre',
  'ipresCadreEmployer',
  'cssAccidentTravail',
  'cssPrestationsFamiliales',
  'ipm',
  'ipresGeneralCap',
  'ipresCadreCap',
  'transportExemptCap',
  'housingExemptCap',
  'cfce',
  'tfpEmployer',
];

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function dayBefore(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  parsed.setDate(parsed.getDate() - 1);
  return parsed.toISOString().slice(0, 10);
}

function appendTimelineEntry<T>(
  current: PayrollDatedValue<T>[],
  entry: PayrollDatedValue<T>
): PayrollDatedValue<T>[] {
  const next = current
    .map((item) => ({ ...item }))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const previousActiveIndex = next
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !item.endDate || item.endDate >= entry.startDate)
    .filter(({ item }) => item.startDate <= entry.startDate)
    .map(({ index }) => index)
    .pop();

  if (previousActiveIndex != null) {
    const previous = next[previousActiveIndex];
    next[previousActiveIndex] = {
      ...previous,
      endDate: dayBefore(entry.startDate),
    };
  }

  next.push(entry);
  return next.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

function normalizeRateTimeline(
  timeline: PayrollDatedValue<Partial<PayrollCountryRatePatch>>[] | undefined
): PayrollDatedValue<Partial<PayrollCountryRatePatch>>[] {
  if (!Array.isArray(timeline)) return [];
  return timeline
    .map((entry) => ({
      startDate: normalizeDateString(entry?.startDate),
      endDate: normalizeDateString(entry?.endDate),
      value: { ...(entry?.value || {}) },
    }))
    .filter((entry) => entry.startDate)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

function normalizeBracketTimeline(
  timeline: PayrollDatedValue<PayrollBracket[]>[] | undefined
): PayrollDatedValue<PayrollBracket[]>[] {
  if (!Array.isArray(timeline)) return [];
  return timeline
    .map((entry) => ({
      startDate: normalizeDateString(entry?.startDate),
      endDate: normalizeDateString(entry?.endDate),
      value: normalizeBrackets(entry?.value, []),
    }))
    .filter((entry) => entry.startDate && entry.value.length > 0)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

function normalizeFiscalHistory(
  history: PayrollCountryFiscalHistory | undefined,
  fallback: PayrollCountryFiscalHistory
): PayrollCountryFiscalHistory {
  return {
    rateTimeline: normalizeRateTimeline(history?.rateTimeline || fallback.rateTimeline),
    bracketTimeline: normalizeBracketTimeline(history?.bracketTimeline || fallback.bracketTimeline),
  };
}

function emit() {
  window.dispatchEvent(new Event(EVENT_NAME));
}

function normalizeBrackets(
  brackets: PayrollBracket[] | undefined,
  fallback: PayrollBracket[]
): PayrollBracket[] {
  if (!Array.isArray(brackets) || brackets.length === 0) return fallback;
  return brackets
    .map((bracket) => ({
      upTo: Number.isFinite(bracket.upTo) ? bracket.upTo : Number.POSITIVE_INFINITY,
      rate: Math.max(0, Number(bracket.rate || 0)),
    }))
    .sort((a, b) => a.upTo - b.upTo);
}

function normalizeCountrySettings(
  country: Partial<PayrollCountrySettings> | undefined,
  fallback: PayrollCountrySettings
): PayrollCountrySettings {
  return {
    ipresGeneral: Math.max(0, Number(country?.ipresGeneral ?? fallback.ipresGeneral)),
    ipresGeneralEmployer: Math.max(
      0,
      Number(country?.ipresGeneralEmployer ?? fallback.ipresGeneralEmployer)
    ),
    ipresCadre: Math.max(0, Number(country?.ipresCadre ?? fallback.ipresCadre)),
    ipresCadreEmployer: Math.max(
      0,
      Number(country?.ipresCadreEmployer ?? fallback.ipresCadreEmployer)
    ),
    cssAccidentTravail: Math.max(
      0,
      Number(country?.cssAccidentTravail ?? fallback.cssAccidentTravail)
    ),
    cssPrestationsFamiliales: Math.max(
      0,
      Number(country?.cssPrestationsFamiliales ?? fallback.cssPrestationsFamiliales)
    ),
    ipm: Math.max(0, Number(country?.ipm ?? fallback.ipm)),
    ipresGeneralCap: Math.max(0, Number(country?.ipresGeneralCap ?? fallback.ipresGeneralCap)),
    ipresCadreCap: Math.max(0, Number(country?.ipresCadreCap ?? fallback.ipresCadreCap)),
    transportExemptCap: Math.max(
      0,
      Number(country?.transportExemptCap ?? fallback.transportExemptCap)
    ),
    housingExemptCap: Math.max(0, Number(country?.housingExemptCap ?? fallback.housingExemptCap)),
    irBrackets: normalizeBrackets(country?.irBrackets, fallback.irBrackets),
    cfce: Math.max(0, Number(country?.cfce ?? fallback.cfce)),
    tfpEmployer: Math.max(0, Number(country?.tfpEmployer ?? fallback.tfpEmployer)),
    overtime15: Math.max(0, Number(country?.overtime15 ?? fallback.overtime15)),
    overtime40: Math.max(0, Number(country?.overtime40 ?? fallback.overtime40)),
    overtime60: Math.max(0, Number(country?.overtime60 ?? fallback.overtime60)),
    nightMajoration: Math.max(0, Number(country?.nightMajoration ?? fallback.nightMajoration)),
    fiscalHistory: normalizeFiscalHistory(country?.fiscalHistory, fallback.fiscalHistory),
  };
}

function normalizeSettings(value: Partial<PayrollSettings> | undefined): PayrollSettings {
  const countries = value?.countries || {};
  return {
    automation: {
      globalAutoFiscal:
        value?.automation?.globalAutoFiscal ?? defaultSettings.automation.globalAutoFiscal,
      useTransportExemptCap:
        value?.automation?.useTransportExemptCap ??
        defaultSettings.automation.useTransportExemptCap,
      useFiscalParts:
        value?.automation?.useFiscalParts ?? defaultSettings.automation.useFiscalParts,
    },
    countries: {
      SN: normalizeCountrySettings(countries.SN, defaultSettings.countries.SN),
      CI: normalizeCountrySettings(countries.CI, defaultSettings.countries.CI),
      GN: normalizeCountrySettings(countries.GN, defaultSettings.countries.GN),
    },
  };
}

function load(): PayrollSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSettings;
    return normalizeSettings(JSON.parse(raw) as Partial<PayrollSettings>);
  } catch {
    return defaultSettings;
  }
}

function save(settings: PayrollSettings) {
  localStorage.setItem(KEY, JSON.stringify(settings));
  emit();
}

export const payrollSettingsStore = {
  eventName: EVENT_NAME,
  defaults: defaultSettings,
  load,
  save,
  reset() {
    save(defaultSettings);
  },
  updateAutomation(patch: Partial<PayrollAutomationSettings>) {
    const current = load();
    save({
      ...current,
      automation: {
        ...current.automation,
        ...patch,
      },
    });
  },
  updateCountry(
    code: string,
    patch: Partial<PayrollCountrySettings>,
    options?: { effectiveDate?: string; persistHistory?: boolean }
  ) {
    const current = load();
    const fallback = current.countries[code] || defaultSettings.countries.SN;
    const nextCountry = normalizeCountrySettings({ ...fallback, ...patch }, fallback);
    const persistHistory = options?.persistHistory ?? true;
    const effectiveDate = normalizeDateString(options?.effectiveDate) || todayDateString();

    if (persistHistory) {
      const ratePatch = RATE_TIMELINE_KEYS.reduce((accumulator, key) => {
        const maybeValue = patch[key];
        if (maybeValue == null) return accumulator;
        return {
          ...accumulator,
          [key]: Number(maybeValue),
        };
      }, {} as Partial<PayrollCountryRatePatch>);

      if (Object.keys(ratePatch).length > 0) {
        nextCountry.fiscalHistory.rateTimeline = appendTimelineEntry(
          nextCountry.fiscalHistory.rateTimeline,
          {
            startDate: effectiveDate,
            value: ratePatch,
          }
        );
      }

      if (Array.isArray(patch.irBrackets) && patch.irBrackets.length > 0) {
        nextCountry.fiscalHistory.bracketTimeline = appendTimelineEntry(
          nextCountry.fiscalHistory.bracketTimeline,
          {
            startDate: effectiveDate,
            value: normalizeBrackets(patch.irBrackets, fallback.irBrackets),
          }
        );
      }
    }

    save({
      ...current,
      countries: {
        ...current.countries,
        [code]: nextCountry,
      },
    });
  },
  updateCountryWithEffectiveDate(
    code: string,
    patch: Partial<PayrollCountrySettings>,
    effectiveDate: string
  ) {
    this.updateCountry(code, patch, { effectiveDate, persistHistory: true });
  },
};
