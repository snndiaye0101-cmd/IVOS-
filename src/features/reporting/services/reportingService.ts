// ReportingService — local mock implementation (no Supabase)
export class ReportingService {
  getUserData(): Record<string, unknown> {
    return {};
  }
  getAnalytics(): Record<string, unknown> {
    return {};
  }
  getReport(): Record<string, unknown> {
    return {};
  }
  getDashboardData(): Record<string, unknown> {
    return {};
  }
  getKPIs(): Record<string, unknown> {
    return {};
  }
  getUserDataWithRoles(): Record<string, unknown> {
    return {};
  }
}
export const reportingService = new ReportingService();
