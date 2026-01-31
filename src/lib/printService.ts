import type { PrintPayload } from '@/types/queue';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function stripDiacritics(input: string): string {
  // Impressoras térmicas/ESC-POS frequentemente não lidam bem com UTF-8/acentos.
  // Remover diacríticos evita caracteres “quebrados” (ex.: Guaíra -> Guaira).
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Obtém URL do servidor de impressão do localStorage ou usa padrão
function getPrintServerUrl(): string {
  try {
    const saved = localStorage.getItem('totem_print_server_ip');
    if (saved) {
      const { ip, port } = JSON.parse(saved);
      return `http://${ip}:${port}`;
    }
  } catch (e) {
    console.error('[PrintService] Erro ao ler configuração:', e);
  }
  // Fallback para variável de ambiente ou localhost
  return import.meta.env.VITE_PRINT_SERVICE_URL?.replace('/print', '') || 'http://localhost:3000';
}

// Mapeia tipo para prefixo legível
function getTipoDisplay(tipo: string): string {
  const tipoMap: Record<string, string> = {
    'Normal': 'NORMAL',
    'Preferencial': 'PREFERENCIAL',
    'Retirada de Laudo': 'RETIRADA DE LAUDO',
  };
  return tipoMap[tipo] || tipo.toUpperCase();
}

export async function printTicket(payload: PrintPayload, retries = 2): Promise<boolean> {
  const now = new Date();
  const baseUrl = getPrintServerUrl();
  const printUrl = `${baseUrl}/print`;

  // Sempre prioriza o número humano (ex.: A006). Em alguns fluxos antigos,
  // o backend pode esperar a chave `senha`, então enviamos ambas.
  const ticketNumber = (payload as any)?.id_senha ?? '';

  const printData = {
    id_senha: ticketNumber,
    // Retrocompatibilidade: alguns print-servers antigos usam `senha`
    // para imprimir o número. Garantimos que seja o mesmo número humano.
    senha: ticketNumber,
    tipo: getTipoDisplay(payload.tipo),
    unidade: stripDiacritics(payload.unidade),
    hora: format(now, 'HH:mm'),
    data: format(now, 'dd/MM/yyyy', { locale: ptBR }),
    client: 'totem-web',
  };

  console.log('[PrintService] URL do servidor:', printUrl);
  console.log('[PrintService] Enviando para impressora:', printData);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch(printUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(printData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        console.log('[PrintService] Impressão bem-sucedida:', result);
        return true;
      } else {
        console.warn(`[PrintService] Tentativa ${attempt + 1} falhou: HTTP ${response.status}`);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`[PrintService] Tentativa ${attempt + 1}: timeout`);
      } else {
        console.error(`[PrintService] Tentativa ${attempt + 1} erro:`, error);
      }

      if (attempt === retries) {
        return false;
      }

      // Aguardar antes de tentar novamente
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return false;
}

// Verificar se o servidor de impressão está online
export async function checkPrintServer(): Promise<boolean> {
  try {
    const baseUrl = getPrintServerUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`${baseUrl}/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}
