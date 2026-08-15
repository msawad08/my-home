import { useState } from 'react';
import { useRouter } from 'next/router';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  async function submit(e: any) {
    e.preventDefault();
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    const data = await res.json();
    if (data.success) router.push('/');
    else alert('Login failed');
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
