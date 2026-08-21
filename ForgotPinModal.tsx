import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  KeyRound,
  Mail,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { User } from '../types';

interface ForgotPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultUser?: User | null;
  onSuccess?: () => void;
}

export const ForgotPinModal: React.FC<ForgotPinModalProps> = ({
  isOpen,
  onClose,
  defaultUser,
  onSuccess,
}) => {
  const { requestPinRecovery, resetPinWithCode, showToast, users } = useApp();

  const [step, setStep] = useState<'EMAIL' | 'VERIFY_OTP' | 'SUCCESS'>('EMAIL');
  const [email, setEmail] = useState<string>(
    defaultUser?.email || (defaultUser?.role === 'DUEÑO' ? 'riojadecoraciones@gmail.com' : '')
  );
  const [targetUser, setTargetUser] = useState<User | null>(defaultUser || null);
  const [otpCode, setOtpCode] = useState<string>('');
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [simulatedCodeReceived, setSimulatedCodeReceived] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Por favor ingresa un correo electrónico válido');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const res = requestPinRecovery(email);
      setIsLoading(false);

      if (res.success) {
        setTargetUser(res.user || null);
        if (res.recoveryCode) {
          setSimulatedCodeReceived(res.recoveryCode);
          setOtpCode(res.recoveryCode); // Pre-populate for fluid UX
        }
        setStep('VERIFY_OTP');
      } else {
        setErrorMessage(res.message);
      }
    }, 400);
  };

  const handleResetPin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!otpCode.trim()) {
      setErrorMessage('Ingresa el código de 6 dígitos enviado a tu correo');
      return;
    }

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setErrorMessage('El nuevo PIN debe tener exactamente 4 dígitos numéricos');
      return;
    }

    if (newPin !== confirmPin) {
      setErrorMessage('Los PINs ingresados no coinciden');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const res = resetPinWithCode(email, otpCode, newPin);
      setIsLoading(false);

      if (res.success) {
        setStep('SUCCESS');
        if (onSuccess) {
          setTimeout(onSuccess, 1500);
        }
      } else {
        setErrorMessage(res.message);
      }
    }, 400);
  };

  const handleQuickSelectUser = (user: User) => {
    setTargetUser(user);
    setEmail(user.email || 'riojadecoraciones@gmail.com');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white mb-3 shadow-inner">
            <KeyRound className="w-6 h-6 text-blue-200" />
          </div>

          <h3 className="text-xl font-black tracking-tight">Recuperación de PIN</h3>
          <p className="text-xs text-blue-200 mt-1">
            Restablece tu clave de seguridad de forma segura mediante tu correo
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Enter Email */}
          {step === 'EMAIL' && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Correo Electrónico Registrado
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ej: riojadecoraciones@gmail.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Quick Owner Email shortcut */}
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl space-y-2">
                <div className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Cuentas configuradas en el sistema:</span>
                </div>
                <div className="space-y-1.5">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleQuickSelectUser(u)}
                      className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        email === (u.email || (u.role === 'DUEÑO' ? 'riojadecoraciones@gmail.com' : ''))
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-white text-slate-700 hover:bg-blue-100/50 border border-slate-200'
                      }`}
                    >
                      <div className="truncate">
                        <span className="font-bold">{u.name}</span>{' '}
                        <span className="opacity-80">({u.roleTitle})</span>
                      </div>
                      <span className="text-[10px] font-mono shrink-0 ml-2 opacity-90">
                        {u.email || (u.role === 'DUEÑO' ? 'riojadecoraciones@gmail.com' : 'sin correo')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Enviar Código</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Verify OTP & Set New PIN */}
          {step === 'VERIFY_OTP' && (
            <form onSubmit={handleResetPin} className="space-y-4">
              {/* Simulated Email Notification Card */}
              {simulatedCodeReceived && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-emerald-900 animate-in fade-in">
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Bandeja de Entrada (Simulada):</span>
                  </div>
                  <div className="text-xs text-emerald-800">
                    Código de verificación para <strong>{email}</strong>:{' '}
                    <span className="font-mono font-black text-sm bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-950">
                      {simulatedCodeReceived}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Código de 6 Dígitos
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full text-center tracking-widest font-mono text-xl py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nuevo PIN (4 dígitos)
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full text-center tracking-widest font-mono text-lg py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Confirmar PIN
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full text-center tracking-widest font-mono text-lg py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('EMAIL')}
                  className="py-3 px-4 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Atrás</span>
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Guardar Nuevo PIN</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Success */}
          {step === 'SUCCESS' && (
            <div className="text-center py-6 space-y-4 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-900">¡PIN Restablecido!</h4>
                <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
                  Tu nuevo PIN de seguridad de 4 dígitos ha sido configurado correctamente.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all shadow-md"
              >
                Volver e Iniciar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
