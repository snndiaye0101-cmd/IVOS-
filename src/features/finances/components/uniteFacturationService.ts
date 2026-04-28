// Service pour stocker et récupérer la configuration d'unité de facturation
// Persist via localStorage + cross-module notification
import type { UniteFacturationItem } from './UniteFacturation';

const STORAGE_KEY = 'ivos_unite_facturation_v1';
const CHANGE_EVENT = 'ivos_unite_facturation_change';

const SEED: UniteFacturationItem[] = [
  { id: 1, type: 'Pompage', unit: 'm³', price: 15000, categorie: 'Exploitation', updatedAt: '2026-01-10T08:00:00' },
  { id: 2, type: 'Déchets solides', unit: 'Tonne', price: 25000, categorie: 'Exploitation', updatedAt: '2026-01-10T08:00:00' },
  { id: 3, type: 'Boues pétrolières', unit: 'Tonne', price: 35000, categorie: 'Opérations Spéciales', updatedAt: '2026-02-15T10:00:00' },
  { id: 4, type: 'DASRI', unit: 'kg', price: 2500, categorie: 'Exploitation', updatedAt: '2026-02-15T10:00:00' },
  { id: 5, type: 'Déchets Dangereux', unit: 'Tonne', price: 45000, categorie: 'Opérations Spéciales', updatedAt: '2026-03-01T09:00:00' },
  { id: 6, type: 'Produits pharmaceutiques', unit: 'kg', price: 2000, categorie: 'Exploitation', updatedAt: '2026-03-01T09:00:00' },
  { id: 7, type: 'Vidange fosse septique', unit: 'm³', price: 12000, categorie: 'Exploitation', updatedAt: '2026-03-20T14:00:00' },
  { id: 8, type: 'Curage réseau', unit: 'Forfait', price: 150000, categorie: 'Maintenance', updatedAt: '2026-04-01T11:00:00' },
  { id: 9, type: 'Transport déchets', unit: 'Tonne', price: 18000, categorie: 'Exploitation', updatedAt: '2026-04-05T08:30:00' },
];

function loadFromStorage(): UniteFacturationItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
  return [...SEED];
}

let cache: UniteFacturationItem[] = loadFromStorage();

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function getUniteFacturation(): UniteFacturationItem[] {
  return cache;
}

export function setUniteFacturation(data: UniteFacturationItem[]) {
  cache = data;
  persist();
}

export function addUniteFacturation(item: Omit<UniteFacturationItem, 'id' | 'updatedAt'>): UniteFacturationItem {
  const newItem: UniteFacturationItem = {
    ...item,
    id: Date.now(),
    updatedAt: new Date().toISOString(),
  };
  cache = [...cache, newItem];
  persist();
  return newItem;
}

export function updateUniteFacturation(id: number, updates: Partial<UniteFacturationItem>) {
  cache = cache.map(item =>
    item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
  );
  persist();
}

export function deleteUniteFacturation(id: number) {
  cache = cache.filter(item => item.id !== id);
  persist();
}

export function findUniteFacturationByType(type: string): UniteFacturationItem | undefined {
  return cache.find(item => item.type.toLowerCase() === type.toLowerCase());
}

export function getAllPrestationTypes(): string[] {
  return cache.map(item => item.type);
}

export { CHANGE_EVENT };
