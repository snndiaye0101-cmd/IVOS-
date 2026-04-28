import { supabase } from '@shared/services/supabaseClient';
import { readCache, writeAccountFolders, writeFolderMessages } from './emailCache';
import type {
  EmailBackendOverview,
  ComposePayload,
  EmailAttachment,
  EmailFolder,
  EmailFolderType,
  EmailFoldersResponse,
  EmailMessage,
  LinkedEmailAccount,
  PagedMessagesResponse,
} from './types';

const ACCOUNTS_KEY = 'ivos_email_accounts_v1';
const CURSORS_KEY = 'ivos_email_cursors_v1';
const EMAIL_BACKEND_URL = import.meta.env.VITE_EMAIL_CENTER_BACKEND_URL || '';
const EMAIL_CENTER_ADMIN_TOKEN = import.meta.env.VITE_EMAIL_CENTER_ADMIN_TOKEN || '';
const EMAIL_SYNC_INTERVAL_MS = 3 * 60 * 1000;
const EMAIL_CENTER_SYNC_EVENT = 'ivos_email_center_change';
const EMAIL_CENTER_UNREAD_EVENT = 'ivos_email_unread_change';

let backgroundTimer: number | null = null;
let messageCursors: Record<string, string | null> = {};

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 11)}-${Date.now()}`;
}

function normalizeFolders(accountId: string): EmailFolder[] {
  const base: Array<{ name: string; type: EmailFolderType }> = [
    { name: 'Boite de reception', type: 'inbox' },
    { name: 'Envoyes', type: 'sent' },
    { name: 'Brouillons', type: 'drafts' },
    { name: 'Corbeille', type: 'trash' },
    { name: 'Favoris', type: 'starred' },
  ];

  return base.map(folder => ({
    id: `${accountId}-${folder.type}`,
    accountId,
    providerFolderId: folder.type,
    name: folder.name,
    type: folder.type,
    unreadCount: folder.type === 'inbox' ? 4 : 0,
  }));
}

function fallbackMessages(accountId: string, folderId: string): EmailMessage[] {
  const now = Date.now();

  const attachments: EmailAttachment[] = [
    {
      id: uid('att'),
      fileName: 'facture-AVR-2026.pdf',
      mimeType: 'application/pdf',
      size: 245_000,
      source: 'remote',
    },
  ];

  return [
    {
      id: uid('msg'),
      accountId,
      folderId,
      providerMessageId: uid('provider'),
      threadId: uid('thread'),
      from: 'dispatch@client-logistique.sn',
      to: ['operations@ivos.sn'],
      cc: [],
      subject: 'Urgent - DK-1234-AB mission de nuit',
      snippet: 'Merci de confirmer la disponibilite du vehicule DK-1234-AB pour la mission...',
      htmlBody: '<p>Bonjour equipe IVOS,</p><p>Merci de confirmer la disponibilite du vehicule <strong>DK-1234-AB</strong> pour la mission de cette nuit.</p><p>Cordialement,<br/>Client Logistique</p>',
      textBody: 'Bonjour equipe IVOS, merci de confirmer la disponibilite du vehicule DK-1234-AB.',
      receivedAt: new Date(now - 1000 * 60 * 22).toISOString(),
      isRead: false,
      isStarred: true,
      attachments,
    },
    {
      id: uid('msg'),
      accountId,
      folderId,
      providerMessageId: uid('provider'),
      threadId: uid('thread'),
      from: 'finance@partner.sn',
      to: ['operations@ivos.sn'],
      cc: ['facturation@ivos.sn'],
      subject: 'Suivi facture Avril 2026',
      snippet: 'Pouvez-vous nous partager le statut de paiement pour la facture AV-2026-14 ?',
      htmlBody: '<p>Bonjour,</p><p>Pouvez-vous nous partager le statut de paiement pour la facture AV-2026-14 ?</p>',
      textBody: 'Suivi facture Avril 2026',
      receivedAt: new Date(now - 1000 * 60 * 160).toISOString(),
      isRead: true,
      isStarred: false,
      attachments: [],
    },
  ];
}

function loadAccounts(): LinkedEmailAccount[] {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAccounts(accounts: LinkedEmailAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function replaceStoredAccount(accountId: string, updater: (account: LinkedEmailAccount) => LinkedEmailAccount) {
  const next = loadAccounts().map(account => (
    account.id === accountId ? updater(account) : account
  ));
  saveAccounts(next);
}

function loadCursors() {
  try {
    messageCursors = JSON.parse(localStorage.getItem(CURSORS_KEY) || '{}');
  } catch {
    messageCursors = {};
  }
}

function persistCursors() {
  localStorage.setItem(CURSORS_KEY, JSON.stringify(messageCursors));
}

function updateAccountSyncDate(accountId: string) {
  const all = loadAccounts();
  const next = all.map(account => (
    account.id === accountId
      ? { ...account, lastSyncAt: new Date().toISOString() }
      : account
  ));
  saveAccounts(next);
}

function notifyEmailSyncChanged(userId?: string) {
  window.dispatchEvent(new CustomEvent(EMAIL_CENTER_SYNC_EVENT, {
    detail: {
      at: new Date().toISOString(),
      userId: userId || '',
    },
  }));
}

function notifyUnreadChanged(userId?: string, unread = 0) {
  window.dispatchEvent(new CustomEvent(EMAIL_CENTER_UNREAD_EVENT, {
    detail: {
      at: new Date().toISOString(),
      userId: userId || '',
      unread,
    },
  }));
}

function hasRemoteApi(account: LinkedEmailAccount): boolean {
  return Boolean(EMAIL_BACKEND_URL && account.accessToken);
}

function shouldRetryStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

async function wait(ms: number) {
  await new Promise(resolve => window.setTimeout(resolve, ms));
}

async function fetchWithRetry(input: string, init?: RequestInit, retries = 2): Promise<Response> {
  let lastError: unknown;
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(input, init);
      lastResponse = response;
      if (!shouldRetryStatus(response.status) || attempt === retries) {
        return response;
      }
    } catch (error) {
      lastError = error;
      if (attempt === retries) throw error;
    }

    await wait(250 * 2 ** attempt);
  }

  if (lastResponse) return lastResponse;
  throw lastError instanceof Error ? lastError : new Error('Email API unreachable');
}

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetchWithRetry(input, init);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Email API ${response.status}: ${text.slice(0, 220)}`);
  }
  return response.json() as Promise<T>;
}

