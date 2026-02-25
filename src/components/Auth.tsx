import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Auth() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                        },
                    },
                });
                if (error) throw error;
                setMessage('Registro exitoso. Tu cuenta está pendiente de aprobación por la administración.');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message || 'Error al conectar con Google');
        }
    };

    return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-surface rounded-2xl shadow-xl border-2 border-border-color p-8 animate-in">
                <div className="flex flex-col items-center mb-8">
                    <div className="font-mono text-3xl font-bold text-primary tracking-tight mb-2">
                        NU<span className="text-accent-dark">PLAN</span>
                    </div>
                    <p className="text-text-muted text-center">
                        {isSignUp ? 'Crea tu cuenta profesional' : 'Bienvenido de nuevo, profesional'}
                    </p>
                </div>

                {error && (
                    <div className="bg-danger/10 border border-danger text-danger p-4 rounded-lg mb-6 text-sm">
                        {error}
                    </div>
                )}

                {message && (
                    <div className="bg-primary/10 border border-primary text-primary p-4 rounded-lg mb-6 text-sm font-semibold">
                        {message}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    {isSignUp && (
                        <div>
                            <label className="block text-[0.85rem] font-semibold uppercase tracking-widest mb-1">Nombre Completo</label>
                            <input
                                type="text"
                                required
                                className="w-full p-3 border-2 border-border-color rounded-lg focus:border-primary focus:outline-none transition-all"
                                placeholder="Ej: María Rodríguez"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-[0.85rem] font-semibold uppercase tracking-widest mb-1">Email Profesional</label>
                        <input
                            type="email"
                            required
                            className="w-full p-3 border-2 border-border-color rounded-lg focus:border-primary focus:outline-none transition-all"
                            placeholder="profesional@galeno.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-[0.85rem] font-semibold uppercase tracking-widest mb-1">Contraseña</label>
                        <input
                            type="password"
                            required
                            className="w-full p-3 border-2 border-border-color rounded-lg focus:border-primary focus:outline-none transition-all"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-gradient-to-br from-primary to-primary-light text-white rounded-lg font-bold text-base transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
                    >
                        {loading ? 'Cargando...' : isSignUp ? 'Registrarse' : 'Iniciar Sesión'}
                    </button>
                </form>

                <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border-color"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-surface text-text-muted">O continúa con</span>
                    </div>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    className="w-full py-3 px-4 border-2 border-border-color rounded-lg font-semibold flex items-center justify-center gap-3 bg-surface transition-all duration-300 hover:bg-bg hover:border-primary/30 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 active:scale-95 group"
                >
                    <div className="bg-white p-1 rounded-full shadow-sm group-hover:shadow transition-all duration-300">
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                    </div>
                    <span className="text-text-main group-hover:text-primary transition-colors duration-300">Continuar con Google</span>
                </button>

                <div className="mt-8 text-center">
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-primary font-semibold hover:underline"
                    >
                        {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Solicita acceso'}
                    </button>
                </div>
            </div>
        </div>
    );
}
