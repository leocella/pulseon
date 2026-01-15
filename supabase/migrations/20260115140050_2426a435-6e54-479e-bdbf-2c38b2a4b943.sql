-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'secretary');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    unidade TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role, unidade)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user has access to a unit
CREATE OR REPLACE FUNCTION public.has_unit_access(_user_id UUID, _unidade TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (unidade = _unidade OR unidade IS NULL)
  )
$$;

-- RLS policies for user_roles (only admins can manage roles)
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update fila_atendimento RLS policies
DROP POLICY IF EXISTS "Read own unit tickets" ON public.fila_atendimento;
DROP POLICY IF EXISTS "Insert tickets" ON public.fila_atendimento;
DROP POLICY IF EXISTS "Update tickets" ON public.fila_atendimento;

-- Public can read tickets (for TV panel display)
CREATE POLICY "Public can read tickets"
ON public.fila_atendimento FOR SELECT
USING (true);

-- Public can insert tickets (for totem - ticket generation)
CREATE POLICY "Public can insert tickets"
ON public.fila_atendimento FOR INSERT
WITH CHECK (true);

-- Only authenticated users with unit access can update tickets
CREATE POLICY "Authenticated users can update tickets"
ON public.fila_atendimento FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND public.has_unit_access(auth.uid(), unidade)
);

-- Update sequencia_senhas RLS policies
DROP POLICY IF EXISTS "Allow sequence operations" ON public.sequencia_senhas;

-- No direct access - only through security definer functions
CREATE POLICY "No direct access to sequences"
ON public.sequencia_senhas FOR ALL
USING (false);

-- Update panel_media RLS policies
DROP POLICY IF EXISTS "Allow read panel_media" ON public.panel_media;
DROP POLICY IF EXISTS "Allow insert panel_media" ON public.panel_media;
DROP POLICY IF EXISTS "Allow update panel_media" ON public.panel_media;
DROP POLICY IF EXISTS "Allow delete panel_media" ON public.panel_media;

-- Public can read media (for TV panel)
CREATE POLICY "Public can read panel_media"
ON public.panel_media FOR SELECT
USING (true);

-- Only admins can manage media
CREATE POLICY "Admins can insert panel_media"
ON public.panel_media FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update panel_media"
ON public.panel_media FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete panel_media"
ON public.panel_media FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Update call_next_ticket to require authentication
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
    -- Check authentication
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Check unit access
    IF NOT public.has_unit_access(auth.uid(), p_unidade) THEN
        RAISE EXCEPTION 'Access denied for this unit';
    END IF;

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