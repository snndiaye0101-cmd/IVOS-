export function formatCleanAmount(amount: any, currency: string = 'FCFA'): string {
  if (amount === undefined || amount === null) return `0 ${currency}`;
  const chiffres = String(amount).replace(/[^0-9]/g, '');
  const nombre = parseInt(chiffres, 10);
  if (isNaN(nombre)) return `0 ${currency}`;
  return (
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(nombre) + ` ${currency}`
  );
}
