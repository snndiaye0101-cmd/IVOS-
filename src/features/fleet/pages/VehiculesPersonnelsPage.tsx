import { useContextSelector } from '../../../shared/contexts/ContextProvider';
import { Search, Edit, Eye, Trash2, Car, Plus, AlertTriangle, Wrench, Fuel, CreditCard, FileText, UserCheck, Calendar, Gauge, CheckCircle, ShieldAlert, Info, ChevronDown, Shield, ShieldCheck, ShieldOff, ArrowUpRight, Upload, X } from 'lucide-react';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { assuranceStore, computeStatut, type InsuranceContract, ASSURANCE_CHANGE_EVENT } from '../services/assuranceStore';
import { toast } from 'sonner';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';
import Textarea from '../../../components/ui/Textarea';
import { sendNotification } from '../../../shared/services/notificationService';
import { personnelStore, type PersonnelAgent } from '../services/personnelStore';

// Try to import Bike — fallback to a span if not available
let BikeIcon: any;
try {
  // @ts-ignore
  BikeIcon = require('lucide-react').Bike;
} catch { BikeIcon = null; }

interface PersonalVehicle {
  id: string;
  assignmentDate: string;
  registration: string;
  brand: string;
  model: string;
  type: string;
  year: number;
  color: string;
  fuelType: 'Diesel' | 'Essence' | 'Hybride' | 'Électrique';
  mileage: number;
  parkingSpot?: string;
  status: 'Actif' | 'Inactif';
  notes?: string;
  // New fields
  assignedAgentId?: string;
  fuelAllocationLiters?: number;
  fuelCardNumber?: string;
  insuranceExpiry?: string;
  lastOilChangeKm?: number;
  nextOilChangeKm?: number;
  siteCode?: string;
}

// Alert types for function vehicles
type FnAlertType = 'assurance' | 'permis' | 'vidange' | 'admin';
type FnAlertPriority = 'danger' | 'warning';
interface FnAlert {
  type: FnAlertType;
  priority: FnAlertPriority;
  message: string;
  vehicleId: string;
  agentId?: string;
}

function checkFnAlerts(vehicle: PersonalVehicle, agent: PersonnelAgent | undefined): FnAlert[] {
  const alerts: FnAlert[] = [];
  const now = new Date();

  // Insurance expired or < 30 days
  if (vehicle.insuranceExpiry) {
    const ins = new Date(vehicle.insuranceExpiry);
    const days = Math.ceil((ins.getTime() - now.getTime()) / (1000 * 3600 * 24));
    if (days < 0) {
      alerts.push({ type: 'assurance', priority: 'danger', message: `Assurance expirée le ${ins.toLocaleDateString('fr-FR')}`, vehicleId: vehicle.id });
    } else if (days <= 30) {
      alerts.push({ type: 'assurance', priority: 'warning', message: `Assurance expire dans ${days} jours`, vehicleId: vehicle.id });
    }
  }

  // Driver license expired
  if (agent?.permisValidity) {
    const perm = new Date(agent.permisValidity);
    const days = Math.ceil((perm.getTime() - now.getTime()) / (1000 * 3600 * 24));
    if (days < 0) {
      alerts.push({ type: 'permis', priority: 'danger', message: `Permis de ${agent.firstName} ${agent.lastName} expiré le ${perm.toLocaleDateString('fr-FR')}`, vehicleId: vehicle.id, agentId: agent.id });
    } else if (days <= 30) {
      alerts.push({ type: 'permis', priority: 'warning', message: `Permis de ${agent.firstName} expire dans ${days} jours`, vehicleId: vehicle.id, agentId: agent.id });
    }
  }

  // Oil change overdue by km
  if (vehicle.nextOilChangeKm && vehicle.mileage >= vehicle.nextOilChangeKm) {
    alerts.push({ type: 'vidange', priority: 'danger', message: `Vidange dépassée (${vehicle.mileage.toLocaleString()} / ${vehicle.nextOilChangeKm.toLocaleString()} km)`, vehicleId: vehicle.id });
  } else if (vehicle.nextOilChangeKm && (vehicle.nextOilChangeKm - vehicle.mileage) < 1000) {
    alerts.push({ type: 'vidange', priority: 'warning', message: `Vidange proche — ${(vehicle.nextOilChangeKm - vehicle.mileage).toLocaleString()} km restants`, vehicleId: vehicle.id });
  }

  return alerts;
}

const initialVehicles: PersonalVehicle[] = [
  {
    id: '1',
    assignmentDate: '2022-06-01',
    registration: 'DK-3421-AB',
    brand: 'Toyota',
    model: 'Corolla',
    type: 'Berline',
    year: 2019,
    color: 'Gris',
    fuelType: 'Essence',
    mileage: 67000,
    parkingSpot: 'P-12',
    status: 'Actif',
    notes: 'Véhicule de service attribué pour déplacements professionnels',
    assignedAgentId: 'ag2',
    fuelAllocationLiters: 120,
    fuelCardNumber: 'FC-2024-0057',
    insuranceExpiry: '2026-09-30',
    lastOilChangeKm: 60000,
    nextOilChangeKm: 70000,
  },
  {
    id: '2',
    assignmentDate: '2023-01-15',
    registration: 'DK-7854-CD',
    brand: 'Renault',
    model: 'Clio',
    type: 'Citadine',
    year: 2021,
    color: 'Blanc',
    fuelType: 'Essence',
    mileage: 32000,
    parkingSpot: 'P-08',
    status: 'Actif',
    assignedAgentId: 'ag1',
    fuelAllocationLiters: 100,
    fuelCardNumber: 'FC-2024-0102',
    insuranceExpiry: '2026-04-20',
    lastOilChangeKm: 25000,
    nextOilChangeKm: 35000,
  },
  {
    id: '3',
    assignmentDate: '2024-03-10',
    registration: 'DK-5512-MO',
    brand: 'Honda',
    model: 'PCX 125',
    type: 'Moto',
    year: 2024,
    color: 'Noir',
    fuelType: 'Essence',
    mileage: 8500,
    status: 'Actif',
    assignedAgentId: 'ag5',
    fuelAllocationLiters: 40,
    insuranceExpiry: '2026-03-01',
    lastOilChangeKm: 6000,
    nextOilChangeKm: 9000,
  },
  {
    id: '4',
    assignmentDate: '2023-09-01',
    registration: 'DK-2290-EF',
    brand: 'Toyota',
    model: 'Hilux',
    type: 'SUV',
    year: 2022,
    color: 'Blanc',
    fuelType: 'Diesel',
    mileage: 45200,
    parkingSpot: 'P-03',
    status: 'Actif',
    assignedAgentId: 'ag4',
    fuelAllocationLiters: 150,
    fuelCardNumber: 'FC-2023-0811',
    insuranceExpiry: '2027-01-15',
    lastOilChangeKm: 40000,
    nextOilChangeKm: 50000,
  },
];

