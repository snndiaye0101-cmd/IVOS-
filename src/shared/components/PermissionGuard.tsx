// ═══════════════════════════════════════════════════════════════
// PERMISSION GUARD — Suppression DOM si accès refusé
// ═══════════════════════════════════════════════════════════════
// Si l'accès est décoché, le composant n'est PAS rendu du tout
// (pas seulement caché en CSS) → empêche toute manipulation.

import type { ReactNode } from 'react';
import { useViewAs } from '../contexts/ViewAsContext';
import type { AppModule } from '../services/permissionStore';
import { Lock } from 'lucide-react';

interface PermissionGuardProps {
  module: AppModule;
  level?: 'view' | 'edit' | 'all';
  children: ReactNode;
  /** If true, show a "locked" message instead of nothing */
  showFallback?: boolean;
  /** Custom fallback component */
  fallback?: ReactNode;
}

export function PermissionGuard({
  module,
  level = 'view',
  children,
  showFallback = false,
  fallback,
}: PermissionGuardProps) {
  const { canAccess } = useViewAs();

  if (!canAccess(module, level)) {
    if (fallback) return <>{fallback}</>;
    if (showFallback) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
              <Lock className="h-7 w-7 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700">Accès restreint</h3>
            <p className="text-sm text-gray-400">
              Vous n'avez pas les permissions nécessaires pour accéder à ce module.
            </p>
          </div>
        </div>
      );
    }
    return null; // DOM removal — component not rendered at all
  }

  return <>{children}</>;
}

/** Hook for inline permission checks */
export function usePermission(module: AppModule, level: 'view' | 'edit' | 'all' = 'view'): boolean {
  const { canAccess } = useViewAs();
  return canAccess(module, level);
}
