import { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Filter,
  Clock,
  Timer,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { format, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import type { TipoAtendimento } from '@/types/queue';

const PAGE_SIZE = 20;

export default function Historico() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [tipo, setTipo] = useState<TipoAtendimento | 'todos'>('todos');
  const [atendente, setAtendente] = useState('');
  const [page, setPage] = useState(0);

  const { data, isLoading } = useHistory({
    date,
    tipo: tipo === 'todos' ? undefined : tipo,
    atendente: atendente || undefined,
    page,
    pageSize: PAGE_SIZE,
    unidade: UNIDADE,
  });

  const tickets = data?.tickets || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

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

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <header className="flex items-center gap-4 mb-8">
        <Link to="/secretaria">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Histórico de Atendimentos</h1>
          <p className="text-muted-foreground">Unidade: {UNIDADE}</p>
        </div>
      </header>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setPage(0);
              }}
              className="w-40"
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
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="Preferencial">Preferencial</SelectItem>
                <SelectItem value="Retirada de Laudo">Retirada de Laudo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Input
            placeholder="Filtrar por atendente"
            value={atendente}
            onChange={(e) => {
              setAtendente(e.target.value);
              setPage(0);
            }}
            className="w-48"
          />

          <div className="ml-auto text-sm text-muted-foreground">
            {total} registro{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
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
                  <TableRow key={ticket.id}>
                    <TableCell className="font-mono font-bold">
                      {ticket.id_senha}
                    </TableCell>
                    <TableCell>
                      <TicketBadge tipo={ticket.tipo} size="sm" />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={ticket.status} size="sm" />
                    </TableCell>
                    <TableCell>
                      {format(new Date(ticket.hora_emissao), 'HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      {ticket.hora_chamada
                        ? format(new Date(ticket.hora_chamada), 'HH:mm:ss')
                        : '-'}
                    </TableCell>
                    <TableCell>
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
                    <TableCell>{ticket.atendente || '-'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Nenhum registro encontrado para os filtros selecionados
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
                size="icon"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
