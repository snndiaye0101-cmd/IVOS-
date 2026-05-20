import React, { useState } from 'react';
import {
  Bell,
  Save,
  Wrench,
  FileCheck,
  Fuel,
  TrendingUp,
  AlertTriangle,
  Timer,
} from 'lucide-react';

const KEY = 'ivos_alert_thresholds_v1';

interface Thresholds {
  maintenanceKm: number;
  docValidityDays: number;
  fuelStockPercent: number;
  tireWearPercent: number;
  insuranceAlertDays: number;
  controleTechniqueDays: number;
}

const DEFAULTS: Thresholds = {
  maintenanceKm: 5000,
  docValidityDays: 30,
  fuelStockPercent: 20,
  tireWearPercent: 80,
  insuranceAlertDays: 45,
  controleTechniqueDays: 30,
};

function loadThresholds(): Thresholds {
  const raw = localStorage.getItem(KEY);
  if (!raw) return DEFAULTS;
  return JSON.parse(raw);
}
function saveThresholds(t: Thresholds) {
  localStorage.setItem(KEY, JSON.stringify(t));
}

export default function AlertThresholdsPage() {
  const [th, setTh] = useState<Thresholds>(loadThresholds);
  const [saved, setSaved] = useState(false);

  const update = (field: keyof Thresholds, value: string) =>
    setTh((prev) => ({ ...prev, [field]: Number(value) || 0 }));

  function handleSave() {
    saveThresholds(th);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const cards: {
    label: string;
    field: keyof Thresholds;
    unit: string;
    icon: React.ReactNode;
    gradient: string;
    description: string;
    min: number;
    max?: number;
  }[] = [
    {
      label: 'Maintenance',
      field: 'maintenanceKm',
      unit: 'km',
      icon: <Wrench className="h-5 w-5" />,
      gradient: 'from-blue-500 to-blue-700',
      description: 'Kilométrage avant alerte maintenance préventive',
      min: 0,
    },
    {
      label: 'Validité Documents',
      field: 'docValidityDays',
      unit: 'jours',
      icon: <FileCheck className="h-5 w-5" />,
      gradient: 'from-indigo-500 to-indigo-700',
      description: 'Jours avant expiration des documents véhicules',
      min: 0,
    },
    {
      label: 'Stock Carburant',
      field: 'fuelStockPercent',
      unit: '%',
      icon: <Fuel className="h-5 w-5" />,
      gradient: 'from-yellow-500 to-yellow-700',
      description: 'Seuil minimum du stock de carburant',
      min: 0,
      max: 100,
    },
    {
      label: 'Usure Pneus',
      field: 'tireWearPercent',
      unit: '%',
      icon: <TrendingUp className="h-5 w-5" />,
      gradient: 'from-orange-500 to-orange-700',
      description: "Pourcentage d'usure avant remplacement",
      min: 0,
      max: 100,
    },
    {
      label: 'Assurance',
      field: 'insuranceAlertDays',
      unit: 'jours',
      icon: <AlertTriangle className="h-5 w-5" />,
      gradient: 'from-red-500 to-red-700',
      description: "Jours avant expiration de l'assurance",
      min: 0,
    },
    {
      label: 'Contrôle Technique',
      field: 'controleTechniqueDays',
      unit: 'jours',
      icon: <Timer className="h-5 w-5" />,
      gradient: 'from-green-500 to-green-700',
      description: 'Jours avant échéance du contrôle technique',
      min: 0,
    },
  ];

  return (
    <div className="min-h-screen w-full">
      <div className="mb-6 flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
            <Bell className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Seuils d'Alertes</h1>
            <p className="text-sm text-gray-300">
              Configuration des seuils de notification et d'alerte
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-md transition-all ${saved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          <Save className="h-4 w-4" />
          {saved ? 'Enregistré !' : 'Sauvegarder'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.field} className="overflow-hidden rounded-2xl bg-white shadow-md">
            <div className="p-5">
              <div className="mb-3 flex items-center gap-3">
                <div
                  className={`h-10 w-10 rounded-xl bg-gradient-to-br ${c.gradient} flex shrink-0 items-center justify-center text-white`}
                >
                  {c.icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{c.label}</h3>
                  <p className="text-[11px] text-gray-500">{c.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={c.min}
                  max={c.max}
                  value={th[c.field]}
                  onChange={(e) => update(c.field, e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-center text-lg font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <span className="w-12 shrink-0 text-sm font-semibold text-gray-500">{c.unit}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
