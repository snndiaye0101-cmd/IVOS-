import { AlertTriangle, Shield } from 'lucide-react';

type ModuleTab = 'sinistres' | 'assurances';

type FleetModuleTabsProps = {
  moduleTab: ModuleTab;
  onChange: (tab: ModuleTab) => void;
  openSinistresCount: number;
  assuranceAlertsCount: number;
};

export default function FleetModuleTabs({
  moduleTab,
  onChange,
  openSinistresCount,
  assuranceAlertsCount,
}: FleetModuleTabsProps) {
  return (
    <div className="flex w-fit gap-1 rounded-xl bg-gray-100 p-1">
      <button
        onClick={() => onChange('sinistres')}
        className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${moduleTab === 'sinistres' ? 'bg-white text-[#1a1a2e] shadow-sm' : 'text-gray-500 hover:bg-white/50 hover:text-gray-700'}`}
      >
        <AlertTriangle className="h-4 w-4 text-red-500" />
        Sinistres
        {openSinistresCount > 0 && (
          <span className="ml-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {openSinistresCount}
          </span>
        )}
      </button>
      <button
        onClick={() => onChange('assurances')}
        className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${moduleTab === 'assurances' ? 'bg-white text-[#1a1a2e] shadow-sm' : 'text-gray-500 hover:bg-white/50 hover:text-gray-700'}`}
      >
        <Shield className="h-4 w-4 text-indigo-500" />
        Assurances
        {assuranceAlertsCount > 0 && (
          <span className="ml-1 rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {assuranceAlertsCount}
          </span>
        )}
      </button>
    </div>
  );
}
