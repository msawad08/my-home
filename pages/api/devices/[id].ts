import type { NextApiRequest, NextApiResponse } from 'next';
import '../../../src/providers/miraie';
import { getProvider } from '../../../src/providers/registry';
import { getSession } from '../../../src/lib/session';
import { verifyApiKey } from '../../../src/lib/auth';

async function requireAuth(req: NextApiRequest, res: NextApiResponse) {
  const bearer = req.headers.authorization?.split(' ')[1];
  if (bearer) {
    const rec = await verifyApiKey(bearer);
    if (rec) return true;
  }
  const session = getSession(req as any);
  if (session) return true;
  res.status(401).json({ success: false });
  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await requireAuth(req, res))) return;
  const { id } = req.query;
  const provider = getProvider('miraie');
  if (!provider) return res.status(500).json({ success: false, error: 'NO_PROVIDER' });
  const state = await provider.getDeviceState(String(id));
  if (!state) return res.status(404).json({ success: false, error: 'INVALID_DEVICE' });
  res.json({ success: true, device: state });
}
