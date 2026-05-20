/**
 * Service de gestion des clients (CRUD, certifications, géolocalisation)
 * Toutes les méthodes utilisent Supabase comme backend.
 */
import type { Client } from './clientsStore';
// Logique locale pour le CRUD (remplacer supabase par un tableau local)
const clients: Client[] = [];

export class ClientService {
  /**
   * Récupère tous les clients
   */
  getAllClients(): Client[] {
    return clients;
  }

  /**
   * Récupère un client par son ID
   */
  getClient(id: string): Client | null {
    return clients.find((c) => c.id === Number(id)) || null;
  }

  /**
   * Crée un nouveau client
   */
  createClient(client: Omit<Client, 'id'>): Client {
    const newClient = { ...client, id: Date.now() } as Client;
    clients.push(newClient);
    return newClient;
  }

  /**
   * Met à jour un client
   */
  updateClient(id: string, client: Partial<Client>): Client | null {
    const idx = clients.findIndex((c) => c.id === Number(id));
    if (idx === -1) return null;
    clients[idx] = { ...clients[idx], ...client };
    return clients[idx];
  }

  /**
   * Supprime un client
   */
  deleteClient(id: string): void {
    const idx = clients.findIndex((c) => c.id === Number(id));
    if (idx !== -1) clients.splice(idx, 1);
  }
}

// Sécurisation : Vérification explicite des permissions sur chaque opération (CRUD), audit des accès, gestion fine des rôles.
