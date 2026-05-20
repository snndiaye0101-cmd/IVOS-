/**
 * Dotation Store — Gestion des dotations mensuelles carburant
 * par Carte Carburant pour les véhicules de fonction.
 *
 * Stocke :
 * - Configuration carte carburant par véhicule (numéro de carte)
 * - Dotation par défaut par véhicule (montant de recharge auto au 1er du mois)
 * - Overrides ponctuels (recharges exceptionnelles) pour un mois donné
 * - Historique complet des modifications (audit trail)
 * - Archives mensuelles des relevés par carte
 */

const DEFAULTS_KEY = 'ivos_dotation_defaults_v1';
const OVERRIDES_KEY = 'ivos_dotation_overrides_v1';
const LOG_KEY = 'ivos_dotation_log_v1';
const CARTES_KEY = 'ivos_cartes_carburant_v1';
const CARTE_ARCHIVES_KEY = 'ivos_carte_archives_v1';

// ── Types ─────────────────────────────────────────────────────

/** Carte carburant associée à un véhicule de fonction */
export interface CarteCarburant {
  vehicleRegistration: string;
  numeroCarte: string;
  dateAttribution?: string; // ISO date
}

/** Archive mensuelle du relevé d'une carte */
export interface CarteArchiveMensuelle {
  id: string;
  mois: string; // "2026-04"
  vehicleRegistration: string;
  numeroCarte: string;
  dotationMois: number; // Montant rechargé au 1er du mois
  rechargesExceptionnelles: number; // Total recharges exceptionnelles du mois
  depensesTotales: number; // Total dépensé via carte
  soldeRestant: number; // dotationMois + recharges - depenses
  archivedAt: string; // ISO timestamp
}

/** Dotation par défaut pour un véhicule (= recharge automatique mensuelle) */
export interface DotationDefault {
  vehicleRegistration: string;
  montant: number; // FCFA
}

/** Recharge exceptionnelle (override) pour un mois précis */
export interface DotationOverride {
  vehicleRegistration: string;
  mois: string; // "2026-04"
  montant: number;
}

/** Entrée du journal d'audit */
export interface DotationLogEntry {
  id: string;
  timestamp: string;
  user: string;
  vehicleRegistration: string;
  type: 'permanent' | 'recharge_exceptionnelle';
  mois: string;
  ancienMontant: number;
  nouveauMontant: number;
}

// ── Helpers ───────────────────────────────────────────────────

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ── Store ─────────────────────────────────────────────────────

