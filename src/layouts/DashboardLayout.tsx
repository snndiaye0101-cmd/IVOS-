import React, { useState, useEffect, useMemo } from 'react';
import ContextSelector from '../shared/components/ui/ContextSelector';
import RealTimeClock from '../shared/components/ui/RealTimeClock';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Truck,
  Car,
  Users,
  ClipboardList,
  FileText,
  UserCircle,
  Menu,
  X,
  Wrench,
  AlertTriangle,
  ClipboardCheck,
  LogOut,
  Shield,
  ChevronRight,
  Construction,
  Fuel,
  DollarSign,
  MapPin,
  BookOpen,
  Bell,
  Download,
  Database,
  Activity,
  Mail,
  Smartphone,
  Contact,
  FolderOpen,
  Globe,
  Building2,
  ChevronDown,
  Plus,
  Package,
  TrendingUp,
  BarChart2,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
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
    section: 'Exploitation',
    icon: ClipboardList,
    items: [
      { name: 'Opérations', href: '/exploitation', icon: ClipboardList },
      {
        name: 'Opérations Spéciales',
        href: '/exploitation/special-operations',
        icon: Wrench,
        tooltip: 'Service de maintenance technique pour le nettoyage des cuves et citernes.',
      },
      {
        name: 'BSD',
        href: '/exploitation/bsd-en-cours',
        icon: FileText,
        tooltip: 'Bordereaux de Suivi des Déchets en cours',
      },
    ],
  },
  {
    section: 'REPORTING & IMPACT',
    icon: BarChart2,
    items: [
      {
        name: 'Reporting QHSE',
        href: '/qhse/reporting',
        icon: BarChart2,
        tooltip: 'Tableau de bord, Archives et Certificats regroupés',
      },
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
      { name: 'Maintenance / Pannes', href: '/maintenance', icon: Construction },
      { name: 'Assurances & Sinistres', href: '/sinistres', icon: Shield },
      { name: 'Pneumatique', href: '/pneumatique', icon: Wrench },
      {
        name: 'Inventaire & Maintenance Matériels',
        href: '/inventaire-maintenance-materiels',
        icon: Wrench,
      },
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
      {
        name: 'Gestion des Immobilisations & Infrastructures',
        href: '/investissements',
        icon: Building2,
      },
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
      {
        name: 'Administration Système',
        href: '/settings/administration-systeme',
        icon: ShieldAlert,
      },
      // 'Configuration Base' merged into System Config (Gestion des Sites)
      { name: 'Référentiels Clients', href: '/settings/clients', icon: BookOpen },
      { name: "Seuils d'Alertes", href: '/settings/alerts', icon: Bell },
      { name: 'Sauvegardes', href: '/settings/backups', icon: Download },
      { name: 'Sécurité & Accès', href: '/settings/security', icon: Shield },
      { name: 'Gestion des Sites', href: '/settings/system-config', icon: Building2 },
      {
        name: 'Configuration Paie & Fiscalité',
        href: '/settings/payroll-fiscal-config',
        icon: DollarSign,
      },
    ],
  },
];

