import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
    return updateSession(request);
}

// /api/vitals fica de fora: o agent se autentica com AGENT_TOKEN (Bearer),
// não com sessão de usuário. /login também fica de fora, senão ninguém
// consegue chegar na tela de login pra se autenticar.
export const config = {
    matcher: ['/((?!api/vitals|login|_next/static|_next/image|favicon.ico).*)']
};
