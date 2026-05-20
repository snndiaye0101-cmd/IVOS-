// ═══════════════════════════════════════════════════════════════
// ADMIN DASHBOARD TAB COMPONENT
// ═══════════════════════════════════════════════════════════════

import React, { useMemo } from 'react';
import {
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
  Legend,
} from 'recharts';
import { Wifi, WifiOff, TrendingUp } from 'lucide-react';
import type { User } from '../../../shared/services/authStore';

interface DashboardTabProps {
  onlineUsers: User[];
  offlineUsers: User[];
  approvedUsers: User[];
  sessionsLog: Array<{
    userId: string;
    loginAt: string;
    logoutAt: string | null;
    durationMinutes: number | null;
  }>;
  onlineUserIds: string[];
  activityLogs: Array<{ action: string; timestamp: string }>;
}

export function DashboardTab({
  onlineUsers,
  offlineUsers,
  approvedUsers,
  sessionsLog,
  onlineUserIds,
  activityLogs,
}: DashboardTabProps) {
  // ──────────────────────────────────────────────────────────────
  // COMPUTED DATA
  // ──────────────────────────────────────────────────────────────
  const weeklyStats = useMemo(() => {
    const now = new Date();
    const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const userWeeklyStats = approvedUsers.map((u) => {
      const userSessions = sessionsLog.filter(
        (s) => s.userId === u.id && new Date(s.loginAt).getTime() >= weekAgo
      );
      const totalMinutes = userSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
      const sessionCount = userSessions.length;
      return {
        user: u,
        totalMinutes,
        totalHours: Number((totalMinutes / 60).toFixed(1)),
        sessionCount,
        isOnline: onlineUserIds.includes(u.id),
      };
    });
    return userWeeklyStats.sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [approvedUsers, sessionsLog, onlineUserIds]);

  const weeklyActivityData = useMemo(() => {
    const now = new Date();
    const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const weekLogs = activityLogs.filter((l) => new Date(l.timestamp).getTime() >= weekAgo);
    const labels: Record<string, string> = {
      create: 'Créations',
      edit: 'Modifications',
      delete: 'Suppressions',
      view: 'Consultations',
    };
    const counts: Record<string, number> = {};
    weekLogs.forEach((l) => {
      const label = labels[l.action] || l.action;
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [activityLogs]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const totalWeeklyHours = weeklyStats.reduce((acc, s) => acc + s.totalHours, 0);

  // ──────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="ivos-kpi">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-50">
              <Wifi className="h-4 w-4 text-green-500" />
            </div>
            En ligne
          </div>
          <p className="text-3xl font-extrabold text-gray-900">{onlineUsers.length}</p>
          <p className="mt-1.5 text-xs font-medium text-gray-400">
            sur {approvedUsers.length} utilisateurs
          </p>
        </div>

        <div className="ivos-kpi">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100">
              <WifiOff className="h-4 w-4 text-gray-400" />
            </div>
            Hors-ligne
          </div>
          <p className="text-3xl font-extrabold text-gray-900">{offlineUsers.length}</p>
          <p className="mt-1.5 text-xs font-medium text-gray-400">inactifs actuellement</p>
        </div>

        <div className="ivos-kpi">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50">
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            Heures Semaine
          </div>
          <p className="text-3xl font-extrabold text-gray-900">{totalWeeklyHours}</p>
          <p className="mt-1.5 text-xs font-medium text-gray-400">total connecté</p>
        </div>

        <div className="ivos-kpi">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50">
              <span className="font-bold text-emerald-600">↑</span>
            </div>
            Créations
          </div>
          <p className="text-3xl font-extrabold text-gray-900">
            {weeklyActivityData.find((d) => d.name === 'Créations')?.value || 0}
          </p>
          <p className="mt-1.5 text-xs font-medium text-gray-400">cette semaine</p>
        </div>

        <div className="ivos-kpi">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50">
              <span className="font-bold text-violet-600">✓</span>
            </div>
            Actions
          </div>
          <p className="text-3xl font-extrabold text-gray-900">
            {weeklyActivityData.reduce((sum, d) => sum + d.value, 0)}
          </p>
          <p className="mt-1.5 text-xs font-medium text-gray-400">cette semaine</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Activity Chart */}
        <div className="ivos-card">
          <h3 className="mb-4 text-sm font-bold text-gray-900">Activités Cette Semaine</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyActivityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* User Type Distribution */}
        <div className="ivos-card">
          <h3 className="mb-4 text-sm font-bold text-gray-900">Distribution Utilisateurs</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'En ligne', value: onlineUsers.length },
                  { name: 'Hors-ligne', value: offlineUsers.length },
                ]}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                <Cell fill="#10b981" />
                <Cell fill="#9ca3af" />
              </Pie>
              <Tooltip formatter={(value) => `${value} utilisateurs`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Users Table */}
      <div className="ivos-card">
        <h3 className="mb-4 text-sm font-bold text-gray-900">Top 5 Utilisateurs (Cette Semaine)</h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Rang</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Utilisateur</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Heures</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Sessions</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Statut</th>
              </tr>
            </thead>
            <tbody>
              {weeklyStats.slice(0, 5).map((stat, idx) => (
                <tr
                  key={stat.user.id}
                  className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b border-gray-200 transition-colors hover:bg-blue-50`}
                >
                  <td className="px-4 py-3 font-bold text-gray-900">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{stat.user.fullName}</td>
                  <td className="px-4 py-3 text-center font-bold text-blue-600">
                    {stat.totalHours}h
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{stat.sessionCount}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-bold ${stat.isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {stat.isOnline ? '🟢 En ligne' : '⚫ Hors-ligne'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
