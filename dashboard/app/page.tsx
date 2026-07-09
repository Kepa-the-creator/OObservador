'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Device = {
    id: string;
    cpu_usage: number;
    ram_usage: number;
    battery_level: number;
    apps_abertos: string;
    status: 'ONLINE' | 'OFFLINE';
};

export default function Dashboard() {
    const [devices, setDevices] = useState<Device[]>([]);
    const router = useRouter();

    useEffect(() => {
        async function load() {
            const res = await fetch('/api/devices');
            if (res.ok) setDevices(await res.json());
        }
        load();
        const interval = setInterval(load, 2000);
        return () => clearInterval(interval);
    }, []);

    async function handleLogout() {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.signOut();
        router.push('/login');
    }

    return (
        <main style={{ fontFamily: 'monospace', padding: 24, background: '#0b0b0b', color: '#eee', minHeight: '100vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>OObservador — Dashboard</h1>
                <button
                    onClick={handleLogout}
                    style={{ padding: '6px 12px', background: '#1a1a1a', color: '#eee', border: '1px solid #333', cursor: 'pointer' }}
                >
                    Sair
                </button>
            </div>
            <p>{devices.length} dispositivo(s)</p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #333' }}>
                        <th>Status</th>
                        <th>ID</th>
                        <th>CPU%</th>
                        <th>RAM%</th>
                        <th>Bateria%</th>
                        <th>Apps Abertos</th>
                    </tr>
                </thead>
                <tbody>
                    {devices.map((d) => (
                        <tr key={d.id} style={{ borderBottom: '1px solid #222' }}>
                            <td>{d.status === 'ONLINE' ? '🟢 ON' : '🔴 OFF'}</td>
                            <td>{d.id}</td>
                            <td>{d.cpu_usage}</td>
                            <td>{d.ram_usage}</td>
                            <td>{d.battery_level}</td>
                            <td>{d.apps_abertos}</td>
                        </tr>
                    ))}
                    {devices.length === 0 && (
                        <tr><td colSpan={6}>Aguardando conexão de agentes...</td></tr>
                    )}
                </tbody>
            </table>
        </main>
    );
}
