'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');

        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        setLoading(false);

        if (error) {
            setError('Email ou senha inválidos.');
            return;
        }

        router.push('/');
        router.refresh();
    }

    return (
        <main style={{ fontFamily: 'monospace', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0b0b', color: '#eee' }}>
            <form onSubmit={handleSubmit} style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h1 style={{ fontSize: 20 }}>OObservador — Login</h1>
                <input
                    type="email"
                    placeholder="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ padding: 8, background: '#1a1a1a', color: '#eee', border: '1px solid #333' }}
                />
                <input
                    type="password"
                    placeholder="senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ padding: 8, background: '#1a1a1a', color: '#eee', border: '1px solid #333' }}
                />
                {error && <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>}
                <button
                    type="submit"
                    disabled={loading}
                    style={{ padding: 8, background: '#22c55e', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    {loading ? 'Entrando...' : 'Entrar'}
                </button>
            </form>
        </main>
    );
}
