import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { formatCleanAmount } from '../../../utils/formatCleanAmount';
import {
  Search,
  Truck,
  Car,
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye,
  ChevronDown,
  ChevronUp,
  X,
  Camera,
  History,
  Trash2,
  Wrench,
  Activity,
  CalendarPlus,
  Calendar,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  vehiclesStore,
  maintenancePlansStore,
  type MaintenancePlan,
  type Vehicle,
} from '../services/vehiclesStore';
import { personalVehiclesStore } from '../services/personalVehiclesStore';
import { driversStore } from '../services/driversStore';
import { personnelStore, type PersonnelAgent } from '../services/personnelStore';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Textarea from '../../../components/ui/Textarea';

interface BreakdownVehicle {
  id: string;
  registration: string;
  brand: string;
  model: string;
  type: string;
  year: number;
  mileage: number;
  fuelType: string;
  status: string;
  source: 'parc' | 'personnel';
  assignedDriver?: string;
  agentName?: string;
  insuranceExpiry?: string;
  technicalControlExpiry?: string;
  lastMaintenance?: string;
  breakdownDate: string;
  breakdownDescription: string;
  breakdownType: 'Moteur' | 'Pneumatique' | 'Hydraulique' | 'Électrique' | 'Freinage' | 'Autre';
  urgency: 'Faible' | 'Critique' | 'Immobilisation Totale';
  estimatedCost: number;
  mechanic: string;
  location: string;
  notes: string;
  driverName: string;
  driverPhone: string;
  mechanicName: string;
  mechanicPhone: string;
  mechanicSpecialization: string;
  photos: string[];
}

const BREAKDOWN_TYPES = [
  'Moteur',
  'Pneumatique',
  'Hydraulique',
  'Électrique',
  'Freinage',
  'Autre',
] as const;

type UrgencyLevel = 'Faible' | 'Critique' | 'Immobilisation Totale';

const BREAKDOWN_STORE_KEY = 'ivos_breakdowns_v1';
const HISTORY_STORE_KEY = 'ivos_breakdowns_history_v1';

interface ResolvedBreakdown extends BreakdownVehicle {
  resolvedDate: string;
  repairDuration: number;
}

