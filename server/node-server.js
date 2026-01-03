// Node.js compatible server (fallback when Bun is not available)
// Run with: node server/node-server.js

import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { randomUUID } from 'crypto';

const PORT = process.env.PORT || 3001;

// Simple file-based storage (for demo purposes)
const DB_FILE = 'baby-sync-data.json';

function loadData() {
    if (existsSync(DB_FILE)) {
        return JSON.parse(readFileSync(DB_FILE, 'utf-8'));
    }
    return { families: [], activities: [] };
}

function saveData(data) {
    writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// WebSocket clients grouped by family
const familyRooms = new Map();

// Create HTTP server
const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const path = url.pathname;
    const method = req.method;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const sendJSON = (data, status = 200) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    };

    const getBody = () => new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => resolve(body ? JSON.parse(body) : {}));
    });

    try {
        const db = loadData();

        // Create family
        if (path === '/api/family' && method === 'POST') {
            const { babyName = 'Baby' } = await getBody();
            const family = {
                id: randomUUID(),
                code: generateCode(),
                baby_name: babyName,
                created_at: Date.now()
            };
            db.families.push(family);
            saveData(db);
            return sendJSON(family, 201);
        }

        // Join family
        if (path === '/api/family/join' && method === 'POST') {
            const { code } = await getBody();
            const family = db.families.find(f => f.code === code.toUpperCase());
            if (!family) {
                return sendJSON({ error: 'Family not found' }, 404);
            }
            return sendJSON(family);
        }

        // Get activities
        const activityMatch = path.match(/^\/api\/families\/([^/]+)\/activities/);
        if (activityMatch && method === 'GET') {
            const familyId = activityMatch[1];
            const activities = db.activities
                .filter(a => a.family_id === familyId)
                .sort((a, b) => b.started_at - a.started_at);
            return sendJSON(activities);
        }

        // Create activity
        if (activityMatch && method === 'POST') {
            const familyId = activityMatch[1];
            const body = await getBody();
            const activity = {
                id: randomUUID(),
                family_id: familyId,
                type: body.type,
                data: body.data,
                started_at: body.startedAt || Date.now(),
                ended_at: body.endedAt || null,
                created_by: body.createdBy || null,
                created_at: Date.now()
            };
            db.activities.push(activity);
            saveData(db);

            // Broadcast to WebSocket clients
            broadcastToFamily(familyId, { type: 'activity', action: 'create', data: activity });

            return sendJSON(activity, 201);
        }

        // Update activity
        const singleMatch = path.match(/^\/api\/activities\/([^/]+)/);
        if (singleMatch && method === 'PUT') {
            const activityId = singleMatch[1];
            const body = await getBody();
            const index = db.activities.findIndex(a => a.id === activityId);
            if (index !== -1) {
                db.activities[index] = { ...db.activities[index], ...body };
                saveData(db);
            }
            return sendJSON({ success: true });
        }

        // Delete activity
        if (singleMatch && method === 'DELETE') {
            const activityId = singleMatch[1];
            db.activities = db.activities.filter(a => a.id !== activityId);
            saveData(db);
            return sendJSON({ success: true });
        }

        // Health check
        if (path === '/api/health') {
            return sendJSON({ status: 'ok', timestamp: Date.now() });
        }

        sendJSON({ error: 'Not found' }, 404);
    } catch (error) {
        console.error('API Error:', error);
        sendJSON({ error: 'Internal server error' }, 500);
    }
});

// Create WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const familyId = url.searchParams.get('familyId');
    const deviceId = url.searchParams.get('deviceId') || randomUUID();

    if (!familyId) {
        ws.close();
        return;
    }

    // Add to room
    if (!familyRooms.has(familyId)) {
        familyRooms.set(familyId, new Set());
    }
    familyRooms.get(familyId).add(ws);

    console.log(`[WS] Device ${deviceId} joined family ${familyId}`);

    // Send current activities
    const db = loadData();
    const activities = db.activities
        .filter(a => a.family_id === familyId)
        .sort((a, b) => b.started_at - a.started_at);
    ws.send(JSON.stringify({ type: 'sync', data: activities }));

    ws.on('message', (message) => {
        try {
            const parsed = JSON.parse(message.toString());
            // Broadcast to others in the room
            const room = familyRooms.get(familyId);
            if (room) {
                for (const client of room) {
                    if (client !== ws && client.readyState === 1) {
                        client.send(JSON.stringify({ ...parsed, senderId: deviceId }));
                    }
                }
            }
        } catch (e) {
            console.error('WS message error:', e);
        }
    });

    ws.on('close', () => {
        const room = familyRooms.get(familyId);
        if (room) {
            room.delete(ws);
            if (room.size === 0) {
                familyRooms.delete(familyId);
            }
        }
        console.log(`[WS] Device ${deviceId} left family ${familyId}`);
    });
});

function broadcastToFamily(familyId, message) {
    const room = familyRooms.get(familyId);
    if (!room) return;

    const messageStr = JSON.stringify(message);
    for (const client of room) {
        if (client.readyState === 1) {
            client.send(messageStr);
        }
    }
}

server.listen(PORT, () => {
    console.log(`🍼 Baby Sync Server running at http://localhost:${PORT}`);
    console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/ws`);
});
