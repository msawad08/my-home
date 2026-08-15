import useSWR from 'swr';
import { useEffect } from 'react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function Dashboard() {
  const { data, error, mutate } = useSWR('/api/devices', fetcher);

  useEffect(() => {
    const t = setInterval(() => mutate(), 5000);
    return () => clearInterval(t);
  }, [mutate]);

  if (!data) return <div>Loading...</div>;
  if (error) return <div>Error</div>;
  if (data && data.success === false) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Devices</h1>
        <p>You must be signed in to view devices. <a href="/login">Sign in</a></p>
      </main>
    );
  }

  const devices = data?.devices || [];

  return (
    <main style={{ padding: 24 }}>
      <h1>Devices</h1>
      <ul>
        {devices.map((d: any) => (
          <li key={d.id} style={{ marginBottom: 12 }}>
            <strong>{d.name}</strong> — {d.online ? 'online' : 'offline'} — power: {d.power ? 'on' : 'off'}
            <div>
              <button onClick={async () => { await fetch(`/api/devices/${d.id}/command`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ power: true }) }); mutate(); }}>Power On</button>
              <button onClick={async () => { await fetch(`/api/devices/${d.id}/command`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ power: false }) }); mutate(); }}>Power Off</button>
            </div>
            <div>Current: {d.currentTemperature}°C — Target: {d.targetTemperature}°C</div>
          </li>
        ))}
      </ul>
    </main>
  );
}
