import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [sessionUser, setSessionUser] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => { if (d.authenticated) setSessionUser(d.username); });
  }, []);

  async function submit(e: any) {
    e.preventDefault();
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    const data = await res.json();
    if (data.success) router.push('/');
    else alert('Login failed');
  }

  async function logout() {
    await fetch('/api/auth/login', { method: 'DELETE' });
    setSessionUser(null);
  }

  if (sessionUser) {
    return (
      <main style={{ padding: 24 }}>
        <h2>Signed in as {sessionUser}</h2>
        <button onClick={() => router.push('/')}>Go to dashboard</button>
        <button onClick={logout} style={{ marginLeft: 8 }}>Sign out</button>
      </main>
    );
  }

  return (
    <main style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={submit} style={{ width: 320 }}>
        <h2>Login</h2>
        <div>
          <label>Username</label>
          <input value={username} onChange={e => setUsername(e.target.value)} />
        </div>
        <div>
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <button type="submit">Sign in</button>
      </form>
    </main>
  );
}
