import { Plus, Search, Edit, Eye, Trash2, AlertTriangle, Wrench, Fuel, Shield, FileText, Activity, Upload, X, Paperclip, DollarSign, TrendingUp, Truck, CheckCircle, Droplets, FileCheck, ShieldAlert, Calendar, Gauge, ShieldCheck, UploadCloud, Info, ClipboardCheck, Camera, ShieldOff, ArrowUpRight } from 'lucide-react'
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { formatCleanAmount } from '../../../shared/utils/formatAmount' 
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../shared/contexts/AuthContext'
import { assuranceStore, computeStatut, type InsuranceContract, ASSURANCE_CHANGE_EVENT } from '../services/assuranceStore'
import { claimsStore } from '../services/claimsStore'
import { driversStore } from '../services/driversStore'
import { vehiclesStore, isVisiteTechniqueExpired } from '../services/vehiclesStore'
import type { Vehicle } from '../services/vehiclesStore'
import { toast } from 'sonner'
import Modal from '../../../components/ui/Modal'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Button from '../../../components/ui/Button'
import Textarea from '../../../components/ui/Textarea'
import { sendNotification } from '../../../shared/services/notificationService'
import { useContextSelector } from '../../../shared/contexts/ContextProvider'

interface MaintenanceRecord {
  id: string
  date: string
  type: string
  description: string
  cost: number
  nextDue?: string
  mileageAtService?: number
  checklist?: Record<string, boolean>
  brakePadThickness?: number
  tirePressure?: number
  replacedParts?: string
  photos?: ExpenseDocument[]
}

interface VehicleDocument {
  id: string
  name: string
  type: string
  size: number
  dataUrl: string
  uploadedAt: string
}

interface FuelRecord {
  id: string
  date: string
  liters: number
  costPerLiter: number
  totalCost: number
  mileageAtFill: number
  station?: string
  notes?: string
  receipt?: ExpenseDocument
}

interface ExpenseDocument {
  name: string
  type: string
  size: number
  dataUrl: string
}

interface ExpenseRecord {
  id: string
  date: string
  type: 'Pneus' | 'Réparation' | 'Pièces détachées' | 'Péage' | 'Lavage' | 'Stationnement' | 'Amendes' | 'Assurance' | 'Contrôle technique' | 'Autre'
  description: string
  amount: number
  notes?: string
  receipt?: ExpenseDocument
}

const EXPENSE_TYPES = [
  'Pneus', 'Réparation', 'Pièces détachées', 'Péage', 'Lavage',
  'Stationnement', 'Amendes', 'Assurance', 'Contrôle technique', 'Autre'
] as const



interface ComplianceDocument {
  id: string
  category: 'carte_grise' | 'assurance' | 'visite_technique'
  name: string
  type: string
  size: number
  dataUrl: string
  uploadedAt: string
}

// Types stricts pour les alertes
type VehicleAlertType = 'vidange' | 'ct' | 'assurance' | 'carte_grise' | 'vignette';
type VehicleAlertPriority = 'danger' | 'warning';
interface VehicleAlert {
  type: VehicleAlertType;
  priority: VehicleAlertPriority;
  message: string;
  days?: number;
}

