import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Phone,
  PhoneCall,
  Play,
  CheckCircle,
  XCircle,
  Users,
  Clock,
  Loader2,
  AlertCircle,
  RefreshCw,
  SkipForward,
  Search,
  Filter,
  ArrowUpDown,
  ChevronRight,
  Settings,
  Volume2,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useWaitingTickets } from '@/hooks/useQueue';
import {
  useCallTicketSafe,
  useRecallTicket,
  useSkipTicket,
  useStartServiceTicket,
  useFinishTicket,
  useCancelTicket,
} from '@/hooks/useManualQueue';
import { useRealtimeQueue } from '@/hooks/useRealtimeQueue';
import { TicketNumber } from '@/components/TicketNumber';
import { TicketBadge, StatusBadge } from '@/components/TicketBadge';
import { SecretariaAuth } from '@/components/SecretariaAuth';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Types
interface Ticket {
  id: string;
  id_senha: string;
  tipo: string;
  status: string;
  hora_emissao: string;
  hora_chamada?: string;
  hora_fim?: string;
  atendente?: string;
  unidade: string;
  observacao?: string;
}

type SortField = 'priority' | 'time' | 'number';
type SortOrder = 'asc' | 'desc';

interface SecretariaPanelProps {
  unidade: string;
}

// Helper: Calcular tempo de espera
function getWaitingTime(horaEmissao: string): string {
  try {
    return formatDistanceToNow(new Date(horaEmissao), {
      locale: ptBR,
      addSuffix: false
    });
  } catch {
    return '-';
  }
}

// Helper: Prioridade numérica do tipo
function getTypePriority(tipo: string): number {
  switch (tipo) {
    case 'Preferencial': return 1;
    case 'Convênio': return 2;
    case 'Particular': return 3;
    case 'Retirada de Laudo': return 4;
    case 'Normal': return 5;
    default: return 6;
  }
}

// Status display config
const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  aguardando: { label: 'Aguardando', color: 'bg-yellow-500', icon: Clock },
  chamado: { label: 'Chamando', color: 'bg-orange-500', icon: PhoneCall },
  em_atendimento: { label: 'Em Atendimento', color: 'bg-blue-500', icon: Users },
  finalizado: { label: 'Finalizado', color: 'bg-green-500', icon: CheckCircle },
  cancelado: { label: 'Cancelado', color: 'bg-red-500', icon: XCircle },
  nao_compareceu: { label: 'Não Compareceu', color: 'bg-gray-500', icon: XCircle },
};

