import React from "react";

interface Loan {
  employee: string;
  totalLoan: number;
  monthlyPayment: number;
  amountRepaid: number;
}

const loans: Loan[] = [
  {
    employee: "Alice Dupont",
    totalLoan: 2000000,
    monthlyPayment: 100000,
    amountRepaid: 800000,
  },
  {
    employee: "Jean Martin",
    totalLoan: 1500000,
    monthlyPayment: 75000,
    amountRepaid: 600000,
  },
  {
    employee: "Sophie Bernard",
    totalLoan: 1000000,
    monthlyPayment: 50000,
    amountRepaid: 250000,
  },
];

const LoanManagement: React.FC = () => {
  return (
    <div className="overflow-x-auto rounded-lg border border-amber-200 bg-white shadow-sm p-4">
      <table className="min-w-full divide-y divide-amber-200">
        <thead className="bg-amber-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-semibold text-amber-700">Nom</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-amber-700">Prêt Total</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-amber-700">Mensualité</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-amber-700">Montant Remboursé</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-amber-700">Solde Restant</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-amber-700">Progression</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-amber-100">
          {loans.map((loan, idx) => {
            const remaining = loan.totalLoan - loan.amountRepaid;
            const percent = Math.min(100, Math.round((loan.amountRepaid / loan.totalLoan) * 100));
            return (
              <tr key={idx} className="hover:bg-amber-50">
                <td className="px-4 py-2 text-sm text-amber-900">{loan.employee}</td>
                <td className="px-4 py-2 text-sm text-amber-900">{loan.totalLoan.toLocaleString()} FCFA</td>
                <td className="px-4 py-2 text-sm text-amber-900">{loan.monthlyPayment.toLocaleString()} FCFA</td>
                <td className="px-4 py-2 text-sm text-amber-900">{loan.amountRepaid.toLocaleString()} FCFA</td>
                <td className="px-4 py-2 text-sm text-amber-900">{remaining.toLocaleString()} FCFA</td>
                <td className="px-4 py-2">
                  <div className="w-32 h-3 bg-amber-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400"
                      style={{ width: percent + "%" }}
                    />
                  </div>
                  <div className="text-xs text-amber-700 mt-1">{percent}%</div>
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
