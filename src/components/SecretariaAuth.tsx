import { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const SECRETARIA_KEY = 'secretaria_unidade';

// Lista de secretarias disponíveis
export const SECRETARIAS = [
  { id: 'guaira', nome: 'Unidade Guaíra' },
  { id: 'terra-roxa', nome: 'Unidade Terra Roxa' },
];

interface SecretariaAuthProps {
  children: (unidade: string) => React.ReactNode;
}

export function SecretariaAuth({ children }: SecretariaAuthProps) {
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
    localStorage.setItem(SECRETARIA_KEY, unidade);
    setSelectedUnidade(unidade);
  };

  const handleLogout = () => {
    localStorage.removeItem(SECRETARIA_KEY);
    setSelectedUnidade(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!selectedUnidade) {
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
          </div>

          <div className="space-y-3">
            {SECRETARIAS.map((secretaria) => (
              <Button
                key={secretaria.id}
                onClick={() => handleSelect(secretaria.nome)}
                variant="outline"
                className="w-full h-14 text-lg justify-start px-6 hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Building2 className="w-5 h-5 mr-3" />
                {secretaria.nome}
              </Button>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* Logout/Change unit button */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="bg-background/95 backdrop-blur"
        >
          <Building2 className="w-4 h-4 mr-2" />
          Trocar Unidade
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
