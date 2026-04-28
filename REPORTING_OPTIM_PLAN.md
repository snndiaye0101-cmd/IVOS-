# IVOS - Reporting & Analytics Plan

## 1. Extraction & Data Mining
- Compléter les tests unitaires sur dataAnalyticsService.ts
- Ajouter des tests d’intégration sur ImpactReportPage.tsx (filtres, exports)
- Vérifier l’anonymisation automatique dans les exports publics

## 2. Dashboard
- Ajouter des loaders (UniversalLoader) sur les graphiques
- Optimiser le lazy loading des composants de chart
- Ajouter des tooltips et des filtres dynamiques

## 3. Export
- Tester l’export PDF/Excel (webExportService)
- Générer des infographies PNG pour le site web
- Ajouter des tests sur la conformité des exports (anonymisation, format)

## 4. Sécurité
- Vérifier qu’aucune donnée sensible n’est exportée publiquement
- Ajouter un badge de confirmation d’anonymisation sur l’UI

## 5. Documentation
- Mettre à jour REPORTING_SYSTEM.md à chaque évolution majeure
- Ajouter des exemples d’exports dans docs/

---

À compléter à chaque évolution du module reporting.