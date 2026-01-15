import { Link } from 'react-router-dom';
import {
  Ticket,
  Monitor,
  UserCog,
  History,
  Settings,
  ArrowRight
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { UNIDADE } from '@/lib/config';

const screens = [
  {
    title: 'Totem',
    description: 'Retirada de senhas para atendimento',
    icon: Ticket,
    path: '/totem',
    color: 'bg-primary',
  },
  {
    title: 'Painel TV',
    description: 'Exibição de senhas chamadas',
    icon: Monitor,
    path: '/painel',
    color: 'bg-chamado',
  },
  {
    title: 'Secretaria',
    description: 'Controle de atendimento',
    icon: UserCog,
    path: '/secretaria',
    color: 'bg-atendimento',
  },
  {
    title: 'Histórico',
    description: 'Relatórios e consultas',
    icon: History,
    path: '/historico',
    color: 'bg-preferencial',
  },
  {
    title: 'Admin',
    description: 'Gerenciar mídias do painel',
    icon: Settings,
    path: '/admin',
    color: 'bg-normal',
  },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center mb-12">
        <img
          src="/biocenter-logo.jpg"
          alt="Laboratório Biocenter"
          className="h-24 md:h-32 mx-auto mb-6 rounded-lg shadow-lg object-contain"
        />
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
          Laboratório Biocenter
        </h1>
        <p className="text-xl text-primary font-medium mb-3">
          Sempre ao seu lado
        </p>
        <p className="text-lg text-muted-foreground">
          Sistema de Gerenciamento de Filas
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Unidade: {UNIDADE}
        </p>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl w-full">
        {screens.map((screen) => (
          <Link key={screen.path} to={screen.path}>
            <Card className="group p-6 h-full hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${screen.color} text-white`}>
                  <screen.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-foreground mb-1 flex items-center gap-2">
                    {screen.title}
                    <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </h2>
                  <p className="text-muted-foreground">{screen.description}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Instructions */}
      <div className="mt-12 text-center text-sm text-muted-foreground max-w-xl">
        <p className="mb-2">
          <strong>Totem:</strong> Instale em tablets para retirada de senhas
        </p>
        <p className="mb-2">
          <strong>Painel TV:</strong> Exiba em monitores na área de espera
        </p>
        <p>
          <strong>Secretaria:</strong> Use no desktop para chamar e gerenciar atendimentos
        </p>
      </div>
    </div>
  );
}
