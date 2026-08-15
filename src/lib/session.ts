import { IncomingMessage } from 'http';
import { serialize } from 'cookie';

export function setSessionCookie(res: any, username: string) {
  const cookie = serialize('session', encodeURIComponent(username), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 1 day
  });
  res.setHeader('Set-Cookie', cookie);
}

export function clearSessionCookie(res: any) {
  const cookie = serialize('session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  res.setHeader('Set-Cookie', cookie);
}

export function getSession(req: IncomingMessage) {
  const header = req.headers.cookie;
  if (!header) return null;
  const pairs = header.split(';').map(s => s.trim());
  for (const p of pairs) {
    const [k, v] = p.split('=');
    if (k === 'session') return decodeURIComponent(v || '');
  }
  return null;
}
