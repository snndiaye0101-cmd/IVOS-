import {
  Plus, Search, Truck, Users, Calendar, Edit, Eye, Trash2, AlertTriangle,
  Car, Shield, Camera, X, FileText, MapPin, DollarSign,
  CheckCircle, Upload, ShieldCheck, ShieldAlert, ShieldOff, ArrowUpRight,
} from 'lucide-react'
import { formatCleanAmount } from '@/shared/utils/formatAmount';
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../../../shared/contexts/AuthContext'
import { useLocation } from 'react-router-dom'
import { vehiclesStore } from '../services/vehiclesStore'
import { personalVehiclesStore } from '../services/personalVehiclesStore'
import { personnelStore, type PersonnelAgent } from '../services/personnelStore'
import {
  assuranceStore,
  computeStatut,
  type InsuranceContract,
  type AssuranceType,
  type AssuranceStatut,
  ASSURANCE_CHANGE_EVENT,
} from '../services/assuranceStore'
import {
  saveExpenses,
  loadExpenses,
  type Expense,
} from '../../finances/services/globalExpensesService'
import { toast } from 'sonner'
import { useClaims } from '../hooks/useClaims'
import Modal from '../../../components/ui/Modal'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Button from '../../../components/ui/Button'
import Textarea from '../../../components/ui/Textarea'
import type { Claim } from '../types/claims.types'
import FeatureStatCard from '../components/FeatureStatCard'
import FleetModuleTabs from '../components/FleetModuleTabs'

const SINISTRE_NATURES = ['Collision', 'Vol', 'Incendie', 'Bris de glace', 'Vandalisme', 'Autre'] as const
const SINISTRE_SEVERITIES = ['Mineur', 'Majeur', 'Critique'] as const

const ASSURANCE_TYPES: AssuranceType[] = [
  'RC (Responsabilité Civile)',
  'Tous Risques',
  'Tiers Étendu',
  'Incendie / Vol',
  'Flotte',
  'Autre',
]

type VehicleLite = {
  registration: string
  brand: string
  model: string
}

type RouteState = {
  defaultTab?: 'assurances'
  prefill?: { vehicle?: string; driver?: string }
  focusContractId?: string
}

type SinistreFormState = {
  reportNumber: string
  date: string
  vehicle: string
  driver: string | null
  type: Claim['type']
  severity: Claim['severity']
  location: string
  insurer: string
  status: Claim['status']
  costEstimate: number
  description: string
  thirdPartyInsurer: string
  thirdPartyContactName: string
  thirdPartyContactPhone: string
  thirdPartyContactEmail: string
  insuranceDossierNumber: string
}

type ExpenseWithAssuranceLink = Expense & { assuranceContractId?: string }

function formatCurrency(val: number) { return formatCleanAmount(val, 'FCFA') }

