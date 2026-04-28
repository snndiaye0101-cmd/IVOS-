export interface Client {
  id: number;
  name: string;
  type: 'Producteur' | 'Réceptionnaire' | 'Les deux';
  ninea: string;
  address: string;
  contact: string;
  phone: string;
  email: string;
  certifications: string[];
  notes: string;
  annee: string;
  archived: boolean;
}

const KEY = 'ivos_clients_v1';

const SEED: Client[] = [
  { id: 1, name: 'SAR (Société Africaine de Raffinage)', type: 'Producteur', ninea: '002345678A1', address: 'Zone industrielle, Mbao, Dakar', contact: 'Amadou Diallo', phone: '+221 33 879 10 00', email: 'contact@sar.sn', certifications: ['ISO 14001', 'OHSAS 18001'], notes: 'Client historique depuis 2018', annee: '2026', archived: false },
  { id: 2, name: 'Dangote Cement Senegal', type: 'Producteur', ninea: '005678912B3', address: 'Pout, Thiès', contact: 'Ibrahima Ndiaye', phone: '+221 33 951 20 00', email: 'info@dangote.sn', certifications: ['ISO 9001'], notes: 'Contrat annuel renouvelé', annee: '2026', archived: false },
  { id: 3, name: 'SOCOCIM Industries', type: 'Les deux', ninea: '001234567C2', address: 'Rufisque, Dakar', contact: 'Moussa Fall', phone: '+221 33 839 90 00', email: 'commercial@sococim.sn', certifications: ['ISO 14001', 'ISO 9001'], notes: 'Double rôle producteur/réceptionnaire', annee: '2026', archived: false },
  { id: 4, name: 'Unilever Sénégal', type: 'Producteur', ninea: '003456789D4', address: 'Zone franche industrielle, Dakar', contact: 'Fatou Sow', phone: '+221 33 869 50 00', email: 'waste@unilever.sn', certifications: ['ISO 14001'], notes: '', annee: '2025', archived: false },
  { id: 5, name: 'Centre de traitement PROMOGED', type: 'Réceptionnaire', ninea: '007890123E5', address: 'Sindia, Thiès', contact: 'Omar Sy', phone: '+221 77 654 32 10', email: 'reception@promoged.sn', certifications: ['Agrément DEEC'], notes: 'Centre agréé traitement déchets dangereux', annee: '2026', archived: false },
  { id: 6, name: 'CIMAF Sénégal', type: 'Producteur', ninea: '004567890F6', address: 'Kirène, Thiès', contact: 'Cheikh Bamba', phone: '+221 33 836 70 00', email: 'environnement@cimaf.sn', certifications: [], notes: 'Nouveau client 2025', annee: '2025', archived: true },
];

function notify() {
  window.dispatchEvent(new Event('clients:updated'));
}

export const clientsStore = {
  load(): Client[] {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        this.save(SEED);
        return SEED;
      }
      return JSON.parse(raw);
    } catch {
      return SEED;
    }
  },
  save(data: Client[]) {
    localStorage.setItem(KEY, JSON.stringify(data));
    notify();
  },
  add(client: Omit<Client, 'id'>) {
    const all = this.load();
    const newId = all.length > 0 ? Math.max(...all.map(c => c.id)) + 1 : 1;
    all.push({ ...client, id: newId });
    this.save(all);
  },
  update(id: number, updates: Partial<Client>) {
    const all = this.load().map(c => c.id === id ? { ...c, ...updates } : c);
    this.save(all);
  },
  remove(id: number) {
    this.save(this.load().filter(c => c.id !== id));
  },
  clear() {
    localStorage.removeItem(KEY);
    notify();
  },
};
