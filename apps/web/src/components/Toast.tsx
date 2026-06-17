'use client';

import React, { useEffect } from 'react';
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
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        )}
        {toast.type === 'warning' && (
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        )}
        {toast.type === 'success' && (
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        )}
        {toast.type === 'info' && (
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>

      {/* Message */}
      <p className={`${textColor} flex-1 text-sm font-medium`}>{toast.message}</p>

      {/* Close button */}
      {toast.dismissible !== false && (
        <button
          onClick={() => removeToast(toast.id)}
          className={`
            flex-shrink-0 ${textColor} hover:opacity-75 transition-smooth
            focus:outline-none focus:ring-2 focus:ring-offset-2
            focus:ring-offset-slate-900/40 rounded
          `}
          aria-label="Dismiss notification"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
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
