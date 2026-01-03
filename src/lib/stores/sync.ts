import { writable, get } from 'svelte/store';
import { familyId, activities, type Activity } from './activities';

type SyncStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export const syncStatus = writable<SyncStatus>('disconnected');
export const deviceId = writable<string>(
    typeof crypto !== 'undefined' ? crypto.randomUUID() : 'unknown'
);

let ws: WebSocket | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

export function connectWebSocket(): void {
    const fid = get(familyId);
    const did = get(deviceId);

    if (!fid) {
        console.log('[WS] No family ID, skipping connection');
        return;
    }

    if (ws?.readyState === WebSocket.OPEN) {
        console.log('[WS] Already connected');
        return;
    }

    syncStatus.set('connecting');

    try {
        ws = new WebSocket(`ws://localhost:3001/ws?familyId=${fid}&deviceId=${did}`);

        ws.onopen = () => {
            console.log('[WS] Connected');
            syncStatus.set('connected');
            reconnectAttempts = 0;
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                handleMessage(message);
            } catch (e) {
                console.error('[WS] Failed to parse message:', e);
            }
        };

        ws.onclose = () => {
            console.log('[WS] Disconnected');
            syncStatus.set('disconnected');
            ws = null;

            // Try to reconnect
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts++;
                console.log(`[WS] Reconnecting in ${RECONNECT_DELAY}ms (attempt ${reconnectAttempts})`);
                reconnectTimeout = setTimeout(connectWebSocket, RECONNECT_DELAY);
            }
        };

        ws.onerror = (error) => {
            console.error('[WS] Error:', error);
            syncStatus.set('error');
        };
    } catch (e) {
        console.error('[WS] Failed to connect:', e);
        syncStatus.set('error');
    }
}

export function disconnectWebSocket(): void {
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }

    if (ws) {
        ws.close();
        ws = null;
    }

    syncStatus.set('disconnected');
    reconnectAttempts = 0;
}

export function sendMessage(type: string, data: unknown): void {
    if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, data }));
    }
}

function handleMessage(message: { type: string; action?: string; data?: unknown; senderId?: string }) {
    const did = get(deviceId);

    // Ignore messages from self
    if (message.senderId === did) return;

    switch (message.type) {
        case 'sync':
            // Initial sync - replace all activities
            if (Array.isArray(message.data)) {
                activities.set(message.data as Activity[]);
            }
            break;

        case 'activity':
            if (message.action === 'create' && message.data) {
                // Add new activity at the beginning
                activities.update((all) => {
                    const exists = all.some((a) => a.id === (message.data as Activity).id);
                    if (exists) return all;
                    return [message.data as Activity, ...all];
                });
            } else if (message.action === 'update' && message.data) {
                // Update existing activity
                const updated = message.data as Activity;
                activities.update((all) =>
                    all.map((a) => (a.id === updated.id ? updated : a))
                );
            } else if (message.action === 'delete' && message.data) {
                // Remove activity
                const deleted = message.data as Activity;
                activities.update((all) => all.filter((a) => a.id !== deleted.id));
            }
            break;
    }
}
