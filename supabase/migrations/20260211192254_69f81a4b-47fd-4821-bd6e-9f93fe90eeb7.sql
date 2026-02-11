-- Adicionar coluna display_name na tabela user_roles para identificar o atendente
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS display_name text;

-- Atualizar nomes conhecidos baseados nos emails dos usuários
-- (O admin pode atualizar depois via painel)
