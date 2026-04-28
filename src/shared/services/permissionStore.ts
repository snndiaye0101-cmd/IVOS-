// ═══════════════════════════════════════════════════════════════
// PERMISSION STORE — Matrice de Permissions Dynamique
// ═══════════════════════════════════════════════════════════════
// Seul le Super Admin peut modifier cette matrice.
// Si un module est décoché, il est supprimé du DOM (pas CSS hidden).

export type PermissionLevel = 'none' | 'view' | 'edit' | 'all';

/** Modules protégés par la matrice de permissions */
export const APP_MODULES = [
  'dashboard',
  'fleet',
  'exploitation',
  'finances',
  'technique',
  'rh',
  'parametres',
  'chat',
  'hub_carburant',
] as const;

export type AppModule = typeof APP_MODULES[number];

export const MODULE_LABELS: Record<AppModule, string> = {
  dashboard: 'Pilotage Opérationnel',
  fleet: 'Flotte',
  exploitation: 'Exploitation',
  finances: 'Finances',
  technique: 'Technique',
  rh: 'Ressources Humaines',
  parametres: 'Paramètres',
  chat: 'Chat / Communications',
  hub_carburant: 'Hub Carburant',
};

/** Maps sidebar section names → AppModule */
export const SECTION_TO_MODULE: Record<string, AppModule> = {
  'PILOTAGE OPÉRATIONNEL': 'dashboard',
  'Flotte': 'fleet',
  'Exploitation': 'exploitation',
  'Finances': 'finances',
  'Technique': 'technique',
  'Ressources Humaines': 'rh',
  'Paramètres': 'parametres',
};

/** Maps route prefixes → AppModule */
export const ROUTE_TO_MODULE: Record<string, AppModule> = {
  '/': 'dashboard',
  '/vehicles': 'fleet',
  '/personal-vehicles': 'fleet',
  '/hub-carburant': 'hub_carburant',
  '/fuel-allocation': 'hub_carburant',
  '/carburant': 'hub_carburant',
  '/flotte/tracking': 'fleet',
  '/operations': 'exploitation',
  '/pre-trip-check': 'exploitation',
  '/waste-forms': 'exploitation',
  '/exploitation': 'exploitation',
  '/maintenance': 'technique',
  '/sinistres': 'technique',
  '/pneumatique': 'technique',
  '/inventaire-maintenance-materiels': 'technique',
  '/inventaire-materiels': 'technique',
  '/finances': 'finances',
  '/billing': 'finances',
  '/unite-facturation': 'finances',
  '/personnel': 'rh',
  '/annuaire': 'rh',
  '/grh': 'rh',
  '/borne-pointage': 'rh',
  '/demande-conges': 'rh',
  '/rh/documents': 'rh',
  '/settings': 'parametres',
  '/users': 'parametres',
  '/communications/chat': 'chat',
  '/communications/agenda': 'chat',
  '/communications/email-center': 'chat',
  '/communications/email-center/admin': 'chat',
  '/chat': 'chat',
};

export interface UserPermissions {
  userId: string;
  modules: Record<AppModule, PermissionLevel>;
}

export type UserRole = 'SuperAdmin' | 'Admin' | 'Utilisateur';

const PERMISSIONS_KEY = 'ivos_permissions_v1';
const ROLE_KEY = 'ivos_user_roles_v1';

// ─── Default permissions by role ──────────────────────────────

function defaultPermissionsForRole(role: UserRole): Record<AppModule, PermissionLevel> {
  const perms = {} as Record<AppModule, PermissionLevel>;
  for (const mod of APP_MODULES) {
    if (role === 'SuperAdmin') {
      perms[mod] = 'all';
    } else if (role === 'Admin') {
      perms[mod] = mod === 'parametres' ? 'view' : 'all';
    } else {
      // Utilisateur: view only, no parametres
      perms[mod] = mod === 'parametres' ? 'none' : 'view';
    }
  }
  return perms;
}

// ─── Store ────────────────────────────────────────────────────

function loadAllPermissions(): UserPermissions[] {
  try { return JSON.parse(localStorage.getItem(PERMISSIONS_KEY) || '[]'); } catch { return []; }
}

