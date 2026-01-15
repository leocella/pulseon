-- Migration: Criar tabela para configurações do painel (música de fundo, etc)
-- Permite sincronizar configurações entre dispositivos via Supabase

-- Criar tabela de configurações do painel
CREATE TABLE IF NOT EXISTS public.panel_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    unidade TEXT NOT NULL,
    setting_key TEXT NOT NULL,
    setting_value JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Cada unidade pode ter apenas um registro por chave de configuração
    UNIQUE(unidade, setting_key)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_panel_settings_unidade ON public.panel_settings(unidade);
CREATE INDEX IF NOT EXISTS idx_panel_settings_key ON public.panel_settings(setting_key);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_panel_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_panel_settings_updated_at ON public.panel_settings;
CREATE TRIGGER trigger_panel_settings_updated_at
    BEFORE UPDATE ON public.panel_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_panel_settings_updated_at();

-- Habilitar RLS
ALTER TABLE public.panel_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (permitir leitura e escrita para todos por enquanto)
DROP POLICY IF EXISTS "Allow all reads on panel_settings" ON public.panel_settings;
CREATE POLICY "Allow all reads on panel_settings" ON public.panel_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all inserts on panel_settings" ON public.panel_settings;
CREATE POLICY "Allow all inserts on panel_settings" ON public.panel_settings
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all updates on panel_settings" ON public.panel_settings;
CREATE POLICY "Allow all updates on panel_settings" ON public.panel_settings
    FOR UPDATE USING (true);

-- Habilitar Realtime para sincronização instantânea
ALTER PUBLICATION supabase_realtime ADD TABLE public.panel_settings;

-- Comentários
COMMENT ON TABLE public.panel_settings IS 'Configurações do painel sincronizadas entre dispositivos';
COMMENT ON COLUMN public.panel_settings.setting_key IS 'Chave da configuração, ex: background_music, theme, etc';
COMMENT ON COLUMN public.panel_settings.setting_value IS 'Valor da configuração em formato JSON';