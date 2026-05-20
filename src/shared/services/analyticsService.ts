// src/shared/services/analyticsService.ts
export function trackEvent(event: string, data?: Record<string, unknown>) {
  // Exemple : envoyer à un service analytics (Matomo, Google Analytics, etc.)
  // window.gtag?.('event', event, data)
  // window._paq?.push(['trackEvent', event, data])
  // Pour l’instant, log en console
  console.log('[Analytics]', event, data);
}

export function exportData(format: 'pdf' | 'excel' | 'csv', data: unknown) {
  // TODO: Implémenter l’export (utiliser jsPDF, SheetJS, etc.)
  // Placeholder
  console.log(`[Export ${format}]`, data);
}
