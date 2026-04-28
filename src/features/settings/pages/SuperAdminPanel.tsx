// ═══════════════════════════════════════════════════════════════
// SUPER ADMIN CONTROL PANEL
// ═══════════════════════════════════════════════════════════════
// 1. Matrice de Permissions Dynamique
// 2. Journal d'Audit (Qui, Quoi, Quand, Old/New)
// 3. Actions Critiques (Approbation / Rejet)
// 4. Visualiser en tant que...

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Shield, Users, Eye, EyeOff, Edit3, CheckCircle2, XCircle, AlertTriangle,
  Clock, Search, Filter, ChevronDown, ChevronRight, Activity, Lock,
  Trash2, RefreshCw, Download, UserCheck, UserX, Info, ArrowRight,
  ShieldAlert, ShieldCheck, FileText, CreditCard, Truck, Wrench,
  BarChart3, MessageSquare, Settings, X, Bell,
} from 'lucide-react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { permissionStore, APP_MODULES, MODULE_LABELS, type AppModule, type PermissionLevel, type UserRole } from '../../../shared/services/permissionStore';
import { auditService, type AuditEntry } from '../../../shared/services/auditService';
import { criticalActionService, CRITICAL_ACTION_TYPES, type CriticalActionRequest } from '../../../shared/services/criticalActionService';
import Modal from '../../../components/ui/Modal';

// ─── Tab type ─────────────────────────────────────────────────
type ControlTab = 'permissions' | 'audit' | 'critical' | 'viewas';

const MODULE_ICONS: Record<AppModule, React.ComponentType<{ className?: string }>> = {
  dashboard: BarChart3,
  fleet: Truck,
  exploitation: Activity,
  finances: CreditCard,
  technique: Wrench,
  rh: Users,
  parametres: Settings,
  chat: MessageSquare,
  hub_carburant: FileText,
};

const SEVERITY_STYLES: Record<AuditEntry['severity'], { bg: string; text: string; label: string }> = {
  low: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Info' },
  medium: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Moyen' },
  high: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Élevé' },
  critical: { bg: 'bg-red-100', text: 'text-red-700', label: 'Critique' },
};

