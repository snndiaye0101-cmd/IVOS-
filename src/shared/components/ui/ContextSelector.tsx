
import React from 'react';
import { Globe, MapPin } from 'lucide-react';
import { useSite } from '@/shared/contexts/SiteContext';
import { useAppContext } from '../../store/useAppContext';


export default function ContextSelector() {
  // Les hooks doivent être appelés inconditionnellement
  const siteContext = useSite();
  const { allCountries, allSites } = siteContext;
  const {
    currentCountryId,
    currentSiteId,
    setCurrentCountryId,
    setCurrentSiteId,
    hydrateFromStorage,
  } = useAppContext();

  React.useEffect(() => { hydrateFromStorage(); }, [hydrateFromStorage]);

  const selectedCountry = allCountries.find(c => c.id === currentCountryId) || null;
  const filteredSites = selectedCountry
    ? allSites.filter(s => s.countryId === selectedCountry.id)
    : [];

  // Si le contexte n'est pas prêt, on affiche un loader ou rien
  if (!allCountries || !allSites) return null;

  return (
    <div className="flex items-center gap-4">
      {/* Dropdown Pays piloté par Zustand */}
      <div className="flex items-center gap-2">
        <Globe className="h-5 w-5 text-blue-900" />
        <select
          className="border rounded px-2 py-1 min-w-[120px]"
          value={currentCountryId || ''}
          onChange={e => {
            setCurrentCountryId(e.target.value || null);
            setCurrentSiteId(null);
          }}
        >
          <option value="">Pays</option>
          {allCountries.map(c => (
            <option key={c.id} value={c.id}>
              {c.flagEmoji || ''} {c.name}
            </option>
          ))}
        </select>
      </div>
      {/* Dropdown Site piloté par Zustand */}
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-blue-900" />
        <select
          className="border rounded px-2 py-1 min-w-[120px]"
          value={currentSiteId || ''}
          onChange={e => {
            setCurrentSiteId(e.target.value || null);
          }}
          disabled={!selectedCountry}
        >
          <option value="">Site</option>
          {filteredSites.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
