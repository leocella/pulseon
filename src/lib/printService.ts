import { PRINT_SERVICE_URL } from './config';
import type { PrintPayload } from '@/types/queue';
import { format } from 'date-fns';

export async function printTicket(payload: PrintPayload, retries = 1): Promise<boolean> {
  const printData = {
    ...payload,
    hora: format(new Date(), 'HH:mm'),
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(PRINT_SERVICE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(printData),
      });

      if (response.ok) {
        return true;
      }
    } catch (error) {
      console.error(`Print attempt ${attempt + 1} failed:`, error);
      if (attempt === retries) {
        return false;
      }
    }
  }

  return false;
}
