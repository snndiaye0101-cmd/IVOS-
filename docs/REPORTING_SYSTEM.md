# 📊 SYSTÈME D'EXTRACTION DE DONNÉES ET REPORTING QHSE

## Vue d'Ensemble

Le système d'extraction de données IVOS analyse automatiquement tous les **BSD finalisés** (Bordereaux de Suivi de Déchets avec Section 9 complète) et génère des **indicateurs environnementaux** pour la communication externe et le reporting QHSE.

---

## 🎯 Fonctionnalités Principales

### 1. **Data Mining Automatique**
- ✅ Extraction depuis BSD finalisés (Section 9 validée)
- ✅ Calcul du tonnage total collecté
- ✅ Répartition par type de déchet (Dangereux, Hydrocarbures, Non-dangereux, etc.)
- ✅ Répartition par secteur d'activité (anonymisé)
- ✅ Taux de valorisation (recyclage, valorisation énergétique)
- ✅ Évolution mensuelle sur une année

### 2. **Dashboard QHSE**
- 📈 Page "Rapport d'Impact" avec graphiques interactifs
- 🥧 Camemberts pour les répartitions (types, secteurs)
- 📊 Histogrammes pour l'évolution temporelle
- 📅 Filtres par période (mois, trimestre, année, personnalisé)
- 🔄 Actualisation en temps réel

### 3. **Export pour Site Web**
- 🌐 Génération automatique de contenu pour ivos.sn
- 📝 Résumés textuels accrocheurs
- 🖼️ Infographies PNG (1200x630 pixels)
- 📋 Chiffres clés formatés
- 💬 Texte pour réseaux sociaux (avec hashtags)
- 🔒 **Anonymisation automatique des clients**

### 4. **Sécurité & Confidentialité**
- 🔐 Noms de clients remplacés par secteurs ("Secteur Pétrolier", "Secteur Minier")
- ✅ Badge de confirmation d'anonymisation
- 🚫 Aucune donnée sensible dans les exports publics

---

## 📂 Architecture

```
src/
├── shared/
│   ├── services/
│   │   ├── dataAnalyticsService.ts       # 🧠 Moteur d'extraction (Data Mining)
│   │   └── webExportService.ts           # 🌐 Génération contenu web
│   └── components/
│       └── charts/
│           ├── PieChart.tsx              # 🥧 Graphique camembert
│           └── BarChart.tsx              # 📊 Graphique barres
└── features/
    └── reporting/
        ├── pages/
        │   └── ImpactReportPage.tsx      # 📈 Page principale
        └── components/
            └── WebExportModal.tsx        # 🌐 Modal d'export
```

---

## 🚀 Intégration

### Étape 1 : Ajouter la Route

Dans votre fichier de routes (`App.tsx` ou `router.tsx`) :

```tsx
import ImpactReportPage from '@/features/reporting/pages/ImpactReportPage';

// Route QHSE
{
  path: '/qhse/impact-report',
  element: <ImpactReportPage />,
  roles: ['Directeur Général', 'Manager QHSE', 'Responsable QHSE'],
}
```

### Étape 2 : Ajouter au Menu

Dans votre navigation QHSE :

```tsx
<NavLink to="/qhse/impact-report">
  <TrendingUp className="w-5 h-5" />
  <span>Rapport d'Impact</span>
</NavLink>
```

### Étape 3 : Permissions

Ajoutez la permission dans votre système d'autorisation :

```tsx
const canViewImpactReport = userRole === 'Directeur Général' || 
                            userRole === 'Manager QHSE' || 
                            userRole === 'Responsable QHSE';
```

---

## 📊 Utilisation

### 1. Accéder au Rapport

1. Cliquez sur **"Rapport d'Impact"** dans le menu QHSE
2. Le système charge automatiquement les données du mois en cours
3. Les graphiques s'affichent avec les métriques calculées

### 2. Changer de Période

- **Mois** : Mois en cours
- **Trimestre** : Trimestre en cours (T1, T2, T3, T4)
- **Année** : Année complète avec évolution mensuelle
- **Personnalisé** : Sélectionnez dates de début et fin

### 3. Exporter pour le Web

1. Cliquez sur **"Exporter pour le Web"**
2. Le modal affiche :
   - ✅ Titre accrocheur
   - ✅ Résumé court (1-2 phrases)
   - ✅ Chiffres clés (bullet points)
   - ✅ Infographie visuelle
   - ✅ Code HTML prêt à copier
   - ✅ Texte pour réseaux sociaux

3. Actions disponibles :
   - **Télécharger l'Infographie** : PNG 1200x630 pixels
   - **Copier HTML** : Pour intégration sur le site
   - **Copier Texte** : Pour LinkedIn, Facebook, Twitter

---

## 🔍 Indicateurs Calculés

