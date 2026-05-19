import { supabase } from '../../../shared/services/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Portal {
  id: string;
  subsidiary_id: string;
  name: string;
  terminal_id: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at?: string;
}

export const usePortals = (subsidiaryId: string) => {
  return useQuery<Portal[], Error>({
    queryKey: ['portals', subsidiaryId],
    queryFn: async () => {
      if (!subsidiaryId) return [];
      const { data, error } = await supabase
        .from('site_portals')
        .select('*')
        .eq('subsidiary_id', subsidiaryId)
        .order('name', { ascending: true });
      if (error) throw new Error(error.message);
      return (data as Portal[]) || [];
    },
    enabled: !!subsidiaryId,
  });
};

export const useCreatePortal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newPortal: Omit<Portal, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('site_portals')
        .insert([newPortal])
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Portal;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['portals', variables.subsidiary_id] });
    },
  });
};

export const useUpdatePortal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (update: Partial<Portal> & { id: string }) => {
      const { id, ...rest } = update;
      const { data, error } = await supabase
        .from('site_portals')
        .update(rest)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Portal;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['portals', data.subsidiary_id] });
    },
  });
};

export const useDeletePortal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, subsidiary_id }: { id: string; subsidiary_id: string }) => {
      const { error } = await supabase.from('site_portals').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return { id, subsidiary_id };
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['portals', vars.subsidiary_id] });
    },
  });
};
