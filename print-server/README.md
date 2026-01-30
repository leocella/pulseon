# Servidor de Impressão Térmica ESC/POS - Biocenter

Este servidor permite impressão direta em impressoras térmicas conectadas via USB no Windows.

## Requisitos

- Windows 10/11
- Node.js 18+ instalado
- Impressora térmica 80mm conectada via USB e configurada como impressora padrão

## Instalação

1. Abra o Prompt de Comando como Administrador
2. Navegue até esta pasta:
   ```cmd
   cd print-server
   ```
3. Instale as dependências:
   ```cmd
   npm install
   ```

## Execução

```cmd
npm start
```

O servidor iniciará na porta 3001 (ou a porta definida em PORT).

## Configuração

### Variáveis de ambiente (opcional):

- `PORT` - Porta do servidor (padrão: 3001)
- `PRINTER_NAME` - Nome da impressora (padrão: impressora padrão do Windows)

### Descobrir nome da impressora:

Execute no PowerShell:
```powershell
Get-Printer | Select-Object Name
```

## Iniciar automaticamente com Windows

1. Crie um atalho para `start.bat`
2. Pressione `Win + R` e digite `shell:startup`
3. Cole o atalho na pasta que abrir

## Testar impressão

Acesse no navegador: `http://localhost:3001/test`

## Endpoints

- `GET /health` - Verifica se o servidor está rodando
- `GET /test` - Imprime página de teste
- `POST /print` - Recebe dados e imprime a senha
