# Email Center - IVOS

Module complet de messagerie professionnelle avec:

- Connexion OAuth2 Gmail API et Microsoft Graph (Outlook)
- Sync en arriere-plan des dossiers (Inbox, Sent, Drafts, Trash, Starred)
- Synchronisation paginee des emails (chargement progressif)
- Refresh transparent des access tokens OAuth quand ils expirent
- Interface Inbox 3 colonnes
- Composeur WYSIWYG avec pieces jointes et documents IVOS en 1 clic
- Smart Linking d'email vers vehicule ou mission (Supabase + fallback local)
- Cache intelligent local pour ouverture instantanee des emails
- Endpoints webhook Gmail/Outlook verifies par signature / clientState
- Tableau de supervision Super Admin du backend Email Center

## Routes

- `/communications/email-center`
- `/communications/email-center/admin`

## Variables d'environnement

```bash
VITE_EMAIL_CENTER_BACKEND_URL=https://your-email-api.example.com
```

Quand cette variable n'est pas definie, le module fonctionne en mode demo local pour faciliter les tests UI.

## API backend locale

Une API locale est incluse dans le repo:

- Dossier: `email-center-api/`
- Lancement: `npm run email-center:api`
- URL par defaut: `http://localhost:8787`

Variables backend a definir:

- `EMAIL_CENTER_API_PORT`
- `EMAIL_CENTER_FRONTEND_URL`
- `EMAIL_CENTER_CORS_ORIGIN`
- `EMAIL_CENTER_ADMIN_TOKEN`
- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_WEBHOOK_SECRET`
- `MS_CLIENT_ID`
- `MS_CLIENT_SECRET`
- `MS_TENANT_ID`
- `OUTLOOK_WEBHOOK_SECRET`
- `OUTLOOK_WEBHOOK_CLIENT_STATE`
- `EMAIL_CENTER_WEBHOOK_SHARED_SECRET` (secret partage optionnel pour les 2 providers)

Variables frontend optionnelles pour la supervision admin:

- `VITE_EMAIL_CENTER_ADMIN_TOKEN`

## Monitoring admin

Endpoint backend:

- `GET {BACKEND_URL}/admin/overview`

Protection recommandee:

- Header `X-Admin-Token: ...`
- ou `Authorization: Bearer ...`
- backend controle via `EMAIL_CENTER_ADMIN_TOKEN`

Expose:

- uptime API
- etats OAuth en attente
- compteur webhooks acceptes / rejetes
- historique recent des refresh tokens
- configuration Gmail / Outlook (OAuth + secret webhook + clientState Outlook)

La page Super Admin consomme cet endpoint via:

- `/communications/email-center/admin`

## Verification webhook

- Gmail: signature HMAC SHA-256 lue depuis `X-IVOS-Signature` ou `X-Hub-Signature-256`
- Outlook: verification HMAC + validation optionnelle de `clientState`
- Outlook validation endpoint: `GET /webhooks/outlook?validationToken=...`
- Rotation de secrets supportee via listes separees par virgule (`GMAIL_WEBHOOK_SECRET`, `OUTLOOK_WEBHOOK_SECRET`, `EMAIL_CENTER_WEBHOOK_SHARED_SECRET`)

Si aucun secret n'est configure, le backend reste permissif pour faciliter le mode local. En production, configure les secrets explicitement.

## Resilience reseau

- L'API backend rejoue automatiquement les appels provider sur erreurs transitoires (`429`, `5xx`, timeouts reseau)
- Le frontend Email Center rejoue aussi les appels backend critiques avant fallback local

## Contrat API OAuth attendu

### Start OAuth

- `GET {BACKEND_URL}/oauth/gmail/start?state=...&redirect_uri=...`
- `GET {BACKEND_URL}/oauth/outlook/start?state=...&redirect_uri=...`

Reponse attendue: redirection vers le provider.

### OAuth Callback Exchange

- `POST {BACKEND_URL}/oauth/gmail/callback`
- `POST {BACKEND_URL}/oauth/outlook/callback`

Body:

```json
{
  "provider": "gmail",
  "code": "authorization_code",
  "state": "opaque_state",
  "redirectUri": "https://app/communications/email-center"
}
```

Reponse JSON attendue:

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "email": "user@company.com",
  "display_name": "User Name",
  "expires_at": "2026-04-25T16:00:00.000Z"
}
```

## Base de donnees

Migration incluse: `database/migrations/email_center_schema.sql`

Tables:

- `email_accounts`
- `email_links`
- `email_sync_logs`

## Notes d'implementation

- Le module est "local-first": la UI reste fluide meme si l'API externe est indisponible.
- Les donnees de cache sont TTL (5 minutes) et synchronisees en tache de fond.
- La detection de plaque dans le sujet propose automatiquement un lien vers un vehicule connu.
