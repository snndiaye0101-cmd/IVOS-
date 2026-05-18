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

export interface PermissionRouteItem {
  path: string;
  label: string;
  module: AppModule;
}

export interface PermissionCategory {
  section: string;
  items: PermissionRouteItem[];
}

export const SIDEBAR_PERMISSION_TREE: PermissionCategory[] = [
  {
    section: 'PILOTAGE OPÉRATIONNEL',
    items: [
      { path: '/', label: 'Tableau de bord', module: 'dashboard' },
      { path: '/communications/chat', label: 'Chat', module: 'chat' },
      { path: '/communications/agenda', label: 'Agenda', module: 'chat' },
      { path: '/communications/email-center', label: 'Email Center', module: 'chat' },
      { path: '/communications/email-center/admin', label: 'Supervision Email', module: 'chat' },
    ],
  },
  {
    section: 'Exploitation',
    items: [
      { path: '/exploitation', label: 'Opérations', module: 'exploitation' },
      { path: '/exploitation/special-operations', label: 'Opérations Spéciales', module: 'exploitation' },
      { path: '/exploitation/bsd-en-cours', label: 'BSD', module: 'exploitation' },
    ],
  },
  {
    section: 'REPORTING & IMPACT',
    items: [
      { path: '/qhse/reporting', label: 'Reporting QHSE', module: 'finances' },
    ],
  },
  {
    section: 'Flotte',
    items: [
      { path: '/vehicles', label: 'Parc', module: 'fleet' },
      { path: '/personal-vehicles', label: 'Véhicules de fonction', module: 'fleet' },
      { path: '/fleet/handling-equipment', label: 'Engins de Manutention', module: 'fleet' },
      { path: '/hub-carburant', label: 'Hub Carburant', module: 'hub_carburant' },
      { path: '/flotte/tracking', label: 'Suivi en Temps Réel', module: 'fleet' },
      { path: '/maintenance', label: 'Maintenance / Pannes', module: 'technique' },
      { path: '/sinistres', label: 'Assurances & Sinistres', module: 'technique' },
      { path: '/pneumatique', label: 'Pneumatique', module: 'technique' },
      { path: '/inventaire-maintenance-materiels', label: 'Inventaire & Maintenance Matériels', module: 'technique' },
    ],
  },
  {
    section: 'Finances',
    items: [
      { path: '/finances', label: 'Dashboard Finance', module: 'finances' },
      { path: '/billing', label: 'Facturation', module: 'finances' },
      { path: '/finances/revenues', label: 'Recettes', module: 'finances' },
      { path: '/unite-facturation', label: 'Unité de Facturation', module: 'finances' },
      { path: '/finances/loans', label: 'Gestion des Prêts', module: 'finances' },
      { path: '/finances/salary-deductions', label: 'Paie avec Retenues', module: 'finances' },
      { path: '/finances/fiscal-recap', label: 'Récapitulatif Fiscal', module: 'finances' },
      { path: '/finances/global-expenses', label: 'Dépenses Globales', module: 'finances' },
    ],
  },
  {
    section: 'Immobilisations & Infrastructures',
    items: [
      { path: '/investissements', label: 'Gestion des Immobilisations & Infrastructures', module: 'finances' },
    ],
  },
  {
    section: 'Ressources Humaines',
    items: [
      { path: '/personnel', label: 'Personnel', module: 'rh' },
      { path: '/rh/documents', label: 'Documents Entreprise', module: 'rh' },
      { path: '/grh', label: 'Gestion RH', module: 'rh' },
      { path: '/borne-pointage', label: 'Borne de Pointage', module: 'rh' },
      { path: '/demande-conges', label: 'Demande Congé', module: 'rh' },
      { path: '/annuaire/badges', label: 'Conception de Badges', module: 'rh' },
    ],
  },
  {
    section: 'Paramètres',
    items: [
      { path: '/settings/administration-systeme', label: 'Administration Système', module: 'parametres' },
      { path: '/settings/clients', label: 'Référentiels Clients', module: 'parametres' },
      { path: '/settings/alerts', label: 'Seuils d\'Alertes', module: 'parametres' },
      { path: '/settings/backups', label: 'Sauvegardes', module: 'parametres' },
      { path: '/settings/security', label: 'Sécurité & Accès', module: 'parametres' },
      { path: '/settings/system-config', label: 'Gestion des Sites', module: 'parametres' },
      { path: '/settings/payroll-fiscal-config', label: 'Configuration Paie & Fiscalité', module: 'parametres' },
    ],
  },
];

const ROUTE_PERMISSIONS_KEY = 'ivos_route_permissions_v1';

interface RoutePermissions {
  userId: string;
  routes: Record<string, PermissionLevel>;
}

