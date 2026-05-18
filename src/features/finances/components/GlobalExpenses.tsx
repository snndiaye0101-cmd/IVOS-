import React, { useState } from "react";
import { formatCleanAmount } from '../../../shared/utils/formatAmount';

const daily = [
  { label: "Péages", value: 12000 },
  { label: "Carburant", value: 35000 },
];
const monthly = [
  { label: "Salaires", value: 4200000 },
  { label: "Loyer", value: 800000 },
];
const yearly = [
  { label: "Assurances", value: 2500000 },
];

const tabs = ["Journalier", "Mensuel", "Annuel"];

const dataMap = [daily, monthly, yearly];

const GlobalExpenses: React.FC = () => {
  const [tab, setTab] = useState(0);
  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow border border-slate-200">
      <div className="flex gap-2 mb-6">
        {tabs.map((t, idx) => (
          <button
            key={t}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${tab === idx ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500 hover:bg-emerald-50"}`}
            onClick={() => setTab(idx)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dataMap[tab].map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-3 p-4 rounded-lg border shadow-sm ${item.label === "Salaires" ? "border-amber-300 bg-amber-50" : "border-slate-100 bg-slate-50"}`}
          >
            <div className={`w-3 h-3 rounded-full ${item.label === "Salaires" ? "bg-amber-400" : "bg-emerald-400"}`} />
            <div className="flex-1">
              <div className="text-xs text-slate-500">{item.label}</div>
              <div className={`text-lg font-semibold ${item.label === "Salaires" ? "text-amber-700" : "text-slate-800"}`}>{formatCleanAmount(item.value, 'FCFA')}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GlobalExpenses;
