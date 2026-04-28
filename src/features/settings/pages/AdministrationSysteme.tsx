// ═══════════════════════════════════════════════════════════════
// ADMINISTRATION SYSTÈME - REFACTORED MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../../../shared/contexts/AuthContext'
import { useViewAs } from '../../../shared/contexts/ViewAsContext'
import { permissionStore, type AppModule, type PermissionLevel } from '../../../shared/services/permissionStore'
import { auditService, type AuditEntry } from '../../../shared/services/auditService'
import { criticalActionService, type CriticalActionRequest } from '../../../shared/services/criticalActionService'
import { userAnalyticsService, type UserActivityLog } from '../../../shared/services/userAnalyticsService'

// Components
import { UsersTab } from '../components/UsersTab'
import { SuperAdminsTab } from '../components/SuperAdminsTab'
import { Avatar, SearchFilter, StatCard, StatusBadge } from '../components/AdminSharedComponents'

// Constants & Utilities
import { ADMIN_TABS_CONFIG, type AdminTab } from '../components/adminConstants'
import { getTabIcon } from '../components/adminIcons'

// Shared Components
import { AlertCircle, LogOut } from 'lucide-react'

type MergedLogRow = {
  id: string
  source: 'audit' | 'analytics'
  timestamp: string
  userName: string
  action: string
  module: string
  entity: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
}

type ActionResult = { success: boolean; message: string }

const APP_MODULES: AppModule[] = ['dashboard', 'fleet', 'exploitation', 'finances', 'technique', 'rh', 'parametres', 'chat', 'hub_carburant']

