
import React from 'react';
import { MapPin } from 'lucide-react';
import { useSite } from '@/shared/contexts/SiteContext';
import { useAppContext } from '../../store/useAppContext';


export default function ContextSelector() {
  // Les hooks doivent être appelés inconditionnellement
  const siteContext = useSite();
  const { allSites } = siteContext;
  const {
    currentSiteId,
    setCurrentSiteId,
    hydrateFromStorage,
  } = useAppContext();

  React.useEffect(() => { hydrateFromStorage(); }, [hydrateFromStorage]);

  const sites = allSites || [];

  // Si la liste des sites n'est pas prête, ne rien afficher
  if (!allSites) return null;

  return (
    <div className="flex items-center gap-4">
      {/* Dropdown Site uniquement (Pays implicite: Sénégal) */}
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-blue-900" />
        <select
          className="border rounded px-2 py-1 min-w-[160px]"
          value={currentSiteId || ''}
          onChange={e => {
            const val = e.target.value || null
            setCurrentSiteId(val)
            const selected = sites.find(s => s.id === val)
            try {
              // Update SiteContext view to reflect header selection immediately
              if (selected) siteContext.setViewSite(selected)
              else siteContext.setViewSite(null)
              siteContext.setConsolidatedView(false)
              siteContext.setViewCountry(null)
            } catch (err) {
              // ignore if methods not available
            }
          }}
        >
          <option value="">{siteContext.activeSite?.name || 'Site'}</option>
          {sites.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
