// ═══════════════════════════════════════════════════════════════
// USER ANALYTICS SERVICE
// ═══════════════════════════════════════════════════════════════
// Suivi complet des activités utilisateur avec statistiques avancées

import type { User } from './authStore';

export interface UserActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
  device?: string;
  module: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ConnectionSession {
  userId: string;
  loginAt: string;
  logoutAt?: string;
  durationMinutes: number;
  ipAddress?: string;
  device?: string;
}

export interface UserAnalytics {
  userId: string;
  userName: string;
  totalConnectionHours: number;
  averageSessionDuration: number;
  lastActivityAt?: string;
  lastLoginAt?: string;
  topModules: Array<{ module: string; count: number; percentage: number }>;
  weeklyStats: Array<{ day: string; hours: number; actionCount: number }>;
  monthlyAverage: number;
  totalActions: number;
  criticalActionsCount: number;
}

export interface ActivityMetrics {
  totalUsers: number;
  activeUsersToday: number;
  totalConnectionHours: number;
  averageConnectionTime: number;
  criticalActionsLast24h: number;
  topModule: { name: string; count: number };
}

class UserAnalyticsService {
  private activityLogs: UserActivityLog[] = [];
  private connectionSessions: ConnectionSession[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    // Données de démonstration pour le développement
    const now = new Date();
    const actions = [
      'Création facture',
      'Validation dotation',
      'Ajout sinistre',
      'Modification utilisateur',
      'Export rapport',
      'Téléchargement document',
      'Configuration système',
      'Changement permission',
      'Suppression entrée',
      'Mise à jour profil',
    ];
    const modules = ['dashboard', 'fleet', 'finances', 'exploitation', 'rh', 'technique'];
    const devices = [
      'Chrome on macOS',
      'Safari on iPhone',
      'Firefox on Windows',
      'Chrome on Android',
    ];

    for (let i = 0; i < 50; i++) {
      const timestamp = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      this.activityLogs.push({
        id: `log_${i}`,
        userId: `user_${Math.floor(Math.random() * 5) + 1}`,
        userName: `Admin ${Math.floor(Math.random() * 5) + 1}`,
        action: actions[Math.floor(Math.random() * actions.length)],
        details: `Détails de l'action ${i + 1}`,
        timestamp: timestamp.toISOString(),
        ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        device: devices[Math.floor(Math.random() * devices.length)],
        module: modules[Math.floor(Math.random() * modules.length)],
        severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as any,
      });
    }
  }

