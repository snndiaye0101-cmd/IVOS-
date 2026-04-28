// Interface Invoice pour la gestion des finances
export interface Invoice {
  id: string;
  date: string;
  client: string;
  serviceType: 'Transport' | 'Pompage' | 'Location';
  amount: number;
  status: 'Payé' | 'En attente' | 'Retard';
  linkedVehicle: string;
}
