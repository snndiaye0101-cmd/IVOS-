const KEY = 'ivos_pneumatiques_v1'

export type Pneu = {
  id: number
  numeroSerie: string
  marque: string
  modele: string
  dimension: string
  indice: string
  prix: number
  dateAchat: string
  dateLivraison: string
  fournisseurNom: string
  fournisseurTel: string
  fournisseurAdresse: string
  agentAchat: string
  statut: 'En stock' | 'Monté' | 'En réparation' | 'À rebuter'
  km: number
  kmMontage: number
  profondeur: number
  pression: number
  numeroFacture?: string
  affectations: Array<{
    vehicule: string
    position: string
    dateMontage: string
    dateDemontage?: string
  }>
}

const SEED: Pneu[] = [
  {
    id: 1, numeroSerie: 'DOT123456', marque: 'Michelin', modele: 'Primacy 4',
    dimension: '205/55R16', indice: '91V', prix: 65000,
    dateAchat: '2026-01-15', dateLivraison: '2026-01-20',
    fournisseurNom: 'Société Pneus+ Abidjan', fournisseurTel: '+225 07 00 00 00',
    fournisseurAdresse: 'Zone industrielle, Abidjan', agentAchat: 'Kouassi Jean',
    statut: 'Monté', km: 35000, kmMontage: 12000, profondeur: 5.2, pression: 2.5,
    affectations: [{ vehicule: 'IVECO 12T', position: 'Avant gauche', dateMontage: '2026-03-10' }]
  },
  {
    id: 2, numeroSerie: 'DOT654321', marque: 'Bridgestone', modele: 'Turanza',
    dimension: '195/65R15', indice: '91H', prix: 58000,
    dateAchat: '2026-02-10', dateLivraison: '2026-02-15',
    fournisseurNom: 'Pneus Express', fournisseurTel: '+225 05 11 22 33',
    fournisseurAdresse: 'Plateau, Abidjan', agentAchat: 'Traoré Awa',
    statut: 'En stock', km: 0, kmMontage: 0, profondeur: 8.0, pression: 2.5,
    affectations: []
  },
  {
    id: 3, numeroSerie: 'DOT999888', marque: 'Goodyear', modele: 'EfficientGrip',
    dimension: '225/45R17', indice: '94W', prix: 72000,
    dateAchat: '2025-10-10', dateLivraison: '2025-10-15',
    fournisseurNom: "Pneus Côte d'Ivoire", fournisseurTel: '+225 01 22 33 44',
    fournisseurAdresse: 'Yopougon, Abidjan', agentAchat: 'Ouattara Mariam',
    statut: 'Monté', km: 110000, kmMontage: 5000, profondeur: 2.1, pression: 2.3,
    affectations: [{ vehicule: 'Renault Midlum', position: 'Arrière droit', dateMontage: '2025-11-01' }]
  },
  {
    id: 4, numeroSerie: 'DOT777666', marque: 'Continental', modele: 'Rechapé Eco',
    dimension: '215/60R16', indice: '95H', prix: 40000,
    dateAchat: '2025-08-05', dateLivraison: '2025-08-10',
    fournisseurNom: 'Rechapex Dakar', fournisseurTel: '+221 33 123 45 67',
    fournisseurAdresse: 'Dakar, Sénégal', agentAchat: 'Diallo Mamadou',
    statut: 'Monté', km: 60000, kmMontage: 20000, profondeur: 4.0, pression: 2.4,
    affectations: [{ vehicule: 'IVECO 12T', position: 'Arrière gauche', dateMontage: '2025-09-01' }]
  },
  {
    id: 5, numeroSerie: 'DOT555444', marque: 'Pirelli', modele: 'Cinturato',
    dimension: '185/65R15', indice: '88T', prix: 50000,
    dateAchat: '2024-12-01', dateLivraison: '2024-12-05',
    fournisseurNom: 'Pneus Express', fournisseurTel: '+225 05 11 22 33',
    fournisseurAdresse: 'Plateau, Abidjan', agentAchat: 'Kouadio Serge',
    statut: 'À rebuter', km: 95000, kmMontage: 2000, profondeur: 1.5, pression: 1.8,
    affectations: [{ vehicule: 'IVECO 12T', position: 'Avant droit', dateMontage: '2025-01-10', dateDemontage: '2026-03-01' }]
  },
  {
    id: 6, numeroSerie: 'DOT333222', marque: 'Firestone', modele: 'Roadhawk',
    dimension: '205/60R16', indice: '92V', prix: 48000,
    dateAchat: '2024-06-20', dateLivraison: '2024-06-25',
    fournisseurNom: 'Société Pneus+ Abidjan', fournisseurTel: '+225 07 00 00 00',
    fournisseurAdresse: 'Zone industrielle, Abidjan', agentAchat: 'Kouassi Jean',
    statut: 'Monté', km: 145000, kmMontage: 3000, profondeur: 1.8, pression: 2.1,
    affectations: [{ vehicule: 'Renault Midlum', position: 'Avant gauche', dateMontage: '2024-07-01' }]
  },
  {
    id: 7, numeroSerie: 'DOT111000', marque: 'Michelin', modele: 'Rechapé X',
    dimension: '215/65R16', indice: '98H', prix: 35000,
    dateAchat: '2025-03-15', dateLivraison: '2025-03-20',
    fournisseurNom: 'Rechapex Dakar', fournisseurTel: '+221 33 123 45 67',
    fournisseurAdresse: 'Dakar, Sénégal', agentAchat: 'Diallo Mamadou',
    statut: 'À rebuter', km: 120000, kmMontage: 8000, profondeur: 0.8, pression: 1.5,
    affectations: [{ vehicule: 'IVECO 12T', position: 'Arrière droit', dateMontage: '2025-04-01', dateDemontage: '2026-02-15' }]
  }
]

export const pneumatiqueStore = {
  load(): Pneu[] {
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) {
        this.save(SEED)
        return [...SEED]
      }
      return JSON.parse(raw)
    } catch {
      return [...SEED]
    }
  },
  save(pneus: Pneu[]) {
    try {
      localStorage.setItem(KEY, JSON.stringify(pneus))
      try { window.dispatchEvent(new Event('pneumatiques:updated')) } catch {}
    } catch {}
  },
  add(pneu: Omit<Pneu, 'id'>) {
    const pneus = this.load()
    pneus.push({ ...pneu, id: Date.now() } as Pneu)
    this.save(pneus)
  },
  update(id: number, updates: Partial<Omit<Pneu, 'id'>>) {
    const pneus = this.load().map(p => p.id === id ? { ...p, ...updates } : p)
    this.save(pneus)
  },
  remove(id: number) {
    this.save(this.load().filter(p => p.id !== id))
  },
  clear() {
    localStorage.removeItem(KEY)
  }
}