export const dotationStore = {
  // ─ Cartes Carburant ─────────────────────────────────────────
  loadCartes(): CarteCarburant[] {
    try {
      return JSON.parse(localStorage.getItem(CARTES_KEY) || '[]');
    } catch {
      return [];
    }
  },

  saveCartes(cartes: CarteCarburant[]) {
    localStorage.setItem(CARTES_KEY, JSON.stringify(cartes));
    try {
      window.dispatchEvent(new Event('dotation:updated'));
    } catch {}
  },

  getCarte(registration: string): CarteCarburant | null {
    return this.loadCartes().find((c) => c.vehicleRegistration === registration) || null;
  },

  setCarte(registration: string, numeroCarte: string) {
    const cartes = this.loadCartes();
    const idx = cartes.findIndex((c) => c.vehicleRegistration === registration);
    if (idx >= 0) {
      cartes[idx].numeroCarte = numeroCarte;
    } else {
      cartes.push({
        vehicleRegistration: registration,
        numeroCarte,
        dateAttribution: new Date().toISOString().slice(0, 10),
      });
    }
    this.saveCartes(cartes);
  },

  // ─ Defaults (= forfait mensuel de recharge auto) ───────────
  loadDefaults(): DotationDefault[] {
    try {
      return JSON.parse(localStorage.getItem(DEFAULTS_KEY) || '[]');
    } catch {
      return [];
    }
  },

  saveDefaults(defaults: DotationDefault[]) {
    localStorage.setItem(DEFAULTS_KEY, JSON.stringify(defaults));
    try {
      window.dispatchEvent(new Event('dotation:updated'));
    } catch {}
  },

  getDefault(registration: string): number {
    const d = this.loadDefaults().find((d) => d.vehicleRegistration === registration);
    return d ? d.montant : 0;
  },

  setDefault(registration: string, montant: number) {
    const defaults = this.loadDefaults();
    const idx = defaults.findIndex((d) => d.vehicleRegistration === registration);
    if (idx >= 0) {
      defaults[idx].montant = montant;
    } else {
      defaults.push({ vehicleRegistration: registration, montant });
    }
    this.saveDefaults(defaults);
  },

  // ─ Overrides ────────────────────────────────────────────────
  loadOverrides(): DotationOverride[] {
    try {
      return JSON.parse(localStorage.getItem(OVERRIDES_KEY) || '[]');
    } catch {
      return [];
    }
  },

  saveOverrides(overrides: DotationOverride[]) {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
    try {
      window.dispatchEvent(new Event('dotation:updated'));
    } catch {}
  },

  getOverride(registration: string, mois: string): number | null {
    const o = this.loadOverrides().find(
      (o) => o.vehicleRegistration === registration && o.mois === mois
    );
    return o ? o.montant : null;
  },

  setOverride(registration: string, mois: string, montant: number) {
    const overrides = this.loadOverrides();
    const idx = overrides.findIndex(
      (o) => o.vehicleRegistration === registration && o.mois === mois
    );
    if (idx >= 0) {
      overrides[idx].montant = montant;
    } else {
      overrides.push({ vehicleRegistration: registration, mois, montant });
    }
    this.saveOverrides(overrides);
  },

  // ─ Résolution effective ─────────────────────────────────────
  /** Retourne le solde dotation carte pour un véhicule et un mois donné.
   *  Dotation = forfait permanent (recharge auto au 1er) + recharges exceptionnelles du mois
   *  Priorité recharge exceptionnelle : additionne au forfait
   */
  getEffective(registration: string, mois: string): number {
    const base = this.getDefault(registration);
    const extra = this.getOverride(registration, mois);
    return base + (extra !== null ? extra : 0);
  },

  /** Retourne uniquement le forfait mensuel (recharge auto au 1er) */
  getForfaitMensuel(registration: string): number {
    return this.getDefault(registration);
  },

  /** Retourne le montant de la recharge exceptionnelle pour un mois, ou 0 */
  getRechargeExceptionnelle(registration: string, mois: string): number {
    return this.getOverride(registration, mois) ?? 0;
  },

  // ─ Log d'audit ──────────────────────────────────────────────
  loadLog(): DotationLogEntry[] {
    try {
      return JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    } catch {
      return [];
    }
  },

  saveLog(log: DotationLogEntry[]) {
    localStorage.setItem(LOG_KEY, JSON.stringify(log));
  },

  addLogEntry(entry: Omit<DotationLogEntry, 'id' | 'timestamp'>) {
    const log = this.loadLog();
    log.push({
      ...entry,
      id: genId(),
      timestamp: new Date().toISOString(),
    });
    this.saveLog(log);
  },

  getLogForVehicle(registration: string): DotationLogEntry[] {
    return this.loadLog().filter((e) => e.vehicleRegistration === registration);
  },

  // ─ Archives mensuelles par carte ────────────────────────────
  loadCarteArchives(): CarteArchiveMensuelle[] {
    try {
      return JSON.parse(localStorage.getItem(CARTE_ARCHIVES_KEY) || '[]');
    } catch {
      return [];
    }
  },

  saveCarteArchives(archives: CarteArchiveMensuelle[]) {
    localStorage.setItem(CARTE_ARCHIVES_KEY, JSON.stringify(archives));
  },

  getCarteArchive(registration: string, mois: string): CarteArchiveMensuelle | null {
    return (
      this.loadCarteArchives().find(
        (a) => a.vehicleRegistration === registration && a.mois === mois
      ) || null
    );
  },

  getCarteArchivesForVehicle(registration: string): CarteArchiveMensuelle[] {
    return this.loadCarteArchives()
      .filter((a) => a.vehicleRegistration === registration)
      .sort((a, b) => b.mois.localeCompare(a.mois));
  },

  /** Archive le relevé mensuel d'une carte. Appelé au 1er du mois pour le mois précédent. */
  archiveCarteMois(registration: string, mois: string, depensesTotales: number) {
    const archives = this.loadCarteArchives();
    // Ne pas archiver en double
    if (archives.find((a) => a.vehicleRegistration === registration && a.mois === mois)) return;

    const carte = this.getCarte(registration);
    const forfait = this.getForfaitMensuel(registration);
    const rechargeExc = this.getRechargeExceptionnelle(registration, mois);
    const dotationTotale = forfait + rechargeExc;

    archives.push({
      id: genId(),
      mois,
      vehicleRegistration: registration,
      numeroCarte: carte?.numeroCarte || '—',
      dotationMois: forfait,
      rechargesExceptionnelles: rechargeExc,
      depensesTotales,
      soldeRestant: dotationTotale - depensesTotales,
      archivedAt: new Date().toISOString(),
    });
    this.saveCarteArchives(archives);
  },
};
