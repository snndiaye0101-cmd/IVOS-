import { supabase } from './supabaseClient'

type RuntimeGlobal = {
  process?: {
    env?: Record<string, string>
  }
}

type DbSession = {
  user_id: string
  login_at: string
  logout_at: string | null
  duration_minutes: number | null
}

type DbActivity = {
  id: string
  user_id: string
  user_name: string
  action: ActivityLog['action']
  module: string
  details: string
  timestamp: string
}

function readViteEnv() {
  try {
    return Function('return (typeof import.meta !== "undefined" && import.meta.env) ? import.meta.env : undefined')()
  } catch {
    return undefined
  }
}

function readRuntimeEnv(): Record<string, string> {
  const runtime = globalThis as unknown as RuntimeGlobal
  return runtime.process?.env || {}
}

function isDemoAuthBootstrapEnabled(): boolean {
  // Demo bootstrap is disabled by default and must be explicitly enabled.
  const viteEnv = readViteEnv() as Record<string, string> | undefined
  const runtimeEnv = readRuntimeEnv()
  const flag = viteEnv?.VITE_ENABLE_DEMO_AUTH_BOOTSTRAP || runtimeEnv.VITE_ENABLE_DEMO_AUTH_BOOTSTRAP
  return flag === 'true'
}

function canRunUnsafeBootstrap(): boolean {
  const viteEnv = readViteEnv() as Record<string, string> | undefined
  const runtimeEnv = readRuntimeEnv()
  const nodeEnv = runtimeEnv.NODE_ENV || viteEnv?.MODE || 'development'
  return nodeEnv !== 'production' && isDemoAuthBootstrapEnabled()
}

export interface User {
  id: string
  fullName: string
  email: string
  role: string
  fonction: string
  photo?: string
  status: 'approved' | 'pending' | 'rejected'
  siteAccessBlocked?: boolean
  systemAccessBlocked?: boolean
  createdAt: string
  countryId?: string
  siteId?: string
}

export interface UserSession {
  userId: string
  loginAt: string
  logoutAt: string | null
  durationMinutes: number | null
}

export interface ActivityLog {
  id: string
  userId: string
  userName: string
  action: 'create' | 'edit' | 'delete' | 'view' | 'login' | 'logout'
  module: string
  details: string
  timestamp: string
}

type DbUser = {
  id: string
  full_name: string
  email: string
  role: string
  fonction: string
  photo: string | null
  status: 'approved' | 'pending' | 'rejected'
  site_access_blocked: boolean
  system_access_blocked: boolean
  country_id: string | null
  site_id: string | null
  password_hash: string | null
  created_at: string
}

type FailedLoginMeta = {
  failedAttempts: number
  firstAttemptAt: string
  lockoutUntil: string | null
}

type SessionMeta = {
  lastActivityAt: string
}

type LocalAuthSnapshot = {
  users: User[]
  passwordEntries: Array<[string, string]>
  sessions: UserSession[]
  sessionMeta: Record<string, SessionMeta>
  failedLoginMeta: Record<string, FailedLoginMeta>
  activity: ActivityLog[]
  onlineUserIds: string[]
  currentSessionUserId: string | null
}

const AUTH_SNAPSHOT_KEY = 'ivos_auth_snapshot_v1'
const SESSION_TIMEOUT_MINUTES = 15
const MAX_FAILED_LOGIN_ATTEMPTS = 5
const FAILED_LOGIN_WINDOW_MINUTES = 15
const LOCKOUT_DURATION_MINUTES = 15

let usersCache: User[] = []
let passwordByUserId = new Map<string, string>()
let sessionsCache: UserSession[] = []
let sessionMetaByUserId = new Map<string, SessionMeta>()
let failedLoginMetaByEmail = new Map<string, FailedLoginMeta>()
let activityCache: ActivityLog[] = []
let onlineUserIdsCache: string[] = []
let currentSessionUserId: string | null = null

let hydrated = false
let hydratePromise: Promise<void> | null = null

function readLocalAuthSnapshot(): LocalAuthSnapshot | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(AUTH_SNAPSHOT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as LocalAuthSnapshot
  } catch {
    return null
  }
}

