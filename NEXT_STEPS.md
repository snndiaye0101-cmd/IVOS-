# 🎯 Guide de Démarrage - IVOS Fleet Management

## ✅ Ce qui a été créé

### 1. Architecture Base de Données (Supabase)
- ✅ **Schéma SQL complet** ([database/schema.sql](database/schema.sql))
  - 14 tables principales avec relations
  - Architecture multi-tenant (subsidiaries)
  - RBAC (user_profiles avec 6 rôles)
  - Gestion de flotte (vehicles, drivers)
  - Missions (missions avec workflow)
  - **Bordereau BSD complet** (waste_tracking_forms) avec 4 sections
  - Signatures numériques (signature_logs)
  - Documents, notifications, webhooks
  - Audit trail complet
  - Row Level Security (RLS) activé
  - Fonctions SQL automatiques (triggers, numérotation)

### 2. Structure du Projet React
- ✅ **Architecture scalable** (voir [PROJECT_STRUCTURE.txt](PROJECT_STRUCTURE.txt))
  - Organisation par features (auth, fleet, missions, waste-tracking, etc.)
  - Composants partagés (shared/)
  - Layouts réutilisables
  - Types TypeScript stricts

### 3. Configuration Technique
- ✅ **Vite + React + TypeScript** ([vite.config.ts](vite.config.ts))
- ✅ **Tailwind CSS + Shadcn/UI** ([tailwind.config.js](tailwind.config.js))
- ✅ **PWA Configuration** (Progressive Web App)
- ✅ **Path aliases** pour imports propres (@features, @shared, etc.)

### 4. Fichiers Clés Créés
- ✅ Client Supabase configuré
- ✅ Types TypeScript (enums, waste forms)
- ✅ Service de gestion des bordereaux (CRUD + signatures + PDF)
- ✅ Utilitaires (formatters, cn)
- ✅ Styles globaux avec Tailwind

---

## 🚀 Prochaines Étapes

### Phase 1 : Mise en place de la base (1-2 jours)

#### 1.1 Installation des dépendances
```bash
# Installer les dépendances NPM
npm install

# Installer le CLI Supabase
npm install -g supabase

# Ajouter tailwindcss-animate
npm install tailwindcss-animate
```

#### 1.2 Configuration Supabase
```bash
# Initialiser Supabase localement
supabase init

# Démarrer Supabase local
supabase start

# Appliquer le schéma
supabase db push --local --include-schemas

# Générer les types TypeScript
npm run supabase:types
```

#### 1.3 Configuration environnement
1. Copier `.env.example` vers `.env.local`
2. Remplir les variables Supabase (URL, ANON_KEY)
3. Configurer les webhooks n8n (si disponible)

#### 1.4 Lancer l'application
```bash
npm run dev
# Ouvre http://localhost:3000
```

---

### Phase 2 : Développement Core (1 semaine)

#### 2.1 Authentification (Jour 1-2)
**Créer :**
- [ ] `src/app/providers/AuthProvider.tsx` - Context d'auth
- [ ] `src/features/auth/hooks/useAuth.ts` - Hook personnalisé
- [ ] `src/features/auth/components/LoginForm.tsx`
- [ ] `src/features/auth/pages/LoginPage.tsx`
- [ ] Routes protégées dans `src/app/router.tsx`

