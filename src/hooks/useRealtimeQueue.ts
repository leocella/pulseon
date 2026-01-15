import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UNIDADE } from '@/lib/config';

export function useRealtimeQueue(unidade?: string) {
  const queryClient = useQueryClient();
  const unit = unidade || UNIDADE;

  useEffect(() => {
    console.log('useRealtimeQueue: Subscribing to realtime for unit:', unit);
    
    const channel = supabase
      .channel(`queue-changes-${unit}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fila_atendimento',
          filter: `unidade=eq.${unit}`,
        },
        (payload) => {
          console.log('Realtime queue update received:', payload);
          // Invalidate all queue-related queries immediately
          queryClient.invalidateQueries({ queryKey: ['currentTicket'] });
          queryClient.invalidateQueries({ queryKey: ['waitingTickets'] });
          queryClient.invalidateQueries({ queryKey: ['activeTickets'] });
          queryClient.invalidateQueries({ queryKey: ['recentlyCalledTickets'] });
          queryClient.invalidateQueries({ queryKey: ['history'] });
        }
      )
      .subscribe((status) => {
        console.log('Realtime queue subscription status:', status);
      });

    const channelMedia = supabase
      .channel(`media-changes-${unit}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'panel_media',
          filter: `unidade=eq.${unit}`,
        },
        (payload) => {
          console.log('Realtime media update received:', payload);
          queryClient.invalidateQueries({ queryKey: ['panelMedia'] });
        }
      )
      .subscribe((status) => {
        console.log('Realtime media subscription status:', status);
      });

    return () => {
      console.log('useRealtimeQueue: Unsubscribing from realtime');
      supabase.removeChannel(channel);
      supabase.removeChannel(channelMedia);
    };
  }, [queryClient, unit]);
}
