-- Add 'Retirada de Laudo' to tipo_atendimento enum
ALTER TYPE public.tipo_atendimento ADD VALUE IF NOT EXISTS 'Retirada de Laudo';

-- Update next_ticket function to handle 'Retirada de Laudo' (Prefix 'L')
CREATE OR REPLACE FUNCTION public.next_ticket(p_unidade TEXT, p_tipo public.tipo_atendimento)
RETURNS TABLE(id_senha TEXT, ticket_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_prefixo TEXT;
    v_numero INTEGER;
    v_id_senha TEXT;
    v_ticket_id UUID;
BEGIN
    -- Determine prefix based on type
    IF p_tipo = 'Normal' THEN
        v_prefixo := 'A';
    ELSIF p_tipo = 'Preferencial' THEN
        v_prefixo := 'P';
    ELSIF p_tipo = 'Retirada de Laudo' THEN
        v_prefixo := 'L';
    ELSE
        v_prefixo := 'G';
    END IF;
    
    -- Insert or update sequence atomically with row-level lock
    INSERT INTO public.sequencia_senhas (unidade, tipo, ultimo_numero, data_referencia)
    VALUES (p_unidade, p_tipo, 1, CURRENT_DATE)
    ON CONFLICT (unidade, tipo, data_referencia) 
    DO UPDATE SET ultimo_numero = 
        CASE 
            WHEN sequencia_senhas.data_referencia < CURRENT_DATE THEN 1
            WHEN sequencia_senhas.ultimo_numero >= 999 THEN 1
            ELSE sequencia_senhas.ultimo_numero + 1
        END,
        data_referencia = CURRENT_DATE
    RETURNING sequencia_senhas.ultimo_numero INTO v_numero;
    
    -- Format ticket ID
    v_id_senha := v_prefixo || LPAD(v_numero::TEXT, 3, '0');
    
    -- Insert the ticket record
    INSERT INTO public.fila_atendimento (id_senha, tipo, status, unidade)
    VALUES (v_id_senha, p_tipo, 'aguardando', p_unidade)
    RETURNING id INTO v_ticket_id;
    
    RETURN QUERY SELECT v_id_senha, v_ticket_id;
END;
$$;

-- Update get_next_to_call to include logic for 'Retirada de Laudo'
-- Priority: Preferencial (0) > Retirada de Laudo (1) > Normal (2)
CREATE OR REPLACE FUNCTION public.get_next_to_call(p_unidade TEXT)
RETURNS TABLE(
    id UUID,
    id_senha TEXT,
    tipo public.tipo_atendimento,
    hora_emissao TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT f.id, f.id_senha, f.tipo, f.hora_emissao
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
    LIMIT 1;
END;
$$;

-- Update call_next_ticket to use same priority logic
CREATE OR REPLACE FUNCTION public.call_next_ticket(p_unidade TEXT)
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
    
    -- Update the ticket status
    UPDATE public.fila_atendimento f
    SET status = 'chamado', hora_chamada = now()
    WHERE f.id = v_ticket_id;
    
    RETURN QUERY SELECT v_ticket_id, v_id_senha, v_tipo, v_hora_emissao;
END;
$$;
