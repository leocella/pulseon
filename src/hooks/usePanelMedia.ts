import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UNIDADE } from '@/lib/config';

export interface PanelMediaItem {
  id: string;
  unidade: string;
  type: 'image' | 'video' | 'external';
  src: string;
  alt: string | null;
  duration: number;
  order_index: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Fetch all panel media
export function usePanelMedia() {
  return useQuery({
    queryKey: ['panelMedia', UNIDADE],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('panel_media')
        .select('*')
        .eq('unidade', UNIDADE)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as PanelMediaItem[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on focus
  });
}

// Upload media (file or external URL)
export function useUploadMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      type,
      file,
      url,
      alt,
      duration
    }: {
      type: 'image' | 'video' | 'external';
      file?: File;
      url?: string;
      alt: string;
      duration?: number;
    }) => {
      let src = url || '';

      // Sanitize unidade name for storage path (remove accents and special chars)
      const sanitizedUnidade = UNIDADE
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9-_]/g, '_');

      // Upload file to Supabase Storage if it's a file
      if (file && type !== 'external') {
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${sanitizedUnidade}/${fileName}`;

        console.log(`Uploading ${type} file: ${file.name}, size: ${(file.size / 1024 / 1024).toFixed(2)}MB, type: ${file.type}`);

        // Determine content type
        let contentType = file.type;
        if (!contentType || contentType === 'application/octet-stream') {
          // Fallback content types based on extension
          const mimeTypes: Record<string, string> = {
            'mp4': 'video/mp4',
            'webm': 'video/webm',
            'mov': 'video/quicktime',
            'avi': 'video/x-msvideo',
            'mkv': 'video/x-matroska',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
          };
          contentType = mimeTypes[fileExt || ''] || 'application/octet-stream';
        }

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('panel-media')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Falha no upload: ${uploadError.message}`);
        }

        console.log('Upload successful:', uploadData);

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('panel-media')
          .getPublicUrl(filePath);

        src = publicUrl;
        console.log('Public URL:', src);
      }

      // Get current max order_index
      const { data: maxOrderData } = await supabase
        .from('panel_media')
        .select('order_index')
        .eq('unidade', UNIDADE)
        .order('order_index', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextOrder = ((maxOrderData as unknown as { order_index: number })?.order_index || 0) + 1;

      console.log('Inserting media record:', { type, src: src.substring(0, 50) + '...', alt, duration, order_index: nextOrder });

      // Insert media record
      const { data, error } = await supabase
        .from('panel_media')
        .insert({
          unidade: UNIDADE,
          type,
          src,
          alt,
          duration: duration || 8,
          order_index: nextOrder,
          active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Database insert error:', error);
        throw new Error(`Falha ao salvar mídia: ${error.message}`);
      }

      console.log('Media record created:', data);
      return data as unknown as PanelMediaItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panelMedia'] });
    },
    onError: (error) => {
      console.error('Upload mutation error:', error);
    },
  });
}

// Update media
export function useUpdateMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      active,
      order_index,
      duration
    }: {
      id: string;
      active?: boolean;
      order_index?: number;
      duration?: number;
    }) => {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

      if (active !== undefined) updateData.active = active;
      if (order_index !== undefined) updateData.order_index = order_index;
      if (duration !== undefined) updateData.duration = duration;

      const { data, error } = await supabase
        .from('panel_media')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as PanelMediaItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panelMedia'] });
    },
  });
}

// Delete media
export function useDeleteMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get media info to delete file from storage if needed
      const { data: mediaItem } = await supabase
        .from('panel_media')
        .select('*')
        .eq('id', id)
        .single();

      const item = mediaItem as unknown as PanelMediaItem;

      if (item && item.type !== 'external' && item.src.includes('panel-media')) {
        // Extract file path from URL
        const urlParts = item.src.split('/panel-media/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          // Clean up URL encoding if necessary, but usually split works if stored verbatim
          // filePath might contain UNIDADE/filename which might be encoded
          const decodedPath = decodeURIComponent(filePath);
          await supabase.storage
            .from('panel-media')
            .remove([decodedPath]);
        }
      }

      // Delete database record
      const { error } = await supabase
        .from('panel_media')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panelMedia'] });
    },
  });
}
