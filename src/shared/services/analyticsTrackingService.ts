/**
 * Service d'Analytics et Tracking d'Usage
 * 
 * Collecte anonymisée des métriques d'usage et performance
 */

interface AnalyticsEvent {
  name: string;
  timestamp: string;
  category: 'navigation' | 'action' | 'error' | 'performance';
  properties?: Record<string, any>;
  userId?: string;
  sessionId: string;
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count';
  timestamp: string;
}

const SESSION_ID = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
const STORAGE_KEY = 'ivos_analytics_v1';
const MAX_EVENTS = 100;

/**
 * Récupérer tous les événements enregistrés
 * 
 * @returns {AnalyticsEvent[]} Liste des événements
 */
export function getAnalyticsEvents(): AnalyticsEvent[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Enregistrer un événement analytics
 * 
 * @param {string} name - Nom de l'événement
 * @param {string} category - Catégorie de l'événement
 * @param {object} properties - Propriétés additionnelles
 * @param {string} userId - ID de l'utilisateur (optionnel)
 * @example
 * trackEvent('certificate_generated', 'action', {
 *   certificateNumber: 'CERT-KIG-2026-0001',
 *   operationId: 'OP-001'
 * });
 */
export function trackEvent(
  name: string,
  category: AnalyticsEvent['category'],
  properties?: Record<string, any>,
  userId?: string
): void {
  // En développement, logger dans la console
  if (import.meta.env.DEV) {
    console.log(`📊 Analytics: [${category}] ${name}`, properties);
  }

  const event: AnalyticsEvent = {
    name,
    timestamp: new Date().toISOString(),
    category,
    properties,
    userId,
    sessionId: SESSION_ID,
  };

  // Sauvegarder en localStorage (limite 100 événements)
  const events = getAnalyticsEvents();
  events.unshift(event);
  const trimmed = events.slice(0, MAX_EVENTS);
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.warn('Analytics storage failed:', error);
  }

  // Envoyer à un service externe (Sentry, Mixpanel, etc.)
  sendToExternalService(event);
}

/**
 * Envoyer l'événement à un service externe (à implémenter)
 * 
 * @param {AnalyticsEvent} event - Événement à envoyer
 */
function sendToExternalService(event: AnalyticsEvent): void {
  // TODO: Implémenter l'envoi vers Mixpanel, Amplitude, etc.
  // Pour l'instant, utiliser Sentry breadcrumbs
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    (window as any).Sentry.addBreadcrumb({
      category: event.category,
      message: event.name,
      level: 'info',
      data: event.properties,
    });
  }
}

/**
 * Tracker une page vue
 * 
 * @param {string} pageName - Nom de la page
 * @param {string} path - Chemin de la page
 * @example
 * trackPageView('Certificats QHSE', '/qhse/certificates');
 */
export function trackPageView(pageName: string, path: string): void {
  trackEvent('page_view', 'navigation', {
    pageName,
    path,
    referrer: document.referrer,
  });
}

/**
 * Tracker une action utilisateur
 * 
 * @param {string} actionName - Nom de l'action
 * @param {object} metadata - Métadonnées de l'action
 * @example
 * trackAction('export_qhse', {
 *   year: 2026,
 *   documentCount: 42
 * });
 */
export function trackAction(actionName: string, metadata?: Record<string, any>): void {
  trackEvent(actionName, 'action', metadata);
}

/**
 * Tracker une erreur
 * 
 * @param {string} errorName - Nom de l'erreur
 * @param {object} errorDetails - Détails de l'erreur
 * @example
 * trackError('certificate_generation_failed', {
 *   reason: 'BSD non clôturé',
 *   operationId: 'OP-001'
 * });
 */
export function trackError(errorName: string, errorDetails?: Record<string, any>): void {
  trackEvent(errorName, 'error', errorDetails);
}

/**
 * Mesurer une métrique de performance
 * 
 * @param {string} metricName - Nom de la métrique
 * @param {number} value - Valeur de la métrique
 * @param {string} unit - Unité de mesure (ms, bytes, count)
 * @example
 * trackPerformance('qhse_archive_generation_time', 5234, 'ms');
 */
