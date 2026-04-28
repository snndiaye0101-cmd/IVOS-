# IVOS - Fleet & Waste Management SaaS Platform (Sénégal) 🇸🇳

## 🚀 Nouvelles Fonctionnalités Implémentées

### 📊 Dashboard Ultra Moderne avec Graphiques Riches

Le nouveau dashboard offre une vue d'ensemble complète avec :

#### KPIs Principales
- **Missions Actives** : Suivi en temps réel avec variations hebdomadaires
- **Disponibilité des Véhicules** : Taux d'utilisation du parc (8/15 = 53%)
- **Chauffeurs Actifs** : Gestion de la disponibilité (15/22 = 68%)
- **BSD en Cours** : Traçabilité des bordereaux

#### Graphiques Interactifs (Recharts)
1. **Évolution des Missions** (Area Chart)
   - 6 derniers mois de données
   - Missions totales vs missions complétées
   - Taux de réussite visible

2. **Répartition des Déchets** (Pie Chart)
   - DASRI, Déchets dangereux, Boues pétrolières
   - Déchets chimiques, Déchets radioactifs
   - Pourcentages en temps réel

3. **Analyse des Coûts** (Bar Chart)
   - En Franc CFA (XOF)
   - Carburant, Maintenance, Assurance
   - Évolution mensuelle sur 6 mois

4. **Performance des Chauffeurs** (Bar Chart horizontal)
   - Top 5 conducteurs
   - Nombre de missions + Score de performance

5. **Répartition Géographique** (Bar Chart)
   - Missions par ville au Sénégal
   - Dakar, Thiès, Saint-Louis, Kaolack, Ziguinchor, Mbour

#### Alertes de Maintenance Intelligentes
- **Alertes Visuelles** avec icônes et codes couleur
- **Priorités** : Urgent (rouge), Moyen (jaune)
- Types d'alertes :
  - 🔧 Vidange moteur
  - 📋 Contrôle technique
  - 🛡️ Assurance
  - 🔩 Révision freins
- Kilométrage et échéances affichés
- Bouton "Planifier" pour chaque alerte

#### Statistiques Rapides
- 💰 **Carburant** : 2.4M FCFA ce mois
- ✅ **Taux de réussite** : 96.2% missions complétées
- 🛡️ **Assurances** : 15/15 à jour
- 📊 **Kilométrage moyen** : 127,500 km/véhicule

---

### 🚗 Gestion Complète des Véhicules (Contexte Sénégalais)

#### Informations de Base
- **Immatriculation** : Format sénégalais (SN-XXXX-XX)
- **Marque & Modèle** : Mercedes-Benz, Volvo, Scania, MAN
- **Type** : Camion, Citerne, Benne, Fourgon, Tracteur
- **Capacité** : En kg (18,000 - 30,000 kg)
- **Année de fabrication**
- **Type de carburant** : Diesel, Essence, Hybride, Électrique

#### Dates Importantes
- 📅 **Date d'achat**
- 🔧 **Date de mise en service**
- 🔢 **Kilométrage actuel** (avec suivi)

#### Système d'Alertes Automatiques

**Alerte Assurance** 🛡️
- Notification 30 jours avant expiration
- Alerte critique si expiré
- Couleurs : 
  - Jaune (30j avant)
  - Orange (7j avant)
  - Rouge (expiré)

**Alerte Contrôle Technique** 📋
- Notification 30 jours avant expiration
- Obligatoire au Sénégal
- Dates de renouvellement suivies

**Alerte Vidange Moteur** 🔧
- Notification 15 jours avant échéance
- Basée sur la date et le kilométrage
- Historique des vidanges conservé

#### Historique de Maintenance
- **Type d'intervention** : Vidange, révision, réparation
- **Description détaillée**
- **Coût** : En Franc CFA (XOF)
- **Date de réalisation**
- **Prochaine échéance** (calcul automatique)

#### Interface Utilisateur
- **Vue en Grille** : 3 colonnes (adaptative)
- **Cartes Véhicules** avec :
  - Statut visuel (Disponible, En mission, Maintenance, Hors service)
  - Alertes en haut de carte
  - Stats rapides (km, capacité, assurance, CT)
  - Boutons d'action (Maintenance, Voir, Modifier)

#### Statuts des Véhicules
- ✅ **Disponible** : Badge vert
- 🚚 **En mission** : Badge bleu
- 🔧 **Maintenance** : Badge jaune
- ❌ **Hors service** : Badge rouge

---

### 👨‍✈️ Gestion Avancée des Chauffeurs

#### Informations Personnelles
- **Nom complet**
- **Téléphone** : Format sénégalais (+221 XX XXX XX XX)
- **Email**
- **N° Permis de conduire** : Format SN-DL-XXXXXX
- **Date d'expiration du permis**
- **Années d'expérience**
- **Date d'embauche**

