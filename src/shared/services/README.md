# README — shared/services

Ce dossier regroupe les services transverses utilisés dans l’ensemble du système IVOS :

- **dataAnalyticsService.ts** : Extraction et analyse de données pour le reporting QHSE.
- **notificationService.ts** : Notifications utilisateurs (toast, alertes, push) et intégration Sentry.
- **auditService.ts** : Audit trail, log des actions sensibles, conformité RGPD.
- **certificateService.ts** : Gestion des certificats QHSE, alertes d’expiration.
- **backupService.ts** : Sauvegarde et restauration des données.
- **storageService.ts** : Gestion des fichiers et documents (upload, téléchargement).
- **geoLocationService.ts** : Géolocalisation, tracking GPS, alertes zones.
- **mobileApiService.ts** : Synchronisation mobile, IoT, offline.
- **webExportService.ts** : Export de données, anonymisation, conformité RGPD.

## Conventions
- Chaque service est factorisé, documenté (JSDoc/commentaire en tête).
- Les tests unitaires sont à placer dans `__tests__` ou à côté du service.
- Respecter les conventions du projet (voir `/docs/CONVENTIONS_CODE.md`).

## Contact
Pour toute question ou amélioration, contacter l’équipe technique IVOS.
