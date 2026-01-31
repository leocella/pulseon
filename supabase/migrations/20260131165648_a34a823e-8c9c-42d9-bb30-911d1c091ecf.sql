-- Atualizar função next_ticket para resetar a cada 4 dias
CREATE OR REPLACE FUNCTION public.next_ticket(p_unidade text, p_tipo tipo_atendimento)
 RETURNS TABLE(id_senha text, ticket_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_prefixo TEXT;
    v_numero INTEGER;
    v_id_senha TEXT;
    v_ticket_id UUID;
    v_recent_count INTEGER;
    v_epoch DATE := '2025-01-01'::DATE; -- Data de referência fixa
    v_days_since_epoch INTEGER;
    v_period_start DATE;
    v_reset_interval INTEGER := 4; -- Intervalo em dias para resetar
BEGIN
    -- Rate limiting: verifica se há tickets criados nos últimos 3 segundos
    SELECT COUNT(*) INTO v_recent_count
    FROM public.fila_atendimento
    WHERE unidade = p_unidade
      AND hora_emissao > (now() - interval '3 seconds');
    
    IF v_recent_count >= 3 THEN
        RAISE EXCEPTION 'Rate limit exceeded. Please wait a few seconds.';
    END IF;

    -- Calcular o início do período de 4 dias atual
    v_days_since_epoch := CURRENT_DATE - v_epoch;
    v_period_start := v_epoch + (floor(v_days_since_epoch::numeric / v_reset_interval) * v_reset_interval)::integer;

    -- Determine prefix based on type
    IF p_tipo = 'Normal' THEN
        v_prefixo := 'A';
    ELSIF p_tipo = 'Preferencial' THEN
        v_prefixo := 'P';
    ELSE
        v_prefixo := 'L';
    END IF;
    
    -- Insert or update sequence atomically with row-level lock
    -- Agora usa v_period_start (início do período de 4 dias) em vez de CURRENT_DATE
    INSERT INTO public.sequencia_senhas (unidade, tipo, ultimo_numero, data_referencia)
    VALUES (p_unidade, p_tipo, 1, v_period_start)
    ON CONFLICT (unidade, tipo, data_referencia) 
    DO UPDATE SET ultimo_numero = 
        CASE 
            WHEN sequencia_senhas.data_referencia < v_period_start THEN 1
            WHEN sequencia_senhas.ultimo_numero >= 999 THEN 1
            ELSE sequencia_senhas.ultimo_numero + 1
        END,
        data_referencia = v_period_start
    RETURNING sequencia_senhas.ultimo_numero INTO v_numero;
    
    -- Format ticket ID
    v_id_senha := v_prefixo || LPAD(v_numero::TEXT, 3, '0');
    
    -- Insert the ticket record WITH data_emissao (mantém data real para histórico)
    INSERT INTO public.fila_atendimento (id_senha, tipo, status, unidade, data_emissao)
    VALUES (v_id_senha, p_tipo, 'aguardando', p_unidade, CURRENT_DATE)
    RETURNING id INTO v_ticket_id;
    
    RETURN QUERY SELECT v_id_senha, v_ticket_id;
END;
$function$;