import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export type UserRec = { username: string; passwordHash: string };
export type ApiKeyRec = { id: string; name: string; key: string; keyHint: string; expiresAt?: string | null; revoked?: boolean };
export type PublicApiKeyRec = Omit<ApiKeyRec, 'key'>;
export type CachedDevice = { id: string; data: Record<string, unknown>; updatedAt: string };

const inMemory = {
  users: new Map<string, UserRec>(),
  apiKeys: new Map<string, ApiKeyRec>(),
  devices: new Map<string, CachedDevice>(),
};

const defaultUsername = process.env.APP_USERNAME || 'admin';
const defaultPassword = process.env.APP_PASSWORD || 'admin';
inMemory.users.set(defaultUsername, { username: defaultUsername, passwordHash: bcrypt.hashSync(defaultPassword, 10) });

let pool: Pool | null = null;
let initialization: Promise<void> | null = null;
let apiKeyListCache: { value: PublicApiKeyRec[]; expiresAt: number } | null = null;

export async function initStorage(): Promise<void> {
  if (initialization) return initialization;
  initialization = (async () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) return;
    pool = new Pool({ connectionString });
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, password_hash TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS api_keys (
          key TEXT PRIMARY KEY, id TEXT UNIQUE, name TEXT NOT NULL, key_hint TEXT,
          expires_at TIMESTAMPTZ, revoked BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS devices (
          id TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS id TEXT;
        ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_hint TEXT;
        ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
        UPDATE api_keys SET id = md5(key), key_hint = concat(left(key, 8), '…') WHERE id IS NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS api_keys_id_unique ON api_keys(id) WHERE id IS NOT NULL;
      `);
      await pool.query(
        'INSERT INTO users(username, password_hash) VALUES($1, $2) ON CONFLICT (username) DO NOTHING',
        [defaultUsername, bcrypt.hashSync(defaultPassword, 10)],
      );
    } catch (error) {
      await pool.end().catch(() => undefined);
      pool = null;
      initialization = null;
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Postgres is unavailable; using in-memory storage for development.');
        return;
      }
      throw error;
    }
  })();
  return initialization;
}

async function ready() { await initStorage(); }
function toPublic(rec: ApiKeyRec): PublicApiKeyRec { const { key: _key, ...publicRec } = rec; return publicRec; }
function rowToApiKey(row: Record<string, unknown>): ApiKeyRec {
  const key = String(row.key);
  return {
    id: String(row.id || key), name: String(row.name), key,
    keyHint: String(row.key_hint || `${key.slice(0, 8)}…`),
    expiresAt: row.expires_at ? new Date(String(row.expires_at)).toISOString() : null,
    revoked: Boolean(row.revoked),
  };
}

export async function getUser(username: string): Promise<UserRec | null> {
  await ready();
  if (!pool) return inMemory.users.get(username) ?? null;
  const result = await pool.query('SELECT username, password_hash FROM users WHERE username = $1', [username]);
  return result.rowCount ? { username: result.rows[0].username, passwordHash: result.rows[0].password_hash } : null;
}
export async function setUser(username: string, passwordHash: string): Promise<void> {
  await ready();
  if (!pool) { inMemory.users.set(username, { username, passwordHash }); return; }
  await pool.query('INSERT INTO users(username, password_hash) VALUES($1, $2) ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash', [username, passwordHash]);
}
export async function createApiKeyRecord(name: string, expiresAt?: string): Promise<ApiKeyRec> {
  await ready();
  const key = crypto.randomBytes(32).toString('base64url');
  const rec: ApiKeyRec = { id: crypto.randomUUID(), name, key, keyHint: `${key.slice(0, 8)}…${key.slice(-4)}`, expiresAt: expiresAt ?? null, revoked: false };
  if (!pool) { inMemory.apiKeys.set(rec.id, rec); apiKeyListCache = null; return rec; }
  await pool.query('INSERT INTO api_keys(key, id, name, key_hint, expires_at, revoked) VALUES($1, $2, $3, $4, $5, FALSE)', [rec.key, rec.id, rec.name, rec.keyHint, rec.expiresAt]);
  apiKeyListCache = null;
  return rec;
}
export async function getApiKeyRecord(key: string): Promise<ApiKeyRec | null> {
  await ready();
  if (!pool) return Array.from(inMemory.apiKeys.values()).find((rec) => rec.key === key) ?? null;
  const result = await pool.query('SELECT key, id, name, key_hint, expires_at, revoked FROM api_keys WHERE key = $1', [key]);
  return result.rowCount ? rowToApiKey(result.rows[0]) : null;
}
export async function listApiKeys(): Promise<PublicApiKeyRec[]> {
  await ready();
  if (apiKeyListCache && apiKeyListCache.expiresAt > Date.now()) return apiKeyListCache.value;
  if (!pool) {
    const value = Array.from(inMemory.apiKeys.values()).map(toPublic);
    apiKeyListCache = { value, expiresAt: Date.now() + 10_000 };
    return value;
  }
  const result = await pool.query('SELECT key, id, name, key_hint, expires_at, revoked FROM api_keys ORDER BY created_at DESC');
  const value = result.rows.map(rowToApiKey).map(toPublic);
  apiKeyListCache = { value, expiresAt: Date.now() + 10_000 };
  return value;
}
export async function revokeApiKey(id: string): Promise<boolean> {
  await ready();
  if (!pool) { const rec = inMemory.apiKeys.get(id); if (!rec) return false; rec.revoked = true; apiKeyListCache = null; return true; }
  const result = await pool.query('UPDATE api_keys SET revoked = TRUE WHERE id = $1 AND revoked = FALSE', [id]);
  if (result.rowCount) apiKeyListCache = null;
  return Boolean(result.rowCount);
}
export async function listDevices(maxAgeMs?: number): Promise<CachedDevice[]> {
  await ready();
  const cutoff = maxAgeMs ? new Date(Date.now() - maxAgeMs) : null;
  if (!pool) return Array.from(inMemory.devices.values()).filter((device) => !cutoff || new Date(device.updatedAt) >= cutoff);
  const result = await pool.query(`SELECT id, data, updated_at FROM devices ${cutoff ? 'WHERE updated_at >= $1' : ''} ORDER BY updated_at DESC`, cutoff ? [cutoff] : []);
  return result.rows.map((row) => ({ id: row.id, data: row.data, updatedAt: new Date(row.updated_at).toISOString() }));
}
export async function getDevice(id: string, maxAgeMs?: number): Promise<CachedDevice | null> {
  const devices = await listDevices(maxAgeMs);
  return devices.find((device) => device.id === id) ?? null;
}
export async function setDevice(id: string, data: Record<string, unknown>): Promise<void> {
  await ready();
  const updatedAt = new Date().toISOString();
  if (!pool) { inMemory.devices.set(id, { id, data, updatedAt }); return; }
  await pool.query('INSERT INTO devices(id, data, updated_at) VALUES($1, $2, now()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()', [id, data]);
}
export async function deleteDevice(id: string): Promise<void> {
  await ready();
  if (!pool) { inMemory.devices.delete(id); return; }
  await pool.query('DELETE FROM devices WHERE id = $1', [id]);
}
export { inMemory };
export default { initStorage, getUser, setUser, createApiKeyRecord, getApiKeyRecord, listApiKeys, revokeApiKey, listDevices, getDevice, setDevice, deleteDevice };
