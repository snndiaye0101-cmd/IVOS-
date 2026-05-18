/**
 * Service d'Extraction de Données — Data Mining BSD
 * Analyse les BSD finalisés pour générer des indicateurs QHSE
 */

import type { Operation } from '../../features/exploitation/types/operation.types';

// Ce service gère l’extraction et l’analyse des données (data mining) pour le reporting QHSE.

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type PeriodType = 'month' | 'quarter' | 'year' | 'custom';
export type WasteCategory = 'dangereux' | 'non_dangereux' | 'hydrocarbures' | 'medical' | 'autre';

export interface AnalyticsPeriod {
  type: PeriodType;
  startDate: string; // ISO date
  endDate: string;   // ISO date
  label: string;     // "Janvier 2026", "T1 2026", etc.
}

export interface WasteBreakdown {
  category: WasteCategory;
  categoryLabel: string;
  tonnage: number;
  percentage: number;
  count: number; // Nombre d'opérations
  color: string; // Couleur pour graphique
}

export interface ClientSectorBreakdown {
  sector: string;           // "Secteur Minier", "Secteur Pétrolier"
  tonnage: number;
  percentage: number;
  count: number;
  operations: string[];     // Numéros BSD (pour audit interne)
}

export interface TreatmentBreakdown {
  method: string;           // "Valorisation énergétique", "Recyclage", etc.
  methodLabel: string;
  tonnage: number;
  percentage: number;
  count: number;
  isValorization: boolean;  // Si c'est de la valorisation
}

export interface ImpactMetrics {
  period: AnalyticsPeriod;
  
  // Métriques principales
  totalTonnage: number;
  totalOperations: number;
  averagePerOperation: number;
  
  // Répartition par type
  wasteBreakdown: WasteBreakdown[];
  
  // Répartition par secteur (anonymisé)
  sectorBreakdown: ClientSectorBreakdown[];
  
  // Traitement et valorisation
  treatmentBreakdown: TreatmentBreakdown[];
  valorisationRate: number; // Pourcentage de déchets valorisés
  
  // Évolution
  evolutionData?: MonthlyEvolution[];
  
  // Méta
  generatedAt: string;
}

