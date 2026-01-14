# 🎫 Sistema de Filas Biocenter

Sistema completo de gerenciamento de filas para atendimento presencial, com painel administrativo avançado para gerenciamento de mídias.

![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Status](https://img.shields.io/badge/status-production--ready-success.svg)

---

## 📋 Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Uso](#uso)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Documentação](#documentação)

---

## 🎯 Sobre o Projeto

Sistema moderno de gerenciamento de filas de atendimento presencial, desenvolvido para clínicas, hospitais e centros de atendimento. Inclui:

- **Totem** para retirada de senhas
- **Painel TV** para exibição de chamadas
- **Secretaria** para controle de atendimento
- **Histórico** para relatórios e consultas
- **Admin** para gerenciamento de mídias do painel

---

## ✨ Funcionalidades

### 🎫 Totem (Retirada de Senhas)
- Geração de senhas Normal (A) e Preferencial (P)
- Numeração sequencial automática
- Impressão de senhas (opcional)
- Interface touch-friendly
- Auto-reset após emissão

### 📺 Painel TV
- Exibição da senha atual sendo chamada
- Lista das próximas 3 senhas
- Carrossel de mídias (imagens/vídeos)
- Atualização em tempo real
- Relógio e data

### 👥 Secretaria
- Chamada de próximas senhas
- Priorização automática de preferenciais
- Controle de atendimento
- Registro de atendente
- Marcação de não comparecimento
- Fila de espera em tempo real

### 📊 Histórico
- Filtros por data, tipo e atendente
- Estatísticas de atendimento
- Paginação de resultados
- Exportação de relatórios

### ⚙️ Admin (v2.1 - NOVO!)

#### **🔐 Autenticação**
- Login com senha protegida
- Sessão de 8 horas
- Logout seguro

#### **📤 Upload de Mídias**
- Upload de imagens (PNG, JPG, WEBP) - max 5MB
- Upload de vídeos (MP4, WEBM) - max 50MB
- Adição de links externos
- **Compressão automática de imagens** (reduz 60-80%)
- **Preview de vídeo antes do upload**
- Validação de tamanho de arquivo

#### **🎨 Gerenciamento**
- Listar todas as mídias
- **Busca e filtros em tempo real**
- **Editar mídias existentes** (duração, etc)
- Ativar/Desativar mídias
- Deletar mídias (remove do storage)
- Preview em tempo real
- **Exportar configurações** (JSON)

#### **🎯 Recursos Avançados**
- Ordenação visual com drag handle
- Contador de mídias
- Indicadores de status
- Feedback visual em todas as ações
- Interface responsiva e intuitiva

---

## 🚀 Tecnologias

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: TailwindCSS + shadcn/ui (Radix UI)
- **Backend**: Supabase (PostgreSQL + Realtime + Storage)
- **State**: TanStack React Query
- **Routing**: React Router DOM v6
- **Icons**: Lucide React
- **Date**: date-fns

---

## 📦 Instalação

### Pré-requisitos
- Node.js 18+ e npm
- Conta no Supabase

### Passos

1. **Clone o repositório**
```bash
git clone <seu-repositorio>
cd queue-flow
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
# Crie um arquivo .env na raiz do projeto
cp .env.example .env
```

Edite o `.env` com suas credenciais do Supabase:
```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

4. **Execute as migrations do banco**
- Acesse o Supabase Dashboard
- Vá em SQL Editor
- Execute os arquivos em `supabase/migrations/` na ordem

5. **Inicie o servidor de desenvolvimento**
```bash
npm run dev
```

6. **Acesse a aplicação**
```
http://localhost:5173
```

---

## ⚙️ Configuração

### Configurar Unidade

Edite `src/lib/config.ts`:

```typescript
export const UNIDADE = 'Sua Unidade Aqui';
export const POLLING_INTERVAL = 10000; // 10 segundos
```

### Configurar Supabase Storage

1. Acesse o Supabase Dashboard
2. Vá em Storage
3. O bucket `panel-media` será criado automaticamente pela migration
4. Verifique se as políticas RLS estão ativas

---

## 📖 Uso

### Fluxo Básico de Atendimento

1. **Paciente no Totem**
   - Seleciona tipo de atendimento (Normal/Preferencial)
   - Recebe senha impressa ou visualiza na tela
   - Aguarda chamada

2. **Secretária**
   - Clica em "Chamar Próxima Senha"
   - Sistema prioriza senhas preferenciais
   - Informa nome do atendente
   - Inicia atendimento
   - Finaliza ou marca não comparecimento

3. **Painel TV**
   - Exibe senha atual sendo chamada
   - Mostra próximas senhas na fila
   - Exibe carrossel de mídias

### Gerenciar Mídias do Painel

1. **Acessar Admin**
   - Navegue para `/admin`
   - Ou clique no card "Admin" na página inicial

2. **Adicionar Mídia**
   - Clique em "Adicionar Mídia"
   - Escolha o tipo (Imagem/Vídeo/Link Externo)
   - Faça upload ou cole URL
   - Configure duração (para imagens)
   - Salve

3. **Gerenciar**
   - Ative/Desative mídias com o ícone de olho
   - Delete mídias com o ícone de lixeira
   - Visualize preview em tempo real

---

## 📁 Estrutura do Projeto

```
queue-flow/
├── src/
│   ├── components/          # Componentes reutilizáveis
│   │   ├── ui/             # Componentes shadcn/ui
│   │   ├── MediaCarousel.tsx
│   │   ├── TicketBadge.tsx
│   │   └── TicketNumber.tsx
│   ├── hooks/              # Custom hooks
│   │   ├── useQueue.ts
│   │   ├── usePanelMedia.ts
│   │   └── useRealtimeQueue.ts
│   ├── pages/              # Páginas da aplicação
│   │   ├── Index.tsx       # Menu principal
│   │   ├── Totem.tsx       # Retirada de senhas
│   │   ├── Painel.tsx      # Exibição TV
│   │   ├── Secretaria.tsx  # Controle
│   │   ├── Historico.tsx   # Relatórios
│   │   └── Admin.tsx       # Gerenciamento de mídias
│   ├── lib/                # Utilitários
│   │   ├── config.ts
│   │   ├── mediaConfig.ts
│   │   └── printService.ts
│   └── types/              # TypeScript types
├── supabase/
│   └── migrations/         # Migrações do banco
├── public/                 # Assets estáticos
└── package.json
```

---

## 📚 Documentação

### Documentos Disponíveis

- **[ANALISE_PROJETO.md](./ANALISE_PROJETO.md)** - Análise técnica completa do projeto
- **[MELHORIAS_IMPLEMENTADAS.md](./MELHORIAS_IMPLEMENTADAS.md)** - Detalhes das melhorias v2.0

### Rotas da Aplicação

| Rota | Descrição | Uso |
|------|-----------|-----|
| `/` | Menu principal | Navegação entre telas |
| `/totem` | Totem de senhas | Tablets para pacientes |
| `/painel` | Painel TV | Monitores na sala de espera |
| `/secretaria` | Controle de atendimento | Desktop da secretária |
| `/historico` | Relatórios | Consultas e estatísticas |
| `/admin` | Gerenciamento de mídias | Configuração do painel |

### API do Banco de Dados

#### Funções PostgreSQL

**`next_ticket(p_unidade, p_tipo)`**
- Gera próxima senha de forma atômica
- Retorna: `{id_senha, ticket_id}`

**`call_next_ticket(p_unidade)`**
- Chama próxima senha da fila
- Prioriza preferenciais
- Retorna: dados da senha

#### Tabelas Principais

**`fila_atendimento`**
- Armazena todas as senhas
- Status: aguardando, chamado, em_atendimento, finalizado, nao_compareceu

**`panel_media`**
- Armazena configurações de mídia
- Tipos: image, video, external

---

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build de produção
npm run build

# Preview do build
npm run preview

# Lint
npm run lint

# Testes
npm run test
npm run test:watch
```

---

## 🐛 Problemas Conhecidos

### Erros de Lint
Os erros de TypeScript que aparecem são esperados até que as dependências sejam instaladas com `npm install`.

### Impressão de Senhas
A funcionalidade de impressão depende de configuração específica de hardware. Por padrão, apenas exibe a senha na tela.

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---

## 👥 Autores

- **Desenvolvimento Inicial** - Sistema de Filas v1.0
- **Melhorias v2.0** - Painel Admin e Correções

---

## 🙏 Agradecimentos

- [Supabase](https://supabase.com/) - Backend as a Service
- [shadcn/ui](https://ui.shadcn.com/) - Componentes UI
- [Lucide](https://lucide.dev/) - Ícones
- [TailwindCSS](https://tailwindcss.com/) - Framework CSS

---

## 📞 Suporte

Para suporte, abra uma issue no repositório ou entre em contato com a equipe de desenvolvimento.

---

**Desenvolvido com ❤️ para Biocenter**
