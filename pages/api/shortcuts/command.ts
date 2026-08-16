import type { NextApiRequest, NextApiResponse } from 'next';
import { getProvider } from '../../../src/providers/registry';
import { verifyApiKey } from '../../../src/lib/auth';
import { validateDeviceCommand } from '../../../src/lib/validation';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const bearer = req.headers.authorization?.split(' ')[1] || req.body?.apiKey;
  if (!bearer) return res.status(401).json({ success: false });
  if (!(await verifyApiKey(bearer))) return res.status(401).json({ success: false });

  const { deviceId, command } = req.body || {};
  if (!deviceId || !command) return res.status(400).json({ success: false, error: 'MISSING_PARAMS' });
  const parsed = validateDeviceCommand(command);
  if (!parsed.success) return res.status(400).json({ success: false, error: 'INVALID_COMMAND', details: parsed.error });

  const provider = getProvider('miraie');
  if (!provider) return res.status(500).json({ success: false, error: 'NO_PROVIDER' });
  try {
    const device = await provider.executeCommand(String(deviceId), parsed.data!);
    return res.json({ success: true, device });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
}