function SecretariaPanel({ unidade }: SecretariaPanelProps) {
  // State
  const [atendente, setAtendente] = useState('');
  const [guiche, setGuiche] = useState('');
  const [configMode, setConfigMode] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Selection & UI state
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('priority');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [confirmBeforeCall, setConfirmBeforeCall] = useState(false);

  // Dialog states
  const [skipDialogOpen, setSkipDialogOpen] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [confirmCallDialogOpen, setConfirmCallDialogOpen] = useState(false);
  const [pendingCallTicket, setPendingCallTicket] = useState<Ticket | null>(null);

  // Query client for manual invalidation
  const queryClient = useQueryClient();

  // Restore config from localStorage
  useEffect(() => {
    const savedAtendente = localStorage.getItem('atendente_nome');
    const savedGuiche = localStorage.getItem('atendente_guiche');
    if (savedAtendente) {
      setAtendente(savedAtendente);
      setGuiche(savedGuiche || '');
      setConfigMode(false);
    }
    setIsInitialized(true);
  }, []);

  // Enable realtime
  useRealtimeQueue(unidade);

  // Fetch all tickets (waiting + current being attended)
  const { data: waitingTickets = [], isLoading: loadingWaiting } = useWaitingTickets(
    undefined,
    isInitialized ? unidade : undefined
  );

  // Fetch current ticket being attended by this attendant
  const { data: myCurrentTicket } = useQuery({
    queryKey: ['myCurrentTicket', unidade, atendente],
    queryFn: async () => {
      if (!atendente) return null;

      const { data, error } = await supabase
        .from('fila_atendimento')
        .select('*')
        .eq('unidade', unidade)
        .eq('atendente', atendente)
        .in('status', ['chamado', 'em_atendimento'])
        .order('hora_chamada', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as Ticket | null;
    },
    enabled: isInitialized && !configMode && !!atendente,
    refetchInterval: 5000,
  });

  // Mutations
  const callTicket = useCallTicketSafe(unidade);
  const recallTicket = useRecallTicket(unidade);
  const skipTicket = useSkipTicket(unidade);
  const startService = useStartServiceTicket(unidade);
  const finishTicket = useFinishTicket(unidade);
  const cancelTicket = useCancelTicket(unidade);

  // Filter and sort tickets
  const filteredTickets = useMemo(() => {
    let tickets = [...waitingTickets];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      tickets = tickets.filter(t =>
        t.id_senha.toLowerCase().includes(query) ||
        t.tipo.toLowerCase().includes(query)
      );
    }

    // Filter by type
    if (filterType !== 'all') {
      tickets = tickets.filter(t => t.tipo === filterType);
    }

    // Sort
    tickets.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'priority':
          comparison = getTypePriority(a.tipo) - getTypePriority(b.tipo);
          if (comparison === 0) {
            comparison = new Date(a.hora_emissao).getTime() - new Date(b.hora_emissao).getTime();
          }
          break;
        case 'time':
          comparison = new Date(a.hora_emissao).getTime() - new Date(b.hora_emissao).getTime();
          break;
        case 'number':
          comparison = a.id_senha.localeCompare(b.id_senha, undefined, { numeric: true });
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return tickets;
  }, [waitingTickets, searchQuery, filterType, sortField, sortOrder]);

  // Get selected ticket
  const selectedTicket = useMemo(() => {
    return filteredTickets.find(t => t.id === selectedTicketId) || null;
  }, [filteredTickets, selectedTicketId]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (configMode) return;

      // Enter to call selected
      if (e.key === 'Enter' && selectedTicket && !myCurrentTicket) {
        e.preventDefault();
        handleCallTicket(selectedTicket);
      }

      // Arrow navigation
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIndex = filteredTickets.findIndex(t => t.id === selectedTicketId);
        let newIndex = currentIndex;

        if (e.key === 'ArrowDown') {
          newIndex = Math.min(currentIndex + 1, filteredTickets.length - 1);
        } else {
          newIndex = Math.max(currentIndex - 1, 0);
        }

        if (filteredTickets[newIndex]) {
          setSelectedTicketId(filteredTickets[newIndex].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTicket, filteredTickets, selectedTicketId, myCurrentTicket, configMode]);

  // Handlers
  const handleSaveConfig = () => {
    if (atendente.trim()) {
      localStorage.setItem('atendente_nome', atendente.trim());
      localStorage.setItem('atendente_guiche', guiche.trim());
      setConfigMode(false);
    } else {
      toast.error('Por favor, identifique-se');
    }
  };

  const handleCallTicket = async (ticket: Ticket) => {
    if (confirmBeforeCall) {
      setPendingCallTicket(ticket);
      setConfirmCallDialogOpen(true);
      return;
    }

    await executeCallTicket(ticket);
  };

  const executeCallTicket = async (ticket: Ticket) => {
    try {
      await callTicket.mutateAsync({
        ticketId: ticket.id,
        atendente: atendente,
        guiche: guiche || undefined,
      });
      toast.success(`Chamando senha ${ticket.id_senha}`);
      setSelectedTicketId(ticket.id);
      queryClient.invalidateQueries({ queryKey: ['myCurrentTicket'] });
    } catch (error: any) {
      toast.error(error.message || 'Erro ao chamar senha');
      queryClient.invalidateQueries({ queryKey: ['waitingTickets'] });
    }
  };

  const handleCallNext = async () => {
    if (filteredTickets.length === 0) {
      toast.info('Nenhuma senha na fila');
      return;
    }

    const nextTicket = filteredTickets[0];
    await handleCallTicket(nextTicket);
  };

  const handleRecall = async () => {
    if (!myCurrentTicket) return;

    try {
      await recallTicket.mutateAsync({
        ticketId: myCurrentTicket.id,
        atendente: atendente,
        guiche: guiche || undefined,
      });
      toast.success(`Rechamando senha ${myCurrentTicket.id_senha}`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao rechamar');
    }
  };

  const handleSkip = async () => {
    if (!skipReason.trim()) {
      toast.error('Informe o motivo');
      return;
    }

    const ticketToSkip = selectedTicket || myCurrentTicket;
    if (!ticketToSkip) return;

    try {
      await skipTicket.mutateAsync({
        ticketId: ticketToSkip.id,
        atendente: atendente,
        motivo: skipReason,
      });
      toast.success(`Senha ${ticketToSkip.id_senha} pulada`);
      setSkipDialogOpen(false);
      setSkipReason('');
      setSelectedTicketId(null);
      queryClient.invalidateQueries({ queryKey: ['myCurrentTicket'] });
    } catch (error: any) {
      toast.error(error.message || 'Erro ao pular senha');
    }
  };

  const handleStartService = async () => {
    if (!myCurrentTicket || myCurrentTicket.status !== 'chamado') return;

    try {
      await startService.mutateAsync({
        ticketId: myCurrentTicket.id,
        atendente: atendente,
        guiche: guiche || undefined,
      });
      toast.success('Atendimento iniciado');
      queryClient.invalidateQueries({ queryKey: ['myCurrentTicket'] });
    } catch (error: any) {
      toast.error(error.message || 'Erro ao iniciar atendimento');
    }
  };

  const handleFinish = async () => {
    if (!myCurrentTicket) return;

    try {
      await finishTicket.mutateAsync({
        ticketId: myCurrentTicket.id,
        atendente: atendente,
      });
      toast.success('Atendimento finalizado');
      setSelectedTicketId(null);
      queryClient.invalidateQueries({ queryKey: ['myCurrentTicket'] });
    } catch (error: any) {
      toast.error(error.message || 'Erro ao finalizar');
    }
  };

  const handleNoShow = async () => {
    if (!myCurrentTicket) return;

    try {
      await cancelTicket.mutateAsync({
        ticketId: myCurrentTicket.id,
        atendente: atendente,
        motivo: 'Não compareceu',
      });
      toast.warning('Marcado como não compareceu');
      setSelectedTicketId(null);
      queryClient.invalidateQueries({ queryKey: ['myCurrentTicket'] });
    } catch (error: any) {
      toast.error(error.message || 'Erro ao marcar não compareceu');
    }
  };

  // Loading state
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Config mode - Identificação
  if (configMode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 shadow-lg">
          <div className="text-center mb-8">
            <Users className="w-16 h-16 mx-auto text-primary mb-4" />
            <h1 className="text-2xl font-bold text-foreground">Identificação</h1>
            <p className="text-muted-foreground mt-2">
              Informe seus dados para iniciar o atendimento
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Atendente *</Label>
              <Input
                placeholder="Ex: Maria Silva"
                value={atendente}
                onChange={(e) => setAtendente(e.target.value)}
                className="text-lg h-12"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Guichê / Sala (opcional)</Label>
              <Input
                placeholder="Ex: Guichê 01, Sala 102"
                value={guiche}
                onChange={(e) => setGuiche(e.target.value)}
                className="h-12"
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

  // Stats
  const preferencialCount = waitingTickets.filter(t => t.tipo === 'Preferencial').length;
  const totalWaiting = waitingTickets.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="shrink-0 bg-card border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-2xl font-bold text-primary">
              Secretaria
            </Link>
            <Badge variant="outline" className="text-sm">
              {unidade}
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium">{atendente}</div>
              {guiche && <div className="text-xs text-muted-foreground">{guiche}</div>}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfigMode(true)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - 2 Columns */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 overflow-hidden">
        {/* Left Column - Queue List */}
        <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
          {/* Filters & Search */}
          <Card className="p-4 shrink-0">
            <div className="flex flex-wrap gap-3 items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar senha..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Type Filter */}
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Preferencial">Preferencial</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Convênio">Convênio</SelectItem>
                  <SelectItem value="Particular">Particular</SelectItem>
                  <SelectItem value="Retirada de Laudo">Retirada de Laudo</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select
                value={`${sortField}-${sortOrder}`}
                onValueChange={(v) => {
                  const [field, order] = v.split('-') as [SortField, SortOrder];
                  setSortField(field);
                  setSortOrder(order);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority-asc">Prioridade ↑</SelectItem>
                  <SelectItem value="time-asc">Mais antigo</SelectItem>
                  <SelectItem value="time-desc">Mais recente</SelectItem>
                  <SelectItem value="number-asc">Número ↑</SelectItem>
                  <SelectItem value="number-desc">Número ↓</SelectItem>
                </SelectContent>
              </Select>

              {/* Stats */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
                <span className="font-medium text-foreground">{totalWaiting}</span> aguardando
                {preferencialCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {preferencialCount} preferencial
                  </Badge>
                )}
              </div>
            </div>
          </Card>

          {/* Ticket List */}
          <Card className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="p-4 border-b shrink-0">
              <h2 className="font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Fila de Espera
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {loadingWaiting ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mb-4 opacity-30" />
                  <p>Nenhuma senha aguardando</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTickets.map((ticket, index) => (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicketId(ticket.id)}
                      onDoubleClick={() => handleCallTicket(ticket)}
                      className={`
                        p-4 rounded-lg border cursor-pointer transition-all
                        ${selectedTicketId === ticket.id
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        }
                        ${index === 0 && sortField === 'priority' ? 'bg-gradient-to-r from-orange-500/5 to-transparent' : ''}
                      `}
                    >
                      <div className="flex items-center gap-4">
                        {/* Position */}
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
                          {index + 1}
                        </div>

                        {/* Ticket Number */}
                        <div className="shrink-0">
                          <span className="text-2xl font-mono font-bold">{ticket.id_senha}</span>
                        </div>

                        {/* Type Badge */}
                        <TicketBadge tipo={ticket.tipo} size="sm" />

                        {/* Wait Time */}
                        <div className="flex items-center gap-1 text-sm text-muted-foreground ml-auto">
                          <Clock className="w-4 h-4" />
                          {getWaitingTime(ticket.hora_emissao)}
                        </div>

                        {/* Arrival Time */}
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(ticket.hora_emissao), 'HH:mm')}
                        </div>

                        {/* Arrow */}
                        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column - Actions & Current */}
        <div className="flex flex-col gap-4 min-h-0">
          {/* Current Ticket Being Attended */}
          <Card className={`p-4 shrink-0 ${myCurrentTicket ? 'border-primary bg-primary/5' : ''}`}>
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-primary" />
              Atendendo Agora
            </h2>

            {myCurrentTicket ? (
              <div className="space-y-4">
                <div className="text-center">
                  <TicketNumber
                    number={myCurrentTicket.id_senha}
                    size="xl"
                    className={myCurrentTicket.status === 'chamado' ? 'animate-pulse' : ''}
                  />
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <TicketBadge tipo={myCurrentTicket.tipo} />
                    <Badge variant={myCurrentTicket.status === 'chamado' ? 'default' : 'secondary'}>
                      {statusConfig[myCurrentTicket.status]?.label || myCurrentTicket.status}
                    </Badge>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  {myCurrentTicket.status === 'chamado' && (
                    <>
                      <Button
                        onClick={handleRecall}
                        variant="outline"
                        disabled={recallTicket.isPending}
                      >
                        {recallTicket.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        Rechamar
                      </Button>
                      <Button
                        onClick={handleStartService}
                        disabled={startService.isPending}
                      >
                        {startService.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Play className="w-4 h-4 mr-2" />
                        )}
                        Iniciar
                      </Button>
                    </>
                  )}

                  <Button
                    onClick={handleFinish}
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                    disabled={finishTicket.isPending}
                  >
                    {finishTicket.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Finalizar
                  </Button>

                  <Button
                    onClick={handleNoShow}
                    variant="destructive"
                    disabled={cancelTicket.isPending}
                  >
                    {cancelTicket.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <XCircle className="w-4 h-4 mr-2" />
                    )}
                    Não Veio
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Phone className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma senha em atendimento</p>
              </div>
            )}
          </Card>

          {/* Selected Ticket Preview */}
          {selectedTicket && !myCurrentTicket && (
            <Card className="p-4 shrink-0 border-dashed">
              <h2 className="font-semibold mb-4 text-muted-foreground">Selecionada</h2>
              <div className="text-center mb-4">
                <TicketNumber number={selectedTicket.id_senha} size="lg" />
                <div className="mt-2">
                  <TicketBadge tipo={selectedTicket.tipo} />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Aguardando há {getWaitingTime(selectedTicket.hora_emissao)}
                </p>
              </div>
            </Card>
          )}

          {/* Main Action Buttons */}
          <Card className="p-4 flex-1 flex flex-col gap-3">
            <h2 className="font-semibold mb-2">Ações</h2>

            {/* Call Selected */}
            <Button
              onClick={() => selectedTicket && handleCallTicket(selectedTicket)}
              size="lg"
              className="h-14 text-lg"
              disabled={!selectedTicket || !!myCurrentTicket || callTicket.isPending}
            >
              {callTicket.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Phone className="w-5 h-5 mr-2" />
              )}
              Chamar Selecionada
            </Button>

            {/* Call Next */}
            <Button
              onClick={handleCallNext}
              size="lg"
              variant="secondary"
              className="h-12"
              disabled={filteredTickets.length === 0 || !!myCurrentTicket || callTicket.isPending}
            >
              <PhoneCall className="w-5 h-5 mr-2" />
              Chamar Próxima
            </Button>

            {/* Skip */}
            <Button
              onClick={() => setSkipDialogOpen(true)}
              variant="outline"
              size="lg"
              className="h-12"
              disabled={!selectedTicket && !myCurrentTicket}
            >
              <SkipForward className="w-5 h-5 mr-2" />
              Pular Senha
            </Button>

            {/* Settings */}
            <div className="mt-auto pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label htmlFor="confirm-call" className="text-sm text-muted-foreground">
                  Confirmar antes de chamar
                </Label>
                <Switch
                  id="confirm-call"
                  checked={confirmBeforeCall}
                  onCheckedChange={setConfirmBeforeCall}
                />
              </div>
            </div>

            {/* Keyboard shortcuts hint */}
            <div className="text-xs text-muted-foreground text-center mt-2">
              <kbd className="px-1 py-0.5 bg-muted rounded text-xs">↑↓</kbd> navegar
              <span className="mx-2">|</span>
              <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> chamar
            </div>
          </Card>
        </div>
      </div>

      {/* Skip Dialog */}
      <Dialog open={skipDialogOpen} onOpenChange={setSkipDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pular Senha</DialogTitle>
            <DialogDescription>
              Informe o motivo para pular esta senha. Este registro ficará no histórico.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Motivo (obrigatório)"
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSkipDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSkip}
              disabled={!skipReason.trim() || skipTicket.isPending}
            >
              {skipTicket.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Call Dialog */}
      <Dialog open={confirmCallDialogOpen} onOpenChange={setConfirmCallDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Chamada</DialogTitle>
            <DialogDescription>
              Deseja chamar a senha {pendingCallTicket?.id_senha}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmCallDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (pendingCallTicket) {
                  executeCallTicket(pendingCallTicket);
                  setConfirmCallDialogOpen(false);
                  setPendingCallTicket(null);
                }
              }}
            >
              Chamar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Main component with auth wrapper
export default function Secretaria() {
  return (
    <SecretariaAuth>
      {(unidade) => <SecretariaPanel unidade={unidade} />}
    </SecretariaAuth>
  );
}