export function trackPerformance(
  metricName: string,
  value: number,
  unit: PerformanceMetric['unit'] = 'ms'
): void {
  if (import.meta.env.DEV) {
    console.log(`⏱️ Performance: ${metricName} = ${value}${unit}`);
  }

  trackEvent(metricName, 'performance', {
    value,
    unit,
  });
}

/**
 * Obtenir les statistiques d'usage
 * 
 * @param {number} days - Nombre de jours à analyser
 * @returns {object} Statistiques d'usage
 * @example
 * const stats = getUsageStats(7); // 7 derniers jours
 * console.log(`${stats.totalEvents} événements enregistrés`);
 */
export function getUsageStats(days: number = 7): {
  totalEvents: number;
  eventsByCategory: Record<string, number>;
  topEvents: Array<{ name: string; count: number }>;
  avgEventsPerDay: number;
} {
  const events = getAnalyticsEvents();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const recentEvents = events.filter(
    (e) => new Date(e.timestamp) >= cutoffDate
  );

  // Événements par catégorie
  const eventsByCategory: Record<string, number> = {};
  recentEvents.forEach((e) => {
    eventsByCategory[e.category] = (eventsByCategory[e.category] || 0) + 1;
  });

  // Top événements
  const eventCounts: Record<string, number> = {};
  recentEvents.forEach((e) => {
    eventCounts[e.name] = (eventCounts[e.name] || 0) + 1;
  });

  const topEvents = Object.entries(eventCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalEvents: recentEvents.length,
    eventsByCategory,
    topEvents,
    avgEventsPerDay: recentEvents.length / days,
  };
}

/**
 * Exporter les données analytics au format CSV
 * 
 * @returns {string} Données CSV
 * @example
 * const csv = exportAnalyticsCSV();
 * // Télécharger ou envoyer à un service
 */
export function exportAnalyticsCSV(): string {
  const events = getAnalyticsEvents();
  
  const headers = 'Timestamp,Name,Category,User ID,Session ID,Properties\n';
  
  const rows = events.map((e) => {
    const props = e.properties ? JSON.stringify(e.properties) : '';
    return `"${e.timestamp}","${e.name}","${e.category}","${e.userId || ''}","${e.sessionId}","${props}"`;
  }).join('\n');

  return headers + rows;
}

/**
 * Nettoyer les anciennes données analytics (plus de 30 jours)
 * 
 * @returns {number} Nombre d'événements supprimés
 * @example
 * const deleted = cleanOldAnalytics();
 * console.log(`${deleted} événements supprimés`);
 */
export function cleanOldAnalytics(): number {
  const events = getAnalyticsEvents();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);

  const recentEvents = events.filter(
    (e) => new Date(e.timestamp) >= cutoffDate
  );

  const deletedCount = events.length - recentEvents.length;

  if (deletedCount > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recentEvents));
    console.log(`🗑️ ${deletedCount} événements analytics supprimés`);
  }

  return deletedCount;
}

/**
 * Hook React pour tracker automatiquement les pages vues
 * 
 * @example
 * // Dans un composant de page
 * import { useEffect } from 'react';
 * 
 * function MyPage() {
 *   useEffect(() => {
 *     trackPageView('Dashboard', '/dashboard');
 *   }, []);
 * }
 */
// Note: Utiliser useEffect directement dans vos composants
// import { useEffect } from 'react';
// useEffect(() => trackPageView('Page', '/path'), []);

// Auto-cleanup tous les 7 jours
if (typeof window !== 'undefined') {
  const lastCleanup = localStorage.getItem('ivos_analytics_last_cleanup');
  const now = Date.now();
  
  if (!lastCleanup || now - parseInt(lastCleanup) > 7 * 24 * 60 * 60 * 1000) {
    cleanOldAnalytics();
    localStorage.setItem('ivos_analytics_last_cleanup', now.toString());
  }
}
