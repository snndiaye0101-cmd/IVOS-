import React, { useEffect, useMemo, useState } from 'react';
import type { User, UserSession } from '../../../shared/services/authStore';
import type { AppModule, PermissionLevel } from '../../../shared/services/permissionStore';
import { Avatar, StatusBadge, SearchFilter } from './AdminSharedComponents';
import { X, Check, ChevronRight, ChevronLeft, Save } from 'lucide-react';
import { useSite } from '../../../shared/contexts/SiteContext';
import { MODULE_LABELS, SIDEBAR_PERMISSION_TREE } from '../../../shared/services/permissionStore';

interface AccessManagementTabProps {
  approvedUsers: User[];
  onlineUserIds: string[];
  sessionsLog: UserSession[];
  selectedUserId?: string;
  onSelectUser: (userId: string) => void;
  userPermissions: Record<string, boolean>;
  onPermissionChange: (permission: string, granted: boolean) => void;
  onSavePermissions: () => Promise<{ success: boolean; message: string }>;
  onUpdateUserSite: (userId: string, siteId: string | null) => Promise<boolean>;
  permissionsSaved: boolean;
}

type CategoryItem = {
  module: AppModule;
  label: string;
};

type AccessCategory = {
  name: string;
  items: CategoryItem[];
};

const ACCESS_CATEGORIES: AccessCategory[] = [
  {
    name: 'TECHNIQUE',
    items: [
      { module: 'fleet', label: 'Parc' },
      { module: 'technique', label: 'Entretien' },
      { module: 'exploitation', label: 'Opérations' },
    ],
  },
  {
    name: 'RH',
    items: [
      { module: 'rh', label: 'Personnel' },
      { module: 'chat', label: 'Communications' },
    ],
  },
  {
    name: 'FINANCES',
    items: [{ module: 'finances', label: 'Paie' }],
  },
];

const LEVEL_LABELS: Record<'view' | 'all', string> = {
  view: 'Consultation',
  all: 'Gestion complète',
};

const ROUTE_LEVEL_LABELS: Record<PermissionLevel, string> = {
  none: 'Masquer',
  view: 'Consultation',
  edit: 'Modification',
  all: 'Gestion complète',
};

const getModuleLevel = (
  module: AppModule,
  permissions: Record<string, boolean>
): 'none' | 'view' | 'all' => {
  if (
    permissions[`${module}:delete`] ||
    permissions[`${module}:create`] ||
    permissions[`${module}:edit`]
  )
    return 'all';
  if (permissions[`${module}:view`]) return 'view';
  return 'none';
};

const getRouteLevel = (path: string, permissions: Record<string, boolean>): PermissionLevel => {
  if (permissions[`${path}:delete`] || permissions[`${path}:create`] || permissions[`${path}:edit`])
    return 'all';
  if (permissions[`${path}:edit`]) return 'edit';
  if (permissions[`${path}:view`]) return 'view';
  return 'none';
};

const makePermissionFlags = (module: AppModule, level: 'none' | 'view' | 'all') => {
  const result: Record<string, boolean> = {};
  result[`${module}:view`] = level !== 'none';
  result[`${module}:edit`] = level === 'all';
  result[`${module}:create`] = level === 'all';
  result[`${module}:delete`] = level === 'all';
  return result;
};

const makeRoutePermissionFlags = (path: string, level: PermissionLevel) => {
  const result: Record<string, boolean> = {};
  result[`${path}:view`] = level !== 'none';
  result[`${path}:edit`] = level === 'edit' || level === 'all';
  result[`${path}:create`] = level === 'all';
  result[`${path}:delete`] = level === 'all';
  return result;
};

