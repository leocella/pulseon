# 🚀 Guia Rápido de Início

Este guia vai te ajudar a colocar o sistema funcionando em **menos de 10 minutos**!

---

## ⚡ Início Rápido

### 1️⃣ Instalar Dependências (2 min)

```bash
npm install
```

### 2️⃣ Configurar Supabase (3 min)

1. **Crie um projeto no Supabase** (se ainda não tem)
   - Acesse: https://app.supabase.com
   - Clique em "New Project"
   - Escolha um nome e senha

2. **Copie as credenciais**
   - Vá em Settings → API
   - Copie a "Project URL"
   - Copie a "anon public" key

3. **Configure o .env**
   ```bash
   cp .env.example .env
   ```
   
   Edite o `.env` e cole suas credenciais:
   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-aqui
   ```

### 3️⃣ Executar Migrations (2 min)

1. **Acesse o SQL Editor do Supabase**
   - No dashboard do Supabase
   - Clique em "SQL Editor"

2. **Execute as migrations**
   
   **Migration 1** - Copie e execute o conteúdo de:
   ```
   supabase/migrations/20260114145418_16601835-cbac-43e2-938b-d7dade3650c0.sql
   ```
   
   **Migration 2** - Copie e execute o conteúdo de:
   ```
   supabase/migrations/20260114152000_panel_media.sql
   ```

### 4️⃣ Iniciar o Sistema (1 min)

```bash
npm run dev
```

Acesse: http://localhost:5173

---

## 🎯 Primeiros Passos

### Testar o Sistema

1. **Menu Principal** (`/`)
   - Você verá 5 cards de navegação
   - Clique em cada um para explorar

2. **Totem** (`/totem`)
   - Clique em "Atendimento Normal" ou "Preferencial"
   - Uma senha será gerada
   - Anote o número (ex: A001)

3. **Secretaria** (`/secretaria`)
   - Clique em "Chamar Próxima Senha"
   - A senha que você gerou aparecerá
   - Digite um nome de atendente
   - Clique em "Iniciar Atendimento"
   - Depois clique em "Finalizar Atendimento"

4. **Painel TV** (`/painel`)
   - Abra em outra aba/janela
   - Você verá as senhas sendo chamadas em tempo real
   - O carrossel de mídias estará rodando

5. **Admin** (`/admin`)
   - Adicione suas próprias imagens/vídeos
   - Veja o preview atualizar em tempo real

---

## 🎨 Personalizar

### Mudar o Nome da Unidade

Edite `src/lib/config.ts`:

```typescript
export const UNIDADE = 'Minha Clínica'; // Mude aqui
```

### Adicionar Mídias ao Painel

1. Acesse `/admin`
2. Clique em "Adicionar Mídia"
3. Faça upload de imagens ou vídeos
4. Ou adicione links externos
5. Veja o preview atualizar automaticamente

---

## 📱 Configurar para Produção

### Totem (Tablet)

1. Abra `/totem` no navegador do tablet
2. Coloque em tela cheia (F11)
3. Fixe na parede ou balcão
4. Pacientes podem tocar para gerar senhas

### Painel TV (Monitor)

1. Conecte um computador/Raspberry Pi ao monitor
2. Abra `/painel` no navegador
3. Coloque em tela cheia (F11)
4. Posicione na sala de espera
5. As senhas aparecerão automaticamente

### Secretaria (Desktop)

1. Abra `/secretaria` no computador da secretária
2. Use para chamar e gerenciar atendimentos
3. Mantenha aberto durante o expediente

---

## 🆘 Problemas Comuns

### "Cannot connect to Supabase"
- ✅ Verifique se o `.env` está configurado corretamente
- ✅ Confirme que as migrations foram executadas
- ✅ Teste a conexão no Supabase Dashboard

### "No media showing on panel"
- ✅ Acesse `/admin` e adicione mídias
- ✅ Verifique se as mídias estão ativas (olho aberto)
- ✅ Atualize a página do painel

### Senhas não aparecem
- ✅ Verifique se está usando a mesma UNIDADE em todos os lugares
- ✅ Confirme que as migrations foram executadas
- ✅ Verifique o console do navegador para erros

---

## 📞 Próximos Passos

Agora que o sistema está funcionando:

1. ✅ Leia a [Análise Completa](./ANALISE_PROJETO.md)
2. ✅ Veja as [Melhorias Implementadas](./MELHORIAS_IMPLEMENTADAS.md)
3. ✅ Explore o [README](./README.md) completo
4. ✅ Personalize para suas necessidades

---

## 🎉 Pronto!

Seu sistema de filas está funcionando! 🚀

Se tiver dúvidas, consulte a documentação ou abra uma issue.

**Desenvolvido com ❤️ para Biocenter**
