import { supabase } from './supabaseClient';
import type { AppModule, PermissionLevel } from './permissionStore';

export interface PersistedUserPermission {
  user_id: string;
  module: AppModule;
  permission_level: PermissionLevel;
  role: string;
}

export interface PersistedUserRoutePermission {
  user_id: string;
  route_path: string;
  permission_level: PermissionLevel;
}

export async function getUserPermissionsFromDb(
  userId: string
): Promise<Record<AppModule, PermissionLevel>> {
  try {
    const { data, error } = await supabase
      .from('user_permissions')
      .select('module,permission_level')
      .eq('user_id', userId);

    if (error) {
      console.warn('Unable to fetch user permissions from Supabase:', error);
      throw error;
    }

    return (data || []).reduce(
      (acc, row) => {
        acc[row.module as AppModule] = row.permission_level;
        return acc;
      },
      {} as Record<AppModule, PermissionLevel>
    );
  } catch {
    return {} as Record<AppModule, PermissionLevel>;
  }
}

export async function getUserRoutePermissionsFromDb(
  userId: string
): Promise<Record<string, PermissionLevel>> {
  try {
    const { data, error } = await supabase
      .from('user_route_permissions')
      .select('route_path,permission_level')
      .eq('user_id', userId);

    if (error) {
      console.warn('Unable to fetch user route permissions from Supabase:', error);
      throw error;
    }

    return (data || []).reduce(
      (acc, row) => {
        acc[row.route_path] = row.permission_level;
        return acc;
      },
      {} as Record<string, PermissionLevel>
    );
  } catch {
    return {} as Record<string, PermissionLevel>;
  }
}

export async function saveUserPermissionsToDb(
  userId: string,
  modules: Record<AppModule, PermissionLevel>,
  role: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = Object.entries(modules).map(([module, permission_level]) => ({
      user_id: userId,
      module,
      permission_level,
      role,
    }));

    const { error } = await supabase
      .from('user_permissions')
      .upsert(payload, { onConflict: 'user_id,module' });

    if (error) {
      console.error('Supabase permission save failed:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Supabase permission save unexpected error:', err);
    return { success: false, error: err?.message || 'Unknown error' };
  }
}

export async function saveUserRoutePermissionsToDb(
  userId: string,
  routes: Record<string, PermissionLevel>
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = Object.entries(routes).map(([route_path, permission_level]) => ({
      user_id: userId,
      route_path,
      permission_level,
    }));

    const { error } = await supabase
      .from('user_route_permissions')
      .upsert(payload, { onConflict: 'user_id,route_path' });

    if (error) {
      console.error('Supabase route permission save failed:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Supabase route permission save unexpected error:', err);
    return { success: false, error: err?.message || 'Unknown error' };
  }
}
