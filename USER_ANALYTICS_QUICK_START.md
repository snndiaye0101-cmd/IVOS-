# User Analytics - Guide Utilisateur Rapide

## Accès

1. Connectez-vous en tant que **Super Admin**
2. Allez à **Settings** → **Administration Système**
3. Cliquez sur l'onglet **"User Analytics"** (icône TrendingUp)

---

## Interface - Vue d'ensemble

### 1. 🎯 KPI Cards (Haut de page)

Quatre métriques principales :

- **Utilisateurs Actifs**: Nombre de personnes connectées maintenant
- **Heures 24h**: Total d'heures travaillées aujourd'hui
- **Durée Moyenne**: Durée moyenne d'une session
- **Actions Critiques**: Actions importantes ces 24 dernières heures

---

### 2. 👥 Top 5 Utilisateurs Actifs (Gauche)

**Classement des utilisateurs les plus actifs** :

Affiche :
- Rang (1-5)
- Photo + Nom
- **Heures travaillées** 
- Nombre d'actions effectuées
- Badge "Actif aujourd'hui" (si applicable)

**Comment l'utiliser** :
- **Cliquez sur un utilisateur** pour voir ses détails complets
- Les données se chargent dans la section droite

---

### 3. 🌍 Module le Plus Utilisé (Droite)

Affiche quel module/section est utilisé le plus :

- Nom du module
- Nombre de fois consulté
- Barre de progression visuelle

---

### 4. 📊 Détails de l'Utilisateur Sélectionné

Quand vous cliquez sur un utilisateur du Top 5 :

**Affiche** :
- **En-tête**: Photo + Nom + Email + Statut (en ligne/hors-ligne)

**Statistiques** :
- Heures totales
- Nombre total d'actions
- Actions critiques (🔴)
- Durée moyenne par session

**Graphique**: 
- Évolution des heures de présence sur 7 jours
- Vous voyez les pics d'activité

**Top Modules**: 
- Les 5 modules que cet utilisateur utilise le plus
- % de temps passé par module

---

### 5. 🔍 Journal d'Activité avec Filtres

**Section inférieure** avec une table et 5 filtres :

#### Filtres Disponibles :

1️⃣ **Période** 
   - Aujourd'hui
   - Hier
   - Cette semaine
   - Ce mois
   - Tout

2️⃣ **Utilisateur**
   - Tous les utilisateurs
   - Ou sélectionnez un utilisateur spécifique

3️⃣ **Sévérité**
   - Toutes
   - Info (ℹ️)
   - Moyen (📘)
   - Élevé (🟠)
   - Critique (🔴)

4️⃣ **Module**
   - Tous les modules
   - Ou sélectionnez : Dashboard, Fleet, Finances, etc.

5️⃣ **Recherche**
   - Tapez un mot pour chercher dans :
     - Nom de l'utilisateur
     - Action effectuée
     - Détails de l'action

#### Table d'Activité :

Affiche chaque action avec :

| Colonne | Signification |
|---------|---------------|
| **Utilisateur** | Qui a fait l'action |
| **Action** | Quoi (ex: "Créé facture") |
| **Détails** | Plus d'infos (ex: "Facture N°123") |
| **Module** | Où (ex: "finances") |
| **Date & Heure** | Quand exactement (JJ MMM HH:MM:SS) |
| **Appareil** | D'où (ex: "Chrome on macOS") |
| **Sévérité** | Couleur rouge/orange/bleu/gris |

---

## 💡 Cas d'Usage

### Cas 1: Vérifier qui a créé une facture hier

1. Mettez **"Hier"** dans le filtre Date
2. Sélectionnez **"finances"** dans Module
3. Tapez **"créé"** dans Recherche
4. Regardez la table → Vous voyez qui l'a créée et quand

### Cas 2: Monitorer un utilisateur spécifique

1. Cliquez sur l'utilisateur dans le **"Top 5"**
2. Regardez son graphique hebdomadaire
3. Consultez ses modules les plus utilisés
4. Vérifiez ses actions critiques (🔴)

### Cas 3: Analyser les actions critiques d'aujourd'hui

1. Sélectionnez **"Aujourd'hui"** en Date
2. Sélectionnez **"Critique"** en Sévérité
3. Laissez les autres filtres sur "Tous"
4. Vous voyez UNIQUEMENT les actions graves d'aujourd'hui

### Cas 4: Comparer deux périodes

1. Filtrez par **"Ce mois"** 
2. Regardez le graphique du user → Vous voyez les tendances
3. Comparez avec la semaine précédente mentalement

---

## 📌 Statuts des Utilisateurs

Dans la table et le Top 5 :

- 🟢 **En ligne depuis HH:MM** = Actuellement connecté
- ⚫ **Dernière activité : il y a X min** = Hors ligne depuis X minutes

---

## 🎨 Couleurs & Significations

| Badge | Sens |
|-------|------|
| 🟢 Vert | En ligne / Normal |
| 🟠 Orange | Élevé / À surveiller |
| 🔴 Rouge | Critique / Urgent |
| ⚫ Gris | Hors-ligne / Info |

---

## ⚡ Tips & Tricks

✅ **Cliquez sur un user du Top 5** pour voir ses détails → Les données se rechargen bas

✅ **Combinez les filtres** pour des recherches précises

✅ **La table montre max 50 actions** → Vous verrez "Affichage 50 sur 234" s'il y en a plus

✅ **Le graphique hebdomadaire** montre aussi le nombre d'actions par jour

✅ **Recherche textuelle** fonctionne en temps réel (pas besoin de cliquer)

---

## 📱 Responsivité

- **Mobile** : Cartes et filtres empilés verticalement
- **Tablette** : 2 colonnes pour les analytics
- **Desktop** : Full 3-colonnes layout

---

## 🔐 Sécurité

- **Données en démonstration** : Actuellement, les données se réinitialisent au rechargement
- **Future**: Intégration Supabase pour persistance
- **Super Admins uniquement** : Cet onglet n'est visible que pour vous

---

## ❓ Questions Fréquentes

**Q: Pourquoi je ne vois pas cet onglet ?**  
R: Il faut être connecté en tant que Super Admin

**Q: Les données ne se sauvegardent pas ?**  
R: Données de démonstration pour maintenant. Persistance à venir.

**Q: Je peux exporter les logs ?**  
R: Pas encore. Fonctionnalité prévue pour bientôt.

**Q: Comment ajouter une action à suivre ?**  
R: Le système le fera automatiquement depuis les autres modules

---

## 📞 Support

Pour des questions ou des améliorations, consultez :
- [USER_ANALYTICS_DOCUMENTATION.md](./USER_ANALYTICS_DOCUMENTATION.md) - Documentation technique complète
- [ADMINISTRATION_SYSTEME_GUIDE.md](./ADMINISTRATION_SYSTEME_GUIDE.md) - Guide complet du module

---

**Bon suivi d'activité ! 📊**
