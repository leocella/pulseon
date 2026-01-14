import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UNIDADE } from '@/lib/config';

export function useRealtimeQueue() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('queue-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fila_atendimento',
          filter: `unidade=eq.${UNIDADE}`,
        },
        () => {
          // Invalidate all queue-related queries
          queryClient.invalidateQueries({ queryKey: ['currentTicket'] });
          queryClient.invalidateQueries({ queryKey: ['waitingTickets'] });
          queryClient.invalidateQueries({ queryKey: ['activeTickets'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
