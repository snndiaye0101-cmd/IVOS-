# 📊 Guide Complet : Page "Administration Système"

## Vue d'ensemble

La nouvelle page **"Administration Système"** fusionne deux modules précédents :
- ✅ **Gestion des Utilisateurs** (UserManagementPage.tsx)
- ✅ **Contrôle Super Admin** (SuperAdminPanel.tsx)

### Localisation
- **Fichier** : `/src/features/settings/pages/AdministrationSysteme.tsx`
- **Route** : `/settings/administration-systeme`
- **Menu** : Paramètres → Administration Système
- **Accès** : Super Admin uniquement

---

## 🔐 Sécurité & Gating

### Role-Gating
```typescript
const isSA = currentUser ? permissionStore.isSuperAdmin(currentUser.id) : false

if (!currentUser || !isSA) {
  return <AccessDenied />  // Affiche un message d'accès restreint
}
```

✅ **Seul un Super Admin peut accéder à cette page.**

---

## 📑 Structure des Onglets

### 1️⃣ Tableau de Bord Activité
**Description** : Vue globale de l'activité des utilisateurs sur 7 jours.

**KPIs affichés** :
- 🟢 **En ligne** : Nombre d'utilisateurs actuellement connectés
- ⚪ **Hors ligne** : Nombre d'utilisateurs inactifs
- ⏱️ **Heures/semaine** : Temps total de connexion (tous utilisateurs)
- ➕ **Créations** : Nombre d'enregistrements créés
- 📈 **Actions** : Total des modifications cette semaine

**Visualisations** :
- 📊 **Graphique barres** : Heures de connexion (7 derniers jours)
- 🥧 **Graphique camembert** : Répartition activité par module
- 📋 **Liste utilisateurs en ligne** : Avec heures connectées
- 📋 **Liste utilisateurs hors ligne** : Avec dernière connexion

### 2️⃣ Liste des Utilisateurs
**Description** : Gestion centralisée de tous les utilisateurs approuvés.

**Colonnes du tableau** :
| Colonne | Description |
|---------|-------------|
| Utilisateur | Avatar coloré + Nom + Email |
| Rôle | SuperAdmin (rouge), Admin (bleu), Utilisateur (gris) |
| Statut | Actif ✅ / En Attente ⏳ / Refusé ❌ |
| En ligne | Indicateur en ligne/hors ligne |
| Heures/sem. | Total heures connectées cette semaine |
| Actions | Bouton "Visualiser" (impersonation) |

**Alerte** :
- Si utilisateurs en attente → Banneau d'alerte orange

**Recherche globale** :
- Filtre par nom d'utilisateur ou email en temps réel

### 3️⃣ Matrice des Permissions
**Description** : Contrôle granulaire des accès par module pour chaque utilisateur.

**Sélection utilisateur** :
```
Dropdown : Choisir un utilisateur approuvé
Boutons rôle : SuperAdmin | Admin | Utilisateur
```

**Matrice interactive** :
- 9 modules (Dashboard, Flotte, Exploitation, Finances, Technique, RH, Paramètres, Chat, Hub Carburant)
- 4 niveaux de permission par module :
  - ❌ **Aucun** : Module supprimé du DOM (invisible)
  - 👁️ **Voir** : Lecture seule
  - ✏️ **Modifier** : Lecture + Écriture
  - ⭐ **Tout** : Accès complet

**Actions** :
- 💾 **Sauvegarder** : Enregistre les modifications (avec audit)
- 🔄 **Réinitialiser** : Restaure permissions par défaut du rôle

**Changement de rôle** :
- Clic sur SuperAdmin/Admin/Utilisateur met à jour le rôle instantanément
- Permissions sont enregistrées dans l'audit

### 4️⃣ Journal d'Audit & Sécurité
**Description** : Traçabilité complète + Approbation des actions critiques.

#### A) Journal d'Audit (haut)

