export type StatutContractuel =
  | 'CDI'
  | 'CDD'
  | 'Journalier'
  | 'Prestataire'
  | 'Stagiaire'
  | 'Saisonnier'
  | '';
export type PersonnelCategory =
  | 'Administration'
  | 'Transport'
  | 'Technique'
  | 'Services'
  | 'Securite'
  | 'Entretien';
export type FiscalStatus = 'Cadre' | 'Non-Cadre';

export interface FiscalSpouse {
  name: string;
}

export interface FiscalChild {
  name: string;
  birthDate?: string;
}

export const PERSONNEL_CATEGORIES: {
  key: PersonnelCategory;
  label: string;
  roles: string[];
  color: string;
  bg: string;
}[] = [
  {
    key: 'Administration',
    label: 'Administration',
    roles: ['Administratif'],
    color: 'text-blue-700',
    bg: 'bg-blue-50',
  },
  {
    key: 'Transport',
    label: 'Transport',
    roles: ['Chauffeurs', 'Co-chauffeurs', 'Helpers'],
    color: 'text-amber-700',
    bg: 'bg-amber-50',
  },
  {
    key: 'Technique',
    label: 'Technique',
    roles: ['Opérateurs', 'Mécaniciens'],
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
  },
  {
    key: 'Securite',
    label: 'SÉCURITÉ & GARDIENNAGE',
    roles: ['Agent de sécurité'],
    color: 'text-red-700',
    bg: 'bg-red-50',
  },
  {
    key: 'Entretien',
    label: 'ENTRETIEN & HYGIÈNE',
    roles: ['Technicien de surface'],
    color: 'text-teal-700',
    bg: 'bg-teal-50',
  },
  { key: 'Services', label: 'Services', roles: [], color: 'text-purple-700', bg: 'bg-purple-50' },
];

export function getCategory(role: string): PersonnelCategory {
  for (const cat of PERSONNEL_CATEGORIES) {
    if (cat.roles.includes(role)) return cat.key;
  }
  return 'Administration';
}

export function computeFiscalParts(input: {
  spouses?: FiscalSpouse[];
  children?: FiscalChild[];
}): number {
  const spousesCount = Math.max(
    0,
    input.spouses?.filter((spouse) => spouse.name.trim().length > 0).length || 0
  );
  const childrenCount = Math.max(
    0,
    input.children?.filter((child) => child.name.trim().length > 0).length || 0
  );
  return Math.max(1, 1 + spousesCount + Math.min(childrenCount, 6) * 0.5);
}

export interface PersonnelAgent {
  id: string;
  firstName: string;
  lastName: string;
  genre: 'Homme' | 'Femme' | '';
  photo: string;
  role: string;
  matricule: string;
  phone: string;
  whatsapp: string;
  email: string;
  quartier: string;
  adresseDakar: string;
  poste: string;
  departement: string;
  hireDate: string;
  typeContrat: 'CDI' | 'CDD' | 'Stage' | '';
  statutContractuel: StatutContractuel;
  salaireBase: number;
  banque: string;
  rib: string;
  statut: 'Actif' | 'En congé' | 'Suspendu';
  permisValidity: string;
  permisNumber: string;
  idType: string;
  idNumber: string;
  idValidity: string;
  medicalValidity: string;
  bloodGroup: string;
  shiftNuit: boolean;
  shiftNuitDebut: string;
  shiftNuitFin: string;
  nombreNuits: number;
  appliquerMajorationNuit: boolean;
  fiscalStatus?: FiscalStatus;
  fiscalCategory?: string;
  automaticTaxCalculation?: boolean;
  spouses?: FiscalSpouse[];
  children?: FiscalChild[];
  taxParts?: number;
  emergency1: { name: string; relation: string; phone: string };
  emergency2: { name: string; relation: string; phone: string };
}

const KEY = 'ivos_personnel_v1';

