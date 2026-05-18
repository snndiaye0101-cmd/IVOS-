import { AlertTriangle, Droplets, FileCheck, ShieldAlert } from 'lucide-react';
import type { Vehicle } from '../services/vehiclesStore';

// Use the canonical `Vehicle` type from the fleet store; local helpers remain below.

export interface Alert {
  type: 'vidange' | 'ct' | 'assurance';
  priority: 'danger' | 'warning' | 'info';
  message: string;
  days: number;
}

// Fonction utilitaire pour calculer les alertes critiques d'un véhicule
export function checkVehicleAlerts(vehicle: Vehicle): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date('2026-04-09');

  // Vidange : tous les 10 000 km ou 6 mois
  if (vehicle.lastOilChange && vehicle.mileage && vehicle.nextOilChange) {
    const lastOilDate = new Date(vehicle.lastOilChange);
    const nextOilDate = new Date(vehicle.nextOilChange);
    const kmSinceLast = vehicle.mileage - ((vehicle as any).lastOilMileage || (vehicle.mileage - 10000));
    const monthsSinceLast = (now.getFullYear() - lastOilDate.getFullYear()) * 12 + (now.getMonth() - lastOilDate.getMonth());
    const days = Math.ceil((nextOilDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
    if (kmSinceLast >= 10000 || monthsSinceLast >= 6) {
      alerts.push({
        type: 'vidange',
        priority: 'danger',
        message: `Vidange en retard (${kmSinceLast} km, ${monthsSinceLast} mois)`,
        days: days
      });
    } else if (days <= 15) {
      alerts.push({
        type: 'vidange',
        priority: 'warning',
        message: `Vidange à prévoir avant le ${nextOilDate.toLocaleDateString('fr-FR')}`,
        days: days
      });
    }
  }

  // Visite technique
  if (vehicle.technicalControlExpiry) {
    const ctDate = new Date(vehicle.technicalControlExpiry);
    const days = Math.ceil((ctDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
    if (days < 0) {
      alerts.push({ type: 'ct', priority: 'danger', message: `Visite technique expirée le ${ctDate.toLocaleDateString('fr-FR')}`, days });
    } else if (days <= 15) {
      alerts.push({ type: 'ct', priority: 'warning', message: `Visite technique à renouveler sous ${days} jours`, days });
    }
  }

  // Assurance
  if (vehicle.insuranceExpiry) {
    const insDate = new Date(vehicle.insuranceExpiry);
    const days = Math.ceil((insDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
    if (days < 0) {
      alerts.push({ type: 'assurance', priority: 'danger', message: `Assurance expirée le ${insDate.toLocaleDateString('fr-FR')}`, days });
    } else if (days <= 10) {
      alerts.push({ type: 'assurance', priority: 'warning', message: `Assurance à renouveler sous ${days} jours`, days });
    }
  }

  return alerts;
}

// Composant AlertCards
interface AlertCardsProps {
  vehicles: Vehicle[];
  currentSite: { code: string } | null;
  onEdit: (v: Vehicle) => void;
}

export function AlertCards({ vehicles, currentSite, onEdit }: AlertCardsProps) {
  const filtered = vehicles.filter((v: Vehicle) => !currentSite || v.siteCode === currentSite.code);
  const allAlerts = filtered.flatMap((vehicle: Vehicle) =>
    checkVehicleAlerts(vehicle).map((alert: Alert) => ({
      ...alert,
      vehicle,
      // Génère une clé unique pour chaque alerte : type + véhicule + date d'échéance si dispo
      _key: `${vehicle.id}-${alert.type}-${alert.days ?? ''}`
    }))
  );
  if (allAlerts.length === 0) return null;
  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4 text-red-700 flex items-center gap-2">
        <AlertTriangle className="h-6 w-6 animate-pulse text-red-700" />
        Alertes Critiques
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {allAlerts.map((alert) => {
          let color = '';
          let Icon = AlertTriangle;
          if (alert.type === 'vidange') { Icon = Droplets; }
          if (alert.type === 'ct') { Icon = FileCheck; }
          if (alert.type === 'assurance') { Icon = ShieldAlert; }
          if (alert.priority === 'danger') color = 'bg-red-100 border-red-400 animate-pulse';
          else if (alert.priority === 'warning') color = 'bg-orange-100 border-orange-400';
          else color = 'bg-blue-50 border-blue-900';
          return (
            <div key={alert._key} className={`border-l-8 ${color} rounded-xl p-4 flex items-center gap-4 shadow`}>
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-white border border-gray-200">
                <Icon className={`h-8 w-8 ${alert.priority === 'danger' ? 'text-red-700' : alert.priority === 'warning' ? 'text-orange-700' : 'text-blue-900'}`} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-lg text-gray-900">{alert.vehicle.registration} <span className="text-xs text-gray-500">({alert.vehicle.brand} {alert.vehicle.model})</span></div>
                <div className="text-sm text-gray-700 mb-1">{alert.message}</div>
                <button
                  className="mt-1 px-3 py-1 rounded bg-blue-900 text-white text-xs font-semibold hover:bg-blue-700 transition"
                  onClick={() => onEdit(alert.vehicle)}
                >
                  Mettre à jour
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
