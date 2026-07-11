'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Device = {
    id: string;
    cpu_usage: number;
    ram_usage: number;
    battery_level: number;
    is_charging: boolean;
    apps_abertos: string;
    status: 'ONLINE' | 'OFFLINE';
    last_seen: string;
    tag: string | null;
};

function TagEditor({
    deviceId,
    tag,
    onSaved
}: {
    deviceId: string;
    tag: string | null;
    onSaved: (tag: string | null) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(tag ?? '');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setValue(tag ?? '');
    }, [tag]);

    async function save() {
        setSaving(true);
        try {
            const res = await fetch(`/api/devices/${deviceId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tag: value })
            });
            if (res.ok) {
                const updated = await res.json();
                onSaved(updated.tag);
            }
        } finally {
            setSaving(false);
            setEditing(false);
        }
    }

    if (editing) {
        return (
            <input
                className="tag-input"
                value={value}
                autoFocus
                disabled={saving}
                placeholder="ex: Casa"
                maxLength={40}
                onChange={(e) => setValue(e.target.value)}
                onBlur={save}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                    if (e.key === 'Escape') {
                        setValue(tag ?? '');
                        setEditing(false);
                    }
                }}
            />
        );
    }

    return (
        <button className="tag-pill" onClick={() => setEditing(true)} title="Clique para editar a tag">
            {tag || '+ tag'}
        </button>
    );
}

function barClass(value: number) {
    if (value >= 85) return 'metric-fill danger';
    if (value >= 65) return 'metric-fill warn';
    return 'metric-fill';
}

function timeAgo(iso: string) {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (seconds < 60) return `há ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `há ${minutes}min`;
    return `há ${Math.floor(minutes / 60)}h`;
}

export default function Dashboard() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [, forceTick] = useState(0);
    const router = useRouter();

    useEffect(() => {
        async function load() {
            const res = await fetch('/api/devices');
            if (res.ok) setDevices(await res.json());
        }
        load();
        const interval = setInterval(load, 2000);
        const clock = setInterval(() => forceTick((t) => t + 1), 1000);
        return () => {
            clearInterval(interval);
            clearInterval(clock);
        };
    }, []);

    async function handleLogout() {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.signOut();
        router.push('/login');
    }

    function updateDeviceTag(id: string, tag: string | null) {
        setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, tag } : d)));
    }

    const onlineCount = devices.filter((d) => d.status === 'ONLINE').length;

    return (
        <div className="page">
            <div className="header">
                <div>
                    <div className="brand">
                        <span className="brand-dot" />
                        <h1>OObservador</h1>
                    </div>
                    <p className="subtitle">Monitoramento em tempo real</p>
                </div>
                <button className="btn" onClick={handleLogout}>Sair</button>
            </div>

            <div className="summary-bar">
                <div className="summary-pill"><strong>{devices.length}</strong> dispositivo(s)</div>
                <div className="summary-pill"><strong>{onlineCount}</strong> online</div>
            </div>

            {devices.length === 0 ? (
                <div className="empty-state">Aguardando conexão de agentes...</div>
            ) : (
                <div className="grid">
                    {devices.map((d) => (
                        <div className="card" key={d.id}>
                            <div className="card-top">
                                <div className="device-id-row">
                                    <span className="device-id">{d.id}</span>
                                    <TagEditor deviceId={d.id} tag={d.tag} onSaved={(tag) => updateDeviceTag(d.id, tag)} />
                                </div>
                                <span className={`badge ${d.status === 'ONLINE' ? 'badge-online' : 'badge-offline'}`}>
                                    <span className="badge-dot" />
                                    {d.status === 'ONLINE' ? 'Online' : 'Offline'}
                                </span>
                            </div>

                            <div className="metrics">
                                <div className="metric-row">
                                    <span className="metric-label">CPU</span>
                                    <div className="metric-bar">
                                        <div className={barClass(d.cpu_usage)} style={{ width: `${Math.min(100, d.cpu_usage)}%` }} />
                                    </div>
                                    <span className="metric-value">{d.cpu_usage}%</span>
                                </div>
                                <div className="metric-row">
                                    <span className="metric-label">RAM</span>
                                    <div className="metric-bar">
                                        <div className={barClass(d.ram_usage)} style={{ width: `${Math.min(100, d.ram_usage)}%` }} />
                                    </div>
                                    <span className="metric-value">{d.ram_usage}%</span>
                                </div>
                                <div className="battery-row">
                                    {d.is_charging ? '⚡' : '🔋'} Bateria {d.battery_level}%
                                </div>
                            </div>

                            <div className="chips">
                                {d.apps_abertos
                                    ? d.apps_abertos.split(', ').map((app) => (
                                        <span className="chip" key={app}>{app}</span>
                                    ))
                                    : <span className="chip">Área de Trabalho</span>}
                            </div>

                            <div className="card-footer">
                                Atualizado {timeAgo(d.last_seen)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
