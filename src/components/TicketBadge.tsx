import { cn } from '@/lib/utils';
import type { TipoAtendimento, StatusAtendimento } from '@/types/queue';

interface TicketBadgeProps {
  tipo: TipoAtendimento;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function TicketBadge({ tipo, size = 'md' }: TicketBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
    xl: 'text-lg px-5 py-2',
  };

  const typeStyles: Record<TipoAtendimento, string> = {
    Normal: 'bg-normal text-normal-foreground',
    Preferencial: 'bg-preferencial text-preferencial-foreground',
    'Retirada de Laudo': 'bg-laudo text-laudo-foreground',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold uppercase tracking-wide',
        typeStyles[tipo],
        sizeClasses[size]
      )}
    >
      {tipo}
    </span>
  );
}

interface StatusBadgeProps {
  status: StatusAtendimento;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const statusStyles: Record<StatusAtendimento, string> = {
    aguardando: 'bg-muted text-muted-foreground',
    chamado: 'bg-chamado text-chamado-foreground',
    em_atendimento: 'bg-atendimento text-atendimento-foreground',
    finalizado: 'bg-secondary text-secondary-foreground',
    nao_compareceu: 'bg-destructive text-destructive-foreground',
  };

  const statusLabels: Record<StatusAtendimento, string> = {
    aguardando: 'Aguardando',
    chamado: 'Chamado',
    em_atendimento: 'Em Atendimento',
    finalizado: 'Finalizado',
    nao_compareceu: 'Não Compareceu',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        statusStyles[status],
        sizeClasses[size]
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
