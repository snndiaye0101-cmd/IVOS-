import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useViewAs } from '../../../shared/contexts/ViewAsContext';
import {
  CheckCircle,
  XCircle,
  Trash2,
  Shield,
  Clock,
  UserCheck,
  UserX,
  Activity,
  Wifi,
  WifiOff,
  BarChart3,
  FileEdit,
  PlusCircle,
  Eye,
  LogIn,
  LogOut,
  Calendar,
  Timer,
  TrendingUp,
  Briefcase,
  X,
  Camera,
  ChevronRight,
  Lock,
} from 'lucide-react';
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
import type { User } from '../../../shared/services/authStore';
import { sendNotification } from '../../../shared/services/notificationService';

type Tab = 'pending' | 'dashboard' | 'activity' | 'all';

export default function UserManagementPage() {
  const {
    allUsers,
    pendingUsers,
    approveUser,
    rejectUser,
    deleteUser,
    toggleAdmin,
    toggleSiteAccess,
    toggleSystemAccess,
    updateUserPhoto,
    user: currentUser,
    onlineUserIds,
    sessionsLog,
    activityLogs,
  } = useAuth();
  const { isSuperAdmin } = useViewAs();
  const [tab, setTab] = useState<Tab>(pendingUsers.length > 0 ? 'pending' : 'dashboard');

  // Approval modal state
  const [approvalTarget, setApprovalTarget] = useState<User | null>(null);
  const [approvalFonction, setApprovalFonction] = useState('');
  const [approvalMakeAdmin, setApprovalMakeAdmin] = useState(false);
  const [approvalPhoto, setApprovalPhoto] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkFonction, setBulkFonction] = useState('');

  const openApprovalModal = (u: User) => {
    setApprovalTarget(u);
    setApprovalFonction('');
    setApprovalMakeAdmin(false);
    setApprovalPhoto(u.photo || '');
  };

  const confirmApproval = () => {
    if (!approvalTarget || !approvalFonction.trim()) return;
    if (approvalPhoto) updateUserPhoto(approvalTarget.id, approvalPhoto);
    approveUser(approvalTarget.id, approvalFonction.trim(), approvalMakeAdmin);
    // Notification à l'utilisateur approuvé
    sendNotification({
      userId: approvalTarget.id,
      type: 'other',
      title: 'Compte approuvé',
      message: `Votre compte a été approuvé${approvalMakeAdmin ? ' avec droits administrateur' : ''}.`,
      entityType: 'user',
      entityId: approvalTarget.id,
      metadata: { fonction: approvalFonction, admin: approvalMakeAdmin },
    });
    setApprovalTarget(null);
  };

  const bulkApprove = () => {
    if (bulkSelected.size === 0 || !bulkFonction.trim()) return;
    bulkSelected.forEach((id) => {
      approveUser(id, bulkFonction.trim(), false);
      sendNotification({
        userId: id,
        type: 'other',
        title: 'Compte approuvé',
        message: 'Votre compte a été approuvé.',
        entityType: 'user',
        entityId: id,
      });
    });
    setBulkSelected(new Set());
    setBulkFonction('');
  };

  const bulkReject = () => {
    if (bulkSelected.size === 0) return;
    bulkSelected.forEach((id) => rejectUser(id));
    setBulkSelected(new Set());
  };

  const toggleBulk = (id: string) => {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleBulkAll = () => {
    if (bulkSelected.size === pendingUsers.length) setBulkSelected(new Set());
    else setBulkSelected(new Set(pendingUsers.map((u) => u.id)));
  };

  const handlePhotoUpload = (callback: (dataUrl: string) => void) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        alert('La photo ne doit pas dépasser 2 Mo');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        // Resize to max 200x200 to save localStorage space
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const size = Math.min(img.width, img.height);
          const sx = (img.width - size) / 2;
          const sy = (img.height - size) / 2;
          canvas.width = 200;
          canvas.height = 200;
          canvas.getContext('2d')!.drawImage(img, sx, sy, size, size, 0, 0, 200, 200);
          callback(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // Avatar helper
  // Vivid avatar colors based on initials
  const AVATAR_COLORS = [
    'from-blue-500 to-blue-600',
    'from-emerald-500 to-emerald-600',
    'from-violet-500 to-violet-600',
    'from-amber-500 to-amber-600',
    'from-rose-500 to-rose-600',
    'from-cyan-500 to-cyan-600',
    'from-indigo-500 to-indigo-600',
    'from-pink-500 to-pink-600',
  ];
  const getAvatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

  const Avatar = ({
    user: u,
    size = 'md',
    online,
  }: {
    user: User;
    size?: 'sm' | 'md' | 'lg';
    online?: boolean;
  }) => {
    const sizeClasses = { sm: 'w-9 h-9 text-xs', md: 'w-11 h-11 text-sm', lg: 'w-12 h-12 text-sm' };
    const dotClasses = { sm: 'w-2.5 h-2.5', md: 'w-3 h-3', lg: 'w-3.5 h-3.5' };
    const initials = u.fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    return (
      <div className="relative flex-shrink-0">
        {u.photo ? (
          <img
            src={u.photo}
            alt={u.fullName}
            className={`${sizeClasses[size]} rounded-2xl object-cover shadow-sm`}
          />
        ) : (
          <div
            className={`${sizeClasses[size]} rounded-2xl bg-gradient-to-br ${getAvatarColor(u.fullName)} flex items-center justify-center font-bold text-white shadow-sm`}
          >
            {initials}
          </div>
        )}
        {online !== undefined && (
          <div
            className={`absolute -bottom-0.5 -right-0.5 ${dotClasses[size]} rounded-full border-2 border-white ${online ? 'bg-green-500' : 'bg-gray-400'}`}
          />
        )}
      </div>
    );
  };

  // ── Computed data ──
  const approvedUsers = useMemo(() => allUsers.filter((u) => u.status === 'approved'), [allUsers]);

  const onlineUsers = useMemo(
    () => approvedUsers.filter((u) => onlineUserIds.includes(u.id)),
    [approvedUsers, onlineUserIds]
  );
  const offlineUsers = useMemo(
    () => approvedUsers.filter((u) => !onlineUserIds.includes(u.id)),
    [approvedUsers, onlineUserIds]
  );

  // Weekly hours per user
  const weeklyStats = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 86400000;
    return approvedUsers
      .map((u) => {
        const userSessions = sessionsLog.filter(
          (s) => s.userId === u.id && new Date(s.loginAt).getTime() >= weekAgo
        );
        const totalMinutes = userSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
        const sessionCount = userSessions.length;
        const userLogs = activityLogs.filter(
          (l) => l.userId === u.id && new Date(l.timestamp).getTime() >= weekAgo
        );
        const creates = userLogs.filter((l) => l.action === 'create').length;
        const edits = userLogs.filter((l) => l.action === 'edit').length;
        const deletes = userLogs.filter((l) => l.action === 'delete').length;
        const views = userLogs.filter((l) => l.action === 'view').length;
        const lastLogin =
          userSessions.length > 0
            ? userSessions.sort(
                (a, b) => new Date(b.loginAt).getTime() - new Date(a.loginAt).getTime()
              )[0].loginAt
            : null;
        return {
          user: u,
          totalMinutes,
          totalHours: Number((totalMinutes / 60).toFixed(1)),
          sessionCount,
          creates,
          edits,
          deletes,
          views,
          totalActions: creates + edits + deletes + views,
          isOnline: onlineUserIds.includes(u.id),
          lastLogin,
        };
      })
      .sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [approvedUsers, sessionsLog, activityLogs, onlineUserIds]);

  // Daily connection hours chart (last 7 days)
  const dailyHoursChart = useMemo(() => {
    const now = Date.now();
    const days: { day: string; heures: number }[] = [];
    for (let d = 6; d >= 0; d--) {
      const date = new Date(now - d * 86400000);
      const dayStr = date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit' });
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      const minutes = sessionsLog
        .filter((s) => {
          const t = new Date(s.loginAt).getTime();
          return t >= dayStart.getTime() && t <= dayEnd.getTime();
        })
        .reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
      days.push({ day: dayStr, heures: Number((minutes / 60).toFixed(1)) });
    }
    return days;
  }, [sessionsLog]);

  // Activity by module pie chart
  const moduleChart = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 86400000;
    const weekLogs = activityLogs.filter(
      (l) => new Date(l.timestamp).getTime() >= weekAgo && l.module !== 'Auth'
    );
    const counts: Record<string, number> = {};
    weekLogs.forEach((l) => {
      counts[l.module] = (counts[l.module] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [activityLogs]);

  // Actions by type pie chart
  const actionTypeChart = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 86400000;
    const weekLogs = activityLogs.filter(
      (l) => new Date(l.timestamp).getTime() >= weekAgo && l.module !== 'Auth'
    );
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

  const COLORS = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#84cc16',
  ];
  const ACTION_COLORS: Record<string, string> = {
    Créations: '#10b981',
    Modifications: '#3b82f6',
    Suppressions: '#ef4444',
    Consultations: '#f59e0b',
  };

  // Recent activity
  const recentActivity = useMemo(() => activityLogs.slice(0, 30), [activityLogs]);

  // ── Helpers ──
  const getStatusBadge = (status: User['status']) => {
    switch (status) {
      case 'approved':
        return (
          <span className="ivos-badge-green">
            <UserCheck className="h-3.5 w-3.5" /> Actif
          </span>
        );
      case 'pending':
        return (
          <span className="ivos-badge-orange">
            <Clock className="h-3.5 w-3.5" /> En Attente
          </span>
        );
      case 'rejected':
        return (
          <span className="ivos-badge-red">
            <UserX className="h-3.5 w-3.5" /> Refusé
          </span>
        );
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <PlusCircle className="h-3.5 w-3.5 text-green-500" />;
      case 'edit':
        return <FileEdit className="h-3.5 w-3.5 text-blue-500" />;
      case 'delete':
        return <Trash2 className="h-3.5 w-3.5 text-red-500" />;
      case 'view':
        return <Eye className="h-3.5 w-3.5 text-amber-500" />;
      case 'login':
        return <LogIn className="h-3.5 w-3.5 text-emerald-500" />;
      case 'logout':
        return <LogOut className="h-3.5 w-3.5 text-gray-400" />;
      default:
        return <Activity className="h-3.5 w-3.5 text-gray-400" />;
    }
  };

  const getActionLabel = (action: string) => {
    const map: Record<string, string> = {
      create: 'Création',
      edit: 'Modification',
      delete: 'Suppression',
      view: 'Consultation',
      login: 'Connexion',
      logout: 'Déconnexion',
    };
    return map[action] || action;
  };

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `Il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Il y a ${days}j`;
  };

  const formatDateTime = (ts: string) =>
    new Date(ts).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  // Summary KPIs
  const totalWeeklyHours = weeklyStats.reduce((acc, s) => acc + s.totalHours, 0);
  const totalCreates = weeklyStats.reduce((acc, s) => acc + s.creates, 0);
  const totalEdits = weeklyStats.reduce((acc, s) => acc + s.edits, 0);
  const totalActions = weeklyStats.reduce((acc, s) => acc + s.totalActions, 0);

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'pending', label: 'En attente', count: pendingUsers.length },
    { key: 'dashboard', label: 'Dashboard activité' },
    { key: 'activity', label: "Journal d'activité" },
    { key: 'all', label: 'Tous les utilisateurs', count: allUsers.length - 1 },
  ];

  const displayedAllUsers = allUsers.filter((u) => u.id !== currentUser?.id);

  const handleToggleSiteBlock = (u: User) => {
    const verb = u.siteAccessBlocked ? 'rétablir' : 'bloquer';
    if (
      !confirm(
        `${verb.charAt(0).toUpperCase() + verb.slice(1)} l'accès site, le badge et le pointage de ${u.fullName} ?`
      )
    )
      return;
    if (toggleSiteAccess(u.id)) {
      sendNotification({
        userId: u.id,
        type: 'other',
        title: u.siteAccessBlocked ? 'Accès site rétabli' : 'Accès site bloqué',
        message: u.siteAccessBlocked
          ? 'Votre accès site, badge et pointage ont été réactivés.'
          : 'Votre accès site, badge et pointage ont été désactivés.',
        entityType: 'user',
        entityId: u.id,
      });
    }
  };

  const handleToggleSystemBlock = (u: User) => {
    const verb = u.systemAccessBlocked ? 'rétablir' : 'bloquer';
    if (
      !confirm(
        `${verb.charAt(0).toUpperCase() + verb.slice(1)} l'accès système complet de ${u.fullName} ?`
      )
    )
      return;
    if (toggleSystemAccess(u.id)) {
      sendNotification({
        userId: u.id,
        type: 'other',
        title: u.systemAccessBlocked ? 'Accès système rétabli' : 'Accès système bloqué',
        message: u.systemAccessBlocked
          ? 'Votre accès système a été réactivé.'
          : 'Votre accès système a été bloqué par le Super Admin.',
        entityType: 'user',
        entityId: u.id,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="ivos-page-header sticky top-[72px] z-20 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 flex items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
              <Shield className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Gestion des utilisateurs</h1>
              <p className="mt-0.5 text-sm font-medium text-gray-400">
                Administration, suivi d'activité et validation des comptes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {pendingUsers.length > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-400/15 px-4 py-2 backdrop-blur-sm">
                <Clock className="h-4 w-4 text-amber-300" />
                <span className="text-sm font-semibold text-amber-200">
                  {pendingUsers.length} en attente
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-xl border border-green-400/25 bg-green-400/15 px-4 py-2 backdrop-blur-sm">
              <Wifi className="h-4 w-4 text-green-300" />
              <span className="text-sm font-semibold text-green-200">
                {onlineUsers.length} en ligne
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex w-fit flex-wrap gap-1 rounded-2xl bg-gray-100/80 p-1.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
              tab === t.key
                ? 'bg-white text-gray-900 shadow-card'
                : 'text-gray-500 hover:bg-white/50 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                  t.key === 'pending' ? 'bg-amber-500 text-white' : 'bg-gray-300 text-gray-700'
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ TAB: Pending ═══ */}
      {tab === 'pending' &&
        (pendingUsers.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-sm text-gray-500">Aucune demande en attente</p>
          </div>
        ) : (
          <div className="ivos-card overflow-hidden">
            {/* Bulk action bar */}
            {bulkSelected.size > 0 && (
              <div className="flex items-center gap-3 border-b border-blue-100 bg-blue-50 px-4 py-3">
                <span className="text-sm font-semibold text-blue-700">
                  {bulkSelected.size} sélectionné{bulkSelected.size > 1 ? 's' : ''}
                </span>
                <select
                  value={bulkFonction}
                  onChange={(e) => setBulkFonction(e.target.value)}
                  className="rounded-lg border-gray-200 px-2 py-1.5 text-xs font-medium"
                >
                  <option value="">— Fonction —</option>
                  <option value="Chauffeur">Chauffeur</option>
                  <option value="Mécanicien">Mécanicien</option>
                  <option value="Superviseur Opérations">Superviseur Opérations</option>
                  <option value="Coordinateur Logistique">Coordinateur Logistique</option>
                  <option value="Gestionnaire Flotte">Gestionnaire Flotte</option>
                  <option value="Comptable">Comptable</option>
                  <option value="Stagiaire">Stagiaire</option>
                </select>
                <button
                  onClick={bulkApprove}
                  disabled={!bulkFonction}
                  className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-green-700 disabled:opacity-40"
                >
                  <CheckCircle className="h-3.5 w-3.5" /> Approuver tout
                </button>
                <button
                  onClick={bulkReject}
                  className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-red-700"
                >
                  <XCircle className="h-3.5 w-3.5" /> Refuser tout
                </button>
              </div>
            )}
            <table className="ivos-table">
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      checked={bulkSelected.size === pendingUsers.length && pendingUsers.length > 0}
                      onChange={toggleBulkAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th>Utilisateur</th>
                  <th>Date de demande</th>
                  <th>Délai</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map((u) => (
                  <tr key={u.id} className={bulkSelected.has(u.id) ? 'bg-blue-50/50' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={bulkSelected.has(u.id)}
                        onChange={() => toggleBulk(u.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar user={u} size="lg" />
                        <div>
                          <p className="text-sm font-bold text-gray-900">{u.fullName}</p>
                          <p className="mt-0.5 text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-sm text-gray-600">{formatDateTime(u.createdAt)}</span>
                    </td>
                    <td>
                      <span className="ivos-badge-orange">{timeAgo(u.createdAt)}</span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openApprovalModal(u)}
                          className="ivos-btn-primary !rounded-xl !px-4 !py-2 !text-xs !shadow-md"
                        >
                          <CheckCircle className="h-4 w-4" /> Approuver
                        </button>
                        <button
                          onClick={() => rejectUser(u.id)}
                          className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
                        >
                          <XCircle className="h-4 w-4" /> Refuser
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {/* ═══ TAB: Dashboard ═══ */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <div className="ivos-kpi">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-50">
                  <Wifi className="h-4 w-4 text-green-500" />
                </div>{' '}
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
                </div>{' '}
                Hors ligne
              </div>
              <p className="text-3xl font-extrabold text-gray-900">{offlineUsers.length}</p>
              <p className="mt-1.5 text-xs font-medium text-gray-400">inactifs actuellement</p>
            </div>
            <div className="ivos-kpi">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50">
                  <Timer className="h-4 w-4 text-blue-500" />
                </div>{' '}
                Heures / sem.
              </div>
              <p className="text-3xl font-extrabold text-gray-900">
                {totalWeeklyHours.toFixed(0)}
                <span className="ml-0.5 text-lg text-gray-400">h</span>
              </p>
              <p className="mt-1.5 text-xs font-medium text-gray-400">temps total connecté</p>
            </div>
            <div className="ivos-kpi">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50">
                  <PlusCircle className="h-4 w-4 text-emerald-500" />
                </div>{' '}
                Créations
              </div>
              <p className="text-3xl font-extrabold text-gray-900">{totalCreates}</p>
              <p className="mt-1.5 text-xs font-medium text-gray-400">cette semaine</p>
            </div>
            <div className="ivos-kpi">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                </div>{' '}
                Actions
              </div>
              <p className="text-3xl font-extrabold text-gray-900">{totalActions}</p>
              <p className="mt-1.5 text-xs font-medium text-gray-400">{totalEdits} modifications</p>
            </div>
          </div>

          {/* Online / Offline Users */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Online */}
            <div className="ivos-card">
              <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-50">
                  <Wifi className="h-3.5 w-3.5 text-green-500" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">En ligne</h3>
                <span className="ivos-badge-green ml-auto">{onlineUsers.length}</span>
              </div>
              <div className="max-h-72 space-y-3 overflow-y-auto p-4">
                {onlineUsers.length === 0 ? (
                  <p className="py-4 text-center text-sm text-gray-400">
                    Aucun utilisateur en ligne
                  </p>
                ) : (
                  onlineUsers.map((u) => {
                    const stats = weeklyStats.find((s) => s.user.id === u.id);
                    return (
                      <div
                        key={u.id}
                        className="flex items-center gap-3 rounded-lg border border-green-100 bg-green-50/50 p-3"
                      >
                        <Avatar user={u} size="md" online={true} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">{u.fullName}</p>
                          <p className="text-xs text-gray-500">
                            {stats?.totalHours || 0}h cette semaine · {stats?.totalActions || 0}{' '}
                            actions
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            {/* Offline */}
            <div className="ivos-card">
              <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
                  <WifiOff className="h-3.5 w-3.5 text-gray-400" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">Hors ligne</h3>
                <span className="ivos-badge ml-auto bg-gray-100 text-gray-600">
                  {offlineUsers.length}
                </span>
              </div>
              <div className="max-h-72 space-y-3 overflow-y-auto p-4">
                {offlineUsers.length === 0 ? (
                  <p className="py-4 text-center text-sm text-gray-400">
                    Tous les utilisateurs sont en ligne
                  </p>
                ) : (
                  offlineUsers.map((u) => {
                    const stats = weeklyStats.find((s) => s.user.id === u.id);
                    return (
                      <div
                        key={u.id}
                        className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3"
                      >
                        <Avatar user={u} size="md" online={false} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">{u.fullName}</p>
                          <p className="text-xs text-gray-400">
                            {stats?.lastLogin
                              ? `Dernière connexion : ${timeAgo(stats.lastLogin)}`
                              : 'Jamais connecté'}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Weekly hours bar chart */}
            <div className="ivos-card p-5 lg:col-span-1">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                <h3 className="text-sm font-semibold text-gray-900">Heures de connexion (7j)</h3>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dailyHoursChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit="h" />
                  <Tooltip formatter={(v: number) => [`${v}h`, 'Heures']} />
                  <Bar dataKey="heures" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Activity by module pie */}
            <div className="ivos-card p-5">
              <div className="mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-purple-500" />
                <h3 className="text-sm font-semibold text-gray-900">Activité par module (7j)</h3>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={moduleChart}
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                    style={{ fontSize: 10 }}
                  >
                    {moduleChart.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Action types pie */}
            <div className="ivos-card p-5">
              <div className="mb-4 flex items-center gap-2">
                <FileEdit className="h-4 w-4 text-green-500" />
                <h3 className="text-sm font-semibold text-gray-900">Types d'actions (7j)</h3>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={actionTypeChart}
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    style={{ fontSize: 10 }}
                  >
                    {actionTypeChart.map((entry) => (
                      <Cell key={entry.name} fill={ACTION_COLORS[entry.name] || '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Per-user weekly stats table */}
          <div className="ivos-card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
              <Calendar className="h-4 w-4 text-blue-500" />
              <h3 className="text-sm font-bold text-gray-900">
                Statistiques hebdomadaires par utilisateur
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="ivos-table">
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th className="text-center">Statut</th>
                    <th className="text-center">Heures</th>
                    <th className="text-center">Sessions</th>
                    <th className="text-center">Créations</th>
                    <th className="text-center">Modifications</th>
                    <th className="text-center">Suppressions</th>
                    <th className="text-center">Consultations</th>
                    <th className="text-center">Total</th>
                    <th>Dernière conn.</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyStats.map((s) => (
                    <tr key={s.user.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <Avatar user={s.user} size="sm" online={s.isOnline} />
                          <div>
                            <p className="text-sm font-bold text-gray-900">{s.user.fullName}</p>
                            <p className="text-xs text-gray-400">{s.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-center">
                        {s.isOnline ? (
                          <span className="ivos-badge-green">En ligne</span>
                        ) : (
                          <span className="ivos-badge bg-gray-100 text-gray-500">Hors ligne</span>
                        )}
                      </td>
                      <td className="text-center">
                        <span className="text-sm font-bold text-blue-600">{s.totalHours}h</span>
                      </td>
                      <td className="text-center text-sm text-gray-700">{s.sessionCount}</td>
                      <td className="text-center">
                        <span className="text-sm font-bold text-green-600">{s.creates}</span>
                      </td>
                      <td className="text-center">
                        <span className="text-sm font-bold text-blue-600">{s.edits}</span>
                      </td>
                      <td className="text-center">
                        <span className="text-sm font-bold text-red-600">{s.deletes}</span>
                      </td>
                      <td className="text-center">
                        <span className="text-sm font-bold text-amber-600">{s.views}</span>
                      </td>
                      <td className="text-center">
                        <span className="text-sm font-extrabold text-gray-900">
                          {s.totalActions}
                        </span>
                      </td>
                      <td className="text-sm text-gray-500">
                        {s.lastLogin ? timeAgo(s.lastLogin) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: Activity Log ═══ */}
      {tab === 'activity' && (
        <div className="ivos-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50">
              <Activity className="h-3.5 w-3.5 text-purple-500" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Journal d'activité récent</h3>
            <span className="ml-auto text-xs font-medium text-gray-400">
              {activityLogs.length} entrées
            </span>
          </div>
          <div className="max-h-[600px] divide-y divide-gray-100 overflow-y-auto">
            {recentActivity.map((log) => (
              <div key={log.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                <div className="flex-shrink-0">{getActionIcon(log.action)}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{log.userName}</span>
                    {' — '}
                    <span
                      className={`font-medium ${
                        log.action === 'create'
                          ? 'text-green-600'
                          : log.action === 'edit'
                            ? 'text-blue-600'
                            : log.action === 'delete'
                              ? 'text-red-600'
                              : log.action === 'login'
                                ? 'text-emerald-600'
                                : log.action === 'logout'
                                  ? 'text-gray-500'
                                  : 'text-amber-600'
                      }`}
                    >
                      {getActionLabel(log.action)}
                    </span>
                  </p>
                  <p className="truncate text-xs text-gray-500">{log.details}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs text-gray-400">{timeAgo(log.timestamp)}</p>
                  <p className="text-xs text-gray-300">{formatDateTime(log.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ TAB: All Users ═══ */}
      {tab === 'all' &&
        (displayedAllUsers.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <p className="text-sm text-gray-500">Aucun autre utilisateur</p>
          </div>
        ) : (
          <div className="ivos-card overflow-hidden">
            <table className="ivos-table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Fonction</th>
                  <th>Rôle</th>
                  <th>Statut</th>
                  <th>Date d'inscription</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedAllUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div
                          className="group relative cursor-pointer"
                          onClick={() => handlePhotoUpload((photo) => updateUserPhoto(u.id, photo))}
                        >
                          <Avatar
                            user={u}
                            size="md"
                            online={
                              u.status === 'approved' ? onlineUserIds.includes(u.id) : undefined
                            }
                          />
                          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                            <Camera className="h-3.5 w-3.5 text-white" />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{u.fullName}</p>
                          <p className="mt-0.5 text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">
                        {u.fonction || <span className="italic text-gray-400">—</span>}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-sm font-medium ${u.role === 'Admin' ? 'text-blue-700' : 'text-gray-700'}`}
                      >
                        {u.role === 'Admin' && <Shield className="mr-1 inline h-3.5 w-3.5" />}
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {getStatusBadge(u.status)}
                        {u.siteAccessBlocked && (
                          <span className="ivos-badge-red">
                            <Lock className="h-3.5 w-3.5" /> Site bloqué
                          </span>
                        )}
                        {u.systemAccessBlocked && (
                          <span className="ivos-badge-red">
                            <Shield className="h-3.5 w-3.5" /> Système bloqué
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {u.status === 'pending' && (
                          <>
                            <button
                              onClick={() => openApprovalModal(u)}
                              className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
                            >
                              <CheckCircle className="h-3.5 w-3.5" /> Approuver
                            </button>
                            <button
                              onClick={() => rejectUser(u.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Refuser
                            </button>
                          </>
                        )}
                        {u.status === 'rejected' && (
                          <button
                            onClick={() => openApprovalModal(u)}
                            className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
                          >
                            <CheckCircle className="h-3.5 w-3.5" /> Approuver
                          </button>
                        )}
                        {u.status === 'approved' && (
                          <button
                            onClick={() => setSelectedUser(u)}
                            className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-100"
                          >
                            <Activity className="h-3.5 w-3.5" /> Journal
                          </button>
                        )}
                        {u.status === 'approved' && (
                          <button
                            onClick={() => handleToggleSiteBlock(u)}
                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                              u.siteAccessBlocked
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-red-50 text-red-700 hover:bg-red-100'
                            }`}
                          >
                            <Lock className="h-3.5 w-3.5" />
                            {u.siteAccessBlocked ? 'Débloquer site' : 'Bloquer site'}
                          </button>
                        )}
                        {u.status === 'approved' && isSuperAdmin && u.role === 'Admin' && (
                          <button
                            onClick={() => handleToggleSystemBlock(u)}
                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                              u.systemAccessBlocked
                                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                : 'bg-red-50 text-red-700 hover:bg-red-100'
                            }`}
                          >
                            <Lock className="h-3.5 w-3.5" />
                            {u.systemAccessBlocked ? 'Débloquer système' : 'Bloquer système'}
                          </button>
                        )}
                        {u.status === 'approved' && (
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  u.role === 'Admin'
                                    ? 'Retirer les droits admin ?'
                                    : 'Promouvoir en administrateur ?'
                                )
                              )
                                toggleAdmin(u.id);
                            }}
                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                              u.role === 'Admin'
                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                            }`}
                          >
                            <Shield className="h-3.5 w-3.5" />
                            {u.role === 'Admin' ? 'Retirer Admin' : 'Rendre Admin'}
                          </button>
                        )}
                        {u.role !== 'Admin' && (
                          <button
                            onClick={() => {
                              if (confirm('Supprimer cet utilisateur ?')) deleteUser(u.id);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {/* ═══ Per-User Activity Panel ═══ */}
      {selectedUser &&
        (() => {
          const userLogs = activityLogs.filter((l) => l.userId === selectedUser.id);
          const userSessions = sessionsLog
            .filter((s) => s.userId === selectedUser.id)
            .sort((a, b) => new Date(b.loginAt).getTime() - new Date(a.loginAt).getTime());
          const now = Date.now();
          const weekAgo = now - 7 * 86400000;
          const weekLogs = userLogs.filter((l) => new Date(l.timestamp).getTime() >= weekAgo);
          const weekSessions = userSessions.filter((s) => new Date(s.loginAt).getTime() >= weekAgo);
          const totalHours = Number(
            (weekSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0) / 60).toFixed(1)
          );
          const creates = weekLogs.filter((l) => l.action === 'create').length;
          const edits = weekLogs.filter((l) => l.action === 'edit').length;
          const deletes = weekLogs.filter((l) => l.action === 'delete').length;
          const views = weekLogs.filter((l) => l.action === 'view').length;
          const isOnline = onlineUserIds.includes(selectedUser.id);

          return (
            <div
              className="fixed inset-0 z-50 flex justify-end"
              onClick={() => setSelectedUser(null)}
            >
              <div className="absolute inset-0 bg-black/30" />
              <div
                className="animate-in slide-in-from-right relative flex h-full w-full max-w-lg flex-col bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex flex-shrink-0 items-center gap-3 border-b border-gray-200 px-6 py-4">
                  <Avatar user={selectedUser} size="lg" online={isOnline} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-semibold text-gray-900">
                      {selectedUser.fullName}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {selectedUser.fonction || selectedUser.email}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* KPIs */}
                <div className="flex-shrink-0 border-b border-gray-100 px-6 py-4">
                  <p className="mb-3 text-xs font-medium uppercase text-gray-500">
                    Résumé 7 derniers jours
                  </p>
                  <div className="grid grid-cols-5 gap-3">
                    <div className="rounded-lg bg-blue-50 p-2 text-center">
                      <p className="text-lg font-bold text-blue-700">{totalHours}h</p>
                      <p className="text-xs text-blue-600">Connecté</p>
                    </div>
                    <div className="rounded-lg bg-green-50 p-2 text-center">
                      <p className="text-lg font-bold text-green-700">{creates}</p>
                      <p className="text-xs text-green-600">Créations</p>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-2 text-center">
                      <p className="text-lg font-bold text-amber-700">{edits}</p>
                      <p className="text-xs text-amber-600">Modifs</p>
                    </div>
                    <div className="rounded-lg bg-red-50 p-2 text-center">
                      <p className="text-lg font-bold text-red-700">{deletes}</p>
                      <p className="text-xs text-red-600">Suppr.</p>
                    </div>
                    <div className="rounded-lg bg-purple-50 p-2 text-center">
                      <p className="text-lg font-bold text-purple-700">{views}</p>
                      <p className="text-xs text-purple-600">Consult.</p>
                    </div>
                  </div>
                </div>

                {/* Sessions */}
                <div className="flex-shrink-0 border-b border-gray-100 px-6 py-3">
                  <p className="mb-2 text-xs font-medium uppercase text-gray-500">
                    Sessions récentes
                  </p>
                  <div className="max-h-32 space-y-1.5 overflow-y-auto">
                    {userSessions.slice(0, 10).map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <LogIn className="h-3 w-3 flex-shrink-0 text-green-500" />
                        <span className="text-gray-600">
                          {new Date(s.loginAt).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {s.logoutAt && (
                          <>
                            <ChevronRight className="h-3 w-3 text-gray-300" />
                            <span className="text-gray-600">
                              {new Date(s.logoutAt).toLocaleString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <span className="text-gray-400">({s.durationMinutes}min)</span>
                          </>
                        )}
                        {!s.logoutAt && (
                          <span className="font-medium text-green-600">En cours</span>
                        )}
                      </div>
                    ))}
                    {userSessions.length === 0 && (
                      <p className="text-xs text-gray-400">Aucune session</p>
                    )}
                  </div>
                </div>

                {/* Activity feed */}
                <div className="flex-1 overflow-y-auto">
                  <div className="sticky top-0 border-b border-gray-100 bg-white px-6 py-3">
                    <p className="text-xs font-medium uppercase text-gray-500">
                      Journal d'activité ({userLogs.length} entrées)
                    </p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {userLogs.slice(0, 100).map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center gap-2.5 px-6 py-2.5 hover:bg-gray-50"
                      >
                        <div className="flex-shrink-0">{getActionIcon(log.action)}</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-800">
                            <span
                              className={`font-medium ${
                                log.action === 'create'
                                  ? 'text-green-600'
                                  : log.action === 'edit'
                                    ? 'text-blue-600'
                                    : log.action === 'delete'
                                      ? 'text-red-600'
                                      : log.action === 'login'
                                        ? 'text-emerald-600'
                                        : log.action === 'logout'
                                          ? 'text-gray-500'
                                          : 'text-amber-600'
                              }`}
                            >
                              {getActionLabel(log.action)}
                            </span>{' '}
                            <span className="text-gray-500">— {log.module}</span>
                          </p>
                          <p className="truncate text-xs text-gray-400">{log.details}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs text-gray-400">{timeAgo(log.timestamp)}</p>
                          <p className="text-xs text-gray-300">{formatDateTime(log.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                    {userLogs.length === 0 && (
                      <div className="px-6 py-12 text-center">
                        <Activity className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                        <p className="text-sm text-gray-400">Aucune activité enregistrée</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* ═══ Approval Modal ═══ */}
      {approvalTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setApprovalTarget(null)}
        >
          <div
            className="mx-4 w-full max-w-md rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <UserCheck className="h-5 w-5 text-green-600" />
                Approuver l'utilisateur
              </h3>
              <button
                onClick={() => setApprovalTarget(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5 px-6 py-5">
              {/* User info + photo upload */}
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                <div
                  className="group relative cursor-pointer"
                  onClick={() => handlePhotoUpload(setApprovalPhoto)}
                >
                  {approvalPhoto ? (
                    <img
                      src={approvalPhoto}
                      alt=""
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : approvalTarget.photo ? (
                    <img
                      src={approvalTarget.photo}
                      alt=""
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-lg font-semibold text-amber-700">
                      {approvalTarget.fullName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{approvalTarget.fullName}</p>
                  <p className="text-xs text-gray-500">{approvalTarget.email}</p>
                  <p className="mt-1 text-xs text-blue-600">
                    Cliquer sur l'avatar pour ajouter une photo
                  </p>
                </div>
              </div>

              {/* Fonction field */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  <Briefcase className="mr-1 inline h-4 w-4 text-gray-400" />
                  Fonction <span className="text-red-500">*</span>
                </label>
                <select
                  value={approvalFonction}
                  onChange={(e) => setApprovalFonction(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  autoFocus
                >
                  <option value="">— Sélectionner une fonction —</option>
                  <option value="Directeur Général">Directeur Général</option>
                  <option value="Directeur des Opérations">Directeur des Opérations</option>
                  <option value="Responsable Flotte">Responsable Flotte</option>
                  <option value="Gestionnaire Flotte">Gestionnaire Flotte</option>
                  <option value="Superviseur Opérations">Superviseur Opérations</option>
                  <option value="Coordinateur Logistique">Coordinateur Logistique</option>
                  <option value="Chauffeur">Chauffeur</option>
                  <option value="Mécanicien">Mécanicien</option>
                  <option value="Opérateur BSD">Opérateur BSD</option>
                  <option value="Responsable Déchets">Responsable Déchets</option>
                  <option value="Agent de Collecte">Agent de Collecte</option>
                  <option value="Responsable Clients">Responsable Clients</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Comptable">Comptable</option>
                  <option value="Responsable Administratif">Responsable Administratif</option>
                  <option value="Assistant(e) Administratif">Assistant(e) Administratif</option>
                  <option value="Responsable HSE">Responsable HSE</option>
                  <option value="Stagiaire">Stagiaire</option>
                </select>
              </div>

              {/* Admin toggle */}
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                <div className="flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                    <Shield className="h-4 w-4 text-blue-600" />
                    Accès administrateur
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Permet de gérer les utilisateurs et accéder à toutes les fonctionnalités
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setApprovalMakeAdmin(!approvalMakeAdmin)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${approvalMakeAdmin ? 'bg-blue-600' : 'bg-gray-300'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${approvalMakeAdmin ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 rounded-b-xl border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button
                onClick={() => setApprovalTarget(null)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmApproval}
                disabled={!approvalFonction.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                Approuver{approvalMakeAdmin ? ' comme Admin' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