// ──────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────────────────────
export default function AdministrationSysteme() {
  // Context
  const {
    user,
    allUsers,
    onlineUserIds,
    sessionsLog,
    pendingUsers,
    approveUser,
    rejectUser,
    deleteUser,
    toggleAdmin,
    toggleSystemAccess,
    register,
    refreshUsers,
  } = useAuth()
  const { isImpersonating, deactivate: clearViewingAs, effectiveUserId: isViewingAs } = useViewAs()

  // State
  const [activeTab, setActiveTab] = useState<AdminTab>('users-permissions')
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])
  const [criticalRequests, setCriticalRequests] = useState<CriticalActionRequest[]>([])
  const [analyticsActivityLogs, setAnalyticsActivityLogs] = useState<UserActivityLog[]>([])
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<string>('')
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({})
  const [permissionsSaved, setPermissionsSaved] = useState(false)
  const [activitySearchText, setActivitySearchText] = useState('')
  const [activitySourceFilter, setActivitySourceFilter] = useState<'all' | 'audit' | 'analytics'>('all')
  const [activitySeverityFilter, setActivitySeverityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all')
  const [activityUserFilter, setActivityUserFilter] = useState<'all' | string>('all')
  const [activityModuleFilter, setActivityModuleFilter] = useState<'all' | string>('all')
  const [activityEntityFilter, setActivityEntityFilter] = useState<'all' | string>('all')
  const [activityVisibleCount, setActivityVisibleCount] = useState(80)

  // Computed - Permission checks
  const isSuperAdmin = useMemo(() => {
    return user ? permissionStore.isSuperAdmin(user.id) : false
  }, [user])

  // Computed - User lists
  const approvedUsers = useMemo(() => allUsers.filter((u: { id: string; status: string }) => u.status === 'approved'), [allUsers])
  const onlineUsers = useMemo(() => approvedUsers.filter((u: { id: string }) => onlineUserIds.includes(u.id)), [approvedUsers, onlineUserIds])
  const offlineUsers = useMemo(() => approvedUsers.filter((u: { id: string }) => !onlineUserIds.includes(u.id)), [approvedUsers, onlineUserIds])
  const superAdminsList = useMemo(() => approvedUsers.filter((u: { id: string }) => permissionStore.isSuperAdmin(u.id)), [approvedUsers])
  const superAdminAuditEntries = useMemo(() => auditEntries.filter((e: AuditEntry) => superAdminsList.some((sa: { id: string }) => sa.id === e.userId)), [auditEntries, superAdminsList])

  // Computed - Activity metrics
  const weeklyHours = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const minutes = sessionsLog
      .filter((s: { loginAt: string; durationMinutes?: number }) => new Date(s.loginAt).getTime() >= weekAgo)
      .reduce((sum: number, s: { durationMinutes?: number }) => sum + (s.durationMinutes || 0), 0)
    return Math.round((minutes / 60) * 10) / 10
  }, [sessionsLog])

  const monthlyHours = useMemo(() => {
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const minutes = sessionsLog
      .filter((s: { loginAt: string; durationMinutes?: number }) => new Date(s.loginAt).getTime() >= monthAgo)
      .reduce((sum: number, s: { durationMinutes?: number }) => sum + (s.durationMinutes || 0), 0)
    return Math.round((minutes / 60) * 10) / 10
  }, [sessionsLog])

  const globalMetrics = useMemo(() => {
    const now = new Date()
    const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000
    const weekLogs = analyticsActivityLogs.filter((log: UserActivityLog) => new Date(log.timestamp).getTime() >= weekAgo)
    const weekSessions = sessionsLog.filter((s: { loginAt: string }) => new Date(s.loginAt).getTime() >= weekAgo)
    const activeUsersSet = new Set(weekLogs.map((log: UserActivityLog) => log.userId))

    return {
      totalUsers: approvedUsers.length,
      activeUsers: activeUsersSet.size,
      totalSessions: weekSessions.length,
      averageSessionDuration: weekSessions.length > 0 ? Math.round(weekSessions.reduce((sum: number, s: any) => sum + (s.durationMinutes || 0), 0) / weekSessions.length) : 0,
      totalActions: weekLogs.length,
    }
  }, [approvedUsers, analyticsActivityLogs, sessionsLog])

  const activityModuleOptions = useMemo(() => {
    const labels = new Set<string>()
    auditEntries.forEach((entry: AuditEntry) => labels.add(entry.module || 'N/A'))
    analyticsActivityLogs.forEach((log: UserActivityLog) => labels.add(log.module || 'N/A'))
    return ['all', ...Array.from(labels).sort((a, b) => a.localeCompare(b, 'fr'))]
  }, [auditEntries, analyticsActivityLogs])

  const activityEntityOptions = useMemo(() => {
    const labels = new Set<string>()
    auditEntries.forEach((entry: AuditEntry) => labels.add(entry.entity || 'N/A'))
    return ['all', ...Array.from(labels).sort((a, b) => a.localeCompare(b, 'fr'))]
  }, [auditEntries])

  const filteredActivityLogs = useMemo(() => {
    const merged: MergedLogRow[] = [
      ...auditEntries.map((entry: AuditEntry) => ({
        id: `audit-${entry.id || entry.timestamp}`,
        source: 'audit' as const,
        timestamp: entry.timestamp,
        userName: entry.userName,
        action: entry.action,
        module: entry.module,
        entity: entry.entity || 'N/A',
        severity: entry.severity,
        description: entry.description,
      })),
      ...analyticsActivityLogs.map((log: UserActivityLog) => ({
        id: `analytics-${log.id}`,
        source: 'analytics' as const,
        timestamp: log.timestamp,
        userName: log.userName,
        action: log.action,
        module: log.module,
        entity: 'N/A',
        severity: log.severity,
        description: log.details,
      })),
    ]

    let result = merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    if (activitySourceFilter !== 'all') {
      result = result.filter(row => row.source === activitySourceFilter)
    }
    if (activitySeverityFilter !== 'all') {
      result = result.filter(row => row.severity === activitySeverityFilter)
    }
    if (activityUserFilter !== 'all') {
      result = result.filter(row => row.userName === activityUserFilter)
    }
    if (activityModuleFilter !== 'all') {
      result = result.filter(row => row.module === activityModuleFilter)
    }
    if (activityEntityFilter !== 'all') {
      result = result.filter(row => row.entity === activityEntityFilter)
    }
    if (activitySearchText.trim()) {
      const q = activitySearchText.toLowerCase()
      result = result.filter(
        row =>
          row.userName.toLowerCase().includes(q) ||
          row.action.toLowerCase().includes(q) ||
          row.module.toLowerCase().includes(q) ||
          row.entity.toLowerCase().includes(q) ||
          row.description.toLowerCase().includes(q),
      )
    }

    return result
  }, [auditEntries, analyticsActivityLogs, activitySourceFilter, activitySeverityFilter, activityUserFilter, activityModuleFilter, activityEntityFilter, activitySearchText])

  const displayedActivityLogs = useMemo(() => {
    return filteredActivityLogs.slice(0, activityVisibleCount)
  }, [filteredActivityLogs, activityVisibleCount])

  const topUsersStats = useMemo(() => {
    const stats = approvedUsers.map((user: { id: string }) => {
      const userLogs = analyticsActivityLogs.filter((log: UserActivityLog) => log.userId === user.id)
      const userSessions = sessionsLog.filter((s: { userId: string; loginAt: string; durationMinutes?: number }) => s.userId === user.id && new Date(s.loginAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      const hours = userSessions.reduce((sum: number, s: { durationMinutes?: number }) => sum + (s.durationMinutes || 0), 0) / 60

      return {
        user,
        actions: userLogs.length,
        sessions: userSessions.length,
        hours: Math.round(hours * 10) / 10,
      }
    })
    return stats.sort((a, b) => b.actions - a.actions)
  }, [approvedUsers, analyticsActivityLogs, sessionsLog])

  const criticalUserJournal = useMemo(() => {
    const criticalKeywords = ['budget', 'operation', 'suppression', 'delete']
    return filteredActivityLogs.filter(row => {
      const description = `${row.action} ${row.module} ${row.description}`.toLowerCase()
      const hasCriticalKeyword = criticalKeywords.some(keyword => description.includes(keyword))
      return row.severity === 'critical' || hasCriticalKeyword
    }).slice(0, 30)
  }, [filteredActivityLogs])

  useEffect(() => {
    setActivityVisibleCount(80)
  }, [activitySearchText, activitySourceFilter, activitySeverityFilter, activityUserFilter, activityModuleFilter, activityEntityFilter])

  useEffect(() => {
    if (!selectedUserForPerms) return
    const currentPerms = permissionStore.getPermissions(selectedUserForPerms)
    const next: Record<string, boolean> = {}

    APP_MODULES.forEach(module => {
      const level = currentPerms[module]
      next[`${module}:view`] = level === 'view' || level === 'edit' || level === 'all'
      next[`${module}:edit`] = level === 'edit' || level === 'all'
      next[`${module}:create`] = level === 'edit' || level === 'all'
      next[`${module}:delete`] = level === 'all'
    })

    setUserPermissions(next)
  }, [selectedUserForPerms, allUsers])

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [audit, critical, analytics] = await Promise.all([
          auditService.getAll(),
          criticalActionService.getAll?.() || Promise.resolve([]),
          userAnalyticsService.getAllActivityLogs?.() || Promise.resolve([]),
        ])
        setAuditEntries(audit || [])
        setCriticalRequests(critical || [])
        setAnalyticsActivityLogs(analytics || [])
      } catch (error) {
        console.error('Error loading admin data:', error)
      }
    }

    loadData()
    const handleUpdate = loadData
    window.addEventListener('audit:updated', handleUpdate)
    window.addEventListener('critical:updated', handleUpdate)
    window.addEventListener('analytics:updated', handleUpdate)

    return () => {
      window.removeEventListener('audit:updated', handleUpdate)
      window.removeEventListener('critical:updated', handleUpdate)
      window.removeEventListener('analytics:updated', handleUpdate)
    }
  }, [])

  // Event handlers
  const handleApproveUser = useCallback(async (userId: string): Promise<ActionResult> => {
    try {
      const ok = approveUser(userId, '', false)
      if (!ok) {
        return { success: false, message: 'Impossible d\'approuver cet utilisateur.' }
      }
      refreshUsers()
      await auditService.log({ userId: user?.id || '', userName: user?.fullName || 'System', userRole: user?.role || '', action: 'approval', module: 'rh', entity: 'User', entityId: userId, description: `Approved user: ${userId}`, oldValue: null, newValue: null, severity: 'medium' })
      return { success: true, message: 'Utilisateur approuvé.' }
    } catch (error) {
      console.error('Error:', error)
      return { success: false, message: 'Erreur pendant l\'approbation.' }
    }
  }, [approveUser, refreshUsers, user?.id, user?.fullName, user?.role])

  const handleRejectUser = useCallback(async (userId: string): Promise<ActionResult> => {
    try {
      const ok = rejectUser(userId)
      if (!ok) {
        return { success: false, message: 'Impossible de rejeter cet utilisateur.' }
      }
      refreshUsers()
      await auditService.log({ userId: user?.id || '', userName: user?.fullName || 'System', userRole: user?.role || '', action: 'rejection', module: 'rh', entity: 'User', entityId: userId, description: `Rejected user: ${userId}`, oldValue: null, newValue: null, severity: 'medium' })
      return { success: true, message: 'Utilisateur rejeté.' }
    } catch (error) {
      console.error('Error:', error)
      return { success: false, message: 'Erreur pendant le rejet.' }
    }
  }, [rejectUser, refreshUsers, user?.id, user?.fullName, user?.role])

  const handleDeleteUser = useCallback(async (userId: string): Promise<ActionResult> => {
    try {
      const ok = deleteUser(userId)
      if (!ok) {
        return { success: false, message: 'Suppression impossible.' }
      }
      refreshUsers()
      if (selectedUserForPerms === userId) {
        setSelectedUserForPerms('')
      }
      await auditService.log({ userId: user?.id || '', userName: user?.fullName || 'System', userRole: user?.role || '', action: 'delete', module: 'rh', entity: 'User', entityId: userId, description: `Deleted user: ${userId}`, oldValue: null, newValue: null, severity: 'high' })
      return { success: true, message: 'Utilisateur supprimé.' }
    } catch (error) {
      console.error('Error:', error)
      return { success: false, message: 'Erreur pendant la suppression.' }
    }
  }, [deleteUser, refreshUsers, selectedUserForPerms, user?.id, user?.fullName, user?.role])

  const handleToggleAdmin = useCallback(async (userId: string, isAdmin: boolean): Promise<ActionResult> => {
    try {
      const ok = toggleAdmin(userId)
      if (!ok) {
        return { success: false, message: 'Modification de rôle impossible.' }
      }
      refreshUsers()
      await auditService.log({ userId: user?.id || '', userName: user?.fullName || 'System', userRole: user?.role || '', action: 'role_change', module: 'parametres', entity: 'User', entityId: userId, description: `Toggled admin: ${userId}`, oldValue: { isAdmin: !isAdmin }, newValue: { isAdmin }, severity: 'critical' })
      return { success: true, message: `Rôle utilisateur mis à jour (${isAdmin ? 'Admin' : 'Utilisateur'}).` }
    } catch (error) {
      console.error('Error:', error)
      return { success: false, message: 'Erreur pendant la modification du rôle.' }
    }
  }, [toggleAdmin, refreshUsers, user?.id, user?.fullName, user?.role])

  const handleToggleSystemAccess = useCallback(async (userId: string): Promise<ActionResult> => {
    try {
      const targetUser = allUsers.find((u: any) => u.id === userId)
      const ok = toggleSystemAccess(userId)
      if (!ok) {
        return { success: false, message: 'Changement d\'accès impossible.' }
      }
      refreshUsers()
      await auditService.log({ userId: user?.id || '', userName: user?.fullName || 'System', userRole: user?.role || '', action: 'update', module: 'parametres', entity: 'User', entityId: userId, description: `System access changed for: ${userId}`, oldValue: null, newValue: null, severity: 'high' })
      const nextLabel = targetUser?.systemAccessBlocked ? 'Accès réactivé.' : 'Accès suspendu.'
      return { success: true, message: nextLabel }
    } catch (error) {
      console.error('Error:', error)
      return { success: false, message: 'Erreur pendant le changement d\'accès.' }
    }
  }, [allUsers, toggleSystemAccess, refreshUsers, user?.id, user?.fullName, user?.role])

  const handleCreateUser = useCallback(async (payload: { fullName: string; email: string; password: string }) => {
    const result = register(payload.fullName, payload.email, payload.password)
    refreshUsers()
    if (result.success) {
      await auditService.log({ userId: user?.id || '', userName: user?.fullName || 'System', userRole: user?.role || '', action: 'create', module: 'rh', entity: 'User', entityId: payload.email, description: `Created user: ${payload.email}`, oldValue: null, newValue: null, severity: 'medium' })
      return { success: true, message: 'Utilisateur créé avec succès.' }
    }
    return { success: false, message: result.error || 'Erreur de création.' }
  }, [register, refreshUsers, user?.id, user?.fullName, user?.role])

  const handleExportCSV = useCallback(() => {
    const csv = [
      ['User', 'Action', 'Module', 'Severity', 'Description', 'Timestamp'],
      ...auditEntries.map((e: any) => [e.userName, e.action, e.module, e.severity, e.description, e.timestamp]),
    ].map((row: any) => row.map((cell: any) => `"${cell}"`).join(',')).join('\n')

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `audit_export_${new Date().getTime()}.csv`
    link.click()
  }, [auditEntries])

  const handlePermissionChange = useCallback((permission: string, granted: boolean) => {
    setUserPermissions(prev => ({ ...prev, [permission]: granted }))
    setPermissionsSaved(false)
  }, [])

  const handleSavePermissions = useCallback(async (): Promise<ActionResult> => {
    try {
      if (!selectedUserForPerms) {
        return { success: false, message: 'Sélectionnez un utilisateur.' }
      }
      const nextModules = {} as Record<AppModule, PermissionLevel>

      APP_MODULES.forEach(module => {
        const canView = !!userPermissions[`${module}:view`]
        const canEdit = !!userPermissions[`${module}:edit`]
        const canCreate = !!userPermissions[`${module}:create`]
        const canDelete = !!userPermissions[`${module}:delete`]

        if (canDelete) {
          nextModules[module] = 'all'
        } else if (canEdit || canCreate) {
          nextModules[module] = 'edit'
        } else if (canView) {
          nextModules[module] = 'view'
        } else {
          nextModules[module] = 'none'
        }
      })

      permissionStore.setPermissions(selectedUserForPerms, nextModules)
      await auditService.log({ userId: user?.id || '', userName: user?.fullName || 'System', userRole: user?.role || '', action: 'permission_change', module: 'parametres', entity: 'User', entityId: selectedUserForPerms, description: `Updated permissions for: ${selectedUserForPerms}`, oldValue: null, newValue: userPermissions, severity: 'high' })
      setPermissionsSaved(true)
      setTimeout(() => setPermissionsSaved(false), 3000)
      return { success: true, message: 'Permissions enregistrées avec succès.' }
    } catch (error) {
      console.error('Error:', error)
      return { success: false, message: 'Erreur pendant l\'enregistrement des permissions.' }
    }
  }, [user?.id, user?.fullName, user?.role, selectedUserForPerms, userPermissions])

  const handleResetPermissions = useCallback(async (): Promise<ActionResult> => {
    try {
      if (!selectedUserForPerms) {
        return { success: false, message: 'Sélectionnez un utilisateur.' }
      }
      permissionStore.resetToDefaults(selectedUserForPerms)
      setUserPermissions({})
      setPermissionsSaved(false)
      return { success: true, message: 'Permissions réinitialisées aux valeurs par défaut.' }
    } catch (error) {
      console.error('Error:', error)
      return { success: false, message: 'Erreur pendant la réinitialisation des permissions.' }
    }
  }, [selectedUserForPerms])

  const handleApproveCritical = useCallback(async (id: string, note: string) => {
    try {
      await criticalActionService.approve(id, user?.id || '', user?.fullName || 'System', note)
    } catch (error) {
      console.error('Error:', error)
    }
  }, [user?.id, user?.fullName])

  const handleRejectCritical = useCallback(async (id: string, note: string) => {
    try {
      await criticalActionService.reject(id, user?.id || '', user?.fullName || 'System', note)
    } catch (error) {
      console.error('Error:', error)
    }
  }, [user?.id, user?.fullName])

  // Render
  if (!user || !isSuperAdmin) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <p className="text-xl font-bold text-gray-900">Access Denied</p>
        <p className="text-gray-500 mt-2">You don't have permission</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Administration</h1>
          <p className="text-gray-500 mt-1">System management and user administration</p>
        </div>
        {isImpersonating && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200">
            <Avatar user={allUsers.find((u: any) => u.id === isViewingAs) || user} size="sm" />
            <div className="text-sm">
              <p className="font-semibold text-amber-900">Viewing As</p>
              <p className="text-xs text-amber-700">{allUsers.find((u: any) => u.id === isViewingAs)?.fullName}</p>
            </div>
            <button onClick={clearViewingAs} className="ml-auto p-2 hover:bg-amber-200 rounded-lg text-amber-700 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-200">
        {ADMIN_TABS_CONFIG.map((tab: any) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            disabled={tab.requiresSuperAdmin && !isSuperAdmin}
            className={`flex items-center gap-2 px-4 py-2 font-medium whitespace-nowrap rounded-lg transition-all ${
              activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed'
            }`}
          >
            {getTabIcon(tab.iconName as any)}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        {activeTab === 'users-permissions' && (
          <div className="p-6">
            <UsersTab
              approvedUsers={approvedUsers}
              pendingUsers={pendingUsers}
              onlineUserIds={onlineUserIds}
              sessionsLog={sessionsLog}
              selectedUserId={selectedUserForPerms}
              onSelectUser={setSelectedUserForPerms}
              userPermissions={userPermissions}
              onPermissionChange={handlePermissionChange}
              onSavePermissions={handleSavePermissions}
              onResetPermissions={handleResetPermissions}
              permissionsSaved={permissionsSaved}
              onApproveUser={handleApproveUser}
              onRejectUser={handleRejectUser}
              onDeleteUser={handleDeleteUser}
              onToggleAdmin={handleToggleAdmin}
              onToggleSystemAccess={handleToggleSystemAccess}
              onCreateUser={handleCreateUser}
            />
          </div>
        )}
        {activeTab === 'activity-analytics' && (
          <div className="p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                <StatCard icon={<span>🟢</span>} label="En Ligne" value={onlineUsers.length} subtext="utilisateurs actifs" color="green" />
                <StatCard icon={<span>⚫</span>} label="Hors Ligne" value={offlineUsers.length} subtext="utilisateurs" color="blue" />
                <StatCard icon={<span>⏱</span>} label="Heures / Semaine" value={weeklyHours} subtext="total équipe" color="violet" />
                <StatCard icon={<span>📅</span>} label="Heures / Mois" value={monthlyHours} subtext="total équipe" color="emerald" />
                <StatCard icon={<span>📊</span>} label="Sessions" value={globalMetrics.totalSessions} subtext="7 derniers jours" color="emerald" />
                <StatCard icon={<span>⚡</span>} label="Actions" value={globalMetrics.totalActions} subtext="journal consolidé" color="red" />
              </div>

              <div className="ivos-card border-l-4 border-l-red-500">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Journal Utilisateurs - Actions critiques</h3>
                <p className="text-xs text-gray-500 mb-3">Inclut les événements sensibles (modification budget, suppression opération, actions critiques).</p>
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Utilisateur</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Action</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Module</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Détail</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {criticalUserJournal.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Aucune action critique détectée</td>
                        </tr>
                      ) : (
                        criticalUserJournal.map(row => (
                          <tr key={`critical-${row.id}`} className="border-b border-gray-100">
                            <td className="px-4 py-3 font-semibold text-gray-900">{row.userName}</td>
                            <td className="px-4 py-3 text-gray-700">{row.action}</td>
                            <td className="px-4 py-3 text-gray-700">{row.module}</td>
                            <td className="px-4 py-3 text-gray-600">{row.description}</td>
                            <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{new Date(row.timestamp).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="ivos-card">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Top 5 Utilisateurs (Actions)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {topUsersStats.slice(0, 5).map((stat: any, index: number) => (
                    <div key={stat.user.id} className="rounded-lg border border-gray-200 p-3">
                      <p className="text-xs font-semibold text-gray-500"># {index + 1}</p>
                      <p className="font-semibold text-gray-900 truncate mt-1">{stat.user.fullName}</p>
                      <p className="text-xs text-blue-700 mt-1">{stat.actions} actions</p>
                      <p className="text-xs text-gray-500">{stat.hours}h</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ivos-card">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Journal Détaillé</h3>
                <SearchFilter
                  searchValue={activitySearchText}
                  onSearchChange={setActivitySearchText}
                  placeholder="Rechercher action, module, utilisateur..."
                  filters={[
                    {
                      label: 'Source',
                      value: 'source',
                      options: [
                        { label: 'Toutes', value: 'all' },
                        { label: 'Audit', value: 'audit' },
                        { label: 'Analytics', value: 'analytics' },
                      ],
                    },
                    {
                      label: 'Sévérité',
                      value: 'severity',
                      options: [
                        { label: 'Toutes', value: 'all' },
                        { label: 'Info', value: 'low' },
                        { label: 'Moyen', value: 'medium' },
                        { label: 'Élevé', value: 'high' },
                        { label: 'Critique', value: 'critical' },
                      ],
                    },
                    {
                      label: 'Utilisateur',
                      value: 'user',
                      options: [{ label: 'Tous', value: 'all' }, ...approvedUsers.map((u: any) => ({ label: u.fullName, value: u.fullName }))],
                    },
                    {
                      label: 'Module',
                      value: 'module',
                      options: activityModuleOptions.map((moduleValue) => ({
                        label: moduleValue === 'all' ? 'Tous' : moduleValue,
                        value: moduleValue,
                      })),
                    },
                    {
                      label: 'Entité',
                      value: 'entity',
                      options: activityEntityOptions.map((entityValue) => ({
                        label: entityValue === 'all' ? 'Toutes' : entityValue,
                        value: entityValue,
                      })),
                    },
                  ]}
                  onFilterChange={(name, value) => {
                    if (name === 'source') setActivitySourceFilter(value as any)
                    if (name === 'severity') setActivitySeverityFilter(value as any)
                    if (name === 'user') setActivityUserFilter(value)
                    if (name === 'module') setActivityModuleFilter(value)
                    if (name === 'entity') setActivityEntityFilter(value)
                  }}
                />

                <div className="mt-4 rounded-lg border border-gray-200 overflow-hidden">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Source</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Utilisateur</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Action</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Module</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">Sévérité</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Détails</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedActivityLogs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-10 text-center text-gray-500">Aucune activité trouvée</td>
                        </tr>
                      ) : (
                        displayedActivityLogs.map((row, idx) => (
                          <tr key={row.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b border-gray-200`}>
                            <td className="px-4 py-3">
                              <StatusBadge type="info" label={row.source === 'audit' ? 'Audit' : 'Analytics'} size="sm" />
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900">{row.userName}</td>
                            <td className="px-4 py-3 text-gray-700">{row.action}</td>
                            <td className="px-4 py-3 text-gray-700">{row.module}</td>
                            <td className="px-4 py-3 text-center">
                              <StatusBadge type={row.severity} label={row.severity} size="sm" />
                            </td>
                            <td className="px-4 py-3 text-gray-600 max-w-[320px] truncate">{row.description}</td>
                            <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                              {new Date(row.timestamp).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {filteredActivityLogs.length > 0 && (
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>Affichage: {displayedActivityLogs.length} / {filteredActivityLogs.length}</span>
                    {displayedActivityLogs.length < filteredActivityLogs.length && (
                      <button
                        onClick={() => setActivityVisibleCount((prev) => prev + 80)}
                        className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
                      >
                        Voir 80 de plus
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'super-admins' && isSuperAdmin && (
          <div className="p-6">
            <div className="space-y-6">
              <div className="ivos-card border-l-4 border-l-red-500">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Actions Critiques ({criticalRequests.filter((c: any) => c.status === 'pending').length} en attente)</h3>
                <div className="space-y-3">
                  {criticalRequests.filter((c: any) => c.status === 'pending').slice(0, 5).map((request: any) => (
                    <div key={request.id} className="rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="font-semibold text-gray-900">{request.actionType}</p>
                      <p className="text-xs text-gray-600 mt-1">{request.description}</p>
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => handleApproveCritical(request.id, 'Approved from Super Admin tab')} className="px-3 py-1.5 text-xs rounded-lg bg-green-600 hover:bg-green-700 text-white">Approuver</button>
                        <button onClick={() => handleRejectCritical(request.id, 'Rejected from Super Admin tab')} className="px-3 py-1.5 text-xs rounded-lg bg-red-600 hover:bg-red-700 text-white">Rejeter</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <SuperAdminsTab superAdminsList={superAdminsList} superAdminAuditEntries={superAdminAuditEntries} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
