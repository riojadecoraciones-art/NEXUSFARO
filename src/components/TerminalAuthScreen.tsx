import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Store, Lock, Mail, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

/**
 * Acceso de la terminal.
 *
 * Se muestra una sola vez por equipo: abre una sesión real de Supabase Auth que
 * después se renueva sola. Sin esa sesión, la base de datos no devuelve nada
 * (ver supabase/migrations/20260901120000_rls_solo_sesion_autenticada.sql).
 *
 * Los cajeros no ven esta pantalla: siguen entrando con su PIN de 4 dígitos.
 */
export const TerminalAuthScreen: React.FC = () => {
  const { signInTerminal } = useApp();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Ingresá el correo y la contraseña de la terminal');
      return;
    }

    setIsSubmitting(true);
    const res = await signInTerminal(email.trim(), password);
    setIsSubmitting(false);

    if (!res.success) {
      setError(res.message);
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">

        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 p-7 text-white">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30 mb-4">
            <Store className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">NEXUS FARO</h1>
          <p className="text-xs text-slate-300 mt-1 font-medium">
            Activación de terminal — se hace una sola vez por equipo
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-900 flex items-start gap-2 leading-relaxed">
            <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
            <span>
              Esta caja necesita conectarse al negocio. Ingresá las credenciales de la
              terminal una vez: quedan guardadas y los cajeros siguen entrando con su PIN.
            </span>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Correo de la terminal
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                autoFocus
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="terminal@tunegocio.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña de la terminal"
                className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black rounded-2xl text-sm transition-all shadow-md shadow-blue-600/20 active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span>Conectando…</span>
            ) : (
              <>
                <span>Activar Terminal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-[11px] text-slate-400 text-center leading-relaxed pt-1">
            ¿No tenés estas credenciales? Las crea el dueño en Supabase →
            Authentication → Users.
          </p>
        </form>
      </div>
    </div>
  );
};
