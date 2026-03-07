// Configuration for the queue system
export const UNIDADE = import.meta.env.VITE_UNIDADE || 'Querência-MT';

// Print service URL (local PC running print service)
export const PRINT_SERVICE_URL = import.meta.env.VITE_PRINT_SERVICE_URL || 'http://localhost:3000/print';

// Polling interval for TV panel (in milliseconds) - backup for realtime
// Aumentado para 10s para reduzir carga em PCs lentos - realtime é o canal primário
export const POLLING_INTERVAL = 10000; // 10 seconds (realtime is primary)
