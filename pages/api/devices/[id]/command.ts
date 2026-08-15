import type { NextApiRequest, NextApiResponse } from 'next';
import '../../../src/providers/miraie';
import { getProvider } from '../../../src/providers/registry';
import { getSession } from '../../../src/lib/session';
import { verifyApiKey } from '../../../src/lib/auth';
import { DeviceCommandSchema } from '../../../src/lib/validation';

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
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await requireAuth(req, res))) return;
  const { id } = req.query;
  // validate body
  const parse = validateDeviceCommand(req.body || {});
  if (!parse.success) return res.status(400).json({ success: false, error: 'INVALID_COMMAND', details: parse.error });
  const provider = getProvider('miraie');
  if (!provider) return res.status(500).json({ success: false, error: 'NO_PROVIDER' });
  try {
    const device = await provider.executeCommand(String(id), parse.data as any);
    return res.json({ success: true, device });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
}
