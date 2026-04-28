/**
 * Tests unitaires pour backupService
 * Centre de Gestion des Sauvegardes
 */

import {
  getBackupActions,
  logBackupAction,
  getRecentActions,
  getLastCloudSync,
  updateCloudSync,
  generateSQLBackup,
  type BackupAction
} from '../backupService';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock window.dispatchEvent
window.dispatchEvent = jest.fn();

describe('backupService', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('logBackupAction', () => {
    it('devrait créer une nouvelle action de backup', () => {
      logBackupAction('backup_manual', 'success', 'Test backup', 'Admin');
      
      const actions = getBackupActions();
      
      expect(actions).toHaveLength(1);
      expect(actions[0]).toMatchObject({
        type: 'backup_manual',
        status: 'success',
        details: 'Test backup',
        user: 'Admin'
      });
      expect(actions[0].id).toBeDefined();
      expect(actions[0].date).toBeDefined();
    });

    it('devrait limiter à 50 actions maximum', () => {
      // Créer 60 actions
      for (let i = 0; i < 60; i++) {
        logBackupAction('backup_auto', 'success', `Action ${i}`, 'System');
      }
      
      const actions = getBackupActions();
      
      expect(actions).toHaveLength(50);
      expect(actions[0].details).toBe('Action 59'); // La plus récente
    });

    it('devrait dispatcher un événement customEvent', () => {
      logBackupAction('export_qhse', 'success', 'Export réussi');
      
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ivos_backup_action_change'
        })
      );
    });

    it('devrait utiliser "Admin" comme user par défaut', () => {
      logBackupAction('restore_local', 'pending', 'Restauration en cours');
      
      const actions = getBackupActions();
      expect(actions[0].user).toBe('Admin');
    });
  });

  describe('getRecentActions', () => {
    it('devrait retourner les N dernières actions', () => {
      // Créer 15 actions
      for (let i = 0; i < 15; i++) {
        logBackupAction('backup_auto', 'success', `Action ${i}`);
      }
      
      const recent = getRecentActions(10);
      
      expect(recent).toHaveLength(10);
      expect(recent[0].details).toBe('Action 14'); // Plus récente
      expect(recent[9].details).toBe('Action 5');
    });

    it('devrait retourner 10 par défaut', () => {
      for (let i = 0; i < 20; i++) {
        logBackupAction('backup_auto', 'success', `Action ${i}`);
      }
      
      const recent = getRecentActions();
      expect(recent).toHaveLength(10);
    });
  });

  describe('Cloud Sync', () => {
    it('devrait retourner "never" par défaut', () => {
      const sync = getLastCloudSync();
      
      expect(sync).toEqual({
        date: '',
        status: 'never'
      });
    });

    it('devrait mettre à jour le statut de sync', () => {
      updateCloudSync('synced');
      
      const sync = getLastCloudSync();
      
      expect(sync.status).toBe('synced');
      expect(sync.date).toBeTruthy();
      expect(new Date(sync.date).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('devrait dispatcher un événement lors de la mise à jour', () => {
      updateCloudSync('error');
      
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ivos_cloud_sync_change'
        })
      );
    });
  });

  describe('generateSQLBackup', () => {
    beforeEach(() => {
      // Simuler des données localStorage
      localStorageMock.setItem('ivos_operations_v1', JSON.stringify([
        { id: '1', client: 'Test', status: 'cloturee' }
      ]));
      localStorageMock.setItem('ivos_vehicles_v1', JSON.stringify([
        { id: 'V1', immatriculation: 'AA-123-BB' }
      ]));
    });

    it('devrait générer un Blob avec les données', () => {
      const blob = generateSQLBackup('KIGNABOUR', 2026);
      
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/json');
    });

    it('devrait inclure les métadonnées correctes', async () => {
      const blob = generateSQLBackup('KIGNABOUR', 2026);
      const text = await blob.text();
      const data = JSON.parse(text);
      
      expect(data.metadata).toBeDefined();
      expect(data.metadata.version).toBe('1.0.0');
      expect(data.metadata.site).toBe('KIGNABOUR');
      expect(data.metadata.year).toBe(2026);
      expect(data.metadata.date).toBeTruthy();
    });

    it('devrait inclure toutes les données localStorage', async () => {
      const blob = generateSQLBackup('Test Site', 2026);
      const text = await blob.text();
      const data = JSON.parse(text);
      
      expect(data.operations).toBeDefined();
      expect(data.vehicles).toBeDefined();
      expect(JSON.parse(data.operations)).toHaveLength(1);
    });
  });

  describe('getBackupActions avec localStorage vide', () => {
    it('devrait retourner un tableau vide', () => {
      const actions = getBackupActions();
      expect(actions).toEqual([]);
    });
  });

  describe('Gestion des erreurs', () => {
    it('devrait gérer les données localStorage corrompues', () => {
      localStorageMock.setItem('ivos_backup_actions_v1', 'invalid json');
      
      const actions = getBackupActions();
      expect(actions).toEqual([]);
    });

    it('devrait gérer les erreurs de sync cloud', () => {
      localStorageMock.setItem('ivos_last_cloud_sync_v1', 'corrupted');
      
      const sync = getLastCloudSync();
      expect(sync).toEqual({ date: '', status: 'never' });
    });
  });
});
