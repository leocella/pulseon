# BIOCENTER - Servidor de Impressão Térmica

Servidor Node.js para impressão de senhas em impressoras térmicas ESC/POS via USB local.

## Requisitos

- **Windows 10/11** (x64)
- **Node.js 18+**
- **Impressora térmica USB** instalada localmente (ex: KPOS_80)
- Papel 80mm

## Instalação

1. Execute `install.bat` (ou `npm install` no terminal)
2. Configure o nome da impressora em `start.bat`
3. Execute `start.bat` para iniciar o servidor

## Configuração da Impressora

### Verificar nome da impressora no Windows

1. Abra **Painel de Controle > Dispositivos e Impressoras**
2. Anote o nome EXATO da impressora (ex: `KPOS_80`)
3. Edite `start.bat` e altere a linha:
   ```batch
   set PRINTER_NAME=SuaImpressora
   ```

Ou via PowerShell para listar impressoras:
```powershell
Get-Printer | Select-Object Name
```

### Variável de Ambiente

Você também pode definir a variável globalmente no sistema:

```batch
setx PRINTER_NAME "KPOS_80"
```

## Uso

### Iniciar o servidor

```batch
start.bat
```

Ou via terminal:
```batch
set PRINTER_NAME=KPOS_80
node server.js
```

### Endpoints

| Método | Endpoint    | Descrição                          |
|--------|-------------|-------------------------------------|
| POST   | `/print`    | Imprimir senha                     |
| GET    | `/test`     | Imprime ticket de teste            |
| GET    | `/health`   | Status do servidor e impressora    |
| GET    | `/printers` | Lista impressoras do Windows       |

### Exemplo de impressão

```bash
curl -X POST http://localhost:3001/print \
  -H "Content-Type: application/json" \
  -d '{"id_senha": "A001", "tipo": "Normal"}'
```

### Verificar impressoras disponíveis

```bash
curl http://localhost:3001/printers
```

Retorna:
```json
{
  "configured": "KPOS_80",
  "configuredAvailable": true,
  "available": ["KPOS_80", "Microsoft Print to PDF", "OneNote"]
}
```

## Funcionamento Técnico

- **Protocolo**: ESC/POS (comandos binários)
- **Método de impressão**: PowerShell `Out-Printer -Name` com encoding 437 (IBM PC)
- **Sem compartilhamento**: Impressora é acessada diretamente via driver USB
- **Sem diálogo**: Impressão silenciosa (windowsHide: true)

## Recursos do Ticket

- Cabeçalho "BIOCENTER" centralizado
- Número da senha em **fonte grande**
- Tipo de atendimento
- Data e hora
- Corte automático de papel

## Solução de Problemas

### Impressora não encontrada

1. Verifique se a impressora está instalada no Windows
2. Confirme o nome exato da impressora
3. Acesse `http://localhost:3001/printers` para ver as impressoras disponíveis

### Erro de permissão PowerShell

Execute como administrador:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### Caracteres estranhos na impressão

Verifique se a impressora suporta ESC/POS e está configurada como impressora genérica (Generic / Text Only).

## Estrutura de Arquivos

```
print-server/
├── server.js      # Servidor Express + lógica ESC/POS
├── package.json   # Dependências
├── install.bat    # Instalador (npm install)
├── start.bat      # Inicialização (com PRINTER_NAME)
└── README.md      # Este arquivo
```

## Produção (24/7)

Para uso em produção em totens:

1. Instale o servidor como serviço Windows usando [node-windows](https://www.npmjs.com/package/node-windows) ou [NSSM](https://nssm.cc/)
2. Configure para iniciar automaticamente com o Windows
3. Monitore via endpoint `/health`

Exemplo com NSSM:
```batch
nssm install BiocenterPrint "C:\nodejs\node.exe" "C:\print-server\server.js"
nssm set BiocenterPrint AppEnvironmentExtra PRINTER_NAME=KPOS_80
nssm start BiocenterPrint
```
