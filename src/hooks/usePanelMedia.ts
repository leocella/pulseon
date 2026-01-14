import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { defaultPanelMediaItems } from '@/lib/mediaConfig';

export interface PanelMediaItem {
  id: string;
  type: 'image' | 'video' | 'external';
  src: string;
  alt: string | null;
  duration: number;
  order_index: number;
  active: boolean;
}

// Storage key for localStorage
const STORAGE_KEY = 'panel_media_items';

// Get items from localStorage or use defaults
const getStoredItems = (): PanelMediaItem[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading from localStorage:', e);
  }
  
  // Return default items if nothing stored
  return defaultPanelMediaItems.map((item, index) => ({
    id: `default-${index}`,
    type: item.type,
    src: item.src,
    alt: item.alt || null,
    duration: item.duration || 8,
    order_index: index,
    active: true,
  }));
};

// Save items to localStorage
const saveItems = (items: PanelMediaItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Error saving to localStorage:', e);
  }
};

// Fetch all panel media
export function usePanelMedia() {
  return useQuery({
    queryKey: ['panelMedia'],
    queryFn: async (): Promise<PanelMediaItem[]> => {
      return getStoredItems();
    },
    staleTime: 1000 * 60, // 1 minute
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
    }): Promise<PanelMediaItem> => {
      const items = getStoredItems();
      let src = url || '';

      // For files, create a blob URL (note: this won't persist after page reload for uploaded files)
      if (file && type !== 'external') {
        src = URL.createObjectURL(file);
      }

      const newItem: PanelMediaItem = {
        id: `media-${Date.now()}`,
        type,
        src,
        alt: alt || null,
        duration: duration || 8,
        order_index: items.length,
        active: true,
      };

      const updatedItems = [...items, newItem];
      saveItems(updatedItems);

      return newItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panelMedia'] });
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
    }): Promise<PanelMediaItem> => {
      const items = getStoredItems();
      const index = items.findIndex(item => item.id === id);
      
      if (index === -1) {
        throw new Error('Item not found');
      }

      const updatedItem = { ...items[index] };
      if (active !== undefined) updatedItem.active = active;
      if (order_index !== undefined) updatedItem.order_index = order_index;
      if (duration !== undefined) updatedItem.duration = duration;

      items[index] = updatedItem;
      saveItems(items);

      return updatedItem;
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
    mutationFn: async (id: string): Promise<void> => {
      const items = getStoredItems();
      const filteredItems = items.filter(item => item.id !== id);
      saveItems(filteredItems);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panelMedia'] });
    },
  });
}
