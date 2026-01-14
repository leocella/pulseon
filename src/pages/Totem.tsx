import { useState } from 'react';
import { Ticket, UserCheck, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useGenerateTicket } from '@/hooks/useQueue';
import { printTicket } from '@/lib/printService';
import { UNIDADE } from '@/lib/config';
import { TicketNumber } from '@/components/TicketNumber';
import { TicketBadge } from '@/components/TicketBadge';
import type { TipoAtendimento } from '@/types/queue';

type TotemState = 'idle' | 'loading' | 'success' | 'error' | 'print_error';

export default function Totem() {
  const [state, setState] = useState<TotemState>('idle');
  const [generatedTicket, setGeneratedTicket] = useState<{
    id_senha: string;
    tipo: TipoAtendimento;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const generateTicket = useGenerateTicket();

  const handleGenerateTicket = async (tipo: TipoAtendimento) => {
    setState('loading');
    setErrorMessage('');

    try {
      const result = await generateTicket.mutateAsync(tipo);
      
      setGeneratedTicket({ id_senha: result.id_senha, tipo });
      
      // Try to print
      const printed = await printTicket({
        senha: result.ticket_id,
        id_senha: result.id_senha,
        tipo,
        unidade: UNIDADE,
        hora: new Date().toISOString(),
      });

      if (printed) {
        setState('success');
      } else {
        setState('print_error');
      }

      // Auto-reset after 8 seconds
      setTimeout(() => {
        setState('idle');
        setGeneratedTicket(null);
      }, 8000);

    } catch (error) {
      console.error('Error generating ticket:', error);
      setState('error');
      setErrorMessage('Erro ao gerar senha. Por favor, tente novamente.');
      
      setTimeout(() => {
        setState('idle');
        setErrorMessage('');
      }, 5000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-6">
          <Ticket className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
          Retire sua Senha
        </h1>
        <p className="text-lg text-muted-foreground">
          Selecione o tipo de atendimento
        </p>
      </div>

      {/* Main Content */}
      {state === 'idle' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full animate-slide-up">
          {/* Normal Button */}
          <Button
            onClick={() => handleGenerateTicket('Normal')}
            className="h-64 md:h-80 flex flex-col items-center justify-center gap-6 text-2xl md:text-3xl font-bold bg-normal hover:bg-normal/90 text-normal-foreground rounded-3xl shadow-ticket transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
              <UserCheck className="w-10 h-10" />
            </div>
            <span>Atendimento Normal</span>
            <span className="text-lg font-normal opacity-80">
              Senha iniciada em A
            </span>
          </Button>

          {/* Preferencial Button */}
          <Button
            onClick={() => handleGenerateTicket('Preferencial')}
            className="h-64 md:h-80 flex flex-col items-center justify-center gap-6 text-2xl md:text-3xl font-bold bg-preferencial hover:bg-preferencial/90 text-preferencial-foreground rounded-3xl shadow-ticket transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
              <UserCheck className="w-10 h-10" />
            </div>
            <span>Preferencial</span>
            <span className="text-lg font-normal opacity-80">
              Idosos, gestantes, PCD
            </span>
          </Button>
        </div>
      )}

      {/* Loading State */}
      {state === 'loading' && (
        <Card className="p-12 text-center max-w-lg w-full animate-slide-up">
          <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin mb-6" />
          <p className="text-xl font-medium text-foreground">
            Gerando sua senha...
          </p>
        </Card>
      )}

      {/* Success State */}
      {(state === 'success' || state === 'print_error') && generatedTicket && (
        <Card className="p-12 text-center max-w-lg w-full animate-slide-up">
          <CheckCircle className="w-16 h-16 mx-auto text-preferencial mb-6" />
          <p className="text-xl text-muted-foreground mb-4">Sua senha é</p>
          <TicketNumber 
            number={generatedTicket.id_senha} 
            size="3xl" 
            className="text-foreground block mb-6"
          />
          <TicketBadge tipo={generatedTicket.tipo} size="xl" />
          <p className="text-lg text-muted-foreground mt-6">
            Aguarde ser chamado no painel
          </p>
          {state === 'print_error' && (
            <p className="text-sm text-destructive mt-4 flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Falha na impressão. Anote sua senha.
            </p>
          )}
        </Card>
      )}

      {/* Error State */}
      {state === 'error' && (
        <Card className="p-12 text-center max-w-lg w-full animate-slide-up border-destructive">
          <AlertCircle className="w-16 h-16 mx-auto text-destructive mb-6" />
          <p className="text-xl font-medium text-destructive mb-2">
            Erro ao gerar senha
          </p>
          <p className="text-muted-foreground">{errorMessage}</p>
        </Card>
      )}

      {/* Footer */}
      <div className="mt-12 text-center text-sm text-muted-foreground">
        <p>Unidade: {UNIDADE}</p>
      </div>
    </div>
  );
}
