import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabaseClient';

export const useAttendanceRealtime = (subsidiaryId: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!subsidiaryId) return;

    const channel = supabase
      .channel(`realtime_attendance_site_${subsidiaryId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fiches_pointage' },
        (payload) => {
          // Invalidation du cache pour mettre à jour instantanément toutes les bornes actives
          queryClient.invalidateQueries({ queryKey: ['attendance', subsidiaryId] });
          queryClient.invalidateQueries({ queryKey: ['current_site_status', subsidiaryId] });
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [subsidiaryId, queryClient]);
};
