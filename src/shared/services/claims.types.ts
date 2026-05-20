export type ClaimNature =
  | 'Collision'
  | 'Vol'
  | 'Incendie'
  | 'Bris de glace'
  | 'Vandalisme'
  | 'Autre';
export type ClaimSeverity = 'Mineur' | 'Majeur' | 'Critique';
export type ClaimStatus = 'Ouvert' | 'En cours' | 'Clôturé';

export interface Claim {
  id: string;
  reportNumber: string;
  date: string;
  vehicle: string;
  driver: string;
  type: ClaimNature;
  severity: ClaimSeverity;
  location?: string;
  insurer?: string;
  status: ClaimStatus;
  costEstimate?: number;
  description?: string;
  thirdPartyInsurer?: string;
  thirdPartyContactName?: string;
  thirdPartyContactPhone?: string;
  thirdPartyContactEmail?: string;
  accidentPhotos?: string[];
  constatScan?: string;
  source?: 'parc' | 'personnel';
  insuranceDossierNumber?: string;
}
