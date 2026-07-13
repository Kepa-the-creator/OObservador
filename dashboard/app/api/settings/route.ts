import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getAlertSettings } from '@/lib/alerts';

export const dynamic = 'force-dynamic';

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

export async function GET() {
    const settings = await getAlertSettings(getSupabaseAdmin());
    return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
    const body = await req.json();

    const cpu = Number(body.cpu_threshold);
    const ram = Number(body.ram_threshold);
    const disk = Number(body.disk_threshold);
    const sustain = Number(body.sustain_minutes);

    if ([cpu, ram, disk, sustain].some((n) => Number.isNaN(n))) {
        return NextResponse.json({ error: 'valores inválidos' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    const { data, error } = await admin
        .from('app_settings')
        .upsert({
            id: 1,
            cpu_threshold: clamp(cpu, 1, 100),
            ram_threshold: clamp(ram, 1, 100),
            disk_threshold: clamp(disk, 1, 100),
            sustain_minutes: clamp(sustain, 1, 60),
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: 'db error' }, { status: 500 });
    }

    return NextResponse.json(data);
}