// ═══════════════════════════════════════════════════════════════
export default function SuperAdminPanel() {
  const { user, allUsers } = useAuth();
  const [activeTab, setActiveTab] = useState<ControlTab>('permissions');
  const isSA = user ? permissionStore.isSuperAdmin(user.id) : false;

  // Guard: only Super Admin
  if (!user || !isSA) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Accès Restreint</h2>
          <p className="text-sm text-gray-500">Seul le Super Admin peut accéder à ce panneau de contrôle.</p>
        </div>
      </div>
    );
  }

  const TABS: { id: ControlTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'permissions', label: 'Matrice Permissions', icon: <Shield className="w-4 h-4" /> },
    { id: 'audit', label: 'Journal d\'Audit', icon: <FileText className="w-4 h-4" /> },
    { id: 'critical', label: 'Actions Critiques', icon: <AlertTriangle className="w-4 h-4" />, badge: criticalActionService.getPendingCount() },
    { id: 'viewas', label: 'Visualiser en tant que…', icon: <Eye className="w-4 h-4" /> },
  ];

  return (
    <div className="w-full min-h-screen">
      {/* Header */}
      <div className="ivos-page-header mb-6">
        <div className="flex items-center gap-4">
          <div className="w-13 h-13 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Contrôle Souverain — Super Admin</h1>
            <p className="text-xs sm:text-sm text-gray-400 font-medium mt-0.5">Permissions dynamiques · Audit · Approbation des actions critiques · Impersonation</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100/80 rounded-2xl p-1.5 mb-6 w-fit flex-wrap">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === t.id
                ? 'bg-white text-gray-900 shadow-card'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            {t.icon} {t.label}
            {t.badge && t.badge > 0 ? (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold animate-pulse">{t.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'permissions' && <PermissionsMatrix currentUser={user} allUsers={allUsers} />}
      {activeTab === 'audit' && <AuditLogViewer allUsers={allUsers} />}
      {activeTab === 'critical' && <CriticalActionsPanel currentUser={user} />}
      {activeTab === 'viewas' && <ViewAsPanel currentUser={user} allUsers={allUsers} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 1. MATRICE DE PERMISSIONS DYNAMIQUE
// ═══════════════════════════════════════════════════════════════
function PermissionsMatrix({ currentUser, allUsers }: { currentUser: any; allUsers: any[] }) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [perms, setPerms] = useState<Record<AppModule, PermissionLevel> | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('Utilisateur');
  const [saved, setSaved] = useState(false);

  const approvedUsers = useMemo(() =>
    allUsers.filter(u => u.status === 'approved' && u.id !== currentUser.id),
    [allUsers, currentUser.id]
  );

  useEffect(() => {
    if (selectedUserId) {
      setPerms({ ...permissionStore.getPermissions(selectedUserId) });
      setUserRole(permissionStore.getRole(selectedUserId));
      setSaved(false);
    } else {
      setPerms(null);
    }
  }, [selectedUserId]);

  function handlePermChange(mod: AppModule, level: PermissionLevel) {
    if (!perms) return;
    setPerms({ ...perms, [mod]: level });
    setSaved(false);
  }

  function handleRoleChange(role: UserRole) {
    if (!selectedUserId) return;
    const oldRole = permissionStore.getRole(selectedUserId);
    const target = allUsers.find(u => u.id === selectedUserId);
    permissionStore.setRole(selectedUserId, role);
    setUserRole(role);
    auditService.logRoleChange(
      { id: currentUser.id, name: currentUser.fullName, role: 'SuperAdmin' },
      selectedUserId,
      target?.fullName || selectedUserId,
      oldRole,
      role
    );
  }

  function savePermissions() {
    if (!selectedUserId || !perms) return;
    const oldPerms = permissionStore.getPermissions(selectedUserId);
    permissionStore.setPermissions(selectedUserId, perms);
    auditService.logPermissionChange(
      { id: currentUser.id, name: currentUser.fullName, role: 'SuperAdmin' },
      selectedUserId,
      oldPerms as unknown as Record<string, unknown>,
      perms as unknown as Record<string, unknown>
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function resetDefaults() {
    if (!selectedUserId) return;
    permissionStore.resetToDefaults(selectedUserId);
    setPerms({ ...permissionStore.getPermissions(selectedUserId) });
    setSaved(false);
  }

  const LEVELS: { value: PermissionLevel; label: string; color: string }[] = [
    { value: 'none', label: 'Aucun', color: 'bg-gray-200 text-gray-600' },
    { value: 'view', label: 'Voir', color: 'bg-blue-100 text-blue-700' },
    { value: 'edit', label: 'Modifier', color: 'bg-amber-100 text-amber-700' },
    { value: 'all', label: 'Tout', color: 'bg-emerald-100 text-emerald-700' },
  ];

  return (
    <div className="space-y-6">
      {/* User selector */}
      <div className="ivos-card p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-red-600" /> Sélectionner un utilisateur
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <select
            value={selectedUserId}
            onChange={e => setSelectedUserId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-400 border border-gray-200"
          >
            <option value="">— Choisir un utilisateur —</option>
            {approvedUsers.map(u => (
              <option key={u.id} value={u.id}>
                {u.fullName} ({u.email}) — {permissionStore.getRole(u.id)}
              </option>
            ))}
          </select>
          {selectedUserId && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Rôle :</span>
              {(['Utilisateur', 'Admin', 'SuperAdmin'] as UserRole[]).map(role => (
                <button
                  key={role}
                  onClick={() => handleRoleChange(role)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    userRole === role
                      ? role === 'SuperAdmin' ? 'bg-red-600 text-white' : role === 'Admin' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Permission matrix */}
      {perms && selectedUserId && (
        <div className="ivos-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-600" /> Matrice de Permissions
            </h3>
            <div className="flex items-center gap-2">
              <button onClick={resetDefaults} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Réinitialiser
              </button>
              <button
                onClick={savePermissions}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  saved ? 'bg-emerald-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {saved ? <><CheckCircle2 className="w-3 h-3" /> Enregistré</> : <><ShieldCheck className="w-3 h-3" /> Sauvegarder</>}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <th className="px-4 py-3 text-left">Module</th>
                  {LEVELS.map(l => (
                    <th key={l.value} className="px-4 py-3 text-center">{l.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {APP_MODULES.map((mod: AppModule, idx: number) => {
                  const Icon = MODULE_ICONS[mod];
                  return (
                    <tr key={mod} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-gray-400" />
                          <span className="font-semibold text-gray-800">{MODULE_LABELS[mod]}</span>
                        </div>
                      </td>
                      {LEVELS.map(l => (
                        <td key={l.value} className="px-4 py-3 text-center">
                          <button
                            onClick={() => handlePermChange(mod, l.value)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                              perms[mod] === l.value
                                ? `${l.color} ring-2 ring-offset-1 ${l.value === 'none' ? 'ring-gray-400' : l.value === 'view' ? 'ring-blue-400' : l.value === 'edit' ? 'ring-amber-400' : 'ring-emerald-400'}`
                                : 'bg-gray-100 text-gray-300 hover:bg-gray-200'
                            }`}
                          >
                            {perms[mod] === l.value ? (
                              l.value === 'none' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <div className="w-2.5 h-2.5 rounded-full bg-current" />
                            )}
                          </button>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-[10px] text-gray-400 mt-3 flex items-center gap-1">
            <Info className="w-3 h-3" /> «Aucun» = module supprimé du DOM (invisible et inaccessible). «Voir» = lecture seule. «Modifier» = lecture + écriture. «Tout» = accès complet.
          </p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 2. JOURNAL D'AUDIT
// ═══════════════════════════════════════════════════════════════
function AuditLogViewer({ allUsers }: { allUsers: any[] }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<AuditEntry['severity'] | 'all'>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [detailEntry, setDetailEntry] = useState<AuditEntry | null>(null);

  const loadData = useCallback(() => setEntries(auditService.getAll()), []);
  useEffect(() => {
    loadData();
    window.addEventListener('audit:updated', loadData);
    return () => window.removeEventListener('audit:updated', loadData);
  }, [loadData]);

  const stats = useMemo(() => auditService.getStats(), [entries]);

  const filtered = useMemo(() => {
    let result = entries;
    if (severityFilter !== 'all') result = result.filter(e => e.severity === severityFilter);
    if (actionFilter !== 'all') result = result.filter(e => e.action === actionFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.userName.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.module.toLowerCase().includes(q) ||
        e.entity.toLowerCase().includes(q)
      );
    }
    return result;
  }, [entries, severityFilter, actionFilter, search]);

  function exportCSV() {
    const header = ['Date', 'Utilisateur', 'Rôle', 'Action', 'Module', 'Entité', 'Description', 'Sévérité'];
    const rows = filtered.map(e => [
      new Date(e.timestamp).toLocaleString('fr-FR'),
      e.userName,
      e.userRole,
      e.action,
      e.module,
      e.entity,
      e.description,
      e.severity,
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'bg-gray-50 text-gray-700' },
          { label: 'Dernières 24h', value: stats.last24h, color: 'bg-blue-50 text-blue-700' },
          { label: 'Créations', value: stats.creates, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Modifications', value: stats.updates, color: 'bg-amber-50 text-amber-700' },
          { label: 'Suppressions', value: stats.deletes, color: 'bg-red-50 text-red-700' },
          { label: 'Critiques', value: stats.criticalActions, color: 'bg-red-100 text-red-800' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-xl p-3 text-center`}>
            <p className="text-[10px] uppercase font-semibold opacity-70">{s.label}</p>
            <p className="text-xl font-black">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="ivos-card p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher (utilisateur, module, description…)"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
          <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value as any)} className="px-3 py-2.5 rounded-xl bg-gray-50 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-red-400">
            <option value="all">Toutes sévérités</option>
            <option value="low">Info</option>
            <option value="medium">Moyen</option>
            <option value="high">Élevé</option>
            <option value="critical">Critique</option>
          </select>
          <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="px-3 py-2.5 rounded-xl bg-gray-50 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-red-400">
            <option value="all">Toutes actions</option>
            <option value="create">Création</option>
            <option value="update">Modification</option>
            <option value="delete">Suppression</option>
            <option value="permission_change">Perm. changée</option>
            <option value="role_change">Rôle changé</option>
            <option value="critical_action">Action critique</option>
          </select>
          <button onClick={exportCSV} className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-semibold hover:bg-emerald-100 transition-colors">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </div>

      {/* Log table */}
      <div className="ivos-card overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="min-w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#4a0e0e] text-white uppercase">
                <th className="px-3 py-3 text-left">Date</th>
                <th className="px-3 py-3 text-left">Utilisateur</th>
                <th className="px-3 py-3 text-left">Action</th>
                <th className="px-3 py-3 text-left">Module</th>
                <th className="px-3 py-3 text-left">Description</th>
                <th className="px-3 py-3 text-center">Sévérité</th>
                <th className="px-3 py-3 text-center w-16">Détail</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((e, idx) => {
                const sev = SEVERITY_STYLES[e.severity];
                return (
                  <tr key={e.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-red-50/30 transition-colors`}>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                      {new Date(e.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      <br />
                      <span className="text-[10px] text-gray-400">{new Date(e.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-gray-800">{e.userName}</p>
                      <p className="text-[10px] text-gray-400">{e.userRole}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        e.action === 'create' ? 'bg-emerald-100 text-emerald-700' :
                        e.action === 'update' ? 'bg-blue-100 text-blue-700' :
                        e.action === 'delete' ? 'bg-red-100 text-red-700' :
                        'bg-violet-100 text-violet-700'
                      }`}>
                        {e.action === 'create' ? 'Création' : e.action === 'update' ? 'Modification' : e.action === 'delete' ? 'Suppression' : e.action === 'permission_change' ? 'Permissions' : e.action === 'role_change' ? 'Rôle' : e.action}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 font-medium">{e.module}</td>
                    <td className="px-3 py-2.5 text-gray-600 max-w-[300px] truncate">{e.description}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sev.bg} ${sev.text}`}>{sev.label}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button onClick={() => setDetailEntry(e)} className="text-red-600 hover:text-red-800">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Aucune entrée d'audit</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 200 && (
          <div className="px-4 py-2 bg-gray-50 text-[10px] text-gray-400 text-center">
            Affichage des 200 premières entrées sur {filtered.length}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal isOpen={!!detailEntry} onClose={() => setDetailEntry(null)} title="Détail de l'entrée d'audit" size="lg">
        {detailEntry && <AuditDetailView entry={detailEntry} />}
      </Modal>
    </div>
  );
}

function AuditDetailView({ entry }: { entry: AuditEntry }) {
  return (
    <div className="space-y-4 py-2 text-sm">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] text-gray-500 uppercase font-semibold">Date & Heure</p>
          <p className="font-medium text-gray-900">{new Date(entry.timestamp).toLocaleString('fr-FR')}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase font-semibold">Utilisateur</p>
          <p className="font-medium text-gray-900">{entry.userName} <span className="text-gray-400">({entry.userRole})</span></p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase font-semibold">Action</p>
          <p className="font-medium text-gray-900">{entry.action}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase font-semibold">Module / Entité</p>
          <p className="font-medium text-gray-900">{entry.module} — {entry.entity} #{entry.entityId}</p>
        </div>
      </div>
      <div>
        <p className="text-[10px] text-gray-500 uppercase font-semibold">Description</p>
        <p className="font-medium text-gray-900">{entry.description}</p>
      </div>

      {/* Old / New value diff */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {entry.oldValue && (
          <div className="bg-red-50 rounded-xl p-3">
            <p className="text-[10px] text-red-600 uppercase font-bold mb-2">Ancienne Valeur</p>
            <pre className="text-xs text-red-800 whitespace-pre-wrap break-words font-mono bg-red-100/50 rounded-lg p-2 max-h-60 overflow-y-auto">
              {JSON.stringify(entry.oldValue, null, 2)}
            </pre>
          </div>
        )}
        {entry.newValue && (
          <div className="bg-emerald-50 rounded-xl p-3">
            <p className="text-[10px] text-emerald-600 uppercase font-bold mb-2">Nouvelle Valeur</p>
            <pre className="text-xs text-emerald-800 whitespace-pre-wrap break-words font-mono bg-emerald-100/50 rounded-lg p-2 max-h-60 overflow-y-auto">
              {JSON.stringify(entry.newValue, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 3. ACTIONS CRITIQUES — Approbation / Rejet
// ═══════════════════════════════════════════════════════════════
function CriticalActionsPanel({ currentUser }: { currentUser: any }) {
  const [requests, setRequests] = useState<CriticalActionRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [reviewNote, setReviewNote] = useState('');

  const loadData = useCallback(() => setRequests(criticalActionService.getAll()), []);
  useEffect(() => {
    loadData();
    window.addEventListener('critical:updated', loadData);
    return () => window.removeEventListener('critical:updated', loadData);
  }, [loadData]);

  const filtered = useMemo(() => {
    if (filter === 'all') return requests;
    return requests.filter(r => r.status === filter);
  }, [requests, filter]);

  function handleApprove(id: string) {
    criticalActionService.approve(id, currentUser.id, currentUser.fullName, reviewNote);
    auditService.log({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: 'SuperAdmin',
      action: 'approval',
      module: 'Actions Critiques',
      entity: 'CriticalAction',
      entityId: id,
      description: `Approbation de l'action critique ${id}`,
      oldValue: { status: 'pending' },
      newValue: { status: 'approved', note: reviewNote },
      severity: 'critical',
    });
    setReviewNote('');
    loadData();
  }

  function handleReject(id: string) {
    criticalActionService.reject(id, currentUser.id, currentUser.fullName, reviewNote || 'Refusé par le Super Admin');
    auditService.log({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: 'SuperAdmin',
      action: 'rejection',
      module: 'Actions Critiques',
      entity: 'CriticalAction',
      entityId: id,
      description: `Rejet de l'action critique ${id}`,
      oldValue: { status: 'pending' },
      newValue: { status: 'rejected', note: reviewNote },
      severity: 'critical',
    });
    setReviewNote('');
    loadData();
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="ivos-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" /> Actions en attente d'approbation
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold animate-pulse">{pendingCount}</span>
            )}
          </h3>
          <div className="flex gap-1">
            {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === f ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {f === 'pending' ? 'En attente' : f === 'approved' ? 'Approuvées' : f === 'rejected' ? 'Refusées' : 'Toutes'}
              </button>
            ))}
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map(req => (
              <div key={req.id} className={`rounded-xl border p-4 transition-all ${
                req.status === 'pending' ? 'border-amber-200 bg-amber-50/30' :
                req.status === 'approved' ? 'border-emerald-200 bg-emerald-50/30' :
                'border-red-200 bg-red-50/30'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {req.status === 'pending' ? 'EN ATTENTE' : req.status === 'approved' ? 'APPROUVÉE' : 'REFUSÉE'}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {CRITICAL_ACTION_TYPES[req.actionType]}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{req.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Par <strong>{req.requestedByName}</strong> — {new Date(req.requestedAt).toLocaleString('fr-FR')}
                    </p>
                    {req.reviewedByName && (
                      <p className="text-xs text-gray-400 mt-1">
                        {req.status === 'approved' ? '✅' : '❌'} Traité par {req.reviewedByName} le {new Date(req.reviewedAt!).toLocaleString('fr-FR')}
                        {req.reviewNote && <> — <em>{req.reviewNote}</em></>}
                      </p>
                    )}
                  </div>
                  {req.status === 'pending' && (
                    <div className="flex flex-col gap-2 ml-4">
                      <input
                        type="text"
                        placeholder="Note (optionnel)"
                        value={reviewNote}
                        onChange={e => setReviewNote(e.target.value)}
                        className="px-2 py-1 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-red-400 w-48"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleApprove(req.id)} className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors">
                          <CheckCircle2 className="w-3 h-3" /> Approuver
                        </button>
                        <button onClick={() => handleReject(req.id)} className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors">
                          <XCircle className="w-3 h-3" /> Refuser
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-400 text-sm">
            {filter === 'pending' ? 'Aucune action en attente d\'approbation' : 'Aucune action dans cette catégorie'}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 4. VISUALISER EN TANT QUE…
// ═══════════════════════════════════════════════════════════════
function ViewAsPanel({ currentUser, allUsers }: { currentUser: any; allUsers: any[] }) {
  const [selectedUserId, setSelectedUserId] = useState('');

  const approvedUsers = useMemo(() =>
    allUsers.filter(u => u.status === 'approved' && u.id !== currentUser.id),
    [allUsers, currentUser.id]
  );

  const selectedUser = approvedUsers.find(u => u.id === selectedUserId);

  function activateViewAs() {
    if (!selectedUserId) return;
    // Store the impersonation in sessionStorage (not localStorage to be ephemeral)
    sessionStorage.setItem('ivos_view_as', JSON.stringify({
      originalUserId: currentUser.id,
      viewAsUserId: selectedUserId,
      viewAsUserName: selectedUser?.fullName || '',
      activatedAt: new Date().toISOString(),
    }));
    auditService.log({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: 'SuperAdmin',
      action: 'critical_action',
      module: 'Impersonation',
      entity: 'ViewAs',
      entityId: selectedUserId,
      description: `Activation de "Visualiser en tant que" pour ${selectedUser?.fullName}`,
      oldValue: null,
      newValue: { targetUser: selectedUserId, targetName: selectedUser?.fullName },
      severity: 'high',
    });
    window.location.reload();
  }

  const activeViewAs = (() => {
    try {
      const raw = sessionStorage.getItem('ivos_view_as');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();

  function deactivateViewAs() {
    sessionStorage.removeItem('ivos_view_as');
    window.location.reload();
  }

  const userPerms = selectedUserId ? permissionStore.getPermissions(selectedUserId) : null;
  const userRole = selectedUserId ? permissionStore.getRole(selectedUserId) : null;

  return (
    <div className="space-y-6">
      {/* Active impersonation banner */}
      {activeViewAs && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center">
              <Eye className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-800">Mode "Visualiser en tant que" actif</p>
              <p className="text-xs text-amber-600">Vous voyez l'interface comme : <strong>{activeViewAs.viewAsUserName}</strong></p>
            </div>
          </div>
          <button onClick={deactivateViewAs} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold text-sm transition-all">
            Désactiver
          </button>
        </div>
      )}

      <div className="ivos-card p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Eye className="w-4 h-4 text-red-600" /> Tester l'interface d'un utilisateur
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <select
            value={selectedUserId}
            onChange={e => setSelectedUserId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-400 border border-gray-200"
          >
            <option value="">— Choisir un utilisateur —</option>
            {approvedUsers.map(u => (
              <option key={u.id} value={u.id}>
                {u.fullName} ({u.email}) — {permissionStore.getRole(u.id)}
              </option>
            ))}
          </select>
          <button
            onClick={activateViewAs}
            disabled={!selectedUserId}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" /> Visualiser en tant que cet utilisateur
          </button>
        </div>

        {/* Preview permissions of selected user */}
        {userPerms && selectedUser && (
          <div className="bg-gray-50 rounded-xl p-4 mt-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1a1a2e] to-[#2d2d44] text-white flex items-center justify-center font-semibold text-sm">
                {selectedUser.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{selectedUser.fullName}</p>
                <p className="text-xs text-gray-500">{selectedUser.email} · Rôle : <strong className="text-red-600">{userRole}</strong></p>
              </div>
            </div>
            <p className="text-[10px] text-gray-500 uppercase font-semibold mb-2">Aperçu des permissions</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {APP_MODULES.map((mod: AppModule) => {
                const level = userPerms[mod];
                const Icon = MODULE_ICONS[mod];
                return (
                  <div key={mod} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                    level === 'none' ? 'bg-gray-200 text-gray-400 line-through' :
                    level === 'view' ? 'bg-blue-50 text-blue-700' :
                    level === 'edit' ? 'bg-amber-50 text-amber-700' :
                    'bg-emerald-50 text-emerald-700'
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                    {MODULE_LABELS[mod]}
                    <span className="ml-auto text-[10px] opacity-60">{level}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-[10px] text-gray-400 mt-4 flex items-center gap-1">
          <Info className="w-3 h-3" /> En mode "Visualiser en tant que", vous verrez exactement la même interface que l'utilisateur sélectionné.
          Les permissions, la sidebar et les modules visibles seront ajustés. Cette action est enregistrée dans le journal d'audit.
        </p>
      </div>
    </div>
  );
}