const defaultAgents: PersonnelAgent[] = [
  {
    id: 'ag1',
    firstName: 'Mamadou',
    lastName: 'Diallo',
    genre: 'Homme',
    photo: '',
    role: 'Chauffeurs',
    matricule: 'IVOS-CH-001',
    phone: '+221 77 123 45 67',
    whatsapp: '+221 77 123 45 67',
    email: 'mamadou.diallo@ivos.sn',
    quartier: 'Parcelles Assainies',
    adresseDakar: 'Parcelles Assainies U17',
    poste: 'Chauffeur Poids Lourd',
    departement: 'Logistique',
    hireDate: '2021-03-10',
    typeContrat: 'CDI',
    statutContractuel: 'CDI',
    salaireBase: 350000,
    banque: 'CBAO',
    rib: 'SN08 0001 0001 0000 1234 5678 90',
    statut: 'Actif',
    permisValidity: '2026-08-15',
    permisNumber: 'SN-P-2024-0012',
    idType: 'CNI',
    idNumber: 'SN-1234567890',
    idValidity: '2028-05-20',
    medicalValidity: '2026-09-01',
    bloodGroup: 'O+',
    shiftNuit: false,
    shiftNuitDebut: '',
    shiftNuitFin: '',
    nombreNuits: 0,
    appliquerMajorationNuit: true,
    emergency1: { name: 'Awa Diallo', relation: 'Épouse', phone: '+221 77 999 88 77' },
    emergency2: { name: 'Cheikh Diallo', relation: 'Frère', phone: '+221 76 888 77 66' },
  },
  {
    id: 'ag2',
    firstName: 'Fatou',
    lastName: 'Sow',
    genre: 'Femme',
    photo: '',
    role: 'Administratif',
    matricule: 'IVOS-AD-003',
    phone: '+221 78 234 56 78',
    whatsapp: '+221 78 234 56 78',
    email: 'fatou.sow@ivos.sn',
    quartier: 'Mermoz',
    adresseDakar: 'Mermoz Pyrotechnie, Villa 12',
    poste: 'Responsable RH',
    departement: 'RH',
    hireDate: '2022-06-01',
    typeContrat: 'CDI',
    statutContractuel: 'CDI',
    salaireBase: 550000,
    banque: 'Banque Atlantique',
    rib: 'SN08 0002 0001 0000 5678 1234 56',
    statut: 'Actif',
    permisValidity: '2026-04-20',
    permisNumber: 'SN-P-2023-0088',
    idType: 'CNI',
    idNumber: 'SN-9876543210',
    idValidity: '2027-11-30',
    medicalValidity: '2026-06-15',
    bloodGroup: 'A+',
    shiftNuit: false,
    shiftNuitDebut: '',
    shiftNuitFin: '',
    nombreNuits: 0,
    appliquerMajorationNuit: true,
    emergency1: { name: 'Ibrahima Sow', relation: 'Père', phone: '+221 77 111 22 33' },
    emergency2: { name: 'Aminata Sow', relation: 'Soeur', phone: '+221 76 333 44 55' },
  },
  {
    id: 'ag3',
    firstName: 'Ousmane',
    lastName: 'Ndiaye',
    genre: 'Homme',
    photo: '',
    role: 'Opérateurs',
    matricule: 'IVOS-OP-007',
    phone: '+221 76 345 67 89',
    whatsapp: '+221 76 345 67 89',
    email: 'ousmane.ndiaye@ivos.sn',
    quartier: 'Sacré-Cœur',
    adresseDakar: 'Sacré-Cœur 3, Apt. 8',
    poste: 'Opérateur Citerne',
    departement: 'Logistique',
    hireDate: '2020-09-15',
    typeContrat: 'CDI',
    statutContractuel: 'CDI',
    salaireBase: 300000,
    banque: 'CBAO',
    rib: 'SN08 0001 0003 0000 4567 8901 23',
    statut: 'Actif',
    permisValidity: '2025-12-01',
    permisNumber: 'SN-P-2022-0045',
    idType: 'CNI',
    idNumber: 'SN-1122334455',
    idValidity: '2027-03-15',
    medicalValidity: '2026-01-10',
    bloodGroup: 'B+',
    shiftNuit: false,
    shiftNuitDebut: '',
    shiftNuitFin: '',
    nombreNuits: 0,
    appliquerMajorationNuit: true,
    emergency1: { name: 'Mariama Ndiaye', relation: 'Épouse', phone: '+221 77 444 55 66' },
    emergency2: { name: 'Modou Ndiaye', relation: 'Frère', phone: '+221 76 555 66 77' },
  },
  {
    id: 'ag4',
    firstName: 'Aïssatou',
    lastName: 'Ba',
    genre: 'Femme',
    photo: '',
    role: 'Chauffeurs',
    matricule: 'IVOS-CH-009',
    phone: '+221 70 456 78 90',
    whatsapp: '+221 70 456 78 90',
    email: 'aissatou.ba@ivos.sn',
    quartier: 'Almadies',
    adresseDakar: 'Almadies Zone 4',
    poste: 'Chauffeur Léger',
    departement: 'Logistique',
    hireDate: '2023-01-20',
    typeContrat: 'CDD',
    statutContractuel: 'CDD',
    salaireBase: 280000,
    banque: 'BOA',
    rib: 'SN08 0003 0001 0000 7890 1234 56',
    statut: 'En congé',
    permisValidity: '2027-02-10',
    permisNumber: 'SN-P-2025-0033',
    idType: 'Passeport',
    idNumber: 'PP-SN-667788',
    idValidity: '2029-06-01',
    medicalValidity: '2026-12-20',
    bloodGroup: 'AB-',
    shiftNuit: false,
    shiftNuitDebut: '',
    shiftNuitFin: '',
    nombreNuits: 0,
    appliquerMajorationNuit: true,
    emergency1: { name: 'Abdoulaye Ba', relation: 'Père', phone: '+221 77 666 77 88' },
    emergency2: { name: 'Khadija Ba', relation: 'Mère', phone: '+221 78 777 88 99' },
  },
  {
    id: 'ag5',
    firstName: 'Ibrahima',
    lastName: 'Fall',
    genre: 'Homme',
    photo: '',
    role: 'Mécaniciens',
    matricule: 'IVOS-MC-002',
    phone: '+221 77 567 89 01',
    whatsapp: '+221 77 567 89 01',
    email: 'ibrahima.fall@ivos.sn',
    quartier: 'Grand Yoff',
    adresseDakar: 'Grand Yoff, Cité Keur Gorgui',
    poste: 'Responsable Logistique',
    departement: 'Logistique',
    hireDate: '2019-11-01',
    typeContrat: 'CDI',
    statutContractuel: 'CDI',
    salaireBase: 450000,
    banque: 'Société Générale',
    rib: 'SN08 0004 0001 0000 3456 7890 12',
    statut: 'Actif',
    permisValidity: '2026-03-05',
    permisNumber: 'SN-P-2021-0067',
    idType: 'CNI',
    idNumber: 'SN-5566778899',
    idValidity: '2028-01-10',
    medicalValidity: '2026-04-30',
    bloodGroup: 'O-',
    shiftNuit: false,
    shiftNuitDebut: '',
    shiftNuitFin: '',
    nombreNuits: 0,
    appliquerMajorationNuit: true,
    emergency1: { name: 'Ndeye Fall', relation: 'Épouse', phone: '+221 77 222 33 44' },
    emergency2: { name: 'Pape Fall', relation: 'Oncle', phone: '+221 76 111 00 99' },
  },
  {
    id: 'ag6',
    firstName: 'Moussa',
    lastName: 'Sarr',
    genre: 'Homme',
    photo: '',
    role: 'Agent de sécurité',
    matricule: 'IVOS-AS-004',
    phone: '+221 78 678 90 12',
    whatsapp: '+221 78 678 90 12',
    email: 'moussa.sarr@ivos.sn',
    quartier: 'Guédiawaye',
    adresseDakar: 'Guédiawaye Sam Notaire',
    poste: 'Agent de Sécurité',
    departement: 'Direction',
    hireDate: '2020-02-15',
    typeContrat: 'CDI',
    statutContractuel: 'CDI',
    salaireBase: 200000,
    banque: 'CBAO',
    rib: 'SN08 0001 0005 0000 6789 0123 45',
    statut: 'Actif',
    permisValidity: '',
    permisNumber: '',
    idType: 'CNI',
    idNumber: 'SN-4455667788',
    idValidity: '2027-09-20',
    medicalValidity: '2026-07-15',
    bloodGroup: 'A-',
    shiftNuit: true,
    shiftNuitDebut: '22:00',
    shiftNuitFin: '06:00',
    nombreNuits: 26,
    appliquerMajorationNuit: true,
    emergency1: { name: 'Rama Sarr', relation: 'Épouse', phone: '+221 77 555 44 33' },
    emergency2: { name: 'Lamine Sarr', relation: 'Frère', phone: '+221 76 444 33 22' },
  },
  {
    id: 'ag7',
    firstName: 'Khady',
    lastName: 'Diop',
    genre: 'Femme',
    photo: '',
    role: 'Helpers',
    matricule: 'IVOS-HE-006',
    phone: '+221 70 789 01 23',
    whatsapp: '+221 70 789 01 23',
    email: 'khady.diop@ivos.sn',
    quartier: 'Pikine',
    adresseDakar: 'Pikine Rue 10',
    poste: 'Aide Logistique',
    departement: 'Logistique',
    hireDate: '2024-05-10',
    typeContrat: 'Stage',
    statutContractuel: 'Stagiaire',
    salaireBase: 150000,
    banque: 'Wari',
    rib: '',
    statut: 'Actif',
    permisValidity: '',
    permisNumber: '',
    idType: 'CNI',
    idNumber: 'SN-1010101010',
    idValidity: '2029-01-01',
    medicalValidity: '2026-11-30',
    bloodGroup: 'B-',
    shiftNuit: false,
    shiftNuitDebut: '',
    shiftNuitFin: '',
    nombreNuits: 0,
    appliquerMajorationNuit: true,
    emergency1: { name: 'Mame Diop', relation: 'Mère', phone: '+221 77 888 99 00' },
    emergency2: { name: 'Pape Diop', relation: 'Père', phone: '+221 76 999 00 11' },
  },
  {
    id: 'ag8',
    firstName: 'Abdoulaye',
    lastName: 'Mbaye',
    genre: 'Homme',
    photo: '',
    role: 'Administratif',
    matricule: 'IVOS-AD-010',
    phone: '+221 77 890 12 34',
    whatsapp: '+221 77 890 12 34',
    email: 'abdoulaye.mbaye@ivos.sn',
    quartier: 'Point E',
    adresseDakar: 'Point E, Av. Cheikh Anta Diop',
    poste: 'Comptable',
    departement: 'Comptabilité',
    hireDate: '2021-08-01',
    typeContrat: 'CDI',
    statutContractuel: 'CDI',
    salaireBase: 500000,
    banque: 'BIS',
    rib: 'SN08 0005 0001 0000 2345 6789 01',
    statut: 'Actif',
    permisValidity: '2027-06-15',
    permisNumber: 'SN-P-2023-0100',
    idType: 'CNI',
    idNumber: 'SN-2233445566',
    idValidity: '2028-12-31',
    medicalValidity: '2026-10-01',
    bloodGroup: 'AB+',
    shiftNuit: false,
    shiftNuitDebut: '',
    shiftNuitFin: '',
    nombreNuits: 0,
    appliquerMajorationNuit: true,
    emergency1: { name: 'Sokhna Mbaye', relation: 'Épouse', phone: '+221 78 333 22 11' },
    emergency2: { name: 'Saliou Mbaye', relation: 'Frère', phone: '+221 76 222 11 00' },
  },
  {
    id: 'ag9',
    firstName: 'Bamba',
    lastName: 'Cissé',
    genre: 'Homme',
    photo: '',
    role: 'Co-chauffeurs',
    matricule: 'IVOS-CC-011',
    phone: '+221 77 111 22 44',
    whatsapp: '+221 77 111 22 44',
    email: 'bamba.cisse@ivos.sn',
    quartier: 'Thiaroye',
    adresseDakar: 'Thiaroye Gare',
    poste: 'Co-Chauffeur',
    departement: 'Logistique',
    hireDate: '2024-09-01',
    typeContrat: 'CDD',
    statutContractuel: 'Journalier',
    salaireBase: 180000,
    banque: 'CBAO',
    rib: '',
    statut: 'Actif',
    permisValidity: '2027-04-10',
    permisNumber: 'SN-P-2024-0150',
    idType: 'CNI',
    idNumber: 'SN-6677889900',
    idValidity: '2028-06-15',
    medicalValidity: '2026-12-01',
    bloodGroup: 'O+',
    shiftNuit: false,
    shiftNuitDebut: '',
    shiftNuitFin: '',
    nombreNuits: 0,
    appliquerMajorationNuit: true,
    emergency1: { name: 'Aminata Cissé', relation: 'Mère', phone: '+221 77 222 33 55' },
    emergency2: { name: 'Moustapha Cissé', relation: 'Frère', phone: '+221 76 333 44 66' },
  },
  {
    id: 'ag10',
    firstName: 'Marième',
    lastName: 'Gueye',
    genre: 'Femme',
    photo: '',
    role: 'Technicien de surface',
    matricule: 'IVOS-FM-012',
    phone: '+221 70 444 55 66',
    whatsapp: '+221 70 444 55 66',
    email: 'marieme.gueye@ivos.sn',
    quartier: 'Guédiawaye',
    adresseDakar: 'Guédiawaye Golf Sud',
    poste: "Agent d'entretien",
    departement: 'Direction',
    hireDate: '2023-06-15',
    typeContrat: 'CDD',
    statutContractuel: 'Prestataire',
    salaireBase: 120000,
    banque: 'Wari',
    rib: '',
    statut: 'Actif',
    permisValidity: '',
    permisNumber: '',
    idType: 'CNI',
    idNumber: 'SN-7788990011',
    idValidity: '2028-09-20',
    medicalValidity: '2026-08-15',
    bloodGroup: 'A+',
    shiftNuit: false,
    shiftNuitDebut: '',
    shiftNuitFin: '',
    nombreNuits: 0,
    appliquerMajorationNuit: true,
    emergency1: { name: 'Awa Gueye', relation: 'Sœur', phone: '+221 77 555 66 77' },
    emergency2: { name: 'Pape Gueye', relation: 'Père', phone: '+221 76 666 77 88' },
  },
  {
    id: 'ag11',
    firstName: 'Demba',
    lastName: 'Thiam',
    genre: 'Homme',
    photo: '',
    role: 'Helpers',
    matricule: 'IVOS-HE-013',
    phone: '+221 78 555 66 77',
    whatsapp: '+221 78 555 66 77',
    email: 'demba.thiam@ivos.sn',
    quartier: 'Rufisque',
    adresseDakar: 'Rufisque Centre',
    poste: 'Journalier Logistique',
    departement: 'Logistique',
    hireDate: '2025-12-01',
    typeContrat: '',
    statutContractuel: 'Saisonnier',
    salaireBase: 100000,
    banque: 'OM',
    rib: '',
    statut: 'Actif',
    permisValidity: '',
    permisNumber: '',
    idType: 'CNI',
    idNumber: 'SN-8899001122',
    idValidity: '2029-03-10',
    medicalValidity: '2026-11-15',
    bloodGroup: 'B+',
    shiftNuit: false,
    shiftNuitDebut: '',
    shiftNuitFin: '',
    nombreNuits: 0,
    appliquerMajorationNuit: true,
    emergency1: { name: 'Fatou Thiam', relation: 'Mère', phone: '+221 77 666 77 99' },
    emergency2: { name: 'Ismaïla Thiam', relation: 'Cousin', phone: '+221 76 777 88 00' },
  },
];

