import { useEffect, useState } from 'react';
import { Monitor, Clock, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useCurrentTicket, useWaitingTickets } from '@/hooks/useQueue';
import { useRealtimeQueue } from '@/hooks/useRealtimeQueue';
import { UNIDADE } from '@/lib/config';
import { TicketNumber } from '@/components/TicketNumber';
import { TicketBadge } from '@/components/TicketBadge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Painel() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { data: currentTicket, isLoading: loadingCurrent } = useCurrentTicket();
  const { data: waitingTickets = [], isLoading: loadingWaiting } = useWaitingTickets(3);
  
  // Enable realtime updates
  useRealtimeQueue();

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
      <header className="flex items-center justify-between px-8 py-4 bg-card border-b">
        <div className="flex items-center gap-3">
          <Monitor className="w-8 h-8 text-primary" />
          <span className="text-xl font-bold text-foreground">Painel de Chamadas</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-muted-foreground">{UNIDADE}</span>
          <div className="flex items-center gap-2 text-lg font-mono">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <span className="text-foreground">
              {format(currentTime, 'HH:mm:ss')}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Current Ticket - Takes 2 columns */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col items-center justify-center p-12 bg-card">
            {loadingCurrent ? (
              <div className="animate-pulse">
                <div className="h-32 w-64 bg-muted rounded-2xl" />
              </div>
            ) : currentTicket ? (
              <div className="text-center animate-slide-up">
                <p className="text-2xl text-muted-foreground mb-4">Senha Atual</p>
                <TicketNumber 
                  number={currentTicket.id_senha} 
                  size="3xl"
                  animate={currentTicket.status === 'chamado'}
                  className={currentTicket.status !== 'chamado' ? 'text-atendimento' : ''}
                />
                <div className="mt-6 flex items-center justify-center gap-4">
                  <TicketBadge tipo={currentTicket.tipo} size="lg" />
                </div>
                <div className="mt-8 text-2xl font-medium text-chamado flex items-center justify-center gap-3">
                  <ChevronRight className="w-8 h-8" />
                  <span>
                    {currentTicket.status === 'chamado' 
                      ? 'Dirija-se ao atendimento' 
                      : 'Em atendimento'}
                  </span>
                </div>
                {currentTicket.atendente && (
                  <p className="mt-4 text-lg text-muted-foreground">
                    Atendente: {currentTicket.atendente}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <Monitor className="w-24 h-24 mx-auto mb-6 opacity-30" />
                <p className="text-2xl">Aguardando chamada</p>
              </div>
            )}
          </Card>
        </div>

        {/* Next Tickets */}
        <div className="lg:col-span-1">
          <Card className="h-full p-6 bg-card">
            <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Próximas Senhas
            </h2>
            
            {loadingWaiting ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-20 bg-muted rounded-xl" />
                  </div>
                ))}
              </div>
            ) : waitingTickets.length > 0 ? (
              <div className="space-y-4">
                {waitingTickets.map((ticket, index) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 animate-slide-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-mono font-bold text-foreground">
                        {ticket.id_senha}
                      </span>
                      <TicketBadge tipo={ticket.tipo} size="sm" />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(ticket.hora_emissao), 'HH:mm')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground py-12">
                <p>Nenhuma senha na fila</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-8 py-4 bg-card border-t text-center text-sm text-muted-foreground">
        {format(currentTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
      </footer>
    </div>
  );
}
