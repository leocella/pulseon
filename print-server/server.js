const path = require('path');
// IMPORTANT: garante que o servidor sempre leia o .env da pasta print-server,
// mesmo quando o processo é iniciado com o cwd diferente (ex.: iniciando pelo root).
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const net = require('net');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração da impressora de rede
const PRINTER_IP = process.env.PRINTER_IP || '192.168.1.100';
const PRINTER_PORT = parseInt(process.env.PRINTER_PORT, 10) || 9100;

app.use(cors());
app.use(express.json());

/**
 * Envia comandos ESC/POS para impressora via TCP/IP
 */
function sendToPrinter(data, callback) {
  const client = new net.Socket();
  let connected = false;

  client.setTimeout(5000);

  client.on('timeout', () => {
    client.destroy();
    if (!connected) {
      callback(new Error('Timeout ao conectar na impressora'));
    }
  });

  client.on('error', (err) => {
    callback(new Error(`Erro de conexão: ${err.message}`));
  });

  client.connect(PRINTER_PORT, PRINTER_IP, () => {
    connected = true;
    client.write(data, () => {
      client.end();
      callback(null);
    });
  });

  client.on('close', () => {
    if (connected) {
      // Conexão fechada normalmente após envio
    }
  });
}

/**
 * Gera comandos ESC/POS para o ticket
 */
function generateTicketCommands(data) {
  const { id_senha, tipo, data: dataStr, hora } = data;

  // Comandos ESC/POS
  const ESC = '\x1B';
  const GS = '\x1D';

  // Inicialização
  const INIT = ESC + '@';
  // Centralizar
  const CENTER = ESC + 'a' + '\x01';
  // Esquerda
  const LEFT = ESC + 'a' + '\x00';
  // Negrito ON/OFF
  const BOLD_ON = ESC + 'E' + '\x01';
  const BOLD_OFF = ESC + 'E' + '\x00';
  // Tamanho duplo (largura e altura)
  const SIZE_NORMAL = GS + '!' + '\x00';
  const SIZE_DOUBLE = GS + '!' + '\x11';
  const SIZE_LARGE = GS + '!' + '\x22';
  // Corte de papel
  const CUT = GS + 'V' + '\x00';
  // Alimentar linhas
  const FEED = ESC + 'd' + '\x03';

  let commands = '';

  // Inicializar impressora
  commands += INIT;

  // Cabeçalho
  commands += CENTER;
  commands += BOLD_ON;
  commands += '--------------------------------\n';
  commands += SIZE_DOUBLE;
  commands += 'BIOCENTER\n';
  commands += SIZE_NORMAL;
  commands += '--------------------------------\n';
  commands += '\n';

  // Senha
  commands += 'SENHA\n';
  commands += SIZE_LARGE;
  commands += id_senha + '\n';
  commands += SIZE_NORMAL;
  commands += '\n';

  // Tipo
  commands += 'TIPO:\n';
  commands += SIZE_DOUBLE;
  commands += tipo.toUpperCase() + '\n';
  commands += SIZE_NORMAL;
  commands += '\n';

  // Data e Hora
  commands += 'DATA: ' + dataStr + '\n';
  commands += 'HORA: ' + hora + '\n';
  commands += '\n';

  // Rodapé
  commands += '--------------------------------\n';
  commands += BOLD_OFF;
  commands += 'Aguarde ser chamado no painel\n';
  commands += '--------------------------------\n';

  // Alimentar e cortar
  commands += FEED;
  commands += CUT;

  return commands;
}

/**
 * Imprime um ticket com os dados fornecidos
 */
function printTicket(data, callback) {
  const commands = generateTicketCommands(data);

  sendToPrinter(Buffer.from(commands, 'latin1'), (err) => {
    if (err) {
      callback(err);
    } else {
      callback(null);
    }
  });
}

/**
 * Testa conexão com a impressora
 */