export interface MonthlyEvolution {
  month: string;      // "2026-01"
  monthLabel: string; // "Janvier 2026"
  tonnage: number;
  operations: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

// Mapping types de déchets → catégories
const WASTE_CATEGORIES: Record<string, { category: WasteCategory; label: string; color: string }> = {
  'huiles': { category: 'hydrocarbures', label: 'Hydrocarbures', color: '#1e40af' },
  'hydrocarbures': { category: 'hydrocarbures', label: 'Hydrocarbures', color: '#1e40af' },
  'dangereux': { category: 'dangereux', label: 'Déchets Dangereux', color: '#dc2626' },
  'chimiques': { category: 'dangereux', label: 'Déchets Dangereux', color: '#dc2626' },
  'toxiques': { category: 'dangereux', label: 'Déchets Dangereux', color: '#dc2626' },
  'medical': { category: 'medical', label: 'Déchets Médicaux', color: '#ea580c' },
  'medicaux': { category: 'medical', label: 'Déchets Médicaux', color: '#ea580c' },
  'non dangereux': { category: 'non_dangereux', label: 'Déchets Non-Dangereux', color: '#16a34a' },
  'recyclable': { category: 'non_dangereux', label: 'Déchets Non-Dangereux', color: '#16a34a' },
};

// Mapping clients → secteurs (anonymisation)
const CLIENT_TO_SECTOR: Record<string, string> = {
  'total': 'Secteur Pétrolier',
  'shell': 'Secteur Pétrolier',
  'petrosen': 'Secteur Pétrolier',
  'sar': 'Secteur Pétrolier',
  'oryx': 'Secteur Pétrolier',
  'mine': 'Secteur Minier',
  'mining': 'Secteur Minier',
  'industries': 'Secteur Industriel',
  'manufacture': 'Secteur Industriel',
  'hopital': 'Secteur Médical',
  'clinique': 'Secteur Médical',
  'hospital': 'Secteur Médical',
};

// Méthodes de valorisation
const VALORISATION_METHODS = [
  'valorisation énergétique',
  'recyclage',
  'valorisation matière',
  'compostage',
  'régénération',
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Charge toutes les opérations depuis localStorage
 */
function loadAllOperations(): Operation[] {
  try {
    return JSON.parse(localStorage.getItem('ivos_operations_v1') || '[]');
  } catch {
    return [];
  }
}

/**
 * Filtre les BSD finalisés (Section 9 complète)
 */
function getCompletedBSDs(operations: Operation[]): Operation[] {
  return operations.filter(op => {
    // Status cloturé
    if (op.status !== 'cloturee') return false;
    
    // Section 9 validée
    if (!op.bsdData?.validatedAt) return false;
    
    return true;
  });
}

/**
 * Filtre par période
 */
function filterByPeriod(operations: Operation[], period: AnalyticsPeriod): Operation[] {
  const start = new Date(period.startDate).getTime();
  const end = new Date(period.endDate).getTime();
  
  return operations.filter(op => {
    const date = new Date(op.bsdData?.validatedAt || op.createdAt).getTime();
    return date >= start && date <= end;
  });
}

/**
 * Extrait le poids réel (Section 6 - Pesée)
 */
function extractWeight(operation: Operation): number {
  // Poids réel (Section 6 - `quantiteKg` est la valeur la plus fiable)
  if (operation.quantiteKg) {
    const weight = parseFloat(operation.quantiteKg);
    if (!isNaN(weight)) return weight;
  }
  
  // Fallback sur quantité estimée, qui est plus fiable que 'quantite'
  if ('quantiteEstimee' in operation) {
    const est = (operation as unknown as Record<string, unknown>)['quantiteEstimee'];
    if (est !== undefined && est !== null) {
      const weight = parseFloat(String(est));
      if (!isNaN(weight)) return weight;
    }
  }
  
  return 0;
}

/**
 * Catégorise un type de déchet
 */
function categorizeWaste(wasteType: string): { category: WasteCategory; label: string; color: string } {
  const normalized = wasteType.toLowerCase();
  
  for (const key in WASTE_CATEGORIES) {
    if (normalized.includes(key)) {
      return WASTE_CATEGORIES[key];
    }
  }
  
  // Par défaut : autre
  return { category: 'autre', label: 'Autres Déchets', color: '#9333ea' };
}

/**
 * Anonymise un nom de client en secteur
 */
function anonymizeClient(clientName: string): string {
  const normalized = clientName.toLowerCase();
  
  for (const key in CLIENT_TO_SECTOR) {
    if (normalized.includes(key)) {
      return CLIENT_TO_SECTOR[key];
    }
  }
  
  return 'Secteur Privé';
}

/**
 * Vérifie si une méthode de traitement est de la valorisation
 */
function isValorization(method: string): boolean {
  const normalized = method.toLowerCase();
  return VALORISATION_METHODS.some(vm => normalized.includes(vm));
}

// ═══════════════════════════════════════════════════════════════════════════
// GÉNÉRATION DE PÉRIODES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Génère une période pour le mois en cours
 */
export function getCurrentMonthPeriod(): AnalyticsPeriod {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59);
  
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  
  return {
    type: 'month',
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    label: `${monthNames[month]} ${year}`,
  };
}

/**
 * Génère une période pour le trimestre en cours
 */
export function getCurrentQuarterPeriod(): AnalyticsPeriod {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const quarter = Math.floor(month / 3) + 1;
  
  const startMonth = (quarter - 1) * 3;
  const startDate = new Date(year, startMonth, 1);
  const endDate = new Date(year, startMonth + 3, 0, 23, 59, 59);
  
  return {
    type: 'quarter',
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    label: `Trimestre ${quarter} ${year}`,
  };
}

/**
 * Génère une période pour l'année en cours
 */
export function getCurrentYearPeriod(): AnalyticsPeriod {
  const now = new Date();
  const year = now.getFullYear();
  
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59);
  
  return {
    type: 'year',
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    label: `Année ${year}`,
  };
}

/**
 * Génère une période personnalisée
 */
