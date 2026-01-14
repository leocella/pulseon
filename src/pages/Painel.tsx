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
      <header className="flex items-center justify-between px-8 py-4 bg-gradient-to-r from-primary to-primary/80 border-b border-primary/20">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <img
            src="/biocenter-logo.jpg"
            alt="Laboratório Biocenter"
            className="h-16 w-auto rounded-lg shadow-lg"
          />
          <div className="text-white">
            <span className="text-2xl font-bold block">Laboratório Biocenter</span>
            <span className="text-sm opacity-90">Sempre ao seu lado</span>
          </div>
        </div>

        {/* Som, Clima e Relógio */}
        <div className="flex items-center gap-6">
          {/* Sound Toggle */}
          {!hasUserInteracted ? (
            <Button
              onClick={handleEnableSound}
              variant="secondary"
              size="sm"
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white border-0"
            >
              <Volume2 className="w-4 h-4" />
              <span className="text-sm">Ativar Som</span>
            </Button>
          ) : (
            <Button
              onClick={() => setSoundEnabled(!soundEnabled)}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              title={soundEnabled ? 'Desativar som' : 'Ativar som'}
            >
              {soundEnabled ? (
                <Volume2 className="w-5 h-5" />
              ) : (
                <VolumeX className="w-5 h-5 opacity-50" />
              )}
            </Button>
          )}

          <WeatherWidget />
          <div className="flex items-center gap-3 text-white">
            <Clock className="w-6 h-6 opacity-90" />
            <div className="text-right">
              <div className="text-3xl font-bold font-mono tracking-tight">
                {format(currentTime, 'HH:mm:ss')}
              </div>
              <div className="text-sm opacity-80 -mt-1">
                {format(currentTime, "dd 'de' MMMM", { locale: ptBR })}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Media Carousel - Left side */}
        <div className="lg:col-span-5 xl:col-span-6">
          <MediaCarousel
            items={mediaItems}
            autoPlay
            className="h-full min-h-[300px] lg:min-h-0"
          />
        </div>

        {/* Current Ticket - Center */}
        <div className="lg:col-span-4 xl:col-span-3">
          <Card className="h-full flex flex-col items-center justify-center p-8 bg-card">
            {loadingCurrent ? (
              <div className="animate-pulse">
                <div className="h-24 w-48 bg-muted rounded-2xl" />
              </div>
            ) : currentTicket ? (
              <div className="text-center animate-slide-up w-full px-4">
                <p className="text-lg md:text-xl text-muted-foreground mb-6">Senha Atual</p>
                <TicketNumber
                  number={currentTicket.id_senha}
                  size="2xl"
                  animate={currentTicket.status === 'chamado'}
                  className={currentTicket.status !== 'chamado' ? 'text-atendimento' : ''}
                />
                <div className="mt-4 flex items-center justify-center gap-3">
                  <TicketBadge tipo={currentTicket.tipo} size="md" />
                </div>
                <div className="mt-6 text-lg font-medium text-chamado flex items-center justify-center gap-2">
                  <ChevronRight className="w-6 h-6" />
                  <span>
                    {currentTicket.status === 'chamado'
                      ? 'Dirija-se ao atendimento'
                      : 'Em atendimento'}
                  </span>
                </div>
                {currentTicket.atendente && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Atendente: {currentTicket.atendente}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <Monitor className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-xl">Aguardando chamada</p>
              </div>
            )}
          </Card>
        </div>

        {/* Next Tickets - Right side */}
        <div className="lg:col-span-3">
          <Card className="h-full p-5 bg-card">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Próximas Senhas
            </h2>

            {loadingWaiting ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-muted rounded-xl" />
                  </div>
                ))}
              </div>
            ) : waitingTickets.length > 0 ? (
              <div className="space-y-3">
                {waitingTickets.map((ticket, index) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 animate-slide-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-mono font-bold text-foreground">
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
              <div className="flex-1 flex items-center justify-center text-muted-foreground py-8">
                <p className="text-sm">Nenhuma senha na fila</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
