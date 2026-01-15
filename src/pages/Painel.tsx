import { useEffect, useState, useRef, useCallback } from 'react';
import { Monitor, Clock, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCurrentTicket, useWaitingTickets } from '@/hooks/useQueue';
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
  const lastTicketIdRef = useRef<string | null>(null);
  
  const { data: currentTicket, isLoading: loadingCurrent } = useCurrentTicket();
  const { data: waitingTickets = [], isLoading: loadingWaiting } = useWaitingTickets(3);
  const { data: dbMediaItems = [] } = usePanelMedia();
  const { playAlertSound, initAudioContext } = useAlertSound();

  // Enable realtime updates
  useRealtimeQueue();

  // Handle user interaction to enable audio
  const handleEnableSound = useCallback(() => {
    initAudioContext();
    setHasUserInteracted(true);
    // Play a test sound to confirm it works
    playAlertSound();
  }, [initAudioContext, playAlertSound]);

  // Play alert sound when a new ticket is called
  useEffect(() => {
    if (!currentTicket) {
      lastTicketIdRef.current = null;
      return;
    }

    // Check if this is a new ticket being called
    const isNewTicket = currentTicket.id !== lastTicketIdRef.current;
    const isBeingCalled = currentTicket.status === 'chamado';

    if (isNewTicket && isBeingCalled && soundEnabled && hasUserInteracted) {
      playAlertSound();
    }

    lastTicketIdRef.current = currentTicket.id;
  }, [currentTicket, soundEnabled, hasUserInteracted, playAlertSound]);

  // Convert database media items to MediaItem format
  const mediaItems: MediaItem[] = dbMediaItems.length > 0
    ? dbMediaItems
      .filter(item => item.active)
      .map(item => ({
        type: item.type === 'external' ? 'image' : item.type as 'image' | 'video',
        src: item.src,
        alt: item.alt || '',
        duration: item.duration,
      }))
    : defaultPanelMediaItems;

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background flex flex-col">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-primary to-primary/80 border-b border-primary/20 gap-3 sm:gap-0">
        {/* Logo */}
        <div className="flex items-center gap-3 sm:gap-4">
          <img
            src="/biocenter-logo.jpg"
            alt="Laboratório Biocenter"
            className="h-10 sm:h-16 w-auto rounded-lg shadow-lg"
          />
          <div className="text-white">
            <span className="text-lg sm:text-2xl font-bold block">Laboratório Biocenter</span>
            <span className="text-xs sm:text-sm opacity-90 hidden sm:block">Sempre ao seu lado</span>
          </div>
        </div>

        {/* Som, Clima e Relógio */}
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Sound Toggle */}
          {!hasUserInteracted ? (
            <Button
              onClick={handleEnableSound}
              variant="secondary"
              size="sm"
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white border-0 text-xs sm:text-sm"
            >
              <Volume2 className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Ativar Som</span>
              <span className="xs:hidden">Som</span>
            </Button>
          ) : (
            <Button
              onClick={() => setSoundEnabled(!soundEnabled)}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
              title={soundEnabled ? 'Desativar som' : 'Ativar som'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 opacity-50" />
              )}
            </Button>
          )}

          <div className="hidden sm:block">
            <WeatherWidget />
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 text-white">
            <Clock className="w-4 h-4 sm:w-6 sm:h-6 opacity-90" />
            <div className="text-right">
              <div className="text-lg sm:text-3xl font-bold font-mono tracking-tight">
                {format(currentTime, 'HH:mm:ss')}
              </div>
              <div className="text-xs sm:text-sm opacity-80 -mt-1 hidden sm:block">
                {format(currentTime, "dd 'de' MMMM", { locale: ptBR })}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-6">
        {/* Current Ticket - First on mobile */}
        <div className="order-1 lg:order-2 lg:col-span-4 xl:col-span-3">
          <Card className="h-full flex flex-col items-center justify-center p-4 sm:p-8 bg-card min-h-[200px] sm:min-h-0">
            {loadingCurrent ? (
              <div className="animate-pulse">
                <div className="h-16 sm:h-24 w-32 sm:w-48 bg-muted rounded-2xl" />
              </div>
            ) : currentTicket ? (
              <div className="text-center animate-slide-up w-full px-2 sm:px-4">
                <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-3 sm:mb-6">Senha Atual</p>
                <TicketNumber
                  number={currentTicket.id_senha}
                  size="2xl"
                  animate={currentTicket.status === 'chamado'}
                  className={currentTicket.status !== 'chamado' ? 'text-atendimento' : ''}
                />
                <div className="mt-3 sm:mt-4 flex items-center justify-center gap-2 sm:gap-3">
                  <TicketBadge tipo={currentTicket.tipo} size="md" />
                </div>
                <div className="mt-4 sm:mt-6 text-sm sm:text-lg font-medium text-chamado flex items-center justify-center gap-2">
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span>
                    {currentTicket.status === 'chamado'
                      ? 'Dirija-se ao atendimento'
                      : 'Em atendimento'}
                  </span>
                </div>
                {currentTicket.atendente && (
                  <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-muted-foreground">
                    Atendente: {currentTicket.atendente}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <Monitor className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 opacity-30" />
                <p className="text-lg sm:text-xl">Aguardando chamada</p>
              </div>
            )}
          </Card>
        </div>

        {/* Next Tickets - Second on mobile */}
        <div className="order-2 lg:order-3 lg:col-span-3">
          <Card className="h-full p-4 sm:p-5 bg-card">
            <h2 className="text-base sm:text-lg font-bold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Próximas Senhas
            </h2>

            {loadingWaiting ? (
              <div className="space-y-2 sm:space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-12 sm:h-16 bg-muted rounded-xl" />
                  </div>
                ))}
              </div>
            ) : waitingTickets.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {waitingTickets.map((ticket, index) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-2 sm:p-3 rounded-xl bg-secondary/50 animate-slide-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-lg sm:text-xl font-mono font-bold text-foreground">
                        {ticket.id_senha}
                      </span>
                      <TicketBadge tipo={ticket.tipo} size="sm" />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(ticket.hora_emissao), 'HH:mm')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground py-6 sm:py-8">
                <p className="text-sm">Nenhuma senha na fila</p>
              </div>
            )}
          </Card>
        </div>

        {/* Media Carousel - Last on mobile, first on desktop */}
        <div className="order-3 lg:order-1 lg:col-span-5 xl:col-span-6">
          <MediaCarousel
            items={mediaItems}
            autoPlay
            className="h-[50vh] sm:h-[60vh] lg:h-full lg:min-h-0"
          />
        </div>
      </div>
    </div>
  );
}
