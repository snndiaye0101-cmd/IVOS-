// Ce service gère l’audit trail (log des actions sensibles, conformité RGPD).
// ═══════════════════════════════════════════════════════════════
// AUDIT LOG SERVICE — Journalisation complète des actions
// ═══════════════════════════════════════════════════════════════
// Chaque Modification / Suppression est enregistrée avec :
// Qui, Quoi, Quand, Ancienne valeur, Nouvelle valeur
// Seul le Super Admin peut consulter ces logs.

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: 'create' | 'update' | 'view' | 'delete' | 'permission_change' | 'role_change' | 'approval' | 'rejection' | 'critical_action';
  module: string;
  entity: string;
  entityId: string;
  description: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const AUDIT_KEY = 'ivos_audit_log_v1';
const MAX_ENTRIES = 5000;

function loadAudit(): AuditEntry[] {
  try { return JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]'); } catch { return []; }
}

function saveAudit(entries: AuditEntry[]) {
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
  localStorage.setItem(AUDIT_KEY, JSON.stringify(entries));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const auditService = {
  /** Log a full audit entry */
  log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): AuditEntry {
    const full: AuditEntry = {
      ...entry,
      id: generateId(),
      timestamp: new Date().toISOString(),
    };
    const entries = loadAudit();
    entries.unshift(full);
    saveAudit(entries);
    window.dispatchEvent(new Event('audit:updated'));
    return full;
  },

  /** Shorthand: log a data modification */
  logUpdate(user: { id: string; name: string; role: string }, module: string, entity: string, entityId: string, oldValue: Record<string, unknown>, newValue: Record<string, unknown>, description?: string) {
    return this.log({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'update',
      module,
      entity,
      entityId,
      description: description || `Modification de ${entity} #${entityId}`,
      oldValue,
      newValue,
      severity: 'medium',
    });
  },

  /** Shorthand: log a deletion */
  logDelete(user: { id: string; name: string; role: string }, module: string, entity: string, entityId: string, oldValue: Record<string, unknown>, description?: string) {
    return this.log({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'delete',
      module,
      entity,
      entityId,
      description: description || `Suppression de ${entity} #${entityId}`,
      oldValue,
      newValue: null,
      severity: 'high',
    });
  },

  /** Shorthand: log a creation */
  logCreate(user: { id: string; name: string; role: string }, module: string, entity: string, entityId: string, newValue: Record<string, unknown>, description?: string) {
    return this.log({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'create',
      module,
      entity,
      entityId,
      description: description || `Création de ${entity} #${entityId}`,
      oldValue: null,
      newValue,
      severity: 'low',
    });
  },

  /** Log a permission change */
  logPermissionChange(user: { id: string; name: string; role: string }, targetUserId: string, oldPerms: Record<string, unknown>, newPerms: Record<string, unknown>) {
    return this.log({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'permission_change',
      module: 'Permissions',
      entity: 'UserPermissions',
      entityId: targetUserId,
      description: `Modification des permissions de l'utilisateur ${targetUserId}`,
      oldValue: oldPerms,
      newValue: newPerms,
      severity: 'critical',
    });
  },

  /** Log a role change */
  logRoleChange(user: { id: string; name: string; role: string }, targetUserId: string, targetUserName: string, oldRole: string, newRole: string) {
    return this.log({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'role_change',
      module: 'Rôles',
      entity: 'UserRole',
      entityId: targetUserId,
      description: `Changement de rôle de ${targetUserName} : ${oldRole} → ${newRole}`,
      oldValue: { role: oldRole },
      newValue: { role: newRole },
      severity: 'critical',
    });
  },

  /** Get all audit entries (for Super Admin) */
  getAll(): AuditEntry[] {
    return loadAudit();
  },

  /** Get entries filtered by module */
  getByModule(module: string): AuditEntry[] {
    return loadAudit().filter(e => e.module === module);
  },

  /** Get entries filtered by user */
  getByUser(userId: string): AuditEntry[] {
    return loadAudit().filter(e => e.userId === userId);
  },

  /** Get entries filtered by severity */
  getBySeverity(severity: AuditEntry['severity']): AuditEntry[] {
    return loadAudit().filter(e => e.severity === severity);
  },

  /** Get entries in a date range */
  getByDateRange(from: string, to: string): AuditEntry[] {
    return loadAudit().filter(e => e.timestamp >= from && e.timestamp <= to);
  },

  /** Get count by action type for stats */
  getStats() {
    const entries = loadAudit();
    return {
      total: entries.length,
      creates: entries.filter(e => e.action === 'create').length,
      updates: entries.filter(e => e.action === 'update').length,
      views: entries.filter(e => e.action === 'view').length,
      deletes: entries.filter(e => e.action === 'delete').length,
      criticalActions: entries.filter(e => e.severity === 'critical').length,
      last24h: entries.filter(e => new Date(e.timestamp) > new Date(Date.now() - 86400000)).length,
    };
  },

  /** Clear all logs (Super Admin only — use with caution) */
  clear() {
    localStorage.removeItem(AUDIT_KEY);
    window.dispatchEvent(new Event('audit:updated'));
  },
};
