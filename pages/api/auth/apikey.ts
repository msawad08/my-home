import type { NextApiRequest, NextApiResponse } from 'next';
import { createApiKey, verifyApiKey } from '../../../src/lib/auth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const name = req.body?.name || 'shortcut';
    const days = parseInt(process.env.API_KEY_EXPIRY_DAYS || '365', 10);
    const rec = createApiKey(name, days);
    return res.json({ success: true, key: rec.key, expiresAt: rec.expiresAt });
  }

  if (req.method === 'GET') {
    const auth = req.headers.authorization?.split(' ')[1];
    if (!auth) return res.status(401).json({ success: false });
    const rec = verifyApiKey(auth);
    if (!rec) return res.status(401).json({ success: false });
    return res.json({ success: true, key: rec });
  }

  res.setHeader('Allow', ['POST','GET']);
  res.status(405).end();
}
