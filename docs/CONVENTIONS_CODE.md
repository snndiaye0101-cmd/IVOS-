# Conventions de code et factorisation IVOS

## 1. Factorisation
- Utiliser des hooks personnalisés pour toute logique réutilisable (ex : useFetch, usePermissions, useFormPersist).
- Centraliser les appels API dans /shared/services/ (éviter la duplication dans les features).
- Grouper les types globaux dans /shared/types/ et les types métier dans chaque feature.
- Utiliser les composants UI shadcn dans /shared/components/ui/ pour garantir la cohérence visuelle.
- Préférer les helpers utilitaires dans /shared/utils/ pour le formatage, la validation, etc.

## 2. Documentation
- Ajouter un README.md dans chaque dossier feature décrivant le rôle, les pages, les hooks/services principaux.
- Documenter chaque service, hook et composant public avec JSDoc ou un commentaire succinct.
- Mettre à jour docs/SECURITE_CONFORMITE.md et docs/ARCHITECTURE.html à chaque évolution majeure.
- Utiliser des exemples d’usage dans les README ou en Storybook (si installé).

## 3. Style de code
- Respecter Prettier et ESLint (npm run format, npm run lint).
- Utiliser des noms explicites pour les variables, props et fonctions.
- Préférer les types explicites (TypeScript strict).
- Grouper les imports par type (librairies, shared, features, styles).

## 4. Tests
- Un fichier .test.ts(x) par service/hook/page critique.
- Utiliser des mocks pour les appels réseau et Supabase.
- Documenter les cas de test dans le fichier ou dans un fichier TEST_PLAN.md.

## 5. Refactoring
- Supprimer le code mort ou non utilisé à chaque sprint.
- Ouvrir une issue pour chaque dette technique identifiée.
- Factoriser les hooks ou services dupliqués dans shared/.

---

Pour toute nouvelle feature, suivre ce guide et mettre à jour la documentation associée.