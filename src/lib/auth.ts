import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from './db';

export async function verifyUser(username: string, password: string) {
  const user = db.users.get(username);
  if (!user) return false;
  return bcrypt.compareSync(password, user.passwordHash);
}

export function createApiKey(name: string, days?: number) {
  const key = crypto.randomBytes(24).toString('hex');
  const expiresAt = days ? new Date(Date.now() + days * 24 * 3600 * 1000).toISOString() : undefined;
  const rec = { name, key, expiresAt, revoked: false };
  db.apiKeys.set(key, rec);
  return rec;
}

export function verifyApiKey(key?: string) {
  if (!key) return null;
  const rec = db.apiKeys.get(key);
  if (!rec) return null;
  if (rec.revoked) return null;
  if (rec.expiresAt && new Date(rec.expiresAt) < new Date()) return null;
  return rec;
}
