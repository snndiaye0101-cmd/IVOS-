/**
 * ============================================
 * Supabase Authentication Service
 * ============================================
 * Modern, secure authentication using Supabase Auth
 * Replaces the legacy localStorage-based authStore
 * 
 * Features:
 * - Supabase Auth (built-in PostgreSQL auth)
 * - Session persistence
 * - Password hashing (server-side)
 * - Row-Level Security (RLS) integration
 * - Audit trail for all auth events
 */

import { supabase } from './supabaseClient'
import type { User as SupabaseUser, Session } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string
  fullName: string
  role: 'super_admin' | 'country_manager' | 'dispatcher' | 'driver' | 'client' | 'supervisor'
  subsidiaryId: string
  status: 'approved' | 'pending' | 'rejected'
  siteAccessBlocked: boolean
  systemAccessBlocked: boolean
  createdAt: string
  lastLogin?: string
}

export interface AuthError {
  code: string
  message: string
}

export interface AuthResponse<T> {
  data?: T
  error?: AuthError
}

/**
 * Sign up a new user with email and password
 * 
 * ⚠️ Password is hashed server-side by Supabase
 * 
 * @param email User email
 * @param password Minimum 6 characters
 * @param fullName User full name
 * @param subsidiaryId Organization ID
 * @returns Auth response with user data
 */
export async function signUp(
  email: string,
  password: string,
  fullName: string,
  subsidiaryId: string
): Promise<AuthResponse<AuthUser>> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          subsidiary_id: subsidiaryId,
        },
      },
    })

    if (error) {
      console.error('Signup error:', error)
      return {
        error: {
          code: error.status?.toString() || 'unknown',
          message: error.message,
        },
      }
    }

    if (!data.user) {
      return {
        error: {
          code: 'unknown_error',
          message: 'User creation failed',
        },
      }
    }

    // Create profile in app_users table (with RLS)
    const { error: profileError } = await supabase.from('app_users').insert([
      {
        id: data.user.id,
        email: data.user.email ?? '',
        full_name: fullName,
        role: 'client', // Default role
        status: 'pending', // Pending admin approval
        subsidiary_id: subsidiaryId,
        site_access_blocked: false,
        system_access_blocked: false,
        created_at: new Date().toISOString(),
      },
    ])

    if (profileError) {
      console.error('Profile creation error:', profileError)
      return {
        error: {
          code: profileError.code || 'profile_error',
          message: profileError.message,
        },
      }
    }

    return {
      data: {
        id: data.user.id,
        email: data.user.email ?? '',
        fullName,
        role: 'client',
        subsidiaryId,
        status: 'pending',
        siteAccessBlocked: false,
        systemAccessBlocked: false,
        createdAt: new Date().toISOString(),
      },
    }
  } catch (error) {
    console.error('Signup exception:', error)
    return {
      error: {
        code: 'exception',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    }
  }
}

/**
 * Sign in with email and password
 * 
 * @param email User email
 * @param password User password
 * @returns Session data
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResponse<{ user: AuthUser; session: Session }>> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Sign in error:', error)
      return {
        error: {
          code: error.status?.toString() || 'invalid_credentials',
          message: error.message || 'Invalid email or password',
        },
      }
    }

    if (!data.user || !data.session) {
      return {
        error: {
          code: 'session_error',
          message: 'Failed to create session',
        },
      }
    }

    // Fetch user profile from app_users table
    const { data: profile, error: profileError } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return {
        error: {
          code: 'profile_error',
          message: 'Failed to load user profile',
        },
      }
    }

    // Log authentication event
    await logAuthEvent('login', data.user.id, email)

    // Remove legacy auth snapshot once Supabase Auth is working
    clearLegacyAuth()

    return {
      data: {
        user: {
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name,
          role: profile.role,
          subsidiaryId: profile.subsidiary_id,
          status: profile.status,
          siteAccessBlocked: profile.site_access_blocked,
          systemAccessBlocked: profile.system_access_blocked,
          createdAt: profile.created_at,
          lastLogin: new Date().toISOString(),
        },
        session: data.session,
      },
    }
  } catch (error) {
    console.error('Sign in exception:', error)
    return {
      error: {
        code: 'exception',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    }
  }
}

/**
 * Sign out current user
 * Clears session from localStorage and Supabase
 */
