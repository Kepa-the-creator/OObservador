import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const DEFAULT_WINDOW_MINUTES = 30;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const windowMinutes = Number(req.nextUrl.searchParams.get('minutes')) || DEFAULT_WINDOW_MINUTES;
    const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

    const { data, error } = await getSupabaseAdmin()
        .from('device_metrics')
        .select('cpu_usage, ram_usage, disk_usage, recorded_at')
        .eq('device_id', id)
        .gte('recorded_at', since)
        .order('recorded_at', { ascending: true });

    if (error) {
        return NextResponse.json({ error: 'db error' }, { status: 500 });
    }

    return NextResponse.json(data || []);
}
