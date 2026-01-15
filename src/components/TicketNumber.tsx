import { cn } from '@/lib/utils';

interface TicketNumberProps {
  number: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
  animate?: boolean;
}

export function TicketNumber({ 
  number, 
  size = 'lg', 
  className,
  animate = false,
}: TicketNumberProps) {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-6xl',
    '2xl': 'text-6xl md:text-7xl',
    '3xl': 'text-8xl md:text-9xl',
  };

  return (
    <span
      className={cn(
        'ticket-number font-bold tracking-wider',
        sizeClasses[size],
        animate && 'animate-pulse-glow rounded-2xl px-4 py-2 bg-chamado text-chamado-foreground',
        className
      )}
    >
      {number}
    </span>
  );
}