function loadAllRoutePermissions(): RoutePermissions[] {
  try { return JSON.parse(localStorage.getItem(ROUTE_PERMISSIONS_KEY) || '[]'); } catch { return []; }
}

function saveAllRoutePermissions(perms: RoutePermissions[]) {
  localStorage.setItem(ROUTE_PERMISSIONS_KEY, JSON.stringify(perms));
}

function defaultRoutePermissionsForRole(role: UserRole): Record<string, PermissionLevel> {
  const defaults = defaultPermissionsForRole(role);
  return SIDEBAR_PERMISSION_TREE.flatMap(category => category.items).reduce((acc, item) => {
    acc[item.path] = defaults[item.module];
    return acc;
  }, {} as Record<string, PermissionLevel>);
}

function aggregateRoutePermissionsByModule(routes: Record<string, PermissionLevel>): Record<AppModule, PermissionLevel> {
  const modulePerms: Record<AppModule, PermissionLevel> = {} as Record<AppModule, PermissionLevel>;

  for (const module of APP_MODULES) {
    const levels = Object.entries(routes)
      .filter(([route]) => ROUTE_TO_MODULE[route] === module)
      .map(([, level]) => level);

    if (levels.includes('all')) {
      modulePerms[module] = 'all';
    } else if (levels.includes('edit')) {
      modulePerms[module] = 'edit';
    } else if (levels.includes('view')) {
      modulePerms[module] = 'view';
    } else {
      modulePerms[module] = 'none';
    }
  }

  return modulePerms;
}

function findRoutePermission(routes: Record<string, PermissionLevel>, path: string): PermissionLevel | null {
  if (routes[path]) return routes[path];
  const sorted = Object.keys(routes).sort((a, b) => b.length - a.length);
  for (const prefix of sorted) {
    if (prefix !== '/' && path.startsWith(prefix)) {
      return routes[prefix];
    }
  }
  return null;
}

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

function loadRoutePermissionsForUser(userId: string): RoutePermissions | undefined {
  const all = loadAllRoutePermissions();
  return all.find(p => p.userId === userId);
}

function getDefaultRoutePermissions(userId: string): Record<string, PermissionLevel> {
  return defaultRoutePermissionsForRole(loadRoles()[userId] || 'Utilisateur');
}

function getRoutePermissionsForUser(userId: string): Record<string, PermissionLevel> {
  const custom = loadRoutePermissionsForUser(userId);
  return custom ? custom.routes : getDefaultRoutePermissions(userId);
}

function saveRoutePermissionsForUser(userId: string, routes: Record<string, PermissionLevel>) {
  const all = loadAllRoutePermissions();
  const idx = all.findIndex(p => p.userId === userId);
  if (idx >= 0) {
    all[idx].routes = routes;
  } else {
    all.push({ userId, routes });
  }
  saveAllRoutePermissions(all);
  window.dispatchEvent(new Event('permissions:updated'));
}

function resetRoutePermissionsForUser(userId: string) {
  const all = loadAllRoutePermissions().filter(p => p.userId !== userId);
  saveAllRoutePermissions(all);
  window.dispatchEvent(new Event('permissions:updated'));
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
    resetRoutePermissionsForUser(userId);
    window.dispatchEvent(new Event('permissions:updated'));
  },

  getRoutePermissions(userId: string): Record<string, PermissionLevel> {
    if (this.isSuperAdmin(userId)) {
      const defaults = defaultPermissionsForRole('SuperAdmin');
      return SIDEBAR_PERMISSION_TREE.flatMap(category => category.items).reduce((acc, item) => {
        acc[item.path] = defaults[item.module];
        return acc;
      }, {} as Record<string, PermissionLevel>);
    }
    return getRoutePermissionsForUser(userId);
  },

  setRoutePermissions(userId: string, routes: Record<string, PermissionLevel>) {
    saveRoutePermissionsForUser(userId, routes);
  },

  resetRoutePermissions(userId: string) {
    resetRoutePermissionsForUser(userId);
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
    const routePerms = this.getRoutePermissions(userId);
    const permission = findRoutePermission(routePerms, path);
    if (permission) {
      return permission !== 'none';
    }

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
    if (!mod) return true;
    return this.canAccess(userId, mod, 'view');
  },

  /** Get modules visible in sidebar for a section */
  canAccessSection(userId: string, sectionName: string): boolean {
    if (this.isSuperAdmin(userId)) return true;
    const category = SIDEBAR_PERMISSION_TREE.find(c => c.section === sectionName);
    if (!category) return true;
    const routePerms = this.getRoutePermissions(userId);
    return category.items.some(item => {
      const routePermission = findRoutePermission(routePerms, item.path);
      if (routePermission) return routePermission !== 'none';
      return this.canAccess(userId, item.module, 'view');
    });
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