export async function signOut(): Promise<AuthResponse<null>> {
  try {
    const currentUser = await getCurrentUser()
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Sign out error:', error)
      return {
        error: {
          code: error.status?.toString() || 'unknown',
          message: error.message,
        },
      }
    }

    // Log logout event after the session is ended
    if (currentUser) {
      await logAuthEvent('logout', currentUser.id, currentUser.email)
    }

    clearLegacyAuth()
    return { data: null }
  } catch (error) {
    console.error('Sign out exception:', error)
    return {
      error: {
        code: 'exception',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    }
  }
}

/**
 * Reset password via email link
 * 
 * @param email User email
 * @returns Success response
 */
export async function resetPassword(email: string): Promise<AuthResponse<null>> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) {
      console.error('Password reset error:', error)
      return {
        error: {
          code: error.status?.toString() || 'unknown',
          message: error.message,
        },
      }
    }

    // Log auth event
    await logAuthEvent('password_reset_requested', 'system', email)

    return { data: null }
  } catch (error) {
    console.error('Password reset exception:', error)
    return {
      error: {
        code: 'exception',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    }
  }
}

/**
 * Update password for authenticated user
 * 
 * @param newPassword New password (min 6 characters)
 * @returns Success response
 */
export async function updatePassword(newPassword: string): Promise<AuthResponse<null>> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      console.error('Update password error:', error)
      return {
        error: {
          code: error.status?.toString() || 'unknown',
          message: error.message,
        },
      }
    }

    // Log auth event
    const user = await getCurrentUser()
    if (user) {
      await logAuthEvent('password_updated', user.id, user.email)
    }

    return { data: null }
  } catch (error) {
    console.error('Update password exception:', error)
    return {
      error: {
        code: 'exception',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    }
  }
}

/**
 * Get currently authenticated user
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    // Fetch user profile from app_users table
    const { data: profile } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return null
    }

    return {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      role: profile.role,
      subsidiaryId: profile.subsidiary_id,
      status: profile.status,
      siteAccessBlocked: profile.site_access_blocked,
      systemAccessBlocked: profile.system_access_blocked,
      createdAt: profile.created_at,
      lastLogin: user.last_sign_in_at,
    }
  } catch (error) {
    console.error('Get current user error:', error)
    return null
  }
}

/**
 * Get current session
 */
export async function getSession(): Promise<Session | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return session
  } catch (error) {
    console.error('Get session error:', error)
    return null
  }
}

/**
 * Listen for auth state changes
 * 
 * @param callback Function to call on auth state change
 * @returns Unsubscribe function
 */
export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const user = await getCurrentUser()
      callback(user)
    } else {
      callback(null)
    }
  })

  return () => {
    subscription?.unsubscribe()
  }
}

/**
 * Log authentication event for audit trail
 * 
 * @private
 */
async function logAuthEvent(
  event: 'login' | 'logout' | 'password_reset_requested' | 'password_updated',
  userId: string,
  email: string
) {
  try {
    await supabase.from('auth_events').insert([
      {
        event,
        user_id: userId,
        email,
        ip_address: 'unknown', // Can be enhanced with IP detection
        user_agent: navigator.userAgent,
        created_at: new Date().toISOString(),
      },
    ])
  } catch (error) {
    // Silent fail - don't break auth flow on audit failure
    console.warn('Failed to log auth event:', error)
  }
}

/**
 * MIGRATION HELPER: Check if user still using legacy auth
 * Returns true if localStorage has auth snapshot but Supabase doesn't
 */
export function isLegacyAuthUser(): boolean {
  try {
    const legacyAuth = localStorage.getItem('ivos_auth_snapshot_v1')
    return !!legacyAuth
  } catch {
    return false
  }
}

/**
 * MIGRATION HELPER: Clear legacy auth data
 * Call after successful Supabase Auth migration
 */
export function clearLegacyAuth() {
  try {
    localStorage.removeItem('ivos_auth_snapshot_v1')
    console.log('Legacy auth data cleared')
  } catch (error) {
    console.warn('Failed to clear legacy auth:', error)
  }
}
