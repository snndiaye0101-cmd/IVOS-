import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { authStore, type User, type UserSession, type ActivityLog } from '../services/authStore'
import { permissionStore } from '../services/permissionStore'

type RuntimeGlobal = {
  process?: {
    env?: Record<string, string>
  }
}

function isDemoBootstrapEnabled(): boolean {
  const runtimeEnv = ((globalThis as unknown as RuntimeGlobal).process?.env || {}) as Record<string, string>
  const viteEnv = typeof import.meta !== 'undefined' ? (import.meta.env as Record<string, string> | undefined) : undefined
  return (viteEnv?.VITE_ENABLE_DEMO_AUTH_BOOTSTRAP || runtimeEnv.VITE_ENABLE_DEMO_AUTH_BOOTSTRAP) === 'true'
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => { success: boolean; error?: string; pending?: boolean }
  register: (fullName: string, email: string, password: string) => { success: boolean; error?: string }
  logout: () => void
  isAdmin: boolean
  pendingUsers: User[]
  allUsers: User[]
  refreshUsers: () => void
  approveUser: (userId: string, fonction: string, makeAdmin: boolean, countryId?: string, siteId?: string) => boolean
  rejectUser: (userId: string) => boolean
  deleteUser: (userId: string) => boolean
  toggleAdmin: (userId: string) => boolean
  toggleSiteAccess: (userId: string) => boolean
  toggleSystemAccess: (userId: string) => boolean
  updateUserPhoto: (userId: string, photo: string) => boolean
  onlineUserIds: string[]
  sessionsLog: UserSession[]
  activityLogs: ActivityLog[]
  refreshActivity: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => authStore.getSession())
  const [allUsers, setAllUsers] = useState<User[]>(() => authStore.getUsers())
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>(() => authStore.getOnlineUserIds())
  const [sessionsLog, setSessionsLog] = useState<UserSession[]>(() => authStore.getSessionsLog())
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => authStore.getActivityLogs())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      setIsLoading(true)
      try {
        await authStore.initialize()
        // Migrate old accounts that don't have status/role fields
        authStore.migrateExistingUsers()
        authStore.ensureDefaultSuperAdmin()
        if (isDemoBootstrapEnabled()) {
          // Demo-only bootstrap helpers are opt-in and disabled by default.
          authStore.seedSampleData()
          authStore.ensureSuperAdminAccess()
          authStore.ensureAdminSession()
        }
        // Ensure Super Admin role exists
        permissionStore.ensureSuperAdmin()
        const superAdminUser = authStore.getUsers().find(u => u.email.toLowerCase() === 'superadmin@ivos.sn')
        if (superAdminUser) {
          permissionStore.setRole(superAdminUser.id, 'SuperAdmin')
        }
        setUser(authStore.getSession())
        setAllUsers(authStore.getUsers())
        setOnlineUserIds(authStore.getOnlineUserIds())
        setSessionsLog(authStore.getSessionsLog())
        setActivityLogs(authStore.getActivityLogs())
      } finally {
        setIsLoading(false)
      }
    })()
    const syncAuthState = () => {
      setUser(authStore.getSession())
      setAllUsers(authStore.getUsers())
      setOnlineUserIds(authStore.getOnlineUserIds())
    }
    window.addEventListener('auth:updated', syncAuthState)
    return () => window.removeEventListener('auth:updated', syncAuthState)
  }, [])

  const refreshUsers = useCallback(() => {
    setAllUsers(authStore.getUsers())
  }, [])

  const refreshActivity = useCallback(() => {
    setOnlineUserIds(authStore.getOnlineUserIds())
    setSessionsLog(authStore.getSessionsLog())
    setActivityLogs(authStore.getActivityLogs())
  }, [])

  const login = (email: string, password: string) => {
    const result = authStore.login(email, password)
    if (result.success && result.user) {
      setUser(result.user)
      refreshActivity()
    }
    return result
  }

  const register = (fullName: string, email: string, password: string) => {
    const result = authStore.register(fullName, email, password)
    if (result.success) refreshUsers()
    return result
  }

  const logout = () => {
    authStore.logout()
    setUser(null)
    refreshActivity()
  }

  const approveUser = (userId: string, fonction: string, makeAdmin: boolean, countryId?: string, siteId?: string) => {
    const ok = authStore.approveUser(userId, fonction, makeAdmin, countryId, siteId)
    if (ok) refreshUsers()
    return ok
  }

  const rejectUser = (userId: string) => {
    const ok = authStore.rejectUser(userId)
    if (ok) refreshUsers()
    return ok
  }

  const deleteUser = (userId: string) => {
    const ok = authStore.deleteUser(userId)
    if (ok) refreshUsers()
    return ok
  }

  const toggleAdmin = (userId: string) => {
    const ok = authStore.toggleAdmin(userId)
    if (ok) refreshUsers()
    return ok
  }

  const toggleSiteAccess = (userId: string) => {
    const ok = authStore.toggleSiteAccess(userId)
    if (ok) {
      refreshUsers()
      refreshActivity()
    }
    return ok
  }

  const toggleSystemAccess = (userId: string) => {
    const ok = authStore.toggleSystemAccess(userId)
    if (ok) {
      setUser(authStore.getSession())
      refreshUsers()
      refreshActivity()
    }
    return ok
  }

  const updateUserPhoto = (userId: string, photo: string) => {
    const ok = authStore.updateUserPhoto(userId, photo)
    if (ok) refreshUsers()
    return ok
  }

  const isAdmin = authStore.isAdmin(user)
  const pendingUsers = allUsers.filter(u => u.status === 'pending')

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAdmin, pendingUsers, allUsers, refreshUsers, approveUser, rejectUser, deleteUser, toggleAdmin, toggleSiteAccess, toggleSystemAccess, updateUserPhoto, onlineUserIds, sessionsLog, activityLogs, refreshActivity, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
