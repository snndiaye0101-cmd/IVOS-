// ═══════════════════════════════════════════════════════════════
// ADMIN ANALYTICS TAB COMPONENT
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { User } from '../../../shared/services/authStore';
import type { UserActivityLog } from '../../../shared/services/userAnalyticsService';
import { Avatar, StatCard, SearchFilter, StatusBadge } from './AdminSharedComponents';
import { TrendingUp, Users, Activity, Clock, Target } from 'lucide-react';

interface AnalyticsTabProps {
  approvedUsers: User[];
  onlineUserIds: string[];
  analyticsActivityLogs: UserActivityLog[];
  selectedUserForAnalytics?: string;
  onSelectUserForAnalytics: (userId: string) => void;
  globalMetrics: {
    totalUsers: number;
    activeUsers: number;
    totalSessions: number;
    averageSessionDuration: number;
    totalActions: number;
  };
  topUsersStats: Array<{ user: User; actions: number; sessions: number; hours: number }>;
}

export function AnalyticsTab({
  approvedUsers,
  onlineUserIds,
  analyticsActivityLogs,
  selectedUserForAnalytics,
  onSelectUserForAnalytics,
  globalMetrics,
  topUsersStats,
}: AnalyticsTabProps) {
  const [analyticsDateFilter, setAnalyticsDateFilter] = useState<
    'today' | 'week' | 'month' | 'yesterday'
  >('week');
  const [analyticsUserFilter, setAnalyticsUserFilter] = useState<'all' | string>('all');
  const [analyticsSeverityFilter, setAnalyticsSeverityFilter] = useState<
    'all' | 'low' | 'medium' | 'high' | 'critical'
  >('all');
  const [analyticsModuleFilter, setAnalyticsModuleFilter] = useState<'all' | string>('all');
  const [analyticsSearchText, setAnalyticsSearchText] = useState('');

  // ──────────────────────────────────────────────────────────────
  // COMPUTED DATA
  // ──────────────────────────────────────────────────────────────
  const filteredActivityLogs = useMemo(() => {
    let result = analyticsActivityLogs;

    // Date filter
    const now = new Date();
    let startDate = now;
    if (analyticsDateFilter === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (analyticsDateFilter === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      startDate = yesterday;
      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59, 999);
      result = result.filter((log) => {
        const logDate = new Date(log.timestamp);
        return logDate >= yesterday && logDate <= endOfYesterday;
      });
    } else if (analyticsDateFilter === 'week') {
      startDate.setDate(startDate.getDate() - 7);
      result = result.filter((log) => new Date(log.timestamp) >= startDate);
    } else if (analyticsDateFilter === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
      result = result.filter((log) => new Date(log.timestamp) >= startDate);
    }

    if (analyticsDateFilter !== 'yesterday') {
      result = result.filter((log) => new Date(log.timestamp) >= startDate);
    }

    if (analyticsUserFilter !== 'all') {
      result = result.filter((log) => log.userId === analyticsUserFilter);
    }

    if (analyticsSeverityFilter !== 'all') {
      result = result.filter((log) => log.severity === analyticsSeverityFilter);
    }

    if (analyticsModuleFilter !== 'all') {
      result = result.filter((log) => log.module === analyticsModuleFilter);
    }

    if (analyticsSearchText.trim()) {
      const q = analyticsSearchText.toLowerCase();
      result = result.filter(
        (log) => log.action.toLowerCase().includes(q) || log.details.toLowerCase().includes(q)
      );
    }

    return result.slice(0, 50);
  }, [
    analyticsActivityLogs,
    analyticsDateFilter,
    analyticsUserFilter,
    analyticsSeverityFilter,
    analyticsModuleFilter,
    analyticsSearchText,
  ]);

  const selectedUserAnalytics = useMemo(() => {
    if (!selectedUserForAnalytics) return null;
    const userLogs = analyticsActivityLogs.filter((log) => log.userId === selectedUserForAnalytics);
    return {
      totalActions: userLogs.length,
      totalSessions: new Set(userLogs.map((log) => log.timestamp.split('T')[0])).size,
      avgActionsPerDay: Math.round(userLogs.length / 7),
      lastActivity: userLogs[0]?.timestamp || 'N/A',
    };
  }, [selectedUserForAnalytics, analyticsActivityLogs]);

  const selectedUserTimelineData = useMemo(() => {
    if (!selectedUserForAnalytics) return [];
    const userLogs = analyticsActivityLogs.filter((log) => log.userId === selectedUserForAnalytics);
    const dataByDate: Record<string, number> = {};
    userLogs.forEach((log) => {
      const date = new Date(log.timestamp).toLocaleDateString('fr-FR');
      dataByDate[date] = (dataByDate[date] || 0) + 1;
    });
    return Object.entries(dataByDate)
      .map(([date, count]) => ({ date, count }))
      .slice(-7);
  }, [selectedUserForAnalytics, analyticsActivityLogs]);

  const selectedUserModuleBreakdown = useMemo(() => {
    if (!selectedUserForAnalytics) return [];
    const userLogs = analyticsActivityLogs.filter((log) => log.userId === selectedUserForAnalytics);
    const byModule: Record<string, number> = {};
    userLogs.forEach((log) => {
      byModule[log.module] = (byModule[log.module] || 0) + 1;
    });
    return Object.entries(byModule).map(([name, value]) => ({ name, value }));
  }, [selectedUserForAnalytics, analyticsActivityLogs]);

  const COLORS = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f97316',
  ];

  // ──────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Global KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Total Utilisateurs"
          value={globalMetrics.totalUsers}
          subtext="approuvés"
          color="blue"
        />
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label="Utilisateurs Actifs"
          value={globalMetrics.activeUsers}
          subtext="cette semaine"
          color="green"
        />
        <StatCard
          icon={<Target className="h-4 w-4" />}
          label="Total Sessions"
          value={globalMetrics.totalSessions}
          subtext="enregistrées"
          color="emerald"
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Durée Moy. Session"
          value={`${globalMetrics.averageSessionDuration}m`}
          subtext="par session"
          color="violet"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Total Actions"
          value={globalMetrics.totalActions}
          subtext="cette semaine"
          color="red"
        />
      </div>

      {/* Top Users Ranking */}
      <div className="ivos-card">
        <h3 className="mb-4 text-sm font-bold text-gray-900">Top 5 Utilisateurs (Actions)</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          {topUsersStats.slice(0, 5).map((stat, idx) => (
            <button
              key={stat.user.id}
              onClick={() => onSelectUserForAnalytics(stat.user.id)}
              className={`cursor-pointer rounded-lg border-2 p-4 text-left transition-all ${
                selectedUserForAnalytics === stat.user.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xl font-bold text-gray-400"># {idx + 1}</span>
              </div>
              <Avatar user={stat.user} size="sm" showStatus={false} />
              <p className="mt-2 truncate font-semibold text-gray-900">{stat.user.fullName}</p>
              <div className="mt-2 space-y-1 text-xs">
                <p className="font-bold text-blue-600">{stat.actions} actions</p>
                <p className="text-gray-500">{stat.sessions} sessions</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected User Details */}
      {selectedUserForAnalytics && selectedUserAnalytics && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* User Stats */}
          <div className="ivos-card">
            <div className="mb-4 flex items-center gap-3">
              <Avatar
                user={approvedUsers.find((u) => u.id === selectedUserForAnalytics)!}
                size="md"
                online={onlineUserIds.includes(selectedUserForAnalytics)}
              />
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  {approvedUsers.find((u) => u.id === selectedUserForAnalytics)?.fullName}
                </h3>
                <p className="text-xs text-gray-500">
                  {approvedUsers.find((u) => u.id === selectedUserForAnalytics)?.email}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Total Actions</p>
                <p className="text-2xl font-bold text-blue-600">
                  {selectedUserAnalytics.totalActions}
                </p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Sessions</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {selectedUserAnalytics.totalSessions}
                </p>
              </div>
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
                <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Moy/Jour</p>
                <p className="text-2xl font-bold text-violet-600">
                  {selectedUserAnalytics.avgActionsPerDay}
                </p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="mb-1 text-xs font-semibold uppercase text-gray-500">
                  Dernière Activité
                </p>
                <p className="truncate text-sm font-bold text-amber-600">
                  {new Date(selectedUserAnalytics.lastActivity).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          </div>

          {/* User Activity Chart */}
          <div className="ivos-card">
            <h3 className="mb-4 text-sm font-bold text-gray-900">Activité (7 derniers jours)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={selectedUserTimelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Module Breakdown */}
          {selectedUserModuleBreakdown.length > 0 && (
            <div className="ivos-card">
              <h3 className="mb-4 text-sm font-bold text-gray-900">Répartition par Module</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={selectedUserModuleBreakdown}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label
                  >
                    {selectedUserModuleBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Activity Log with Filters */}
      <div className="ivos-card">
        <h3 className="mb-4 text-sm font-bold text-gray-900">
          Journal d'Activité ({filteredActivityLogs.length})
        </h3>

        {/* Filters */}
        <div className="mb-4 space-y-3">
          <SearchFilter
            searchValue={analyticsSearchText}
            onSearchChange={setAnalyticsSearchText}
            placeholder="Rechercher par action ou détails..."
            filters={[
              {
                label: 'Période',
                value: 'date',
                options: [
                  { label: "Aujourd'hui", value: 'today' },
                  { label: 'Hier', value: 'yesterday' },
                  { label: 'Cette semaine', value: 'week' },
                  { label: 'Ce mois', value: 'month' },
                ],
              },
              {
                label: 'Utilisateur',
                value: 'user',
                options: [
                  { label: 'Tous', value: 'all' },
                  ...approvedUsers.map((u) => ({ label: u.fullName, value: u.id })),
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
                label: 'Module',
                value: 'module',
                options: [
                  { label: 'Tous', value: 'all' },
                  { label: 'Dashboard', value: 'dashboard' },
                  { label: 'Flotte', value: 'fleet' },
                  { label: 'Exploitation', value: 'exploitation' },
                ],
              },
            ]}
            onFilterChange={(filterName, value) => {
              if (filterName === 'date') setAnalyticsDateFilter(value as any);
              if (filterName === 'user') setAnalyticsUserFilter(value);
              if (filterName === 'severity') setAnalyticsSeverityFilter(value as any);
              if (filterName === 'module') setAnalyticsModuleFilter(value);
            }}
          />
        </div>

        {/* Activity Table */}
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Utilisateur</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Action</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Module</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Sévérité</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Détails</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredActivityLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    Aucune activité trouvée
                  </td>
                </tr>
              ) : (
                filteredActivityLogs.map((log, idx) => (
                  <tr
                    key={idx}
                    className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b border-gray-200 hover:bg-blue-50`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {approvedUsers.find((u) => u.id === log.userId)?.fullName || log.userId}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{log.action}</td>
                    <td className="px-4 py-3 text-gray-700">{log.module}</td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge type={log.severity} label={log.severity} size="sm" />
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-gray-600">
                      {log.details}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
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
