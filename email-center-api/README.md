# Email Center API (OAuth + Mail Sync)

Local backend API for IVOS Email Center.

## Run

```bash
npm run email-center:api
```

Default URL: http://localhost:8787

## Required environment variables

- EMAIL_CENTER_API_PORT=8787
- EMAIL_CENTER_FRONTEND_URL=http://localhost:3000
- EMAIL_CENTER_CORS_ORIGIN=http://localhost:3000

### Gmail OAuth

- GMAIL_CLIENT_ID
- GMAIL_CLIENT_SECRET

### Outlook OAuth (Microsoft Graph)

- MS_CLIENT_ID
- MS_CLIENT_SECRET
- MS_TENANT_ID (optional, default: common)

## Endpoints

- GET /health
- GET /oauth/:provider/start
- POST /oauth/:provider/callback
- GET /providers/:provider/folders
- GET /providers/:provider/messages?folderId=...&cursor=...&pageSize=...
- POST /providers/:provider/send
- POST /webhooks/gmail
- POST /webhooks/outlook
- GET /webhooks/events

Providers supported: gmail, outlook.

## Notes

- Without OAuth credentials, the API returns demo tokens and supports UI flow testing.
- Webhook endpoints are ready for provider subscriptions and currently log incoming events.
