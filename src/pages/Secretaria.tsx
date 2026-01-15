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
import { TicketNumber } from '@/components/TicketNumber';
import { TicketBadge, StatusBadge } from '@/components/TicketBadge';
import { SecretariaAuth } from '@/components/SecretariaAuth';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface SecretariaPanelProps {
  unidade: string;
}

function SecretariaPanel({ unidade }: SecretariaPanelProps) {
  const [atendente, setAtendente] = useState('');
  const [configMode, setConfigMode] = useState(true);

  // Hooks usando a unidade recebida via props e filtrando pelo atendente logado
  const { data: currentTicket, isLoading: loadingCurrent } = useCurrentTicket(unidade, atendente);

  // waitingTickets: limit=undefined, unidade=unidade
  const { data: waitingTickets = [], isLoading: loadingWaiting } = useWaitingTickets(undefined, unidade);

  const callNextTicket = useCallNextTicket(unidade);
  const updateStatus = useUpdateTicketStatus();

  // Enable realtime updates
  useRealtimeQueue();

  const handleSaveConfig = () => {
    if (atendente.trim()) {
      localStorage.setItem('atendente_nome', atendente.trim());
      setConfigMode(false);
    } else {
      toast.error('Por favor, identifique seu guichê ou nome');
    }
  };

  const handleChangeConfig = () => {
    setConfigMode(true);
  };

  const handleCallNext = async () => {
    if (!atendente) {
      toast.error('Identifique-se antes de chamar');
      setConfigMode(true);
      return;
    }

    try {
      // Passamos o atendente para vincular a senha a este guichê
      const result = await callNextTicket.mutateAsync(atendente);
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

  // Tela de Identificação do Guichê/Atendente (após login)
  if (configMode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 shadow-lg">
          <div className="text-center mb-8">
            <Users className="w-16 h-16 mx-auto text-primary mb-4" />
            <h1 className="text-2xl font-bold text-foreground">Guichê / Atendente</h1>
            <p className="text-muted-foreground mt-2">
              Você já está logado(a). Agora informe como seu guichê aparecerá no atendimento.
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Atendente ou Guichê</label>
              <Input
                placeholder="Ex: Guichê 01, Maria, Dr. Silva..."
                value={atendente}
                onChange={(e) => setAtendente(e.target.value)}
                className="text-lg h-12"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSaveConfig()}
              />
            </div>

            <Button
              onClick={handleSaveConfig}
              className="w-full h-12 text-lg"
              disabled={!atendente.trim()}
            >
              Começar a Atender
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-8 mt-12">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Painel da Secretaria</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground">Unidade: {unidade}</p>
            <span className="text-muted-foreground">•</span>
            <div className="flex items-center gap-2 bg-secondary px-3 py-1 rounded-full">
              <span className="font-medium text-primary">{atendente}</span>
              <button
                onClick={handleChangeConfig}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                (Alterar)
              </button>
            </div>
          </div>
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
              disabled={callNextTicket.isPending || waitingTickets.length === 0 || (currentTicket !== null && currentTicket !== undefined)}
              className="w-full h-24 text-2xl font-bold bg-primary hover:bg-primary/90 disabled:opacity-50"
            >
              {callNextTicket.isPending ? (
                <Loader2 className="w-8 h-8 mr-3 animate-spin" />
              ) : (currentTicket) ? (
                <span className="flex items-center">
                  <AlertCircle className="w-8 h-8 mr-3" />
                  FINALIZE O ATENDIMENTO ATUAL
                </span>
              ) : (
                <span className="flex items-center">
                  <Phone className="w-8 h-8 mr-3" />
                  CHAMAR PRÓXIMA SENHA
                </span>
              )}
            </Button>
            {waitingTickets.length === 0 && (
              <p className="text-center text-muted-foreground mt-4">
                Nenhuma senha aguardando
              </p>
            )}
            {currentTicket && (
              <p className="text-center text-orange-500 font-medium mt-4">
                Você já tem uma senha em atendimento. Finalize-a para chamar a próxima.
              </p>
            )}
          </Card>

          {/* Current Ticket */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Senha em Atendimento ({atendente})
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

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {currentTicket.status === 'chamado' && (
                    <>
                      <Button
                        onClick={handleStartService}
                        disabled={updateStatus.isPending}
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
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
                <p>Nenhuma senha sendo atendida por você</p>
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
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors ${index === 0 ? 'bg-primary/10 border-2 border-primary/30' : 'bg-secondary/50'
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

export default function Secretaria() {
  return (
    <SecretariaAuth>
      {(unidade) => <SecretariaPanel unidade={unidade} />}
    </SecretariaAuth>
  );
}
