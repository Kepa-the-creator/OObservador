import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

// Instanciado sob demanda (não no import do módulo) porque o Next.js
// carrega as rotas durante o build, antes das env vars existirem.
export function getSupabaseAdmin(): SupabaseClient {
    if (!client) {
        client = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SECRET_KEY!,
            { auth: { persistSession: false } }
        );
    }
    return client;
}
