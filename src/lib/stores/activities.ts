import { writable, derived, get } from 'svelte/store';

// Types
export interface Activity {
    id: string;
    family_id: string;
    type: 'feeding' | 'sleep' | 'diaper';
    data: FeedingData | SleepData | DiaperData;
    started_at: number;
    ended_at: number | null;
    created_by: string | null;
    created_at: number;
}

export interface FeedingData {
    feedType: 'bottle' | 'breast' | 'solid';
    amount?: number; // oz or ml
    unit?: 'oz' | 'ml';
    side?: 'left' | 'right' | 'both';
    notes?: string;
}

export interface SleepData {
    location?: string;
    quality?: 1 | 2 | 3 | 4 | 5;
    notes?: string;
}

export interface DiaperData {
    diaperType: 'wet' | 'dirty' | 'both';
    hasRash?: boolean;
    notes?: string;
}

// API base URL - same origin in production, localhost in dev
const API_BASE = typeof window !== 'undefined'
    ? (window.location.hostname === 'localhost' ? 'http://localhost:3001' : '')
    : '';

// Stores
export const activities = writable<Activity[]>([]);
export const isLoading = writable(false);
export const error = writable<string | null>(null);

// Family store
export const familyId = writable<string | null>(
    typeof localStorage !== 'undefined' ? localStorage.getItem('familyId') : null
);
export const familyCode = writable<string | null>(
    typeof localStorage !== 'undefined' ? localStorage.getItem('familyCode') : null
);
export const babyName = writable<string>(
    typeof localStorage !== 'undefined' ? localStorage.getItem('babyName') || 'Baby' : 'Baby'
);

// Derived stores
export const todayActivities = derived(activities, ($activities) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return $activities.filter((a) => a.started_at >= startOfDay.getTime());
});

export const todayStats = derived(todayActivities, ($today) => {
    const feeding = $today.filter((a) => a.type === 'feeding');
    const sleep = $today.filter((a) => a.type === 'sleep');
    const diaper = $today.filter((a) => a.type === 'diaper');

    // Calculate total sleep hours
    let sleepMinutes = 0;
    for (const s of sleep) {
        if (s.ended_at) {
            sleepMinutes += (s.ended_at - s.started_at) / 60000;
        }
    }

    return {
        feedingCount: feeding.length,
        sleepHours: Math.round(sleepMinutes / 60 * 10) / 10,
        diaperCount: diaper.length
    };
});

// API functions
export async function createFamily(name: string = 'Baby'): Promise<{ id: string; code: string }> {
    const res = await fetch(`${API_BASE}/api/family`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ babyName: name })
    });

    if (!res.ok) throw new Error('Failed to create family');

    const data = await res.json();

    // Save to localStorage
    localStorage.setItem('familyId', data.id);
    localStorage.setItem('familyCode', data.code);
    localStorage.setItem('babyName', data.baby_name);

    familyId.set(data.id);
    familyCode.set(data.code);
    babyName.set(data.baby_name);

    return data;
}

export async function joinFamily(code: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/family/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
    });

    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to join family');
    }

    const data = await res.json();

    localStorage.setItem('familyId', data.id);
    localStorage.setItem('familyCode', data.code);
    localStorage.setItem('babyName', data.baby_name);

    familyId.set(data.id);
    familyCode.set(data.code);
    babyName.set(data.baby_name);
}

export async function fetchActivities(): Promise<void> {
    const fid = get(familyId);
    if (!fid) return;

    isLoading.set(true);
    error.set(null);

    try {
        const res = await fetch(`${API_BASE}/api/families/${fid}/activities`);
        if (!res.ok) throw new Error('Failed to fetch activities');

        const data = await res.json();
        activities.set(data);
    } catch (e) {
        error.set(e instanceof Error ? e.message : 'Unknown error');
    } finally {
        isLoading.set(false);
    }
}

export async function addActivity(
    type: 'feeding' | 'sleep' | 'diaper',
    data: FeedingData | SleepData | DiaperData,
    startedAt: number = Date.now(),
    endedAt?: number
): Promise<Activity> {
    const fid = get(familyId);
    if (!fid) throw new Error('No family connected');

    const res = await fetch(`${API_BASE}/api/families/${fid}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data, startedAt, endedAt })
    });

    if (!res.ok) throw new Error('Failed to add activity');

    const activity = await res.json();

    // Add to local store
    activities.update((a) => [activity, ...a]);

    return activity;
}

export async function updateActivityApi(id: string, updates: Partial<Activity>): Promise<void> {
    const res = await fetch(`${API_BASE}/api/activities/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
    });

    if (!res.ok) throw new Error('Failed to update activity');

    // Update local store
    activities.update((all) =>
        all.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
}

export async function deleteActivityApi(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/activities/${id}`, {
        method: 'DELETE'
    });

    if (!res.ok) throw new Error('Failed to delete activity');

    // Remove from local store
    activities.update((all) => all.filter((a) => a.id !== id));
}

export function clearFamily(): void {
    localStorage.removeItem('familyId');
    localStorage.removeItem('familyCode');
    localStorage.removeItem('babyName');

    familyId.set(null);
    familyCode.set(null);
    babyName.set('Baby');
    activities.set([]);
}
