// Configuration for the queue system
export const UNIDADE = import.meta.env.VITE_UNIDADE || 'Unidade Guaíra';

// Print service URL (local PC running print service)
export const PRINT_SERVICE_URL = import.meta.env.VITE_PRINT_SERVICE_URL || 'http://localhost:3000/print';

// Polling interval for TV panel (in milliseconds) - backup for realtime
export const POLLING_INTERVAL = 2000; // 2 seconds (realtime is primary)
