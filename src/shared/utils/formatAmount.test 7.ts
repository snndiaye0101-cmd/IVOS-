import { purgerEtFormatFCFA } from './formatAmount';

describe('purgerEtFormatFCFA', () => {
  it('devrait supprimer les slashes et formatter les montants FCFA', () => {
    expect(purgerEtFormatFCFA('2/500/000')).toBe('2 500 000 FCFA');
    expect(purgerEtFormatFCFA('2\\500\\000')).toBe('2 500 000 FCFA');
    expect(purgerEtFormatFCFA(' 2 500 000 ')).toBe('2 500 000 FCFA');
    expect(purgerEtFormatFCFA('2 500 000 FCFA')).toBe('2 500 000 FCFA');
    expect(purgerEtFormatFCFA(2500000)).toBe('2 500 000 FCFA');
    expect(purgerEtFormatFCFA('2,500,000')).toBe('2 500 000 FCFA');
    expect(purgerEtFormatFCFA('abc')).toBe('0 FCFA');
  });

  it('devrait supprimer les slash/backslash même dans des valeurs mixtes', () => {
    expect(purgerEtFormatFCFA('1/234/567.89')).toBe('1 234 567 FCFA');
    expect(purgerEtFormatFCFA('1\\234\\567,89')).toBe('1 234 567 FCFA');
  });
});