function writeLocalAuthSnapshot() {
  if (typeof localStorage === 'undefined') return
  try {
    const snapshot: LocalAuthSnapshot = {
      users: usersCache,
      passwordEntries: Array.from(passwordByUserId.entries()),
      sessions: sessionsCache,
      sessionMeta: Object.fromEntries(sessionMetaByUserId.entries()),
      failedLoginMeta: Object.fromEntries(failedLoginMetaByEmail.entries()),
      activity: activityCache,
      onlineUserIds: onlineUserIdsCache,
      currentSessionUserId,
    }
    localStorage.setItem(AUTH_SNAPSHOT_KEY, JSON.stringify(snapshot))
  } catch {
    // best effort only
  }
}

function getNow(): string {
  return new Date().toISOString()
}

function parseDate(value: string): Date {
  return new Date(value)
}

function getLockoutMessage(email: string): string {
  const meta = failedLoginMetaByEmail.get(email.toLowerCase())
  if (!meta || !meta.lockoutUntil) return ''
  const remainingMs = parseDate(meta.lockoutUntil).getTime() - Date.now()
  const remainingMinutes = Math.ceil(Math.max(remainingMs, 0) / 60000)
  return `Trop de tentatives de connexion. Réessayez dans ${remainingMinutes} minute(s).`
}

function purgeStaleFailedAttempts(email: string) {
  const meta = failedLoginMetaByEmail.get(email.toLowerCase())
  if (!meta) return
  if (meta.lockoutUntil) return
  const windowStart = Date.now() - FAILED_LOGIN_WINDOW_MINUTES * 60000
  if (parseDate(meta.firstAttemptAt).getTime() < windowStart) {
    failedLoginMetaByEmail.delete(email.toLowerCase())
  }
}

function setFailedLogin(email: string) {
  const normalized = email.toLowerCase()
  const now = getNow()
  const meta = failedLoginMetaByEmail.get(normalized)

  if (!meta) {
    failedLoginMetaByEmail.set(normalized, {
      failedAttempts: 1,
      firstAttemptAt: now,
      lockoutUntil: null,
    })
    return
  }

  const lastWindowStart = Date.now() - FAILED_LOGIN_WINDOW_MINUTES * 60000
  if (parseDate(meta.firstAttemptAt).getTime() < lastWindowStart) {
    meta.failedAttempts = 1
    meta.firstAttemptAt = now
    meta.lockoutUntil = null
  } else {
    meta.failedAttempts += 1
    if (meta.failedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      meta.lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60000).toISOString()
    }
  }
  failedLoginMetaByEmail.set(normalized, meta)
}

function clearFailedLogin(email: string) {
  failedLoginMetaByEmail.delete(email.toLowerCase())
}

function getSessionMeta(userId: string): SessionMeta {
  return sessionMetaByUserId.get(userId) || { lastActivityAt: getNow() }
}

function updateSessionActivity(userId: string) {
  sessionMetaByUserId.set(userId, { lastActivityAt: getNow() })
}

function isSessionExpired(userId: string): boolean {
  const meta = sessionMetaByUserId.get(userId)
  if (!meta) return true
  const lastActivity = parseDate(meta.lastActivityAt).getTime()
  return Date.now() - lastActivity > SESSION_TIMEOUT_MINUTES * 60000
}

function setOnlineLocal(userId: string, online: boolean) {
  const set = new Set(onlineUserIdsCache)
  if (online) set.add(userId)
  else set.delete(userId)
  onlineUserIdsCache = [...set]
}

function expireIdleSession() {
  if (!currentSessionUserId) return false
  if (!isSessionExpired(currentSessionUserId)) return false
  const userId = currentSessionUserId
  currentSessionUserId = null
  sessionMetaByUserId.delete(userId)
  setOnlineLocal(userId, false)
  writeLocalAuthSnapshot()
  try {
    window.dispatchEvent(new Event('auth:updated'))
  } catch {
    // no-op
  }
  return true
}

