-- Fix: Adicionar search_path às funções para melhor segurança

CREATE OR REPLACE FUNCTION public.call_ticket_safe(
    p_ticket_id UUID,
    p_atendente TEXT,
    p_guiche TEXT DEFAULT NULL
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    ticket_data JSONB
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ticket RECORD;
    v_updated BOOLEAN := FALSE;
BEGIN
    UPDATE fila_atendimento
    SET 
        status = 'chamado',
        hora_chamada = NOW(),
        atendente = p_atendente
    WHERE id = p_ticket_id
      AND status = 'aguardando'
    RETURNING * INTO v_ticket;
    
    IF v_ticket.id IS NOT NULL THEN
        v_updated := TRUE;
        
        INSERT INTO queue_events (unidade, ticket_id, event_type, performed_by, guiche)
        VALUES (v_ticket.unidade, p_ticket_id, 'CALL', p_atendente, p_guiche);
        
        RETURN QUERY SELECT 
            TRUE,
            'Senha chamada com sucesso'::TEXT,
            to_jsonb(v_ticket);
    ELSE
        SELECT * INTO v_ticket FROM fila_atendimento WHERE id = p_ticket_id;
        
        IF v_ticket.id IS NULL THEN
            RETURN QUERY SELECT FALSE, 'Senha não encontrada'::TEXT, NULL::JSONB;
        ELSIF v_ticket.status = 'chamado' THEN
            RETURN QUERY SELECT 
                FALSE, 
                format('Senha já foi chamada por %s', COALESCE(v_ticket.atendente, 'outro atendente'))::TEXT,
                to_jsonb(v_ticket);
        ELSIF v_ticket.status = 'em_atendimento' THEN
            RETURN QUERY SELECT 
                FALSE,
                format('Senha já está em atendimento com %s', COALESCE(v_ticket.atendente, 'outro atendente'))::TEXT,
                to_jsonb(v_ticket);
        ELSIF v_ticket.status = 'finalizado' THEN
            RETURN QUERY SELECT FALSE, 'Senha já foi finalizada'::TEXT, to_jsonb(v_ticket);
        ELSIF v_ticket.status = 'cancelado' THEN
            RETURN QUERY SELECT FALSE, 'Senha foi cancelada'::TEXT, to_jsonb(v_ticket);
        ELSE
            RETURN QUERY SELECT FALSE, 'Senha com status desconhecido'::TEXT, to_jsonb(v_ticket);
        END IF;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.recall_ticket(
    p_ticket_id UUID,
    p_atendente TEXT,
    p_guiche TEXT DEFAULT NULL
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ticket RECORD;
BEGIN
    SELECT * INTO v_ticket FROM fila_atendimento 
    WHERE id = p_ticket_id AND status = 'chamado';
    
    IF v_ticket.id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Senha não encontrada ou não está com status "chamado"'::TEXT;
        RETURN;
    END IF;
    
    UPDATE fila_atendimento
    SET hora_chamada = NOW()
    WHERE id = p_ticket_id;
    
    INSERT INTO queue_events (unidade, ticket_id, event_type, performed_by, guiche)
    VALUES (v_ticket.unidade, p_ticket_id, 'RECALL', p_atendente, p_guiche);
    
    RETURN QUERY SELECT TRUE, 'Senha rechamada com sucesso'::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.skip_ticket(
    p_ticket_id UUID,
    p_atendente TEXT,
    p_motivo TEXT
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ticket RECORD;
BEGIN
    IF p_motivo IS NULL OR trim(p_motivo) = '' THEN
        RETURN QUERY SELECT FALSE, 'Motivo é obrigatório para pular uma senha'::TEXT;
        RETURN;
    END IF;
    
    UPDATE fila_atendimento
    SET status = 'cancelado'
    WHERE id = p_ticket_id
      AND status IN ('aguardando', 'chamado')
    RETURNING * INTO v_ticket;
    
    IF v_ticket.id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Senha não encontrada ou já processada'::TEXT;
        RETURN;
    END IF;
    
    INSERT INTO queue_events (unidade, ticket_id, event_type, performed_by, motivo)
    VALUES (v_ticket.unidade, p_ticket_id, 'SKIP', p_atendente, p_motivo);
    
    RETURN QUERY SELECT TRUE, 'Senha pulada com sucesso'::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_ticket(
    p_ticket_id UUID,
    p_atendente TEXT,
    p_motivo TEXT DEFAULT NULL
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ticket RECORD;
BEGIN
    UPDATE fila_atendimento
    SET status = 'cancelado'
    WHERE id = p_ticket_id
      AND status IN ('aguardando', 'chamado', 'em_atendimento')
    RETURNING * INTO v_ticket;
    
    IF v_ticket.id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Senha não encontrada ou já finalizada'::TEXT;
        RETURN;
    END IF;
    
    INSERT INTO queue_events (unidade, ticket_id, event_type, performed_by, motivo)
    VALUES (v_ticket.unidade, p_ticket_id, 'CANCEL', p_atendente, p_motivo);
    
    RETURN QUERY SELECT TRUE, 'Senha cancelada com sucesso'::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.start_service_ticket(
    p_ticket_id UUID,
    p_atendente TEXT,
    p_guiche TEXT DEFAULT NULL
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ticket RECORD;
BEGIN
    UPDATE fila_atendimento
    SET status = 'em_atendimento'
    WHERE id = p_ticket_id
      AND status = 'chamado'
    RETURNING * INTO v_ticket;
    
    IF v_ticket.id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Senha não encontrada ou não está "chamada"'::TEXT;
        RETURN;
    END IF;
    
    INSERT INTO queue_events (unidade, ticket_id, event_type, performed_by, guiche)
    VALUES (v_ticket.unidade, p_ticket_id, 'START_SERVICE', p_atendente, p_guiche);
    
    RETURN QUERY SELECT TRUE, 'Atendimento iniciado'::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_ticket(
    p_ticket_id UUID,
    p_atendente TEXT
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ticket RECORD;
BEGIN
    UPDATE fila_atendimento
    SET 
        status = 'finalizado',
        hora_finalizacao = NOW()
    WHERE id = p_ticket_id
      AND status IN ('chamado', 'em_atendimento')
    RETURNING * INTO v_ticket;
    
    IF v_ticket.id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Senha não encontrada ou já finalizada'::TEXT;
        RETURN;
    END IF;
    
    INSERT INTO queue_events (unidade, ticket_id, event_type, performed_by)
    VALUES (v_ticket.unidade, p_ticket_id, 'FINISH', p_atendente);
    
    RETURN QUERY SELECT TRUE, 'Atendimento finalizado'::TEXT;
END;
$$;