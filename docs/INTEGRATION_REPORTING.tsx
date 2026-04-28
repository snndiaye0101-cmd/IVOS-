/**
 * GUIDE D'INTÉGRATION - SYSTÈME DATA MINING & REPORTING QHSE
 * 
 * Ce fichier contient tous les snippets de code nécessaires pour intégrer
 * le système de reporting dans votre application IVOS.
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1️⃣ IMPORTS NÉCESSAIRES
// ═══════════════════════════════════════════════════════════════════════════

// Dans App.tsx ou votre fichier de routes principal :

import ImpactReportPage from '@/features/reporting/pages/ImpactReportPage';
import { TrendingUp, BarChart3, FileText } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// 2️⃣ CONFIGURATION DE LA ROUTE
// ═══════════════════════════════════════════════════════════════════════════

// Exemple A : React Router v6 (Routes et Route)
// ──────────────────────────────────────────────

import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Routes>
      {/* ... autres routes ... */}
      
      {/* Route QHSE - Rapport d'Impact */}
      <Route 
        path="/qhse/impact-report" 
        element={
          <ProtectedRoute roles={['Directeur Général', 'Manager QHSE', 'Responsable QHSE']}>
            <ImpactReportPage />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}


// Exemple B : Configuration par objet (createBrowserRouter)
// ──────────────────────────────────────────────────────────

import { createBrowserRouter } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    element: <DashboardLayout />,
    children: [
      // ... autres routes enfants ...
      
      // Route QHSE
      {
        path: 'qhse',
        children: [
          {
            path: 'impact-report',
            element: <ImpactReportPage />,
            // Permissions intégrées si votre système le supporte
            handle: {
              roles: ['Directeur Général', 'Manager QHSE', 'Responsable QHSE'],
              label: 'Rapport d\'Impact',
            }
          },
        ],
      },
    ],
  },
]);


// Exemple C : Routes IVOS (avec votre structure actuelle)
// ────────────────────────────────────────────────────────