async function fetchRemoteJsonForAccount<T>(account: LinkedEmailAccount, input: string, init?: RequestInit): Promise<T> {
  const response = await fetchWithRetry(input, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${account.accessToken}`,
      'X-Refresh-Token': account.refreshToken || '',
      'X-Token-Expires-At': account.expiresAt || '',
      ...(init?.headers || {}),
    },
  });

  const refreshedAccessToken = response.headers.get('X-Email-Center-Access-Token');
  if (response.ok && refreshedAccessToken) {
    const refreshedRefreshToken = response.headers.get('X-Email-Center-Refresh-Token') || account.refreshToken;
    const refreshedExpiresAt = response.headers.get('X-Email-Center-Expires-At') || account.expiresAt;
    replaceStoredAccount(account.id, current => ({
      ...current,
      accessToken: refreshedAccessToken,
      refreshToken: refreshedRefreshToken || undefined,
      expiresAt: refreshedExpiresAt || undefined,
      lastSyncAt: new Date().toISOString(),
    }));
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Email API ${response.status}: ${text.slice(0, 220)}`);
  }

  return response.json() as Promise<T>;
}

function mapFolder(accountId: string, folder: EmailFoldersResponse['folders'][number]): EmailFolder {
  return {
    id: `${accountId}-${folder.providerFolderId || folder.id}`,
    accountId,
    providerFolderId: folder.providerFolderId || folder.id,
    name: folder.name,
    type: folder.type,
    unreadCount: Number(folder.unreadCount || 0),
  };
}

function mapMessage(accountId: string, folderId: string, message: PagedMessagesResponse['messages'][number]): EmailMessage {
  return {
    id: message.id,
    accountId,
    folderId,
    providerMessageId: message.providerMessageId,
    threadId: message.threadId,
    from: message.from,
    to: message.to,
    cc: message.cc,
    subject: message.subject,
    snippet: message.snippet,
    htmlBody: message.htmlBody,
    textBody: message.textBody,
    receivedAt: message.receivedAt,
    isRead: Boolean(message.isRead),
    isStarred: Boolean(message.isStarred),
    attachments: message.attachments || [],
  };
}

async function fetchRemoteFolders(account: LinkedEmailAccount): Promise<EmailFolder[]> {
  const data = await fetchRemoteJsonForAccount<EmailFoldersResponse>(account, `${EMAIL_BACKEND_URL}/providers/${account.provider}/folders`);

  return (data.folders || []).map(folder => mapFolder(account.id, folder));
}

