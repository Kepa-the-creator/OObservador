import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const AGENT_TOKEN = process.env.AGENT_TOKEN;

export async function POST(req: NextRequest) {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

    if (!AGENT_TOKEN || token !== AGENT_TOKEN) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    if (!payload?.id) {
        return NextResponse.json({ error: 'missing id' }, { status: 400 });
    }

    const { error } = await getSupabaseAdmin().from('devices').upsert({
        id: payload.id,
        hostname: payload.hostname,
        cpu_usage: payload.cpuUsage,
        ram_usage: payload.ramUsage,
        disk_usage: payload.diskUsage,
        uptime_seconds: payload.uptimeSeconds,
        net_download: payload.netDownload,
        net_upload: payload.netUpload,
        wifi_ssid: payload.wifiSsid,
        battery_level: payload.batteryLevel,
        is_charging: payload.isCharging,
        janela_ativa: payload.janelaAtiva,
        apps_abertos: payload.appsAbertos,
        last_seen: new Date().toISOString()
    });

    if (error) {
        console.error(error);
        return NextResponse.json({ error: 'db error' }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
}
