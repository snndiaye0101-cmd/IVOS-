import http from 'node:http';
import { URL } from 'node:url';
import crypto from 'node:crypto';
import { Server as SocketIOServer } from 'socket.io';

const PORT = Number(process.env.EMAIL_CENTER_API_PORT || 8787);
const FRONTEND_URL = process.env.EMAIL_CENTER_FRONTEND_URL || 'http://localhost:3000';
const EMAIL_CENTER_ADMIN_TOKEN = process.env.EMAIL_CENTER_ADMIN_TOKEN || '';
const OUTLOOK_WEBHOOK_CLIENT_STATE = process.env.OUTLOOK_WEBHOOK_CLIENT_STATE || '';
const SYNC_INTERVAL_MS = Number(process.env.EMAIL_CENTER_SYNC_INTERVAL_MS || 180000);

const stateStore = new Map();
const webhookEvents = [];
const tokenRefreshEvents = [];
const managedAccounts = new Map();
let syncInProgress = false;
let io = null;

function nowIso() {
  return new Date().toISOString();
}

function pushLimited(list, entry, max = 200) {
  list.push(entry);
  if (list.length > max) {
    list.splice(0, list.length - max);
  }
}

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...corsHeaders(),
  });
  res.end(body);
}

function sendPlainText(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...corsHeaders(),
  });
  res.end(body);
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.EMAIL_CENTER_CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id, X-Refresh-Token, X-Token-Expires-At, X-IVOS-Signature, X-Hub-Signature-256',
    'Access-Control-Expose-Headers': 'X-Email-Center-Access-Token, X-Email-Center-Refresh-Token, X-Email-Center-Expires-At',
  };
}

function normalizeManagedAccount(payload = {}) {
  return {
    id: String(payload.id || ''),
    userId: String(payload.userId || ''),
    provider: String(payload.provider || ''),
    emailAddress: String(payload.emailAddress || ''),
    displayName: String(payload.displayName || payload.emailAddress || ''),
    accessToken: String(payload.accessToken || ''),
    refreshToken: payload.refreshToken ? String(payload.refreshToken) : '',
    expiresAt: payload.expiresAt ? String(payload.expiresAt) : '',
    connectedAt: payload.connectedAt ? String(payload.connectedAt) : nowIso(),
    lastSyncAt: payload.lastSyncAt ? String(payload.lastSyncAt) : '',
    folders: Array.isArray(payload.folders) ? payload.folders : [],
    messagesByFolder: payload.messagesByFolder && typeof payload.messagesByFolder === 'object' ? payload.messagesByFolder : {},
    unreadCount: Number(payload.unreadCount || 0),
  };
}

function managedAccountIsValid(account) {
  return Boolean(account.id && account.userId && isProvider(account.provider));
}

function emitToUser(userId, event, payload) {
  if (!io || !userId) return;
  io.to(`user:${userId}`).emit(event, payload);
}

function accountSyncPayload(account, reason, newMessages = []) {
  return {
    reason,
    accountId: account.id,
    provider: account.provider,
    emailAddress: account.emailAddress,
    folders: account.folders,
    messagesByFolder: account.messagesByFolder,
    unreadCount: account.unreadCount,
    newMessages,
    syncedAt: account.lastSyncAt || nowIso(),
  };
}

async function syncManagedAccount(account, reason = 'cron') {
  if (!managedAccountIsValid(account)) return null;

  try {
    const refreshContext = {
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
      expiresAt: account.expiresAt,
    };

    const { result, auth } = await withProviderAccess(account.provider, refreshContext, async (accessToken) => {
      const folders = await listFolders(account.provider, accessToken);
      const messagesByFolder = {};

      for (const folder of folders) {
        const page = await listMessages(account.provider, accessToken, folder.providerFolderId || folder.id, null, 20);
        messagesByFolder[folder.id] = page.messages;
      }

      return { folders, messagesByFolder };
    });

    const previousMessages = account.messagesByFolder || {};
    const nextMessages = result.messagesByFolder || {};
    const newMessages = [];

    Object.keys(nextMessages).forEach(folderId => {
      const beforeIds = new Set((previousMessages[folderId] || []).map(item => item.id));
      for (const message of nextMessages[folderId] || []) {
        if (!beforeIds.has(message.id) && !message.isRead) {
          newMessages.push({
            id: message.id,
            accountId: account.id,
            folderId,
            from: message.from,
            subject: message.subject,
            receivedAt: message.receivedAt,
          });
        }
      }
    });

    const updated = {
      ...account,
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken || account.refreshToken,
      expiresAt: auth.expiresAt || account.expiresAt,
      folders: result.folders,
      messagesByFolder: nextMessages,
      unreadCount: result.folders.reduce((sum, folder) => sum + Number(folder.unreadCount || 0), 0),
      lastSyncAt: nowIso(),
    };

    managedAccounts.set(updated.id, updated);
    emitToUser(updated.userId, 'email:center:sync', accountSyncPayload(updated, reason, newMessages));

    if (newMessages.length > 0) {
      emitToUser(updated.userId, 'email:center:new-mail', {
        accountId: updated.id,
        unreadCount: updated.unreadCount,
        messages: newMessages,
        at: updated.lastSyncAt,
      });
    }

    return updated;
  } catch (error) {
    emitToUser(account.userId, 'email:center:error', {
      accountId: account.id,
      provider: account.provider,
      reason,
      message: String(error?.message || error),
      at: nowIso(),
    });
    return null;
  }
}

