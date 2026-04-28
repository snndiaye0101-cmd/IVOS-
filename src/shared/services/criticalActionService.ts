// ═══════════════════════════════════════════════════════════════
// CRITICAL ACTIONS — Double Auth / Approbation Super Admin
// ═══════════════════════════════════════════════════════════════
// Actions critiques : modifications salaires, suppression data,
// changement permissions → notification d'approbation au Super Admin.

export interface CriticalActionRequest {
  id: string;
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  actionType: 'salary_change' | 'data_deletion' | 'permission_change' | 'role_change' | 'bulk_delete' | 'config_change';
  module: string;
  description: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

const CRITICAL_KEY = 'ivos_critical_actions_v1';

function loadRequests(): CriticalActionRequest[] {
  try { return JSON.parse(localStorage.getItem(CRITICAL_KEY) || '[]'); } catch { return []; }
}

function saveRequests(requests: CriticalActionRequest[]) {
  localStorage.setItem(CRITICAL_KEY, JSON.stringify(requests));
}

function generateId(): string {
  return 'crit_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** Actions that require Super Admin approval */
export const CRITICAL_ACTION_TYPES: Record<CriticalActionRequest['actionType'], string> = {
  salary_change: 'Modification de salaire',
  data_deletion: 'Suppression de données',
  permission_change: 'Changement de permissions',
  role_change: 'Changement de rôle',
  bulk_delete: 'Suppression en masse',
  config_change: 'Modification de configuration critique',
};

export const criticalActionService = {
  /** Submit a critical action for Super Admin approval */
  submit(request: Omit<CriticalActionRequest, 'id' | 'requestedAt' | 'status'>): CriticalActionRequest {
    const full: CriticalActionRequest = {
      ...request,
      id: generateId(),
      requestedAt: new Date().toISOString(),
      status: 'pending',
    };
    const all = loadRequests();
    all.unshift(full);
    saveRequests(all);
    window.dispatchEvent(new Event('critical:updated'));
    return full;
  },

  /** Approve a critical action (Super Admin only) */
  approve(requestId: string, reviewerId: string, reviewerName: string, note?: string): boolean {
    const all = loadRequests();
    const req = all.find(r => r.id === requestId);
    if (!req || req.status !== 'pending') return false;
    req.status = 'approved';
    req.reviewedBy = reviewerId;
    req.reviewedByName = reviewerName;
    req.reviewedAt = new Date().toISOString();
    req.reviewNote = note || '';
    saveRequests(all);
    window.dispatchEvent(new Event('critical:updated'));
    return true;
  },

  /** Reject a critical action (Super Admin only) */
  reject(requestId: string, reviewerId: string, reviewerName: string, note?: string): boolean {
    const all = loadRequests();
    const req = all.find(r => r.id === requestId);
    if (!req || req.status !== 'pending') return false;
    req.status = 'rejected';
    req.reviewedBy = reviewerId;
    req.reviewedByName = reviewerName;
    req.reviewedAt = new Date().toISOString();
    req.reviewNote = note || 'Action refusée par le Super Admin';
    saveRequests(all);
    window.dispatchEvent(new Event('critical:updated'));
    return true;
  },

  /** Get all pending requests */
  getPending(): CriticalActionRequest[] {
    return loadRequests().filter(r => r.status === 'pending');
  },

  /** Get all requests */
  getAll(): CriticalActionRequest[] {
    return loadRequests();
  },

  /** Get pending count (for badge) */
  getPendingCount(): number {
    return this.getPending().length;
  },

  /** Check if there's a pending request for a specific action */
  hasPending(actionType: CriticalActionRequest['actionType'], module: string): boolean {
    return loadRequests().some(r => r.status === 'pending' && r.actionType === actionType && r.module === module);
  },

  /** Check if a specific action was approved */
  isApproved(requestId: string): boolean {
    const req = loadRequests().find(r => r.id === requestId);
    return req?.status === 'approved';
  },

  /** Helper: determine if an action needs approval based on type */
  needsApproval(actionType: string): boolean {
    return actionType in CRITICAL_ACTION_TYPES;
  },
};
