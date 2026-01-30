import { PRINT_SERVICE_URL } from './config';
import type { PrintPayload } from '@/types/queue';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export async function printTicket(payload: PrintPayload, retries = 2): Promise<boolean> {
  const now = new Date();
  
  const printData = {
    id_senha: payload.id_senha,
    tipo: payload.tipo,
    unidade: payload.unidade,
    hora: format(now, 'HH:mm'),
    data: format(now, 'dd/MM/yyyy', { locale: ptBR }),
  };

  console.log('[PrintService] Enviando para impressora:', printData);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
      
      const response = await fetch(PRINT_SERVICE_URL, {
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    const response = await fetch(PRINT_SERVICE_URL.replace('/print', '/health'), {
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}
