# README - Module Waste Tracking (BSD)

Ce dossier gère la digitalisation des BSD :

- Pages : WasteFormsPage, CreateWasteFormPage, WasteFormDetailPage, SignFormPage
- Services : wasteFormService (CRUD, signatures, PDF, archivage)
- Hooks : useWasteForms, useSignature, usePDFGeneration
- Types : wasteForm.types.ts

## Points clés

- Centralisation des accès API dans services/
- Utilisation de React Query pour la gestion des BSD
- Factorisation des composants UI dans shared/components/ui/
- Tests unitaires à placer dans chaque dossier service/hook

Voir le plan de test global dans /TEST_PLAN.md
