import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getFiscalDriver } from './fiscalDrivers';

export interface EmployerInfo {
  companyName: string;
  address: string;
  ninea: string;
  ipres: string;
  css: string;
}

export interface PayrollRates {
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
  ir: number;
  cfce: number;
  tfpEmployer: number;
}

export interface PayrollBracket {
  upTo: number;
  rate: number;
}

export interface PayrollDatedValue<T> {
  startDate: string;
  endDate?: string;
  value: T;
}

export interface PayrollCountryRule {
  code: string;
  label: string;
  currency: string;
  workedUnitLabel: string;
  defaultWorkedUnits: number;
  employer: EmployerInfo;
  rates: PayrollRates;
  taxBrackets?: PayrollBracket[];
  ratesHistory?: PayrollDatedValue<Partial<PayrollRates>>[];
  taxBracketsHistory?: PayrollDatedValue<PayrollBracket[]>[];
}

export interface PayrollInput {
  baseSalary: number;
  surSalary: number;
  primeTransport: number;
  primePanier: number;
  primeAnciennete: number;
  manualRetenues: number;
  loanDeduction: number;
  cadre: boolean;
  irParts?: number;
  autoFiscal?: boolean;
  useTransportExemptCap?: boolean;
  calculationDate?: string;
}

interface PayrollLine {
  rubrique: string;
  base: number;
  tauxSalarial: number;
  montantSalarial: number;
  tauxPatronal: number;
  cotPatronales: number;
  isSection?: boolean;
}

export interface PayrollComputation {
  lines: PayrollLine[];
  brut: number;
  brutImposable: number;
  totalCotisations: number;
  totalPatronal: number;
  ir: number;
  ipresGeneral: number;
  ipresCadre: number;
  ipresGeneralEmployer: number;
  ipresCadreEmployer: number;
  cssPrestationsFamiliales: number;
  cssAccidentTravail: number;
  tfpEmployer: number;
  ipm: number;
  net: number;
  cfce: number;
  vrs: number;
}

export interface PayrollPdfEmployee {
  fullName: string;
  matricule: string;
  role: string;
  qualification: string;
  hireDate: string;
  socialSecurityNumber: string;
  irParts: number;
}

export interface PayrollPdfPeriod {
  monthLabel: string;
  workedUnits: number;
  workedUnitLabel: string;
}

export interface PayrollPdfLeave {
  acquis: number;
  pris: number;
  solde: number;
}

export interface PayrollPdfPayload {
  rule: PayrollCountryRule;
  employee: PayrollPdfEmployee;
  period: PayrollPdfPeriod;
  computation: PayrollComputation;
  detailedAdjustments?: Array<{
    label: string;
    quantity: number;
    unitLabel: string;
    baseRate: number;
    multiplier: number;
    amount: number;
  }>;
  annualCumulative: {
    brutImposable: number;
    irVerse: number;
    netPaye: number;
  };
  leave: PayrollPdfLeave;
  generatedBy: string;
}

export interface PayrollPdfGeneratedFile {
  fileName: string;
  dataUrl: string;
  fileSize: number;
}

const roundCurrency = (value: number) => Math.round(value);

const MINOR_SCALE = 100n;
const RATE_SCALE = 1_000_000n;

const toMinor = (value: number) => BigInt(Math.round(value * Number(MINOR_SCALE)));
const fromMinor = (value: bigint) => Number(value) / Number(MINOR_SCALE);

function divRound(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) return 0n;
  if (numerator >= 0n) {
    return (numerator + denominator / 2n) / denominator;
  }
  return (numerator - denominator / 2n) / denominator;
}

function rateToScaledInt(rate: number): bigint {
  return BigInt(Math.round(rate * Number(RATE_SCALE)));
}

function applyRateMinor(baseMinor: bigint, rate: number): bigint {
  return divRound(baseMinor * rateToScaledInt(rate), RATE_SCALE);
}

