import type { ServerWebSocket } from 'bun';
import { getActivities, type Activity } from './db';

interface WebSocketData {
    familyId: string;
    deviceId: string;
}

// Map of family IDs to connected WebSocket clients
const familyRooms = new Map<string, Set<ServerWebSocket<WebSocketData>>>();

export function handleWebSocketUpgrade(req: Request, server: any): boolean {
    const url = new URL(req.url);
    const familyId = url.searchParams.get('familyId');
    const deviceId = url.searchParams.get('deviceId') || crypto.randomUUID();

    if (!familyId) {
        return false;
    }

    const success = server.upgrade(req, {
        data: { familyId, deviceId }
    });

    return success;
}

export function handleWebSocketOpen(ws: ServerWebSocket<WebSocketData>) {
    const { familyId, deviceId } = ws.data;

    // Add to family room
    if (!familyRooms.has(familyId)) {
        familyRooms.set(familyId, new Set());
    }
    familyRooms.get(familyId)!.add(ws);

    console.log(`[WS] Device ${deviceId} joined family ${familyId}`);

    // Send current activities to new connection
    try {
        const activities = getActivities(familyId, 100);
        ws.send(JSON.stringify({
            type: 'sync',
            data: activities
        }));
    } catch (e) {
        console.error('Error sending initial sync:', e);
    }
}

export function handleWebSocketMessage(ws: ServerWebSocket<WebSocketData>, message: string | Buffer) {
    try {
        const { familyId, deviceId } = ws.data;
        const parsed = JSON.parse(message.toString());

        console.log(`[WS] Message from ${deviceId}:`, parsed.type);

        // Broadcast to all other clients in the same family
        broadcastToFamily(familyId, {
            ...parsed,
            senderId: deviceId
        }, ws);
    } catch (e) {
        console.error('Error handling WebSocket message:', e);
    }
}

export function handleWebSocketClose(ws: ServerWebSocket<WebSocketData>) {
    const { familyId, deviceId } = ws.data;

    const room = familyRooms.get(familyId);
    if (room) {
        room.delete(ws);
        if (room.size === 0) {
            familyRooms.delete(familyId);
        }
    }

    console.log(`[WS] Device ${deviceId} left family ${familyId}`);
}

export function broadcastToFamily(
    familyId: string,
    message: object,
    excludeWs?: ServerWebSocket<WebSocketData>
) {
    const room = familyRooms.get(familyId);
    if (!room) return;

    const messageStr = JSON.stringify(message);

    for (const client of room) {
        if (client !== excludeWs && client.readyState === 1) {
            client.send(messageStr);
        }
    }
}

export function broadcastActivityUpdate(familyId: string, activity: Activity, action: 'create' | 'update' | 'delete') {
    broadcastToFamily(familyId, {
        type: 'activity',
        action,
        data: activity
    });
}
