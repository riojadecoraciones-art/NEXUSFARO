import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Wrench,
  X,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const MasterAuthModal: React.FC = () => {
  const {
    isMasterAuthModalOpen,
    setIsMasterAuthModalOpen,
    loginMaster,
  } = useApp();

  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isMasterAuthModalOpen) {
      setPassword('');
      setShowPassword(false);
      setIsSubmitting(false);
    }
  }, [isMasterAuthModalOpen]);

  if (!isMasterAuthModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setIsSubmitting(true);
    setTimeout(async () => {
      await loginMaster(password);
      setIsSubmitting(false);
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 text-white p-6 relative">
          <button
            type="button"
            onClick={() => setIsMasterAuthModalOpen(false)}
            className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-white">
                  Portal Maestro de Soporte
                </h2>
                <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-black text-[10px] rounded-full uppercase tracking-wider">
                  FARO PROJECT
                </span>
              </div>
              <p className="text-xs text-amber-200/80 mt-0.5">
                Acceso restringido para el desarrollador del sistema
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Ingresa la <strong>Contraseña Maestra Única</strong> para acceder al diagnóstico, base de datos y control técnico.
            </span>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Contraseña Maestra de Desarrollador</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña maestra..."
                className="w-full px-3.5 py-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={isSubmitting || !password.trim()}
              className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Verificando...' : 'Acceder al Panel de Soporte'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsMasterAuthModalOpen(false)}
              className="w-full py-2 text-center text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cancelar y Volver
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
