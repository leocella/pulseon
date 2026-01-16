-- Migration: Sistema de chamada manual com auditoria e controle de concorrência
-- Data: 2026-01-16

-- =====================================================
-- TABELA DE AUDITORIA: queue_events
-- =====================================================
CREATE TABLE IF NOT EXISTS public.queue_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    unidade TEXT NOT NULL,
    ticket_id UUID NOT NULL REFERENCES public.fila_atendimento(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('CALL', 'RECALL', 'SKIP', 'FINISH', 'CANCEL', 'START_SERVICE')),
    performed_by TEXT NOT NULL,
    guiche TEXT,
    motivo TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_queue_events_ticket ON public.queue_events(ticket_id);
CREATE INDEX IF NOT EXISTS idx_queue_events_unidade ON public.queue_events(unidade);
CREATE INDEX IF NOT EXISTS idx_queue_events_type ON public.queue_events(event_type);
CREATE INDEX IF NOT EXISTS idx_queue_events_created ON public.queue_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_queue_events_performed_by ON public.queue_events(performed_by);

-- Índices na tabela fila_atendimento para otimizar queries da secretaria
CREATE INDEX IF NOT EXISTS idx_fila_status ON public.fila_atendimento(status);
CREATE INDEX IF NOT EXISTS idx_fila_hora_emissao ON public.fila_atendimento(hora_emissao);
CREATE INDEX IF NOT EXISTS idx_fila_tipo ON public.fila_atendimento(tipo);
CREATE INDEX IF NOT EXISTS idx_fila_unidade_status ON public.fila_atendimento(unidade, status);

-- RLS para queue_events
ALTER TABLE public.queue_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all reads on queue_events" ON public.queue_events;
CREATE POLICY "Allow all reads on queue_events" ON public.queue_events
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all inserts on queue_events" ON public.queue_events;
CREATE POLICY "Allow all inserts on queue_events" ON public.queue_events
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- FUNÇÃO: Chamar senha com validação de concorrência
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO: Rechamar senha (deve estar em status 'chamado')
-- =====================================================
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO: Pular senha (com motivo obrigatório)
-- =====================================================
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO: Cancelar senha
-- =====================================================
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO: Iniciar atendimento
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO: Finalizar atendimento
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Habilitar Realtime para queue_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_events;

-- Comentários
COMMENT ON TABLE public.queue_events IS 'Auditoria de eventos da fila de atendimento';
COMMENT ON FUNCTION call_ticket_safe IS 'Chama senha com validação de concorrência (race condition safe)';
COMMENT ON FUNCTION recall_ticket IS 'Rechama uma senha que já foi chamada';
COMMENT ON FUNCTION skip_ticket IS 'Pula uma senha com motivo obrigatório';