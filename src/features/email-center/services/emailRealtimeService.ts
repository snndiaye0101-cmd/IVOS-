import { io, type Socket } from 'socket.io-client';
import { writeAccountFolders, writeFolderMessages } from './emailCache';
import { emailSyncService } from './emailSyncService';
import type { EmailMessage } from './types';

const EMAIL_BACKEND_URL = import.meta.env.VITE_EMAIL_CENTER_BACKEND_URL || '';

let socket: Socket | null = null;
let activeUserId = '';

type SyncPayload = {
  accountId: string;
  folders: Array<{ id: string; unreadCount: number }>;
  messagesByFolder: Record<string, EmailMessage[]>;
  unreadCount: number;
  newMessages?: Array<{ from: string; subject: string }>;
};

function notifyBrowser(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  new Notification(title, {
    body,
    tag: 'ivos-email-center',
  });
}

function requestNotificationsPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
}

function applySyncPayload(userId: string, payload: SyncPayload) {
  if (payload.accountId && Array.isArray(payload.folders)) {
    writeAccountFolders(payload.accountId, payload.folders as any);
  }

  if (payload.messagesByFolder && typeof payload.messagesByFolder === 'object') {
    Object.entries(payload.messagesByFolder).forEach(([folderId, messages]) => {
      writeFolderMessages(folderId, Array.isArray(messages) ? messages : []);
    });
  }

  const unread = Number(payload.unreadCount || 0);
  window.dispatchEvent(new CustomEvent(emailSyncService.getSyncEventName(), {
    detail: { at: new Date().toISOString(), userId },
  }));
  window.dispatchEvent(new CustomEvent(emailSyncService.getUnreadEventName(), {
    detail: { at: new Date().toISOString(), userId, unread },
  }));

  if (Array.isArray(payload.newMessages) && payload.newMessages.length > 0) {
    const first = payload.newMessages[0];
    notifyBrowser(`Nouvel email de ${first.from}`, first.subject || 'Sans objet');
  }
}

export const emailRealtimeService = {
  start(userId: string) {
    if (!EMAIL_BACKEND_URL || !userId) return;

    if (socket && activeUserId === userId) return;
    this.stop();

    requestNotificationsPermission();
    activeUserId = userId;

    socket = io(EMAIL_BACKEND_URL, {
      transports: ['websocket'],
      auth: { userId },
    });

    socket.on('email:center:sync', (payload: SyncPayload) => {
      applySyncPayload(userId, payload);
    });

    socket.on('email:center:new-mail', (payload: { unreadCount: number; messages: Array<{ from: string; subject: string }> }) => {
      window.dispatchEvent(new CustomEvent(emailSyncService.getUnreadEventName(), {
        detail: { at: new Date().toISOString(), userId, unread: Number(payload.unreadCount || 0) },
      }));

      if (Array.isArray(payload.messages) && payload.messages.length > 0) {
        const first = payload.messages[0];
        notifyBrowser(`Nouvel email de ${first.from}`, first.subject || 'Sans objet');
      }
    });
  },

  stop() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    activeUserId = '';
  },
};
