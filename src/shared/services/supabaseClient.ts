// ============================================
// Client Supabase - Configuration centrale
// ============================================

import { createClient } from '@supabase/supabase-js'

type RuntimeGlobal = {
  process?: {
    env?: Record<string, string>
  }
}

function getViteEnv(): Record<string, string> | undefined {
  const runtimeEnv = ((globalThis as unknown as RuntimeGlobal).process?.env) || {}
  const viteEnv = typeof import.meta !== 'undefined' ? (import.meta.env as Record<string, string> | undefined) : undefined
  return viteEnv || runtimeEnv
}

const viteEnv = getViteEnv()
const runtimeEnv = ((globalThis as unknown as RuntimeGlobal).process?.env) || {}

export const supabaseUrl = viteEnv?.VITE_SUPABASE_URL || runtimeEnv.VITE_SUPABASE_URL
export const supabaseAnonKey = viteEnv?.VITE_SUPABASE_ANON_KEY || runtimeEnv.VITE_SUPABASE_ANON_KEY
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if ((!supabaseUrl || !supabaseAnonKey) && runtimeEnv.NODE_ENV !== 'test') {
  console.warn(
    'Variables Supabase absentes: demarrage en mode degrade avec un client de secours. Configurez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.local pour activer Supabase.'
  )
}

const resolvedUrl = supabaseUrl || 'https://test-project.supabase.co'
const resolvedAnonKey = supabaseAnonKey || 'test-anon-key'

function getBrowserAuthStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined

  try {
    const storage = window.sessionStorage
    storage.setItem('__supabase_storage_test__', '1')
    storage.removeItem('__supabase_storage_test__')
    return storage
  } catch {
    try {
      const fallbackStorage = window.localStorage
      fallbackStorage.setItem('__supabase_storage_test__', '1')
      fallbackStorage.removeItem('__supabase_storage_test__')
      return fallbackStorage
    } catch {
      return undefined
    }
  }
}

export const supabaseAuthStorage = getBrowserAuthStorage()

// Client Supabase typé avec le schéma de la base
export const supabase = createClient(resolvedUrl, resolvedAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: supabaseAuthStorage,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'X-Client-Info': 'ivos-fleet-management',
    },
  },
})

// Types d'export pour faciliter l'usage
export type SupabaseClient = typeof supabase
