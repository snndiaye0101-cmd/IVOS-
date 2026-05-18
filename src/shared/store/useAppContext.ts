import { create } from 'zustand'
import { countryStore } from '../services/countryStore'
import { DEFAULT_COUNTRY_ALPHA3, DEFAULT_COUNTRY_ALPHA2 } from '../constants'

interface AppContextState {
  currentCountryId: string | null
  currentSiteId: string | null
  setCurrentCountryId: (id: string | null) => void
  setCurrentSiteId: (id: string | null) => void
  hydrateFromStorage: () => void
}

const STORAGE_KEY = 'ivos_app_context_v1'

function getDefaultCountryId(): string | null {
  try {
    const countries = countryStore.getCountries()
    if (!countries || countries.length === 0) return null
    const sen = countries.find(c => c.codeIso === DEFAULT_COUNTRY_ALPHA3 || c.codeIso === DEFAULT_COUNTRY_ALPHA2 || c.name.toLowerCase().includes('sénégal') || c.name.toLowerCase().includes('senegal'))
    return sen ? sen.id : countries[0].id
  } catch { return null }
}

export const useAppContext = create<AppContextState>((set, get) => ({
  // Implicit Senegal root: always prefer the Senegal country if present
  currentCountryId: getDefaultCountryId(),
  currentSiteId: null,
  // Prevent changing the global country from the UI — keep Senegal implicit
  setCurrentCountryId: (id) => {
    const defaultId = getDefaultCountryId()
    set({ currentCountryId: defaultId })
    const { currentSiteId } = get()
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ country: defaultId, site: currentSiteId })) } catch {}
  },
  setCurrentSiteId: (id) => {
    set({ currentSiteId: id })
    const { currentCountryId } = get()
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ country: currentCountryId, site: id })) } catch {}
  },
  hydrateFromStorage: () => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      const defaultId = getDefaultCountryId()
      if (raw) {
        try {
          const { site } = JSON.parse(raw)
          set({ currentCountryId: defaultId, currentSiteId: site || null })
          return
        } catch {}
      }
      set({ currentCountryId: defaultId, currentSiteId: null })
    } catch {}
  },
}))
