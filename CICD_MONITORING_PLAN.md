# IVOS - CI/CD & Monitoring Plan

## 1. CI/CD
- Vérifier le workflow GitHub Actions (.github/workflows/ci.yml)
- Ajouter un job de build production (npm run build)
- Générer et publier le rapport de couverture de test (npm run test:coverage)
- Ajouter un badge de build et de couverture dans le README
- Déployer automatiquement sur Vercel/Netlify à chaque merge sur main

## 2. Monitoring
- Activer Sentry pour le tracking des erreurs (frontend et backend)
- Ajouter un rapport Lighthouse automatisé (npm run lighthouse)
- Surveiller les performances (bundle, temps de réponse API)
- Mettre en place un canal d’alerte (Slack, email) pour les erreurs critiques

## 3. Sécurité
- Scanner les dépendances (npm audit) à chaque build
- Bloquer le déploiement si vulnérabilité critique détectée

---

À compléter à chaque évolution de la chaîne CI/CD ou du monitoring.