import type { MediaItem } from '@/components/MediaCarousel';

// Default fallback media items (used when no media is configured in database)
export const defaultPanelMediaItems: MediaItem[] = [
  {
    type: 'image',
    src: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1920&q=80',
    alt: 'Atendimento médico',
    duration: 8,
  },
  {
    type: 'image',
    src: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1920&q=80',
    alt: 'Hospital moderno',
    duration: 8,
  },
  {
    type: 'image',
    src: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=1920&q=80',
    alt: 'Equipe de saúde',
    duration: 8,
  },
];

// This is now deprecated - use usePanelMedia hook to fetch from database
// Kept for backward compatibility
export const panelMediaItems = defaultPanelMediaItems;
