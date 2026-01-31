require('dotenv').config();

const express = require('express');
const cors = require('cors');

const escpos = require('@node-escpos/core');
const USB = require('@node-escpos/usb-adapter');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 3001);
const VID = parseInt(process.env.USB_VID, 16);
const PID = parseInt(process.env.USB_PID, 16);

/**
 * Imprime um ticket com os dados fornecidos
 */
function printTicket(data, callback) {
  const { id_senha, tipo, data: dataStr, hora } = data;

  try {
    const device = new USB(VID, PID);
    const printer = new escpos.Printer(device, { encoding: 'GB18030' });

    device.open(() => {
      printer
        .hw('init')
        .align('ct')
        .style('b')
        .text('--------------------------------')
        .size(1, 1)
        .text('BIOCENTER')
        .size(0, 0)
        .text('--------------------------------')
        .feed(1)
        .text('SENHA')
        .size(2, 2)
        .text(id_senha)
        .size(0, 0)
        .feed(1)
        .text('TIPO:')
        .size(1, 1)
        .text(tipo.toUpperCase())
        .size(0, 0)
        .feed(1)
        .text('DATA:')
        .text(dataStr)
        .feed(1)
        .text('HORA:')
        .text(hora)
        .feed(1)
        .text('--------------------------------')
        .style('normal')
        .text('Aguarde ser chamado no painel')
        .text('--------------------------------')
        .feed(3)
        .cut()
        .close(() => {
          callback(null);
        });
    });
  } catch (err) {
    callback(new Error(`Erro na impressão: ${err.message}`));
  }
}

// GET /health - Status do servidor
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    usb: {
      vid: `0x${VID.toString(16).padStart(4, '0')}`,
      pid: `0x${PID.toString(16).padStart(4, '0')}`
    }
  });
});

// GET /test - Imprime ticket de teste
app.get('/test', (req, res) => {
  console.log('Executando teste de impressão USB...');

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
        usb: { vid: `0x${VID.toString(16)}`, pid: `0x${PID.toString(16)}` }
      });
    } else {
      console.log('Teste de impressão concluído!');
      res.json({
        success: true,
        message: 'Ticket de teste impresso',
        usb: { vid: `0x${VID.toString(16)}`, pid: `0x${PID.toString(16)}` }
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

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║     BIOCENTER - Servidor de Impressão USB Direto      ║
╠═══════════════════════════════════════════════════════╣
║  Servidor: http://localhost:${PORT}                       ║
║  USB VID:  0x${VID.toString(16).padStart(4, '0')}                                      ║
║  USB PID:  0x${PID.toString(16).padStart(4, '0')}                                      ║
║                                                       ║
║  Endpoints:                                           ║
║    GET  /health  - Status do servidor                 ║
║    GET  /test    - Imprime ticket de teste            ║
║    POST /print   - Imprime senha                      ║
╚═══════════════════════════════════════════════════════╝
  `);
});
