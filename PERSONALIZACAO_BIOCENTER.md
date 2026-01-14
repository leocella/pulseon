# 🎨 Personalização Biocenter - v2.2

**Data**: 2026-01-14  
**Versão**: 2.2.0

---

## ✅ Mudanças Implementadas

### **1. Paleta de Cores Laranja Biocenter** 🎨

Toda a interface foi atualizada com a cor laranja oficial do Biocenter (#FF8C00).

**Cores Atualizadas:**
```css
--primary: 33 100% 50%;        /* Laranja principal #FF8C00 */
--normal: 33 100% 50%;          /* Senhas normais - Laranja */
--preferencial: 33 100% 40%;    /* Senhas preferenciais - Laranja escuro */
--chamado: 33 100% 60%;         /* Status chamado - Laranja claro */
--atendimento: 33 100% 35%;     /* Em atendimento - Laranja mais escuro */
```

**Onde Aparece:**
- ✅ Botões principais
- ✅ Badges de senhas
- ✅ Header do painel TV
- ✅ Ícones e destaques
- ✅ Bordas e acentos

---

### **2. Logo Biocenter no Painel TV** 🏢

**Implementação:**
- Logo posicionada no canto superior esquerdo
- Tamanho: 64px de altura (h-16)
- Bordas arredondadas com sombra
- Acompanhada do texto "Laboratório Biocenter" e slogan "Sempre ao seu lado"

**Arquivo:**
- Logo salva em: `public/biocenter-logo.jpg`
- Formato: JPG otimizado
- Dimensões originais preservadas

**Código:**
```tsx
<img 
  src="/biocenter-logo.jpg" 
  alt="Laboratório Biocenter" 
  className="h-16 w-auto rounded-lg shadow-lg"
/>
```

---

### **3. Informações de Clima Integradas** 🌤️

**Componente:** `WeatherWidget.tsx`

**Funcionalidades:**
- ✅ Temperatura atual em °C
- ✅ Condições meteorológicas (ensolarado, nublado, chuva, etc.)
- ✅ Ícones dinâmicos baseados no clima
- ✅ Atualização automática a cada 30 minutos
- ✅ API gratuita (wttr.in) - sem necessidade de chave

**Localização:**
- Configurado para: **Cascavel, PR**
- Pode ser alterado no código do componente

**Ícones de Clima:**
- ☀️ Sol - Tempo ensolarado
- ☁️ Nuvem - Tempo nublado
- 🌧️ Chuva - Tempo chuvoso
- ❄️ Neve - Tempo com neve
- 💨 Vento - Tempo ventoso

**Fallback:**
- Se a API falhar, mostra dados simulados (25°C, Parcialmente nublado)
- Loading state com animação

---

### **4. Relógio com Precisão de Segundos** ⏰

**Implementação:**
- Relógio digital com HH:mm:ss
- Atualização a cada segundo
- Font monospace para melhor legibilidade
- Data abreviada (dd de MMMM)

**Formato:**
```
13:22:45
14 de janeiro
```

**Estilo:**
- Texto branco sobre fundo laranja
- Tamanho grande (text-3xl)
- Ícone de relógio ao lado

---

## 🎯 Layout do Painel TV Atualizado

### **Header (Fundo Laranja Gradiente)**

```
┌─────────────────────────────────────────────────────────────┐
│  [LOGO]  Laboratório Biocenter    [CLIMA]    [RELÓGIO]     │
│          Sempre ao seu lado        25°C      13:22:45       │
│                                 Ensolarado  14 de janeiro   │
└─────────────────────────────────────────────────────────────┘
```

**Elementos:**
1. **Esquerda**: Logo + Nome + Slogan
2. **Centro-Direita**: Widget de Clima
3. **Direita**: Relógio com segundos + Data

---

## 📁 Arquivos Modificados/Criados

### **Novos Arquivos:**
1. ✅ `src/components/WeatherWidget.tsx` - Componente de clima
2. ✅ `public/biocenter-logo.jpg` - Logo do laboratório
3. ✅ `PERSONALIZACAO_BIOCENTER.md` - Esta documentação

### **Arquivos Modificados:**
1. ✅ `src/index.css` - Paleta de cores laranja
2. ✅ `src/pages/Painel.tsx` - Header com logo e clima
3. ✅ `tailwind.config.ts` - (cores já estavam no CSS)

---

## 🌐 API de Clima

### **Provedor:** wttr.in

**Características:**
- ✅ Gratuito
- ✅ Sem necessidade de registro
- ✅ Sem chave de API
- ✅ Dados em tempo real
- ✅ Suporte a português

**Endpoint:**
```
https://wttr.in/Cascavel,PR?format=j1&lang=pt
```

**Dados Retornados:**
- Temperatura atual (°C)
- Condições do tempo
- Código do clima (para ícones)
- Descrição em português

**Atualização:**
- Automática a cada 30 minutos
- Pode ser ajustada no código

---

## ⚙️ Configurações Personalizáveis

### **Alterar Cidade do Clima:**

Edite `src/components/WeatherWidget.tsx`:
```typescript
// Linha 16
const response = await fetch('https://wttr.in/SuaCidade,UF?format=j1&lang=pt');
```

### **Alterar Intervalo de Atualização:**

```typescript
// Linha 43 - Atualmente 30 minutos
const interval = setInterval(fetchWeather, 30 * 60 * 1000);

// Para 15 minutos:
const interval = setInterval(fetchWeather, 15 * 60 * 1000);
```

### **Alterar Logo:**

1. Substitua o arquivo `public/biocenter-logo.jpg`
2. Mantenha o mesmo nome ou atualize o src no código

---

## 🎨 Exemplos de Cores Laranja

### **Tons Utilizados:**

| Uso | HSL | Hex | Descrição |
|-----|-----|-----|-----------|
| Principal | `33 100% 50%` | `#FF8C00` | Laranja Biocenter |
| Claro | `33 100% 60%` | `#FF9F1A` | Chamadas |
| Escuro | `33 100% 40%` | `#CC7000` | Preferencial |
| Mais Escuro | `33 100% 35%` | `#B36200` | Atendimento |
| Muito Claro | `33 100% 96%` | `#FFF5E6` | Backgrounds |

---

## 📱 Responsividade

### **Desktop (Painel TV):**
- Logo: 64px altura
- Clima: Visível completo
- Relógio: 3xl (grande)
- Layout horizontal

### **Mobile/Tablet:**
- Logo: Mantém proporção
- Clima: Pode ser ocultado em telas pequenas
- Relógio: Responsivo
- Layout adaptativo

---

## 🧪 Como Testar

### **1. Testar Paleta Laranja:**
```bash
npm run dev
# Acesse qualquer página
# Verifique botões, badges e destaques em laranja
```

### **2. Testar Logo no Painel:**
```bash
# Acesse
http://localhost:5173/painel

# Verifique:
# - Logo aparece no canto superior esquerdo
# - Texto "Laboratório Biocenter" visível
# - Slogan "Sempre ao seu lado" abaixo
```

### **3. Testar Clima:**
```bash
# No painel TV, verifique:
# - Temperatura aparece
# - Ícone de clima correto
# - Descrição do tempo
# - Atualiza após 30min
```

### **4. Testar Relógio:**
```bash
# Verifique:
# - Segundos atualizando
# - Formato HH:mm:ss
# - Data em português
# - Atualização suave
```

---

## 🎯 Resultado Final

### **Antes:**
- ❌ Cores azuis genéricas
- ❌ Sem identidade visual
- ❌ Sem informações de clima
- ❌ Relógio sem segundos
- ❌ Sem logo

### **Depois:**
- ✅ Cores laranja Biocenter
- ✅ Identidade visual forte
- ✅ Clima integrado
- ✅ Relógio com precisão de segundos
- ✅ Logo prominente
- ✅ Layout profissional

---

## 📊 Impacto Visual

### **Painel TV:**
- **Header**: Fundo laranja gradiente chamativo
- **Logo**: Branding consistente
- **Clima**: Informação útil para pacientes
- **Relógio**: Precisão e profissionalismo

### **Outras Telas:**
- **Totem**: Botões laranja destacados
- **Secretaria**: Interface laranja consistente
- **Admin**: Tema laranja mantido

---

## 🚀 Próximos Passos Sugeridos

### **Curto Prazo:**
- [ ] Adicionar previsão do tempo (próximas horas)
- [ ] Animações suaves no clima
- [ ] Logo animada (opcional)

### **Médio Prazo:**
- [ ] Múltiplas cidades (se tiver filiais)
- [ ] Alertas meteorológicos
- [ ] Tema escuro laranja

### **Longo Prazo:**
- [ ] Integração com calendário
- [ ] Notícias locais
- [ ] Mensagens personalizadas

---

## 📝 Notas Importantes

### **Performance:**
- API de clima é leve e rápida
- Atualização a cada 30min não sobrecarrega
- Logo otimizada para web

### **Compatibilidade:**
- Funciona em todos os navegadores modernos
- Responsivo para diferentes tamanhos de tela
- Fallback para clima offline

### **Manutenção:**
- Logo pode ser trocada facilmente
- Cores centralizadas no CSS
- Clima configurável

---

## 🎉 Conclusão

O sistema agora está **100% personalizado** com a identidade visual do Biocenter:

- ✅ Paleta laranja oficial
- ✅ Logo visível e profissional
- ✅ Informações de clima úteis
- ✅ Relógio preciso com segundos
- ✅ Layout moderno e atraente

**O Painel TV do Biocenter está pronto para impressionar!** 🚀

---

**Desenvolvido com ❤️ para Laboratório Biocenter**
*"Sempre ao seu lado"*
