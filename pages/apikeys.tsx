import { useEffect, useState } from 'react';

type ApiKey = { name: string; key: string; expiresAt?: string; revoked?: boolean };

export default function ApiKeysPage() {
  const [key, setKey] = useState<string | null>(null);
  const [name, setName] = useState('iPhone Shortcut');
  const [keys, setKeys] = useState<ApiKey[]>([]);

  async function loadKeys() {
    const res = await fetch('/api/auth/apikey');
    const data = await res.json();
    if (data.success) setKeys(data.keys || []);
  }

  useEffect(() => { loadKeys(); }, []);

  async function createKey() {
    const res = await fetch('/api/auth/apikey', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    const data = await res.json();
    if (data.success) {
      setKey(data.key);
      loadKeys();
    }
  }

  async function revoke(k: string) {
    const res = await fetch('/api/auth/apikey', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k }) });
    const data = await res.json();
    if (data.success) loadKeys();
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>API Keys</h1>
      <div>
        <label>Name</label>
        <input value={name} onChange={e => setName(e.target.value)} />
        <button onClick={createKey}>Generate Key</button>
      </div>
      {key && (
        <div>
          <h3>New Key</h3>
          <pre style={{ background: '#f6f8fa', padding: 8 }}>{key}</pre>
          <p>Store this value securely; it will not be shown again.</p>
        </div>
      )}

      <h2>Existing Keys</h2>
      <ul>
        {keys.map(k => (
          <li key={k.key} style={{ marginBottom: 8 }}>
            <strong>{k.name}</strong> — {k.expiresAt ? `Expires ${k.expiresAt}` : 'No expiry'} — {k.revoked ? 'Revoked' : 'Active'}
            {!k.revoked && <button style={{ marginLeft: 8 }} onClick={() => revoke(k.key)}>Revoke</button>}
          </li>
        ))}
      </ul>
    </main>
  );
}
