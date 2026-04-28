import type { EmailProvider, OAuthCompletePayload, OAuthStartResult } from './types';

const OAUTH_BACKEND_URL = import.meta.env.VITE_EMAIL_CENTER_BACKEND_URL || '';
const OAUTH_CALLBACK_PATH = '/communications/email-center';

function randomString(length = 32): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let value = '';
  for (let i = 0; i < length; i += 1) {
    value += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return value;
}

function buildRedirectUri(): string {
  return `${window.location.origin}${OAUTH_CALLBACK_PATH}`;
}

export function hasOAuthBackendConfigured(): boolean {
  return Boolean(OAUTH_BACKEND_URL);
}

export function startOAuth(provider: EmailProvider): OAuthStartResult {
  const state = randomString(48);
  const redirectUri = encodeURIComponent(buildRedirectUri());

  const authorizationUrl = OAUTH_BACKEND_URL
    ? `${OAUTH_BACKEND_URL}/oauth/${provider}/start?state=${state}&redirect_uri=${redirectUri}`
    : `${window.location.origin}${OAUTH_CALLBACK_PATH}?email_oauth_provider=${provider}&state=${state}&code=demo-code`;

  return { provider, authorizationUrl, state };
}

export async function completeOAuth(payload: OAuthCompletePayload): Promise<{
  accessToken: string;
  refreshToken?: string;
  emailAddress: string;
  displayName: string;
  expiresAt?: string;
}> {
  if (!OAUTH_BACKEND_URL) {
    return {
      accessToken: `${payload.provider}-demo-access-token`,
      refreshToken: `${payload.provider}-demo-refresh-token`,
      emailAddress: payload.provider === 'gmail' ? 'demo.user@gmail.com' : 'demo.user@outlook.com',
      displayName: payload.provider === 'gmail' ? 'Demo Gmail User' : 'Demo Outlook User',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };
  }

  const response = await fetch(`${OAUTH_BACKEND_URL}/oauth/${payload.provider}/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Echec OAuth ${payload.provider}: ${response.status}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    emailAddress: data.email,
    displayName: data.display_name || data.email,
    expiresAt: data.expires_at,
  };
}

export function maybeReadOAuthCallbackFromLocation(): {
  provider: EmailProvider;
  code: string;
  state: string;
} | null {
  const params = new URLSearchParams(window.location.search);
  const provider = params.get('email_oauth_provider');
  const code = params.get('code');
  const state = params.get('state');

  if (!provider || !code || !state) return null;
  if (provider !== 'gmail' && provider !== 'outlook') return null;

  return { provider, code, state };
}

export function cleanOAuthParamsFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete('email_oauth_provider');
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  window.history.replaceState({}, document.title, url.toString());
}

export function getOAuthRedirectUri() {
  return buildRedirectUri();
}