async function syncAllManagedAccounts(reason = 'cron') {
  if (syncInProgress) return;
  syncInProgress = true;

  try {
    const accounts = Array.from(managedAccounts.values());
    for (const account of accounts) {
      await syncManagedAccount(account, reason);
    }
  } finally {
    syncInProgress = false;
  }
}

async function syncManagedAccountsByProvider(provider, reason = 'webhook') {
  const accounts = Array.from(managedAccounts.values()).filter(account => account.provider === provider);
  for (const account of accounts) {
    await syncManagedAccount(account, reason);
  }
}

function redirect(res, location) {
  res.writeHead(302, { Location: location, ...corsHeaders() });
  res.end();
}

function parseRawBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 5_000_000) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      resolve(raw);
    });
    req.on('error', reject);
  });
}

async function parseBody(req) {
  const raw = await parseRawBody(req);
  if (!raw) {
    return { data: {}, raw: '' };
  }

  try {
    return { data: JSON.parse(raw), raw };
  } catch {
    return { data: { raw }, raw };
  }
}

function maskToken(token) {
  if (!token) return '';
  if (token.length <= 10) return `${token.slice(0, 3)}***`;
  return `${token.slice(0, 6)}...${token.slice(-4)}`;
}

function splitSecretList(value) {
  return String(value || '')
    .split(',')
    .map(secret => secret.trim())
    .filter(Boolean);
}

function getWebhookSecrets(provider) {
  const shared = splitSecretList(process.env.EMAIL_CENTER_WEBHOOK_SHARED_SECRET || '');
  if (provider === 'gmail') {
    return [...splitSecretList(process.env.GMAIL_WEBHOOK_SECRET || ''), ...shared];
  }
  if (provider === 'outlook') {
    return [...splitSecretList(process.env.OUTLOOK_WEBHOOK_SECRET || ''), ...shared];
  }
  return shared;
}

function normalizeSignature(value) {
  return String(value || '').trim().replace(/^sha256=/i, '');
}

function computeSignature(raw, secret) {
  return crypto.createHmac('sha256', secret).update(raw).digest('hex');
}

function hasValidHmacSignature(raw, signature, secrets) {
  if (!Array.isArray(secrets) || secrets.length === 0) return true;
  const normalizedSignature = normalizeSignature(signature);
  if (!normalizedSignature || !raw) return false;
  return secrets.some(secret => {
    const expected = computeSignature(raw, secret);
    try {
      return crypto.timingSafeEqual(Buffer.from(normalizedSignature), Buffer.from(expected));
    } catch {
      return false;
    }
  });
}

function isTokenExpiringSoon(expiresAt) {
  if (!expiresAt) return false;
  const time = new Date(expiresAt).getTime();
  if (Number.isNaN(time)) return false;
  return time - Date.now() < 2 * 60 * 1000;
}

function setAuthRefreshHeaders(res, refreshed) {
  if (!refreshed?.accessToken) return;
  res.setHeader('X-Email-Center-Access-Token', refreshed.accessToken);
  if (refreshed.refreshToken) {
    res.setHeader('X-Email-Center-Refresh-Token', refreshed.refreshToken);
  }
  if (refreshed.expiresAt) {
    res.setHeader('X-Email-Center-Expires-At', refreshed.expiresAt);
  }
}

function getBearerToken(req) {
  return String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
}

function getRefreshContext(req) {
  return {
    accessToken: getBearerToken(req),
    refreshToken: String(req.headers['x-refresh-token'] || ''),
    expiresAt: String(req.headers['x-token-expires-at'] || ''),
  };
}

