import React from 'react';
import { formatCleanAmount } from '../../../shared/utils/formatAmount';

interface Loan {
  employee: string;
  totalLoan: number;
  monthlyPayment: number;
  amountRepaid: number;
}

const loans: Loan[] = [
  {
    employee: 'Alice Dupont',
    totalLoan: 2000000,
    monthlyPayment: 100000,
    amountRepaid: 800000,
  },
  {
    employee: 'Jean Martin',
    totalLoan: 1500000,
    monthlyPayment: 75000,
    amountRepaid: 600000,
  },
  {
    employee: 'Sophie Bernard',
    totalLoan: 1000000,
    monthlyPayment: 50000,
    amountRepaid: 250000,
  },
];

const formatCurrency = (n: number) => formatCleanAmount(n, 'FCFA');

const LoanManagement: React.FC = () => {
  return (
    <div className="overflow-x-auto rounded-lg border border-amber-200 bg-white p-4 shadow-sm">
      <table className="min-w-full divide-y divide-amber-200">
        <thead className="bg-amber-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-semibold text-amber-700">Nom</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-amber-700">Prêt Total</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-amber-700">Mensualité</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-amber-700">
              Montant Remboursé
            </th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-amber-700">
              Solde Restant
            </th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-amber-700">
              Progression
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-amber-100">
          {loans.map((loan, idx) => {
            const remaining = loan.totalLoan - loan.amountRepaid;
            const percent = Math.min(100, Math.round((loan.amountRepaid / loan.totalLoan) * 100));
            return (
              <tr key={idx} className="hover:bg-amber-50">
                <td className="px-4 py-2 text-sm text-amber-900">{loan.employee}</td>
                <td className="px-4 py-2 text-sm text-amber-900">
                  {formatCurrency(loan.totalLoan)}
                </td>
                <td className="px-4 py-2 text-sm text-amber-900">
                  {formatCurrency(loan.monthlyPayment)}
                </td>
                <td className="px-4 py-2 text-sm text-amber-900">
                  {formatCurrency(loan.amountRepaid)}
                </td>
                <td className="px-4 py-2 text-sm text-amber-900">{formatCurrency(remaining)}</td>
                <td className="px-4 py-2">
                  <div className="h-3 w-32 overflow-hidden rounded-full bg-amber-100">
                    <div className="h-full bg-amber-400" style={{ width: percent + '%' }} />
                  </div>
                  <div className="mt-1 text-xs text-amber-700">{percent}%</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default LoanManagement;
