import { AlertTriangle, Shield } from 'lucide-react'

type ModuleTab = 'sinistres' | 'assurances'

type FleetModuleTabsProps = {
  moduleTab: ModuleTab
  onChange: (tab: ModuleTab) => void
  openSinistresCount: number
  assuranceAlertsCount: number
}

export default function FleetModuleTabs({
  moduleTab,
  onChange,
  openSinistresCount,
  assuranceAlertsCount,
}: FleetModuleTabsProps) {
  return (
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
      <button
        onClick={() => onChange('sinistres')}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${moduleTab === 'sinistres' ? 'bg-white text-[#1a1a2e] shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'}`}
      >
        <AlertTriangle className="w-4 h-4 text-red-500" />
        Sinistres
        {openSinistresCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">{openSinistresCount}</span>
        )}
      </button>
      <button
        onClick={() => onChange('assurances')}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${moduleTab === 'assurances' ? 'bg-white text-[#1a1a2e] shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'}`}
      >
        <Shield className="w-4 h-4 text-indigo-500" />
        Assurances
        {assuranceAlertsCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded-full">{assuranceAlertsCount}</span>
        )}
      </button>
    </div>
  )
}
