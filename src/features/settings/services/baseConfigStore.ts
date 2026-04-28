const BASE_CONFIG_KEY = 'ivos_base_config_v1';

export interface Shift {
  id: number;
  name: string;
  start: string;
  end: string;
}

export interface BaseConfig {
  baseName: string;
  address: string;
  phone: string;
  email: string;
  shifts: Shift[];
}

export const DEFAULT_BASE_CONFIG: BaseConfig = {
  baseName: 'IVOS KIGNABOUR',
  address: 'Kignabour, Sénégal',
  phone: '+221 33 000 00 00',
  email: 'contact@ivos-kignabour.sn',
  shifts: [
    { id: 1, name: 'Matin', start: '06:00', end: '14:00' },
    { id: 2, name: 'Après-midi', start: '14:00', end: '22:00' },
    { id: 3, name: 'Nuit', start: '22:00', end: '06:00' },
  ],
};

export function loadBaseConfig(): BaseConfig {
  try {
    const raw = localStorage.getItem(BASE_CONFIG_KEY);
    if (!raw) return DEFAULT_BASE_CONFIG;
    return { ...DEFAULT_BASE_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_BASE_CONFIG;
  }
}

export function saveBaseConfig(config: BaseConfig) {
  localStorage.setItem(BASE_CONFIG_KEY, JSON.stringify(config));
}