export default function VehiculesPersonnelsPage() {
  const { site } = useContextSelector();
  const { allUsers } = useAuth();
  const navigate = useNavigate();
  const [assuranceContracts, setAssuranceContracts] = useState<InsuranceContract[]>(() => assuranceStore.load());

  const [vehicles, setVehicles] = useState<PersonalVehicle[]>(initialVehicles);
  const [agents, setAgents] = useState<PersonnelAgent[]>(() => personnelStore.load());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'Actif' | 'Inactif'>('all');
  const [selectedVehicle, setSelectedVehicle] = useState<PersonalVehicle | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolveTarget, setResolveTarget] = useState<{ vehicle: PersonalVehicle; alert: FnAlert } | null>(null);
  const [resolveForm, setResolveForm] = useState({ newDate: '', newKm: 0, newPermisDate: '', numeroPolice: '', contratScan: undefined as string | undefined });
  const resolveContratRef = useRef<HTMLInputElement>(null);

  const contractsByVehicle = useMemo(() => {
    const map = new Map<string, InsuranceContract[]>();
    assuranceContracts.forEach(contract => {
      const current = map.get(contract.vehicule) || [];
      current.push(contract);
      current.sort((left, right) => new Date(right.dateEcheance).getTime() - new Date(left.dateEcheance).getTime());
      map.set(contract.vehicule, current);
    });
    return map;
  }, [assuranceContracts]);

  const getLatestInsuranceContract = (registration: string) => contractsByVehicle.get(registration)?.[0];

  const getInsuranceTimeline = (registration: string) => {
    const contracts = contractsByVehicle.get(registration) || [];
    return contracts
      .flatMap(contract => ([
        {
          id: `${contract.id}-current`,
          compagnie: contract.compagnie,
          numeroPolice: contract.numeroPolice,
          dateDebut: contract.dateDebut,
          dateEcheance: contract.dateEcheance,
          montantPrime: contract.montantPrime,
          typeAssurance: contract.typeAssurance,
          archivedAt: contract.createdAt,
          isCurrent: true,
        },
        ...(contract.renewalHistory || []).map((entry, index) => ({
          id: `${contract.id}-history-${index}`,
          ...entry,
          isCurrent: false,
        })),
      ]))
      .sort((left, right) => new Date(right.dateEcheance).getTime() - new Date(left.dateEcheance).getTime());
  };

  // Agent autocomplete state
  const [agentSearch, setAgentSearch] = useState('');
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  const agentInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<Omit<PersonalVehicle, 'id'>>({
    assignmentDate: '',
    registration: '',
    brand: '',
    model: '',
    type: 'Berline',
    year: new Date().getFullYear(),
    color: '',
    fuelType: 'Essence',
    mileage: 0,
    parkingSpot: '',
    status: 'Actif',
    notes: '',
    assignedAgentId: '',
    fuelAllocationLiters: 0,
    fuelCardNumber: '',
    insuranceExpiry: '',
    lastOilChangeKm: 0,
    nextOilChangeKm: 0,
  });

  // Refresh agents on event
  useEffect(() => {
    const handle = () => setAgents(personnelStore.load());
    window.addEventListener('personnel:updated', handle);
    return () => window.removeEventListener('personnel:updated', handle);
  }, []);

  useEffect(() => {
    const handle = () => setAssuranceContracts(assuranceStore.load());
    window.addEventListener(ASSURANCE_CHANGE_EVENT, handle);
    return () => window.removeEventListener(ASSURANCE_CHANGE_EVENT, handle);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) && agentInputRef.current && !agentInputRef.current.contains(e.target as Node)) {
        setAgentDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const getAgent = (agentId?: string) => agents.find(a => a.id === agentId);

  const filteredAgents = useMemo(() => {
    if (!agentSearch.trim()) return agents;
    const q = agentSearch.toLowerCase();
    return agents.filter(a =>
      `${a.firstName} ${a.lastName}`.toLowerCase().includes(q) ||
      a.matricule.toLowerCase().includes(q) ||
      a.role.toLowerCase().includes(q)
    );
  }, [agents, agentSearch]);

  const filteredVehicles = vehicles.filter(v => {
    const agent = getAgent(v.assignedAgentId);
    const agentName = agent ? `${agent.firstName} ${agent.lastName}` : '';
    const matchesSearch =
      v.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agentName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || v.status === filterStatus;
    const matchesSite = site ? v.siteCode === site.code : true;
    return matchesSearch && matchesStatus && matchesSite;
  });

  // Collect all alerts
  const allAlerts = useMemo(() => {
    return vehicles.flatMap(v => {
      const agent = getAgent(v.assignedAgentId);
      return checkFnAlerts(v, agent).map(a => ({ ...a, vehicle: v, agent }));
    });
  }, [vehicles, agents]);

  const dangerCount = allAlerts.filter(a => a.priority === 'danger').length;
  const warningCount = allAlerts.filter(a => a.priority === 'warning').length;

  const resetForm = () => {
    setFormData({
      assignmentDate: '',
      registration: '',
      brand: '',
      model: '',
      type: 'Berline',
      year: new Date().getFullYear(),
      color: '',
      fuelType: 'Essence',
      mileage: 0,
      parkingSpot: '',
      status: 'Actif',
      notes: '',
      assignedAgentId: '',
      fuelAllocationLiters: 0,
      fuelCardNumber: '',
      insuranceExpiry: '',
      lastOilChangeKm: 0,
      nextOilChangeKm: 0,
    });
    setAgentSearch('');
  };

  const selectAgent = (agent: PersonnelAgent) => {
    setFormData(f => ({ ...f, assignedAgentId: agent.id }));
    setAgentSearch(`${agent.firstName} ${agent.lastName}`);
    setAgentDropdownOpen(false);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const newVehicle: PersonalVehicle = {
      id: Date.now().toString(),
      ...formData,
    };
    setVehicles(prev => [...prev, newVehicle]);
    setIsCreateModalOpen(false);
    resetForm();
    toast.success('Véhicule de fonction ajouté');
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;
    setVehicles(prev => prev.map(v => v.id === selectedVehicle.id ? { ...v, ...formData } : v));
    setIsEditModalOpen(false);
    setSelectedVehicle(null);
    resetForm();
    toast.success('Véhicule de fonction modifié');
  };

  const handleDelete = (id: string) => {
    if (confirm('Supprimer ce véhicule de fonction ?')) {
      setVehicles(prev => prev.filter(v => v.id !== id));
      setIsEditModalOpen(false);
      setIsViewModalOpen(false);
      setSelectedVehicle(null);
      toast.success('Véhicule supprimé');
    }
  };

  const openEditModal = (vehicle: PersonalVehicle) => {
    setSelectedVehicle(vehicle);
    setFormData({ ...vehicle });
    const agent = getAgent(vehicle.assignedAgentId);
    setAgentSearch(agent ? `${agent.firstName} ${agent.lastName}` : '');
    setIsEditModalOpen(true);
  };

  const openViewModal = (vehicle: PersonalVehicle) => {
    setSelectedVehicle(vehicle);
    setIsViewModalOpen(true);
  };

  const openResolveModal = (vehicle: PersonalVehicle, alert: FnAlert) => {
    setResolveTarget({ vehicle, alert });
    if (alert.type === 'assurance') {
      const contract = getLatestInsuranceContract(vehicle.registration);
      setResolveForm({
        newDate: contract?.dateEcheance || vehicle.insuranceExpiry || '',
        newKm: vehicle.mileage,
        newPermisDate: '',
        numeroPolice: contract?.numeroPolice || '',
        contratScan: undefined,
      });
    } else if (alert.type === 'permis') {
      const agent = getAgent(alert.agentId);
      setResolveForm({ newDate: '', newKm: vehicle.mileage, newPermisDate: agent?.permisValidity || '', numeroPolice: '', contratScan: undefined });
    } else if (alert.type === 'vidange') {
      setResolveForm({ newDate: new Date().toISOString().split('T')[0], newKm: vehicle.mileage, newPermisDate: '', numeroPolice: '', contratScan: undefined });
    }
    setIsResolveModalOpen(true);
  };

  const handleResolveFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (max 20 Mo)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setResolveForm(prev => ({ ...prev, contratScan: reader.result as string }));
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveTarget) return;
    const { vehicle, alert } = resolveTarget;

    if (alert.type === 'assurance') {
      const contract = getLatestInsuranceContract(vehicle.registration);
      if (contract) {
        assuranceStore.update(contract.id, {
          dateEcheance: resolveForm.newDate,
          numeroPolice: resolveForm.numeroPolice.trim() || contract.numeroPolice,
          contratScan: resolveForm.contratScan ?? contract.contratScan,
        });
        setAssuranceContracts(assuranceStore.load());
      }
      setVehicles(prev => prev.map(v => v.id === vehicle.id ? { ...v, insuranceExpiry: resolveForm.newDate } : v));
      toast.success('Assurance mise à jour, alerte résolue avec succès !');
    } else if (alert.type === 'permis' && alert.agentId) {
      setAgents(prev => {
        const updated = prev.map(a => a.id === alert.agentId ? { ...a, permisValidity: resolveForm.newPermisDate } : a);
        personnelStore.save(updated);
        return updated;
      });
      const agent = getAgent(alert.agentId);
      toast.success(`Permis renouvelé pour ${agent?.firstName} ${agent?.lastName}`);
    } else if (alert.type === 'vidange') {
      const nextKm = resolveForm.newKm + 10000;
      setVehicles(prev => prev.map(v => v.id === vehicle.id ? { ...v, mileage: resolveForm.newKm, lastOilChangeKm: resolveForm.newKm, nextOilChangeKm: nextKm } : v));
      toast.success(`Vidange effectuée — prochaine à ${nextKm.toLocaleString()} km`);
    }

    setIsResolveModalOpen(false);
    setResolveTarget(null);
  };

  const getTypeIcon = (type: string) => {
    if (type === 'Moto' && BikeIcon) return <BikeIcon className="h-6 w-6 text-orange-600" />;
    return <Car className="h-6 w-6 text-blue-600" />;
  };

  const isMoto = formData.type === 'Moto';

  // ── Agent card rendered in form ──
  const selectedFormAgent = getAgent(formData.assignedAgentId);

  // ── RENDER ──
  return (
    <div className="flex-1 w-full space-y-6">
      {/* ═══ ALERT BANNER ═══ */}
      {allAlerts.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 via-orange-50 to-amber-50 p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className="p-2 bg-red-600 rounded-xl shadow-md"><AlertTriangle className="h-5 w-5 text-white" /></div>
              Alertes Véhicules de Fonction
            </h2>
            <div className="flex items-center gap-3">
              {dangerCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-bold shadow-sm animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-white" />
                  {dangerCount} critique{dangerCount > 1 ? 's' : ''}
                </span>
              )}
              {warningCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500 text-white text-xs font-bold shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-white" />
                  {warningCount} avertissement{warningCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {allAlerts.map((alert, idx) => {
              const isDanger = alert.priority === 'danger';
              let Icon = AlertTriangle;
              let typeLabel = 'Alerte';
              if (alert.type === 'assurance') { Icon = ShieldAlert; typeLabel = 'Assurance'; }
              if (alert.type === 'permis') { Icon = UserCheck; typeLabel = 'Permis expiré'; }
              if (alert.type === 'vidange') { Icon = Wrench; typeLabel = 'Vidange'; }
              return (
                <div key={idx} className={`relative rounded-xl p-4 flex items-start gap-3 border transition-all hover:scale-[1.01] hover:shadow-md ${
                  isDanger ? 'bg-red-50 border-red-300 shadow-sm shadow-red-100' : 'bg-orange-50 border-orange-300 shadow-sm shadow-orange-100'
                }`}>
                  <div className={`flex-shrink-0 p-2.5 rounded-xl shadow-sm ${isDanger ? 'bg-red-600' : 'bg-orange-500'}`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isDanger ? 'bg-red-200 text-red-800' : 'bg-orange-200 text-orange-800'}`}>{typeLabel}</span>
                    <p className="font-bold text-sm text-gray-900 truncate mt-1">{alert.vehicle.registration} <span className="font-normal text-gray-500">— {alert.vehicle.brand} {alert.vehicle.model}</span></p>
                    <p className={`text-xs mt-0.5 ${isDanger ? 'text-red-700' : 'text-orange-700'}`}>{alert.message}</p>
                    <button
                      className={`mt-2.5 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all shadow-sm hover:shadow-md active:scale-95 ${
                        isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'
                      }`}
                      onClick={() => openResolveModal(alert.vehicle, alert)}
                    >
                      <Wrench className="h-3.5 w-3.5" />
                      Résoudre
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ HEADER ═══ */}
      <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-2xl p-6 mb-2 text-white flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center"><Car className="h-7 w-7" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Véhicules de Fonction</h1>
            <p className="text-sm text-gray-300">Attribution, suivi carburant & alertes agents</p>
          </div>
        </div>
        <button
          onClick={() => { setIsCreateModalOpen(true); resetForm(); }}
          className="inline-flex items-center px-5 py-2.5 bg-white text-[#1a1a2e] font-bold rounded-xl shadow-lg hover:bg-gray-100 transition-all text-base gap-2"
        >
          <Plus className="h-5 w-5" />
          Nouveau Véhicule
        </button>
      </div>

      {/* ═══ FILTERS ═══ */}
      <div className="bg-white shadow-md rounded-2xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-5 w-5 text-gray-400" /></div>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-gray-50/50 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 hover:border-gray-400 transition-colors sm:text-sm"
              placeholder="Rechercher par immatriculation, marque, agent..."
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 hover:border-gray-400 transition-colors sm:text-sm"
          >
            <option value="all">Tous les statuts</option>
            <option value="Actif">Actif</option>
            <option value="Inactif">Inactif</option>
          </select>
        </div>
      </div>

      {/* ═══ VEHICLE GRID ═══ */}
      {filteredVehicles.length === 0 ? (
        <div className="bg-white shadow-md rounded-2xl p-12 text-center">
          <Car className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">Aucun véhicule ne correspond à votre recherche</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredVehicles.map(vehicle => {
            const agent = getAgent(vehicle.assignedAgentId);
            const vAlerts = checkFnAlerts(vehicle, agent);
            const insuranceContract = getLatestInsuranceContract(vehicle.registration);
            const insuranceStatus = insuranceContract ? computeStatut(insuranceContract.dateEcheance) : null;
            return (
              <div key={vehicle.id} className="bg-white shadow-md rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-200">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 h-11 w-11 rounded-full bg-blue-50 flex items-center justify-center">
                        {getTypeIcon(vehicle.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-gray-900">{vehicle.registration}</h3>
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${vehicle.status === 'Actif' ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'}`}>{vehicle.status}</span>
                          {insuranceContract && insuranceStatus && (
                            <span className={`px-2 py-0.5 text-xs font-bold rounded-full inline-flex items-center gap-1 ${insuranceStatus === 'À jour' ? 'bg-emerald-100 text-emerald-700' : insuranceStatus === 'À renouveler bientôt' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                              {insuranceStatus === 'À jour' ? <ShieldCheck className="h-3 w-3" /> : insuranceStatus === 'À renouveler bientôt' ? <ShieldAlert className="h-3 w-3" /> : <ShieldOff className="h-3 w-3" />}
                              Assurance {insuranceStatus}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{vehicle.brand} {vehicle.model} — {vehicle.color}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{vehicle.type} • {vehicle.year} • {vehicle.fuelType}</p>
                      </div>
                    </div>
                  </div>

                  {/* Agent card */}
                  {agent && (
                    <div className="mb-3 p-3 bg-blue-50 rounded-lg flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-200 flex items-center justify-center overflow-hidden text-blue-800 font-bold text-sm">
                        {agent.photo ? <img src={agent.photo} alt="" className="h-full w-full object-cover" /> : `${agent.firstName[0]}${agent.lastName[0]}`}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{agent.firstName} {agent.lastName}</p>
                        <p className="text-xs text-gray-500">{agent.role} — {agent.matricule}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400">Permis expire</p>
                        <p className={`text-xs font-bold ${new Date(agent.permisValidity) < new Date() ? 'text-red-600' : 'text-green-700'}`}>
                          {new Date(agent.permisValidity).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Alerts */}
                  {vAlerts.length > 0 && (
                    <div className="mb-3 space-y-1.5">
                      {vAlerts.map((a, i) => (
                        <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium ${a.priority === 'danger' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}`}>
                          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{a.message}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quick stats */}
                  <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-600"><Gauge className="h-4 w-4" /><span>{vehicle.mileage.toLocaleString()} km</span></div>
                    {vehicle.fuelAllocationLiters ? (
                      <div className="flex items-center gap-2 text-gray-600"><Fuel className="h-4 w-4" /><span>{vehicle.fuelAllocationLiters} L/mois</span></div>
                    ) : null}
                    {vehicle.fuelCardNumber && (
                      <div className="flex items-center gap-2 text-gray-600"><CreditCard className="h-4 w-4" /><span className="text-xs truncate">{vehicle.fuelCardNumber}</span></div>
                    )}
                    {vehicle.insuranceExpiry && (
                      <div className="flex items-center gap-2 text-gray-600"><FileText className="h-4 w-4" /><span className="text-xs">{insuranceContract ? new Date(insuranceContract.dateEcheance).toLocaleDateString('fr-FR') : new Date(vehicle.insuranceExpiry).toLocaleDateString('fr-FR')}</span></div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t">
                    <button onClick={() => openViewModal(vehicle)} className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 inline-flex items-center justify-center gap-1.5 transition-colors">
                      <Eye className="h-4 w-4" />Aperçu
                    </button>
                    <button onClick={() => openEditModal(vehicle)} className="flex-1 px-3 py-2.5 border border-transparent rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 inline-flex items-center justify-center gap-1.5 transition-colors shadow-sm">
                      <Edit className="h-4 w-4" />Modifier
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ CREATE / EDIT MODAL (Dual-Column) ═══ */}
      {[
        { isOpen: isCreateModalOpen, onClose: () => { setIsCreateModalOpen(false); resetForm(); }, title: 'Nouveau Véhicule de Fonction', onSubmit: handleCreate, submitLabel: 'Enregistrer', submitColor: 'bg-green-600 hover:bg-green-700' },
        { isOpen: isEditModalOpen, onClose: () => { setIsEditModalOpen(false); setSelectedVehicle(null); resetForm(); }, title: 'Modifier le Véhicule', onSubmit: handleEdit, submitLabel: 'Enregistrer les modifications', submitColor: 'bg-blue-600 hover:bg-blue-700' },
      ].map((modal, mi) => (
        <Modal key={mi} isOpen={modal.isOpen} onClose={modal.onClose} title={modal.title} size="xxl">
          <form onSubmit={modal.onSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
              {/* ── LEFT: Véhicule ── */}
              <div className="space-y-5">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b-2 border-blue-100">
                  <div className="p-1.5 bg-blue-50 rounded-lg"><Car size={18} className="text-blue-700" /></div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Véhicule</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Immatriculation" name="registration" value={formData.registration} onChange={e => setFormData(f => ({ ...f, registration: e.target.value }))} placeholder="DK-XXXX-XX" required icon={<Car size={16} />} />
                  <Select
                    label="Type"
                    name="type"
                    value={formData.type}
                    onChange={e => setFormData(f => ({ ...f, type: e.target.value }))}
                    options={[
                      { value: 'Berline', label: 'Berline' },
                      { value: 'SUV', label: 'SUV' },
                      { value: 'Citadine', label: 'Citadine' },
                      { value: 'Fourgon', label: 'Fourgon' },
                      { value: 'Moto', label: '🏍️ Moto' },
                      { value: 'Autre', label: 'Autre' },
                    ]}
                    required
                  />
                  <Input label="Marque" name="brand" value={formData.brand} onChange={e => setFormData(f => ({ ...f, brand: e.target.value }))} placeholder="Toyota" required />
                  <Input label="Modèle" name="model" value={formData.model} onChange={e => setFormData(f => ({ ...f, model: e.target.value }))} placeholder="Corolla" required />
                  <Input label="Kilométrage actuel" name="mileage" type="number" value={formData.mileage} onChange={e => setFormData(f => ({ ...f, mileage: Number(e.target.value) }))} required icon={<Gauge size={16} />} />
                  <Input label="Année" name="year" type="number" value={formData.year} onChange={e => setFormData(f => ({ ...f, year: Number(e.target.value) }))} required icon={<Calendar size={16} />} />
                  <Input label="Couleur" name="color" value={formData.color} onChange={e => setFormData(f => ({ ...f, color: e.target.value }))} required />
                  <Select label="Carburant" name="fuelType" value={formData.fuelType} onChange={e => setFormData(f => ({ ...f, fuelType: e.target.value as any }))} options={[{ value: 'Essence', label: 'Essence' }, { value: 'Diesel', label: 'Diesel' }, { value: 'Hybride', label: 'Hybride' }, { value: 'Électrique', label: 'Électrique' }]} required icon={<Fuel size={16} />} />
                  {!isMoto && (
                    <Input label="Place de parking" name="parkingSpot" value={formData.parkingSpot || ''} onChange={e => setFormData(f => ({ ...f, parkingSpot: e.target.value }))} />
                  )}
                  <Select label="Statut" name="status" value={formData.status} onChange={e => setFormData(f => ({ ...f, status: e.target.value as any }))} options={[{ value: 'Actif', label: 'Actif' }, { value: 'Inactif', label: 'Inactif' }]} required />
                </div>

                {/* Fuel allocation section */}
                <div>
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b-2 border-emerald-100">
                    <div className="p-1.5 bg-emerald-50 rounded-lg"><Fuel size={18} className="text-emerald-700" /></div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Dotation Carburant</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Dotation mensuelle (Litres)" name="fuelAllocationLiters" type="number" value={formData.fuelAllocationLiters || ''} onChange={e => setFormData(f => ({ ...f, fuelAllocationLiters: Number(e.target.value) || 0 }))} placeholder="120" icon={<Fuel size={16} />} />
                    <Input label="N° Carte Carburant" name="fuelCardNumber" value={formData.fuelCardNumber || ''} onChange={e => setFormData(f => ({ ...f, fuelCardNumber: e.target.value }))} placeholder="FC-2024-XXXX" icon={<CreditCard size={16} />} />
                  </div>
                </div>

                {/* Admin dates */}
                <div>
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b-2 border-amber-100">
                    <div className="p-1.5 bg-amber-50 rounded-lg"><FileText size={18} className="text-amber-700" /></div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Suivi Administratif</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Date d'attribution" name="assignmentDate" type="date" value={formData.assignmentDate} onChange={e => setFormData(f => ({ ...f, assignmentDate: e.target.value }))} required icon={<Calendar size={16} />} />
                    <Input label="Expiration assurance" name="insuranceExpiry" type="date" value={formData.insuranceExpiry || ''} onChange={e => setFormData(f => ({ ...f, insuranceExpiry: e.target.value }))} icon={<FileText size={16} />} />
                    <Input label="Dernière vidange (km)" name="lastOilChangeKm" type="number" value={formData.lastOilChangeKm || ''} onChange={e => setFormData(f => ({ ...f, lastOilChangeKm: Number(e.target.value) || 0 }))} icon={<Wrench size={16} />} />
                    <Input label="Prochaine vidange (km)" name="nextOilChangeKm" type="number" value={formData.nextOilChangeKm || ''} onChange={e => setFormData(f => ({ ...f, nextOilChangeKm: Number(e.target.value) || 0 }))} icon={<Wrench size={16} />} />
                  </div>
                </div>

                <Textarea label="Notes" name="notes" value={formData.notes || ''} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Informations complémentaires..." />
              </div>

              {/* ── RIGHT: Agent Assigné ── */}
              <div className="space-y-5">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b-2 border-indigo-100">
                  <div className="p-1.5 bg-indigo-50 rounded-lg"><UserCheck size={18} className="text-indigo-700" /></div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Agent Assigné (Annuaire)</h3>
                </div>

                {/* Autocomplete */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rechercher un agent</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><UserCheck size={16} className="text-gray-400" /></div>
                    <input
                      ref={agentInputRef}
                      type="text"
                      value={agentSearch}
                      onChange={e => { setAgentSearch(e.target.value); setAgentDropdownOpen(true); if (!e.target.value) setFormData(f => ({ ...f, assignedAgentId: '' })); }}
                      onFocus={() => setAgentDropdownOpen(true)}
                      placeholder="Nom, matricule ou rôle..."
                      className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg leading-5 bg-gray-50/50 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 hover:border-gray-400 transition-colors sm:text-sm"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center"><ChevronDown size={16} className="text-gray-400" /></div>
                  </div>
                  {agentDropdownOpen && (
                    <div ref={dropdownRef} className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                      {filteredAgents.length === 0 ? (
                        <p className="p-3 text-sm text-gray-400 italic">Aucun agent trouvé</p>
                      ) : filteredAgents.map(a => (
                        <button
                          key={a.id}
                          type="button"
                          className={`w-full flex items-center gap-3 p-3 hover:bg-indigo-50 transition-colors text-left ${formData.assignedAgentId === a.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''}`}
                          onClick={() => selectAgent(a)}
                        >
                          <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                            {a.photo ? <img src={a.photo} alt="" className="h-full w-full object-cover rounded-full" /> : `${a.firstName[0]}${a.lastName[0]}`}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{a.firstName} {a.lastName}</p>
                            <p className="text-xs text-gray-500">{a.role} — {a.matricule}</p>
                          </div>
                          {formData.assignedAgentId === a.id && <CheckCircle size={16} className="text-indigo-600" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dynamic agent card */}
                {selectedFormAgent ? (
                  <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50/50 p-5 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-indigo-200 flex items-center justify-center overflow-hidden text-indigo-800 font-bold text-xl shadow-md">
                        {selectedFormAgent.photo ? <img src={selectedFormAgent.photo} alt="" className="h-full w-full object-cover" /> : `${selectedFormAgent.firstName[0]}${selectedFormAgent.lastName[0]}`}
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-900">{selectedFormAgent.firstName} {selectedFormAgent.lastName}</p>
                        <p className="text-sm text-gray-600">{selectedFormAgent.role}</p>
                        <p className="text-xs text-gray-500 font-mono">{selectedFormAgent.matricule}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded-lg">
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Téléphone</p>
                        <p className="text-sm font-medium text-gray-900">{selectedFormAgent.phone}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Email</p>
                        <p className="text-sm font-medium text-gray-900 truncate">{selectedFormAgent.email}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Quartier</p>
                        <p className="text-sm font-medium text-gray-900">{selectedFormAgent.quartier}</p>
                      </div>
                      <div className={`p-3 rounded-lg ${new Date(selectedFormAgent.permisValidity) < new Date() ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Permis expire le</p>
                        <p className={`text-sm font-bold ${new Date(selectedFormAgent.permisValidity) < new Date() ? 'text-red-700' : 'text-green-700'}`}>
                          {new Date(selectedFormAgent.permisValidity).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    {new Date(selectedFormAgent.permisValidity) < new Date() && (
                      <div className="flex items-center gap-2 p-3 bg-red-100 border border-red-300 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-xs font-bold text-red-800">ATTENTION — Le permis de cet agent est expiré !</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
                    <UserCheck className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500">Sélectionnez un agent de l'annuaire</p>
                    <p className="text-xs text-gray-400 mt-1">Photo, poste et validité du permis seront affichés automatiquement</p>
                  </div>
                )}

                {isMoto && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <Info className="h-4 w-4 text-amber-600" />
                    <span className="text-xs text-amber-800 font-medium">Mode Moto — Les champs non pertinents (parking, places) sont masqués.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-5 border-t border-gray-200">
              <p className="text-xs text-gray-400">Les champs marqués <span className="text-red-500">*</span> sont obligatoires</p>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={modal.onClose}>Annuler</Button>
                <button
                  type="submit"
                  className={`inline-flex items-center gap-2 px-8 py-3 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.97] text-base ${modal.submitColor}`}
                >
                  <CheckCircle size={20} />
                  {modal.submitLabel}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      ))}

      {/* ═══ VIEW MODAL ═══ */}
      <Modal isOpen={isViewModalOpen} onClose={() => { setIsViewModalOpen(false); setSelectedVehicle(null); }} title="Détails du Véhicule de Fonction" size="lg">
        {selectedVehicle && (() => {
          const agent = getAgent(selectedVehicle.assignedAgentId);
          return (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">{getTypeIcon(selectedVehicle.type)}</div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">{selectedVehicle.registration}</h3>
                      <p className="text-gray-600">{selectedVehicle.brand} {selectedVehicle.model} — {selectedVehicle.color}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-sm font-semibold rounded-full ${selectedVehicle.status === 'Actif' ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'}`}>{selectedVehicle.status}</span>
                </div>
              </div>

              {agent && (
                <div className="p-4 bg-indigo-50 rounded-lg flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-800 font-bold text-lg">
                    {agent.photo ? <img src={agent.photo} alt="" className="h-full w-full object-cover rounded-full" /> : `${agent.firstName[0]}${agent.lastName[0]}`}
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-bold text-gray-900">{agent.firstName} {agent.lastName}</p>
                    <p className="text-sm text-gray-600">{agent.role} — {agent.matricule}</p>
                    <p className="text-xs text-gray-500">{agent.phone} • {agent.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 uppercase">Permis</p>
                    <p className={`text-sm font-bold ${new Date(agent.permisValidity) < new Date() ? 'text-red-600' : 'text-green-700'}`}>
                      {new Date(agent.permisValidity).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-gray-500">Type</p><p className="font-medium text-gray-900">{selectedVehicle.type}</p></div>
                <div><p className="text-sm text-gray-500">Année</p><p className="font-medium text-gray-900">{selectedVehicle.year}</p></div>
                <div><p className="text-sm text-gray-500">Kilométrage</p><p className="font-medium text-gray-900">{selectedVehicle.mileage.toLocaleString()} km</p></div>
                <div><p className="text-sm text-gray-500">Carburant</p><p className="font-medium text-gray-900">{selectedVehicle.fuelType}</p></div>
                {selectedVehicle.fuelAllocationLiters ? (
                  <div><p className="text-sm text-gray-500">Dotation mensuelle</p><p className="font-medium text-emerald-700">{selectedVehicle.fuelAllocationLiters} L</p></div>
                ) : null}
                {selectedVehicle.fuelCardNumber && (
                  <div><p className="text-sm text-gray-500">Carte carburant</p><p className="font-medium font-mono text-gray-900">{selectedVehicle.fuelCardNumber}</p></div>
                )}
                {(selectedVehicle.insuranceExpiry || assuranceContracts.some(c => c.vehicule === selectedVehicle.registration)) && (
                  <div>
                    <p className="text-sm text-gray-500">Assurance expire</p>
                    {(() => {
                      const contract = assuranceContracts
                        .filter(c => c.vehicule === selectedVehicle.registration)
                        .sort((a, b) => new Date(b.dateEcheance).getTime() - new Date(a.dateEcheance).getTime())[0]
                      const dateStr = contract?.dateEcheance || selectedVehicle.insuranceExpiry
                      if (!dateStr) return <p className="font-medium text-gray-400 italic">Non renseignée</p>
                      const statut = computeStatut(dateStr)
                      return (
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-medium ${statut === 'Expiré' ? 'text-red-600' : statut === 'À renouveler bientôt' ? 'text-orange-600' : 'text-gray-900'}`}>
                            {new Date(dateStr).toLocaleDateString('fr-FR')}
                          </p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${statut === 'À jour' ? 'bg-emerald-100 text-emerald-700' : statut === 'À renouveler bientôt' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                            {statut}
                          </span>
                        </div>
                      )
                    })()}
                  </div>
                )}
                {selectedVehicle.parkingSpot && (
                  <div><p className="text-sm text-gray-500">Parking</p><p className="font-medium text-gray-900">{selectedVehicle.parkingSpot}</p></div>
                )}
              </div>

              {(() => {
                const contract = assuranceContracts
                  .filter(c => c.vehicule === selectedVehicle.registration)
                  .sort((a, b) => new Date(b.dateEcheance).getTime() - new Date(a.dateEcheance).getTime())[0]
                const timeline = getInsuranceTimeline(selectedVehicle.registration)
                if (!contract) return null
                const statut = computeStatut(contract.dateEcheance)
                const days = Math.ceil((new Date(contract.dateEcheance).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                const isUrgent = statut !== 'À jour'
                return (
                  <div className={`border rounded-xl p-4 space-y-3 ${isUrgent ? 'border-orange-300 bg-orange-50' : 'border-emerald-200 bg-emerald-50'}`}>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-indigo-600" /> Statut Assurance
                      </h4>
                      <button
                        onClick={() => { setIsViewModalOpen(false); navigate('/sinistres', { state: { defaultTab: 'assurances', focusContractId: contract.id } }) }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                      >
                        Voir dossier complet <ArrowUpRight className="h-3 w-3" />
                      </button>
                    </div>
                    {isUrgent && (
                      <div className={`flex items-center justify-between gap-3 p-2.5 rounded-lg ${statut === 'Expiré' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                          <p className="text-xs font-semibold truncate">
                            {statut === 'Expiré' ? `⚠️ Assurance expirée depuis ${Math.abs(days)} jour(s) — Renouvellement urgent` : `⚠️ Renouvellement dans ${days} jour(s)`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openResolveModal(selectedVehicle, { type: 'assurance', priority: statut === 'Expiré' ? 'danger' : 'warning', message: 'Alerte assurance', vehicleId: selectedVehicle.id })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Résoudre
                        </button>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><p className="text-xs text-gray-500">Compagnie</p><p className="font-semibold text-gray-900">{contract.compagnie}</p></div>
                      <div><p className="text-xs text-gray-500">N° Police</p><p className="font-mono font-semibold text-gray-900">{contract.numeroPolice}</p></div>
                      <div><p className="text-xs text-gray-500">Type</p><p className="font-semibold text-gray-900">{contract.typeAssurance}</p></div>
                      <div>
                        <p className="text-xs text-gray-500">Échéance</p>
                        <p className={`font-semibold ${statut === 'Expiré' ? 'text-red-600' : statut === 'À renouveler bientôt' ? 'text-orange-600' : 'text-emerald-700'}`}>
                          {new Date(contract.dateEcheance).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${statut === 'À jour' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : statut === 'À renouveler bientôt' ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                        {statut === 'À jour' ? <ShieldCheck className="h-3 w-3" /> : statut === 'À renouveler bientôt' ? <ShieldAlert className="h-3 w-3" /> : <ShieldOff className="h-3 w-3" />}
                        {statut}
                      </span>
                      <span className="text-xs text-gray-500 font-medium">{contract.montantPrime.toLocaleString('fr-FR')} FCFA / an</span>
                    </div>
                    {timeline.length > 0 && (
                      <div className="pt-2 border-t border-white/70">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Historique des renouvellements</p>
                          <span className="text-[11px] text-gray-500">{timeline.length} version{timeline.length > 1 ? 's' : ''}</span>
                        </div>
                        <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                          {timeline.map(entry => (
                            <div key={entry.id} className="bg-white/80 rounded-lg border border-gray-100 px-3 py-2">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">{entry.compagnie}</p>
                                  <p className="text-[11px] text-gray-500 font-mono">{entry.numeroPolice}</p>
                                </div>
                                {entry.isCurrent && <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">Actuel</span>}
                              </div>
                              <div className="mt-1 flex items-center justify-between text-[11px] text-gray-600 gap-3">
                                <span>{new Date(entry.dateDebut).toLocaleDateString('fr-FR')} → {new Date(entry.dateEcheance).toLocaleDateString('fr-FR')}</span>
                                <span className="font-semibold text-gray-800">{entry.montantPrime.toLocaleString('fr-FR')} FCFA</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              {selectedVehicle.notes && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-500 mb-2">Notes</p>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedVehicle.notes}</p>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="secondary" onClick={() => { setIsViewModalOpen(false); setSelectedVehicle(null); }}>Fermer</Button>
                <Button variant="danger" onClick={() => handleDelete(selectedVehicle.id)}>
                  <Trash2 className="h-4 w-4 mr-2" />Supprimer
                </Button>
                <button onClick={() => { setIsViewModalOpen(false); openEditModal(selectedVehicle); }} className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-sm">
                  <Edit className="h-4 w-4" />Modifier
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ═══ RESOLVE MODAL ═══ */}
      <Modal isOpen={isResolveModalOpen} onClose={() => { setIsResolveModalOpen(false); setResolveTarget(null); }} title="Résoudre l'alerte" size="md">
        {resolveTarget && (
          <form onSubmit={handleResolve} className="space-y-5">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-bold text-gray-900">{resolveTarget.vehicle.registration} — {resolveTarget.vehicle.brand} {resolveTarget.vehicle.model}</p>
              <p className={`text-xs mt-1 ${resolveTarget.alert.priority === 'danger' ? 'text-red-700' : 'text-orange-700'}`}>{resolveTarget.alert.message}</p>
            </div>

            {resolveTarget.alert.type === 'assurance' && (
              <div className="space-y-3">
                <Input label="Nouvelle date d'expiration assurance" name="newDate" type="date" value={resolveForm.newDate} onChange={e => setResolveForm(f => ({ ...f, newDate: e.target.value }))} required icon={<FileText size={16} />} />
                <Input label="Numéro de police" name="numeroPolice" value={resolveForm.numeroPolice} onChange={e => setResolveForm(f => ({ ...f, numeroPolice: e.target.value }))} placeholder="Ex: POL-2026-XXXX" icon={<Shield size={16} />} />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Nouveau contrat (upload)</p>
                  <input ref={resolveContratRef} type="file" accept="image/*,.pdf" onChange={handleResolveFileUpload} className="hidden" />
                  {resolveForm.contratScan ? (
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-emerald-700" />
                      </div>
                      <p className="text-sm font-medium text-emerald-800">Nouveau contrat prêt à être enregistré</p>
                      <button type="button" onClick={() => setResolveForm(f => ({ ...f, contratScan: undefined }))} className="ml-auto p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => resolveContratRef.current?.click()}
                      className="w-full p-3 border-2 border-dashed border-indigo-300 rounded-xl text-sm text-indigo-700 hover:border-indigo-500 flex items-center justify-center gap-2 transition-colors"
                    >
                      <Upload className="h-4 w-4" />
                      Uploader le nouveau contrat
                    </button>
                  )}
                </div>
              </div>
            )}

            {resolveTarget.alert.type === 'permis' && (
              <Input label="Nouvelle date de validité du permis" name="newPermisDate" type="date" value={resolveForm.newPermisDate} onChange={e => setResolveForm(f => ({ ...f, newPermisDate: e.target.value }))} required icon={<UserCheck size={16} />} />
            )}

            {resolveTarget.alert.type === 'vidange' && (
              <>
                <Input label="Kilométrage actuel" name="newKm" type="number" value={resolveForm.newKm} onChange={e => setResolveForm(f => ({ ...f, newKm: Number(e.target.value) }))} required icon={<Gauge size={16} />} />
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <Info className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-800">Prochaine vidange programmée à <strong>{(resolveForm.newKm + 10000).toLocaleString()} km</strong></span>
                </div>
              </>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => { setIsResolveModalOpen(false); setResolveTarget(null); }}>Annuler</Button>
              <button type="submit" className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.97]">
                <CheckCircle size={18} />
                Valider la résolution
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
