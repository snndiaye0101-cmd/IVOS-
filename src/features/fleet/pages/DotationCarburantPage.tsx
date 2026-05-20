import { useState, useCallback, useMemo } from 'react';
import {
  Search,
  Plus,
  Fuel,
  Truck,
  Car,
  Edit2,
  Trash2,
  Eye,
  CreditCard,
  Ban,
  CheckCircle2,
  Calendar,
  BarChart3,
  TrendingUp,
  Droplets,
  Hash,
  AlertTriangle,
  FileText,
  Download,
  Calculator,
  User,
  Bike,
  Activity,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { sendNotification } from '../../../shared/services/notificationService';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { vehiclesStore } from '../services/vehiclesStore';
import { personalVehiclesStore } from '../services/personalVehiclesStore';
import { driversStore } from '../services/driversStore';
import { personnelStore, type PersonnelAgent } from '../services/personnelStore';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Textarea from '../../../components/ui/Textarea';

interface FuelAllocation {
  id: string;
  vehicleRegistration: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleSource: 'parc' | 'personnel';
  vehicleType: 'Moto' | 'Voiture' | 'Camion';
  driverName: string;
  agentId: string;
  date: string;
  fuelType: 'Gasoil' | 'Essence' | 'Super';
  quantity: number;
  unitPrice: number;
  totalCost: number;
  station: string;
  fournisseur: string;
  mileageAtFill: number;
  bonNumber: string;
  fuelCardId: string;
  usagePeriod: string;
  monthlyQuota: number;
  notes: string;
  createdAt: string;
}

interface FuelAlert {
  id: string;
  type: 'quota_85' | 'anomaly_km' | 'overconsumption';
  severity: 'warning' | 'critical';
  title: string;
  message: string;
  vehicleRegistration: string;
  driverName: string;
  value: number;
  threshold: number;
  relatedAllocationId?: string;
}

interface FuelCard {
  id: string;
  cardNumber: string;
  cardType: 'parc' | 'personnel';
  paymentType: 'postpayee' | 'prepayee' | 'africapass';
  provider: string;
  assignedVehicle: string;
  assignedDriver: string;
  status: 'active' | 'blocked' | 'expired';
  expiryDate: string;
  monthlyLimit: number;
  allocatedAmount: number;
  allocatedLitres: number;
  notes: string;
  createdAt: string;
}

const STORAGE_KEY = 'ivos_fuel_allocations_v1';
const CARDS_STORAGE_KEY = 'ivos_fuel_cards_v1';
const ALERTS_RESOLVED_KEY = 'ivos_fuel_alerts_resolved_v1';

const loadAllocations = (): FuelAllocation[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as FuelAllocation[];
    return data.map((a) => ({
      ...a,
      vehicleSource: a.vehicleSource || 'parc',
      vehicleType: a.vehicleType || 'Voiture',
      agentId: a.agentId || '',
      fournisseur: a.fournisseur || '',
      monthlyQuota: a.monthlyQuota || 0,
    }));
  } catch {
    return [];
  }
};

