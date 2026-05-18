/**
 * ============================================
 * useAuth Hook
 * ============================================
 * React hook for authentication state management
 * Replaces legacy authStore usage
 * 
 * Usage:
 * const { user, isLoading, signIn, signUp, signOut } = useAuth()
 */

import { useEffect, useState, useCallback } from 'react'
import type { AuthUser } from '../services/supabaseAuthService'
import {
  getCurrentUser,
  signIn as supabaseSignIn,
  signUp as supabaseSignUp,
  signOut as supabaseSignOut,
  resetPassword as supabaseResetPassword,
  updatePassword as supabaseUpdatePassword,
  onAuthStateChange,
} from '../services/supabaseAuthService'

export interface UseAuthOptions {
  autoHydrate?: boolean // Automatically load current user on mount
}

export interface UseAuthReturn {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null

  // Auth actions
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, fullName: string, subsidiaryId: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<{ success: boolean; error?: string }>
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>
}

export function useAuth(options: UseAuthOptions = {}): UseAuthReturn {
  const { autoHydrate = true } = options

  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(autoHydrate)
  const [error, setError] = useState<string | null>(null)

  // Hydrate user on mount
  useEffect(() => {
    if (!autoHydrate) return

    let isMounted = true

    const hydrate = async () => {
      try {
        const currentUser = await getCurrentUser()
        if (isMounted) {
          setUser(currentUser)
          setIsLoading(false)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load user')
          setIsLoading(false)
        }
      }
    }

    hydrate()

    return () => {
      isMounted = false
    }
  }, [autoHydrate])

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange((newUser: AuthUser | null) => {
      setUser(newUser)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Sign in handler
  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await supabaseSignIn(email, password)

      if (result.error) {
        setError(result.error.message)
        return { success: false, error: result.error.message }
      }

      if (result.data) {
        setUser(result.data.user)
        return { success: true }
      }

      return { success: false, error: 'Unknown error' }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Sign in failed'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Sign up handler
  const signUp = useCallback(async (email: string, password: string, fullName: string, subsidiaryId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await supabaseSignUp(email, password, fullName, subsidiaryId)

      if (result.error) {
        setError(result.error.message)
        return { success: false, error: result.error.message }
      }

      // User created but not logged in yet
      return { success: true }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Sign up failed'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Sign out handler
  const signOut = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await supabaseSignOut()

      if (result.error) {
        setError(result.error.message)
        return { success: false, error: result.error.message }
      }

      setUser(null)
      return { success: true }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Sign out failed'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Reset password handler
  const resetPassword = useCallback(async (email: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await supabaseResetPassword(email)

      if (result.error) {
        setError(result.error.message)
        return { success: false, error: result.error.message }
      }

      return { success: true }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Password reset failed'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Update password handler
  const updatePassword = useCallback(async (newPassword: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await supabaseUpdatePassword(newPassword)

      if (result.error) {
        setError(result.error.message)
        return { success: false, error: result.error.message }
      }

      return { success: true }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Password update failed'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  }
}
