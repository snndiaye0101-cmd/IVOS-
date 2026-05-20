import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  KeyRound,
  Mail,
  RefreshCcw,
  ShieldCheck,
  ShieldX,
  Webhook,
} from 'lucide-react';
import { useAuth } from '@shared/contexts/AuthContext';
import { permissionStore } from '@shared/services/permissionStore';
import { emailSyncService } from '../services/emailSyncService';
import type { EmailBackendOverview } from '../services/types';

function formatDateTime(value: string): string {
  try {
    return new Date(value).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return value;
  }
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0s';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

type StatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone: 'blue' | 'emerald' | 'amber' | 'red';
  subtext: string;
};

function StatCard({ icon, label, value, tone, subtext }: StatCardProps) {
  const tones = {
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    red: 'border-red-200 bg-red-50 text-red-900',
  } as const;

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold uppercase tracking-wide opacity-80">{label}</div>
        <div className="rounded-xl bg-white/70 p-2">{icon}</div>
      </div>
      <div className="mt-4 text-3xl font-extrabold">{value}</div>
      <p className="mt-2 text-xs opacity-80">{subtext}</p>
    </div>
  );
}

export default function EmailCenterAdminPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<EmailBackendOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState('');

  const isSuperAdmin = useMemo(() => {
    return user ? permissionStore.isSuperAdmin(user.id) : false;
  }, [user]);

  async function loadOverview() {
    setIsLoading(true);
    setErrorText('');
    try {
      const next = await emailSyncService.getBackendOverview();
      if (!next) {
        setErrorText('Backend Email Center non configure dans VITE_EMAIL_CENTER_BACKEND_URL.');
        setOverview(null);
        return;
      }
      setOverview(next);
    } catch (error) {
      setErrorText((error as Error).message || 'Impossible de charger le monitoring Email Center.');
      setOverview(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!isSuperAdmin) return;
    loadOverview();
    const interval = window.setInterval(loadOverview, 30000);
    return () => window.clearInterval(interval);
  }, [isSuperAdmin]);

  if (!user || !isSuperAdmin) {
    return (
      <div className="p-8 text-center">
        <ShieldX className="mx-auto mb-4 h-16 w-16 text-red-500" />
        <h1 className="text-2xl font-bold text-gray-900">Acces refuse</h1>
        <p className="mt-2 text-sm text-gray-500">
          Ce tableau de supervision est reserve au Super Admin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-3xl bg-gradient-to-r from-[#111827] via-[#0f3d5e] to-[#0e7490] p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-100">
              Supervision Email Center
            </p>
            <h1 className="mt-2 text-3xl font-extrabold">
              Securite OAuth, webhooks et synchronisation
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-cyan-50/90">
              Controle en temps reel de l'API Email Center: etat OAuth, rafraichissement des tokens,
              verification des webhooks et disponibilite globale.
            </p>
          </div>
          <button
            type="button"
            onClick={loadOverview}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-cyan-50"
          >
            <RefreshCcw className="h-4 w-4" /> Rafraichir
          </button>
        </div>
      </div>

      {errorText && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorText}
        </div>
      )}

      {isLoading && !overview && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
          Chargement du monitoring Email Center...
        </div>
      )}

      {overview && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={<Activity className="h-5 w-5" />}
              label="Disponibilite"
              value={overview.ok ? 'OK' : 'Degrade'}
              tone={overview.ok ? 'emerald' : 'red'}
              subtext={`Uptime ${formatDuration(overview.uptimeSeconds)}`}
            />
            <StatCard
              icon={<Webhook className="h-5 w-5" />}
              label="Webhooks"
              value={overview.webhookStats.total}
              tone="blue"
              subtext={`${overview.webhookStats.accepted} acceptes / ${overview.webhookStats.rejected} rejetes`}
            />
            <StatCard
              icon={<KeyRound className="h-5 w-5" />}
              label="Refresh tokens"
              value={overview.tokenRefreshStats.total}
              tone={overview.tokenRefreshStats.failed > 0 ? 'amber' : 'emerald'}
              subtext={`${overview.tokenRefreshStats.success} succes / ${overview.tokenRefreshStats.failed} echec`}
            />
            <StatCard
              icon={<Clock3 className="h-5 w-5" />}
              label="Etats OAuth"
              value={overview.oauthStatesPending}
              tone={overview.oauthStatesPending > 0 ? 'amber' : 'blue'}
              subtext={`Snapshot ${formatDateTime(overview.generatedAt)}`}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-gray-900">Configuration providers</h2>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {(['gmail', 'outlook'] as const).map((provider) => {
                  const config = overview.providerConfig[provider];
                  return (
                    <div
                      key={provider}
                      className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-700">
                        <Mail className="h-4 w-4" />{' '}
                        {provider === 'gmail' ? 'Gmail API' : 'Microsoft Graph'}
                      </div>
                      <div className="mt-4 space-y-3 text-sm text-gray-700">
                        <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                          <span>OAuth configure</span>
                          <span
                            className={
                              config.oauthConfigured
                                ? 'font-semibold text-emerald-700'
                                : 'font-semibold text-red-600'
                            }
                          >
                            {config.oauthConfigured ? 'Oui' : 'Non'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                          <span>Secret webhook</span>
                          <span
                            className={
                              config.webhookSecretConfigured
                                ? 'font-semibold text-emerald-700'
                                : 'font-semibold text-red-600'
                            }
                          >
                            {config.webhookSecretConfigured
                              ? `Oui (${config.webhookSecretCount || 1})`
                              : 'Non'}
                          </span>
                        </div>
                        {provider === 'outlook' && (
                          <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                            <span>Client state</span>
                            <span
                              className={
                                config.clientStateConfigured
                                  ? 'font-semibold text-emerald-700'
                                  : 'font-semibold text-amber-600'
                              }
                            >
                              {config.clientStateConfigured ? 'Oui' : 'Non'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <h2 className="text-lg font-bold text-gray-900">Volume par provider</h2>
              </div>
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-gray-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <span>Protection endpoint admin</span>
                    <span
                      className={
                        overview.adminAuthConfigured
                          ? 'font-semibold text-emerald-700'
                          : 'font-semibold text-amber-600'
                      }
                    >
                      {overview.adminAuthConfigured ? 'Activee' : 'Non configuree'}
                    </span>
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between text-sm font-semibold text-gray-700">
                    <span>Gmail</span>
                    <span>{overview.webhookStats.byProvider.gmail} webhooks</span>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{
                        width: `${overview.webhookStats.total ? (overview.webhookStats.byProvider.gmail / overview.webhookStats.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between text-sm font-semibold text-gray-700">
                    <span>Outlook</span>
                    <span>{overview.webhookStats.byProvider.outlook} webhooks</span>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-cyan-500"
                      style={{
                        width: `${overview.webhookStats.total ? (overview.webhookStats.byProvider.outlook / overview.webhookStats.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Webhook className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-bold text-gray-900">Derniers webhooks</h2>
              </div>
              <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Provider</th>
                      <th className="px-4 py-3 text-left font-semibold">Statut</th>
                      <th className="px-4 py-3 text-left font-semibold">Detail</th>
                      <th className="px-4 py-3 text-left font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.recentWebhooks.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                          Aucun webhook recu pour le moment.
                        </td>
                      </tr>
                    ) : (
                      overview.recentWebhooks.map((event) => (
                        <tr
                          key={`${event.provider}-${event.at}-${event.status}`}
                          className="border-t border-gray-100"
                        >
                          <td className="px-4 py-3 font-semibold text-gray-900">
                            {event.provider}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${event.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}
                            >
                              {event.status === 'accepted' ? 'Accepte' : 'Rejete'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {event.reason || event.clientState || 'OK'}
                          </td>
                          <td className="px-4 py-3 text-gray-500">{formatDateTime(event.at)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-amber-600" />
                <h2 className="text-lg font-bold text-gray-900">Historique refresh OAuth</h2>
              </div>
              <div className="mt-4 space-y-3">
                {overview.tokenRefreshStats.recent.length === 0 && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                    Aucun refresh token enregistre.
                  </div>
                )}
                {overview.tokenRefreshStats.recent.map((event) => (
                  <div
                    key={`${event.provider}-${event.at}-${event.status}`}
                    className="rounded-2xl border border-gray-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          {event.status === 'success' ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                          <p className="text-sm font-semibold text-gray-900">
                            {event.provider} •{' '}
                            {event.status === 'success' ? 'Refresh reussi' : 'Refresh en echec'}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">{formatDateTime(event.at)}</p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${event.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}
                      >
                        {event.status}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-gray-600 md:grid-cols-2">
                      <div className="rounded-xl bg-gray-50 px-3 py-2">
                        Access token: {event.accessTokenPreview || 'n/a'}
                      </div>
                      <div className="rounded-xl bg-gray-50 px-3 py-2">
                        Refresh token: {event.refreshTokenPreview || 'n/a'}
                      </div>
                    </div>
                    {event.error && <p className="mt-3 text-xs text-red-600">{event.error}</p>}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
