import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const OFFLINE_THRESHOLD_MS = 12000;

export async function GET() {
    const { data, error } = await getSupabaseAdmin()
        .from('devices')
        .select('*')
        .order('id');

    if (error) {
        return NextResponse.json({ error: 'db error' }, { status: 500 });
    }

    const now = Date.now();
    const devices = (data || []).map((d) => ({
        ...d,
        status: now - new Date(d.last_seen).getTime() > OFFLINE_THRESHOLD_MS ? 'OFFLINE' : 'ONLINE'
    }));

    return NextResponse.json(devices);
}
