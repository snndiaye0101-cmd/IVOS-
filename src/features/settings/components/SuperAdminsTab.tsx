// ═══════════════════════════════════════════════════════════════
// ADMIN SUPER ADMINS TAB COMPONENT
// ═══════════════════════════════════════════════════════════════

import React, { useMemo } from 'react'
import type { User } from '../../../shared/services/authStore'
import type { AuditEntry } from '../../../shared/services/auditService'
import { SEVERITY_STYLES } from './adminConstants'
import { Avatar, StatusBadge } from './AdminSharedComponents'
import { Crown, AlertCircle } from 'lucide-react'

interface SuperAdminsTabProps {
  superAdminsList: User[]
  superAdminAuditEntries: AuditEntry[]
}

export function SuperAdminsTab({ superAdminsList, superAdminAuditEntries }: SuperAdminsTabProps) {
  // ──────────────────────────────────────────────────────────────
  // STATS
  // ──────────────────────────────────────────────────────────────
  const criticalAuditCount = useMemo(() => {
    return superAdminAuditEntries.filter(e => ['critical', 'high'].includes(e.severity)).length
  }, [superAdminAuditEntries])

  const recentCriticalEntries = useMemo(() => {
    return superAdminAuditEntries
      .filter(e => ['critical', 'high'].includes(e.severity))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20)
  }, [superAdminAuditEntries])

  // ──────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────
  return (
    <div className="grid lg:grid-cols-[500px_1fr] gap-6 h-[calc(100vh-300px)]">
      {/* LEFT COLUMN: Super Admins List */}
      <div className="ivos-card border-l-4 border-l-gold-500 flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <Crown className="w-5 h-5 text-amber-600" />
          <h3 className="text-sm font-bold text-gray-900">Super Admins ({superAdminsList.length})</h3>
        </div>

        {/* Scrollable List */}
        <div className="overflow-y-auto flex-1 space-y-2">
          {superAdminsList.length === 0 ? (
            <p className="text-center py-8 text-gray-500 text-sm">Aucun super admin</p>
          ) : (
            superAdminsList.map(admin => (
              <div key={admin.id} className="p-3 rounded-lg bg-gradient-to-r from-amber-50 to-transparent border border-amber-200 hover:border-amber-300 transition-all">
                <div className="flex items-start gap-3">
                  <Avatar user={admin} size="sm" showStatus={false} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{admin.fullName}</p>
                    <p className="text-xs text-gray-500 truncate">{admin.email}</p>
                    <div className="flex gap-1 mt-2">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700 flex items-center gap-1">
                        <Crown className="w-3 h-3" /> Super Admin
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Critical Activity Log */}
      <div className="ivos-card border-l-4 border-l-red-500 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h3 className="text-sm font-bold text-gray-900">Activités Critiques/Élevées</h3>
          </div>
          <StatusBadge type="critical" label={`${criticalAuditCount} Entrées`} size="sm" />
        </div>

        {/* Scrollable Activity Log */}
        <div className="overflow-y-auto flex-1">
          {recentCriticalEntries.length === 0 ? (
            <p className="text-center py-8 text-gray-500 text-sm">Aucune activité critique récente</p>
          ) : (
            <div className="space-y-3">
              {recentCriticalEntries.map((entry, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border-l-4 ${
                    entry.severity === 'critical' ? 'border-l-red-600 bg-red-50 border border-red-200' : 'border-l-amber-600 bg-amber-50 border border-amber-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900 truncate text-sm">{entry.userName}</p>
                        <StatusBadge type={entry.severity} label={entry.action} size="sm" />
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">{entry.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(entry.timestamp).toLocaleDateString('fr-FR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded whitespace-nowrap flex-shrink-0 ${SEVERITY_STYLES[entry.severity].bg} ${SEVERITY_STYLES[entry.severity].text}`}>
                      {SEVERITY_STYLES[entry.severity].label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
