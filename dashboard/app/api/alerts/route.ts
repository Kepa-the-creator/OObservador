import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { ensureAlertOpen, resolveAlertIfOpen } from '@/lib/alerts';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = new Set(['offline']);
const RECENT_LIMIT = 30;

export async function GET() {
    const { data, error } = await getSupabaseAdmin()
        .from('alerts')
        .select('id, device_id, type, message, created_at, resolved_at')
        .order('created_at', { ascending: false })
        .limit(RECENT_LIMIT);

    if (error) {
        return NextResponse.json({ error: 'db error' }, { status: 500 });
    }

    return NextResponse.json(data || []);
}

// Usado pelo próprio dashboard (autenticado) pra registrar a transição
// online->offline, já que ela só é detectável enquanto alguém está com o
// painel aberto fazendo polling - não existe um processo em background
// rodando 24/7 além do agent.
export async function POST(req: NextRequest) {
    const body = await req.json();
    const { deviceId, type, message, resolve } = body || {};

    if (typeof deviceId !== 'string' || !ALLOWED_TYPES.has(type)) {
        return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    if (resolve) {
        await resolveAlertIfOpen(admin, deviceId, type);
    } else {
        if (typeof message !== 'string' || !message) {
            return NextResponse.json({ error: 'missing message' }, { status: 400 });
        }
        await ensureAlertOpen(admin, deviceId, type, message);
    }

    return new NextResponse(null, { status: 204 });
}