async function fetchRemoteMessagesPage(account: LinkedEmailAccount, folder: EmailFolder, cursor: string | null, pageSize = 20): Promise<{ messages: EmailMessage[]; nextCursor: string | null }> {
  const qs = new URLSearchParams();
  qs.set('folderId', folder.providerFolderId || folder.type);
  qs.set('pageSize', String(pageSize));
  if (cursor) qs.set('cursor', cursor);

  const data = await fetchRemoteJsonForAccount<PagedMessagesResponse>(account, `${EMAIL_BACKEND_URL}/providers/${account.provider}/messages?${qs.toString()}`);

  return {
    messages: (data.messages || []).map(message => mapMessage(account.id, folder.id, message)),
    nextCursor: data.nextCursor || null,
  };
}

loadCursors();

export const emailSyncService = {
  loadLinkedAccounts(userId: string): LinkedEmailAccount[] {
    return loadAccounts().filter(account => account.userId === userId);
  },

  upsertLinkedAccount(account: LinkedEmailAccount) {
    const all = loadAccounts();
    const index = all.findIndex(a => a.id === account.id);
    if (index >= 0) {
      all[index] = account;
    } else {
      all.push(account);
    }
    saveAccounts(all);
    notifyEmailSyncChanged(account.userId);
  },

  removeAccount(accountId: string) {
    const previous = loadAccounts().find(a => a.id === accountId);
    saveAccounts(loadAccounts().filter(a => a.id !== accountId));
    notifyEmailSyncChanged(previous?.userId);
  },

  async syncAccount(account: LinkedEmailAccount): Promise<{ folders: EmailFolder[]; messagesByFolder: Record<string, EmailMessage[]> }> {
    let folders: EmailFolder[];
    if (hasRemoteApi(account)) {
      try {
        folders = await fetchRemoteFolders(account);
      } catch {
        folders = normalizeFolders(account.id);
      }
    } else {
      folders = normalizeFolders(account.id);
    }

    writeAccountFolders(account.id, folders);

    const messagesByFolder: Record<string, EmailMessage[]> = {};

    for (const folder of folders) {
      if (hasRemoteApi(account)) {
        try {
          const page = await fetchRemoteMessagesPage(account, folder, null, 20);
          messagesByFolder[folder.id] = page.messages;
          writeFolderMessages(folder.id, page.messages);
          messageCursors[folder.id] = page.nextCursor;
          continue;
        } catch {
          // fallback local demo below
        }
      }

      const fallback = fallbackMessages(account.id, folder.id);
      messagesByFolder[folder.id] = fallback;
      writeFolderMessages(folder.id, fallback);
      messageCursors[folder.id] = null;
    }

    persistCursors();
    updateAccountSyncDate(account.id);
    notifyEmailSyncChanged(account.userId);
    notifyUnreadChanged(account.userId, this.getTotalUnreadCount(account.userId));
    return { folders, messagesByFolder };
  },

  startBackgroundSync(accounts: LinkedEmailAccount[], onTick?: () => void) {
    if (backgroundTimer) {
      window.clearInterval(backgroundTimer);
      backgroundTimer = null;
    }

    const run = async () => {
      for (const account of accounts) {
        try {
          await this.syncAccount(account);
        } catch {
          // keep sync loop resilient
        }
      }
      onTick?.();
    };

    run();
    backgroundTimer = window.setInterval(run, EMAIL_SYNC_INTERVAL_MS);
  },

  stopBackgroundSync() {
    if (backgroundTimer) {
      window.clearInterval(backgroundTimer);
      backgroundTimer = null;
    }
  },

  getFolders(accountId: string): EmailFolder[] {
    const cache = readCache();
    return cache.foldersByAccount[accountId] || [];
  },

  getMessages(folderId: string): EmailMessage[] {
    const cache = readCache();
    return cache.messagesByFolder[folderId] || [];
  },

  getNextCursor(folderId: string): string | null {
    return messageCursors[folderId] || null;
  },

  async loadMoreMessages(account: LinkedEmailAccount, folderId: string): Promise<EmailMessage[]> {
    const cursor = messageCursors[folderId] || null;
    if (!cursor || !hasRemoteApi(account)) {
      return this.getMessages(folderId);
    }

    const folders = this.getFolders(account.id);
    const folder = folders.find(item => item.id === folderId);
    if (!folder) return this.getMessages(folderId);

    const page = await fetchRemoteMessagesPage(account, folder, cursor, 20);
    const current = this.getMessages(folderId);
    const merged = [...current, ...page.messages.filter(msg => !current.some(existing => existing.id === msg.id))];
    writeFolderMessages(folderId, merged);
    messageCursors[folderId] = page.nextCursor;
    persistCursors();
    return merged;
  },

  async sendEmail(payload: ComposePayload): Promise<EmailMessage> {
    const all = loadAccounts();
    const account = all.find(item => item.id === payload.accountId);

    if (account && hasRemoteApi(account)) {
      await fetchRemoteJsonForAccount(account, `${EMAIL_BACKEND_URL}/providers/${account.provider}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    }

    const folderId = `${payload.accountId}-sent`;
    const message: EmailMessage = {
      id: uid('sent'),
      accountId: payload.accountId,
      folderId,
      providerMessageId: uid('provider-sent'),
      threadId: uid('thread-sent'),
      from: account?.emailAddress || 'you@ivos.sn',
      to: payload.to,
      cc: payload.cc,
      subject: payload.subject,
      snippet: payload.htmlBody.replace(/<[^>]+>/g, '').slice(0, 120),
      htmlBody: payload.htmlBody,
      textBody: payload.htmlBody.replace(/<[^>]+>/g, ''),
      receivedAt: new Date().toISOString(),
      isRead: true,
      isStarred: false,
      attachments: payload.attachments,
    };

    const current = this.getMessages(folderId);
    writeFolderMessages(folderId, [message, ...current]);
    return message;
  },

  async markAsRead(message: EmailMessage, isRead: boolean): Promise<void> {
    const current = this.getMessages(message.folderId);
    const next = current.map(item => (
      item.id === message.id ? { ...item, isRead } : item
    ));
    writeFolderMessages(message.folderId, next);

    const all = loadAccounts();
    const account = all.find(item => item.id === message.accountId);
    if (account) {
      const accountFolders = this.getFolders(account.id);
      const folder = accountFolders.find(item => item.id === message.folderId);
      if (folder) {
        const unread = next.filter(item => !item.isRead).length;
        const nextFolders = accountFolders.map(item => (
          item.id === folder.id ? { ...item, unreadCount: unread } : item
        ));
        writeAccountFolders(account.id, nextFolders);
      }
      notifyUnreadChanged(account.userId, this.getTotalUnreadCount(account.userId));
    }

    notifyEmailSyncChanged(account?.userId);
  },

  async saveLinkedAccountToSupabase(account: LinkedEmailAccount): Promise<void> {
    try {
      await supabase.from('email_accounts').upsert({
        id: account.id,
        user_id: account.userId,
        provider: account.provider,
        email_address: account.emailAddress,
        display_name: account.displayName,
        access_token: account.accessToken,
        refresh_token: account.refreshToken || null,
        expires_at: account.expiresAt || null,
        connected_at: account.connectedAt,
        last_sync_at: account.lastSyncAt || null,
      });
    } catch {
      // local-first fallback
    }
  },

  async registerAccountForBackgroundSync(account: LinkedEmailAccount): Promise<void> {
    if (!EMAIL_BACKEND_URL) return;
    try {
      await fetchJson<{ ok: boolean }>(`${EMAIL_BACKEND_URL}/accounts/upsert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(account),
      });
    } catch {
      // Keep local-first behavior if backend registration fails.
    }
  },

  async unregisterAccountFromBackgroundSync(accountId: string): Promise<void> {
    if (!EMAIL_BACKEND_URL) return;
    try {
      await fetchWithRetry(`${EMAIL_BACKEND_URL}/accounts/${encodeURIComponent(accountId)}`, {
        method: 'DELETE',
      });
    } catch {
      // Keep local-first behavior if backend registration fails.
    }
  },

  getTotalUnreadCount(userId: string): number {
    if (!userId) return 0;
    const accounts = this.loadLinkedAccounts(userId);
    let total = 0;
    for (const account of accounts) {
      const folders = this.getFolders(account.id);
      const inbox = folders.find(folder => folder.type === 'inbox');
      total += Number(inbox?.unreadCount || 0);
    }
    return total;
  },

  getSyncEventName(): string {
    return EMAIL_CENTER_SYNC_EVENT;
  },

  getUnreadEventName(): string {
    return EMAIL_CENTER_UNREAD_EVENT;
  },

  async getBackendOverview(): Promise<EmailBackendOverview | null> {
    if (!EMAIL_BACKEND_URL) return null;
    return fetchJson<EmailBackendOverview>(`${EMAIL_BACKEND_URL}/admin/overview`, {
      headers: {
        Accept: 'application/json',
        ...(EMAIL_CENTER_ADMIN_TOKEN ? { 'X-Admin-Token': EMAIL_CENTER_ADMIN_TOKEN } : {}),
      },
    });
  },
};
