type MockVehicle = {
  registration: string
  brand: string
  model: string
  insuranceStatus?: string
  insuranceContractId?: string
}

const fleetVehicles: MockVehicle[] = [{ registration: 'DK-1000-AA', brand: 'Iveco', model: 'Daily' }]
const personalVehicles: MockVehicle[] = [{ registration: 'DK-2000-BB', brand: 'Toyota', model: 'Corolla' }]

const vehiclesLoadMock = jest.fn(() => fleetVehicles)
const vehiclesSaveMock = jest.fn()
const personalLoadMock = jest.fn(() => personalVehicles)
const personalSaveMock = jest.fn()

const supabaseSelectOrderMock = jest.fn(async () => ({ data: [], error: null }))
const supabaseSelectMock = jest.fn(() => ({ order: supabaseSelectOrderMock }))
const supabaseUpsertMock = jest.fn(async () => ({ error: null }))
const supabaseFromMock = jest.fn(() => ({
  select: supabaseSelectMock,
  upsert: supabaseUpsertMock,
}))

jest.mock('../../../shared/services/supabaseClient', () => ({
  supabase: {
    from: (...args: unknown[]) => supabaseFromMock(...args),
  },
}))

jest.mock('./vehiclesStore', () => ({
  vehiclesStore: {
    load: () => vehiclesLoadMock(),
    save: (records: MockVehicle[]) => vehiclesSaveMock(records),
  },
}))

jest.mock('./personalVehiclesStore', () => ({
  personalVehiclesStore: {
    load: () => personalLoadMock(),
    save: (records: MockVehicle[]) => personalSaveMock(records),
  },
}))

describe('assuranceStore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('computes status from expiry date', async () => {
    const { computeStatut } = await import('./assuranceStore')

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const in10Days = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const in50Days = new Date(Date.now() + 50 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    expect(computeStatut(yesterday)).toBe('Expiré')
    expect(computeStatut(in10Days)).toBe('À renouveler bientôt')
    expect(computeStatut(in50Days)).toBe('À jour')
  })

  it('archives previous policy on update and syncs vehicle insurance fields', async () => {
    const { assuranceStore } = await import('./assuranceStore')

    assuranceStore.save([
      {
        id: 'ass-1',
        vehicule: 'DK-1000-AA',
        compagnie: 'Compagnie A',
        numeroPolice: 'POL-OLD',
        dateDebut: '2026-01-01',
        dateEcheance: '2026-12-31',
        montantPrime: 300000,
        typeAssurance: 'Tous Risques',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ])

    assuranceStore.update('ass-1', {
      numeroPolice: 'POL-NEW',
      compagnie: 'Compagnie B',
    })

    const updated = assuranceStore.load().find(c => c.id === 'ass-1')
    expect(updated?.numeroPolice).toBe('POL-NEW')
    expect(updated?.compagnie).toBe('Compagnie B')
    expect(updated?.renewalHistory).toBeDefined()
    expect(updated?.renewalHistory?.length).toBe(1)
    expect(updated?.renewalHistory?.[0].numeroPolice).toBe('POL-OLD')

    expect(vehiclesSaveMock).toHaveBeenCalled()
  })

  it('keeps vehicle insurance in sync with latest remaining contract when one is removed', async () => {
    const { assuranceStore } = await import('./assuranceStore')

    assuranceStore.save([
      {
        id: 'ass-old',
        vehicule: 'DK-1000-AA',
        compagnie: 'Compagnie Old',
        numeroPolice: 'POL-OLD',
        dateDebut: '2025-01-01',
        dateEcheance: '2026-01-01',
        montantPrime: 200000,
        typeAssurance: 'RC (Responsabilité Civile)',
        createdAt: '2025-01-01T00:00:00.000Z',
      },
      {
        id: 'ass-new',
        vehicule: 'DK-1000-AA',
        compagnie: 'Compagnie New',
        numeroPolice: 'POL-NEW',
        dateDebut: '2026-01-02',
        dateEcheance: '2027-01-01',
        montantPrime: 350000,
        typeAssurance: 'Tous Risques',
        createdAt: '2026-01-02T00:00:00.000Z',
      },
    ])

    assuranceStore.remove('ass-new')

    const remaining = assuranceStore.load()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe('ass-old')
    expect(vehiclesSaveMock).toHaveBeenCalled()
  })
})
