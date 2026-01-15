-- Remove a política de INSERT público direto
-- Tickets só podem ser criados via função next_ticket (SECURITY DEFINER)
DROP POLICY IF EXISTS "Public can insert tickets" ON public.fila_atendimento;

-- Nova política: bloqueia INSERT direto (função SECURITY DEFINER ignora RLS)
CREATE POLICY "No direct inserts - use next_ticket function" 
ON public.fila_atendimento 
FOR INSERT 
WITH CHECK (false);

-- Adiciona rate limiting básico na função next_ticket
-- Verifica se já existe um ticket recente (últimos 5 segundos) para evitar spam
CREATE OR REPLACE FUNCTION public.next_ticket(p_unidade text, p_tipo tipo_atendimento)
 RETURNS TABLE(id_senha text, ticket_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
DECLARE
    v_prefixo TEXT;
    v_numero INTEGER;
    v_id_senha TEXT;
    v_ticket_id UUID;
    v_recent_count INTEGER;
BEGIN
    -- Rate limiting: verifica se há tickets criados nos últimos 5 segundos
    SELECT COUNT(*) INTO v_recent_count
    FROM public.fila_atendimento
    WHERE unidade = p_unidade
      AND hora_emissao > (now() - interval '5 seconds');
    
    IF v_recent_count >= 3 THEN
        RAISE EXCEPTION 'Rate limit exceeded. Please wait a few seconds.';
    END IF;

    -- Determine prefix based on type
    IF p_tipo = 'Normal' THEN
        v_prefixo := 'A';
    ELSIF p_tipo = 'Preferencial' THEN
        v_prefixo := 'P';
    ELSE
        v_prefixo := 'L';
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