import { useContextSelector } from '../../../shared/contexts/ContextProvider';
import jsPDF from 'jspdf'
import React, { useState, useMemo, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import {
  Search, Plus, Edit2, Trash2, Eye, X, CheckCircle2,
  XCircle, ClipboardCheck, Truck, Calendar, BarChart3,
  AlertTriangle, ShieldCheck, Filter, PenTool, Wrench, RotateCcw,
  Clock
} from 'lucide-react'
import { vehiclesStore } from '../services/vehiclesStore'
import type { Vehicle } from '../services/vehiclesStore'
import { driversStore } from '../services/driversStore'
import { personalVehiclesStore } from '../services/personalVehiclesStore'
import { sendNotification } from '../../../shared/services/notificationService'
import { useAuth } from '../../../shared/contexts/AuthContext'


// ============================================
// Types
// ============================================

interface ChecklistItem {
  ok: boolean
  comment: string
}

interface TankCleanedItem extends ChecklistItem {
  certificateId: string
}

interface PreTripChecklist {
  tiresOk: ChecklistItem
  lightsOk: ChecklistItem
  fluidsChecked: ChecklistItem
  brakesOk: ChecklistItem
  mirrorsOk: ChecklistItem
  tankCleaned: TankCleanedItem
}

interface PreTripCheck {
  id: string
  operationId: string // Lien strict Operation
  vehicleRegistration: string
  vehicleBrand: string
  vehicleModel: string
  driverName: string
  date: string
  checklist: PreTripChecklist
  operationStatus: 'authorized' | 'blocked'
  responsibleName: string
  responsibleSignature: string
  mechanicName: string
  mechanicSignature: string
  notes: string
  deliveryNote: string // Bon de Livraison
  createdAt: string
}

const STORE_KEY = 'ivos_pre_trip_checks_v1'

// ============================================
// Helpers
// ============================================

function loadChecks(): PreTripCheck[] {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return []
    const checks = JSON.parse(raw) as PreTripCheck[]
    return checks.map(c => ({
      ...c,
      responsibleName: c.responsibleName || '',
      responsibleSignature: c.responsibleSignature || '',
      mechanicName: c.mechanicName || '',
      mechanicSignature: c.mechanicSignature || '',
    }))
  } catch {
    return []
  }
}

function saveChecks(checks: PreTripCheck[]) {
  localStorage.setItem(STORE_KEY, JSON.stringify(checks))
}

function validateOperation(checklist: PreTripChecklist): 'authorized' | 'blocked' {
  const allOk =
    checklist.tiresOk.ok &&
    checklist.lightsOk.ok &&
    checklist.fluidsChecked.ok &&
    checklist.brakesOk.ok &&
    checklist.mirrorsOk.ok &&
    checklist.tankCleaned.ok
  return allOk ? 'authorized' : 'blocked'
}

const defaultChecklist: PreTripChecklist = {
  tiresOk: { ok: false, comment: '' },
  lightsOk: { ok: false, comment: '' },
  fluidsChecked: { ok: false, comment: '' },
  brakesOk: { ok: false, comment: '' },
  mirrorsOk: { ok: false, comment: '' },
  tankCleaned: { ok: false, comment: '', certificateId: '' },
}

const defaultForm: Omit<PreTripCheck, 'id' | 'operationStatus' | 'createdAt'> = {
  vehicleRegistration: '',
  vehicleBrand: '',
  vehicleModel: '',
  driverName: '',
  date: new Date().toISOString().slice(0, 10),
  checklist: JSON.parse(JSON.stringify(defaultChecklist)),
  operationId: '',
  deliveryNote: '',
  responsibleName: '',
  responsibleSignature: '',
  mechanicName: '',
  mechanicSignature: '',
  notes: '',
}

const MECHANICS_KEY = 'ivos_mechanics_v1'