export function AccessManagementTab({
  approvedUsers,
  onlineUserIds,
  sessionsLog,
  selectedUserId,
  onSelectUser,
  userPermissions,
  onPermissionChange,
  onSavePermissions,
  onUpdateUserSite,
  permissionsSaved,
}: AccessManagementTabProps) {
  const [searchText, setSearchText] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [localSaveMessage, setLocalSaveMessage] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const { allSites, userCountry } = useSite();

  const selectedUser = approvedUsers.find((u) => u.id === selectedUserId);
  const siteOptions = useMemo(() => {
    if (!userCountry) return allSites;
    return allSites.filter((site) => site.countryId === userCountry.id);
  }, [allSites, userCountry]);

  useEffect(() => {
    if (!selectedUser) {
      setIsDrawerOpen(false);
      return;
    }
    setIsDrawerOpen(true);
    setSiteId(selectedUser.siteId || siteOptions[0]?.id || null);
  }, [selectedUser, siteOptions]);

  const filteredUsers = useMemo(() => {
    if (!searchText.trim()) return approvedUsers;
    const q = searchText.toLowerCase();
    return approvedUsers.filter(
      (user) => user.fullName.toLowerCase().includes(q) || user.email.toLowerCase().includes(q)
    );
  }, [approvedUsers, searchText]);

  const handleSelectUser = (userId: string) => {
    onSelectUser(userId);
  };

  const handleToggleActivation = (module: AppModule) => {
    const currentLevel = getModuleLevel(module, userPermissions);
    if (currentLevel === 'none') {
      const flags = makePermissionFlags(module, 'view');
      Object.entries(flags).forEach(([perm, granted]) => onPermissionChange(perm, granted));
      return;
    }

    Object.entries(makePermissionFlags(module, 'none')).forEach(([perm, granted]) =>
      onPermissionChange(perm, granted)
    );
  };

  const handleToggleMode = (module: AppModule, targetLevel: 'view' | 'all') => {
    const flags = makePermissionFlags(module, targetLevel);
    Object.entries(flags).forEach(([perm, granted]) => onPermissionChange(perm, granted));
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    setSaving(true);
    setLocalSaveMessage('');
    const siteSaved =
      siteId === selectedUser.siteId || (await onUpdateUserSite(selectedUser.id, siteId));
    const result = await onSavePermissions();
    if (result.success && siteSaved) {
      setLocalSaveMessage('Privilèges enregistrés dans Supabase.');
    } else {
      setLocalSaveMessage(result.message || 'Impossible d’enregistrer les privilèges.');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Gérer les accès</h2>
          <p className="text-sm text-gray-500">
            Sélectionnez un utilisateur pour ouvrir le panneau de configuration des permissions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <Check className="h-3.5 w-3.5" /> Tableau de bord par utilisateur
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
            <ChevronRight className="h-3.5 w-3.5" /> Contrôle accès site / permissions
          </span>
        </div>
      </div>

      <SearchFilter
        searchValue={searchText}
        onSearchChange={setSearchText}
        placeholder="Rechercher un utilisateur..."
      />

      <div className="relative grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3">
          {filteredUsers.length === 0 ? (
            <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center text-gray-500">
              <p className="text-lg font-semibold">Aucun utilisateur trouvé</p>
              <p className="mt-2 text-sm">Ajustez votre recherche ou choisissez un autre filtre.</p>
            </div>
          ) : (
            filteredUsers.map((user) => {
              const isOnline = onlineUserIds.includes(user.id);
              const monthHours =
                sessionsLog
                  .filter((s) => s.userId === user.id)
                  .reduce((sum, s) => sum + (s.durationMinutes || 0), 0) / 60;
              const isSelected = selectedUserId === user.id;
              return (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user.id)}
                  className={`w-full rounded-3xl border px-5 py-4 text-left transition-all ${
                    isSelected
                      ? 'border-blue-400 bg-blue-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <Avatar user={user} online={isOnline} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">{user.fullName}</p>
                      <p className="truncate text-sm text-gray-500">{user.email}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <StatusBadge
                          type={isOnline ? 'online' : 'offline'}
                          label={isOnline ? 'En ligne' : 'Hors-ligne'}
                          size="sm"
                        />
                        <StatusBadge
                          type={user.status === 'approved' ? 'info' : 'pending'}
                          label={user.status === 'approved' ? 'Approuvé' : 'En attente'}
                          size="sm"
                        />
                        <StatusBadge type="info" label={user.role} size="sm" />
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        {Math.round(monthHours * 10) / 10}h ce mois
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="hidden xl:block"></div>

        {selectedUser && (
          <div
            className={`fixed inset-y-0 right-0 z-40 w-full max-w-xl transform bg-white shadow-2xl transition-transform duration-300 ease-out ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
              <div>
                <p className="text-sm font-semibold text-gray-500">Utilisateur</p>
                <p className="text-lg font-bold text-gray-900">{selectedUser.fullName}</p>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="h-full space-y-5 overflow-y-auto px-6 py-6">
              <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Contexte du site</p>
                <select
                  value={siteId || ''}
                  onChange={(e) => setSiteId(e.target.value || null)}
                  className="mt-3 w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900"
                >
                  <option value="">Sélectionner un site sénégalais</option>
                  {siteOptions.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
                <p className="mt-3 text-xs text-gray-500">
                  Les permissions sont affichées et filtrées selon le contexte du site choisi.
                </p>
              </div>

              {ACCESS_CATEGORIES.map((category) => (
                <div key={category.name} className="rounded-3xl border border-gray-200 p-4">
                  <h3 className="mb-4 text-sm font-bold text-gray-900">{category.name}</h3>
                  <div className="space-y-3">
                    {category.items.map((item) => {
                      const level = getModuleLevel(item.module, userPermissions);
                      const isActive = level !== 'none';
                      return (
                        <div
                          key={item.module}
                          className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4"
                        >
                          <div>
                            <p className="font-semibold text-gray-900">{item.label}</p>
                            <p className="text-xs text-gray-500">
                              Module: {MODULE_LABELS[item.module]}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700">
                              <input
                                type="checkbox"
                                checked={isActive}
                                onChange={() => handleToggleActivation(item.module)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              {isActive ? 'Activé' : 'Désactivé'}
                            </label>
                          </div>
                          <div className="col-span-2 grid grid-cols-2 gap-2">
                            {(['view', 'all'] as const).map((levelKey) => (
                              <button
                                key={levelKey}
                                onClick={() => handleToggleMode(item.module, levelKey)}
                                disabled={!isActive && levelKey === 'all'}
                                className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                                  level === levelKey
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                } ${!isActive ? 'cursor-not-allowed opacity-60' : ''}`}
                              >
                                {LEVEL_LABELS[levelKey]}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="rounded-3xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-gray-900">Contrôle du menu latéral</p>
                    <p className="text-xs text-gray-500">
                      Choisissez le niveau d'accès route par route pour masquer dynamiquement le
                      menu.
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  {SIDEBAR_PERMISSION_TREE.map((category) => (
                    <div
                      key={category.section}
                      className="rounded-3xl border border-gray-200 bg-gray-50 p-4"
                    >
                      <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                        {category.section}
                      </h4>
                      <div className="mt-3 space-y-3">
                        {category.items.map((item) => {
                          const currentLevel = getRouteLevel(item.path, userPermissions);
                          return (
                            <div
                              key={item.path}
                              className="grid grid-cols-[1fr_auto] gap-3 rounded-2xl border border-gray-200 bg-white p-3"
                            >
                              <div>
                                <p className="font-semibold text-gray-900">{item.label}</p>
                                <p className="text-xs text-gray-500">{item.path}</p>
                              </div>
                              <select
                                value={currentLevel}
                                onChange={(e) => {
                                  const newLevel = e.target.value as PermissionLevel;
                                  const flags = makeRoutePermissionFlags(item.path, newLevel);
                                  Object.entries(flags).forEach(([permission, granted]) =>
                                    onPermissionChange(permission, granted)
                                  );
                                }}
                                className="rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                              >
                                {Object.entries(ROUTE_LEVEL_LABELS).map(([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-xs text-gray-500">
                  Enregistré, le menu latéral est immédiatement filtré par route pour l’utilisateur
                  sélectionné.
                </p>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-gray-900">Valider les privilèges</p>
                    <p className="text-xs text-gray-500">
                      Les modifications seront persistées dans Supabase sans rechargement.
                    </p>
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Enregistrement...' : 'Valider les privilèges'}
                  </button>
                </div>
                {permissionsSaved && (
                  <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
                    ✓ Modifications sauvegardées.
                  </div>
                )}
                {localSaveMessage && (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                    {localSaveMessage}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
