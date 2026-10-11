import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast from '../components/ui/Toast.jsx';

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

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast notifications container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full px-4 pointer-events-none">
        {toasts.map(t => (
          <Toast
            key={t.id}
            type={t.type}
            title={t.title}
            message={t.message}
            txHash={t.txHash}
            onClose={() => removeToast(t.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
