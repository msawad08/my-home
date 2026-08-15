import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

type UserRec = { username: string; passwordHash: string };
type ApiKeyRec = { name: string; key: string; expiresAt?: string | null; revoked?: boolean };

const inMemory = {
  users: new Map<string, UserRec>(),
  apiKeys: new Map<string, ApiKeyRec>(),
  devices: new Map<string, any>(),
};

let pool: Pool | null = null;

export async function initStorage() {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  pool = new Pool({ connectionString: url });
  // create tables if not exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS api_keys (
      key TEXT PRIMARY KEY,
      name TEXT,
      expires_at TIMESTAMPTZ,
      revoked BOOLEAN DEFAULT FALSE
    );
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      data JSONB,
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);
}

export async function getUser(username: string): Promise<UserRec | null> {
  if (!pool) return inMemory.users.get(username) ?? null;
  const r = await pool.query('SELECT username, password_hash FROM users WHERE username=$1', [username]);
  if (r.rowCount === 0) return null;
  return { username: r.rows[0].username, passwordHash: r.rows[0].password_hash };
}

export async function setUser(username: string, passwordHash: string) {
  if (!pool) return inMemory.users.set(username, { username, passwordHash });
  await pool.query('INSERT INTO users(username,password_hash) VALUES($1,$2) ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash', [username, passwordHash]);
}

export async function createApiKeyRecord(rec: ApiKeyRec) {
  if (!pool) return inMemory.apiKeys.set(rec.key, rec);
  await pool.query('INSERT INTO api_keys(key,name,expires_at,revoked) VALUES($1,$2,$3,$4) ON CONFLICT (key) DO UPDATE SET name=EXCLUDED.name, expires_at=EXCLUDED.expires_at, revoked=EXCLUDED.revoked', [rec.key, rec.name, rec.expiresAt, rec.revoked || false]);
}

export async function getApiKeyRecord(key: string): Promise<ApiKeyRec | null> {
  if (!pool) return inMemory.apiKeys.get(key) ?? null;
  const r = await pool.query('SELECT key,name,expires_at,revoked FROM api_keys WHERE key=$1', [key]);
  if (r.rowCount === 0) return null;
  const row = r.rows[0];
  return { key: row.key, name: row.name, expiresAt: row.expires_at ? row.expires_at.toISOString() : null, revoked: row.revoked };
}

export async function listApiKeys(): Promise<ApiKeyRec[]> {
  if (!pool) return Array.from(inMemory.apiKeys.values());
  const r = await pool.query('SELECT key,name,expires_at,revoked FROM api_keys');
  return r.rows.map((row: any) => ({ key: row.key, name: row.name, expiresAt: row.expires_at ? row.expires_at.toISOString() : null, revoked: row.revoked }));
}

export async function revokeApiKey(key: string) {
  if (!pool) {
    const rec = inMemory.apiKeys.get(key);
    if (!rec) throw new Error('NOT_FOUND');
    rec.revoked = true;
    inMemory.apiKeys.set(key, rec);
    return;
  }
  await pool.query('UPDATE api_keys SET revoked = TRUE WHERE key=$1', [key]);
}

export async function listDevices(): Promise<any[]> {
  if (!pool) return Array.from(inMemory.devices.values());
  const r = await pool.query('SELECT id, data FROM devices');
  return r.rows.map((row: any) => ({ id: row.id, ...row.data }));
}

export async function getDevice(id: string): Promise<any | null> {
  if (!pool) return inMemory.devices.get(id) ?? null;
  const r = await pool.query('SELECT data FROM devices WHERE id=$1', [id]);
  if (r.rowCount === 0) return null;
  return r.rows[0].data;
}

export async function setDevice(id: string, data: any) {
  if (!pool) return inMemory.devices.set(id, data);
  await pool.query('INSERT INTO devices(id,data,updated_at) VALUES($1,$2,now()) ON CONFLICT (id) DO UPDATE SET data=EXCLUDED.data, updated_at=now()', [id, data]);
}

export { inMemory };

export default {
  initStorage,
  getUser,
  setUser,
  createApiKeyRecord,
  getApiKeyRecord,
  listDevices,
  getDevice,
  setDevice,
};