// Dans votre fichier de routes existant :
const qhseRoutes = [
  // ... autres routes QHSE ...
  {
    path: '/qhse/impact-report',
    element: <ImpactReportPage />,
    roles: ['Directeur Général', 'Manager QHSE', 'Responsable QHSE'],
    label: 'Rapport d\'Impact Environnemental',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 3️⃣ AJOUT AU MENU DE NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════

// Exemple A : Menu Sidebar QHSE
// ──────────────────────────────

function QHSESidebar() {
  return (
    <nav className="space-y-2">
      {/* Liens existants */}
      <NavLink to="/qhse/dashboard">
        <LayoutDashboard className="w-5 h-5" />
        <span>Tableau de Bord</span>
      </NavLink>
      
      <NavLink to="/qhse/bsd">
        <FileText className="w-5 h-5" />
        <span>BSD Électroniques</span>
      </NavLink>
      
      {/* ✨ NOUVEAU : Rapport d'Impact */}
      <NavLink to="/qhse/impact-report">
        <TrendingUp className="w-5 h-5" />
        <span>Rapport d'Impact</span>
      </NavLink>
      
      <NavLink to="/qhse/statistics">
        <BarChart3 className="w-5 h-5" />
        <span>Statistiques</span>
      </NavLink>
    </nav>
  );
}


// Exemple B : Menu Dropdown QHSE
// ───────────────────────────────

function QHSEDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        QHSE
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem asChild>
          <Link to="/qhse/dashboard">Tableau de Bord</Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link to="/qhse/bsd">BSD Électroniques</Link>
        </DropdownMenuItem>
        
        {/* ✨ NOUVEAU : Rapport d'Impact */}
        <DropdownMenuItem asChild>
          <Link to="/qhse/impact-report">
            <TrendingUp className="w-4 h-4 mr-2" />
            Rapport d'Impact
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link to="/qhse/statistics">Statistiques</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


// Exemple C : Menu avec Permissions (conditionnel)
// ─────────────────────────────────────────────────

function QHSEMenu({ userRole }: { userRole: string }) {
  // Vérifier si l'utilisateur peut accéder au rapport d'impact
  const canViewImpactReport = [
    'Directeur Général',
    'Manager QHSE',
    'Responsable QHSE',
  ].includes(userRole);

  return (
    <nav className="space-y-2">
      {/* Liens communs */}
      <NavLink to="/qhse/dashboard">
        <LayoutDashboard className="w-5 h-5" />
        <span>Tableau de Bord</span>
      </NavLink>
      
      {/* ✨ Rapport d'Impact (conditionnel) */}
      {canViewImpactReport && (
        <NavLink to="/qhse/impact-report">
          <TrendingUp className="w-5 h-5" />
          <span>Rapport d'Impact</span>
          <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
            Nouveau
          </span>
        </NavLink>
      )}
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 4️⃣ GESTION DES PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════════

// Exemple A : ProtectedRoute (HOC)
// ─────────────────────────────────

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/shared/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles: string[];
}

function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (!roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return <>{children}</>;
}

// Utilisation :
<ProtectedRoute roles={['Directeur Général', 'Manager QHSE']}>
  <ImpactReportPage />
</ProtectedRoute>


// Exemple B : Hook useAuthorization
// ──────────────────────────────────

function useAuthorization() {
  const { user } = useAuth();
  
  const canViewImpactReport = () => {
    if (!user) return false;
    
    const allowedRoles = [
      'Directeur Général',
      'Manager QHSE',
      'Responsable QHSE',
    ];
    
    return allowedRoles.includes(user.role);
  };
  
  return { canViewImpactReport };
}

// Utilisation dans un composant :
function QHSEDashboard() {
  const { canViewImpactReport } = useAuthorization();
  
  return (
    <div>
      {canViewImpactReport() && (
        <Link to="/qhse/impact-report">
          Voir le Rapport d'Impact
        </Link>
      )}
    </div>
  );
}


// Exemple C : Configuration centralisée des permissions
// ──────────────────────────────────────────────────────

// Dans un fichier permissions.ts :
export const PERMISSIONS = {
  QHSE: {
    VIEW_DASHBOARD: ['Directeur Général', 'Manager QHSE', 'Responsable QHSE', 'Technicien QHSE'],
    VIEW_IMPACT_REPORT: ['Directeur Général', 'Manager QHSE', 'Responsable QHSE'],
    EXPORT_WEB_CONTENT: ['Directeur Général', 'Manager QHSE', 'Responsable Communication'],
    MANAGE_BSD: ['Manager QHSE', 'Responsable QHSE', 'Technicien QHSE'],
  },
};

// Fonction helper :
export function hasPermission(userRole: string, permission: string[]): boolean {
  return permission.includes(userRole);
}

// Utilisation :
if (hasPermission(user.role, PERMISSIONS.QHSE.VIEW_IMPACT_REPORT)) {
  // Afficher le lien
}

// ═══════════════════════════════════════════════════════════════════════════
// 5️⃣ PERSONNALISATION DU SYSTÈME
// ═══════════════════════════════════════════════════════════════════════════

// A. Ajouter des mappings clients → secteurs
// ───────────────────────────────────────────

// Dans src/shared/services/dataAnalyticsService.ts :

const CLIENT_TO_SECTOR: Record<string, string> = {
  // Pétrolier
  'total': 'Secteur Pétrolier',
  'shell': 'Secteur Pétrolier',
  'petrosen': 'Secteur Pétrolier',
  'sar': 'Secteur Pétrolier',
  'oryx': 'Secteur Pétrolier',
  
  // ✨ AJOUTEZ VOS CLIENTS ICI :
  'nouveau_client_petrolier': 'Secteur Pétrolier',
  'nouveau_client_minier': 'Secteur Minier',
  'nouveau_client_industriel': 'Secteur Industriel',
  
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
  
  // ✨ NOUVEAU SECTEUR :
  'nouveau_secteur_key': 'Nouveau Secteur Label',
};


// B. Modifier les templates de texte
// ───────────────────────────────────

// Dans src/shared/services/webExportService.ts :

const HEADLINE_TEMPLATES = [
  'IVOS sécurise le traitement de {tonnage} de déchets industriels',
  '{tonnage} de déchets dangereux traités par IVOS',
  
  // ✨ AJOUTEZ VOS TEMPLATES :
  'Nouveau record : {tonnage} collectés durant {period}',
  'IVOS au service de l\'environnement : {tonnage} traités',
];

const SUMMARY_TEMPLATES = [
  'Ce mois-ci, IVOS a sécurisé le traitement de {tonnage} de déchets industriels...',
  
  // ✨ AJOUTEZ VOS TEMPLATES :
  'Durant {period}, notre engagement environnemental se traduit par {tonnage} de déchets sécurisés et {valorisation}% de valorisation.',
];


// C. Modifier les catégories de déchets
// ──────────────────────────────────────

// Dans src/shared/services/dataAnalyticsService.ts :

const WASTE_CATEGORIES: Record<string, { category: WasteCategory; label: string; color: string }> = {
  'huiles': { category: 'hydrocarbures', label: 'Hydrocarbures', color: '#1e40af' },
  'dangereux': { category: 'dangereux', label: 'Déchets Dangereux', color: '#dc2626' },
  
  // ✨ AJOUTEZ NOUVELLES CATÉGORIES :
  'plastiques': { category: 'non_dangereux', label: 'Plastiques', color: '#3b82f6' },
  'métaux': { category: 'non_dangereux', label: 'Métaux', color: '#6366f1' },
};


// D. Modifier les couleurs des graphiques
// ────────────────────────────────────────

// Dans src/shared/components/charts/PieChart.tsx :

// Gradient pour les slices
ctx.fillStyle = item.color; // Utilise la couleur définie dans WASTE_CATEGORIES

// Centre du donut
ctx.fillStyle = 'white'; // Changez en '#f9fafb' pour un gris clair


// Dans src/shared/components/charts/BarChart.tsx :

// Gradient pour les barres
const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
gradient.addColorStop(0, item.color || '#10b981'); // Vert clair
gradient.addColorStop(1, adjustBrightness(item.color || '#059669', -30)); // Vert foncé

// ✨ PERSONNALISEZ LES COULEURS :
gradient.addColorStop(0, '#3b82f6'); // Bleu clair
gradient.addColorStop(1, '#1e40af'); // Bleu foncé

// ═══════════════════════════════════════════════════════════════════════════
// 6️⃣ UTILISATION PROGRAMMATIQUE (API)
// ═══════════════════════════════════════════════════════════════════════════

// Si vous voulez utiliser le service dans votre propre code :

import {
  extractImpactMetrics,
  getCurrentMonthPeriod,
  getCurrentYearPeriod,
  extractMonthlyEvolution,
} from '@/shared/services/dataAnalyticsService';

import {
  generateWebExportContent,
  downloadInfographic,
} from '@/shared/services/webExportService';

// Exemple 1 : Extraire les métriques du mois en cours
// ────────────────────────────────────────────────────

const period = getCurrentMonthPeriod();
const metrics = extractImpactMetrics(period);

console.log('Tonnage total:', metrics.totalTonnage);
console.log('Taux de valorisation:', metrics.valorisationRate);


// Exemple 2 : Générer l'évolution annuelle
// ─────────────────────────────────────────

const currentYear = new Date().getFullYear();
const evolution = extractMonthlyEvolution(currentYear);

evolution.forEach((month) => {
  console.log(`${month.monthLabel}: ${month.tonnage / 1000} tonnes`);
});


// Exemple 3 : Générer et télécharger une infographie
// ───────────────────────────────────────────────────

const period = getCurrentMonthPeriod();
const metrics = extractImpactMetrics(period);
await downloadInfographic(metrics);
// → Télécharge un fichier PNG "IVOS-Impact-Janvier-2026.png"


// Exemple 4 : Obtenir le contenu pour le web
// ───────────────────────────────────────────

const content = generateWebExportContent(metrics);

console.log('Titre:', content.headline);
console.log('Résumé:', content.summary);
console.log('HTML:', content.htmlSnippet);
console.log('Texte:', content.textOnly);

// ═══════════════════════════════════════════════════════════════════════════
// 7️⃣ TESTS & DEBUGGING
// ═══════════════════════════════════════════════════════════════════════════

// A. Créer des données de test
// ─────────────────────────────

// Console F12 dans le navigateur :
quickCreate5();         // Crée 5 BSD finalisés variés
quickStats();           // Affiche les statistiques
quickDeleteAll();       // Supprime toutes les données de test


// B. Vérifier les données en console
// ───────────────────────────────────

// Console F12 :
const operations = JSON.parse(localStorage.getItem('ivos_operations_v1') || '[]');
console.log('Nombre d\'opérations:', operations.length);

const completedBSDs = operations.filter(op => op.status === 'cloturee' && op.bsdData?.validatedAt);
console.log('BSD finalisés:', completedBSDs.length);


// C. Tester l'extraction de métriques
// ────────────────────────────────────

import { extractImpactMetrics, getCurrentMonthPeriod } from '@/shared/services/dataAnalyticsService';

const period = getCurrentMonthPeriod();
const metrics = extractImpactMetrics(period);

console.log('Métriques:', {
  tonnageTotal: metrics.totalTonnage / 1000 + ' tonnes',
  operations: metrics.totalOperations,
  valorisation: Math.round(metrics.valorisationRate) + '%',
  secteurs: metrics.sectorBreakdown.length,
});


// D. Tester la génération de contenu web
// ───────────────────────────────────────

import { generateWebExportContent } from '@/shared/services/webExportService';

const content = generateWebExportContent(metrics);
console.log('Contenu web:', content);

// Vérifier l'anonymisation
console.assert(
  content.isAnonymized === true,
  'Les clients doivent être anonymisés'
);

// ═══════════════════════════════════════════════════════════════════════════
// 8️⃣ DÉPLOIEMENT EN PRODUCTION
// ═══════════════════════════════════════════════════════════════════════════

// Checklist avant mise en production :

// [ ] Routes ajoutées dans App.tsx
// [ ] Menu mis à jour avec lien vers /qhse/impact-report
// [ ] Permissions configurées (vérifier les rôles autorisés)
// [ ] Mapping clients → secteurs complété pour TOUS les clients
// [ ] Templates de texte personnalisés (optionnel)
// [ ] Couleurs des graphiques ajustées (optionnel)
// [ ] Tests effectués avec données réelles
// [ ] Export web testé (HTML, texte, infographie)
// [ ] Vérification anonymisation (aucun nom de client dans exports)
// [ ] Documentation interne créée
// [ ] Formation utilisateurs effectuée
// [ ] Premier rapport publié sur ivos.sn

// ═══════════════════════════════════════════════════════════════════════════
// 🎉 FIN DU GUIDE D'INTÉGRATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * RÉSUMÉ DES ÉTAPES MINIMALES :
 * 
 * 1. Importer ImpactReportPage
 * 2. Ajouter la route /qhse/impact-report
 * 3. Ajouter le lien dans le menu QHSE
 * 4. Configurer les permissions (rôles autorisés)
 * 5. Tester avec quickCreate5() en console
 * 6. Vérifier l'anonymisation des clients
 * 7. Publier !
 * 
 * Questions ou problèmes ? Consultez docs/REPORTING_SYSTEM.md
 */