function getAdminToken(req) {
  return String(req.headers['x-admin-token'] || getBearerToken(req) || '');
}

function isAdminAuthorized(req) {
  if (!EMAIL_CENTER_ADMIN_TOKEN) return true;
  const provided = getAdminToken(req);
  if (!provided) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(EMAIL_CENTER_ADMIN_TOKEN));
  } catch {
    return false;
  }
}

function shouldRetryStatus(status) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

async function wait(ms) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(input, init, options = {}) {
  const retries = Number(options.retries ?? 2);
  const baseDelayMs = Number(options.baseDelayMs ?? 250);
  let lastResponse = null;
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(input, init);
      lastResponse = response;
      if (!shouldRetryStatus(response.status) || attempt === retries) {
        return response;
      }
    } catch (error) {
      lastError = error;
      if (attempt === retries) {
        throw error;
      }
    }

    await wait(baseDelayMs * 2 ** attempt);
  }

  if (lastResponse) return lastResponse;
  throw lastError || new Error('Network request failed');
}

function getProviderConfig(provider) {
  if (provider === 'gmail') {
    return {
      clientId: process.env.GMAIL_CLIENT_ID || '',
      clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.modify',
      ],
    };
  }

  if (provider === 'outlook') {
    const tenant = process.env.MS_TENANT_ID || 'common';
    return {
      clientId: process.env.MS_CLIENT_ID || '',
      clientSecret: process.env.MS_CLIENT_SECRET || '',
      authUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
      tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      scopes: ['openid', 'profile', 'email', 'offline_access', 'Mail.Read', 'Mail.ReadWrite', 'Mail.Send'],
    };
  }

  return null;
}

function isProvider(provider) {
  return provider === 'gmail' || provider === 'outlook';
}

function randomState() {
  return crypto.randomBytes(24).toString('hex');
}

function base64Url(input) {
  return Buffer.from(input, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(input) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, 'base64').toString('utf8');
}

function getHeader(headers, name) {
  const found = headers.find(item => item.name?.toLowerCase() === name.toLowerCase());
  return found?.value || '';
}

function extractGmailBodies(payload) {
  let htmlBody = '';
  let textBody = '';
  const attachments = [];

  function walk(part) {
    if (!part) return;

    if (part.parts && Array.isArray(part.parts)) {
      part.parts.forEach(walk);
      return;
    }

    if (part.mimeType === 'text/html' && part.body?.data) {
      htmlBody = decodeBase64Url(part.body.data);
      return;
    }

    if (part.mimeType === 'text/plain' && part.body?.data) {
      textBody = decodeBase64Url(part.body.data);
      return;
    }

    if (part.filename && part.body?.attachmentId) {
      attachments.push({
        id: part.body.attachmentId,
        fileName: part.filename,
        mimeType: part.mimeType || 'application/octet-stream',
        size: Number(part.body.size || 0),
        source: 'remote',
      });
    }
  }

  walk(payload);

  if (!htmlBody && textBody) {
    htmlBody = `<pre>${textBody.replace(/[&<>]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]))}</pre>`;
  }

  return { htmlBody, textBody, attachments };
}

function folderTypeFromName(name) {
  const value = String(name || '').toLowerCase();
  if (value.includes('inbox') || value.includes('reception')) return 'inbox';
  if (value.includes('sent') || value.includes('envoye')) return 'sent';
  if (value.includes('draft')) return 'drafts';
  if (value.includes('trash') || value.includes('corbeille')) return 'trash';
  if (value.includes('star')) return 'starred';
  return 'custom';
}

