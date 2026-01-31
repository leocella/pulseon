import type { PrintPayload } from '@/types/queue';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { getPrintServerBaseUrl } from '@/lib/printServerConfig';

function stripDiacritics(input: string): string {
  // Impressoras térmicas/ESC-POS frequentemente não lidam bem com UTF-8/acentos.
  // Remover diacríticos evita caracteres “quebrados” (ex.: Guaíra -> Guaira).
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
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
  const baseUrl = getPrintServerBaseUrl();
  const printUrl = `${baseUrl}/print`;

  // Garante que o número da senha nunca seja undefined/null
  const ticketNumber = payload?.id_senha || (payload as any)?.senha || 'ERRO';

  if (ticketNumber === 'ERRO' || !ticketNumber) {
    console.error('[PrintService] ERRO: id_senha está undefined!', payload);
    return false;
  }

  const printData = {
    id_senha: ticketNumber,
    // Retrocompatibilidade: alguns print-servers antigos usam `senha`
    senha: ticketNumber,
    tipo: getTipoDisplay(payload.tipo),
    unidade: stripDiacritics(payload.unidade),
    hora: format(now, 'HH:mm'),
    data: format(now, 'dd/MM/yyyy', { locale: ptBR }),
    client: 'totem-web',
  };

  console.log('[PrintService] URL do servidor:', printUrl);
  console.log('[PrintService] Enviando para impressora:', JSON.stringify(printData));

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

      // Verificar tipo de resposta antes de parsear
      const contentType = response.headers.get('content-type') || '';

      if (response.ok) {
        if (contentType.includes('application/json')) {
          const result = await response.json();
          console.log('[PrintService] Impressão bem-sucedida:', result);
        } else {
          console.log('[PrintService] Impressão OK (resposta não-JSON)');
        }
        return true;
      } else {
        const errorText = await response.text();
        console.warn(`[PrintService] Tentativa ${attempt + 1} falhou: HTTP ${response.status}`, errorText.substring(0, 200));
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
    const baseUrl = getPrintServerBaseUrl();
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
