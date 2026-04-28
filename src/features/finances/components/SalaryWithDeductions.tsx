import React from "react";

interface SalaryDetail {
  employee: string;
  baseSalary: number;
  advance: number;
  bonus: number;
  loanMonthly?: number;
}

const salaries: SalaryDetail[] = [
  {
    employee: "Alice Dupont",
    baseSalary: 2500_000,
    advance: 800_000,
    bonus: 300_000,
    loanMonthly: 100_000,
  },
  {
    employee: "Jean Martin",
    baseSalary: 2200_000,
    advance: 600_000,
    bonus: 150_000,
    loanMonthly: 75_000,
  },
  {
    employee: "Sophie Bernard",
    baseSalary: 2800_000,
    advance: 1000_000,
    bonus: 400_000,
    loanMonthly: 0,
  },
];

const SalaryWithDeductions: React.FC = () => {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm p-4">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Employé</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Salaire de Base</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Acomptes</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Primes</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Retenue sur prêt</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Net à Payer</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {salaries.map((row, idx) => {
            const loan = row.loanMonthly || 0;
            const netPay = row.baseSalary + row.bonus - row.advance - loan;
            return (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="px-4 py-2 text-sm text-slate-700">{row.employee}</td>
                <td className="px-4 py-2 text-sm text-slate-700">{row.baseSalary.toLocaleString()} FCFA</td>
                <td className="px-4 py-2 text-sm text-slate-700">{row.advance.toLocaleString()} FCFA</td>
                <td className="px-4 py-2 text-sm text-slate-700">{row.bonus.toLocaleString()} FCFA</td>
                <td className="px-4 py-2 text-sm text-amber-700 font-semibold">
                  {loan > 0 ? `- ${loan.toLocaleString()} FCFA` : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-4 py-2 text-sm font-semibold text-emerald-700">{netPay.toLocaleString()} FCFA</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default SalaryWithDeductions;
