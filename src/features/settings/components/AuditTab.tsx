// ═══════════════════════════════════════════════════════════════
// ADMIN AUDIT TAB COMPONENT
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import type { AuditEntry } from '../../../shared/services/auditService';
import type { CriticalActionRequest } from '../../../shared/services/criticalActionService';
import { SEVERITY_STYLES } from './adminConstants';
import { SearchFilter, StatusBadge } from './AdminSharedComponents';
import { Download, Eye, Check, X } from 'lucide-react';

interface AuditTabProps {
  auditEntries: AuditEntry[];
  criticalRequests: CriticalActionRequest[];
  onExportCSV: () => void;
  onViewDetails: (entry: AuditEntry) => void;
  onApproveCritical: (id: string, note: string) => void;
  onRejectCritical: (id: string, note: string) => void;
}

export function AuditTab({
  auditEntries,
  criticalRequests,
  onExportCSV,
  onViewDetails,
  onApproveCritical,
  onRejectCritical,
}: AuditTabProps) {
  const [searchText, setSearchText] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | AuditEntry['severity']>('all');
  const [actionFilter, setActionFilter] = useState<'all' | 'create' | 'edit' | 'delete' | 'view'>(
    'all'
  );
  const [reviewNote, setReviewNote] = useState('');
  const [selectedCriticalId, setSelectedCriticalId] = useState<string>('');

  // ──────────────────────────────────────────────────────────────
  // FILTERED DATA
  // ──────────────────────────────────────────────────────────────
  const filteredAuditEntries = useMemo(() => {
    let result = auditEntries;

    if (severityFilter !== 'all') {
      result = result.filter((e) => e.severity === severityFilter);
    }

    if (actionFilter !== 'all') {
      result = result.filter((e) => e.action === actionFilter);
    }

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (e) =>
          e.userName.toLowerCase().includes(q) ||
          e.module.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [auditEntries, searchText, severityFilter, actionFilter]);

  // ──────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Critical Actions Section */}
      <div className="ivos-card border-l-4 border-l-red-500">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">
            ⚠️ Actions Critiques En Attente (
            {criticalRequests.filter((c) => c.status === 'pending').length})
          </h3>
          <StatusBadge
            type="critical"
            label={`${criticalRequests.filter((c) => c.status === 'pending').length} En Attente`}
            size="sm"
          />
        </div>

        {criticalRequests.filter((c) => c.status === 'pending').length === 0 ? (
          <p className="text-sm text-gray-500">Aucune action critique en attente</p>
        ) : (
          <div className="space-y-3">
            {criticalRequests
              .filter((c) => c.status === 'pending')
              .map((req) => (
                <div
                  key={req.id}
                  className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{req.actionType}</p>
                    <p className="mt-1 text-sm text-gray-600">{req.description}</p>
                    <p className="mt-2 text-xs text-gray-500">Demandé par: {req.requestedByName}</p>
                  </div>

                  <div className="space-y-2">
                    <textarea
                      placeholder="Ajouter une note de révision..."
                      value={selectedCriticalId === req.id ? reviewNote : ''}
                      onChange={(e) => {
                        setSelectedCriticalId(req.id);
                        setReviewNote(e.target.value);
                      }}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          onApproveCritical(req.id, reviewNote);
                          setReviewNote('');
                          setSelectedCriticalId('');
                        }}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                      >
                        <Check className="h-4 w-4" />
                        Approuver
                      </button>
                      <button
                        onClick={() => {
                          onRejectCritical(req.id, reviewNote);
                          setReviewNote('');
                          setSelectedCriticalId('');
                        }}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                      >
                        <X className="h-4 w-4" />
                        Rejeter
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Audit Log */}
      <div className="ivos-card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">
            Journal d'Audit ({filteredAuditEntries.length})
          </h3>
          <button
            onClick={onExportCSV}
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
          >
            <Download className="h-4 w-4" />
            Exporter CSV
          </button>
        </div>

        {/* Filters */}
        <SearchFilter
          searchValue={searchText}
          onSearchChange={setSearchText}
          placeholder="Chercher par utilisateur, module, ou détails..."
          filters={[
            {
              label: 'Sévérité',
              value: 'severity',
              options: [
                { label: 'Toutes', value: 'all' },
                ...Object.entries(SEVERITY_STYLES).map(([key, val]) => ({
                  label: val.label,
                  value: key,
                })),
              ],
            },
            {
              label: 'Action',
              value: 'action',
              options: [
                { label: 'Toutes', value: 'all' },
                { label: 'Créations', value: 'create' },
                { label: 'Modifications', value: 'edit' },
                { label: 'Suppressions', value: 'delete' },
                { label: 'Consultations', value: 'view' },
              ],
            },
          ]}
          onFilterChange={(filterName, value) => {
            if (filterName === 'severity') setSeverityFilter(value as any);
            if (filterName === 'action') setActionFilter(value as any);
          }}
        />

        {/* Audit Table */}
        <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Utilisateur</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Action</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Module</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Sévérité</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Détails</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAuditEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    Aucune entrée d'audit trouvée
                  </td>
                </tr>
              ) : (
                filteredAuditEntries.slice(0, 50).map((entry, idx) => (
                  <tr
                    key={idx}
                    className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b border-gray-200 transition-colors hover:bg-blue-50`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{entry.userName}</td>
                    <td className="px-4 py-3 text-gray-700">
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{entry.module}</td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge
                        type={entry.severity}
                        label={SEVERITY_STYLES[entry.severity].label}
                        size="sm"
                      />
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-gray-600">
                      {entry.description}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                      {new Date(entry.timestamp).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onViewDetails(entry)}
                        className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-200"
                        title="Voir les détails"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
