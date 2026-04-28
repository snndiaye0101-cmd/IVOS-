import type { Claim } from '../types/claims.types'

const KEY = 'ivos_claims_v1'

export const claimsStore = {
  load(): Claim[] {
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return []
      return JSON.parse(raw) as Claim[]
    } catch (e) {
      console.error('Failed to load claims', e)
      return []
    }
  },
  save(claims: Claim[]) {
    try {
      localStorage.setItem(KEY, JSON.stringify(claims))
      // notify other components in the same window
      try { window.dispatchEvent(new Event('claims:updated')) } catch (e) {}
    } catch (e) {
      console.error('Failed to save claims', e)
    }
  },
  add(claim: Claim) {
    const list = this.load()
    list.push(claim)
    this.save(list)
  },
  clear() {
    localStorage.removeItem(KEY)
  }
}
