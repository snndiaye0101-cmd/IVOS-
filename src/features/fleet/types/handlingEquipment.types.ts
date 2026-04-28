/**
 * ============================================
 * Types pour Engins de Manutention
 * Gestion des chariots élévateurs, gerbeurs avec VGP
 * ============================================
 */

export type EnergyType = 'Électrique' | 'Diesel' | 'Gaz' | 'Essence';

export type VGPStatus = 'conforme' | 'à_renouveler' | 'expiré';

export interface HandlingEquipment {
  id: string;
  /** Numéro d'identification de l'engin */
  serialNumber: string;
  /** Type d'engin (ex: Chariot élévateur, Gerbeur, etc.) */
  type: string;
  /** Marque de l'engin */
  brand: string;
  /** Modèle de l'engin */
  model: string;
  /** Type d'énergie utilisée */
  energyType: EnergyType;
  /** Capacité de levage en tonnes */
  liftingCapacity: number;
  /** Date de la dernière VGP (Vérification Générale Périodique) */
  lastVGPDate: string; // ISO format
  /** Date d'échéance de la prochaine VGP (calculée automatiquement : lastVGPDate + 6 mois) */
  nextVGPDate: string; // ISO format
  /** Statut de conformité VGP */
  vgpStatus: VGPStatus;
  /** Indique si l'engin est bloqué pour assignation (VGP expirée) */
  isBlocked: boolean;
  /** Date de mise en service */
  commissioningDate?: string;
  /** Observations ou notes */
  notes?: string;
  /** Créé le */
  createdAt: string;
  /** Créé par (userId) */
  createdBy: string;
  /** Mis à jour le */
  updatedAt: string;
  /** Mis à jour par (userId) */
  updatedBy: string;
}

export interface NewHandlingEquipmentData {
  serialNumber: string;
  type: string;
  brand: string;
  model: string;
  energyType: EnergyType;
  liftingCapacity: number;
  lastVGPDate: string;
  commissioningDate?: string;
  notes?: string;
}

export interface VGPReport {
  /** Date de génération du rapport */
  reportDate: string;
  /** Mois du rapport (format: YYYY-MM) */
  reportMonth: string;
  /** Engins conformes */
  conformeEquipment: HandlingEquipment[];
  /** Engins à renouveler (dans les 30 jours) */
  toRenewEquipment: HandlingEquipment[];
  /** Engins expirés */
  expiredEquipment: HandlingEquipment[];
  /** Statistiques */
  stats: {
    total: number;
    conforme: number;
    aRenouveler: number;
    expire: number;
  };
}
