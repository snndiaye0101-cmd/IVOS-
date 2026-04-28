// ============================================
// SiteContext — User's site + currency detection
// Provides currency formatting + site isolation
// ============================================

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { countryStore, type ICountry, type ISite } from '../services/countryStore'
import { useAuth } from './AuthContext'
import { permissionStore } from '../services/permissionStore'

interface SiteContextType {
  // Current user's assigned data
  userCountry: ICountry | null
  userSite: ISite | null
  currencyCode: string
  currencySymbol: string

  // Super Admin overrides (view as another site)
  viewCountry: ICountry | null
  viewSite: ISite | null
  setViewCountry: (country: ICountry | null) => void
  setViewSite: (site: ISite | null) => void
  isConsolidatedView: boolean
  setConsolidatedView: (v: boolean) => void

  // Active = view override if super admin, else user's own
  activeCountry: ICountry | null
  activeSite: ISite | null
  activeCurrencyCode: string
  activeCurrencySymbol: string

  // Data helpers
  allCountries: ICountry[]
  allSites: ISite[]
  sitesForCountry: (countryId: string) => ISite[]
  isSuperAdmin: boolean
  referenceCurrency: string

  // Refresh after CRUD
  refresh: () => void

  // Format currency with active site's currency
  formatMoney: (amount: number) => string
  formatMoneyRef: (amount: number) => string
}

const SiteContext = createContext<SiteContextType | null>(null)

export function SiteProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const isSuperAdmin = user ? permissionStore.isSuperAdmin(user.id) : false

  const [allCountries, setAllCountries] = useState<ICountry[]>([])
  const [allSites, setAllSites] = useState<ISite[]>([])

  // Super Admin view overrides
  const [viewCountry, setViewCountry] = useState<ICountry | null>(null)
  const [viewSite, setViewSite] = useState<ISite | null>(null)
  const [isConsolidatedView, setConsolidatedView] = useState(false)

  const refresh = useCallback(() => {
    countryStore.seedDefaults()
    setAllCountries(countryStore.getCountries())
    setAllSites(countryStore.getSites())
  }, [])

  useEffect(() => { refresh() }, [refresh])

  // User's assigned country/site
  const userCountry = user?.countryId
    ? allCountries.find(c => c.id === user.countryId) || null
    : allCountries[0] || null

  const userSite = user?.siteId
    ? allSites.find(s => s.id === user.siteId) || null
    : allSites[0] || null

  // Active context (super admin override or user's own)
  const activeCountry = isSuperAdmin && viewCountry ? viewCountry : userCountry
  const activeSite = isSuperAdmin && viewSite ? viewSite : userSite

  // Currency from active site's country
  const activeCurrency = activeSite
    ? countryStore.getCurrencyForSite(activeSite.id)
    : activeCountry
      ? countryStore.getCurrencyForCountry(activeCountry.id)
      : { code: 'XOF', symbol: 'F CFA' }

  const userCurrency = userSite
    ? countryStore.getCurrencyForSite(userSite.id)
    : { code: 'XOF', symbol: 'F CFA' }

  const referenceCurrency = countryStore.getReferenceCurrency()

  const sitesForCountry = useCallback((countryId: string) => {
    return allSites.filter(s => s.countryId === countryId)
  }, [allSites])

  // Format money with the active site's currency
  const formatMoney = useCallback((amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' ' + activeCurrency.symbol
  }, [activeCurrency.symbol])

  // Format money in reference currency (for consolidated view)
  const formatMoneyRef = useCallback((amount: number): string => {
    const refSymbol = allCountries.find(c => c.currencyCode === referenceCurrency)?.currencySymbol || referenceCurrency
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' ' + refSymbol
  }, [referenceCurrency, allCountries])

  return (
    <SiteContext.Provider value={{
      userCountry,
      userSite,
      currencyCode: userCurrency.code,
      currencySymbol: userCurrency.symbol,
      viewCountry,
      viewSite,
      setViewCountry,
      setViewSite,
      isConsolidatedView,
      setConsolidatedView,
      activeCountry,
      activeSite,
      activeCurrencyCode: activeCurrency.code,
      activeCurrencySymbol: activeCurrency.symbol,
      allCountries,
      allSites,
      sitesForCountry,
      isSuperAdmin,
      referenceCurrency,
      refresh,
      formatMoney,
      formatMoneyRef,
    }}>
      {children}
    </SiteContext.Provider>
  )
}

export function useSite() {
  const ctx = useContext(SiteContext)
  if (!ctx) throw new Error('useSite must be used within SiteProvider')
  return ctx
}