export const personnelStore = {
  load(): PersonnelAgent[] {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultAgents;
      const parsed = JSON.parse(raw) as PersonnelAgent[];
      if (!Array.isArray(parsed) || parsed.length === 0) return defaultAgents;

      // Backward-compatibility for older local snapshots.
      return parsed.map((agent) => ({
        ...agent,
        nombreNuits: Number.isFinite(agent.nombreNuits)
          ? Math.max(0, Math.floor(agent.nombreNuits))
          : agent.shiftNuit
            ? 26
            : 0,
        appliquerMajorationNuit: agent.appliquerMajorationNuit ?? true,
        fiscalStatus:
          agent.fiscalStatus ||
          (agent.role.toLowerCase().includes('responsable') ||
          agent.role.toLowerCase().includes('administratif') ||
          agent.role.toLowerCase().includes('comptable')
            ? 'Cadre'
            : 'Non-Cadre'),
        fiscalCategory: agent.fiscalCategory || agent.poste || agent.role,
        automaticTaxCalculation: agent.automaticTaxCalculation ?? true,
        spouses: Array.isArray(agent.spouses) ? agent.spouses : [],
        children: Array.isArray(agent.children) ? agent.children : [],
        taxParts: Number.isFinite(agent.taxParts)
          ? Math.max(1, Number(agent.taxParts))
          : computeFiscalParts({ spouses: agent.spouses, children: agent.children }),
      }));
    } catch {
      return defaultAgents;
    }
  },
  save(agents: PersonnelAgent[]) {
    localStorage.setItem(KEY, JSON.stringify(agents));
    window.dispatchEvent(new Event('personnel:updated'));
  },
  add(agent: Omit<PersonnelAgent, 'id'>) {
    const all = personnelStore.load();
    const id = `ag-${Date.now()}`;
    all.push({ ...agent, id } as PersonnelAgent);
    personnelStore.save(all);
  },
  update(id: string, patch: Partial<PersonnelAgent>) {
    const all = personnelStore.load();
    const i = all.findIndex((a) => a.id === id);
    if (i >= 0) {
      all[i] = { ...all[i], ...patch };
      personnelStore.save(all);
    }
  },
  remove(id: string) {
    personnelStore.save(personnelStore.load().filter((a) => a.id !== id));
  },
  clear() {
    localStorage.removeItem(KEY);
  },
};