function emitAuthUpdated() {
  writeLocalAuthSnapshot()
  try {
    window.dispatchEvent(new Event('auth:updated'))
  } catch {
    // no-op
  }
}

function toUser(row: DbUser): User {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    fonction: row.fonction || '',
    photo: row.photo || undefined,
    status: row.status,
    siteAccessBlocked: row.site_access_blocked,
    systemAccessBlocked: row.system_access_blocked,
    createdAt: row.created_at,
    countryId: row.country_id || undefined,
    siteId: row.site_id || undefined,
  }
}

function ensureHydrated() {
  if (hydrated) return
  if (!hydratePromise) {
    hydratePromise = authStore.initialize().finally(() => {
      hydratePromise = null
    })
  }
}

async function persistUsers(users: User[]) {
  const payload = users.map(u => ({
    id: u.id,
    full_name: u.fullName,
    email: u.email,
    role: u.role,
    fonction: u.fonction,
    photo: u.photo || null,
    status: u.status,
    site_access_blocked: !!u.siteAccessBlocked,
    system_access_blocked: !!u.systemAccessBlocked,
    country_id: u.countryId || null,
    site_id: u.siteId || null,
    password_hash: passwordByUserId.get(u.id) || null,
    created_at: u.createdAt,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase.from('app_users').upsert(payload, { onConflict: 'id' })
  if (error) console.error('Failed to persist app_users', error)
}

async function persistSessions() {
  const payload = sessionsCache.map(s => ({
    user_id: s.userId,
    login_at: s.loginAt,
    logout_at: s.logoutAt,
    duration_minutes: s.durationMinutes,
  }))

  const { error } = await supabase.from('app_user_sessions').insert(payload)
  if (error) {
    // insert can duplicate often in this compatibility mode, keep non-blocking
    console.warn('Failed to persist app_user_sessions', error)
  }
}

async function persistActivity(log: ActivityLog) {
  const { error } = await supabase.from('app_user_activity_logs').insert({
    id: log.id,
    user_id: log.userId,
    user_name: log.userName,
    action: log.action,
    module: log.module,
    details: log.details,
    timestamp: log.timestamp,
  })
  if (error) console.warn('Failed to persist app_user_activity_logs', error)
}

function syncCachesAfterMutation() {
  emitAuthUpdated()
  void persistUsers(usersCache)
}

export const authStore = {
  async initialize() {
    if (hydrated) return

    const [usersResult, sessionsResult, activityResult] = await Promise.all([
      supabase.from('app_users').select('*').order('created_at', { ascending: true }),
      supabase.from('app_user_sessions').select('user_id, login_at, logout_at, duration_minutes').order('login_at', { ascending: false }).limit(1000),
      supabase.from('app_user_activity_logs').select('id, user_id, user_name, action, module, details, timestamp').order('timestamp', { ascending: false }).limit(1000),
    ])

    if (!usersResult.error) {
      usersCache = (usersResult.data || []).map(toUser)
      passwordByUserId = new Map((usersResult.data || []).map((u: DbUser) => [u.id, u.password_hash || '']))
    }

    if (!sessionsResult.error) {
      sessionsCache = (sessionsResult.data || []).map((s: DbSession) => ({
        userId: s.user_id,
        loginAt: s.login_at,
        logoutAt: s.logout_at,
        durationMinutes: s.duration_minutes,
      }))
    }

    if (!activityResult.error) {
      activityCache = (activityResult.data || []).map((a: DbActivity) => ({
        id: a.id,
        userId: a.user_id,
        userName: a.user_name,
        action: a.action,
        module: a.module,
        details: a.details,
        timestamp: a.timestamp,
      }))
    }

    if (usersResult.error || sessionsResult.error || activityResult.error) {
      const local = readLocalAuthSnapshot()
      if (local) {
        usersCache = local.users || []
        passwordByUserId = new Map(local.passwordEntries || [])
        sessionsCache = local.sessions || []
        sessionMetaByUserId = new Map(Object.entries(local.sessionMeta || {}))
        failedLoginMetaByEmail = new Map(Object.entries(local.failedLoginMeta || {}))
        activityCache = local.activity || []
        onlineUserIdsCache = local.onlineUserIds || []
        currentSessionUserId = local.currentSessionUserId || null
      }
    }

    hydrated = true
    emitAuthUpdated()
  },

  getUsers(): User[] {
    ensureHydrated()
    return usersCache
  },

  saveUsers(users: User[]) {
    usersCache = users
    syncCachesAfterMutation()
  },

  migrateExistingUsers() {
    const users = this.getUsers()
    let changed = false
    users.forEach(u => {
      if (!u.status) {
        u.status = 'approved'
        changed = true
      }
      if (!u.role) {
        u.role = 'Utilisateur'
        changed = true
      }
      if (u.fonction === undefined) {
        u.fonction = ''
        changed = true
      }
      if (u.siteAccessBlocked === undefined) {
        u.siteAccessBlocked = false
        changed = true
      }
      if (u.systemAccessBlocked === undefined) {
        u.systemAccessBlocked = false
        changed = true
      }
    })

    const firstReal = users.find(u => !u.id.startsWith('sample_'))
    if (firstReal && (firstReal.role !== 'Admin' || firstReal.status !== 'approved')) {
      firstReal.role = 'Admin'
      firstReal.status = 'approved'
      changed = true
    }

    if (changed) this.saveUsers(users)
  },

  ensureAdminSession() {
    if (!canRunUnsafeBootstrap()) return
    if (this.getSession()) return
    const users = this.getUsers()
    const realAdmin = users.find(
      u => u.role === 'Admin' && u.status === 'approved' && !u.systemAccessBlocked
    )

    if (realAdmin) {
      currentSessionUserId = realAdmin.id
      this.startSession(realAdmin.id)
      this.setOnline(realAdmin.id, true)
      emitAuthUpdated()
      return
    }

    if (users.length > 0) return

    const admin: User = {
      id: (globalThis.crypto?.randomUUID?.() || `admin_${Date.now()}`),
      fullName: 'Administrateur IVOS',
      email: 'admin@ivos.sn',
      role: 'Admin',
      fonction: 'Directeur Général',
      status: 'approved',
      siteAccessBlocked: false,
      systemAccessBlocked: false,
      createdAt: new Date().toISOString(),
    }

    usersCache = [admin]
    // ⚠️ SECURITY: Demo password is base64-encoded (not hashed!)
    // Change VITE_AUTH_DEMO_PASSWORD in .env for each environment
    const viteEnv = readViteEnv() as Record<string, string> | undefined
    const demoPassword = viteEnv?.VITE_AUTH_DEMO_PASSWORD || 'admin'
    passwordByUserId.set(admin.id, btoa(demoPassword))
    currentSessionUserId = admin.id
    this.startSession(admin.id)
    this.setOnline(admin.id, true)
    syncCachesAfterMutation()
  },

  ensureSuperAdminAccess() {
    if (!canRunUnsafeBootstrap()) return
    const users = this.getUsers()
    const superAdminEmail = 'superadmin@ivos.sn'
    // ⚠️ SECURITY: Password is base64-encoded (not hashed!)
    // Change VITE_AUTH_DEMO_PASSWORD in .env for each environment
    const viteEnv = readViteEnv() as Record<string, string> | undefined
    const superAdminPassword = viteEnv?.VITE_AUTH_DEMO_PASSWORD || 'SuperAdmin@IVOS2026'
    const existing = users.find(u => u.email.toLowerCase() === superAdminEmail)

    if (!existing) {
      const superAdmin: User = {
        id: globalThis.crypto?.randomUUID?.() || `super_admin_${Date.now()}`,
        fullName: 'Super Administrateur IVOS',
        email: superAdminEmail,
        role: 'Admin',
        fonction: 'Super Admin',
        status: 'approved',
        siteAccessBlocked: false,
        systemAccessBlocked: false,
        createdAt: new Date().toISOString(),
      }
      users.push(superAdmin)
      passwordByUserId.set(superAdmin.id, btoa(superAdminPassword))
      this.saveUsers(users)
      return
    }

    let changed = false
    if (existing.role !== 'Admin') {
      existing.role = 'Admin'
      changed = true
    }
    if (existing.status !== 'approved') {
      existing.status = 'approved'
      changed = true
    }
    if (existing.systemAccessBlocked) {
      existing.systemAccessBlocked = false
      changed = true
    }
    if (existing.siteAccessBlocked) {
      existing.siteAccessBlocked = false
      changed = true
    }
    if (!passwordByUserId.get(existing.id)) {
      passwordByUserId.set(existing.id, btoa(superAdminPassword))
      changed = true
    }

    if (changed) {
      this.saveUsers(users)
    }
  },

  ensureSuperAdminLocal() {
    const viteEnv = readViteEnv() as Record<string, string> | undefined
    if (viteEnv?.DEV !== 'true') return
    const users = this.getUsers()
    const superAdminEmail = 'superadmin@ivos.sn'
    const superAdminPassword = viteEnv?.VITE_AUTH_DEMO_PASSWORD || 'SuperAdmin@IVOS2026'
    const existing = users.find(u => u.email.toLowerCase() === superAdminEmail)

    if (!existing) {
      const superAdmin: User = {
        id: globalThis.crypto?.randomUUID?.() || `super_admin_${Date.now()}`,
        fullName: 'Super Administrateur IVOS',
        email: superAdminEmail,
        role: 'Admin',
        fonction: 'Super Admin',
        status: 'approved',
        siteAccessBlocked: false,
        systemAccessBlocked: false,
        createdAt: new Date().toISOString(),
      }
      users.push(superAdmin)
      passwordByUserId.set(superAdmin.id, btoa(superAdminPassword))
      this.saveUsers(users)
      return
    }

    let changed = false
    if (existing.role !== 'Admin') {
      existing.role = 'Admin'
      changed = true
    }
    if (existing.status !== 'approved') {
      existing.status = 'approved'
      changed = true
    }
    if (existing.systemAccessBlocked) {
      existing.systemAccessBlocked = false
      changed = true
    }
    if (existing.siteAccessBlocked) {
      existing.siteAccessBlocked = false
      changed = true
    }
    if (!passwordByUserId.get(existing.id)) {
      passwordByUserId.set(existing.id, btoa(superAdminPassword))
      changed = true
    }

    if (changed) {
      this.saveUsers(users)
    }
  },

  register(fullName: string, email: string, password: string): { success: boolean; error?: string } {
    const users = this.getUsers()
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, error: 'Un compte avec cet email existe déjà' }
    }

    const isFirstUser = !users.some(u => !u.id.startsWith('sample_'))
    const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}`
    const newUser: User = {
      id,
      fullName,
      email,
      role: isFirstUser ? 'Admin' : 'Utilisateur',
      fonction: '',
      status: isFirstUser ? 'approved' : 'pending',
      siteAccessBlocked: false,
      systemAccessBlocked: false,
      createdAt: new Date().toISOString(),
    }

    users.push(newUser)
    passwordByUserId.set(id, btoa(password))
    this.saveUsers(users)
    return { success: true }
  },

  login(email: string, password: string): { success: boolean; user?: User; error?: string; pending?: boolean } {
    const normalizedEmail = email.toLowerCase()
    const lockoutMeta = failedLoginMetaByEmail.get(normalizedEmail)
    if (lockoutMeta?.lockoutUntil) {
      if (parseDate(lockoutMeta.lockoutUntil).getTime() > Date.now()) {
        return { success: false, error: getLockoutMessage(normalizedEmail) }
      }
      failedLoginMetaByEmail.delete(normalizedEmail)
    }

    const users = this.getUsers()
    const user = users.find(u => u.email.toLowerCase() === normalizedEmail)
    if (!user) {
      setFailedLogin(normalizedEmail)
      emitAuthUpdated()
      return { success: false, error: 'Email ou mot de passe incorrect' }
    }

    const storedPwd = passwordByUserId.get(user.id)
    if (!storedPwd || atob(storedPwd) !== password) {
      setFailedLogin(normalizedEmail)
      emitAuthUpdated()
      return { success: false, error: 'Email ou mot de passe incorrect' }
    }

    if (user.systemAccessBlocked) {
      return { success: false, error: 'Accès système bloqué par le Super Admin' }
    }
    if (user.status === 'pending') {
      return { success: false, pending: true, error: 'Votre compte est en attente de validation par un administrateur' }
    }
    if (user.status === 'rejected') {
      return { success: false, error: 'Votre demande de compte a été refusée. Contactez un administrateur.' }
    }

    clearFailedLogin(normalizedEmail)
    currentSessionUserId = user.id
    this.startSession(user.id)
    this.setOnline(user.id, true)
    this.logActivity(user.id, user.fullName, 'login', 'Auth', 'Connexion au système')
    updateSessionActivity(user.id)
    emitAuthUpdated()
    return { success: true, user }
  },

  getSession(): User | null {
    if (expireIdleSession()) return null
    if (!currentSessionUserId) return null
    const user = this.getUsers().find(u => u.id === currentSessionUserId)
    if (!user) {
      currentSessionUserId = null
      emitAuthUpdated()
      return null
    }
    if (user.systemAccessBlocked) {
      this.setOnline(user.id, false)
      currentSessionUserId = null
      emitAuthUpdated()
      return null
    }
    updateSessionActivity(user.id)
    emitAuthUpdated()
    return user
  },

  logout() {
    const user = this.getSession()
    if (user) {
      this.endSession(user.id)
      this.setOnline(user.id, false)
      this.logActivity(user.id, user.fullName, 'logout', 'Auth', 'Déconnexion du système')
    }
    currentSessionUserId = null
    emitAuthUpdated()
  },

  getPendingUsers(): User[] {
    return this.getUsers().filter(u => u.status === 'pending')
  },

  getUserByEmail(email: string): User | undefined {
    return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase())
  },

  findLinkedUser(email?: string, fullName?: string): User | undefined {
    const users = this.getUsers()
    if (email) {
      const byEmail = users.find(u => u.email.toLowerCase() === email.toLowerCase())
      if (byEmail) return byEmail
    }
    if (fullName) {
      const normalized = fullName.trim().toLowerCase()
      return users.find(u => u.fullName.trim().toLowerCase() === normalized)
    }
    return undefined
  },

  isSiteAccessBlocked(email?: string, fullName?: string): boolean {
    const linked = this.findLinkedUser(email, fullName)
    return !!linked?.siteAccessBlocked
  },

  approveUser(userId: string, fonction: string, makeAdmin: boolean, countryId?: string, siteId?: string): boolean {
    const users = this.getUsers()
    const user = users.find(u => u.id === userId)
    if (!user) return false
    user.status = 'approved'
    user.fonction = fonction
    if (makeAdmin) user.role = 'Admin'
    if (countryId) user.countryId = countryId
    if (siteId) user.siteId = siteId
    this.saveUsers(users)
    return true
  },

  toggleAdmin(userId: string): boolean {
    const users = this.getUsers()
    const user = users.find(u => u.id === userId)
    if (!user) return false
    user.role = user.role === 'Admin' ? 'Utilisateur' : 'Admin'
    this.saveUsers(users)
    return true
  },

  toggleSiteAccess(userId: string): boolean {
    const users = this.getUsers()
    const user = users.find(u => u.id === userId)
    if (!user) return false
    user.siteAccessBlocked = !user.siteAccessBlocked
    this.saveUsers(users)
    return true
  },

  toggleSystemAccess(userId: string): boolean {
    const users = this.getUsers()
    const user = users.find(u => u.id === userId)
    if (!user) return false

    user.systemAccessBlocked = !user.systemAccessBlocked
    this.saveUsers(users)

    if (user.systemAccessBlocked) {
      this.setOnline(user.id, false)
      if (currentSessionUserId === user.id) {
        currentSessionUserId = null
      }
    }

    emitAuthUpdated()
    return true
  },

  updateUserPhoto(userId: string, photo: string): boolean {
    const users = this.getUsers()
    const user = users.find(u => u.id === userId)
    if (!user) return false
    user.photo = photo
    this.saveUsers(users)
    return true
  },

  rejectUser(userId: string): boolean {
    const users = this.getUsers()
    const user = users.find(u => u.id === userId)
    if (!user) return false
    user.status = 'rejected'
    this.saveUsers(users)
    return true
  },

  deleteUser(userId: string): boolean {
    usersCache = this.getUsers().filter(u => u.id !== userId)
    passwordByUserId.delete(userId)
    if (currentSessionUserId === userId) currentSessionUserId = null
    syncCachesAfterMutation()
    return true
  },

  isAdmin(user: User | null): boolean {
    return user?.role === 'Admin'
  },

  startSession(userId: string) {
    const entry: UserSession = {
      userId,
      loginAt: new Date().toISOString(),
      logoutAt: null,
      durationMinutes: null,
    }
    sessionsCache = [entry, ...sessionsCache]
    sessionMetaByUserId.set(userId, { lastActivityAt: getNow() })
    void persistSessions()
  },

  endSession(userId: string) {
    sessionsCache = sessionsCache.map(s => {
      if (s.userId !== userId || s.logoutAt) return s
      const logoutAt = new Date().toISOString()
      const durationMinutes = Math.round((new Date(logoutAt).getTime() - new Date(s.loginAt).getTime()) / 60000)
      return { ...s, logoutAt, durationMinutes }
    })
    void persistSessions()
  },

  getSessionsLog(): UserSession[] {
    ensureHydrated()
    return sessionsCache
  },

  setOnline(userId: string, online: boolean) {
    const set = new Set(onlineUserIdsCache)
    if (online) set.add(userId)
    else set.delete(userId)
    onlineUserIdsCache = [...set]
  },

  getOnlineUserIds(): string[] {
    ensureHydrated()
    return onlineUserIdsCache
  },

  logActivity(userId: string, userName: string, action: ActivityLog['action'], module: string, details: string) {
    const log: ActivityLog = {
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId,
      userName,
      action,
      module,
      details,
      timestamp: new Date().toISOString(),
    }
    activityCache = [log, ...activityCache].slice(0, 500)
    void persistActivity(log)
  },

  getActivityLogs(): ActivityLog[] {
    ensureHydrated()
    return activityCache
  },

  seedSampleData() {
    if (!canRunUnsafeBootstrap()) return
    if (this.getUsers().length > 0) return

    const now = Date.now()
    const day = 86400000

    const pendingSamples: User[] = [
      { id: 'sample_1', fullName: 'Aminata Diallo', email: 'aminata.diallo@ivos.sn', role: 'Utilisateur', fonction: '', status: 'pending', siteAccessBlocked: false, systemAccessBlocked: false, createdAt: new Date(now - 2 * day).toISOString() },
      { id: 'sample_2', fullName: 'Moussa Ndiaye', email: 'moussa.ndiaye@ivos.sn', role: 'Utilisateur', fonction: '', status: 'pending', siteAccessBlocked: false, systemAccessBlocked: false, createdAt: new Date(now - day).toISOString() },
    ]

    const approvedSamples: User[] = [
      { id: 'sample_10', fullName: 'Ousmane Ba', email: 'ousmane.ba@ivos.sn', role: 'Utilisateur', fonction: 'Chauffeur', status: 'approved', siteAccessBlocked: false, systemAccessBlocked: false, createdAt: new Date(now - 30 * day).toISOString() },
      { id: 'sample_12', fullName: 'Cheikh Sarr', email: 'cheikh.sarr@ivos.sn', role: 'Utilisateur', fonction: 'Mécanicien', status: 'approved', siteAccessBlocked: false, systemAccessBlocked: false, createdAt: new Date(now - 20 * day).toISOString() },
    ]

    const all = [...pendingSamples, ...approvedSamples]
    all.forEach(u => passwordByUserId.set(u.id, btoa('admin')))
    usersCache = all
    onlineUserIdsCache = ['sample_10', 'sample_12']
    syncCachesAfterMutation()
  },
}
