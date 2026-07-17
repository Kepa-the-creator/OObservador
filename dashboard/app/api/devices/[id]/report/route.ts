import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { generateActivityReportPdf } from '@/lib/reportPdf';

export const dynamic = 'force-dynamic';

function getPeriodRange(period: 'week' | 'month') {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - (period === 'month' ? 30 : 7));
    return { start, end };
}

function toDateStr(d: Date) {
    return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const period: 'week' | 'month' = req.nextUrl.searchParams.get('period') === 'month' ? 'month' : 'week';
    const { start, end } = getPeriodRange(period);

    const admin = getSupabaseAdmin();

    const [{ data: dailyUsage }, { data: appUsage }] = await Promise.all([
        admin.from('device_daily_usage')
            .select('date, seconds_online')
            .eq('device_id', id)
            .gte('date', toDateStr(start))
            .lte('date', toDateStr(end)),
        admin.from('app_daily_usage')
            .select('app_name, seconds_seen')
            .eq('device_id', id)
            .gte('date', toDateStr(start))
            .lte('date', toDateStr(end))
    ]);

    const totalOnlineSeconds = (dailyUsage || []).reduce((sum, d) => sum + Number(d.seconds_online), 0);

    const appTotals = new Map<string, number>();
    for (const row of appUsage || []) {
        appTotals.set(row.app_name, (appTotals.get(row.app_name) || 0) + Number(row.seconds_seen));
    }

    const topApps = [...appTotals.entries()]
        .map(([app_name, seconds]) => ({ app_name, seconds }))
        .sort((a, b) => b.seconds - a.seconds)
        .slice(0, 15);

    const possibleSeconds = (period === 'month' ? 30 : 7) * 86400;

    const pdfBuffer = await generateActivityReportPdf({
        deviceId: id,
        periodLabel: period === 'month' ? 'Mensal' : 'Semanal',
        periodStart: toDateStr(start),
        periodEnd: toDateStr(end),
        totalOnlineSeconds,
        possibleSeconds,
        topApps,
        generatedAt: new Date().toLocaleString('pt-BR')
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="relatorio-${id}-${period}.pdf"`
        }
    });
}
