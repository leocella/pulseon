import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UNIDADE, POLLING_INTERVAL } from '@/lib/config';
import type { Ticket, TipoAtendimento, StatusAtendimento } from '@/types/queue';

// Fetch current called ticket
export function useCurrentTicket(unidade?: string, atendenteFilter?: string) {
  const unit = unidade || UNIDADE;

  return useQuery({
    queryKey: ['currentTicket', unit, atendenteFilter],
    queryFn: async () => {
      let query = supabase
        .from('fila_atendimento')
        .select('*')
        .eq('unidade', unit)
        .in('status', ['chamado', 'em_atendimento'])
        .order('hora_chamada', { ascending: false });

      // Se houver filtro de atendente, busca tickets desse atendente
      if (atendenteFilter) {
        query = query.eq('atendente', atendenteFilter);
      }

      const { data, error } = await query
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as Ticket | null;
    },
    refetchInterval: POLLING_INTERVAL,
  });
}

// Fetch waiting tickets
export function useWaitingTickets(limit?: number, unidade?: string) {
  const unit = unidade || UNIDADE;

  return useQuery({
    queryKey: ['waitingTickets', unit, limit],
    queryFn: async () => {
      let query = supabase
        .from('fila_atendimento')
        .select('*')
        .eq('unidade', unit)
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
export function useActiveTickets(unidade?: string) {
  const unit = unidade || UNIDADE;

  return useQuery({
    queryKey: ['activeTickets', unit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fila_atendimento')
        .select('*')
        .eq('unidade', unit)
        .in('status', ['aguardando', 'chamado', 'em_atendimento'])
        .order('hora_emissao', { ascending: true });

      if (error) throw error;
      return (data || []) as Ticket[];
    },
    refetchInterval: POLLING_INTERVAL,
  });
}

// Fetch recently called tickets (for display on panel - history of called tickets)
export function useRecentlyCalledTickets(limit: number = 5, unidade?: string) {
  const unit = unidade || UNIDADE;

  return useQuery({
    queryKey: ['recentlyCalledTickets', unit, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fila_atendimento')
        .select('*')
        .eq('unidade', unit)
        .in('status', ['chamado', 'em_atendimento', 'finalizado'])
        .not('hora_chamada', 'is', null)
        .order('hora_chamada', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as Ticket[];
    },
    refetchInterval: POLLING_INTERVAL,
  });
}

// Generate new ticket
export function useGenerateTicket(unidade?: string) {
  const unit = unidade || UNIDADE;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tipo: TipoAtendimento) => {
      const { data, error } = await supabase
        .rpc('next_ticket', { p_unidade: unit, p_tipo: tipo as any });

      if (error) throw error;
      if (!data) throw new Error('Falha ao gerar senha');

      // Segurança: dependendo de contexto/biblioteca, o retorno pode ser array (normal)
      // ou objeto. Garantimos que sempre extraímos um registro válido.
      const row = Array.isArray(data) ? data[0] : (data as any);

      if (!row?.id_senha || !row?.ticket_id) {
        console.error('[useGenerateTicket] Resposta inesperada do RPC next_ticket:', data);
        throw new Error('Resposta inválida ao gerar senha');
      }

      return row as { id_senha: string; ticket_id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitingTickets'] });
      queryClient.invalidateQueries({ queryKey: ['activeTickets'] });
    },
  });
}

// Call next ticket
export function useCallNextTicket(unidade?: string) {
  const unit = unidade || UNIDADE;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (atendente?: string) => {
      const { data, error } = await supabase
        .rpc('call_next_ticket', {
          p_unidade: unit,
          p_atendente: atendente || null
        });

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
// Busca tickets que foram emitidos OU processados (chamados/finalizados) no período
export function useHistory(filters: {
  startDate?: string;
  endDate?: string;
  tipo?: TipoAtendimento;
  atendente?: string;
  page?: number;
  pageSize?: number;
  unidade?: string;
}) {
  const { startDate, endDate, tipo, atendente, page = 0, pageSize = 50, unidade } = filters;
  const unit = unidade || UNIDADE;

  return useQuery({
    queryKey: ['history', unit, startDate, endDate, tipo, atendente, page, pageSize],
    queryFn: async () => {
      // Base query
      let query = supabase
        .from('fila_atendimento')
        .select('*', { count: 'exact' })
        .eq('unidade', unit)
        .order('hora_emissao', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      // Filter by date range using OR logic:
      // Show tickets that were EMITTED in the range OR CALLED/FINISHED in the range
      if (startDate && endDate) {
        const start = `${startDate}T00:00:00-03:00`;
        const end = `${endDate}T23:59:59-03:00`;
        
        // Use OR filter to include tickets processed in the date range
        query = query.or(
          `hora_emissao.gte.${start},hora_chamada.gte.${start},hora_finalizacao.gte.${start}`
        );
        query = query.or(
          `hora_emissao.lte.${end},hora_chamada.lte.${end},hora_finalizacao.lte.${end}`
        );
      } else {
        // Fallback to simple date filtering
        if (startDate) {
          const start = `${startDate}T00:00:00-03:00`;
          query = query.gte('hora_emissao', start);
        }

        if (endDate) {
          const end = `${endDate}T23:59:59-03:00`;
          query = query.lte('hora_emissao', end);
        }
      }

      if (tipo) {
        query = query.eq('tipo', tipo as any);
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
