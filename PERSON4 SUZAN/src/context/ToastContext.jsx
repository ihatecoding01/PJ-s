import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, ExternalLink, X, Loader2 } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback(({ type = 'info', title, message, txHash, duration = 5000 }) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newToast = { id, type, title, message, txHash };

    setToasts(prev => [...prev, newToast]);

    if (duration > 0 && type !== 'pending') {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  const updateToast = useCallback((id, updates) => {
    setToasts(prev => prev.map(t => {
      if (t.id === id) {
        const updated = { ...t, ...updates };
        if (updates.type !== 'pending' && updates.duration !== 0) {
          setTimeout(() => removeToast(id), updates.duration || 5000);
        }
        return updated;
      }
      return t;
    }));
  }, [removeToast]);

  const toast = {
    info: (message, title = 'Notice') => addToast({ type: 'info', title, message }),
    success: (message, title = 'Success') => addToast({ type: 'success', title, message }),
    error: (message, title = 'Error') => addToast({ type: 'error', title, message, duration: 8000 }),
    warning: (message, title = 'Warning') => addToast({ type: 'warning', title, message }),
    pendingTx: (txHash, message = 'Transaction submitted to blockchain...') =>
      addToast({ type: 'pending', title: 'Transaction Pending', message, txHash, duration: 0 }),
    confirmedTx: (id, txHash, message = 'Transaction confirmed successfully!') =>
      updateToast(id, { type: 'success', title: 'Transaction Confirmed', message, txHash, duration: 6000 }),
    failedTx: (id, errorMsg) =>
      updateToast(id, { type: 'error', title: 'Transaction Failed', message: errorMsg, duration: 8000 }),
    remove: removeToast
  };

  const explorerUrl = import.meta.env.VITE_EXPLORER_URL || 'https://amoy.polygonscan.com';

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full px-4 pointer-events-none">
        {toasts.map(t => {
          let border = 'border-slate-700 bg-surface-900/95';
          let icon = <Info className="w-5 h-5 text-sky-400 shrink-0" />;

          if (t.type === 'success') {
            border = 'border-emerald-500/40 bg-surface-900/95 shadow-glow-teal';
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
          } else if (t.type === 'error') {
            border = 'border-rose-500/40 bg-surface-900/95 shadow-glow-rose';
            icon = <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />;
          } else if (t.type === 'warning') {
            border = 'border-amber-500/40 bg-surface-900/95';
            icon = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
          } else if (t.type === 'pending') {
            border = 'border-indigo-500/40 bg-surface-900/95 shadow-glow-indigo';
            icon = <Loader2 className="w-5 h-5 text-indigo-400 animate-spin shrink-0" />;
          }

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 animate-slide-in ${border}`}
            >
              {icon}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-slate-100">{t.title}</h4>
                {t.message && <p className="text-xs text-slate-300 mt-0.5 leading-relaxed break-words">{t.message}</p>}
                {t.txHash && (
                  <a
                    href={`${explorerUrl}/tx/${t.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 mt-1.5 font-mono underline"
                  >
                    View on Explorer ({t.txHash.substring(0, 10)}...)
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-slate-200 transition-colors p-1"
                aria-label="Close toast"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
