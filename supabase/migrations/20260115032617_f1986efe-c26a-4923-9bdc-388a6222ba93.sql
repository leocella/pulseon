-- Atualiza a função call_next_ticket para aceitar o nome do atendente
-- Isso permite que cada ticket chamado seja vinculado a quem chamou

CREATE OR REPLACE FUNCTION public.call_next_ticket(p_unidade TEXT, p_atendente TEXT DEFAULT NULL)
RETURNS TABLE(
    id UUID,
    id_senha TEXT,
    tipo public.tipo_atendimento,
    hora_emissao TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ticket_id UUID;
    v_id_senha TEXT;
    v_tipo public.tipo_atendimento;
    v_hora_emissao TIMESTAMPTZ;
BEGIN
    -- Select and lock the next ticket
    SELECT f.id, f.id_senha, f.tipo, f.hora_emissao
    INTO v_ticket_id, v_id_senha, v_tipo, v_hora_emissao
    FROM public.fila_atendimento f
    WHERE f.unidade = p_unidade
      AND f.status = 'aguardando'
    ORDER BY 
        CASE 
            WHEN f.tipo = 'Preferencial' THEN 0 
            WHEN f.tipo = 'Retirada de Laudo' THEN 1
            ELSE 2 
        END,
        f.hora_emissao ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
    
    IF v_ticket_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Update the ticket status AND attendant
    UPDATE public.fila_atendimento f
    SET 
        status = 'chamado', 
        hora_chamada = now(),
        atendente = COALESCE(p_atendente, atendente)
    WHERE f.id = v_ticket_id;
    
    RETURN QUERY SELECT v_ticket_id, v_id_senha, v_tipo, v_hora_emissao;
END;
$$;