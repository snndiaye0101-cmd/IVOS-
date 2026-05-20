import React, { useState, useEffect, useRef } from 'react';
import { formatCleanAmount } from '@/shared/utils/formatAmount';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import {
  Settings,
  Clock,
  Plus,
  Trash2,
  Save,
  MapPin,
  Building2,
  Navigation,
  Loader2,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import {
  getAnnualBudget,
  saveAnnualBudget,
  isBudgetExceeded,
} from '../../../shared/services/budgetService';
import {
  loadBaseConfig,
  saveBaseConfig,
  type BaseConfig,
  type Shift,
} from '../services/baseConfigStore';

export const SITE_KEY = 'ivos_site_config_v1';

interface SiteConfig {
  siteAddress: string;
  lat: number | null;
  lng: number | null;
}

const SITE_DEFAULTS: SiteConfig = { siteAddress: '', lat: null, lng: null };

function loadSiteConfig(): SiteConfig {
  try {
    const raw = localStorage.getItem(SITE_KEY);
    if (raw) return { ...SITE_DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return SITE_DEFAULTS;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export default function BaseConfigPage() {
  const [config, setConfig] = useState<BaseConfig>(loadBaseConfig);
  const [saved, setSaved] = useState(false);

  // --- Gestion Budget ---
  const [annualBudget, setAnnualBudget] = useState<string>('120000000');
  const [budgetSaved, setBudgetSaved] = useState(false);
  const [budgetError, setBudgetError] = useState('');

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const amount = await getAnnualBudget();
        if (mounted) setAnnualBudget(amount.toString());
      } catch {
        // ignore budget load errors, keep default
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // --- Site Opérationnel ---
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(loadSiteConfig);
  const [query, setQuery] = useState(loadSiteConfig().siteAddress);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [siteSaved, setSiteSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Nominatim autocomplete with debounce
  useEffect(() => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
          { headers: { 'Accept-Language': 'fr' } }
        );
        const data: NominatimResult[] = await res.json();
        setSuggestions(data);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setSuggestions([]);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelectSuggestion(result: NominatimResult) {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setSiteConfig({ siteAddress: result.display_name, lat, lng });
    setQuery(result.display_name);
    setSuggestions([]);
  }

  function handleSaveSite() {
    localStorage.setItem(SITE_KEY, JSON.stringify(siteConfig));
    setSiteSaved(true);
    setTimeout(() => setSiteSaved(false), 3000);
  }

  const hInfo = (e: React.ChangeEvent<HTMLInputElement>) =>
    setConfig((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  function addShift() {
    setConfig((prev) => ({
      ...prev,
      shifts: [...prev.shifts, { id: Date.now(), name: '', start: '08:00', end: '16:00' }],
    }));
  }
  function removeShift(id: number) {
    setConfig((prev) => ({ ...prev, shifts: prev.shifts.filter((s) => s.id !== id) }));
  }
  function updateShift(id: number, field: keyof Shift, value: string) {
    setConfig((prev) => ({
      ...prev,
      shifts: prev.shifts.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    }));
  }
  function handleSave() {
    saveBaseConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleSaveBudget() {
    const amount = parseFloat(annualBudget);
    if (isNaN(amount) || amount <= 0) {
      setBudgetError('Veuillez saisir un montant valide');
      return;
    }

    // Vérifier si le budget est inférieur aux dépenses actuelles
    // Simuler un calcul de dépenses pour la démo (à remplacer par vos vraies données)
    const currentExpenses = 0; // TODO: récupérer depuis le Dashboard Finance

    await saveAnnualBudget(amount);
    setBudgetSaved(true);
    setBudgetError('');
    setTimeout(() => setBudgetSaved(false), 3000);
  }

  function handleBudgetChange(e: React.ChangeEvent<HTMLInputElement>) {
    setAnnualBudget(e.target.value);
    setBudgetError('');
  }

  return (
    <div className="min-h-screen w-full">
      <div className="mb-6 flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
            <Settings className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Configuration de la Base</h1>
            <p className="text-sm text-gray-300">Paramètres généraux et gestion des shifts</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-md transition-all ${saved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          <Save className="h-4 w-4" />
          {saved ? 'Enregistré !' : 'Sauvegarder'}
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 rounded-2xl bg-white p-5 shadow-md">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase text-gray-800">
            <Building2 className="h-4 w-4 text-blue-600" /> Informations générales
          </h2>
          <Input label="Nom de la base" name="baseName" value={config.baseName} onChange={hInfo} />
          <Input label="Adresse" name="address" value={config.address} onChange={hInfo} />
          <Input label="Téléphone" name="phone" value={config.phone} onChange={hInfo} />
          <Input label="Email" name="email" value={config.email} onChange={hInfo} type="email" />
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-md lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase text-gray-800">
              <Clock className="h-4 w-4 text-indigo-600" /> Gestion des Shifts
            </h2>
            <button
              onClick={addShift}
              className="flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 transition-colors hover:bg-green-100"
            >
              <Plus className="h-3.5 w-3.5" /> Ajouter
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl">
            <table className="min-w-full">
              <thead>
                <tr className="bg-[#1a1a2e] text-xs uppercase text-white">
                  <th className="px-4 py-3 text-left">Nom du Shift</th>
                  <th className="px-4 py-3 text-left">Heure Début</th>
                  <th className="px-4 py-3 text-left">Heure Fin</th>
                  <th className="w-16 px-4 py-3 text-left"></th>
                </tr>
              </thead>
              <tbody>
                {config.shifts.map((s, idx) => (
                  <tr
                    key={s.id}
                    className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} transition-colors hover:bg-blue-50`}
                  >
                    <td className="px-4 py-2">
                      <input
                        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        value={s.name}
                        onChange={(e) => updateShift(s.id, 'name', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="time"
                        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        value={s.start}
                        onChange={(e) => updateShift(s.id, 'start', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="time"
                        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                {config.shifts.length === 0 && (
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
      </div>

      {/* ── Paramètres du Site Opérationnel ── */}
      <div className="mt-2 rounded-2xl bg-white p-5 shadow-md">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase text-gray-800">
            <Navigation className="h-4 w-4 text-emerald-600" />
            Paramètres du Site Opérationnel
          </h2>
          {siteConfig.lat && siteConfig.lng && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Coordonnées enregistrées
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Adresse du Site */}
          <div className="space-y-1 lg:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
              Adresse du Site
            </label>
            <input
              type="text"
              placeholder="Ex: Terminal IVOS, Zone Portuaire, Dakar"
              value={siteConfig.siteAddress}
              onChange={(e) => setSiteConfig((prev) => ({ ...prev, siteAddress: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          {/* Coordonnées GPS – Autocomplete Nominatim */}
          <div className="relative space-y-1" ref={suggestionsRef}>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
              Recherche GPS (Nominatim)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Tapez pour rechercher..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSiteConfig((prev) => ({
                    ...prev,
                    siteAddress: e.target.value,
                    lat: null,
                    lng: null,
                  }));
                }}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              {loadingSuggestions && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
              )}
              {!loadingSuggestions && (
                <MapPin className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
              )}
            </div>

            {/* Dropdown suggestions */}
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                {suggestions.map((s) => (
                  <button
                    key={s.place_id}
                    onClick={() => handleSelectSuggestion(s)}
                    className="w-full border-b border-gray-100 px-4 py-2.5 text-left text-xs text-gray-700 transition-colors last:border-0 hover:bg-emerald-50 hover:text-emerald-800"
                  >
                    <MapPin className="mr-1.5 inline h-3 w-3 text-emerald-500" />
                    {s.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Lat / Lng preview */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Latitude
            </label>
            <input
              type="number"
              step="any"
              placeholder="14.7167"
              value={siteConfig.lat ?? ''}
              onChange={(e) =>
                setSiteConfig((prev) => ({ ...prev, lat: parseFloat(e.target.value) || null }))
              }
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Longitude
            </label>
            <input
              type="number"
              step="any"
              placeholder="-17.4677"
              value={siteConfig.lng ?? ''}
              onChange={(e) =>
                setSiteConfig((prev) => ({ ...prev, lng: parseFloat(e.target.value) || null }))
              }
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={handleSaveSite}
            disabled={!siteConfig.lat || !siteConfig.lng}
            className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-40
              ${siteSaved ? 'bg-emerald-600 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
          >
            {siteSaved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {siteSaved ? 'Position Enregistrée !' : 'Enregistrer la Position du Site'}
          </button>
        </div>
      </div>

      {/* ── Gestion Budget ── */}
      <div className="mt-6 rounded-2xl bg-white p-5 shadow-md">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase text-gray-800">
            <DollarSign className="h-4 w-4 text-green-600" />
            Gestion Budget
          </h2>
          {budgetSaved && (
            <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Budget enregistré
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Champ de saisie du budget */}
          <div className="space-y-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
              Budget Annuel Global (FCFA)
            </label>
            <input
              type="number"
              placeholder="Ex: 120000000"
              value={annualBudget}
              onChange={handleBudgetChange}
              min="0"
              step="1000000"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            {budgetError && (
              <p className="flex items-center gap-1 text-xs text-red-600">
                <AlertTriangle className="h-3 w-3" />
                {budgetError}
              </p>
            )}
            <p className="text-xs text-gray-500">
              Montant formaté : {formatCleanAmount(parseFloat(annualBudget || '0'), 'FCFA')}
            </p>
          </div>

          {/* Informations et bouton */}
          <div className="flex flex-col justify-between">
            <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="mb-1 text-xs font-semibold text-blue-800">ℹ️ Information</p>
              <p className="text-xs text-blue-700">
                Ce budget annuel sera utilisé pour calculer automatiquement le ratio de consommation
                budgétaire sur le Dashboard Finance.
              </p>
            </div>
            <button
              onClick={handleSaveBudget}
              disabled={!annualBudget || parseFloat(annualBudget) <= 0}
              className={`flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                budgetSaved
                  ? 'bg-green-600 text-white'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {budgetSaved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {budgetSaved ? 'Budget Enregistré !' : 'Enregistrer le Budget'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