### Tonnage Total Collecté
```typescript
Somme des poids réels (Section 6 - Pesée) de tous les BSD finalisés
Affichage : "1,275 tonnes" ou "2.5 kilotonnes"
```

### Répartition par Type
```typescript
Catégories :
- Hydrocarbures (huiles usagées, carburants)
- Déchets Dangereux (chimiques, toxiques)
- Déchets Médicaux
- Déchets Non-Dangereux (recyclables)
- Autres

Calcul : (Tonnage catégorie / Tonnage total) × 100
```

### Taux de Valorisation
```typescript
Méthodes de valorisation :
- Valorisation énergétique
- Recyclage
- Valorisation matière
- Compostage
- Régénération

Calcul : (Tonnage valorisé / Tonnage total) × 100
```

### Répartition par Secteur (Anonymisé)
```typescript
Mapping automatique :
"Total Sénégal"        → "Secteur Pétrolier"
"Mine d'Or de Sabodala" → "Secteur Minier"
"Nestlé Sénégal"       → "Secteur Industriel"
"Hôpital Principal"    → "Secteur Médical"
```

---

## 🎨 Exemples de Contenu Généré

### Titre
> "IVOS sécurise le traitement de 1,275 tonnes de déchets industriels"

### Résumé
> "Ce mois-ci, IVOS a sécurisé le traitement de 1,275 tonnes de déchets industriels, évitant ainsi un impact environnemental majeur. Avec un taux de valorisation de 68%, l'entreprise continue de placer l'économie circulaire au cœur de ses activités."

### Chiffres Clés
```
✅ 1,275 tonnes de déchets collectés et traités
♻️ 68% de taux de valorisation
📋 127 opérations sécurisées
🏭 5 secteurs d'activité accompagnés
🥇 Hydrocarbures : 850 tonnes
🥈 Déchets Dangereux : 320 tonnes
🥉 Déchets Non-Dangereux : 105 tonnes
```

### Texte Réseaux Sociaux
```
🌍 IVOS sécurise le traitement de 1,275 tonnes de déchets industriels

Ce mois-ci, IVOS a sécurisé le traitement de 1,275 tonnes de déchets 
industriels, évitant ainsi un impact environnemental majeur. Avec un 
taux de valorisation de 68%, l'entreprise continue de placer l'économie 
circulaire au cœur de ses activités.

📊 Chiffres clés Janvier 2026 :
✅ 1,275 tonnes de déchets collectés et traités
♻️ 68% de taux de valorisation
📋 127 opérations sécurisées
🏭 5 secteurs d'activité accompagnés

#IVOS #Environnement #DéchetsIndustriels #Sénégal #ÉconomieCirculaire #RSE
```

---

## 🔒 Confidentialité & Anonymisation

### Mapping Clients → Secteurs

Le service `dataAnalyticsService.ts` contient un mapping automatique :

```typescript
const CLIENT_TO_SECTOR: Record<string, string> = {
  // Pétrolier
  'total': 'Secteur Pétrolier',
  'shell': 'Secteur Pétrolier',
  'petrosen': 'Secteur Pétrolier',
  'sar': 'Secteur Pétrolier',
  'oryx': 'Secteur Pétrolier',
  
  // Minier
  'mine': 'Secteur Minier',
  'mining': 'Secteur Minier',
  
  // Industriel
  'industries': 'Secteur Industriel',
  'manufacture': 'Secteur Industriel',
  
  // Médical
  'hopital': 'Secteur Médical',
  'clinique': 'Secteur Médical',
  'hospital': 'Secteur Médical',
};
```

### Ajouter des Mappings

Pour ajouter un nouveau client :

```typescript
// Dans dataAnalyticsService.ts
const CLIENT_TO_SECTOR: Record<string, string> = {
  // ... existing mappings
  'nouveau_client': 'Secteur Approprié',
};
```

### Vérification

Le système affiche un badge de confirmation :

```tsx
✅ Confidentialité respectée
Les noms de clients ont été automatiquement anonymisés. 
Seuls les secteurs d'activité apparaissent dans les statistiques publiques.
```

---

## 🧪 Test du Système

### Scénario 1 : Créer des Données de Test

Utilisez le générateur de données fictives :

```typescript
// Console F12
quickCreateComplete(); // Crée 1 opération complète
quickCreate5();        // Crée 5 opérations variées
```

### Scénario 2 : Vérifier l'Extraction

1. Accédez à `/qhse/impact-report`
2. Vérifiez les métriques :
   - ✅ Tonnage affiché correctement
   - ✅ Répartition par type (camembert)
   - ✅ Secteurs anonymisés (pas de noms clients)
   - ✅ Taux de valorisation calculé

### Scénario 3 : Tester l'Export Web

1. Cliquez sur "Exporter pour le Web"
2. Vérifiez :
   - ✅ Titre généré automatiquement
   - ✅ Résumé cohérent
   - ✅ Chiffres clés corrects
   - ✅ Infographie visuelle
