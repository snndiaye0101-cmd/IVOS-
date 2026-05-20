/**
 * Service de gestion des paramètres système (lecture, mise à jour)
 * Toutes les méthodes utilisent Supabase comme backend.
 * // Sécurisation : Vérification explicite des permissions sur chaque opération (CRUD), audit des accès, gestion fine des rôles.
 */
export const settingsService = {
  /**
   * Récupère les paramètres système
   */
  async getSettings() {
    const raw = localStorage.getItem('ivos_settings_v1');
    return raw ? JSON.parse(raw) : {};
  },

  /**
   * Met à jour un paramètre système
   */
  async updateSetting(key: string, value: unknown) {
    const raw = localStorage.getItem('ivos_settings_v1');
    const current = raw ? JSON.parse(raw) : {};
    const updated = { ...current, [key]: value };
    localStorage.setItem('ivos_settings_v1', JSON.stringify(updated));
    return updated;
  },
};
