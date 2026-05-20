import React from 'react';

interface SalaryDetail {
  employee: string;
  baseSalary: number;
  advance: number;
  bonus: number;
  netPay: number;
}

interface SalaryDetailsProps {
  data: SalaryDetail[];
}

const SalaryDetails: React.FC<SalaryDetailsProps> = ({ data }) => {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Employé</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">
              Salaire de Base
            </th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">
              Acomptes (max 40%)
            </th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Primes</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">
              Net à Payer
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row, idx) => (
            <tr key={idx} className="hover:bg-slate-50">
              <td className="px-4 py-2 text-sm text-slate-700">{row.employee}</td>
              <td className="px-4 py-2 text-sm text-slate-700">
                {row.baseSalary.toLocaleString()} €
              </td>
              <td className="px-4 py-2 text-sm text-slate-700">{row.advance.toLocaleString()} €</td>
              <td className="px-4 py-2 text-sm text-slate-700">{row.bonus.toLocaleString()} €</td>
              <td className="px-4 py-2 text-sm font-semibold text-emerald-700">
                {row.netPay.toLocaleString()} €
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SalaryDetails;
