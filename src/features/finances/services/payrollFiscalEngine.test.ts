import { computeFiscalRecap } from './fiscalReportingService';
import { computePayroll, type PayrollCountryRule } from './payrollPdfService';

const senegalRule: PayrollCountryRule = {
  code: 'SN',
  label: 'Sénégal',
  currency: 'FCFA',
  workedUnitLabel: 'Heures',
  defaultWorkedUnits: 173.33,
  employer: {
    companyName: 'IVOS Sénégal',
    address: 'Dakar',
    ninea: 'SN-NINEA',
    ipres: 'IPRES-001',
    css: 'CSS-001',
  },
  rates: {
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
    ir: 0.1,
    cfce: 0.03,
    tfpEmployer: 0,
  },
  taxBrackets: [
    { upTo: 630000, rate: 0 },
    { upTo: 1500000, rate: 0.2 },
    { upTo: 4000000, rate: 0.3 },
    { upTo: 8000000, rate: 0.35 },
    { upTo: Number.POSITIVE_INFINITY, rate: 0.4 },
  ],
};

const coteIvoireRule: PayrollCountryRule = {
  code: 'CI',
  label: "Côte d'Ivoire",
  currency: 'FCFA',
  workedUnitLabel: 'Jours',
  defaultWorkedUnits: 26,
  employer: {
    companyName: "IVOS Côte d'Ivoire",
    address: 'Abidjan',
    ninea: 'CI-RCCM',
    ipres: 'CNPS-001',
    css: 'CNPS-AT-001',
  },
  rates: {
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
    ir: 0.08,
    cfce: 0.02,
    tfpEmployer: 0,
  },
  taxBrackets: [
    { upTo: 1000000, rate: 0 },
    { upTo: 3000000, rate: 0.1 },
    { upTo: 5000000, rate: 0.15 },
    { upTo: Number.POSITIVE_INFINITY, rate: 0.2 },
  ],
};

const guineaRule: PayrollCountryRule = {
  code: 'GN',
  label: 'Guinée',
  currency: 'GNF',
  workedUnitLabel: 'Heures',
  defaultWorkedUnits: 173.33,
  employer: {
    companyName: 'IVOS Guinée',
    address: 'Conakry',
    ninea: 'GN-RCCM',
    ipres: 'INPS-001',
    css: 'INPS-AT-001',
  },
  rates: {
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
    ir: 0,
    cfce: 0,
    tfpEmployer: 0.03,
  },
  taxBrackets: [
    { upTo: 5000000, rate: 0 },
    { upTo: 10000000, rate: 0.05 },
    { upTo: 20000000, rate: 0.1 },
    { upTo: Number.POSITIVE_INFINITY, rate: 0.15 },
  ],
};

