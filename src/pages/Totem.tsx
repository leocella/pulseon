import { useState, useEffect, useCallback } from 'react';
import { UserCheck, AlertCircle, CheckCircle, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useGenerateTicket } from '@/hooks/useQueue';
import { printTicket } from '@/lib/printService';
import { UNIDADE } from '@/lib/config';
import { TicketNumber } from '@/components/TicketNumber';
import { TicketBadge } from '@/components/TicketBadge';
import { TotemSettings } from '@/components/TotemSettings';
import type { TipoAtendimento } from '@/types/queue';

type TotemState = 'idle' | 'loading' | 'success' | 'error' | 'print_error';

// Sequência secreta: 4 toques no logo em 3 segundos
const SECRET_TAP_COUNT = 4;
const SECRET_TAP_TIMEOUT = 3000;

export default function Totem() {
  const [state, setState] = useState<TotemState>('idle');
  const [generatedTicket, setGeneratedTicket] = useState<{
    id_senha: string;
    tipo: TipoAtendimento;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);

  // Handler para toques secretos no logo
  const handleLogoTap = useCallback(() => {
    const now = Date.now();
    
    if (now - lastTapTime > SECRET_TAP_TIMEOUT) {
      // Reset se passou muito tempo
      setTapCount(1);
    } else {
      setTapCount(prev => prev + 1);
    }
    
    setLastTapTime(now);
  }, [lastTapTime]);

  // Verificar se atingiu número de toques
  useEffect(() => {
    if (tapCount >= SECRET_TAP_COUNT) {
      setShowSettings(true);
      setTapCount(0);
    }
  }, [tapCount]);

  // Atalho de teclado: Ctrl+Shift+P
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setShowSettings(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      {/* Settings Modal */}
      <TotemSettings 
        open={showSettings} 
        onClose={() => setShowSettings(false)} 
      />

      {/* Header */}
      <div className="text-center mb-12">
        {/* Logo com área clicável secreta */}
        <img 
          src="/biocenter-logo.jpg" 
          alt="Biocenter Logo" 
          className="h-24 md:h-32 mx-auto mb-6 object-contain cursor-default select-none"
          onClick={handleLogoTap}
          draggable={false}
        />
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
          Retire sua Senha
        </h1>
        <p className="text-lg text-muted-foreground">
          Selecione o tipo de atendimento
        </p>
      </div>

      {/* Main Content */}
      {state === 'idle' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl w-full animate-slide-up">
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

          {/* Retirada de Laudo Button */}
          <Button
            onClick={() => handleGenerateTicket('Retirada de Laudo')}
            className="h-64 md:h-80 flex flex-col items-center justify-center gap-6 text-2xl md:text-3xl font-bold bg-laudo hover:bg-laudo/90 text-laudo-foreground rounded-3xl shadow-ticket transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
              <FileText className="w-10 h-10" />
            </div>
            <span>Retirada de Laudo</span>
            <span className="text-lg font-normal opacity-80">
              Resultados de exames
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
        <Card className="p-8 md:p-12 text-center max-w-lg w-full animate-slide-up">
          <CheckCircle className="w-16 h-16 mx-auto text-preferencial mb-8" />
          <p className="text-xl md:text-2xl text-muted-foreground mb-6">Sua senha é</p>
          <div className="my-8 py-4">
            <TicketNumber
              number={generatedTicket.id_senha}
              size="3xl"
              className="text-foreground block"
            />
          </div>
          <div className="mb-8">
            <TicketBadge tipo={generatedTicket.tipo} size="xl" />
          </div>
          <p className="text-lg md:text-xl text-muted-foreground mt-6">
            Aguarde ser chamado no painel
          </p>
          {state === 'print_error' && (
            <p className="text-sm text-destructive mt-6 flex items-center justify-center gap-2">
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