export function getCustomPeriod(startDate: string, endDate: string): AnalyticsPeriod {
  return {
    type: 'custom',
    startDate,
    endDate,
    label: `${new Date(startDate).toLocaleDateString('fr-FR')} - ${new Date(endDate).toLocaleDateString('fr-FR')}`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTRACTION DE DONNÉES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analyse les BSD et génère les métriques d'impact
 */
export function extractImpactMetrics(period: AnalyticsPeriod): ImpactMetrics {
  // 1. Charger toutes les opérations
  const allOperations = loadAllOperations();
  
  // 2. Filtrer BSD finalisés
  const completedBSDs = getCompletedBSDs(allOperations);
  
  // 3. Filtrer par période
  const periodBSDs = filterByPeriod(completedBSDs, period);
  
  // 4. Calculer tonnage total
  const totalTonnage = periodBSDs.reduce((sum, op) => sum + extractWeight(op), 0);
  const totalOperations = periodBSDs.length;
  const averagePerOperation = totalOperations > 0 ? totalTonnage / totalOperations : 0;
  
  // 5. Répartition par type de déchet
  const wasteMap = new Map<string, { category: WasteCategory; label: string; color: string; tonnage: number; count: number }>();
  
  periodBSDs.forEach(op => {
    const { category, label, color } = categorizeWaste(op.typeDechet);
    const weight = extractWeight(op);
    
    const key = category;
    if (!wasteMap.has(key)) {
      wasteMap.set(key, { category, label, color, tonnage: 0, count: 0 });
    }
    
    const entry = wasteMap.get(key)!;
    entry.tonnage += weight;
    entry.count += 1;
  });
  
  const wasteBreakdown: WasteBreakdown[] = Array.from(wasteMap.values()).map(w => ({
    category: w.category,
    categoryLabel: w.label,
    tonnage: w.tonnage,
    percentage: totalTonnage > 0 ? (w.tonnage / totalTonnage) * 100 : 0,
    count: w.count,
    color: w.color,
  })).sort((a, b) => b.tonnage - a.tonnage);
  
  // 6. Répartition par secteur (anonymisé)
  const sectorMap = new Map<string, { tonnage: number; count: number; operations: string[] }>();
  
  periodBSDs.forEach(op => {
    const sector = anonymizeClient(op.client);
    const weight = extractWeight(op);
    
    if (!sectorMap.has(sector)) {
      sectorMap.set(sector, { tonnage: 0, count: 0, operations: [] });
    }
    
    const entry = sectorMap.get(sector)!;
    entry.tonnage += weight;
    entry.count += 1;
    entry.operations.push(op.numero);
  });
  
  const sectorBreakdown: ClientSectorBreakdown[] = Array.from(sectorMap.entries()).map(([sector, data]) => ({
    sector,
    tonnage: data.tonnage,
    percentage: totalTonnage > 0 ? (data.tonnage / totalTonnage) * 100 : 0,
    count: data.count,
    operations: data.operations,
  })).sort((a, b) => b.tonnage - a.tonnage);
  
  // 7. Traitement et valorisation
  const treatmentMap = new Map<string, { tonnage: number; count: number; isValorization: boolean }>();
  
  periodBSDs.forEach(op => {
    const method = op.bsdData?.modeTraitement || 'Non spécifié';
    const weight = extractWeight(op);
    const isValor = isValorization(method);
    
    if (!treatmentMap.has(method)) {
      treatmentMap.set(method, { tonnage: 0, count: 0, isValorization: isValor });
    }
    
    const entry = treatmentMap.get(method)!;
    entry.tonnage += weight;
    entry.count += 1;
  });
  
  const treatmentBreakdown: TreatmentBreakdown[] = Array.from(treatmentMap.entries()).map(([method, data]) => ({
    method,
    methodLabel: method,
    tonnage: data.tonnage,
    percentage: totalTonnage > 0 ? (data.tonnage / totalTonnage) * 100 : 0,
    count: data.count,
    isValorization: data.isValorization,
  })).sort((a, b) => b.tonnage - a.tonnage);
  
  // Taux de valorisation
  const valorizedTonnage = treatmentBreakdown
    .filter(t => t.isValorization)
    .reduce((sum, t) => sum + t.tonnage, 0);
  const valorisationRate = totalTonnage > 0 ? (valorizedTonnage / totalTonnage) * 100 : 0;
  
  // 8. Retourner les métriques
  return {
    period,
    totalTonnage,
    totalOperations,
    averagePerOperation,
    wasteBreakdown,
    sectorBreakdown,
    treatmentBreakdown,
    valorisationRate,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Génère l'évolution mensuelle sur une année
 */
export function extractMonthlyEvolution(year: number): MonthlyEvolution[] {
  const allOperations = loadAllOperations();
  const completedBSDs = getCompletedBSDs(allOperations);
  
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  
  const evolution: MonthlyEvolution[] = [];
  
  for (let month = 0; month < 12; month++) {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);
    
    const monthBSDs = completedBSDs.filter(op => {
      const date = new Date(op.bsdData?.validatedAt || op.createdAt).getTime();
      return date >= startDate.getTime() && date <= endDate.getTime();
    });
    
    const tonnage = monthBSDs.reduce((sum, op) => sum + extractWeight(op), 0);
    
    evolution.push({
      month: `${year}-${String(month + 1).padStart(2, '0')}`,
      monthLabel: `${monthNames[month]} ${year}`,
      tonnage,
      operations: monthBSDs.length,
    });
  }
  
  return evolution;
}

/**
 * Sauvegarde un rapport dans localStorage (cache)
 */
export function saveReportCache(period: AnalyticsPeriod, metrics: ImpactMetrics): void {
  const cacheKey = `ivos_impact_report_${period.type}_${period.startDate}`;
  localStorage.setItem(cacheKey, JSON.stringify(metrics));
}

/**
 * Charge un rapport depuis le cache
 */
export function loadReportCache(period: AnalyticsPeriod): ImpactMetrics | null {
  try {
    const cacheKey = `ivos_impact_report_${period.type}_${period.startDate}`;
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;
    
    const metrics = JSON.parse(cached) as ImpactMetrics;
    
    // Vérifier si le cache n'est pas trop ancien (1 heure)
    const cacheAge = Date.now() - new Date(metrics.generatedAt).getTime();
    if (cacheAge > 60 * 60 * 1000) return null;
    
    return metrics;
  } catch {
    return null;
  }
}

export default {
  extractImpactMetrics,
  extractMonthlyEvolution,
  getCurrentMonthPeriod,
  getCurrentQuarterPeriod,
  getCurrentYearPeriod,
  getCustomPeriod,
  saveReportCache,
  loadReportCache,
};
