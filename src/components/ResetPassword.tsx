import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface ResetPasswordProps {
    onDone: () => void;
}

export default function ResetPassword({ onDone }: ResetPasswordProps) {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (password !== confirm) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            setSuccess(true);
            setTimeout(() => {
                supabase.auth.signOut();
                onDone();
            }, 2500);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Ocurrió un error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-surface rounded-2xl shadow-xl border-2 border-border-color p-8 animate-in">
                <div className="flex flex-col items-center mb-8">
                    <div className="font-mono text-3xl font-bold text-primary tracking-tight mb-2">
                        NU<span className="text-accent-dark">PLAN</span>
                    </div>
                    <p className="text-text-muted text-center">Establecer nueva contraseña</p>
                </div>

                {error && (
                    <div className="bg-danger/10 border border-danger text-danger p-4 rounded-lg mb-6 text-sm">
                        {error}
                    </div>
                )}

                {success ? (
                    <div className="bg-primary/10 border border-primary text-primary p-4 rounded-lg text-sm font-semibold text-center">
                        Contraseña actualizada correctamente. Redirigiendo al inicio de sesión...
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-[0.85rem] font-semibold uppercase tracking-widest mb-1">Nueva contraseña</label>
                            <input
                                type="password"
                                required
                                className="w-full p-3 border-2 border-border-color rounded-lg focus:border-primary focus:outline-none transition-all"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-[0.85rem] font-semibold uppercase tracking-widest mb-1">Confirmar contraseña</label>
                            <input
                                type="password"
                                required
                                className="w-full p-3 border-2 border-border-color rounded-lg focus:border-primary focus:outline-none transition-all"
                                placeholder="••••••••"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-br from-primary to-primary-light text-white rounded-lg font-bold text-base transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
                        >
                            {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
