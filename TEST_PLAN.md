# IVOS - TEST_PLAN

## Objectif
Garantir la robustesse, la sécurité et la maintenabilité du système IVOS par une couverture de test élevée et pertinente.

## 1. Tests unitaires
- Services métier (CRUD, logique métier, validation)
- Hooks personnalisés (useVehicles, useMissions, useWasteForms, etc.)
- Utilitaires (formatters, validators)

## 2. Tests d’intégration
- Pages principales (auth, fleet, missions, waste-tracking, reporting)
- Flux critiques (création mission, signature BSD, export PDF)

## 3. Tests end-to-end (E2E)
- Parcours utilisateur complet (login, création mission, signature, reporting)
- Gestion offline/online (PWA)
- Sécurité (permissions, accès refusé, RLS)

## 4. Outils
- Jest pour unitaires/intégration
- Cypress ou Playwright pour E2E (à installer)

## 5. Stratégie
- Objectif : >80% de couverture sur les services, hooks, pages critiques
- CI : exécution automatique des tests à chaque PR
- Rapport de couverture généré à chaque build

---

Mettre à jour ce plan à chaque évolution majeure du produit.