**Commandes Shadcn/UI à exécuter :**
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input label form card
```

#### 2.2 Layout Principal (Jour 2)
**Créer :**
- [ ] `src/layouts/DashboardLayout.tsx` - Layout avec sidebar
- [ ] `src/layouts/components/Sidebar.tsx`
- [ ] `src/layouts/components/Header.tsx`
- [ ] Navigation avec React Router

**Composants Shadcn :**
```bash
npx shadcn-ui@latest add dropdown-menu avatar separator
```

#### 2.3 Dashboard (Jour 3)
**Créer :**
- [ ] `src/features/reporting/pages/DashboardPage.tsx`
- [ ] `src/features/reporting/components/KPICard.tsx`
- [ ] `src/features/reporting/hooks/useDashboardData.ts`

**Composants Shadcn :**
```bash
npx shadcn-ui@latest add badge tabs
```

#### 2.4 Gestion Véhicules (Jour 4)
**Créer :**
- [ ] `src/features/fleet/types/vehicle.types.ts`
- [ ] `src/features/fleet/services/vehicleService.ts`
- [ ] `src/features/fleet/hooks/useVehicles.ts`
- [ ] `src/features/fleet/components/VehicleList.tsx`
- [ ] `src/features/fleet/components/VehicleForm.tsx`
- [ ] `src/features/fleet/pages/VehiclesPage.tsx`

**Composants Shadcn :**
```bash
npx shadcn-ui@latest add table dialog select checkbox
```

#### 2.5 Gestion Chauffeurs (Jour 5)
**Créer :**
- [ ] `src/features/fleet/types/driver.types.ts`
- [ ] `src/features/fleet/services/driverService.ts`
- [ ] `src/features/fleet/components/DriverList.tsx`
- [ ] `src/features/fleet/components/DriverForm.tsx`

---

### Phase 3 : Bordereau de Déchets (2 semaines) 🎯 **PRIORITÉ HAUTE**

#### 3.1 Interface Wizard (Jour 1-3)
**Créer :**
- [ ] `src/features/waste-tracking/components/WasteFormWizard.tsx`
- [ ] `src/features/waste-tracking/components/SectionA_Producer.tsx`
- [ ] `src/features/waste-tracking/components/SectionB_WasteCharacterization.tsx`
- [ ] `src/features/waste-tracking/components/SectionC_Transporter.tsx`
- [ ] `src/features/waste-tracking/components/SectionD_Destination.tsx`
- [ ] `src/features/waste-tracking/pages/CreateWasteFormPage.tsx`

**Composants Shadcn :**
```bash
npx shadcn-ui@latest add radio-group textarea accordion
```

**Validation avec Zod :**
```typescript
// Exemple de schéma de validation
import { z } from 'zod'

export const wasteFormSchema = z.object({
  producer_name: z.string().min(1, 'Nom requis'),
  producer_address: z.string().min(1, 'Adresse requise'),
  waste_description: z.string().min(10, 'Description détaillée requise'),
  // ... etc
})
```

#### 3.2 Signature Numérique (Jour 4-5)
**Créer :**
- [ ] `src/features/waste-tracking/components/SignatureCapture.tsx`
- [ ] `src/features/waste-tracking/services/signatureService.ts`
- [ ] `src/features/waste-tracking/pages/SignFormPage.tsx`

**Installation signature_pad :**
```bash
npm install signature_pad
npm install --save-dev @types/signature_pad
```

**Exemple de composant :**
```typescript
import SignaturePad from 'signature_pad'