describe('computePayroll Senegal fiscal engine', () => {
  it('applies capped IPRES bases and employer shares for cadres', () => {
    const computation = computePayroll({
      baseSalary: 400000,
      surSalary: 0,
      primeTransport: 0,
      primePanier: 0,
      primeAnciennete: 0,
      manualRetenues: 0,
      loanDeduction: 0,
      cadre: true,
      irParts: 1,
      autoFiscal: true,
    }, senegalRule);

    expect(computation.ipresGeneral).toBe(16800);
    expect(computation.ipresCadre).toBe(7200);
    expect(computation.ipresGeneralEmployer).toBe(25200);
    expect(computation.ipresCadreEmployer).toBe(10800);
    expect(computation.cssPrestationsFamiliales).toBe(28000);
    expect(computation.cssAccidentTravail).toBe(4000);
    expect(computation.totalPatronal).toBe(68000);
    expect(computation.lines.find((line) => line.rubrique === 'IPRES - Régime Général')?.base).toBe(300000);
    expect(computation.lines.find((line) => line.rubrique === 'IPRES - Régime Cadre')?.base).toBe(300000);
  });

  it('zeros automatic fiscal charges in manual mode', () => {
    const computation = computePayroll({
      baseSalary: 250000,
      surSalary: 10000,
      primeTransport: 15000,
      primePanier: 5000,
      primeAnciennete: 0,
      manualRetenues: 12000,
      loanDeduction: 3000,
      cadre: false,
      irParts: 2,
      autoFiscal: false,
    }, senegalRule);

    expect(computation.ipresGeneral).toBe(0);
    expect(computation.ipresCadre).toBe(0);
    expect(computation.ipresGeneralEmployer).toBe(0);
    expect(computation.ipresCadreEmployer).toBe(0);
    expect(computation.cssPrestationsFamiliales).toBe(0);
    expect(computation.cssAccidentTravail).toBe(0);
    expect(computation.ir).toBe(0);
    expect(computation.cfce).toBe(0);
    expect(computation.totalCotisations).toBe(15000);
    expect(computation.totalPatronal).toBe(0);
  });

  it('applies historical rates by calculation date', () => {
    const temporalRule: PayrollCountryRule = {
      ...coteIvoireRule,
      rates: {
        ...coteIvoireRule.rates,
        ipresGeneral: 0,
        ipresGeneralEmployer: 0,
        ipresCadre: 0,
        ipresCadreEmployer: 0,
        cssAccidentTravail: 0,
        cssPrestationsFamiliales: 0,
        ipm: 0,
        ir: 0,
        cfce: 0.01,
      },
      ratesHistory: [
        {
          startDate: '2026-06-01',
          value: {
            cfce: 0.03,
          },
        },
      ],
    };

    const aprilPayroll = computePayroll({
      baseSalary: 1000000,
      surSalary: 0,
      primeTransport: 0,
      primePanier: 0,
      primeAnciennete: 0,
      manualRetenues: 0,
      loanDeduction: 0,
      cadre: false,
      irParts: 1,
      autoFiscal: true,
      calculationDate: '2026-04-15',
    }, temporalRule);

    const junePayroll = computePayroll({
      baseSalary: 1000000,
      surSalary: 0,
      primeTransport: 0,
      primePanier: 0,
      primeAnciennete: 0,
      manualRetenues: 0,
      loanDeduction: 0,
      cadre: false,
      irParts: 1,
      autoFiscal: true,
      calculationDate: '2026-06-15',
    }, temporalRule);

    expect(aprilPayroll.cfce).toBe(10000);
    expect(junePayroll.cfce).toBe(30000);
  });

  it('keeps exact franc precision on large payroll volumes', () => {
    const precisionRule: PayrollCountryRule = {
      ...coteIvoireRule,
      rates: {
        ...coteIvoireRule.rates,
        ipresGeneral: 0,
        ipresGeneralEmployer: 0,
        ipresCadre: 0,
        ipresCadreEmployer: 0,
        cssAccidentTravail: 0,
        cssPrestationsFamiliales: 0,
        ipm: 0,
        ir: 0.11,
        cfce: 0,
      },
    };

    const oneSlip = computePayroll({
      baseSalary: 5000000,
      surSalary: 0,
      primeTransport: 0,
      primePanier: 0,
      primeAnciennete: 0,
      manualRetenues: 0,
      loanDeduction: 0,
      cadre: false,
      irParts: 1,
      autoFiscal: true,
      calculationDate: '2026-07-01',
    }, precisionRule);

    expect(oneSlip.ir).toBe(550000);

    const slips = Array.from({ length: 250 }, (_, index) => ({
      employeeId: `ci-${index + 1}`,
      baseSalary: 5000000,
      surSalary: 0,
      primeTransport: 0,
      primePanier: 0,
      primeAnciennete: 0,
      retenues: 0,
      loanDeduction: 0,
      automaticTaxEnabled: true,
      countryCode: 'CI',
      month: '2026-07',
    }));

    const recap = computeFiscalRecap({
      slips,
      agents: [] as never,
      rule: precisionRule,
      month: '2026-07',
      countryCode: 'CI',
    });

    expect(recap.rows.find((row) => row.label === 'ITS')?.salarial).toBe(137500000);
  });
});