function parseCalcDate(value: string | undefined): Date {
  const parsed = value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function normalizeDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function dateInRange(target: Date, startDate: string, endDate?: string) {
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return false;
  const normalizedTarget = normalizeDate(target);
  const normalizedStart = normalizeDate(start);
  if (normalizedTarget < normalizedStart) return false;

  if (!endDate) return true;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return true;
  return normalizedTarget <= normalizeDate(end);
}

function resolveRatesAtDate(rule: PayrollCountryRule, calculationDate: Date): PayrollRates {
  const resolved: PayrollRates = { ...rule.rates };
  const timeline = [...(rule.ratesHistory || [])].sort((a, b) => a.startDate.localeCompare(b.startDate));
  for (const entry of timeline) {
    if (!dateInRange(calculationDate, entry.startDate, entry.endDate)) continue;
    Object.assign(resolved, entry.value);
  }
  return resolved;
}

function resolveBracketsAtDate(rule: PayrollCountryRule, calculationDate: Date): PayrollBracket[] {
  const timeline = (rule.taxBracketsHistory || [])
    .filter((entry) => dateInRange(calculationDate, entry.startDate, entry.endDate))
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
  if (timeline.length > 0) return timeline[0].value;
  return rule.taxBrackets || [
    { upTo: 630000, rate: 0 },
    { upTo: 1500000, rate: 0.2 },
    { upTo: 4000000, rate: 0.3 },
    { upTo: 8000000, rate: 0.35 },
    { upTo: Number.POSITIVE_INFINITY, rate: 0.4 },
  ];
}

const moneyFormatter = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const formatMoney = (value: number, currency: string) => {
  const clean = moneyFormatter
    .format(roundCurrency(value))
    .replace(/[\u00A0\u202F]/g, ' ')
    .replace(/\//g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return `${clean} ${currency}`;
};

const formatRate = (value: number) => `${(value * 100).toFixed(2)}%`;

function convertSubThousand(value: number): string {
  const units = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
  const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];

  if (value < 10) return units[value];
  if (value < 17) return teens[value - 10];
  if (value < 20) return `dix-${units[value - 10]}`;
  if (value < 70) {
    const ten = Math.floor(value / 10);
    const unit = value % 10;
    if (unit === 0) return tens[ten];
    if (unit === 1) return `${tens[ten]} et un`;
    return `${tens[ten]}-${units[unit]}`;
  }
  if (value < 80) {
    if (value === 71) return 'soixante et onze';
    return `soixante-${convertSubThousand(value - 60)}`;
  }
  if (value < 100) {
    if (value === 80) return 'quatre-vingts';
    return `quatre-vingt-${convertSubThousand(value - 80)}`;
  }

  const hundred = Math.floor(value / 100);
  const rest = value % 100;
  const hundredLabel = hundred === 1 ? 'cent' : `${units[hundred]} cent`;
  if (rest === 0) return hundred > 1 ? `${hundredLabel}s` : hundredLabel;
  return `${hundredLabel} ${convertSubThousand(rest)}`;
}

export function numberToFrenchWords(value: number): string {
  const integer = Math.max(0, roundCurrency(value));
  if (integer === 0) return 'zéro';

  const scales = [
    { divider: 1_000_000_000, label: 'milliard' },
    { divider: 1_000_000, label: 'million' },
    { divider: 1_000, label: 'mille' },
  ];

  let remaining = integer;
  const parts: string[] = [];

  for (const scale of scales) {
    const chunk = Math.floor(remaining / scale.divider);
    if (!chunk) continue;

    if (scale.label === 'mille' && chunk === 1) {
      parts.push('mille');
    } else {
      const chunkLabel = convertSubThousand(chunk);
      const plural = chunk > 1 && scale.label !== 'mille' ? 's' : '';
      parts.push(`${chunkLabel} ${scale.label}${plural}`);
    }
    remaining %= scale.divider;
  }

  if (remaining > 0) parts.push(convertSubThousand(remaining));
  return parts.join(' ');
}

function computeProgressiveAnnualTaxMinor(annualTaxablePerPartMinor: bigint, brackets: PayrollBracket[]): bigint {
  let remaining = annualTaxablePerPartMinor;
  let previous = 0n;
  let annualTax = 0n;

  for (const bracket of brackets) {
    if (remaining <= 0n) break;
    const upToMinor = Number.isFinite(bracket.upTo) ? toMinor(bracket.upTo) : (2n ** 62n);
    const range = upToMinor > previous ? upToMinor - previous : 0n;
    const taxableChunk = remaining < range ? remaining : range;
    annualTax += applyRateMinor(taxableChunk, bracket.rate);
    remaining -= taxableChunk;
    previous = upToMinor;
  }

  return annualTax;
}

export function computePayroll(input: PayrollInput, rule: PayrollCountryRule): PayrollComputation {
  const calculationDate = parseCalcDate(input.calculationDate);
  const activeRates = resolveRatesAtDate(rule, calculationDate);
  const activeBrackets = resolveBracketsAtDate(rule, calculationDate);
  const driver = getFiscalDriver(rule.code);

  const baseSalaryMinor = toMinor(input.baseSalary);
  const surSalaryMinor = toMinor(input.surSalary);
  const primeAncienneteMinor = toMinor(input.primeAnciennete);
  const primeTransportMinor = toMinor(input.primeTransport);
  const primePanierMinor = toMinor(input.primePanier);
  const brutMinor = baseSalaryMinor + surSalaryMinor + primeAncienneteMinor + primeTransportMinor + primePanierMinor;

  const autoFiscal = input.autoFiscal ?? true;
  const useTransportExemptCap = input.useTransportExemptCap ?? true;
  const isGuinea = rule.code === 'GN';
  const retirementLabel = driver.labels.retirement;
  const incomeTaxLabel = driver.labels.incomeTax;
  const complementaryTaxLabel = driver.labels.complementaryTax;
  const tfpRate = activeRates.tfpEmployer || 0;

  const transportCapMinor = toMinor(activeRates.transportExemptCap);
  const housingCapMinor = toMinor(activeRates.housingExemptCap || 0);
  const transportExonereMinor = useTransportExemptCap
    ? (primeTransportMinor < transportCapMinor ? primeTransportMinor : transportCapMinor)
    : 0n;
  const housingExonereMinor = autoFiscal
    ? (primePanierMinor < housingCapMinor ? primePanierMinor : housingCapMinor)
    : 0n;

  const ipresGeneralCapMinor = toMinor(activeRates.ipresGeneralCap);
  const ipresCadreCapMinor = toMinor(activeRates.ipresCadreCap);
  const ipresGeneralBaseMinor = autoFiscal
    ? (brutMinor < ipresGeneralCapMinor ? brutMinor : ipresGeneralCapMinor)
    : 0n;
  const ipresCadreBaseMinor = autoFiscal && input.cadre
    ? (brutMinor < ipresCadreCapMinor ? brutMinor : ipresCadreCapMinor)
    : 0n;

  const ipresGeneralMinor = autoFiscal ? applyRateMinor(ipresGeneralBaseMinor, activeRates.ipresGeneral) : 0n;
  const ipresCadreMinor = autoFiscal && input.cadre ? applyRateMinor(ipresCadreBaseMinor, activeRates.ipresCadre) : 0n;
  const ipresGeneralEmployerMinor = autoFiscal ? applyRateMinor(ipresGeneralBaseMinor, activeRates.ipresGeneralEmployer) : 0n;
  const ipresCadreEmployerMinor = autoFiscal && input.cadre ? applyRateMinor(ipresCadreBaseMinor, activeRates.ipresCadreEmployer) : 0n;
  const ipmMinor = autoFiscal ? applyRateMinor(brutMinor, activeRates.ipm) : 0n;

  const cssPFPatronalMinor = autoFiscal ? applyRateMinor(brutMinor, activeRates.cssPrestationsFamiliales) : 0n;
  const cssATPatronalMinor = autoFiscal ? applyRateMinor(brutMinor, activeRates.cssAccidentTravail) : 0n;

  const brutImposableMinor = brutImposableBaseMinor(
    brutMinor,
    transportExonereMinor,
    housingExonereMinor,
    ipresGeneralMinor,
    ipresCadreMinor,
    ipmMinor,
  );

  const tfpEmployerMinor = autoFiscal ? applyRateMinor(brutImposableMinor, tfpRate) : 0n;

  const irParts = Math.max(1, input.irParts || 1);
  const irMinor = autoFiscal
    ? (driver.usesProgressiveIncomeTax
      ? (() => {
          const annualPerPartMinor = divRound(brutImposableMinor * 12n, BigInt(irParts));
          const annualTaxPerPartMinor = computeProgressiveAnnualTaxMinor(annualPerPartMinor, activeBrackets);
          return divRound(annualTaxPerPartMinor * BigInt(irParts), 12n);
        })()
      : applyRateMinor(brutImposableMinor, activeRates.ir))
    : 0n;

  const cfceMinor = autoFiscal && !isGuinea ? applyRateMinor(brutImposableMinor, activeRates.cfce) : 0n;
  const manualRetenuesMinor = toMinor(input.manualRetenues);
  const loanDeductionMinor = toMinor(input.loanDeduction);
  const totalCotisationsMinor = ipresGeneralMinor + ipresCadreMinor + ipmMinor + irMinor + cfceMinor + manualRetenuesMinor + loanDeductionMinor;
  const totalPatronalMinor = ipresGeneralEmployerMinor + ipresCadreEmployerMinor + cssPFPatronalMinor + cssATPatronalMinor + tfpEmployerMinor;
  const netMinor = brutMinor - totalCotisationsMinor;

  const brut = fromMinor(brutMinor);
  const brutImposable = fromMinor(brutImposableMinor);
  const ipresGeneralBase = fromMinor(ipresGeneralBaseMinor);
  const ipresCadreBase = fromMinor(ipresCadreBaseMinor);
  const ipresGeneral = fromMinor(ipresGeneralMinor);
  const ipresCadre = fromMinor(ipresCadreMinor);
  const ipresGeneralEmployer = fromMinor(ipresGeneralEmployerMinor);
  const ipresCadreEmployer = fromMinor(ipresCadreEmployerMinor);
  const ipm = fromMinor(ipmMinor);
  const cssPFPatronal = fromMinor(cssPFPatronalMinor);
  const cssATPatronal = fromMinor(cssATPatronalMinor);
  const tfpEmployer = fromMinor(tfpEmployerMinor);
  const ir = fromMinor(irMinor);
  const cfce = fromMinor(cfceMinor);
  const totalCotisations = fromMinor(totalCotisationsMinor);
  const totalPatronal = fromMinor(totalPatronalMinor);
  const net = fromMinor(netMinor);
  const vrs = cfce;

  const lines: PayrollLine[] = [
    { rubrique: 'BRUT', base: 0, tauxSalarial: 0, montantSalarial: 0, tauxPatronal: 0, cotPatronales: 0, isSection: true },
    { rubrique: 'Salaire de base', base: input.baseSalary, tauxSalarial: 1, montantSalarial: input.baseSalary, tauxPatronal: 0, cotPatronales: 0 },
    { rubrique: 'Sursalaire', base: input.surSalary, tauxSalarial: 1, montantSalarial: input.surSalary, tauxPatronal: 0, cotPatronales: 0 },
    { rubrique: 'Prime ancienneté', base: input.primeAnciennete, tauxSalarial: 1, montantSalarial: input.primeAnciennete, tauxPatronal: 0, cotPatronales: 0 },
    { rubrique: `Indemnité transport${useTransportExemptCap ? ' (exonérée selon plafond pays)' : ''}`, base: input.primeTransport, tauxSalarial: 1, montantSalarial: input.primeTransport, tauxPatronal: 0, cotPatronales: 0 },
    { rubrique: isGuinea ? 'Indemnité logement' : 'Prime de panier', base: input.primePanier, tauxSalarial: 1, montantSalarial: input.primePanier, tauxPatronal: 0, cotPatronales: 0 },
    { rubrique: 'RETENUES SOCIALES', base: 0, tauxSalarial: 0, montantSalarial: 0, tauxPatronal: 0, cotPatronales: 0, isSection: true },
    { rubrique: `${retirementLabel} - Régime Général`, base: ipresGeneralBase, tauxSalarial: autoFiscal ? activeRates.ipresGeneral : 0, montantSalarial: -ipresGeneral, tauxPatronal: autoFiscal ? activeRates.ipresGeneralEmployer : 0, cotPatronales: ipresGeneralEmployer },
    { rubrique: `${retirementLabel} - Régime Cadre`, base: ipresCadreBase, tauxSalarial: autoFiscal && input.cadre ? activeRates.ipresCadre : 0, montantSalarial: -ipresCadre, tauxPatronal: autoFiscal && input.cadre ? activeRates.ipresCadreEmployer : 0, cotPatronales: ipresCadreEmployer },
    { rubrique: 'IPM - Assurance Maladie', base: brut, tauxSalarial: autoFiscal ? activeRates.ipm : 0, montantSalarial: -ipm, tauxPatronal: 0, cotPatronales: 0 },
    { rubrique: `${driver.labels.socialBenefits} - Prestations Familiales`, base: brut, tauxSalarial: 0, montantSalarial: 0, tauxPatronal: autoFiscal ? activeRates.cssPrestationsFamiliales : 0, cotPatronales: cssPFPatronal },
    { rubrique: `${driver.labels.socialBenefits} - Accidents du Travail`, base: brut, tauxSalarial: 0, montantSalarial: 0, tauxPatronal: autoFiscal ? activeRates.cssAccidentTravail : 0, cotPatronales: cssATPatronal },
    { rubrique: 'RETENUES FISCALES', base: 0, tauxSalarial: 0, montantSalarial: 0, tauxPatronal: 0, cotPatronales: 0, isSection: true },
    { rubrique: incomeTaxLabel, base: brutImposable, tauxSalarial: autoFiscal && driver.usesProgressiveIncomeTax ? 0 : (autoFiscal ? activeRates.ir : 0), montantSalarial: -ir, tauxPatronal: 0, cotPatronales: 0 },
    { rubrique: 'Retenues diverses', base: input.manualRetenues, tauxSalarial: 1, montantSalarial: -input.manualRetenues, tauxPatronal: 0, cotPatronales: 0 },
    { rubrique: 'Retenue prêt', base: input.loanDeduction, tauxSalarial: 1, montantSalarial: -input.loanDeduction, tauxPatronal: 0, cotPatronales: 0 },
  ];

  if (driver.complementaryTaxIsEmployerCharge) {
    lines.splice(lines.length - 2, 0, {
      rubrique: complementaryTaxLabel,
      base: brutImposable,
      tauxSalarial: 0,
      montantSalarial: 0,
      tauxPatronal: autoFiscal ? tfpRate : 0,
      cotPatronales: tfpEmployer,
    });
  } else {
    lines.splice(lines.length - 2, 0, {
      rubrique: complementaryTaxLabel,
      base: brutImposable,
      tauxSalarial: autoFiscal ? activeRates.cfce : 0,
      montantSalarial: -cfce,
      tauxPatronal: 0,
      cotPatronales: 0,
    });
  }

  return {
    lines,
    brut: roundCurrency(brut),
    brutImposable: roundCurrency(brutImposable),
    totalCotisations: roundCurrency(totalCotisations),
    totalPatronal: roundCurrency(totalPatronal),
    ir: roundCurrency(ir),
    ipresGeneral: roundCurrency(ipresGeneral),
    ipresCadre: roundCurrency(ipresCadre),
    ipresGeneralEmployer: roundCurrency(ipresGeneralEmployer),
    ipresCadreEmployer: roundCurrency(ipresCadreEmployer),
    cssPrestationsFamiliales: roundCurrency(cssPFPatronal),
    cssAccidentTravail: roundCurrency(cssATPatronal),
    tfpEmployer: roundCurrency(tfpEmployer),
    ipm: roundCurrency(ipm),
    cfce: roundCurrency(cfce),
    net: roundCurrency(net),
    vrs: roundCurrency(cfce),
  };
}

function brutImposableBaseMinor(
  brut: bigint,
  transportExonere: bigint,
  housingExonere: bigint,
  ipresGeneral: bigint,
  ipresCadre: bigint,
  ipm: bigint,
) {
  const result = brut - transportExonere - housingExonere - ipresGeneral - ipresCadre - ipm;
  return result < 0n ? 0n : result;
}

async function loadLogoDataUrl(path: string): Promise<string | null> {
  try {
    const response = await fetch(path);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Unable to read logo image.'));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generatePayrollPdf(
  payload: PayrollPdfPayload,
  options?: { onGenerated?: (file: PayrollPdfGeneratedFile) => void },
): Promise<void> {
  const mmToPt = 72 / 25.4;
  const pageMargin = 14 * mmToPt; // 14mm on all sides for full-width optimization
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = pageMargin;
  const contentWidth = pageWidth - marginLeft * 2;
  const marginTop = pageMargin;
  const marginBottom = pageMargin;

  doc.setDrawColor(210, 214, 222);
  doc.setLineWidth(0.5);
  doc.roundedRect(marginLeft, marginTop, contentWidth, 124, 4, 4);

  const headerTop = marginTop;
  const headerHeight = 124;

  const logoDataUrl = await loadLogoDataUrl('/logo-ivos.jpg');
  const logoW = 4.5 * 28.346; // 4.5cm
  const logoH = 44;
  const logoX = marginLeft + 12;
  const logoY = headerTop + (headerHeight - logoH) / 2;
  if (logoDataUrl) {
    const imageProps = doc.getImageProperties(logoDataUrl);
    const widthRatio = logoW / imageProps.width;
    const heightRatio = logoH / imageProps.height;
    const ratio = Math.min(widthRatio, heightRatio);
    const drawW = imageProps.width * ratio;
    const drawH = imageProps.height * ratio;
    const drawX = logoX + (logoW - drawW) / 2;
    const drawY = logoY + (logoH - drawH) / 2;
    doc.addImage(logoDataUrl, imageProps.fileType || 'JPEG', drawX, drawY, drawW, drawH);
  } else {
    doc.setFillColor(23, 37, 84);
    doc.roundedRect(logoX, logoY, logoW, logoH, 4, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('IVOS', logoX + 14, logoY + 28);
  }

  // Built-in Helvetica is used as a modern sans-serif fallback for jsPDF.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text('BULLETIN DE PAIE', pageWidth / 2, headerTop + 24, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(80, 80, 80);
  doc.text(`Pays: ${payload.rule.label} | Période: ${payload.period.monthLabel}`, pageWidth / 2, headerTop + 38, { align: 'center' });

  const employerX = logoX + logoW + 14;
  const employerY = headerTop + 52;
  doc.setTextColor(70, 70, 70);
  doc.setFontSize(9);
  doc.text(payload.rule.employer.companyName, employerX, employerY);
  doc.text(payload.rule.employer.address, employerX, employerY + 13);
  doc.text(`NINEA: ${payload.rule.employer.ninea}  |  IPRES: ${payload.rule.employer.ipres}  |  CSS: ${payload.rule.employer.css}`, employerX, employerY + 26);

  const employeeTop = headerTop + headerHeight + 14;
  doc.setDrawColor(225, 227, 232);
  doc.setLineWidth(0.6);
  doc.setFillColor(252, 253, 255);
  doc.roundedRect(marginLeft, employeeTop, contentWidth, 88, 5, 5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text('INFORMATIONS AGENT', marginLeft + 12, employeeTop + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const colLeft = marginLeft + 12;
  const colRight = marginLeft + contentWidth / 2 + 8;
  doc.text(`Nom complet: ${payload.employee.fullName}`, colLeft, employeeTop + 36);
  doc.text(`Matricule: ${payload.employee.matricule}`, colLeft, employeeTop + 52);
  doc.text(`Fonction: ${payload.employee.role}`, colLeft, employeeTop + 68);
  doc.text(`Qualification: ${payload.employee.qualification}`, colRight, employeeTop + 36);
  doc.text(`Date d'embauche: ${payload.employee.hireDate}`, colRight, employeeTop + 52);
  doc.text(`N° Sécurité Sociale: ${payload.employee.socialSecurityNumber}  |  Parts IR: ${payload.employee.irParts.toLocaleString('fr-FR')}`, colRight, employeeTop + 68);

  const periodTop = employeeTop + 100;
  doc.setDrawColor(225, 227, 232);
  doc.setLineWidth(0.5);
  doc.rect(marginLeft, periodTop, contentWidth, 32);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Temps de travail: ${moneyFormatter.format(payload.period.workedUnits)} ${payload.period.workedUnitLabel.toLowerCase()}  |  Mois de paie: ${payload.period.monthLabel}`, marginLeft + 12, periodTop + 20);

  const sectionRows: Array<[string, string, string, string, string, string]> = payload.computation.lines.map(line => [
    line.rubrique,
    line.isSection ? '' : formatMoney(line.base, payload.rule.currency),
    line.isSection ? '' : formatRate(line.tauxSalarial),
    line.isSection ? '' : (line.montantSalarial !== 0 ? formatMoney(line.montantSalarial, payload.rule.currency) : ''),
    line.isSection ? '' : formatRate(line.tauxPatronal),
    line.isSection ? '' : (line.cotPatronales !== 0 ? formatMoney(line.cotPatronales, payload.rule.currency) : ''),
  ]);

  autoTable(doc, {
    startY: periodTop + 44,
    head: [['DESIGNATION', 'BASE', 'TAUX', 'GAIN', 'TAUX', 'COT. PATRONALES']],
    body: sectionRows,
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: { top: 5, right: 8, bottom: 5, left: 8 },
      lineColor: [209, 213, 219],
      lineWidth: 0.25,
      textColor: [28, 28, 28],
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [243, 244, 246],
      textColor: [31, 41, 55],
      fontStyle: 'bold',
      lineColor: [209, 213, 219],
      lineWidth: 0.25,
    },
    theme: 'plain',
    columnStyles: {
      0: { halign: 'left', cellWidth: 155, font: 'helvetica', cellPadding: { left: 10, right: 6, top: 5, bottom: 5 } },
      1: { halign: 'right', cellWidth: 75, font: 'helvetica', cellPadding: { left: 4, right: 8, top: 5, bottom: 5 } },
      2: { halign: 'right', cellWidth: 60, font: 'helvetica', cellPadding: { left: 4, right: 8, top: 5, bottom: 5 } },
      3: { halign: 'right', cellWidth: 82, font: 'helvetica', cellPadding: { left: 4, right: 8, top: 5, bottom: 5 }, fontStyle: 'bold' },
      4: { halign: 'right', cellWidth: 58, font: 'helvetica', cellPadding: { left: 4, right: 8, top: 5, bottom: 5 } },
      5: { halign: 'right', cellWidth: 82, font: 'helvetica', cellPadding: { left: 4, right: 8, top: 5, bottom: 5 }, fontStyle: 'bold' },
    },
    didParseCell: hookData => {
      const rawRow = hookData.row.raw;
      const rowLabel = Array.isArray(rawRow) ? rawRow[0] : '';
      const raw = String(rowLabel || '');
      if (raw === 'BRUT' || raw === 'RETENUES SOCIALES' || raw === 'RETENUES FISCALES') {
        hookData.cell.styles.font = 'helvetica';
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.textColor = [31, 41, 55];
        hookData.cell.styles.fillColor = [243, 244, 246];
        hookData.cell.styles.lineColor = [209, 213, 219];
        hookData.cell.styles.lineWidth = 0.5;
        if (hookData.column.index !== 0) hookData.cell.text = [''];
      } else if (hookData.section === 'body' && hookData.row.index % 2 === 1) {
        hookData.cell.styles.fillColor = [252, 253, 255];
      }
    },
    didDrawCell: hookData => {
      // Draw only thin horizontal separators for a modern airy grid.
      if (hookData.section === 'body') {
        const xStart = marginLeft;
        const xEnd = marginLeft + contentWidth;
        const y = hookData.cell.y + hookData.cell.height;
        doc.setDrawColor(209, 213, 219);
        doc.setLineWidth(0.25);
        doc.line(xStart, y, xEnd, y);
      }
    },
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 440;

  let cursorY = finalY;
  if (payload.detailedAdjustments && payload.detailedAdjustments.length > 0) {
    const detailRows = payload.detailedAdjustments.map((line) => {
      const baseMajoree = line.baseRate * line.multiplier;
      return [
        line.label,
        `${moneyFormatter.format(line.quantity)} ${line.unitLabel} x ${formatMoney(baseMajoree, payload.rule.currency)}`,
        formatMoney(line.amount, payload.rule.currency),
      ];
    });

    autoTable(doc, {
      startY: finalY + 18,
      head: [['VENTILATION HEURES', 'FORMULE', 'MONTANT']],
      body: detailRows,
      styles: {
        font: 'helvetica',
        fontSize: 8.8,
        cellPadding: { top: 4, right: 8, bottom: 4, left: 8 },
        lineColor: [209, 213, 219],
        lineWidth: 0,
        textColor: [28, 28, 28],
      },
      headStyles: {
        fillColor: [234, 241, 255],
        textColor: [31, 41, 55],
        fontStyle: 'bold',
        lineColor: [209, 213, 219],
        lineWidth: 0.25,
      },
      theme: 'plain',
      columnStyles: {
        0: { halign: 'left', cellWidth: 180 },
        1: { halign: 'left', cellWidth: 210 },
        2: { halign: 'right', cellWidth: 120 },
      },
      didDrawCell: hookData => {
        if (hookData.section === 'body') {
          const xStart = marginLeft;
          const xEnd = marginLeft + contentWidth;
          const y = hookData.cell.y + hookData.cell.height;
          doc.setDrawColor(209, 213, 219);
          doc.setLineWidth(0.25);
          doc.line(xStart, y, xEnd, y);
        }
      },
    });

    cursorY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || finalY) + 10;
  }

  const netWords = numberToFrenchWords(payload.computation.net);

  doc.setDrawColor(222, 225, 230);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, cursorY + 10, marginLeft + contentWidth, cursorY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(22, 22, 22);
  doc.text(`Salaire Brut`, marginLeft, cursorY + 28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text(moneyFormatter.format(payload.computation.brut) + ' ' + payload.rule.currency, marginLeft + contentWidth - 8, cursorY + 28, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(22, 22, 22);
  doc.text(`Brut imposable`, marginLeft, cursorY + 44);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(59, 69, 84);
  doc.text(moneyFormatter.format(payload.computation.brutImposable) + ' ' + payload.rule.currency, marginLeft + contentWidth - 8, cursorY + 44, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(22, 22, 22);
  doc.text(`Total retenues salariales`, marginLeft, cursorY + 60);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(200, 50, 50);
  doc.text(moneyFormatter.format(payload.computation.totalCotisations) + ' ' + payload.rule.currency, marginLeft + contentWidth - 8, cursorY + 60, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(22, 22, 22);
  doc.text(`Total cotisations patronales`, marginLeft, cursorY + 76);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 100, 130);
  doc.text(moneyFormatter.format(payload.computation.totalPatronal) + ' ' + payload.rule.currency, marginLeft + contentWidth - 8, cursorY + 76, { align: 'right' });

  const netBoxTop = cursorY + 94;
  doc.setDrawColor(31, 41, 55);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(2);
  doc.rect(marginLeft, netBoxTop, contentWidth, 80);
  // Subtle shadow effect
  doc.setDrawColor(200, 210, 220);
  doc.setLineWidth(0.5);
  doc.rect(marginLeft + 1.5, netBoxTop + 1.5, contentWidth - 3, 76);

  // NET À PAYER prominent display
  doc.setFontSize(16);
  doc.setTextColor(31, 41, 55);
  doc.setFont('helvetica', 'bold');
  doc.text('NET À PAYER', marginLeft + 12, netBoxTop + 28);
  
  doc.setFontSize(14);
  doc.setTextColor(26, 82, 182);
  const netAmount = moneyFormatter.format(payload.computation.net) + ' ' + payload.rule.currency;
  doc.text(netAmount, marginLeft + contentWidth - 12, netBoxTop + 28, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 110, 130);
  doc.text(`En lettres: ${netWords} ${payload.rule.currency.toLowerCase()}`, marginLeft + 12, netBoxTop + 52);

  // Cumulative section below NET box
  const cumBoxTop = netBoxTop + 90;
  doc.setFontSize(9.5);
  doc.setTextColor(59, 69, 84);
  doc.setFont('helvetica', 'bold');
  doc.text('CUMULS ANNUELS', marginLeft, cumBoxTop);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(70, 80, 90);
  doc.text(`Brut imposable: ${moneyFormatter.format(payload.annualCumulative.brutImposable)} ${payload.rule.currency}`, marginLeft, cumBoxTop + 16);
  doc.text(`IR versé: ${moneyFormatter.format(payload.annualCumulative.irVerse)} ${payload.rule.currency}`, marginLeft, cumBoxTop + 32);
  doc.text(`Net payé: ${moneyFormatter.format(payload.annualCumulative.netPaye)} ${payload.rule.currency}`, marginLeft, cumBoxTop + 48);

  // Leave balance
  doc.setFontSize(8.5);
  doc.setTextColor(70, 80, 90);
  const leaveLabel = `Congés acquis: ${moneyFormatter.format(payload.leave.acquis)} j  |  Congés pris: ${moneyFormatter.format(payload.leave.pris)} j  |  Solde: ${moneyFormatter.format(payload.leave.solde)} j`;
  doc.text(leaveLabel, marginLeft, cumBoxTop + 68);

  const footerTop = netBoxTop + 114;
  doc.setDrawColor(220, 224, 230);
  doc.setLineWidth(0.5);
  doc.rect(marginLeft, footerTop, contentWidth, 88);
  doc.line(marginLeft + contentWidth / 3, footerTop, marginLeft + contentWidth / 3, footerTop + 88);
  doc.line(marginLeft + (contentWidth / 3) * 2, footerTop, marginLeft + (contentWidth / 3) * 2, footerTop + 88);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(75, 75, 75);
  doc.text('SIGNATURE EMPLOYEUR', marginLeft + 12, footerTop + 18);
  doc.text('CACHET', marginLeft + contentWidth / 3 + 12, footerTop + 18);
  doc.text('SIGNATURE SALARIÉ', marginLeft + (contentWidth / 3) * 2 + 12, footerTop + 18);

  doc.setDrawColor(205, 210, 218);
  doc.line(marginLeft + 12, footerTop + 66, marginLeft + contentWidth / 3 - 12, footerTop + 66);
  doc.line(marginLeft + contentWidth / 3 + 12, footerTop + 66, marginLeft + (contentWidth / 3) * 2 - 12, footerTop + 66);
  doc.line(marginLeft + (contentWidth / 3) * 2 + 12, footerTop + 66, marginLeft + contentWidth - 12, footerTop + 66);

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Document généré par ${payload.generatedBy} le ${new Date().toLocaleString('fr-FR')}`, marginLeft, pageHeight - marginBottom + 2);

  const fileName = `bulletin-paie-${payload.employee.matricule || 'employe'}-${payload.period.monthLabel.replace(/\s+/g, '-')}.pdf`;
  if (options?.onGenerated) {
    const dataUrl = doc.output('datauristring');
    const fileBlob = doc.output('blob') as Blob;
    options.onGenerated({
      fileName: fileName.toLowerCase(),
      dataUrl,
      fileSize: fileBlob.size,
    });
  }
  doc.save(fileName.toLowerCase());
}