**Stats rapides** :
| Stat | Description |
|------|-------------|
| Total | Nombre total d'entrées audit |
| Dernières 24h | Entrées des 24 dernières heures |
| Créations | Nombre d'enregistrements créés |
| Modifications | Nombre de modifications |
| Suppressions | Nombre de suppressions |
| Critiques | Actions critiques tracées |

**Filtres** :
- 🎯 Sévérité : Info / Moyen / Élevé / Critique
- 🎯 Type action : Création / Modification / Suppression / Permissions / Rôle / Action critique

**Colonnes du tableau** :
| Colonne | Format |
|---------|--------|
| Date | JJ MMM HH:MM |
| Utilisateur | Nom (Rôle) |
| Action | Badge coloré (couleur = type) |
| Module | Nom du module modifié |
| Description | Brève description |
| Sévérité | Badge Info/Moyen/Élevé/Critique |
| Détail | Bouton œil pour modal |

**Export** :
- 📥 **Bouton CSV** : Télécharge filtered entries en CSV (+ BOM UTF-8)

**Modal Détail** :
- 📅 Date & Heure
- 👤 Utilisateur & Rôle
- 🔄 Action effectuée
- 📦 Module / Entité
- 📝 Description complète
- 🔀 Comparaison Old Value vs New Value (JSON diff)

#### B) Actions Critiques en Attente (bas)

**Banneau alertes** :
- 🔴 Badge rouge animé : Nombre actions en attente

**Filtres** :
- En attente / Approuvées / Refusées / Toutes

**Carte action critique** :
```
[Titre action]
Par : Nom utilisateur — Date
Status : EN ATTENTE / APPROUVÉE / REFUSÉE

[Si EN ATTENTE]
Champ texte : Note (optionnel)
Bouton ✅ Approuver | Bouton ❌ Refuser
```

**Traitement** :
- Clic Approuver → Enregistre note + Log audit + Recharge liste
- Clic Refuser → Rejette + Log audit + Note obligatoire

---

## 🔍 Recherche Globale

**Position** : Header (barre unique pour tous les onglets)

**Portée** :
- **Onglet Audit** : Filtre par utilisateur, module, description
- **Onglet Utilisateurs** : Filtre par nom, email
- **Autres onglets** : Inactif

**Placeholder** : "Rechercher utilisateurs, actions, modules…"

---

## 🛠️ Intégrations Services

### Services utilisés

```typescript
import { useAuth } from '../../../shared/contexts/AuthContext'
import { permissionStore } from '../../../shared/services/permissionStore'
import { auditService } from '../../../shared/services/auditService'
import { criticalActionService } from '../../../shared/services/criticalActionService'
```

### Événements écoutés

```typescript
window.addEventListener('audit:updated', loadAuditData)
window.addEventListener('critical:updated', loadAuditData)
```

### Logs d'audit automatiques

Toute action enregistre automatiquement :
- ✏️ Changement rôle utilisateur
- 🔐 Changement permissions module
- 👁️ Activation "Visualiser en tant que"
- ✅ Approbation action critique
- ❌ Rejet action critique

---

## 🎨 Design & Badges

### Avatars Colorés
```typescript
// 8 couleurs basées sur première lettre du nom
AVATAR_COLORS = [
  'from-blue-500 to-blue-600',       // Blue
  'from-emerald-500 to-emerald-600', // Emerald
  'from-violet-500 to-violet-600',   // Violet
  'from-amber-500 to-amber-600',     // Amber
  'from-rose-500 to-rose-600',       // Rose
  'from-cyan-500 to-cyan-600',       // Cyan
  'from-indigo-500 to-indigo-600',   // Indigo
  'from-pink-500 to-pink-600',       // Pink
]
```

### Badges Statut

| Statut | Badge |
|--------|-------|
| En ligne | 🟢 Vert |
| Hors ligne | ⚪ Gris |
| SuperAdmin | 🔴 Rouge |
| Admin | 🔵 Bleu |
| Utilisateur | ⚙️ Gris |
| Critique | 🔴 Rouge pulsant |

---

## 🎯 Cas d'Usage

