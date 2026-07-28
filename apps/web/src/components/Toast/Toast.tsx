'use client';

import { useEffect } from 'react';
import { CircleX, TriangleAlert, CircleCheckBig, Info, X } from 'lucide-react';
import { useLocationStore } from '@/store';
import type { Toast as ToastType } from '@/store';

/**
 * Individual toast notification component.
 * Auto-dismisses after 3 seconds unless dismissible is false.
 */
function ToastItem({ toast }: { toast: ToastType }) {
  const removeToast = useLocationStore((state) => state.removeToast);

  useEffect(() => {
    // Auto-dismiss after 3 seconds
    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast.id, removeToast]);

  const bgColor =
    toast.type === 'error'
      ? 'bg-red-900/80'
      : toast.type === 'warning'
        ? 'bg-amber-900/80'
        : toast.type === 'success'
          ? 'bg-emerald-900/80'
          : 'bg-blue-900/80';

  const borderColor =
    toast.type === 'error'
      ? 'border-red-700'
      : toast.type === 'warning'
        ? 'border-amber-700'
        : toast.type === 'success'
          ? 'border-emerald-700'
          : 'border-blue-700';

  const textColor =
    toast.type === 'error'
      ? 'text-red-200'
      : toast.type === 'warning'
        ? 'text-amber-200'
        : toast.type === 'success'
          ? 'text-emerald-200'
          : 'text-blue-200';

  const iconColor =
    toast.type === 'error'
      ? 'text-red-400'
      : toast.type === 'warning'
        ? 'text-amber-400'
        : toast.type === 'success'
          ? 'text-emerald-400'
          : 'text-blue-400';

  return (
    <div
      className={`
        ${bgColor} ${borderColor}
        border rounded-lg px-4 py-3 backdrop-blur-md
        flex items-center gap-3 min-w-64 max-w-md
        shadow-lg animate-in fade-in slide-in-from-top-2 duration-300
      `}
      role="alert"
      aria-live="polite"
    >
      {/* Icon based on type */}
      <div className={`flex-shrink-0 ${iconColor} text-lg`}>
        {toast.type === 'error' && (
          <CircleX className="w-5 h-5" aria-hidden="true" />
        )}
        {toast.type === 'warning' && (
          <TriangleAlert className="w-5 h-5" aria-hidden="true" />
        )}
        {toast.type === 'success' && (
          <CircleCheckBig className="w-5 h-5" aria-hidden="true" />
        )}
        {toast.type === 'info' && (
          <Info className="w-5 h-5" aria-hidden="true" />
        )}
      </div>

      {/* Message */}
      <p className={`${textColor} flex-1 text-sm font-medium`}>{toast.message}</p>

      {/* Close button */}
      {toast.dismissible !== false && (
        <button
          type="button"
          onClick={() => removeToast(toast.id)}
          className={`
            flex-shrink-0 ${textColor} hover:opacity-75 transition-smooth
            focus:outline-none focus:ring-2 focus:ring-offset-2
            focus:ring-offset-slate-900/40 rounded
          `}
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/**
 * Global toast container component.
 * Renders all active toasts in the top-right corner with auto-dismiss (3s).
 * Add this component once in your root layout.
 */
export function ToastContainer() {
  const toasts = useLocationStore((state) => state.toasts);

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  );
}

/**
 * Hook to show a toast notification.
 * Usage: const showToast = useToast();
 *        showToast({ message: 'Error occurred', type: 'error' });
 */
export function useToast() {
  const addToast = useLocationStore((state) => state.addToast);

  return (message: string, type: ToastType['type'] = 'error') => {
    addToast({
      message,
      type,
      dismissible: true,
    });
  };
}
