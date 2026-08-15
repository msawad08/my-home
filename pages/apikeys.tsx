import { useState } from 'react';

export default function ApiKeysPage() {
  const [key, setKey] = useState<string | null>(null);
  const [name, setName] = useState('iPhone Shortcut');

  async function createKey() {
    const res = await fetch('/api/auth/apikey', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    const data = await res.json();
    if (data.success) setKey(data.key);
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
    </main>
  );
}
