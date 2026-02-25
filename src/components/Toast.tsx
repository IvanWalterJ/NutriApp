import React, { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
    duration?: number;
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(onClose, 300); // Wait for fade out animation
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const bgStyles = {
        success: 'bg-primary border-accent',
        error: 'bg-danger border-white/20',
        info: 'bg-info border-white/20',
    };

    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
    };

    return (
        <div
            className={`fixed bottom-8 right-8 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl border-2 text-white shadow-2xl transition-all duration-300 transform ${isExiting ? 'opacity-0 translate-y-4 scale-95' : 'opacity-100 translate-y-0 scale-100 animate-scale-in'
                } ${bgStyles[type]}`}
        >
            <span className="text-xl">{icons[type]}</span>
            <span className="font-bold text-sm">{message}</span>
            <button
                onClick={() => {
                    setIsExiting(true);
                    setTimeout(onClose, 300);
                }}
                className="ml-4 hover:opacity-70 transition-opacity"
            >
                ✕
            </button>
        </div>
    );
}
