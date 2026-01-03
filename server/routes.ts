import {
    createFamily,
    getFamilyByCode,
    createActivity,
    getActivities,
    getTodayActivities,
    updateActivity,
    deleteActivity,
    type Activity
} from './db';
import { broadcastActivityUpdate } from './websocket';

export async function handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight
    if (method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
        // Family routes
        if (path === '/api/family' && method === 'POST') {
            const body = await req.json();
            const family = createFamily(body.babyName);
            return jsonResponse(family, corsHeaders);
        }

        if (path === '/api/family/join' && method === 'POST') {
            const body = await req.json();
            const family = getFamilyByCode(body.code);
            if (!family) {
                return jsonResponse({ error: 'Family not found' }, corsHeaders, 404);
            }
            return jsonResponse(family, corsHeaders);
        }

        // Activity routes
        const activityMatch = path.match(/^\/api\/families\/([^/]+)\/activities/);
        if (activityMatch) {
            const familyId = activityMatch[1];

            if (method === 'GET') {
                const today = url.searchParams.get('today') === 'true';
                const activities = today ? getTodayActivities(familyId) : getActivities(familyId);
                return jsonResponse(activities.map(parseActivityData), corsHeaders);
            }

            if (method === 'POST') {
                const body = await req.json();
                const activity = createActivity(
                    familyId,
                    body.type,
                    body.data,
                    body.startedAt || Date.now(),
                    body.endedAt,
                    body.createdBy
                );
                broadcastActivityUpdate(familyId, activity, 'create');
                return jsonResponse(parseActivityData(activity), corsHeaders, 201);
            }
        }

        // Single activity routes
        const singleActivityMatch = path.match(/^\/api\/activities\/([^/]+)/);
        if (singleActivityMatch) {
            const activityId = singleActivityMatch[1];

            if (method === 'PUT') {
                const body = await req.json();
                updateActivity(activityId, body);
                return jsonResponse({ success: true }, corsHeaders);
            }

            if (method === 'DELETE') {
                deleteActivity(activityId);
                return jsonResponse({ success: true }, corsHeaders);
            }
        }

        // Health check
        if (path === '/api/health') {
            return jsonResponse({ status: 'ok', timestamp: Date.now() }, corsHeaders);
        }

        return jsonResponse({ error: 'Not found' }, corsHeaders, 404);
    } catch (error) {
        console.error('API Error:', error);
        return jsonResponse({ error: 'Internal server error' }, corsHeaders, 500);
    }
}

function jsonResponse(data: any, headers: Record<string, string>, status: number = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            ...headers,
            'Content-Type': 'application/json'
        }
    });
}

function parseActivityData(activity: Activity) {
    return {
        ...activity,
        data: typeof activity.data === 'string' ? JSON.parse(activity.data) : activity.data
    };
}