### Cas 1 : Approuver un nouvel utilisateur
1. Aller à **Onglet Audit & Sécurité**
2. Section **Actions Critiques**
3. Trouver la demande d'approbation
4. Clic **Approuver** (optionnel : ajouter note)
5. ✅ Utilisateur activé + notification envoyée + entrée audit créée

### Cas 2 : Changer les permissions d'un utilisateur
1. Aller à **Onglet Matrice des Permissions**
2. Sélectionner utilisateur dans dropdown
3. Cliquer sur boutons permission (Aucun/Voir/Modifier/Tout) par module
4. Clic **Sauvegarder**
5. ✅ Permissions mises à jour + changement loggé en audit

### Cas 3 : Tester l'interface d'un utilisateur
1. Aller à **Onglet Liste des Utilisateurs**
2. Sur la ligne de l'utilisateur, clic bouton **Visualiser**
3. 👁️ Page recharge → Vous voyez l'interface comme l'utilisateur
4. Action enregistrée en audit comme "Impersonation"
5. Pour quitter : Bouton **Désactiver** en haut

### Cas 4 : Vérifier activité suspecte
1. Aller à **Onglet Tableau de Bord**
2. Consulter utilisateurs en ligne et heures connectées
3. Aller à **Onglet Audit & Sécurité**
4. Filtrer par utilisateur + sévérité Critique
5. Voir timeline complète des actions

### Cas 5 : Exporter audit pour conformité
1. Aller à **Onglet Audit & Sécurité**
2. Optionnel : Filtrer par date, utilisateur, sévérité
3. Clic **CSV**
4. 📥 Fichier `audit_log_YYYY-MM-DD.csv` téléchargé

---

## 📋 Checklist Maintenance

- ✅ Page créée et routée
- ✅ Tous les 4 onglets implémentés
- ✅ Role-gating (Super Admin only)
- ✅ Recherche globale unifiée
- ✅ Intégration auditService & criticalActionService
- ✅ Impersonation ("Visualiser en tant que")
- ✅ Export CSV audit
- ✅ Build validation (exit code 0)
- ✅ Chaîne de caractères exacte français préservée
- ✅ Badges et avatars colorés

---

## 🚀 Déploiement

```bash
# Build production
npm run build

# Vérifier dist/assets/AdministrationSysteme-*.js
# Vérifier dist/index.html contient la route

# Déployer
npm run deploy  # ou votre commande deployment
```

---

## 🔗 Fichiers Concernés

| Fichier | Modification |
|---------|--------------|
| `src/features/settings/pages/AdministrationSysteme.tsx` | ✅ Créé |
| `src/app/App.tsx` | ✅ Import lazy + Route `/settings/administration-systeme` |
| `src/layouts/DashboardLayout.tsx` | ✅ Menu item dans Paramètres |
| Build | ✅ Validation réussie (exit code 0) |

---

## 📞 Support & Bugs

### Erreurs courantes

**Erreur** : "Accès Restreint - Seul le Super Admin..."
- **Cause** : Utilisateur n'a pas rôle SuperAdmin
- **Correction** : Demander à un Super Admin d'assigner le rôle via cette page

**Erreur** : "Property 'isAdmin' does not exist"
- **Cause** : Utilisation de méthode inexistante
- **Correction** : Utiliser `permissionStore.getRole(id) === 'Admin'`

**Erreur** : Audit vide
- **Cause** : auditService pas initialisé
- **Correction** : Vérifier `auditService.log()` est appelé partout

---

## 📚 Références

- [Audit Service Docs](../shared/services/auditService.ts)
- [Permission Store Docs](../shared/services/permissionStore.ts)
- [Critical Action Service](../shared/services/criticalActionService.ts)
- [UserManagement Legacy](../auth/pages/UserManagementPage.tsx)
- [SuperAdmin Legacy](../settings/pages/SuperAdminPanel.tsx)

---

**Création** : 24 avril 2026
**Développeur** : GitHub Copilot (Senior React)
**Status** : ✅ Production-Ready
