// ═══════════════════════════════════════════════════════════════
// ADMIN PERMISSIONS TAB COMPONENT
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react'
import type { User } from '../../../shared/services/authStore'
import type { AppModule } from '../../../shared/services/permissionStore'
import { Avatar, StatusBadge } from './AdminSharedComponents'
import { Save, RotateCcw, Check, X } from 'lucide-react'

interface PermissionsTabProps {
  approvedUsers: User[]
  selectedUserId?: string
  onSelectUser: (userId: string) => void
  userPermissions: Record<string, boolean>
  onPermissionChange: (permission: string, granted: boolean) => void
  onSavePermissions: () => void
  onResetPermissions: () => void
  permissionsSaved: boolean
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

const PERMISSION_LEVELS = ['view', 'edit', 'create', 'delete']
const PERMISSION_LABELS = { view: 'Voir', edit: 'Modifier', create: 'Créer', delete: 'Supprimer' }

export function PermissionsTab({
  approvedUsers,
  selectedUserId,
  onSelectUser,
  userPermissions,
  onPermissionChange,
  onSavePermissions,
  onResetPermissions,
  permissionsSaved,
}: PermissionsTabProps) {
  const selectedUser = approvedUsers.find(u => u.id === selectedUserId)

  // ──────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* User Selector */}
      <div className="ivos-card">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Sélectionner un Utilisateur</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {approvedUsers.map(user => (
            <button
              key={user.id}
              onClick={() => onSelectUser(user.id)}
              className={`p-4 rounded-lg border-2 transition-all flex items-start gap-3 text-left ${
                selectedUserId === user.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <Avatar user={user} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{user.fullName}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
              {selectedUserId === user.id && <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-1" />}
            </button>
          ))}
        </div>
      </div>

      {/* Permissions Grid */}
      {selectedUser && (
        <div className="ivos-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Matrice des Permissions</h3>
              <p className="text-xs text-gray-500 mt-1">{selectedUser.fullName}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onResetPermissions}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Réinitialiser
              </button>
              <button
                onClick={onSavePermissions}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                Enregistrer
              </button>
            </div>
          </div>

          {permissionsSaved && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 font-medium">
              ✓ Permissions enregistrées avec succès
            </div>
          )}

          {/* Permissions Table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 -mx-6 md:mx-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 md:min-w-[150px]">Module</th>
                  {PERMISSION_LEVELS.map(level => (
                    <th key={level} className="px-4 py-3 text-center font-semibold text-gray-700">
                      {PERMISSION_LABELS[level as keyof typeof PERMISSION_LABELS]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULES.map(module => (
                  <tr key={module} className="border-b border-gray-200 hover:bg-blue-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900 md:min-w-[150px]">{MODULE_LABELS[module]}</td>
                    {PERMISSION_LEVELS.map(level => {
                      const permKey = `${module}:${level}`
                      const isGranted = userPermissions[permKey]
                      return (
                        <td key={level} className="px-4 py-3 text-center">
                          <button
                            onClick={() => onPermissionChange(permKey, !isGranted)}
                            className={`mx-auto w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                              isGranted
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            }`}
                          >
                            {isGranted ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Role Assignment Buttons */}
          <div className="mt-6 flex gap-2 flex-wrap">
            {[
              { role: 'Viewer', permissions: { view: true } },
              { role: 'Editor', permissions: { view: true, edit: true } },
              { role: 'Creator', permissions: { view: true, edit: true, create: true } },
              { role: 'Admin', permissions: { view: true, edit: true, create: true, delete: true } },
            ].map(({ role, permissions }) => (
              <button
                key={role}
                onClick={() => {
                  MODULES.forEach(module => {
                    PERMISSION_LEVELS.forEach(level => {
                      const permKey = `${module}:${level}`
                      onPermissionChange(permKey, permissions[level as keyof typeof permissions] || false)
                    })
                  })
                }}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-900 transition-colors"
              >
                Appliquer {role}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No User Selected */}
      {!selectedUser && (
        <div className="ivos-card text-center py-12 text-gray-500">
          <p className="text-lg font-medium">Aucun utilisateur sélectionné</p>
          <p className="text-sm">Choisissez un utilisateur pour gérer ses permissions</p>
        </div>
      )}
    </div>
  )
}
