const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3001;
const PRINTER_NAME = process.env.PRINTER_NAME || '';

app.use(cors());
app.use(express.json());

// Comandos ESC/POS
const ESC = '\x1B';
const GS = '\x1D';

const ESCPOS = {
  INIT: ESC + '@',                    // Inicializar impressora
  ALIGN_CENTER: ESC + 'a' + '\x01',   // Alinhar centro
  ALIGN_LEFT: ESC + 'a' + '\x00',     // Alinhar esquerda
  BOLD_ON: ESC + 'E' + '\x01',        // Negrito ligado
  BOLD_OFF: ESC + 'E' + '\x00',       // Negrito desligado
  FONT_NORMAL: ESC + '!' + '\x00',    // Fonte normal
  FONT_LARGE: ESC + '!' + '\x30',     // Fonte grande (double height + double width)
  FONT_MEDIUM: ESC + '!' + '\x10',    // Fonte média (double height)
  FEED_LINE: '\n',                     // Nova linha
  FEED_LINES: ESC + 'd' + '\x03',     // Avançar 3 linhas
  CUT_PAPER: GS + 'V' + '\x00',       // Corte total
  CUT_PARTIAL: GS + 'V' + '\x01',     // Corte parcial
};

function buildTicket(data) {
  const { id_senha, tipo, data: dataStr, hora } = data;
  
  const divider = '--------------------------------';
  
  let ticket = '';
  
  // Inicializar impressora
  ticket += ESCPOS.INIT;
  
  // Cabeçalho centralizado
  ticket += ESCPOS.ALIGN_CENTER;
  ticket += ESCPOS.BOLD_ON;
  ticket += divider + ESCPOS.FEED_LINE;
  ticket += ESCPOS.FONT_MEDIUM;
  ticket += 'BIOCENTER' + ESCPOS.FEED_LINE;
  ticket += ESCPOS.FONT_NORMAL;
  ticket += divider + ESCPOS.FEED_LINE;
  ticket += ESCPOS.FEED_LINE;
  
  // Senha - fonte grande
  ticket += 'SENHA' + ESCPOS.FEED_LINE;
  ticket += ESCPOS.FONT_LARGE;
  ticket += id_senha + ESCPOS.FEED_LINE;
  ticket += ESCPOS.FONT_NORMAL;
  ticket += ESCPOS.FEED_LINE;
  
  // Tipo de atendimento
  ticket += 'TIPO:' + ESCPOS.FEED_LINE;
  ticket += ESCPOS.FONT_MEDIUM;
  ticket += tipo.toUpperCase() + ESCPOS.FEED_LINE;
  ticket += ESCPOS.FONT_NORMAL;
  ticket += ESCPOS.FEED_LINE;
  
  // Data e Hora
  ticket += 'DATA:' + ESCPOS.FEED_LINE;
  ticket += dataStr + ESCPOS.FEED_LINE;
  ticket += ESCPOS.FEED_LINE;
  ticket += 'HORA:' + ESCPOS.FEED_LINE;
  ticket += hora + ESCPOS.FEED_LINE;
  ticket += ESCPOS.FEED_LINE;
  
  // Rodapé
  ticket += divider + ESCPOS.FEED_LINE;
  ticket += ESCPOS.BOLD_OFF;
  ticket += 'Aguarde ser chamado no painel' + ESCPOS.FEED_LINE;
  ticket += divider + ESCPOS.FEED_LINE;
  
  // Alimentar papel e cortar
  ticket += ESCPOS.FEED_LINES;
  ticket += ESCPOS.CUT_PARTIAL;
  
  return ticket;
}

function printRaw(content, callback) {
  const tempFile = path.join(os.tmpdir(), `ticket_${Date.now()}.bin`);
  
  // Escrever conteúdo binário no arquivo temporário
  fs.writeFileSync(tempFile, content, 'binary');
  
  // Comando para imprimir diretamente
  let printCommand;
  
  if (PRINTER_NAME) {
    // Impressora específica
    printCommand = `copy /b "${tempFile}" "\\\\%COMPUTERNAME%\\${PRINTER_NAME}"`;
  } else {
    // Usar impressora padrão via PowerShell
    printCommand = `powershell -Command "Get-Content -Path '${tempFile}' -Encoding Byte -Raw | Out-Printer"`;
  }
  
  exec(printCommand, { windowsHide: true }, (error, stdout, stderr) => {
    // Limpar arquivo temporário
    try {
      fs.unlinkSync(tempFile);
    } catch (e) {
      console.error('Erro ao limpar arquivo temporário:', e);
    }
    
    if (error) {
      console.error('Erro de impressão:', error);
      callback(error);
    } else {
      console.log('Impressão enviada com sucesso');
      callback(null);
    }
  });
}

