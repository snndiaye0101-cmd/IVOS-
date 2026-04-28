// ============================================
// Client Supabase - Configuration centrale
// ============================================

import { createClient } from '@supabase/supabase-js'

type RuntimeGlobal = {
  process?: {
    env?: Record<string, string>
  }
}

function readViteEnv() {
  try {
    // Avoid direct import.meta usage for Jest/CJS environments.
    return Function('return (typeof import.meta !== "undefined" && import.meta.env) ? import.meta.env : undefined')()
  } catch {
    return undefined
  }
}

const viteEnv = readViteEnv() as Record<string, string> | undefined
const runtimeEnv = ((globalThis as unknown as RuntimeGlobal).process?.env) || {}

const supabaseUrl = viteEnv?.VITE_SUPABASE_URL || runtimeEnv.VITE_SUPABASE_URL
const supabaseAnonKey = viteEnv?.VITE_SUPABASE_ANON_KEY || runtimeEnv.VITE_SUPABASE_ANON_KEY

if ((!supabaseUrl || !supabaseAnonKey) && runtimeEnv.NODE_ENV !== 'test') {
  console.warn(
    'Variables Supabase absentes: demarrage en mode degrade avec un client de secours. Configurez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.local pour activer Supabase.'
  )
}

const resolvedUrl = supabaseUrl || 'https://test-project.supabase.co'
const resolvedAnonKey = supabaseAnonKey || 'test-anon-key'

// Client Supabase typé avec le schéma de la base
export const supabase = createClient(resolvedUrl, resolvedAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
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