function getStatusColor(status: string) {
  switch (status) {
    case 'Ouvert': return 'bg-red-100 text-red-800'
    case 'En cours': return 'bg-amber-100 text-amber-800'
    case 'Clôturé': return 'bg-green-100 text-green-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case 'Mineur': return 'bg-yellow-100 text-yellow-800'
    case 'Majeur': return 'bg-orange-100 text-orange-800'
    case 'Critique': return 'bg-gray-900 text-white'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function getNatureIcon(type: string) {
  switch (type) {
    case 'Collision': return '💥'
    case 'Vol': return '🔑'
    case 'Incendie': return '🔥'
    case 'Bris de glace': return '🪟'
    case 'Vandalisme': return '🚨'
    default: return '⚠️'
  }
}

function getStatutBadge(statut: AssuranceStatut) {
  switch (statut) {
    case 'À jour':
      return { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200', icon: ShieldCheck }
    case 'À renouveler bientôt':
      return { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', icon: ShieldAlert }
    case 'Expiré':
      return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', icon: ShieldOff }
  }
}

function daysUntilExpiry(dateEcheance: string): number {
  const today = new Date(); today.setHours(0,0,0,0)
  const echeance = new Date(dateEcheance); echeance.setHours(0,0,0,0)
  return Math.ceil((echeance.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function sendContractToExpenses(contract: InsuranceContract): boolean {
  try {
    const all = loadExpenses() as ExpenseWithAssuranceLink[]
    if (all.find((e) => e.assuranceContractId === contract.id)) return false
    const newExp: ExpenseWithAssuranceLink = {
      id: Date.now(),
      label: `Prime Assurance - ${contract.vehicule} (${contract.compagnie})`,
      category: 'Assurance',
      amount: contract.montantPrime,
      date: contract.dateDebut,
      affectationType: 'vehicle',
      affectationId: contract.vehicule,
      affectationName: contract.vehicule,
      createdAt: new Date().toISOString(),
      isAutoSync: false,
      assuranceContractId: contract.id,
    }
    saveExpenses([...all, newExp])
    return true
  } catch { return false }
}

export default function SinistresPage() {
  const { isAdmin } = useAuth()
  const location = useLocation()

  type ModuleTab = 'sinistres' | 'assurances'
  const [moduleTab, setModuleTab] = useState<ModuleTab>('sinistres')

  const [fleetVehicles, setFleetVehicles] = useState<VehicleLite[]>([])
  const [personalVehicles, setPersonalVehicles] = useState<VehicleLite[]>([])
  const [chauffeurs, setChauffeurs] = useState<PersonnelAgent[]>([])

  const loadConnectedData = useCallback(() => {
    setFleetVehicles(vehiclesStore.load())
    setPersonalVehicles(personalVehiclesStore.load())
    setChauffeurs(personnelStore.load().filter((a: PersonnelAgent) => a.role === 'Chauffeurs'))
  }, [])

  useEffect(() => {
    loadConnectedData()
    const h1 = () => setFleetVehicles(vehiclesStore.load())
    const h2 = () => setPersonalVehicles(personalVehiclesStore.load())
    const h3 = () => setChauffeurs(personnelStore.load().filter((a: PersonnelAgent) => a.role === 'Chauffeurs'))
    window.addEventListener('fleetVehicles:updated', h1)
    window.addEventListener('personalVehicles:updated', h2)
    window.addEventListener('personnel:updated', h3)
    return () => {
      window.removeEventListener('fleetVehicles:updated', h1)
      window.removeEventListener('personalVehicles:updated', h2)
      window.removeEventListener('personnel:updated', h3)
    }
  }, [loadConnectedData])

  // SINISTRES
  const [searchTerm, setSearchTerm] = useState('')
  const [activeClaimsTab, setActiveClaimsTab] = useState<'all' | 'parc' | 'personnel'>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [selected, setSelected] = useState<Claim | null>(null)

  const { parcClaims, personnelClaims, allClaims, createClaim: createClaimAction, updateClaim, deleteClaim: deleteClaimAction, generateReportNumber } = useClaims();

  const displayedClaims = (activeClaimsTab === 'parc' ? parcClaims : activeClaimsTab === 'personnel' ? personnelClaims : allClaims)
    .filter((c: Claim) =>
      c.reportNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.driver.toLowerCase().includes(searchTerm.toLowerCase())
    )

  const [formSource, setFormSource] = useState<'parc' | 'personnel'>('parc')
  const [form, setForm] = useState<SinistreFormState>({
    reportNumber: '', date: new Date().toISOString().split('T')[0], vehicle: '', driver: '' as string | null,
    type: 'Collision' as Claim['type'], severity: 'Mineur' as Claim['severity'],
    location: '', insurer: '', status: 'Ouvert' as Claim['status'], costEstimate: 0,
    description: '', thirdPartyInsurer: '', thirdPartyContactName: '',
    thirdPartyContactPhone: '', thirdPartyContactEmail: '', insuranceDossierNumber: '',
  })

  useEffect(() => {
    try {
      const state = (location.state as RouteState | null) || null
      if (state?.defaultTab === 'assurances') {
        setModuleTab('assurances')
        try { window.history.replaceState({}, '') } catch {}
      }
      if (state?.prefill) {
        const p = state.prefill
        setForm(prev => ({ ...prev, vehicle: p.vehicle || '', driver: p.driver || '' }))
        setIsCreateOpen(true)
        try { window.history.replaceState({}, '') } catch {}
      }
    } catch {}
  }, [location])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: name === 'costEstimate' ? parseFloat(value) || 0 : value }))
  }

  const resetForm = () => {
    setForm({
      reportNumber: '', date: new Date().toISOString().split('T')[0], vehicle: '', driver: '' as string | null,
      type: 'Collision', severity: 'Mineur', location: '', insurer: '',
      status: 'Ouvert', costEstimate: 0, description: '', thirdPartyInsurer: '',
      thirdPartyContactName: '', thirdPartyContactPhone: '', thirdPartyContactEmail: '',
      insuranceDossierNumber: '',
    })
    setFormSource('parc')
    setAccidentPhotos([])
    setConstatScan(null)
  }

  const [accidentPhotos, setAccidentPhotos] = useState<string[]>([])
  const [constatScan, setConstatScan] = useState<string | null>(null)
  const accidentPhotoRef = useRef<HTMLInputElement>(null)
  const constatRef = useRef<HTMLInputElement>(null)

  const handleAccidentPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) { toast.error('Fichier non supporté: ' + file.name); return }
      if (file.size > 20 * 1024 * 1024) { toast.error('Image trop volumineuse'); return }
      const reader = new FileReader()
      reader.onload = () => setAccidentPhotos(prev => [...prev, reader.result as string])
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const handleConstatUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) { toast.error('Fichier trop volumineux'); return }
    const reader = new FileReader()
    reader.onload = () => setConstatScan(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const createClaim = (e: React.FormEvent) => {
    e.preventDefault()
    const newClaimData = {
      ...form,
      reportNumber: form.reportNumber || generateReportNumber(),
      source: formSource,
      accidentPhotos: accidentPhotos.length > 0 ? accidentPhotos : undefined,
      constatScan: constatScan || undefined,
    };
    createClaimAction(newClaimData as Omit<Claim, 'id'>);
    setIsCreateOpen(false)
    resetForm()
  }

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    const updatedClaim = {
      ...selected,
      ...form,
      driver: form.driver ?? '',
      source: formSource,
      accidentPhotos: accidentPhotos.length > 0 ? accidentPhotos : undefined,
      constatScan: constatScan || undefined,
    };
    updateClaim(selected.id, updatedClaim);
    setIsEditOpen(false)
    setSelected(null)
    resetForm()
  }

  const openEdit = (c: Claim) => {
    setSelected(c)
    setFormSource(c.source || 'parc')
    setForm({
      reportNumber: c.reportNumber, date: c.date, vehicle: c.vehicle, driver: c.driver,
      type: c.type, severity: c.severity, location: c.location || '', insurer: c.insurer || '',
      status: c.status, costEstimate: c.costEstimate || 0, description: c.description || '',
      thirdPartyInsurer: c.thirdPartyInsurer || '', thirdPartyContactName: c.thirdPartyContactName || '',
      thirdPartyContactPhone: c.thirdPartyContactPhone || '', thirdPartyContactEmail: c.thirdPartyContactEmail || '',
      insuranceDossierNumber: c.insuranceDossierNumber || '',
    })
    setAccidentPhotos(c.accidentPhotos || [])
    setConstatScan(c.constatScan || null)
    setIsEditOpen(true)
  }

  const openView = (c: Claim) => { setSelected(c); setIsViewOpen(true) }

  const deleteClaim = (id: string) => {
    if (confirm('Supprimer ce sinistre ?')) {
      const claim = allClaims.find((c: Claim) => c.id === id);
      if (claim?.source === 'parc') deleteClaimAction(id);
      setSelected(null)
      setIsViewOpen(false)
      setIsEditOpen(false)
    }
  }

  const parcCount = parcClaims.length
  const personnelCount = personnelClaims.length
  const openCount = allClaims.filter((c: Claim) => c.status === 'Ouvert').length
  const totalCost = allClaims.reduce((sum: number, c: Claim) => sum + (c.costEstimate || 0), 0)

  const vehicleOptions = formSource === 'parc'
    ? fleetVehicles.map((v) => ({ value: v.registration, label: `${v.registration} — ${v.brand} ${v.model}` }))
    : personalVehicles.map((v) => ({ value: v.registration, label: `${v.registration} — ${v.brand} ${v.model}` }))

  const renderSinistreFormFields = () => (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Type de véhicule</label>
        <div className="flex gap-3">
          <button type="button" onClick={() => { setFormSource('parc'); setForm(p => ({ ...p, vehicle: '' })) }}
            className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all inline-flex items-center justify-center gap-2 ${formSource === 'parc' ? 'bg-blue-50 border-blue-500 text-blue-800' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
            <Truck className="h-5 w-5" /> Véhicule Parc
          </button>
          <button type="button" onClick={() => { setFormSource('personnel'); setForm(p => ({ ...p, vehicle: '' })) }}
            className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all inline-flex items-center justify-center gap-2 ${formSource === 'personnel' ? 'bg-purple-50 border-purple-500 text-purple-800' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
            <Car className="h-5 w-5" /> Véhicule Personnel
          </button>
        </div>
      </div>
      <div className={`rounded-xl p-4 space-y-3 ${formSource === 'parc' ? 'bg-blue-50' : 'bg-purple-50'}`}>
        <p className="text-sm font-semibold text-gray-800">🚗 Véhicule & Conducteur</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Véhicule</label>
            <select value={form.vehicle} onChange={e => setForm(p => ({ ...p, vehicle: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
              <option value="">— Sélectionner —</option>
              {vehicleOptions.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Conducteur</label>
            <select value={form.driver ?? ''} onChange={e => setForm(p => ({ ...p, driver: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
              <option value="">— Sélectionner —</option>
              {chauffeurs.map(c => <option key={c.id} value={`${c.firstName} ${c.lastName}`}>{c.firstName} {c.lastName}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="bg-red-50 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-red-800">⚠️ Détails de l'incident</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nature du sinistre</label>
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as Claim['type'] }))}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent" required>
              {SINISTRE_NATURES.map(n => <option key={n} value={n}>{getNatureIcon(n)} {n}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Gravité</label>
            <div className="flex gap-2">
              {SINISTRE_SEVERITIES.map(s => (
                <button key={s} type="button" onClick={() => setForm(p => ({ ...p, severity: s }))}
                  className={`flex-1 px-2 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${form.severity === s ? s === 'Mineur' ? 'bg-yellow-100 border-yellow-400 text-yellow-800' : s === 'Majeur' ? 'bg-orange-100 border-orange-400 text-orange-800' : 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  {s === 'Critique' ? '⚫' : s === 'Majeur' ? '🟠' : '🟡'} {s}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Lieu de l'incident" name="location" value={form.location} onChange={handleChange} placeholder="Ex: Dakar" />
          <Input label="Date" name="date" type="date" value={form.date} onChange={handleChange} required />
        </div>
        <Input label="Montant estimé (FCFA)" name="costEstimate" type="number" value={form.costEstimate} onChange={handleChange} placeholder="0" />
      </div>
      <Textarea label="Description" name="description" value={form.description} onChange={handleChange} placeholder="Circonstances de l'incident..." />
      <div className="bg-indigo-50 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-indigo-800">🛡️ Assurance</p>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Notre assureur" name="insurer" value={form.insurer} onChange={handleChange} placeholder="Compagnie d'assurance" />
          <Input label="N° dossier assurance" name="insuranceDossierNumber" value={form.insuranceDossierNumber} onChange={handleChange} placeholder="DOS-2026-XXXX" />
        </div>
        <Select label="Statut" name="status" value={form.status} onChange={handleChange}
          options={[{ value: 'Ouvert', label: '🔴 Ouvert' }, { value: 'En cours', label: '🟡 En cours' }, { value: 'Clôturé', label: '🟢 Clôturé' }]} />
      </div>
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-800">👤 Partie adverse</p>
        <Input label="Assureur adverse" name="thirdPartyInsurer" value={form.thirdPartyInsurer} onChange={handleChange} placeholder="Compagnie adverse" />
        <div className="grid grid-cols-3 gap-3">
          <Input label="Nom" name="thirdPartyContactName" value={form.thirdPartyContactName} onChange={handleChange} placeholder="Nom complet" />
          <Input label="Téléphone" name="thirdPartyContactPhone" value={form.thirdPartyContactPhone} onChange={handleChange} placeholder="+221 XX XXX XX XX" />
          <Input label="Email" name="thirdPartyContactEmail" value={form.thirdPartyContactEmail} onChange={handleChange} placeholder="email@exemple.sn" />
        </div>
      </div>
      <div className="bg-amber-50 rounded-xl p-4 space-y-4">
        <p className="text-sm font-semibold text-amber-800">📷 Preuves & Documents</p>
        <input ref={accidentPhotoRef} type="file" accept="image/*" multiple onChange={handleAccidentPhotoUpload} className="hidden" />
        <input ref={constatRef} type="file" accept="image/*,.pdf" onChange={handleConstatUpload} className="hidden" />
        <div>
          <p className="text-xs font-medium text-gray-600 mb-2">Photos de l'accident</p>
          {accidentPhotos.length > 0 && (
            <div className="grid grid-cols-4 gap-3 mb-3">
              {accidentPhotos.map((photo, i) => (
                <div key={i} className="relative group rounded-lg overflow-hidden shadow-sm">
                  <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-24 object-cover" />
                  <button type="button" onClick={() => setAccidentPhotos(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button type="button" onClick={() => accidentPhotoRef.current?.click()}
            className="w-full p-3 border-2 border-dashed border-amber-300 rounded-xl text-sm text-amber-600 hover:border-amber-500 flex items-center justify-center gap-2 transition-colors">
            <Camera className="h-4 w-4" /> Ajouter des photos
          </button>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-600 mb-2">Scan du constat amiable</p>
          {constatScan ? (
            <div className="relative group rounded-lg overflow-hidden shadow-sm inline-block">
              {constatScan.startsWith('data:image') ? (
                <img src={constatScan} alt="Constat" className="h-32 object-cover rounded-lg" />
              ) : (
                <div className="h-32 w-40 bg-white rounded-lg flex items-center justify-center gap-2">
                  <FileText className="h-10 w-10 text-gray-400" />
                  <span className="text-xs text-gray-500">PDF</span>
                </div>
              )}
              <button type="button" onClick={() => setConstatScan(null)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => constatRef.current?.click()}
              className="w-full p-3 border-2 border-dashed border-amber-300 rounded-xl text-sm text-amber-600 hover:border-amber-500 flex items-center justify-center gap-2 transition-colors">
              <FileText className="h-4 w-4" /> Scanner / Uploader le constat
            </button>
          )}
        </div>
      </div>
      <Input label="N° de rapport" name="reportNumber" value={form.reportNumber} onChange={handleChange} placeholder={`Auto: ${generateReportNumber()}`} />
    </>
  )

  // ASSURANCES
  const [contracts, setContracts] = useState<InsuranceContract[]>(() => assuranceStore.load())
  const [searchAssurance, setSearchAssurance] = useState('')
  const [filterStatut, setFilterStatut] = useState<AssuranceStatut | ''>('')
  const [isAssuranceCreateOpen, setIsAssuranceCreateOpen] = useState(false)
  const [isAssuranceEditOpen, setIsAssuranceEditOpen] = useState(false)
  const [selectedContract, setSelectedContract] = useState<InsuranceContract | null>(null)
  const [focusedContractId, setFocusedContractId] = useState<string | null>(null)
  const [isResolveOpen, setIsResolveOpen] = useState(false)
  const [resolveContract, setResolveContract] = useState<InsuranceContract | null>(null)
  const [resolveForm, setResolveForm] = useState({ dateEcheance: '', numeroPolice: '', contratScan: undefined as string | undefined })

  const [assForm, setAssForm] = useState<{
    vehicule: string; compagnie: string; numeroPolice: string;
    dateDebut: string; dateEcheance: string; montantPrime: string;
    typeAssurance: AssuranceType; notes: string;
  }>({
    vehicule: '', compagnie: '', numeroPolice: '',
    dateDebut: new Date().toISOString().slice(0, 10),
    dateEcheance: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10),
    montantPrime: '', typeAssurance: 'RC (Responsabilité Civile)', notes: '',
  })
  const [assContratScan, setAssContratScan] = useState<string | undefined>(undefined)
  const [assQuittanceScan, setAssQuittanceScan] = useState<string | undefined>(undefined)
  const assContratRef = useRef<HTMLInputElement>(null)
  const assQuittanceRef = useRef<HTMLInputElement>(null)
  const resolveContratRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const h = () => setContracts(assuranceStore.load())
    window.addEventListener(ASSURANCE_CHANGE_EVENT, h)
    return () => window.removeEventListener(ASSURANCE_CHANGE_EVENT, h)
  }, [])

  useEffect(() => {
    try {
      const state = (location.state as RouteState | null) || null
      if (state?.focusContractId) {
        const contract = assuranceStore.load().find(c => c.id === state.focusContractId)
        setModuleTab('assurances')
        setFocusedContractId(state.focusContractId)
        if (contract) {
          setSearchAssurance(contract.vehicule)
          openContractEdit(contract)
        }
        try { window.history.replaceState({}, '') } catch {}
      }
    } catch {}
  }, [location])

  const allVehicleOptions = useMemo(() => [
    ...fleetVehicles.map((v) => ({ value: v.registration, label: `${v.registration} — ${v.brand} ${v.model} (Parc)` })),
    ...personalVehicles.map((v) => ({ value: v.registration, label: `${v.registration} — ${v.brand} ${v.model} (Fonction)` })),
  ], [fleetVehicles, personalVehicles])

  const filteredContracts = useMemo(() => {
    let list = contracts
    if (searchAssurance.trim()) {
      const q = searchAssurance.toLowerCase()
      list = list.filter(c => c.vehicule.toLowerCase().includes(q) || c.compagnie.toLowerCase().includes(q) || c.numeroPolice.toLowerCase().includes(q))
    }
    if (filterStatut) list = list.filter(c => computeStatut(c.dateEcheance) === filterStatut)
    return list.sort((a, b) => new Date(a.dateEcheance).getTime() - new Date(b.dateEcheance).getTime())
  }, [contracts, searchAssurance, filterStatut])

  const assuranceStats = useMemo(() => {
    const total = contracts.length
    const expires = contracts.filter(c => computeStatut(c.dateEcheance) === 'Expiré').length
    const soon = contracts.filter(c => computeStatut(c.dateEcheance) === 'À renouveler bientôt').length
    const ok = contracts.filter(c => computeStatut(c.dateEcheance) === 'À jour').length
    const totalPrimes = contracts.reduce((s, c) => s + c.montantPrime, 0)
    return { total, expires, soon, ok, totalPrimes }
  }, [contracts])

  const actionableContracts = useMemo(() => {
    return contracts
      .filter(c => computeStatut(c.dateEcheance) !== 'À jour')
      .sort((a, b) => new Date(a.dateEcheance).getTime() - new Date(b.dateEcheance).getTime())
  }, [contracts])

  const resetAssForm = () => {
    setAssForm({
      vehicule: '', compagnie: '', numeroPolice: '',
      dateDebut: new Date().toISOString().slice(0, 10),
      dateEcheance: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10),
      montantPrime: '', typeAssurance: 'RC (Responsabilité Civile)', notes: '',
    })
    setAssContratScan(undefined)
    setAssQuittanceScan(undefined)
  }

  const handleAssFileUpload = (ref: 'contrat' | 'quittance', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) { toast.error('Fichier trop volumineux (max 20 Mo)'); return }
    const reader = new FileReader()
    reader.onload = () => {
      if (ref === 'contrat') setAssContratScan(reader.result as string)
      else setAssQuittanceScan(reader.result as string)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleResolveFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) { toast.error('Fichier trop volumineux (max 20 Mo)'); return }
    const reader = new FileReader()
    reader.onload = () => setResolveForm(prev => ({ ...prev, contratScan: reader.result as string }))
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const openResolveModal = (contract: InsuranceContract) => {
    setResolveContract(contract)
    setResolveForm({
      dateEcheance: contract.dateEcheance,
      numeroPolice: contract.numeroPolice,
      contratScan: undefined,
    })
    setIsResolveOpen(true)
  }

  const submitResolve = (e: React.FormEvent) => {
    e.preventDefault()
    if (!resolveContract) return

    assuranceStore.update(resolveContract.id, {
      dateEcheance: resolveForm.dateEcheance,
      numeroPolice: resolveForm.numeroPolice.trim() || resolveContract.numeroPolice,
      contratScan: resolveForm.contratScan ?? resolveContract.contratScan,
    })

    setContracts(assuranceStore.load())
    setIsResolveOpen(false)
    setResolveContract(null)
    setResolveForm({ dateEcheance: '', numeroPolice: '', contratScan: undefined })
    toast.success('Assurance mise à jour, alerte résolue avec succès !')
  }

  const createContract = (e: React.FormEvent) => {
    e.preventDefault()
    const newContract: InsuranceContract = {
      id: `ass-${Date.now()}`,
      vehicule: assForm.vehicule, compagnie: assForm.compagnie, numeroPolice: assForm.numeroPolice,
      dateDebut: assForm.dateDebut, dateEcheance: assForm.dateEcheance,
      montantPrime: parseFloat(assForm.montantPrime.replace(/\s/g, '')) || 0,
      typeAssurance: assForm.typeAssurance,
      notes: assForm.notes || undefined,
      contratScan: assContratScan, quittanceScan: assQuittanceScan,
      createdAt: new Date().toISOString(),
    }
    assuranceStore.add(newContract)
    setContracts(assuranceStore.load())
    setIsAssuranceCreateOpen(false)
    resetAssForm()
    toast.success("Contrat d'assurance enregistré")
  }

  const saveContractEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedContract) return
    assuranceStore.update(selectedContract.id, {
      vehicule: assForm.vehicule, compagnie: assForm.compagnie, numeroPolice: assForm.numeroPolice,
      dateDebut: assForm.dateDebut, dateEcheance: assForm.dateEcheance,
      montantPrime: parseFloat(assForm.montantPrime.replace(/\s/g, '')) || 0,
      typeAssurance: assForm.typeAssurance,
      notes: assForm.notes || undefined,
      contratScan: assContratScan, quittanceScan: assQuittanceScan,
    })
    setContracts(assuranceStore.load())
    setIsAssuranceEditOpen(false)
    setSelectedContract(null)
    resetAssForm()
    toast.success('Contrat modifié')
  }

  const openContractEdit = (c: InsuranceContract) => {
    setSelectedContract(c)
    setAssForm({
      vehicule: c.vehicule, compagnie: c.compagnie, numeroPolice: c.numeroPolice,
      dateDebut: c.dateDebut, dateEcheance: c.dateEcheance,
      montantPrime: c.montantPrime.toLocaleString('fr-FR'),
      typeAssurance: c.typeAssurance, notes: c.notes || '',
    })
    setAssContratScan(c.contratScan)
    setAssQuittanceScan(c.quittanceScan)
    setIsAssuranceEditOpen(true)
  }

  const deleteContract = (id: string) => {
    if (confirm("Supprimer ce contrat d'assurance ?")) {
      assuranceStore.remove(id)
      setContracts(assuranceStore.load())
      toast.success('Contrat supprimé')
    }
  }

  const handleSendToExpenses = (c: InsuranceContract) => {
    const success = sendContractToExpenses(c)
    if (success) toast.success('Prime envoyée dans Dépenses Globales (catégorie Assurance)')
    else toast.info('Cette prime a déjà été envoyée dans Dépenses Globales')
  }

  const renderAssuranceForm = () => (
    <div className="space-y-5">
      <div className="bg-blue-50 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-blue-800">🚗 Véhicule / Engin</p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Véhicule (Parc + Fonction)</label>
          <select value={assForm.vehicule} onChange={e => setAssForm(p => ({ ...p, vehicule: e.target.value }))}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
            <option value="">— Sélectionner un véhicule —</option>
            {allVehicleOptions.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
        </div>
      </div>
      <div className="bg-indigo-50 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-indigo-800">🛡️ Contrat d'assurance</p>
        <div className="grid grid-cols-2 gap-4">
          <Input name="compagnie" label="Compagnie d'assurance" value={assForm.compagnie} onChange={e => setAssForm(p => ({ ...p, compagnie: e.target.value }))} required placeholder="Ex: NSIA, Allianz..." />
          <Input name="numeroPolice" label="N° de Police" value={assForm.numeroPolice} onChange={e => setAssForm(p => ({ ...p, numeroPolice: e.target.value }))} required placeholder="POL-2026-XXXX" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Type d'assurance</label>
          <select value={assForm.typeAssurance} onChange={e => setAssForm(p => ({ ...p, typeAssurance: e.target.value as AssuranceType }))}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
            {ASSURANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input name="dateDebut" label="Date de début" type="date" value={assForm.dateDebut} onChange={e => setAssForm(p => ({ ...p, dateDebut: e.target.value }))} required />
          <Input name="dateEcheance" label="Date d'échéance" type="date" value={assForm.dateEcheance} onChange={e => setAssForm(p => ({ ...p, dateEcheance: e.target.value }))} required />
        </div>
        <Input name="montantPrime" label="Montant de la prime (FCFA)" type="number" value={assForm.montantPrime} onChange={e => setAssForm(p => ({ ...p, montantPrime: e.target.value }))} required placeholder="Ex: 380000" />
      </div>
      <div className="bg-amber-50 rounded-xl p-4 space-y-4">
        <p className="text-sm font-semibold text-amber-800">📎 Documents</p>
        <input ref={assContratRef} type="file" accept="image/*,.pdf" onChange={e => handleAssFileUpload('contrat', e)} className="hidden" />
        <input ref={assQuittanceRef} type="file" accept="image/*,.pdf" onChange={e => handleAssFileUpload('quittance', e)} className="hidden" />
        <div>
          <p className="text-xs font-medium text-gray-600 mb-2">Scan du contrat / police</p>
          {assContratScan ? (
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-amber-200">
              {assContratScan.startsWith('data:image') ? <img src={assContratScan} alt="Contrat" className="h-14 w-14 object-cover rounded-lg" /> : <div className="h-14 w-14 bg-amber-50 rounded-lg flex items-center justify-center"><FileText className="h-7 w-7 text-amber-500" /></div>}
              <div className="flex-1"><p className="text-sm font-medium text-gray-700">Contrat uploadé</p></div>
              <button type="button" onClick={() => setAssContratScan(undefined)} className="p-1.5 bg-red-100 text-red-500 rounded-lg hover:bg-red-200 transition-colors"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <button type="button" onClick={() => assContratRef.current?.click()}
              className="w-full p-3 border-2 border-dashed border-amber-300 rounded-xl text-sm text-amber-600 hover:border-amber-500 flex items-center justify-center gap-2 transition-colors">
              <Upload className="h-4 w-4" /> Scanner / Uploader le contrat
            </button>
          )}
        </div>
        <div>
          <p className="text-xs font-medium text-gray-600 mb-2">Quittance de paiement</p>
          {assQuittanceScan ? (
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-amber-200">
              {assQuittanceScan.startsWith('data:image') ? <img src={assQuittanceScan} alt="Quittance" className="h-14 w-14 object-cover rounded-lg" /> : <div className="h-14 w-14 bg-amber-50 rounded-lg flex items-center justify-center"><FileText className="h-7 w-7 text-amber-500" /></div>}
              <div className="flex-1"><p className="text-sm font-medium text-gray-700">Quittance uploadée</p></div>
              <button type="button" onClick={() => setAssQuittanceScan(undefined)} className="p-1.5 bg-red-100 text-red-500 rounded-lg hover:bg-red-200 transition-colors"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <button type="button" onClick={() => assQuittanceRef.current?.click()}
              className="w-full p-3 border-2 border-dashed border-amber-300 rounded-xl text-sm text-amber-600 hover:border-amber-500 flex items-center justify-center gap-2 transition-colors">
              <Upload className="h-4 w-4" /> Uploader la quittance de paiement
            </button>
          )}
        </div>
      </div>
      <Textarea name="notes" label="Notes" value={assForm.notes} onChange={e => setAssForm(p => ({ ...p, notes: e.target.value }))} placeholder="Informations complémentaires..." />
    </div>
  )

  return (
    <div className="w-full space-y-6">

      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a1a2e] via-slate-800 to-indigo-900 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Assurances & Sinistres</h1>
              <p className="text-xs sm:text-sm text-indigo-200 font-medium mt-0.5">Gestion des contrats et suivi des dossiers sinistres</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { resetAssForm(); setIsAssuranceCreateOpen(true) }}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 text-white hover:bg-indigo-400 rounded-xl text-sm font-bold transition-all shadow-md">
              <Plus className="h-4 w-4" /> Nouvelle Assurance
            </button>
            <button onClick={() => { resetForm(); setIsCreateOpen(true) }}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white hover:bg-red-400 rounded-xl text-sm font-bold transition-all shadow-md">
              <Plus className="h-4 w-4" /> Nouveau Sinistre
            </button>
          </div>
        </div>
      </div>

      {/* Module tabs */}
      <FleetModuleTabs
        moduleTab={moduleTab}
        onChange={setModuleTab}
        openSinistresCount={openCount}
        assuranceAlertsCount={assuranceStats.expires + assuranceStats.soon}
      />

      {/* SINISTRES TAB */}
      {moduleTab === 'sinistres' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <FeatureStatCard
              value={allClaims.length}
              label="Total sinistres"
              icon={FileText}
              accentBarClassName="bg-gradient-to-b from-slate-500 to-slate-600"
              iconWrapperClassName="bg-slate-100"
              iconClassName="text-slate-600"
            />
            <FeatureStatCard
              value={openCount}
              label="Dossiers ouverts"
              icon={AlertTriangle}
              accentBarClassName="bg-gradient-to-b from-red-500 to-red-600"
              iconWrapperClassName="bg-red-100"
              iconClassName="text-red-600"
              valueClassName="text-red-600"
            />
            <FeatureStatCard
              value={parcCount}
              label="Véhicules Parc"
              icon={Truck}
              accentBarClassName="bg-gradient-to-b from-blue-500 to-blue-600"
              iconWrapperClassName="bg-blue-100"
              iconClassName="text-blue-600"
              valueClassName="text-blue-600"
            />
            <FeatureStatCard
              value={personnelCount}
              label="Véhicules Personnels"
              icon={Car}
              accentBarClassName="bg-gradient-to-b from-purple-500 to-purple-600"
              iconWrapperClassName="bg-purple-100"
              iconClassName="text-purple-600"
              valueClassName="text-purple-600"
            />
          </div>

          <div className="bg-white shadow-md rounded-2xl p-4 space-y-4">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
              <button onClick={() => setActiveClaimsTab('all')} className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeClaimsTab === 'all' ? 'bg-[#1a1a2e] text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'}`}>Tous ({allClaims.length})</button>
              <button onClick={() => setActiveClaimsTab('parc')} className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all inline-flex items-center gap-2 ${activeClaimsTab === 'parc' ? 'bg-[#1a1a2e] text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'}`}><Truck className="h-4 w-4" /> Parc ({parcCount})</button>
              <button onClick={() => setActiveClaimsTab('personnel')} className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all inline-flex items-center gap-2 ${activeClaimsTab === 'personnel' ? 'bg-[#1a1a2e] text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'}`}><Car className="h-4 w-4" /> Personnels ({personnelCount})</button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Rechercher sinistre, véhicule, conducteur..."
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>

          {displayedClaims.length === 0 ? (
            <div className="bg-white shadow-md rounded-2xl p-16 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 mb-6"><CheckCircle className="h-10 w-10 text-emerald-500" /></div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{allClaims.length === 0 ? 'Aucun sinistre enregistré' : 'Aucun résultat'}</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {displayedClaims.map((c: Claim) => (
                <div key={`${c.source}-${c.id}`} className="bg-white shadow-md rounded-2xl overflow-hidden hover:shadow-lg transition-all">
                  <div className={`h-1.5 ${c.status === 'Ouvert' ? 'bg-red-500' : c.status === 'En cours' ? 'bg-amber-500' : 'bg-green-500'}`} />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{getNatureIcon(c.type)}</span>
                          <h3 className="text-lg font-bold text-gray-900">{c.reportNumber}</h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${c.source === 'personnel' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{c.source === 'personnel' ? 'Personnel' : 'Parc'}</span>
                        </div>
                        <p className="text-sm text-gray-500">{c.type}{c.description ? ` — ${c.description.substring(0, 60)}${c.description.length > 60 ? '...' : ''}` : ''}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${getStatusColor(c.status)}`}>{c.status}</span>
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getSeverityColor(c.severity)}`}>{c.severity}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />{new Date(c.date).toLocaleDateString('fr-FR')}</div>
                      <div className="flex items-center gap-2">{c.source === 'personnel' ? <Car className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <Truck className="h-4 w-4 text-gray-400 flex-shrink-0" />}{c.vehicle}</div>
                      <div className="flex items-center gap-2"><Users className="h-4 w-4 text-gray-400 flex-shrink-0" />{c.driver}</div>
                      {c.location && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" /><span className="truncate">{c.location}</span></div>}
                    </div>
                    {c.costEstimate ? <div className="flex items-center gap-2 mb-4"><DollarSign className="h-4 w-4 text-red-500" /><span className="font-bold text-red-600 text-sm">{formatCurrency(c.costEstimate)}</span></div> : null}
                    <div className="flex gap-2 pt-3">
                      <button onClick={() => openView(c)} className="px-3 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors inline-flex items-center gap-1.5"><Eye className="h-4 w-4" /> Aperçu</button>
                      {c.constatScan && <a href={c.constatScan} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-xl text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors inline-flex items-center gap-1.5"><FileText className="h-4 w-4" /> Constat</a>}
                      {c.source === 'parc' && (<>
                        <button onClick={() => openEdit(c)} className="px-3 py-2 bg-[#1a1a2e] text-white rounded-xl text-sm font-medium inline-flex items-center gap-1.5 hover:bg-[#2a2a3e] transition-colors"><Edit className="h-4 w-4" /> Modifier</button>
                        <button onClick={() => deleteClaim(c.id)} className="px-3 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors inline-flex items-center gap-1.5"><Trash2 className="h-4 w-4" /></button>
                      </>)}
                      {c.source === 'personnel' && <span className="px-3 py-2 text-xs text-gray-400 italic">Géré depuis Véhicules Personnels</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {allClaims.length > 0 && totalCost > 0 && (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-5 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-6 w-6 text-red-600" />
                  <div><p className="text-sm text-gray-600 font-medium">Coût total estimé des sinistres</p><p className="text-2xl font-bold text-red-700">{formatCurrency(totalCost)}</p></div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">{allClaims.length} sinistre{allClaims.length > 1 ? 's' : ''}</p>
                  <p className="text-xs text-gray-400">{openCount} ouvert{openCount > 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ASSURANCES TAB */}
      {moduleTab === 'assurances' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <FeatureStatCard
              value={assuranceStats.total}
              label="Contrats actifs"
              icon={Shield}
              accentBarClassName="bg-gradient-to-b from-indigo-500 to-indigo-600"
              iconWrapperClassName="bg-indigo-100"
              iconClassName="text-indigo-600"
            />
            <FeatureStatCard
              value={assuranceStats.ok}
              label="À jour"
              icon={ShieldCheck}
              accentBarClassName="bg-gradient-to-b from-emerald-500 to-emerald-600"
              iconWrapperClassName="bg-emerald-100"
              iconClassName="text-emerald-600"
              valueClassName="text-emerald-600"
            />
            <FeatureStatCard
              value={assuranceStats.soon}
              label="Renouvellement <30j"
              icon={ShieldAlert}
              accentBarClassName="bg-gradient-to-b from-orange-500 to-orange-600"
              iconWrapperClassName="bg-orange-100"
              iconClassName="text-orange-600"
              valueClassName="text-orange-600"
            />
            <FeatureStatCard
              value={assuranceStats.expires}
              label="Expirés"
              icon={ShieldOff}
              accentBarClassName="bg-gradient-to-b from-red-500 to-red-600"
              iconWrapperClassName="bg-red-100"
              iconClassName="text-red-600"
              valueClassName="text-red-600"
            />
          </div>

          {actionableContracts.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-orange-800">Attention — Contrats nécessitant une action</p>
                  <p className="text-xs text-orange-600 mt-0.5">
                    {assuranceStats.expires > 0 && `${assuranceStats.expires} contrat(s) expiré(s). `}
                    {assuranceStats.soon > 0 && `${assuranceStats.soon} contrat(s) à renouveler dans moins de 30 jours.`}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {actionableContracts.map(contract => {
                  const statut = computeStatut(contract.dateEcheance)
                  const isExpired = statut === 'Expiré'
                  const days = daysUntilExpiry(contract.dateEcheance)
                  return (
                    <div key={contract.id} className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border p-3 ${isExpired ? 'border-red-200 bg-red-50/60' : 'border-orange-200 bg-orange-50/70'}`}>
                      <div>
                        <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                          {contract.vehicule} - {contract.compagnie}
                          {isExpired ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white">Rouge - Expiré</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500 text-white">Orange - J-30</span>
                          )}
                        </p>
                        <p className={`text-xs ${isExpired ? 'text-red-700' : 'text-orange-700'}`}>
                          {isExpired
                            ? `Expiré le ${new Date(contract.dateEcheance).toLocaleDateString('fr-FR')}`
                            : `Échéance le ${new Date(contract.dateEcheance).toLocaleDateString('fr-FR')} (${days} jour${days > 1 ? 's' : ''} restant${days > 1 ? 's' : ''})`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openResolveModal(contract)}
                        className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm hover:shadow-md transition-all"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Résoudre
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="bg-white shadow-md rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input value={searchAssurance} onChange={e => setSearchAssurance(e.target.value)} placeholder="Rechercher véhicule, compagnie, n° police..."
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50/50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            </div>
            <select value={filterStatut} onChange={e => setFilterStatut(e.target.value as AssuranceStatut | '')}
              className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
              <option value="">Tous les statuts</option>
              <option value="À jour">✅ À jour</option>
              <option value="À renouveler bientôt">⚠️ À renouveler bientôt</option>
              <option value="Expiré">🔴 Expiré</option>
            </select>
          </div>

          {filteredContracts.length === 0 ? (
            <div className="bg-white shadow-md rounded-2xl p-16 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-50 mb-6"><Shield className="h-10 w-10 text-indigo-400" /></div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Aucun contrat trouvé</h3>
              <p className="text-gray-400 text-sm">Ajoutez un contrat via "Nouvelle Assurance".</p>
            </div>
          ) : (
            <div className="bg-white shadow-md rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Véhicule</th>
                      <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Compagnie / N° Police</th>
                      <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Échéance</th>
                      <th className="text-right px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Prime</th>
                      <th className="text-center px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Statut</th>
                      <th className="text-right px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredContracts.map(c => {
                      const statut = computeStatut(c.dateEcheance)
                      const badge = getStatutBadge(statut)
                      const days = daysUntilExpiry(c.dateEcheance)
                      const BadgeIcon = badge.icon
                      const isUrgent = statut === 'Expiré' || statut === 'À renouveler bientôt'
                      return (
                        <tr key={c.id} className={`hover:bg-gray-50/50 transition-colors ${isUrgent ? 'bg-red-50/30' : ''} ${focusedContractId === c.id ? 'ring-2 ring-indigo-400 ring-inset bg-indigo-50/40' : ''}`}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0"><Truck className="h-4 w-4 text-indigo-600" /></div>
                              <span className="font-bold text-gray-900">{c.vehicule}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-gray-800">{c.compagnie}</p>
                            <p className="text-xs text-gray-400 font-mono mt-0.5">{c.numeroPolice}</p>
                          </td>
                          <td className="px-5 py-4">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium">{c.typeAssurance}</span>
                          </td>
                          <td className="px-5 py-4">
                            <div className={`flex items-center gap-1.5 ${statut === 'Expiré' ? 'text-red-600' : statut === 'À renouveler bientôt' ? 'text-orange-600' : 'text-gray-700'}`}>
                              <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="text-sm font-semibold">{new Date(c.dateEcheance).toLocaleDateString('fr-FR')}</span>
                            </div>
                            {days < 0 ? <p className="text-xs text-red-500 mt-0.5 font-semibold">Expiré depuis {Math.abs(days)}j</p>
                              : days <= 15 ? <p className="text-xs text-orange-500 mt-0.5 font-semibold">Dans {days} jour{days > 1 ? 's' : ''}</p>
                              : <p className="text-xs text-gray-400 mt-0.5">Dans {days} jours</p>}
                          </td>
                          <td className="px-5 py-4 text-right"><span className="font-bold text-gray-900">{formatCurrency(c.montantPrime)}</span></td>
                          <td className="px-5 py-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                              <BadgeIcon className="h-3 w-3" /> {statut}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1.5">
                              {c.contratScan && <a href={c.contratScan} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors" title="Voir le contrat"><FileText className="h-3.5 w-3.5" /></a>}
                              {c.quittanceScan && <a href={c.quittanceScan} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors" title="Voir la quittance"><CheckCircle className="h-3.5 w-3.5" /></a>}
                              <button onClick={() => handleSendToExpenses(c)} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors" title="Envoyer prime dans Dépenses Globales"><ArrowUpRight className="h-3.5 w-3.5" /></button>
                              <button onClick={() => openContractEdit(c)} className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-indigo-100 hover:text-indigo-600 transition-colors" title="Modifier"><Edit className="h-3.5 w-3.5" /></button>
                              <button onClick={() => deleteContract(c.id)} className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors" title="Supprimer"><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {assuranceStats.total > 0 && (
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl p-5 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-6 w-6 text-indigo-600" />
                  <div><p className="text-sm text-gray-600 font-medium">Total des primes d'assurance</p><p className="text-2xl font-bold text-indigo-700">{formatCurrency(assuranceStats.totalPrimes)}</p></div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">{assuranceStats.total} contrat{assuranceStats.total > 1 ? 's' : ''}</p>
                  <p className="text-xs text-gray-400">{assuranceStats.ok} à jour</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODALS — SINISTRES */}
      <Modal isOpen={isCreateOpen} onClose={() => { setIsCreateOpen(false); resetForm() }} title="Déclarer un Sinistre" size="lg">
        <form onSubmit={createClaim} className="space-y-5">
          {renderSinistreFormFields()}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => { setIsCreateOpen(false); resetForm() }}>Annuler</Button>
            <Button type="submit" variant="primary"><AlertTriangle className="h-4 w-4 mr-2" />Déclarer le sinistre</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isEditOpen} onClose={() => { setIsEditOpen(false); setSelected(null); resetForm() }} title="Modifier le Sinistre" size="lg">
        <form onSubmit={saveEdit} className="space-y-5">
          {renderSinistreFormFields()}
          <div className="flex justify-end gap-3 pt-4">
            {isAdmin && <Button variant="danger" onClick={() => { if (selected) deleteClaim(selected.id) }}><Trash2 className="h-4 w-4 mr-2" />Supprimer</Button>}
            <Button type="submit" variant="primary">Enregistrer</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isViewOpen} onClose={() => { setIsViewOpen(false); setSelected(null) }} title="Détails du Sinistre" size="lg">
        {selected && (
          <div className="space-y-5">
            <div className={`p-5 rounded-xl ${selected.source === 'personnel' ? 'bg-purple-50' : 'bg-blue-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getNatureIcon(selected.type)}</span>
                  <h3 className="text-xl font-bold text-gray-900">{selected.reportNumber}</h3>
                </div>
                <div className="flex gap-2">
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${selected.source === 'personnel' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{selected.source === 'personnel' ? 'Véhicule Personnel' : 'Véhicule Parc'}</span>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${getStatusColor(selected.status)}`}>{selected.status}</span>
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getSeverityColor(selected.severity)}`}>{selected.severity}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-500 mb-0.5">Date</p><p className="font-semibold text-gray-900">{new Date(selected.date).toLocaleDateString('fr-FR')}</p></div>
              <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-500 mb-0.5">Lieu</p><p className="font-semibold text-gray-900">{selected.location || '—'}</p></div>
              <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-500 mb-0.5">Véhicule</p><p className="font-semibold text-gray-900">{selected.vehicle}</p></div>
              <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-500 mb-0.5">Conducteur</p><p className="font-semibold text-gray-900">{selected.driver}</p></div>
              <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-500 mb-0.5">Assureur</p><p className="font-semibold text-gray-900">{selected.insurer || '—'}</p></div>
              <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-500 mb-0.5">Coût estimé</p><p className="font-bold text-red-600">{selected.costEstimate ? formatCurrency(selected.costEstimate) : '—'}</p></div>
            </div>
            {selected.description && <div><p className="text-sm font-semibold text-gray-700 mb-2">📋 Description</p><p className="text-gray-900 bg-gray-50 p-4 rounded-xl text-sm">{selected.description}</p></div>}
            {selected.accidentPhotos && selected.accidentPhotos.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">📷 Photos ({selected.accidentPhotos.length})</p>
                <div className="grid grid-cols-3 gap-3">
                  {selected.accidentPhotos.map((photo: string, i: number) => (
                    <a key={i} href={photo} target="_blank" rel="noopener noreferrer">
                      <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-32 object-cover rounded-xl shadow-sm hover:opacity-80 transition-opacity cursor-pointer" />
                    </a>
                  ))}
                </div>
              </div>
            )}
            {selected.constatScan && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">📄 Constat amiable</p>
                <a href={selected.constatScan} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 rounded-xl hover:bg-amber-100 transition-colors text-sm font-medium"><FileText className="h-5 w-5" /> Voir le constat</a>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => { setIsViewOpen(false); setSelected(null) }}>Fermer</Button>
              {selected.source === 'parc' && <Button variant="primary" onClick={() => { setIsViewOpen(false); if (selected) openEdit(selected) }}><Edit className="h-4 w-4 mr-2" />Modifier</Button>}
            </div>
          </div>
        )}
      </Modal>

      {/* MODALS — ASSURANCES */}
      <Modal isOpen={isAssuranceCreateOpen} onClose={() => { setIsAssuranceCreateOpen(false); resetAssForm() }} title="Nouveau Contrat d'Assurance" size="lg">
        <form onSubmit={createContract} className="space-y-5">
          {renderAssuranceForm()}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => { setIsAssuranceCreateOpen(false); resetAssForm() }}>Annuler</Button>
            <Button type="submit" variant="primary"><Shield className="h-4 w-4 mr-2" />Enregistrer le contrat</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isAssuranceEditOpen} onClose={() => { setIsAssuranceEditOpen(false); setSelectedContract(null); resetAssForm() }} title="Modifier le Contrat d'Assurance" size="lg">
        <form onSubmit={saveContractEdit} className="space-y-5">
          {renderAssuranceForm()}
          <div className="flex justify-end gap-3 pt-4">
            {isAdmin && selectedContract && <Button variant="danger" onClick={() => { deleteContract(selectedContract.id); setIsAssuranceEditOpen(false) }}><Trash2 className="h-4 w-4 mr-2" />Supprimer</Button>}
            <Button type="submit" variant="primary">Enregistrer</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isResolveOpen} onClose={() => { setIsResolveOpen(false); setResolveContract(null) }} title="Résoudre l'alerte assurance" size="md">
        {resolveContract && (
          <form onSubmit={submitResolve} className="space-y-5">
            <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100">
              <p className="text-sm font-bold text-gray-900">{resolveContract.vehicule} - {resolveContract.compagnie}</p>
              <p className="text-xs text-indigo-700 mt-0.5">Mettez à jour l'échéance et la police pour clôturer l'alerte.</p>
            </div>

            <Input
              name="resolveDateEcheance"
              label="Nouvelle date d'échéance"
              type="date"
              value={resolveForm.dateEcheance}
              onChange={e => setResolveForm(prev => ({ ...prev, dateEcheance: e.target.value }))}
              required
            />

            <Input
              name="resolveNumeroPolice"
              label="Numéro de police"
              value={resolveForm.numeroPolice}
              onChange={e => setResolveForm(prev => ({ ...prev, numeroPolice: e.target.value }))}
              placeholder="Ex: POL-2026-XXXX"
            />

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Nouveau contrat (upload)</p>
              <input ref={resolveContratRef} type="file" accept="image/*,.pdf" onChange={handleResolveFileUpload} className="hidden" />
              {resolveForm.contratScan ? (
                <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-emerald-700" />
                  </div>
                  <p className="text-sm font-medium text-emerald-800">Nouveau contrat prêt à être enregistré</p>
                  <button type="button" onClick={() => setResolveForm(prev => ({ ...prev, contratScan: undefined }))} className="ml-auto p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors">
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

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => { setIsResolveOpen(false); setResolveContract(null) }}>Annuler</Button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all"
              >
                <CheckCircle className="h-4 w-4" />
                Valider la résolution
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
