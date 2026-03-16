import { useState, useEffect, useCallback } from 'react';
import { UserCheck, AlertCircle, CheckCircle, Loader2, FileText, Maximize, Minimize, Calendar } from 'lucide-react';
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
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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

      if (!result?.id_senha) {
        throw new Error('Resposta inválida ao gerar senha');
      }

      // Mostra a senha IMEDIATAMENTE para o usuário
      setGeneratedTicket({ id_senha: result.id_senha, tipo });
      setState('success');

      // Flag para evitar que a impressão mude o estado após o reset
      let hasReset = false;

      // Auto-reset after 3 seconds (para liberar rápido a nova senha)
      setTimeout(() => {
        hasReset = true;
        setState('idle');
        setGeneratedTicket(null);
      }, 3000);

      console.log(`[Totem] Chamando printTicket para ${result.id_senha} (${tipo})`);
      printTicket({
        senha: result.id_senha,
        id_senha: result.id_senha,
        tipo,
        unidade: UNIDADE,
        hora: new Date().toISOString(),
      }).then(printed => {
        console.log(`[Totem] Resultado da impressão: ${printed ? 'OK' : 'FALHA'}`);
        if (!printed && !hasReset) {
          setState('print_error');
        }
      }).catch(err => {
        console.error('[Totem] Erro crítico na função printTicket:', err);
        if (!hasReset) {
          setState('print_error');
        }
      });

    } catch (error: any) {
      console.error('[Totem] Erro ao gerar senha:', error);
      // Log detalhado do erro para o usuário/dev
      const errorMsg = error.message || 'Erro ao gerar senha';
      console.error(`[Totem] Detalhes: ${JSON.stringify(error)}`);
      
      setState('error');
      setErrorMessage(`${errorMsg}. Verifique se a migração Agendado foi aplicada no banco.`);

      setTimeout(() => {
        setState('idle');
        setErrorMessage('');
      }, 5000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex flex-col items-center justify-center p-6 relative">
      {/* Fullscreen Button */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 p-3 rounded-full bg-card/80 backdrop-blur-sm hover:bg-card transition-colors shadow-lg z-50"
        title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
      >
        {isFullscreen ? (
          <Minimize className="w-6 h-6 text-muted-foreground" />
        ) : (
          <Maximize className="w-6 h-6 text-muted-foreground" />
        )}
      </button>

      {/* Settings Modal */}
      <TotemSettings
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Header */}
      <div className="text-center mb-12">
        {/* Logo com área clicável secreta */}
        <img
          src="/platano-logo.png"
          alt="Plátano Logo"
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-7xl w-full animate-slide-up">
          {/* Normal Button */}
          <Button
            onClick={() => handleGenerateTicket('Normal')}
            className="h-72 md:h-96 flex flex-col items-center justify-center gap-6 text-2xl md:text-3xl font-bold bg-normal hover:bg-normal/90 text-normal-foreground rounded-3xl shadow-ticket transition-all hover:scale-[1.02] active:scale-[0.98] p-6 text-center"
          >
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/20 flex items-center justify-center">
              <UserCheck className="w-8 h-8 md:w-10 md:h-10" />
            </div>
            <span>Atendimento Normal</span>
            <span className="text-base md:text-lg font-normal opacity-80">
              Senha iniciada em N
            </span>
          </Button>

          {/* Preferencial Button */}
          <Button
            onClick={() => handleGenerateTicket('Preferencial')}
            className="h-72 md:h-96 flex flex-col items-center justify-center gap-6 text-2xl md:text-3xl font-bold bg-preferencial hover:bg-preferencial/90 text-preferencial-foreground rounded-3xl shadow-ticket transition-all hover:scale-[1.02] active:scale-[0.98] p-6 text-center"
          >
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/20 flex items-center justify-center">
              <UserCheck className="w-8 h-8 md:w-10 md:h-10" />
            </div>
            <span>Preferencial</span>
            <span className="text-base md:text-lg font-normal opacity-80">
              Idosos, gestantes, PCD
            </span>
          </Button>

          {/* Agendado Button */}
          <Button
            onClick={() => handleGenerateTicket('Agendado')}
            className="h-72 md:h-96 flex flex-col items-center justify-center gap-6 text-2xl md:text-3xl font-bold bg-agendado hover:bg-agendado/90 text-agendado-foreground rounded-3xl shadow-ticket transition-all hover:scale-[1.02] active:scale-[0.98] p-6 text-center"
          >
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/20 flex items-center justify-center">
              <Calendar className="w-8 h-8 md:w-10 md:h-10" />
            </div>
            <span>Agendado</span>
            <span className="text-base md:text-lg font-normal opacity-80">
              Senha iniciada em A
            </span>
          </Button>

          {/* Retirada de Laudo Button */}
          <Button
            onClick={() => handleGenerateTicket('Retirada de Resultado')}
            className="h-72 md:h-96 flex flex-col items-center justify-center gap-6 text-2xl md:text-3xl font-bold bg-laudo hover:bg-laudo/90 text-laudo-foreground rounded-3xl shadow-ticket transition-all hover:scale-[1.02] active:scale-[0.98] p-6 text-center"
          >
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/20 flex items-center justify-center">
              <FileText className="w-8 h-8 md:w-10 md:h-10" />
            </div>
            <span>Retirada de Resultado</span>
            <span className="text-base md:text-lg font-normal opacity-80">
              Senha iniciada em R
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
              Falha na impressão. (No tablet/celular: verifique rede/CORS do servidor). Anote sua senha.
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
