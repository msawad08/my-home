import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyUser } from '../../../src/lib/auth';
import { setSessionCookie, clearSessionCookie } from '../../../src/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ success: false });
    const ok = await verifyUser(username, password);
    if (!ok) return res.status(401).json({ success: false });
    setSessionCookie(res, username);
    return res.json({ success: true });
  }
  if (req.method === 'DELETE') {
    clearSessionCookie(res);
    return res.json({ success: true });
  }
  res.setHeader('Allow', ['POST', 'DELETE']);
  res.status(405).end();
}
