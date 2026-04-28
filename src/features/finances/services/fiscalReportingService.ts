import { computeFiscalParts, type PersonnelAgent } from '../../fleet/services/personnelStore';
import { computePayroll, type PayrollCountryRule } from './payrollPdfService';
import { getFiscalDriver } from './fiscalDrivers';

export interface FiscalReportingSlip {
  employeeId: string;
  baseSalary: number;
  surSalary: number;
  primeTransport: number;
  primePanier: number;
  primeAnciennete: number;
  retenues: number;
  loanDeduction: number;
  automaticTaxEnabled?: boolean;
  countryCode: string;
  month: string;
}

export interface FiscalRecapRow {
  label: string;
  salarial: number;
  patronal: number;
  total: number;
}

export interface FiscalRecapDetailRow {
  label: string;
  baseSalarial: number;
  tauxSalarial: number | null;
  salarial: number;
  basePatronal: number;
  tauxPatronal: number | null;
  patronal: number;
}

export interface FiscalRecap {
  month: string;
  countryCode: string;
  slipCount: number;
  salarialTotal: number;
  patronalTotal: number;
  grandTotal: number;
  rows: FiscalRecapRow[];
  detailRows: FiscalRecapDetailRow[];
}

type FiscalOrganismKey = 'retirement' | 'socialBenefits' | 'health' | 'incomeTax' | 'cfce';

function getOrganismLabels(countryCode: string): Record<FiscalOrganismKey, string> {
  const driver = getFiscalDriver(countryCode);

  if (countryCode === 'GN') {
    return {
      retirement: driver.labels.retirement,
      socialBenefits: `${driver.labels.socialBenefits} Prestations`,
      health: driver.labels.health,
      incomeTax: 'RTS',
      cfce: 'TFP',
    };
  }

  if (countryCode === 'CI') {
    return {
      retirement: `${driver.labels.retirement} Retraite`,
      socialBenefits: `${driver.labels.socialBenefits} Prestations Sociales`,
      health: driver.labels.health,
      incomeTax: 'ITS',
      cfce: 'CN',
    };
  }

  return {
    retirement: 'IPRES',
    socialBenefits: 'CSS',
    health: 'IPM et Santé',
    incomeTax: 'IR',
    cfce: 'CFCE ou VRS',
  };
}

function isCadre(agent: PersonnelAgent | undefined) {
  if (!agent) return false;
  if (agent.fiscalStatus) return agent.fiscalStatus === 'Cadre';
  const lowerRole = agent.role.toLowerCase();
  return lowerRole.includes('responsable') || lowerRole.includes('administratif') || lowerRole.includes('directeur') || lowerRole.includes('comptable');
}

function resolveParts(agent: PersonnelAgent | undefined) {
  if (!agent) return 1;
  const custom = Number(agent.taxParts);
  if (Number.isFinite(custom) && custom > 0) return custom;
  return computeFiscalParts({ spouses: agent.spouses, children: agent.children });
}

