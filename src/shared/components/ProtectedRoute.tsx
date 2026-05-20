/**
 * ============================================
 * ProtectedRoute Component
 * ============================================
 * Wraps protected pages and enforces authentication
 * Redirects to login if not authenticated
 *
 * Usage:
 * <ProtectedRoute requiredRole="country_manager">
 *   <YourProtectedPage />
 * </ProtectedRoute>
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { User } from '../services/authStore';

export type UserRole = User['role'];

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[]; // If not specified, any authenticated user is allowed
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, requiredRole, fallback }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  // Loading state
  if (isLoading) {
    return (
      fallback || (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Chargement...</p>
          </div>
        </div>
      )
    );
  }

  // Not authenticated — check for offline superadmin session before redirecting
  if (!user) {
    let hasOfflineSession = false;
    try {
      const raw = localStorage.getItem('ivos_session');
      if (raw) {
        const s = JSON.parse(raw) as Record<string, unknown>;
        hasOfflineSession = !!(s?.userId && s?.offline);
      }
    } catch {
      // ignore
    }
    if (hasOfflineSession) {
      return (
        fallback || (
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-4 text-gray-600">Restauration de la session...</p>
            </div>
          </div>
        )
      );
    }
    return <Navigate to="/login" replace />;
  }

  // User not approved (pending or rejected status)
  if (user.status !== 'approved') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md text-center">
          <div className="mb-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <span className="text-2xl">⏳</span>
            </div>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">En attente d'approbation</h1>
          <p className="text-gray-600">
            Votre compte a été créé avec succès. Un administrateur doit approuver votre accès. Vous
            recevrez un email dès que ce sera fait.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            Statut: <span className="font-semibold capitalize">{user.status}</span>
          </p>
        </div>
      </div>
    );
  }

  // Account blocked
  if (user.systemAccessBlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md text-center">
          <div className="mb-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <span className="text-2xl">🚫</span>
            </div>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Accès refusé</h1>
          <p className="text-gray-600">
            Votre accès au système a été suspendu. Veuillez contacter l'administrateur.
          </p>
        </div>
      </div>
    );
  }

  // Check role requirement
  if (requiredRole) {
    const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasRequiredRole = requiredRoles.includes(user.role);

    if (!hasRequiredRole) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="max-w-md text-center">
            <div className="mb-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <span className="text-2xl">🔐</span>
              </div>
            </div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">Accès interdit</h1>
            <p className="text-gray-600">
              Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            </p>
            <p className="mt-4 text-sm text-gray-500">
              Rôle requis:{' '}
              <span className="font-semibold capitalize">{requiredRoles.join(', ')}</span>
            </p>
            <p className="text-sm text-gray-500">
              Votre rôle: <span className="font-semibold capitalize">{user.role}</span>
            </p>
          </div>
        </div>
      );
    }
  }

  // All checks passed
  return <>{children}</>;
}

/**
 * Route Guard Hook
 * Use in page components to check auth state
 *
 * Example:
 * const auth = useRouteGuard();
 * if (!auth.isAllowed) return <Navigate to="/auth/login" />;
 */
export interface RouteGuardOptions {
  requiredRole?: UserRole | UserRole[];
}

export function useRouteGuard(options: RouteGuardOptions = {}) {
  const { user, isLoading } = useAuth();
  const { requiredRole } = options;

  const isAllowed = React.useMemo(() => {
    if (isLoading) return false;

    if (!user) {
      try {
        const raw = localStorage.getItem('ivos_session');
        if (raw) {
          const s = JSON.parse(raw) as Record<string, unknown>;
          if (s?.userId && s?.offline) return true;
        }
      } catch {
        // ignore
      }
      return false;
    }

    if (user.status !== 'approved') return false;
    if (user.systemAccessBlocked) return false;

    if (requiredRole) {
      const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      return requiredRoles.includes(user.role);
    }

    return true;
  }, [user, isLoading, requiredRole]);

  return {
    user,
    isLoading,
    isAllowed,
    isAuthenticated: !!user,
  };
}