const saveAllocations = (data: FuelAllocation[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const loadCards = (): FuelCard[] => {
  try {
    const raw = localStorage.getItem(CARDS_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as FuelCard[];
    return data.map((c) => ({
      ...c,
      paymentType: c.paymentType || 'postpayee',
      allocatedAmount: c.allocatedAmount || 0,
      allocatedLitres: c.allocatedLitres || 0,
    }));
  } catch {
    return [];
  }
};

const saveCards = (data: FuelCard[]) => {
  localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(data));
};

import { formatCleanAmount } from '../../../shared/utils/formatAmount';

const formatCFA = (v: number) => formatCleanAmount(v, 'FCFA');

const defaultForm = {
  vehicleRegistration: '',
  vehicleBrand: '',
  vehicleModel: '',
  vehicleSource: 'parc' as 'parc' | 'personnel',
  vehicleType: 'Voiture' as 'Moto' | 'Voiture' | 'Camion',
  driverName: '',
  agentId: '',
  date: new Date().toISOString().split('T')[0],
  fuelType: 'Gasoil' as 'Gasoil' | 'Essence' | 'Super',
  quantity: 0,
  unitPrice: 0,
  totalCost: 0,
  station: '',
  fournisseur: '',
  mileageAtFill: 0,
  bonNumber: '',
  fuelCardId: '',
  usagePeriod: '1 mois',
  monthlyQuota: 0,
  notes: '',
};

const defaultCardForm = {
  cardNumber: '',
  cardType: 'parc' as 'parc' | 'personnel',
  paymentType: 'postpayee' as 'postpayee' | 'prepayee' | 'africapass',
  provider: 'Total',
  assignedVehicle: '',
  assignedDriver: '',
  status: 'active' as 'active' | 'blocked' | 'expired',
  expiryDate: '',
  monthlyLimit: 0,
  allocatedAmount: 0,
  allocatedLitres: 0,
  notes: '',
};

export default function DotationCarburantPage() {
  const { user, allUsers } = useAuth();
  const [activeTab, setActiveTab] = useState<'dotations' | 'cartes'>('dotations');

  // Dotations state
  const [allocations, setAllocations] = useState<FuelAllocation[]>(loadAllocations);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewItem, setViewItem] = useState<FuelAllocation | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [filterFuelType, setFilterFuelType] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');

  // Cards state
  const [cards, setCards] = useState<FuelCard[]>(loadCards);
  const [cardSearch, setCardSearch] = useState('');
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isCardViewOpen, setIsCardViewOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [viewCard, setViewCard] = useState<FuelCard | null>(null);
  const [cardForm, setCardForm] = useState(defaultCardForm);
  const [filterCardStatus, setFilterCardStatus] = useState<string>('all');

  // Alert system state
  const [resolvedAlerts, setResolvedAlerts] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(ALERTS_RESOLVED_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolvingAlert, setResolvingAlert] = useState<FuelAlert | null>(null);
  const [agentSearch, setAgentSearch] = useState('');
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);

  // Personnel (Annuaire)
  const agentsAnnuaire = useMemo(() => personnelStore.load(), []);

  const fleetVehicles = useMemo(() => vehiclesStore.load(), []);
  const personalVehicles = useMemo(() => personalVehiclesStore.load(), []);

  const allVehicles = useMemo(
    () => [
      ...fleetVehicles.map((v: any) => ({
        registration: v.registration,
        brand: v.brand,
        model: v.model,
        source: 'parc' as const,
        driver: v.assignedDriver || '',
      })),
      ...personalVehicles.map((v: any) => ({
        registration: v.registration,
        brand: v.brand,
        model: v.model,
        source: 'personnel' as const,
        driver: v.agentName || '',
      })),
    ],
    [fleetVehicles, personalVehicles]
  );

  const drivers = useMemo(() => driversStore.load(), []);

  const driversAndAgents = useMemo(() => {
    const chauffeurs = drivers.map((d: any) => ({
      name: d.name,
      role: 'Chauffeur' as const,
      vehicle: d.vehicle || '',
    }));
    const agents = personalVehicles
      .filter((v: any) => v.agentName)
      .map((v: any) => ({
        name: v.agentName,
        role: 'Agent' as const,
        vehicle: v.registration || '',
      }));
    const seen = new Set<string>();
    return [...chauffeurs, ...agents].filter((p) => {
      if (seen.has(p.name)) return false;
      seen.add(p.name);
      return true;
    });
  }, [drivers, personalVehicles]);

  const filtered = useMemo(() => {
    return allocations
      .filter((a) => {
        const matchSearch =
          !search ||
          a.vehicleRegistration.toLowerCase().includes(search.toLowerCase()) ||
          a.driverName.toLowerCase().includes(search.toLowerCase()) ||
          a.bonNumber.toLowerCase().includes(search.toLowerCase()) ||
          a.station.toLowerCase().includes(search.toLowerCase());
        const matchFuel = filterFuelType === 'all' || a.fuelType === filterFuelType;
        const matchSource = filterSource === 'all' || a.vehicleSource === filterSource;
        return matchSearch && matchFuel && matchSource;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allocations, search, filterFuelType, filterSource]);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = allocations.filter((a) => new Date(a.date) >= monthStart);
    const byType = (type: string) => {
      const items = thisMonth.filter((a) => a.fuelType === type);
      return {
        count: items.length,
        litres: items.reduce((s, a) => s + a.quantity, 0),
        cost: items.reduce((s, a) => s + a.totalCost, 0),
      };
    };
    const bySource = (source: string, list: FuelAllocation[]) => {
      const items = list.filter((a) => a.vehicleSource === source);
      return {
        count: items.length,
        litres: items.reduce((s, a) => s + a.quantity, 0),
        cost: items.reduce((s, a) => s + a.totalCost, 0),
        gasoil: {
          litres: items.filter((a) => a.fuelType === 'Gasoil').reduce((s, a) => s + a.quantity, 0),
          cost: items.filter((a) => a.fuelType === 'Gasoil').reduce((s, a) => s + a.totalCost, 0),
        },
        essence: {
          litres: items.filter((a) => a.fuelType === 'Essence').reduce((s, a) => s + a.quantity, 0),
          cost: items.filter((a) => a.fuelType === 'Essence').reduce((s, a) => s + a.totalCost, 0),
        },
        super_: {
          litres: items.filter((a) => a.fuelType === 'Super').reduce((s, a) => s + a.quantity, 0),
          cost: items.filter((a) => a.fuelType === 'Super').reduce((s, a) => s + a.totalCost, 0),
        },
      };
    };
    const totalLitres = allocations.reduce((s, a) => s + a.quantity, 0);
    const totalCost = allocations.reduce((s, a) => s + a.totalCost, 0);
    return {
      totalAllocations: allocations.length,
      totalLitres,
      totalCost,
      monthCount: thisMonth.length,
      monthLitres: thisMonth.reduce((s, a) => s + a.quantity, 0),
      monthCost: thisMonth.reduce((s, a) => s + a.totalCost, 0),
      gasoil: byType('Gasoil'),
      essence: byType('Essence'),
      super_: byType('Super'),
      parc: bySource('parc', allocations),
      personnel: bySource('personnel', allocations),
      parcMois: bySource('parc', thisMonth),
      personnelMois: bySource('personnel', thisMonth),
    };
  }, [allocations]);

  // ── Efficiency KPI: % of card monthly limits consumed ──
  const efficiencyPercent = useMemo(() => {
    const activeCardsWithLimit = cards.filter((c) => c.status === 'active' && c.monthlyLimit > 0);
    if (activeCardsWithLimit.length === 0) return 0;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const totalLimit = activeCardsWithLimit.reduce((s, c) => s + c.monthlyLimit, 0);
    const totalUsed = activeCardsWithLimit.reduce((s, c) => {
      const usage = allocations
        .filter((a) => a.fuelCardId === c.id && new Date(a.date) >= monthStart)
        .reduce((sum, a) => sum + a.totalCost, 0);
      return s + usage;
    }, 0);
    return totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 100) : 0;
  }, [allocations, cards]);

  // ── Budget estimé mensuel (projection basée sur le rythme actuel) ──
  const budgetEstime = useMemo(() => {
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    if (dayOfMonth === 0) return stats.monthCost;
    return Math.round(stats.monthCost * (daysInMonth / dayOfMonth));
  }, [stats.monthCost]);

  // ── Système d'Alertes Intelligent ──
  const fuelAlerts = useMemo(() => {
    const alerts: FuelAlert[] = [];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Seuil 85% : alertes pour les cartes proches du plafond
    cards
      .filter((c) => c.status === 'active' && c.monthlyLimit > 0)
      .forEach((card) => {
        const usage = allocations
          .filter((a) => a.fuelCardId === card.id && new Date(a.date) >= monthStart)
          .reduce((s, a) => s + a.totalCost, 0);
        const pct = (usage / card.monthlyLimit) * 100;
        if (pct >= 100) {
          alerts.push({
            id: `over_${card.id}`,
            type: 'overconsumption',
            severity: 'critical',
            title: `Dépassement plafond — ${card.cardNumber}`,
            message: `Consommation ${formatCFA(usage)} dépasse le plafond de ${formatCFA(card.monthlyLimit)} (${Math.round(pct)}%)`,
            vehicleRegistration: card.assignedVehicle,
            driverName: card.assignedDriver,
            value: pct,
            threshold: 100,
          });
        } else if (pct >= 85) {
          alerts.push({
            id: `quota85_${card.id}`,
            type: 'quota_85',
            severity: 'warning',
            title: `Seuil 85% atteint — ${card.cardNumber}`,
            message: `Consommation à ${Math.round(pct)}% du plafond mensuel (${formatCFA(usage)} / ${formatCFA(card.monthlyLimit)})`,
            vehicleRegistration: card.assignedVehicle,
            driverName: card.assignedDriver,
            value: pct,
            threshold: 85,
          });
        }
      });

    // 2. Anomalie km/consommation : si un véhicule consomme bcp plus que d'habitude
    const vehicleMap = new Map<string, FuelAllocation[]>();
    allocations.forEach((a) => {
      const list = vehicleMap.get(a.vehicleRegistration) || [];
      list.push(a);
      vehicleMap.set(a.vehicleRegistration, list);
    });
    vehicleMap.forEach((allocs, reg) => {
      if (allocs.length < 3) return;
      const sorted = [...allocs].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const withMileage = sorted.filter((a) => a.mileageAtFill > 0);
      if (withMileage.length < 2) return;
      const consumptions: number[] = [];
      for (let i = 1; i < withMileage.length; i++) {
        const kmDiff = withMileage[i].mileageAtFill - withMileage[i - 1].mileageAtFill;
        if (kmDiff > 0 && withMileage[i].quantity > 0) {
          consumptions.push(withMileage[i].quantity / (kmDiff / 100));
        }
      }
      if (consumptions.length < 2) return;
      const avg = consumptions.reduce((s, v) => s + v, 0) / consumptions.length;
      const last = consumptions[consumptions.length - 1];
      if (last > avg * 1.5 && avg > 0) {
        alerts.push({
          id: `anomaly_${reg}`,
          type: 'anomaly_km',
          severity: 'warning',
          title: `Anomalie consommation — ${reg}`,
          message: `Dernière conso: ${last.toFixed(1)} L/100km vs moyenne ${avg.toFixed(1)} L/100km (+${Math.round(((last - avg) / avg) * 100)}%)`,
          vehicleRegistration: reg,
          driverName: allocs[allocs.length - 1].driverName,
          value: last,
          threshold: avg * 1.5,
        });
      }
    });

    // 3. Quotas mensuels dépassés (pour dotations avec monthlyQuota défini)
    const driverQuotaMap = new Map<string, { used: number; quota: number; reg: string }>();
    allocations
      .filter((a) => new Date(a.date) >= monthStart && a.monthlyQuota > 0)
      .forEach((a) => {
        const key = a.driverName || a.vehicleRegistration;
        const existing = driverQuotaMap.get(key) || {
          used: 0,
          quota: a.monthlyQuota,
          reg: a.vehicleRegistration,
        };
        existing.used += a.quantity;
        existing.quota = Math.max(existing.quota, a.monthlyQuota);
        driverQuotaMap.set(key, existing);
      });
    driverQuotaMap.forEach(({ used, quota, reg }, name) => {
      const pct = (used / quota) * 100;
      if (pct >= 85) {
        alerts.push({
          id: `dquota_${name}`,
          type: 'quota_85',
          severity: pct >= 100 ? 'critical' : 'warning',
          title: `Quota mensuel ${pct >= 100 ? 'dépassé' : 'à 85%'} — ${name}`,
          message: `${used.toFixed(0)} L consommés sur ${quota} L alloués (${Math.round(pct)}%)`,
          vehicleRegistration: reg,
          driverName: name,
          value: pct,
          threshold: 85,
        });
      }
    });

    return alerts.filter((a) => !resolvedAlerts.includes(a.id));
  }, [allocations, cards, resolvedAlerts]);

  const alertCritiques = fuelAlerts.filter((a) => a.severity === 'critical').length;
  const alertWarnings = fuelAlerts.filter((a) => a.severity === 'warning').length;

  // ── Résoudre une alerte ──
  const handleResolveAlert = useCallback(
    (alertId: string) => {
      const updated = [...resolvedAlerts, alertId];
      setResolvedAlerts(updated);
      localStorage.setItem(ALERTS_RESOLVED_KEY, JSON.stringify(updated));
      setIsResolveModalOpen(false);
      setResolvingAlert(null);
      toast.success('Alerte résolue');
    },
    [resolvedAlerts]
  );

  // ── Export PDF "État des Dotations" ──
  const exportDotationsPDF = useCallback(() => {
    const doc = new jsPDF();
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    // Header UBC SARL
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('UBC SARL — IVOS', 14, 15);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('État des Dotations Carburant', 14, 23);
    doc.setFontSize(9);
    doc.text(`Généré le ${dateStr}`, 14, 30);

    // KPIs summary
    doc.setTextColor(0);
    let y = 45;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Résumé Global', 14, y);
    y += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Dotation Globale: ${stats.totalLitres.toLocaleString('fr-FR')} L`, 14, y);
    doc.text(`Consommation Mois: ${stats.monthLitres.toLocaleString('fr-FR')} L`, 105, y);
    y += 6;
    doc.text(`Budget Total: ${formatCFA(stats.totalCost)}`, 14, y);
    doc.text(`Budget Estimé Mois: ${formatCFA(budgetEstime)}`, 105, y);
    y += 6;
    doc.text(`Efficience: ${efficiencyPercent}%`, 14, y);
    doc.text(`Alertes actives: ${fuelAlerts.length}`, 105, y);
    y += 10;

    // Détail par agent/chauffeur
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Détail par Agent / Chauffeur', 14, y);
    y += 4;

    const driverGroups = new Map<string, FuelAllocation[]>();
    allocations.forEach((a) => {
      const key = a.driverName || 'Non assigné';
      const list = driverGroups.get(key) || [];
      list.push(a);
      driverGroups.set(key, list);
    });

    const tableData: string[][] = [];
    driverGroups.forEach((items, driverName) => {
      const totalL = items.reduce((s, a) => s + a.quantity, 0);
      const totalC = items.reduce((s, a) => s + a.totalCost, 0);
      const agent = agentsAnnuaire.find((ag) => `${ag.firstName} ${ag.lastName}` === driverName);
      const matricule = agent ? agent.matricule : '—';
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const lastDate = items[0] ? new Date(items[0].date).toLocaleDateString('fr-FR') : '—';
      tableData.push([
        driverName,
        matricule,
        items.length.toString(),
        `${totalL.toLocaleString('fr-FR')} L`,
        formatCFA(totalC),
        lastDate,
      ]);
    });

    autoTable(doc, {
      startY: y + 2,
      head: [
        [
          'Agent / Chauffeur',
          'Matricule',
          'Dotations',
          'Volume Total',
          'Coût Total',
          'Dernière Dot.',
        ],
      ],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(128);
      doc.text(`UBC SARL — État des Dotations — Page ${i}/${pageCount}`, 14, 287);
      doc.text('Document confidentiel', 170, 287);
    }

    doc.save(`Etat_Dotations_UBC_${now.toISOString().split('T')[0]}.pdf`);
    toast.success('PDF "État des Dotations" exporté');
  }, [allocations, stats, budgetEstime, efficiencyPercent, fuelAlerts, agentsAnnuaire]);

  const handleVehicleSelect = (registration: string) => {
    const veh = allVehicles.find((v) => v.registration === registration);
    if (veh) {
      setForm((f) => ({
        ...f,
        vehicleRegistration: veh.registration,
        vehicleBrand: veh.brand || '',
        vehicleModel: veh.model || '',
        vehicleSource: veh.source,
        driverName: f.driverName || veh.driver,
      }));
    }
  };

  const handleDriverSelect = (driverName: string) => {
    const person = driversAndAgents.find((p) => p.name === driverName);
    if (person) {
      setForm((f) => ({
        ...f,
        driverName: person.name,
        vehicleRegistration: f.vehicleRegistration || person.vehicle,
        vehicleSource: person.role === 'Agent' ? 'personnel' : f.vehicleSource,
      }));
      if (person.vehicle && !form.vehicleRegistration) {
        handleVehicleSelect(person.vehicle);
      }
    } else {
      setForm((f) => ({ ...f, driverName }));
    }
  };

  const handleQuantityOrPrice = (field: 'quantity' | 'unitPrice', value: number) => {
    setForm((f) => {
      const updated = { ...f, [field]: value };
      updated.totalCost = updated.quantity * updated.unitPrice;
      return updated;
    });
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(defaultForm);
    setIsModalOpen(true);
  };

  const openEdit = (item: FuelAllocation) => {
    setEditingId(item.id);
    setForm({
      vehicleRegistration: item.vehicleRegistration,
      vehicleBrand: item.vehicleBrand,
      vehicleModel: item.vehicleModel,
      vehicleSource: item.vehicleSource,
      vehicleType: item.vehicleType || 'Voiture',
      driverName: item.driverName,
      agentId: item.agentId || '',
      date: item.date,
      fuelType: item.fuelType,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalCost: item.totalCost,
      station: item.station,
      fournisseur: item.fournisseur || '',
      mileageAtFill: item.mileageAtFill,
      bonNumber: item.bonNumber,
      fuelCardId: item.fuelCardId || '',
      usagePeriod: item.usagePeriod || '1 mois',
      monthlyQuota: item.monthlyQuota || 0,
      notes: item.notes,
    });
    setIsModalOpen(true);
  };

  const openView = (item: FuelAllocation) => {
    setViewItem(item);
    setIsViewOpen(true);
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.vehicleRegistration || !form.date || form.quantity <= 0) {
        toast.error('Veuillez remplir les champs obligatoires');
        return;
      }

      const updated = [...allocations];
      if (editingId) {
        const idx = updated.findIndex((a) => a.id === editingId);
        if (idx !== -1) {
          updated[idx] = { ...updated[idx], ...form, totalCost: form.quantity * form.unitPrice };
        }
        toast.success('Dotation modifiée');
      } else {
        const newItem: FuelAllocation = {
          id: crypto.randomUUID(),
          ...form,
          totalCost: form.quantity * form.unitPrice,
          createdAt: new Date().toISOString(),
        };
        updated.unshift(newItem);
        toast.success('Dotation carburant enregistrée');
        // Notification au chauffeur concerné si trouvé
        const driverUser = allUsers.find((u) => u.fullName === newItem.driverName);
        if (driverUser) {
          try {
            await sendNotification({
              userId: driverUser.id,
              type: 'other',
              title: 'Nouvelle dotation carburant',
              message: `Une dotation carburant a été enregistrée pour le véhicule ${newItem.vehicleRegistration} (${newItem.quantity}L).`,
              entityType: 'fuel_allocation',
              entityId: newItem.id,
              metadata: { driver: newItem.driverName },
            });
          } catch (err) {
            console.error('Erreur notification dotation carburant', err);
          }
        }
      }
      saveAllocations(updated);
      setAllocations(updated);
      setIsModalOpen(false);
      setEditingId(null);
      setForm(defaultForm);
    },
    [form, editingId, allocations, allUsers]
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (!confirm('Supprimer cette dotation carburant ?')) return;
      const updated = allocations.filter((a) => a.id !== id);
      saveAllocations(updated);
      setAllocations(updated);
      toast.success('Dotation supprimée');
    },
    [allocations]
  );

  // Cards logic
  const activeCards = useMemo(() => cards.filter((c) => c.status === 'active'), [cards]);

  const filteredCards = useMemo(() => {
    return cards
      .filter((c) => {
        const matchSearch =
          !cardSearch ||
          c.cardNumber.toLowerCase().includes(cardSearch.toLowerCase()) ||
          c.provider.toLowerCase().includes(cardSearch.toLowerCase()) ||
          c.assignedVehicle.toLowerCase().includes(cardSearch.toLowerCase()) ||
          c.assignedDriver.toLowerCase().includes(cardSearch.toLowerCase());
        const matchStatus = filterCardStatus === 'all' || c.status === filterCardStatus;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [cards, cardSearch, filterCardStatus]);

  const cardStats = useMemo(() => {
    const active = cards.filter((c) => c.status === 'active').length;
    const blocked = cards.filter((c) => c.status === 'blocked').length;
    const expired = cards.filter((c) => c.status === 'expired').length;
    const totalLimit = cards
      .filter((c) => c.status === 'active')
      .reduce((s, c) => s + c.monthlyLimit, 0);
    return { total: cards.length, active, blocked, expired, totalLimit };
  }, [cards]);

  const getCardUsageThisMonth = useCallback(
    (cardId: string) => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return allocations
        .filter((a) => a.fuelCardId === cardId && new Date(a.date) >= monthStart)
        .reduce((s, a) => s + a.totalCost, 0);
    },
    [allocations]
  );

  const openAddCard = () => {
    setEditingCardId(null);
    setCardForm(defaultCardForm);
    setIsCardModalOpen(true);
  };

  const openEditCard = (card: FuelCard) => {
    setEditingCardId(card.id);
    setCardForm({
      cardNumber: card.cardNumber,
      cardType: card.cardType || 'parc',
      paymentType: card.paymentType || 'postpayee',
      provider: card.provider,
      assignedVehicle: card.assignedVehicle,
      assignedDriver: card.assignedDriver,
      status: card.status,
      expiryDate: card.expiryDate,
      monthlyLimit: card.monthlyLimit,
      allocatedAmount: card.allocatedAmount || 0,
      allocatedLitres: card.allocatedLitres || 0,
      notes: card.notes,
    });
    setIsCardModalOpen(true);
  };

  const handleCardDriverSelect = (driverName: string) => {
    const person = driversAndAgents.find((p) => p.name === driverName);
    if (person) {
      setCardForm((f) => ({
        ...f,
        assignedDriver: person.name,
        cardType: person.role === 'Agent' ? 'personnel' : 'parc',
        assignedVehicle: f.assignedVehicle || person.vehicle,
      }));
    } else {
      setCardForm((f) => ({ ...f, assignedDriver: driverName }));
    }
  };

  const handleCardVehicleSelect = (registration: string) => {
    const veh = allVehicles.find((v) => v.registration === registration);
    if (veh) {
      setCardForm((f) => ({
        ...f,
        assignedVehicle: veh.registration,
        cardType: veh.source,
        assignedDriver: f.assignedDriver || veh.driver,
      }));
    } else {
      setCardForm((f) => ({ ...f, assignedVehicle: registration }));
    }
  };

  const openViewCard = (card: FuelCard) => {
    setViewCard(card);
    setIsCardViewOpen(true);
  };

  const handleCardSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!cardForm.cardNumber || !cardForm.provider) {
        toast.error('Veuillez remplir les champs obligatoires');
        return;
      }

      const updated = [...cards];
      if (editingCardId) {
        const idx = updated.findIndex((c) => c.id === editingCardId);
        if (idx !== -1) {
          updated[idx] = { ...updated[idx], ...cardForm };
        }
        toast.success('Carte modifiée');
      } else {
        const newCard: FuelCard = {
          id: crypto.randomUUID(),
          ...cardForm,
          createdAt: new Date().toISOString(),
        };
        updated.unshift(newCard);
        toast.success('Carte carburant créée');
      }
      saveCards(updated);
      setCards(updated);
      setIsCardModalOpen(false);
      setEditingCardId(null);
      setCardForm(defaultCardForm);
    },
    [cardForm, editingCardId, cards]
  );

  const handleDeleteCard = useCallback(
    (id: string) => {
      if (!confirm('Supprimer cette carte carburant ?')) return;
      const updated = cards.filter((c) => c.id !== id);
      saveCards(updated);
      setCards(updated);
      toast.success('Carte supprimée');
    },
    [cards]
  );

  const handleToggleCardStatus = useCallback(
    (id: string) => {
      const updated = cards.map((c) => {
        if (c.id === id) {
          const newStatus = c.status === 'active' ? 'blocked' : 'active';
          return { ...c, status: newStatus as FuelCard['status'] };
        }
        return c;
      });
      saveCards(updated);
      setCards(updated);
      const card = updated.find((c) => c.id === id);
      toast.success(card?.status === 'active' ? 'Carte activée' : 'Carte bloquée');
    },
    [cards]
  );

  const statusBadge = (status: FuelCard['status']) => {
    const map = {
      active: 'bg-green-100 text-green-800',
      blocked: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-600',
    };
    const labels = { active: 'Active', blocked: 'Bloquée', expired: 'Expirée' };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${map[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-2 rounded-2xl bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
              <Fuel className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dotation Carburant</h1>
              <p className="text-sm text-gray-300">Gestion centralisée du carburant — UBC SARL</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportDotationsPDF}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold transition-all hover:bg-white/20"
              title="Exporter PDF État des Dotations"
            >
              <FileText className="h-4 w-4" />
              Export PDF
            </button>
            {activeTab === 'dotations' ? (
              <button
                onClick={openAdd}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#1a1a2e] shadow-lg transition-all hover:bg-gray-100"
              >
                <Plus className="h-4 w-4" />
                Nouvelle dotation
              </button>
            ) : (
              <button
                onClick={openAddCard}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#1a1a2e] shadow-lg transition-all hover:bg-gray-100"
              >
                <Plus className="h-4 w-4" />
                Nouvelle carte
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-8">
          <button
            onClick={() => setActiveTab('dotations')}
            className={`border-b-2 px-1 pb-3 text-sm font-semibold transition-all ${
              activeTab === 'dotations'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <Fuel className="h-4 w-4" />
              Dotations
              {allocations.length > 0 && (
                <span
                  className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    activeTab === 'dotations'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {allocations.length}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('cartes')}
            className={`border-b-2 px-1 pb-3 text-sm font-semibold transition-all ${
              activeTab === 'cartes'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Cartes Carburant
              {cards.length > 0 && (
                <span
                  className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    activeTab === 'cartes'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {cards.length}
                </span>
              )}
            </div>
          </button>
        </nav>
      </div>

      {/* ══════ ALERT BANNER ══════ */}
      {fuelAlerts.length > 0 && (
        <div
          className={`rounded-2xl border-2 p-4 ${alertCritiques > 0 ? 'border-red-300 bg-gradient-to-r from-red-50 to-orange-50' : 'border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50'}`}
        >
          <div className="mb-3 flex items-center gap-3">
            <div
              className={`rounded-xl p-2 ${alertCritiques > 0 ? 'bg-red-500' : 'bg-orange-500'}`}
            >
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-gray-900">
                {alertCritiques > 0 && (
                  <span className="text-red-600">
                    {alertCritiques} critique{alertCritiques > 1 ? 's' : ''}
                  </span>
                )}
                {alertCritiques > 0 && alertWarnings > 0 && (
                  <span className="text-gray-400"> · </span>
                )}
                {alertWarnings > 0 && (
                  <span className="text-orange-600">
                    {alertWarnings} avertissement{alertWarnings > 1 ? 's' : ''}
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500">
                Alertes carburant actives — Seuils 85% et anomalies détectées
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {fuelAlerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className={`flex items-center justify-between rounded-xl p-3 ${alert.severity === 'critical' ? 'border border-red-200 bg-red-100/80' : 'border border-orange-200 bg-orange-100/80'}`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${alert.severity === 'critical' ? 'bg-red-500' : 'bg-orange-500'}`}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-gray-900">{alert.title}</p>
                    <p className="truncate text-[10px] text-gray-600">{alert.message}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setResolvingAlert(alert);
                    setIsResolveModalOpen(true);
                  }}
                  className="ml-3 inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-gray-700 transition-colors hover:border-green-300 hover:bg-green-50 hover:text-green-700"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Résolu
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'dotations' ? (
        <>
          {/* ══════ KPIs DASHBOARD ══════ */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Dotation Globale */}
            <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
              <div className="absolute left-0 top-0 h-full w-1 rounded-l-2xl bg-gradient-to-b from-blue-400 to-blue-600" />
              <div className="mb-3 flex items-center justify-between">
                <div className="rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 p-2.5 shadow-lg shadow-blue-200/50">
                  <Fuel className="h-5 w-5 text-white" />
                </div>
                <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                  Global
                </span>
              </div>
              <p className="mb-1 text-xs font-medium text-gray-500">Dotation Globale</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalLitres.toLocaleString('fr-FR')}{' '}
                <span className="text-sm text-gray-500">L</span>
              </p>
              <p className="mt-1 text-[10px] text-gray-400">
                {stats.totalAllocations} dotation{stats.totalAllocations > 1 ? 's' : ''} enregistrée
                {stats.totalAllocations > 1 ? 's' : ''}
              </p>
            </div>
            {/* Consommation Actuelle */}
            <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
              <div className="absolute left-0 top-0 h-full w-1 rounded-l-2xl bg-gradient-to-b from-emerald-400 to-emerald-600" />
              <div className="mb-3 flex items-center justify-between">
                <div className="rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 p-2.5 shadow-lg shadow-emerald-200/50">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                  Ce mois
                </span>
              </div>
              <p className="mb-1 text-xs font-medium text-gray-500">Consommation Actuelle</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.monthLitres.toLocaleString('fr-FR')}{' '}
                <span className="text-sm text-gray-500">L</span>
              </p>
              <p className="mt-1 text-[10px] text-gray-400">
                {stats.monthCount} dotation{stats.monthCount > 1 ? 's' : ''} ·{' '}
                {formatCFA(stats.monthCost)}
              </p>
            </div>
            {/* Budget Estimé */}
            <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
              <div className="absolute left-0 top-0 h-full w-1 rounded-l-2xl bg-gradient-to-b from-amber-400 to-orange-500" />
              <div className="mb-3 flex items-center justify-between">
                <div className="rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 p-2.5 shadow-lg shadow-orange-200/50">
                  <Calculator className="h-5 w-5 text-white" />
                </div>
                <span className="rounded-full border border-orange-100 bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-700">
                  Estimé
                </span>
              </div>
              <p className="mb-1 text-xs font-medium text-gray-500">Budget Estimé (mois)</p>
              <p className="text-2xl font-bold text-gray-900">{formatCFA(budgetEstime)}</p>
              <p className="mt-1 text-[10px] text-gray-400">
                Réel : {formatCFA(stats.monthCost)} · Total : {formatCFA(stats.totalCost)}
              </p>
            </div>
            {/* Indicateur d'Efficience */}
            <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
              <div
                className={`absolute left-0 top-0 h-full w-1 rounded-l-2xl ${efficiencyPercent >= 100 ? 'bg-gradient-to-b from-red-400 to-red-600' : efficiencyPercent >= 85 ? 'bg-gradient-to-b from-orange-400 to-orange-600' : 'bg-gradient-to-b from-green-400 to-green-600'}`}
              />
              <div className="mb-3 flex items-center justify-between">
                <div
                  className={`rounded-xl p-2.5 shadow-lg ${efficiencyPercent >= 100 ? 'bg-gradient-to-br from-red-400 to-red-600 shadow-red-200/50' : efficiencyPercent >= 85 ? 'bg-gradient-to-br from-orange-400 to-orange-600 shadow-orange-200/50' : 'bg-gradient-to-br from-green-400 to-green-600 shadow-green-200/50'}`}
                >
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${efficiencyPercent >= 100 ? 'border-red-100 bg-red-50 text-red-700' : efficiencyPercent >= 85 ? 'border-orange-100 bg-orange-50 text-orange-700' : 'border-green-100 bg-green-50 text-green-700'}`}
                >
                  {efficiencyPercent >= 100
                    ? 'Dépassé'
                    : efficiencyPercent >= 85
                      ? 'Attention'
                      : 'OK'}
                </span>
              </div>
              <p className="mb-1 text-xs font-medium text-gray-500">Indicateur d'Efficience</p>
              <p
                className={`text-2xl font-bold ${efficiencyPercent >= 100 ? 'text-red-600' : efficiencyPercent >= 85 ? 'text-orange-600' : 'text-green-600'}`}
              >
                {efficiencyPercent}%
              </p>
              <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                <div
                  className={`h-2 rounded-full transition-all ${efficiencyPercent >= 100 ? 'bg-red-500' : efficiencyPercent >= 85 ? 'bg-orange-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(100, efficiencyPercent)}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-gray-400">% consommé des plafonds cartes</p>
            </div>
          </div>

          {/* Comptabilisation Parc vs Fonction */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 shadow-lg shadow-blue-200/50">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">
                  Comptabilisation par source de véhicule
                </h2>
                <p className="text-[11px] text-gray-400">
                  Cumul total — {stats.totalAllocations} dotation
                  {stats.totalAllocations > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Véhicules Parc */}
              <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/60 to-white p-5 transition-all hover:shadow-md">
                <div className="mb-4 flex items-center gap-2.5">
                  <div className="rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 p-1.5">
                    <Truck className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-bold text-blue-800">Véhicules Parc</span>
                  <span className="ml-auto text-xs text-gray-500">
                    {stats.parc.count} dotation{stats.parc.count > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-white p-3 shadow-sm">
                    <p className="mb-1 text-[10px] uppercase tracking-wider text-gray-500">
                      Volume total
                    </p>
                    <p className="text-xl font-bold text-gray-900">
                      {stats.parc.litres.toLocaleString('fr-FR')} L
                    </p>
                  </div>
                  <div className="rounded-lg bg-white p-3 shadow-sm">
                    <p className="mb-1 text-[10px] uppercase tracking-wider text-gray-500">
                      Coût total
                    </p>
                    <p className="text-xl font-bold text-blue-700">{formatCFA(stats.parc.cost)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-yellow-500"></span>Gasoil
                    </span>
                    <span className="font-medium text-gray-700">
                      {stats.parc.gasoil.litres.toLocaleString('fr-FR')} L —{' '}
                      {formatCFA(stats.parc.gasoil.cost)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-green-500"></span>Essence
                    </span>
                    <span className="font-medium text-gray-700">
                      {stats.parc.essence.litres.toLocaleString('fr-FR')} L —{' '}
                      {formatCFA(stats.parc.essence.cost)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>Super
                    </span>
                    <span className="font-medium text-gray-700">
                      {stats.parc.super_.litres.toLocaleString('fr-FR')} L —{' '}
                      {formatCFA(stats.parc.super_.cost)}
                    </span>
                  </div>
                </div>
                {stats.totalLitres > 0 && (
                  <div className="mt-3 border-t border-blue-100 pt-3">
                    <div className="mb-1 flex justify-between text-[10px] text-gray-400">
                      <span>Part du total</span>
                      <span>{Math.round((stats.parc.litres / stats.totalLitres) * 100)}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{
                          width: `${Math.round((stats.parc.litres / stats.totalLitres) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
                {stats.parcMois.count > 0 && (
                  <div className="mt-3 border-t border-blue-100 pt-3">
                    <p className="mb-1 text-[10px] uppercase tracking-wider text-gray-400">
                      Ce mois
                    </p>
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-blue-700">
                        {stats.parcMois.litres.toLocaleString('fr-FR')} L
                      </span>
                      <span className="font-medium text-blue-700">
                        {formatCFA(stats.parcMois.cost)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              {/* Véhicules de Fonction */}
              <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/60 to-white p-5 transition-all hover:shadow-md">
                <div className="mb-4 flex items-center gap-2.5">
                  <div className="rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 p-1.5">
                    <Car className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-bold text-purple-800">Véhicules de Fonction</span>
                  <span className="ml-auto text-xs text-gray-500">
                    {stats.personnel.count} dotation{stats.personnel.count > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-white p-3 shadow-sm">
                    <p className="mb-1 text-[10px] uppercase tracking-wider text-gray-500">
                      Volume total
                    </p>
                    <p className="text-xl font-bold text-gray-900">
                      {stats.personnel.litres.toLocaleString('fr-FR')} L
                    </p>
                  </div>
                  <div className="rounded-lg bg-white p-3 shadow-sm">
                    <p className="mb-1 text-[10px] uppercase tracking-wider text-gray-500">
                      Coût total
                    </p>
                    <p className="text-xl font-bold text-purple-700">
                      {formatCFA(stats.personnel.cost)}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-yellow-500"></span>Gasoil
                    </span>
                    <span className="font-medium text-gray-700">
                      {stats.personnel.gasoil.litres.toLocaleString('fr-FR')} L —{' '}
                      {formatCFA(stats.personnel.gasoil.cost)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-green-500"></span>Essence
                    </span>
                    <span className="font-medium text-gray-700">
                      {stats.personnel.essence.litres.toLocaleString('fr-FR')} L —{' '}
                      {formatCFA(stats.personnel.essence.cost)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>Super
                    </span>
                    <span className="font-medium text-gray-700">
                      {stats.personnel.super_.litres.toLocaleString('fr-FR')} L —{' '}
                      {formatCFA(stats.personnel.super_.cost)}
                    </span>
                  </div>
                </div>
                {stats.totalLitres > 0 && (
                  <div className="mt-3 border-t border-purple-100 pt-3">
                    <div className="mb-1 flex justify-between text-[10px] text-gray-400">
                      <span>Part du total</span>
                      <span>{Math.round((stats.personnel.litres / stats.totalLitres) * 100)}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-purple-500"
                        style={{
                          width: `${Math.round((stats.personnel.litres / stats.totalLitres) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
                {stats.personnelMois.count > 0 && (
                  <div className="mt-3 border-t border-purple-100 pt-3">
                    <p className="mb-1 text-[10px] uppercase tracking-wider text-gray-400">
                      Ce mois
                    </p>
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-purple-700">
                        {stats.personnelMois.litres.toLocaleString('fr-FR')} L
                      </span>
                      <span className="font-medium text-purple-700">
                        {formatCFA(stats.personnelMois.cost)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Consommation mensuelle par type */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 p-2.5 shadow-lg shadow-orange-200/50">
                <Droplets className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">
                  Consommation mensuelle par type de carburant
                </h2>
                <p className="text-[11px] text-gray-400">
                  {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Gasoil */}
              <div className="rounded-2xl border border-yellow-200 bg-gradient-to-br from-yellow-50/60 to-white p-4 transition-all hover:shadow-md">
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-bold text-yellow-800">
                    Gasoil
                  </span>
                  <span className="text-xs text-gray-500">
                    {stats.gasoil.count} dotation{stats.gasoil.count > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-end justify-between">
                    <span className="text-xs text-gray-500">Volume</span>
                    <span className="text-lg font-bold text-gray-900">
                      {stats.gasoil.litres.toLocaleString('fr-FR')} L
                    </span>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-xs text-gray-500">Montant</span>
                    <span className="text-lg font-bold text-yellow-700">
                      {formatCFA(stats.gasoil.cost)}
                    </span>
                  </div>
                  {stats.gasoil.litres > 0 && stats.monthLitres > 0 && (
                    <div className="pt-2">
                      <div className="mb-1 flex justify-between text-[10px] text-gray-400">
                        <span>Part du total</span>
                        <span>{Math.round((stats.gasoil.litres / stats.monthLitres) * 100)}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-200">
                        <div
                          className="h-1.5 rounded-full bg-yellow-500"
                          style={{
                            width: `${Math.round((stats.gasoil.litres / stats.monthLitres) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Essence */}
              <div className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50/60 to-white p-4 transition-all hover:shadow-md">
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-800">
                    Essence
                  </span>
                  <span className="text-xs text-gray-500">
                    {stats.essence.count} dotation{stats.essence.count > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-end justify-between">
                    <span className="text-xs text-gray-500">Volume</span>
                    <span className="text-lg font-bold text-gray-900">
                      {stats.essence.litres.toLocaleString('fr-FR')} L
                    </span>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-xs text-gray-500">Montant</span>
                    <span className="text-lg font-bold text-green-700">
                      {formatCFA(stats.essence.cost)}
                    </span>
                  </div>
                  {stats.essence.litres > 0 && stats.monthLitres > 0 && (
                    <div className="pt-2">
                      <div className="mb-1 flex justify-between text-[10px] text-gray-400">
                        <span>Part du total</span>
                        <span>{Math.round((stats.essence.litres / stats.monthLitres) * 100)}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-200">
                        <div
                          className="h-1.5 rounded-full bg-green-500"
                          style={{
                            width: `${Math.round((stats.essence.litres / stats.monthLitres) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Super */}
              <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/60 to-white p-4 transition-all hover:shadow-md">
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">
                    Super
                  </span>
                  <span className="text-xs text-gray-500">
                    {stats.super_.count} dotation{stats.super_.count > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-end justify-between">
                    <span className="text-xs text-gray-500">Volume</span>
                    <span className="text-lg font-bold text-gray-900">
                      {stats.super_.litres.toLocaleString('fr-FR')} L
                    </span>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-xs text-gray-500">Montant</span>
                    <span className="text-lg font-bold text-blue-700">
                      {formatCFA(stats.super_.cost)}
                    </span>
                  </div>
                  {stats.super_.litres > 0 && stats.monthLitres > 0 && (
                    <div className="pt-2">
                      <div className="mb-1 flex justify-between text-[10px] text-gray-400">
                        <span>Part du total</span>
                        <span>{Math.round((stats.super_.litres / stats.monthLitres) * 100)}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-200">
                        <div
                          className="h-1.5 rounded-full bg-blue-500"
                          style={{
                            width: `${Math.round((stats.super_.litres / stats.monthLitres) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Total summary row */}
            <div className="mt-4 flex flex-wrap items-center gap-6 border-t border-gray-100 pt-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Total mois :</span>
                <span className="text-sm font-bold text-gray-900">
                  {stats.monthLitres.toLocaleString('fr-FR')} L
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Coût total :</span>
                <span className="text-sm font-bold text-gray-900">
                  {formatCFA(stats.monthCost)}
                </span>
              </div>
              {stats.monthLitres > 0 && stats.monthCost > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Prix moyen :</span>
                  <span className="text-sm font-bold text-gray-900">
                    {formatCFA(Math.round(stats.monthCost / stats.monthLitres))}/L
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par immatriculation, chauffeur, station, N° bon..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-4 text-sm transition-colors focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={filterFuelType}
                onChange={(e) => setFilterFuelType(e.target.value)}
                className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tous carburants</option>
                <option value="Gasoil">Gasoil</option>
                <option value="Essence">Essence</option>
                <option value="Super">Super</option>
              </select>
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tous véhicules</option>
                <option value="parc">Parc</option>
                <option value="personnel">Personnel</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            {filtered.length === 0 ? (
              <div className="p-16 text-center">
                <div className="mb-4 inline-flex rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 p-5">
                  <Fuel className="h-10 w-10 text-gray-300" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  Aucune dotation carburant
                </h3>
                <p className="mb-6 text-sm text-gray-500">Commencez par enregistrer une dotation</p>
                <button
                  onClick={openAdd}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200/50 transition-all hover:from-blue-600 hover:to-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Nouvelle dotation
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-[#1a1a2e]">
                    <tr>
                      <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-white">
                        Date
                      </th>
                      <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-white">
                        Véhicule
                      </th>
                      <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-white">
                        Chauffeur
                      </th>
                      <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-white">
                        Carburant
                      </th>
                      <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-white">
                        Quantité
                      </th>
                      <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-white">
                        Coût
                      </th>
                      <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-white">
                        Station
                      </th>
                      <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-white">
                        N° Bon
                      </th>
                      <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-white">
                        Période
                      </th>
                      <th className="px-4 py-3.5 text-right text-[11px] font-bold uppercase tracking-wider text-white">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filtered.map((item) => (
                      <tr key={item.id} className="transition-colors hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                          {new Date(item.date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-2">
                            {item.vehicleSource === 'personnel' ? (
                              <Car className="h-4 w-4 text-purple-500" />
                            ) : (
                              <Truck className="h-4 w-4 text-blue-500" />
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {item.vehicleRegistration}
                              </p>
                              <p className="text-xs text-gray-500">
                                {item.vehicleBrand} {item.vehicleModel}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                          {item.driverName || '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              item.fuelType === 'Gasoil'
                                ? 'bg-yellow-100 text-yellow-800'
                                : item.fuelType === 'Essence'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {item.fuelType}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                          {item.quantity} L
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-gray-900">
                          {formatCFA(item.totalCost)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                          {item.station || '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                          {item.bonNumber || '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800">
                            <Calendar className="h-3 w-3" />
                            {item.usagePeriod || '1 mois'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openView(item)}
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                              title="Voir"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openEdit(item)}
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-yellow-50 hover:text-yellow-600"
                              title="Modifier"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Add/Edit Modal */}
          <Modal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingId(null);
              setShowAgentDropdown(false);
            }}
            title={editingId ? 'Modifier la dotation' : 'Nouvelle dotation carburant'}
            size="lg"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* ── Type de véhicule ── */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Type de véhicule *
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, vehicleType: 'Moto' }))}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all ${
                      form.vehicleType === 'Moto'
                        ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <Bike className="h-4 w-4" />
                    Moto
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, vehicleType: 'Voiture' }))}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all ${
                      form.vehicleType === 'Voiture'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <Car className="h-4 w-4" />
                    Voiture
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, vehicleType: 'Camion' }))}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all ${
                      form.vehicleType === 'Camion'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <Truck className="h-4 w-4" />
                    Camion
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Véhicule *</label>
                  <select
                    value={form.vehicleRegistration}
                    onChange={(e) => handleVehicleSelect(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Sélectionner un véhicule</option>
                    <optgroup label="Véhicules Parc">
                      {allVehicles
                        .filter((v) => v.source === 'parc')
                        .map((v) => (
                          <option key={v.registration} value={v.registration}>
                            {v.registration} — {v.brand} {v.model}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Véhicules Personnels">
                      {allVehicles
                        .filter((v) => v.source === 'personnel')
                        .map((v) => (
                          <option key={v.registration} value={v.registration}>
                            {v.registration} — {v.brand} {v.model}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>
                {/* ── Agent Autocomplete (Annuaire) ── */}
                <div className="relative">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    <span className="inline-flex items-center gap-1">
                      <User className="h-3.5 w-3.5" /> Agent / Chauffeur (Annuaire)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={agentSearch || form.driverName}
                    onChange={(e) => {
                      setAgentSearch(e.target.value);
                      setShowAgentDropdown(true);
                      setForm((f) => ({ ...f, driverName: e.target.value, agentId: '' }));
                    }}
                    onFocus={() => setShowAgentDropdown(true)}
                    placeholder="Rechercher par nom ou matricule..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {showAgentDropdown && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
                      {agentsAnnuaire
                        .filter((ag) => {
                          const q = (agentSearch || '').toLowerCase();
                          return (
                            !q ||
                            `${ag.firstName} ${ag.lastName}`.toLowerCase().includes(q) ||
                            ag.matricule.toLowerCase().includes(q)
                          );
                        })
                        .map((ag) => (
                          <button
                            key={ag.id}
                            type="button"
                            onClick={() => {
                              const fullName = `${ag.firstName} ${ag.lastName}`;
                              setForm((f) => ({ ...f, driverName: fullName, agentId: ag.id }));
                              setAgentSearch('');
                              setShowAgentDropdown(false);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-blue-50"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 text-[10px] font-bold text-white">
                              {ag.firstName[0]}
                              {ag.lastName[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-gray-900">
                                {ag.firstName} {ag.lastName}
                              </p>
                              <p className="text-[10px] text-gray-500">
                                {ag.matricule} · {ag.role}
                              </p>
                            </div>
                          </button>
                        ))}
                      {/* Chauffeurs (non Annuaire) */}
                      {driversAndAgents
                        .filter((p) => p.role === 'Chauffeur')
                        .map((p) => (
                          <button
                            key={`dr_${p.name}`}
                            type="button"
                            onClick={() => {
                              handleDriverSelect(p.name);
                              setAgentSearch('');
                              setShowAgentDropdown(false);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-indigo-50"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-300 text-[10px] font-bold text-white">
                              {p.name
                                .split(' ')
                                .map((n: string) => n[0])
                                .join('')}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-gray-900">{p.name}</p>
                              <p className="text-[10px] text-gray-500">Chauffeur</p>
                            </div>
                          </button>
                        ))}
                      <button
                        type="button"
                        onClick={() => setShowAgentDropdown(false)}
                        className="w-full border-t px-3 py-1.5 text-center text-xs text-gray-400 hover:text-gray-600"
                      >
                        Fermer
                      </button>
                    </div>
                  )}
                  {/* Agent info card */}
                  {form.agentId &&
                    (() => {
                      const ag = agentsAnnuaire.find((a) => a.id === form.agentId);
                      if (!ag) return null;
                      return (
                        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 text-[9px] font-bold text-white">
                            {ag.firstName[0]}
                            {ag.lastName[0]}
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold text-blue-800">
                              {ag.firstName} {ag.lastName}
                            </p>
                            <p className="text-[9px] text-blue-600">
                              {ag.matricule} · {ag.role} · {ag.quartier}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Date *"
                  name="date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  required
                />
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Type de carburant *
                  </label>
                  <select
                    value={form.fuelType}
                    onChange={(e) => setForm((f) => ({ ...f, fuelType: e.target.value as any }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Gasoil">Gasoil</option>
                    <option value="Essence">Essence</option>
                    <option value="Super">Super</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Période d'utilisation *
                  </label>
                  <select
                    value={form.usagePeriod}
                    onChange={(e) => setForm((f) => ({ ...f, usagePeriod: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1 semaine">1 semaine</option>
                    <option value="2 semaines">2 semaines</option>
                    <option value="1 mois">1 mois</option>
                    <option value="2 mois">2 mois</option>
                    <option value="3 mois">3 mois</option>
                    <option value="6 mois">6 mois</option>
                    <option value="1 an">1 an</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Quantité (litres) *"
                  name="quantity"
                  type="number"
                  value={form.quantity || ''}
                  onChange={(e) =>
                    handleQuantityOrPrice('quantity', parseFloat(e.target.value) || 0)
                  }
                  placeholder="0"
                  required
                />
                <Input
                  label="Prix unitaire (CFA/L)"
                  name="unitPrice"
                  type="number"
                  value={form.unitPrice || ''}
                  onChange={(e) =>
                    handleQuantityOrPrice('unitPrice', parseFloat(e.target.value) || 0)
                  }
                  placeholder="0"
                />
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Coût total</label>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900">
                    {formatCFA(form.quantity * form.unitPrice)}
                  </div>
                </div>
              </div>
              {/* ── Fournisseur + Station + Quota ── */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    <span className="inline-flex items-center gap-1">
                      <CreditCard className="h-3.5 w-3.5" /> Fournisseur
                    </span>
                  </label>
                  <select
                    value={form.fournisseur}
                    onChange={(e) => setForm((f) => ({ ...f, fournisseur: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner</option>
                    <option value="Total">Total</option>
                    <option value="Ola">Ola Energy</option>
                    <option value="Shell">Shell</option>
                    <option value="Elton">Elton</option>
                    <option value="Star Oil">Star Oil</option>
                    <option value="EDK">EDK</option>
                    <option value="Vivo Energy">Vivo Energy</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
                <Input
                  label="Station"
                  name="station"
                  value={form.station}
                  onChange={(e) => setForm((f) => ({ ...f, station: e.target.value }))}
                  placeholder="Ex: Total Dakar Plateau"
                />
                <Input
                  label="Quota mensuel (L)"
                  name="monthlyQuota"
                  type="number"
                  value={form.monthlyQuota || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, monthlyQuota: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="Ex: 200"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Kilométrage au remplissage"
                  name="mileageAtFill"
                  type="number"
                  value={form.mileageAtFill || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, mileageAtFill: parseInt(e.target.value) || 0 }))
                  }
                  placeholder="0"
                />
                <Input
                  label="N° Bon"
                  name="bonNumber"
                  value={form.bonNumber}
                  onChange={(e) => setForm((f) => ({ ...f, bonNumber: e.target.value }))}
                  placeholder="Ex: BON-2026-001"
                />
              </div>
              {activeCards.length > 0 && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Carte carburant
                  </label>
                  <select
                    value={form.fuelCardId}
                    onChange={(e) => setForm((f) => ({ ...f, fuelCardId: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Aucune carte</option>
                    {activeCards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.cardNumber} — {c.provider}
                        {c.assignedVehicle ? ` (${c.assignedVehicle})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <Textarea
                label="Notes"
                name="notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Remarques éventuelles..."
              />
              <div className="flex justify-end gap-3 border-t pt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingId(null);
                  }}
                >
                  Annuler
                </Button>
                <Button type="submit" variant="primary">
                  {editingId ? 'Enregistrer' : 'Créer la dotation'}
                </Button>
              </div>
            </form>
          </Modal>

          {/* View Modal */}
          <Modal
            isOpen={isViewOpen}
            onClose={() => setIsViewOpen(false)}
            title="Détail de la dotation"
            size="md"
          >
            {viewItem && (
              <div className="space-y-4">
                <div className="rounded-xl border border-blue-100/50 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-4">
                  <div className="mb-2 flex items-center gap-3">
                    <div
                      className={`rounded-lg p-2 shadow-md ${viewItem.vehicleSource === 'personnel' ? 'bg-gradient-to-br from-purple-400 to-purple-600' : 'bg-gradient-to-br from-blue-400 to-blue-600'}`}
                    >
                      {viewItem.vehicleSource === 'personnel' ? (
                        <Car className="h-5 w-5 text-white" />
                      ) : (
                        <Truck className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{viewItem.vehicleRegistration}</p>
                      <p className="text-sm text-gray-600">
                        {viewItem.vehicleBrand} {viewItem.vehicleModel}
                      </p>
                    </div>
                    <span
                      className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${
                        viewItem.vehicleSource === 'personnel'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {viewItem.vehicleSource === 'personnel' ? 'Personnel' : 'Parc'}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="mb-0.5 text-xs text-gray-500">Date</p>
                    <p className="font-semibold">
                      {new Date(viewItem.date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div>
                    <p className="mb-0.5 text-xs text-gray-500">Chauffeur / Agent</p>
                    <p className="font-semibold">{viewItem.driverName || '—'}</p>
                  </div>
                  <div>
                    <p className="mb-0.5 text-xs text-gray-500">Type de carburant</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        viewItem.fuelType === 'Gasoil'
                          ? 'bg-yellow-100 text-yellow-800'
                          : viewItem.fuelType === 'Essence'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {viewItem.fuelType}
                    </span>
                  </div>
                  <div>
                    <p className="mb-0.5 text-xs text-gray-500">Quantité</p>
                    <p className="font-semibold">{viewItem.quantity} L</p>
                  </div>
                  <div>
                    <p className="mb-0.5 text-xs text-gray-500">Prix unitaire</p>
                    <p className="font-semibold">
                      {viewItem.unitPrice ? formatCFA(viewItem.unitPrice) + '/L' : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="mb-0.5 text-xs text-gray-500">Coût total</p>
                    <p className="text-lg font-bold text-blue-700">
                      {formatCFA(viewItem.totalCost)}
                    </p>
                  </div>
                  <div>
                    <p className="mb-0.5 text-xs text-gray-500">Station</p>
                    <p className="font-semibold">{viewItem.station || '—'}</p>
                  </div>
                  <div>
                    <p className="mb-0.5 text-xs text-gray-500">Kilométrage</p>
                    <p className="font-semibold">
                      {viewItem.mileageAtFill
                        ? viewItem.mileageAtFill.toLocaleString('fr-FR') + ' km'
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="mb-0.5 text-xs text-gray-500">N° Bon</p>
                    <p className="font-semibold">{viewItem.bonNumber || '—'}</p>
                  </div>
                  <div>
                    <p className="mb-0.5 text-xs text-gray-500">Période d'utilisation</p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800">
                      <Calendar className="h-3 w-3" />
                      {viewItem.usagePeriod || '1 mois'}
                    </span>
                  </div>
                  {viewItem.fuelCardId && (
                    <div>
                      <p className="mb-0.5 text-xs text-gray-500">Carte carburant</p>
                      <p className="font-semibold">
                        {(() => {
                          const c = cards.find((c) => c.id === viewItem.fuelCardId);
                          return c ? `${c.cardNumber} (${c.provider})` : '—';
                        })()}
                      </p>
                    </div>
                  )}
                </div>
                {viewItem.notes && (
                  <div className="border-t pt-3">
                    <p className="mb-1 text-xs text-gray-500">Notes</p>
                    <p className="text-sm text-gray-700">{viewItem.notes}</p>
                  </div>
                )}
                <div className="flex justify-end border-t pt-4">
                  <Button variant="secondary" onClick={() => setIsViewOpen(false)}>
                    Fermer
                  </Button>
                </div>
              </div>
            )}
          </Modal>
        </>
      ) : (
        <>
          {/* Cards KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
              <div className="absolute left-0 top-0 h-full w-1 rounded-l-2xl bg-gradient-to-b from-blue-400 to-blue-600" />
              <div className="mb-3 flex items-center justify-between">
                <div className="rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 p-2.5 shadow-lg shadow-blue-200/50">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                  Total
                </span>
              </div>
              <p className="mb-1 text-xs font-medium text-gray-500">Total cartes</p>
              <p className="text-2xl font-bold text-gray-900">{cardStats.total}</p>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
              <div className="absolute left-0 top-0 h-full w-1 rounded-l-2xl bg-gradient-to-b from-emerald-400 to-emerald-600" />
              <div className="mb-3 flex items-center justify-between">
                <div className="rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 p-2.5 shadow-lg shadow-emerald-200/50">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
                <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                  Actives
                </span>
              </div>
              <p className="mb-1 text-xs font-medium text-gray-500">Cartes actives</p>
              <p className="text-2xl font-bold text-gray-900">{cardStats.active}</p>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
              <div className="absolute left-0 top-0 h-full w-1 rounded-l-2xl bg-gradient-to-b from-rose-400 to-red-500" />
              <div className="mb-3 flex items-center justify-between">
                <div className="rounded-xl bg-gradient-to-br from-rose-400 to-red-500 p-2.5 shadow-lg shadow-red-200/50">
                  <Ban className="h-5 w-5 text-white" />
                </div>
                <span className="rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700">
                  Bloquées
                </span>
              </div>
              <p className="mb-1 text-xs font-medium text-gray-500">Cartes bloquées</p>
              <p className="text-2xl font-bold text-gray-900">{cardStats.blocked}</p>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
              <div className="absolute left-0 top-0 h-full w-1 rounded-l-2xl bg-gradient-to-b from-amber-400 to-orange-500" />
              <div className="mb-3 flex items-center justify-between">
                <div className="rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 p-2.5 shadow-lg shadow-orange-200/50">
                  <Fuel className="h-5 w-5 text-white" />
                </div>
                <span className="rounded-full border border-orange-100 bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-700">
                  Plafond
                </span>
              </div>
              <p className="mb-1 text-xs font-medium text-gray-500">Plafond mensuel total</p>
              <p className="text-2xl font-bold text-gray-900">{formatCFA(cardStats.totalLimit)}</p>
            </div>
          </div>

          {/* Cards Filters */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par N° carte, fournisseur, véhicule, chauffeur..."
                  value={cardSearch}
                  onChange={(e) => setCardSearch(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-4 text-sm transition-colors focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={filterCardStatus}
                onChange={(e) => setFilterCardStatus(e.target.value)}
                className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tous statuts</option>
                <option value="active">Active</option>
                <option value="blocked">Bloquée</option>
                <option value="expired">Expirée</option>
              </select>
            </div>
          </div>

          {/* Cards Table */}
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            {filteredCards.length === 0 ? (
              <div className="p-16 text-center">
                <div className="mb-4 inline-flex rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 p-5">
                  <CreditCard className="h-10 w-10 text-gray-300" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">Aucune carte carburant</h3>
                <p className="mb-6 text-sm text-gray-500">Commencez par enregistrer une carte</p>
                <button
                  onClick={openAddCard}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200/50 transition-all hover:from-blue-600 hover:to-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Nouvelle carte
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-[#1a1a2e]">
                    <tr>
                      <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-white">
                        N° Carte
                      </th>
                      <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-white">
                        Source
                      </th>
                      <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-white">
                        Type carte
                      </th>
                      <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-white">
                        Fournisseur
                      </th>
                      <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-white">
                        Véhicule
                      </th>
                      <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-white">
                        Chauffeur
                      </th>
                      <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-white">
                        Statut
                      </th>
                      <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-white">
                        Alloué
                      </th>
                      <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-white">
                        Consommé
                      </th>
                      <th className="px-4 py-3.5 text-right text-[11px] font-bold uppercase tracking-wider text-white">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredCards.map((card) => {
                      const usage = getCardUsageThisMonth(card.id);
                      const usagePercent =
                        card.monthlyLimit > 0 ? Math.round((usage / card.monthlyLimit) * 100) : 0;
                      return (
                        <tr key={card.id} className="transition-colors hover:bg-gray-50">
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-blue-500" />
                              <span className="text-sm font-medium text-gray-900">
                                {card.cardNumber}
                              </span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${(card.cardType || 'parc') === 'parc' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}
                            >
                              {(card.cardType || 'parc') === 'parc' ? 'Parc' : 'Personnel'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                (card.paymentType || 'postpayee') === 'prepayee'
                                  ? 'bg-amber-100 text-amber-800'
                                  : (card.paymentType || 'postpayee') === 'africapass'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-indigo-100 text-indigo-800'
                              }`}
                            >
                              {(card.paymentType || 'postpayee') === 'prepayee'
                                ? 'Prépayée'
                                : (card.paymentType || 'postpayee') === 'africapass'
                                  ? 'Africapass'
                                  : 'Postpayée'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                            {card.provider}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                            {card.assignedVehicle || '—'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                            {card.assignedDriver || '—'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {statusBadge(card.status)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="text-sm">
                              {card.allocatedAmount > 0 && (
                                <p className="font-semibold text-gray-900">
                                  {formatCFA(card.allocatedAmount)}
                                </p>
                              )}
                              {card.allocatedLitres > 0 && (
                                <p className="text-xs text-gray-500">
                                  {card.allocatedLitres.toLocaleString('fr-FR')} L
                                </p>
                              )}
                              {!card.allocatedAmount && !card.allocatedLitres && (
                                <span className="text-gray-400">—</span>
                              )}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-medium ${usagePercent >= 90 ? 'text-red-600' : usagePercent >= 70 ? 'text-orange-600' : 'text-gray-900'}`}
                              >
                                {formatCFA(usage)}
                              </span>
                              {card.monthlyLimit > 0 && (
                                <span
                                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                                    usagePercent >= 90
                                      ? 'bg-red-100 text-red-700'
                                      : usagePercent >= 70
                                        ? 'bg-orange-100 text-orange-700'
                                        : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {usagePercent}%
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openViewCard(card)}
                                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                                title="Voir"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => openEditCard(card)}
                                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-yellow-50 hover:text-yellow-600"
                                title="Modifier"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              {card.status !== 'expired' && (
                                <button
                                  onClick={() => handleToggleCardStatus(card.id)}
                                  className={`rounded-lg p-1.5 transition-colors ${card.status === 'active' ? 'text-gray-400 hover:bg-red-50 hover:text-red-600' : 'text-gray-400 hover:bg-green-50 hover:text-green-600'}`}
                                  title={card.status === 'active' ? 'Bloquer' : 'Activer'}
                                >
                                  {card.status === 'active' ? (
                                    <Ban className="h-4 w-4" />
                                  ) : (
                                    <CheckCircle2 className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteCard(card.id)}
                                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Card Add/Edit Modal */}
          <Modal
            isOpen={isCardModalOpen}
            onClose={() => {
              setIsCardModalOpen(false);
              setEditingCardId(null);
            }}
            title={editingCardId ? 'Modifier la carte' : 'Nouvelle carte carburant'}
            size="lg"
          >
            <form onSubmit={handleCardSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="N° Carte *"
                  name="cardNumber"
                  value={cardForm.cardNumber}
                  onChange={(e) => setCardForm((f) => ({ ...f, cardNumber: e.target.value }))}
                  placeholder="Ex: 4XXX-XXXX-XXXX-1234"
                  required
                />
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Fournisseur *
                  </label>
                  <select
                    value={cardForm.provider}
                    onChange={(e) => setCardForm((f) => ({ ...f, provider: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="Total">Total</option>
                    <option value="Shell">Shell</option>
                    <option value="Elton">Elton</option>
                    <option value="Star Oil">Star Oil</option>
                    <option value="EDK">EDK</option>
                    <option value="Vivo Energy">Vivo Energy</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Type de carte (source) *
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCardForm((f) => ({ ...f, cardType: 'parc' }))}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                      cardForm.cardType === 'parc'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Truck className="h-4 w-4" />
                    Véhicule Parc
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardForm((f) => ({ ...f, cardType: 'personnel' }))}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                      cardForm.cardType === 'personnel'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Car className="h-4 w-4" />
                    Véhicule Personnel
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Type de carte carburant *
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCardForm((f) => ({ ...f, paymentType: 'postpayee' }))}
                    className={`flex-1 rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                      cardForm.paymentType === 'postpayee'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    Postpayée
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardForm((f) => ({ ...f, paymentType: 'prepayee' }))}
                    className={`flex-1 rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                      cardForm.paymentType === 'prepayee'
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    Prépayée
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardForm((f) => ({ ...f, paymentType: 'africapass' }))}
                    className={`flex-1 rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                      cardForm.paymentType === 'africapass'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    Africapass
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Véhicule assigné
                  </label>
                  <select
                    value={cardForm.assignedVehicle}
                    onChange={(e) => handleCardVehicleSelect(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Non assigné</option>
                    {cardForm.cardType === 'parc' ? (
                      <optgroup label="Véhicules Parc">
                        {allVehicles
                          .filter((v) => v.source === 'parc')
                          .map((v) => (
                            <option key={v.registration} value={v.registration}>
                              {v.registration} — {v.brand} {v.model}
                            </option>
                          ))}
                      </optgroup>
                    ) : (
                      <optgroup label="Véhicules Personnels">
                        {allVehicles
                          .filter((v) => v.source === 'personnel')
                          .map((v) => (
                            <option key={v.registration} value={v.registration}>
                              {v.registration} — {v.brand} {v.model}
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Chauffeur / Agent assigné
                  </label>
                  <select
                    value={cardForm.assignedDriver}
                    onChange={(e) => handleCardDriverSelect(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Non assigné</option>
                    {cardForm.cardType === 'parc' ? (
                      <optgroup label="Chauffeurs">
                        {driversAndAgents
                          .filter((p) => p.role === 'Chauffeur')
                          .map((p) => (
                            <option key={p.name} value={p.name}>
                              {p.name}
                            </option>
                          ))}
                      </optgroup>
                    ) : (
                      <optgroup label="Agents (Véhicules Personnels)">
                        {driversAndAgents
                          .filter((p) => p.role === 'Agent')
                          .map((p) => (
                            <option key={p.name} value={p.name}>
                              {p.name}
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Statut</label>
                  <select
                    value={cardForm.status}
                    onChange={(e) =>
                      setCardForm((f) => ({ ...f, status: e.target.value as FuelCard['status'] }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="blocked">Bloquée</option>
                    <option value="expired">Expirée</option>
                  </select>
                </div>
                <Input
                  label="Date d'expiration"
                  name="expiryDate"
                  type="date"
                  value={cardForm.expiryDate}
                  onChange={(e) => setCardForm((f) => ({ ...f, expiryDate: e.target.value }))}
                />
                <Input
                  label="Plafond mensuel (CFA)"
                  name="monthlyLimit"
                  type="number"
                  value={cardForm.monthlyLimit || ''}
                  onChange={(e) =>
                    setCardForm((f) => ({ ...f, monthlyLimit: parseInt(e.target.value) || 0 }))
                  }
                  placeholder="0"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Montant alloué (CFA)"
                  name="allocatedAmount"
                  type="number"
                  value={cardForm.allocatedAmount || ''}
                  onChange={(e) =>
                    setCardForm((f) => ({ ...f, allocatedAmount: parseInt(e.target.value) || 0 }))
                  }
                  placeholder="Ex: 150 000"
                />
                <Input
                  label="Litres alloués"
                  name="allocatedLitres"
                  type="number"
                  value={cardForm.allocatedLitres || ''}
                  onChange={(e) =>
                    setCardForm((f) => ({ ...f, allocatedLitres: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="Ex: 200"
                />
              </div>
              <Textarea
                label="Notes"
                name="cardNotes"
                value={cardForm.notes}
                onChange={(e) => setCardForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Remarques éventuelles..."
              />
              <div className="flex justify-end gap-3 border-t pt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsCardModalOpen(false);
                    setEditingCardId(null);
                  }}
                >
                  Annuler
                </Button>
                <Button type="submit" variant="primary">
                  {editingCardId ? 'Enregistrer' : 'Créer la carte'}
                </Button>
              </div>
            </form>
          </Modal>

          {/* Card View Modal */}
          <Modal
            isOpen={isCardViewOpen}
            onClose={() => setIsCardViewOpen(false)}
            title="Détail de la carte carburant"
            size="md"
          >
            {viewCard &&
              (() => {
                const usage = getCardUsageThisMonth(viewCard.id);
                const usagePercent =
                  viewCard.monthlyLimit > 0 ? Math.round((usage / viewCard.monthlyLimit) * 100) : 0;
                return (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-blue-100/50 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-4">
                      <div className="mb-2 flex items-center gap-3">
                        <div className="rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 p-2 shadow-md">
                          <CreditCard className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{viewCard.cardNumber}</p>
                          <p className="text-sm text-gray-600">{viewCard.provider}</p>
                        </div>
                        <div className="ml-auto">{statusBadge(viewCard.status)}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="mb-0.5 text-xs text-gray-500">Source véhicule</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${(viewCard.cardType || 'parc') === 'parc' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}
                        >
                          {(viewCard.cardType || 'parc') === 'parc'
                            ? 'Véhicule Parc'
                            : 'Véhicule Personnel'}
                        </span>
                      </div>
                      <div>
                        <p className="mb-0.5 text-xs text-gray-500">Type de carte</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            (viewCard.paymentType || 'postpayee') === 'prepayee'
                              ? 'bg-amber-100 text-amber-800'
                              : (viewCard.paymentType || 'postpayee') === 'africapass'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {(viewCard.paymentType || 'postpayee') === 'prepayee'
                            ? 'Carte Prépayée'
                            : (viewCard.paymentType || 'postpayee') === 'africapass'
                              ? 'Carte Africapass'
                              : 'Carte Postpayée'}
                        </span>
                      </div>
                      <div>
                        <p className="mb-0.5 text-xs text-gray-500">Fournisseur</p>
                        <p className="font-semibold">{viewCard.provider}</p>
                      </div>
                      <div>
                        <p className="mb-0.5 text-xs text-gray-500">Véhicule assigné</p>
                        <p className="font-semibold">{viewCard.assignedVehicle || '—'}</p>
                      </div>
                      <div>
                        <p className="mb-0.5 text-xs text-gray-500">
                          {(viewCard.cardType || 'parc') === 'parc'
                            ? 'Chauffeur assigné'
                            : 'Agent assigné'}
                        </p>
                        <p className="font-semibold">{viewCard.assignedDriver || '—'}</p>
                      </div>
                      <div>
                        <p className="mb-0.5 text-xs text-gray-500">Date d'expiration</p>
                        <p className="font-semibold">
                          {viewCard.expiryDate
                            ? new Date(viewCard.expiryDate).toLocaleDateString('fr-FR')
                            : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="mb-0.5 text-xs text-gray-500">Plafond mensuel</p>
                        <p className="font-semibold">
                          {viewCard.monthlyLimit > 0 ? formatCFA(viewCard.monthlyLimit) : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="mb-0.5 text-xs text-gray-500">Montant alloué</p>
                        <p className="font-semibold text-blue-700">
                          {viewCard.allocatedAmount > 0 ? formatCFA(viewCard.allocatedAmount) : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="mb-0.5 text-xs text-gray-500">Litres alloués</p>
                        <p className="font-semibold text-blue-700">
                          {viewCard.allocatedLitres > 0
                            ? viewCard.allocatedLitres.toLocaleString('fr-FR') + ' L'
                            : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="mb-0.5 text-xs text-gray-500">Consommé ce mois</p>
                        <p
                          className={`text-lg font-bold ${usagePercent >= 90 ? 'text-red-600' : usagePercent >= 70 ? 'text-orange-600' : 'text-blue-700'}`}
                        >
                          {formatCFA(usage)}
                        </p>
                      </div>
                      {viewCard.monthlyLimit > 0 && (
                        <div>
                          <p className="mb-0.5 text-xs text-gray-500">Reste disponible</p>
                          <p className="text-lg font-bold text-green-600">
                            {formatCFA(Math.max(0, viewCard.monthlyLimit - usage))}
                          </p>
                        </div>
                      )}
                    </div>
                    {viewCard.monthlyLimit > 0 && (
                      <div>
                        <div className="mb-1 flex justify-between text-xs text-gray-500">
                          <span>Consommation</span>
                          <span>{usagePercent}%</span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-gray-200">
                          <div
                            className={`h-2.5 rounded-full ${usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 70 ? 'bg-orange-500' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min(100, usagePercent)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {viewCard.notes && (
                      <div className="border-t pt-3">
                        <p className="mb-1 text-xs text-gray-500">Notes</p>
                        <p className="text-sm text-gray-700">{viewCard.notes}</p>
                      </div>
                    )}
                    <div className="flex justify-end border-t pt-4">
                      <Button variant="secondary" onClick={() => setIsCardViewOpen(false)}>
                        Fermer
                      </Button>
                    </div>
                  </div>
                );
              })()}
          </Modal>
        </>
      )}

      {/* ══════ RESOLVE ALERT MODAL ══════ */}
      <Modal
        isOpen={isResolveModalOpen}
        onClose={() => {
          setIsResolveModalOpen(false);
          setResolvingAlert(null);
        }}
        title="Résoudre l'alerte"
        size="md"
      >
        {resolvingAlert && (
          <div className="space-y-4">
            <div
              className={`rounded-xl p-4 ${resolvingAlert.severity === 'critical' ? 'border border-red-200 bg-red-50' : 'border border-orange-200 bg-orange-50'}`}
            >
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle
                  className={`h-5 w-5 ${resolvingAlert.severity === 'critical' ? 'text-red-500' : 'text-orange-500'}`}
                />
                <h3 className="text-sm font-bold text-gray-900">{resolvingAlert.title}</h3>
              </div>
              <p className="text-xs text-gray-600">{resolvingAlert.message}</p>
              <div className="mt-2 flex gap-4 text-xs text-gray-500">
                {resolvingAlert.vehicleRegistration && (
                  <span>
                    Véhicule : <strong>{resolvingAlert.vehicleRegistration}</strong>
                  </span>
                )}
                {resolvingAlert.driverName && (
                  <span>
                    Agent : <strong>{resolvingAlert.driverName}</strong>
                  </span>
                )}
              </div>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <h4 className="mb-2 text-sm font-bold text-gray-700">Action de résolution</h4>
              <p className="mb-3 text-xs text-gray-500">
                {resolvingAlert.type === 'quota_85' || resolvingAlert.type === 'overconsumption'
                  ? 'Marquer cette alerte comme résolue. Le compteur mensuel sera réinitialisé le 1er du mois suivant. Vous pouvez aussi ajuster le quota dans le formulaire de dotation.'
                  : "Marquer cette anomalie de consommation comme vérifiée. Recommandation : vérifier l'état mécanique du véhicule."}
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-xs font-medium text-green-800">
                  L'alerte ne sera plus affichée après résolution
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsResolveModalOpen(false);
                  setResolvingAlert(null);
                }}
              >
                Annuler
              </Button>
              <button
                onClick={() => handleResolveAlert(resolvingAlert.id)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-green-200/50 transition-all hover:from-green-600 hover:to-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirmer — Résolu
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