function loadMechanics(): { id: string; name: string; position: string }[] {
  try {
    const raw = localStorage.getItem(MECHANICS_KEY)
    if (!raw) return []
    return JSON.parse(raw).map((m: any) => ({ id: m.id, name: m.name, position: m.position || 'Mécanicien' }))
  } catch {
    return []
  }
}

// ============================================
// Signature Pad Component
// ============================================

function SignaturePad({ value, onChange, label }: { value: string; onChange: (data: string) => void; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const initializedRef = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 2
    ctx.strokeStyle = '#1a1a2e'
    if (value && !initializedRef.current) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height)
      img.src = value
    }
    initializedRef.current = true
  }, [])

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    isDrawing.current = true
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    if (!isDrawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  function endDraw() {
    if (!isDrawing.current) return
    isDrawing.current = false
    if (canvasRef.current) {
      onChange(canvasRef.current.toDataURL('image/png'))
    }
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.clearRect(0, 0, rect.width, rect.height)
    onChange('')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
          <PenTool className="h-3.5 w-3.5" />
          {label}
        </label>
        <button type="button" onClick={clearCanvas} className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-red-500 transition-colors">
          <RotateCcw className="h-3 w-3" /> Effacer
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-28 border-2 border-dashed border-gray-300 rounded-xl bg-white cursor-crosshair touch-none hover:border-teal-400 transition-colors"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
      {!value && <p className="text-[10px] text-gray-400 mt-1 text-center">Dessinez la signature ci-dessus</p>}
    </div>
  )
}

const checklistLabels: Record<keyof PreTripChecklist, string> = {
  tiresOk: 'Pneus en bon état',
  lightsOk: 'Éclairage fonctionnel',
  fluidsChecked: 'Niveaux de fluides vérifiés',
  brakesOk: 'Freins en bon état',
  mirrorsOk: 'Rétroviseurs en bon état',
  tankCleaned: 'Citerne nettoyée',
}

// ============================================
// Component
// ============================================

