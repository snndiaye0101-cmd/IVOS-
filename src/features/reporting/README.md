# README - Module Reporting

Ce dossier gère le reporting et les dashboards :
- Pages : DashboardPage, ImpactReportPage
- Services : reportingService (KPIs, exports, analytics)
- Hooks : useDashboardData, useExport
- Types : (à compléter si besoin)

## Points clés
- Centralisation des accès API dans services/
- Utilisation de React Query pour la gestion des données
- Factorisation des composants UI dans shared/components/ui/
- Tests unitaires à placer dans chaque dossier service/hook

Voir le plan de test global dans /TEST_PLAN.md