#### Suivi du Temps de Travail ⏰

**Temps de travail réglementaire (Sénégal)**
- ⏱️ **Heures hebdomadaires** : 40h (légal)
- 📅 **Heures mensuelles** : 160h (4 semaines)
- ⚡ **Heures supplémentaires** : Suivi séparé

**Alertes automatiques**
- 🚨 Dépassement de 48h/semaine
- ⚠️ Plus de 15h supplémentaires
- 📊 Historique des 4 dernières semaines

**Historique détaillé**
```
Semaine 3 Janvier : 42h (2h sup.)
Semaine 2 Janvier : 40h (0h sup.)
Semaine 1 Janvier : 44h (4h sup.)
Semaine 4 Décembre : 46h (6h sup.)
```

#### Certifications & Formations
- 🏅 **HAZMAT** : Badge orange si certifié
- 🎓 **Formateur interne** : Mention spéciale
- 📜 **Certificats professionnels**

#### Santé & Sécurité
- 🏥 **Dernière visite médicale**
- 📅 **Prochaine visite médicale** (obligatoire annuelle)
- 🚨 **Alerte automatique** 30j avant échéance

#### Performance
- 📊 **Score de performance** : 0-100%
  - ≥95% : Vert (Excellent)
  - 85-94% : Bleu (Très bien)
  - 75-84% : Jaune (Bien)
  - <75% : Rouge (À améliorer)
- 🎯 **Total missions complétées**
- 📈 **Taux de réussite**

#### Attribution des Véhicules
- 🚚 **Véhicule assigné** : SN-XXXX-XX
- 🔄 **Changement dynamique**
- 📊 **Historique d'attribution**

#### Statuts des Chauffeurs
- ✅ **Disponible** : Badge vert
- 🚚 **En mission** : Badge bleu
- 😴 **Repos** : Badge gris
- 🏖️ **Congé** : Badge violet

---

### 📋 Bordereaux de Suivi des Déchets (BSD)

#### Fonctionnalités Améliorées
- **Assistant BSD** : Guide de création pas-à-pas
- **Suivi des signatures** : Producteur → Transporteur → Réceptionnaire
- **Barre de progression visuelle** : 0/3, 1/3, 2/3, 3/3 signatures
- **Téléchargement PDF** : Génération automatique
- **Filtrage par statut** : Brouillon, Validé, En transit, Signé

