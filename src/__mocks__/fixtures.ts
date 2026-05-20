/**
 * Test Fixtures - Données mock pour tests
 * Résout les 17 tests échouants
 */

// ============================================
// MISSIONS FIXTURES
// ============================================

export const mockOperationsDetailed = [
  {
    id: '1',
    numero: 'MS-2026-001',
    type: 'BSD',
    status: 'EN_COURS',
    clientId: 'client-1',
    clientName: 'SONATEL',
    vehicleId: 'vehicle-1',
    vehiclePlate: 'SN-1234-DK',
    driverId: 'driver-1',
    driverName: 'Moussa Diop',
    origin: 'Dakar',
    destination: 'Thiès',
    date: '2026-04-20',
    notes: 'BSD Transport déchets dangereux',
    createdAt: new Date('2026-04-20T08:00:00'),
    updatedAt: new Date('2026-04-21T10:30:00'),
  },
  {
    id: '2',
    numero: 'MS-2026-002',
    type: 'DELIVERY',
    status: 'CLOTURE',
    clientId: 'client-2',
    clientName: 'Total Sénégal',
    vehicleId: 'vehicle-2',
    vehiclePlate: 'SN-5678-DK',
    driverId: 'driver-2',
    driverName: 'Abdou Sarr',
    origin: 'Thiès',
    destination: 'Saint-Louis',
    date: '2026-04-19',
    deliveryNoteNumber: 'BL-2026-0419-0002',
    notes: 'Delivery Note Livraison carburant',
    createdAt: new Date('2026-04-19T07:00:00'),
    updatedAt: new Date('2026-04-19T18:00:00'),
  },
  {
    id: '3',
    numero: 'MS-2026-003',
    type: 'TANK_CLEANING',
    status: 'A_PLANIFIER',
    clientId: 'client-3',
    clientName: 'SAR',
    vehicleId: 'vehicle-3',
    vehiclePlate: 'SN-9012-DK',
    driverId: null,
    driverName: null,
    origin: 'Rufisque',
    destination: 'Dakar',
    date: '2026-04-22',
    notes: 'Nettoyage citerne hydrocarbures',
    createdAt: new Date('2026-04-21T09:00:00'),
    updatedAt: new Date('2026-04-21T09:00:00'),
  },
];

// ============================================
// VEHICLES FIXTURES
// ============================================

export const mockVehicles = [
  {
    id: 'vehicle-1',
    immatriculation: 'SN-1234-DK',
    marque: 'Mercedes-Benz',
    modele: 'Actros 2545',
    type: 'Citerne',
    capacite: 25000, // kg
    annee: 2022,
    carburant: 'Diesel',
    kilometrage: 125000,
    status: 'EN_MISSION',
    dateAchat: '2022-03-15',
    dateMiseService: '2022-04-01',
    dateAssurance: '2027-03-14',
    dateControleTechnique: '2026-09-30',
    dateDerniereVidange: '2026-03-10',
    dateProchainVidange: '2026-06-10',
  },
  {
    id: 'vehicle-2',
    immatriculation: 'SN-5678-DK',
    marque: 'Volvo',
    modele: 'FM 420',
    type: 'Benne',
    capacite: 18000,
    annee: 2021,
    carburant: 'Diesel',
    kilometrage: 89000,
    status: 'DISPONIBLE',
    dateAchat: '2021-06-20',
    dateMiseService: '2021-07-01',
    dateAssurance: '2026-12-15',
    dateControleTechnique: '2026-11-20',
    dateDerniereVidange: '2026-02-28',
    dateProchainVidange: '2026-05-28',
  },
  {
    id: 'vehicle-3',
    immatriculation: 'SN-9012-DK',
    marque: 'Scania',
    modele: 'R 450',
    type: 'Tracteur',
    capacite: 30000,
    annee: 2023,
    carburant: 'Diesel',
    kilometrage: 45000,
    status: 'DISPONIBLE',
    dateAchat: '2023-01-10',
    dateMiseService: '2023-02-01',
    dateAssurance: '2027-01-09',
    dateControleTechnique: '2027-01-31',
    dateDerniereVidange: '2026-04-01',
    dateProchainVidange: '2026-07-01',
  },
];

// ============================================
// DRIVERS FIXTURES
// ============================================

export const mockDrivers = [
  {
    id: 'driver-1',
    nom: 'Diop',
    prenom: 'Moussa',
    fullName: 'Moussa Diop',
    telephone: '+221 77 123 45 67',
    email: 'moussa.diop@ivos.sn',
    numeroPermis: 'SN-DL-123456',
    dateExpirationPermis: '2028-12-31',
    anneesExperience: 8,
    dateEmbauche: '2020-05-15',
    status: 'EN_MISSION',
    certificationHAZMAT: true,
    scorePerformance: 96,
    totalOperationsCompletees: 245,
    heuresHebdo: 42,
    heuresSupplementaires: 2,
  },
  {
    id: 'driver-2',
    nom: 'Sarr',
    prenom: 'Abdou',
    fullName: 'Abdou Sarr',
    telephone: '+221 76 234 56 78',
    email: 'abdou.sarr@ivos.sn',
    numeroPermis: 'SN-DL-234567',
    dateExpirationPermis: '2027-06-30',
    anneesExperience: 12,
    dateEmbauche: '2018-03-01',
    status: 'DISPONIBLE',
    certificationHAZMAT: true,
    scorePerformance: 98,
    totalOperationsCompletees: 512,
    heuresHebdo: 40,
    heuresSupplementaires: 0,
  },
];

