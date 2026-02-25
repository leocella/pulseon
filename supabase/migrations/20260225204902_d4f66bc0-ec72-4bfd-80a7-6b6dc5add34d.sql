
-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to reset all tickets at midnight
CREATE OR REPLACE FUNCTION public.reset_daily_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Finalizar todas as senhas que ainda estão ativas (aguardando, chamado, em_atendimento)
    UPDATE fila_atendimento
    SET 
        status = 'finalizado',
        hora_finalizacao = NOW()
    WHERE status IN ('aguardando', 'chamado', 'em_atendimento');
    
    -- Resetar sequências para o novo dia (a função next_ticket já faz isso via data_referencia,
    -- mas resetamos explicitamente para garantir)
    UPDATE sequencia_senhas
    SET ultimo_numero = 0, data_referencia = CURRENT_DATE;
END;
$$;