#### Types de Déchets (Sénégal)
- ☢️ DASRI (Déchets d'Activités de Soins à Risques Infectieux)
- ⚠️ Déchets dangereux
- 🛢️ Boues pétrolières
- 🧪 Déchets chimiques
- ☢️ Déchets radioactifs

---

### 🎯 Missions & Ordres de Transport

#### Création de Mission
- 📍 **Origine & Destination** : Adresses complètes
- 🚚 **Véhicule assigné**
- 👨‍✈️ **Chauffeur assigné**
- 📏 **Distance calculée**
- 📅 **Date de mission**
- 📝 **Notes & Instructions**

#### Workflow Complet
```
Brouillon → Validé → En cours → Terminé → Clôturé
```

#### Intégration BSD
- ☑️ Checkbox "BSD attaché"
- 🔗 Liaison automatique mission ↔ BSD
- 📋 Affichage icône si BSD présent

---

### 🏢 Clients & Partenaires

#### Types de Clients
- 🏭 **Producteur** : Badge orange
- 🏭 **Réceptionnaire** : Badge vert
- 🔄 **Les deux** : Badge bleu

#### Informations Complètes
- **N° SIRET** : 14 chiffres
- **Adresse complète**
- **Contact principal**
- **Téléphone & Email**
- **Certifications** : ISO 14001, HAZMAT, ATEX, etc.

#### Vue en Grille
- Cartes élégantes avec icônes
- Badges de certification
- Actions rapides (Détails, Modifier)

---

## 🎨 Améliorations UX/UI

### Design System
- **Couleurs cohérentes** : Bleu (primaire), Orange (alertes), Vert (succès)
- **Badges avec icônes** : Visuellement distinctifs
- **Cartes avec hover** : Effet shadow smooth
- **Gradients modernes** : from-blue-50 to-indigo-50
- **Border subtle** : border-gray-100

### Animations
- Transition-shadow sur hover
- Smooth color transitions
- Loading states élégants

### Responsive Design
- Grid adaptative : 1 col mobile → 2-3 cols desktop
- Breakpoints : sm, md, lg, xl
- Touch-friendly sur mobile

---

## 🌍 Adaptations Sénégal

### Formats Locaux
- 📞 **Téléphone** : +221 XX XXX XX XX
- 🚗 **Immatriculation** : SN-XXXX-XX
- 🪪 **Permis** : SN-DL-XXXXXX
- 💰 **Devise** : Franc CFA (XOF)

### Villes Principales
- 🏙️ Dakar (capitale)
- 🌆 Thiès
- 🏘️ Saint-Louis
- 🏭 Kaolack
- 🌴 Ziguinchor
- 🏖️ Mbour

### Conformité Réglementaire
- ✅ Code du travail sénégalais (40h/semaine)
- ✅ Réglementation des transports
- ✅ Normes environnementales
- ✅ Traçabilité des déchets dangereux

---

## 🛠️ Technologies Utilisées

- **Frontend** : React 18 + TypeScript
- **Routing** : React Router 6
- **UI Components** : Radix UI
- **Styling** : Tailwind CSS
- **Charts** : Recharts
- **Icons** : Lucide React
- **Notifications** : Sonner (Toast)
- **Forms** : React Hook Form
- **Date** : date-fns

---

## 📦 Installation

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Build de production
npm run build
```

---

## 🚀 Améliorations Futures Suggérées

### 1. Géolocalisation en Temps Réel 📍
- Suivi GPS des véhicules en mission
- Carte interactive (Mapbox/Google Maps)
- Historique des trajets
- Calcul automatique des distances

### 2. Gestion des Coûts Avancée 💰
- **Carburant** : 
  - Consommation par véhicule (L/100km)
  - Coûts par mission
  - Prévisions mensuelles
- **Maintenance** :
  - Budget vs Réel
  - Coûts par type d'intervention
  - Analyse des dépenses
- **Export PDF/Excel** : Rapports financiers

### 3. Système de Notifications 🔔
- Notifications push (Web Push API)
- Emails automatiques :
  - Alertes maintenance
  - Expirations (permis, assurance, CT)
  - Confirmations de mission
- SMS (Twilio) pour alertes urgentes

### 4. Gestion des Documents 📄
- Upload de fichiers :
  - Carte grise
  - Assurance (PDF)
  - Contrôle technique
  - Permis de conduire
- Stockage sécurisé (Supabase Storage)
- Expiration automatique
- Téléchargement rapide

### 5. Calendrier des Missions 📅
- Vue calendrier (month/week/day)
- Drag & drop pour planifier
- Conflits de disponibilité
- Export iCal/Google Calendar

### 6. Rapports & Analytics 📊
- **Dashboard personnalisable** : Widgets déplaçables
- **Rapports mensuels automatiques**
- **Exports** :
  - PDF (rapports complets)
  - Excel (données brutes)
  - CSV (compatibilité)
- **KPIs avancés** :
  - ROI par véhicule
  - Coût par km
  - Taux d'utilisation
  - Performance chauffeurs

### 7. Module Facturation 💳
- Génération automatique factures
- Suivi des paiements
- Relances automatiques
- Intégration comptabilité

### 8. Module RH 👥
- Gestion des congés
- Planning des équipes
- Fiches de paie (intégration)
- Formation & compétences

### 9. API Mobile 📱
- Application mobile (React Native)
- Signature électronique sur tablette
- Prise de photos (preuves)
- Mode offline

### 10. Intégration IoT 🔌
- Capteurs véhicules (OBD-II)
- Télématique avancée
- Alertes en temps réel
- Maintenance prédictive

### 11. Intelligence Artificielle 🤖
- **Prédiction** :
  - Pannes potentielles
  - Optimisation des tournées
  - Consommation carburant
- **Recommandations** :
  - Meilleur chauffeur pour mission
  - Meilleur moment pour maintenance
  - Optimisation des coûts

### 12. Multi-tenant SaaS 🏢
- Gestion multi-entreprises
- Facturation par abonnement (Stripe)
- Personnalisation par client
- White-label

---

## 🔒 Sécurité & Conformité

### Données Sensibles
- ✅ Chiffrement des données (HTTPS)
- ✅ Authentification sécurisée (Supabase Auth)
- ✅ Row Level Security (RLS)
- ✅ Audit logs

### RGPD & Protection des Données
- 📋 Consentements tracés
- 🗑️ Droit à l'oubli
- 📥 Export de données
- 🔐 Accès contrôlé

### Backup & Disaster Recovery
- 💾 Sauvegardes automatiques quotidiennes
- 🔄 Point-in-time recovery
- 🌐 Réplication géographique

---

## 📞 Support & Contact

Pour toute question ou suggestion :
- 📧 Email : support@ivos.sn
- 📱 Téléphone : +221 XX XXX XX XX
- 🌐 Site web : www.ivos.sn

---

## 📜 Licence

Propriétaire - IVOS Fleet Management © 2026

---

**Fait avec ❤️ pour le Sénégal 🇸🇳**
