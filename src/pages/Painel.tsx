import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Monitor, Clock, ChevronRight, Volume2, VolumeX, Maximize, Minimize, History, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCurrentTicket, useRecentlyCalledTickets } from '@/hooks/useQueue';
import { useRealtimeQueue } from '@/hooks/useRealtimeQueue';
import { usePanelMedia } from '@/hooks/usePanelMedia';
import { useAlertSound } from '@/hooks/useAlertSound';
import { useSpeech } from '@/hooks/useSpeech';

import { TicketNumber } from '@/components/TicketNumber';
import { TicketBadge } from '@/components/TicketBadge';
import { MediaCarousel } from '@/components/MediaCarousel';
import { WeatherWidget } from '@/components/WeatherWidget';
import { defaultPanelMediaItems } from '@/lib/mediaConfig';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { MediaItem } from '@/components/MediaCarousel';

export default function Painel() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hasUserInteracted, setHasUserInteracted] = useState(() => localStorage.getItem('panel_audio_enabled') === 'true');
  const [isFullscreen, setIsFullscreen] = useState(() => localStorage.getItem('panel_fullscreen') === 'true');
  const lastCalledTicketRef = useRef<{ id: string, hora_chamada: string | null } | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const { data: currentTicket, isLoading: loadingCurrent } = useCurrentTicket();
  const { data: recentTickets = [], isLoading: loadingRecent } = useRecentlyCalledTickets(6);
  const { data: dbMediaItems = [] } = usePanelMedia();
  const { playAlertSound, initAudioContext } = useAlertSound();
  const { speakTicket, speak } = useSpeech();

  // Enable realtime updates
  useRealtimeQueue();

  // Re-initialize AudioContext after page reload when localStorage says audio was enabled
  // The AudioContext dies on reload, so we need to recapture it on first user interaction
  useEffect(() => {
    if (!hasUserInteracted) return;

    const reinitOnClick = () => {
      console.log('Re-inicializando AudioContext após reload...');
      initAudioContext();
      // Also try to enter fullscreen if it was previously enabled
      if (localStorage.getItem('panel_fullscreen') === 'true' && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      document.removeEventListener('click', reinitOnClick);
    };

    document.addEventListener('click', reinitOnClick, { once: true });
    return () => document.removeEventListener('click', reinitOnClick);
  }, []); // Only on mount

  // Keep screen awake using Wake Lock API
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          console.log('Wake Lock ativado - tela permanecerá ligada');
        }
      } catch (err) {
        console.log('Wake Lock não disponível:', err);
      }
    };

    requestWakeLock();

    // Re-acquire wake lock when page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
      }
    };
  }, []);

  // Auto-reload page every 2 hours to prevent memory issues on TV
  useEffect(() => {
    const reloadInterval = setInterval(() => {
      console.log('Auto-reloading page to free memory...');
      window.location.reload();
    }, 2 * 60 * 60 * 1000); // 2 hours

    return () => clearInterval(reloadInterval);
  }, []);

  // Handle user interaction to enable audio
  const handleEnableAudio = useCallback(() => {
    console.log('Iniciando áudio por interação do usuário...');
    initAudioContext();
    setHasUserInteracted(true);
    localStorage.setItem('panel_audio_enabled', 'true');
    
    // Se o usuário desejava tela cheia persistentemente, tentar ativar agora na interação
    if (localStorage.getItem('panel_fullscreen') === 'true' && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log('Erro ao tentar restaurar fullscreen:', err);
      });
    }

    // Play a test sound and voice clarify it's active
    playAlertSound();
    setTimeout(() => {
      speak('Áudio do painel ativado');
    }, 1000);
  }, [initAudioContext, playAlertSound, speak]);

  // Toggle fullscreen mode
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
        localStorage.setItem('panel_fullscreen', 'true');
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        localStorage.setItem('panel_fullscreen', 'false');
      }
    } catch (err) {
      console.log('Fullscreen não disponível:', err);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const currentlyFull = !!document.fullscreenElement;
      setIsFullscreen(currentlyFull);
      localStorage.setItem('panel_fullscreen', currentlyFull.toString());
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Play alert sound ONLY when a ticket is called/recalled (based on hora_chamada progression)
  // This avoids false positives when finishing a ticket causes the "current" ticket to switch
  // back to an older (already-called) ticket.
  useEffect(() => {
    if (!currentTicket || currentTicket.status !== 'chamado' || !currentTicket.hora_chamada) {
      return;
    }

    const last = lastCalledTicketRef.current;
    const lastTime = last?.hora_chamada;
    const callTime = currentTicket.hora_chamada;

    // Consider it a "new call event" only if hora_chamada moves forward (or same second but different ticket).
    const isNewCallTime = !lastTime || callTime > lastTime;
    const isSameTimeDifferentTicket = !!lastTime && callTime === lastTime && last?.id !== currentTicket.id;
    const isNewCallEvent = isNewCallTime || isSameTimeDifferentTicket;

    // Update the ref whenever we see a newer call event
    if (isNewCallEvent) {
      lastCalledTicketRef.current = { id: currentTicket.id, hora_chamada: callTime };
    }
    
    if (isNewCallEvent && hasUserInteracted) {
      console.log('Chamada detectada:', currentTicket.id_senha, 'hora:', callTime);
      playAlertSound();
      
      // Delay speech slightly after alert sound for better overlap
      setTimeout(() => {
        speakTicket(currentTicket.id_senha);
      }, 1200);
    } else if (isNewCallEvent && !hasUserInteracted) {
      console.warn('Senha chamada mas áudio não interagido. Clique no botão de ativar áudio.');
    }
  }, [currentTicket, hasUserInteracted, playAlertSound, speakTicket]);

  // Convert database media items to MediaItem format - memoized to prevent unnecessary re-renders
  const mediaItems: MediaItem[] = useMemo(() => {
    if (dbMediaItems.length > 0) {
      return dbMediaItems
        .filter(item => item.active)
        .map(item => ({
          type: item.type as 'image' | 'video' | 'external',
          src: item.src,
          alt: item.alt || '',
          duration: item.duration,
        }));
    }
    return defaultPanelMediaItems;
  }, [dbMediaItems]);

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className='h-screen bg-gradient-to-br from-background via-primary/5 to-background flex flex-col overflow-hidden'>
      {/* Header - Layout com 3 colunas: Player | Logo+Nome | Controles */}
      <header className='shrink-0 flex items-center justify-between px-4 py-2 bg-gradient-to-r from-primary to-primary/80 border-b border-primary/20'>
        {/* Coluna Esquerda - Espaço reservado */}
        <div className='flex items-center min-w-[300px]'>
        </div>

        {/* Coluna Central: Logo + Nome do Lab */}
        <div className='flex items-center justify-center gap-4 flex-1'>
          <img
            src='/platano-logo.png'
            alt='Laboratório Plátano'
            className='h-14 w-auto rounded-lg shadow-lg'
          />
          <div className='text-white text-center'>
            <span className='text-2xl font-bold block tracking-wide'>Laboratório Plátano</span>
            <span className='text-sm opacity-90 block'>Sempre ao seu lado</span>
          </div>
        </div>

        {/* Coluna Direita: Controles, Clima e Relógio */}
        <div className='flex items-center gap-3 sm:gap-5 min-w-[300px] justify-end'>
          {/* Audio Activation */}
          {!hasUserInteracted && (
            <Button
              onClick={handleEnableAudio}
              variant='secondary'
              size='default'
              className='flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white border-0 font-bold animate-pulse shadow-xl px-6 h-12'
            >
              <Volume2 className='w-5 h-5' />
              <span>CLIQUE PARA ATIVAR O SOM</span>
            </Button>
          )}

          {/* Fullscreen Toggle */}
          <Button
            onClick={toggleFullscreen}
            variant='ghost'
            size='icon'
            className='text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10'
            title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          >
            {isFullscreen ? (
              <Minimize className='w-4 h-4 sm:w-5 sm:h-5' />
            ) : (
              <Maximize className='w-4 h-4 sm:w-5 sm:h-5' />
            )}
          </Button>

          {/* Reload Button - to free memory */}
          <Button
            onClick={() => window.location.reload()}
            variant='ghost'
            size='icon'
            className='text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10'
            title='Recarregar página (liberar memória)'
          >
            <RefreshCw className='w-4 h-4 sm:w-5 sm:h-5' />
          </Button>

          <div className='hidden sm:block'>
            <WeatherWidget />
          </div>

          <div className='flex items-center gap-2 sm:gap-3 text-white'>
            <Clock className='w-4 h-4 sm:w-6 sm:h-6 opacity-90' />
            <div className='text-right'>
              <div className='text-lg sm:text-3xl font-bold font-mono tracking-tight'>
                {format(currentTime, 'HH:mm:ss')}
              </div>
              <div className='text-xs sm:text-sm opacity-80 -mt-1 hidden sm:block'>
                {format(currentTime, "dd 'de' MMMM", { locale: ptBR })}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Layout TV fixo sem scroll */}
      <div className='flex-1 p-2 grid grid-cols-12 gap-3 overflow-hidden min-h-0'>

        {/* Media Carousel - Lado esquerdo, ocupa maior parte */}
        <div className='col-span-8 min-h-0'>
          <MediaCarousel
            items={mediaItems}
            autoPlay
            className='h-full rounded-xl'
          />
        </div>

        {/* Coluna Direita: Senha Atual + Histórico */}
        <div className='col-span-4 flex flex-col gap-2 min-h-0 overflow-hidden'>

          {/* Senha Atual - Atendendo Agora */}
          <Card className={`p-4 bg-card shadow-lg transition-all duration-500 ${!currentTicket && recentTickets.length > 0 ? 'opacity-90' : ''}`}>
            {(() => {
              const displayTicket = currentTicket || (recentTickets.length > 0 ? recentTickets[0] : null);
              const isHistoryFallback = !currentTicket && recentTickets.length > 0;

              return (
                <>
                  <h2 className='text-lg font-bold text-primary mb-3 text-center'>
                    {isHistoryFallback ? 'Última Senha Chamada' : 'Atendendo Agora'}
                  </h2>

                  {loadingCurrent || (loadingRecent && !displayTicket) ? (
                    <div className='animate-pulse flex justify-center'>
                      <div className='h-16 w-32 bg-muted rounded-xl' />
                    </div>
                  ) : displayTicket ? (
                    <div className='flex flex-col items-center gap-3'>
                      <TicketNumber
                        number={displayTicket.id_senha}
                        size='2xl'
                        animate={displayTicket.status === 'chamado'}
                        className={displayTicket.status !== 'chamado' ? 'text-atendimento' : ''}
                      />

                      <TicketBadge tipo={displayTicket.tipo} size='md' />

                      {displayTicket.atendente && (
                        <div className='text-2xl sm:text-4xl font-bold text-primary bg-primary/10 rounded-2xl px-6 py-3 mt-2 shadow-sm border border-primary/20'>
                          {displayTicket.atendente}
                        </div>
                      )}

                      <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                        <ChevronRight className='w-4 h-4' />
                        <span>
                          {displayTicket.status === 'chamado'
                            ? 'Dirija-se ao atendimento'
                            : displayTicket.status === 'em_atendimento'
                              ? 'Em atendimento'
                              : 'Atendimento finalizado'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className='text-center text-muted-foreground py-6'>
                      <Monitor className='w-12 h-12 mx-auto mb-3 opacity-30' />
                      <p className='text-base'>Aguardando chamada</p>
                    </div>
                  )}
                </>
              );
            })()}
          </Card>

          {/* Histórico de Senhas Chamadas */}
          <Card className='flex-1 p-3 bg-card overflow-hidden flex flex-col min-h-0'>
            <h2 className='shrink-0 text-base font-bold text-foreground mb-2 flex items-center gap-2'>
              <History className='w-4 h-4 text-primary' />
              Últimas Chamadas
            </h2>

            <div className='flex-1 overflow-y-auto'>
              {loadingRecent ? (
                <div className='space-y-2'>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className='animate-pulse'>
                      <div className='h-12 bg-muted rounded-lg' />
                    </div>
                  ))}
                </div>
              ) : recentTickets.length > 0 ? (
                <div className='space-y-2'>
                  {recentTickets.map((ticket, index) => (
                    <div
                      key={ticket.id}
                      className='flex items-center justify-between p-2 rounded-lg bg-muted/50 animate-fade-in'
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className='flex items-center gap-2 shrink-0'>
                        <span className='text-lg sm:text-xl font-mono font-bold text-foreground'>
                          {ticket.id_senha}
                        </span>
                      </div>
                      <TicketBadge tipo={ticket.tipo} size='sm' />
                      <span className='text-base sm:text-lg font-bold text-primary truncate flex-1 text-right'>
                        {ticket.atendente || '-'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='flex-1 flex items-center justify-center text-muted-foreground py-8'>
                  <p className='text-sm'>Nenhuma senha chamada ainda</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
