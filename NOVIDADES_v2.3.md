# 📄 Nova Funcionalidade - Retirada de Laudo (v2.3)

**Data**: 2026-01-14  
**Versão**: 2.3.0

---

## 🚀 O que mudou?

Adicionamos a opção **"Retirada de Laudo"** no sistema, permitindo que pacientes peguem uma senha específica apenas para retirar resultados de exames.

### **✨ Funcionalidades:**

1.  **Totem:** Novo botão azul **"Retirada de Laudo"**.
2.  **Senhas:** Prefixo **"L"** (ex: `L001`, `L002`).
3.  **Prioridade:** Configurada para ser chamada logo após as Preferenciais (Preferencial > Laudo > Normal).
4.  **Histórico:** Filtros atualizados para incluir e filtrar por laudos.
5.  **Indicadores Visual:** Nova cor **Azul Ciano** para fácil identificação.

---

## ⚠️ AÇÃO NECESSÁRIA: Atualizar Banco de Dados

Para que essa funcionalidade funcione, você precisa executar o script SQL no seu Supabase.

### **Como Atualizar:**

1.  Copie o conteúdo do arquivo:
    `supabase/migrations/20260114234000_add_laudo_ticket_type.sql`

2.  Acesse o **Supabase Dashboard** > **SQL Editor**.

3.  Cole o código e clique em **RUN**.

### **O que o script faz?**

- Adiciona `'Retirada de Laudo'` como opção válida.
- Configura o prefixo `'L'` para essas senhas.
- Define a prioridade na fila de chamada.

---

## 🎨 Mudanças Visuais

### **Totem**
- Layout agora tem **3 colunas** (em telas grandes).
- Botão azul com ícone de documento.

### **Painel / Secretaria**
- Badges (etiquetas) azuis para senhas de Laudo.
- Diferenciação clara entre Normal (Laranja), Preferencial (Laranja Escuro) e Laudo (Azul).

---

## 🧪 Como Testar

1.  Rode o script SQL no Supabase.
2.  Inicie o projeto: `npm run dev`.
3.  Vá para o **Totem** (`/totem`).
4.  Clique em **"Retirada de Laudo"**.
5.  Verifique se gera uma senha `L001`.
6.  Vá para a **Secretaria** (`/secretaria`).
7.  Verifique se a senha aparece na fila.
8.  Clique em "Chamar Próximo" (se houver preferencial, ela deve ser chamada antes).

---

**Desenvolvido com ❤️ para Laboratório Biocenter**  
*"Sempre ao seu lado"*
