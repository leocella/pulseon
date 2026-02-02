-- Corrigir a função cancel_ticket para usar apenas status válidos do enum
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
    -- Atualiza o ticket para "nao_compareceu" (não usamos "cancelado" pois não existe no enum)
    UPDATE fila_atendimento
    SET
        status = 'nao_compareceu',
        hora_finalizacao = NOW()
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

    -- Registrar evento de não comparecimento
    INSERT INTO queue_events (unidade, ticket_id, event_type, performed_by, motivo)
    VALUES (v_ticket.unidade, p_ticket_id, 'NO_SHOW', p_atendente, COALESCE(p_motivo, 'Não compareceu'));

    RETURN QUERY SELECT TRUE, 'Senha marcada como não compareceu'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;