import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const MAX_TAG_LENGTH = 40;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await req.json();

    if (typeof body.tag !== 'string') {
        return NextResponse.json({ error: 'tag deve ser uma string' }, { status: 400 });
    }

    const tag = body.tag.trim().slice(0, MAX_TAG_LENGTH);

    const { data, error } = await getSupabaseAdmin()
        .from('devices')
        .update({ tag: tag || null })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: 'db error' }, { status: 500 });
    }

    return NextResponse.json(data);
}
