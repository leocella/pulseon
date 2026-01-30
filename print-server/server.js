require('dotenv').config();
const express = require('express');
const cors = require('cors');
const escpos = require('escpos');
escpos.USB = require('escpos-usb');

const app = express();
const PORT = process.env.PORT || 3001;
const USB_VID = parseInt(process.env.USB_VID, 16) || 0x0416;
const USB_PID = parseInt(process.env.USB_PID, 16) || 0x5011;

app.use(cors());
app.use(express.json());

/**
 * Conecta à impressora USB e retorna device + printer
 */
function getUSBPrinter() {
  const device = new escpos.USB(USB_VID, USB_PID);
  const printer = new escpos.Printer(device, { encoding: 'CP860' });
  return { device, printer };
}

/**
 * Imprime um ticket com os dados fornecidos
 */
function printTicket(data, callback) {
  const { id_senha, tipo, data: dataStr, hora } = data;

  let device, printer;

  try {
    const usb = getUSBPrinter();
    device = usb.device;
    printer = usb.printer;
  } catch (err) {
    return callback(new Error(`Impressora USB não encontrada (VID:${USB_VID.toString(16)} PID:${USB_PID.toString(16)}): ${err.message}`));
  }

  device.open((err) => {
    if (err) {
      return callback(new Error(`Erro ao abrir dispositivo USB: ${err.message}`));
    }

    try {
      printer
        .font('A')
        .align('CT')
        .style('B')
        .text('--------------------------------')
        .size(1, 1)
        .text('BIOCENTER')
        .size(0, 0)
        .text('--------------------------------')
        .text('')
        .text('SENHA')
        .size(2, 2)
        .text(id_senha)
        .size(0, 0)
        .text('')
        .text('TIPO:')
        .size(1, 1)
        .text(tipo.toUpperCase())
        .size(0, 0)
        .text('')
        .text('DATA:')
        .text(dataStr)
        .text('')
        .text('HORA:')
        .text(hora)
        .text('')
        .text('--------------------------------')
        .style('NORMAL')
        .text('Aguarde ser chamado no painel')
        .text('--------------------------------')
        .feed(3)
        .cut()
        .close(() => {
          callback(null);
        });
    } catch (printErr) {
      callback(new Error(`Erro durante impressão: ${printErr.message}`));
    }
  });
}

// GET /health - Status do servidor
app.get('/health', (req, res) => {
  let printerStatus = 'unknown';
  let printerError = null;

  try {
    const devices = escpos.USB.findPrinter();
    const found = devices.some(d =>
      d.deviceDescriptor.idVendor === USB_VID &&
      d.deviceDescriptor.idProduct === USB_PID
    );
    printerStatus = found ? 'connected' : 'not_found';
  } catch (err) {
    printerStatus = 'error';
    printerError = err.message;
  }

  res.json({
    status: printerStatus === 'connected' ? 'ok' : 'warning',
    timestamp: new Date().toISOString(),
    usb: {
      vid: `0x${USB_VID.toString(16).padStart(4, '0')}`,
      pid: `0x${USB_PID.toString(16).padStart(4, '0')}`
    },
    printer: {
      status: printerStatus,
      error: printerError
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
        usb: { vid: `0x${USB_VID.toString(16)}`, pid: `0x${USB_PID.toString(16)}` }
      });
    } else {
      console.log('Teste de impressão concluído!');
      res.json({
        success: true,
        message: 'Ticket de teste impresso',
        usb: { vid: `0x${USB_VID.toString(16)}`, pid: `0x${USB_PID.toString(16)}` }
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
  let printerFound = false;

  try {
    const devices = escpos.USB.findPrinter();
    printerFound = devices.some(d =>
      d.deviceDescriptor.idVendor === USB_VID &&
      d.deviceDescriptor.idProduct === USB_PID
    );
  } catch (e) { }

  console.log(`
╔═══════════════════════════════════════════════════════╗
║     BIOCENTER - Servidor de Impressão USB Direto      ║
╠═══════════════════════════════════════════════════════╣
║  Servidor: http://localhost:${PORT}                       ║
║  USB VID:  0x${USB_VID.toString(16).padStart(4, '0')}                                      ║
║  USB PID:  0x${USB_PID.toString(16).padStart(4, '0')}                                      ║
║  Status:   ${(printerFound ? '✓ Impressora conectada' : '✗ Impressora não encontrada').padEnd(39)} ║
║                                                       ║
║  Endpoints:                                           ║
║    GET  /health  - Status do servidor                 ║
║    GET  /test    - Imprime ticket de teste            ║
║    POST /print   - Imprime senha                      ║
╚═══════════════════════════════════════════════════════╝
  `);

  if (!printerFound) {
    console.log('⚠ AVISO: Impressora USB não detectada!');
    console.log('  Verifique:');
    console.log('  - Cabo USB conectado');
    console.log('  - Impressora ligada');
    console.log(`  - VID/PID corretos no .env (atual: 0x${USB_VID.toString(16)}/0x${USB_PID.toString(16)})`);
    console.log('');
  }
});
