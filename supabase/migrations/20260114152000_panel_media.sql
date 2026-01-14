-- Create table for panel media management
CREATE TABLE public.panel_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unidade TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('image', 'video', 'external')),
    src TEXT NOT NULL,
    alt TEXT,
    duration INTEGER DEFAULT 8,
    order_index INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for performance
CREATE INDEX idx_panel_media_unidade_active ON public.panel_media(unidade, active, order_index);

-- Enable RLS
ALTER TABLE public.panel_media ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Read panel media"
ON public.panel_media
FOR SELECT
USING (true);

CREATE POLICY "Insert panel media"
ON public.panel_media
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Update panel media"
ON public.panel_media
FOR UPDATE
USING (true);

CREATE POLICY "Delete panel media"
ON public.panel_media
FOR DELETE
USING (true);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.panel_media;

-- Create storage bucket for media uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('panel-media', 'panel-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for panel-media bucket
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'panel-media');

CREATE POLICY "Authenticated upload access"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'panel-media');

CREATE POLICY "Authenticated update access"
ON storage.objects FOR UPDATE
USING (bucket_id = 'panel-media');

CREATE POLICY "Authenticated delete access"
ON storage.objects FOR DELETE
USING (bucket_id = 'panel-media');
