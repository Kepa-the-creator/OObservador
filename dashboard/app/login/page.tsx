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
        <main className="login-page">
            <form className="login-card" onSubmit={handleSubmit}>
                <h1><span className="brand-dot" />OObservador</h1>

                <div>
                    <label className="field-label" htmlFor="email">Email</label>
                    <input
                        id="email"
                        className="input"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                    />
                </div>

                <div>
                    <label className="field-label" htmlFor="password">Senha</label>
                    <input
                        id="password"
                        className="input"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                {error && <p className="error-text">{error}</p>}

                <button className="btn btn-primary" type="submit" disabled={loading}>
                    {loading ? 'Entrando...' : 'Entrar'}
                </button>
            </form>
        </main>
    );
}
