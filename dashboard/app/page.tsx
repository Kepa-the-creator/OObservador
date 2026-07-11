'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Device = {
    id: string;
    cpu_usage: number;
    ram_usage: number;
    disk_usage: number | null;
    uptime_seconds: number | null;
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

function sparkColor(value: number) {
    if (value >= 85) return 'var(--danger)';
    if (value >= 65) return 'var(--warn)';
    return 'var(--online)';
}

function buildSparkPath(values: number[], width: number, height: number) {
    const stepX = width / (values.length - 1);
    const points = values.map((v, i) => [
        i * stepX,
        height - (Math.min(100, Math.max(0, v)) / 100) * height
    ]);
    const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const area = `${line} L${width},${height} L0,${height} Z`;
    return { line, area, last: points[points.length - 1] };
}

function Sparkline({ deviceId }: { deviceId: string }) {
    const [points, setPoints] = useState<number[]>([]);
    const width = 280;
    const height = 40;

    useEffect(() => {
        let cancelled = false;

        async function load() {
            const res = await fetch(`/api/devices/${deviceId}/metrics?minutes=30`);
            if (res.ok && !cancelled) {
                const data: { cpu_usage: number }[] = await res.json();
                setPoints(data.map((d) => d.cpu_usage));
            }
        }

        load();
        const interval = setInterval(load, 15000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [deviceId]);

    if (points.length < 2) {
        return (
            <div className="spark-wrap">
                <div className="spark-label"><span>CPU · últimos 30min</span></div>
                <div className="spark-empty">Coletando histórico...</div>
            </div>
        );
    }

    const spark = buildSparkPath(points, width, height);
    const color = sparkColor(points[points.length - 1]);

    return (
        <div className="spark-wrap">
            <div className="spark-label">
                <span>CPU · últimos 30min</span>
                <b>{points[points.length - 1]}%</b>
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
                <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke="var(--border)" strokeWidth="1" />
                <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke="var(--border)" strokeWidth="1" />
                <path d={spark.area} fill={color} opacity="0.14" />
                <path d={spark.line} fill="none" stroke={color} strokeWidth="1.6" />
                <circle cx={spark.last[0]} cy={spark.last[1]} r="3" fill={color} />
            </svg>
        </div>
    );
}

function timeAgo(iso: string) {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (seconds < 60) return `há ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `há ${minutes}min`;
    return `há ${Math.floor(minutes / 60)}h`;
}

function formatUptime(seconds: number) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ligado`;
    if (hours > 0) return `${hours}h ${minutes}min ligado`;
    return `${minutes}min ligado`;
}

export default function Dashboard() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [filter, setFilter] = useState<string>('all');
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
    const offlineCount = devices.length - onlineCount;
    const tags = Array.from(
        new Set(devices.map((d) => d.tag).filter((t): t is string => Boolean(t)))
    ).sort((a, b) => a.localeCompare(b));

    const filteredDevices = devices.filter((d) => {
        if (filter === 'all') return true;
        if (filter === 'online') return d.status === 'ONLINE';
        if (filter === 'offline') return d.status === 'OFFLINE';
        return d.tag === filter;
    });

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

            {devices.length > 0 && (
                <div className="filter-bar">
                    <button className={`filter-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
                        Todos <span className="n">{devices.length}</span>
                    </button>
                    <button className={`filter-chip ${filter === 'online' ? 'active' : ''}`} onClick={() => setFilter('online')}>
                        Online <span className="n">{onlineCount}</span>
                    </button>
                    <button className={`filter-chip ${filter === 'offline' ? 'active' : ''}`} onClick={() => setFilter('offline')}>
                        Offline <span className="n">{offlineCount}</span>
                    </button>
                    {tags.map((t) => (
                        <button key={t} className={`filter-chip ${filter === t ? 'active' : ''}`} onClick={() => setFilter(t)}>
                            {t} <span className="n">{devices.filter((d) => d.tag === t).length}</span>
                        </button>
                    ))}
                </div>
            )}

            {devices.length === 0 ? (
                <div className="empty-state">Aguardando conexão de agentes...</div>
            ) : filteredDevices.length === 0 ? (
                <div className="empty-state">Nenhum dispositivo nesse filtro.</div>
            ) : (
                <div className="grid">
                    {filteredDevices.map((d) => (
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

                            {d.uptime_seconds != null && (
                                <div className="uptime-row">{formatUptime(d.uptime_seconds)}</div>
                            )}

                            <Sparkline deviceId={d.id} />

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
                                {d.disk_usage != null && (
                                    <div className="metric-row">
                                        <span className="metric-label">Disco</span>
                                        <div className="metric-bar">
                                            <div className={barClass(d.disk_usage)} style={{ width: `${Math.min(100, d.disk_usage)}%` }} />
                                        </div>
                                        <span className="metric-value">{d.disk_usage}%</span>
                                    </div>
                                )}
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
