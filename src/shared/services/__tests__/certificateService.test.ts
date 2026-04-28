/**
 * Tests unitaires pour certificateService
 * Système de Certificats QHSE
 */

import {
  getCertificates,
  canGenerateCertificate,
  generateCertificate,
  getCertificateById,
  getCertificateByNumber,
  verifyCertificate,
  markCertificateAsSent,
  markCertificateAsVerified,
  type Certificate,
  type CertificateGenerationParams
} from '../certificateService';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

window.dispatchEvent = jest.fn();

describe('certificateService', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('generateCertificate', () => {
    const validParams: CertificateGenerationParams = {
      operationId: 'OP-001',
      operationCode: 'BSD-KIG-2026-0001',
      clientName: 'Total Sénégal',
      wasteType: 'Hydrocarbures',
      wasteQuantity: 1500,
      wasteUnit: 'Litres',
      collectionDate: '2026-04-15',
      disposalSite: 'Centre de Traitement Dakar',
      vehicleRegistration: 'AA-123-BB',
      generatedBy: 'Admin'
    };

    it('devrait générer un certificat valide', () => {
      const cert = generateCertificate(validParams);
      
      expect(cert.id).toBeDefined();
      expect(cert.certificateNumber).toMatch(/^CERT-KIG-2026-\d{4}$/);
      expect(cert.verificationCode).toMatch(/^[A-Z0-9]{12}$/);
      expect(cert.qrCodeData).toContain('verify');
      expect(cert.clientName).toBe('Total Sénégal');
      expect(cert.wasteQuantity).toBe(1500);
      expect(cert.generatedBy).toBe('Admin');
    });

    it('devrait créer un code de vérification unique', () => {
      const cert1 = generateCertificate(validParams);
      const cert2 = generateCertificate({ ...validParams, operationId: 'OP-002' });
      
      expect(cert1.verificationCode).not.toBe(cert2.verificationCode);
      expect(cert1.verificationCode).toHaveLength(12);
    });

    it('devrait stocker le certificat dans localStorage', () => {
      generateCertificate(validParams);
      
      const certs = getCertificates();
      expect(certs).toHaveLength(1);
      expect(certs[0].clientName).toBe('Total Sénégal');
    });

    it('devrait incrémenter le numéro de certificat', () => {
      const cert1 = generateCertificate(validParams);
      const cert2 = generateCertificate({ ...validParams, operationId: 'OP-002' });
      
      expect(cert1.certificateNumber).toBe('CERT-KIG-2026-0001');
      expect(cert2.certificateNumber).toBe('CERT-KIG-2026-0002');
    });

    it('devrait générer une URL QR valide', () => {
      const cert = generateCertificate(validParams);
      
      expect(cert.qrCodeData).toContain('/certificate/verify/');
      expect(cert.qrCodeData).toContain(cert.verificationCode);
    });
  });

  describe('canGenerateCertificate', () => {
    beforeEach(() => {
      // Mock getAllOperations
      const operations = [
        {
          id: 'OP-001',
          code: 'BSD-001',
          status: 'cloturee',
          bsdData: {
            wasteQuantity: 1500,
            validatedAt: '2026-04-15'
          }
        },
        {
          id: 'OP-002',
          code: 'BSD-002',
          status: 'en_cours',
          bsdData: {
            wasteQuantity: 1000
          }
        },
        {
          id: 'OP-003',
          code: 'BSD-003',
          status: 'cloturee',
          bsdData: {
            wasteQuantity: 0
          }
        }
      ];
      
      localStorageMock.setItem('ivos_operations_v1', JSON.stringify(operations));
    });

    it('devrait autoriser la génération pour opération clôturée valide', () => {
      const result = canGenerateCertificate('OP-001');
      
      expect(result.canGenerate).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('devrait refuser si opération non clôturée', () => {
      const result = canGenerateCertificate('OP-002');
      
      expect(result.canGenerate).toBe(false);
      expect(result.reason).toContain('clôturée');
    });

    it('devrait refuser si quantité zéro', () => {
      const result = canGenerateCertificate('OP-003');
      
      expect(result.canGenerate).toBe(false);
      expect(result.reason).toContain('quantité');
    });

    it('devrait refuser si certificat déjà généré', () => {
      // Générer un certificat pour OP-001
      const params: CertificateGenerationParams = {
        operationId: 'OP-001',
        operationCode: 'BSD-001',
        clientName: 'Test',
        wasteType: 'Hydrocarbures',
        wasteQuantity: 1500,
        wasteUnit: 'Litres',
        collectionDate: '2026-04-15',
        disposalSite: 'Centre',
        vehicleRegistration: 'AA-123-BB',
        generatedBy: 'Admin'
      };
      generateCertificate(params);
      
      const result = canGenerateCertificate('OP-001');
      
      expect(result.canGenerate).toBe(false);
      expect(result.reason).toContain('déjà généré');
    });
  });

  describe('verifyCertificate', () => {
    let validCert: Certificate;

    beforeEach(() => {
      const params: CertificateGenerationParams = {
        operationId: 'OP-001',
        operationCode: 'BSD-001',
        clientName: 'Total Sénégal',
        wasteType: 'Hydrocarbures',
        wasteQuantity: 1500,
        wasteUnit: 'Litres',
        collectionDate: '2026-04-15',
        disposalSite: 'Centre Dakar',
        vehicleRegistration: 'AA-123-BB',
        generatedBy: 'Admin'
      };
      validCert = generateCertificate(params);
    });

    it('devrait vérifier un certificat valide', () => {
      const result = verifyCertificate(validCert.verificationCode);
      
      expect(result.isValid).toBe(true);
      expect(result.certificate).toBeDefined();
      expect(result.certificate?.certificateNumber).toBe(validCert.certificateNumber);
      expect(result.message).toContain('valide');
    });

    it('devrait rejeter un code invalide', () => {
      const result = verifyCertificate('INVALID123');
      
      expect(result.isValid).toBe(false);
      expect(result.certificate).toBeUndefined();
      expect(result.message).toContain('invalide');
    });

    it('devrait rejeter un code vide', () => {
      const result = verifyCertificate('');
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('code de vérification');
    });
  });

  describe('getCertificateById', () => {
    it('devrait retourner le certificat correct', () => {
      const params: CertificateGenerationParams = {
        operationId: 'OP-001',
        operationCode: 'BSD-001',
        clientName: 'Test Client',
        wasteType: 'Hydrocarbures',
        wasteQuantity: 1500,
        wasteUnit: 'Litres',
        collectionDate: '2026-04-15',
        disposalSite: 'Centre',
        vehicleRegistration: 'AA-123-BB',
        generatedBy: 'Admin'
      };
      const cert = generateCertificate(params);
      
      const found = getCertificateById(cert.id);
      
      expect(found).toBeDefined();
      expect(found?.id).toBe(cert.id);
      expect(found?.clientName).toBe('Test Client');
    });

    it('devrait retourner null pour ID inexistant', () => {
      const found = getCertificateById('INEXISTANT');
      expect(found).toBeNull();
    });
  });

  describe('markCertificateAsSent', () => {
    it('devrait marquer le certificat comme envoyé', () => {
      const params: CertificateGenerationParams = {
        operationId: 'OP-001',
        operationCode: 'BSD-001',
        clientName: 'Test',
        wasteType: 'Hydrocarbures',
        wasteQuantity: 1500,
        wasteUnit: 'Litres',
        collectionDate: '2026-04-15',
        disposalSite: 'Centre',
        vehicleRegistration: 'AA-123-BB',
        generatedBy: 'Admin'
      };
      const cert = generateCertificate(params);
      
      expect(cert.sentAt).toBeUndefined();
      
      markCertificateAsSent(cert.id);
      
      const updated = getCertificateById(cert.id);
      expect(updated?.sentAt).toBeDefined();
      expect(new Date(updated!.sentAt!).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('devrait dispatcher un événement', () => {
      const params: CertificateGenerationParams = {
        operationId: 'OP-001',
        operationCode: 'BSD-001',
        clientName: 'Test',
        wasteType: 'Hydrocarbures',
        wasteQuantity: 1500,
        wasteUnit: 'Litres',
        collectionDate: '2026-04-15',
        disposalSite: 'Centre',
        vehicleRegistration: 'AA-123-BB',
        generatedBy: 'Admin'
      };
      const cert = generateCertificate(params);
      
      jest.clearAllMocks();
      markCertificateAsSent(cert.id);
      
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ivos_certificates_change'
        })
      );
    });
  });

  describe('markCertificateAsVerified', () => {
    it('devrait marquer le certificat comme vérifié', () => {
      const params: CertificateGenerationParams = {
        operationId: 'OP-001',
        operationCode: 'BSD-001',
        clientName: 'Test',
        wasteType: 'Hydrocarbures',
        wasteQuantity: 1500,
        wasteUnit: 'Litres',
        collectionDate: '2026-04-15',
        disposalSite: 'Centre',
        vehicleRegistration: 'AA-123-BB',
        generatedBy: 'Admin'
      };
      const cert = generateCertificate(params);
      
      expect(cert.verifiedAt).toBeUndefined();
      
      markCertificateAsVerified(cert.id);
      
      const updated = getCertificateById(cert.id);
      expect(updated?.verifiedAt).toBeDefined();
    });
  });

  describe('getCertificates', () => {
    it('devrait retourner un tableau vide si aucun certificat', () => {
      const certs = getCertificates();
      expect(certs).toEqual([]);
    });

    it('devrait retourner tous les certificats', () => {
      const params1: CertificateGenerationParams = {
        operationId: 'OP-001',
        operationCode: 'BSD-001',
        clientName: 'Client 1',
        wasteType: 'Hydrocarbures',
        wasteQuantity: 1500,
        wasteUnit: 'Litres',
        collectionDate: '2026-04-15',
        disposalSite: 'Centre',
        vehicleRegistration: 'AA-123-BB',
        generatedBy: 'Admin'
      };
      
      const params2: CertificateGenerationParams = {
        ...params1,
        operationId: 'OP-002',
        operationCode: 'BSD-002',
        clientName: 'Client 2'
      };
      
      generateCertificate(params1);
      generateCertificate(params2);
      
      const certs = getCertificates();
      expect(certs).toHaveLength(2);
    });
  });
});
