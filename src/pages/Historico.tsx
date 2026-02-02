import { useState, useMemo } from 'react';
import {
  ArrowLeft,
  CalendarIcon,
  Filter,
  Clock,
  Timer,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  BarChart3,
  Users,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useHistory } from '@/hooks/useQueue';
import { UNIDADE } from '@/lib/config';
import { TicketBadge, StatusBadge } from '@/components/TicketBadge';
import { format, differenceInMinutes, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { TipoAtendimento, StatusAtendimento } from '@/types/queue';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

export default function Historico() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Date range state - default to last 7 days
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState<Date>(new Date());
  
  const [tipo, setTipo] = useState<TipoAtendimento | 'todos'>('todos');
  const [status, setStatus] = useState<StatusAtendimento | 'todos'>('todos');
  const [atendente, setAtendente] = useState('');
  const [searchSenha, setSearchSenha] = useState('');
  const [page, setPage] = useState(0);

  const { data, isLoading, refetch, isFetching } = useHistory({
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
    tipo: tipo === 'todos' ? undefined : tipo,
    atendente: atendente || undefined,
    page,
    pageSize: PAGE_SIZE,
    unidade: UNIDADE,
  });

  const allTickets = data?.tickets || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Filtrar por status e busca de senha no frontend (pois o hook não suporta)
  const tickets = useMemo(() => {
    let filtered = allTickets;

    if (status !== 'todos') {
      filtered = filtered.filter(t => t.status === status);
    }

    if (searchSenha.trim()) {
      const search = searchSenha.toLowerCase().trim();
      filtered = filtered.filter(t =>
        t.id_senha.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [allTickets, status, searchSenha]);

  // Calcular estatísticas do dia
  const statistics = useMemo(() => {
    if (allTickets.length === 0) {
      return {
        totalAtendimentos: 0,
        finalizados: 0,
        naoCompareceu: 0,
        mediaEspera: 0,
        mediaAtendimento: 0,
        porTipo: { Normal: 0, Preferencial: 0, 'Retirada de Laudo': 0 },
      };
    }

    const finalizados = allTickets.filter(t => t.status === 'finalizado');
    const naoCompareceu = allTickets.filter(t => t.status === 'nao_compareceu');

    // Calcular médias
    let totalEspera = 0;
    let countEspera = 0;
    let totalAtendimento = 0;
    let countAtendimento = 0;

    finalizados.forEach(t => {
      if (t.hora_chamada) {
        const espera = differenceInMinutes(parseISO(t.hora_chamada), parseISO(t.hora_emissao));
        if (espera >= 0) {
          totalEspera += espera;
          countEspera++;
        }
      }
      if (t.hora_chamada && t.hora_finalizacao) {
        const atendimento = differenceInMinutes(parseISO(t.hora_finalizacao), parseISO(t.hora_chamada));
        if (atendimento >= 0) {
          totalAtendimento += atendimento;
          countAtendimento++;
        }
      }
    });

    const porTipo = {
      Normal: allTickets.filter(t => t.tipo === 'Normal').length,
      Preferencial: allTickets.filter(t => t.tipo === 'Preferencial').length,
      'Retirada de Laudo': allTickets.filter(t => t.tipo === 'Retirada de Laudo').length,
    };

    return {
      totalAtendimentos: allTickets.length,
      finalizados: finalizados.length,
      naoCompareceu: naoCompareceu.length,
      mediaEspera: countEspera > 0 ? Math.round(totalEspera / countEspera) : 0,
      mediaAtendimento: countAtendimento > 0 ? Math.round(totalAtendimento / countAtendimento) : 0,
      porTipo,
    };
  }, [allTickets]);

  const calculateWaitTime = (emissao: string, chamada: string | null) => {
    if (!chamada) return '-';
    const minutes = differenceInMinutes(new Date(chamada), new Date(emissao));
    return `${minutes} min`;
  };

  const calculateServiceTime = (chamada: string | null, finalizacao: string | null) => {
    if (!chamada || !finalizacao) return '-';
    const minutes = differenceInMinutes(new Date(finalizacao), new Date(chamada));
    return `${minutes} min`;
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['history'] });
    refetch();
    toast.success('Dados atualizados!');
  };

  const handleExportCSV = () => {
    if (tickets.length === 0) {
      toast.error('Não há dados para exportar');
      return;
    }

    // Preparar dados CSV
    const headers = [
      'Senha',
      'Tipo',
      'Status',
      'Emissão',
      'Chamada',
      'Finalização',
      'Tempo Espera (min)',
      'Tempo Atendimento (min)',
      'Atendente',
    ];

    const rows = tickets.map(t => {
      const waitTime = t.hora_chamada
        ? differenceInMinutes(parseISO(t.hora_chamada), parseISO(t.hora_emissao))
        : '';
      const serviceTime = t.hora_chamada && t.hora_finalizacao
        ? differenceInMinutes(parseISO(t.hora_finalizacao), parseISO(t.hora_chamada))
        : '';

      return [
        t.id_senha,
        t.tipo,
        t.status,
        format(parseISO(t.hora_emissao), 'HH:mm:ss'),
        t.hora_chamada ? format(parseISO(t.hora_chamada), 'HH:mm:ss') : '',
        t.hora_finalizacao ? format(parseISO(t.hora_finalizacao), 'HH:mm:ss') : '',
        waitTime,
        serviceTime,
        t.atendente || '',
      ].join(';');
    });

    const csvContent = [headers.join(';'), ...rows].join('\n');

    // Adicionar BOM para Excel reconhecer UTF-8
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historico-${format(startDate, 'yyyy-MM-dd')}_${format(endDate, 'yyyy-MM-dd')}-${UNIDADE}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`${tickets.length} registros exportados!`);
  };

  const handleClearFilters = () => {
    setTipo('todos');
    setStatus('todos');
    setAtendente('');
    setSearchSenha('');
    setPage(0);
  };

  const hasActiveFilters = tipo !== 'todos' || status !== 'todos' || atendente !== '' || searchSenha !== '';

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <header className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Histórico de Atendimentos</h1>
            <p className="text-muted-foreground">Unidade: {UNIDADE}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={tickets.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </header>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{statistics.totalAtendimentos}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{statistics.finalizados}</p>
              <p className="text-xs text-muted-foreground">Finalizados</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{statistics.naoCompareceu}</p>
              <p className="text-xs text-muted-foreground">Não Compareceu</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{statistics.mediaEspera}<span className="text-sm font-normal">min</span></p>
              <p className="text-xs text-muted-foreground">Média Espera</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Timer className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{statistics.mediaAtendimento}<span className="text-sm font-normal">min</span></p>
              <p className="text-xs text-muted-foreground">Média Atend.</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <BarChart3 className="w-5 h-5 text-purple-500" />
            </div>
            <div className="flex gap-2 text-sm">
              <span className="text-normal font-semibold">{statistics.porTipo.Normal}N</span>
              <span className="text-preferencial font-semibold">{statistics.porTipo.Preferencial}P</span>
              <span className="text-laudo font-semibold">{statistics.porTipo['Retirada de Laudo']}L</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Date Range Picker */}
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-muted-foreground" />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[140px] justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Data início"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => {
                    if (date) {
                      setStartDate(date);
                      setPage(0);
                    }
                  }}
                  disabled={(date) => date > new Date() || (endDate && date > endDate)}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground">até</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[140px] justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : "Data fim"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => {
                    if (date) {
                      setEndDate(date);
                      setPage(0);
                    }
                  }}
                  disabled={(date) => date > new Date() || (startDate && date < startDate)}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar senha..."
              value={searchSenha}
              onChange={(e) => setSearchSenha(e.target.value)}
              className="w-32"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select
              value={tipo}
              onValueChange={(value) => {
                setTipo(value as TipoAtendimento | 'todos');
                setPage(0);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Tipos</SelectItem>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="Preferencial">Preferencial</SelectItem>
                <SelectItem value="Retirada de Laudo">Retirada de Laudo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as StatusAtendimento | 'todos');
              setPage(0);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Status</SelectItem>
              <SelectItem value="aguardando">Aguardando</SelectItem>
              <SelectItem value="chamado">Chamado</SelectItem>
              <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
              <SelectItem value="finalizado">Finalizado</SelectItem>
              <SelectItem value="nao_compareceu">Não Compareceu</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Filtrar atendente..."
            value={atendente}
            onChange={(e) => {
              setAtendente(e.target.value);
              setPage(0);
            }}
            className="w-40"
          />

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              Limpar filtros
            </Button>
          )}

          <div className="ml-auto text-sm text-muted-foreground">
            {tickets.length} de {total} registro{total !== 1 ? 's' : ''}
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Senha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Emissão
                  </div>
                </TableHead>
                <TableHead>Chamada</TableHead>
                <TableHead>Finalização</TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    <Timer className="w-4 h-4" />
                    Espera
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    <Timer className="w-4 h-4" />
                    Atend.
                  </div>
                </TableHead>
                <TableHead>Atendente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-muted rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : tickets.length > 0 ? (
                tickets.map((ticket) => (
                  <TableRow key={ticket.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono font-bold text-lg">
                      {ticket.id_senha}
                    </TableCell>
                    <TableCell>
                      <TicketBadge tipo={ticket.tipo} size="sm" />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={ticket.status} size="sm" />
                    </TableCell>
                    <TableCell className="font-mono">
                      {format(new Date(ticket.hora_emissao), 'HH:mm:ss')}
                    </TableCell>
                    <TableCell className="font-mono">
                      {ticket.hora_chamada
                        ? format(new Date(ticket.hora_chamada), 'HH:mm:ss')
                        : '-'}
                    </TableCell>
                    <TableCell className="font-mono">
                      {ticket.hora_finalizacao
                        ? format(new Date(ticket.hora_finalizacao), 'HH:mm:ss')
                        : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {calculateWaitTime(ticket.hora_emissao, ticket.hora_chamada)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {calculateServiceTime(ticket.hora_chamada, ticket.hora_finalizacao)}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate" title={ticket.atendente || ''}>
                      {ticket.atendente || '-'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Search className="w-8 h-8 opacity-50" />
                      <p>Nenhum registro encontrado</p>
                      <p className="text-sm">Tente ajustar os filtros ou o período de datas</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-sm text-muted-foreground">
              Página {page + 1} de {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(0)}
                disabled={page === 0}
              >
                Primeira
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-3 py-1 bg-muted rounded text-sm font-medium">
                {page + 1}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(totalPages - 1)}
                disabled={page >= totalPages - 1}
              >
                Última
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
