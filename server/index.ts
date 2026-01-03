import { handleRequest } from './routes';
import {
    handleWebSocketUpgrade,
    handleWebSocketOpen,
    handleWebSocketMessage,
    handleWebSocketClose
} from './websocket';

const PORT = process.env.PORT || 3001;

console.log(`🍼 Baby Sync Server starting on port ${PORT}...`);

const server = Bun.serve({
    port: PORT,

    fetch(req, server) {
        const url = new URL(req.url);

        // Handle WebSocket upgrade
        if (url.pathname === '/ws') {
            if (handleWebSocketUpgrade(req, server)) {
                return undefined;
            }
            return new Response('WebSocket upgrade failed', { status: 400 });
        }

        // Handle API requests
        return handleRequest(req);
    },

    websocket: {
        open: handleWebSocketOpen,
        message: handleWebSocketMessage,
        close: handleWebSocketClose,
    }
});

console.log(`✅ Baby Sync Server running at http://localhost:${PORT}`);
console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/ws`);
