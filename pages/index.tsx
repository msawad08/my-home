import useSWR from 'swr';
import { useEffect, useState } from 'react';

type Device = { id: string; name?: string; online: boolean; power: boolean; mode?: string; targetTemperature?: number; currentTemperature?: number; modes?: string[] };
const fetcher = (url: string) => fetch(url).then(async (response) => {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to load devices');
  return data;
});

export default function Dashboard() {
  const { data, error, mutate, isValidating } = useSWR<{ success: boolean; devices: Device[] }>('/api/devices', fetcher, { refreshInterval: 15_000 });
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [tempEdits, setTempEdits] = useState<Record<string, number>>({});
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => { if (notice) { const timeout = window.setTimeout(() => setNotice(null), 4_000); return () => clearTimeout(timeout); } }, [notice]);

  async function sendCommand(id: string, payload: Record<string, unknown>) {
    setLoading((state) => ({ ...state, [id]: true })); setNotice(null);
    try {
      const response = await fetch(`/api/devices/${id}/command`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Command failed');
      await mutate(); setNotice('Device updated.');
    } catch (err) { setNotice(err instanceof Error ? err.message : 'Command failed'); }
    finally { setLoading((state) => ({ ...state, [id]: false })); }
  }
  const clampTemp = (value: number) => Math.max(16, Math.min(30, Math.round(value)));
  if (!data && !error) return <main style={styles.page}><p style={styles.muted}>Loading your devices…</p></main>;
  if (error) return <main style={styles.page}><h1 style={styles.title}>Devices</h1><section style={styles.card}><p style={styles.error}>You must be signed in to view devices.</p><a href="/login" style={styles.primary}>Sign in</a></section></main>;
  const devices = data?.devices ?? [];
  return <main style={styles.page}>
    <header style={styles.header}><div><p style={styles.eyebrow}>MY HOME</p><h1 style={styles.title}>Climate control</h1><p style={styles.muted}>Live status refreshes automatically every 15 seconds.</p></div><nav style={styles.nav}><button style={styles.refresh} onClick={() => mutate()} disabled={isValidating}>{isValidating ? 'Refreshing…' : 'Refresh'}</button><a href="/apikeys" style={styles.link}>API keys</a><a href="/login" style={styles.link}>Account</a></nav></header>
    {notice && <p role="status" style={notice === 'Device updated.' ? styles.success : styles.error}>{notice}</p>}
    {devices.length === 0 && <section style={styles.card}><h2 style={styles.cardTitle}>No devices found</h2><p style={styles.muted}>Check your MirAIe credentials and make sure the device is online.</p></section>}
    <div style={styles.grid}>{devices.map((device) => {
      const busy = Boolean(loading[device.id]); const offline = !device.online; const temp = tempEdits[device.id] ?? device.targetTemperature ?? 24; const modes = device.modes ?? ['auto', 'cool', 'heat', 'dry', 'fan'];
      return <section key={device.id} style={{ ...styles.card, opacity: offline ? .72 : 1 }}><div style={styles.cardHeader}><div><h2 style={styles.cardTitle}>{device.name || device.id}</h2><span style={offline ? styles.offline : styles.online}>{offline ? '● Offline' : '● Online'}</span></div><strong style={styles.power}>{device.power ? 'ON' : 'OFF'}</strong></div>
        <div style={styles.controls}><button style={styles.primary} disabled={offline || busy || device.power} onClick={() => sendCommand(device.id, { power: true })}>Power on</button><button style={styles.secondary} disabled={offline || busy || !device.power} onClick={() => sendCommand(device.id, { power: false })}>Power off</button></div>
        <div style={styles.section}><span style={styles.label}>Mode</span><div style={styles.modeRow}>{modes.map((mode) => <button key={mode} style={device.mode === mode ? styles.modeActive : styles.mode} disabled={offline || busy || device.mode === mode} onClick={() => sendCommand(device.id, { mode })}>{mode}</button>)}</div></div>
        <div style={styles.temperature}><div style={styles.temperatureReading}><span style={styles.label}>Room temperature</span><strong style={styles.tempValue}>{device.currentTemperature === undefined ? '—' : `${device.currentTemperature}°`}</strong><small style={styles.temperatureHint}>{device.currentTemperature === undefined ? 'Waiting for a live device reading' : 'Live sensor reading'}</small></div><div><span style={styles.label}>Set temperature</span><div style={styles.stepper}><button aria-label="Decrease target temperature" disabled={offline || busy} onClick={() => setTempEdits((items) => ({ ...items, [device.id]: clampTemp(temp - 1) }))}>−</button><output aria-label="Target temperature">{temp}°</output><button aria-label="Increase target temperature" disabled={offline || busy} onClick={() => setTempEdits((items) => ({ ...items, [device.id]: clampTemp(temp + 1) }))}>+</button></div></div><button style={styles.secondary} disabled={offline || busy} onClick={() => sendCommand(device.id, { temperature: temp })}>{busy ? 'Saving…' : 'Apply'}</button></div>
      </section>;
    })}</div>
  </main>;
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1120, margin: '0 auto', padding: '48px 24px', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', color: '#172033' }, header: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 16, marginBottom: 32 }, nav: { display: 'flex', gap: 18, alignItems: 'center' }, eyebrow: { fontSize: 12, color: '#61708a', fontWeight: 800, letterSpacing: 1.5, margin: 0 }, title: { fontSize: 36, margin: '6px 0' }, muted: { color: '#61708a', margin: 0 }, link: { color: '#2563eb', textDecoration: 'none', fontWeight: 700 }, refresh: { border: '1px solid #b8c4d6', borderRadius: 8, background: '#fff', color: '#172033', padding: '8px 10px', fontWeight: 700, cursor: 'pointer' }, grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 20 }, card: { background: '#fff', border: '1px solid #dbe3ef', borderRadius: 16, padding: 22, boxShadow: '0 8px 20px rgba(23,32,51,.04)' }, cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'start' }, cardTitle: { margin: 0, fontSize: 20 }, online: { color: '#15803d', fontWeight: 700, fontSize: 13 }, offline: { color: '#64748b', fontWeight: 700, fontSize: 13 }, power: { color: '#2563eb', letterSpacing: 1 }, controls: { display: 'flex', gap: 8, marginTop: 20 }, primary: { display: 'inline-block', border: 0, borderRadius: 8, background: '#2563eb', color: '#fff', padding: '10px 13px', fontWeight: 700, textDecoration: 'none', cursor: 'pointer' }, secondary: { border: '1px solid #b8c4d6', borderRadius: 8, background: '#fff', color: '#172033', padding: '9px 12px', fontWeight: 700, cursor: 'pointer' }, section: { marginTop: 22 }, label: { display: 'block', color: '#61708a', textTransform: 'uppercase', fontWeight: 800, letterSpacing: .8, fontSize: 11, marginBottom: 7 }, modeRow: { display: 'flex', gap: 6, flexWrap: 'wrap' }, mode: { border: '1px solid #dbe3ef', background: '#fff', borderRadius: 7, padding: '7px 9px', textTransform: 'capitalize', cursor: 'pointer' }, modeActive: { border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', borderRadius: 7, padding: '7px 9px', textTransform: 'capitalize', fontWeight: 700 }, temperature: { display: 'grid', gridTemplateColumns: '1fr 1fr auto', alignItems: 'end', gap: 16, marginTop: 22 }, temperatureReading: { minWidth: 130 }, tempValue: { display: 'block', fontSize: 32, lineHeight: 1 }, temperatureHint: { display: 'block', color: '#61708a', fontSize: 11, marginTop: 6 }, stepper: { display: 'flex', alignItems: 'center', border: '1px solid #dbe3ef', borderRadius: 8, overflow: 'hidden' }, success: { color: '#166534', fontWeight: 700, marginBottom: 16 }, error: { color: '#b42318', fontWeight: 700, marginBottom: 16 },
};
