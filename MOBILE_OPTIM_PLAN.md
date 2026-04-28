# IVOS - Mobile Optimization Plan

## 1. Responsive Design
- Vérifier tous les layouts avec Chrome DevTools (mobile/tablette)
- Utiliser Tailwind responsive (sm, md, lg, xl) sur tous les composants
- Tester les formulaires et tableaux sur petits écrans

## 2. PWA & Offline
- Vérifier la présence du manifest.json et du service worker (sw.js)
- Ajouter des messages d’état offline/online
- Tester l’installation sur Android/iOS

## 3. Ergonomie mobile
- Boutons et champs tactiles adaptés (taille, espacement)
- Utiliser des gestures (swipe, tap long) si pertinent
- Afficher des loaders rapides (UniversalLoader)
- Notifications push (vérifier l’activation)

## 4. Synchronisation mobile
- Compléter les TODO dans mobileApiService.ts (sync, fetch, IoT)
- Ajouter des tests de synchronisation offline/online
- [x] Ajout de rappels dans les services et hooks critiques

## 5. Accessibilité
- Vérifier le contraste, la navigation clavier, les labels
- Tester VoiceOver/ScreenReader sur mobile

---

À compléter à chaque évolution du front mobile.