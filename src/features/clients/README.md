# README - Module Clients

Ce dossier gère la gestion des clients/partenaires :
- Pages : ClientsPage, ClientDetailPage
- Services : clientService (CRUD, certifications, géolocalisation)
- Hooks : useClients
- Types : client.types.ts

## Points clés
- Centralisation des accès API dans services/
- Utilisation de React Query pour la gestion des clients
- Factorisation des composants UI dans shared/components/ui/
- Tests unitaires à placer dans chaque dossier service/hook

Voir le plan de test global dans /TEST_PLAN.md
