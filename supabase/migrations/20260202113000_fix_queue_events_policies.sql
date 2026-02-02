-- Migration: Corrigir policies de queue_events para permitir operações das funções RPC
-- Data: 2026-02-02

-- Remove a policy restritiva que pode estar causando problemas
DROP POLICY IF EXISTS "Admins can view queue events" ON public.queue_events;

-- Recria a policy de leitura permitindo todos (para secretarias)
CREATE POLICY "Allow all reads on queue_events" 
ON public.queue_events 
FOR SELECT 
USING (true);

-- Garante que inserts funcionem (já existe, mas recriar por segurança)
DROP POLICY IF EXISTS "Allow all inserts on queue_events" ON public.queue_events;
CREATE POLICY "Allow all inserts on queue_events" 
ON public.queue_events 
FOR INSERT 
WITH CHECK (true);

-- Recriar as funções de atendimento com bypass de RLS explícito
-- para garantir que funcionem mesmo com policies restritivas

-- =====================================================
-- FUNÇÃO: Iniciar atendimento (com bypass explícito)
-- =====================================================
CREATE OR REPLACE FUNCTION start_service_ticket(
    p_ticket_id UUID,
    p_atendente TEXT,
    p_guiche TEXT DEFAULT NULL
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_ticket RECORD;
BEGIN
    -- Atualiza o status para em_atendimento
    UPDATE fila_atendimento
    SET 
        status = 'em_atendimento',
        atendente = COALESCE(p_atendente, atendente)
    WHERE id = p_ticket_id
      AND status = 'chamado'
    RETURNING * INTO v_ticket;
    
    IF v_ticket.id IS NULL THEN
        -- Verificar se o ticket existe e qual é o status atual
        SELECT * INTO v_ticket FROM fila_atendimento WHERE id = p_ticket_id;
        
        IF v_ticket.id IS NULL THEN
            RETURN QUERY SELECT FALSE, 'Senha não encontrada'::TEXT;
        ELSIF v_ticket.status = 'em_atendimento' THEN
            RETURN QUERY SELECT TRUE, 'Atendimento já está em andamento'::TEXT;
        ELSIF v_ticket.status = 'aguardando' THEN
            RETURN QUERY SELECT FALSE, 'Senha precisa ser chamada antes de iniciar atendimento'::TEXT;
        ELSIF v_ticket.status = 'finalizado' THEN
            RETURN QUERY SELECT FALSE, 'Senha já foi finalizada'::TEXT;
        ELSE
            RETURN QUERY SELECT FALSE, format('Status atual: %s - não é possível iniciar', v_ticket.status)::TEXT;
        END IF;
        RETURN;
    END IF;
    
    -- Registrar evento
    INSERT INTO queue_events (unidade, ticket_id, event_type, performed_by, guiche)
    VALUES (v_ticket.unidade, p_ticket_id, 'START_SERVICE', p_atendente, p_guiche);
    
    RETURN QUERY SELECT TRUE, 'Atendimento iniciado com sucesso'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO: Finalizar atendimento (com mensagens melhores)
-- =====================================================
CREATE OR REPLACE FUNCTION finish_ticket(
    p_ticket_id UUID,
    p_atendente TEXT
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_ticket RECORD;
BEGIN
    UPDATE fila_atendimento
    SET 
        status = 'finalizado',
        hora_fim = NOW()
    WHERE id = p_ticket_id
      AND status IN ('chamado', 'em_atendimento')
    RETURNING * INTO v_ticket;
    
    IF v_ticket.id IS NULL THEN
        -- Verificar o status atual
        SELECT * INTO v_ticket FROM fila_atendimento WHERE id = p_ticket_id;
        
        IF v_ticket.id IS NULL THEN
            RETURN QUERY SELECT FALSE, 'Senha não encontrada'::TEXT;
        ELSIF v_ticket.status = 'finalizado' THEN
            RETURN QUERY SELECT TRUE, 'Senha já estava finalizada'::TEXT;
        ELSIF v_ticket.status = 'aguardando' THEN
            RETURN QUERY SELECT FALSE, 'Senha ainda está aguardando - precisa ser chamada primeiro'::TEXT;
        ELSE
            RETURN QUERY SELECT FALSE, format('Status atual: %s - não é possível finalizar', v_ticket.status)::TEXT;
        END IF;
        RETURN;
    END IF;
    
    -- Registrar evento
    INSERT INTO queue_events (unidade, ticket_id, event_type, performed_by)
    VALUES (v_ticket.unidade, p_ticket_id, 'FINISH', p_atendente);
    
    RETURN QUERY SELECT TRUE, 'Atendimento finalizado com sucesso'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO: Chamar senha (melhorar mensagens de erro)
-- =====================================================
CREATE OR REPLACE FUNCTION call_ticket_safe(
    p_ticket_id UUID,
    p_atendente TEXT,
    p_guiche TEXT DEFAULT NULL
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    ticket_data JSONB
) AS $$
DECLARE
    v_ticket RECORD;
    v_updated BOOLEAN := FALSE;
BEGIN
    -- Tentar atualizar apenas se status = 'aguardando'
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
        
        -- Registrar evento de chamada
        INSERT INTO queue_events (unidade, ticket_id, event_type, performed_by, guiche)
        VALUES (v_ticket.unidade, p_ticket_id, 'CALL', p_atendente, p_guiche);
        
        RETURN QUERY SELECT 
            TRUE,
            'Senha chamada com sucesso'::TEXT,
            to_jsonb(v_ticket);
    ELSE
        -- Verificar se a senha existe e qual o status atual
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
            RETURN QUERY SELECT FALSE, format('Status desconhecido: %s', v_ticket.status)::TEXT, to_jsonb(v_ticket);
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rechamar senha
CREATE OR REPLACE FUNCTION recall_ticket(
    p_ticket_id UUID,
    p_atendente TEXT,
    p_guiche TEXT DEFAULT NULL
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_ticket RECORD;
BEGIN
    SELECT * INTO v_ticket FROM fila_atendimento 
    WHERE id = p_ticket_id AND status = 'chamado';
    
    IF v_ticket.id IS NULL THEN
        -- Verificar status atual
        SELECT * INTO v_ticket FROM fila_atendimento WHERE id = p_ticket_id;
        
        IF v_ticket.id IS NULL THEN
            RETURN QUERY SELECT FALSE, 'Senha não encontrada'::TEXT;
        ELSE
            RETURN QUERY SELECT FALSE, format('Senha não está "chamada" (status: %s)', v_ticket.status)::TEXT;
        END IF;
        RETURN;
    END IF;
    
    -- Atualizar hora_chamada para NOW() (rechamando)
    UPDATE fila_atendimento
    SET hora_chamada = NOW()
    WHERE id = p_ticket_id;
    
    -- Registrar evento de rechamada
    INSERT INTO queue_events (unidade, ticket_id, event_type, performed_by, guiche)
    VALUES (v_ticket.unidade, p_ticket_id, 'RECALL', p_atendente, p_guiche);
    
    RETURN QUERY SELECT TRUE, 'Senha rechamada com sucesso'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cancelar/Não compareceu
CREATE OR REPLACE FUNCTION cancel_ticket(
    p_ticket_id UUID,
    p_atendente TEXT,
    p_motivo TEXT DEFAULT NULL
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_ticket RECORD;
    v_new_status TEXT;
BEGIN
    -- Define o status baseado no motivo
    IF p_motivo ILIKE '%não compareceu%' OR p_motivo ILIKE '%nao compareceu%' THEN
        v_new_status := 'nao_compareceu';
    ELSE
        v_new_status := 'cancelado';
    END IF;

    UPDATE fila_atendimento
    SET 
        status = v_new_status,
        hora_fim = NOW()
    WHERE id = p_ticket_id
      AND status IN ('aguardando', 'chamado', 'em_atendimento')
    RETURNING * INTO v_ticket;
    
    IF v_ticket.id IS NULL THEN
        SELECT * INTO v_ticket FROM fila_atendimento WHERE id = p_ticket_id;
        
        IF v_ticket.id IS NULL THEN
            RETURN QUERY SELECT FALSE, 'Senha não encontrada'::TEXT;
        ELSE
            RETURN QUERY SELECT FALSE, format('Não é possível cancelar (status: %s)', v_ticket.status)::TEXT;
        END IF;
        RETURN;
    END IF;
    
    -- Registrar evento de cancelamento
    INSERT INTO queue_events (unidade, ticket_id, event_type, performed_by, motivo)
    VALUES (v_ticket.unidade, p_ticket_id, 'CANCEL', p_atendente, p_motivo);
    
    RETURN QUERY SELECT TRUE, 'Senha cancelada com sucesso'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Pular senha
CREATE OR REPLACE FUNCTION skip_ticket(
    p_ticket_id UUID,
    p_atendente TEXT,
    p_motivo TEXT
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_ticket RECORD;
BEGIN
    IF p_motivo IS NULL OR trim(p_motivo) = '' THEN
        RETURN QUERY SELECT FALSE, 'Motivo é obrigatório para pular uma senha'::TEXT;
        RETURN;
    END IF;
    
    UPDATE fila_atendimento
    SET 
        status = 'nao_compareceu',
        hora_fim = NOW()
    WHERE id = p_ticket_id
      AND status IN ('aguardando', 'chamado')
    RETURNING * INTO v_ticket;
    
    IF v_ticket.id IS NULL THEN
        SELECT * INTO v_ticket FROM fila_atendimento WHERE id = p_ticket_id;
        
        IF v_ticket.id IS NULL THEN
            RETURN QUERY SELECT FALSE, 'Senha não encontrada'::TEXT;
        ELSE
            RETURN QUERY SELECT FALSE, format('Não é possível pular (status: %s)', v_ticket.status)::TEXT;
        END IF;
        RETURN;
    END IF;
    
    -- Registrar evento de skip
    INSERT INTO queue_events (unidade, ticket_id, event_type, performed_by, motivo)
    VALUES (v_ticket.unidade, p_ticket_id, 'SKIP', p_atendente, p_motivo);
    
    RETURN QUERY SELECT TRUE, 'Senha pulada com sucesso'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