3. Testez les actions :
   - ✅ Copier HTML → Coller dans éditeur
   - ✅ Copier Texte → Coller sur réseau social
   - ✅ Télécharger Infographie → PNG sauvegardé

---

## 🎨 Personnalisation

### Modifier les Catégories de Déchets

Dans `dataAnalyticsService.ts` :

```typescript
const WASTE_CATEGORIES: Record<string, { category: WasteCategory; label: string; color: string }> = {
  'nouveau_type': { 
    category: 'dangereux', 
    label: 'Nouvelle Catégorie', 
    color: '#ff6b6b' 
  },
  // ... existing categories
};
```

### Modifier les Templates de Texte

Dans `webExportService.ts` :

```typescript
const HEADLINE_TEMPLATES = [
  'IVOS sécurise {tonnage} de déchets industriels',
  'Votre nouveau template avec {tonnage} et {period}',
  // ... more templates
];
```

### Modifier les Couleurs de Graphiques

Dans `PieChart.tsx` ou `BarChart.tsx` :

```typescript
// Gradient pour barres
gradient.addColorStop(0, '#10b981'); // Vert clair
gradient.addColorStop(1, '#059669'); // Vert foncé
```

---

## 📈 Métriques de Performance

### Cache Local
- Les rapports sont cachés dans `localStorage` pendant 1 heure
- Clé de cache : `ivos_impact_report_{type}_{startDate}`
- Bouton "Actualiser" force le recalcul

### Optimisations
- Calculs effectués côté client (pas de serveur requis)
- Graphiques Canvas HTML5 (performant)
- Données filtrées avant affichage

---

## 🐛 Dépannage

### Problème : Aucune Donnée Affichée

**Cause** : Aucun BSD finalisé dans la période

**Solution** :
1. Vérifiez qu'il y a des BSD avec `status: 'cloturee'`
2. Vérifiez que `bsdData.validatedAt` existe
3. Changez de période (essayez "Année")

### Problème : Clients Non Anonymisés

**Cause** : Nom de client non dans le mapping

**Solution** :
```typescript
// Ajoutez dans CLIENT_TO_SECTOR
'nom_client_manquant': 'Secteur Approprié',
```

### Problème : Graphiques Ne S'affichent Pas

**Cause** : Canvas non supporté

**Solution** :
- Vérifiez que le navigateur supporte Canvas HTML5
- Ouvrez la console pour voir les erreurs

---

## 🚀 Améliorations Futures

### Phase 1 (Actuelle)
- ✅ Extraction automatique des BSD
- ✅ Dashboard avec graphiques
- ✅ Export web avec infographie
- ✅ Anonymisation des clients

### Phase 2 (À Venir)
- 📧 Envoi automatique par email
- 📅 Rapports programmés (mensuel, trimestriel)
- 📊 Comparaison avec périodes précédentes
- 🎯 Objectifs et indicateurs de performance
- 📱 Version mobile responsive

### Phase 3 (Avancé)
- 🤖 IA pour génération de texte personnalisé
- 📈 Prédictions basées sur historique
- 🌍 Intégration API ivos.sn
- 🔔 Notifications en temps réel

---

## 📚 Ressources

### Fichiers Clés
- `dataAnalyticsService.ts` : Moteur d'extraction (600 lignes)
- `webExportService.ts` : Génération contenu web (400 lignes)
- `ImpactReportPage.tsx` : Interface principale (450 lignes)
- `WebExportModal.tsx` : Modal d'export (350 lignes)

### Dépendances
- **Lucide React** : Icônes
- **Canvas HTML5** : Graphiques et infographies
- **LocalStorage API** : Cache et données

### Support
- 📧 Email : support@ivos.sn
- 📖 Documentation : `/docs/REPORTING_SYSTEM.md`
- 🐛 Issues : GitHub ou Jira

---

## ✅ Checklist d'Intégration

- [ ] Routes ajoutées dans le router
- [ ] Menu QHSE mis à jour
- [ ] Permissions configurées (DG, Manager QHSE)
- [ ] Mapping clients → secteurs complété
- [ ] Test avec données fictives
- [ ] Test export web (HTML, Texte, Image)
- [ ] Vérification anonymisation
- [ ] Formation utilisateurs
- [ ] Documentation interne

---

## 🎉 Résumé

Le **Système d'Extraction de Données IVOS** transforme automatiquement vos BSD finalisés en **indicateurs environnementaux exploitables** :

- 🧠 **Data Mining** : Analyse intelligente des BSD
- 📊 **Dashboard** : Visualisation avec graphiques interactifs
- 🌐 **Export Web** : Contenu prêt pour publication
- 🔒 **Confidentialité** : Anonymisation automatique

**Résultat** : Communication externe professionnelle et conforme, générée en quelques clics !

---

**Développé avec ❤️ par l'équipe IVOS Tech**  
**Version 1.0 — Avril 2026**