const SignatureCapture = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [signaturePad, setSignaturePad] = useState<SignaturePad | null>(null)

  useEffect(() => {
    if (canvasRef.current) {
      const pad = new SignaturePad(canvasRef.current)
      setSignaturePad(pad)
    }
  }, [])

  const handleSave = () => {
    const dataUrl = signaturePad?.toDataURL()
    // Enregistrer la signature
  }

  return (
    <div>
      <canvas ref={canvasRef} className="border" />
      <button onClick={handleSave}>Sauvegarder</button>
    </div>
  )
}
```

#### 3.3 Génération PDF (Jour 6-7)
**Créer :**
- [ ] `supabase/functions/generate-pdf/index.ts` (Edge Function)
- [ ] Hook n8n pour génération PDF
- [ ] `src/features/waste-tracking/hooks/usePDFGeneration.ts`
- [ ] `src/features/waste-tracking/components/PDFViewer.tsx`

**Exemple de workflow n8n :**
1. Recevoir webhook avec données bordereau
2. Générer PDF avec template HTML
3. Upload vers Supabase Storage
4. Retourner URL du PDF

#### 3.4 Liste et Détails (Jour 8-10)
**Créer :**
- [ ] `src/features/waste-tracking/pages/WasteFormsPage.tsx`
- [ ] `src/features/waste-tracking/components/WasteFormsList.tsx`
- [ ] `src/features/waste-tracking/pages/WasteFormDetailPage.tsx`
- [ ] `src/features/waste-tracking/components/FormStatusBadge.tsx`

**Composants Shadcn :**
```bash
npx shadcn-ui@latest add popover date-picker
```

---

### Phase 4 : Missions (1 semaine)

#### 4.1 CRUD Missions
**Créer :**
- [ ] `src/features/missions/types/mission.types.ts`
- [ ] `src/features/missions/services/missionService.ts`
- [ ] `src/features/missions/components/MissionForm.tsx`
- [ ] `src/features/missions/components/MissionList.tsx`

#### 4.2 Workflow d'Approbation
**Créer :**
- [ ] `src/features/missions/components/MissionWorkflow.tsx`
- [ ] `src/features/missions/hooks/useMissionWorkflow.ts`

#### 4.3 Timeline et Suivi
**Créer :**
- [ ] `src/features/missions/components/MissionTimeline.tsx`
- [ ] `src/features/missions/components/RouteMap.tsx` (optionnel)

---

### Phase 5 : Fonctionnalités Avancées (1 semaine)

#### 5.1 Clients/Partenaires
- [ ] CRUD Clients
- [ ] Gestion des contacts
- [ ] Historique des interactions

#### 5.2 Reporting
- [ ] Dashboard avec graphiques (Recharts)
- [ ] Exports Excel/CSV
- [ ] Filtres avancés

#### 5.3 Paramètres
- [ ] Gestion des utilisateurs
- [ ] Gestion des rôles
- [ ] Configuration filiale

#### 5.4 PWA
- [ ] Service Worker
- [ ] Mode offline
- [ ] Notifications push

---

## 📦 Commandes Utiles

### Développement
```bash
npm run dev              # Lancer en dev
npm run build            # Build production
npm run preview          # Preview du build
npm run lint             # Linter le code
npm run format           # Formater avec Prettier
```

### Supabase
```bash
supabase start           # Démarrer local
supabase stop            # Arrêter local
supabase db reset        # Reset DB
supabase db push         # Push migrations
supabase gen types typescript --local > src/shared/types/database.types.ts
```

### Shadcn/UI (Installation composants au besoin)
```bash
npx shadcn-ui@latest add [component-name]
# Exemple: npx shadcn-ui@latest add button
```

---

## 🎨 Design System

### Couleurs Principales
- **Primary:** Bleu (#3b82f6) - Boutons principaux
- **Secondary:** Gris (#64748b) - Boutons secondaires
- **Success:** Vert (#22c55e) - Statuts positifs
- **Warning:** Orange (#f59e0b) - Alertes
- **Danger:** Rouge (#ef4444) - Actions destructives

### Composants Shadcn/UI à installer en priorité
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add form
npx shadcn-ui@latest add select
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add table
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add toast
```

---

## 🔐 Sécurité

### Row Level Security (RLS)
Les politiques sont définies dans le schéma SQL. À activer en production :
- Utilisateurs voient uniquement les données de leur filiale
- Super admins ont accès global
- Chauffeurs voient uniquement leurs missions

### Variables d'environnement sensibles
⚠️ **Ne jamais committer `.env.local`**
- Utiliser `.env.example` comme template
- Stocker les secrets en production (Vercel/Netlify)

---

## 📚 Ressources

### Documentation
- [Supabase Docs](https://supabase.com/docs)
- [Shadcn/UI](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)

### Exemples de code
- Voir les services créés dans `src/features/waste-tracking/services/`
- Utiliser les types dans `src/shared/types/enums.ts`

---

## 🐛 Débogage

### Problèmes courants

**1. Erreur de connexion Supabase**
```bash
# Vérifier que Supabase tourne
supabase status

# Vérifier les variables d'env
echo $VITE_SUPABASE_URL
```

**2. Types TypeScript non à jour**
```bash
# Régénérer les types depuis Supabase
npm run supabase:types
```

**3. Erreur de build Vite**
```bash
# Nettoyer le cache
rm -rf node_modules/.vite
npm run dev
```

---

## 📞 Support

Pour toute question sur l'architecture ou l'implémentation :
1. Consulter [README.md](README.md)
2. Vérifier [PROJECT_STRUCTURE.txt](PROJECT_STRUCTURE.txt)
3. Examiner le schéma SQL [database/schema.sql](database/schema.sql)

---

## 🎯 Résumé des Priorités

### ⚡ Priorité 1 (Semaine 1-2)
1. Setup base (Supabase + Auth)
2. Layout principal
3. Gestion véhicules et chauffeurs
4. **Bordereau BSD (wizard complet)**

### ⚡ Priorité 2 (Semaine 3)
1. Missions et workflow
2. Signatures numériques
3. Génération PDF

### ⚡ Priorité 3 (Semaine 4)
1. Dashboard et reporting
2. Clients/Partenaires
3. PWA et offline mode

---

**Bon développement ! 🚀**
