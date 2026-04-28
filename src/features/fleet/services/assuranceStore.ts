/**
 * Assurance Store - gestion des contrats d'assurance via Supabase
 */

import { supabase } from '../../../shared/services/supabaseClient'
import { vehiclesStore } from './vehiclesStore'
import { personalVehiclesStore } from './personalVehiclesStore'

export type AssuranceType =
  | 'RC (Responsabilité Civile)'
  | 'Tous Risques'
  | 'Tiers Étendu'
  | 'Incendie / Vol'
  | 'Flotte'
  | 'Autre'

export type AssuranceStatut = 'À jour' | 'À renouveler bientôt' | 'Expiré'
const ASSURANCE_ALERT_THRESHOLD_DAYS = 30

export interface InsuranceRenewalHistoryEntry {
  compagnie: string
  numeroPolice: string
  dateDebut: string
  dateEcheance: string
  montantPrime: number
  typeAssurance: AssuranceType
  archivedAt: string
}

export interface InsuranceContract {
  id: string
  vehicule: string
  compagnie: string
  numeroPolice: string
  dateDebut: string
  dateEcheance: string
  montantPrime: number
  typeAssurance: AssuranceType
  contratScan?: string
  quittanceScan?: string
  notes?: string
  renewalHistory?: InsuranceRenewalHistoryEntry[]
  depenseId?: number
  createdAt: string
}

export function computeStatut(dateEcheance: string): AssuranceStatut {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const echeance = new Date(dateEcheance)
  echeance.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((echeance.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'Expiré'
  if (diffDays <= ASSURANCE_ALERT_THRESHOLD_DAYS) return 'À renouveler bientôt'
  return 'À jour'
}

const TABLE = 'app_insurance_contracts'
const CHANGE_EVENT = 'assurances:updated'

let cache: InsuranceContract[] = []
let hydrated = false
let hydratePromise: Promise<void> | null = null

function emitChange() {
  try {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
  } catch {
    // no-op
  }
}

function syncInsuranceToVehicles(contract: InsuranceContract): void {
  const fields = {
    insuranceExpiry: contract.dateEcheance,
    insuranceCompagnie: contract.compagnie,
    insuranceNumeroPolice: contract.numeroPolice,
    insuranceStatus: computeStatut(contract.dateEcheance),
    insuranceContractId: contract.id,
  }

  const fleet = vehiclesStore.load()
  const fleetIndex = fleet.findIndex((v: any) => v.registration === contract.vehicule)
  if (fleetIndex !== -1) {
    const next = [...fleet]
    next[fleetIndex] = { ...next[fleetIndex], ...fields }
    vehiclesStore.save(next)
  }

  const personal = personalVehiclesStore.load()
  const personalIndex = personal.findIndex((v: any) => v.registration === contract.vehicule)
  if (personalIndex !== -1) {
    const next = [...personal]
    next[personalIndex] = { ...next[personalIndex], ...fields }
    personalVehiclesStore.save(next)
  }
}

function clearInsuranceFromVehicles(vehicule: string): void {
  const clearFields = (v: any) => {
    const {
      insuranceCompagnie: _c,
      insuranceNumeroPolice: _n,
      insuranceStatus: _s,
      insuranceContractId: _i,
      ...rest
    } = v
    return rest
  }

  const fleet = vehiclesStore.load()
  const fleetIndex = fleet.findIndex((v: any) => v.registration === vehicule)
  if (fleetIndex !== -1) {
    const next = [...fleet]
    next[fleetIndex] = clearFields(next[fleetIndex])
    vehiclesStore.save(next)
  }

  const personal = personalVehiclesStore.load()
  const personalIndex = personal.findIndex((v: any) => v.registration === vehicule)
  if (personalIndex !== -1) {
    const next = [...personal]
    next[personalIndex] = clearFields(next[personalIndex])
    personalVehiclesStore.save(next)
  }
}

async function persistContracts(contracts: InsuranceContract[]) {
  const payload = contracts.map(contract => ({
    id: contract.id,
    vehicule: contract.vehicule,
    payload: contract,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase.from(TABLE).upsert(payload, { onConflict: 'id' })
  if (error) console.error('Failed to persist app_insurance_contracts', error)
}

async function hydrate() {
  const { data, error } = await supabase.from(TABLE).select('payload').order('updated_at', { ascending: false })
  if (error) {
    console.error('Failed to hydrate app_insurance_contracts', error)
    return
  }

  cache = (data || []).map((row: any) => row.payload).filter(Boolean)
  hydrated = true
  emitChange()
}

function ensureHydrated() {
  if (hydrated) return
  if (!hydratePromise) {
    hydratePromise = hydrate().finally(() => {
      hydratePromise = null
    })
  }
}

export const assuranceStore = {
  load(): InsuranceContract[] {
    ensureHydrated()
    return cache
  },

  async initialize(): Promise<void> {
    await hydrate()
  },

  save(contracts: InsuranceContract[]): void {
    cache = contracts
    hydrated = true
    emitChange()
    void persistContracts(contracts)
  },

  add(contract: InsuranceContract): void {
    const all = this.load()
    all.push(contract)
    this.save(all)
    syncInsuranceToVehicles(contract)
  },

  update(id: string, updates: Partial<InsuranceContract>): void {
    const current = this.load().find(c => c.id === id)
    const shouldArchivePrevious = Boolean(
      current && (
        updates.compagnie !== undefined ||
        updates.numeroPolice !== undefined ||
        updates.dateDebut !== undefined ||
        updates.dateEcheance !== undefined ||
        updates.montantPrime !== undefined ||
        updates.typeAssurance !== undefined
      )
    )

    const all = this.load().map(c => {
      if (c.id !== id) return c
      const historyEntry = shouldArchivePrevious
        ? {
            compagnie: c.compagnie,
            numeroPolice: c.numeroPolice,
            dateDebut: c.dateDebut,
            dateEcheance: c.dateEcheance,
            montantPrime: c.montantPrime,
            typeAssurance: c.typeAssurance,
            archivedAt: new Date().toISOString(),
          }
        : null

      return {
        ...c,
        ...updates,
        renewalHistory: historyEntry ? [...(c.renewalHistory || []), historyEntry] : c.renewalHistory,
      }
    })

    this.save(all)

    const updated = all.find(c => c.id === id)
    if (current && updated && current.vehicule !== updated.vehicule) {
      clearInsuranceFromVehicles(current.vehicule)
    }
    if (updated) syncInsuranceToVehicles(updated)
  },

  remove(id: string): void {
    const all = this.load()
    const contract = all.find(c => c.id === id)
    const remaining = all.filter(c => c.id !== id)
    this.save(remaining)

    if (contract && !remaining.find(c => c.vehicule === contract.vehicule)) {
      clearInsuranceFromVehicles(contract.vehicule)
    } else if (contract) {
      const next = remaining
        .filter(c => c.vehicule === contract.vehicule)
        .sort((a, b) => new Date(b.dateEcheance).getTime() - new Date(a.dateEcheance).getTime())[0]
      if (next) syncInsuranceToVehicles(next)
    }
  },
}

export { CHANGE_EVENT as ASSURANCE_CHANGE_EVENT }
