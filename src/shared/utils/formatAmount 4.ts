/**
 * Nettoyage et formatage standardisé des montants pour affichage (FCFA)
 * - Purge les caractères parasites (/, \\, lettres, symboles)
 * - Prend en charge strings comme "2/500/000" ou "2\\500,000.00"
 * - Rendu : espace comme séparateur de milliers + " FCFA"
 */
export function cleanAmountToInteger(input: string | number | null | undefined): number {
  if (input === null || input === undefined) return 0;
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return 0;
    return Math.round(input);
  }

  let s = String(input).trim();
  if (!s) return 0;

  // Normaliser les virgules décimales
  s = s.replace(/,/g, '.');

  // Enlever tout caractère qui n'est pas chiffre ou point
  s = s.replace(/[^\d.]/g, '');

  if (s === '') return 0;
  // Si plusieurs points, garder la première comme séparateur décimal
  const parts = s.split('.');
  const numeric = parts.length === 1 ? parts[0] : parts[0] + '.' + parts.slice(1).join('');
  const n = Number.parseFloat(numeric);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

export function formatCleanAmount(
  input: string | number | null | undefined,
  currency: string = 'FCFA'
): string {
  const n = cleanAmountToInteger(input);
  // Format FR mais remplacer NBSP par espace simple
  const formatted = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
    .format(n)
    .replace(/\u00A0/g, ' ');
  return `${formatted} ${currency}`;
}

export function formatMontantFCFA(input: string | number | null | undefined): string {
  const montant = cleanAmountToInteger(input);
  const formatte = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
    .format(montant)
    .replace(/\u00A0/g, ' ');
  return `${formatte} FCFA`;
}

export const purgerEtFormatFCFA = (montantBrut: any): string => {
  if (montantBrut === undefined || montantBrut === null) return '0 FCFA';

  const initial = String(montantBrut);
  let str = initial.replace(/[/\\]/g, '').replace(/\s+/g, '');

  const hasSlashGroup = /[/\\]/.test(initial);
  const lastDot = str.lastIndexOf('.');
  const lastComma = str.lastIndexOf(',');
  const lastSepPos = Math.max(lastDot, lastComma);

  if (lastSepPos !== -1) {
    const sepChar = str[lastSepPos];
    const tail = str.slice(lastSepPos + 1);
    if (hasSlashGroup || tail.length === 2) {
      str = str.slice(0, lastSepPos);
    }
  }

  const chiffres = str.replace(/[^0-9]/g, '');
  const nombre = Number.isFinite(Number(chiffres)) ? Number(chiffres) : NaN;

  if (isNaN(nombre)) return '0 FCFA';

  return (
    new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: 0,
    })
      .format(nombre)
      .replace(/[\u00A0\u202F]/g, ' ') + ' FCFA'
  );
};

export const forceCleanFormatFCFA = (montant: any): string => {
  return purgerEtFormatFCFA(montant);
};

export function formatMonetaryValue(
  input: string | number | null | undefined,
  currency: string = 'FCFA'
): string {
  return formatCleanAmount(input, currency);
}

export default formatCleanAmount;