describe('computeFiscalRecap', () => {
  it('aggregates salarial and patronal liabilities for one month', () => {
    const slips = [
      {
        employeeId: 'ag1',
        baseSalary: 400000,
        surSalary: 0,
        primeTransport: 0,
        primePanier: 0,
        primeAnciennete: 0,
        retenues: 0,
        loanDeduction: 0,
        automaticTaxEnabled: true,
        countryCode: 'SN',
        month: '2026-04',
      },
      {
        employeeId: 'ag2',
        baseSalary: 200000,
        surSalary: 10000,
        primeTransport: 10000,
        primePanier: 5000,
        primeAnciennete: 0,
        retenues: 0,
        loanDeduction: 0,
        automaticTaxEnabled: true,
        countryCode: 'SN',
        month: '2026-04',
      },
      {
        employeeId: 'ag3',
        baseSalary: 999999,
        surSalary: 0,
        primeTransport: 0,
        primePanier: 0,
        primeAnciennete: 0,
        retenues: 0,
        loanDeduction: 0,
        automaticTaxEnabled: true,
        countryCode: 'SN',
        month: '2026-05',
      },
    ];
    const agents = [
      { id: 'ag1', role: 'Administratif', fiscalStatus: 'Cadre', taxParts: 2, spouses: [], children: [] },
      { id: 'ag2', role: 'Chauffeurs', fiscalStatus: 'Non-Cadre', taxParts: 1, spouses: [], children: [] },
    ];

    const first = computePayroll({
      baseSalary: 400000,
      surSalary: 0,
      primeTransport: 0,
      primePanier: 0,
      primeAnciennete: 0,
      manualRetenues: 0,
      loanDeduction: 0,
      cadre: true,
      irParts: 2,
      autoFiscal: true,
    }, senegalRule);
    const second = computePayroll({
      baseSalary: 200000,
      surSalary: 10000,
      primeTransport: 10000,
      primePanier: 5000,
      primeAnciennete: 0,
      manualRetenues: 0,
      loanDeduction: 0,
      cadre: false,
      irParts: 1,
      autoFiscal: true,
    }, senegalRule);

    const recap = computeFiscalRecap({
      slips,
      agents: agents as never,
      rule: senegalRule,
      month: '2026-04',
      countryCode: 'SN',
    });

    expect(recap.slipCount).toBe(2);
    expect(recap.rows.find((row) => row.label === 'IPRES')?.salarial).toBe(first.ipresGeneral + first.ipresCadre + second.ipresGeneral + second.ipresCadre);
    expect(recap.rows.find((row) => row.label === 'IPRES')?.patronal).toBe(first.ipresGeneralEmployer + first.ipresCadreEmployer + second.ipresGeneralEmployer + second.ipresCadreEmployer);
    expect(recap.rows.find((row) => row.label === 'CSS')?.total).toBe(first.cssPrestationsFamiliales + first.cssAccidentTravail + second.cssPrestationsFamiliales + second.cssAccidentTravail);
    expect(recap.grandTotal).toBe(recap.salarialTotal + recap.patronalTotal);
  });

  it('uses Côte d’Ivoire organism labels and CI caps', () => {
    const ciPayroll = computePayroll({
      baseSalary: 4000000,
      surSalary: 250000,
      primeTransport: 50000,
      primePanier: 0,
      primeAnciennete: 0,
      manualRetenues: 0,
      loanDeduction: 0,
      cadre: true,
      irParts: 1,
      autoFiscal: true,
    }, coteIvoireRule);

    expect(ciPayroll.lines.find((line) => line.rubrique === 'CNPS - Régime Général')?.base).toBe(3375000);
    expect(ciPayroll.lines.find((line) => line.rubrique === 'CNPS - Régime Cadre')?.base).toBe(3375000);

    const recap = computeFiscalRecap({
      slips: [
        {
          employeeId: 'ci-1',
          baseSalary: 4000000,
          surSalary: 250000,
          primeTransport: 50000,
          primePanier: 0,
          primeAnciennete: 0,
          retenues: 0,
          loanDeduction: 0,
          automaticTaxEnabled: true,
          countryCode: 'CI',
          month: '2026-04',
        },
      ],
      agents: [{ id: 'ci-1', role: 'Administratif', fiscalStatus: 'Cadre', taxParts: 1, spouses: [], children: [] }] as never,
      rule: coteIvoireRule,
      month: '2026-04',
      countryCode: 'CI',
    });

    expect(recap.rows.map((row) => row.label)).toEqual([
      'CNPS Retraite',
      'CNPS Prestations Sociales',
      'ISH',
      'ITS',
      'CN',
    ]);
  });

  it('applies Guinea RTS/INPS/TFP with transport and housing exemptions', () => {
    const payroll = computePayroll({
      baseSalary: 8000000,
      surSalary: 0,
      primeTransport: 1000000,
      primePanier: 1500000,
      primeAnciennete: 0,
      manualRetenues: 0,
      loanDeduction: 0,
      cadre: false,
      irParts: 1,
      autoFiscal: true,
    }, guineaRule);

    expect(payroll.lines.find((line) => line.rubrique === 'INPS - Régime Général')?.base).toBe(10500000);
    expect(payroll.lines.find((line) => line.rubrique === 'Retenue a la Source (RTS)')).toBeTruthy();
    expect(payroll.lines.find((line) => line.rubrique === 'TFP')?.cotPatronales).toBeGreaterThan(0);
    expect(payroll.tfpEmployer).toBeGreaterThan(0);

    const recap = computeFiscalRecap({
      slips: [
        {
          employeeId: 'gn-1',
          baseSalary: 8000000,
          surSalary: 0,
          primeTransport: 1000000,
          primePanier: 1500000,
          primeAnciennete: 0,
          retenues: 0,
          loanDeduction: 0,
          automaticTaxEnabled: true,
          countryCode: 'GN',
          month: '2026-04',
        },
      ],
      agents: [{ id: 'gn-1', role: 'Administratif', fiscalStatus: 'Non-Cadre', taxParts: 1, spouses: [], children: [] }] as never,
      rule: guineaRule,
      month: '2026-04',
      countryCode: 'GN',
    });

    expect(recap.rows.map((row) => row.label)).toEqual([
      'INPS',
      'INPS Prestations',
      'IPM et Sante',
      'RTS',
      'TFP',
    ]);
    expect(recap.rows.find((row) => row.label === 'TFP')?.patronal).toBeGreaterThan(0);
    expect(recap.rows.find((row) => row.label === 'TFP')?.salarial).toBe(0);
  });
});