import React from 'react';
import { useApp } from '../context/AppContext';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  AlertOctagon,
  Info,
  X,
  Plus,
  ArrowRight,
} from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast, quickRestockProduct, setIsNotificationsPanelOpen } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[120] flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        // Check if it's a rich stock alert toast
        if (toast.type === 'stock_alert') {
          const isOut = toast.currentStock === 0;

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto w-full p-4 rounded-2xl border shadow-xl bg-white backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${
                isOut
                  ? 'border-rose-300 ring-1 ring-rose-200'
                  : 'border-amber-300 ring-1 ring-amber-200'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      isOut ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-amber-50 text-amber-600 border-amber-200'
                    }`}
                  >
                    {isOut ? <AlertOctagon className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          isOut ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-amber-100 text-amber-900 border-amber-200'
                        }`}
                      >
                        {isOut ? 'AGOTADO' : 'STOCK CRÍTICO'}
                      </span>
                      {toast.minStock !== undefined && (
                        <span className="text-[11px] font-semibold text-slate-500">
                          {toast.currentStock ?? 0} de {toast.minStock} mín.
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 mt-1 leading-snug">
                      {toast.title || (isOut ? 'Producto Agotado' : 'Alerta de Stock Mínimo')}
                    </h4>
                  </div>
                </div>

                <button
                  onClick={() => removeToast(toast.id)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Cerrar notificación"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Message */}
              <p className="text-xs text-slate-600 mt-2 leading-relaxed pl-11.5 font-medium">{toast.message}</p>

              {/* Action Toolbar */}
              <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 pl-2">
                {toast.productId ? (
                  <button
                    onClick={() => {
                      quickRestockProduct(toast.productId!, 10);
                      removeToast(toast.id);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Reponer +10 u.
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      if (toast.onAction) {
                        toast.onAction();
                      } else {
                        setIsNotificationsPanelOpen(true);
                      }
                      removeToast(toast.id);
                    }}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 border border-slate-200"
                  >
                    {toast.actionLabel || 'Ver en Panel'}
                    <ArrowRight className="w-3 h-3 text-blue-600" />
                  </button>
                </div>
              </div>
            </div>
          );
        }

        // Standard Toast (Clean Light Theme)
        let bg = 'bg-white text-slate-800 border-slate-200 shadow-lg';
        let Icon = Info;
        let iconColor = 'text-blue-600';
        let iconBg = 'bg-blue-50 border-blue-200';

        if (toast.type === 'success') {
          bg = 'bg-white text-slate-800 border-emerald-300 shadow-lg ring-1 ring-emerald-100';
          Icon = CheckCircle2;
          iconColor = 'text-emerald-600';
          iconBg = 'bg-emerald-50 border-emerald-200';
        } else if (toast.type === 'error') {
          bg = 'bg-white text-slate-800 border-rose-300 shadow-lg ring-1 ring-rose-100';
          Icon = AlertCircle;
          iconColor = 'text-rose-600';
          iconBg = 'bg-rose-50 border-rose-200';
        } else if (toast.type === 'warning') {
          bg = 'bg-white text-slate-800 border-amber-300 shadow-lg ring-1 ring-amber-100';
          Icon = AlertTriangle;
          iconColor = 'text-amber-600';
          iconBg = 'bg-amber-50 border-amber-200';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${bg}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${iconBg}`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
              </div>
              <p className="text-xs sm:text-sm font-semibold leading-snug text-slate-800">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export const Toast = ToastContainer;
