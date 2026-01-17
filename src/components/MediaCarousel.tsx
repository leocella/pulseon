import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MediaItem {
  type: 'image' | 'video' | 'external';
  src: string;
  alt?: string;
  duration?: number; // Duration in seconds for images/external (default 8s)
}

// Helper to convert YouTube/Vimeo URLs to embed format
function getEmbedUrl(url: string): string {
  // YouTube - aceita vários formatos
  // https://www.youtube.com/watch?v=VIDEO_ID
  // https://youtu.be/VIDEO_ID
  // https://www.youtube.com/embed/VIDEO_ID
  // https://www.youtube.com/v/VIDEO_ID
  // https://m.youtube.com/watch?v=VIDEO_ID
  const youtubeRegex = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/|m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/;
  const youtubeMatch = url.match(youtubeRegex);

  if (youtubeMatch) {
    const videoId = youtubeMatch[1];
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&rel=0&modestbranding=1&playsinline=1&volume=0`;
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=1&loop=1&background=1`;
  }

  // Se não for YouTube nem Vimeo, retorna a URL original
  return url;
}

interface MediaCarouselProps {
  items: MediaItem[];
  autoPlay?: boolean;
  showControls?: boolean;
  className?: string;
}

export function MediaCarousel({
  items,
  autoPlay = true,
  showControls = false,
  className
}: MediaCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const itemsLengthRef = useRef(items.length);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Update ref when items length changes
  useEffect(() => {
    itemsLengthRef.current = items.length;
  }, [items.length]);

  // Reset index if it's out of bounds when items change
  useEffect(() => {
    if (items.length > 0 && currentIndex >= items.length) {
      setCurrentIndex(0);
    }
  }, [items.length, currentIndex]);

  const goToNext = useCallback(() => {
    const length = itemsLengthRef.current;
    if (length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % length);
    setIsVideoPlaying(false);
  }, []);

  const goToPrev = useCallback(() => {
    const length = itemsLengthRef.current;
    if (length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + length) % length);
    setIsVideoPlaying(false);
  }, []);

  // Auto-advance for all media types using interval
  useEffect(() => {
    if (!autoPlay || items.length <= 1) return;

    const currentItem = items[currentIndex];
    if (!currentItem) return;

    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // For native videos that are playing, let them finish naturally
    // But also set a maximum timeout to prevent getting stuck
    if (currentItem.type === 'video' && isVideoPlaying) {
      timerRef.current = setTimeout(goToNext, 60000);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }

    const duration = (currentItem.duration || 8) * 1000;
    console.log(`MediaCarousel: Setting timer for ${duration}ms, item ${currentIndex + 1}/${items.length}`);
    
    timerRef.current = setTimeout(() => {
      console.log(`MediaCarousel: Timer fired, advancing from ${currentIndex}`);
      goToNext();
    }, duration);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [currentIndex, autoPlay, goToNext, isVideoPlaying, items.length]);

  // Early return if no items
  if (items.length === 0) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-muted/30 rounded-xl",
        className
      )}>
        <div className="text-center text-muted-foreground p-8">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhuma mídia configurada</p>
        </div>
      </div>
    );
  }

  // Safe access to current item
  const currentItem = items[currentIndex] || items[0];

  // If still no item, show empty state
  if (!currentItem) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-muted/30 rounded-xl",
        className
      )}>
        <div className="text-center text-muted-foreground p-8">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhuma mídia configurada</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-black", className)}>
      {/* Media Content */}
      <div className="relative w-full h-full flex items-center justify-center bg-black">
        {currentItem.type === 'image' ? (
          <img
            key={currentIndex}
            src={currentItem.src}
            alt={currentItem.alt || 'Slide'}
            className="w-full h-full object-contain animate-fade-in"
            style={{ objectFit: 'contain' }}
          />
        ) : currentItem.type === 'external' ? (
          <iframe
            key={currentIndex}
            src={getEmbedUrl(currentItem.src)}
            className="w-full h-full animate-fade-in border-0"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        ) : (
          <video
            key={currentIndex}
            src={currentItem.src}
            className="w-full h-full object-contain"
            style={{ objectFit: 'contain' }}
            autoPlay
            muted
            playsInline
            loop={false}
            onPlay={() => setIsVideoPlaying(true)}
            onEnded={() => {
              setIsVideoPlaying(false);
              goToNext();
            }}
            onError={() => {
              console.log('Video error, advancing to next');
              setIsVideoPlaying(false);
              goToNext();
            }}
          />
        )}
      </div>

      {/* Video indicator */}
      {(currentItem.type === 'video' || currentItem.type === 'external') && (
        <div className="absolute top-4 right-4 bg-black/50 rounded-full p-2">
          <Play className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Navigation Controls */}
      {showControls && items.length > 1 && (
        <>
          <button
            onClick={goToPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
            aria-label="Próximo"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                index === currentIndex
                  ? "bg-white w-6"
                  : "bg-white/50 hover:bg-white/70"
              )}
              aria-label={`Ir para slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Progress bar for images */}
      {currentItem.type === 'image' && autoPlay && items.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
          <div
            className="h-full bg-white/80 animate-progress"
            style={{
              animationDuration: `${currentItem.duration || 8}s`,
            }}
          />
        </div>
      )}
    </div>
  );
}