function loadBreakdowns(): BreakdownVehicle[] {
  try {
    const raw = localStorage.getItem(BREAKDOWN_STORE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveBreakdowns(breakdowns: BreakdownVehicle[]) {
  try {
    localStorage.setItem(BREAKDOWN_STORE_KEY, JSON.stringify(breakdowns));
    window.dispatchEvent(new Event('ivos_maintenance_change'));
  } catch {}
}

export function getActiveBreakdownCount(): number {
  try {
    const raw = localStorage.getItem(BREAKDOWN_STORE_KEY);
    if (!raw) return 0;
    return JSON.parse(raw).length;
  } catch {
    return 0;
  }
}

function loadHistory(): ResolvedBreakdown[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveHistory(history: ResolvedBreakdown[]) {
  try {
    localStorage.setItem(HISTORY_STORE_KEY, JSON.stringify(history));
  } catch {}
}

export default function MaintenancePage() {
  const [breakdowns, setBreakdowns] = useState<BreakdownVehicle[]>(() => loadBreakdowns());
  const [history, setHistory] = useState<ResolvedBreakdown[]>(() => loadHistory());
  const [activeTab, setActiveTab] = useState<'active' | 'history' | 'alertes'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedBreakdown, setSelectedBreakdown] = useState<BreakdownVehicle | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isViewPlansOpen, setIsViewPlansOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [plans, setPlans] = useState<MaintenancePlan[]>(() => maintenancePlansStore.load());
  const [planForm, setPlanForm] = useState({
    scheduledDate: '',
    mechanic: '',
    estimatedCost: 0,
    notes: '',
  });
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [breakdownPhotos, setBreakdownPhotos] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [fleetVehicles, setFleetVehicles] = useState<Vehicle[]>([]);
  const [personalVehicles, setPersonalVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [chauffeurs, setChauffeurs] = useState<PersonnelAgent[]>([]);

  const [form, setForm] = useState({
    breakdownDate: new Date().toISOString().split('T')[0],
    breakdownDescription: '',
    breakdownType: 'Moteur' as BreakdownVehicle['breakdownType'],
    urgency: 'Faible' as BreakdownVehicle['urgency'],
    estimatedCost: 0,
    mechanic: '',
    location: '',
    notes: '',
    driverName: '',
    driverPhone: '',
    mechanicName: '',
    mechanicPhone: '',
    mechanicSpecialization: '',
  });

  const loadVehicles = useCallback(() => {
    setFleetVehicles(vehiclesStore.load());
    setPersonalVehicles(personalVehiclesStore.load() as any);
    setDrivers(driversStore.load() as any);
    setChauffeurs(personnelStore.load().filter((a) => a.role === 'Chauffeurs'));
    // Load mechanics from localStorage (same key as MechanicsPage)
    try {
      const raw = localStorage.getItem('ivos_mechanics_v1');
      if (raw) setMechanics(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    loadVehicles();
    const handleFleetUpdate = () => setFleetVehicles(vehiclesStore.load());
    const handlePersonalUpdate = () => setPersonalVehicles(personalVehiclesStore.load() as any);
    const handlePersonnelUpdate = () =>
      setChauffeurs(personnelStore.load().filter((a) => a.role === 'Chauffeurs'));
    window.addEventListener('fleetVehicles:updated', handleFleetUpdate);
    window.addEventListener('personalVehicles:updated', handlePersonalUpdate);
    window.addEventListener('personnel:updated', handlePersonnelUpdate);
    return () => {
      window.removeEventListener('fleetVehicles:updated', handleFleetUpdate);
      window.removeEventListener('personalVehicles:updated', handlePersonalUpdate);
      window.removeEventListener('personnel:updated', handlePersonnelUpdate);
    };
  }, [loadVehicles]);

  useEffect(() => {
    saveBreakdowns(breakdowns);
  }, [breakdowns]);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  // Combine all vehicles for the add modal dropdown, excluding already in breakdown
  const breakdownIds = new Set(breakdowns.map((b) => b.id));
  const availableVehicles = [
    ...fleetVehicles
      .filter((v: any) => !breakdownIds.has(v.id))
      .map((v: any) => ({
        id: v.id,
        label: `[Parc] ${v.registration} — ${v.brand} ${v.model}`,
        source: 'parc' as const,
        data: v,
      })),
    ...personalVehicles
      .filter((v: any) => !breakdownIds.has(v.id))
      .map((v: any) => ({
        id: v.id,
        label: `[Fonction] ${v.registration} — ${v.brand} ${v.model}`,
        source: 'personnel' as const,
        data: v,
      })),
  ];

  const resetForm = () => {
    setForm({
      breakdownDate: new Date().toISOString().split('T')[0],
      breakdownDescription: '',
      breakdownType: 'Moteur',
      urgency: 'Faible' as BreakdownVehicle['urgency'],
      estimatedCost: 0,
      mechanic: '',
      location: '',
      notes: '',
      driverName: '',
      driverPhone: '',
      mechanicName: '',
      mechanicPhone: '',
      mechanicSpecialization: '',
    });
    setSelectedVehicleId('');
    setBreakdownPhotos([]);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name}: format non supporté`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}: trop volumineux (max 10 Mo)`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setBreakdownPhotos((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleAddBreakdown = (e: React.FormEvent) => {
    e.preventDefault();
    const veh = availableVehicles.find((v) => v.id === selectedVehicleId);
    if (!veh) {
      toast.error('Veuillez sélectionner un véhicule');
      return;
    }

    const newBreakdown: BreakdownVehicle = {
      id: veh.data.id,
      registration: veh.data.registration,
      brand: veh.data.brand,
      model: veh.data.model,
      type: veh.data.type || '—',
      year: veh.data.year || 0,
      mileage: veh.data.mileage || 0,
      fuelType: veh.data.fuelType || '—',
      status: 'Maintenance',
      source: veh.source,
      assignedDriver: veh.data.assignedDriver,
      agentName: veh.data.agentName,
      insuranceExpiry: veh.data.insuranceExpiry,
      technicalControlExpiry: veh.data.technicalControlExpiry,
      lastMaintenance: veh.data.lastMaintenance,
      breakdownDate: form.breakdownDate,
      breakdownDescription: form.breakdownDescription,
      breakdownType: form.breakdownType,
      urgency: form.urgency,
      estimatedCost: form.estimatedCost,
      mechanic: form.mechanic,
      location: form.location,
      notes: form.notes,
      driverName: form.driverName,
      driverPhone: form.driverPhone,
      mechanicName: form.mechanicName,
      mechanicPhone: form.mechanicPhone,
      mechanicSpecialization: form.mechanicSpecialization,
      photos: breakdownPhotos,
    };

    // Update the vehicle status to 'Maintenance' or 'Inactif' in original store
    if (veh.source === 'parc') {
      const updated = fleetVehicles.map((v: any) =>
        v.id === veh.data.id ? { ...v, status: 'Maintenance' } : v
      );
      vehiclesStore.save(updated);
      setFleetVehicles(updated);
    } else {
      const updated = personalVehicles.map((v: any) =>
        v.id === veh.data.id ? { ...v, status: 'Inactif' } : v
      );
      personalVehiclesStore.save(updated);
      setPersonalVehicles(updated);
    }

    setBreakdowns((prev) => [...prev, newBreakdown]);
    toast.success(`${veh.data.registration} déclaré en panne`);
    setIsAddModalOpen(false);
    resetForm();
  };

  const handleResolveBreakdown = (breakdown: BreakdownVehicle) => {
    // Move to history
    const days = getDaysSinceBreakdown(breakdown.breakdownDate);
    const resolved: ResolvedBreakdown = {
      ...breakdown,
      status: 'Résolu',
      resolvedDate: new Date().toISOString().split('T')[0],
      repairDuration: days,
    };
    setHistory((prev) => [resolved, ...prev]);

    // Remove from active breakdowns
    setBreakdowns((prev) => prev.filter((b) => b.id !== breakdown.id));

    // Set vehicle status back to available
    if (breakdown.source === 'parc') {
      const updated = fleetVehicles.map((v: any) =>
        v.id === breakdown.id ? { ...v, status: 'Disponible' } : v
      );
      vehiclesStore.save(updated);
      setFleetVehicles(updated);
    } else {
      const updated = personalVehicles.map((v: any) =>
        v.id === breakdown.id ? { ...v, status: 'Actif' } : v
      );
      personalVehiclesStore.save(updated);
      setPersonalVehicles(updated);
    }

    toast.success(`${breakdown.registration} — panne réglée, véhicule disponible !`);
    if (isViewModalOpen) {
      setIsViewModalOpen(false);
      setSelectedBreakdown(null);
    }
  };

  const filteredBreakdowns = breakdowns.filter((b) => {
    const matchesSearch =
      searchTerm === '' ||
      b.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.breakdownDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.mechanic && b.mechanic.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = filterType === 'all' || b.breakdownType === filterType;
    const matchesSource = filterSource === 'all' || b.source === filterSource;

    return matchesSearch && matchesType && matchesSource;
  });

  const filteredHistory = history.filter((b) => {
    const matchesSearch =
      searchTerm === '' ||
      b.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.breakdownDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.mechanic && b.mechanic.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = filterType === 'all' || b.breakdownType === filterType;
    const matchesSource = filterSource === 'all' || b.source === filterSource;

    return matchesSearch && matchesType && matchesSource;
  });

  const handleDeleteHistory = (id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
    toast.success("Entrée supprimée de l'historique");
    if (isViewModalOpen) {
      setIsViewModalOpen(false);
      setSelectedBreakdown(null);
    }
  };

  // ── Maintenance Alerts ──
  const maintenanceAlerts = useMemo(() => {
    const alerts: Array<{
      id: string;
      vehicle: string;
      brand: string;
      model: string;
      type: string;
      dueDate: string;
      priority: 'critical' | 'high' | 'medium';
      km: string;
      source: 'parc' | 'personnel';
      details: string;
      daysLeft: number;
      lastMaintenance?: string;
      assignedDriver?: string;
    }> = [];
    const now = new Date();
    const fleet = vehiclesStore.load();
    for (const v of fleet) {
      if (v.insuranceExpiry) {
        const days = Math.ceil((new Date(v.insuranceExpiry).getTime() - now.getTime()) / 864e5);
        if (days <= 30)
          alerts.push({
            id: `fleet-ins-${v.id}`,
            vehicle: v.registration,
            brand: v.brand || '',
            model: v.model || '',
            type: 'Assurance',
            dueDate: v.insuranceExpiry,
            priority: days <= 0 ? 'critical' : days <= 7 ? 'high' : 'medium',
            km: v.mileage ? `${v.mileage.toLocaleString()} km` : '-',
            source: 'parc',
            details:
              days <= 0
                ? `Assurance expirée depuis ${Math.abs(days)} jours`
                : `Expire dans ${days} jours`,
            daysLeft: days,
            assignedDriver: v.assignedDriver,
          });
      }
      if (v.technicalControlExpiry) {
        const days = Math.ceil(
          (new Date(v.technicalControlExpiry).getTime() - now.getTime()) / 864e5
        );
        if (days <= 30)
          alerts.push({
            id: `fleet-ct-${v.id}`,
            vehicle: v.registration,
            brand: v.brand || '',
            model: v.model || '',
            type: 'Contrôle technique',
            dueDate: v.technicalControlExpiry,
            priority: days <= 0 ? 'critical' : days <= 7 ? 'high' : 'medium',
            km: v.mileage ? `${v.mileage.toLocaleString()} km` : '-',
            source: 'parc',
            details:
              days <= 0 ? `CT expiré depuis ${Math.abs(days)} jours` : `Expire dans ${days} jours`,
            daysLeft: days,
            assignedDriver: v.assignedDriver,
          });
      }
      if (v.nextOilChange) {
        const days = Math.ceil((new Date(v.nextOilChange).getTime() - now.getTime()) / 864e5);
        if (days <= 15)
          alerts.push({
            id: `fleet-oil-${v.id}`,
            vehicle: v.registration,
            brand: v.brand || '',
            model: v.model || '',
            type: 'Vidange moteur',
            dueDate: v.nextOilChange,
            priority: days <= 0 ? 'critical' : days <= 5 ? 'high' : 'medium',
            km: v.mileage ? `${v.mileage.toLocaleString()} km` : '-',
            source: 'parc',
            details:
              days <= 0
                ? `Vidange en retard de ${Math.abs(days)} jours`
                : `Prévue dans ${days} jours`,
            daysLeft: days,
            lastMaintenance: v.lastOilChange,
            assignedDriver: v.assignedDriver,
          });
      }
      if (v.maintenanceHistory) {
        for (const m of v.maintenanceHistory) {
          if (m.nextDue) {
            const days = Math.ceil((new Date(m.nextDue).getTime() - now.getTime()) / 864e5);
            if (days <= 15)
              alerts.push({
                id: `fleet-maint-${v.id}-${m.id}`,
                vehicle: v.registration,
                brand: v.brand || '',
                model: v.model || '',
                type: m.type,
                dueDate: m.nextDue,
                priority: days <= 0 ? 'critical' : days <= 5 ? 'high' : 'medium',
                km: v.mileage ? `${v.mileage.toLocaleString()} km` : '-',
                source: 'parc',
                details:
                  days <= 0
                    ? `${m.type} en retard de ${Math.abs(days)} jours`
                    : `${m.type} prévue dans ${days} jours`,
                daysLeft: days,
                lastMaintenance: m.date,
                assignedDriver: v.assignedDriver,
              });
          }
        }
      }
    }
    const personal = personalVehiclesStore.load();
    for (const v of personal) {
      if (v.insuranceExpiry) {
        const days = Math.ceil((new Date(v.insuranceExpiry).getTime() - now.getTime()) / 864e5);
        if (days <= 30)
          alerts.push({
            id: `pers-ins-${v.id}`,
            vehicle: v.registration,
            brand: v.brand || '',
            model: v.model || '',
            type: 'Assurance',
            dueDate: v.insuranceExpiry,
            priority: days <= 0 ? 'critical' : days <= 7 ? 'high' : 'medium',
            km: v.mileage ? `${v.mileage.toLocaleString()} km` : '-',
            source: 'personnel',
            details:
              days <= 0
                ? `Assurance expirée depuis ${Math.abs(days)} jours`
                : `Expire dans ${days} jours`,
            daysLeft: days,
            assignedDriver: v.agentName,
          });
      }
      if (v.technicalControlExpiry) {
        const days = Math.ceil(
          (new Date(v.technicalControlExpiry).getTime() - now.getTime()) / 864e5
        );
        if (days <= 30)
          alerts.push({
            id: `pers-ct-${v.id}`,
            vehicle: v.registration,
            brand: v.brand || '',
            model: v.model || '',
            type: 'Contrôle technique',
            dueDate: v.technicalControlExpiry,
            priority: days <= 0 ? 'critical' : days <= 7 ? 'high' : 'medium',
            km: v.mileage ? `${v.mileage.toLocaleString()} km` : '-',
            source: 'personnel',
            details:
              days <= 0 ? `CT expiré depuis ${Math.abs(days)} jours` : `Expire dans ${days} jours`,
            daysLeft: days,
            assignedDriver: v.agentName,
          });
      }
      if (v.maintenanceHistory) {
        for (const m of v.maintenanceHistory) {
          if (m.nextDue) {
            const days = Math.ceil((new Date(m.nextDue).getTime() - now.getTime()) / 864e5);
            if (days <= 15)
              alerts.push({
                id: `pers-maint-${v.id}-${m.id}`,
                vehicle: v.registration,
                brand: v.brand || '',
                model: v.model || '',
                type: m.type,
                dueDate: m.nextDue,
                priority: days <= 0 ? 'critical' : days <= 5 ? 'high' : 'medium',
                km: v.mileage ? `${v.mileage.toLocaleString()} km` : '-',
                source: 'personnel',
                details:
                  days <= 0
                    ? `${m.type} en retard de ${Math.abs(days)} jours`
                    : `${m.type} prévue dans ${days} jours`,
                daysLeft: days,
                lastMaintenance: m.date,
                assignedDriver: v.agentName,
              });
          }
        }
      }
    }
    const priorityOrder = { critical: 0, high: 1, medium: 2 };
    alerts.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || a.daysLeft - b.daysLeft
    );
    return alerts;
  }, [fleetVehicles, personalVehicles]);

  // Resolved alerts tracking
  const [resolvedAlertIds, setResolvedAlertIds] = useState<string[]>(() => {
    try {
      const r = localStorage.getItem('ivos_resolved_alerts_v1');
      return r ? JSON.parse(r) : [];
    } catch {
      return [];
    }
  });
  const activeAlerts = useMemo(
    () => maintenanceAlerts.filter((a) => !resolvedAlertIds.includes(a.id)),
    [maintenanceAlerts, resolvedAlertIds]
  );

  const handleResolveAlert = useCallback((alertId: string) => {
    setResolvedAlertIds((prev) => {
      const next = [...prev, alertId];
      localStorage.setItem('ivos_resolved_alerts_v1', JSON.stringify(next));
      return next;
    });
    toast.success('Alerte marquée comme résolue');
  }, []);

  const criticalCount = activeAlerts.filter((a) => a.priority === 'critical').length;
  const highCount = activeAlerts.filter((a) => a.priority === 'high').length;

  const getAlertPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const openPlanModal = (alert: any) => {
    setSelectedAlert(alert);
    setPlanForm({ scheduledDate: '', mechanic: '', estimatedCost: 0, notes: '' });
    setIsPlanModalOpen(true);
  };

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert) return;
    const plan: MaintenancePlan = {
      id: Date.now().toString(),
      vehicleRegistration: selectedAlert.vehicle,
      vehicleBrand: selectedAlert.brand,
      vehicleModel: selectedAlert.model,
      vehicleSource: selectedAlert.source,
      alertType: selectedAlert.type,
      description: selectedAlert.details,
      scheduledDate: planForm.scheduledDate,
      mechanic: planForm.mechanic,
      estimatedCost: planForm.estimatedCost,
      status: 'Planifié',
      notes: planForm.notes,
      createdAt: new Date().toISOString(),
    };
    maintenancePlansStore.add(plan);
    setPlans(maintenancePlansStore.load());
    setIsPlanModalOpen(false);
    setSelectedAlert(null);
    toast.success(`Maintenance planifiée pour ${selectedAlert.vehicle}`);
  };

  const handleUpdatePlanStatus = (planId: string, status: MaintenancePlan['status']) => {
    maintenancePlansStore.update(planId, { status });
    setPlans(maintenancePlansStore.load());
    toast.success(`Statut mis à jour: ${status}`);
  };

  const handleDeletePlan = (planId: string) => {
    maintenancePlansStore.remove(planId);
    setPlans(maintenancePlansStore.load());
    toast.success('Planification supprimée');
  };

  const getPlanForAlert = (alertId: string) => {
    const alert = maintenanceAlerts.find((a) => a.id === alertId);
    if (!alert) return undefined;
    return plans.find(
      (p) =>
        p.vehicleRegistration === alert.vehicle &&
        p.alertType === alert.type &&
        p.status !== 'Annulé'
    );
  };

  const getBreakdownTypeColor = (type: string) => {
    switch (type) {
      case 'Moteur':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Pneumatique':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Hydraulique':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'Électrique':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Freinage':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'Critique':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Immobilisation Totale':
        return 'bg-gray-900 text-white border-gray-800';
      default:
        return 'bg-orange-100 text-orange-800 border-orange-200';
    }
  };

  const getDaysSinceBreakdown = (date: string) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#1a1a2e] via-red-900 to-red-800 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/15 p-2.5 backdrop-blur-sm">
              <Wrench className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Maintenance — Véhicules en Panne
              </h1>
              <p className="mt-0.5 text-sm text-red-200">
                Suivi des pannes, réparations et alertes techniques
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="flex animate-pulse items-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:animate-none hover:bg-red-400 hover:shadow-lg active:scale-[0.97]"
          >
            <AlertTriangle className="h-5 w-5" />
            Déclarer une Panne
          </button>
        </div>
      </div>

      {/* Tabs */}
      {/* Tabs */}
      <div className="flex w-fit gap-1 rounded-xl bg-gray-100 p-1">
        <button
          onClick={() => setActiveTab('active')}
          className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
            activeTab === 'active'
              ? 'bg-[#1a1a2e] text-white shadow-md'
              : 'text-gray-500 hover:bg-white/60 hover:text-gray-700'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          En panne ({breakdowns.length})
        </button>
        <button
          onClick={() => setActiveTab('alertes')}
          className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
            activeTab === 'alertes'
              ? 'bg-[#1a1a2e] text-white shadow-md'
              : 'text-gray-500 hover:bg-white/60 hover:text-gray-700'
          }`}
        >
          <Shield className="h-4 w-4" />
          Alertes ({activeAlerts.length})
          {criticalCount > 0 && (
            <span className="animate-pulse rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {criticalCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
            activeTab === 'history'
              ? 'bg-[#1a1a2e] text-white shadow-md'
              : 'text-gray-500 hover:bg-white/60 hover:text-gray-700'
          }`}
        >
          <History className="h-4 w-4" />
          Historique ({history.length})
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {activeTab === 'active' && (
          <>
            <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-md">
              <div className="absolute bottom-0 left-0 top-0 w-1.5 rounded-l-2xl bg-gradient-to-b from-red-500 to-red-600" />
              <div className="ml-2 flex items-center gap-3">
                <div className="rounded-xl bg-red-100 p-2.5">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{breakdowns.length}</p>
                  <p className="text-xs font-medium text-gray-500">En panne</p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-md">
              <div className="absolute bottom-0 left-0 top-0 w-1.5 rounded-l-2xl bg-gradient-to-b from-blue-500 to-blue-600" />
              <div className="ml-2 flex items-center gap-3">
                <div className="rounded-xl bg-blue-100 p-2.5">
                  <Truck className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {breakdowns.filter((b) => b.source === 'parc').length}
                  </p>
                  <p className="text-xs font-medium text-gray-500">Véh. Parc</p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-md">
              <div className="absolute bottom-0 left-0 top-0 w-1.5 rounded-l-2xl bg-gradient-to-b from-purple-500 to-purple-600" />
              <div className="ml-2 flex items-center gap-3">
                <div className="rounded-xl bg-purple-100 p-2.5">
                  <Car className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {breakdowns.filter((b) => b.source === 'personnel').length}
                  </p>
                  <p className="text-xs font-medium text-gray-500">Véh. Personnels</p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-md">
              <div className="absolute bottom-0 left-0 top-0 w-1.5 rounded-l-2xl bg-gradient-to-b from-orange-500 to-orange-600" />
              <div className="ml-2 flex items-center gap-3">
                <div className="rounded-xl bg-orange-100 p-2.5">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {breakdowns.length > 0
                      ? Math.round(
                          breakdowns.reduce(
                            (sum, b) => sum + getDaysSinceBreakdown(b.breakdownDate),
                            0
                          ) / breakdowns.length
                        )
                      : 0}
                    j
                  </p>
                  <p className="text-xs font-medium text-gray-500">Durée moy.</p>
                </div>
              </div>
            </div>
          </>
        )}
        {activeTab === 'alertes' && (
          <>
            <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-md">
              <div className="absolute bottom-0 left-0 top-0 w-1.5 rounded-l-2xl bg-gradient-to-b from-orange-500 to-orange-600" />
              <div className="ml-2 flex items-center gap-3">
                <div className="rounded-xl bg-orange-100 p-2.5">
                  <Shield className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{activeAlerts.length}</p>
                  <p className="text-xs font-medium text-gray-500">Alertes actives</p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-md">
              <div className="absolute bottom-0 left-0 top-0 w-1.5 rounded-l-2xl bg-gradient-to-b from-red-500 to-red-600" />
              <div className="ml-2 flex items-center gap-3">
                <div className="rounded-xl bg-red-100 p-2.5">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{criticalCount}</p>
                  <p className="text-xs font-medium text-gray-500">Critiques</p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-md">
              <div className="absolute bottom-0 left-0 top-0 w-1.5 rounded-l-2xl bg-gradient-to-b from-amber-500 to-amber-600" />
              <div className="ml-2 flex items-center gap-3">
                <div className="rounded-xl bg-amber-100 p-2.5">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{highCount}</p>
                  <p className="text-xs font-medium text-gray-500">Urgents</p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-md">
              <div className="absolute bottom-0 left-0 top-0 w-1.5 rounded-l-2xl bg-gradient-to-b from-blue-500 to-blue-600" />
              <div className="ml-2 flex items-center gap-3">
                <div className="rounded-xl bg-blue-100 p-2.5">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {plans.filter((p) => p.status !== 'Annulé' && p.status !== 'Terminé').length}
                  </p>
                  <p className="text-xs font-medium text-gray-500">Planifications</p>
                </div>
              </div>
            </div>
          </>
        )}
        {activeTab === 'history' && (
          <>
            <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-md">
              <div className="absolute bottom-0 left-0 top-0 w-1.5 rounded-l-2xl bg-gradient-to-b from-green-500 to-green-600" />
              <div className="ml-2 flex items-center gap-3">
                <div className="rounded-xl bg-green-100 p-2.5">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{history.length}</p>
                  <p className="text-xs font-medium text-gray-500">Pannes résolues</p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-md">
              <div className="absolute bottom-0 left-0 top-0 w-1.5 rounded-l-2xl bg-gradient-to-b from-blue-500 to-blue-600" />
              <div className="ml-2 flex items-center gap-3">
                <div className="rounded-xl bg-blue-100 p-2.5">
                  <Truck className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {history.filter((b) => b.source === 'parc').length}
                  </p>
                  <p className="text-xs font-medium text-gray-500">Véh. Parc</p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-md">
              <div className="absolute bottom-0 left-0 top-0 w-1.5 rounded-l-2xl bg-gradient-to-b from-purple-500 to-purple-600" />
              <div className="ml-2 flex items-center gap-3">
                <div className="rounded-xl bg-purple-100 p-2.5">
                  <Car className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {history.filter((b) => b.source === 'personnel').length}
                  </p>
                  <p className="text-xs font-medium text-gray-500">Véh. Fonction</p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-md">
              <div className="absolute bottom-0 left-0 top-0 w-1.5 rounded-l-2xl bg-gradient-to-b from-emerald-500 to-emerald-600" />
              <div className="ml-2 flex items-center gap-3">
                <div className="rounded-xl bg-emerald-100 p-2.5">
                  <Clock className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {history.length > 0
                      ? Math.round(
                          history.reduce((sum, h) => sum + h.repairDuration, 0) / history.length
                        )
                      : 0}
                    j
                  </p>
                  <p className="text-xs font-medium text-gray-500">Durée moy. réparation</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Search & Filters (for active & history tabs) */}
      {activeTab !== 'alertes' && (
        <div className="rounded-2xl bg-white p-4 shadow-md">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par immatriculation, marque, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-4 text-sm focus:border-transparent focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex gap-3">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tous types</option>
                {BREAKDOWN_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tous véhicules</option>
                <option value="parc">Parc</option>
                <option value="personnel">Personnel</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Breakdown List - Active */}
      {activeTab === 'active' && (
        <>
          {filteredBreakdowns.length === 0 ? (
            <div className="rounded-2xl bg-white p-16 text-center shadow-sm">
              <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle className="h-10 w-10 text-emerald-500" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-gray-900">
                {breakdowns.length === 0 ? 'Flotte 100% Opérationnelle' : 'Aucun résultat'}
              </h3>
              <p className="mx-auto max-w-sm text-sm text-gray-400">
                {breakdowns.length === 0
                  ? 'Aucun véhicule immobilisé — Tous les véhicules sont en service et opérationnels.'
                  : 'Modifiez vos critères de recherche pour affiner les résultats.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBreakdowns.map((breakdown) => {
                const daysSince = getDaysSinceBreakdown(breakdown.breakdownDate);
                const isExpanded = expandedId === breakdown.id;
                return (
                  <div
                    key={breakdown.id}
                    className="overflow-hidden rounded-2xl bg-white shadow-md transition-shadow hover:shadow-lg"
                  >
                    <div
                      className="cursor-pointer p-5"
                      onClick={() => setExpandedId(isExpanded ? null : breakdown.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex flex-1 items-center gap-4">
                          <div className="flex-shrink-0">
                            <div
                              className={`rounded-xl p-2.5 ${breakdown.source === 'personnel' ? 'bg-purple-100' : 'bg-blue-100'}`}
                            >
                              {breakdown.source === 'personnel' ? (
                                <Car className="h-6 w-6 text-purple-600" />
                              ) : (
                                <Truck className="h-6 w-6 text-blue-600" />
                              )}
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-3">
                              <h3 className="text-base font-bold text-gray-900">
                                {breakdown.registration}
                              </h3>
                              <span className="text-sm text-gray-500">
                                {breakdown.brand} {breakdown.model}
                              </span>
                              <span
                                className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getBreakdownTypeColor(breakdown.breakdownType)}`}
                              >
                                {breakdown.breakdownType}
                              </span>
                              {breakdown.urgency && (
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getUrgencyColor(breakdown.urgency)}`}
                                >
                                  {breakdown.urgency}
                                </span>
                              )}
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs ${breakdown.source === 'personnel' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}
                              >
                                {breakdown.source === 'personnel' ? 'Personnel' : 'Parc'}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  daysSince > 14
                                    ? 'bg-red-100 text-red-800'
                                    : daysSince > 7
                                      ? 'bg-orange-100 text-orange-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {daysSince === 0
                                  ? "Aujourd'hui"
                                  : `${daysSince} jour${daysSince > 1 ? 's' : ''}`}
                              </span>
                            </div>
                            <p className="truncate text-sm text-gray-600">
                              {breakdown.breakdownDescription || 'Aucune description'}
                            </p>
                          </div>
                        </div>
                        <div className="ml-4 flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResolveBreakdown(breakdown);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Panne réglée
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBreakdown(breakdown);
                              setIsViewModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                          >
                            <Eye className="h-4 w-4" />
                            Détails
                          </button>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-5 pb-5">
                        <div className="mt-2 space-y-4 rounded-xl bg-gray-50 p-4">
                          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                            <div>
                              <p className="mb-0.5 text-xs text-gray-500">Date de la panne</p>
                              <p className="font-semibold text-gray-900">
                                {new Date(breakdown.breakdownDate).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                            <div>
                              <p className="mb-0.5 text-xs text-gray-500">Type de panne</p>
                              <p className="font-semibold text-gray-900">
                                {breakdown.breakdownType}
                              </p>
                            </div>
                            {breakdown.urgency && (
                              <div>
                                <p className="mb-0.5 text-xs text-gray-500">Urgence</p>
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getUrgencyColor(breakdown.urgency)}`}
                                >
                                  {breakdown.urgency}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="mb-0.5 text-xs text-gray-500">Kilométrage</p>
                              <p className="font-semibold text-gray-900">
                                {breakdown.mileage > 0
                                  ? `${breakdown.mileage.toLocaleString()} km`
                                  : '—'}
                              </p>
                            </div>
                            <div>
                              <p className="mb-0.5 text-xs text-gray-500">Coût estimé</p>
                              <p className="font-semibold text-gray-900">
                                {breakdown.estimatedCost > 0
                                  ? formatCleanAmount(breakdown.estimatedCost, 'FCFA')
                                  : '—'}
                              </p>
                            </div>
                            <div>
                              <p className="mb-0.5 text-xs text-gray-500">Mécanicien / Garage</p>
                              <p className="font-semibold text-gray-900">
                                {breakdown.mechanic || '—'}
                              </p>
                            </div>
                            <div>
                              <p className="mb-0.5 text-xs text-gray-500">Lieu</p>
                              <p className="font-semibold text-gray-900">
                                {breakdown.location || '—'}
                              </p>
                            </div>
                            {breakdown.assignedDriver && (
                              <div>
                                <p className="mb-0.5 text-xs text-gray-500">Chauffeur</p>
                                <p className="font-semibold text-gray-900">
                                  {breakdown.assignedDriver}
                                </p>
                              </div>
                            )}
                            {breakdown.agentName && (
                              <div>
                                <p className="mb-0.5 text-xs text-gray-500">Agent</p>
                                <p className="font-semibold text-gray-900">{breakdown.agentName}</p>
                              </div>
                            )}
                            {breakdown.driverName && (
                              <div>
                                <p className="mb-0.5 text-xs text-gray-500">
                                  Chauffeur responsable
                                </p>
                                <p className="font-semibold text-gray-900">
                                  {breakdown.driverName}
                                </p>
                              </div>
                            )}
                            {breakdown.driverPhone && (
                              <div>
                                <p className="mb-0.5 text-xs text-gray-500">Tél. chauffeur</p>
                                <p className="font-semibold text-gray-900">
                                  {breakdown.driverPhone}
                                </p>
                              </div>
                            )}
                          </div>
                          {/* Mechanic info in expanded */}
                          {(breakdown.mechanicName || breakdown.mechanicPhone) && (
                            <div className="mt-3 pt-3">
                              <p className="mb-2 text-xs font-semibold text-orange-700">
                                🔧 Mécanicien en charge
                              </p>
                              <div className="grid grid-cols-3 gap-3 text-sm">
                                {breakdown.mechanicName && (
                                  <div>
                                    <p className="mb-0.5 text-xs text-gray-500">Nom</p>
                                    <p className="font-semibold text-gray-900">
                                      {breakdown.mechanicName}
                                    </p>
                                  </div>
                                )}
                                {breakdown.mechanicPhone && (
                                  <div>
                                    <p className="mb-0.5 text-xs text-gray-500">Téléphone</p>
                                    <p className="font-semibold text-gray-900">
                                      {breakdown.mechanicPhone}
                                    </p>
                                  </div>
                                )}
                                {breakdown.mechanicSpecialization && (
                                  <div>
                                    <p className="mb-0.5 text-xs text-gray-500">Spécialisation</p>
                                    <p className="font-semibold text-gray-900">
                                      {breakdown.mechanicSpecialization}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {/* Photos in expanded */}
                          {breakdown.photos && breakdown.photos.length > 0 && (
                            <div className="mt-3 pt-3">
                              <p className="mb-2 text-xs font-semibold text-gray-700">
                                📷 Photos ({breakdown.photos.length})
                              </p>
                              <div className="grid grid-cols-4 gap-2">
                                {breakdown.photos.map((photo, idx) => (
                                  <img
                                    key={idx}
                                    src={photo}
                                    alt={`Panne ${idx + 1}`}
                                    className="h-20 w-full rounded-lg object-cover shadow-sm"
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                          {breakdown.notes && (
                            <div className="mt-3 pt-3">
                              <p className="mb-1 text-xs text-gray-500">Notes</p>
                              <p className="text-sm text-gray-700">{breakdown.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* History List */}
      {activeTab === 'history' && (
        <>
          {filteredHistory.length === 0 ? (
            <div className="rounded-2xl bg-white p-12 text-center shadow-md">
              <History className="mx-auto mb-4 h-16 w-16 text-gray-300" />
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                {history.length === 0 ? 'Aucun historique de pannes' : 'Aucun résultat'}
              </h3>
              <p className="text-sm text-gray-500">
                {history.length === 0
                  ? 'Les pannes résolues apparaîtront ici'
                  : 'Modifiez vos critères de recherche'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((item) => (
                <div
                  key={item.id + '-hist'}
                  className="overflow-hidden rounded-2xl bg-white shadow-md transition-shadow hover:shadow-lg"
                >
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-1 items-center gap-4">
                        <div className="flex-shrink-0">
                          <div
                            className={`rounded-xl p-2.5 ${item.source === 'personnel' ? 'bg-purple-100' : 'bg-blue-100'}`}
                          >
                            {item.source === 'personnel' ? (
                              <Car className="h-6 w-6 text-purple-600" />
                            ) : (
                              <Truck className="h-6 w-6 text-blue-600" />
                            )}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-3">
                            <h3 className="text-base font-bold text-gray-900">
                              {item.registration}
                            </h3>
                            <span className="text-sm text-gray-500">
                              {item.brand} {item.model}
                            </span>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getBreakdownTypeColor(item.breakdownType)}`}
                            >
                              {item.breakdownType}
                            </span>
                            {item.urgency && (
                              <span
                                className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getUrgencyColor(item.urgency)}`}
                              >
                                {item.urgency}
                              </span>
                            )}
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                              ✅ Résolu
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Résolu en {item.repairDuration}j
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(item.resolvedDate).toLocaleDateString('fr-FR')}
                            </span>
                            {item.mileage > 0 && (
                              <span className="flex items-center gap-1">
                                <Activity className="h-4 w-4" />
                                {item.mileage.toLocaleString()} km
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="ml-4 flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedBreakdown(item);
                            setIsViewModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                        >
                          <Eye className="h-4 w-4" />
                          Détails
                        </button>
                        <button
                          onClick={() => handleDeleteHistory(item.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Alerts List */}
      {activeTab === 'alertes' && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-md">
          <div className="rounded-t-2xl bg-gradient-to-r from-orange-50 to-red-50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-orange-500 p-2">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Alertes de Maintenance</h3>
                  <p className="text-sm text-gray-600">Interventions à prévoir prochainement</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {criticalCount > 0 && (
                  <span className="animate-pulse rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800">
                    {criticalCount} critique{criticalCount > 1 ? 's' : ''}
                  </span>
                )}
                {highCount > 0 && (
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-800">
                    {highCount} urgent{highCount > 1 ? 's' : ''}
                  </span>
                )}
                <button
                  onClick={() => setIsViewPlansOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
                >
                  <Calendar className="h-4 w-4" />
                  Planifications (
                  {plans.filter((p) => p.status !== 'Annulé' && p.status !== 'Terminé').length})
                </button>
              </div>
            </div>
          </div>
          {activeAlerts.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-400" />
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                Aucune alerte de maintenance
              </h3>
              <p className="text-sm text-gray-500">
                Tous les véhicules sont à jour
                {resolvedAlertIds.length > 0
                  ? ` (${resolvedAlertIds.length} résolue${resolvedAlertIds.length > 1 ? 's' : ''})`
                  : ''}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {activeAlerts.map((alert) => {
                const existingPlan = getPlanForAlert(alert.id);
                const isExpanded = expandedAlert === alert.id;
                return (
                  <div
                    key={alert.id}
                    className={`transition-colors ${alert.priority === 'critical' ? 'bg-red-50/50' : ''}`}
                  >
                    <div
                      className="cursor-pointer p-4 hover:bg-gray-50/50"
                      onClick={() => setExpandedAlert(isExpanded ? null : alert.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex flex-1 items-center gap-4">
                          <div className="flex-shrink-0">
                            {alert.source === 'personnel' ? (
                              <Car
                                className={`h-8 w-8 ${alert.priority === 'critical' ? 'text-red-500' : 'text-gray-400'}`}
                              />
                            ) : (
                              <Truck
                                className={`h-8 w-8 ${alert.priority === 'critical' ? 'text-red-500' : 'text-gray-400'}`}
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-3">
                              <p className="text-sm font-semibold text-gray-900">{alert.vehicle}</p>
                              <span className="text-xs text-gray-500">
                                {alert.brand} {alert.model}
                              </span>
                              <span
                                className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getAlertPriorityColor(alert.priority)}`}
                              >
                                {alert.priority === 'critical'
                                  ? '🔴 Critique'
                                  : alert.priority === 'high'
                                    ? '🟠 Urgent'
                                    : '🟡 Moyen'}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs ${alert.source === 'personnel' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}
                              >
                                {alert.source === 'personnel' ? 'Personnel' : 'Parc'}
                              </span>
                              {existingPlan && (
                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                  ✓ Planifié —{' '}
                                  {new Date(existingPlan.scheduledDate).toLocaleDateString('fr-FR')}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Wrench className="h-4 w-4" />
                                {alert.type}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {alert.details}
                              </span>
                              {alert.km !== '-' && (
                                <span className="flex items-center gap-1">
                                  <Activity className="h-4 w-4" />
                                  {alert.km}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="ml-2 flex items-center gap-2">
                          {!existingPlan && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openPlanModal(alert);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                            >
                              <CalendarPlus className="h-4 w-4" />
                              Planifier
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResolveAlert(alert.id);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Résolu
                          </button>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="ml-16 px-4 pb-4">
                        <div className="space-y-3 rounded-lg bg-gray-50 p-4">
                          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                            <div>
                              <p className="mb-0.5 text-xs text-gray-500">Échéance</p>
                              <p className="font-semibold text-gray-900">
                                {new Date(alert.dueDate).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                            <div>
                              <p className="mb-0.5 text-xs text-gray-500">Kilométrage</p>
                              <p className="font-semibold text-gray-900">{alert.km}</p>
                            </div>
                            {alert.assignedDriver && (
                              <div>
                                <p className="mb-0.5 text-xs text-gray-500">Chauffeur / Agent</p>
                                <p className="font-semibold text-gray-900">
                                  {alert.assignedDriver}
                                </p>
                              </div>
                            )}
                            {alert.lastMaintenance && (
                              <div>
                                <p className="mb-0.5 text-xs text-gray-500">
                                  Dernière intervention
                                </p>
                                <p className="font-semibold text-gray-900">
                                  {new Date(alert.lastMaintenance).toLocaleDateString('fr-FR')}
                                </p>
                              </div>
                            )}
                          </div>
                          {existingPlan && (
                            <div className="mt-3 pt-3">
                              <p className="mb-2 text-xs font-semibold text-gray-700">
                                📅 Planification en cours
                              </p>
                              <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                                <div>
                                  <p className="mb-0.5 text-xs text-gray-500">Date prévue</p>
                                  <p className="font-semibold text-gray-900">
                                    {new Date(existingPlan.scheduledDate).toLocaleDateString(
                                      'fr-FR'
                                    )}
                                  </p>
                                </div>
                                <div>
                                  <p className="mb-0.5 text-xs text-gray-500">Mécanicien</p>
                                  <p className="font-semibold text-gray-900">
                                    {existingPlan.mechanic || '—'}
                                  </p>
                                </div>
                                <div>
                                  <p className="mb-0.5 text-xs text-gray-500">Coût estimé</p>
                                  <p className="font-semibold text-gray-900">
                                    {existingPlan.estimatedCost
                                      ? formatCleanAmount(existingPlan.estimatedCost, 'FCFA')
                                      : '—'}
                                  </p>
                                </div>
                                <div>
                                  <p className="mb-0.5 text-xs text-gray-500">Statut</p>
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                      existingPlan.status === 'Planifié'
                                        ? 'bg-blue-100 text-blue-800'
                                        : existingPlan.status === 'En cours'
                                          ? 'bg-yellow-100 text-yellow-800'
                                          : existingPlan.status === 'Terminé'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    {existingPlan.status}
                                  </span>
                                </div>
                              </div>
                              {existingPlan.notes && (
                                <p className="mt-2 text-sm text-gray-600">
                                  💬 {existingPlan.notes}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Plan Maintenance Modal */}
      <Modal
        isOpen={isPlanModalOpen}
        onClose={() => {
          setIsPlanModalOpen(false);
          setSelectedAlert(null);
        }}
        title="Planifier une Maintenance"
        size="lg"
      >
        {selectedAlert && (
          <form onSubmit={handleCreatePlan} className="space-y-5">
            <div className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
              <div className="mb-2 flex items-center gap-3">
                {selectedAlert.source === 'personnel' ? (
                  <Car className="h-6 w-6 text-purple-600" />
                ) : (
                  <Truck className="h-6 w-6 text-blue-600" />
                )}
                <div>
                  <p className="font-bold text-gray-900">{selectedAlert.vehicle}</p>
                  <p className="text-sm text-gray-600">
                    {selectedAlert.brand} {selectedAlert.model}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-4 text-sm">
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getAlertPriorityColor(selectedAlert.priority)}`}
                >
                  {selectedAlert.priority === 'critical'
                    ? 'Critique'
                    : selectedAlert.priority === 'high'
                      ? 'Urgent'
                      : 'Moyen'}
                </span>
                <span className="text-gray-600">
                  <Wrench className="mr-1 inline h-4 w-4" />
                  {selectedAlert.type}
                </span>
                <span className="text-gray-600">
                  <Clock className="mr-1 inline h-4 w-4" />
                  {selectedAlert.details}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Date d'intervention prévue"
                name="scheduledDate"
                type="date"
                value={planForm.scheduledDate}
                onChange={(e) => setPlanForm((p) => ({ ...p, scheduledDate: e.target.value }))}
                required
              />
              <Input
                label="Mécanicien / Garage"
                name="mechanic"
                value={planForm.mechanic}
                onChange={(e) => setPlanForm((p) => ({ ...p, mechanic: e.target.value }))}
                placeholder="Ex: Garage IVOS Dakar"
              />
            </div>
            <Input
              label="Coût estimé (CFA)"
              name="estimatedCost"
              type="number"
              value={planForm.estimatedCost}
              onChange={(e) =>
                setPlanForm((p) => ({ ...p, estimatedCost: parseInt(e.target.value) || 0 }))
              }
              placeholder="0"
            />
            <Textarea
              label="Notes / Instructions"
              name="notes"
              value={planForm.notes}
              onChange={(e) => setPlanForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Instructions spécifiques pour l'intervention..."
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsPlanModalOpen(false);
                  setSelectedAlert(null);
                }}
              >
                Annuler
              </Button>
              <Button type="submit" variant="primary">
                <CalendarPlus className="mr-2 h-4 w-4" />
                Planifier l'intervention
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* View All Plans Modal */}
      <Modal
        isOpen={isViewPlansOpen}
        onClose={() => setIsViewPlansOpen(false)}
        title="Planifications de Maintenance"
        size="xl"
      >
        <div className="space-y-4">
          {plans.length === 0 ? (
            <div className="py-8 text-center">
              <Calendar className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">Aucune planification enregistrée</p>
              <p className="mt-1 text-sm text-gray-400">
                Planifiez des maintenances depuis les alertes
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="rounded-lg bg-blue-50 p-3">
                  <p className="text-lg font-bold text-blue-700">
                    {plans.filter((p) => p.status === 'Planifié').length}
                  </p>
                  <p className="text-xs text-blue-600">Planifiées</p>
                </div>
                <div className="rounded-lg bg-yellow-50 p-3">
                  <p className="text-lg font-bold text-yellow-700">
                    {plans.filter((p) => p.status === 'En cours').length}
                  </p>
                  <p className="text-xs text-yellow-600">En cours</p>
                </div>
                <div className="rounded-lg bg-green-50 p-3">
                  <p className="text-lg font-bold text-green-700">
                    {plans.filter((p) => p.status === 'Terminé').length}
                  </p>
                  <p className="text-xs text-green-600">Terminées</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-lg font-bold text-gray-700">
                    {plans.filter((p) => p.status === 'Annulé').length}
                  </p>
                  <p className="text-xs text-gray-600">Annulées</p>
                </div>
              </div>
              <div className="max-h-[60vh] space-y-3 overflow-y-auto">
                {plans
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((plan) => (
                    <div
                      key={plan.id}
                      className={`rounded-xl border p-4 ${
                        plan.status === 'Terminé'
                          ? 'border-green-200 bg-green-50/50'
                          : plan.status === 'Annulé'
                            ? 'border-gray-200 bg-gray-50/50 opacity-60'
                            : plan.status === 'En cours'
                              ? 'border-yellow-200 bg-yellow-50/30'
                              : 'border-blue-200 bg-blue-50/30'
                      }`}
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {plan.vehicleSource === 'personnel' ? (
                            <Car className="h-5 w-5 text-purple-600" />
                          ) : (
                            <Truck className="h-5 w-5 text-blue-600" />
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">
                              {plan.vehicleRegistration} — {plan.vehicleBrand} {plan.vehicleModel}
                            </p>
                            <p className="text-sm text-gray-600">
                              {plan.alertType}: {plan.description}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            plan.status === 'Planifié'
                              ? 'bg-blue-100 text-blue-800'
                              : plan.status === 'En cours'
                                ? 'bg-yellow-100 text-yellow-800'
                                : plan.status === 'Terminé'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {plan.status}
                        </span>
                      </div>
                      <div className="mb-3 grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Date prévue</p>
                          <p className="font-medium">
                            {new Date(plan.scheduledDate).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Mécanicien</p>
                          <p className="font-medium">{plan.mechanic || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Coût estimé</p>
                          <p className="font-medium">
                            {plan.estimatedCost
                              ? formatCleanAmount(plan.estimatedCost, 'FCFA')
                              : '—'}
                          </p>
                        </div>
                      </div>
                      {plan.notes && <p className="mb-3 text-sm text-gray-600">💬 {plan.notes}</p>}
                      <div className="flex items-center gap-2 pt-2">
                        {plan.status === 'Planifié' && (
                          <>
                            <button
                              onClick={() => handleUpdatePlanStatus(plan.id, 'En cours')}
                              className="rounded-lg bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700 transition-colors hover:bg-yellow-200"
                            >
                              Démarrer
                            </button>
                            <button
                              onClick={() => handleUpdatePlanStatus(plan.id, 'Annulé')}
                              className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200"
                            >
                              Annuler
                            </button>
                          </>
                        )}
                        {plan.status === 'En cours' && (
                          <button
                            onClick={() => handleUpdatePlanStatus(plan.id, 'Terminé')}
                            className="rounded-lg bg-green-100 px-3 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-200"
                          >
                            Marquer terminé
                          </button>
                        )}
                        <button
                          onClick={() => handleDeletePlan(plan.id)}
                          className="ml-auto rounded-lg px-3 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}
          <div className="flex justify-end border-t pt-4">
            <Button variant="secondary" onClick={() => setIsViewPlansOpen(false)}>
              Fermer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Breakdown Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          resetForm();
        }}
        title="Déclarer une Panne"
        size="lg"
      >
        <form onSubmit={handleAddBreakdown} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Véhicule</label>
            <select
              value={selectedVehicleId}
              onChange={(e) => {
                setSelectedVehicleId(e.target.value);
                const veh = availableVehicles.find((v) => v.id === e.target.value);
                if (veh) {
                  const driverName = veh.data.assignedDriver || veh.data.agentName || '';
                  const driver = drivers.find((d: any) => d.name === driverName);
                  setForm((p) => ({
                    ...p,
                    driverName,
                    driverPhone: driver?.phone || veh.data.driverPhone || '',
                  }));
                }
              }}
              className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Sélectionner un véhicule...</option>
              {availableVehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          {/* Chauffeur — Annuaire */}
          <div className="space-y-3 rounded-xl bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-800">👤 Chauffeur responsable</p>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Sélectionner depuis l'Annuaire
              </label>
              <select
                value={form.driverName}
                onChange={(e) => {
                  const ch = chauffeurs.find(
                    (c) => `${c.firstName} ${c.lastName}` === e.target.value
                  );
                  setForm((p) => ({
                    ...p,
                    driverName: e.target.value,
                    driverPhone: ch?.phone || '',
                  }));
                }}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Choisir un chauffeur —</option>
                {chauffeurs.map((c) => (
                  <option key={c.id} value={`${c.firstName} ${c.lastName}`}>
                    {c.firstName} {c.lastName} — {c.matricule}
                  </option>
                ))}
              </select>
            </div>
            {form.driverName && (
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-white p-3">
                  <p className="mb-0.5 text-xs text-blue-600">Chauffeur</p>
                  <p className="text-sm font-semibold text-gray-900">{form.driverName}</p>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <p className="mb-0.5 text-xs text-blue-600">Téléphone</p>
                  <p className="text-sm font-semibold text-gray-900">{form.driverPhone || '—'}</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date de la panne"
              name="breakdownDate"
              type="date"
              value={form.breakdownDate}
              onChange={(e) => setForm((p) => ({ ...p, breakdownDate: e.target.value }))}
              required
            />
            <Select
              label="Type de panne"
              name="breakdownType"
              value={form.breakdownType}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  breakdownType: e.target.value as BreakdownVehicle['breakdownType'],
                }))
              }
              options={BREAKDOWN_TYPES.map((t) => ({
                value: t,
                label: t === 'Hydraulique' ? 'Hydraulique (Pompe/Cuve)' : t,
              }))}
              required
            />
          </div>

          {/* Urgency Level */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Niveau d'urgence</label>
            <div className="flex gap-3">
              {(['Faible', 'Critique', 'Immobilisation Totale'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, urgency: level }))}
                  className={`flex-1 rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-all ${
                    form.urgency === level
                      ? level === 'Faible'
                        ? 'border-orange-400 bg-orange-100 text-orange-800'
                        : level === 'Critique'
                          ? 'border-red-400 bg-red-100 text-red-800'
                          : 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {level === 'Faible' ? '🟠' : level === 'Critique' ? '🔴' : '⚫'} {level}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            label="Description de la panne"
            name="breakdownDescription"
            value={form.breakdownDescription}
            onChange={(e) => setForm((p) => ({ ...p, breakdownDescription: e.target.value }))}
            placeholder="Décrivez le problème constaté..."
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Mécanicien / Garage"
              name="mechanic"
              value={form.mechanic}
              onChange={(e) => setForm((p) => ({ ...p, mechanic: e.target.value }))}
              placeholder="Ex: Garage IVOS Dakar"
            />
            <Input
              label="Lieu de la panne"
              name="location"
              value={form.location}
              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
              placeholder="Ex: Route de Rufisque"
            />
          </div>

          {/* Mechanic info */}
          <div className="space-y-3 rounded-lg bg-orange-50 p-4">
            <p className="text-sm font-semibold text-orange-800">
              🔧 Mécanicien en charge de la réparation
            </p>
            {mechanics.length > 0 && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Sélectionner un mécanicien
                </label>
                <select
                  value={form.mechanicName}
                  onChange={(e) => {
                    const mech = mechanics.find((m: any) => m.name === e.target.value);
                    if (mech) {
                      setForm((p) => ({
                        ...p,
                        mechanicName: mech.name,
                        mechanicPhone: mech.phone || '',
                        mechanicSpecialization: mech.specialization || '',
                        mechanic: mech.name,
                      }));
                    } else {
                      setForm((p) => ({
                        ...p,
                        mechanicName: '',
                        mechanicPhone: '',
                        mechanicSpecialization: '',
                      }));
                    }
                  }}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">— Choisir ou saisir manuellement —</option>
                  {mechanics.map((m: any) => (
                    <option key={m.id} value={m.name}>
                      {m.name} — {m.specialization || 'Général'} ({m.status || ''})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Nom du mécanicien"
                name="mechanicName"
                value={form.mechanicName}
                onChange={(e) => setForm((p) => ({ ...p, mechanicName: e.target.value }))}
                placeholder="Nom complet"
              />
              <Input
                label="Téléphone"
                name="mechanicPhone"
                value={form.mechanicPhone}
                onChange={(e) => setForm((p) => ({ ...p, mechanicPhone: e.target.value }))}
                placeholder="+221 XX XXX XX XX"
              />
              <Input
                label="Spécialisation"
                name="mechanicSpecialization"
                value={form.mechanicSpecialization}
                onChange={(e) => setForm((p) => ({ ...p, mechanicSpecialization: e.target.value }))}
                placeholder="Ex: Moteur & Transmission"
              />
            </div>
          </div>

          <Input
            label="Coût estimé (CFA)"
            name="estimatedCost"
            type="number"
            value={form.estimatedCost}
            onChange={(e) =>
              setForm((p) => ({ ...p, estimatedCost: parseInt(e.target.value) || 0 }))
            }
            placeholder="0"
          />

          <Textarea
            label="Notes complémentaires"
            name="notes"
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Notes ou instructions spécifiques..."
          />

          {/* Photo upload */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">📷 Photos de la panne</label>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
            />
            {breakdownPhotos.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {breakdownPhotos.map((photo, idx) => (
                  <div
                    key={idx}
                    className="group relative overflow-hidden rounded-lg border border-gray-200"
                  >
                    <img
                      src={photo}
                      alt={`Panne ${idx + 1}`}
                      className="h-28 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setBreakdownPhotos((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute right-1 top-1 rounded-full bg-red-600 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-3 text-sm text-gray-500 transition-colors hover:border-orange-400 hover:text-orange-500"
            >
              <Camera className="h-4 w-4" />
              Ajouter des photos (max 10 Mo/photo)
            </button>
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsAddModalOpen(false);
                resetForm();
              }}
            >
              Annuler
            </Button>
            <Button type="submit" variant="primary">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Déclarer la panne
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Detail Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedBreakdown(null);
        }}
        title="Détails de la Panne"
        size="lg"
      >
        {selectedBreakdown &&
          (() => {
            const days = getDaysSinceBreakdown(selectedBreakdown.breakdownDate);
            return (
              <div className="space-y-6">
                {/* Vehicle info header */}
                <div className="rounded-xl bg-gradient-to-r from-red-50 to-orange-50 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`rounded-xl p-3 ${selectedBreakdown.source === 'personnel' ? 'bg-purple-100' : 'bg-blue-100'}`}
                      >
                        {selectedBreakdown.source === 'personnel' ? (
                          <Car className="h-8 w-8 text-purple-600" />
                        ) : (
                          <Truck className="h-8 w-8 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {selectedBreakdown.registration}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {selectedBreakdown.brand} {selectedBreakdown.model} —{' '}
                          {selectedBreakdown.year}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`rounded-full border px-3 py-1 text-sm font-semibold ${getBreakdownTypeColor(selectedBreakdown.breakdownType)}`}
                      >
                        {selectedBreakdown.breakdownType}
                      </span>
                      {selectedBreakdown.urgency && (
                        <span
                          className={`rounded-full border px-3 py-1 text-sm font-semibold ${getUrgencyColor(selectedBreakdown.urgency)} ml-2`}
                        >
                          {selectedBreakdown.urgency}
                        </span>
                      )}
                      {'resolvedDate' in selectedBreakdown ? (
                        <p className="mt-1 text-sm font-semibold text-green-600">
                          ✅ Résolu le{' '}
                          {new Date(
                            (selectedBreakdown as ResolvedBreakdown).resolvedDate
                          ).toLocaleDateString('fr-FR')}{' '}
                          ({(selectedBreakdown as ResolvedBreakdown).repairDuration}j)
                        </p>
                      ) : (
                        <p
                          className={`mt-1 text-sm font-semibold ${days > 14 ? 'text-red-600' : days > 7 ? 'text-orange-600' : 'text-yellow-600'}`}
                        >
                          En panne depuis {days} jour{days > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Breakdown details */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-gray-700">
                    📋 Description de la panne
                  </h4>
                  <p className="rounded-lg bg-gray-50 p-4 text-gray-900">
                    {selectedBreakdown.breakdownDescription || 'Aucune description'}
                  </p>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="mb-0.5 text-xs text-gray-500">Date de la panne</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(selectedBreakdown.breakdownDate).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="mb-0.5 text-xs text-gray-500">Kilométrage</p>
                    <p className="font-semibold text-gray-900">
                      {selectedBreakdown.mileage > 0
                        ? `${selectedBreakdown.mileage.toLocaleString()} km`
                        : '—'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="mb-0.5 text-xs text-gray-500">Mécanicien / Garage</p>
                    <p className="font-semibold text-gray-900">
                      {selectedBreakdown.mechanic || '—'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="mb-0.5 text-xs text-gray-500">Lieu</p>
                    <p className="font-semibold text-gray-900">
                      {selectedBreakdown.location || '—'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="mb-0.5 text-xs text-gray-500">Coût estimé</p>
                    <p className="font-semibold text-gray-900">
                      {selectedBreakdown.estimatedCost > 0
                        ? formatCleanAmount(selectedBreakdown.estimatedCost, 'FCFA')
                        : '—'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="mb-0.5 text-xs text-gray-500">Source</p>
                    <p className="font-semibold text-gray-900">
                      {selectedBreakdown.source === 'personnel'
                        ? 'Véhicule Personnel'
                        : 'Véhicule Parc'}
                    </p>
                  </div>
                  {selectedBreakdown.assignedDriver && (
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="mb-0.5 text-xs text-gray-500">Chauffeur assigné</p>
                      <p className="font-semibold text-gray-900">
                        {selectedBreakdown.assignedDriver}
                      </p>
                    </div>
                  )}
                  {selectedBreakdown.agentName && (
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="mb-0.5 text-xs text-gray-500">Agent</p>
                      <p className="font-semibold text-gray-900">{selectedBreakdown.agentName}</p>
                    </div>
                  )}
                </div>

                {/* Driver info */}
                {(selectedBreakdown.driverName || selectedBreakdown.driverPhone) && (
                  <div className="rounded-xl bg-blue-50 p-4">
                    <h4 className="mb-3 text-sm font-semibold text-blue-800">
                      👤 Chauffeur responsable
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedBreakdown.driverName && (
                        <div>
                          <p className="mb-0.5 text-xs text-blue-600">Nom</p>
                          <p className="font-semibold text-gray-900">
                            {selectedBreakdown.driverName}
                          </p>
                        </div>
                      )}
                      {selectedBreakdown.driverPhone && (
                        <div>
                          <p className="mb-0.5 text-xs text-blue-600">Téléphone</p>
                          <p className="font-semibold text-gray-900">
                            {selectedBreakdown.driverPhone}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Mechanic info */}
                {(selectedBreakdown.mechanicName || selectedBreakdown.mechanicPhone) && (
                  <div className="rounded-xl bg-orange-50 p-4">
                    <h4 className="mb-3 text-sm font-semibold text-orange-800">
                      🔧 Mécanicien en charge
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      {selectedBreakdown.mechanicName && (
                        <div>
                          <p className="mb-0.5 text-xs text-orange-600">Nom</p>
                          <p className="font-semibold text-gray-900">
                            {selectedBreakdown.mechanicName}
                          </p>
                        </div>
                      )}
                      {selectedBreakdown.mechanicPhone && (
                        <div>
                          <p className="mb-0.5 text-xs text-orange-600">Téléphone</p>
                          <p className="font-semibold text-gray-900">
                            {selectedBreakdown.mechanicPhone}
                          </p>
                        </div>
                      )}
                      {selectedBreakdown.mechanicSpecialization && (
                        <div>
                          <p className="mb-0.5 text-xs text-orange-600">Spécialisation</p>
                          <p className="font-semibold text-gray-900">
                            {selectedBreakdown.mechanicSpecialization}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Photos */}
                {selectedBreakdown.photos && selectedBreakdown.photos.length > 0 && (
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-gray-700">
                      📷 Photos de la panne ({selectedBreakdown.photos.length})
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      {selectedBreakdown.photos.map((photo, idx) => (
                        <img
                          key={idx}
                          src={photo}
                          alt={`Panne ${idx + 1}`}
                          className="h-36 w-full cursor-pointer rounded-lg object-cover shadow-sm transition-opacity hover:opacity-90"
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {selectedBreakdown.insuranceExpiry && (
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="mb-0.5 text-xs text-gray-500">Expiration assurance</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(selectedBreakdown.insuranceExpiry).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  )}
                  {selectedBreakdown.technicalControlExpiry && (
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="mb-0.5 text-xs text-gray-500">Contrôle technique</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(selectedBreakdown.technicalControlExpiry).toLocaleDateString(
                          'fr-FR'
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {selectedBreakdown.notes && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-gray-700">💬 Notes</h4>
                    <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                      {selectedBreakdown.notes}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setIsViewModalOpen(false);
                      setSelectedBreakdown(null);
                    }}
                  >
                    Fermer
                  </Button>
                  {'resolvedDate' in selectedBreakdown ? (
                    <button
                      onClick={() => handleDeleteHistory(selectedBreakdown.id)}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                    >
                      <Trash2 className="h-5 w-5" />
                      Supprimer de l'historique
                    </button>
                  ) : (
                    <button
                      onClick={() => handleResolveBreakdown(selectedBreakdown)}
                      className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700"
                    >
                      <CheckCircle className="h-5 w-5" />
                      Panne réglée — Remettre disponible
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
      </Modal>
    </div>
  );
}