async function providerFetch(url, accessToken) {
  const response = await fetchWithRetry(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Provider request failed (${response.status}): ${text.slice(0, 220)}`);
  }

  return response.json();
}

async function exchangeOAuthCode(provider, code, redirectUri) {
  const config = getProviderConfig(provider);
  if (!config) throw new Error('Unsupported provider');

  if (!config.clientId || !config.clientSecret) {
    return {
      access_token: `${provider}-demo-access-token`,
      refresh_token: `${provider}-demo-refresh-token`,
      expires_in: 3600,
      email: provider === 'gmail' ? 'demo.user@gmail.com' : 'demo.user@outlook.com',
      display_name: provider === 'gmail' ? 'Demo Gmail User' : 'Demo Outlook User',
    };
  }

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });

  const tokenResponse = await fetchWithRetry(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!tokenResponse.ok) {
    throw new Error(`Token exchange failed (${tokenResponse.status})`);
  }

  const tokenData = await tokenResponse.json();

  if (provider === 'gmail') {
    const profile = await providerFetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', tokenData.access_token);
    const userInfo = await providerFetch('https://www.googleapis.com/oauth2/v2/userinfo', tokenData.access_token);
    return {
      ...tokenData,
      email: userInfo.email || profile.emailAddress || '',
      display_name: userInfo.name || userInfo.email || profile.emailAddress || 'Gmail User',
    };
  }

  const me = await providerFetch('https://graph.microsoft.com/v1.0/me', tokenData.access_token);
  return {
    ...tokenData,
    email: me.mail || me.userPrincipalName || '',
    display_name: me.displayName || me.mail || me.userPrincipalName || 'Outlook User',
  };
}

async function refreshAccessToken(provider, refreshToken) {
  const config = getProviderConfig(provider);
  if (!config) throw new Error('Unsupported provider');

  if (!refreshToken) {
    throw new Error('Missing refresh token');
  }

  if (!config.clientId || !config.clientSecret) {
    return {
      access_token: `${provider}-demo-access-token-refreshed`,
      refresh_token: refreshToken,
      expires_in: 3600,
    };
  }

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const tokenResponse = await fetchWithRetry(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!tokenResponse.ok) {
    const text = await tokenResponse.text();
    throw new Error(`Token refresh failed (${tokenResponse.status}): ${text.slice(0, 220)}`);
  }

  return tokenResponse.json();
}

async function maybeRefreshProviderAccessToken(provider, refreshContext) {
  const { accessToken, refreshToken, expiresAt } = refreshContext;
  if (!accessToken) {
    throw new Error('Missing bearer token');
  }

  if (!refreshToken || !isTokenExpiringSoon(expiresAt)) {
    return {
      accessToken,
      refreshToken,
      expiresAt: expiresAt || null,
      refreshed: false,
    };
  }

  const refreshed = await refreshAccessToken(provider, refreshToken);
  const next = {
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token || refreshToken,
    expiresAt: refreshed.expires_in ? new Date(Date.now() + Number(refreshed.expires_in) * 1000).toISOString() : expiresAt || null,
    refreshed: true,
  };

  pushLimited(tokenRefreshEvents, {
    provider,
    at: nowIso(),
    status: 'success',
    accessTokenPreview: maskToken(next.accessToken),
    refreshTokenPreview: maskToken(next.refreshToken),
  });

  return next;
}

async function withProviderAccess(provider, refreshContext, action) {
  let auth = await maybeRefreshProviderAccessToken(provider, refreshContext);

  try {
    return { result: await action(auth.accessToken), auth };
  } catch (error) {
    const message = String(error?.message || '');
    const canRetry = Boolean(refreshContext.refreshToken) && /Provider request failed \((401|403)\)/.test(message) && !auth.refreshed;

    if (!canRetry) {
      if (message.toLowerCase().includes('refresh')) {
        pushLimited(tokenRefreshEvents, {
          provider,
          at: nowIso(),
          status: 'failed',
          error: message,
        });
      }
      throw error;
    }

    try {
      auth = await maybeRefreshProviderAccessToken(provider, {
        ...refreshContext,
        expiresAt: nowIso(),
      });
      return { result: await action(auth.accessToken), auth };
    } catch (refreshError) {
      pushLimited(tokenRefreshEvents, {
        provider,
        at: nowIso(),
        status: 'failed',
        error: String(refreshError?.message || refreshError),
      });
      throw refreshError;
    }
  }
}

function buildWebhookStats() {
  const accepted = webhookEvents.filter(event => event.status === 'accepted').length;
  const rejected = webhookEvents.filter(event => event.status === 'rejected').length;
  return {
    total: webhookEvents.length,
    accepted,
    rejected,
    byProvider: {
      gmail: webhookEvents.filter(event => event.provider === 'gmail').length,
      outlook: webhookEvents.filter(event => event.provider === 'outlook').length,
    },
  };
}

function buildTokenRefreshStats() {
  return {
    total: tokenRefreshEvents.length,
    success: tokenRefreshEvents.filter(event => event.status === 'success').length,
    failed: tokenRefreshEvents.filter(event => event.status === 'failed').length,
    recent: tokenRefreshEvents.slice(-12).reverse(),
  };
}

function extractOutlookClientState(payload) {
  if (payload?.clientState) return String(payload.clientState);
  if (Array.isArray(payload?.value) && payload.value[0]?.clientState) {
    return String(payload.value[0].clientState);
  }
  return '';
}

function recordWebhookEvent(provider, status, details = {}) {
  pushLimited(webhookEvents, {
    provider,
    status,
    at: nowIso(),
    ...details,
  });
}

async function listFolders(provider, accessToken) {
  if (provider === 'gmail') {
    const data = await providerFetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', accessToken);
    const labels = Array.isArray(data.labels) ? data.labels : [];

    return labels.map(label => {
      const mappedName = {
        INBOX: 'Boite de reception',
        SENT: 'Envoyes',
        DRAFT: 'Brouillons',
        TRASH: 'Corbeille',
        STARRED: 'Favoris',
      }[label.id] || label.name;

      const mappedType = {
        INBOX: 'inbox',
        SENT: 'sent',
        DRAFT: 'drafts',
        TRASH: 'trash',
        STARRED: 'starred',
      }[label.id] || folderTypeFromName(label.name);

      return {
        id: label.id,
        providerFolderId: label.id,
        name: mappedName,
        type: mappedType,
        unreadCount: Number(label.messagesUnread || 0),
      };
    });
  }

  const data = await providerFetch('https://graph.microsoft.com/v1.0/me/mailFolders?$top=60&$select=id,displayName,unreadItemCount', accessToken);
  const folders = Array.isArray(data.value) ? data.value : [];
  return folders.map(folder => ({
    id: folder.id,
    providerFolderId: folder.id,
    name: folder.displayName,
    type: folderTypeFromName(folder.displayName),
    unreadCount: Number(folder.unreadItemCount || 0),
  }));
}

async function listMessages(provider, accessToken, folderId, cursor, pageSize) {
  const limit = Math.max(1, Math.min(Number(pageSize || 20), 50));

  if (provider === 'gmail') {
    const qs = new URLSearchParams();
    qs.set('maxResults', String(limit));
    if (cursor) qs.set('pageToken', cursor);
    if (folderId) qs.append('labelIds', folderId);

    const data = await providerFetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${qs.toString()}`, accessToken);
    const entries = Array.isArray(data.messages) ? data.messages : [];

    const details = [];
    for (const item of entries) {
      const detail = await providerFetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=full`, accessToken);
      details.push(detail);
    }

    const messages = details.map(detail => {
      const headers = detail.payload?.headers || [];
      const bodies = extractGmailBodies(detail.payload || {});
      return {
        id: detail.id,
        providerMessageId: detail.id,
        threadId: detail.threadId,
        from: getHeader(headers, 'From') || 'Unknown',
        to: String(getHeader(headers, 'To') || '').split(',').map(v => v.trim()).filter(Boolean),
        cc: String(getHeader(headers, 'Cc') || '').split(',').map(v => v.trim()).filter(Boolean),
        subject: getHeader(headers, 'Subject') || '(Sans objet)',
        snippet: detail.snippet || '',
        htmlBody: bodies.htmlBody || `<p>${detail.snippet || ''}</p>`,
        textBody: bodies.textBody || detail.snippet || '',
        receivedAt: detail.internalDate ? new Date(Number(detail.internalDate)).toISOString() : new Date().toISOString(),
        isRead: !(Array.isArray(detail.labelIds) && detail.labelIds.includes('UNREAD')),
        isStarred: Array.isArray(detail.labelIds) && detail.labelIds.includes('STARRED'),
        attachments: bodies.attachments,
      };
    });

    return {
      messages,
      nextCursor: data.nextPageToken || null,
    };
  }

  const endpoint = cursor
    ? cursor
    : `https://graph.microsoft.com/v1.0/me/mailFolders/${encodeURIComponent(folderId)}/messages?$top=${limit}&$select=id,conversationId,subject,bodyPreview,receivedDateTime,isRead,importance,hasAttachments,from,toRecipients,ccRecipients,body`;

  const data = await providerFetch(endpoint, accessToken);
  const entries = Array.isArray(data.value) ? data.value : [];

  const messages = entries.map(item => ({
    id: item.id,
    providerMessageId: item.id,
    threadId: item.conversationId,
    from: item.from?.emailAddress?.address || 'Unknown',
    to: Array.isArray(item.toRecipients) ? item.toRecipients.map(v => v.emailAddress?.address).filter(Boolean) : [],
    cc: Array.isArray(item.ccRecipients) ? item.ccRecipients.map(v => v.emailAddress?.address).filter(Boolean) : [],
    subject: item.subject || '(Sans objet)',
    snippet: item.bodyPreview || '',
    htmlBody: item.body?.contentType === 'html' ? item.body.content : `<pre>${item.body?.content || item.bodyPreview || ''}</pre>`,
    textBody: item.bodyPreview || '',
    receivedAt: item.receivedDateTime || new Date().toISOString(),
    isRead: Boolean(item.isRead),
    isStarred: item.importance === 'high',
    attachments: item.hasAttachments
      ? [{ id: `${item.id}-att`, fileName: 'Pieces jointes Outlook', mimeType: 'application/octet-stream', size: 0, source: 'remote' }]
      : [],
  }));

  return {
    messages,
    nextCursor: data['@odata.nextLink'] || null,
  };
}

async function sendMessage(provider, accessToken, payload) {
  const to = Array.isArray(payload.to) ? payload.to : [];
  const cc = Array.isArray(payload.cc) ? payload.cc : [];
  const subject = String(payload.subject || '(Sans objet)');
  const htmlBody = String(payload.htmlBody || '');

  if (provider === 'gmail') {
    const headers = [
      `To: ${to.join(', ')}`,
      cc.length ? `Cc: ${cc.join(', ')}` : null,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      htmlBody,
    ].filter(Boolean).join('\r\n');

    const raw = base64Url(headers);

    const response = await fetchWithRetry('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gmail send failed (${response.status}): ${text.slice(0, 220)}`);
    }

    return response.json();
  }

  const message = {
    subject,
    body: {
      contentType: 'HTML',
      content: htmlBody,
    },
    toRecipients: to.map(address => ({ emailAddress: { address } })),
    ccRecipients: cc.map(address => ({ emailAddress: { address } })),
  };

  const response = await fetchWithRetry('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, saveToSentItems: true }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Outlook send failed (${response.status}): ${text.slice(0, 220)}`);
  }

  return { ok: true };
}

function buildOAuthStartUrl(provider, state, redirectUri) {
  const config = getProviderConfig(provider);
  if (!config) throw new Error('Unsupported provider');

  if (!config.clientId || !config.clientSecret) {
    const localUrl = new URL(`${FRONTEND_URL}/communications/email-center`);
    localUrl.searchParams.set('email_oauth_provider', provider);
    localUrl.searchParams.set('code', `demo-${provider}-code`);
    localUrl.searchParams.set('state', state || randomState());
    return localUrl.toString();
  }

  const url = new URL(config.authUrl);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', config.scopes.join(' '));
  url.searchParams.set('state', state);

  if (provider === 'gmail') {
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
  }

  return url.toString();
}

function routeParts(pathname) {
  return pathname.split('/').filter(Boolean);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders());
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;
    const parts = routeParts(pathname);

    if (req.method === 'GET' && pathname === '/health') {
      json(res, 200, { ok: true, service: 'email-center-api' });
      return;
    }

    if (req.method === 'GET' && pathname === '/admin/overview') {
      if (!isAdminAuthorized(req)) {
        json(res, 401, { error: 'Unauthorized admin access' });
        return;
      }

      json(res, 200, {
        ok: true,
        service: 'email-center-api',
        generatedAt: nowIso(),
        uptimeSeconds: Math.round(process.uptime()),
        oauthStatesPending: stateStore.size,
        webhookStats: buildWebhookStats(),
        tokenRefreshStats: buildTokenRefreshStats(),
        providerConfig: {
          gmail: {
            oauthConfigured: Boolean(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET),
            webhookSecretConfigured: getWebhookSecrets('gmail').length > 0,
            webhookSecretCount: getWebhookSecrets('gmail').length,
          },
          outlook: {
            oauthConfigured: Boolean(process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET),
            webhookSecretConfigured: getWebhookSecrets('outlook').length > 0,
            webhookSecretCount: getWebhookSecrets('outlook').length,
            clientStateConfigured: Boolean(OUTLOOK_WEBHOOK_CLIENT_STATE),
          },
        },
        adminAuthConfigured: Boolean(EMAIL_CENTER_ADMIN_TOKEN),
        recentWebhooks: webhookEvents.slice(-12).reverse(),
      });
      return;
    }

    if (req.method === 'GET' && pathname === '/accounts') {
      const userId = String(url.searchParams.get('userId') || '');
      const accounts = Array.from(managedAccounts.values())
        .filter(account => !userId || account.userId === userId)
        .map(account => ({
          id: account.id,
          userId: account.userId,
          provider: account.provider,
          emailAddress: account.emailAddress,
          displayName: account.displayName,
          connectedAt: account.connectedAt,
          lastSyncAt: account.lastSyncAt,
          unreadCount: account.unreadCount,
        }));
      json(res, 200, { accounts });
      return;
    }

    if (req.method === 'POST' && pathname === '/accounts/upsert') {
      const { data: payload } = await parseBody(req);
      const normalized = normalizeManagedAccount(payload);

      if (!managedAccountIsValid(normalized)) {
        json(res, 400, { error: 'Invalid managed account payload' });
        return;
      }

      const existing = managedAccounts.get(normalized.id);
      const merged = {
        ...existing,
        ...normalized,
        folders: existing?.folders || normalized.folders,
        messagesByFolder: existing?.messagesByFolder || normalized.messagesByFolder,
        unreadCount: Number(existing?.unreadCount || normalized.unreadCount || 0),
      };

      managedAccounts.set(merged.id, merged);
      emitToUser(merged.userId, 'email:center:account-updated', {
        accountId: merged.id,
        provider: merged.provider,
        emailAddress: merged.emailAddress,
      });

      // Immediate sync on registration to warm cache and emit initial unread counts.
      syncManagedAccount(merged, 'register').catch(() => {});

      json(res, 200, { ok: true, accountId: merged.id });
      return;
    }

    if (req.method === 'DELETE' && parts.length === 2 && parts[0] === 'accounts') {
      const accountId = parts[1];
      const existing = managedAccounts.get(accountId);
      managedAccounts.delete(accountId);
      if (existing) {
        emitToUser(existing.userId, 'email:center:account-removed', { accountId });
      }
      json(res, 200, { ok: true });
      return;
    }

    if (req.method === 'POST' && pathname === '/accounts/sync') {
      const { data: payload } = await parseBody(req);
      const accountId = String(payload.accountId || '');
      const userId = String(payload.userId || '');

      if (accountId && managedAccounts.has(accountId)) {
        await syncManagedAccount(managedAccounts.get(accountId), 'manual');
        json(res, 200, { ok: true, scope: 'account' });
        return;
      }

      const accounts = Array.from(managedAccounts.values()).filter(account => !userId || account.userId === userId);
      for (const account of accounts) {
        await syncManagedAccount(account, 'manual');
      }
      json(res, 200, { ok: true, scope: userId ? 'user' : 'all', total: accounts.length });
      return;
    }

    if (req.method === 'GET' && parts.length === 3 && parts[0] === 'oauth' && isProvider(parts[1]) && parts[2] === 'start') {
      const provider = parts[1];
      const state = url.searchParams.get('state') || randomState();
      const redirectUri = url.searchParams.get('redirect_uri') || `${FRONTEND_URL}/communications/email-center`;
      stateStore.set(state, { provider, redirectUri, createdAt: Date.now() });
      const authUrl = buildOAuthStartUrl(provider, state, redirectUri);
      redirect(res, authUrl);
      return;
    }

    if (req.method === 'POST' && parts.length === 3 && parts[0] === 'oauth' && isProvider(parts[1]) && parts[2] === 'callback') {
      const provider = parts[1];
      const { data: payload } = await parseBody(req);
      const state = String(payload.state || '');
      const code = String(payload.code || '');
      const redirectUri = String(payload.redirectUri || payload.redirect_uri || `${FRONTEND_URL}/communications/email-center`);

      if (!code) {
        json(res, 400, { error: 'Missing code' });
        return;
      }

      if (stateStore.has(state)) {
        stateStore.delete(state);
      }

      const exchanged = await exchangeOAuthCode(provider, code, redirectUri);
      json(res, 200, {
        access_token: exchanged.access_token,
        refresh_token: exchanged.refresh_token,
        expires_at: exchanged.expires_in ? new Date(Date.now() + Number(exchanged.expires_in) * 1000).toISOString() : null,
        email: exchanged.email,
        display_name: exchanged.display_name,
      });
      return;
    }

    if (req.method === 'GET' && parts.length === 3 && parts[0] === 'providers' && isProvider(parts[1]) && parts[2] === 'folders') {
      const provider = parts[1];
      const { result: folders, auth } = await withProviderAccess(provider, getRefreshContext(req), accessToken => listFolders(provider, accessToken));
      setAuthRefreshHeaders(res, auth.refreshed ? auth : null);
      json(res, 200, { folders });
      return;
    }

    if (req.method === 'GET' && parts.length === 3 && parts[0] === 'providers' && isProvider(parts[1]) && parts[2] === 'messages') {
      const provider = parts[1];
      const folderId = String(url.searchParams.get('folderId') || 'INBOX');
      const cursor = url.searchParams.get('cursor') || null;
      const pageSize = Number(url.searchParams.get('pageSize') || 20);

      const { result, auth } = await withProviderAccess(provider, getRefreshContext(req), accessToken => listMessages(provider, accessToken, folderId, cursor, pageSize));
      setAuthRefreshHeaders(res, auth.refreshed ? auth : null);
      json(res, 200, result);
      return;
    }

    if (req.method === 'POST' && parts.length === 3 && parts[0] === 'providers' && isProvider(parts[1]) && parts[2] === 'send') {
      const provider = parts[1];
      const { data: payload } = await parseBody(req);
      const { result: sent, auth } = await withProviderAccess(provider, getRefreshContext(req), accessToken => sendMessage(provider, accessToken, payload));
      setAuthRefreshHeaders(res, auth.refreshed ? auth : null);
      json(res, 200, { ok: true, sent });
      return;
    }

    if (req.method === 'POST' && parts.length === 4 && parts[0] === 'oauth' && isProvider(parts[1]) && parts[2] === 'token' && parts[3] === 'refresh') {
      const provider = parts[1];
      const { data: payload } = await parseBody(req);
      const refreshToken = String(payload.refresh_token || payload.refreshToken || '');
      const refreshed = await refreshAccessToken(provider, refreshToken);
      const responseBody = {
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token || refreshToken,
        expires_at: refreshed.expires_in ? new Date(Date.now() + Number(refreshed.expires_in) * 1000).toISOString() : null,
      };
      pushLimited(tokenRefreshEvents, {
        provider,
        at: nowIso(),
        status: 'success',
        accessTokenPreview: maskToken(responseBody.access_token),
        refreshTokenPreview: maskToken(responseBody.refresh_token),
      });
      json(res, 200, responseBody);
      return;
    }

    if (req.method === 'GET' && pathname === '/webhooks/outlook') {
      const validationToken = url.searchParams.get('validationToken');
      if (validationToken) {
        sendPlainText(res, 200, validationToken);
        return;
      }
    }

    if (req.method === 'POST' && pathname === '/webhooks/gmail') {
      const { data: payload, raw } = await parseBody(req);
      const signature = String(req.headers['x-ivos-signature'] || req.headers['x-hub-signature-256'] || '');
      const valid = hasValidHmacSignature(raw, signature, getWebhookSecrets('gmail'));
      if (!valid) {
        recordWebhookEvent('gmail', 'rejected', { reason: 'invalid_signature' });
        json(res, 401, { error: 'Invalid webhook signature' });
        return;
      }
      recordWebhookEvent('gmail', 'accepted', { payload });
      syncManagedAccountsByProvider('gmail', 'webhook').catch(() => {});
      json(res, 200, { ok: true });
      return;
    }

    if (req.method === 'POST' && pathname === '/webhooks/outlook') {
      const { data: payload, raw } = await parseBody(req);
      const signature = String(req.headers['x-ivos-signature'] || req.headers['x-hub-signature-256'] || '');
      const validSignature = hasValidHmacSignature(raw, signature, getWebhookSecrets('outlook'));
      const clientState = extractOutlookClientState(payload);
      const validClientState = !OUTLOOK_WEBHOOK_CLIENT_STATE || clientState === OUTLOOK_WEBHOOK_CLIENT_STATE;

      if (!validSignature || !validClientState) {
        recordWebhookEvent('outlook', 'rejected', {
          reason: !validSignature ? 'invalid_signature' : 'invalid_client_state',
        });
        json(res, 401, { error: 'Webhook verification failed' });
        return;
      }

      recordWebhookEvent('outlook', 'accepted', { payload, clientState });
      syncManagedAccountsByProvider('outlook', 'webhook').catch(() => {});
      json(res, 200, { ok: true });
      return;
    }

    if (req.method === 'GET' && pathname === '/webhooks/events') {
      json(res, 200, { events: webhookEvents.slice(-100) });
      return;
    }

    json(res, 404, { error: 'Not found' });
  } catch (error) {
    json(res, 500, { error: (error && error.message) || 'Internal error' });
  }
});

server.listen(PORT, () => {
  console.log(`[email-center-api] running on http://localhost:${PORT}`);
  setInterval(() => {
    syncAllManagedAccounts('cron').catch(() => {});
  }, Math.max(120000, SYNC_INTERVAL_MS));
});

io = new SocketIOServer(server, {
  cors: {
    origin: process.env.EMAIL_CENTER_CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', socket => {
  const userId = String(socket.handshake.auth?.userId || socket.handshake.query?.userId || '');
  if (userId) {
    socket.join(`user:${userId}`);
  }

  socket.emit('email:center:connected', {
    ok: true,
    userId,
    at: nowIso(),
  });
});
