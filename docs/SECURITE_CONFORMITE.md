# Sécurité & Conformité – IVOS 3

## Row Level Security (RLS)
- Toutes les tables sensibles sont protégées par des politiques RLS dans `database/schema.sql`.
- En production, vérifier que RLS est activé pour chaque table.
- Tester les accès avec différents rôles (utilisateur, admin, chauffeur).

## Gestion des secrets
- Ne jamais committer `.env.local`.
- Utiliser `.env.example` comme template.
- En production, stocker les secrets dans un gestionnaire sécurisé (Vercel/Netlify/HashiCorp Vault).

## Audit Trail
- Les actions sensibles (création, modification, suppression) sont loguées dans la table `audit_logs`.
- Les accès et modifications critiques sont tracés pour conformité réglementaire.

## RGPD & Protection des données
- Consentements utilisateurs tracés (table dédiée ou champ dans `user_profiles`).
- Droit à l’oubli : suppression sur demande via interface ou support.
- Export de données personnelles sur demande.
- Accès aux données contrôlé par rôle et filiale.

## Sauvegardes & Reprise
- Sauvegardes automatiques quotidiennes (voir configuration Supabase).
- Point-in-time recovery activé.
- Réplication géographique si besoin critique.

---

Pour toute évolution, mettre à jour ce fichier et la documentation technique.