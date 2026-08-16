import type { NextApiRequest, NextApiResponse } from 'next';
import '../../../../src/providers/miraie';
import { getProvider } from '../../../../src/providers/registry';
import { getSession } from '../../../../src/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end();
  }
  if (!getSession(req)) return res.status(401).json({ success: false });
  const provider = getProvider('miraie');
  if (!provider || !('getDeviceDiagnostics' in provider)) return res.status(500).json({ success: false, error: 'NO_PROVIDER' });
  const id = String(req.query.id);
  const status = await (provider as typeof provider & { getDeviceDiagnostics(deviceId: string): Promise<Record<string, unknown> | null> }).getDeviceDiagnostics(id);
  if (status === null) return res.status(404).json({ success: false, error: 'INVALID_DEVICE' });
  return res.json({ success: true, status });
}
