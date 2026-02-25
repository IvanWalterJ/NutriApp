import React from 'react';

interface SuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
}

export default function SuccessModal({ isOpen, onClose, title, message }: SuccessModalProps) {
    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '1rem',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                style={{
                    backgroundColor: '#fff',
                    borderRadius: '24px',
                    padding: '3rem 2.5rem',
                    width: '100%',
                    maxWidth: '400px',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
                    textAlign: 'center',
                    animation: 'modalIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <style>{`
          @keyframes modalIn {
            from { opacity: 0; transform: scale(0.85) translateY(20px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes checkBounce {
            0%   { transform: scale(0); }
            60%  { transform: scale(1.15); }
            100% { transform: scale(1); }
          }
        `}</style>

                {/* Decorative bg circles */}
                <div style={{
                    position: 'absolute', top: '-60px', right: '-60px',
                    width: '180px', height: '180px',
                    background: 'radial-gradient(circle, rgba(10,77,60,0.07), transparent)',
                    borderRadius: '50%',
                }} />
                <div style={{
                    position: 'absolute', bottom: '-60px', left: '-60px',
                    width: '180px', height: '180px',
                    background: 'radial-gradient(circle, rgba(20,241,149,0.1), transparent)',
                    borderRadius: '50%',
                }} />

                {/* Check icon */}
                <div style={{
                    width: '80px', height: '80px',
                    background: 'linear-gradient(135deg, #0A4D3C, #0F6B52)',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1.5rem',
                    boxShadow: '0 12px 30px rgba(10,77,60,0.3)',
                    animation: 'checkBounce 0.5s 0.15s cubic-bezier(0.16, 1, 0.3, 1) both',
                }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#14F195" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                </div>

                {/* Title */}
                <h3 style={{
                    fontSize: '1.6rem', fontWeight: 900, color: '#0A4D3C',
                    marginBottom: '0.75rem', lineHeight: 1.2,
                }}>
                    {title}
                </h3>

                {/* Message */}
                <p style={{
                    color: '#6B7280', fontSize: '0.95rem',
                    marginBottom: '2rem', lineHeight: 1.6,
                }}>
                    {message}
                </p>

                {/* Accept button */}
                <button
                    onClick={onClose}
                    style={{
                        width: '100%', padding: '1rem',
                        background: 'linear-gradient(135deg, #0A4D3C, #0F6B52)',
                        color: '#fff', border: 'none',
                        borderRadius: '14px', fontWeight: 800,
                        fontSize: '1.05rem', cursor: 'pointer',
                        boxShadow: '0 8px 20px rgba(10,77,60,0.3)',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    }}
                    onMouseEnter={e => {
                        (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                        (e.target as HTMLButtonElement).style.boxShadow = '0 12px 25px rgba(10,77,60,0.4)';
                    }}
                    onMouseLeave={e => {
                        (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                        (e.target as HTMLButtonElement).style.boxShadow = '0 8px 20px rgba(10,77,60,0.3)';
                    }}
                >
                    Aceptar
                </button>
            </div>
        </div>
    );
}