export function computeFiscalRecap(params: {
  slips: FiscalReportingSlip[];
  agents: PersonnelAgent[];
  rule: PayrollCountryRule;
  month: string;
  countryCode: string;
  automation?: {
    useTransportExemptCap?: boolean;
    useFiscalParts?: boolean;
  };
}): FiscalRecap {
  const scopedSlips = params.slips.filter((slip) => slip.month === params.month && slip.countryCode === params.countryCode);
  const labels = getOrganismLabels(params.countryCode);
  const detailMap = new Map<string, FiscalRecapDetailRow>();

  const totals = scopedSlips.reduce((acc, slip) => {
    const agent = params.agents.find((item) => item.id === slip.employeeId);
    const computation = computePayroll({
      baseSalary: slip.baseSalary,
      surSalary: slip.surSalary,
      primeTransport: slip.primeTransport,
      primePanier: slip.primePanier,
      primeAnciennete: slip.primeAnciennete,
      manualRetenues: Math.max(0, slip.retenues - slip.loanDeduction),
      loanDeduction: slip.loanDeduction,
      cadre: isCadre(agent),
      irParts: params.automation?.useFiscalParts === false ? 1 : resolveParts(agent),
      autoFiscal: slip.automaticTaxEnabled ?? true,
      useTransportExemptCap: params.automation?.useTransportExemptCap ?? true,
      calculationDate: `${slip.month}-01`,
    }, params.rule);

    const detailLabels: Record<string, string> = {
      'IPRES - Régime Général': `${labels.retirement} Général`,
      'IPRES - Régime Cadre': `${labels.retirement} Cadre`,
      'CNPS - Régime Général': `${labels.retirement} Général`,
      'CNPS - Régime Cadre': `${labels.retirement} Cadre`,
      'INPS - Régime Général': `${labels.retirement} Général`,
      'INPS - Régime Cadre': `${labels.retirement} Cadre`,
      'IPM - Assurance Maladie': labels.health,
      'CSS - Prestations Familiales': `${labels.socialBenefits} Prestations`,
      'CSS - Accidents du Travail': `${labels.socialBenefits} Accidents`,
      'INPS - Prestations Familiales': `${labels.socialBenefits} Prestations`,
      'INPS - Accidents du Travail': `${labels.socialBenefits} Accidents`,
      'Impôt sur le Revenu (IR)': labels.incomeTax,
      'Impot sur le Revenu (IR)': labels.incomeTax,
      'Impot sur le Traitement et Salaires (ITS)': labels.incomeTax,
      'Retenue à la Source (RTS)': labels.incomeTax,
      'Retenue a la Source (RTS)': labels.incomeTax,
      CFCE: labels.cfce,
      CN: labels.cfce,
      TFP: labels.cfce,
    };

    for (const line of computation.lines) {
      const detailLabel = detailLabels[line.rubrique];
      if (!detailLabel) continue;

      const current = detailMap.get(detailLabel) || {
        label: detailLabel,
        baseSalarial: 0,
        tauxSalarial: line.tauxSalarial > 0 ? line.tauxSalarial : null,
        salarial: 0,
        basePatronal: 0,
        tauxPatronal: line.tauxPatronal > 0 ? line.tauxPatronal : null,
        patronal: 0,
      };

      detailMap.set(detailLabel, {
        label: detailLabel,
        baseSalarial: current.baseSalarial + (line.montantSalarial !== 0 ? line.base : 0),
        tauxSalarial: current.tauxSalarial ?? (line.tauxSalarial > 0 ? line.tauxSalarial : null),
        salarial: current.salarial + Math.abs(line.montantSalarial),
        basePatronal: current.basePatronal + (line.cotPatronales !== 0 ? line.base : 0),
        tauxPatronal: current.tauxPatronal ?? (line.tauxPatronal > 0 ? line.tauxPatronal : null),
        patronal: current.patronal + line.cotPatronales,
      });
    }

    acc.ipresSalarial += computation.ipresGeneral + computation.ipresCadre;
    acc.ipresPatronal += computation.ipresGeneralEmployer + computation.ipresCadreEmployer;
    acc.cssPatronal += computation.cssPrestationsFamiliales + computation.cssAccidentTravail;
    acc.ipmSalarial += computation.ipm;
    acc.irSalarial += computation.ir;
    acc.cfceSalarial += computation.cfce;
    acc.tfpPatronal += computation.tfpEmployer;
    return acc;
  }, {
    ipresSalarial: 0,
    ipresPatronal: 0,
    cssPatronal: 0,
    ipmSalarial: 0,
    irSalarial: 0,
    cfceSalarial: 0,
    tfpPatronal: 0,
  });

  const rows: FiscalRecapRow[] = [
    {
      label: labels.retirement,
      salarial: totals.ipresSalarial,
      patronal: totals.ipresPatronal,
      total: totals.ipresSalarial + totals.ipresPatronal,
    },
    {
      label: labels.socialBenefits,
      salarial: 0,
      patronal: totals.cssPatronal,
      total: totals.cssPatronal,
    },
    {
      label: labels.health,
      salarial: totals.ipmSalarial,
      patronal: 0,
      total: totals.ipmSalarial,
    },
    {
      label: labels.incomeTax,
      salarial: totals.irSalarial,
      patronal: 0,
      total: totals.irSalarial,
    },
    {
      label: labels.cfce,
      salarial: params.countryCode === 'GN' ? 0 : totals.cfceSalarial,
      patronal: params.countryCode === 'GN' ? totals.tfpPatronal : 0,
      total: params.countryCode === 'GN' ? totals.tfpPatronal : totals.cfceSalarial,
    },
  ];

  const salarialTotal = rows.reduce((sum, row) => sum + row.salarial, 0);
  const patronalTotal = rows.reduce((sum, row) => sum + row.patronal, 0);
  const detailRows = Array.from(detailMap.values());

  return {
    month: params.month,
    countryCode: params.countryCode,
    slipCount: scopedSlips.length,
    salarialTotal,
    patronalTotal,
    grandTotal: salarialTotal + patronalTotal,
    rows,
    detailRows,
  };
}