import { Database } from 'bun:sqlite';

const db = new Database('baby-sync.db');

// Initialize database tables
db.run(`
  CREATE TABLE IF NOT EXISTS families (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    baby_name TEXT DEFAULT 'Baby',
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL,
    type TEXT NOT NULL,
    data TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    created_by TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (family_id) REFERENCES families(id)
  )
`);

db.run(`CREATE INDEX IF NOT EXISTS idx_activities_family ON activities(family_id)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type)`);

export { db };

// Helper functions
export function generateFamilyCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function generateId(): string {
  return crypto.randomUUID();
}

export interface Family {
  id: string;
  code: string;
  baby_name: string;
  created_at: number;
}

export interface Activity {
  id: string;
  family_id: string;
  type: 'feeding' | 'sleep' | 'diaper';
  data: string;
  started_at: number;
  ended_at: number | null;
  created_by: string | null;
  created_at: number;
}

// Family operations
export function createFamily(babyName: string = 'Baby'): Family {
  const id = generateId();
  const code = generateFamilyCode();
  
  db.run(
    'INSERT INTO families (id, code, baby_name) VALUES (?, ?, ?)',
    [id, code, babyName]
  );
  
  return { id, code, baby_name: babyName, created_at: Date.now() };
}

export function getFamilyByCode(code: string): Family | null {
  const result = db.query('SELECT * FROM families WHERE code = ?').get(code.toUpperCase()) as Family | null;
  return result;
}

// Activity operations
export function createActivity(
  familyId: string,
  type: 'feeding' | 'sleep' | 'diaper',
  data: object,
  startedAt: number,
  endedAt?: number,
  createdBy?: string
): Activity {
  const id = generateId();
  const dataJson = JSON.stringify(data);
  
  db.run(
    'INSERT INTO activities (id, family_id, type, data, started_at, ended_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, familyId, type, dataJson, startedAt, endedAt ?? null, createdBy ?? null]
  );
  
  return {
    id,
    family_id: familyId,
    type,
    data: dataJson,
    started_at: startedAt,
    ended_at: endedAt ?? null,
    created_by: createdBy ?? null,
    created_at: Date.now()
  };
}

export function getActivities(familyId: string, limit: number = 50): Activity[] {
  const results = db.query(
    'SELECT * FROM activities WHERE family_id = ? ORDER BY started_at DESC LIMIT ?'
  ).all(familyId, limit) as Activity[];
  return results;
}

export function getTodayActivities(familyId: string): Activity[] {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const results = db.query(
    'SELECT * FROM activities WHERE family_id = ? AND started_at >= ? ORDER BY started_at DESC'
  ).all(familyId, startOfDay.getTime()) as Activity[];
  return results;
}

export function updateActivity(id: string, updates: Partial<Activity>): void {
  const { data, ended_at } = updates;
  if (data !== undefined) {
    db.run('UPDATE activities SET data = ? WHERE id = ?', [typeof data === 'string' ? data : JSON.stringify(data), id]);
  }
  if (ended_at !== undefined) {
    db.run('UPDATE activities SET ended_at = ? WHERE id = ?', [ended_at, id]);
  }
}

export function deleteActivity(id: string): void {
  db.run('DELETE FROM activities WHERE id = ?', [id]);
}
