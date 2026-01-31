export const PRINT_SERVER_STORAGE_KEY = 'totem_print_server_ip';

export const DEFAULT_PRINT_SERVER_IP = 'localhost';
export const DEFAULT_PRINT_SERVER_PORT = '3000';

export function normalizeHostAndPort(
  rawIp?: string,
  rawPort?: string
): { ip: string; port: string } {
  let ip = (rawIp || '').trim();
  let port = (rawPort || '').trim();

  // Remove protocolo e qualquer caminho
  ip = ip.replace(/^https?:\/\//i, '');
  ip = ip.split('/')[0];
  ip = ip.replace(/\s+/g, '');

  // Se o usuário digitar "IP:PORTA" no campo IP, extrai automaticamente a porta
  // (IPv6 não é suportado aqui — não é o caso típico deste cenário.)
  const lastColon = ip.lastIndexOf(':');
  if (lastColon > -1) {
    const maybePort = ip.slice(lastColon + 1);
    const host = ip.slice(0, lastColon);
    if (/^\d+$/.test(maybePort)) {
      ip = host;
      port = maybePort;
    }
  }

  // Limita a porta a dígitos (evita "3000/" etc.)
  port = port.replace(/\D+/g, '');

  return {
    ip: ip || DEFAULT_PRINT_SERVER_IP,
    port: port || DEFAULT_PRINT_SERVER_PORT,
  };
}

function baseUrlFromEnv(): string | null {
  const envUrl = import.meta.env.VITE_PRINT_SERVICE_URL as string | undefined;
  if (!envUrl) return null;

  // Aceita tanto origin (http://x:3000) quanto url com path (http://x:3000/print)
  try {
    const u = new URL(envUrl);
    return `${u.protocol}//${u.host}`;
  } catch {
    // Alguns setups podem setar sem protocolo; tentamos tratar como host
    const normalized = normalizeHostAndPort(envUrl, '');
    return `http://${normalized.ip}:${normalized.port}`;
  }
}

export function getPrintServerBaseUrl(): string {
  // 1) Preferência: variável de ambiente (útil para testes locais)
  const envBase = baseUrlFromEnv();
  if (envBase) return envBase;

  // 2) Configuração do Totem (localStorage)
  try {
    const saved = localStorage.getItem(PRINT_SERVER_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const normalized = normalizeHostAndPort(parsed?.ip, parsed?.port);
      return `http://${normalized.ip}:${normalized.port}`;
    }
  } catch (e) {
    console.error('[printServerConfig] Erro ao ler configuração:', e);
  }

  // 3) Padrão
  return `http://${DEFAULT_PRINT_SERVER_IP}:${DEFAULT_PRINT_SERVER_PORT}`;
}

export function savePrintServerConfig(rawIp: string, rawPort: string): { ip: string; port: string } {
  const normalized = normalizeHostAndPort(rawIp, rawPort);
  localStorage.setItem(PRINT_SERVER_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}