// Alternativa: usar porta COM direta (para impressoras seriais)
function printToSerial(content, portName = 'COM1') {
  const tempFile = path.join(os.tmpdir(), `ticket_${Date.now()}.bin`);
  fs.writeFileSync(tempFile, content, 'binary');
  
  exec(`copy /b "${tempFile}" ${portName}`, { windowsHide: true }, (error) => {
    try { fs.unlinkSync(tempFile); } catch (e) {}
    if (error) console.error('Erro impressão serial:', error);
  });
}

// Alternativa: usar LPT (porta paralela)
function printToLPT(content, lptPort = 'LPT1') {
  const tempFile = path.join(os.tmpdir(), `ticket_${Date.now()}.bin`);
  fs.writeFileSync(tempFile, content, 'binary');
  
  exec(`copy /b "${tempFile}" ${lptPort}`, { windowsHide: true }, (error) => {
    try { fs.unlinkSync(tempFile); } catch (e) {}
    if (error) console.error('Erro impressão LPT:', error);
  });
}

// Usar compartilhamento de impressora Windows (método mais confiável para USB)
function printViaShare(content, printerShare) {
  const tempFile = path.join(os.tmpdir(), `ticket_${Date.now()}.bin`);
  fs.writeFileSync(tempFile, content, 'binary');
  
  // printerShare deve ser no formato: \\COMPUTERNAME\PrinterShareName
  exec(`copy /b "${tempFile}" "${printerShare}"`, { windowsHide: true }, (error) => {
    try { fs.unlinkSync(tempFile); } catch (e) {}
    if (error) console.error('Erro impressão via share:', error);
  });
}

// Endpoint de impressão
app.post('/print', (req, res) => {
  console.log('Recebido pedido de impressão:', req.body);
  
  const { id_senha, tipo, unidade, hora } = req.body;
  
  if (!id_senha || !tipo) {
    return res.status(400).json({ 
      success: false, 
      error: 'Dados incompletos. Necessário: id_senha, tipo' 
    });
  }
  
  // Formatar data atual
  const now = new Date();
  const dataFormatada = now.toLocaleDateString('pt-BR');
  const horaFormatada = hora || now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  const ticketData = {
    id_senha,
    tipo,
    data: dataFormatada,
    hora: horaFormatada
  };
  
  const ticketContent = buildTicket(ticketData);
  
  // Tentar imprimir usando compartilhamento Windows (mais confiável para USB)
  const printerShare = PRINTER_NAME || process.env.PRINTER_SHARE;
  
  if (printerShare && printerShare.startsWith('\\\\')) {
    // Usar compartilhamento de rede/local
    printViaShare(ticketContent, printerShare);
    res.json({ success: true, message: 'Impressão enviada via compartilhamento' });
  } else {
    // Usar método padrão
    printRaw(ticketContent, (error) => {
      if (error) {
        res.status(500).json({ success: false, error: error.message });
      } else {
        res.json({ success: true, message: 'Impressão enviada' });
      }
    });
  }
});

// Endpoint de teste
app.get('/test', (req, res) => {
  const testTicket = buildTicket({
    id_senha: 'A001',
    tipo: 'Normal',
    data: new Date().toLocaleDateString('pt-BR'),
    hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  });
  
  printRaw(testTicket, (error) => {
    if (error) {
      res.status(500).json({ success: false, error: error.message });
    } else {
      res.json({ success: true, message: 'Teste de impressão enviado' });
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    printer: PRINTER_NAME || 'default'
  });
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║     BIOCENTER - Servidor de Impressão Térmica         ║
╠═══════════════════════════════════════════════════════╣
║  Servidor rodando em: http://localhost:${PORT}            ║
║  Impressora: ${(PRINTER_NAME || 'Padrão do Windows').padEnd(38)}  ║
║                                                       ║
║  Endpoints:                                           ║
║    POST /print  - Imprimir senha                      ║
║    GET  /test   - Teste de impressão                  ║
║    GET  /health - Status do servidor                  ║
╚═══════════════════════════════════════════════════════╝
  `);
});
