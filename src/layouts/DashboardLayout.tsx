
import React, { useState, useEffect, useMemo } from 'react';
import ContextSelector from '../shared/components/ui/ContextSelector';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Truck, Car, Users, ClipboardList, FileText, UserCircle,
  Menu, X, Wrench, AlertTriangle, ClipboardCheck,
  LogOut, Shield, ChevronRight, Construction, Fuel, DollarSign,
  MapPin, BookOpen, Bell, Download, Database, Activity, Mail,
  Smartphone, Contact, FolderOpen, Globe, Building2, ChevronDown, Plus, Package, TrendingUp, BarChart2, Sparkles, ShieldAlert, ShieldCheck
} from 'lucide-react';
import { sendNotification } from '../shared/services/notificationService';
import { useAuth } from '../shared/contexts/AuthContext';
import { useViewAs } from '../shared/contexts/ViewAsContext';
import { useSite } from '../shared/contexts/SiteContext';
import { permissionStore } from '../shared/services/permissionStore';
import { criticalActionService } from '../shared/services/criticalActionService';
import { getUnreadInvoiceCount } from '../features/finances/services/workflowInvoiceService';
import { emailSyncService } from '../features/email-center/services/emailSyncService';
import { emailRealtimeService } from '../features/email-center/services/emailRealtimeService';

const BREAKDOWN_STORE_KEY = 'ivos_breakdowns_v1';

interface DashboardVehicleAlertRecord {
  fuelLevel?: number;
}

interface DashboardMaintenanceAlertRecord {
  nextMaintenanceDate?: string;
  status?: string;
}

function getActiveBreakdownCount(): number {
  try {
    const raw = localStorage.getItem(BREAKDOWN_STORE_KEY);
    if (!raw) return 0;
    return JSON.parse(raw).length;
  } catch {
    return 0;
  }
}



const menuSections = [
  {
    section: 'PILOTAGE OPÉRATIONNEL',
    icon: Activity,
    items: [
      { name: 'Dashboard', href: '/', icon: Activity },
      { name: 'Chat', href: '/communications/chat', icon: Users },
      { name: 'Agenda', href: '/communications/agenda', icon: ClipboardList },
      { name: 'Email Center', href: '/communications/email-center', icon: Mail },
      { name: 'Supervision Email', href: '/communications/email-center/admin', icon: ShieldCheck },
    ],
  },
  {
    section: 'REPORTING & IMPACT',
    icon: BarChart2,
    items: [
      { name: 'Reporting QHSE', href: '/qhse/reporting', icon: BarChart2, tooltip: 'Tableau de bord, Archives et Certificats regroupés' },
    ],
  },
  {
    section: 'Flotte',
    icon: Truck,
    items: [
      { name: 'Parc', href: '/vehicles', icon: Truck },
      { name: 'Véhicules de fonction', href: '/personal-vehicles', icon: Car },
      { name: 'Engins de Manutention', href: '/fleet/handling-equipment', icon: Package },
      { name: 'Hub Carburant', href: '/hub-carburant', icon: Fuel },
      { name: 'Suivi en Temps Réel', href: '/flotte/tracking', icon: MapPin },
    ],
  },
  {
    section: 'Exploitation',
    icon: ClipboardList,
    items: [
      { name: 'Opérations', href: '/exploitation', icon: ClipboardList },
      { name: 'Opérations Spéciales', href: '/exploitation/special-operations', icon: Wrench, tooltip: 'Service de maintenance technique pour le nettoyage des cuves et citernes.' },
      { name: 'BSD', href: '/exploitation/bsd-en-cours', icon: FileText, tooltip: 'Bordereaux de Suivi des Déchets en cours' },
    ],
  },
  {
    section: 'Finances',
    icon: DollarSign,
    items: [
      { name: 'Dashboard Finance', href: '/finances', icon: DollarSign },
      { name: 'Facturation', href: '/billing', icon: FileText },
      { name: 'Recettes', href: '/finances/revenues', icon: TrendingUp },
      { name: 'Unité de Facturation', href: '/unite-facturation', icon: Database },
      { name: 'Gestion des Prêts', href: '/finances/loans', icon: ClipboardCheck },
      { name: 'Paie avec Retenues', href: '/finances/salary-deductions', icon: FileText },
      { name: 'Récapitulatif Fiscal', href: '/finances/fiscal-recap', icon: BarChart2 },
      { name: 'Dépenses Globales', href: '/finances/global-expenses', icon: DollarSign },
    ],
  },
  {
    section: 'Immobilisations & Infrastructures',
    icon: Building2,
    items: [
      { name: 'Gestion des Immobilisations & Infrastructures', href: '/investissements', icon: Building2 },
    ],
  },
  {
    section: 'Technique',
    icon: Wrench,
    items: [
      { name: 'Maintenance / Pannes', href: '/maintenance', icon: Construction },
      { name: 'Assurances & Sinistres', href: '/sinistres', icon: Shield },
      { name: 'Pneumatique', href: '/pneumatique', icon: Wrench },
      { name: 'Inventaire & Maintenance Matériels', href: '/inventaire-maintenance-materiels', icon: Wrench },
    ],
  },
  {
    section: 'Ressources Humaines',
    icon: Users,
    items: [
      { name: 'Personnel', href: '/personnel', icon: Users },
      { name: 'Documents Entreprise', href: '/rh/documents', icon: FolderOpen },
      { name: 'Gestion RH', href: '/grh', icon: ClipboardCheck },
      { name: 'Borne de Pointage', href: '/borne-pointage', icon: Shield },
      { name: 'Demande Congé', href: '/demande-conges', icon: Smartphone },
      { name: 'Conception de Badges', href: '/annuaire/badges', icon: Contact },
    ],
  },
  {
    section: 'Paramètres',
    icon: Shield,
    items: [
      { name: 'Administration Système', href: '/settings/administration-systeme', icon: ShieldAlert },
      { name: 'Configuration Base', href: '/settings/base', icon: MapPin },
      { name: 'Référentiels Clients', href: '/settings/clients', icon: BookOpen },
      { name: "Seuils d'Alertes", href: '/settings/alerts', icon: Bell },
      { name: 'Sauvegardes', href: '/settings/backups', icon: Download },
      { name: 'Sécurité & Accès', href: '/settings/security', icon: Shield },
      { name: 'Configuration Système', href: '/settings/system-config', icon: Building2 },
      { name: 'Configuration Paie & Fiscalité', href: '/settings/payroll-fiscal-config', icon: DollarSign },
    ],
  },
]

