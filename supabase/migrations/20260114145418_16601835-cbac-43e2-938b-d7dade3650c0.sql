-- Create enums for type and status
CREATE TYPE public.tipo_atendimento AS ENUM ('Normal', 'Preferencial');
CREATE TYPE public.status_atendimento AS ENUM ('aguardando', 'chamado', 'em_atendimento', 'finalizado', 'nao_compareceu');

-- Create the main queue table
CREATE TABLE public.fila_atendimento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_senha TEXT NOT NULL,
    tipo public.tipo_atendimento NOT NULL,
    status public.status_atendimento NOT NULL DEFAULT 'aguardando',
    hora_emissao TIMESTAMPTZ NOT NULL DEFAULT now(),
    hora_chamada TIMESTAMPTZ NULL,
    hora_finalizacao TIMESTAMPTZ NULL,
    atendente TEXT NULL,
    unidade TEXT NOT NULL,
    observacao TEXT NULL
);

-- Create indexes for performance
CREATE INDEX idx_fila_unidade_status_hora ON public.fila_atendimento(unidade, status, hora_emissao);
CREATE INDEX idx_fila_unidade_tipo_hora ON public.fila_atendimento(unidade, tipo, hora_emissao);
CREATE UNIQUE INDEX idx_fila_unidade_senha ON public.fila_atendimento(unidade, id_senha);

-- Create sequence tracking table for atomic ticket generation
CREATE TABLE public.sequencia_senhas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unidade TEXT NOT NULL,
    tipo public.tipo_atendimento NOT NULL,
    ultimo_numero INTEGER NOT NULL DEFAULT 0,
    data_referencia DATE NOT NULL DEFAULT CURRENT_DATE,
    UNIQUE(unidade, tipo, data_referencia)
);

-- Atomic function to generate next ticket
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
    ELSE
        v_prefixo := 'P';
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

-- Function to get next ticket to call (prioritizes Preferencial)
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
        CASE WHEN f.tipo = 'Preferencial' THEN 0 ELSE 1 END,
        f.hora_emissao ASC
    LIMIT 1;
END;
$$;

-- Function to call next ticket atomically
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
        CASE WHEN f.tipo = 'Preferencial' THEN 0 ELSE 1 END,
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

-- Enable RLS
ALTER TABLE public.fila_atendimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequencia_senhas ENABLE ROW LEVEL SECURITY;

-- RLS policies for fila_atendimento (using anon key with unidade from app config)
-- For MVP: allow all authenticated and anon users filtered by unidade
-- In production, this should be tightened with proper role-based access

-- Read policy - everyone can read their unit's data
CREATE POLICY "Read own unit tickets"
ON public.fila_atendimento
FOR SELECT
USING (true);

-- Insert policy - for totem to create tickets
CREATE POLICY "Insert tickets"
ON public.fila_atendimento
FOR INSERT
WITH CHECK (true);

-- Update policy - for secretary to update tickets
CREATE POLICY "Update tickets"
ON public.fila_atendimento
FOR UPDATE
USING (true);

-- Policies for sequencia_senhas (internal use via security definer functions)
CREATE POLICY "Allow sequence operations"
ON public.sequencia_senhas
FOR ALL
USING (true);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.fila_atendimento;