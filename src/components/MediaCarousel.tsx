import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon, Play, AlertTriangle } from 'lucide-react';
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

// Prazo para um vídeo COMEÇAR a tocar. Precisa ser generoso: em rede lenta um
// arquivo grande leva bem mais que os 8s de exibição de uma imagem para bufferizar.
const VIDEO_START_TIMEOUT_MS = 45000;

const MEDIA_ERROR_LABELS: Record<number, string> = {
  1: 'Carregamento cancelado',
  2: 'Falha de rede ao baixar o vídeo',
  3: 'Este PC não conseguiu decodificar o vídeo (codec incompatível)',
  4: 'Formato/codec não suportado por este navegador',
};

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
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoDurationMs, setVideoDurationMs] = useState<number | null>(null);
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
    setVideoError(null);
    setVideoDurationMs(null);
  }, []);

  const goToPrev = useCallback(() => {
    const length = itemsLengthRef.current;
    if (length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + length) % length);
    setIsVideoPlaying(false);
    setVideoError(null);
    setVideoDurationMs(null);
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

    // Vídeo: o `duration` do banco vale para imagens, NÃO como prazo para o vídeo
    // começar. Em PC/rede mais lenta o vídeo não conseguia bufferizar dentro dos
    // 8s e era pulado silenciosamente - por isso "sumia" só em algumas máquinas.
    if (currentItem.type === 'video' && !videoError) {
      if (isVideoPlaying) {
        // Já tocando: deixa terminar (onEnded avança). Teto de segurança baseado
        // na duração real do arquivo, para não cortar vídeo longo nem travar.
        const cap = videoDurationMs ? videoDurationMs + 5000 : 60000;
        timerRef.current = setTimeout(goToNext, cap);
      } else {
        // Ainda carregando: dá tempo real de bufferizar antes de desistir.
        timerRef.current = setTimeout(() => {
          console.warn(
            `[MediaCarousel] Vídeo não iniciou em ${VIDEO_START_TIMEOUT_MS}ms, pulando`,
            currentItem.src
          );
          goToNext();
        }, VIDEO_START_TIMEOUT_MS);
      }
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }

    // Vídeo com erro: mostra o aviso por alguns segundos antes de seguir,
    // para que a falha seja visível na TV em vez de sumir instantaneamente.
    const duration = videoError ? 6000 : (currentItem.duration || 8) * 1000;
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
  }, [currentIndex, autoPlay, goToNext, isVideoPlaying, videoError, videoDurationMs, items.length]);

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
            preload="auto"
            loop={false}
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              if (Number.isFinite(d) && d > 0) setVideoDurationMs(d * 1000);
            }}
            onPlay={() => setIsVideoPlaying(true)}
            onEnded={() => {
              setIsVideoPlaying(false);
              goToNext();
            }}
            onError={(e) => {
              // Não engolir o erro: sem isso, um vídeo que não decodifica neste PC
              // some do painel em silêncio e não há como diagnosticar.
              const err = e.currentTarget.error;
              const motivo = err
                ? MEDIA_ERROR_LABELS[err.code] || `código ${err.code}`
                : 'erro desconhecido';
              console.error('[MediaCarousel] Falha no vídeo', {
                src: currentItem.src,
                code: err?.code,
                motivo,
                message: err?.message,
                userAgent: navigator.userAgent,
              });
              setIsVideoPlaying(false);
              setVideoError(motivo);
            }}
          />
        )}
      </div>

      {/* Vídeo ainda bufferizando: mostra que está carregando em vez de tela preta */}
      {currentItem.type === 'video' && !isVideoPlaying && !videoError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="text-center text-white/80">
            <div className="w-10 h-10 mx-auto mb-3 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            <p className="text-sm">Carregando vídeo...</p>
          </div>
        </div>
      )}

      {/* Aviso de falha do vídeo - torna visível na TV o que antes era silencioso */}
      {videoError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 p-8">
          <div className="text-center text-white max-w-2xl">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-400" />
            <p className="text-xl font-bold mb-2">Não foi possível reproduzir o vídeo</p>
            <p className="text-base opacity-80">{videoError}</p>
          </div>
        </div>
      )}

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
