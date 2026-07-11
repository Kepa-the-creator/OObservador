import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { evaluateSustainedAlerts } from '@/lib/alerts';

export const dynamic = 'force-dynamic';

const AGENT_TOKEN = process.env.AGENT_TOKEN;
const METRICS_RETENTION_MS = 60 * 60 * 1000; // 1 hora de histórico

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

    const admin = getSupabaseAdmin();

    const { error } = await admin.from('devices').upsert({
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

    // Histórico para os gráficos - aguardamos (funções serverless podem
    // congelar assim que a resposta é enviada, então "disparar e esquecer"
    // arriscaria perder a escrita). Falha aqui não derruba a resposta, o
    // status ao vivo (upsert acima) é o que importa de verdade.
    const [{ error: metricsError }, { error: cleanupError }] = await Promise.all([
        admin.from('device_metrics').insert({
            device_id: payload.id,
            cpu_usage: payload.cpuUsage,
            ram_usage: payload.ramUsage,
            disk_usage: payload.diskUsage
        }),
        admin.from('device_metrics')
            .delete()
            .eq('device_id', payload.id)
            .lt('recorded_at', new Date(Date.now() - METRICS_RETENTION_MS).toISOString())
    ]);

    if (metricsError) console.error('metrics insert:', metricsError);
    if (cleanupError) console.error('metrics cleanup:', cleanupError);

    try {
        await evaluateSustainedAlerts(admin, payload.id);
    } catch (alertError) {
        console.error('alert evaluation:', alertError);
    }

    return new NextResponse(null, { status: 204 });
}
