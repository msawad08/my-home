import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '../../../src/lib/session';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req as any);
  if (!session) return res.json({ authenticated: false });
  res.json({ authenticated: true, username: session });
}