// Fonction utilitaire pour calculer les alertes critiques d'un véhicule
function checkVehicleAlerts(vehicle: Vehicle): VehicleAlert[] {
  const alerts: VehicleAlert[] = [];
  const now = new Date();

  // Vidange : tous les 10 000 km ou 6 mois
  if (vehicle.lastOilChange && vehicle.mileage && vehicle.nextOilChange) {
    const lastOilDate = new Date(vehicle.lastOilChange);
    const nextOilDate = new Date(vehicle.nextOilChange);
    // @ts-ignore
    const kmSinceLast = vehicle.mileage - (vehicle.lastOilMileage || (vehicle.mileage - 10000));
    const monthsSinceLast = (now.getFullYear() - lastOilDate.getFullYear()) * 12 + (now.getMonth() - lastOilDate.getMonth());
    if (kmSinceLast >= 10000 || monthsSinceLast >= 6) {
      alerts.push({
        type: 'vidange',
        priority: 'danger',
        message: `Vidange en retard (${kmSinceLast} km, ${monthsSinceLast} mois)`
      });
    } else if (nextOilDate.getTime() - now.getTime() < 15 * 24 * 3600 * 1000) {
      alerts.push({
        type: 'vidange',
        priority: 'warning',
        message: `Vidange à prévoir avant le ${nextOilDate.toLocaleDateString('fr-FR')}`
      });
    }
  }

  // Visite technique
  if (vehicle.technicalControlExpiry) {
    const ctDate = new Date(vehicle.technicalControlExpiry);
    const days = Math.ceil((ctDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
    if (days < 0) {
      alerts.push({ type: 'ct', priority: 'danger', message: `Visite technique expirée le ${ctDate.toLocaleDateString('fr-FR')}` });
    } else if (days <= 15) {
      alerts.push({ type: 'ct', priority: 'warning', message: `Visite technique à renouveler sous ${days} jours` });
    }
  }

  // Assurance
  if (vehicle.insuranceExpiry) {
    const insDate = new Date(vehicle.insuranceExpiry);
    const days = Math.ceil((insDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
    if (days < 0) {
      alerts.push({ type: 'assurance', priority: 'danger', message: `Assurance expirée le ${insDate.toLocaleDateString('fr-FR')}` });
    } else if (days <= 30) {
      alerts.push({ type: 'assurance', priority: 'warning', message: `Assurance à renouveler sous ${days} jours` });
    }
  }

  // Carte Grise
  if (vehicle.carteGriseExpiry) {
    const cgDate = new Date(vehicle.carteGriseExpiry);
    const days = Math.ceil((cgDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
    if (days < 0) {
      alerts.push({ type: 'carte_grise', priority: 'danger', message: `Carte grise expirée le ${cgDate.toLocaleDateString('fr-FR')}` });
    } else if (days <= 15) {
      alerts.push({ type: 'carte_grise', priority: 'warning', message: `Carte grise à renouveler sous ${days} jours` });
    }
  }

  // Vignette / Taxe annuelle
  if (vehicle.vignetteExpiry) {
    const vigDate = new Date(vehicle.vignetteExpiry);
    const days = Math.ceil((vigDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
    if (days < 0) {
      alerts.push({ type: 'vignette', priority: 'danger', message: `Vignette expirée le ${vigDate.toLocaleDateString('fr-FR')}` });
    } else if (days <= 15) {
      alerts.push({ type: 'vignette', priority: 'warning', message: `Vignette à renouveler sous ${days} jours` });
    }
  }

  return alerts;
}

// Composant AlertCards typé
interface AlertCardsProps {
  vehicles: Vehicle[];
  currentSite: { code: string } | null | undefined;
  onResolve: (vehicle: Vehicle, alert: VehicleAlert) => void;
}
function AlertCards({ vehicles, currentSite, onResolve }: AlertCardsProps) {
  const filtered = vehicles.filter(v => !currentSite || v.siteCode === currentSite.code);
  const allAlerts = filtered.flatMap(vehicle =>
    checkVehicleAlerts(vehicle).map(alert => ({ ...alert, vehicle }))
  );
  if (allAlerts.length === 0) return null;
  const dangerCount = allAlerts.filter(a => a.priority === 'danger').length;
  const warningCount = allAlerts.filter(a => a.priority === 'warning').length;
  return (
    <div className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 via-orange-50 to-amber-50 p-5 shadow-lg">
      {/* Header with counts */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <div className="p-2 bg-red-600 rounded-xl shadow-md"><AlertTriangle className="h-5 w-5 text-white" /></div>
          Alertes du Parc
        </h2>
        <div className="flex items-center gap-3">
          {dangerCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-bold shadow-sm animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white"></span>
              {dangerCount} critique{dangerCount > 1 ? 's' : ''}
            </span>
          )}
          {warningCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500 text-white text-xs font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-white"></span>
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
          if (alert.type === 'vidange') { Icon = Droplets; typeLabel = 'Vidange urgente'; }
          if (alert.type === 'ct') { Icon = FileCheck; typeLabel = 'Contrôle technique'; }
          if (alert.type === 'assurance') { Icon = ShieldAlert; typeLabel = 'Assurance'; }
          return (
            <div key={idx} className={`relative rounded-xl p-4 flex items-start gap-3 border transition-all hover:scale-[1.01] hover:shadow-md ${
              isDanger
                ? 'bg-red-50 border-red-300 shadow-red-100 shadow-sm'
                : 'bg-orange-50 border-orange-300 shadow-orange-100 shadow-sm'
            }`}>
              <div className={`flex-shrink-0 p-2.5 rounded-xl shadow-sm ${isDanger ? 'bg-red-600' : 'bg-orange-500'}`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isDanger ? 'bg-red-200 text-red-800' : 'bg-orange-200 text-orange-800'}`}>{typeLabel}</span>
                </div>
                <p className="font-bold text-sm text-gray-900 truncate">{alert.vehicle.registration} <span className="font-normal text-gray-500">— {alert.vehicle.brand} {alert.vehicle.model}</span></p>
                <p className={`text-xs mt-0.5 ${isDanger ? 'text-red-700' : 'text-orange-700'}`}>{alert.message}</p>
                <button
                  className={`mt-2.5 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all shadow-sm hover:shadow-md active:scale-95 ${
                    isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'
                  }`}
                  onClick={() => onResolve(alert.vehicle, alert)}
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
  );
}

export default function VehiclesPage() {
  const { isAdmin, allUsers } = useAuth();
  const { site: currentSite } = useContextSelector();
  const navigate = useNavigate()
  const [assuranceContracts, setAssuranceContracts] = useState<InsuranceContract[]>(() => assuranceStore.load())

  useEffect(() => {
    const h = () => setAssuranceContracts(assuranceStore.load())
    window.addEventListener(ASSURANCE_CHANGE_EVENT, h)
    return () => window.removeEventListener(ASSURANCE_CHANGE_EVENT, h)
  }, [])

  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null)
  const [isClaimsModalOpen, setIsClaimsModalOpen] = useState(false)
  const [claimsForVehicle, setClaimsForVehicle] = useState<any[]>([])
  const [isCreateClaimModalOpen, setIsCreateClaimModalOpen] = useState(false)
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [fuelForm, setFuelForm] = useState({ date: '', liters: 0, costPerLiter: 0, totalCost: 0, mileageAtFill: 0, station: '', notes: '' })
  const [fuelReceipt, setFuelReceipt] = useState<ExpenseDocument | null>(null)
  const fuelReceiptRef = useRef<HTMLInputElement>(null)
  const [expenseForm, setExpenseForm] = useState({ date: '', type: 'Réparation' as ExpenseRecord['type'], description: '', amount: 0, notes: '' })
  const [expenseReceipt, setExpenseReceipt] = useState<ExpenseDocument | null>(null)
  const expenseReceiptRef = useRef<HTMLInputElement>(null)
  const [claimForm, setClaimForm] = useState({ reportNumber: '', date: '', vehicle: '', driver: '', type: 'Collision', severity: 'Mineur', location: '', insurer: '', status: 'Ouvert', costEstimate: 0, description: '' })

  // ── Resolve alert modal state ──
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false)
  const [resolveAlert, setResolveAlert] = useState<{ vehicle: Vehicle; alert: VehicleAlert } | null>(null)
  const [resolveForm, setResolveForm] = useState({ newDate: '', newMileage: 0 })
  const [isAssuranceResolveOpen, setIsAssuranceResolveOpen] = useState(false)
  const [resolveInsuranceContract, setResolveInsuranceContract] = useState<InsuranceContract | null>(null)
  const [resolveInsuranceForm, setResolveInsuranceForm] = useState({ newDate: '', numeroPolice: '', contratScan: undefined as string | undefined })
  const resolveInsuranceRef = useRef<HTMLInputElement>(null)

  const contractsByVehicle = useMemo(() => {
    const map = new Map<string, InsuranceContract[]>()
    assuranceContracts.forEach(contract => {
      const current = map.get(contract.vehicule) || []
      current.push(contract)
      current.sort((left, right) => new Date(right.dateEcheance).getTime() - new Date(left.dateEcheance).getTime())
      map.set(contract.vehicule, current)
    })
    return map
  }, [assuranceContracts])

  const getLatestInsuranceContract = (registration: string) => contractsByVehicle.get(registration)?.[0]

  const getInsuranceTimeline = (registration: string) => {
    const contracts = contractsByVehicle.get(registration) || []
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
      .sort((left, right) => new Date(right.dateEcheance).getTime() - new Date(left.dateEcheance).getTime())
  }

  // ── Revision form state (multi-section) ──
  const revisionChecks = {
    engine: [
      { key: 'oil_change', label: 'Vidange moteur effectuée' },
      { key: 'oil_filter', label: 'Filtre à huile remplacé' },
      { key: 'air_filter', label: 'Filtre à air vérifié/remplacé' },
      { key: 'fuel_filter', label: 'Filtre à carburant remplacé' },
      { key: 'belt_check', label: 'Courroies vérifiées' },
      { key: 'coolant_check', label: 'Circuit de refroidissement vérifié' },
    ],
    safety: [
      { key: 'brake_pads', label: 'Plaquettes de frein vérifiées' },
      { key: 'brake_discs', label: 'Disques de frein vérifiés' },
      { key: 'brake_fluid', label: 'Liquide de frein vérifié' },
      { key: 'tire_condition', label: 'État des pneus vérifié' },
      { key: 'lights_check', label: 'Éclairage et feux vérifiés' },
      { key: 'horn_mirrors', label: 'Klaxon et rétroviseurs OK' },
    ],
    fluids: [
      { key: 'engine_oil_level', label: 'Niveau huile moteur OK' },
      { key: 'coolant_level', label: 'Niveau liquide de refroidissement OK' },
      { key: 'power_steering', label: 'Niveau direction assistée OK' },
      { key: 'windshield_fluid', label: 'Liquide lave-glace rempli' },
      { key: 'transmission_fluid', label: 'Huile de transmission vérifiée' },
      { key: 'adblue_level', label: 'Niveau AdBlue vérifié' },
    ],
  } as const
  const [revisionCheckState, setRevisionCheckState] = useState<Record<string, boolean>>({})
  const [revisionTechnical, setRevisionTechnical] = useState({ brakePadThickness: '', tirePressure: '', replacedParts: '', cost: '' })
  const [revisionPhotos, setRevisionPhotos] = useState<ExpenseDocument[]>([])
  const revisionPhotoRef = useRef<HTMLInputElement>(null)

  const defaultVehicles: any[] = [
    { 
      id: '1', 
      registration: 'SN-8765-AB', 
      brand: 'Mercedes-Benz', 
      model: 'Actros 2546', 
      siteCode: 'DKR', // Dakar
      type: 'Camion', 
      status: 'Disponible', 
      capacity: '25000 kg', 
      year: 2022,
      purchaseDate: '2022-03-15',
      commissionDate: '2022-04-01',
      mileage: 148500,
      fuelType: 'Diesel',
      insuranceExpiry: '2026-06-30',
      technicalControlExpiry: '2026-04-15',
      carteGriseExpiry: '2027-03-15',
      vignetteExpiry: '2026-12-31',
      lastOilChange: '2025-12-10',
      nextOilChange: '2026-04-10',
      maintenanceHistory: [
        { id: '1', date: '2025-12-10', type: 'Vidange moteur', description: 'Vidange complète + filtres', cost: 125000, nextDue: '2026-02-10' },
        { id: '2', date: '2025-11-05', type: 'Révision freins', description: 'Remplacement plaquettes avant', cost: 85000 },
      ],
      documents: [],
      fuelRecords: [
        { id: 'f1', date: '2026-03-10', liters: 280, costPerLiter: 850, totalCost: 238000, mileageAtFill: 148500, station: 'Total Dakar' },
        { id: 'f2', date: '2026-03-05', liters: 260, costPerLiter: 850, totalCost: 221000, mileageAtFill: 147800, station: 'Shell Thiès' },
        { id: 'f3', date: '2026-02-25', liters: 290, costPerLiter: 840, totalCost: 243600, mileageAtFill: 147100, station: 'Total Dakar' },
        { id: 'f4', date: '2026-02-15', liters: 275, costPerLiter: 840, totalCost: 231000, mileageAtFill: 146300, station: 'Shell Mbour' },
        { id: 'f5', date: '2026-01-20', liters: 300, costPerLiter: 830, totalCost: 249000, mileageAtFill: 145500, station: 'Total Dakar' },
      ],
      expenses: [
        { id: 'e1', date: '2026-03-08', type: 'Pneus', description: 'Remplacement 2 pneus avant', amount: 320000 },
        { id: 'e2', date: '2026-02-20', type: 'Lavage', description: 'Lavage complet extérieur/intérieur', amount: 15000 },
        { id: 'e3', date: '2026-01-15', type: 'Péage', description: 'Péages autoroute Dakar-Thiès (aller-retour x5)', amount: 50000 },
      ],
      notes: 'Véhicule certifié HAZMAT - Transport de matières dangereuses',
      assignedDriver: 'Yao Kouamé',
      complianceDocs: []
    },
    { 
      id: '2', 
      registration: 'SN-9876-CD', 
      brand: 'Volvo', 
      model: 'FH16', 
      siteCode: 'STL', // Saint-Louis
      type: 'Citerne', 
      status: 'En opération', 
      capacity: '30000 kg', 
      year: 2023,
      purchaseDate: '2023-01-20',
      commissionDate: '2023-02-01',
      mileage: 95200,
      fuelType: 'Diesel',
      insuranceExpiry: '2026-08-15',
      technicalControlExpiry: '2026-08-15',
      carteGriseExpiry: '2027-01-20',
      vignetteExpiry: '2026-12-31',
      lastOilChange: '2025-11-20',
      nextOilChange: '2026-04-20',
      maintenanceHistory: [
        { id: '1', date: '2025-11-20', type: 'Vidange moteur', description: 'Vidange + contrôle général', cost: 135000, nextDue: '2026-01-20' },
      ],
      documents: [],
      fuelRecords: [
        { id: 'f1', date: '2026-03-09', liters: 350, costPerLiter: 850, totalCost: 297500, mileageAtFill: 95200, station: 'Total Saint-Louis' },
        { id: 'f2', date: '2026-02-28', liters: 320, costPerLiter: 840, totalCost: 268800, mileageAtFill: 94500, station: 'Shell Dakar' },
        { id: 'f3', date: '2026-01-10', liters: 340, costPerLiter: 830, totalCost: 282200, mileageAtFill: 93700, station: 'Total Dakar' },
      ],
      expenses: [
        { id: 'e1', date: '2026-03-01', type: 'Réparation', description: 'Réparation système de pompage citerne', amount: 450000 },
        { id: 'e2', date: '2026-02-10', type: 'Pièces détachées', description: 'Filtres + joints citerne', amount: 85000 },
      ],
      notes: 'Citerne spécialisée pour liquides dangereux',
      assignedDriver: 'Abou Traoré',
      complianceDocs: []
    },
    { 
      id: '3', 
      registration: 'SN-5432-EF', 
      brand: 'Scania', 
      model: 'R450', 
      siteCode: 'DBL', // Diourbel
      type: 'Benne', 
      status: 'Maintenance', 
      capacity: '18000 kg', 
      year: 2021,
      purchaseDate: '2021-06-10',
      commissionDate: '2021-07-01',
      mileage: 178300,
      fuelType: 'Diesel',
      insuranceExpiry: '2026-05-20',
      technicalControlExpiry: '2026-07-10',
      carteGriseExpiry: '2026-06-10',
      vignetteExpiry: '2026-12-31',
      lastOilChange: '2025-10-15',
      nextOilChange: '2025-12-15',
      maintenanceHistory: [
        { id: '1', date: '2026-01-15', type: 'Révision majeure', description: 'En cours - Révision complète 180,000 km', cost: 450000 },
        { id: '2', date: '2025-10-15', type: 'Vidange moteur', description: 'Vidange standard', cost: 115000, nextDue: '2025-12-15' },
      ],
      documents: [],
      fuelRecords: [
        { id: 'f1', date: '2026-01-10', liters: 250, costPerLiter: 830, totalCost: 207500, mileageAtFill: 178000, station: 'Shell Ziguinchor' },
      ],
      expenses: [
        { id: 'e1', date: '2026-01-15', type: 'Réparation', description: 'Révision majeure 180,000 km', amount: 450000 },
      ],
      notes: 'En révision majeure suite aux 180,000 km',
      complianceDocs: []
    },
    { 
      id: '4', 
      registration: 'SN-1234-GH', 
      brand: 'MAN', 
      model: 'TGX', 
      siteCode: 'ABJ', // Abidjan
      type: 'Camion', 
      status: 'Disponible', 
      capacity: '22000 kg', 
      year: 2020,
      purchaseDate: '2020-09-05',
      commissionDate: '2020-10-01',
      mileage: 212600,
      fuelType: 'Diesel',
      insuranceExpiry: '2026-09-01',
      technicalControlExpiry: '2026-10-05',
      carteGriseExpiry: '2026-09-05',
      vignetteExpiry: '2026-12-31',
      lastOilChange: '2025-12-20',
      nextOilChange: '2026-04-20',
      maintenanceHistory: [
        { id: '1', date: '2025-12-20', type: 'Vidange moteur', description: 'Vidange + remplacement filtres', cost: 120000, nextDue: '2026-02-20' },
        { id: '2', date: '2025-09-10', type: 'Contrôle technique', description: 'CT réussi sans réserve', cost: 25000 },
      ],
      documents: [],
      fuelRecords: [
        { id: 'f1', date: '2026-03-08', liters: 220, costPerLiter: 850, totalCost: 187000, mileageAtFill: 212600, station: 'Total Dakar' },
        { id: 'f2', date: '2026-02-22', liters: 240, costPerLiter: 840, totalCost: 201600, mileageAtFill: 211800, station: 'Shell Kaolack' },
        { id: 'f3', date: '2026-02-10', liters: 230, costPerLiter: 840, totalCost: 193200, mileageAtFill: 211000, station: 'Total Dakar' },
      ],
      expenses: [
        { id: 'e1', date: '2026-03-05', type: 'Lavage', description: 'Lavage complet', amount: 12000 },
        { id: 'e2', date: '2026-02-15', type: 'Péage', description: 'Péages mensuels', amount: 35000 },
      ],
      complianceDocs: []
    },
  ]

  const [vehicles, setVehicles] = useState<any[]>(() => {
    const stored = vehiclesStore.load()
    return stored.length > 0 ? stored : defaultVehicles
  })

  useEffect(() => {
    const h = () => setVehicles(vehiclesStore.load())
    window.addEventListener(ASSURANCE_CHANGE_EVENT, h)
    return () => window.removeEventListener(ASSURANCE_CHANGE_EVENT, h)
  }, [])

  useEffect(() => {
    vehiclesStore.save(vehicles)
  }, [vehicles])

  const [formData, setFormData] = useState({
    registration: '',
    brand: '',
    model: '',
    type: 'Camion',
    capacity: '',
    status: 'Disponible' as Vehicle['status'],
    year: new Date().getFullYear(),
    purchaseDate: '',
    commissionDate: '',
    mileage: 0,
    fuelType: 'Diesel' as Vehicle['fuelType'],
    insuranceExpiry: '',
    technicalControlExpiry: '',
    carteGriseExpiry: '',
    vignetteExpiry: '',
    lastOilChange: '',
    nextOilChange: '',
    notes: '',
    assignedDriver: '',
    dateFinMiseDisposition: '',
    kilometrageAuPret: 0
  })

  const [driverOptions, setDriverOptions] = useState<string[]>(() => {
    try {
      const d = driversStore.load()
      return (d || []).map((x: any) => x.name)
    } catch (e) { return [] }
  })

  const filteredVehicles = vehicles.filter(vehicle => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      vehicle.registration.toLowerCase().includes(term) ||
      vehicle.brand.toLowerCase().includes(term) ||
      vehicle.model.toLowerCase().includes(term) ||
      (vehicle.assignedDriver || '').toLowerCase().includes(term);

    const matchesStatus = filterStatus === 'all' || vehicle.status === filterStatus;

    // Filtrage dynamique par site sélectionné
    const matchesSite = currentSite ? vehicle.siteCode === currentSite.code : true;

    // Si vous souhaitez filtrer aussi par année, décommentez la ligne suivante :
    // const matchesYear = year ? vehicle.year === year : true;

    return matchesSearch && matchesStatus && matchesSite;
  });

  // Fuel consumption calculations
  const getFuelStats = (vehicle: Vehicle) => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const records = vehicle.fuelRecords || []
    const monthRecords = records.filter((r: any) => {
      const d = new Date(r.date)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })
    const yearRecords = records.filter((r: any) => {
      const d = new Date(r.date)
      return d.getFullYear() === currentYear
    })

    return {
      monthLiters: monthRecords.reduce((sum: number, r: any) => sum + (r.liters || 0), 0),
      monthCost: monthRecords.reduce((sum: number, r: any) => sum + (r.totalCost || 0), 0),
      yearLiters: yearRecords.reduce((sum: number, r: any) => sum + (r.liters || 0), 0),
      yearCost: yearRecords.reduce((sum: number, r: any) => sum + (r.totalCost || 0), 0),
      totalRecords: records.length,
      lastFill: records.length > 0 ? records[0] : null,
    }
  }

  // Expense calculations
  const getExpenseStats = (vehicle: Vehicle) => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const expenses = vehicle.expenses || []
    const monthExpenses = expenses.filter((e: any) => {
      const d = new Date(e.date)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })
    const yearExpenses = expenses.filter((e: any) => {
      const d = new Date(e.date)
      return d.getFullYear() === currentYear
    })

    const byType: Record<string, number> = {}
    yearExpenses.forEach((e: any) => {
      byType[e.type] = (byType[e.type] || 0) + (e.amount || 0)
    })

    return {
      monthTotal: monthExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0),
      yearTotal: yearExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0),
      byType,
      totalRecords: expenses.length,
    }
  }

  const handleAddFuel = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVehicle) return
    const newRecord: FuelRecord = {
      id: Date.now().toString(),
      date: fuelForm.date,
      liters: fuelForm.liters,
      costPerLiter: fuelForm.costPerLiter,
      totalCost: fuelForm.totalCost,
      mileageAtFill: fuelForm.mileageAtFill,
      station: fuelForm.station,
      notes: fuelForm.notes,
      receipt: fuelReceipt || undefined,
    }
    setVehicles(vehicles.map(v =>
      v.id === selectedVehicle.id
        ? { ...v, fuelRecords: [newRecord, ...(v.fuelRecords || [])] }
        : v
    ))
    setSelectedVehicle((prev: any) => prev ? { ...prev, fuelRecords: [newRecord, ...(prev.fuelRecords || [])] } : prev)
    setIsFuelModalOpen(false)
    setFuelForm({ date: '', liters: 0, costPerLiter: 0, totalCost: 0, mileageAtFill: 0, station: '', notes: '' })
    setFuelReceipt(null)
    toast.success('Carburant ajouté avec succès')
  }

  const handleFuelReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) { toast.error('Fichier trop volumineux (max 20 Mo)'); return }
    const reader = new FileReader()
    reader.onload = () => {
      setFuelReceipt({ name: file.name, type: file.type, size: file.size, dataUrl: reader.result as string })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleExpenseReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) { toast.error('Fichier trop volumineux (max 20 Mo)'); return }
    const reader = new FileReader()
    reader.onload = () => {
      setExpenseReceipt({ name: file.name, type: file.type, size: file.size, dataUrl: reader.result as string })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVehicle) return
    const newExpense: ExpenseRecord = {
      id: Date.now().toString(),
      date: expenseForm.date,
      type: expenseForm.type,
      description: expenseForm.description,
      amount: expenseForm.amount,
      notes: expenseForm.notes,
      receipt: expenseReceipt || undefined,
    }
    setVehicles(vehicles.map(v =>
      v.id === selectedVehicle.id
        ? { ...v, expenses: [newExpense, ...(v.expenses || [])] }
        : v
    ))
    setSelectedVehicle((prev: any) => prev ? { ...prev, expenses: [newExpense, ...(prev.expenses || [])] } : prev)
    setIsExpenseModalOpen(false)
    setExpenseForm({ date: '', type: 'Réparation', description: '', amount: 0, notes: '' })
    setExpenseReceipt(null)
    toast.success('Dépense ajoutée avec succès')
  }

  // Calcul des alertes
  const getMaintenanceAlerts = (vehicle: Vehicle) => {
    const alerts = checkVehicleAlerts(vehicle)
    return alerts
  }

  // ── Resolve alert logic ──
  const openResolveModal = (vehicle: Vehicle, alert: VehicleAlert) => {
    setSelectedVehicle(vehicle)

    if (alert.type === 'assurance') {
      const contract = getLatestInsuranceContract(vehicle.registration)
      if (contract) {
        setResolveInsuranceContract(contract)
        setResolveInsuranceForm({
          newDate: contract.dateEcheance || '',
          numeroPolice: contract.numeroPolice || '',
          contratScan: undefined,
        })
      } else {
        setResolveInsuranceContract(null)
        setResolveInsuranceForm({
          newDate: vehicle.insuranceExpiry || '',
          numeroPolice: '',
          contratScan: undefined,
        })
      }
      setIsAssuranceResolveOpen(true)
      return
    }

    setResolveAlert({ vehicle, alert })
    // Pre-fill form based on alert type
    if (alert.type === 'ct') {
      setResolveForm({ newDate: vehicle.technicalControlExpiry || '', newMileage: vehicle.mileage || 0 })
    } else if (alert.type === 'vidange') {
      setResolveForm({ newDate: new Date().toISOString().split('T')[0], newMileage: vehicle.mileage || 0 })
    }
    // Reset revision form state
    setRevisionCheckState({})
    setRevisionTechnical({ brakePadThickness: '', tirePressure: '', replacedParts: '', cost: '' })
    setRevisionPhotos([])
    setIsResolveModalOpen(true)
  }

  const handleResolveInsuranceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (max 20 Mo)')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setResolveInsuranceForm(prev => ({ ...prev, contratScan: reader.result as string }))
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const submitAssuranceResolve = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVehicle) return

    const contract = resolveInsuranceContract || getLatestInsuranceContract(selectedVehicle.registration)
    if (contract) {
      assuranceStore.update(contract.id, {
        dateEcheance: resolveInsuranceForm.newDate,
        numeroPolice: resolveInsuranceForm.numeroPolice.trim() || contract.numeroPolice,
        contratScan: resolveInsuranceForm.contratScan ?? contract.contratScan,
      })
      setAssuranceContracts(assuranceStore.load())
    }

    setVehicles(prev => prev.map(v => v.id === selectedVehicle.id ? { ...v, insuranceExpiry: resolveInsuranceForm.newDate } : v))
    setIsAssuranceResolveOpen(false)
    setResolveInsuranceContract(null)
    setResolveInsuranceForm({ newDate: '', numeroPolice: '', contratScan: undefined })
    toast.success('Assurance mise à jour, alerte résolue avec succès !')
  }

  const handleRevisionPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach(file => {
      if (file.size > 20 * 1024 * 1024) { toast.error(`${file.name} trop volumineux (max 20 Mo)`); return }
      const reader = new FileReader()
      reader.onload = () => {
        setRevisionPhotos(prev => [...prev, { name: file.name, type: file.type, size: file.size, dataUrl: reader.result as string }])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const handleResolveAlert = (e: React.FormEvent) => {
    e.preventDefault()
    if (!resolveAlert) return
    const { vehicle, alert } = resolveAlert
    const today = new Date().toISOString().split('T')[0]
    const mileageNow = resolveForm.newMileage || vehicle.mileage

    // Build maintenance record for archive
    const checkedItems = Object.entries(revisionCheckState).filter(([, v]) => v).map(([k]) => k)
    const allChecks = [...revisionChecks.engine, ...revisionChecks.safety, ...revisionChecks.fluids]
    const checkedLabels = checkedItems.map(k => allChecks.find(c => c.key === k)?.label || k)
    const descParts: string[] = []
    if (checkedLabels.length > 0) descParts.push(`Contrôles : ${checkedLabels.join(', ')}`)
    if (revisionTechnical.replacedParts.trim()) descParts.push(`Pièces remplacées : ${revisionTechnical.replacedParts.trim()}`)
    if (revisionTechnical.brakePadThickness) descParts.push(`Plaquettes : ${revisionTechnical.brakePadThickness} mm`)
    if (revisionTechnical.tirePressure) descParts.push(`Pression pneus : ${revisionTechnical.tirePressure} bar`)

    const typeLabels: Record<string, string> = { assurance: 'Renouvellement assurance', ct: 'Contrôle technique', vidange: 'Révision / Vidange' }
    const newRecord: MaintenanceRecord = {
      id: Date.now().toString(),
      date: resolveForm.newDate || today,
      type: typeLabels[alert.type] || 'Intervention',
      description: descParts.join(' | ') || typeLabels[alert.type],
      cost: parseFloat(revisionTechnical.cost) || 0,
      mileageAtService: mileageNow,
      checklist: { ...revisionCheckState },
      brakePadThickness: parseFloat(revisionTechnical.brakePadThickness) || undefined,
      tirePressure: parseFloat(revisionTechnical.tirePressure) || undefined,
      replacedParts: revisionTechnical.replacedParts || undefined,
      photos: revisionPhotos.length > 0 ? [...revisionPhotos] : undefined,
    }

    // Schedule next revision: +10 000 km
    const nextRevisionKm = mileageNow + 10000

    setVehicles(prev => prev.map(v => {
      if (v.id !== vehicle.id) return v
      const updated = { ...v, mileage: mileageNow, maintenanceHistory: [newRecord, ...(v.maintenanceHistory || [])], lastMaintenance: resolveForm.newDate || today }

      if (alert.type === 'assurance') {
        return { ...updated, insuranceExpiry: resolveForm.newDate }
      } else if (alert.type === 'ct') {
        return { ...updated, technicalControlExpiry: resolveForm.newDate }
      } else if (alert.type === 'vidange') {
        const nextD = new Date(resolveForm.newDate || today)
        nextD.setMonth(nextD.getMonth() + 6)
        return { ...updated, lastOilChange: resolveForm.newDate || today, nextOilChange: nextD.toISOString().split('T')[0] }
      }
      return updated
    }))

    setIsResolveModalOpen(false)
    setResolveAlert(null)
    const labels: Record<string, string> = { assurance: 'Assurance', ct: 'Contrôle technique', vidange: 'Vidange', carte_grise: 'Carte grise', vignette: 'Vignette' }
    toast.success(`${labels[alert.type]} résolu pour ${vehicle.registration} — prochaine révision à ${nextRevisionKm.toLocaleString()} km`)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'year' || name === 'mileage' || name === 'kilometrageAuPret' ? parseInt(value) || 0 : value 
    }))
  }

  const resetForm = () => {
    setFormData({
      registration: '',
      brand: '',
      model: '',
      type: 'Camion',
      capacity: '',
      status: 'Disponible',
      year: new Date().getFullYear(),
      purchaseDate: '',
      commissionDate: '',
      mileage: 0,
      fuelType: 'Diesel',
      insuranceExpiry: '',
      technicalControlExpiry: '',
      carteGriseExpiry: '',
      vignetteExpiry: '',
      lastOilChange: '',
      nextOilChange: '',
      notes: '',
      assignedDriver: '',
      dateFinMiseDisposition: '',
      kilometrageAuPret: 0
    })
    setVehicleDocs([])
    setComplianceDocs([])
    setFormErrors({})
  }

  // ── Validation state ──
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const validateCreateForm = (): boolean => {
    const errors: Record<string, string> = {}
    if (!formData.registration.trim()) errors.registration = 'Immatriculation requise'
    if (!formData.type.trim()) errors.type = 'Type requis'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // ── Auto-calc: suggest next dates when "last" dates change ──
  useEffect(() => {
    if (formData.lastOilChange) {
      const d = new Date(formData.lastOilChange)
      if (!isNaN(d.getTime())) {
        d.setMonth(d.getMonth() + 6)
        const suggested = d.toISOString().split('T')[0]
        if (!formData.nextOilChange) {
          setFormData(prev => ({ ...prev, nextOilChange: suggested }))
        }
      }
    }
  }, [formData.lastOilChange])

  useEffect(() => {
    if (formData.technicalControlExpiry) {
      // Auto-suggest is informational — user already has a field for CT expiry
    }
  }, [formData.technicalControlExpiry])

  // ── Drag & drop state ──
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (!files || files.length === 0) return
    Array.from(files).forEach(file => {
      if (file.size > 20 * 1024 * 1024) { toast.error(`${file.name} trop volumineux (max 20 Mo)`); return }
      const reader = new FileReader()
      reader.onload = () => {
        setVehicleDocs(prev => [...prev, { id: Date.now().toString() + Math.random(), name: file.name, type: file.type, size: file.size, dataUrl: reader.result as string, uploadedAt: new Date().toISOString() }])
      }
      reader.readAsDataURL(file)
    })
  }, [])

  useEffect(() => {
    const handle = () => {
      try {
        const d = driversStore.load()
        setDriverOptions((d || []).map((x: any) => x.name))
      } catch (e) {}
    }
    window.addEventListener('drivers:updated', handle)
    handle()
    return () => window.removeEventListener('drivers:updated', handle)
  }, [])

  const [vehicleDocs, setVehicleDocs] = useState<VehicleDocument[]>([])
  const vehDocInputRef = useRef<HTMLInputElement>(null)

  const handleVehicleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach(file => {
      if (file.size > 20 * 1024 * 1024) { toast.error(`${file.name} trop volumineux (max 20 Mo)`); return }
      const reader = new FileReader()
      reader.onload = () => {
        setVehicleDocs(prev => [...prev, { id: Date.now().toString() + Math.random(), name: file.name, type: file.type, size: file.size, dataUrl: reader.result as string, uploadedAt: new Date().toISOString() }])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const formatFileSize = (bytes: number) => bytes < 1024 ? bytes + ' o' : bytes < 1048576 ? (bytes / 1024).toFixed(1) + ' Ko' : (bytes / 1048576).toFixed(1) + ' Mo'

  // ── Compliance Documents (scans: carte grise, assurance, VT) ──
  const [complianceDocs, setComplianceDocs] = useState<ComplianceDocument[]>([])
  const complianceDocRefs = {
    carte_grise: useRef<HTMLInputElement>(null),
    assurance: useRef<HTMLInputElement>(null),
    visite_technique: useRef<HTMLInputElement>(null),
  }
  const [previewDoc, setPreviewDoc] = useState<ComplianceDocument | null>(null)
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null)

  const handleComplianceDocUpload = (files: FileList | null, category: ComplianceDocument['category']) => {
    if (!files) return
    const file = files[0]
    if (!file) return
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
    if (!validTypes.includes(file.type)) { toast.error('Format non supporté. Utilisez PDF, PNG ou JPG.'); return }
    if (file.size > 20 * 1024 * 1024) { toast.error(`${file.name} trop volumineux (max 20 Mo)`); return }
    const reader = new FileReader()
    reader.onload = () => {
      setComplianceDocs(prev => {
        const filtered = prev.filter(d => d.category !== category)
        return [...filtered, {
          id: Date.now().toString() + Math.random(),
          category,
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: reader.result as string,
          uploadedAt: new Date().toISOString()
        }]
      })
      toast.success(`${category === 'carte_grise' ? 'Carte grise' : category === 'assurance' ? 'Assurance' : 'Visite technique'} téléchargé`)
    }
    reader.readAsDataURL(file)
  }

  const handleComplianceDrop = (e: React.DragEvent, category: ComplianceDocument['category']) => {
    e.preventDefault()
    setDragOverCategory(null)
    handleComplianceDocUpload(e.dataTransfer.files, category)
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateCreateForm()) return
    const newVehicle: Vehicle = {
      id: Date.now().toString(),
      ...formData,
      maintenanceHistory: [],
      documents: vehicleDocs,
      complianceDocs: complianceDocs,
      fuelRecords: [],
      expenses: []
    }
    setVehicles([...vehicles, newVehicle])
    setIsCreateModalOpen(false)
    resetForm()
    toast.success('Véhicule créé avec succès')
    // Notification à l'admin ou manager
    if (allUsers && allUsers.length > 0) {
      const adminOrManager = allUsers.find(u => u.role === 'admin' || u.role === 'manager')
      if (adminOrManager) {
        sendNotification({
          userId: adminOrManager.id,
          type: 'other',
          title: 'Nouveau véhicule ajouté',
          message: `Le véhicule ${newVehicle.registration} (${newVehicle.brand} ${newVehicle.model}) a été créé.`,
          entityType: 'vehicle',
          entityId: newVehicle.id,
          metadata: { registration: newVehicle.registration }
        })
      }
    }
  }

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVehicle) return
    setVehicles(vehicles.map(v => 
      v.id === selectedVehicle.id ? { 
        ...v, 
        ...formData,
        maintenanceHistory: selectedVehicle.maintenanceHistory,
        documents: vehicleDocs,
        complianceDocs: complianceDocs,
        fuelRecords: selectedVehicle.fuelRecords,
        expenses: selectedVehicle.expenses
      } : v
    ))
    setIsEditModalOpen(false)
    setSelectedVehicle(null)
    resetForm()
    toast.success('Véhicule modifié avec succès')
    // Notification à l'admin ou manager
    if (allUsers && allUsers.length > 0 && selectedVehicle) {
      const adminOrManager = allUsers.find(u => u.role === 'admin' || u.role === 'manager')
      if (adminOrManager) {
        sendNotification({
          userId: adminOrManager.id,
          type: 'other',
          title: 'Véhicule modifié',
          message: `Le véhicule ${selectedVehicle.registration} a été modifié.`,
          entityType: 'vehicle',
          entityId: selectedVehicle.id,
          metadata: { registration: selectedVehicle.registration }
        })
      }
    }
  }

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce véhicule ?')) {
      const vehicleToDelete = vehicles.find(v => v.id === id)
      setVehicles(vehicles.filter(v => v.id !== id))
      setIsEditModalOpen(false)
      setSelectedVehicle(null)
      toast.success('Véhicule supprimé avec succès')
      // Notification à l'admin ou manager
      if (allUsers && allUsers.length > 0 && vehicleToDelete) {
        const adminOrManager = allUsers.find(u => u.role === 'admin' || u.role === 'manager')
        if (adminOrManager) {
          sendNotification({
            userId: adminOrManager.id,
            type: 'other',
            title: 'Véhicule supprimé',
            message: `Le véhicule ${vehicleToDelete.registration} a été supprimé.`,
            entityType: 'vehicle',
            entityId: vehicleToDelete.id,
            metadata: { registration: vehicleToDelete.registration }
          })
        }
      }
    }
  }

  const openEditModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setFormData({
      registration: vehicle.registration,
      brand: vehicle.brand,
      model: vehicle.model,
      type: vehicle.type,
      capacity: String(vehicle.capacity || ''),
      status: vehicle.status,
      year: vehicle.year,
      purchaseDate: vehicle.purchaseDate || '',
      commissionDate: vehicle.commissionDate || '',
      mileage: vehicle.mileage,
      fuelType: vehicle.fuelType,
      insuranceExpiry: vehicle.insuranceExpiry || '',
      technicalControlExpiry: vehicle.technicalControlExpiry || '',
      carteGriseExpiry: vehicle.carteGriseExpiry || '',
      vignetteExpiry: vehicle.vignetteExpiry || '',
      lastOilChange: vehicle.lastOilChange || '',
      nextOilChange: vehicle.nextOilChange || '',
      notes: vehicle.notes || '',
      assignedDriver: vehicle.assignedDriver || '',
      dateFinMiseDisposition: vehicle.dateFinMiseDisposition || '',
      kilometrageAuPret: vehicle.kilometrageAuPret || 0
    })
    setVehicleDocs(vehicle.documents || [])
    setComplianceDocs(vehicle.complianceDocs || [])
    setIsEditModalOpen(true)
  }

  const openViewModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setIsViewModalOpen(true)
  }

  const openMaintenanceModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setIsMaintenanceModalOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Disponible':
        return 'bg-green-600 text-white'
      case 'En opération':
        return 'bg-blue-600 text-white'
      case 'Maintenance':
        return 'bg-orange-500 text-white'
      case 'Hors service':
        return 'bg-red-600 text-white'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="space-y-6">
      <AlertCards vehicles={vehicles} currentSite={currentSite} onResolve={openResolveModal} />
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-2xl p-6 mb-2 text-white flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center"><Truck className="h-7 w-7" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Parc de Véhicules</h1>
            <p className="text-sm text-gray-300">Gestion complète de votre flotte - Maintenance & Suivi</p>
          </div>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center px-5 py-2.5 rounded-xl bg-white text-[#1a1a2e] font-bold shadow-lg hover:bg-gray-100 transition-colors text-sm gap-2"
        >
          <Plus className="h-5 w-5" />
          Nouveau Véhicule
        </button>
      </div>

      {/* Claims Modal for vehicle */}
      <Modal isOpen={isClaimsModalOpen} onClose={() => { setIsClaimsModalOpen(false); setClaimsForVehicle([]) }} title="Sinistres liés au véhicule" size="lg">
        <div className="space-y-4">
          {claimsForVehicle.length === 0 && (
            <p className="text-sm text-gray-500">Aucun sinistre trouvé pour ce véhicule.</p>
          )}
          {claimsForVehicle.map((c, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium text-gray-900">{c.reportNumber} — {c.type}</div>
                <div className="text-xs text-gray-500">{new Date(c.date).toLocaleDateString('fr-FR')}</div>
              </div>
              <div className="text-sm text-gray-600">Lieu: {c.location || '—'}</div>
              <div className="text-sm text-gray-600">Conducteur: {c.driver || '—'}</div>
              <div className="text-sm text-gray-600">Sévérité: {c.severity}</div>
              <div className="text-sm text-gray-600">Coût estimé: {c.costEstimate ? formatCleanAmount(c.costEstimate, 'FCFA') : '—'}</div>
              {c.description && <div className="mt-2 text-gray-800 bg-gray-50 p-2 rounded">{c.description}</div>}
            </div>
          ))}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => { setIsClaimsModalOpen(false); setClaimsForVehicle([]) }}>Fermer</Button>
          </div>
        </div>
      </Modal>

      {/* Inline Create Claim Modal (prefilled from vehicle) */}
      <Modal isOpen={isCreateClaimModalOpen} onClose={() => { setIsCreateClaimModalOpen(false); setClaimForm({ reportNumber: '', date: '', vehicle: '', driver: '', type: 'Collision', severity: 'Mineur', location: '', insurer: '', status: 'Ouvert', costEstimate: 0, description: '' }) }} title="Créer un Sinistre pour ce véhicule">
        <form onSubmit={(e) => {
          e.preventDefault()
          const newClaim = { id: Date.now().toString(), ...claimForm }
          claimsStore.add(newClaim)
          setClaimsForVehicle(claimsStore.load().filter(c => c.vehicle && c.vehicle.toLowerCase().includes(claimForm.vehicle.toLowerCase())))
          setIsCreateClaimModalOpen(false)
          setClaimForm({ reportNumber: '', date: '', vehicle: '', driver: '', type: 'Collision', severity: 'Mineur', location: '', insurer: '', status: 'Ouvert', costEstimate: 0, description: '' })
          toast.success('Sinistre créé')
        }} className="space-y-4">
          <Input label="N° de rapport" name="reportNumber" value={claimForm.reportNumber} onChange={(e) => setClaimForm(prev => ({ ...prev, reportNumber: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date" name="date" type="date" value={claimForm.date} onChange={(e) => setClaimForm(prev => ({ ...prev, date: e.target.value }))} required />
            <Input label="Véhicule" name="vehicle" value={claimForm.vehicle} onChange={(e) => setClaimForm(prev => ({ ...prev, vehicle: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Conducteur" name="driver" value={claimForm.driver} onChange={(e) => setClaimForm(prev => ({ ...prev, driver: e.target.value }))} />
            <Select label="Type" name="type" value={claimForm.type} onChange={(e) => setClaimForm(prev => ({ ...prev, type: e.target.value }))} options={[{value:'Collision',label:'Collision'},{value:'Vol',label:'Vol'},{value:'Incendie',label:'Incendie'},{value:'Autre',label:'Autre'}]} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Sévérité" name="severity" value={claimForm.severity} onChange={(e) => setClaimForm(prev => ({ ...prev, severity: e.target.value }))} options={[{value:'Mineur',label:'Mineur'},{value:'Majeur',label:'Majeur'},{value:'Total',label:'Total'}]} />
            <Input label="Coût estimé (CFA)" name="costEstimate" type="number" value={claimForm.costEstimate} onChange={(e) => setClaimForm(prev => ({ ...prev, costEstimate: parseFloat(e.target.value) || 0 }))} />
          </div>
          <Input label="Lieu" name="location" value={claimForm.location} onChange={(e) => setClaimForm(prev => ({ ...prev, location: e.target.value }))} />
          <Input label="Assureur" name="insurer" value={claimForm.insurer} onChange={(e) => setClaimForm(prev => ({ ...prev, insurer: e.target.value }))} />
          <Select label="Statut" name="status" value={claimForm.status} onChange={(e) => setClaimForm(prev => ({ ...prev, status: e.target.value }))} options={[{value:'Ouvert',label:'Ouvert'},{value:'En cours',label:'En cours'},{value:'Clôturé',label:'Clôturé'}]} />
          <Textarea label="Description" name="description" value={claimForm.description} onChange={(e) => setClaimForm(prev => ({ ...prev, description: e.target.value }))} />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => { setIsCreateClaimModalOpen(false); setClaimForm({ reportNumber: '', date: '', vehicle: '', driver: '', type: 'Collision', severity: 'Mineur', location: '', insurer: '', status: 'Ouvert', costEstimate: 0, description: '' }) }}>Annuler</Button>
            <Button type="submit" variant="primary">Créer</Button>
          </div>
        </form>
      </Modal>

      {/* Filters */}
      <div className="bg-white shadow-sm rounded-xl p-4 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-gray-50/50 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 hover:border-gray-400 transition-colors sm:text-sm"
              placeholder="Rechercher par immatriculation, marque ou chauffeur..."
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 hover:border-gray-400 transition-colors sm:text-sm"
          >
            <option value="all">Tous les statuts</option>
            <option value="Disponible">Disponible</option>
            <option value="En opération">En opération</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Hors service">Hors service</option>
          </select>
        </div>
      </div>

      {/* Vehicles Grid */}
      {filteredVehicles.length === 0 ? (
        <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-12 text-center">
          <Truck className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">{searchTerm || filterStatus !== 'all' ? 'Aucun véhicule ne correspond à votre recherche' : 'Aucun véhicule enregistré'}</p>
          <p className="text-gray-400 text-sm mt-1">{searchTerm || filterStatus !== 'all' ? 'Essayez de modifier vos filtres' : 'Commencez par ajouter un véhicule'}</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredVehicles.map((vehicle) => {
          const alerts = getMaintenanceAlerts(vehicle)
          const complianceAlerts = checkVehicleAlerts(vehicle)
          const hasComplianceDanger = complianceAlerts.some(a => a.priority === 'danger')
          const insuranceContract = getLatestInsuranceContract(vehicle.registration)
          const insuranceStatus = insuranceContract ? computeStatut(insuranceContract.dateEcheance) : null
          return (
            <div key={vehicle.id} className={`bg-white shadow-md rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-200 ${hasComplianceDanger ? 'ring-2 ring-red-500 ring-offset-1' : ''}`}>
              <div className="p-6">
                {/* Vehicle Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className={`text-lg font-bold ${hasComplianceDanger ? 'text-red-700' : 'text-gray-900'}`}>{vehicle.registration}</h3>
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(vehicle.status)}`}>
                                  {vehicle.status}
                                </span>
                              {isVisiteTechniqueExpired(vehicle.technicalControlExpiry) && (
                                <span className="px-2 py-1 text-xs font-bold rounded-full bg-red-600 text-white animate-pulse inline-flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Visite Expirée
                                </span>
                              )}
                              {hasComplianceDanger && (
                                <span className="px-2 py-1 text-xs font-bold rounded-full bg-red-700 text-white animate-pulse inline-flex items-center gap-1">
                                  <ShieldAlert className="h-3 w-3" />
                                  Non Conforme
                                </span>
                              )}
                              {insuranceContract && insuranceStatus && (
                                <span className={`px-2 py-1 text-xs font-bold rounded-full inline-flex items-center gap-1 ${insuranceStatus === 'À jour' ? 'bg-emerald-100 text-emerald-700' : insuranceStatus === 'À renouveler bientôt' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                                  {insuranceStatus === 'À jour' ? <ShieldCheck className="h-3 w-3" /> : insuranceStatus === 'À renouveler bientôt' ? <ShieldAlert className="h-3 w-3" /> : <ShieldOff className="h-3 w-3" />}
                                  Assurance {insuranceStatus}
                                </span>
                              )}
                              {vehicle.status === 'Maintenance' && (
                                <button
                                  onClick={() => {
                                    setVehicles(prev => prev.map(v => v.id === vehicle.id ? { ...v, status: 'Disponible' as const } : v))
                                    toast.success(`${vehicle.registration} est maintenant disponible`)
                                  }}
                                  className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <CheckCircle className="h-3 w-3" />
                                  Sortir de maintenance
                                </button>
                              )}
                              {vehicle.status === 'En opération' && (
                                <button
                                  onClick={() => {
                                    setVehicles(prev => prev.map(v => v.id === vehicle.id ? { ...v, status: 'Disponible' as const } : v))
                                    toast.success(`${vehicle.registration} — opération terminée, véhicule disponible`)
                                  }}
                                  className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <CheckCircle className="h-3 w-3" />
                                  Fin d'opération
                                </button>
                              )}
                    </div>
                              <p className="text-sm text-gray-600">{vehicle.brand} {vehicle.model}</p>
                              {vehicle.assignedDriver && (
                                <p className="text-sm text-gray-500 mt-1">Chauffeur assigné: <span className="font-medium text-gray-900">{vehicle.assignedDriver}</span></p>
                              )}
                    <p className="text-xs text-gray-500 mt-1">{vehicle.type} • {vehicle.year} • {vehicle.fuelType}</p>
                  </div>
                </div>

                {/* Alerts */}
                {alerts.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {alerts.map((alert, idx) => (
                      <div 
                        key={idx}
                        className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium ${
                          alert.priority === 'danger' ? 'bg-red-100 text-red-800' :
                          alert.priority === 'warning' ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        <AlertTriangle className="h-3 w-3" />
                        <span>
                          {alert.type === 'assurance' ? 'Assurance' : 
                           alert.type === 'ct' ? 'Visite Technique' :
                           alert.type === 'carte_grise' ? 'Carte Grise' :
                           alert.type === 'vignette' ? 'Vignette' : 'Vidange'}
                          {typeof alert.days === 'number' ? (alert.days <= 0 ? ' EXPIRÉ!' : ` ${alert.days} jours`) : ''} - {alert.message}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Activity className="h-4 w-4" />
                    <span>{vehicle.mileage.toLocaleString()} km</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Fuel className="h-4 w-4" />
                    <span>{vehicle.capacity}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Shield className="h-4 w-4" />
                    <span className="text-xs">{insuranceContract ? new Date(insuranceContract.dateEcheance).toLocaleDateString('fr-FR') : new Date(vehicle.insuranceExpiry).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <FileText className="h-4 w-4" />
                    <span className="text-xs">{new Date(vehicle.technicalControlExpiry).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>

                {/* Fuel & Expenses Summary */}
                {(() => {
                  const fuelStats = getFuelStats(vehicle)
                  const expStats = getExpenseStats(vehicle)
                  return (
                    <div className="mb-4 p-3 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 font-semibold text-emerald-700">
                          <Fuel className="h-3.5 w-3.5" /> Carburant ce mois
                        </span>
                        <span className="font-bold text-emerald-800">{fuelStats.monthLiters} L • {formatCleanAmount(fuelStats.monthCost, 'FCFA')}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 font-semibold text-blue-700">
                          <TrendingUp className="h-3.5 w-3.5" /> Carburant année
                        </span>
                        <span className="font-bold text-blue-800">{fuelStats.yearLiters} L • {formatCleanAmount(fuelStats.yearCost, 'FCFA')}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs border-t border-gray-200 pt-2">
                        <span className="flex items-center gap-1 font-semibold text-orange-700">
                          <DollarSign className="h-3.5 w-3.5" /> Dépenses année
                        </span>
                        <span className="font-bold text-orange-800">{formatCleanAmount(expStats.yearTotal, 'FCFA')}</span>
                      </div>
                    </div>
                  )
                })()}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <button 
                    onClick={() => { setSelectedVehicle(vehicle); setIsFuelModalOpen(true) }}
                    className="flex-1 px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 inline-flex items-center justify-center gap-1"
                  >
                    <Fuel className="h-4 w-4" />
                    Carburant
                  </button>
                  <button 
                    onClick={() => { setSelectedVehicle(vehicle); setIsExpenseModalOpen(true) }}
                    className="flex-1 px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 inline-flex items-center justify-center gap-1"
                  >
                    <DollarSign className="h-4 w-4" />
                    Dépense
                  </button>
                  <button 
                    onClick={() => openMaintenanceModal(vehicle)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 inline-flex items-center justify-center gap-1"
                  >
                    <Wrench className="h-4 w-4" />
                    Maintenance
                  </button>
                  <button 
                    onClick={() => { setClaimsForVehicle(claimsStore.load().filter(c => c.vehicle && c.vehicle.toLowerCase().includes(vehicle.registration.toLowerCase()))); setIsClaimsModalOpen(true) }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 inline-flex items-center justify-center gap-1"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Sinistres
                  </button>
                  <button
                    onClick={() => {
                      setClaimForm(prev => ({ ...prev, vehicle: vehicle.registration, driver: vehicle.assignedDriver || '' }))
                      setIsCreateClaimModalOpen(true)
                    }}
                    className="px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 inline-flex items-center justify-center gap-1"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Créer sinistre
                  </button>
                  <button 
                    onClick={() => openViewModal(vehicle)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 inline-flex items-center justify-center gap-1"
                  >
                    <Eye className="h-4 w-4" />
                    Aperçu
                  </button>
                  <button 
                    onClick={() => openEditModal(vehicle)}
                    className="px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 inline-flex items-center justify-center gap-1"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); resetForm() }} title="Nouveau Véhicule" size="xxl">
        <form onSubmit={handleCreate} className="space-y-6">
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            {/* ═══ LEFT COLUMN ═══ */}
            <div className="space-y-6">
              {/* ── Section: Informations Générales ── */}
              <div>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-blue-100">
                  <div className="p-1.5 bg-blue-50 rounded-lg"><Truck size={18} className="text-blue-700" /></div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Informations Générales</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Immatriculation (SN)"
                    name="registration"
                    value={formData.registration}
                    onChange={handleInputChange}
                    placeholder="SN-XXXX-XX"
                    required
                    icon={<Truck size={16} />}
                    error={formErrors.registration}
                  />
                  <Select
                    label="Type"
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    options={[
                      { value: 'Camion', label: 'Camion' },
                      { value: 'Citerne', label: 'Citerne' },
                      { value: 'Benne', label: 'Benne' },
                      { value: 'Fourgon', label: 'Fourgon' },
                      { value: 'Tracteur', label: 'Tracteur' },
                      { value: 'Véhicule de fonction', label: 'Véhicule de fonction' }
                    ]}
                    required
                    error={formErrors.type}
                  />
                  <Input
                    label="Marque"
                    name="brand"
                    value={formData.brand}
                    onChange={handleInputChange}
                    placeholder="Mercedes-Benz"
                    required
                  />
                  <Input
                    label="Modèle"
                    name="model"
                    value={formData.model}
                    onChange={handleInputChange}
                    placeholder="Actros 2546"
                    required
                  />
                  <Input
                    label="Capacité"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleInputChange}
                    placeholder="25000 kg"
                    required
                  />
                  <Input
                    label="Année"
                    name="year"
                    type="number"
                    value={formData.year}
                    onChange={handleInputChange}
                    required
                    icon={<Calendar size={16} />}
                  />
                  <Select
                    label="Carburant"
                    name="fuelType"
                    value={formData.fuelType}
                    onChange={handleInputChange}
                    options={[
                      { value: 'Diesel', label: 'Diesel' },
                      { value: 'Essence', label: 'Essence' },
                      { value: 'Hybride', label: 'Hybride' },
                      { value: 'Électrique', label: 'Électrique' }
                    ]}
                    required
                    icon={<Fuel size={16} />}
                  />
                  <Select
                    label="Chauffeur assigné"
                    name="assignedDriver"
                    value={(formData as any).assignedDriver}
                    onChange={handleInputChange}
                    options={[{ value: '', label: '— Aucun —' }, ...driverOptions.map(d => ({ value: d, label: d }))]}
                  />
                  <Select
                    label="Statut"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    options={[
                      { value: 'Disponible', label: 'Disponible' },
                      { value: 'En opération', label: 'En opération' },
                      { value: 'Maintenance', label: 'Maintenance' },
                      { value: 'Hors service', label: 'Hors service' }
                    ]}
                    required
                  />
                  <Input
                    label="Kilométrage"
                    name="mileage"
                    type="number"
                    value={formData.mileage}
                    onChange={handleInputChange}
                    placeholder="0"
                    required
                    icon={<Gauge size={16} />}
                  />
                </div>
              </div>

              {/* ── Section: Documents ── */}
              <div>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-blue-100">
                  <div className="p-1.5 bg-blue-50 rounded-lg"><FileText size={18} className="text-blue-700" /></div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Documents</h3>
                </div>
                <input ref={vehDocInputRef} type="file" accept="image/*,.pdf" multiple onChange={handleVehicleDocUpload} className="hidden" />
                {vehicleDocs.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {vehicleDocs.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-2.5 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Paperclip className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-800 font-medium">{doc.name}</span>
                          <span className="text-xs text-green-600">({formatFileSize(doc.size)})</span>
                        </div>
                        <button type="button" onClick={() => setVehicleDocs(prev => prev.filter(d => d.id !== doc.id))} className="text-red-500 hover:text-red-700"><X className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => vehDocInputRef.current?.click()}
                  className={`w-full p-6 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50 scale-[1.01]'
                      : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'
                  }`}
                >
                  <UploadCloud size={32} className={`mx-auto mb-2 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} />
                  <p className="text-sm font-medium text-gray-600">Glissez-déposez vos fichiers ici</p>
                  <p className="text-xs text-gray-400 mt-1">Carte grise, assurance, visite technique... (max 20 Mo/fichier)</p>
                </div>
              </div>
            </div>

            {/* ═══ RIGHT COLUMN ═══ */}
            <div className="space-y-6">
              {/* ── Section: Suivi Technique ── */}
              <div>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-blue-100">
                  <div className="p-1.5 bg-blue-50 rounded-lg"><Gauge size={18} className="text-blue-700" /></div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Suivi Technique</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Date d'achat"
                    name="purchaseDate"
                    type="date"
                    value={formData.purchaseDate}
                    onChange={handleInputChange}
                    required
                    icon={<Calendar size={16} />}
                  />
                  <Input
                    label="Mise en service"
                    name="commissionDate"
                    type="date"
                    value={formData.commissionDate}
                    onChange={handleInputChange}
                    required
                    icon={<Calendar size={16} />}
                  />
                  <div className="col-span-2 grid grid-cols-2 gap-4">
                    <Input
                      label="Dernière vidange"
                      name="lastOilChange"
                      type="date"
                      value={formData.lastOilChange}
                      onChange={handleInputChange}
                      required
                      icon={<Droplets size={16} />}
                    />
                    <div>
                      <Input
                        label="Prochaine vidange"
                        name="nextOilChange"
                        type="date"
                        value={formData.nextOilChange}
                        onChange={handleInputChange}
                        required
                        icon={<Droplets size={16} />}
                      />
                      {formData.lastOilChange && formData.nextOilChange && (
                        <p className="mt-1 text-xs text-blue-600 flex items-center gap-1">
                          <Info size={12} /> Suggestion auto : +6 mois après dernière vidange
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Section: Conformité & Documents Obligatoires ── */}
              <div>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-red-100">
                  <div className="p-1.5 bg-red-50 rounded-lg"><ShieldAlert size={18} className="text-red-700" /></div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Conformité & Documents Obligatoires</h3>
                </div>

                {/* 4 date fields in columns */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                  <Input
                    label="🛡️ Expiration Assurance"
                    name="insuranceExpiry"
                    type="date"
                    value={formData.insuranceExpiry}
                    onChange={handleInputChange}
                    required
                    icon={<Shield size={16} />}
                  />
                  <Input
                    label="🛠️ Visite Technique (fin)"
                    name="technicalControlExpiry"
                    type="date"
                    value={formData.technicalControlExpiry}
                    onChange={handleInputChange}
                    required
                    icon={<FileCheck size={16} />}
                  />
                  <Input
                    label="📄 Carte Grise (expiration)"
                    name="carteGriseExpiry"
                    type="date"
                    value={formData.carteGriseExpiry}
                    onChange={handleInputChange}
                    required
                    icon={<FileText size={16} />}
                  />
                  <Input
                    label="🏷️ Vignette / Taxe annuelle"
                    name="vignetteExpiry"
                    type="date"
                    value={formData.vignetteExpiry}
                    onChange={handleInputChange}
                    required
                    icon={<ShieldCheck size={16} />}
                  />
                </div>

                {/* Rappels automatiques */}
                {(formData.insuranceExpiry || formData.technicalControlExpiry || formData.carteGriseExpiry || formData.vignetteExpiry) && (() => {
                  const now = new Date()
                  const checkDate = (d: string) => { const exp = new Date(d); const diff = Math.ceil((exp.getTime() - now.getTime()) / 86400000); return diff }
                  return (
                    <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs font-semibold text-amber-800 flex items-center gap-1 mb-1">
                        <AlertTriangle size={13} /> Rappels automatiques — alertes J-15
                      </p>
                      <div className="grid grid-cols-2 gap-1">
                        {formData.insuranceExpiry && (() => {
                          const d = checkDate(formData.insuranceExpiry); const expired = d < 0; const warn = d >= 0 && d <= 15
                          return <p className={`text-xs ${expired ? 'text-red-700 font-bold' : warn ? 'text-orange-700 font-semibold' : 'text-amber-700'}`}>{expired ? '🔴' : warn ? '🟠' : '🛡️'} Assurance : {new Date(formData.insuranceExpiry).toLocaleDateString('fr-FR')} {expired ? '— EXPIRÉ' : warn ? `— ${d}j restants` : ''}</p>
                        })()}
                        {formData.technicalControlExpiry && (() => {
                          const d = checkDate(formData.technicalControlExpiry); const expired = d < 0; const warn = d >= 0 && d <= 15
                          return <p className={`text-xs ${expired ? 'text-red-700 font-bold' : warn ? 'text-orange-700 font-semibold' : 'text-amber-700'}`}>{expired ? '🔴' : warn ? '🟠' : '🛠️'} Visite Technique : {new Date(formData.technicalControlExpiry).toLocaleDateString('fr-FR')} {expired ? '— EXPIRÉ' : warn ? `— ${d}j restants` : ''}</p>
                        })()}
                        {formData.carteGriseExpiry && (() => {
                          const d = checkDate(formData.carteGriseExpiry); const expired = d < 0; const warn = d >= 0 && d <= 15
                          return <p className={`text-xs ${expired ? 'text-red-700 font-bold' : warn ? 'text-orange-700 font-semibold' : 'text-amber-700'}`}>{expired ? '🔴' : warn ? '🟠' : '📄'} Carte Grise : {new Date(formData.carteGriseExpiry).toLocaleDateString('fr-FR')} {expired ? '— EXPIRÉ' : warn ? `— ${d}j restants` : ''}</p>
                        })()}
                        {formData.vignetteExpiry && (() => {
                          const d = checkDate(formData.vignetteExpiry); const expired = d < 0; const warn = d >= 0 && d <= 15
                          return <p className={`text-xs ${expired ? 'text-red-700 font-bold' : warn ? 'text-orange-700 font-semibold' : 'text-amber-700'}`}>{expired ? '🔴' : warn ? '🟠' : '🏷️'} Vignette : {new Date(formData.vignetteExpiry).toLocaleDateString('fr-FR')} {expired ? '— EXPIRÉ' : warn ? `— ${d}j restants` : ''}</p>
                        })()}
                      </div>
                    </div>
                  )
                })()}

                {/* ── Archives & Documents Numérisés ── */}
                <div className="mb-5">
                  <p className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                    <UploadCloud size={14} /> Archives — Documents Numérisés (scans)
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {([
                      { cat: 'carte_grise' as const, label: 'Carte Grise', icon: '📄', dateField: formData.carteGriseExpiry },
                      { cat: 'assurance' as const, label: 'Assurance', icon: '🛡️', dateField: formData.insuranceExpiry },
                      { cat: 'visite_technique' as const, label: 'PV Visite Technique', icon: '🛠️', dateField: formData.technicalControlExpiry },
                    ]).map(({ cat, label, icon, dateField }) => {
                      const doc = complianceDocs.find(d => d.category === cat)
                      const isExpired = dateField ? new Date(dateField) < new Date() : false
                      return (
                        <div key={cat}>
                          <input
                            ref={complianceDocRefs[cat]}
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={(e) => { handleComplianceDocUpload(e.target.files, cat); e.target.value = '' }}
                            className="hidden"
                          />
                          <div
                            onDragOver={(e) => { e.preventDefault(); setDragOverCategory(cat) }}
                            onDragLeave={() => setDragOverCategory(null)}
                            onDrop={(e) => handleComplianceDrop(e, cat)}
                            onClick={() => !doc && complianceDocRefs[cat].current?.click()}
                            className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer min-h-[130px] flex flex-col items-center justify-center gap-2 ${
                              dragOverCategory === cat
                                ? 'border-blue-500 bg-blue-50'
                                : doc
                                ? isExpired ? 'border-red-400 bg-red-50' : 'border-green-300 bg-green-50'
                                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
                            }`}
                          >
                            {doc ? (
                              <>
                                <div className={`flex items-center gap-2 ${isExpired ? 'text-red-700' : 'text-green-700'}`}>
                                  {isExpired ? <AlertTriangle size={16} className="text-red-600" /> : <CheckCircle size={16} />}
                                  <span className="text-xs font-semibold">{icon} {label}</span>
                                  {isExpired && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">EXPIRÉ</span>}
                                </div>
                                <p className={`text-[10px] truncate max-w-full ${isExpired ? 'text-red-600' : 'text-green-600'}`}>{doc.name}</p>
                                <p className={`text-[10px] ${isExpired ? 'text-red-500' : 'text-green-500'}`}>{formatFileSize(doc.size)}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); window.open(doc.dataUrl, '_blank', 'noopener,noreferrer') }}
                                    className="p-1.5 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors"
                                    title="👁️ Voir le document"
                                  >
                                    <Eye size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); complianceDocRefs[cat].current?.click() }}
                                    className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                                    title="Remplacer"
                                  >
                                    <Upload size={14} />
                                  </button>
                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); setComplianceDocs(prev => prev.filter(d => d.category !== cat)) }}
                                      className="p-1.5 rounded-full bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
                                      title="🗑️ Supprimer (admin uniquement)"
                                    >
                                      <X size={14} />
                                    </button>
                                  )}
                                </div>
                              </>
                            ) : (
                              <>
                                <span className="text-2xl">{icon}</span>
                                <span className="text-xs font-medium text-gray-600">{label}</span>
                                <span className="text-[10px] text-gray-400">Glisser-déposer ou cliquer</span>
                                <span className="text-[10px] text-gray-400">PDF, PNG, JPG (max 20 Mo)</span>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* ── Attribution RH (Véhicule de Fonction) ── */}
                <div>
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-indigo-100">
                    <div className="p-1 bg-indigo-50 rounded-lg"><Truck size={15} className="text-indigo-600" /></div>
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">Attribution RH — Véhicule de Fonction</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Date fin de mise à disposition"
                      name="dateFinMiseDisposition"
                      type="date"
                      value={formData.dateFinMiseDisposition}
                      onChange={handleInputChange}
                      icon={<Calendar size={16} />}
                    />
                    <Input
                      label="Kilométrage au prêt"
                      name="kilometrageAuPret"
                      type="number"
                      value={formData.kilometrageAuPret}
                      onChange={handleInputChange}
                      placeholder="0"
                      icon={<Gauge size={16} />}
                    />
                  </div>
                  {formData.dateFinMiseDisposition && (() => {
                    const diff = Math.ceil((new Date(formData.dateFinMiseDisposition).getTime() - new Date().getTime()) / 86400000)
                    if (diff < 0) return <p className="mt-2 text-xs text-red-700 font-bold flex items-center gap-1"><AlertTriangle size={12} /> Restitution dépassée de {Math.abs(diff)} jours !</p>
                    if (diff <= 15) return <p className="mt-2 text-xs text-orange-700 font-semibold flex items-center gap-1"><AlertTriangle size={12} /> Restitution prévue dans {diff} jours</p>
                    return null
                  })()}
                </div>
              </div>

              {/* ── Notes ── */}
              <div>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-blue-100">
                  <div className="p-1.5 bg-blue-50 rounded-lg"><FileText size={18} className="text-blue-700" /></div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Notes</h3>
                </div>
                <Textarea
                  label=""
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Informations complémentaires sur le véhicule..."
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* ── Footer Buttons ── */}
          <div className="flex items-center justify-between pt-5 border-t border-gray-200">
            <p className="text-xs text-gray-400">Les champs marqués <span className="text-red-500">*</span> sont obligatoires</p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => { setIsCreateModalOpen(false); resetForm() }}>
                Annuler
              </Button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-8 py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-[0.97] text-base"
              >
                <CheckCircle size={20} />
                Créer le véhicule
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Document Preview Modal */}
      <Modal isOpen={!!previewDoc} onClose={() => setPreviewDoc(null)} title={previewDoc ? `Aperçu — ${previewDoc.category === 'carte_grise' ? 'Carte Grise' : previewDoc.category === 'assurance' ? 'Assurance' : 'Visite Technique'}` : ''} size="xl">
        {previewDoc && (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-gray-600">{previewDoc.name} — {formatFileSize(previewDoc.size)}</p>
            {previewDoc.type === 'application/pdf' ? (
              <iframe src={previewDoc.dataUrl} className="w-full h-[70vh] rounded-lg border" title="Aperçu PDF" />
            ) : (
              <img src={previewDoc.dataUrl} alt={previewDoc.name} className="max-w-full max-h-[70vh] rounded-lg border shadow-sm object-contain" />
            )}
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setSelectedVehicle(null); resetForm() }} title="Modifier le Véhicule" size="xl">
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Immatriculation (SN)"
              name="registration"
              value={formData.registration}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Marque"
              name="brand"
              value={formData.brand}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Modèle"
              name="model"
              value={formData.model}
              onChange={handleInputChange}
              required
            />
            <Select
              label="Chauffeur assigné"
              name="assignedDriver"
              value={(formData as any).assignedDriver}
              onChange={handleInputChange}
              options={[{ value: '', label: '— Aucun —' }, ...driverOptions.map(d => ({ value: d, label: d }))]}
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <Select
              label="Type"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              options={[
                { value: 'Camion', label: 'Camion' },
                { value: 'Citerne', label: 'Citerne' },
                { value: 'Benne', label: 'Benne' },
                { value: 'Fourgon', label: 'Fourgon' },
                { value: 'Tracteur', label: 'Tracteur' },
                { value: 'Véhicule de fonction', label: 'Véhicule de fonction' }
              ]}
              required
            />
            <Input
              label="Capacité"
              name="capacity"
              value={formData.capacity}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Année"
              name="year"
              type="number"
              value={formData.year}
              onChange={handleInputChange}
              required
            />
            <Select
              label="Carburant"
              name="fuelType"
              value={formData.fuelType}
              onChange={handleInputChange}
              options={[
                { value: 'Diesel', label: 'Diesel' },
                { value: 'Essence', label: 'Essence' },
                { value: 'Hybride', label: 'Hybride' },
                { value: 'Électrique', label: 'Électrique' }
              ]}
              required
            />
            <Select
              label="Chauffeur assigné"
              name="assignedDriver"
              value={(formData as any).assignedDriver}
              onChange={handleInputChange}
              options={[{ value: '', label: '— Aucun —' }, ...driverOptions.map(d => ({ value: d, label: d }))]}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Date d'achat"
              name="purchaseDate"
              type="date"
              value={formData.purchaseDate}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Mise en service"
              name="commissionDate"
              type="date"
              value={formData.commissionDate}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Kilométrage"
              name="mileage"
              type="number"
              value={formData.mileage}
              onChange={handleInputChange}
              placeholder="0"
              required
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              label="🛡️ Expiration assurance"
              name="insuranceExpiry"
              type="date"
              value={formData.insuranceExpiry}
              onChange={handleInputChange}
              required
            />
            <Input
              label="🛠️ Visite Technique (fin)"
              name="technicalControlExpiry"
              type="date"
              value={formData.technicalControlExpiry}
              onChange={handleInputChange}
              required
            />
            <Input
              label="📄 Carte Grise (expiration)"
              name="carteGriseExpiry"
              type="date"
              value={formData.carteGriseExpiry}
              onChange={handleInputChange}
              required
            />
            <Input
              label="🏷️ Vignette / Taxe"
              name="vignetteExpiry"
              type="date"
              value={formData.vignetteExpiry}
              onChange={handleInputChange}
              required
            />
          </div>

          {/* Attribution RH */}
          <div className="border-t pt-3">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Truck size={14} className="text-indigo-600" /> Attribution RH — Véhicule de Fonction
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Date fin de mise à disposition"
                name="dateFinMiseDisposition"
                type="date"
                value={formData.dateFinMiseDisposition}
                onChange={handleInputChange}
              />
              <Input
                label="Kilométrage au prêt"
                name="kilometrageAuPret"
                type="number"
                value={formData.kilometrageAuPret}
                onChange={handleInputChange}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Dernière vidange"
              name="lastOilChange"
              type="date"
              value={formData.lastOilChange}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Prochaine vidange"
              name="nextOilChange"
              type="date"
              value={formData.nextOilChange}
              onChange={handleInputChange}
              required
            />
          </div>

          <Select
            label="Statut"
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            options={[
              { value: 'Disponible', label: 'Disponible' },
              { value: 'En opération', label: 'En opération' },
              { value: 'Maintenance', label: 'Maintenance' },
              { value: 'Hors service', label: 'Hors service' }
            ]}
            required
          />

          <Textarea
            label="Notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            rows={3}
          />

          {/* Archives & Documents de conformité */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">📄 Archives — Documents de Conformité</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              {([
                { cat: 'carte_grise' as const, label: 'Carte Grise', icon: '📄', dateField: formData.carteGriseExpiry },
                { cat: 'assurance' as const, label: 'Assurance', icon: '🛡️', dateField: formData.insuranceExpiry },
                { cat: 'visite_technique' as const, label: 'PV Visite Technique', icon: '🛠️', dateField: formData.technicalControlExpiry },
              ]).map(({ cat, label, icon, dateField }) => {
                const doc = complianceDocs.find(d => d.category === cat)
                const isExpired = dateField ? new Date(dateField) < new Date() : false
                return (
                  <div key={cat}>
                    <input
                      ref={complianceDocRefs[cat]}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => { handleComplianceDocUpload(e.target.files, cat); e.target.value = '' }}
                      className="hidden"
                    />
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOverCategory(cat) }}
                      onDragLeave={() => setDragOverCategory(null)}
                      onDrop={(e) => handleComplianceDrop(e, cat)}
                      onClick={() => !doc && complianceDocRefs[cat].current?.click()}
                      className={`relative border-2 border-dashed rounded-xl p-3 text-center transition-all cursor-pointer min-h-[100px] flex flex-col items-center justify-center gap-1.5 ${
                        dragOverCategory === cat ? 'border-blue-500 bg-blue-50'
                          : doc ? isExpired ? 'border-red-400 bg-red-50' : 'border-green-300 bg-green-50'
                          : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
                      }`}
                    >
                      {doc ? (
                        <>
                          <div className={`flex items-center gap-1.5 ${isExpired ? 'text-red-700' : 'text-green-700'}`}>
                            {isExpired ? <AlertTriangle size={14} className="text-red-600" /> : <CheckCircle size={14} />}
                            <span className="text-xs font-semibold">{icon} {label}</span>
                            {isExpired && <span className="text-[9px] font-bold text-red-600 bg-red-100 px-1 py-0.5 rounded">EXPIRÉ</span>}
                          </div>
                          <p className={`text-[10px] truncate max-w-full ${isExpired ? 'text-red-600' : 'text-green-600'}`}>{doc.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <button type="button" onClick={(e) => { e.stopPropagation(); window.open(doc.dataUrl, '_blank', 'noopener,noreferrer') }} className="p-1 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700" title="👁️ Voir"><Eye size={13} /></button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); complianceDocRefs[cat].current?.click() }} className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600" title="Remplacer"><Upload size={13} /></button>
                            {isAdmin && <button type="button" onClick={(e) => { e.stopPropagation(); setComplianceDocs(prev => prev.filter(d => d.category !== cat)) }} className="p-1 rounded-full bg-red-100 hover:bg-red-200 text-red-600" title="🗑️ Supprimer"><X size={13} /></button>}
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="text-xl">{icon}</span>
                          <span className="text-xs font-medium text-gray-600">{label}</span>
                          <span className="text-[10px] text-gray-400">Glisser-déposer ou cliquer</span>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Documents généraux */}
            <h4 className="text-sm font-semibold text-gray-700 mb-3">📎 Autres documents</h4>
            <input ref={vehDocInputRef} type="file" accept="image/*,.pdf" multiple onChange={handleVehicleDocUpload} className="hidden" />
            {vehicleDocs.length > 0 && (
              <div className="space-y-2 mb-3">
                {vehicleDocs.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-800">{doc.name}</span>
                      <span className="text-xs text-green-600">({formatFileSize(doc.size)})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => window.open(doc.dataUrl, '_blank', 'noopener,noreferrer')} className="text-blue-500 hover:text-blue-700" title="👁️ Voir"><Eye className="h-4 w-4" /></button>
                      {isAdmin && <button type="button" onClick={() => setVehicleDocs(prev => prev.filter(d => d.id !== doc.id))} className="text-red-500 hover:text-red-700" title="🗑️ Supprimer"><X className="h-4 w-4" /></button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button type="button" onClick={() => vehDocInputRef.current?.click()} className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 flex items-center justify-center gap-2">
              <Upload className="h-4 w-4" />Autres documents (max 20 Mo/fichier)
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => { setIsEditModalOpen(false); setSelectedVehicle(null); resetForm() }}>
              Annuler
            </Button>
              {isAdmin && (
                <Button variant="danger" onClick={() => { if (selectedVehicle) handleDelete(selectedVehicle.id) }}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </Button>
              )}
            <Button type="submit" variant="primary">
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={isViewModalOpen} onClose={() => { setIsViewModalOpen(false); setSelectedVehicle(null) }} title="Détails du Véhicule" size="xl">
        {selectedVehicle && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedVehicle.registration}</h3>
                  <p className="text-gray-600">{selectedVehicle.brand} {selectedVehicle.model}</p>
                </div>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedVehicle.status)}`}>
                  {selectedVehicle.status}
                </span>
                {selectedVehicle.status === 'Maintenance' && (
                  <button
                    onClick={() => {
                      setVehicles(prev => prev.map(v => v.id === selectedVehicle.id ? { ...v, status: 'Disponible' as const } : v))
                      setSelectedVehicle({ ...selectedVehicle, status: 'Disponible' })
                      toast.success(`${selectedVehicle.registration} est maintenant disponible`)
                    }}
                    className="ml-2 px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Sortir de maintenance
                  </button>
                )}
                {selectedVehicle.status === 'En opération' && (
                  <button
                    onClick={() => {
                      setVehicles(prev => prev.map(v => v.id === selectedVehicle.id ? { ...v, status: 'Disponible' as const } : v))
                      setSelectedVehicle({ ...selectedVehicle, status: 'Disponible' })
                      toast.success(`${selectedVehicle.registration} — opération terminée, véhicule disponible`)
                    }}
                    className="ml-2 px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Fin d'opération
                  </button>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Type</p>
                <p className="font-medium text-gray-900">{selectedVehicle.type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Capacité</p>
                <p className="font-medium text-gray-900">{selectedVehicle.capacity}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Année</p>
                <p className="font-medium text-gray-900">{selectedVehicle.year}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Carburant</p>
                <p className="font-medium text-gray-900">{selectedVehicle.fuelType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date d'achat</p>
                <p className="font-medium text-gray-900">{new Date(selectedVehicle.purchaseDate).toLocaleDateString('fr-FR')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Mise en service</p>
                <p className="font-medium text-gray-900">{new Date(selectedVehicle.commissionDate).toLocaleDateString('fr-FR')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Kilométrage</p>
                <p className="font-medium text-gray-900">{selectedVehicle.mileage.toLocaleString()} km</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Expiration assurance</p>
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
              <div>
                <p className="text-sm text-gray-500">Contrôle technique</p>
                <p className="font-medium text-gray-900">{new Date(selectedVehicle.technicalControlExpiry).toLocaleDateString('fr-FR')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Dernière vidange</p>
                <p className="font-medium text-gray-900">{new Date(selectedVehicle.lastOilChange).toLocaleDateString('fr-FR')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Prochaine vidange</p>
                <p className="font-medium text-gray-900">{new Date(selectedVehicle.nextOilChange).toLocaleDateString('fr-FR')}</p>
              </div>
            </div>

            {selectedVehicle.notes && (
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-2">Notes</p>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedVehicle.notes}</p>
              </div>
            )}

            {/* Statut Assurance */}
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
                        onClick={() => {
                          openResolveModal(selectedVehicle, { type: 'assurance', priority: statut === 'Expiré' ? 'danger' : 'warning', message: 'Alerte assurance' })
                        }}
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
                    <span className="text-xs text-gray-500 font-medium">{formatCleanAmount(contract.montantPrime, 'FCFA')} / an</span>
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
                              <span className="font-semibold text-gray-800">{formatCleanAmount(entry.montantPrime, 'FCFA')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Carburant */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700">⛽ Consommation de Carburant</h4>
                <button
                  onClick={() => setIsFuelModalOpen(true)}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Ajouter
                </button>
              </div>
              {(() => {
                const stats = getFuelStats(selectedVehicle)
                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-emerald-50 p-3 rounded-lg text-center">
                        <p className="text-xs text-emerald-600 font-medium">Ce mois</p>
                        <p className="text-lg font-bold text-emerald-800">{stats.monthLiters} L</p>
                        <p className="text-xs text-emerald-600">{formatCleanAmount(stats.monthCost, 'FCFA')}</p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg text-center">
                        <p className="text-xs text-blue-600 font-medium">Cette année</p>
                        <p className="text-lg font-bold text-blue-800">{stats.yearLiters} L</p>
                        <p className="text-xs text-blue-600">{formatCleanAmount(stats.yearCost, 'FCFA')}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg text-center">
                        <p className="text-xs text-gray-600 font-medium">Pleins enregistrés</p>
                        <p className="text-lg font-bold text-gray-800">{stats.totalRecords}</p>
                      </div>
                    </div>
                    {selectedVehicle.fuelRecords.length > 0 && (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {selectedVehicle.fuelRecords.map((r: any) => (
                          <div key={r.id} className="p-2 border border-gray-200 rounded-lg text-sm">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Fuel className="h-4 w-4 text-emerald-600" />
                                <div>
                                  <span className="font-medium">{r.liters} L</span>
                                  <span className="text-gray-500 ml-2">à {r.costPerLiter} CFA/L</span>
                                  {r.station && <span className="text-gray-400 ml-2">• {r.station}</span>}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-gray-900">{formatCleanAmount(r.totalCost, 'FCFA')}</p>
                                <p className="text-xs text-gray-500">{new Date(r.date).toLocaleDateString('fr-FR')} • {r.mileageAtFill.toLocaleString()} km</p>
                              </div>
                            </div>
                            {r.receipt && (
                              <div className="mt-1.5 ml-7">
                                <a href={r.receipt.dataUrl} download={r.receipt.name} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded">
                                  <Paperclip className="h-3 w-3" />
                                  {r.receipt.name}
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Dépenses */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700">💰 Dépenses du Véhicule</h4>
                <button
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="text-xs font-medium text-orange-600 hover:text-orange-800 flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Ajouter
                </button>
              </div>
              {(() => {
                const stats = getExpenseStats(selectedVehicle)
                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-orange-50 p-3 rounded-lg text-center">
                        <p className="text-xs text-orange-600 font-medium">Ce mois</p>
                        <p className="text-lg font-bold text-orange-800">{formatCleanAmount(stats.monthTotal, 'FCFA')}</p>
                      </div>
                      <div className="bg-red-50 p-3 rounded-lg text-center">
                        <p className="text-xs text-red-600 font-medium">Cette année</p>
                        <p className="text-lg font-bold text-red-800">{formatCleanAmount(stats.yearTotal, 'FCFA')}</p>
                      </div>
                    </div>
                    {Object.keys(stats.byType).length > 0 && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs font-semibold text-gray-600 mb-2">Répartition par type (année)</p>
                        <div className="space-y-1">
                          {Object.entries(stats.byType).sort((a, b) => b[1] - a[1]).map(([type, amount]) => (
                            <div key={type} className="flex items-center justify-between text-sm">
                              <span className="text-gray-700">{type}</span>
                              <span className="font-medium text-gray-900">{formatCleanAmount(amount, 'FCFA')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedVehicle.expenses.length > 0 && (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {selectedVehicle.expenses.map((exp: any) => (
                          <div key={exp.id} className="p-2 border border-gray-200 rounded-lg text-sm">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <DollarSign className="h-4 w-4 text-orange-600" />
                                <div>
                                  <span className="font-medium">{exp.type}</span>
                                  <span className="text-gray-500 ml-2">• {exp.description}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-gray-900">{formatCleanAmount(exp.amount, 'FCFA')}</p>
                                <p className="text-xs text-gray-500">{new Date(exp.date).toLocaleDateString('fr-FR')}</p>
                              </div>
                            </div>
                            {exp.receipt && (
                              <div className="mt-1.5 ml-7">
                                <a href={exp.receipt.dataUrl} download={exp.receipt.name} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded">
                                  <Paperclip className="h-3 w-3" />
                                  {exp.receipt.name}
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Documents du véhicule */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">📄 Documents ({selectedVehicle.documents?.length || 0})</h4>
              {selectedVehicle.documents && selectedVehicle.documents.length > 0 ? (
                <div className="space-y-2">
                  {selectedVehicle.documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-2 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-blue-600" />
                        <a href={doc.dataUrl} download={doc.name} className="text-sm text-blue-600 hover:text-blue-800 font-medium">{doc.name}</a>
                        <span className="text-xs text-gray-500">({formatFileSize(doc.size)})</span>
                      </div>
                      <span className="text-xs text-gray-500">{new Date(doc.uploadedAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-gray-500">Aucun document joint.</p>}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => { setIsViewModalOpen(false); setSelectedVehicle(null) }}>
                Fermer
              </Button>
              <Button variant="primary" onClick={() => { setIsViewModalOpen(false); openEditModal(selectedVehicle) }}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
              {isAdmin && (
                <Button variant="danger" onClick={() => { if (selectedVehicle) handleDelete(selectedVehicle.id) }}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Maintenance History Modal */}
      <Modal isOpen={isMaintenanceModalOpen} onClose={() => { setIsMaintenanceModalOpen(false); setSelectedVehicle(null) }} title="Historique de Maintenance" size="lg">
        {selectedVehicle && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{selectedVehicle.registration}</h3>
                  <p className="text-sm text-gray-600">{selectedVehicle.brand} {selectedVehicle.model}</p>
                </div>
                {selectedVehicle.status === 'Maintenance' && (
                  <button
                    onClick={() => {
                      setVehicles(prev => prev.map(v => v.id === selectedVehicle.id ? { ...v, status: 'Disponible' as const } : v))
                      setSelectedVehicle({ ...selectedVehicle, status: 'Disponible' })
                      toast.success(`${selectedVehicle.registration} est maintenant disponible`)
                    }}
                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors inline-flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Sortir de maintenance
                  </button>
                )}
              </div>
            </div>

            {selectedVehicle.maintenanceHistory.length > 0 ? (
              <div className="space-y-3">
                {selectedVehicle.maintenanceHistory.map((record: any) => (
                  <div key={record.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-5 w-5 text-blue-600" />
                        <h4 className="font-semibold text-gray-900">{record.type}</h4>
                      </div>
                      <span className="text-sm font-medium text-gray-600">
                        {new Date(record.date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{record.description}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-blue-600">{formatCurrency(record.cost)}</span>
                      {record.nextDue && (
                        <span className="text-gray-500">
                          Prochain: {new Date(record.nextDue).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Wrench className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>Aucun historique de maintenance</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => { setIsMaintenanceModalOpen(false); setSelectedVehicle(null) }}>
                Fermer
              </Button>
              <Button variant="primary">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter intervention
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Fuel Modal */}
      <Modal isOpen={isFuelModalOpen} onClose={() => { setIsFuelModalOpen(false); setFuelForm({ date: '', liters: 0, costPerLiter: 0, totalCost: 0, mileageAtFill: 0, station: '', notes: '' }); setFuelReceipt(null) }} title="Ajouter un Plein de Carburant">
        {selectedVehicle && (
          <form onSubmit={handleAddFuel} className="space-y-4">
            <div className="bg-emerald-50 p-3 rounded-lg">
              <p className="text-sm font-semibold text-emerald-800">{selectedVehicle.registration} — {selectedVehicle.brand} {selectedVehicle.model}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Date" name="fuelDate" type="date" value={fuelForm.date} onChange={(e) => setFuelForm(prev => ({ ...prev, date: e.target.value }))} required />
              <Input label="Kilométrage au plein" name="mileageAtFill" type="number" value={fuelForm.mileageAtFill || ''} onChange={(e) => setFuelForm(prev => ({ ...prev, mileageAtFill: parseFloat(e.target.value) || 0 }))} required />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Litres" name="liters" type="number" value={fuelForm.liters || ''} onChange={(e) => {
                const liters = parseFloat(e.target.value) || 0
                setFuelForm(prev => ({ ...prev, liters, totalCost: liters * prev.costPerLiter }))
              }} required />
              <Input label="Prix/Litre (CFA)" name="costPerLiter" type="number" value={fuelForm.costPerLiter || ''} onChange={(e) => {
                const costPerLiter = parseFloat(e.target.value) || 0
                setFuelForm(prev => ({ ...prev, costPerLiter, totalCost: prev.liters * costPerLiter }))
              }} required />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total (CFA)</label>
                <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm font-bold text-emerald-700">
                  {formatCleanAmount(fuelForm.totalCost, 'FCFA')}
                </div>
              </div>
            </div>
            <Input label="Station" name="station" value={fuelForm.station} onChange={(e) => setFuelForm(prev => ({ ...prev, station: e.target.value }))} placeholder="Ex: Total Dakar" />
            <Textarea label="Notes" name="fuelNotes" value={fuelForm.notes} onChange={(e) => setFuelForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} />
            {/* Upload Reçu / Facture */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reçu / Facture (optionnel)</label>
              <input type="file" ref={fuelReceiptRef} onChange={handleFuelReceiptUpload} accept="image/*,.pdf,.doc,.docx" className="hidden" />
              {fuelReceipt ? (
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">{fuelReceipt.name}</p>
                      <p className="text-xs text-blue-600">{fuelReceipt.size < 1024 ? fuelReceipt.size + ' o' : fuelReceipt.size < 1048576 ? (fuelReceipt.size / 1024).toFixed(1) + ' Ko' : (fuelReceipt.size / 1048576).toFixed(1) + ' Mo'}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setFuelReceipt(null)} className="text-red-500 hover:text-red-700">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fuelReceiptRef.current?.click()} className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors">
                  <Upload className="h-4 w-4" />
                  Joindre un reçu ou une facture
                </button>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => { setIsFuelModalOpen(false); setFuelForm({ date: '', liters: 0, costPerLiter: 0, totalCost: 0, mileageAtFill: 0, station: '', notes: '' }); setFuelReceipt(null) }}>Annuler</Button>
              <Button type="submit" variant="primary">
                <Fuel className="h-4 w-4 mr-2" />
                Enregistrer le plein
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Add Expense Modal */}
      <Modal isOpen={isExpenseModalOpen} onClose={() => { setIsExpenseModalOpen(false); setExpenseForm({ date: '', type: 'Réparation', description: '', amount: 0, notes: '' }); setExpenseReceipt(null) }} title="Ajouter une Dépense">
        {selectedVehicle && (
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div className="bg-orange-50 p-3 rounded-lg">
              <p className="text-sm font-semibold text-orange-800">{selectedVehicle.registration} — {selectedVehicle.brand} {selectedVehicle.model}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Date" name="expenseDate" type="date" value={expenseForm.date} onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))} required />
              <Select label="Type de dépense" name="expenseType" value={expenseForm.type} onChange={(e) => setExpenseForm(prev => ({ ...prev, type: e.target.value as ExpenseRecord['type'] }))} options={EXPENSE_TYPES.map(t => ({ value: t, label: t }))} required />
            </div>
            <Input label="Description" name="expenseDesc" value={expenseForm.description} onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Détails de la dépense..." required />
            <Input label="Montant (CFA)" name="expenseAmount" type="number" value={expenseForm.amount || ''} onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))} required />
            <Textarea label="Notes" name="expenseNotes" value={expenseForm.notes} onChange={(e) => setExpenseForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} />
            {/* Upload Reçu / Facture */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reçu / Facture (optionnel)</label>
              <input type="file" ref={expenseReceiptRef} onChange={handleExpenseReceiptUpload} accept="image/*,.pdf,.doc,.docx" className="hidden" />
              {expenseReceipt ? (
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">{expenseReceipt.name}</p>
                      <p className="text-xs text-blue-600">{expenseReceipt.size < 1024 ? expenseReceipt.size + ' o' : expenseReceipt.size < 1048576 ? (expenseReceipt.size / 1024).toFixed(1) + ' Ko' : (expenseReceipt.size / 1048576).toFixed(1) + ' Mo'}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setExpenseReceipt(null)} className="text-red-500 hover:text-red-700">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => expenseReceiptRef.current?.click()} className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-orange-400 hover:text-orange-600 transition-colors">
                  <Upload className="h-4 w-4" />
                  Joindre un reçu ou une facture
                </button>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => { setIsExpenseModalOpen(false); setExpenseForm({ date: '', type: 'Réparation', description: '', amount: 0, notes: '' }); setExpenseReceipt(null) }}>Annuler</Button>
              <Button type="submit" variant="primary">
                <DollarSign className="h-4 w-4 mr-2" />
                Enregistrer la dépense
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Resolve Assurance Modal */}
      <Modal isOpen={isAssuranceResolveOpen} onClose={() => { setIsAssuranceResolveOpen(false); setResolveInsuranceContract(null) }} title="Résoudre l'alerte assurance" size="md">
        {selectedVehicle && (
          <form onSubmit={submitAssuranceResolve} className="space-y-5">
            <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100">
              <p className="text-sm font-bold text-gray-900">{selectedVehicle.registration} — {selectedVehicle.brand} {selectedVehicle.model}</p>
              <p className="text-xs text-indigo-700 mt-0.5">Mise à jour du contrat pour lever immédiatement l'alerte assurance.</p>
            </div>

            <Input
              label="Nouvelle date d'échéance"
              name="resolveInsuranceDate"
              type="date"
              value={resolveInsuranceForm.newDate}
              onChange={e => setResolveInsuranceForm(prev => ({ ...prev, newDate: e.target.value }))}
              required
              icon={<Calendar size={16} />}
            />

            <Input
              label="Numéro de police"
              name="resolveInsurancePolicy"
              value={resolveInsuranceForm.numeroPolice}
              onChange={e => setResolveInsuranceForm(prev => ({ ...prev, numeroPolice: e.target.value }))}
              placeholder="Ex: POL-2026-XXXX"
              icon={<FileText size={16} />}
            />

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Nouveau contrat (upload)</p>
              <input ref={resolveInsuranceRef} type="file" accept="image/*,.pdf" onChange={handleResolveInsuranceUpload} className="hidden" />
              {resolveInsuranceForm.contratScan ? (
                <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-emerald-700" />
                  </div>
                  <p className="text-sm font-medium text-emerald-800">Nouveau contrat prêt à être enregistré</p>
                  <button type="button" onClick={() => setResolveInsuranceForm(prev => ({ ...prev, contratScan: undefined }))} className="ml-auto p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => resolveInsuranceRef.current?.click()}
                  className="w-full p-3 border-2 border-dashed border-indigo-300 rounded-xl text-sm text-indigo-700 hover:border-indigo-500 flex items-center justify-center gap-2 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Uploader le nouveau contrat
                </button>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => { setIsAssuranceResolveOpen(false); setResolveInsuranceContract(null) }}>Annuler</Button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all"
              >
                <CheckCircle className="h-4 w-4" />
                Valider la résolution
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Resolve Alert Modal — Full Revision Form */}
      <Modal isOpen={isResolveModalOpen} onClose={() => { setIsResolveModalOpen(false); setResolveAlert(null) }} title="Fiche d'Intervention" size="xxl">
        {resolveAlert && (
          <form onSubmit={handleResolveAlert} className="space-y-6">
            {/* ── Vehicle info header ── */}
            <div className={`p-4 rounded-xl flex items-center justify-between ${resolveAlert.alert.priority === 'danger' ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${resolveAlert.alert.priority === 'danger' ? 'bg-red-600' : 'bg-orange-500'}`}>
                  {resolveAlert.alert.type === 'assurance' && <ShieldAlert className="h-5 w-5 text-white" />}
                  {resolveAlert.alert.type === 'ct' && <FileCheck className="h-5 w-5 text-white" />}
                  {resolveAlert.alert.type === 'vidange' && <Droplets className="h-5 w-5 text-white" />}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-lg">{resolveAlert.vehicle.registration}</p>
                  <p className="text-sm text-gray-600">{resolveAlert.vehicle.brand} {resolveAlert.vehicle.model} — {resolveAlert.vehicle.mileage.toLocaleString()} km</p>
                </div>
              </div>
              <p className={`text-sm font-semibold px-3 py-1.5 rounded-lg ${resolveAlert.alert.priority === 'danger' ? 'bg-red-200 text-red-800' : 'bg-orange-200 text-orange-800'}`}>
                {resolveAlert.alert.message}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              {/* ═══ LEFT COLUMN ═══ */}
              <div className="space-y-6">
                {/* ── Section: Maintenance Moteur ── */}
                {resolveAlert.alert.type === 'vidange' && (
                  <div>
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-emerald-200">
                      <div className="p-1.5 bg-emerald-100 rounded-lg"><Wrench size={18} className="text-emerald-700" /></div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Maintenance Moteur</h3>
                    </div>
                    <div className="space-y-2">
                      {revisionChecks.engine.map(item => (
                        <label key={item.key} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${revisionCheckState[item.key] ? 'bg-emerald-50 border border-emerald-300' : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'}`}>
                          <input
                            type="checkbox"
                            checked={!!revisionCheckState[item.key]}
                            onChange={() => setRevisionCheckState(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                            className="w-4.5 h-4.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                          />
                          <span className={`text-sm ${revisionCheckState[item.key] ? 'font-semibold text-emerald-800' : 'text-gray-700'}`}>{item.label}</span>
                          {revisionCheckState[item.key] && <CheckCircle size={14} className="ml-auto text-emerald-600" />}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Section: Sécurité & Freinage ── */}
                <div>
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-blue-200">
                    <div className="p-1.5 bg-blue-100 rounded-lg"><ClipboardCheck size={18} className="text-blue-700" /></div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Sécurité & Freinage</h3>
                  </div>
                  <div className="space-y-2">
                    {revisionChecks.safety.map(item => (
                      <label key={item.key} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${revisionCheckState[item.key] ? 'bg-blue-50 border border-blue-300' : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'}`}>
                        <input
                          type="checkbox"
                          checked={!!revisionCheckState[item.key]}
                          onChange={() => setRevisionCheckState(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                          className="w-4.5 h-4.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 accent-blue-600"
                        />
                        <span className={`text-sm ${revisionCheckState[item.key] ? 'font-semibold text-blue-800' : 'text-gray-700'}`}>{item.label}</span>
                        {revisionCheckState[item.key] && <CheckCircle size={14} className="ml-auto text-blue-600" />}
                      </label>
                    ))}
                  </div>
                </div>

                {/* ── Section: Niveaux & Fluides ── */}
                {resolveAlert.alert.type === 'vidange' && (
                  <div>
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-cyan-200">
                      <div className="p-1.5 bg-cyan-100 rounded-lg"><Droplets size={18} className="text-cyan-700" /></div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Niveaux & Fluides</h3>
                    </div>
                    <div className="space-y-2">
                      {revisionChecks.fluids.map(item => (
                        <label key={item.key} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${revisionCheckState[item.key] ? 'bg-cyan-50 border border-cyan-300' : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'}`}>
                          <input
                            type="checkbox"
                            checked={!!revisionCheckState[item.key]}
                            onChange={() => setRevisionCheckState(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                            className="w-4.5 h-4.5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 accent-cyan-600"
                          />
                          <span className={`text-sm ${revisionCheckState[item.key] ? 'font-semibold text-cyan-800' : 'text-gray-700'}`}>{item.label}</span>
                          {revisionCheckState[item.key] && <CheckCircle size={14} className="ml-auto text-cyan-600" />}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ═══ RIGHT COLUMN ═══ */}
              <div className="space-y-6">
                {/* ── Données de l'intervention ── */}
                <div>
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-amber-200">
                    <div className="p-1.5 bg-amber-100 rounded-lg"><Gauge size={18} className="text-amber-700" /></div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Données de l'intervention</h3>
                  </div>

                  {/* Date & Mileage */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <Input
                      label="Date de l'intervention"
                      name="resolveDate"
                      type="date"
                      value={resolveForm.newDate}
                      onChange={(e) => setResolveForm(prev => ({ ...prev, newDate: e.target.value }))}
                      required
                      icon={<Calendar size={16} />}
                    />
                    <Input
                      label="Kilométrage actuel"
                      name="resolveMileage"
                      type="number"
                      value={resolveForm.newMileage || ''}
                      onChange={(e) => setResolveForm(prev => ({ ...prev, newMileage: parseInt(e.target.value) || 0 }))}
                      required
                      icon={<Gauge size={16} />}
                    />
                  </div>

                  {/* Alert-specific: assurance date */}
                  {resolveAlert.alert.type === 'assurance' && (
                    <div className="mb-4 p-3 bg-violet-50 border border-violet-200 rounded-lg">
                      <p className="text-xs text-violet-600 font-semibold mb-2">Expiration actuelle : {resolveAlert.vehicle.insuranceExpiry ? new Date(resolveAlert.vehicle.insuranceExpiry).toLocaleDateString('fr-FR') : '—'}</p>
                      <p className="text-xs text-gray-500 mb-1">La date ci-dessus sera la nouvelle date d'expiration de l'assurance.</p>
                    </div>
                  )}
                  {resolveAlert.alert.type === 'ct' && (
                    <div className="mb-4 p-3 bg-violet-50 border border-violet-200 rounded-lg">
                      <p className="text-xs text-violet-600 font-semibold mb-2">Expiration actuelle CT : {resolveAlert.vehicle.technicalControlExpiry ? new Date(resolveAlert.vehicle.technicalControlExpiry).toLocaleDateString('fr-FR') : '—'}</p>
                      <p className="text-xs text-gray-500 mb-1">La date ci-dessus sera la nouvelle date d'expiration du contrôle technique.</p>
                    </div>
                  )}

                  {/* Technical measurements */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Épaisseur plaquettes (mm)</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><ClipboardCheck size={16} /></div>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="20"
                          value={revisionTechnical.brakePadThickness}
                          onChange={(e) => setRevisionTechnical(prev => ({ ...prev, brakePadThickness: e.target.value }))}
                          placeholder="ex: 4.5"
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50/50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 hover:border-gray-400 transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pression pneus (bar)</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Gauge size={16} /></div>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="15"
                          value={revisionTechnical.tirePressure}
                          onChange={(e) => setRevisionTechnical(prev => ({ ...prev, tirePressure: e.target.value }))}
                          placeholder="ex: 8.5"
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50/50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 hover:border-gray-400 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Cost */}
                  <div className="mb-4">
                    <Input
                      label="Coût de l'intervention (CFA)"
                      name="revisionCost"
                      type="number"
                      value={revisionTechnical.cost || ''}
                      onChange={(e) => setRevisionTechnical(prev => ({ ...prev, cost: e.target.value }))}
                      placeholder="0"
                      icon={<DollarSign size={16} />}
                    />
                  </div>
                </div>

                {/* ── Pièces remplacées ── */}
                <div>
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-orange-200">
                    <div className="p-1.5 bg-orange-100 rounded-lg"><Wrench size={18} className="text-orange-700" /></div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Pièces remplacées</h3>
                  </div>
                  <Textarea
                    label=""
                    name="replacedParts"
                    value={revisionTechnical.replacedParts}
                    onChange={(e) => setRevisionTechnical(prev => ({ ...prev, replacedParts: e.target.value }))}
                    placeholder="Ex: Filtre à huile Ref.HF-204, 2x plaquettes ATE 13.0460-7247.2, courroie accessoire Gates 6PK2080..."
                    rows={3}
                  />
                </div>

                {/* ── Upload Photo / Preuve ── */}
                <div>
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-rose-200">
                    <div className="p-1.5 bg-rose-100 rounded-lg"><Camera size={18} className="text-rose-700" /></div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Photos & Preuves</h3>
                  </div>
                  <input ref={revisionPhotoRef} type="file" accept="image/*,.pdf" multiple capture="environment" onChange={handleRevisionPhotoUpload} className="hidden" />
                  {revisionPhotos.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {revisionPhotos.map((p, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            {p.type.startsWith('image/') ? (
                              <img src={p.dataUrl} alt={p.name} className="h-10 w-10 rounded-lg object-cover border border-rose-300" />
                            ) : (
                              <Paperclip className="h-4 w-4 text-rose-600" />
                            )}
                            <div>
                              <p className="text-sm text-rose-800 font-medium truncate max-w-[180px]">{p.name}</p>
                              <p className="text-xs text-rose-500">{p.size < 1048576 ? (p.size / 1024).toFixed(0) + ' Ko' : (p.size / 1048576).toFixed(1) + ' Mo'}</p>
                            </div>
                          </div>
                          <button type="button" onClick={() => setRevisionPhotos(prev => prev.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700"><X size={16} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => revisionPhotoRef.current?.click()}
                    className="w-full p-4 border-2 border-dashed border-rose-300 rounded-xl text-center cursor-pointer hover:border-rose-400 hover:bg-rose-50/50 transition-all"
                  >
                    <Camera size={28} className="mx-auto mb-1.5 text-rose-400" />
                    <p className="text-sm font-medium text-rose-600">Prendre une photo ou importer un fichier</p>
                    <p className="text-xs text-gray-400 mt-0.5">Pièce usée, bon de sortie, preuve d'achat... (max 20 Mo)</p>
                  </button>
                </div>

                {/* ── Checklist progress ── */}
                {(() => {
                  const totalChecks = (resolveAlert.alert.type === 'vidange'
                    ? [...revisionChecks.engine, ...revisionChecks.safety, ...revisionChecks.fluids]
                    : [...revisionChecks.safety]).length
                  const checked = Object.values(revisionCheckState).filter(Boolean).length
                  const pct = totalChecks > 0 ? Math.round((checked / totalChecks) * 100) : 0
                  return (
                    <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-600">Progression de la checklist</span>
                        <span className={`text-xs font-bold ${pct === 100 ? 'text-green-700' : 'text-gray-600'}`}>{checked}/{totalChecks} — {pct}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : 'bg-orange-400'}`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* ── Footer Buttons ── */}
            <div className="flex items-center justify-between pt-5 border-t-2 border-gray-200">
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Info size={12} />
                L'intervention sera archivée dans l'historique de maintenance. Prochaine révision programmée à +10 000 km.
              </p>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => { setIsResolveModalOpen(false); setResolveAlert(null) }}>Annuler</Button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 active:scale-[0.97] text-base"
                >
                  <CheckCircle size={20} />
                  Valider l'Intervention
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
