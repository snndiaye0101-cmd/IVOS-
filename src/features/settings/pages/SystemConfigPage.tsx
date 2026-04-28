import React, { useState, useEffect, useRef } from 'react'
import { ExpandableCountryRow } from '../components/ExpandableCountryRow'
import { countriesWestAfrica, CountryReference } from '../data/countriesWestAfrica'
import { Zap } from 'lucide-react'
import { useAuth } from '../../../shared/contexts/AuthContext'
import { useSite } from '../../../shared/contexts/SiteContext'
import { permissionStore } from '../../../shared/services/permissionStore'
import { countryStore, type ICountry, type ISite, type IExchangeRate } from '../../../shared/services/countryStore'
import { authStore } from '../../../shared/services/authStore'
import {
  Globe, MapPin, DollarSign, Users, Plus, Pencil, Trash2, ChevronLeft,
  Search, Shield, ArrowRightLeft, Building2, Flag, Save, X, Check, AlertTriangle
} from 'lucide-react'

type Tab = 'countries' | 'sites' | 'users' | 'rates'

import { useAppContext } from '../../../shared/store/useAppContext';
import { AnimatePresence, motion } from 'framer-motion';

  const { user } = useAuth();
  const { allCountries, allSites, refresh } = useSite();
  const { currentCountryId } = useAppContext();

  // Drawer Aperçu pays
  const [previewCountry, setPreviewCountry] = useState<ICountry | null>(null);
  // Modal édition pays
  const [editCountry, setEditCountry] = useState<ICountry | null>(null);
  // Confirmation suppression pays
  const [deleteCountry, setDeleteCountry] = useState<ICountry | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // Ajout site
  const [addSiteCountry, setAddSiteCountry] = useState<ICountry | null>(null);
  // Scroll synchronisé
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  if (!user || !permissionStore.isSuperAdmin(user.id)) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-3">
          <Shield className="h-12 w-12 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-gray-900">Accès refusé</h2>
          <p className="text-sm text-gray-500">Seul le Super Admin peut accéder à cette page.</p>
        </div>
      </div>
    );
  }


  // Filtrage contextuel : si un pays est sélectionné, n'afficher que celui-ci
  const filteredCountries = currentCountryId
    ? allCountries.filter(c => c.id === currentCountryId)
    : allCountries;

  // Expansion automatique sur le pays sélectionné dans le contexte
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  useEffect(() => {
    if (currentCountryId) setExpandedId(currentCountryId);
    else setExpandedId(null);
  }, [currentCountryId]);

  // Scroll automatique sur le pays sélectionné
  useEffect(() => {
    if (currentCountryId && rowRefs.current[currentCountryId]) {
      rowRefs.current[currentCountryId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentCountryId, expandedId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-indigo-600" />
            </div>
            Configuration Système
          </h1>
          <p className="text-sm text-gray-400 mt-1 ml-[52px]">Gestion des pays, sites et devises — Expansion internationale</p>
        </div>
      </div>

      {/* Master-detail : pays = accordéon, sites listés à l'intérieur */}
      <motion.div
        key={currentCountryId || 'all'}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -24 }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
        className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm"
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Pays</th>
              <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Code ISO</th>
              <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Devise</th>
              <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Symbole</th>
              <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Sites</th>
              <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredCountries.map(c => {
              const siteCount = allSites.filter(s => s.countryId === c.id).length;
              const sites = allSites.filter(s => s.countryId === c.id);
              return (
                <ExpandableCountryRow
                  key={c.id}
                  country={c}
                  expanded={expandedId === c.id}
                  onExpand={() => setExpandedId(expandedId === c.id ? null : c.id)}
                  siteCount={siteCount}
                >
                  {/* Toolbar pays et contenu sites sont gérés dans ExpandableCountryRow */}
                </ExpandableCountryRow>
              );
            })}
                  {/* Drawer Aperçu pays */}
                  {previewCountry && (
                    <div className="fixed inset-0 z-50 flex">
                      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setPreviewCountry(null)} />
                      <div className="relative ml-auto w-full max-w-md bg-white h-full shadow-2xl p-8 flex flex-col">
                        <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700" onClick={() => setPreviewCountry(null)}><X className="h-5 w-5" /></button>
                        <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><Flag className="h-5 w-5" /> {previewCountry.name}</h2>
                        <div className="mb-4 text-sm text-gray-500">Devise : <span className="font-mono font-semibold">{previewCountry.currencyCode}</span> ({previewCountry.currencySymbol})</div>
                        <div className="mb-4">
                          <div className="font-semibold text-xs text-gray-500 uppercase mb-1">Sites</div>
                          <ul className="space-y-1">
                            {allSites.filter(s => s.countryId === previewCountry.id).map(site => (
                              <li key={site.id} className="flex items-center gap-2 text-xs"><MapPin className="h-3 w-3 text-indigo-400" /> {site.name} <span className="text-gray-400">({site.code})</span></li>
                            ))}
                            {allSites.filter(s => s.countryId === previewCountry.id).length === 0 && <li className="text-gray-400 italic">Aucun site</li>}
                          </ul>
                        </div>
                        <div className="font-semibold text-xs text-gray-500 uppercase mb-1">Résumé Fiscalité</div>
                        <div className="text-xs text-gray-700 mb-2">(À compléter selon vos données fiscales)</div>
                        <button className="mt-auto px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold" onClick={() => setPreviewCountry(null)}>Fermer</button>
                      </div>
                    </div>
                  )}

                  {/* Modal édition pays (placeholder, à compléter avec votre logique d'édition) */}
                  {editCountry && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setEditCountry(null)} />
                      <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg">
                        <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700" onClick={() => setEditCountry(null)}><X className="h-5 w-5" /></button>
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Pencil className="h-5 w-5" /> Modifier {editCountry.name}</h2>
                        {/* ...formulaire d'édition existant à insérer ici... */}
                        <div className="mt-6 flex justify-end gap-2">
                          <button className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold" onClick={() => setEditCountry(null)}>Annuler</button>
                          <button className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold">Enregistrer</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Confirmation suppression pays */}
                  {deleteCountry && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeleteCountry(null)} />
                      <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
                        <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700" onClick={() => setDeleteCountry(null)}><X className="h-5 w-5" /></button>
                        <h2 className="text-lg font-bold mb-2 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500" /> Supprimer {deleteCountry.name} ?</h2>
                        <div className="mb-4 text-sm text-gray-500">Cette action est irréversible.</div>
                        {deleteError && <div className="mb-2 text-sm text-red-600">{deleteError}</div>}
                        <div className="flex justify-end gap-2 mt-4">
                          <button className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold" onClick={() => setDeleteCountry(null)}>Annuler</button>
                          <button
                            className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold"
                            onClick={() => {
                              const hasSites = allSites.some(s => s.countryId === deleteCountry.id);
                              // TODO: vérifier aussi les employés rattachés si besoin
                              if (hasSites) {
                                setDeleteError('Impossible de supprimer ce pays : des sites y sont rattachés.');
                                return;
                              }
                              countryStore.deleteCountry(deleteCountry.id);
                              refresh();
                              setDeleteCountry(null);
                            }}
                          >Supprimer</button>
                        </div>
                      </div>
                    </div>
                  )}


            {filteredCountries.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400 text-sm">Aucun pays configuré</td></tr>
            )}
          </tbody>
        </table>
      </motion.div>

      {/* Modal ajout site (placeholder) */}
      {addSiteCountry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setAddSiteCountry(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700" onClick={() => setAddSiteCountry(null)}><X className="h-5 w-5" /></button>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Plus className="h-5 w-5" /> Ajouter un site à {addSiteCountry.name}</h2>
            {/* ...formulaire d'ajout site, champ pays verrouillé... */}
            <div className="mt-6 flex justify-end gap-2">
              <button className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold" onClick={() => setAddSiteCountry(null)}>Annuler</button>
              <button className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold">Créer le site</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
      countryStore.updateCountry(editId, { name, codeIso: codeIso.toUpperCase(), currencyCode: currencyCode.toUpperCase(), currencySymbol, flagEmoji })
    } else {
      countryStore.addCountry({ name, codeIso: codeIso.toUpperCase(), currencyCode: currencyCode.toUpperCase(), currencySymbol, flagEmoji, isActive: true })
    }
    onRefresh(); resetForm()
  }

  const handleDelete = (id: string) => {
    if (!countryStore.deleteCountry(id)) {
      alert('Impossible de supprimer ce pays : des sites y sont rattachés.')
      return
    }
    onRefresh()
  }

  // Détail accordéon : 3 colonnes (fiscalité, structure, monétaire)
  const renderDetails = (country: ICountry) => {
    // TODO: Remplacer par vraies données fiscales/sites/monétaires
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 px-4">
        {/* Fiscalité */}
        <div>
          <div className="font-semibold text-xs text-gray-500 mb-2 uppercase tracking-wider">Fiscalité</div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-semibold">{country.flagEmoji} IPRES/CSS</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-yellow-50 text-yellow-700 text-xs font-semibold">{country.flagEmoji} CNPS/ITS</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold">{country.flagEmoji} INPS/RTS</span>
          </div>
        </div>
        {/* Structure */}
        <div>
          <div className="font-semibold text-xs text-gray-500 mb-2 uppercase tracking-wider">Structure</div>
          <ul className="text-xs text-gray-700 space-y-1">
            {/* TODO: Lister les sites/agences */}
            <li>Site principal</li>
            <li>Agence 1</li>
            <li>Agence 2</li>
          </ul>
        </div>
        {/* Monétaire */}
        <div>
          <div className="font-semibold text-xs text-gray-500 mb-2 uppercase tracking-wider">Paramètres Monétaires</div>
          <div className="text-xs text-gray-700">
            <div>Devise : <span className="font-mono font-semibold">{country.currencyCode}</span></div>
            <div>Symbole : <span className="font-mono font-semibold">{country.currencySymbol}</span></div>
            <div>Format : <span className="font-mono">1 000 {country.currencySymbol}</span></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Pays enregistrés</h2>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
          <Plus className="h-4 w-4" /> Ajouter un pays
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900">{editId ? 'Modifier le pays' : 'Nouveau pays'}</h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nom du pays</label>
              <select
                value={name}
                onChange={e => handleCountryChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/25 focus:bg-white transition-all"
              >
                <option value="">— Sélectionner —</option>
                {countriesWestAfrica.map(c => (
                  <option key={c.iso3} value={c.name}>{c.flag} {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Code ISO (3 lettres)
                {autoFilled.iso && <Zap className="inline ml-1 h-4 w-4 text-yellow-400 align-text-bottom" title="Auto-rempli" />}
              </label>
              <input value={codeIso} onChange={e => { setCodeIso(e.target.value); setAutoFilled(a => ({...a, iso: false})) }} placeholder="SEN" maxLength={3} className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/25 focus:bg-white transition-all uppercase" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Code Devise (ISO 4217)
                {autoFilled.currency && <Zap className="inline ml-1 h-4 w-4 text-yellow-400 align-text-bottom" title="Auto-rempli" />}
              </label>
              <input value={currencyCode} onChange={e => { setCurrencyCode(e.target.value); setAutoFilled(a => ({...a, currency: false})) }} placeholder="XOF" maxLength={3} className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/25 focus:bg-white transition-all uppercase" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Symbole Devise
                {autoFilled.symbol && <Zap className="inline ml-1 h-4 w-4 text-yellow-400 align-text-bottom" title="Auto-rempli" />}
              </label>
              <input value={currencySymbol} onChange={e => { setCurrencySymbol(e.target.value); setAutoFilled(a => ({...a, symbol: false})) }} placeholder="F CFA" className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/25 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Drapeau (emoji)
                {autoFilled.flag && <Zap className="inline ml-1 h-4 w-4 text-yellow-400 align-text-bottom" title="Auto-rempli" />}
              </label>
              <input value={flagEmoji} onChange={e => { setFlagEmoji(e.target.value); setAutoFilled(a => ({...a, flag: false})) }} placeholder="🇸🇳" className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/25 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Indicatif Téléphonique
                {autoFilled.phone && <Zap className="inline ml-1 h-4 w-4 text-yellow-400 align-text-bottom" title="Auto-rempli" />}
              </label>
              <input value={phonePrefix} onChange={e => { setPhonePrefix(e.target.value); setAutoFilled(a => ({...a, phone: false})) }} placeholder="+221" className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/25 focus:bg-white transition-all" />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={resetForm} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 font-medium">Annuler</button>
            <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors">
              <Save className="h-4 w-4" /> {editId ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </div>
      )}

// Bloc doublon supprimé : table/accordéon et boucle {countries.map(...)}

// ─────────────────────────────────────────────
//  SITES TAB
// ─────────────────────────────────────────────
function SitesTab({ onRefresh, countries, sites }: { onRefresh: () => void; countries: ICountry[]; sites: ISite[] }) {
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [countryId, setCountryId] = useState('')
  const [address, setAddress] = useState('')
  const [error, setError] = useState('')

  const resetForm = () => {
    setShowForm(false); setEditId(null); setName(''); setCode(''); setCountryId(''); setAddress(''); setError('')
  }

  const openEdit = (s: ISite) => {
    setEditId(s.id); setName(s.name); setCode(s.code); setCountryId(s.countryId); setAddress(s.address); setShowForm(true)
  }

  const handleSave = () => {
    if (!name.trim() || !code.trim() || !countryId) {
      setError('Nom, code et pays sont obligatoires'); return
    }
    if (editId) {
      countryStore.updateSite(editId, { name, code: code.toUpperCase(), countryId, address })
    } else {
      countryStore.addSite({ name, code: code.toUpperCase(), countryId, address, isActive: true })
    }
    onRefresh(); resetForm()
  }

  const handleDelete = (id: string) => {
    countryStore.deleteSite(id)
    onRefresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Sites opérationnels</h2>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
          <Plus className="h-4 w-4" /> Ajouter un site
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900">{editId ? 'Modifier le site' : 'Nouveau site'}</h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nom du site</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Dakar (Siège)" className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/25 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Code</label>
              <input value={code} onChange={e => setCode(e.target.value)} placeholder="DKR" maxLength={10} className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/25 focus:bg-white transition-all uppercase" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Pays</label>
              <select value={countryId} onChange={e => setCountryId(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/25 focus:bg-white transition-all">
                <option value="">— Sélectionner —</option>
                {countries.map(c => (
                  <option key={c.id} value={c.id}>{c.flagEmoji} {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Adresse</label>
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Zone Industrielle, Dakar" className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/25 focus:bg-white transition-all" />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={resetForm} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 font-medium">Annuler</button>
            <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors">
              <Save className="h-4 w-4" /> {editId ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Site</th>
              <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Code</th>
              <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Pays</th>
              <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Devise</th>
              <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Adresse</th>
              <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sites.map(s => {
              const country = countries.find(c => c.id === s.countryId)
              return (
                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-indigo-400" />
                      {s.name}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 font-mono">{s.code}</td>
                  <td className="px-5 py-3.5 text-gray-600">{country ? `${country.flagEmoji} ${country.name}` : '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-semibold">
                      <DollarSign className="h-3 w-3" /> {country?.currencyCode || '—'} ({country?.currencySymbol})
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs">{s.address || '—'}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(s)} className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {sites.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400 text-sm">Aucun site configuré</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  USERS TAB — Assign country/site
// ─────────────────────────────────────────────
function UsersTab({
  countries, sites, users, approveUser, refreshUsers, onRefresh,
}: {
  countries: ICountry[]; sites: ISite[]; users: ReturnType<typeof authStore.getUsers>;
  approveUser: (id: string, fonction: string, makeAdmin: boolean, countryId?: string, siteId?: string) => boolean;
  refreshUsers: () => void; onRefresh: () => void;
}) {
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selCountryId, setSelCountryId] = useState('')
  const [selSiteId, setSelSiteId] = useState('')
  const [selFonction, setSelFonction] = useState('')
  const [error, setError] = useState('')

  const approvedUsers = users.filter(u => u.status === 'approved')
  const pendingUsers = users.filter(u => u.status === 'pending')

  const filteredApproved = approvedUsers.filter(u =>
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const startEdit = (u: typeof users[0]) => {
    setEditingId(u.id)
    setSelCountryId(u.countryId || '')
    setSelSiteId(u.siteId || '')
    setSelFonction(u.fonction || '')
    setError('')
  }

  const saveAssignment = (userId: string) => {
    if (!selCountryId || !selSiteId) {
      setError('Le pays et le site sont obligatoires'); return
    }
    // Update user's country/site via authStore directly
    const allU = authStore.getUsers()
    const usr = allU.find(u => u.id === userId)
    if (!usr) return
    usr.countryId = selCountryId
    usr.siteId = selSiteId
    if (selFonction) usr.fonction = selFonction
    authStore.saveUsers(allU)
    refreshUsers()
    setEditingId(null)
  }

  const handleApprove = (userId: string) => {
    if (!selCountryId || !selSiteId) {
      setError('Vous devez affecter un pays et un site avant d\'approuver'); return
    }
    approveUser(userId, selFonction, false, selCountryId, selSiteId)
    refreshUsers()
    setEditingId(null)
  }

  const availableSites = selCountryId ? sites.filter(s => s.countryId === selCountryId) : []

  return (
    <div className="space-y-6">
      {/* Pending Users */}
      {pendingUsers.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Comptes en attente d'approbation
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">{pendingUsers.length}</span>
          </h2>
          <div className="space-y-2">
            {pendingUsers.map(u => (
              <div key={u.id} className="bg-white rounded-2xl p-5 border border-amber-100 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">{u.fullName}</p>
                    <p className="text-sm text-gray-400">{u.email}</p>
                  </div>
                  {editingId === u.id ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleApprove(u.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg">
                        <Check className="h-3.5 w-3.5" /> Approuver
                      </button>
                      <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-gray-500 text-xs font-medium">Annuler</button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit(u)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg">
                      <Users className="h-3.5 w-3.5" /> Affecter & Approuver
                    </button>
                  )}
                </div>
                {editingId === u.id && (
                  <div className="mt-4 space-y-3">
                    {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Fonction</label>
                        <input value={selFonction} onChange={e => setSelFonction(e.target.value)} placeholder="Chauffeur, Opérateur…" className="w-full px-3 py-2 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/25 focus:bg-white transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Pays *</label>
                        <select value={selCountryId} onChange={e => { setSelCountryId(e.target.value); setSelSiteId('') }} className="w-full px-3 py-2 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/25 focus:bg-white transition-all">
                          <option value="">— Pays —</option>
                          {countries.map(c => <option key={c.id} value={c.id}>{c.flagEmoji} {c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Site *</label>
                        <select value={selSiteId} onChange={e => setSelSiteId(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/25 focus:bg-white transition-all" disabled={!selCountryId}>
                          <option value="">— Site —</option>
                          {availableSites.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved Users */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Utilisateurs actifs</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…" className="pl-9 pr-4 py-2 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/25 focus:bg-white transition-all w-64" />
          </div>
        </div>

        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Utilisateur</th>
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Fonction</th>
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Pays</th>
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Site</th>
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredApproved.map(u => {
                const country = countries.find(c => c.id === u.countryId)
                const site = sites.find(s => s.id === u.siteId)
                const isEditing = editingId === u.id
                return (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900">{u.fullName}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">{u.fonction || '—'}</td>
                    {isEditing ? (
                      <>
                        <td className="px-5 py-2">
                          <select value={selCountryId} onChange={e => { setSelCountryId(e.target.value); setSelSiteId('') }} className="w-full px-2 py-1.5 rounded-lg bg-gray-50 text-xs outline-none focus:ring-2 focus:ring-indigo-500/25">
                            <option value="">—</option>
                            {countries.map(c => <option key={c.id} value={c.id}>{c.flagEmoji} {c.name}</option>)}
                          </select>
                        </td>
                        <td className="px-5 py-2">
                          <select value={selSiteId} onChange={e => setSelSiteId(e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-gray-50 text-xs outline-none focus:ring-2 focus:ring-indigo-500/25" disabled={!selCountryId}>
                            <option value="">—</option>
                            {availableSites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </td>
                        <td className="px-5 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => saveAssignment(u.id)} className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition-colors">
                              <Check className="h-4 w-4" />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-5 py-3.5 text-gray-600">
                          {country ? <span>{country.flagEmoji} {country.name}</span> : <span className="text-gray-300">Non affecté</span>}
                        </td>
                        <td className="px-5 py-3.5 text-gray-600">
                          {site ? site.name : <span className="text-gray-300">Non affecté</span>}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button onClick={() => startEdit(u)} className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                            <Pencil className="h-4 w-4" />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
              {filteredApproved.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400 text-sm">Aucun utilisateur trouvé</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  EXCHANGE RATES TAB
// ─────────────────────────────────────────────
function RatesTab({ countries, referenceCurrency, onRefresh }: { countries: ICountry[]; referenceCurrency: string; onRefresh: () => void }) {
  const [rates, setRates] = useState<IExchangeRate[]>(() => countryStore.getExchangeRates())
  const [sourceCurrency, setSourceCurrency] = useState('')
  const [rate, setRate] = useState('')
  const [refCurrency, setRefCurrency] = useState(referenceCurrency)

  const uniqueCurrencies = [...new Set(countries.map(c => c.currencyCode))]

  const handleSaveRate = () => {
    if (!sourceCurrency || !rate) return
    countryStore.setExchangeRate(sourceCurrency, refCurrency, parseFloat(rate))
    setRates(countryStore.getExchangeRates())
    setSourceCurrency(''); setRate('')
  }

  const handleSaveRef = () => {
    countryStore.setReferenceCurrency(refCurrency)
    onRefresh()
  }

  return (
    <div className="space-y-6">
      {/* Reference currency */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          Devise de référence (Dashboard consolidé)
        </h3>
        <div className="flex items-center gap-4">
          <select value={refCurrency} onChange={e => setRefCurrency(e.target.value)} className="px-3.5 py-2.5 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/25 focus:bg-white transition-all">
            {uniqueCurrencies.map(c => {
              const country = countries.find(co => co.currencyCode === c)
              return <option key={c} value={c}>{c} — {country?.currencySymbol}</option>
            })}
          </select>
          <button onClick={handleSaveRef} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors">
            <Save className="h-4 w-4" /> Enregistrer
          </button>
        </div>
      </div>

      {/* Add rate */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-indigo-600" />
          Définir un taux de change
        </h3>
        <div className="flex items-end gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Devise source</label>
            <select value={sourceCurrency} onChange={e => setSourceCurrency(e.target.value)} className="px-3.5 py-2.5 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/25 focus:bg-white transition-all">
              <option value="">—</option>
              {uniqueCurrencies.filter(c => c !== refCurrency).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 text-gray-400 pb-2">
            <ArrowRightLeft className="h-4 w-4" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Taux (1 source = ? {refCurrency})</label>
            <input type="number" step="0.000001" value={rate} onChange={e => setRate(e.target.value)} placeholder="1.000000" className="w-40 px-3.5 py-2.5 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/25 focus:bg-white transition-all" />
          </div>
          <button onClick={handleSaveRate} className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors">
            <Save className="h-4 w-4" /> Enregistrer
          </button>
        </div>
      </div>

      {/* Rates table */}
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Source</th>
              <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Cible</th>
              <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Taux</th>
              <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Date effective</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rates.sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate)).map(r => (
              <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-3.5 font-mono text-gray-700">{r.sourceCurrency}</td>
                <td className="px-5 py-3.5 font-mono text-gray-700">{r.targetCurrency}</td>
                <td className="px-5 py-3.5 font-semibold text-gray-900">{r.rate.toFixed(6)}</td>
                <td className="px-5 py-3.5 text-gray-500">{r.effectiveDate}</td>
              </tr>
            ))}
            {rates.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-gray-400 text-sm">Aucun taux défini</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
