import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import storage from './storage';

storage.initStorage().catch(() => {});

export async function verifyUser(username: string, password: string) {
  const user = await storage.getUser(username);
  if (!user) return false;
  return bcrypt.compareSync(password, user.passwordHash);
}

export async function createApiKey(name: string, days?: number) {
  const key = crypto.randomBytes(24).toString('hex');
  const expiresAt = days ? new Date(Date.now() + days * 24 * 3600 * 1000).toISOString() : undefined;
  const rec = { name, key, expiresAt, revoked: false };
  await storage.createApiKeyRecord(rec);
  return rec;
}

export async function verifyApiKey(key?: string) {
  if (!key) return null;
  const rec = await storage.getApiKeyRecord(key);
  if (!rec) return null;
  if (rec.revoked) return null;
  if (rec.expiresAt && new Date(rec.expiresAt) < new Date()) return null;
  return rec;
}
