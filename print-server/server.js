const express = require('express');
const cors = require('cors');
const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3001;

// Nome da impressora USB local instalada no Windows
// Defina via variável de ambiente: PRINTER_NAME=KPOS_80
const PRINTER_NAME = process.env.PRINTER_NAME || 'KPOS_80';

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

/**
 * Imprime dados raw (binários ESC/POS) diretamente para impressora USB local
 * Usa PowerShell com Out-Printer -Name para envio direto sem diálogo/compartilhamento
 * 
 * @param {string} content - Conteúdo ESC/POS a ser impresso
 * @param {function} callback - Callback (error) => void
 */
function printRaw(content, callback) {
  const tempFile = path.join(os.tmpdir(), `ticket_${Date.now()}.bin`);

  try {
    // Escrever conteúdo binário no arquivo temporário
    fs.writeFileSync(tempFile, content, 'binary');

    // PowerShell: Lê o arquivo como bytes e envia direto para a impressora local
    // -Encoding Byte preserva os comandos ESC/POS
    // -Name especifica a impressora USB local (sem compartilhamento)
    const escapedPath = tempFile.replace(/\\/g, '\\\\').replace(/'/g, "''");
    const escapedPrinter = PRINTER_NAME.replace(/'/g, "''");

    const psCommand = `
      $bytes = [System.IO.File]::ReadAllBytes('${escapedPath}')
      $stream = [System.IO.MemoryStream]::new($bytes)
      $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::GetEncoding(437))
      $content = $reader.ReadToEnd()
      $reader.Close()
      $stream.Close()
      $content | Out-Printer -Name '${escapedPrinter}'
    `.replace(/\n/g, ' ');

    const printCommand = `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "${psCommand}"`;

    exec(printCommand, { windowsHide: true, timeout: 30000 }, (error, stdout, stderr) => {
      // Limpar arquivo temporário
      cleanupTempFile(tempFile);

      if (error) {
        console.error('Erro de impressão:', error.message);
        if (stderr) console.error('Stderr:', stderr);
        callback(new Error(`Falha na impressão: ${error.message}`));
      } else {
        console.log('Impressão enviada com sucesso para:', PRINTER_NAME);
        callback(null);
      }
    });
  } catch (err) {
    cleanupTempFile(tempFile);
    console.error('Erro ao preparar impressão:', err);
    callback(err);
  }
}

/**
 * Método alternativo: Impressão via RawPrint (porta física)
 * Útil se a impressora estiver mapeada para uma porta específica
 * 
 * @param {string} content - Conteúdo ESC/POS
 * @param {string} portName - Nome da porta (ex: USB001, COM1, LPT1)
 * @param {function} callback - Callback
 */
function printToPort(content, portName, callback) {
  const tempFile = path.join(os.tmpdir(), `ticket_${Date.now()}.bin`);

  try {
    fs.writeFileSync(tempFile, content, 'binary');

    // copy /b para porta física (USB001, COM1, LPT1)
    exec(`copy /b "${tempFile}" ${portName}`, { windowsHide: true, timeout: 30000 }, (error) => {
      cleanupTempFile(tempFile);

      if (error) {
        console.error(`Erro impressão via porta ${portName}:`, error);
        callback(error);
      } else {
        console.log(`Impressão enviada para porta: ${portName}`);
        callback(null);
      }
    });
  } catch (err) {
    cleanupTempFile(tempFile);
    callback(err);
  }
}

/**
 * Limpa arquivo temporário de forma segura
 */
function cleanupTempFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (e) {
    console.error('Aviso: Erro ao limpar arquivo temporário:', e.message);
  }
}

/**
 * Verifica se a impressora está disponível no Windows
 */
function checkPrinterAvailable() {
  try {
    const result = execSync(
      `powershell -NoProfile -Command "Get-Printer -Name '${PRINTER_NAME}' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name"`,
      { encoding: 'utf8', windowsHide: true, timeout: 10000 }
    ).trim();

    return result === PRINTER_NAME;
  } catch (e) {
    return false;
  }
}

/**
 * Lista impressoras disponíveis no Windows
 */
function listPrinters() {
  try {
    const result = execSync(
      `powershell -NoProfile -Command "Get-Printer | Select-Object -ExpandProperty Name"`,
      { encoding: 'utf8', windowsHide: true, timeout: 10000 }
    );
    return result.trim().split('\n').map(p => p.trim()).filter(p => p);
  } catch (e) {
    console.error('Erro ao listar impressoras:', e.message);
    return [];
  }
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

  // Imprimir diretamente na impressora USB local
  printRaw(ticketContent, (error) => {
    if (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        printer: PRINTER_NAME
      });
    } else {
      res.json({
        success: true,
        message: 'Impressão enviada',
        printer: PRINTER_NAME
      });
    }
  });
});

// Endpoint de teste
app.get('/test', (req, res) => {
  console.log('Executando teste de impressão...');

  const testTicket = buildTicket({
    id_senha: 'T001',
    tipo: 'TESTE',
    data: new Date().toLocaleDateString('pt-BR'),
    hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  });

  printRaw(testTicket, (error) => {
    if (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        printer: PRINTER_NAME
      });
    } else {
      res.json({
        success: true,
        message: 'Teste de impressão enviado',
        printer: PRINTER_NAME
      });
    }
  });
});

// Health check com verificação de impressora
app.get('/health', (req, res) => {
  const printerAvailable = checkPrinterAvailable();

  res.json({
    status: printerAvailable ? 'ok' : 'warning',
    timestamp: new Date().toISOString(),
    printer: PRINTER_NAME,
    printerAvailable: printerAvailable,
    message: printerAvailable
      ? 'Impressora disponível'
      : `Impressora '${PRINTER_NAME}' não encontrada no sistema`
  });
});

// Listar impressoras disponíveis
app.get('/printers', (req, res) => {
  const printers = listPrinters();
  const currentAvailable = printers.includes(PRINTER_NAME);

  res.json({
    configured: PRINTER_NAME,
    configuredAvailable: currentAvailable,
    available: printers
  });
});

// Inicialização do servidor
app.listen(PORT, () => {
  const printerAvailable = checkPrinterAvailable();
  const printers = listPrinters();

  console.log(`
╔═══════════════════════════════════════════════════════╗
║     BIOCENTER - Servidor de Impressão Térmica         ║
╠═══════════════════════════════════════════════════════╣
║  Servidor rodando em: http://localhost:${PORT}            ║
║  Impressora USB: ${PRINTER_NAME.padEnd(35)}  ║
║  Status: ${(printerAvailable ? '✓ Disponível' : '✗ Não encontrada').padEnd(43)}  ║
║                                                       ║
║  Endpoints:                                           ║
║    POST /print    - Imprimir senha                    ║
║    GET  /test     - Teste de impressão                ║
║    GET  /health   - Status do servidor                ║
║    GET  /printers - Listar impressoras                ║
╚═══════════════════════════════════════════════════════╝
  `);

  if (!printerAvailable) {
    console.log(`⚠ AVISO: Impressora '${PRINTER_NAME}' não encontrada!`);
    console.log('  Impressoras disponíveis:');
    printers.forEach(p => console.log(`    - ${p}`));
    console.log(`\n  Configure a variável de ambiente PRINTER_NAME com uma das impressoras acima.\n`);
  }
});
