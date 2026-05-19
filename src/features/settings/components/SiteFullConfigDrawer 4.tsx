import React, { useEffect, useState, useRef } from 'react';
import {
  MapPin,
  X,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  DollarSign,
  Navigation,
} from 'lucide-react';
import { ISite, countryStore } from '../../../shared/services/countryStore';
import { useSite } from '../../../shared/contexts/SiteContext';
import {
  loadSiteSettings,
  saveSiteSettings,
  updateSiteShifts,
  updateBaseConfigForSite,
  updateSitePosition,
  getAnnualBudgetForSite,
  saveAnnualBudgetForSite,
  SiteSettings,
} from '../services/siteConfigStore';
import { BaseConfig, DEFAULT_BASE_CONFIG } from '../services/baseConfigStore';

interface Props {
  site: ISite;
  onClose: () => void;
  isNew?: boolean;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export default function SiteFullConfigDrawer({ site, onClose, isNew }: Props) {
  const siteCtx = useSite();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [budgetSaved, setBudgetSaved] = useState(false);
  const [budgetValue, setBudgetValue] = useState<string>('0');
  const [shifts, setShifts] = useState<BaseConfig['shifts']>(DEFAULT_BASE_CONFIG.shifts);
  const [attendanceTolerance, setAttendanceTolerance] = useState<number>(
    DEFAULT_BASE_CONFIG.attendanceToleranceMinutes || 15
  );

  // Site-specific name/code/address editing
  const [siteName, setSiteName] = useState(site.name);
  const [siteCode, setSiteCode] = useState(site.code);
  const [siteAddress, setSiteAddress] = useState(site.address || '');

  // Nominatim
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const s = loadSiteSettings(site.id);
    setSettings(s);
    setBudgetValue(String(s.annualBudget || 0));
    setShifts(s.baseConfig?.shifts || DEFAULT_BASE_CONFIG.shifts);
    setSiteName(site.name || '');
    setSiteCode(site.code || '');
    setSiteAddress(s.sitePosition?.siteAddress || site.address || '');
    setAttendanceTolerance(
      Number(
        s.baseConfig?.attendanceToleranceMinutes ?? DEFAULT_BASE_CONFIG.attendanceToleranceMinutes
      )
    );
  }, [site.id, site.name, site.code, site.address]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node))
        setSuggestions([]);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
          { headers: { 'Accept-Language': 'fr' } }
        );
        const data = await res.json();
        setSuggestions(data);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  function handleSelectSuggestion(result: NominatimResult) {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setSiteAddress(result.display_name);
    setSettings((prev) =>
      prev ? { ...prev, sitePosition: { siteAddress: result.display_name, lat, lng } } : prev
    );
    setSuggestions([]);
  }

  function addShift() {
    setShifts((prev) => [...prev, { id: Date.now(), name: '', start: '08:00', end: '16:00' }]);
  }
  function removeShift(id: number) {
    setShifts((prev) => prev.filter((s) => s.id !== id));
  }
  function updateShift(id: number, field: 'name' | 'start' | 'end', value: string) {
    setShifts((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }

  async function handleSaveAll() {
    setSaving(true);
    try {
      // If creating a new site, add it to the store first (force Senegal if available)
      if (propsIsNew()) {
        const countries = countryStore.getCountries();
        const sen = countries.find((c) => c.codeIso === 'SEN' || /sénégal|senegal/i.test(c.name));
        const countryIdForNew = sen ? sen.id : site.countryId;
        const newSite = countryStore.addSite({
          name: siteName || site.name || 'Nouveau site',
          code: (siteCode || 'NEW').toUpperCase(),
          address: siteAddress || '',
          countryId: countryIdForNew || '',
          isActive: true,
        });
        await saveSiteSettings(newSite.id, {
          baseConfig: {
            ...(settings?.baseConfig || DEFAULT_BASE_CONFIG),
            shifts,
            attendanceToleranceMinutes: attendanceTolerance,
          },
          sitePosition: {
            siteAddress,
            lat: settings?.sitePosition?.lat ?? null,
            lng: settings?.sitePosition?.lng ?? null,
          },
          annualBudget: Number(budgetValue) || 0,
        });
        siteCtx.refresh();
        const updated = countryStore.getSiteById(newSite.id);
        if (updated) siteCtx.setViewSite(updated);
        onClose();
        return;
      }

      // update site basic info
      countryStore.updateSite(site.id, { name: siteName, code: siteCode, address: siteAddress });

      // update site settings
      await saveSiteSettings(site.id, {
        baseConfig: {
          ...(settings?.baseConfig || DEFAULT_BASE_CONFIG),
          shifts,
          attendanceToleranceMinutes: attendanceTolerance,
        },
        sitePosition: {
          siteAddress,
          lat: settings?.sitePosition?.lat ?? null,
          lng: settings?.sitePosition?.lng ?? null,
        },
        annualBudget: Number(budgetValue) || 0,
      });

      // refresh context and set view site to ensure header sync
      siteCtx.refresh();
      const updated = countryStore.getSiteById(site.id);
      if (updated) siteCtx.setViewSite(updated);
    } catch (e) {
      // noop
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveBudget() {
    const amount = Number(budgetValue) || 0;
    // If this drawer is in creation mode, recommend saving via "Enregistrer toutes les modifications" instead
    if (propsIsNew()) {
      // Store temporarily but creation will persist under real site id when saved
      saveSiteSettings(site.id, { annualBudget: amount });
      setBudgetSaved(true);
      setTimeout(() => setBudgetSaved(false), 2500);
      return;
    }
    saveAnnualBudgetForSite(site.id, amount);
    setBudgetSaved(true);
    siteCtx.refresh();
    const updated = countryStore.getSiteById(site.id);
    if (updated) siteCtx.setViewSite(updated);
    setTimeout(() => setBudgetSaved(false), 2500);
  }

  function propsIsNew() {
    return Boolean(isNew || (site.id && String(site.id).startsWith('new_')));
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto h-full w-full max-w-4xl overflow-auto bg-white p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="mb-2 text-2xl font-bold">Configuration : {siteName || 'Nouveau site'}</h2>
        <p className="mb-6 text-sm text-gray-500">
          Éditez les informations générales, shifts, paramètres opérationnels et budget pour ce
          site.
        </p>

        {/* General site info */}
        <div className="mb-6 rounded-xl bg-gray-50 p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Nom du site</label>
              <input
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Code</label>
              <input
                value={siteCode}
                onChange={(e) => setSiteCode(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Adresse</label>
              <input
                value={siteAddress}
                onChange={(e) => setSiteAddress(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Shifts */}
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <Clock className="h-4 w-4 text-indigo-600" /> Gestion des Shifts
            </h3>
            <button
              onClick={addShift}
              className="flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100"
            >
              {' '}
              <Plus className="h-3.5 w-3.5" /> Ajouter
            </button>
          </div>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="block text-xs font-semibold text-gray-500">
                Tolérance pointage (minutes)
              </label>
              <input
                type="number"
                min={0}
                value={attendanceTolerance}
                onChange={(e) => setAttendanceTolerance(Number(e.target.value) || 0)}
                className="w-24 rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
              />
              <div className="text-xs text-gray-400">Marges autorisées pour retard/avance</div>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-100 text-xs uppercase">
                  <th className="px-4 py-3 text-left">Nom du Shift</th>
                  <th className="px-4 py-3 text-left">Heure Début</th>
                  <th className="px-4 py-3 text-left">Heure Fin</th>
                  <th className="w-16 px-4 py-3 text-left"></th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((s, idx) => (
                  <tr
                    key={s.id}
                    className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} transition-colors hover:bg-blue-50`}
                  >
                    <td className="px-4 py-2">
                      <input
                        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
                        value={s.name}
                        onChange={(e) => updateShift(s.id, 'name', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="time"
                        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
                        value={s.start}
                        onChange={(e) => updateShift(s.id, 'start', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="time"
                        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
                        value={s.end}
                        onChange={(e) => updateShift(s.id, 'end', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => removeShift(s.id)}
                        className="rounded-lg bg-red-50 p-1.5 text-red-600 hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {shifts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-400">
                      Aucun shift configuré
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Site Operational Params (position) */}
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-md">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <Navigation className="h-4 w-4 text-emerald-600" /> Paramètres Opérationnels
            </h3>
            <div className="text-xs text-gray-500">Coordonnées GPS et adresse opérationnelle</div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-500">
                Adresse du Site
              </label>
              <input
                value={siteAddress}
                onChange={(e) => {
                  setSiteAddress(e.target.value);
                  setSettings((prev) =>
                    prev
                      ? {
                          ...prev,
                          sitePosition: {
                            ...(prev.sitePosition || { siteAddress: '' }),
                            siteAddress: e.target.value,
                          },
                        }
                      : prev
                  );
                }}
                placeholder="Ex: Terminal IVOS, Zone Portuaire, Dakar"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
              />
            </div>
            <div className="relative space-y-1" ref={suggestionsRef}>
              <label className="mb-1 block text-xs font-semibold text-gray-500">
                Recherche GPS (Nominatim)
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tapez pour rechercher..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-10 text-sm"
                />
                {loadingSuggestions ? (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                    ...
                  </div>
                ) : (
                  <MapPin className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
                )}
              </div>
              {suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                  {suggestions.map((s) => (
                    <button
                      key={s.place_id}
                      onClick={() => handleSelectSuggestion(s)}
                      className="w-full px-4 py-2.5 text-left text-xs text-gray-700 hover:bg-emerald-50"
                    >
                      {s.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Latitude</label>
              <input
                type="number"
                step="any"
                value={settings?.sitePosition?.lat ?? ''}
                onChange={(e) =>
                  setSettings((prev) =>
                    prev
                      ? {
                          ...prev,
                          sitePosition: {
                            ...(prev.sitePosition || { siteAddress: '' }),
                            lat: parseFloat(e.target.value) || null,
                          },
                        }
                      : prev
                  )
                }
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Longitude</label>
              <input
                type="number"
                step="any"
                value={settings?.sitePosition?.lng ?? ''}
                onChange={(e) =>
                  setSettings((prev) =>
                    prev
                      ? {
                          ...prev,
                          sitePosition: {
                            ...(prev.sitePosition || { siteAddress: '' }),
                            lng: parseFloat(e.target.value) || null,
                          },
                        }
                      : prev
                  )
                }
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            {!propsIsNew() && (
              <button
                onClick={() => {
                  updateSitePosition(site.id, {
                    siteAddress,
                    lat: settings?.sitePosition?.lat ?? null,
                    lng: settings?.sitePosition?.lng ?? null,
                  });
                  siteCtx.refresh();
                  const updated = countryStore.getSiteById(site.id);
                  if (updated) siteCtx.setViewSite(updated);
                }}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-white"
              >
                Enregistrer la Position
              </button>
            )}
            {propsIsNew() && (
              <div className="text-xs text-gray-400">
                Créer le site pour activer l'enregistrement de la position
              </div>
            )}
          </div>
        </div>

        {/* Budget */}
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <DollarSign className="h-4 w-4 text-green-600" /> Gestion Budget
            </h3>
            {budgetSaved && (
              <span className="rounded-full bg-green-50 px-3 py-1 text-xs text-green-700">
                Budget enregistré
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">
                Budget Annuel (FCFA)
              </label>
              <input
                type="number"
                value={budgetValue}
                onChange={(e) => setBudgetValue(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
              />
            </div>
            <div className="flex items-end justify-end">
              {!propsIsNew() ? (
                <button
                  onClick={handleSaveBudget}
                  className="rounded-xl bg-green-600 px-6 py-2.5 text-white"
                >
                  {budgetSaved ? 'Enregistré' : 'Enregistrer le Budget'}
                </button>
              ) : (
                <div className="text-xs text-gray-400">
                  Le budget sera enregistré lors de la création du site
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-600">
            Fermer
          </button>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-white"
          >
            {saving ? (
              'Enregistrement...'
            ) : (
              <>
                {' '}
                <Save className="h-4 w-4" /> Enregistrer toutes les modifications
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
