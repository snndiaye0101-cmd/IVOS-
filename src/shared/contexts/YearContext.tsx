import { useState, createContext, useContext } from 'react';

export type YearOption = '2026' | '2025' | 'Historique Complet';

interface YearContextType {
  year: YearOption;
  setYear: (year: YearOption) => void;
}

const YearContext = createContext<YearContextType | undefined>(undefined);

export function YearProvider({ children }: { children: React.ReactNode }) {
  const [year, setYear] = useState<YearOption>('2026');
  return <YearContext.Provider value={{ year, setYear }}>{children}</YearContext.Provider>;
}

export function useYear() {
  const ctx = useContext(YearContext);
  if (!ctx) throw new Error('useYear must be used within a YearProvider');
  return ctx;
}

export function YearSelector() {
  const { year, setYear } = useYear();
  return (
    <select
      value={year}
      onChange={(e) => setYear(e.target.value as YearOption)}
      className="ml-2 rounded-xl border-2 border-blue-900 bg-white px-3 py-1 font-bold text-blue-900 shadow"
      style={{ minWidth: 160 }}
    >
      <option value="2026">2026 (Actuel)</option>
      <option value="2025">2025</option>
      <option value="Historique Complet">Historique Complet</option>
    </select>
  );
}
