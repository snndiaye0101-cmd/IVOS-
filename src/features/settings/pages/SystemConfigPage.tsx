import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useSite } from '../../../shared/contexts/SiteContext';
import { permissionStore } from '../../../shared/services/permissionStore';
import { countryStore, type ICountry, type ISite } from '../../../shared/services/countryStore';
import { useAppContext } from '../../../shared/store/useAppContext';
import { DEFAULT_COUNTRY_ALPHA3, DEFAULT_COUNTRY_ALPHA2 } from '../../../shared/constants';
import {
  Building2,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';
import SiteFullConfigDrawer from '../components/SiteFullConfigDrawer';
import PortalsConfigDrawer from '../components/PortalsConfigDrawer';

export default function SystemConfigPage() {
  const { user } = useAuth();
  const siteCtx = useSite();
  const { allCountries, allSites, refresh, viewSite, isConsolidatedView } = siteCtx;
  const { currentCountryId, hydrateFromStorage } = useAppContext();

  // Edit drawer state (must be before early return)
  const [editSiteForDrawer, setEditSiteForDrawer] = useState<ISite | null>(null);
  const [portalsSiteForDrawer, setPortalsSiteForDrawer] = useState<ISite | null>(null);
  const [previewSite, setPreviewSite] = useState<ISite | null>(null);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  // Access control
  if (!user || !permissionStore.isSuperAdmin(user.id)) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="space-y-3 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
          <h2 className="text-lg font-bold text-gray-900">Accès refusé</h2>
          <p className="text-sm text-gray-500">Seul le Super Admin peut accéder à cette page.</p>
        </div>
      </div>
    );
  }

  // Determine implicit Senegal root (currentCountryId is forced to Senegal by app context)
  const countryRootId =
    currentCountryId ||
    allCountries.find(
      (c) =>
        c.codeIso === DEFAULT_COUNTRY_ALPHA3 ||
        c.name.toLowerCase().includes('sénégal') ||
        c.name.toLowerCase().includes('senegal')
    )?.id ||
    (allCountries[0] && allCountries[0].id) ||
    null;

  // If the root country is Senegal, treat all sites as Senegalese (display all sites);
  // otherwise only show sites belonging to the country root. Then apply header site selection.
  const currentCountry = allCountries.find((c) => c.id === countryRootId);
  const isSenegalRoot = Boolean(
    currentCountry &&
    (currentCountry.codeIso === DEFAULT_COUNTRY_ALPHA3 ||
      currentCountry.codeIso === DEFAULT_COUNTRY_ALPHA2 ||
      /senegal/i.test(currentCountry.name))
  );

  let baseSites = allSites || [];
  if (!isSenegalRoot && countryRootId)
    baseSites = baseSites.filter((s) => s.countryId === countryRootId);

  // filteredSites: reflect header site selector (viewSite) — if a specific site is chosen, show only it
  const filteredSites = viewSite ? baseSites.filter((s) => s.id === viewSite.id) : baseSites;

  const openEdit = (s: ISite) => {
    setEditSiteForDrawer(s);
  };

  function createEmptySite(): ISite {
    return {
      id: `new_${Date.now()}`,
      name: '',
      code: '',
      countryId: countryRootId || '',
      address: '',
      isActive: true,
      createdAt: new Date().toISOString(),
    };
  }

  const handleDelete = (id: string) => {
    const personnel = getPersonnelForSite(id);
    if (personnel.length > 0) {
      alert('Impossible de supprimer ce site : des employés y sont rattachés.');
      return;
    }
    if (!confirm('Confirmez la suppression du site ? Cette action est irréversible.')) return;
    countryStore.deleteSite(id);
    if (viewSite?.id === id) {
      siteCtx.setViewSite(null);
    }
    refresh();
  };

  function getPersonnelForSite(siteId: string) {
    try {
      const raw =
        localStorage.getItem('ivos_personnel_v1') || localStorage.getItem('ivos_personnel') || '[]';
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter((p: any) => p.siteId === siteId) : [];
    } catch {
      return [];
    }
  }

  function getVehiclesCount(siteId: string) {
    try {
      const raw =
        localStorage.getItem('ivos_vehicles_v1') || localStorage.getItem('ivos_vehicles') || '[]';
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return 0;
      // Vehicles may not have siteId in all projects — fall back to total
      const withSite = arr.filter((v: any) => v.siteId);
      if (withSite.length === 0) return arr.length;
      return arr.filter((v: any) => v.siteId === siteId).length;
    } catch {
      return 0;
    }
  }

  function getPayrollSum(siteId: string) {
    try {
      const personnel = getPersonnelForSite(siteId);
      return personnel.reduce((acc: number, p: any) => {
        const s = Number(p.salaireBase || p.baseSalary || p.salary || 0) || 0;
        return acc + s;
      }, 0);
    } catch {
      return 0;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-gray-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
              <Building2 className="h-5 w-5 text-indigo-600" />
            </div>
            Gestion des Sites
          </h1>
          <p className="ml-[52px] mt-1 text-sm text-gray-400">
            Liste et gestion des sites d'exploitation.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Sites</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditSiteForDrawer(createEmptySite());
            }}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> Ajouter un site
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Site
              </th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Code
              </th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Devise
              </th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Adresse
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredSites.map((s) => {
              const country = allCountries.find((c) => c.id === s.countryId);
              return (
                <tr key={s.id} className="transition-colors hover:bg-gray-50/50">
                  <td className="px-5 py-3.5 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-indigo-400" />
                      {s.name}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-gray-600">{s.code}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                      <DollarSign className="h-3 w-3" /> {country?.currencyCode || 'XOF'} (
                      {country?.currencySymbol || 'F CFA'})
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-500">{s.address || '—'}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          setPreviewSite(s);
                        }}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                      >
                        Aperçu
                      </button>
                      <button
                        onClick={() => setPortalsSiteForDrawer(s)}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                      >
                        ⚙️ Configurer les Portails
                      </button>
                      <button
                        onClick={() => openEdit(s)}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredSites.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">
                  Aucun site configuré
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Preview drawer */}
      {previewSite && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setPreviewSite(null)}
          />
          <div className="relative ml-auto flex h-full w-full max-w-md flex-col bg-white p-8 shadow-2xl">
            <button
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-700"
              onClick={() => setPreviewSite(null)}
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="mb-2 flex items-center gap-2 text-xl font-bold">
              <MapPin className="h-5 w-5" /> {previewSite.name}
            </h2>
            <div className="mb-4 text-sm text-gray-500">
              Code : <span className="font-mono font-semibold">{previewSite.code}</span>
            </div>
            <div className="mb-4">
              <div className="mb-1 text-xs font-semibold uppercase text-gray-500">Statistiques</div>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>
                  Employés : <strong>{getPersonnelForSite(previewSite.id).length}</strong>
                </li>
                <li>
                  Masse salariale (somme salaires) :{' '}
                  <strong>
                    {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(
                      getPayrollSum(previewSite.id)
                    )}{' '}
                    {countryStore.getCurrencyForSite(previewSite.id).symbol}
                  </strong>
                </li>
                <li>
                  Flotte (véhicules) : <strong>{getVehiclesCount(previewSite.id)}</strong>
                </li>
              </ul>
            </div>
            <div className="mt-auto">
              <button
                className="w-full rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white"
                onClick={() => setPreviewSite(null)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit drawer - includes merged Configuration Base fields per site */}
      {editSiteForDrawer && (
        <SiteFullConfigDrawer
          site={editSiteForDrawer}
          isNew={String(editSiteForDrawer.id).startsWith('new_')}
          onClose={() => {
            setEditSiteForDrawer(null);
            refresh();
          }}
        />
      )}
      {portalsSiteForDrawer && (
        <PortalsConfigDrawer
          siteId={portalsSiteForDrawer.id}
          siteName={portalsSiteForDrawer.name}
          onClose={() => {
            setPortalsSiteForDrawer(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