export default function PreTripCheckPage() {
    const { site, year } = useContextSelector();
    // Exemple d'utilisation : filtrer les pré-checks selon le site
    // const filteredChecks = checks.filter(check => site ? check.siteCode === site.code : true);
  const { allUsers } = useAuth();
  const [checks, setChecks] = useState<PreTripCheck[]>(() => loadChecks())
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'authorized' | 'blocked'>('all')
  const [showFormModal, setShowFormModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingCheck, setViewingCheck] = useState<PreTripCheck | null>(null)
  const [form, setForm] = useState(JSON.parse(JSON.stringify(defaultForm)))



  // Load vehicles, drivers & mechanics
  const [fleetVehicles, setFleetVehicles] = useState<Vehicle[]>([])
  const [personalVehicles, setPersonalVehicles] = useState<Vehicle[]>([])
  const [rawDrivers, setRawDrivers] = useState<any[]>([])
  const [mechanics, setMechanics] = useState<any[]>([])

  useEffect(() => {
    setFleetVehicles(vehiclesStore.load())
    setPersonalVehicles(personalVehiclesStore.load() as any)
    setRawDrivers(driversStore.load() as any)
    setMechanics(loadMechanics())

    const handleFleet = () => setFleetVehicles(vehiclesStore.load())
    const handlePersonal = () => setPersonalVehicles(personalVehiclesStore.load() as any)
    const handleDrivers = () => setRawDrivers(driversStore.load() as any)
    const handleMechanics = () => setMechanics(loadMechanics())
    window.addEventListener('fleetVehicles:updated', handleFleet)
    window.addEventListener('personalVehicles:updated', handlePersonal)
    window.addEventListener('drivers:updated', handleDrivers)
    window.addEventListener('mechanics:updated', handleMechanics)
    return () => {
      window.removeEventListener('fleetVehicles:updated', handleFleet)
      window.removeEventListener('personalVehicles:updated', handlePersonal)
      window.removeEventListener('drivers:updated', handleDrivers)
      window.removeEventListener('mechanics:updated', handleMechanics)
    }
  }, [])

  // Combined vehicles (parc + fonction)
  const allVehicles = useMemo(() => ({
    parc: fleetVehicles.map((v: any) => ({
      id: v.id,
      registration: v.registration || v.immatriculation,
      brand: v.brand || v.marque || '',
      model: v.model || v.modele || '',
      driver: v.assignedDriver || '',
    })),
    fonction: personalVehicles.map((v: any) => ({
      id: v.id,
      registration: v.registration || v.immatriculation,
      brand: v.brand || v.marque || '',
      model: v.model || v.modele || '',
      driver: v.agentName || '',
    })),
  }), [fleetVehicles, personalVehicles])

  // Combined drivers (Chauffeurs + Co-Chauffeurs + Agents véhicules de fonction)
  const allDrivers = useMemo(() => {
    const chauffeurs = rawDrivers
      .filter((d: any) => d.role === 'Chauffeur')
      .map((d: any) => ({ name: d.name, role: 'Chauffeur' as const }))
    const coChauffeurs = rawDrivers
      .filter((d: any) => d.role === 'Co-Chauffeur')
      .map((d: any) => ({ name: d.name, role: 'Co-Chauffeur' as const }))
    const agents = personalVehicles
      .filter((v: any) => v.agentName)
      .map((v: any) => ({ name: v.agentName, role: 'Agent' as const }))
    const seen = new Set<string>()
    const dedup = (list: { name: string; role: string }[]) =>
      list.filter(p => { if (seen.has(p.name)) return false; seen.add(p.name); return true })
    return {
      chauffeurs: dedup(chauffeurs),
      coChauffeurs: dedup(coChauffeurs),
      agents: dedup(agents),
    }
  }, [rawDrivers, personalVehicles])

  useEffect(() => {
    saveChecks(checks)
  }, [checks])

  // ============================================
  // KPIs
  // ============================================

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const todayChecks = checks.filter(c => c.date === today)
    const authorized = checks.filter(c => c.operationStatus === 'authorized')
    const blocked = checks.filter(c => c.operationStatus === 'blocked')
    const todayAuthorized = todayChecks.filter(c => c.operationStatus === 'authorized')
    const todayBlocked = todayChecks.filter(c => c.operationStatus === 'blocked')

    return {
      total: checks.length,
      authorized: authorized.length,
      blocked: blocked.length,
      todayTotal: todayChecks.length,
      todayAuthorized: todayAuthorized.length,
      todayBlocked: todayBlocked.length,
      rate: checks.length > 0 ? Math.round((authorized.length / checks.length) * 100) : 0,
    }
  }, [checks])

  // ============================================
  // Filtered list
  // ============================================

  const filteredChecks = useMemo(() => {
    let list = [...checks]

    if (filterStatus !== 'all') {
      list = list.filter(c => c.operationStatus === filterStatus)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.vehicleRegistration.toLowerCase().includes(q) ||
        c.vehicleBrand.toLowerCase().includes(q) ||
        c.driverName.toLowerCase().includes(q)
      )
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [checks, search, filterStatus])

  // ============================================
  // CRUD
  // ============================================

  function openAdd() {
    setEditingId(null)
    setForm(JSON.parse(JSON.stringify(defaultForm)))
    setShowFormModal(true)
  }

  function openEdit(check: PreTripCheck) {
    setEditingId(check.id)
    setForm({
      vehicleRegistration: check.vehicleRegistration,
      vehicleBrand: check.vehicleBrand,
      vehicleModel: check.vehicleModel,
      driverName: check.driverName,
      date: check.date,
      checklist: JSON.parse(JSON.stringify(check.checklist)),
      responsibleName: check.responsibleName || '',
      responsibleSignature: check.responsibleSignature || '',
      mechanicName: check.mechanicName || '',
      mechanicSignature: check.mechanicSignature || '',
      notes: check.notes,
    })
    setShowFormModal(true)
  }

  function openView(check: PreTripCheck) {
    setViewingCheck(check)
    setShowViewModal(true)
  }

  function handleDelete(id: string) {
    if (!confirm('Supprimer ce contrôle pré-départ ?')) return
    setChecks(prev => prev.filter(c => c.id !== id))
    toast.success('Contrôle supprimé')
  }

  async function handleSave() {
    if (!form.vehicleRegistration || !form.driverName || !form.date) {
      toast.error('Veuillez remplir les champs obligatoires')
      return
    }
    if (!form.responsibleName || !form.responsibleSignature) {
      toast.error('La signature du responsable est obligatoire')
      return
    }
    if (!form.mechanicName || !form.mechanicSignature) {
      toast.error('La signature du mécanicien est obligatoire')
      return
    }

    const status = validateOperation(form.checklist)

    if (editingId) {
      setChecks(prev => prev.map(c =>
        c.id === editingId ? { ...c, ...form, operationStatus: status } : c
      ))
      toast.success('Contrôle mis à jour')
    } else {
      const newCheck: PreTripCheck = {
        ...form,
        id: crypto.randomUUID(),
        operationStatus: status,
        createdAt: new Date().toISOString(),
      }
      setChecks(prev => [newCheck, ...prev])
      toast.success(
        status === 'authorized'
          ? 'Véhicule autorisé au départ ✓'
          : 'Véhicule bloqué — Maintenance requise'
      )
      // Notification au chauffeur concerné si trouvé
      const driverUser = allUsers.find((u: { fullName: string }) => u.fullName === newCheck.driverName)
      if (driverUser) {
        try {
          await sendNotification({
            userId: driverUser.id,
            type: 'other',
            title: 'Nouveau contrôle pré-départ',
            message: `Un contrôle pré-départ a été enregistré pour le véhicule ${newCheck.vehicleRegistration} (${newCheck.operationStatus === 'authorized' ? 'Autorisé' : 'Bloqué'}).`,
            entityType: 'pre_trip_check',
            entityId: newCheck.id,
            metadata: { driver: newCheck.driverName }
          })
        } catch (err) {
          console.error('Erreur notification contrôle pré-départ', err)
        }
      }
    }
    setShowFormModal(false)
  }

  function handleVehicleSelect(registration: string) {
    const v = [...allVehicles.parc, ...allVehicles.fonction].find(v => v.registration === registration)
    setForm((f: typeof form) => ({
      ...f,
      vehicleRegistration: registration,
      vehicleBrand: v?.brand || '',
      vehicleModel: v?.model || '',
      driverName: v?.driver || f.driverName,
    }))
  }

  function toggleCheckItem(key: keyof PreTripChecklist) {
    setForm((f: typeof form) => ({
      ...f,
      checklist: {
        ...f.checklist,
        [key]: {
          ...f.checklist[key],
          ok: !f.checklist[key].ok,
        },
      },
    }))
  }

  function setCheckComment(key: keyof PreTripChecklist, comment: string) {
    setForm((f: typeof form) => ({
      ...f,
      checklist: {
        ...f.checklist,
        [key]: { ...f.checklist[key], comment },
      },
    }))
  }

  function setCertificateId(value: string) {
    setForm((f: typeof form) => ({
      ...f,
      checklist: {
        ...f.checklist,
        tankCleaned: { ...f.checklist.tankCleaned, certificateId: value },
      },
    }))
  }


  // ============================================
  // Render
  // ============================================

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Contrôle Pré-Départ</h1>
              <p className="text-gray-300 text-sm mt-0.5">Inspection des véhicules avant operation</p>
            </div>
          </div>
          <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-sm font-medium transition-all"
            >
              <Plus className="h-4 w-4" />
              Nouveau Contrôle
            </button>
        </div>
      </div>


      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-teal-500 to-teal-600 rounded-l-2xl" />
          <div className="flex items-center gap-3 pl-3">
            <div className="p-2 bg-teal-50 rounded-lg"><BarChart3 className="h-5 w-5 text-teal-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Total Contrôles</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-green-500 to-green-600 rounded-l-2xl" />
          <div className="flex items-center gap-3 pl-3">
            <div className="p-2 bg-green-50 rounded-lg"><ShieldCheck className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Autorisés</p>
              <p className="text-xl font-bold text-green-700">{stats.authorized}</p>
              <p className="text-[10px] text-gray-400">{stats.rate}% de conformité</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-red-600 rounded-l-2xl" />
          <div className="flex items-center gap-3 pl-3">
            <div className="p-2 bg-red-50 rounded-lg"><XCircle className="h-5 w-5 text-red-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Bloqués</p>
              <p className="text-xl font-bold text-red-700">{stats.blocked}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-blue-600 rounded-l-2xl" />
          <div className="flex items-center gap-3 pl-3">
            <div className="p-2 bg-blue-50 rounded-lg"><Calendar className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Aujourd'hui</p>
              <p className="text-xl font-bold text-gray-900">{stats.todayTotal}</p>
              <p className="text-[10px] text-gray-400">
                {stats.todayAuthorized} ✓ / {stats.todayBlocked} ✗
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par immatriculation, marque, chauffeur..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            {(['all', 'authorized', 'blocked'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  filterStatus === s
                    ? s === 'authorized'
                      ? 'bg-green-100 text-green-700'
                      : s === 'blocked'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-teal-100 text-teal-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s === 'all' ? 'Tous' : s === 'authorized' ? 'Autorisés' : 'Bloqués'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1a1a2e]">
                <th className="text-left px-4 py-3 font-bold text-white text-xs uppercase">Date</th>
                <th className="text-left px-4 py-3 font-bold text-white text-xs uppercase">Véhicule</th>
                <th className="text-left px-4 py-3 font-bold text-white text-xs uppercase">Chauffeur</th>
                <th className="text-center px-4 py-3 font-bold text-white text-xs uppercase">Points OK</th>
                <th className="text-center px-4 py-3 font-bold text-white text-xs uppercase">Statut</th>
                <th className="text-right px-4 py-3 font-bold text-white text-xs uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredChecks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-gray-400">
                    <ClipboardCheck className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">Aucun contrôle pré-départ</p>
                    <p className="text-xs mt-1">Cliquez sur « Nouveau Contrôle » pour commencer</p>
                  </td>
                </tr>
              ) : (
                filteredChecks.map(check => {
                  const cl = check.checklist
                  const okCount = [cl.tiresOk, cl.lightsOk, cl.fluidsChecked, cl.brakesOk, cl.mirrorsOk, cl.tankCleaned].filter(i => i.ok).length
                  return (
                    <tr key={check.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-700">
                        {new Date(check.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-800">{check.vehicleRegistration}</p>
                            <p className="text-xs text-gray-400">{check.vehicleBrand} {check.vehicleModel}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{check.driverName}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          okCount === 6
                            ? 'bg-green-100 text-green-700'
                            : okCount >= 4
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                        }`}>
                          {okCount}/6
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {check.operationStatus === 'authorized' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Autorisé
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Bloqué
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openView(check)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Voir">
                            <Eye className="h-4 w-4 text-gray-500" />
                          </button>
                          <button onClick={() => openEdit(check)} className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors" title="Modifier">
                            <Edit2 className="h-4 w-4 text-blue-500" />
                          </button>
                          <button onClick={() => handleDelete(check.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================ */}
      {/* Form Modal */}
      {/* ============================================ */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-teal-600 to-emerald-600 p-5 rounded-t-2xl flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                {editingId ? 'Modifier le Contrôle' : 'Nouveau Contrôle Pré-Départ'}
              </h2>
              <button onClick={() => setShowFormModal(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Vehicle & Driver */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Véhicule *</label>
                  <select
                    value={form.vehicleRegistration}
                    onChange={e => handleVehicleSelect(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="">— Sélectionner —</option>
                    {allVehicles.parc.length > 0 && (
                      <optgroup label="🚛 Véhicules Parc">
                        {allVehicles.parc.map(v => (
                          <option key={v.id} value={v.registration}>
                            {v.registration} — {v.brand} {v.model}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {allVehicles.fonction.length > 0 && (
                      <optgroup label="🚗 Véhicules de Fonction">
                        {allVehicles.fonction.map(v => (
                          <option key={v.id} value={v.registration}>
                            {v.registration} — {v.brand} {v.model}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Chauffeur / Co-Chauffeur *</label>
                  <select
                    value={form.driverName}
                    onChange={e => setForm({ ...form, driverName: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="">— Sélectionner —</option>
                    {allDrivers.chauffeurs.length > 0 && (
                      <optgroup label="🟢 Chauffeurs">
                        {allDrivers.chauffeurs.map(d => (
                          <option key={d.name} value={d.name}>{d.name}</option>
                        ))}
                      </optgroup>
                    )}
                    {allDrivers.coChauffeurs.length > 0 && (
                      <optgroup label="🔵 Co-Chauffeurs">
                        {allDrivers.coChauffeurs.map(d => (
                          <option key={d.name} value={d.name}>{d.name}</option>
                        ))}
                      </optgroup>
                    )}
                    {allDrivers.agents.length > 0 && (
                      <optgroup label="🟣 Agents (Véh. de Fonction)">
                        {allDrivers.agents.map(d => (
                          <option key={d.name} value={d.name}>{d.name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              {/* Checklist */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-teal-600" />
                  Points de Contrôle
                </h3>
                <div className="space-y-3">
                  {(Object.keys(checklistLabels) as (keyof PreTripChecklist)[]).map(key => {
                    const item = form.checklist[key]
                    return (
                      <div key={key} className={`border rounded-xl p-3 transition-all ${
                        item.ok ? 'border-green-200 bg-green-50/50' : 'border-gray-200 bg-gray-50/50'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">{checklistLabels[key]}</span>
                          <button
                            type="button"
                            onClick={() => toggleCheckItem(key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              item.ok
                                ? 'bg-green-500 text-white shadow-sm'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                          >
                            {item.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                            {item.ok ? 'OK' : 'NON'}
                          </button>
                        </div>
                        {!item.ok && (
                          <input
                            type="text"
                            placeholder="Commentaire (optionnel)..."
                            value={item.comment}
                            onChange={e => setCheckComment(key, e.target.value)}
                            className="mt-2 w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          />
                        )}
                        {key === 'tankCleaned' && item.ok && (
                          <input
                            type="text"
                            placeholder="N° Certificat de nettoyage"
                            value={(form.checklist.tankCleaned as TankCleanedItem).certificateId}
                            onChange={e => setCertificateId(e.target.value)}
                            className="mt-2 w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Live validation status + Génération Ordre de Operation */}
              {(() => {
                const status = validateOperation(form.checklist)
                const anomalies = Object.entries(form.checklist).filter(([k, v]) => {
                  if (!(v as ChecklistItem).ok && (k === 'brakesOk' || k === 'tiresOk')) return true
                  return false
                })
                return (
                  <div className={`flex flex-col gap-3 p-4 rounded-xl ${
                    status === 'authorized'
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    {status === 'authorized' ? (
                      <>
                        <div className="flex items-center gap-3">
                          <ShieldCheck className="h-6 w-6 text-green-600" />
                          <div>
                            <p className="text-sm font-bold text-green-700">Autorisé au départ</p>
                            <p className="text-xs text-green-600">Tous les points de contrôle sont validés</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <input
                            type="text"
                            className="border rounded px-2 py-1 text-sm"
                            placeholder="N° Bon de Livraison (Delivery Note)"
                            value={form.deliveryNote || ''}
                            onChange={e => setForm({ ...form, deliveryNote: e.target.value })}
                          />
                          <button
                            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                            disabled={!form.responsibleSignature || !form.mechanicSignature || !form.deliveryNote}
                            onClick={() => {
                              // Génération PDF réelle
                              const doc = new jsPDF()
                              doc.setFontSize(16)
                              doc.text('Ordre de Operation', 20, 20)
                              doc.setFontSize(12)
                              doc.text(`Chauffeur : ${form.driverName}`, 20, 35)
                              doc.text(`Immatriculation : ${form.vehicleRegistration}`, 20, 45)
                              doc.text(`Destination : ${form.notes || '---'}`, 20, 55)
                              doc.text(`Bon de Livraison : ${form.deliveryNote}`, 20, 65)
                              doc.text('Résumé : Véhicule contrôlé conforme', 20, 80)
                              doc.save(`Ordre_Operation_${form.vehicleRegistration}_${form.driverName}.pdf`)
                              toast.success('Ordre de Operation généré (PDF téléchargé)')
                              // Création automatique de operation liée (exemple)
                              const newOperation = {
                                id: `M-${Date.now()}`,
                                vehicle: form.vehicleRegistration,
                                driver: form.driverName,
                                chefDeOperation: form.responsibleName,
                                coDrivers: [],
                                origin: '',
                                destination: form.notes || '',
                                status: 'Validé',
                                startDate: new Date().toISOString().slice(0, 10),
                                startTime: new Date().toLocaleTimeString(),
                                endDate: '',
                                endTime: '',
                                distance: '',
                                wasteForm: false,
                                documents: [],
                                notes: 'Operation générée automatiquement depuis contrôle pré-départ',
                              }
                              window.dispatchEvent(new CustomEvent('operation:created', { detail: newOperation }))
                            }}
                          >
                            Générer Ordre de Operation
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-6 w-6 text-red-600" />
                          <div>
                            <p className="text-sm font-bold text-red-700">Véhicule bloqué — Maintenance requise</p>
                            <p className="text-xs text-red-600">
                              {anomalies.length > 0
                                ? anomalies.map(([k]) =>
                                    k === 'brakesOk'
                                      ? 'Freins non conformes'
                                      : k === 'tiresOk'
                                      ? 'Pneus non conformes'
                                      : null
                                  ).filter(Boolean).join(', ')
                                : `${Object.entries(form.checklist).filter(([, v]) => !(v as ChecklistItem).ok).length} point(s) non conforme(s)`}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )
              })()}

              {/* ============================================ */}
              {/* Signatures */}
              {/* ============================================ */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <PenTool className="h-4 w-4 text-teal-600" />
                  Signatures
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Responsible */}
                  <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Responsable vérification *</label>
                      <input
                        type="text"
                        value={form.responsibleName}
                        onChange={e => setForm({ ...form, responsibleName: e.target.value })}
                        placeholder="Nom du responsable"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                    <SignaturePad
                      label="Signature du responsable *"
                      value={form.responsibleSignature}
                      onChange={(data: string) => setForm((f: typeof form) => ({ ...f, responsibleSignature: data }))}
                    />
                  </div>

                  {/* Mechanic */}
                  <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        <span className="flex items-center gap-1.5"><Wrench className="h-3.5 w-3.5" /> Mécanicien *</span>
                      </label>
                      <select
                        value={form.mechanicName}
                        onChange={e => setForm({ ...form, mechanicName: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      >
                        <option value="">— Sélectionner —</option>
                        {mechanics.filter(m => m.position.toLowerCase() === 'responsable logistique').length > 0 && (
                          <optgroup label="📦 Responsable Logistique">
                            {mechanics.filter(m => m.position.toLowerCase() === 'responsable logistique').map(m => (
                              <option key={m.id} value={m.name}>{m.name}</option>
                            ))}
                          </optgroup>
                        )}
                        {mechanics.filter(m => m.position.toLowerCase() !== 'responsable logistique').length > 0 && (
                          <optgroup label="🔩 Mécaniciens">
                            {mechanics.filter(m => m.position.toLowerCase() !== 'responsable logistique').map(m => (
                              <option key={m.id} value={m.name}>{m.name} — {m.position}</option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>
                    <SignaturePad
                      label="Signature du mécanicien *"
                      value={form.mechanicSignature}
                      onChange={(data: string) => setForm((f: typeof form) => ({ ...f, mechanicSignature: data }))}
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                  placeholder="Observations complémentaires..."
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-sm font-medium shadow-sm transition-all"
                >
                  {editingId ? 'Enregistrer' : 'Créer le Contrôle'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* View Modal */}
      {/* ============================================ */}
      {showViewModal && viewingCheck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className={`sticky top-0 p-5 rounded-t-2xl flex items-center justify-between ${
              viewingCheck.operationStatus === 'authorized'
                ? 'bg-gradient-to-r from-green-600 to-emerald-600'
                : 'bg-gradient-to-r from-red-600 to-rose-600'
            }`}>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {viewingCheck.operationStatus === 'authorized'
                  ? <ShieldCheck className="h-5 w-5" />
                  : <AlertTriangle className="h-5 w-5" />}
                {viewingCheck.operationStatus === 'authorized' ? 'Autorisé au départ' : 'Véhicule bloqué'}
              </h2>
              <button onClick={() => setShowViewModal(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Véhicule</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">{viewingCheck.vehicleRegistration}</p>
                  <p className="text-xs text-gray-500">{viewingCheck.vehicleBrand} {viewingCheck.vehicleModel}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Chauffeur</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">{viewingCheck.driverName}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 col-span-2">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Date du contrôle</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">{new Date(viewingCheck.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>

              {/* Checklist Details */}
              <div>
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Points de Contrôle</h3>
                <div className="space-y-2">
                  {(Object.keys(checklistLabels) as (keyof PreTripChecklist)[]).map(key => {
                    const item = viewingCheck.checklist[key]
                    return (
                      <div key={key} className={`flex items-start gap-3 p-3 rounded-xl ${
                        item.ok ? 'bg-green-50' : 'bg-red-50'
                      }`}>
                        {item.ok
                          ? <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                          : <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />}
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${item.ok ? 'text-green-700' : 'text-red-700'}`}>
                            {checklistLabels[key]}
                          </p>
                          {!item.ok && item.comment && (
                            <p className="text-xs text-red-600 mt-0.5">💬 {item.comment}</p>
                          )}
                          {key === 'tankCleaned' && item.ok && (viewingCheck.checklist.tankCleaned as TankCleanedItem).certificateId && (
                            <p className="text-xs text-green-600 mt-0.5">📜 Certificat: {(viewingCheck.checklist.tankCleaned as TankCleanedItem).certificateId}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Signatures */}
              {(viewingCheck.responsibleName || viewingCheck.mechanicName) && (
                <div>
                  <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <PenTool className="h-3.5 w-3.5" /> Signatures
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {viewingCheck.responsibleName && (
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Responsable</p>
                        <p className="text-sm font-bold text-gray-800 mt-0.5">{viewingCheck.responsibleName}</p>
                        {viewingCheck.responsibleSignature && (
                          <img src={viewingCheck.responsibleSignature} alt="Signature responsable" className="mt-2 h-16 border border-gray-200 rounded-lg bg-white p-1" />
                        )}
                      </div>
                    )}
                    {viewingCheck.mechanicName && (
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Mécanicien</p>
                        <p className="text-sm font-bold text-gray-800 mt-0.5">{viewingCheck.mechanicName}</p>
                        {viewingCheck.mechanicSignature && (
                          <img src={viewingCheck.mechanicSignature} alt="Signature mécanicien" className="mt-2 h-16 border border-gray-200 rounded-lg bg-white p-1" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {viewingCheck.notes && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Notes</p>
                  <p className="text-sm text-gray-700 mt-1">{viewingCheck.notes}</p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-all"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
