import { useState } from 'react';
import { 
  Phone, 
  Play, 
  CheckCircle, 
  XCircle, 
  Users, 
  Clock,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  useCurrentTicket, 
  useWaitingTickets, 
  useCallNextTicket,
  useUpdateTicketStatus 
} from '@/hooks/useQueue';
import { useRealtimeQueue } from '@/hooks/useRealtimeQueue';
import { UNIDADE } from '@/lib/config';
import { TicketNumber } from '@/components/TicketNumber';
import { TicketBadge, StatusBadge } from '@/components/TicketBadge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export default function Secretaria() {
  const [atendente, setAtendente] = useState('');
  const { data: currentTicket, isLoading: loadingCurrent } = useCurrentTicket();
  const { data: waitingTickets = [], isLoading: loadingWaiting } = useWaitingTickets();
  
  const callNextTicket = useCallNextTicket();
  const updateStatus = useUpdateTicketStatus();
  
  // Enable realtime updates
  useRealtimeQueue();

  const handleCallNext = async () => {
    try {
      const result = await callNextTicket.mutateAsync();
      if (result) {
        toast.success(`Chamando senha ${result.id_senha}`);
      } else {
        toast.info('Nenhuma senha na fila');
      }
    } catch (error) {
      console.error('Error calling next ticket:', error);
      toast.error('Erro ao chamar próxima senha');
    }
  };

  const handleStartService = async () => {
    if (!currentTicket) return;
    
    if (!atendente.trim()) {
      toast.error('Digite o nome do atendente');
      return;
    }
    
    try {
      await updateStatus.mutateAsync({
        id: currentTicket.id,
        status: 'em_atendimento',
        atendente: atendente.trim(),
      });
      toast.success('Atendimento iniciado');
    } catch (error) {
      console.error('Error starting service:', error);
      toast.error('Erro ao iniciar atendimento');
    }
  };

  const handleFinish = async () => {
    if (!currentTicket) return;
    
    try {
      await updateStatus.mutateAsync({
        id: currentTicket.id,
        status: 'finalizado',
      });
      toast.success('Atendimento finalizado');
    } catch (error) {
      console.error('Error finishing service:', error);
      toast.error('Erro ao finalizar atendimento');
    }
  };

  const handleNoShow = async () => {
    if (!currentTicket) return;
    
    try {
      await updateStatus.mutateAsync({
        id: currentTicket.id,
        status: 'nao_compareceu',
      });
      toast.warning('Senha marcada como não compareceu');
    } catch (error) {
      console.error('Error marking no show:', error);
      toast.error('Erro ao marcar não compareceu');
    }
  };

  const preferencialCount = waitingTickets.filter(t => t.tipo === 'Preferencial').length;
  const normalCount = waitingTickets.filter(t => t.tipo === 'Normal').length;

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Painel da Secretaria</h1>
          <p className="text-muted-foreground">Unidade: {UNIDADE}</p>
        </div>
        <Link to="/historico">
          <Button variant="outline">
            <Clock className="w-4 h-4 mr-2" />
            Histórico
          </Button>
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Control Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Call Next Button */}
          <Card className="p-6">
            <Button
              onClick={handleCallNext}
              disabled={callNextTicket.isPending || waitingTickets.length === 0}
              className="w-full h-24 text-2xl font-bold bg-primary hover:bg-primary/90"
            >
              {callNextTicket.isPending ? (
                <Loader2 className="w-8 h-8 mr-3 animate-spin" />
              ) : (
                <Phone className="w-8 h-8 mr-3" />
              )}
              CHAMAR PRÓXIMA SENHA
            </Button>
            {waitingTickets.length === 0 && (
              <p className="text-center text-muted-foreground mt-4">
                Nenhuma senha aguardando
              </p>
            )}
          </Card>

          {/* Current Ticket */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Senha Atual
            </h2>
            
            {loadingCurrent ? (
              <div className="animate-pulse h-32 bg-muted rounded-xl" />
            ) : currentTicket ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <TicketNumber number={currentTicket.id_senha} size="xl" className="text-foreground" />
                    <div className="space-y-2">
                      <TicketBadge tipo={currentTicket.tipo} size="lg" />
                      <StatusBadge status={currentTicket.status} size="lg" />
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Emissão: {format(new Date(currentTicket.hora_emissao), 'HH:mm')}</p>
                    {currentTicket.hora_chamada && (
                      <p>Chamada: {format(new Date(currentTicket.hora_chamada), 'HH:mm')}</p>
                    )}
                  </div>
                </div>

                {/* Attendant Input */}
                {currentTicket.status === 'chamado' && (
                  <div className="space-y-4">
                    <Input
                      placeholder="Nome do atendente"
                      value={atendente}
                      onChange={(e) => setAtendente(e.target.value)}
                      className="text-lg h-12"
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {currentTicket.status === 'chamado' && (
                    <>
                      <Button
                        onClick={handleStartService}
                        disabled={updateStatus.isPending || !atendente.trim()}
                        className="h-14 bg-atendimento hover:bg-atendimento/90 text-atendimento-foreground"
                      >
                        {updateStatus.isPending ? (
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                          <Play className="w-5 h-5 mr-2" />
                        )}
                        Iniciar Atendimento
                      </Button>
                      <Button
                        onClick={handleNoShow}
                        disabled={updateStatus.isPending}
                        variant="outline"
                        className="h-14 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <XCircle className="w-5 h-5 mr-2" />
                        Não Compareceu
                      </Button>
                    </>
                  )}
                  
                  {currentTicket.status === 'em_atendimento' && (
                    <Button
                      onClick={handleFinish}
                      disabled={updateStatus.isPending}
                      className="h-14 col-span-full bg-preferencial hover:bg-preferencial/90"
                    >
                      {updateStatus.isPending ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-5 h-5 mr-2" />
                      )}
                      Finalizar Atendimento
                    </Button>
                  )}
                </div>

                {currentTicket.atendente && (
                  <p className="text-sm text-muted-foreground">
                    Atendente: {currentTicket.atendente}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
                <p>Nenhuma senha sendo atendida</p>
                <p className="text-sm">Clique em "Chamar Próxima Senha" para iniciar</p>
              </div>
            )}
          </Card>
        </div>

        {/* Waiting List */}
        <div className="lg:col-span-1">
          <Card className="p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Fila de Espera
              </h2>
              <span className="text-sm text-muted-foreground">
                {waitingTickets.length} aguardando
              </span>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-preferencial/10">
                <p className="text-2xl font-bold text-preferencial">{preferencialCount}</p>
                <p className="text-xs text-preferencial">Preferenciais</p>
              </div>
              <div className="p-3 rounded-lg bg-normal/10">
                <p className="text-2xl font-bold text-normal">{normalCount}</p>
                <p className="text-xs text-normal">Normais</p>
              </div>
            </div>
            
            {loadingWaiting ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse h-14 bg-muted rounded-lg" />
                ))}
              </div>
            ) : waitingTickets.length > 0 ? (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {waitingTickets.map((ticket, index) => (
                  <div
                    key={ticket.id}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                      index === 0 ? 'bg-primary/10 border-2 border-primary/30' : 'bg-secondary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-lg text-foreground">
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
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mb-4 opacity-30" />
                <p>Fila vazia</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
