export interface FiscalDriverLabelSet {
  retirement: string;
  socialBenefits: string;
  health: string;
  incomeTax: string;
  complementaryTax: string;
}

export interface FiscalDriver {
  countryCode: string;
  labels: FiscalDriverLabelSet;
  usesProgressiveIncomeTax: boolean;
  complementaryTaxIsEmployerCharge: boolean;
}

const DEFAULT_DRIVER: FiscalDriver = {
  countryCode: 'SN',
  labels: {
    retirement: 'IPRES',
    socialBenefits: 'CSS',
    health: 'IPM et Sante',
    incomeTax: 'Impot sur le Revenu (IR)',
    complementaryTax: 'CFCE',
  },
  usesProgressiveIncomeTax: true,
  complementaryTaxIsEmployerCharge: false,
};

const DRIVERS: Record<string, FiscalDriver> = {
  SN: {
    countryCode: 'SN',
    labels: {
      retirement: 'IPRES',
      socialBenefits: 'CSS',
      health: 'IPM et Sante',
      incomeTax: 'Impot sur le Revenu (IR)',
      complementaryTax: 'CFCE',
    },
    usesProgressiveIncomeTax: true,
    complementaryTaxIsEmployerCharge: false,
  },
  CI: {
    countryCode: 'CI',
    labels: {
      retirement: 'CNPS',
      socialBenefits: 'CNPS',
      health: 'ISH',
      incomeTax: 'Impot sur le Traitement et Salaires (ITS)',
      complementaryTax: 'CN',
    },
    usesProgressiveIncomeTax: false,
    complementaryTaxIsEmployerCharge: false,
  },
  GN: {
    countryCode: 'GN',
    labels: {
      retirement: 'INPS',
      socialBenefits: 'INPS',
      health: 'IPM et Sante',
      incomeTax: 'Retenue a la Source (RTS)',
      complementaryTax: 'TFP',
    },
    usesProgressiveIncomeTax: true,
    complementaryTaxIsEmployerCharge: true,
  },
};

export function getFiscalDriver(countryCode: string): FiscalDriver {
  return DRIVERS[countryCode] || DEFAULT_DRIVER;
}
