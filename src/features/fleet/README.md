# README - Module Fleet

Ce dossier contient toutes les fonctionnalités liées à la gestion de flotte :
- Pages : VehiclesPage, DriversPage, MaintenancePage, etc.
- Services : vehicleService, driverService (CRUD, statuts, affectations)
- Hooks : useVehicles, useDrivers, useFleetStats
- Types : vehicle.types.ts, driver.types.ts

## Points clés
- Tous les accès API sont centralisés dans services/
- Les hooks utilisent React Query pour la gestion des données
- Les composants UI sont factorisés dans shared/components/ui/
- Les tests unitaires sont à placer dans chaque dossier service/hook

Voir le plan de test global dans /TEST_PLAN.md
