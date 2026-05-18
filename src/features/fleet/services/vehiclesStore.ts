import { supabase } from '../../../shared/services/supabaseClient'

/** Verifie si la visite technique d'un vehicule est expiree */
export function isVisiteTechniqueExpired(technicalControlExpiry: string | undefined): boolean {
  if (!technicalControlExpiry) return false
  return new Date(technicalControlExpiry) < new Date()
}

/** Retourne le nombre de jours avant expiration (negatif = expire) */
export function joursAvantExpirationVT(technicalControlExpiry: string | undefined): number | null {
  if (!technicalControlExpiry) return null
  const diff = new Date(technicalControlExpiry).getTime() - new Date().getTime()
  return Math.ceil(diff / (1000 * 3600 * 24))
}

const TABLE = 'app_vehicles'
const CHANGE_EVENT = 'fleetVehicles:updated'

export interface Vehicle {
  id: string
  registration: string
  brand: string
  model: string
  type: string
  year: number
  mileage: number
  fuelType: string
  status: string
  source?: 'parc' | 'personnel'
  assignedDriver?: string
  agentName?: string
  insuranceExpiry?: string
  technicalControlExpiry?: string
  lastMaintenance?: string
  // Additional optional fields used across the app
  capacity?: string | number
  purchaseDate?: string
  commissionDate?: string
  carteGriseExpiry?: string
  vignetteExpiry?: string
  lastOilChange?: string
  nextOilChange?: string
  lastOilMileage?: number
  maintenanceHistory?: any[]
  documents?: any[]
  complianceDocs?: any[]
  fuelRecords?: any[]
  expenses?: any[]
  notes?: string
  siteCode?: string
  dateFinMiseDisposition?: string
  kilometrageAuPret?: number
}

let cache: Vehicle[] = []
let hydrated = false
let hydratePromise: Promise<void> | null = null

function emitUpdate() {
  try {
    window.dispatchEvent(new Event(CHANGE_EVENT))
  } catch {
    // no-op
  }
}

async function persistRecords(records: Vehicle[]) {
  const payload = records.map(vehicle => ({
    registration: vehicle.registration,
    payload: vehicle,
    updated_at: new Date().toISOString(),
  }))

  if (payload.length === 0) {
    const { error } = await supabase.from(TABLE).delete().neq('registration', '__none__')
    if (error) console.error('Failed to clear app_vehicles', error)
    return
  }

  const { error } = await supabase.from(TABLE).upsert(payload, { onConflict: 'registration' })
  if (error) console.error('Failed to persist app_vehicles', error)
}

async function hydrate() {
  const { data, error } = await supabase.from(TABLE).select('payload').order('updated_at', { ascending: false })
  if (error) {
    console.error('Failed to hydrate app_vehicles', error)
    return
  }

  cache = (data || []).map((row: { payload: Vehicle }) => row.payload).filter(Boolean)
  hydrated = true
  emitUpdate()
}

function ensureHydrated() {
  if (hydrated) return
  if (!hydratePromise) {
    hydratePromise = hydrate().finally(() => {
      hydratePromise = null
    })
  }
}

export const vehiclesStore = {
  load(): Vehicle[] {
    ensureHydrated()
    return cache
  },

  async initialize(): Promise<void> {
    await hydrate()
  },

  save(vehicles: Vehicle[]) {
    cache = vehicles
    hydrated = true
    emitUpdate()
    void persistRecords(vehicles)
  },

  clear() {
    cache = []
    hydrated = true
    emitUpdate()
    void persistRecords([])
  },
}

export interface MaintenancePlan {
  id: string
  vehicleRegistration: string
  vehicleBrand: string
  vehicleModel: string
  vehicleSource: 'parc' | 'personnel'
  alertType: string
  description: string
  scheduledDate: string
  mechanic: string
  estimatedCost: number
  status: 'Planifié' | 'En cours' | 'Terminé' | 'Annulé'
  notes: string
  createdAt: string
}

const MAINT_TABLE = 'app_maintenance_plans'
let plansCache: MaintenancePlan[] = []
let plansHydrated = false
let plansPromise: Promise<void> | null = null

async function hydratePlans() {
  const { data, error } = await supabase.from(MAINT_TABLE).select('payload').order('updated_at', { ascending: false })
  if (error) {
    console.error('Failed to hydrate app_maintenance_plans', error)
    return
  }
  plansCache = (data || []).map((row: any) => row.payload).filter(Boolean)
  plansHydrated = true
}

function ensurePlansHydrated() {
  if (plansHydrated) return
  if (!plansPromise) {
    plansPromise = hydratePlans().finally(() => {
      plansPromise = null
    })
  }
}

async function persistPlans(plans: MaintenancePlan[]) {
  const payload = plans.map(plan => ({ id: plan.id, payload: plan, updated_at: new Date().toISOString() }))
  const { error } = await supabase.from(MAINT_TABLE).upsert(payload, { onConflict: 'id' })
  if (error) console.error('Failed to persist app_maintenance_plans', error)
}

export const maintenancePlansStore = {
  load(): MaintenancePlan[] {
    ensurePlansHydrated()
    return plansCache
  },
  save(plans: MaintenancePlan[]) {
    plansCache = plans
    plansHydrated = true
    void persistPlans(plans)
  },
  add(plan: MaintenancePlan) {
    const plans = this.load()
    plans.push(plan)
    this.save(plans)
  },
  update(id: string, updates: Partial<MaintenancePlan>) {
    const plans = this.load().map(p => (p.id === id ? { ...p, ...updates } : p))
    this.save(plans)
  },
  remove(id: string) {
    this.save(this.load().filter(p => p.id !== id))
  },
}
