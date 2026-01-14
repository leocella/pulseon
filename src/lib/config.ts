// Configuration for the queue system
export const UNIDADE = import.meta.env.VITE_UNIDADE || 'UNIDADE_PRINCIPAL';

// Print service URL (local PC running print service)
export const PRINT_SERVICE_URL = import.meta.env.VITE_PRINT_SERVICE_URL || 'http://localhost:3001/print';

// Polling interval for TV panel (in milliseconds)
export const POLLING_INTERVAL = 4000; // 4 seconds