function testPrinterConnection(callback) {
  const client = new net.Socket();
  let connected = false;

  client.setTimeout(3000);

  client.on('timeout', () => {
    client.destroy();
    callback(new Error('Timeout'));
  });

  client.on('error', (err) => {
    callback(new Error(err.message));
  });

  client.connect(PRINTER_PORT, PRINTER_IP, () => {
    connected = true;
    client.end();
    callback(null);
  });

  client.on('close', () => {
    if (connected) {
      // OK
    }
  });
}

// GET /health - Status do servidor
app.get('/health', (req, res) => {
  testPrinterConnection((err) => {
    const printerStatus = err ? 'offline' : 'online';

    res.json({
      status: err ? 'warning' : 'ok',
      timestamp: new Date().toISOString(),
      printer: {
        type: 'network',
        ip: PRINTER_IP,
        port: PRINTER_PORT,
        status: printerStatus,
        error: err ? err.message : null
      }
    });
  });
});

// GET /test - Imprime ticket de teste
app.get('/test', (req, res) => {
  console.log(`Executando teste de impressão via rede (${PRINTER_IP}:${PRINTER_PORT})...`);

  const now = new Date();
  const testData = {
    id_senha: 'T001',
    tipo: 'TESTE',
    data: now.toLocaleDateString('pt-BR'),
    hora: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  };

  printTicket(testData, (err) => {
    if (err) {
      console.error('Erro no teste:', err.message);
      res.status(500).json({
        success: false,
        error: err.message,
        printer: { ip: PRINTER_IP, port: PRINTER_PORT }
      });
    } else {
      console.log('Teste de impressão concluído!');
      res.json({
        success: true,
        message: 'Ticket de teste impresso',
        printer: { ip: PRINTER_IP, port: PRINTER_PORT }
      });
    }
  });
});

// POST /print - Imprime senha
app.post('/print', (req, res) => {
  console.log('Recebido pedido de impressão:', req.body);

  const { id_senha, tipo, hora } = req.body;

  if (!id_senha || !tipo) {
    return res.status(400).json({
      success: false,
      error: 'Dados incompletos. Necessário: id_senha, tipo'
    });
  }

  const now = new Date();
  const ticketData = {
    id_senha,
    tipo,
    data: now.toLocaleDateString('pt-BR'),
    hora: hora || now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  };

  printTicket(ticketData, (err) => {
    if (err) {
      console.error('Erro na impressão:', err.message);
      res.status(500).json({
        success: false,
        error: err.message
      });
    } else {
      console.log('Impressão concluída:', id_senha);
      res.json({
        success: true,
        message: 'Impressão enviada',
        id_senha
      });
    }
  });
});

// Rota para o botão "Testar Conexão" do Lovable não dar 404
app.all('/', (req, res) => {
  res.json({ success: true, message: "Servidor Biocenter alcançado!" });
});

// Caso o Lovable use o endpoint /print para testar
app.get('/print', (req, res) => {
  res.json({ message: "Endpoint de impressão ativo. Use POST para imprimir." });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║     BIOCENTER - Servidor de Impressão via Rede        ║
╠═══════════════════════════════════════════════════════╣
║  Servidor HTTP:  http://localhost:${PORT}                 ║
║  Impressora IP:  ${PRINTER_IP.padEnd(36)}║
║  Impressora Porta: ${String(PRINTER_PORT).padEnd(34)}║
║                                                       ║
║  Endpoints:                                           ║
║    GET  /health  - Status do servidor e impressora    ║
║    GET  /test    - Imprime ticket de teste            ║
║    POST /print   - Imprime senha                      ║
╚═══════════════════════════════════════════════════════╝
  `);

  // Testar conexão inicial
  testPrinterConnection((err) => {
    if (err) {
      console.log('⚠ AVISO: Impressora não está respondendo!');
      console.log(`  IP: ${PRINTER_IP}:${PRINTER_PORT}`);
      console.log('  Verifique:');
      console.log('  - Impressora ligada e conectada na rede');
      console.log('  - IP correto no arquivo .env');
      console.log('');
    } else {
      console.log(`✓ Impressora conectada em ${PRINTER_IP}:${PRINTER_PORT}`);
      console.log('');
    }
  });
});
