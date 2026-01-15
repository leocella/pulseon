import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UNIDADE, POLLING_INTERVAL } from '@/lib/config';
import type { Ticket, TipoAtendimento, StatusAtendimento } from '@/types/queue';

// Fetch current called ticket
export function useCurrentTicket() {
  return useQuery({
    queryKey: ['currentTicket', UNIDADE],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fila_atendimento')
        .select('*')
        .eq('unidade', UNIDADE)
        .in('status', ['chamado', 'em_atendimento'])
        .order('hora_chamada', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as Ticket | null;
    },
    refetchInterval: POLLING_INTERVAL,
  });
}

// Fetch waiting tickets
export function useWaitingTickets(limit?: number) {
  return useQuery({
    queryKey: ['waitingTickets', UNIDADE, limit],
    queryFn: async () => {
      let query = supabase
        .from('fila_atendimento')
        .select('*')
        .eq('unidade', UNIDADE)
        .eq('status', 'aguardando')
        .order('tipo', { ascending: false }) // Preferencial first (P > N alphabetically desc)
        .order('hora_emissao', { ascending: true });
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []) as Ticket[];
    },
    refetchInterval: POLLING_INTERVAL,
  });
}

// Fetch all active tickets (for secretary view)
export function useActiveTickets() {
  return useQuery({
    queryKey: ['activeTickets', UNIDADE],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fila_atendimento')
        .select('*')
        .eq('unidade', UNIDADE)
        .in('status', ['aguardando', 'chamado', 'em_atendimento'])
        .order('hora_emissao', { ascending: true });
      
      if (error) throw error;
      return (data || []) as Ticket[];
    },
    refetchInterval: POLLING_INTERVAL,
  });
}

// Generate new ticket
export function useGenerateTicket() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (tipo: TipoAtendimento) => {
      const { data, error } = await supabase
        .rpc('next_ticket', { p_unidade: UNIDADE, p_tipo: tipo as 'Normal' | 'Preferencial' });
      
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Falha ao gerar senha');
      
      return data[0] as { id_senha: string; ticket_id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitingTickets'] });
      queryClient.invalidateQueries({ queryKey: ['activeTickets'] });
    },
  });
}

// Call next ticket
export function useCallNextTicket() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .rpc('call_next_ticket', { p_unidade: UNIDADE });
      
      if (error) throw error;
      if (!data || data.length === 0) return null;
      
      return data[0] as { id: string; id_senha: string; tipo: TipoAtendimento; hora_emissao: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentTicket'] });
      queryClient.invalidateQueries({ queryKey: ['waitingTickets'] });
      queryClient.invalidateQueries({ queryKey: ['activeTickets'] });
    },
  });
}

// Update ticket status
export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      atendente 
    }: { 
      id: string; 
      status: StatusAtendimento;
      atendente?: string;
    }) => {
      const updateData: Record<string, unknown> = { status };
      
      if (status === 'em_atendimento' && atendente) {
        updateData.atendente = atendente;
      }
      
      if (status === 'finalizado' || status === 'nao_compareceu') {
        updateData.hora_finalizacao = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from('fila_atendimento')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentTicket'] });
      queryClient.invalidateQueries({ queryKey: ['waitingTickets'] });
      queryClient.invalidateQueries({ queryKey: ['activeTickets'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });
}

// Fetch history with filters
export function useHistory(filters: {
  date?: string;
  tipo?: TipoAtendimento;
  atendente?: string;
  page?: number;
  pageSize?: number;
}) {
  const { date, tipo, atendente, page = 0, pageSize = 50 } = filters;
  
  return useQuery({
    queryKey: ['history', UNIDADE, date, tipo, atendente, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('fila_atendimento')
        .select('*', { count: 'exact' })
        .eq('unidade', UNIDADE)
        .order('hora_emissao', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (date) {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        
        query = query
          .gte('hora_emissao', startDate.toISOString())
          .lte('hora_emissao', endDate.toISOString());
      }
      
      if (tipo) {
        query = query.eq('tipo', tipo as 'Normal' | 'Preferencial');
      }
      
      if (atendente) {
        query = query.eq('atendente', atendente);
      }
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      return { 
        tickets: (data || []) as Ticket[], 
        total: count || 0 
      };
    },
  });
}
