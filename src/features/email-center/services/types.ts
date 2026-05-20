export type EmailProvider = 'gmail' | 'outlook';

export type EmailFolderType = 'inbox' | 'sent' | 'drafts' | 'trash' | 'starred' | 'custom';

export interface LinkedEmailAccount {
  id: string;
  userId: string;
  provider: EmailProvider;
  emailAddress: string;
  displayName: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  connectedAt: string;
  lastSyncAt?: string;
}

export interface EmailFolder {
  id: string;
  accountId: string;
  providerFolderId: string;
  name: string;
  type: EmailFolderType;
  unreadCount: number;
}

export interface EmailFoldersResponse {
  folders: Array<
    Omit<EmailFolder, 'accountId'> & {
      providerFolderId?: string;
    }
  >;
}

export interface EmailAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  downloadUrl?: string;
  source: 'remote' | 'ivos' | 'upload';
}

export interface EmailMessage {
  id: string;
  accountId: string;
  folderId: string;
  providerMessageId: string;
  threadId?: string;
  from: string;
  to: string[];
  cc: string[];
  subject: string;
  snippet: string;
  htmlBody: string;
  textBody?: string;
  receivedAt: string;
  isRead: boolean;
  isStarred: boolean;
  attachments: EmailAttachment[];
}

export interface PagedMessagesResponse {
  messages: Array<
    Omit<EmailMessage, 'accountId' | 'folderId'> & {
      accountId?: string;
      folderId?: string;
    }
  >;
  nextCursor: string | null;
}

export interface ComposePayload {
  accountId: string;
  to: string[];
  cc: string[];
  subject: string;
  htmlBody: string;
  attachments: EmailAttachment[];
}

export interface OAuthStartResult {
  provider: EmailProvider;
  authorizationUrl: string;
  state: string;
}

export interface OAuthCompletePayload {
  provider: EmailProvider;
  code: string;
  state: string;
  redirectUri: string;
}

export interface IvosDocumentOption {
  id: string;
  label: string;
  type: 'invoice' | 'incident_report' | 'certificate';
  fileName: string;
  mimeType: string;
  downloadUrl: string;
}

export interface EmailLinkTarget {
  type: 'vehicle' | 'mission';
  id: string;
  label: string;
}

export interface EmailLinkSuggestion {
  target: EmailLinkTarget;
  reason: string;
  confidence: number;
}

export interface EmailCacheSnapshot {
  foldersByAccount: Record<string, EmailFolder[]>;
  messagesByFolder: Record<string, EmailMessage[]>;
}

export interface EmailBackendWebhookEvent {
  provider: EmailProvider;
  status: 'accepted' | 'rejected';
  at: string;
  reason?: string;
  clientState?: string;
  payload?: unknown;
}

export interface EmailBackendTokenRefreshEvent {
  provider: EmailProvider;
  at: string;
  status: 'success' | 'failed';
  accessTokenPreview?: string;
  refreshTokenPreview?: string;
  error?: string;
}

export interface EmailBackendOverview {
  ok: boolean;
  service: string;
  generatedAt: string;
  uptimeSeconds: number;
  oauthStatesPending: number;
  adminAuthConfigured?: boolean;
  webhookStats: {
    total: number;
    accepted: number;
    rejected: number;
    byProvider: Record<EmailProvider, number>;
  };
  tokenRefreshStats: {
    total: number;
    success: number;
    failed: number;
    recent: EmailBackendTokenRefreshEvent[];
  };
  providerConfig: Record<
    EmailProvider,
    {
      oauthConfigured: boolean;
      webhookSecretConfigured: boolean;
      webhookSecretCount?: number;
      clientStateConfigured?: boolean;
    }
  >;
  recentWebhooks: EmailBackendWebhookEvent[];
}
