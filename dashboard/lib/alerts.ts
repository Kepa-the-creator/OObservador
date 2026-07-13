import type { SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_THRESHOLDS = { cpu: 90, ram: 90, disk: 90 } as const;
const DEFAULT_SUSTAIN_MINUTES = 5;
const LABELS = { cpu: 'CPU', ram: 'RAM', disk: 'Disco' } as const;

type MetricKey = keyof typeof DEFAULT_THRESHOLDS;

export type AlertSettings = {
    cpu_threshold: number;
    ram_threshold: number;
    disk_threshold: number;
    sustain_minutes: number;
};

export async function getAlertSettings(admin: SupabaseClient): Promise<AlertSettings> {
    const { data } = await admin.from('app_settings').select('*').eq('id', 1).maybeSingle();

    return {
        cpu_threshold: data?.cpu_threshold ?? DEFAULT_THRESHOLDS.cpu,
        ram_threshold: data?.ram_threshold ?? DEFAULT_THRESHOLDS.ram,
        disk_threshold: data?.disk_threshold ?? DEFAULT_THRESHOLDS.disk,
        sustain_minutes: data?.sustain_minutes ?? DEFAULT_SUSTAIN_MINUTES
    };
}

export async function ensureAlertOpen(
    admin: SupabaseClient,
    deviceId: string,
    type: string,
    message: string
) {
    const { data: existing } = await admin
        .from('alerts')
        .select('id')
        .eq('device_id', deviceId)
        .eq('type', type)
        .is('resolved_at', null)
        .maybeSingle();

    if (!existing) {
        await admin.from('alerts').insert({ device_id: deviceId, type, message });
    }
}

export async function resolveAlertIfOpen(admin: SupabaseClient, deviceId: string, type: string) {
    await admin
        .from('alerts')
        .update({ resolved_at: new Date().toISOString() })
        .eq('device_id', deviceId)
        .eq('type', type)
        .is('resolved_at', null);
}

// Checa se CPU/RAM/disco ficaram acima do limite configurado pelos últimos
// N minutos inteiros (não só o valor mais recente), usando o histórico que
// já é salvo pro sparkline - não precisa de tabela nova nem de job
// separado, roda dentro do próprio POST /api/vitals.
export async function evaluateSustainedAlerts(admin: SupabaseClient, deviceId: string) {
    const settings = await getAlertSettings(admin);
    const sustainMinutes = settings.sustain_minutes;
    const minAgeMinutes = Math.max(1, sustainMinutes - 1);

    const since = new Date(Date.now() - sustainMinutes * 60 * 1000).toISOString();

    const { data: points } = await admin
        .from('device_metrics')
        .select('cpu_usage, ram_usage, disk_usage, recorded_at')
        .eq('device_id', deviceId)
        .gte('recorded_at', since)
        .order('recorded_at', { ascending: true });

    if (!points || points.length < 2) return;

    const oldestAgeMinutes = (Date.now() - new Date(points[0].recorded_at).getTime()) / 60000;
    const hasEnoughHistory = oldestAgeMinutes >= minAgeMinutes;

    const fields: { key: MetricKey; field: 'cpu_usage' | 'ram_usage' | 'disk_usage'; threshold: number }[] = [
        { key: 'cpu', field: 'cpu_usage', threshold: settings.cpu_threshold },
        { key: 'ram', field: 'ram_usage', threshold: settings.ram_threshold },
        { key: 'disk', field: 'disk_usage', threshold: settings.disk_threshold }
    ];

    for (const { key, field, threshold } of fields) {
        const values = points
            .map((p: Record<string, number | string | null>) => p[field])
            .filter((v: number | string | null): v is number => typeof v === 'number');

        const type = `${key}_high`;
        const sustained = hasEnoughHistory && values.length >= 2 && Math.min(...values) >= threshold;

        if (sustained) {
            await ensureAlertOpen(
                admin,
                deviceId,
                type,
                `${LABELS[key]} acima de ${threshold}% por mais de ${sustainMinutes} minutos`
            );
        } else {
            await resolveAlertIfOpen(admin, deviceId, type);
        }
    }
}
