import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Link2,
  Mail,
  MailOpen,
  Send,
  Star,
  Trash,
  RefreshCcw,
  Paperclip,
  Plus,
  Search,
  FileText,
  Smartphone,
  ShieldCheck,
  Bold,
  Italic,
  Underline,
  List,
} from 'lucide-react';
import { useAuth } from '@shared/contexts/AuthContext';
import Modal from '../../../components/ui/Modal';
import {
  cleanOAuthParamsFromUrl,
  completeOAuth,
  getOAuthRedirectUri,
  maybeReadOAuthCallbackFromLocation,
  startOAuth,
} from '../services/oauthProviders';
import { emailSyncService } from '../services/emailSyncService';
import { emailSmartLinkService } from '../services/emailSmartLinkService';
import { listIvosDocuments, mapDocToAttachment } from '../services/ivosDocumentBridge';
import type {
  ComposePayload,
  EmailAttachment,
  EmailFolder,
  EmailMessage,
  EmailProvider,
  LinkedEmailAccount,
} from '../services/types';

function id(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function sanitizeHtml(html: string): string {
  return html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
}

const FOLDER_META: Record<string, { icon: typeof Mail; color: string }> = {
  inbox: { icon: Mail, color: 'text-blue-600' },
  sent: { icon: Send, color: 'text-emerald-600' },
  drafts: { icon: FileText, color: 'text-amber-600' },
  trash: { icon: Trash, color: 'text-red-600' },
  starred: { icon: Star, color: 'text-yellow-600' },
};

export default function EmailCenterPage() {
  const { user } = useAuth();

  const [accounts, setAccounts] = useState<LinkedEmailAccount[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string>('');
  const [folders, setFolders] = useState<EmailFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string>('');
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [activeMessageId, setActiveMessageId] = useState<string>('');
  const [query, setQuery] = useState('');
  const [statusText, setStatusText] = useState('Pret');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  const [composeTo, setComposeTo] = useState('');
  const [composeCc, setComposeCc] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeAttachments, setComposeAttachments] = useState<EmailAttachment[]>([]);

  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeAccount = accounts.find(account => account.id === activeAccountId) || null;
  const activeMessage = messages.find(message => message.id === activeMessageId) || null;

  const filteredMessages = useMemo(() => {
    if (!query.trim()) return messages;
    const q = query.toLowerCase();
    return messages.filter(message => (
      message.from.toLowerCase().includes(q)
      || message.subject.toLowerCase().includes(q)
      || message.snippet.toLowerCase().includes(q)
    ));
  }, [messages, query]);

  const linkSuggestions = useMemo(() => {
    if (!activeMessage) return [];
    return emailSmartLinkService.suggestTargets(activeMessage);
  }, [activeMessage]);

  const linkTargets = useMemo(() => emailSmartLinkService.getAvailableTargets(), []);

  useEffect(() => {
    if (!user?.id) return;

    const loaded = emailSyncService.loadLinkedAccounts(user.id);
    setAccounts(loaded);
    setActiveAccountId(prev => prev || loaded[0]?.id || '');
  }, [user?.id]);

  useEffect(() => {
    if (!activeAccountId) {
      setFolders([]);
      setActiveFolderId('');
      return;
    }

    const nextFolders = emailSyncService.getFolders(activeAccountId);
    setFolders(nextFolders);

    if (!nextFolders.length) {
      setActiveFolderId('');
      return;
    }

    setActiveFolderId(prev => {
      if (prev && nextFolders.some(folder => folder.id === prev)) return prev;
      const inbox = nextFolders.find(folder => folder.type === 'inbox');
      return inbox?.id || nextFolders[0].id;
    });
  }, [activeAccountId]);

  useEffect(() => {
    if (!activeFolderId) {
      setMessages([]);
      setActiveMessageId('');
      return;
    }

    const nextMessages = emailSyncService.getMessages(activeFolderId);
    setMessages(nextMessages);
    setActiveMessageId(prev => (prev && nextMessages.some(m => m.id === prev) ? prev : nextMessages[0]?.id || ''));
  }, [activeFolderId, statusText]);

  useEffect(() => {
    const syncEvent = emailSyncService.getSyncEventName();
    const unreadEvent = emailSyncService.getUnreadEventName();

    const handleSync = () => {
      if (activeAccountId) {
        setFolders(emailSyncService.getFolders(activeAccountId));
      }
      if (activeFolderId) {
        setMessages(emailSyncService.getMessages(activeFolderId));
      }
      setStatusText(`Synchronise a ${new Date().toLocaleTimeString('fr-FR')}`);
    };

    const handleUnread = () => {
      if (activeAccountId) {
        setFolders(emailSyncService.getFolders(activeAccountId));
      }
    };

    window.addEventListener(syncEvent, handleSync as EventListener);
    window.addEventListener(unreadEvent, handleUnread as EventListener);

    return () => {
      window.removeEventListener(syncEvent, handleSync as EventListener);
      window.removeEventListener(unreadEvent, handleUnread as EventListener);
    };
  }, [activeAccountId, activeFolderId]);

  useEffect(() => {
    for (const account of accounts) {
      emailSyncService.registerAccountForBackgroundSync(account);
    }
  }, [accounts]);

  useEffect(() => {
    const callback = maybeReadOAuthCallbackFromLocation();
    if (!callback || !user?.id) return;

    const run = async () => {
      try {
        setStatusText(`Connexion ${callback.provider} en cours...`);
        const result = await completeOAuth({
          provider: callback.provider,
          code: callback.code,
          state: callback.state,
          redirectUri: getOAuthRedirectUri(),
        });

        const account: LinkedEmailAccount = {
          id: crypto.randomUUID(),
          userId: user.id,
          provider: callback.provider,
          emailAddress: result.emailAddress,
          displayName: result.displayName,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresAt: result.expiresAt,
          connectedAt: new Date().toISOString(),
          lastSyncAt: new Date().toISOString(),
        };

        emailSyncService.upsertLinkedAccount(account);
        await emailSyncService.saveLinkedAccountToSupabase(account);
        await emailSyncService.registerAccountForBackgroundSync(account);
        await emailSyncService.syncAccount(account);
        const next = emailSyncService.loadLinkedAccounts(user.id);
        setAccounts(next);
        setActiveAccountId(account.id);
        setStatusText(`${callback.provider === 'gmail' ? 'Gmail' : 'Outlook'} connecte`);
      } catch (error) {
        setStatusText(`Erreur OAuth: ${(error as Error).message}`);
      } finally {
        cleanOAuthParamsFromUrl();
      }
    };

    run();
  }, [user?.id]);

  async function connectProvider(provider: EmailProvider) {
    const oauth = startOAuth(provider);
    setStatusText(`Redirection vers ${provider === 'gmail' ? 'Gmail' : 'Outlook'}...`);
    window.open(oauth.authorizationUrl, '_self');
  }

  async function refreshNow() {
    if (!activeAccount) return;
    setStatusText('Synchronisation en cours...');
    await emailSyncService.syncAccount(activeAccount);
    setFolders(emailSyncService.getFolders(activeAccount.id));
    if (activeFolderId) setMessages(emailSyncService.getMessages(activeFolderId));
    setStatusText(`Synchronise a ${new Date().toLocaleTimeString('fr-FR')}`);
  }

  async function loadMore() {
    if (!activeAccount || !activeFolderId) return;
    setIsLoadingMore(true);
    try {
      const next = await emailSyncService.loadMoreMessages(activeAccount, activeFolderId);
      setMessages(next);
      setStatusText('Messages supplementaires charges');
    } finally {
      setIsLoadingMore(false);
    }
  }

  function openComposer() {
    setComposeTo('');
    setComposeCc('');
    setComposeSubject('');
    setComposeAttachments([]);
    setIsComposerOpen(true);
    setTimeout(() => {
      if (editorRef.current) editorRef.current.innerHTML = '<p><br/></p>';
    }, 0);
  }

  function applyEditorCommand(command: string) {
    document.execCommand(command);
  }

  function addLocalAttachment(files: FileList | null) {
    if (!files) return;
    const next = Array.from(files).map(file => ({
      id: id('upload'),
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      source: 'upload' as const,
    }));
    setComposeAttachments(prev => [...prev, ...next]);
  }

  function attachIvosDocument(docId: string) {
    const doc = listIvosDocuments().find(item => item.id === docId);
    if (!doc) return;
    setComposeAttachments(prev => [...prev, mapDocToAttachment(doc)]);
  }

  async function sendComposedMessage() {
    if (!activeAccount) return;

    const htmlBody = editorRef.current?.innerHTML || '';
    const payload: ComposePayload = {
      accountId: activeAccount.id,
      to: composeTo.split(',').map(v => v.trim()).filter(Boolean),
      cc: composeCc.split(',').map(v => v.trim()).filter(Boolean),
      subject: composeSubject.trim(),
      htmlBody,
      attachments: composeAttachments,
    };

    await emailSyncService.sendEmail(payload);
    setIsComposerOpen(false);

    const sentFolder = folders.find(folder => folder.type === 'sent');
    if (sentFolder) {
      setActiveFolderId(sentFolder.id);
      setMessages(emailSyncService.getMessages(sentFolder.id));
    }

    setStatusText('Email envoye');
  }

  async function linkCurrentMessage(targetId: string) {
    if (!activeMessage || !user?.id) return;
    const target = linkTargets.find(item => `${item.type}:${item.id}` === targetId);
    if (!target) return;

    await emailSmartLinkService.linkEmailToTarget(user.id, activeMessage, target);
    setIsLinkModalOpen(false);
    setStatusText(`Email lie a ${target.label}`);
  }

  async function markCurrentAsRead() {
    if (!activeMessage) return;
    await emailSyncService.markAsRead(activeMessage, true);
    setMessages(emailSyncService.getMessages(activeMessage.folderId));
  }

  async function markMessageAsRead(message: EmailMessage) {
    await emailSyncService.markAsRead(message, true);
    setMessages(emailSyncService.getMessages(message.folderId));
  }

  const availableDocuments = listIvosDocuments();
  const hasMoreMessages = Boolean(activeFolderId && emailSyncService.getNextCursor(activeFolderId));

  return (
    <div className="w-full min-h-screen space-y-4">
      <div className="rounded-2xl bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#1d4ed8] p-5 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-white/15 flex items-center justify-center">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold">Email Center</h1>
              <p className="text-sm text-blue-100">OAuth2 Gmail + Outlook, sync en arriere-plan, liaison metier IVOS</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => connectProvider('gmail')} className="rounded-xl bg-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/25">Connecter Gmail</button>
            <button onClick={() => connectProvider('outlook')} className="rounded-xl bg-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/25">Connecter Outlook</button>
            <button onClick={refreshNow} className="rounded-xl bg-white text-slate-900 px-3 py-2 text-sm font-semibold hover:bg-blue-50 inline-flex items-center gap-2">
              <RefreshCcw className="h-4 w-4" /> Sync
            </button>
            <button onClick={openComposer} className="rounded-xl bg-emerald-400 px-3 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-300 inline-flex items-center gap-2">
              <Plus className="h-4 w-4" /> Nouveau
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 flex items-center gap-3">
        <ShieldCheck className="h-4 w-4 text-emerald-600" />
        <span>{statusText}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_420px_1fr]">
        <section className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Dossiers & Libelles</h2>

          {accounts.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 p-3 text-sm text-gray-600">
              Aucune boite liee. Connectez Gmail ou Outlook pour commencer.
            </div>
          )}

          <div className="space-y-3">
            {accounts.map(account => (
              <div key={account.id} className="rounded-xl border border-gray-200 p-2">
                <button
                  onClick={() => setActiveAccountId(account.id)}
                  className={`w-full text-left rounded-lg px-2 py-1.5 ${activeAccountId === account.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  <p className="text-sm font-semibold text-gray-900">{account.displayName}</p>
                  <p className="text-xs text-gray-500">{account.emailAddress}</p>
                </button>

                {activeAccountId === account.id && (
                  <div className="mt-2 space-y-1">
                    {folders.map(folder => {
                      const meta = FOLDER_META[folder.type] || { icon: MailOpen, color: 'text-gray-600' };
                      const Icon = meta.icon;
                      return (
                        <button
                          key={folder.id}
                          onClick={() => setActiveFolderId(folder.id)}
                          className={`w-full flex items-center justify-between rounded-lg px-2 py-1.5 text-sm ${activeFolderId === folder.id ? 'bg-slate-900 text-white' : 'hover:bg-gray-100 text-gray-700'}`}
                        >
                          <span className="inline-flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${activeFolderId === folder.id ? 'text-white' : meta.color}`} />
                            {folder.name}
                          </span>
                          {folder.unreadCount > 0 && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] text-white">{folder.unreadCount}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 p-3 flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Rechercher expediteur, objet, contenu..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {filteredMessages.map(message => (
              <button
                key={message.id}
                onClick={() => {
                  setActiveMessageId(message.id);
                  if (!message.isRead) {
                    markMessageAsRead(message);
                  }
                }}
                className={`w-full border-b border-gray-100 p-3 text-left hover:bg-gray-50 ${activeMessageId === message.id ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm ${message.isRead ? 'text-gray-700 font-medium' : 'text-gray-900 font-bold'}`}>{message.from}</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={event => {
                        event.stopPropagation();
                        setActiveMessageId(message.id);
                        setIsLinkModalOpen(true);
                      }}
                      className="rounded-md border border-gray-200 p-1 text-gray-500 hover:bg-gray-100"
                      title="Lier cet email"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                    </button>
                    <p className="text-xs text-gray-500">{formatDate(message.receivedAt)}</p>
                  </div>
                </div>
                <p className="mt-1 text-sm font-semibold text-gray-900 truncate">{message.subject}</p>
                <p className="mt-1 text-xs text-gray-500 line-clamp-2">{message.snippet}</p>
              </button>
            ))}

            {filteredMessages.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-500">Aucun email dans ce dossier.</div>
            )}

            {hasMoreMessages && (
              <div className="p-3 border-t border-gray-100 bg-gray-50">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                >
                  {isLoadingMore ? 'Chargement...' : 'Charger plus'}
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {!activeMessage && (
            <div className="h-full min-h-[320px] flex items-center justify-center text-sm text-gray-500">
              Selectionnez un email pour afficher son contenu.
            </div>
          )}

          {activeMessage && (
            <div className="h-full flex flex-col">
              <div className="border-b border-gray-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{activeMessage.subject}</h3>
                    <p className="text-xs text-gray-500 mt-1">De {activeMessage.from} • {formatDate(activeMessage.receivedAt)}</p>
                  </div>
                  <button
                    onClick={() => setIsLinkModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    <Link2 className="h-4 w-4" /> Lier a un dossier
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(activeMessage.htmlBody) }}
                />

                <div>
                  <h4 className="text-xs uppercase tracking-wide font-bold text-gray-500 mb-2">Pieces jointes</h4>
                  {activeMessage.attachments.length === 0 && <p className="text-sm text-gray-500">Aucune piece jointe.</p>}
                  <div className="space-y-2">
                    {activeMessage.attachments.map(att => (
                      <div key={att.id} className="rounded-lg border border-gray-200 px-3 py-2 text-sm flex items-center justify-between">
                        <span>{att.fileName}</span>
                        {att.downloadUrl ? <a href={att.downloadUrl} className="text-blue-700 underline">Ouvrir</a> : <span className="text-gray-400">{Math.round(att.size / 1024)} KB</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      <Modal isOpen={isComposerOpen} onClose={() => setIsComposerOpen(false)} title="Nouveau message" size="xl">
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2">
            <input value={composeTo} onChange={event => setComposeTo(event.target.value)} placeholder="A (emails separes par virgule)" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <input value={composeCc} onChange={event => setComposeCc(event.target.value)} placeholder="Cc" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <input value={composeSubject} onChange={event => setComposeSubject(event.target.value)} placeholder="Objet" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 p-2 flex flex-wrap items-center gap-2">
              <button onClick={() => applyEditorCommand('bold')} className="rounded-lg border border-gray-200 bg-white p-1.5"><Bold className="h-4 w-4" /></button>
              <button onClick={() => applyEditorCommand('italic')} className="rounded-lg border border-gray-200 bg-white p-1.5"><Italic className="h-4 w-4" /></button>
              <button onClick={() => applyEditorCommand('underline')} className="rounded-lg border border-gray-200 bg-white p-1.5"><Underline className="h-4 w-4" /></button>
              <button onClick={() => applyEditorCommand('insertUnorderedList')} className="rounded-lg border border-gray-200 bg-white p-1.5"><List className="h-4 w-4" /></button>
            </div>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="min-h-[180px] p-3 text-sm focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Pieces jointes</p>
              <div className="flex flex-wrap gap-2">
                {composeAttachments.map(att => (
                  <span key={att.id} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs">
                    <Paperclip className="h-3 w-3" /> {att.fileName}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">
                <Paperclip className="h-4 w-4" /> Ajouter fichier
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={event => addLocalAttachment(event.target.files)}
              />
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Documents IVOS (1 clic)</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {availableDocuments.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => attachIvosDocument(doc.id)}
                  className="text-left rounded-lg border border-gray-200 p-2 hover:bg-gray-50"
                >
                  <p className="text-sm font-semibold text-gray-900">{doc.label}</p>
                  <p className="text-xs text-gray-500">{doc.fileName}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={() => setIsComposerOpen(false)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">Annuler</button>
            <button onClick={sendComposedMessage} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              <Send className="h-4 w-4" /> Envoyer
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} title="Lier cet email" size="lg">
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900">
            Suggestions automatiques basees sur le sujet et la plaque detectee.
          </div>

          <div className="space-y-2">
            {linkSuggestions.map(suggestion => (
              <button
                key={`${suggestion.target.type}:${suggestion.target.id}`}
                onClick={() => linkCurrentMessage(`${suggestion.target.type}:${suggestion.target.id}`)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-left hover:bg-gray-50"
              >
                <p className="text-sm font-semibold text-gray-900">{suggestion.target.label}</p>
                <p className="text-xs text-gray-500">{suggestion.reason} • confiance {Math.round(suggestion.confidence * 100)}%</p>
              </button>
            ))}

            {linkSuggestions.length === 0 && (
              <p className="text-sm text-gray-500">Aucune suggestion automatique. Liaison manuelle ci-dessous.</p>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Liaison manuelle</p>
            <div className="max-h-[260px] overflow-y-auto space-y-1">
              {linkTargets.map(target => (
                <button
                  key={`${target.type}:${target.id}`}
                  onClick={() => linkCurrentMessage(`${target.type}:${target.id}`)}
                  className="w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-gray-50"
                >
                  <span className="font-semibold text-gray-900">{target.label}</span>
                  <span className="ml-2 text-xs text-gray-500">[{target.type}]</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
            <div className="flex items-center gap-2"><Smartphone className="h-4 w-4" /> Les liaisons sont stockees dans Supabase (table email_links) avec fallback local.</div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
