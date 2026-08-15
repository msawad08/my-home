import type { NextApiRequest, NextApiResponse } from 'next';
import { createApiKey, verifyApiKey } from '../../../src/lib/auth';
import { db } from '../../../src/lib/db';
import { getSession } from '../../../src/lib/session';

function requireSession(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req as any);
  if (!session) {
    res.status(401).json({ success: false });
    return false;
  }
  return true;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    if (!requireSession(req, res)) return;
    const name = req.body?.name || 'shortcut';
    const days = parseInt(process.env.API_KEY_EXPIRY_DAYS || '365', 10);
    const rec = createApiKey(name, days);
    return res.json({ success: true, key: rec.key, expiresAt: rec.expiresAt });
  }

  if (req.method === 'GET') {
    if (!requireSession(req, res)) return;
    const list = Array.from(db.apiKeys.values());
    return res.json({ success: true, keys: list });
  }

  if (req.method === 'DELETE') {
    if (!requireSession(req, res)) return;
    const key = req.body?.key;
    if (!key) return res.status(400).json({ success: false });
    const rec = db.apiKeys.get(key);
    if (!rec) return res.status(404).json({ success: false });
    rec.revoked = true;
    db.apiKeys.set(key, rec);
    return res.json({ success: true });
  }

  res.setHeader('Allow', ['POST','GET','DELETE']);
  res.status(405).end();
}
