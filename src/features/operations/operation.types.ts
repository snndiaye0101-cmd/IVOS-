// Type Operation unifié
export type DocType = 'BSD' | 'BL' | 'OM' | 'DeliveryNote';

export interface OperationDocument {
  id: string;
  name: string;
  url: string;
  size?: number;
  uploadedAt?: string;
  dataUrl?: string;
}

export interface Operation {
  id: string;
  // Champs Kanban (ancienne version)
  client?: string;
  type?: string;
  responsable?: string;
  avatarUrl?: string;
  status: 'A_PLANIFIER' | 'EN_COURS' | 'CLOTURE' | 'BROUILLON' | 'VALIDE' | 'TERMINE';
  heureDebut?: string;
  heureFin?: string;
  retard?: boolean;
  progression?: number;
  checkpoints?: {
    equipement: boolean;
    arrivee: boolean;
    operation: boolean;
    bon: boolean;
  };
  personnel?: string[];
  materiel?: string[];
  documents: OperationDocument[];
  origin?: string;
  destination?: string;
  notes?: string;
  // Champs opérationnels (OperationsPage) — requis
  vehicle: string;
  driver: string;
  chefDeOperation: string;
  coDrivers: string[];
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  distance: string;
  wasteForm: boolean;
  deliveryNoteNumber?: string;
  // Champs contextuels
  siteCode?: string;
  archived?: boolean;
  year?: number;
}

// Statuts pour Kanban
export const STATUS_COLUMNS = [
  { key: 'A_PLANIFIER', label: 'À planifier', color: 'border-blue-400 bg-blue-50' },
  { key: 'EN_COURS', label: 'En cours', color: 'border-amber-400 bg-amber-50' },
  { key: 'CLOTURE', label: 'Clôturé', color: 'border-green-500 bg-green-50' },
  { key: 'BROUILLON', label: 'Brouillon', color: 'border-gray-400 bg-gray-50' },
  { key: 'VALIDE', label: 'Validé', color: 'border-cyan-400 bg-cyan-50' },
  { key: 'TERMINE', label: 'Terminé', color: 'border-lime-400 bg-lime-50' },
];

// Export pour usage partagé
