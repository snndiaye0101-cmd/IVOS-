# README - Module Missions

Ce dossier gère les ordres de mission :

- Pages : MissionsPage, MissionDetailPage, CreateMissionPage
- Services : missionService (CRUD, workflow, affectations)
- Hooks : useMissions, useMissionWorkflow, useMissionStats
- Types : mission.types.ts

## Points clés

- Centralisation des accès API dans services/
- Utilisation de React Query pour la gestion des missions
- Factorisation des composants UI dans shared/components/ui/
- Tests unitaires à placer dans chaque dossier service/hook

Voir le plan de test global dans /TEST_PLAN.md
