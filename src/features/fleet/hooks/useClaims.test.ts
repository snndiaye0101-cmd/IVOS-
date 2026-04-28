import { renderHook, act, waitFor } from '@testing-library/react'
import { useClaims } from './useClaims'
import { claimsStore } from '../services/claimsStore'
import { personalVehiclesStore } from '../services/personalVehiclesStore'

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}))

describe('useClaims', () => {
  beforeEach(() => {
    claimsStore.clear()
    personalVehiclesStore.clear()
  })

  it('merges parc and personnel claims', async () => {
    claimsStore.save([
      {
        id: 'parc-1',
        reportNumber: 'SIN-2026-0001',
        date: '2026-04-10',
        vehicle: 'DK-1111-AA',
        driver: 'Driver Parc',
        type: 'Collision',
        severity: 'Mineur',
        status: 'Ouvert',
      },
    ])

    personalVehiclesStore.save([
      {
        id: 'pv-1',
        agentName: 'Agent Perso',
        registration: 'DK-2222-BB',
        brand: 'Toyota',
        model: 'Yaris',
        claims: [
          {
            id: 'pers-1',
            reportNumber: 'SIN-2026-0002',
            date: '2026-04-11',
            type: 'Vol',
            severity: 'Majeur',
            status: 'En cours',
          },
        ],
      },
    ])

    const { result } = renderHook(() => useClaims())

    await waitFor(() => {
      expect(result.current.parcClaims).toHaveLength(1)
      expect(result.current.personnelClaims).toHaveLength(1)
      expect(result.current.allClaims).toHaveLength(2)
    })
  })

  it('creates, updates and deletes parc claims', () => {
    const { result } = renderHook(() => useClaims())

    act(() => {
      result.current.createClaim({
        reportNumber: 'SIN-2026-0009',
        date: '2026-04-12',
        vehicle: 'DK-3333-CC',
        driver: 'Driver Test',
        type: 'Collision',
        severity: 'Mineur',
        status: 'Ouvert',
        source: 'parc',
      })
    })

    expect(result.current.parcClaims).toHaveLength(1)
    const created = result.current.parcClaims[0]

    act(() => {
      result.current.updateClaim(created.id, {
        ...created,
        status: 'En cours',
      })
    })

    expect(result.current.parcClaims[0].status).toBe('En cours')

    act(() => {
      result.current.deleteClaim(created.id)
    })

    expect(result.current.parcClaims).toHaveLength(0)
  })

  it('generates a report number with current year and padded index', () => {
    const { result } = renderHook(() => useClaims())
    const year = new Date().getFullYear()

    expect(result.current.generateReportNumber()).toBe(`SIN-${year}-0001`)
  })
})
