// Référentiel local pour l'auto-remplissage des pays d'Afrique de l'Ouest
export interface CountryReference {
  name: string;
  iso2: string;
  iso3: string;
  flag: string;
  currencyCode: string;
  currencySymbol: string;
  phonePrefix: string;
}

export const countriesWestAfrica: CountryReference[] = [
  {
    name: 'Sénégal',
    iso2: 'SN',
    iso3: 'SEN',
    flag: '🇸🇳',
    currencyCode: 'XOF',
    currencySymbol: 'F CFA',
    phonePrefix: '+221',
  },
  {
    name: 'Côte d\'Ivoire',
    iso2: 'CI',
    iso3: 'CIV',
    flag: '🇨🇮',
    currencyCode: 'XOF',
    currencySymbol: 'F CFA',
    phonePrefix: '+225',
  },
  {
    name: 'Guinée',
    iso2: 'GN',
    iso3: 'GIN',
    flag: '🇬🇳',
    currencyCode: 'GNF',
    currencySymbol: 'GNF',
    phonePrefix: '+224',
  },
  {
    name: 'Mali',
    iso2: 'ML',
    iso3: 'MLI',
    flag: '🇲🇱',
    currencyCode: 'XOF',
    currencySymbol: 'F CFA',
    phonePrefix: '+223',
  },
  {
    name: 'Burkina Faso',
    iso2: 'BF',
    iso3: 'BFA',
    flag: '🇧🇫',
    currencyCode: 'XOF',
    currencySymbol: 'F CFA',
    phonePrefix: '+226',
  },
  {
    name: 'Togo',
    iso2: 'TG',
    iso3: 'TGO',
    flag: '🇹🇬',
    currencyCode: 'XOF',
    currencySymbol: 'F CFA',
    phonePrefix: '+228',
  },
  {
    name: 'Bénin',
    iso2: 'BJ',
    iso3: 'BEN',
    flag: '🇧🇯',
    currencyCode: 'XOF',
    currencySymbol: 'F CFA',
    phonePrefix: '+229',
  },
  {
    name: 'Niger',
    iso2: 'NE',
    iso3: 'NER',
    flag: '🇳🇪',
    currencyCode: 'XOF',
    currencySymbol: 'F CFA',
    phonePrefix: '+227',
  },
];
