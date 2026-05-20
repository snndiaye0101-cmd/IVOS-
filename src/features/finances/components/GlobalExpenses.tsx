import React, { useState } from 'react';
import { formatCleanAmount } from '../../../shared/utils/formatAmount';

const daily = [
  { label: 'Péages', value: 12000 },
  { label: 'Carburant', value: 35000 },
];
const monthly = [
  { label: 'Salaires', value: 4200000 },
  { label: 'Loyer', value: 800000 },
];
const yearly = [{ label: 'Assurances', value: 2500000 }];

const tabs = ['Journalier', 'Mensuel', 'Annuel'];

const dataMap = [daily, monthly, yearly];

const GlobalExpenses: React.FC = () => {
  const [tab, setTab] = useState(0);
  return (
    <div className="mx-auto w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow">
      <div className="mb-6 flex gap-2">
        {tabs.map((t, idx) => (
          <button
            key={t}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${tab === idx ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500 hover:bg-emerald-50'}`}
            onClick={() => setTab(idx)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {dataMap[tab].map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-3 rounded-lg border p-4 shadow-sm ${item.label === 'Salaires' ? 'border-amber-300 bg-amber-50' : 'border-slate-100 bg-slate-50'}`}
          >
            <div
              className={`h-3 w-3 rounded-full ${item.label === 'Salaires' ? 'bg-amber-400' : 'bg-emerald-400'}`}
            />
            <div className="flex-1">
              <div className="text-xs text-slate-500">{item.label}</div>
              <div
                className={`text-lg font-semibold ${item.label === 'Salaires' ? 'text-amber-700' : 'text-slate-800'}`}
              >
                {formatCleanAmount(item.value, 'FCFA')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GlobalExpenses;
