import bcrypt from 'bcryptjs';
import storage from './storage';

export async function verifyUser(username: string, password: string): Promise<boolean> {
  const user = await storage.getUser(username);
  return Boolean(user && bcrypt.compareSync(password, user.passwordHash));
}

export async function createApiKey(name: string, days?: number) {
  const expiresAt = days && days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : undefined;
  return storage.createApiKeyRecord(name, expiresAt);
}

export async function verifyApiKey(key?: string) {
  if (!key) return null;
  const rec = await storage.getApiKeyRecord(key);
  if (!rec || rec.revoked) return null;
  if (rec.expiresAt && new Date(rec.expiresAt) <= new Date()) return null;
  return rec;
}
