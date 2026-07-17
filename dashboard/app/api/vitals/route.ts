import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { evaluateSustainedAlerts } from '@/lib/alerts';

export const dynamic = 'force-dynamic';

const AGENT_TOKEN = process.env.AGENT_TOKEN;
const METRICS_RETENTION_MS = 60 * 60 * 1000; // 1 hora de histórico
const USAGE_CAP_SECONDS = 15; // teto por leitura, pra gap de reconexão não virar "tempo ligado"

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
    const now = Date.now();

    // Pega o last_seen antigo antes de sobrescrever, pra saber quanto tempo
    // realmente se passou desde a última leitura (vira a base do relatório
    // de uso semanal/mensal).
    const { data: existing } = await admin
        .from('devices')
        .select('last_seen')
        .eq('id', payload.id)
        .maybeSingle();

    const deltaSeconds = existing?.last_seen
        ? Math.min(USAGE_CAP_SECONDS, Math.max(0, (now - new Date(existing.last_seen).getTime()) / 1000))
        : 0;

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
        last_seen: new Date(now).toISOString()
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
            .lt('recorded_at', new Date(now - METRICS_RETENTION_MS).toISOString())
    ]);

    if (metricsError) console.error('metrics insert:', metricsError);
    if (cleanupError) console.error('metrics cleanup:', cleanupError);

    if (deltaSeconds > 0) {
        const today = new Date(now).toISOString().slice(0, 10);
        const apps: string[] = (payload.appsAbertos || '')
            .split(', ')
            .map((a: string) => a.trim())
            .filter((a: string) => a && a !== 'Área de Trabalho');

        const usagePromises = [
            admin.rpc('increment_device_daily_usage', {
                p_device_id: payload.id,
                p_date: today,
                p_seconds: deltaSeconds
            })
        ];

        if (apps.length > 0) {
            usagePromises.push(
                admin.rpc('increment_app_daily_usage_bulk', {
                    p_device_id: payload.id,
                    p_date: today,
                    p_app_names: apps,
                    p_seconds: deltaSeconds
                })
            );
        }

        const usageResults = await Promise.all(usagePromises);
        for (const { error: usageError } of usageResults) {
            if (usageError) console.error('daily usage:', usageError);
        }
    }

    try {
        await evaluateSustainedAlerts(admin, payload.id);
    } catch (alertError) {
        console.error('alert evaluation:', alertError);
    }

    return new NextResponse(null, { status: 204 });
}
