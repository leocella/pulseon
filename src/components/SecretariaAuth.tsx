import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const SECRETARIA_KEY = 'secretaria_unidade';

// Lista de secretarias disponíveis
export const SECRETARIAS = [
  { id: 'Querência-MT', nome: 'Querência-MT' },
];

interface SecretariaAuthProps {
  children: (unidade: string) => React.ReactNode;
}

export function SecretariaAuth({ children }: SecretariaAuthProps) {
  const navigate = useNavigate();
  const { user, signOut, hasUnitAccess, loading: authLoading } = useAuth();
  const [selectedUnidade, setSelectedUnidade] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if a unit is already selected
    const saved = localStorage.getItem(SECRETARIA_KEY);
    if (saved) {
      setSelectedUnidade(saved);
    }
    setIsLoading(false);
  }, []);

  const handleSelect = (unidade: string) => {
    // Check if user has access to this unit
    if (!hasUnitAccess(unidade)) {
      toast.error('Você não tem acesso a esta unidade');
      return;
    }

    localStorage.setItem(SECRETARIA_KEY, unidade);
    setSelectedUnidade(unidade);
    toast.success(`Unidade ${unidade} selecionada`);
  };

  const handleLogout = async () => {
    localStorage.removeItem(SECRETARIA_KEY);
    // Clear old non-namespaced keys
    localStorage.removeItem('atendente_nome');
    localStorage.removeItem('atendente_guiche');
    await signOut();
    navigate('/login');
    toast.info('Sessão encerrada');
  };

  const handleChangeUnit = () => {
    localStorage.removeItem(SECRETARIA_KEY);
    setSelectedUnidade(null);
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!selectedUnidade) {
    // Filter secretarias based on user access
    const accessibleSecretarias = SECRETARIAS.filter(s => hasUnitAccess(s.id));

    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Selecione a Secretaria
            </h1>
            <p className="text-muted-foreground">
              Escolha a unidade para acessar o painel
            </p>
            {user?.email && (
              <p className="text-xs text-muted-foreground mt-2">
                Logado como: {user.email}
              </p>
            )}
          </div>

          <div className="space-y-3">
            {accessibleSecretarias.length > 0 ? (
              accessibleSecretarias.map((secretaria) => (
                <Button
                  key={secretaria.id}
                  onClick={() => handleSelect(secretaria.nome)}
                  variant="outline"
                  className="w-full h-14 text-lg justify-start px-6 hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <Building2 className="w-5 h-5 mr-3" />
                  {secretaria.nome}
                </Button>
              ))
            ) : (
              <p className="text-center text-muted-foreground">
                Você não tem acesso a nenhuma unidade. Contate o administrador.
              </p>
            )}
          </div>

          <div className="mt-6 pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Header with unit info and logout */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleChangeUnit}
          className="bg-background/95 backdrop-blur"
        >
          <Building2 className="w-4 h-4 mr-2" />
          {selectedUnidade}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="bg-background/95 backdrop-blur"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>
      {children(selectedUnidade)}
    </div>
  );
}

export function useSecretariaUnidade() {
  const [unidade, setUnidade] = useState<string | null>(null);

  useEffect(() => {
    setUnidade(localStorage.getItem(SECRETARIA_KEY));
  }, []);

  return unidade;
}
