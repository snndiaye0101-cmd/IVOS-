// ═══════════════════════════════════════════════════════════════
// ADMIN SUPER ADMINS TAB COMPONENT
// ═══════════════════════════════════════════════════════════════

import React, { useMemo } from 'react';
import type { User } from '../../../shared/services/authStore';
import type { AuditEntry } from '../../../shared/services/auditService';
import { SEVERITY_STYLES } from './adminConstants';
import { Avatar, StatusBadge } from './AdminSharedComponents';
import { Crown, AlertCircle } from 'lucide-react';

interface SuperAdminsTabProps {
  superAdminsList: User[];
  superAdminAuditEntries: AuditEntry[];
}

export function SuperAdminsTab({ superAdminsList, superAdminAuditEntries }: SuperAdminsTabProps) {
  // ──────────────────────────────────────────────────────────────
  // STATS
  // ──────────────────────────────────────────────────────────────
  const criticalAuditCount = useMemo(() => {
    return superAdminAuditEntries.filter((e) => ['critical', 'high'].includes(e.severity)).length;
  }, [superAdminAuditEntries]);

  const recentCriticalEntries = useMemo(() => {
    return superAdminAuditEntries
      .filter((e) => ['critical', 'high'].includes(e.severity))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);
  }, [superAdminAuditEntries]);

  // ──────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────
  return (
    <div className="grid h-[calc(100vh-300px)] gap-6 lg:grid-cols-[500px_1fr]">
      {/* LEFT COLUMN: Super Admins List */}
      <div className="ivos-card border-l-gold-500 flex flex-col border-l-4">
        <div className="mb-4 flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-600" />
          <h3 className="text-sm font-bold text-gray-900">
            Super Admins ({superAdminsList.length})
          </h3>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 space-y-2 overflow-y-auto">
          {superAdminsList.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">Aucun super admin</p>
          ) : (
            superAdminsList.map((admin) => (
              <div
                key={admin.id}
                className="rounded-lg border border-amber-200 bg-gradient-to-r from-amber-50 to-transparent p-3 transition-all hover:border-amber-300"
              >
                <div className="flex items-start gap-3">
                  <Avatar user={admin} size="sm" showStatus={false} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-gray-900">{admin.fullName}</p>
                    <p className="truncate text-xs text-gray-500">{admin.email}</p>
                    <div className="mt-2 flex gap-1">
                      <span className="flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                        <Crown className="h-3 w-3" /> Super Admin
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
      <div className="ivos-card flex flex-col border-l-4 border-l-red-500">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <h3 className="text-sm font-bold text-gray-900">Activités Critiques/Élevées</h3>
          </div>
          <StatusBadge type="critical" label={`${criticalAuditCount} Entrées`} size="sm" />
        </div>

        {/* Scrollable Activity Log */}
        <div className="flex-1 overflow-y-auto">
          {recentCriticalEntries.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              Aucune activité critique récente
            </p>
          ) : (
            <div className="space-y-3">
              {recentCriticalEntries.map((entry, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg border-l-4 p-3 ${
                    entry.severity === 'critical'
                      ? 'border border-red-200 border-l-red-600 bg-red-50'
                      : 'border border-amber-200 border-l-amber-600 bg-amber-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {entry.userName}
                        </p>
                        <StatusBadge type={entry.severity} label={entry.action} size="sm" />
                      </div>
                      <p className="line-clamp-2 text-xs text-gray-600">{entry.description}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {new Date(entry.timestamp).toLocaleDateString('fr-FR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <span
                      className={`flex-shrink-0 whitespace-nowrap rounded px-2 py-1 text-xs font-bold ${SEVERITY_STYLES[entry.severity].bg} ${SEVERITY_STYLES[entry.severity].text}`}
                    >
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
  );
}
