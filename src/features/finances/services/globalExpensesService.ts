/**
 * Global Expenses Service
 * Centralise les types, le stockage et les opérations CRUD pour
 * le module "Dépenses Globales". Permet la synchronisation automatique
 * depuis d'autres modules (ex: Hub Carburant).
 */

export type ExpenseCategory =
  | 'Carburant'
  | 'Carburant / Logistique'
  | 'Assurance'
  | 'Entretien Véhicule'
  | 'EPI'
  | 'Logistique'
  | 'Administratif'
  | 'Autre';

export type AffectationType = 'none' | 'employee' | 'vehicle';

export interface Expense {
  id: number;
  label: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  affectationType: AffectationType;
  affectationId: string;
  affectationName: string;
  attachment?: string;
  createdAt: string;
  /** ID du plein carburant source (si entrée auto-générée depuis Hub Carburant) */
  fuelPleinId?: number;
  /** Entrée générée automatiquement — non modifiable depuis Dépenses Globales */
  isAutoSync?: boolean;
}

export const STORAGE_KEY = 'ivos_global_expenses_v1';
export const CHANGE_EVENT = 'ivos_expenses_change';

// ── Données d'un plein nécessaires pour la sync ────────────────────────────
export interface PleinSyncData {
  id: number;
  date: string;
  vehicule: string;
  chauffeur: string;
  montant: number;
}

// ── Helpers internes ───────────────────────────────────────────────────────
function _loadRaw(): Expense[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  return [];
}

function _save(list: Expense[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  try {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    /* ignore */
  }
}

function _buildLabel(plein: PleinSyncData): string {
  const identifier = plein.vehicule || plein.chauffeur || 'N/A';
  return `Dotation Carburant - ${identifier}`;
}

// ── API publique ───────────────────────────────────────────────────────────

export function loadExpenses(): Expense[] {
  return _loadRaw();
}

export function saveExpenses(list: Expense[]): void {
  _save(list);
}

/**
 * Crée automatiquement une dépense dans Dépenses Globales à partir d'un plein.
 * Appelé lors de la validation d'un plein dans le Hub Carburant.
 */
export function syncExpenseFromPlein(plein: PleinSyncData): void {
  const all = _loadRaw();
  // Ne pas créer en doublon si un plein avec cet id existe déjà
  const existing = all.find((e) => e.fuelPleinId === plein.id);
  if (existing) return;

  const newExp: Expense = {
    id: Date.now(),
    label: _buildLabel(plein),
    category: 'Carburant / Logistique',
    amount: plein.montant,
    date: plein.date,
    affectationType: plein.vehicule ? 'vehicle' : 'none',
    affectationId: plein.vehicule || '',
    affectationName: plein.vehicule || plein.chauffeur || '',
    createdAt: new Date().toISOString(),
    fuelPleinId: plein.id,
    isAutoSync: true,
  };
  _save([...all, newExp]);
}

/**
 * Met à jour la dépense liée à un plein (montant, date, libellé).
 * Appelé lors de la modification d'un plein dans le Hub Carburant.
 */
export function updateExpenseFromPlein(pleinId: number, updates: Partial<PleinSyncData>): void {
  const all = _loadRaw();
  let changed = false;
  const updated = all.map((e) => {
    if (e.fuelPleinId !== pleinId) return e;
    changed = true;
    return {
      ...e,
      ...(updates.montant !== undefined ? { amount: updates.montant } : {}),
      ...(updates.date !== undefined ? { date: updates.date } : {}),
      ...(updates.vehicule !== undefined || updates.chauffeur !== undefined
        ? {
            label: _buildLabel({
              ...e,
              id: pleinId,
              vehicule: updates.vehicule ?? e.affectationName,
              chauffeur: updates.chauffeur ?? '',
              montant: updates.montant ?? e.amount,
              date: updates.date ?? e.date,
            }),
          }
        : {}),
    };
  });
  if (changed) _save(updated);
}

/**
 * Supprime la dépense liée à un plein.
 * Appelé lors de la suppression d'un plein dans le Hub Carburant.
 */
export function removeExpenseByPleinId(pleinId: number): void {
  const all = _loadRaw();
  const filtered = all.filter((e) => e.fuelPleinId !== pleinId);
  if (filtered.length !== all.length) _save(filtered);
}
