'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, Loader2, Book, Mic, Save, Upload, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'bible' | 'recording' | 'saving' | 'upload';

export interface Toast {
    id: string;
    title: string;
    message?: string;
    type: ToastType;
    duration?: number; // ms, 0 = persistent
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => string;
    removeToast: (id: string) => void;
    updateToast: (id: string, updates: Partial<Toast>) => void;
    // Convenience methods
    success: (title: string, message?: string) => string;
    error: (title: string, message?: string) => string;
    info: (title: string, message?: string) => string;
    loading: (title: string, message?: string) => string;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

const TOAST_ICONS: Record<ToastType, typeof CheckCircle> = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    loading: Loader2,
    bible: Book,
    recording: Mic,
    saving: Save,
    upload: Upload,
    warning: AlertTriangle,
};

const TOAST_COLORS: Record<ToastType, string> = {
    success: 'text-green-400 bg-green-500/10 border-green-500/30',
    error: 'text-red-400 bg-red-500/10 border-red-500/30',
    info: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    loading: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    bible: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    recording: 'text-red-400 bg-red-500/10 border-red-500/30',
    saving: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    upload: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    warning: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
};

const ICON_COLORS: Record<ToastType, string> = {
    success: 'text-green-400',
    error: 'text-red-400',
    info: 'text-blue-400',
    loading: 'text-amber-400',
    bible: 'text-amber-400',
    recording: 'text-red-400',
    saving: 'text-blue-400',
    upload: 'text-purple-400',
    warning: 'text-orange-400',
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
    const Icon = TOAST_ICONS[toast.type];
    const isLoading = toast.type === 'loading' || toast.type === 'saving' || toast.type === 'recording';

    return (
        <div
            className={cn(
                "relative flex items-start gap-3 w-full max-w-sm p-4 rounded-xl border backdrop-blur-xl shadow-2xl",
                "animate-in slide-in-from-right-full duration-300",
                TOAST_COLORS[toast.type]
            )}
        >
            {/* Icon */}
            <div className={cn("shrink-0 mt-0.5", ICON_COLORS[toast.type])}>
                <Icon className={cn("w-5 h-5", isLoading && "animate-spin")} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-white">{toast.title}</p>
                {toast.message && (
                    <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{toast.message}</p>
                )}
                {toast.action && (
                    <button
                        onClick={toast.action.onClick}
                        className="mt-2 text-xs font-medium text-blue-400 hover:text-blue-300 hover:underline"
                    >
                        {toast.action.label}
                    </button>
                )}
            </div>

            {/* Close button */}
            {!isLoading && (
                <button
                    onClick={onRemove}
                    className="shrink-0 p-1 text-zinc-500 hover:text-white hover:bg-zinc-700/50 rounded transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((toast: Omit<Toast, 'id'>): string => {
        const id = crypto.randomUUID();
        const newToast: Toast = { ...toast, id };

        setToasts(prev => [...prev, newToast]);

        // Auto-remove after duration (default 4 seconds, 0 = persistent)
        const duration = toast.duration ?? (toast.type === 'loading' ? 0 : 4000);
        if (duration > 0) {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, duration);
        }

        return id;
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const updateToast = useCallback((id: string, updates: Partial<Toast>) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

        // If updating from loading to another type, auto-remove after delay
        if (updates.type && updates.type !== 'loading') {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, updates.duration ?? 3000);
        }
    }, []);

    // Convenience methods
    const success = useCallback((title: string, message?: string) =>
        addToast({ title, message, type: 'success' }), [addToast]);

    const error = useCallback((title: string, message?: string) =>
        addToast({ title, message, type: 'error', duration: 6000 }), [addToast]);

    const info = useCallback((title: string, message?: string) =>
        addToast({ title, message, type: 'info' }), [addToast]);

    const loading = useCallback((title: string, message?: string) =>
        addToast({ title, message, type: 'loading', duration: 0 }), [addToast]);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast, updateToast, success, error, info, loading }}>
            {children}

            {/* Toast Container */}
            <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
                {toasts.map(toast => (
                    <div key={toast.id} className="pointer-events-auto">
                        <ToastItem toast={toast} onRemove={() => removeToast(toast.id)} />
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
