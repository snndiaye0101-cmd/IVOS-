import type { EmailCacheSnapshot, EmailFolder, EmailMessage } from './types';

const CACHE_KEY = 'ivos_email_center_cache_v1';
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheRecord {
  updatedAt: number;
  snapshot: EmailCacheSnapshot;
}

const memoryCache: CacheRecord = {
  updatedAt: 0,
  snapshot: {
    foldersByAccount: {},
    messagesByFolder: {},
  },
};

function loadFromLocalStorage(): CacheRecord | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheRecord;
    if (!parsed?.snapshot) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persist(record: CacheRecord) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(record));
}

function isFresh(updatedAt: number): boolean {
  return Date.now() - updatedAt <= CACHE_TTL_MS;
}

export function readCache(): EmailCacheSnapshot {
  if (memoryCache.updatedAt && isFresh(memoryCache.updatedAt)) {
    return memoryCache.snapshot;
  }

  const local = loadFromLocalStorage();
  if (local && isFresh(local.updatedAt)) {
    memoryCache.updatedAt = local.updatedAt;
    memoryCache.snapshot = local.snapshot;
    return local.snapshot;
  }

  return {
    foldersByAccount: {},
    messagesByFolder: {},
  };
}

export function writeAccountFolders(accountId: string, folders: EmailFolder[]) {
  const base = readCache();
  const next: CacheRecord = {
    updatedAt: Date.now(),
    snapshot: {
      ...base,
      foldersByAccount: {
        ...base.foldersByAccount,
        [accountId]: folders,
      },
    },
  };

  memoryCache.updatedAt = next.updatedAt;
  memoryCache.snapshot = next.snapshot;
  persist(next);
}

export function writeFolderMessages(folderId: string, messages: EmailMessage[]) {
  const base = readCache();
  const next: CacheRecord = {
    updatedAt: Date.now(),
    snapshot: {
      ...base,
      messagesByFolder: {
        ...base.messagesByFolder,
        [folderId]: messages,
      },
    },
  };

  memoryCache.updatedAt = next.updatedAt;
  memoryCache.snapshot = next.snapshot;
  persist(next);
}

export function clearCache() {
  memoryCache.updatedAt = 0;
  memoryCache.snapshot = {
    foldersByAccount: {},
    messagesByFolder: {},
  };
  localStorage.removeItem(CACHE_KEY);
}
