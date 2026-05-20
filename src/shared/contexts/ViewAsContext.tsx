// ═══════════════════════════════════════════════════════════════
// VIEW-AS CONTEXT — Impersonation pour Super Admin
// ═══════════════════════════════════════════════════════════════
// Quand le Super Admin active "Visualiser en tant que", ce contexte
// surcharge l'utilisateur courant pour simuler l'expérience de l'autre.

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  permissionStore,
  type AppModule,
  type PermissionLevel,
  type UserRole,
} from '../services/permissionStore';

interface ViewAsContextType {
  /** The effective user (real user or impersonated) */
  effectiveUserId: string;
  effectiveUserName: string;
  effectiveRole: UserRole;
  /** Whether impersonation is active */
  isImpersonating: boolean;
  /** The real Super Admin user id (when impersonating) */
  realUserId: string | null;
  /** Permission check for effective user */
  canAccess: (module: AppModule, level?: 'view' | 'edit' | 'all') => boolean;
  canAccessRoute: (path: string) => boolean;
  canAccessSection: (sectionName: string) => boolean;
  getPermissions: () => Record<AppModule, PermissionLevel>;
  /** Is the real user a Super Admin? */
  isSuperAdmin: boolean;
  /** Deactivate impersonation */
  deactivate: () => void;
}

const ViewAsContext = createContext<ViewAsContextType | null>(null);

function getViewAs(): {
  originalUserId: string;
  viewAsUserId: string;
  viewAsUserName: string;
} | null {
  try {
    const raw = sessionStorage.getItem('ivos_view_as');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function ViewAsProvider({ children }: { children: ReactNode }) {
  const { user, allUsers } = useAuth();
  const viewAs = getViewAs();

  const value = useMemo<ViewAsContextType>(() => {
    if (!user) {
      return {
        effectiveUserId: '',
        effectiveUserName: '',
        effectiveRole: 'Utilisateur',
        isImpersonating: false,
        realUserId: null,
        canAccess: () => false,
        canAccessRoute: () => false,
        canAccessSection: () => false,
        getPermissions: () => ({}) as Record<AppModule, PermissionLevel>,
        isSuperAdmin: false,
        deactivate: () => {},
      };
    }

    const realIsSA = permissionStore.isSuperAdmin(user.id);

    // If impersonating and the real user is SA
    if (viewAs && realIsSA && viewAs.originalUserId === user.id) {
      const targetUser = allUsers.find((u) => u.id === viewAs.viewAsUserId);
      const effectiveId = viewAs.viewAsUserId;
      return {
        effectiveUserId: effectiveId,
        effectiveUserName: targetUser?.fullName || viewAs.viewAsUserName,
        effectiveRole: permissionStore.getRole(effectiveId),
        isImpersonating: true,
        realUserId: user.id,
        canAccess: (mod, level) => permissionStore.canAccess(effectiveId, mod, level),
        canAccessRoute: (path) => permissionStore.canAccessRoute(effectiveId, path),
        canAccessSection: (name) => permissionStore.canAccessSection(effectiveId, name),
        getPermissions: () => permissionStore.getPermissions(effectiveId),
        isSuperAdmin: realIsSA,
        deactivate: () => {
          sessionStorage.removeItem('ivos_view_as');
          window.location.reload();
        },
      };
    }

    // Normal mode
    return {
      effectiveUserId: user.id,
      effectiveUserName: user.fullName,
      effectiveRole: permissionStore.getRole(user.id),
      isImpersonating: false,
      realUserId: null,
      canAccess: (mod, level) => permissionStore.canAccess(user.id, mod, level),
      canAccessRoute: (path) => permissionStore.canAccessRoute(user.id, path),
      canAccessSection: (name) => permissionStore.canAccessSection(user.id, name),
      getPermissions: () => permissionStore.getPermissions(user.id),
      isSuperAdmin: realIsSA,
      deactivate: () => {},
    };
  }, [user, allUsers, viewAs]);

  return <ViewAsContext.Provider value={value}>{children}</ViewAsContext.Provider>;
}

export function useViewAs() {
  const ctx = useContext(ViewAsContext);
  if (!ctx) throw new Error('useViewAs must be used within ViewAsProvider');
  return ctx;
}