function saveAllPermissions(perms: UserPermissions[]) {
  localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(perms));
}

function loadRoles(): Record<string, UserRole> {
  try { return JSON.parse(localStorage.getItem(ROLE_KEY) || '{}'); } catch { return {}; }
}

function saveRoles(roles: Record<string, UserRole>) {
  localStorage.setItem(ROLE_KEY, JSON.stringify(roles));
}

export const permissionStore = {
  /** Get user role (SuperAdmin > Admin > Utilisateur) */
  getRole(userId: string): UserRole {
    const roles = loadRoles();
    return roles[userId] || 'Utilisateur';
  },

  setRole(userId: string, role: UserRole) {
    const roles = loadRoles();
    roles[userId] = role;
    saveRoles(roles);
  },

  isSuperAdmin(userId: string): boolean {
    return this.getRole(userId) === 'SuperAdmin';
  },

  /** Get effective permissions for a user (custom or role-based defaults) */
  getPermissions(userId: string): Record<AppModule, PermissionLevel> {
    const all = loadAllPermissions();
    const custom = all.find(p => p.userId === userId);
    if (custom) return custom.modules;
    return defaultPermissionsForRole(this.getRole(userId));
  },

  /** Set custom permissions for a user (only SuperAdmin should call this) */
  setPermissions(userId: string, modules: Record<AppModule, PermissionLevel>) {
    const all = loadAllPermissions();
    const idx = all.findIndex(p => p.userId === userId);
    if (idx >= 0) {
      all[idx].modules = modules;
    } else {
      all.push({ userId, modules });
    }
    saveAllPermissions(all);
    window.dispatchEvent(new Event('permissions:updated'));
  },

  /** Reset user to role-based defaults */
  resetToDefaults(userId: string) {
    const all = loadAllPermissions().filter(p => p.userId !== userId);
    saveAllPermissions(all);
    window.dispatchEvent(new Event('permissions:updated'));
  },

  /** Check if user can access a module at a given level */
  canAccess(userId: string, module: AppModule, requiredLevel: 'view' | 'edit' | 'all' = 'view'): boolean {
    if (this.isSuperAdmin(userId)) return true;
    const perms = this.getPermissions(userId);
    const level = perms[module];
    if (level === 'none') return false;
    if (level === 'all') return true;
    if (level === 'edit') return requiredLevel !== 'all';
    if (level === 'view') return requiredLevel === 'view';
    return false;
  },

  /** Check if user can access a route */
  canAccessRoute(userId: string, path: string): boolean {
    if (this.isSuperAdmin(userId)) return true;
    // Find the matching module for the route
    // Try exact match first, then prefix match
    let mod = ROUTE_TO_MODULE[path];
    if (!mod) {
      const sorted = Object.keys(ROUTE_TO_MODULE).sort((a, b) => b.length - a.length);
      for (const prefix of sorted) {
        if (prefix !== '/' && path.startsWith(prefix)) {
          mod = ROUTE_TO_MODULE[prefix];
          break;
        }
      }
    }
    if (!mod) return true; // Unknown route = allow
    return this.canAccess(userId, mod, 'view');
  },

  /** Get modules visible in sidebar for a section */
  canAccessSection(userId: string, sectionName: string): boolean {
    if (this.isSuperAdmin(userId)) return true;
    const mod = SECTION_TO_MODULE[sectionName];
    if (!mod) return true;
    return this.canAccess(userId, mod, 'view');
  },

  /** Ensure first admin is promoted to SuperAdmin on init */
  ensureSuperAdmin() {
    const roles = loadRoles();
    const hasSA = Object.values(roles).includes('SuperAdmin');
    if (hasSA) return;
    // Promote the auto admin or first admin
    try {
      const users = JSON.parse(localStorage.getItem('ivos_users') || '[]');
      const admin = users.find((u: any) => u.role === 'Admin' && u.status === 'approved');
      if (admin) {
        roles[admin.id] = 'SuperAdmin';
        saveRoles(roles);
      }
    } catch { /* ignore */ }
  },
};
