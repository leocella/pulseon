import type { MediaItem } from '@/components/MediaCarousel';

// Configure your media items here
// You can add images and videos from your assets or external URLs
export const panelMediaItems: MediaItem[] = [
  // Example images - replace with your own
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
  // Example video - uncomment and add your video URL
  // {
  //   type: 'video',
  //   src: '/videos/promotional.mp4',
  //   alt: 'Vídeo promocional',
  // },
];
