import useSWR from 'swr';
import { useState } from 'react';

type ApiKey = { id: string; name: string; keyHint: string; expiresAt?: string | null; revoked?: boolean };
const fetcher = (url: string) => fetch(url).then(async (response) => {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to load API keys');
  return data;
});

export default function ApiKeysPage() {
  const { data, error, mutate } = useSWR<{ success: boolean; keys: ApiKey[] }>('/api/auth/apikey', fetcher);
  const [name, setName] = useState('iPhone Shortcut');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function createKey() {
    setBusy(true); setMessage(null); setNewKey(null);
    try {
      const response = await fetch('/api/auth/apikey', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not generate key');
      setNewKey(result.key); setMessage('API key created. Copy it now; it will not be shown again.');
      await mutate();
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Could not generate key'); }
    finally { setBusy(false); }
  }

  async function revoke(id: string) {
    setBusy(true); setMessage(null);
    try {
      const response = await fetch('/api/auth/apikey', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not revoke key');
      setMessage('API key revoked.'); await mutate();
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Could not revoke key'); }
    finally { setBusy(false); }
  }

  const keys = data?.keys ?? [];
  return <main style={styles.page}>
    <header style={styles.header}><div><p style={styles.eyebrow}>INTEGRATIONS</p><h1 style={styles.title}>API keys</h1><p style={styles.subtitle}>Create a key for a shortcut or trusted automation.</p></div><a href="/" style={styles.link}>← Dashboard</a></header>
    <section style={styles.card}><h2 style={styles.cardTitle}>Create a key</h2><p style={styles.muted}>Keys are shown exactly once and can be revoked here at any time.</p>
      <div style={styles.formRow}><label style={styles.label}>Name<input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} style={styles.input} disabled={busy} /></label><button onClick={createKey} disabled={busy || !name.trim()} style={styles.primary}>{busy ? 'Working…' : 'Generate key'}</button></div>
      {newKey && <div style={styles.secret}><code style={styles.code}>{newKey}</code></div>}
      {message && <p role="status" style={styles.status}>{message}</p>}
    </section>
    <section style={styles.card}><h2 style={styles.cardTitle}>Existing keys</h2>
      {error && <p style={styles.error}>Sign in to manage API keys.</p>}
      {!data && !error && <p style={styles.muted}>Loading keys…</p>}
      {data && keys.length === 0 && <p style={styles.muted}>No API keys yet.</p>}
      {keys.map((key) => <div key={key.id} style={styles.keyRow}><div><strong>{key.name}</strong><p style={styles.muted}>{key.keyHint} · {key.expiresAt ? `Expires ${new Date(key.expiresAt).toLocaleDateString()}` : 'No expiry'}</p></div><div style={styles.actions}><span style={key.revoked ? styles.revoked : styles.active}>{key.revoked ? 'Revoked' : 'Active'}</span>{!key.revoked && <button onClick={() => revoke(key.id)} disabled={busy} style={styles.danger}>Revoke</button>}</div></div>)}
    </section>
  </main>;
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 880, margin: '0 auto', padding: '48px 24px', color: '#172033', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 20, marginBottom: 32 }, eyebrow: { color: '#61708a', letterSpacing: 1.4, fontWeight: 700, fontSize: 12, margin: 0 }, title: { fontSize: 36, margin: '6px 0' }, subtitle: { color: '#61708a', margin: 0 }, link: { color: '#2563eb', textDecoration: 'none', fontWeight: 600 },
  card: { background: '#fff', border: '1px solid #dbe3ef', borderRadius: 16, padding: 24, marginBottom: 20, boxShadow: '0 8px 20px rgba(23, 32, 51, .04)' }, cardTitle: { margin: '0 0 6px' }, muted: { color: '#61708a', margin: '5px 0', fontSize: 14 }, formRow: { display: 'flex', alignItems: 'end', gap: 12, marginTop: 20, flexWrap: 'wrap' }, label: { display: 'grid', gap: 6, fontWeight: 600, flex: '1 1 260px' }, input: { border: '1px solid #b8c4d6', borderRadius: 8, padding: '10px 12px', fontSize: 16 }, primary: { border: 0, borderRadius: 8, background: '#2563eb', color: 'white', padding: '11px 16px', fontWeight: 700, cursor: 'pointer' }, secret: { marginTop: 18, padding: 14, background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, overflowX: 'auto' }, code: { fontSize: 14 }, status: { color: '#166534', fontWeight: 600 }, error: { color: '#b42318' }, keyRow: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', borderTop: '1px solid #e6ebf2', padding: '16px 0' }, actions: { display: 'flex', alignItems: 'center', gap: 12 }, active: { color: '#166534', fontWeight: 700, fontSize: 13 }, revoked: { color: '#61708a', fontWeight: 700, fontSize: 13 }, danger: { border: '1px solid #fca5a5', borderRadius: 7, color: '#b42318', background: 'white', padding: '7px 10px', fontWeight: 600, cursor: 'pointer' },
};
