import type { SupabaseClient } from '@supabase/supabase-js';

const THRESHOLDS = { cpu: 90, ram: 90, disk: 90 } as const;
const LABELS = { cpu: 'CPU', ram: 'RAM', disk: 'Disco' } as const;
const SUSTAIN_MINUTES = 5;
const MIN_AGE_MINUTES = 4;

type MetricKey = keyof typeof THRESHOLDS;

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

// Checa se CPU/RAM/disco ficaram acima do limite pelos últimos
// SUSTAIN_MINUTES minutos inteiros (não só o valor mais recente), usando o
// histórico que já é salvo pro sparkline - não precisa de tabela nova nem
// de job separado, roda dentro do próprio POST /api/vitals.
export async function evaluateSustainedAlerts(admin: SupabaseClient, deviceId: string) {
    const since = new Date(Date.now() - SUSTAIN_MINUTES * 60 * 1000).toISOString();

    const { data: points } = await admin
        .from('device_metrics')
        .select('cpu_usage, ram_usage, disk_usage, recorded_at')
        .eq('device_id', deviceId)
        .gte('recorded_at', since)
        .order('recorded_at', { ascending: true });

    if (!points || points.length < 2) return;

    const oldestAgeMinutes = (Date.now() - new Date(points[0].recorded_at).getTime()) / 60000;
    const hasEnoughHistory = oldestAgeMinutes >= MIN_AGE_MINUTES;

    const fields: { key: MetricKey; field: 'cpu_usage' | 'ram_usage' | 'disk_usage' }[] = [
        { key: 'cpu', field: 'cpu_usage' },
        { key: 'ram', field: 'ram_usage' },
        { key: 'disk', field: 'disk_usage' }
    ];

    for (const { key, field } of fields) {
        const values = points
            .map((p: Record<string, number | string | null>) => p[field])
            .filter((v: number | string | null): v is number => typeof v === 'number');

        const type = `${key}_high`;
        const sustained = hasEnoughHistory && values.length >= 2 && Math.min(...values) >= THRESHOLDS[key];

        if (sustained) {
            await ensureAlertOpen(
                admin,
                deviceId,
                type,
                `${LABELS[key]} acima de ${THRESHOLDS[key]}% por mais de ${SUSTAIN_MINUTES} minutos`
            );
        } else {
            await resolveAlertIfOpen(admin, deviceId, type);
        }
    }
}
