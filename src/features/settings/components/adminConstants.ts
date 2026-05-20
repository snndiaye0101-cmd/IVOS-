// ═══════════════════════════════════════════════════════════════
// ADMINISTRATION SYSTÈME - CONSTANTES CENTRALISÉES
// ═══════════════════════════════════════════════════════════════

import type { AuditEntry } from '../../../shared/services/auditService';
import type { AppModule } from '../../../shared/services/permissionStore';

// ──────────────────────────────────────────────────────────────
// TAB DEFINITIONS
// ──────────────────────────────────────────────────────────────
export type AdminTab = 'users-permissions' | 'activity-analytics' | 'super-admins';

export const ADMIN_TABS_CONFIG: Array<{
  id: AdminTab;
  label: string;
  iconName: AppModule;
  requiresSuperAdmin?: boolean;
}> = [
  { id: 'users-permissions', label: 'Gestion / Permissions', iconName: 'rh' },
  { id: 'activity-analytics', label: "Monitoring d'activité", iconName: 'exploitation' },
  { id: 'super-admins', label: 'Sécurité Admin', iconName: 'technique', requiresSuperAdmin: true },
];

// ──────────────────────────────────────────────────────────────
// MODULE LABELS
// ──────────────────────────────────────────────────────────────
export const MODULE_LABELS: Record<AppModule, string> = {
  dashboard: 'Tableau de Bord',
  fleet: 'Flotte',
  exploitation: 'Exploitation',
  finances: 'Finances',
  technique: 'Technique',
  rh: 'Ressources Humaines',
  parametres: 'Paramètres',
  chat: 'Chat',
  hub_carburant: 'Hub Carburant',
};

// ──────────────────────────────────────────────────────────────
// STYLING DEFINITIONS
// ──────────────────────────────────────────────────────────────
export const SEVERITY_STYLES: Record<
  AuditEntry['severity'],
  { bg: string; text: string; label: string }
> = {
  low: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Info' },
  medium: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Moyen' },
  high: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Élevé' },
  critical: { bg: 'bg-red-100', text: 'text-red-700', label: 'Critique' },
};

export const AVATAR_COLORS = [
  'from-blue-500 to-blue-600',
  'from-emerald-500 to-emerald-600',
  'from-violet-500 to-violet-600',
  'from-amber-500 to-amber-600',
  'from-rose-500 to-rose-600',
  'from-cyan-500 to-cyan-600',
  'from-indigo-500 to-indigo-600',
  'from-pink-500 to-pink-600',
];

export const getAvatarColor = (name: string) =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

// ──────────────────────────────────────────────────────────────
// QUICK ACTION BUTTONS
// ──────────────────────────────────────────────────────────────
export const QUICK_ACTIONS = [
  { icon: 'users-plus', label: 'Ajouter Utilisateur', color: 'blue' },
  { icon: 'user-check', label: 'Approuver Accès', color: 'emerald' },
  { icon: 'shield', label: 'Gérer Permissions', color: 'purple' },
  { icon: 'alert-triangle', label: 'Actions Critiques', color: 'red' },
];

// ──────────────────────────────────────────────────────────────
// STATUS CONSTANTS
// ──────────────────────────────────────────────────────────────
export const USER_STATUSES = {
  approved: { badge: 'bg-green-100 text-green-700', label: 'Approuvé' },
  pending: { badge: 'bg-amber-100 text-amber-700', label: 'En attente' },
  rejected: { badge: 'bg-red-100 text-red-700', label: 'Rejeté' },
};

export const ONLINE_STATUSES = {
  online: { badge: 'bg-green-100 text-green-700', label: 'En ligne', icon: '🟢' },
  offline: { badge: 'bg-gray-100 text-gray-700', label: 'Hors-ligne', icon: '⚫' },
};
