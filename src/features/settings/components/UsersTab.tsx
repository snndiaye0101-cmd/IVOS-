// ═══════════════════════════════════════════════════════════════
// ADMIN USERS TAB COMPONENT
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react'
import Modal from '../../../components/ui/Modal'
import type { User, UserSession } from '../../../shared/services/authStore'
import { SIDEBAR_PERMISSION_TREE, type PermissionRouteItem } from '../../../shared/services/permissionStore'
import type { AppModule } from '../../../shared/services/permissionStore'
import { Avatar, StatusBadge, SearchFilter } from './AdminSharedComponents'
import { Eye, Trash2, Shield, UserCheck, UserX, Lock, Plus, Save, RotateCcw, Check, X, ChevronDown, ChevronRight } from 'lucide-react'

type ActionResult = { success: boolean; message: string }

interface UsersTabProps {
  approvedUsers: User[]
  pendingUsers: User[]
  onlineUserIds: string[]
  sessionsLog: UserSession[]
  selectedUserId?: string
  onSelectUser: (userId: string) => void
  userPermissions: Record<string, boolean>
  onPermissionChange: (permission: string, granted: boolean) => void
  onSavePermissions: () => Promise<ActionResult>
  onResetPermissions: () => Promise<ActionResult>
  permissionsSaved: boolean
  onApproveUser: (userId: string) => Promise<ActionResult>
  onRejectUser: (userId: string) => Promise<ActionResult>
  onDeleteUser: (userId: string) => Promise<ActionResult>
  onToggleAdmin: (userId: string, isAdmin: boolean) => Promise<ActionResult>
  onToggleSystemAccess: (userId: string) => Promise<ActionResult>
  onCreateUser: (payload: { fullName: string; email: string; password: string }) => Promise<ActionResult>
}

const MODULES: AppModule[] = ['dashboard', 'fleet', 'exploitation', 'finances', 'technique', 'rh', 'parametres', 'chat', 'hub_carburant']
const MODULE_LABELS: Record<AppModule, string> = {
  dashboard: 'Tableau de Bord',
  fleet: 'Flotte',
  exploitation: 'Exploitation',
  finances: 'Finances',
  technique: 'Technique',
  rh: 'Ressources Humaines',
  parametres: 'Paramètres',
  chat: 'Chat',
  hub_carburant: 'Hub Carburant',
}
const PERMISSION_LEVELS = ['view', 'edit', 'create', 'delete'] as const
const PERMISSION_LABELS: Record<(typeof PERMISSION_LEVELS)[number], string> = { view: 'Voir', edit: 'Modifier', create: 'Créer', delete: 'Supprimer' }

type PermissionAction = (typeof PERMISSION_LEVELS)[number]

type CategoryModule = {
  module: AppModule
  label: string
  routes: PermissionRouteItem[]
}

type PermissionCategoryTree = {
  section: string
  modules: CategoryModule[]
}

const CATEGORY_TREE: PermissionCategoryTree[] = SIDEBAR_PERMISSION_TREE.map(section => {
  const modulesMap = section.items.reduce<Record<AppModule, CategoryModule>>((acc, item) => {
    if (!acc[item.module]) {
      acc[item.module] = { module: item.module, label: MODULE_LABELS[item.module], routes: [] }
    }
    acc[item.module].routes.push(item)
    return acc
  }, {} as Record<AppModule, CategoryModule>)

  return {
    section: section.section,
    modules: Object.values(modulesMap),
  }
})

const getPermissionKey = (target: string, action: PermissionAction) => `${target}:${action}`

const getPermissionState = (userPermissions: Record<string, boolean>, target: string, action: PermissionAction) => {
  const explicit = userPermissions[getPermissionKey(target, action)]
  if (typeof explicit === 'boolean') return explicit
  const moduleMatch = Object.keys(userPermissions).find(key => key.startsWith(`${target}:`))
  return !!explicit || false
}

const resolveRoutePermission = (userPermissions: Record<string, boolean>, route: PermissionRouteItem) => {
  const state: Record<PermissionAction, boolean> = {
    view: false,
    edit: false,
    create: false,
    delete: false,
  }

  PERMISSION_LEVELS.forEach(action => {
    const routeKey = getPermissionKey(route.path, action)
    const moduleKey = getPermissionKey(route.module, action)
    if (routeKey in userPermissions) {
      state[action] = userPermissions[routeKey]
    } else {
      state[action] = !!userPermissions[moduleKey]
    }
  })

  return state
}