  /**
   * Enregistre une activité utilisateur
   */
  logActivity(log: Omit<UserActivityLog, 'id'>) {
    const newLog: UserActivityLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...log,
    };
    this.activityLogs.push(newLog);
    this.notifyListeners();
    return newLog;
  }

  /**
   * Enregistre une session de connexion
   */
  logSession(session: ConnectionSession) {
    this.connectionSessions.push(session);
    this.notifyListeners();
  }

  /**
   * Récupère tous les logs d'activité
   */
  getAllActivityLogs(): UserActivityLog[] {
    return [...this.activityLogs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Récupère les logs filtrés
   */
  getFilteredLogs(filters: {
    userId?: string;
    dateRange?: 'today' | 'yesterday' | 'week' | 'month' | 'all';
    actionType?: string;
    severity?: string;
    module?: string;
    searchText?: string;
  }): UserActivityLog[] {
    let result = [...this.activityLogs];

    // Filtre par utilisateur
    if (filters.userId) {
      result = result.filter((l) => l.userId === filters.userId);
    }

    // Filtre par date
    if (filters.dateRange && filters.dateRange !== 'all') {
      const now = new Date();
      let startDate = new Date();

      if (filters.dateRange === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        result = result.filter((l) => new Date(l.timestamp) >= startDate);
      } else if (filters.dateRange === 'yesterday') {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
        const endYesterday = new Date(startDate);
        endYesterday.setDate(endYesterday.getDate() + 1);
        result = result.filter((l) => {
          const logDate = new Date(l.timestamp);
          return logDate >= startDate && logDate < endYesterday;
        });
      } else if (filters.dateRange === 'week') {
        startDate.setDate(startDate.getDate() - 7);
        result = result.filter((l) => new Date(l.timestamp) >= startDate);
      } else if (filters.dateRange === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
        result = result.filter((l) => new Date(l.timestamp) >= startDate);
      }
    }

    // Filtre par sévérité
    if (filters.severity) {
      result = result.filter((l) => l.severity === filters.severity);
    }

    // Filtre par module
    if (filters.module) {
      result = result.filter((l) => l.module === filters.module);
    }

    // Recherche textuelle
    if (filters.searchText) {
      const text = filters.searchText.toLowerCase();
      result = result.filter(
        (l) =>
          l.action.toLowerCase().includes(text) ||
          l.details.toLowerCase().includes(text) ||
          l.userName.toLowerCase().includes(text)
      );
    }

    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Calcule les statistiques pour un utilisateur
   */
  getUserAnalytics(userId: string): UserAnalytics {
    const userLogs = this.activityLogs.filter((l) => l.userId === userId);
    const userSessions = this.connectionSessions.filter((s) => s.userId === userId);

    // Calcul des heures totales
    const totalConnectionHours =
      userSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0) / 60;

    // Module le plus utilisé
    const moduleCount: Record<string, number> = {};
    userLogs.forEach((log) => {
      moduleCount[log.module] = (moduleCount[log.module] || 0) + 1;
    });
    const totalActions = Object.values(moduleCount).reduce((a, b) => a + b, 0);
    const topModules = Object.entries(moduleCount)
      .map(([module, count]) => ({
        module,
        count,
        percentage: Math.round((count / totalActions) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Statistiques hebdomadaires
    const now = new Date();
    const weeklyStats = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - i));
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const daySessions = userSessions.filter((s) => {
        const sessionDate = new Date(s.loginAt);
        return sessionDate >= dayStart && sessionDate < dayEnd;
      });

      return {
        day: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
        hours:
          Math.round(
            (daySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0) / 60) * 10
          ) / 10,
        actionCount: userLogs.filter((l) => {
          const logDate = new Date(l.timestamp);
          return logDate >= dayStart && logDate < dayEnd;
        }).length,
      };
    });

    // Moyenne mensuelle
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const last30DaysSessions = userSessions.filter((s) => new Date(s.loginAt) >= thirtyDaysAgo);
    const monthlyAverage =
      Math.round(
        (last30DaysSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0) / 60 / 30) * 10
      ) / 10;

    return {
      userId,
      userName: userLogs[0]?.userName || 'Unknown',
      totalConnectionHours: Math.round(totalConnectionHours * 10) / 10,
      averageSessionDuration:
        userSessions.length > 0 ? Math.round((totalConnectionHours / userSessions.length) * 60) : 0,
      lastActivityAt: userLogs[0]?.timestamp,
      lastLoginAt: userSessions[userSessions.length - 1]?.loginAt,
      topModules,
      weeklyStats,
      monthlyAverage,
      totalActions: userLogs.length,
      criticalActionsCount: userLogs.filter((l) => l.severity === 'critical').length,
    };
  }

  /**
   * Calcule les métriques globales
   */
  getGlobalMetrics(users: User[], onlineUserIds: string[]): ActivityMetrics {
    const logsLast24h = this.activityLogs.filter((l) => {
      const logTime = new Date(l.timestamp).getTime();
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      return logTime >= dayAgo;
    });

    const moduleCount: Record<string, number> = {};
    logsLast24h.forEach((log) => {
      moduleCount[log.module] = (moduleCount[log.module] || 0) + 1;
    });
    const topModule = Object.entries(moduleCount).sort((a, b) => b[1] - a[1])[0];

    const sessionsLast24h = this.connectionSessions.filter((s) => {
      const sessionTime = new Date(s.loginAt).getTime();
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      return sessionTime >= dayAgo;
    });
    const totalHours24h =
      sessionsLast24h.reduce((sum, s) => sum + (s.durationMinutes || 0), 0) / 60;

    return {
      totalUsers: users.length,
      activeUsersToday: onlineUserIds.length,
      totalConnectionHours: Math.round(totalHours24h * 10) / 10,
      averageConnectionTime:
        sessionsLast24h.length > 0 ? Math.round((totalHours24h / sessionsLast24h.length) * 60) : 0,
      criticalActionsLast24h: logsLast24h.filter((l) => l.severity === 'critical').length,
      topModule: topModule
        ? { name: topModule[0], count: topModule[1] }
        : { name: 'N/A', count: 0 },
    };
  }

  /**
   * Récupère les statistiques pour le classement (Top 5)
   */
  getTopUsersStats(
    users: User[]
  ): Array<{ user: User; hours: number; actions: number; lastActivity?: string }> {
    return users
      .map((user) => {
        const analytics = this.getUserAnalytics(user.id);
        return {
          user,
          hours: analytics.totalConnectionHours,
          actions: analytics.totalActions,
          lastActivity: analytics.lastActivityAt,
        };
      })
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5);
  }

  /**
   * S'abonne aux changements
   */
  subscribe(callback: () => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((cb) => cb());
  }
}

export const userAnalyticsService = new UserAnalyticsService();
