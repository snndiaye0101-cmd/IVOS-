/**
 * Configuration Sentry pour le monitoring d'erreurs
 * et la performance de l'application
 */

import * as Sentry from '@sentry/react';
import { useEffect } from 'react';
import { useLocation, useNavigationType, createRoutesFromChildren, matchRoutes } from 'react-router-dom';

/**
 * Initialiser Sentry avec les configurations recommandées
 * 
 * À appeler au démarrage de l'application (main.tsx)
 * 
 * @example
 * import { initSentry } from './shared/services/sentryService';
 * initSentry();
 */
export function initSentry() {
  // Ne pas initialiser en développement
  if (import.meta.env.DEV) {
    console.log('🔧 Sentry désactivé en mode développement');
    return;
  }

  Sentry.init({
    // DSN à configurer dans les variables d'environnement
    dsn: import.meta.env.VITE_SENTRY_DSN || '',
    
    // Environnement
    environment: import.meta.env.VITE_APP_ENV || 'production',
    
    // Version de l'application
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',
    
    // Performance Monitoring (simple pour v10)
    tracesSampleRate: 0.1, // 10% des transactions
    
    // Intégrations de base
    integrations: [
      // Intégrations par défaut de Sentry v10
    ],

    // Filtrer les erreurs non pertinentes
    beforeSend(event, hint) {
      // Ignorer les erreurs de réseau temporaires
      if (event.exception?.values?.[0]?.type === 'NetworkError') {
        return null;
      }
      
      // Ignorer les erreurs localStorage quota exceeded
      if (event.exception?.values?.[0]?.value?.includes('QuotaExceededError')) {
        console.warn('⚠️ LocalStorage quota dépassé');
        return null;
      }
      
      return event;
    },

    // Tags globaux
    initialScope: {
      tags: {
        app: 'IVOS',
        version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      },
    },
  });

  console.log('✅ Sentry initialisé');
}

/**
 * Logger une erreur métier personnalisée
 * 
 * @param {string} message - Message d'erreur
 * @param {object} context - Contexte additionnel
 * @param {'error' | 'warning' | 'info'} level - Niveau de sévérité
 * @example
 * logError('Échec génération certificat', {
 *   operationId: 'OP-001',
 *   reason: 'BSD non clôturé'
 * }, 'warning');
 */
export function logError(
  message: string,
  context?: Record<string, any>,
  level: 'error' | 'warning' | 'info' = 'error'
) {
  if (import.meta.env.DEV) {
    console.error(`[${level.toUpperCase()}]`, message, context);
    return;
  }

  Sentry.captureMessage(message, {
    level,
    contexts: {
      custom: context,
    },
  });
}

/**
 * Logger une exception
 * 
 * @param {Error} error - Erreur capturée
 * @param {object} context - Contexte additionnel
 * @example
 * try {
 *   generateCertificate(params);
 * } catch (error) {
 *   logException(error, { operationId: 'OP-001' });
 * }
 */
export function logException(error: Error, context?: Record<string, any>) {
  if (import.meta.env.DEV) {
    console.error('Exception:', error, context);
    return;
  }

  Sentry.captureException(error, {
    contexts: {
      custom: context,
    },
  });
}

/**
 * Définir le contexte utilisateur pour Sentry
 * 
 * @param {object} user - Informations utilisateur
 * @example
 * setUserContext({
 *   id: 'user-123',
 *   email: 'admin@ivos.com',
 *   role: 'dispatcher',
 *   site: 'KIGNABOUR'
 * });
 */
export function setUserContext(user: {
  id: string;
  email?: string;
  role?: string;
  site?: string;
}) {
  if (import.meta.env.DEV) return;

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.email?.split('@')[0],
  });

  Sentry.setTag('role', user.role || 'unknown');
  Sentry.setTag('site', user.site || 'unknown');
}

/**
 * Tracer une transaction de performance
 * 
 * @param {string} name - Nom de la transaction
 * @param {string} op - Type d'opération
 * @param {Function} callback - Fonction à tracer
 * @returns {Promise<T>} Résultat de la fonction
 * @example
 * await traceTransaction('Generate QHSE Archive', 'backup', async () => {
 *   return await generateQHSEArchive(2026, onProgress);
 * });
 */
export async function traceTransaction<T>(
  name: string,
  op: string,
  callback: () => Promise<T>
): Promise<T> {
  // En développement ou si Sentry pas configuré, juste mesurer le temps
  if (import.meta.env.DEV) {
    console.time(`⏱️ ${name}`);
    const result = await callback();
    console.timeEnd(`⏱️ ${name}`);
    return result;
  }

  // Pour Sentry v10, utiliser captureMessage pour tracer
  const startTime = Date.now();
  try {
    const result = await callback();
    const duration = Date.now() - startTime;
    Sentry.addBreadcrumb({
      message: `${name} completed`,
      level: 'info',
      data: { op, duration },
    });
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    Sentry.addBreadcrumb({
      message: `${name} failed`,
      level: 'error',
      data: { op, duration },
    });
    throw error;
  }
}

/**
 * Breadcrumb personnalisé pour le tracking d'actions
 * 
 * @param {string} message - Message du breadcrumb
 * @param {object} data - Données additionnelles
 * @example
 * addBreadcrumb('Certificat généré', {
 *   certificateNumber: 'CERT-KIG-2026-0001',
 *   operationId: 'OP-001'
 * });
 */
export function addBreadcrumb(message: string, data?: Record<string, any>) {
  if (import.meta.env.DEV) {
    console.log('🍞 Breadcrumb:', message, data);
    return;
  }

  Sentry.addBreadcrumb({
    message,
    level: 'info',
    data,
  });
}
