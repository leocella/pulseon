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
  const t = String(tipo || '').trim();
  const tipoMap: Record<string, string> = {
    'Normal': 'NORMAL',
    'Preferencial': 'PREFERENCIAL',
    'Agendado': 'AGENDADO',
    'Retirada de Resultado': 'RETIRADA DE RESULTADO',
  };
  
  // Tenta encontrar match exato ou case-insensitive
  if (tipoMap[t]) return tipoMap[t];
  
  const entry = Object.entries(tipoMap).find(([k]) => k.toLowerCase() === t.toLowerCase());
  return entry ? entry[1] : t.toUpperCase();
}

export async function printTicket(payload: PrintPayload, retries = 2): Promise<boolean> {
  const now = new Date();
  const baseUrl = getPrintServerBaseUrl();
  const printUrl = `${baseUrl}/print`;

  // Garante que o número da senha nunca seja undefined/null
  const ticketNumber = payload?.id_senha || (payload as any)?.senha || 'ERRO';
  const tipoDisplay = getTipoDisplay(payload.tipo);

  if (ticketNumber === 'ERRO' || !ticketNumber) {
    console.error('[PrintService] ERRO: id_senha está undefined!', payload);
    return false;
  }

  const printData = {
    id_senha: ticketNumber,
    // Retrocompatibilidade
    senha: ticketNumber,
    tipo: tipoDisplay,
    unidade: stripDiacritics(payload.unidade || ''),
    hora: format(now, 'HH:mm'),
    data: format(now, 'dd/MM/yyyy', { locale: ptBR }),
    client: 'totem-web',
  };

  console.log(`[PrintService] Enviando ${ticketNumber} (${tipoDisplay}) para ${printUrl}`);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      // Aumentado para 4s para evitar aborts falsos em redes instáveis
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      console.log(`[PrintService] Fetch para ${printUrl} com corpo:`, JSON.stringify(printData, null, 2));

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
        console.log(`[PrintService] Impressão ${ticketNumber} OK`);
        return true;
      } else {
        const errorText = await response.text();
        console.warn(`[PrintService] Tentativa ${attempt + 1}/${retries + 1} falhou: HTTP ${response.status}`, errorText.substring(0, 100));
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`[PrintService] Tentativa ${attempt + 1}: timeout (4s)`);
      } else {
        console.error(`[PrintService] Tentativa ${attempt + 1} erro:`, error);
      }

      if (attempt === retries) {
        return false;
      }

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