export default function DashboardLayout() {
    // const { site, year } = useContextSelector();
    // Le contexte est accessible dans tous les modules/pages enfants via ce layout
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, isAdmin, pendingUsers } = useAuth()
  const viewAs = useViewAs();
  const site = useSite();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSiteSelector, setShowSiteSelector] = useState(false);
  const [invoiceBadge, setInvoiceBadge] = useState(0);
  const [maintenanceBadge, setMaintenanceBadge] = useState(0);
  const [emailBadge, setEmailBadge] = useState(0);
  const [fabOpen, setFabOpen] = useState(false);
  const [fuelAlertCount, setFuelAlertCount] = useState(0);
  const [maintenanceAlertCount, setMaintenanceAlertCount] = useState(0);

  // Mise à jour badge maintenance
  useEffect(() => {
    const update = () => setMaintenanceBadge(getActiveBreakdownCount());
    update();
    window.addEventListener('ivos_maintenance_change', update);
    return () => window.removeEventListener('ivos_maintenance_change', update);
  }, []);

  // Mise à jour badge facturation
  useEffect(() => {
    const updateInvoiceBadge = () => setInvoiceBadge(getUnreadInvoiceCount());
    updateInvoiceBadge();
    window.addEventListener('ivos_invoice_notif_change', updateInvoiceBadge);
    window.addEventListener('ivos_invoice_change', updateInvoiceBadge);
    return () => {
      window.removeEventListener('ivos_invoice_notif_change', updateInvoiceBadge);
      window.removeEventListener('ivos_invoice_change', updateInvoiceBadge);
    };
  }, []);

  // Mise à jour badge Email Center + sync globale en arriere-plan
  useEffect(() => {
    if (!user?.id) {
      setEmailBadge(0);
      emailSyncService.stopBackgroundSync();
      emailRealtimeService.stop();
      return;
    }

    const updateEmailBadge = () => {
      setEmailBadge(emailSyncService.getTotalUnreadCount(user.id));
    };

    const accounts = emailSyncService.loadLinkedAccounts(user.id);
    emailSyncService.startBackgroundSync(accounts, updateEmailBadge);
    emailRealtimeService.start(user.id);
    updateEmailBadge();

    const syncEvent = emailSyncService.getSyncEventName();
    const unreadEvent = emailSyncService.getUnreadEventName();
    window.addEventListener(syncEvent, updateEmailBadge);
    window.addEventListener(unreadEvent, updateEmailBadge);

    return () => {
      emailSyncService.stopBackgroundSync();
      emailRealtimeService.stop();
      window.removeEventListener(syncEvent, updateEmailBadge);
      window.removeEventListener(unreadEvent, updateEmailBadge);
    };
  }, [user?.id]);

  // Alertes automatiques : carburant bas & maintenances en retard
  useEffect(() => {
    const checkAlerts = () => {
      try {
        // Fuel alerts: check vehicles with fuel level < 20%
        const vehicles = JSON.parse(localStorage.getItem('ivos_vehicles') || '[]') as DashboardVehicleAlertRecord[];
        const lowFuel = vehicles.filter((vehicle) => vehicle.fuelLevel !== undefined && vehicle.fuelLevel < 20).length;
        setFuelAlertCount(lowFuel);
        // Maintenance alerts: overdue or approaching
        const maintenances = JSON.parse(localStorage.getItem('ivos_maintenance_v2') || '[]') as DashboardMaintenanceAlertRecord[];
        const now = Date.now();
        const overdue = maintenances.filter((maintenance) => maintenance.nextMaintenanceDate && new Date(maintenance.nextMaintenanceDate).getTime() < now && maintenance.status !== 'completed').length;
        setMaintenanceAlertCount(overdue);
      } catch { /* silent */ }
    };
    checkAlerts();
    const interval = setInterval(checkAlerts, 30000);
    window.addEventListener('ivos_vehicle_change', checkAlerts);
    window.addEventListener('ivos_maintenance_change', checkAlerts);
    return () => {
      clearInterval(interval);
      window.removeEventListener('ivos_vehicle_change', checkAlerts);
      window.removeEventListener('ivos_maintenance_change', checkAlerts);
    };
  }, []);

  // Permission-based filtering: filter sections by access, filter items by route access
  // Also hide 'Paramètres' for non-admins (legacy behavior preserved)
  const menuWithAdmin = useMemo(() => {
    const base = isAdmin || viewAs.isSuperAdmin
      ? menuSections
      : menuSections.filter(section => section.section !== 'Paramètres');

    if (!viewAs.effectiveUserId) {
      return base;
    }

    return base
      .filter(section => viewAs.canAccessSection(section.section))
      .map(section => ({
        ...section,
        items: section.items.filter(item => {
          // Super Admin panel only for SA
          if (item.href === '/users' || item.href === '/settings/system-config') return viewAs.isSuperAdmin && !viewAs.isImpersonating;
          return viewAs.canAccessRoute(item.href);
        }),
      }))
      .filter(section => section.items.length > 0);
  }, [isAdmin, viewAs]);

  const handleLogout = () => {
    // Notification de déconnexion
    if (user) {
      sendNotification({
        userId: user.id,
        type: 'other',
        title: 'Déconnexion',
        message: `Déconnexion de ${user.fullName || user.email}`,
        entityType: 'user',
        entityId: user.id
      })
    }
    logout()
    navigate('/login')
  }

  // Active route detection helpers
  const isItemActive = (item: { href: string; name?: string }) => {
    if (item.href === '/annuaire/badges') {
      return location.pathname === '/annuaire/badges' || location.pathname.startsWith('/annuaire/badges/');
    }
    if (item.href.startsWith('/annuaire')) {
      const params = new URLSearchParams(item.href.split('?')[1] || '');
      const currentParams = new URLSearchParams(location.search);
      if (item.href.includes('/annuaire/') && !item.href.includes('?')) {
        return location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
      }
      return location.pathname === '/annuaire' && currentParams.get('role') === params.get('role');
    }
    if (item.href === '/') return location.pathname === '/';
    return location.pathname === item.href;
  };

  const isSectionActive = (section: typeof menuSections[0]) =>
    section.items.some(item => isItemActive(item));

  const isCommunicationFull =
    location.pathname.includes('/communications/chat') ||
    location.pathname.includes('/communications/agenda') ||
    location.pathname.includes('/communications/email-center') ||
    location.pathname === '/finances';

  const baseScrollableClass = 'overflow-y-auto py-4 px-4 sm:px-6 lg:px-8';

  const mainContentClass = `min-h-0 flex-1 ${
    location.pathname === '/borne-pointage'
      ? 'overflow-y-auto p-0'
      : isCommunicationFull
      ? 'overflow-hidden flex flex-col p-0'
      : baseScrollableClass
  }`;

  // Breadcrumb computation
  const breadcrumbs = useMemo(() => {
    const crumbs: { label: string; href?: string; icon?: React.ComponentType<{ className?: string }> }[] = [
      { label: 'Tableau de bord', href: '/', icon: Home },
    ];
    if (location.pathname === '/') return crumbs;

    for (const section of menuSections) {
      const matchedItem = section.items.find(item => {
        if (item.href.startsWith('/annuaire')) {
          const params = new URLSearchParams(item.href.split('?')[1] || '');
          const currentParams = new URLSearchParams(location.search);
          if (item.href.includes('/annuaire/') && !item.href.includes('?')) {
            return location.pathname === item.href;
          }
          return location.pathname === '/annuaire' && currentParams.get('role') === params.get('role');
        }
        if (item.href === '/') return false;
        return location.pathname === item.href;
      });
      if (matchedItem) {
        crumbs.push({ label: section.section, icon: section.icon });
        crumbs.push({ label: matchedItem.name });
        return crumbs;
      }
    }
    // Fallback: show pathname
    const pathLabel = location.pathname.split('/').filter(Boolean).pop() || '';
    if (pathLabel) crumbs.push({ label: pathLabel.charAt(0).toUpperCase() + pathLabel.slice(1) });
    return crumbs;
  }, [location.pathname, location.search]);

  // Définition correcte de NavItem
  const NavItem = ({ item, onClick, isActive }: { item: typeof menuSections[0]['items'][0]; onClick?: () => void, isActive?: boolean }) => {
    const active = isActive ?? isItemActive(item);
    const content = (
      <Link
        to={item.href}
        onClick={onClick}
        className={`group flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-[15px] leading-snug transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-1 select-none ${
          active
            ? 'bg-[#1652C9] text-white font-bold shadow-lg shadow-blue-700/25'
            : 'text-[#0F172A] font-bold hover:bg-[#F1F5F9] hover:text-[#1652C9]'
        }`}
        tabIndex={0}
      >
        <item.icon className={`h-5 w-5 flex-shrink-0 transition-colors duration-200 ${
          active
            ? 'text-white'
            : 'text-[#334155] group-hover:text-[#1652C9]'
        }`} style={{ strokeWidth: 2.2, fill: active ? 'currentColor' : 'none' }} />
        <span className="flex-1">{item.name}</span>
        {item.name === 'Gestion Utilisateurs & Super Admin' && (pendingUsers.length > 0 || criticalActionService.getPendingCount() > 0) && (
          <span className={`text-[11px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 animate-pulse ${
            active ? 'bg-white text-red-600' : (criticalActionService.getPendingCount() > 0 ? 'bg-red-600' : 'bg-amber-500') + ' text-white'
          }`}>{pendingUsers.length + criticalActionService.getPendingCount()}</span>
        )}

        {active && <ChevronRight className="h-4 w-4 text-white/60" />}
        {item.name === 'Hub Carburant' && fuelAlertCount > 0 && (
          <span className={`text-[11px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 animate-pulse ${
            active ? 'bg-white text-orange-600' : 'bg-orange-500 text-white'
          }`}>{fuelAlertCount}</span>
        )}
        {item.name === 'Facturation' && invoiceBadge > 0 && (
          <span className="text-[11px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 bg-[#003366] text-white animate-pulse">{invoiceBadge}</span>
        )}
        {item.name === 'Email Center' && emailBadge > 0 && (
          <span className="text-[11px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 bg-[#1d4ed8] text-white animate-pulse">{emailBadge}</span>
        )}
        {item.name === 'Maintenance / Pannes' && (maintenanceBadge > 0 || maintenanceAlertCount > 0) && (
          <span className={`text-[11px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 animate-pulse ${
            active ? 'bg-white text-red-600' : 'bg-red-600 text-white'
          }`}>{maintenanceBadge + maintenanceAlertCount}</span>
        )}
      </Link>
    );
    // Tooltip pour Opérations Spéciales
    if ('tooltip' in item && item.tooltip) {
      return (
        <div className="group relative">
          {content}
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover:block z-50">
            <div className="bg-blue-900 text-white text-xs rounded px-2 py-1 shadow-lg whitespace-nowrap">
              {'tooltip' in item && item.tooltip}
            </div>
          </div>
        </div>
      );
    }
    return content;
  };

  // --- NOUVEAU BLOC RETURN ---
  return (
    <div className="h-screen bg-[#F4F7FC] flex flex-col overflow-hidden">
      {/* Sidebar Mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}></div>
          <div className="fixed inset-y-0 left-0 w-[340px] border-r border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10">
            <div className="flex h-44 items-center justify-between px-6">
              <img src="/logo-ivos.jpg" alt="IVOS" className="h-40 object-contain" />
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-2 px-2 pb-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 12rem)' }}>
              {menuWithAdmin.map((section, idx) => {
                return (
                  <div key={section.section} style={{ marginTop: idx === 0 ? 8 : 24 }}>
                    <p className="px-5 mb-2 text-[12px] font-extrabold uppercase text-[#718096] select-none" style={{ letterSpacing: '1.5px' }}>{section.section}</p>
                    <div className="ml-5 border-l-[2px] border-gray-200 flex flex-col gap-0.5 pl-3">
                      {section.items.map(item => (
                        <NavItem key={item.href} item={item} onClick={() => setSidebarOpen(false)} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Sidebar Desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex w-[340px] flex-col h-screen sticky top-0 overflow-y-auto border-r border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] shadow-[10px_0_28px_rgba(15,23,42,0.08)]" style={{ minWidth: 340 }}>
        {/* Logo IVOS fixe */}
        <div className="flex justify-center items-center p-7 sticky top-0 z-10 bg-white">
          <Link to="/" className="block w-full transition-transform duration-200 hover:scale-105" style={{ background: '#fff', borderRadius: 28 }}>
            <img
              src="/logo-ivos.jpg"
              alt="IVOS 6"
              className="w-full h-auto object-contain drop-shadow-lg"
              style={{ background: '#fff', borderRadius: 28 }}
              draggable={false}
            />
          </Link>
        </div>
        {/* Menu scrollable */}
        <nav className="flex-1 mt-1 px-2 pb-24 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent" style={{ WebkitOverflowScrolling: 'touch' }}>
          {menuWithAdmin.map((section, idx) => {
            return (
            <div key={section.section} style={{ marginTop: idx === 0 ? 4 : 24 }}>
              <p
                className="px-5 mb-2 text-[12px] font-extrabold uppercase text-[#718096] select-none"
                style={{ letterSpacing: '1.5px' }}
              >
                {section.section}
              </p>
              <div className="ml-5 border-l-[2px] border-gray-200 flex flex-col gap-0.5 pl-3">
                {section.items.map(item => (
                  <NavItem key={item.href} item={item} />
                ))}
              </div>
              {section.section === 'Paramètres' && (
                <div className="mt-8 text-center space-y-0.5">
                  <div className="text-[11px] text-gray-400 select-none font-medium uppercase tracking-widest">
                    {site.activeSite?.name || 'Base de KIGNABOUR'}
                  </div>
                  <div className="text-[10px] text-gray-300 font-medium">
                    {site.activeCountry?.flagEmoji} {site.activeCountry?.name || ''} — {site.activeCurrencySymbol}
                  </div>
                </div>
              )}
            </div>
            );
          })}
        </nav>
        {/* Footer utilisateur reste visible */}
        <div className="p-4 bg-white sticky bottom-0 z-10">
          <div className="flex items-center gap-3 mx-[15px] p-3.5 rounded-2xl bg-gray-50/60">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-600/20">
              {user?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800 truncate">{user?.fullName || 'Utilisateur'}</p>
            </div>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 rounded-xl hover:bg-red-50 transition-all">
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Contenu Principal */}
      <div className="lg:ml-[340px] flex flex-col flex-1 min-h-0">
        {/* Impersonation Banner */}
        {viewAs.isImpersonating && (
          <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-sm font-semibold z-50">
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Mode « Visualiser en tant que » : <strong>{viewAs.effectiveUserName}</strong> ({viewAs.effectiveRole})
            </span>
            <button onClick={viewAs.deactivate} className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-colors">
              ✕ Quitter
            </button>
          </div>
        )}
        <header className="sticky top-0 z-10 bg-white/70 backdrop-blur-xl border-b border-gray-100">
          <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg text-gray-500">
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex-1 flex justify-center items-center gap-3">
              <ContextSelector />
              {/* Super Admin site selector */}
              {site.isSuperAdmin && (
                <div className="relative">
                  <button
                    onClick={() => setShowSiteSelector(!showSiteSelector)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    {site.isConsolidatedView
                      ? 'Consolidé'
                      : site.viewSite
                        ? `${site.viewCountry?.flagEmoji || ''} ${site.viewSite.name}`
                        : site.activeSite
                          ? `${site.activeCountry?.flagEmoji || ''} ${site.activeSite.name}`
                          : 'Tous les sites'}
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {showSiteSelector && (
                    <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                      <button
                        onClick={() => { site.setConsolidatedView(true); site.setViewCountry(null); site.setViewSite(null); setShowSiteSelector(false) }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${site.isConsolidatedView ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700'}`}
                      >
                        <Globe className="h-3.5 w-3.5 inline mr-2" /> Vue Consolidée
                      </button>
                      <div className="border-t border-gray-50 my-1" />
                      {site.allCountries.map(country => (
                        <div key={country.id}>
                          <p className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{country.flagEmoji} {country.name}</p>
                          {site.sitesForCountry(country.id).map(s => (
                            <button
                              key={s.id}
                              onClick={() => { site.setConsolidatedView(false); site.setViewCountry(country); site.setViewSite(s); setShowSiteSelector(false) }}
                              className={`w-full text-left px-6 py-2 text-sm hover:bg-gray-50 transition-colors ${
                                !site.isConsolidatedView && site.viewSite?.id === s.id ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-600'
                              }`}
                            >
                              <MapPin className="h-3 w-3 inline mr-1.5" /> {s.name}
                              <span className="text-[10px] text-gray-400 ml-1">({country.currencySymbol})</span>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Breadcrumb */}
        {location.pathname !== '/' && !location.pathname.includes('/communications/chat') && !location.pathname.includes('/communications/agenda') && (
          <nav className="px-4 sm:px-6 lg:px-8 pt-3 pb-0" aria-label="Fil d'ariane">
            <ol className="flex items-center gap-1.5 text-sm flex-wrap">
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                const Icon = crumb.icon;
                return (
                  <li key={idx} className="flex items-center gap-1.5">
                    {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />}
                    {isLast ? (
                      <span className="flex items-center gap-1.5 text-gray-700 font-medium">
                        {Icon && <Icon className="h-4 w-4" />}
                        {crumb.label}
                      </span>
                    ) : crumb.href ? (
                      <Link
                        to={crumb.href}
                        className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                      >
                        {Icon && <Icon className="h-4 w-4" />}
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="flex items-center gap-1.5 text-gray-400">
                        {Icon && <Icon className="h-4 w-4" />}
                        {crumb.label}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        <main className={mainContentClass}>
          <div 
            key={location.pathname} 
            className={`animate-fadeIn ${
              isCommunicationFull
                ? 'h-full flex flex-col' 
                : ''
            }`}
          >
            <Outlet />
          </div>
        </main>

        {/* FAB — Quick Actions */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-3">
          {fabOpen && (
            <>
              <button
                onClick={() => { navigate('/operations'); setFabOpen(false); }}
                className="flex items-center gap-2 px-4 py-3 bg-white rounded-xl shadow-lg border border-gray-200 text-sm font-semibold text-[#1652C9] hover:bg-blue-50 transition-all animate-fadeIn"
              >
                <ClipboardList className="h-4 w-4" /> Nouvelle Opération
              </button>
              <button
                onClick={() => { navigate('/hub-carburant'); setFabOpen(false); }}
                className="flex items-center gap-2 px-4 py-3 bg-white rounded-xl shadow-lg border border-gray-200 text-sm font-semibold text-[#1652C9] hover:bg-blue-50 transition-all animate-fadeIn"
              >
                <Fuel className="h-4 w-4" /> Nouveau Plein
              </button>
              <button
                onClick={() => { navigate('/maintenance'); setFabOpen(false); }}
                className="flex items-center gap-2 px-4 py-3 bg-white rounded-xl shadow-lg border border-gray-200 text-sm font-semibold text-[#1652C9] hover:bg-blue-50 transition-all animate-fadeIn"
              >
                <Wrench className="h-4 w-4" /> Maintenance
              </button>
            </>
          )}
          <button
            onClick={() => setFabOpen(f => !f)}
            className={`w-14 h-14 rounded-full bg-[#1652C9] text-white shadow-xl hover:bg-blue-700 transition-all duration-200 flex items-center justify-center ${fabOpen ? 'rotate-45' : ''}`}
          >
            <Plus className="h-7 w-7" />
          </button>
        </div>
      </div>
    </div>
  );
}