const getModuleLevel = (module: AppModule, userPermissions: Record<string, boolean>) => {
  if (userPermissions[getPermissionKey(module, 'delete')] || userPermissions[getPermissionKey(module, 'create')] || userPermissions[getPermissionKey(module, 'edit')]) return 'all'
  if (userPermissions[getPermissionKey(module, 'view')]) return 'view'
  return 'none'
}

const makePermissionFlags = (target: string, level: 'none' | 'view' | 'all') => {
  const flags: Record<string, boolean> = {}
  flags[getPermissionKey(target, 'view')] = level !== 'none'
  flags[getPermissionKey(target, 'edit')] = level === 'all'
  flags[getPermissionKey(target, 'create')] = level === 'all'
  flags[getPermissionKey(target, 'delete')] = level === 'all'
  return flags
}

export function UsersTab({
  approvedUsers,
  pendingUsers,
  onlineUserIds,
  sessionsLog,
  selectedUserId,
  onSelectUser,
  userPermissions,
  onPermissionChange,
  onSavePermissions,
  onResetPermissions,
  permissionsSaved,
  onApproveUser,
  onRejectUser,
  onDeleteUser,
  onToggleAdmin,
  onToggleSystemAccess,
  onCreateUser,
}: UsersTabProps) {
  const [searchText, setSearchText] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending'>('approved')
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    CATEGORY_TREE.reduce((acc, section) => ({ ...acc, [section.section]: true }), {} as Record<string, boolean>),
  )
  const [previewUser, setPreviewUser] = useState<User | null>(null)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ fullName: '', email: '', password: '' })
  const [createResult, setCreateResult] = useState<string>('')
  const [globalFeedback, setGlobalFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [loadingActionKey, setLoadingActionKey] = useState<string | null>(null)
  const [isSavingPermissions, setIsSavingPermissions] = useState(false)
  const [isResettingPermissions, setIsResettingPermissions] = useState(false)
  const [isCreatingUser, setIsCreatingUser] = useState(false)

  const selectedUser = approvedUsers.find(u => u.id === selectedUserId)

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handleModuleToggle = (module: AppModule, level: 'none' | 'view' | 'all') => {
    const moduleRoutes = CATEGORY_TREE.flatMap(section => section.modules)
      .find(item => item.module === module)?.routes || []

    const flags = makePermissionFlags(module, level)
    Object.entries(flags).forEach(([permission, granted]) => onPermissionChange(permission, granted))

    moduleRoutes.forEach(route => {
      Object.entries(makePermissionFlags(route.path, level)).forEach(([permission, granted]) => onPermissionChange(permission, granted))
    })
  }

  const handleRouteToggle = (route: PermissionRouteItem, action: PermissionAction, currentValue: boolean) => {
    onPermissionChange(getPermissionKey(route.path, action), !currentValue)
  }

  // ──────────────────────────────────────────────────────────────
  // FILTERED DATA
  // ──────────────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    let result = filterStatus === 'pending' ? pendingUsers : approvedUsers

    if (filterStatus === 'all') {
      result = [...approvedUsers, ...pendingUsers]
    }

    if (searchText.trim()) {
      const q = searchText.toLowerCase()
      result = result.filter(u => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    }
    return result
  }, [searchText, filterStatus, approvedUsers, pendingUsers])

  const getOpenSessionMinutes = (userId: string) => {
    const openSessions = sessionsLog
      .filter(s => s.userId === userId && !s.logoutAt)
      .sort((a, b) => new Date(b.loginAt).getTime() - new Date(a.loginAt).getTime())
    if (!openSessions.length) return null
    return Math.max(1, Math.round((Date.now() - new Date(openSessions[0].loginAt).getTime()) / 60000))
  }

  const getMonthlyHours = (userId: string) => {
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const totalMinutes = sessionsLog
      .filter(s => s.userId === userId && new Date(s.loginAt).getTime() >= monthAgo)
      .reduce((sum, s) => {
        if (typeof s.durationMinutes === 'number') return sum + s.durationMinutes
        if (!s.logoutAt) {
          return sum + Math.max(0, Math.round((Date.now() - new Date(s.loginAt).getTime()) / 60000))
        }
        return sum
      }, 0)
    return Math.round((totalMinutes / 60) * 10) / 10
  }

  const runAction = async (actionKey: string, runner: () => Promise<ActionResult>) => {
    setGlobalFeedback(null)
    setLoadingActionKey(actionKey)
    try {
      const result = await runner()
      setGlobalFeedback({ type: result.success ? 'success' : 'error', message: result.message })
    } catch {
      setGlobalFeedback({ type: 'error', message: 'Une erreur inattendue est survenue.' })
    } finally {
      setLoadingActionKey(null)
    }
  }

  const handleCreateUser = async () => {
    setCreateResult('')
    const fullName = createForm.fullName.trim()
    const email = createForm.email.trim()
    const password = createForm.password.trim()

    if (!fullName || !email || !password) {
      setCreateResult('Tous les champs sont obligatoires.')
      return
    }

    setIsCreatingUser(true)
    const result = await onCreateUser({ fullName, email, password })
    setCreateResult(result.message)
    setGlobalFeedback({ type: result.success ? 'success' : 'error', message: result.message })

    if (result.success) {
      setCreateForm({ fullName: '', email: '', password: '' })
      setTimeout(() => {
        setShowCreateModal(false)
        setCreateResult('')
      }, 900)
    }
    setIsCreatingUser(false)
  }

  const handleSavePermissions = async () => {
    setIsSavingPermissions(true)
    setGlobalFeedback(null)
    try {
      const result = await onSavePermissions()
      setGlobalFeedback({ type: result.success ? 'success' : 'error', message: result.message })
    } catch {
      setGlobalFeedback({ type: 'error', message: 'Erreur lors de l\'enregistrement des permissions.' })
    } finally {
      setIsSavingPermissions(false)
    }
  }

  const handleResetPermissions = async () => {
    setIsResettingPermissions(true)
    setGlobalFeedback(null)
    try {
      const result = await onResetPermissions()
      setGlobalFeedback({ type: result.success ? 'success' : 'error', message: result.message })
    } catch {
      setGlobalFeedback({ type: 'error', message: 'Impossible de réinitialiser les permissions.' })
    } finally {
      setIsResettingPermissions(false)
    }
  }

  // ──────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: 'approved', label: `Approuvés (${approvedUsers.length})` },
          { id: 'pending', label: `En attente (${pendingUsers.length})` },
          { id: 'all', label: `Tous (${approvedUsers.length + pendingUsers.length})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id as 'approved' | 'pending')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filterStatus === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <SearchFilter searchValue={searchText} onSearchChange={setSearchText} placeholder="Chercher par nom ou email..." />

      {globalFeedback && (
        <div className={`rounded-lg border px-3 py-2 text-sm font-medium ${globalFeedback.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {globalFeedback.message}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1fr] gap-6">
        {/* Users List */}
        <div className="space-y-3">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-500 border border-gray-200 rounded-lg">
              <p className="text-lg font-medium">Aucun utilisateur trouvé</p>
              <p className="text-sm">Affinez votre recherche ou vérifiez les filtres</p>
            </div>
          ) : (
            filteredUsers.map(user => {
              const isPending = user.status === 'pending'
              const isOnline = onlineUserIds.includes(user.id)
              const connectedMinutes = getOpenSessionMinutes(user.id)
              const monthHours = getMonthlyHours(user.id)
              const isSelected = selectedUserId === user.id

              return (
                <button
                  key={user.id}
                  onClick={() => !isPending && onSelectUser(user.id)}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${
                    isSelected ? 'border-blue-400 bg-blue-50/60' : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <Avatar user={user} online={isOnline} />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{user.fullName}</p>
                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                        <p className="text-xs text-blue-700 mt-1 font-medium">
                          {isOnline && connectedMinutes !== null ? `Connecté depuis : ${connectedMinutes} min` : `Total Mois : ${monthHours}h`}
                        </p>

                        <div className="flex flex-wrap gap-2 mt-2">
                          {isOnline ? <StatusBadge type="online" label="En ligne" size="sm" /> : <StatusBadge type="offline" label="Hors-ligne" size="sm" />}
                          {user.status === 'pending' && <StatusBadge type="pending" label="En attente" size="sm" />}
                          {user.status === 'approved' && (
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                runAction(`toggle-access-${user.id}`, () => onToggleSystemAccess(user.id))
                              }}
                              disabled={loadingActionKey === `toggle-access-${user.id}`}
                              className={`rounded-full ${user.systemAccessBlocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'} px-2 py-0.5 text-xs font-semibold`}
                            >
                              {loadingActionKey === `toggle-access-${user.id}` ? 'Traitement...' : user.systemAccessBlocked ? 'Accès révoqué' : 'Approuvé'}
                            </button>
                          )}
                          <StatusBadge type="info" label={user.role === 'Admin' ? 'Admin' : 'Utilisateur'} size="sm" />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isPending ? (
                        <>
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              runAction(`approve-${user.id}`, () => onApproveUser(user.id))
                            }}
                            disabled={loadingActionKey === `approve-${user.id}`}
                            className="p-2 rounded-lg hover:bg-green-100 text-green-700"
                            title="Approuver"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              runAction(`reject-${user.id}`, () => onRejectUser(user.id))
                            }}
                            disabled={loadingActionKey === `reject-${user.id}`}
                            className="p-2 rounded-lg hover:bg-red-100 text-red-700"
                            title="Rejeter"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              setPreviewUser(user)
                            }}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-700"
                            title="Aperçu"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              runAction(`toggle-admin-${user.id}`, () => onToggleAdmin(user.id, user.role !== 'Admin'))
                            }}
                            disabled={loadingActionKey === `toggle-admin-${user.id}`}
                            className="p-2 rounded-lg hover:bg-blue-100 text-blue-700"
                            title="Modifier rôle"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              runAction(`toggle-access-${user.id}`, () => onToggleSystemAccess(user.id))
                            }}
                            disabled={loadingActionKey === `toggle-access-${user.id}`}
                            className="p-2 rounded-lg hover:bg-amber-100 text-amber-700"
                            title="Suspendre / réactiver accès"
                          >
                            <Lock className="w-4 h-4" />
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              setUserToDelete(user)
                            }}
                            className="p-2 rounded-lg hover:bg-red-100 text-red-700"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Permissions Panel */}
        <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
          {!selectedUser ? (
            <div className="p-10 text-center text-gray-500">
              <p className="text-lg font-semibold">Permissions</p>
              <p className="text-sm mt-2">Cliquez sur un utilisateur approuvé pour modifier ses droits immédiatement.</p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Permissions de</p>
                  <p className="font-bold text-gray-900 truncate">{selectedUser.fullName}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleResetPermissions}
                    disabled={isResettingPermissions}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {isResettingPermissions ? 'Reset...' : 'Reset'}
                  </button>
                  <button
                    onClick={handleSavePermissions}
                    disabled={isSavingPermissions}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isSavingPermissions ? 'Sauvegarde...' : 'Sauver'}
                  </button>
                </div>
              </div>

              {permissionsSaved && (
                <div className="text-xs rounded-lg border border-green-200 bg-green-50 text-green-700 px-3 py-2 font-semibold">
                  Permissions enregistrées.
                </div>
              )}

              <div className="space-y-4">
                {CATEGORY_TREE.map(section => (
                  <div key={section.section} className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
                    <button
                      type="button"
                      onClick={() => toggleSection(section.section)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{section.section}</p>
                        <p className="text-xs text-gray-500">Gestion des composants et autorisations par module.</p>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-gray-500 transition-transform ${expandedSections[section.section] ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {expandedSections[section.section] && (
                      <div className="space-y-4 border-t border-gray-200 px-4 pb-4">
                        {section.modules.map(moduleBlock => {
                          const moduleLevel = getModuleLevel(moduleBlock.module, userPermissions)
                          const isActive = moduleLevel !== 'none'
                          return (
                            <div key={moduleBlock.module} className="rounded-3xl border border-gray-100 bg-slate-50 p-4">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">{moduleBlock.label}</p>
                                  <p className="text-xs text-gray-500">
                                    {moduleBlock.routes.map(route => route.label).join(' • ')}
                                  </p>
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                  <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700">
                                    {isActive ? 'Activé' : 'Désactivé'}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleModuleToggle(moduleBlock.module, isActive ? 'none' : 'view')}
                                    className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                                      isActive ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                                  >
                                    {isActive ? 'Désactiver le module' : 'Activer le module'}
                                  </button>
                                </div>
                              </div>

                              <div className="mt-4 overflow-x-auto rounded-2xl border border-gray-200 bg-white">
                                <table className="min-w-full text-sm">
                                  <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                                    <tr>
                                      <th className="px-3 py-3">Composant</th>
                                      <th className="px-2 py-3 text-center">Voir</th>
                                      <th className="px-2 py-3 text-center">Modifier</th>
                                      <th className="px-2 py-3 text-center">Créer</th>
                                      <th className="px-2 py-3 text-center">Supprimer</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {moduleBlock.routes.map(route => {
                                      const routePerms = resolveRoutePermission(userPermissions, route)
                                      return (
                                        <tr key={route.path} className="border-t border-gray-100 hover:bg-slate-50">
                                          <td className="px-3 py-3 align-middle">
                                            <div>
                                              <p className="font-medium text-gray-900">{route.label}</p>
                                              <p className="text-xs text-gray-500">{route.path}</p>
                                            </div>
                                          </td>
                                          {PERMISSION_LEVELS.map(action => (
                                            <td key={action} className="px-2 py-3 text-center align-middle">
                                              <button
                                                type="button"
                                                onClick={() => handleRouteToggle(route, action, routePerms[action])}
                                                className={`mx-auto inline-flex h-7 w-7 items-center justify-center rounded-md transition ${
                                                  routePerms[action]
                                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                                }`}
                                              >
                                                {routePerms[action] ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                              </button>
                                            </td>
                                          ))}
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Add Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-6 right-6 z-30 rounded-full h-14 w-14 bg-blue-600 hover:bg-blue-700 text-white shadow-xl flex items-center justify-center"
        title="Créer un nouvel utilisateur"
      >
        <Plus className="w-6 h-6" />
      </button>

      <Modal isOpen={!!previewUser} onClose={() => setPreviewUser(null)} title="Fiche Utilisateur" size="md">
        {previewUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar user={previewUser} size="md" online={onlineUserIds.includes(previewUser.id)} />
              <div>
                <p className="text-lg font-bold text-gray-900">{previewUser.fullName}</p>
                <p className="text-sm text-gray-500">{previewUser.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-gray-500">Rôle</p>
                <p className="font-semibold text-gray-900">{previewUser.role}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-gray-500">Statut</p>
                <p className="font-semibold text-gray-900">{previewUser.status}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-gray-500">Connecté depuis</p>
                <p className="font-semibold text-gray-900">{getOpenSessionMinutes(previewUser.id) ? `${getOpenSessionMinutes(previewUser.id)} min` : 'Hors ligne'}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-gray-500">Total Mois</p>
                <p className="font-semibold text-gray-900">{getMonthlyHours(previewUser.id)} h</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!userToDelete} onClose={() => setUserToDelete(null)} title="Confirmation de suppression" size="sm">
        {userToDelete && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">Vous êtes sur le point de supprimer définitivement <span className="font-bold">{userToDelete.fullName}</span>.</p>
            <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs px-3 py-2">
              Cette action est irréversible.
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setUserToDelete(null)} className="px-3 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 text-gray-800">Annuler</button>
              <button
                onClick={async () => {
                  const result = await onDeleteUser(userToDelete.id)
                  setGlobalFeedback({ type: result.success ? 'success' : 'error', message: result.message })
                  if (result.success) {
                    setUserToDelete(null)
                  }
                }}
                className="px-3 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-700 text-white"
              >
                Supprimer
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Créer un nouvel utilisateur" size="md">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700">Nom complet</label>
            <input
              type="text"
              value={createForm.fullName}
              onChange={e => setCreateForm(prev => ({ ...prev, fullName: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Ex: Awa Ndiaye"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">Email</label>
            <input
              type="email"
              value={createForm.email}
              onChange={e => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="utilisateur@ivos.sn"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">Mot de passe</label>
            <input
              type="password"
              value={createForm.password}
              onChange={e => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          {createResult && (
            <p className={`text-sm font-medium ${createResult.toLowerCase().includes('succès') ? 'text-green-700' : 'text-red-700'}`}>{createResult}</p>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreateModal(false)} className="px-3 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 text-gray-800">Annuler</button>
            <button disabled={isCreatingUser} onClick={handleCreateUser} className="px-3 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white">{isCreatingUser ? 'Création...' : 'Créer'}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
