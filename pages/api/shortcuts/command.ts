import type { NextApiRequest, NextApiResponse } from 'next';
import { getProvider } from '../../../src/providers/registry';
import storage from '../../../src/lib/storage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const bearer = req.headers.authorization?.split(' ')[1] || req.body?.apiKey;
  if (!bearer) return res.status(401).json({ success: false });
  const rec = await storage.getApiKeyRecord(bearer);
  if (!rec) return res.status(401).json({ success: false });

  const { deviceId, command } = req.body || {};
  if (!deviceId || !command) return res.status(400).json({ success: false, error: 'MISSING_PARAMS' });

  const provider = getProvider('miraie');
  if (!provider) return res.status(500).json({ success: false, error: 'NO_PROVIDER' });
  try {
    const device = await provider.executeCommand(String(deviceId), command as any);
    return res.json({ success: true, device });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
}
