import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Monitor, Clock, ChevronRight, Volume2, VolumeX, Maximize, Minimize, History, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCurrentTicket, useRecentlyCalledTickets } from '@/hooks/useQueue';
import { useRealtimeQueue } from '@/hooks/useRealtimeQueue';
import { usePanelMedia } from '@/hooks/usePanelMedia';
import { useAlertSound } from '@/hooks/useAlertSound';

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
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lastCalledTicketRef = useRef<{ id: string, hora_chamada: string | null } | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const { data: currentTicket, isLoading: loadingCurrent } = useCurrentTicket();
  const { data: recentTickets = [], isLoading: loadingRecent } = useRecentlyCalledTickets(6);
  const { data: dbMediaItems = [] } = usePanelMedia();
  const { playAlertSound, initAudioContext } = useAlertSound();

  // Enable realtime updates
  useRealtimeQueue();

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
  const handleEnableSound = useCallback(() => {
    initAudioContext();
    setHasUserInteracted(true);
    // Play a test sound to confirm it works
    playAlertSound();
  }, [initAudioContext, playAlertSound]);

  // Toggle fullscreen mode
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.log('Fullscreen não disponível:', err);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
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

    // Update the ref whenever we see a newer call event (even if sound is disabled),
    // so we don't play sound later for an old call.
    if (isNewCallEvent) {
      lastCalledTicketRef.current = { id: currentTicket.id, hora_chamada: callTime };
    }

    if (isNewCallEvent && soundEnabled && hasUserInteracted) {
      console.log('Chamada/rechamada detectada (hora_chamada avançou), tocando som...');
      playAlertSound();
    }
  }, [currentTicket, soundEnabled, hasUserInteracted, playAlertSound]);

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
            src='/biocenter-logo.jpg'
            alt='Laboratório Biocenter'
            className='h-14 w-auto rounded-lg shadow-lg'
          />
          <div className='text-white text-center'>
            <span className='text-2xl font-bold block tracking-wide'>Laboratório Biocenter</span>
            <span className='text-sm opacity-90 block'>Sempre ao seu lado</span>
          </div>
        </div>

        {/* Coluna Direita: Controles, Clima e Relógio */}
        <div className='flex items-center gap-3 sm:gap-5 min-w-[300px] justify-end'>
          {/* Sound Toggle */}
          {!hasUserInteracted ? (
            <Button
              onClick={handleEnableSound}
              variant='secondary'
              size='sm'
              className='flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white border-0 text-xs sm:text-sm'
            >
              <Volume2 className='w-3 h-3 sm:w-4 sm:h-4' />
              <span className='hidden xs:inline'>Ativar Som</span>
              <span className='xs:hidden'>Som</span>
            </Button>
          ) : (
            <Button
              onClick={() => setSoundEnabled(!soundEnabled)}
              variant='ghost'
              size='icon'
              className='text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10'
              title={soundEnabled ? 'Desativar som' : 'Ativar som'}
            >
              {soundEnabled ? (
                <Volume2 className='w-4 h-4 sm:w-5 sm:h-5' />
              ) : (
                <VolumeX className='w-4 h-4 sm:w-5 sm:h-5 opacity-50' />
              )}
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
          <Card className='p-4 bg-card shadow-lg'>
            <h2 className='text-lg font-bold text-primary mb-3 text-center'>
              Atendendo Agora
            </h2>

            {loadingCurrent ? (
              <div className='animate-pulse flex justify-center'>
                <div className='h-16 w-32 bg-muted rounded-xl' />
              </div>
            ) : currentTicket ? (
              <div className='flex flex-col items-center gap-3'>
                <TicketNumber
                  number={currentTicket.id_senha}
                  size='2xl'
                  animate={currentTicket.status === 'chamado'}
                  className={currentTicket.status !== 'chamado' ? 'text-atendimento' : ''}
                />

                <TicketBadge tipo={currentTicket.tipo} size='md' />

                {currentTicket.atendente && (
                  <div className='text-sm sm:text-base font-medium text-foreground bg-secondary/50 rounded-full px-4 py-1.5'>
                    {currentTicket.atendente}
                  </div>
                )}

                <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                  <ChevronRight className='w-4 h-4' />
                  <span>
                    {currentTicket.status === 'chamado'
                      ? 'Dirija-se ao atendimento'
                      : 'Em atendimento'}
                  </span>
                </div>
              </div>
            ) : (
              <div className='text-center text-muted-foreground py-6'>
                <Monitor className='w-12 h-12 mx-auto mb-3 opacity-30' />
                <p className='text-base'>Aguardando chamada</p>
              </div>
            )}
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
                      <span className='text-sm sm:text-base font-medium text-foreground truncate flex-1 text-right'>
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
