import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Wallet, TrendingDown, Calendar } from 'lucide-react';

const expenseData = [
  { label: 'Carburant', value: 12000 },
  { label: 'Maintenance', value: 8000 },
  { label: 'Salaires', value: 20000 },
];

const summary = {
  total: 40000,
  variation: -5.2, // en %
};

const tabs = [{ label: 'Jour' }, { label: 'Mois' }, { label: 'Année' }];

const ExpenseAnalytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState(1); // 0: Jour, 1: Mois, 2: Année

  return (
    <div className="mx-auto w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow">
      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        {tabs.map((tab, idx) => (
          <button
            key={tab.label}
            className={`flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition-colors
              ${activeTab === idx ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500 hover:bg-emerald-50'}`}
            onClick={() => setActiveTab(idx)}
          >
            <Calendar className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bar Chart */}
      <div className="mb-6 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={expenseData} barCategoryGap={32}>
            <XAxis
              dataKey="label"
              stroke="#334155"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis stroke="#334155" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: '#f1f5f9' }}
              formatter={(v: number) => `${v.toLocaleString()} €`}
            />
            <Legend />
            <Bar dataKey="value" name="Dépenses" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4">
          <Wallet className="h-6 w-6 text-emerald-600" />
          <div>
            <div className="text-xs text-slate-500">Total Dépenses Période</div>
            <div className="text-lg font-semibold text-slate-800">
              {summary.total.toLocaleString()} €
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4">
          <TrendingDown className="h-6 w-6 text-emerald-600" />
          <div>
            <div className="text-xs text-slate-500">Variation vs Période Précédente</div>
            <div
              className={`text-lg font-semibold ${summary.variation < 0 ? 'text-emerald-700' : 'text-slate-800'}`}
            >
              {summary.variation}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseAnalytics;
