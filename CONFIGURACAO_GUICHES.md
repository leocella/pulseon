# 🏢 Configuração de Múltiplos Guichês (Secretarias)

**Data**: 2026-01-15  
**Versão**: 2.4.0

---

## 🚀 O que mudou?

Agora o sistema permite que **múltiplas secretárias(os)** atendam ao mesmo tempo, cada uma em seu computador, sem que uma atrapalhe a tela da outra.

### **✨ Novidades:**

1.  **Tela de Identificação:** Ao abrir o painel da Secretaria pela primeira vez, será solicitado um **Nome** ou **Guichê** (ex: "Guichê 01", "Maria", etc.).
2.  **Sincronização Independente:**
    - Quando você clica em "Chamar Próxima Senha", essa senha fica vinculada **apenas a você**.
    - O botão "Finalizar Atendimento" de outra secretária não afetará o seu atendimento.
    - O Painel da TV continuará mostrando todas as chamadas normalmente.

---

## ⚠️ AÇÃO NECESSÁRIA: Atualizar Banco de Dados

Para que o sistema de filtros funcione, você precisa executar o novo script SQL.

### **Passo a Passo:**

1.  Copie o conteúdo do arquivo:
    `supabase/migrations/20260115003000_add_attendant_to_call.sql`

2.  Acesse o **Supabase Dashboard** > **SQL Editor**.

3.  Cole o código e clique em **RUN**.

### **O que o script faz?**

- Atualiza a função de chamar senha (`call_next_ticket`) para gravar automaticamente quem chamou a senha no banco de dados.

---

## 🧪 Como Testar

1.  Rode o script SQL no Supabase.
2.  Abra a **Secretaria** em dois navegadores diferentes (ou abas anônimas).
3.  No Navegador A: Identifique-se como "Guichê 01".
4.  No Navegador B: Identifique-se como "Guichê 02".
5.  Gere várias senhas no Totem.
6.  No Navegador A: Chame uma senha. Veja que ela aparece apenas para você.
7.  No Navegador B: A tela continua livre para você chamar OUTRA senha.
8.  Chame outra senha no Navegador B.
9.  Cada um pode iniciar e finalizar seu atendimento independentemente.

---

**Desenvolvido com ❤️ para Laboratório Biocenter**  
*"Sempre ao seu lado"*
