# 🎥 Guia de URLs de Vídeo - YouTube e Vimeo

**Data**: 2026-01-14  
**Versão**: 2.2.2

---

## ✅ Correção Aplicada

**Problema:** URLs do YouTube não apareciam no carrossel de mídias.

**Solução:** Melhorada a função de detecção e conversão de URLs do YouTube para aceitar múltiplos formatos.

---

## 🎬 Formatos de URL Suportados

### **YouTube** ✅

O sistema agora aceita **TODOS** estes formatos de URL do YouTube:

#### **1. URL Padrão (watch)**
```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

#### **2. URL Curta (youtu.be)**
```
https://youtu.be/dQw4w9WgXcQ
```

#### **3. URL de Embed**
```
https://www.youtube.com/embed/dQw4w9WgXcQ
```

#### **4. URL de Vídeo Direto**
```
https://www.youtube.com/v/dQw4w9WgXcQ
```

#### **5. URL Mobile**
```
https://m.youtube.com/watch?v=dQw4w9WgXcQ
```

#### **6. URL de Shorts**
```
https://www.youtube.com/shorts/dQw4w9WgXcQ
```

**Todos os formatos acima funcionam!** O sistema detecta automaticamente e converte para o formato de embed correto.

---

### **Vimeo** ✅

```
https://vimeo.com/123456789
```

---

## 🔧 Como Adicionar Vídeo do YouTube

### **Passo 1: Copiar URL do YouTube**

1. Acesse o vídeo no YouTube
2. Clique em **"Compartilhar"**
3. Copie a URL (qualquer formato funciona!)

**Exemplos:**
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`

### **Passo 2: Adicionar no Admin**

1. Acesse `/admin`
2. Clique em **"Adicionar Mídia"**
3. Selecione **"Link Externo"**
4. Cole a URL do YouTube
5. Adicione uma descrição (opcional)
6. Configure a duração (quanto tempo o vídeo ficará no carrossel)
7. Clique em **"Salvar"**

### **Passo 3: Verificar no Painel**

1. Acesse `/painel`
2. O vídeo deve aparecer no carrossel
3. Ele tocará automaticamente, sem som, em loop

---

## ⚙️ Parâmetros do Embed

O sistema adiciona automaticamente estes parâmetros ao embed do YouTube:

| Parâmetro | Valor | Descrição |
|-----------|-------|-----------|
| `autoplay` | 1 | Inicia automaticamente |
| `mute` | 1 | Sem som |
| `controls` | 0 | Sem controles visíveis |
| `loop` | 1 | Repetir em loop |
| `playlist` | VIDEO_ID | Necessário para loop funcionar |
| `rel` | 0 | Não mostrar vídeos relacionados |
| `modestbranding` | 1 | Remover logo do YouTube |
| `playsinline` | 1 | Reproduzir inline em mobile |

**Resultado:** Vídeo limpo, sem distrações, perfeito para painel TV!

---

## 🐛 Solução de Problemas

### **Vídeo não aparece?**

✅ **Verifique se a URL está correta**
- Teste a URL no navegador
- Certifique-se que o vídeo existe e é público

✅ **Verifique se o vídeo permite embed**
- Alguns vídeos têm restrições de incorporação
- Teste com outro vídeo para confirmar

✅ **Limpe o cache do navegador**
- Pressione Ctrl+Shift+R (Windows)
- Ou Cmd+Shift+R (Mac)

✅ **Verifique o console do navegador**
- Pressione F12
- Veja se há erros na aba Console

---

### **Vídeo aparece mas não toca?**

✅ **Problema de autoplay**
- Alguns navegadores bloqueiam autoplay
- Solução: O vídeo está configurado como muted (sem som)

✅ **Problema de CORS**
- Alguns vídeos têm restrições de domínio
- Solução: Use vídeos públicos sem restrições

---

### **Vídeo toca com som?**

✅ **Verificar parâmetro mute**
- O sistema já adiciona `mute=1` automaticamente
- Se ainda tiver som, pode ser cache do navegador

---

## 📝 Exemplos de URLs Funcionais

### **Vídeos de Teste:**

```
# Rick Roll (clássico!)
https://www.youtube.com/watch?v=dQw4w9WgXcQ

# Vídeo curto de natureza
https://youtu.be/aqz-KE-bpKQ

# Vídeo corporativo
https://www.youtube.com/watch?v=VIDEO_ID
```

---

## 🎨 Dicas de Uso

### **1. Escolha vídeos curtos**
- Vídeos de 30s a 2min são ideais
- Evite vídeos muito longos

### **2. Configure a duração**
- Se o vídeo tem 1min, configure duração de 60s
- O carrossel avançará após esse tempo

### **3. Use vídeos relevantes**
- Institucional da empresa
- Serviços oferecidos
- Campanhas de saúde
- Dicas de bem-estar

### **4. Alterne com imagens**
- Não use só vídeos
- Mix de imagens e vídeos é mais atraente

---

## 🔍 Código da Função de Conversão

```typescript
function getEmbedUrl(url: string): string {
  // Regex que aceita múltiplos formatos do YouTube
  const youtubeRegex = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/|m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  
  if (youtubeMatch) {
    const videoId = youtubeMatch[1];
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&rel=0&modestbranding=1&playsinline=1`;
  }
  
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=1&loop=1&background=1`;
  }
  
  return url;
}
```

---

## 🚀 Teste Rápido

### **1. Adicione um vídeo de teste:**

```bash
# Acesse o admin
http://localhost:5173/admin

# Adicione este vídeo:
https://youtu.be/aqz-KE-bpKQ

# Descrição: "Vídeo de Teste"
# Duração: 30 segundos
```

### **2. Verifique no painel:**

```bash
# Acesse o painel
http://localhost:5173/painel

# O vídeo deve:
# ✅ Aparecer no carrossel
# ✅ Tocar automaticamente
# ✅ Estar sem som
# ✅ Repetir em loop
# ✅ Avançar após 30s
```

---

## 📊 Comparação

### **Antes da Correção:**
- ❌ Apenas alguns formatos de URL funcionavam
- ❌ URLs curtas (youtu.be) não funcionavam
- ❌ URLs de shorts não funcionavam
- ❌ URLs mobile não funcionavam

### **Depois da Correção:**
- ✅ Todos os formatos de URL funcionam
- ✅ Detecção automática melhorada
- ✅ Mais parâmetros de embed
- ✅ Melhor compatibilidade

---

## 🎯 Próximos Passos

Se ainda tiver problemas:

1. **Verifique a URL** - Teste no navegador primeiro
2. **Tente outro vídeo** - Confirme que não é problema do vídeo específico
3. **Limpe o cache** - Ctrl+Shift+R
4. **Verifique o console** - F12 → Console → Procure erros

---

## 📞 Suporte

**Formatos Suportados:**
- ✅ YouTube (todos os formatos)
- ✅ Vimeo
- ✅ URLs diretas de vídeo (.mp4, .webm)
- ✅ URLs diretas de imagem (.jpg, .png, .webp)

**Não Suportados:**
- ❌ Facebook Videos
- ❌ Instagram Videos
- ❌ TikTok Videos
- ❌ Twitter Videos

---

**Desenvolvido com ❤️ para Laboratório Biocenter**  
*"Sempre ao seu lado"*
