-- Create panel_media table for storing carousel media items
CREATE TABLE public.panel_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unidade TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'external')),
  src TEXT NOT NULL,
  alt TEXT,
  duration INTEGER NOT NULL DEFAULT 8,
  order_index INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.panel_media ENABLE ROW LEVEL SECURITY;

-- Allow all operations (public access for panel media)
CREATE POLICY "Allow read panel_media" ON public.panel_media FOR SELECT USING (true);
CREATE POLICY "Allow insert panel_media" ON public.panel_media FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update panel_media" ON public.panel_media FOR UPDATE USING (true);
CREATE POLICY "Allow delete panel_media" ON public.panel_media FOR DELETE USING (true);

-- Enable realtime for panel_media
ALTER PUBLICATION supabase_realtime ADD TABLE public.panel_media;

-- Create storage bucket for panel media files
INSERT INTO storage.buckets (id, name, public) VALUES ('panel-media', 'panel-media', true);

-- Storage policies for panel-media bucket
CREATE POLICY "Allow public read panel-media" ON storage.objects FOR SELECT USING (bucket_id = 'panel-media');
CREATE POLICY "Allow public upload panel-media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'panel-media');
CREATE POLICY "Allow public update panel-media" ON storage.objects FOR UPDATE USING (bucket_id = 'panel-media');
CREATE POLICY "Allow public delete panel-media" ON storage.objects FOR DELETE USING (bucket_id = 'panel-media');