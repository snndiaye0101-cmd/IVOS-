import { create } from 'zustand'

interface AppContextState {
  currentCountryId: string | null
  currentSiteId: string | null
  setCurrentCountryId: (id: string | null) => void
  setCurrentSiteId: (id: string | null) => void
  hydrateFromStorage: () => void
}

const STORAGE_KEY = 'ivos_app_context_v1'

export const useAppContext = create<AppContextState>((set, get) => ({
  currentCountryId: null,
  currentSiteId: null,
  setCurrentCountryId: (id) => {
    set({ currentCountryId: id })
    const { currentSiteId } = get()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ country: id, site: currentSiteId }))
  },
  setCurrentSiteId: (id) => {
    set({ currentSiteId: id })
    const { currentCountryId } = get()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ country: currentCountryId, site: id }))
  },
  hydrateFromStorage: () => {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        const { country, site } = JSON.parse(raw)
        set({ currentCountryId: country || null, currentSiteId: site || null })
      } catch {}
    }
  },
}))
