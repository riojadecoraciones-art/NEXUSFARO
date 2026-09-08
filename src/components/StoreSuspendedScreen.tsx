import React from 'react';
import { useApp } from '../context/AppContext';
import { Store, ShieldAlert, LogOut } from 'lucide-react';

/**
 * Se muestra en vez de la pantalla de PIN cuando el comercio de esta
 * terminal quedó marcado como SUSPENDIDO en el Portal Maestro. El cobro en
 * sí sigue siendo manual (por fuera del sistema) — esto es sólo el freno:
 * mientras el operador de la plataforma no lo vuelva a marcar ACTIVO, la
 * terminal no entra.
 */
export const StoreSuspendedScreen: React.FC = () => {
  const { signOutTerminal } = useApp();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-center">
        <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-slate-900 p-7 text-white">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-600 flex items-center justify-center shadow-lg shadow-rose-600/30 mb-4">
            <Store className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-black tracking-tight">Cuenta suspendida</h1>
        </div>

        <div className="p-6 sm:p-7 space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-900 flex items-start gap-2 leading-relaxed text-left">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>
              El acceso de este comercio está pausado. Contactá a quien te dio de alta el
              sistema para regularizar tu cuenta.
            </span>
          </div>

          <button
            onClick={signOutTerminal}
            className="w-full py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-2xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar sesión de esta terminal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