export default function DashboardLayout() {
  // const { site, year } = useContextSelector();
  // Le contexte est accessible dans tous les modules/pages enfants via ce layout
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin, pendingUsers } = useAuth();
  const viewAs = useViewAs();
  const site = useSite();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [permissionVersion, setPermissionVersion] = useState(0);
  const [showSiteSelector, setShowSiteSelector] = useState(false);
  const [invoiceBadge, setInvoiceBadge] = useState(0);
  const [maintenanceBadge, setMaintenanceBadge] = useState(0);
  const [emailBadge, setEmailBadge] = useState(0);
  const [fabOpen, setFabOpen] = useState(false);
  const [fuelAlertCount, setFuelAlertCount] = useState(0);
  const [maintenanceAlertCount, setMaintenanceAlertCount] = useState(0);
  const [technicalInspectionAlertCount, setTechnicalInspectionAlertCount] = useState(0);

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

  // Alertes automatiques : carburant bas & maintenances en retard & visite technique
  useEffect(() => {
    const checkAlerts = () => {
      try {
        // Fuel alerts: check vehicles with fuel level < 20%
        const vehicles = JSON.parse(
          localStorage.getItem('ivos_vehicles') || '[]'
        ) as DashboardVehicleAlertRecord[];
        const lowFuel = vehicles.filter(
          (vehicle) => vehicle.fuelLevel !== undefined && vehicle.fuelLevel < 20
        ).length;
        setFuelAlertCount(lowFuel);
        // Maintenance alerts: overdue or approaching
        const maintenances = JSON.parse(
          localStorage.getItem('ivos_maintenance_v2') || '[]'
        ) as DashboardMaintenanceAlertRecord[];
        const now = Date.now();
        const overdue = maintenances.filter(
          (maintenance) =>
            maintenance.nextMaintenanceDate &&
            new Date(maintenance.nextMaintenanceDate).getTime() < now &&
            maintenance.status !== 'completed'
        ).length;
        setMaintenanceAlertCount(overdue);
        // Technical inspection alerts: check function vehicles with inspection expiry < 15 days or expired
        const funcVehicles = JSON.parse(
          localStorage.getItem('ivos_function_vehicles') || '[]'
        ) as any[];
        const now2 = new Date();
        const techAlert = funcVehicles.filter((v) => {
          if (!v.technicalInspectionExpiry) return false;
          const expiry = new Date(v.technicalInspectionExpiry);
          const days = Math.ceil((expiry.getTime() - now2.getTime()) / (1000 * 3600 * 24));
          return days <= 15;
        }).length;
        setTechnicalInspectionAlertCount(techAlert);
      } catch {
        /* silent */
      }
    };
    checkAlerts();
    const interval = setInterval(checkAlerts, 30000);
    window.addEventListener('ivos_vehicle_change', checkAlerts);
    window.addEventListener('ivos_maintenance_change', checkAlerts);
    window.addEventListener('ivos_function_vehicles_change', checkAlerts);
    return () => {
      clearInterval(interval);
      window.removeEventListener('ivos_vehicle_change', checkAlerts);
      window.removeEventListener('ivos_maintenance_change', checkAlerts);
      window.removeEventListener('ivos_function_vehicles_change', checkAlerts);
    };
  }, []);

  // Permission-based filtering: filter sections by access, filter items by route access
  useEffect(() => {
    const handlePermissionUpdate = () => setPermissionVersion((current) => current + 1);
    window.addEventListener('permissions:updated', handlePermissionUpdate);
    return () => window.removeEventListener('permissions:updated', handlePermissionUpdate);
  }, []);

  const menuWithAdmin = useMemo(() => {
    const base = isAdmin || viewAs.isSuperAdmin ? menuSections : menuSections;

    if (!viewAs.effectiveUserId) {
      return base;
    }

    return base
      .filter((section) => viewAs.canAccessSection(section.section))
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          // Super Admin panel only for SA
          if (item.href === '/users' || item.href === '/settings/system-config')
            return viewAs.isSuperAdmin && !viewAs.isImpersonating;
          return viewAs.canAccessRoute(item.href);
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [isAdmin, viewAs, permissionVersion]);

  const handleLogout = () => {
    // Notification de déconnexion
    if (user) {
      sendNotification({
        userId: user.id,
        type: 'other',
        title: 'Déconnexion',
        message: `Déconnexion de ${user.fullName || user.email}`,
        entityType: 'user',
        entityId: user.id,
      });
    }
    logout();
    navigate('/login');
  };

  // Active route detection helpers
  const isItemActive = (item: { href: string; name?: string }) => {
    if (item.href === '/annuaire/badges') {
      return (
        location.pathname === '/annuaire/badges' ||
        location.pathname.startsWith('/annuaire/badges/')
      );
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

  const isSectionActive = (section: (typeof menuSections)[0]) =>
    section.items.some((item) => isItemActive(item));

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
    const crumbs: {
      label: string;
      href?: string;
      icon?: React.ComponentType<{ className?: string }>;
    }[] = [{ label: 'Tableau de bord', href: '/', icon: Home }];
    if (location.pathname === '/') return crumbs;

    for (const section of menuSections) {
      const matchedItem = section.items.find((item) => {
        if (item.href.startsWith('/annuaire')) {
          const params = new URLSearchParams(item.href.split('?')[1] || '');
          const currentParams = new URLSearchParams(location.search);
          if (item.href.includes('/annuaire/') && !item.href.includes('?')) {
            return location.pathname === item.href;
          }
          return (
            location.pathname === '/annuaire' && currentParams.get('role') === params.get('role')
          );
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
  const NavItem = ({
    item,
    onClick,
    isActive,
  }: {
    item: (typeof menuSections)[0]['items'][0];
    onClick?: () => void;
    isActive?: boolean;
  }) => {
    const active = isActive ?? isItemActive(item);
    const content = (
      <Link
        to={item.href}
        onClick={onClick}
        className={`group flex select-none items-center gap-3.5 rounded-xl px-4 py-3.5 text-[15px] leading-snug transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-1 ${
          active
            ? 'bg-[#1652C9] font-bold text-white shadow-lg shadow-blue-700/25'
            : 'font-bold text-[#0F172A] hover:bg-[#F1F5F9] hover:text-[#1652C9]'
        }`}
        tabIndex={0}
      >
        <item.icon
          className={`h-5 w-5 flex-shrink-0 transition-colors duration-200 ${
            active ? 'text-white' : 'text-[#334155] group-hover:text-[#1652C9]'
          }`}
          style={{ strokeWidth: 2.2, fill: active ? 'currentColor' : 'none' }}
        />
        <span className="flex-1">{item.name}</span>
        {item.name === 'Gestion Utilisateurs & Super Admin' &&
          (pendingUsers.length > 0 || criticalActionService.getPendingCount() > 0) && (
            <span
              className={`flex h-5 min-w-[20px] animate-pulse items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                active
                  ? 'bg-white text-red-600'
                  : (criticalActionService.getPendingCount() > 0 ? 'bg-red-600' : 'bg-amber-500') +
                    ' text-white'
              }`}
            >
              {pendingUsers.length + criticalActionService.getPendingCount()}
            </span>
          )}

        {active && <ChevronRight className="h-4 w-4 text-white/60" />}
        {item.name === 'Hub Carburant' && fuelAlertCount > 0 && (
          <span
            className={`flex h-5 min-w-[20px] animate-pulse items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
              active ? 'bg-white text-orange-600' : 'bg-orange-500 text-white'
            }`}
          >
            {fuelAlertCount}
          </span>
        )}
        {item.name === 'Véhicules de fonction' && technicalInspectionAlertCount > 0 && (
          <span
            className={`flex h-5 min-w-[20px] animate-pulse items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
              active ? 'bg-white text-amber-600' : 'bg-amber-500 text-white'
            }`}
          >
            {technicalInspectionAlertCount}
          </span>
        )}
        {item.name === 'Facturation' && invoiceBadge > 0 && (
          <span className="flex h-5 min-w-[20px] animate-pulse items-center justify-center rounded-full bg-[#003366] px-1.5 text-[11px] font-bold text-white">
            {invoiceBadge}
          </span>
        )}
        {item.name === 'Email Center' && emailBadge > 0 && (
          <span className="flex h-5 min-w-[20px] animate-pulse items-center justify-center rounded-full bg-[#1d4ed8] px-1.5 text-[11px] font-bold text-white">
            {emailBadge}
          </span>
        )}
        {item.name === 'Maintenance / Pannes' &&
          (maintenanceBadge > 0 || maintenanceAlertCount > 0) && (
            <span
              className={`flex h-5 min-w-[20px] animate-pulse items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                active ? 'bg-white text-red-600' : 'bg-red-600 text-white'
              }`}
            >
              {maintenanceBadge + maintenanceAlertCount}
            </span>
          )}
      </Link>
    );
    // Tooltip pour Opérations Spéciales
    if ('tooltip' in item && item.tooltip) {
      return (
        <div className="group relative">
          {content}
          <div className="absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 group-hover:block">
            <div className="whitespace-nowrap rounded bg-blue-900 px-2 py-1 text-xs text-white shadow-lg">
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
    <div className="flex h-screen flex-col overflow-hidden bg-[#F4F7FC]">
      {/* Sidebar Mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          ></div>
          <div className="fixed inset-y-0 left-0 w-[340px] border-r border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10">
            <div className="flex h-44 items-center justify-between px-6">
              <img src="/logo-ivos.jpg" alt="IVOS" className="h-40 object-contain" />
              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav
              className="mt-2 overflow-y-auto px-2 pb-4"
              style={{ maxHeight: 'calc(100vh - 12rem)' }}
            >
              {menuWithAdmin.map((section, idx) => {
                return (
                  <div key={section.section} style={{ marginTop: idx === 0 ? 8 : 24 }}>
                    <p
                      className="mb-2 select-none px-5 text-[12px] font-extrabold uppercase text-[#718096]"
                      style={{ letterSpacing: '1.5px' }}
                    >
                      {section.section}
                    </p>
                    <div className="ml-5 flex flex-col gap-0.5 border-l-[2px] border-gray-200 pl-3">
                      {section.items.map((item) => (
                        <NavItem
                          key={item.href}
                          item={item}
                          onClick={() => setSidebarOpen(false)}
                        />
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
      <div
        className="sticky top-0 hidden h-screen w-[340px] flex-col overflow-y-auto border-r border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] shadow-[10px_0_28px_rgba(15,23,42,0.08)] lg:fixed lg:inset-y-0 lg:flex"
        style={{ minWidth: 340 }}
      >
        {/* Logo IVOS fixe */}
        <div className="sticky top-0 z-10 flex items-center justify-center bg-white p-7">
          <Link
            to="/"
            className="block w-full transition-transform duration-200 hover:scale-105"
            style={{ background: '#fff', borderRadius: 28 }}
          >
            <img
              src="/logo-ivos.jpg"
              alt="IVOS 6"
              className="h-auto w-full object-contain drop-shadow-lg"
              style={{ background: '#fff', borderRadius: 28 }}
              draggable={false}
            />
          </Link>
        </div>
        {/* Menu scrollable */}
        <nav
          className="scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent mt-1 flex-1 overflow-y-auto px-2 pb-24"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {menuWithAdmin.map((section, idx) => {
            return (
              <div key={section.section} style={{ marginTop: idx === 0 ? 4 : 24 }}>
                <p
                  className="mb-2 select-none px-5 text-[12px] font-extrabold uppercase text-[#718096]"
                  style={{ letterSpacing: '1.5px' }}
                >
                  {section.section}
                </p>
                <div className="ml-5 flex flex-col gap-0.5 border-l-[2px] border-gray-200 pl-3">
                  {section.items.map((item) => (
                    <NavItem key={item.href} item={item} />
                  ))}
                </div>
                {section.section === 'Paramètres' && (
                  <div className="mt-8 space-y-0.5 text-center">
                    <div className="select-none text-[11px] font-medium uppercase tracking-widest text-gray-400">
                      {site.activeSite?.name || 'Base de KIGNABOUR'}
                    </div>
                    <div className="text-[10px] font-medium text-gray-300">
                      {site.activeCountry?.name || ''} — {site.activeCurrencySymbol}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        {/* Footer utilisateur reste visible */}
        <div className="sticky bottom-0 z-10 bg-white p-4">
          <div className="mx-[15px] flex items-center gap-3 rounded-2xl bg-gray-50/60 p-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-sm font-bold text-white shadow-md shadow-blue-600/20">
              {user?.fullName
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-gray-800">
                {user?.fullName || 'Utilisateur'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-xl p-2 text-gray-400 transition-all hover:bg-red-50 hover:text-red-500"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Contenu Principal */}
      <div className="flex min-h-0 flex-1 flex-col lg:ml-[340px]">
        {/* Impersonation Banner */}
        {viewAs.isImpersonating && (
          <div className="z-50 flex items-center justify-between bg-amber-500 px-4 py-2 text-sm font-semibold text-white">
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Mode « Visualiser en tant que » : <strong>{viewAs.effectiveUserName}</strong> (
              {viewAs.effectiveRole})
            </span>
            <button
              onClick={viewAs.deactivate}
              className="rounded-lg bg-white/20 px-3 py-1 text-xs font-bold transition-colors hover:bg-white/30"
            >
              ✕ Quitter
            </button>
          </div>
        )}
        <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/70 backdrop-blur-xl">
          <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-gray-500 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex flex-1 items-center justify-center gap-3">
              <ContextSelector />
              {/* Super Admin site selector */}
              {site.isSuperAdmin && (
                <div className="relative">
                  <button
                    onClick={() => setShowSiteSelector(!showSiteSelector)}
                    className="flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    {site.isConsolidatedView
                      ? 'Consolidé'
                      : site.viewSite
                        ? `${site.viewSite.name}`
                        : site.activeSite
                          ? `${site.activeSite.name}`
                          : 'Tous les sites'}
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {showSiteSelector && (
                    <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-xl border border-gray-100 bg-white py-2 shadow-lg">
                      <button
                        onClick={() => {
                          site.setConsolidatedView(true);
                          site.setViewCountry(null);
                          site.setViewSite(null);
                          setShowSiteSelector(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-gray-50 ${site.isConsolidatedView ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-gray-700'}`}
                      >
                        <Globe className="mr-2 inline h-3.5 w-3.5" /> Vue Consolidée
                      </button>
                      <div className="my-1 border-t border-gray-50" />
                      {site.allSites.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            site.setConsolidatedView(false);
                            site.setViewCountry(null);
                            site.setViewSite(s);
                            setShowSiteSelector(false);
                          }}
                          className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-gray-50 ${!site.isConsolidatedView && site.viewSite?.id === s.id ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-gray-600'}`}
                        >
                          <MapPin className="mr-1.5 inline h-3 w-3" /> {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="hidden min-w-[220px] items-center justify-end md:flex">
              <RealTimeClock />
            </div>
          </div>
        </header>

        {/* Breadcrumb */}
        {location.pathname !== '/' &&
          !location.pathname.includes('/communications/chat') &&
          !location.pathname.includes('/communications/agenda') && (
            <nav className="px-4 pb-0 pt-3 sm:px-6 lg:px-8" aria-label="Fil d'ariane">
              <ol className="flex flex-wrap items-center gap-1.5 text-sm">
                {breadcrumbs.map((crumb, idx) => {
                  const isLast = idx === breadcrumbs.length - 1;
                  const Icon = crumb.icon;
                  return (
                    <li key={idx} className="flex items-center gap-1.5">
                      {idx > 0 && (
                        <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-gray-300" />
                      )}
                      {isLast ? (
                        <span className="flex items-center gap-1.5 font-medium text-gray-700">
                          {Icon && <Icon className="h-4 w-4" />}
                          {crumb.label}
                        </span>
                      ) : crumb.href ? (
                        <Link
                          to={crumb.href}
                          className="flex items-center gap-1.5 text-gray-400 transition-colors duration-200 hover:text-gray-600"
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
            className={`animate-fadeIn ${isCommunicationFull ? 'flex h-full flex-col' : ''}`}
          >
            <Outlet />
          </div>
        </main>

        {/* FAB — Quick Actions */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-3">
          {fabOpen && (
            <>
              <button
                onClick={() => {
                  navigate('/operations');
                  setFabOpen(false);
                }}
                className="flex animate-fadeIn items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-[#1652C9] shadow-lg transition-all hover:bg-blue-50"
              >
                <ClipboardList className="h-4 w-4" /> Nouvelle Opération
              </button>
              <button
                onClick={() => {
                  navigate('/hub-carburant');
                  setFabOpen(false);
                }}
                className="flex animate-fadeIn items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-[#1652C9] shadow-lg transition-all hover:bg-blue-50"
              >
                <Fuel className="h-4 w-4" /> Nouveau Plein
              </button>
              <button
                onClick={() => {
                  navigate('/maintenance');
                  setFabOpen(false);
                }}
                className="flex animate-fadeIn items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-[#1652C9] shadow-lg transition-all hover:bg-blue-50"
              >
                <Wrench className="h-4 w-4" /> Maintenance
              </button>
            </>
          )}
          <button
            onClick={() => setFabOpen((f) => !f)}
            className={`flex h-14 w-14 items-center justify-center rounded-full bg-[#1652C9] text-white shadow-xl transition-all duration-200 hover:bg-blue-700 ${fabOpen ? 'rotate-45' : ''}`}
          >
            <Plus className="h-7 w-7" />
          </button>
        </div>
      </div>
    </div>
  );
}