// ============================================
// CLIENTS FIXTURES
// ============================================

export const mockClients = [
  {
    id: 'client-1',
    nom: 'SONATEL',
    raisonSociale: 'Société Nationale des Télécommunications du Sénégal',
    ninea: 'SN-1234567890',
    adresse: 'Avenue Léopold Sédar Senghor, Dakar',
    telephone: '+221 33 839 39 39',
    email: 'contact@sonatel.sn',
    type: 'ENTREPRISE',
    secteur: 'TELECOMMUNICATIONS',
  },
  {
    id: 'client-2',
    nom: 'Total Sénégal',
    raisonSociale: 'Total Sénégal SA',
    ninea: 'SN-0987654321',
    adresse: 'Route de Rufisque, Dakar',
    telephone: '+221 33 849 55 00',
    email: 'info@total.sn',
    type: 'ENTREPRISE',
    secteur: 'ENERGIE',
  },
  {
    id: 'client-3',
    nom: 'SAR',
    raisonSociale: 'Société Africaine de Raffinage',
    ninea: 'SN-1122334455',
    adresse: 'Zone industrielle, Rufisque',
    telephone: '+221 33 836 20 20',
    email: 'contact@sar.sn',
    type: 'ENTREPRISE',
    secteur: 'RAFFINAGE',
  },
];

// ============================================
// CERTIFICATES FIXTURES
// ============================================

export const mockCertificates = [
  {
    id: 'cert-1',
    type: 'BSD',
    numero: 'BSD-2026-0420-0001',
    clientId: 'client-1',
    clientName: 'SONATEL',
    operationId: '1',
    operationNumero: 'MS-2026-001',
    generatedAt: new Date('2026-04-20T14:30:00'),
    sentAt: null,
    verifiedAt: null,
    verificationCode: 'BSD20260420001',
    pdfUrl: null,
  },
  {
    id: 'cert-2',
    type: 'DELIVERY_NOTE',
    numero: 'BL-2026-0419-0002',
    clientId: 'client-2',
    clientName: 'Total Sénégal',
    operationId: '2',
    operationNumero: 'MS-2026-002',
    generatedAt: new Date('2026-04-19T16:00:00'),
    sentAt: new Date('2026-04-19T16:15:00'),
    verifiedAt: new Date('2026-04-19T18:00:00'),
    verificationCode: 'BL20260419002',
    pdfUrl: '/certificates/BL-2026-0419-0002.pdf',
  },
];

// ============================================
// USER FIXTURES
// ============================================

export const mockUsers = [
  {
    id: 'user-1',
    email: 'admin@ivos.sn',
    fullName: 'Admin IVOS',
    role: 'super_admin',
    subsidiaryId: 'sub-sn',
    avatar: null,
  },
  {
    id: 'user-2',
    email: 'dispatcher@ivos.sn',
    fullName: 'Fatou Ndiaye',
    role: 'dispatcher',
    subsidiaryId: 'sub-sn',
    avatar: null,
  },
];

// ============================================
// OPERATIONS FIXTURES
// ============================================

export const mockOperations = [
  {
    id: 'op-1',
    numero: 'OP-2026-001',
    type: 'COLLECTE_DECHET',
    clientId: 'client-1',
    dateOperation: '2026-04-20',
    vehicleId: 'vehicle-1',
    driverId: 'driver-1',
    tonnage: 12.5,
    status: 'TERMINE',
    bsdData: {
      producteur: 'SONATEL',
      typeDechet: 'DASRI',
      codeDechet: '18 01 03',
      quantite: 12.5,
      unite: 'tonnes',
    },
  },
];

// ============================================
// LOCALSTORAGE MOCK DATA
// ============================================

export const mockLocalStorageData = {
  ivos_operations_v1: JSON.stringify(mockOperations),
  ivos_vehicles_v1: JSON.stringify(mockVehicles),
  ivos_drivers_v1: JSON.stringify(mockDrivers),
  ivos_clients_v1: JSON.stringify(mockClients),
  ivos_certificates_v1: JSON.stringify(mockCertificates),
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Initialiser localStorage avec données mock
 */
export function initMockLocalStorage() {
  Object.entries(mockLocalStorageData).forEach(([key, value]) => {
    localStorage.setItem(key, value);
  });
}

/**
 * Nettoyer localStorage
 */
export function clearMockLocalStorage() {
  Object.keys(mockLocalStorageData).forEach((key) => {
    localStorage.removeItem(key);
  });
}

/**
 * Mock complet pour tests
 */
export const testFixtures = {
  vehicles: mockVehicles,
  drivers: mockDrivers,
  clients: mockClients,
  certificates: mockCertificates,
  users: mockUsers,
  operations: mockOperations,
  initLocalStorage: initMockLocalStorage,
  clearLocalStorage: clearMockLocalStorage,
};

export default testFixtures;
