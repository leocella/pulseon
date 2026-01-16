import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Tipos para as respostas das RPCs
interface CallResult {
    success: boolean;
    message: string;
    ticket_data?: any;
}

interface SimpleResult {
    success: boolean;
    message: string;
}

/**
 * Hook para chamar uma senha específica com validação de concorrência
 * Usa a função call_ticket_safe que previne race conditions
 */
export function useCallTicketSafe(unidade: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            ticketId,
            atendente,
            guiche
        }: {
            ticketId: string;
            atendente: string;
            guiche?: string;
        }) => {
            const { data, error } = await (supabase.rpc as any)('call_ticket_safe', {
                p_ticket_id: ticketId,
                p_atendente: atendente,
                p_guiche: guiche || null,
            });

            if (error) throw error;

            // A função retorna um array com um objeto
            const result = Array.isArray(data) ? data[0] : data;

            if (!result?.success) {
                throw new Error(result?.message || 'Erro ao chamar senha');
            }

            return result as CallResult;
        },
        onSuccess: () => {
            // Invalidar todas as queries relacionadas
            queryClient.invalidateQueries({ queryKey: ['waitingTickets'] });
            queryClient.invalidateQueries({ queryKey: ['currentTicket'] });
            queryClient.invalidateQueries({ queryKey: ['activeTickets'] });
            queryClient.invalidateQueries({ queryKey: ['recentlyCalledTickets'] });
        },
    });
}

/**
 * Hook para rechamar uma senha
 */
export function useRecallTicket(unidade: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            ticketId,
            atendente,
            guiche,
        }: {
            ticketId: string;
            atendente: string;
            guiche?: string;
        }) => {
            const { data, error } = await (supabase.rpc as any)('recall_ticket', {
                p_ticket_id: ticketId,
                p_atendente: atendente,
                p_guiche: guiche || null,
            });

            if (error) throw error;

            const result = Array.isArray(data) ? data[0] : data;

            if (!result?.success) {
                throw new Error(result?.message || 'Erro ao rechamar senha');
            }

            return result as SimpleResult;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['currentTicket'] });
            queryClient.invalidateQueries({ queryKey: ['recentlyCalledTickets'] });
        },
    });
}

/**
 * Hook para pular uma senha (com motivo obrigatório)
 */
export function useSkipTicket(unidade: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            ticketId,
            atendente,
            motivo,
        }: {
            ticketId: string;
            atendente: string;
            motivo: string;
        }) => {
            if (!motivo?.trim()) {
                throw new Error('Motivo é obrigatório para pular uma senha');
            }

            const { data, error } = await (supabase.rpc as any)('skip_ticket', {
                p_ticket_id: ticketId,
                p_atendente: atendente,
                p_motivo: motivo,
            });

            if (error) throw error;

            const result = Array.isArray(data) ? data[0] : data;

            if (!result?.success) {
                throw new Error(result?.message || 'Erro ao pular senha');
            }

            return result as SimpleResult;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['waitingTickets'] });
            queryClient.invalidateQueries({ queryKey: ['currentTicket'] });
        },
    });
}

/**
 * Hook para cancelar uma senha
 */
export function useCancelTicket(unidade: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            ticketId,
            atendente,
            motivo,
        }: {
            ticketId: string;
            atendente: string;
            motivo?: string;
        }) => {
            const { data, error } = await (supabase.rpc as any)('cancel_ticket', {
                p_ticket_id: ticketId,
                p_atendente: atendente,
                p_motivo: motivo || null,
            });

            if (error) throw error;

            const result = Array.isArray(data) ? data[0] : data;

            if (!result?.success) {
                throw new Error(result?.message || 'Erro ao cancelar senha');
            }

            return result as SimpleResult;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['waitingTickets'] });
            queryClient.invalidateQueries({ queryKey: ['currentTicket'] });
            queryClient.invalidateQueries({ queryKey: ['activeTickets'] });
        },
    });
}

/**
 * Hook para iniciar atendimento
 */
export function useStartServiceTicket(unidade: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            ticketId,
            atendente,
            guiche,
        }: {
            ticketId: string;
            atendente: string;
            guiche?: string;
        }) => {
            const { data, error } = await (supabase.rpc as any)('start_service_ticket', {
                p_ticket_id: ticketId,
                p_atendente: atendente,
                p_guiche: guiche || null,
            });

            if (error) throw error;

            const result = Array.isArray(data) ? data[0] : data;

            if (!result?.success) {
                throw new Error(result?.message || 'Erro ao iniciar atendimento');
            }

            return result as SimpleResult;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['currentTicket'] });
            queryClient.invalidateQueries({ queryKey: ['activeTickets'] });
        },
    });
}

/**
 * Hook para finalizar atendimento
 */
export function useFinishTicket(unidade: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            ticketId,
            atendente,
        }: {
            ticketId: string;
            atendente: string;
        }) => {
            const { data, error } = await (supabase.rpc as any)('finish_ticket', {
                p_ticket_id: ticketId,
                p_atendente: atendente,
            });

            if (error) throw error;

            const result = Array.isArray(data) ? data[0] : data;

            if (!result?.success) {
                throw new Error(result?.message || 'Erro ao finalizar atendimento');
            }

            return result as SimpleResult;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['currentTicket'] });
            queryClient.invalidateQueries({ queryKey: ['activeTickets'] });
            queryClient.invalidateQueries({ queryKey: ['waitingTickets'] });
            queryClient.invalidateQueries({ queryKey: ['history'] });
            queryClient.invalidateQueries({ queryKey: ['recentlyCalledTickets'] });
        },
    });
}
