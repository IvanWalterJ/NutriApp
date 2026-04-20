import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface LoadingOverlayProps {
  open: boolean;
  title?: string;
  messages?: string[];
  subtitle?: string;
}

const DEFAULT_MESSAGES = [
  'Analizando datos del paciente...',
  'Personalizando requerimientos...',
  'Armando la estructura del plan...',
  'Ajustando porciones y alimentos...',
  'Finalizando detalles...',
];

export default function LoadingOverlay({
  open,
  title = 'Generando con IA',
  messages = DEFAULT_MESSAGES,
  subtitle,
}: LoadingOverlayProps) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!open) {
      setMsgIdx(0);
      setElapsed(0);
      return;
    }
    const msgInterval = setInterval(() => {
      setMsgIdx(i => (i + 1) % messages.length);
    }, 2400);
    const tickInterval = setInterval(() => {
      setElapsed(e => e + 1);
    }, 1000);
    return () => {
      clearInterval(msgInterval);
      clearInterval(tickInterval);
    };
  }, [open, messages.length]);

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  const overlay = (
    <div
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
      style={{
        background: 'radial-gradient(circle at 50% 40%, rgba(15,23,42,0.55), rgba(15,23,42,0.75))',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'loading-overlay-fade 0.25s ease-out forwards',
      }}
    >
      <div
        className="relative w-full max-w-md rounded-3xl border border-white/20 bg-white/95 shadow-2xl px-8 py-10 text-center"
        style={{
          boxShadow:
            '0 30px 80px -20px rgba(15,23,42,0.45), 0 0 0 1px rgba(255,255,255,0.4) inset',
        }}
      >
        {/* Spinner */}
        <div className="relative mx-auto mb-6 w-24 h-24">
          {/* Ring 1 — outer, slow */}
          <div
            className="absolute inset-0 rounded-full border-4 border-transparent"
            style={{
              borderTopColor: '#6366f1',
              borderRightColor: '#a5b4fc',
              animation: 'spin 1.8s linear infinite',
            }}
          />
          {/* Ring 2 — mid, reverse */}
          <div
            className="absolute inset-2 rounded-full border-4 border-transparent"
            style={{
              borderTopColor: '#22c55e',
              borderLeftColor: '#86efac',
              animation: 'spin 1.2s linear infinite reverse',
            }}
          />
          {/* Ring 3 — inner, fast */}
          <div
            className="absolute inset-5 rounded-full border-4 border-transparent"
            style={{
              borderTopColor: '#f59e0b',
              borderBottomColor: '#fde68a',
              animation: 'spin 0.9s linear infinite',
            }}
          />
          {/* Center pulse */}
          <div
            className="absolute inset-[38%] rounded-full bg-gradient-to-br from-indigo-500 to-green-500"
            style={{ animation: 'pulse 1.4s ease-in-out infinite' }}
          />
        </div>

        <div className="text-[10px] font-black uppercase tracking-[4px] text-indigo-600 mb-2">
          {title}
        </div>
        <h3 className="text-xl font-black text-slate-800 mb-3 leading-tight">
          {subtitle ?? 'Esto puede tardar unos segundos'}
        </h3>

        {/* Mensaje rotativo */}
        <div className="relative h-6 overflow-hidden mb-5">
          {messages.map((m, i) => (
            <div
              key={i}
              className="absolute inset-0 text-sm text-slate-600 font-medium transition-all duration-500"
              style={{
                opacity: i === msgIdx ? 1 : 0,
                transform: i === msgIdx ? 'translateY(0)' : 'translateY(8px)',
              }}
            >
              {m}
            </div>
          ))}
        </div>

        {/* Barra indeterminada */}
        <div className="relative h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-3">
          <div
            className="absolute top-0 left-0 h-full rounded-full"
            style={{
              width: '40%',
              background: 'linear-gradient(90deg, #6366f1, #22c55e, #f59e0b)',
              animation: 'loading-sweep 1.8s ease-in-out infinite',
            }}
          />
        </div>

        <div className="text-[11px] text-slate-400 font-mono tracking-wider">
          {elapsed}s
        </div>
      </div>

      <style>{`
        @keyframes loading-sweep {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(150%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes loading-overlay-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );

  return createPortal(overlay, document.body);
}
