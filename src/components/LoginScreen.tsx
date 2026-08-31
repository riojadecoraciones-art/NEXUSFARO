import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  Building2,
  Check,
  Delete,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Wrench,
  Lock,
  Sparkles,
  Users,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Briefcase,
  Crown,
} from 'lucide-react';
import { User } from '../types';
import { ForgotPinModal } from './ForgotPinModal';
import { sounds } from '../utils/soundEffects';

export const LoginScreen: React.FC = () => {
  const {
    users,
    login,
    loginMaster,
    isLoginModalOpen,
    setIsLoginModalOpen,
    currentUser,
    storeInfo,
    setIsSupportModalOpen,
    isSupportMode,
  } = useApp();

  // Login Mode: 'PIN' (Employees / Store Owner) vs 'MASTER' (System Owner / Superadmin)
  const [loginMode, setLoginMode] = useState<'PIN' | 'MASTER'>('PIN');

  // PIN Mode states
  const [selectedUserId, setSelectedUserId] = useState<string>(() => users[0]?.id || 'usr-1');
  const [pin, setPin] = useState<string>('');
  const [errorAnimation, setErrorAnimation] = useState<boolean>(false);
  const [isForgotPinOpen, setIsForgotPinOpen] = useState<boolean>(false);

  // Master Key Mode states
  const [masterPassword, setMasterPassword] = useState<string>('');
  const [showMasterPass, setShowMasterPass] = useState<boolean>(false);
  const [masterError, setMasterError] = useState<string | null>(null);
  const [isMasterLoading, setIsMasterLoading] = useState<boolean>(false);

  const selectedUser = users.find((u) => u.id === selectedUserId) || users[0] || {
    id: 'usr-1',
    name: 'Dueño / Administrador',
    email: 'riojadecoraciones@gmail.com',
    role: 'DUEÑO',
    roleTitle: 'Administrador General',
    pin: '1234',
    avatarUrl: '',
    initials: 'RD',
    canDiscount: true,
    canRefund: true,
    canManageInventory: true,
  };

  // Handler for PIN keypad press
  const handleKeyPress = useCallback(
    (digit: string) => {
      if (loginMode !== 'PIN') return;
      if (pin.length < 4) {
        sounds.playScannerBeep();
        const newPin = pin + digit;
        setPin(newPin);

        if (newPin.length === 4) {
          setTimeout(() => {
            const success = login(selectedUser.id, newPin);
            if (!success) {
              sounds.playErrorBeep();
              setErrorAnimation(true);
              setTimeout(() => {
                setPin('');
                setErrorAnimation(false);
              }, 600);
            } else {
              sounds.playSaleSuccessSound();
              setPin('');
            }
          }, 120);
        }
      }
    },
    [loginMode, pin, login, selectedUser]
  );

  const handleClear = useCallback(() => {
    setPin('');
  }, []);

  const handleBackspace = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
  }, []);

  // Physical Keyboard Listener
  useEffect(() => {
    if (!isLoginModalOpen && currentUser) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is focused on an input element (like master password), don't intercept keypad
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')
      ) {
        return;
      }

      if (loginMode === 'PIN') {
        if (e.key >= '0' && e.key <= '9') {
          e.preventDefault();
          handleKeyPress(e.key);
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          handleBackspace();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleClear();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoginModalOpen, currentUser, loginMode, handleKeyPress, handleBackspace, handleClear]);

  // Master Key Submit Handler
  const handleMasterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMasterError(null);

    if (!masterPassword.trim()) {
      setMasterError('Por favor ingresa la contraseña maestra');
      return;
    }

    setIsMasterLoading(true);
    setTimeout(() => {
      const res = loginMaster(masterPassword);
      setIsMasterLoading(false);
      if (res.success) {
        sounds.playSaleSuccessSound();
        setMasterPassword('');
      } else {
        sounds.playErrorBeep();
        setMasterError('Contraseña maestra incorrecta');
      }
    }, 200);
  };

  if (!isLoginModalOpen && currentUser) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[600px] animate-in zoom-in-95 duration-200">
        
        {/* ========================================================= */}
        {/* Left Side: Select User / Mode Switch */}
        {/* ========================================================= */}
        <div className="w-full md:w-5/12 bg-slate-50/80 p-6 sm:p-8 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col justify-between">
          <div>
            {/* Header Brand */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30 shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="overflow-hidden">
                <h1 className="text-xl font-black tracking-tight text-slate-900 leading-tight truncate">
                  {storeInfo.storeName || 'FARO POS'}
                </h1>
                <div className="text-xs font-bold text-blue-600 truncate">
                  {storeInfo.branchName || 'Sucursal Principal'}
                </div>
              </div>
            </div>

            {/* Access Mode Selector Pills */}
            <div className="flex p-1 bg-slate-200/80 rounded-2xl mb-4 gap-1">
              <button
                type="button"
                onClick={() => {
                  setLoginMode('PIN');
                  setMasterError(null);
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  loginMode === 'PIN'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Personal & PIN</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginMode('MASTER');
                  setPin('');
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  loginMode === 'MASTER'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-amber-900/80 hover:text-amber-950'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Llave Maestra</span>
              </button>
            </div>

            {loginMode === 'PIN' ? (
              <>
                {/* Section Title */}
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                    SELECCIONAR USUARIO
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Terminal POS</span>
                </div>

                {/* Users List */}
                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {users.map((user) => {
                    const isSelected = selectedUser.id === user.id;
                    const isOwner = user.role === 'DUEÑO';
                    const isSuper = user.role === 'SUPERADMIN';

                    return (
                      <button
                        key={user.id}
                        onClick={() => {
                          setSelectedUserId(user.id);
                          setPin('');
                          sounds.playScannerBeep();
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border-2 transition-all text-left ${
                          isSelected
                            ? isSuper
                              ? 'border-amber-500 bg-amber-50/50 shadow-md ring-2 ring-amber-500/10'
                              : isOwner
                              ? 'border-emerald-600 bg-emerald-50/40 shadow-md ring-2 ring-emerald-600/10'
                              : 'border-blue-600 bg-blue-50/40 shadow-md ring-2 ring-blue-600/10'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {user.avatarUrl && user.avatarUrl.trim() !== '' ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.name}
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-2xs"
                            />
                          ) : (
                            <div
                              className={`w-10 h-10 rounded-xl font-black flex items-center justify-center text-sm ${
                                isSuper
                                  ? 'bg-amber-100 text-amber-900'
                                  : isOwner
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : 'bg-blue-100 text-blue-900'
                              }`}
                            >
                              {user.initials || 'U'}
                            </div>
                          )}
                          <div className="overflow-hidden">
                            <div className="font-bold text-slate-900 text-sm truncate">{user.name}</div>
                            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                              <span
                                className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                                  isSuper ? 'bg-amber-500' : isOwner ? 'bg-emerald-500' : 'bg-blue-500'
                                }`}
                              />
                              <span className="truncate">{user.roleTitle}</span>
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div
                            className={`w-6 h-6 rounded-full text-white flex items-center justify-center shrink-0 ${
                              isSuper ? 'bg-amber-500' : isOwner ? 'bg-emerald-600' : 'bg-blue-600'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Recover PIN */}
                <div className="pt-3 space-y-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotPinOpen(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-blue-700 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200 rounded-xl transition-colors shadow-2xs"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                    <span>¿Olvidaste tu PIN? Recuperar clave</span>
                  </button>
                </div>
              </>
            ) : (
              /* Master Key Info Box */
              <div className="space-y-3">
                <div className="p-4 bg-amber-500/10 border border-amber-400/40 rounded-2xl text-amber-950 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Acceso del Dueño del Sistema</span>
                  </div>
                  <p className="text-[11px] text-amber-900/80 leading-relaxed font-medium">
                    La <strong>Llave Maestra</strong> otorga acceso total al Portal de Desarrollo, diagnósticos de base de datos Supabase, respaldo general y gestión de todas las tiendas.
                  </p>
                </div>

                <div className="p-3 bg-slate-100/80 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
                  <div className="font-semibold text-slate-800">Privilegios incluidos:</div>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-500">
                    <li>Visualización de todos los módulos sin límites</li>
                    <li>Acceso al Portal Maestro de Sucursales</li>
                    <li>Soporte técnico y reparación de datos</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 text-center text-[11px] text-slate-400 font-medium">
            FARO POS • Sistema de Punto de Venta Inteligente
          </div>
        </div>

        {/* ========================================================= */}
        {/* Right Side: Keypad (PIN) or Master Password Form */}
        {/* ========================================================= */}
        <div className="w-full md:w-7/12 p-6 sm:p-10 flex flex-col justify-between items-center bg-white relative">
          <div className="w-full flex justify-between items-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {loginMode === 'PIN' ? 'Seguridad PIN 4 Dígitos' : 'Credencial Maestra de Sistema'}
            </span>
            {currentUser && (
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Volver a la App
              </button>
            )}
          </div>

          {loginMode === 'PIN' ? (
            /* PIN Mode Keypad */
            <div className="w-full max-w-xs flex flex-col items-center my-auto">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2 bg-slate-100 text-slate-700">
                  {selectedUser.role === 'DUEÑO' ? (
                    <Crown className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                  )}
                  <span>{selectedUser.roleTitle}</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Ingresar PIN</h2>
                <p className="text-sm text-slate-500 mt-0.5 font-medium">
                  Bienvenido/a, <span className="font-bold text-slate-900">{selectedUser.name}</span>
                </p>
              </div>

              {/* PIN Dots Indicator */}
              <div className={`flex items-center justify-center gap-4 mb-7 ${errorAnimation ? 'animate-shake' : ''}`}>
                {[0, 1, 2, 3].map((index) => {
                  const filled = pin.length > index;
                  return (
                    <div
                      key={index}
                      className={`w-4 h-4 rounded-full transition-all duration-200 ${
                        filled
                          ? errorAnimation
                            ? 'bg-red-500 scale-110'
                            : 'bg-slate-900 scale-110 shadow-sm'
                          : 'border-2 border-slate-300 bg-transparent'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Keypad Grid */}
              <div className="grid grid-cols-3 gap-2.5 w-full">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleKeyPress(num.toString())}
                    className="h-14 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/70 hover:bg-slate-100 text-2xl font-black text-slate-800 transition-all active:scale-95 active:bg-slate-200 flex items-center justify-center shadow-2xs"
                  >
                    {num}
                  </button>
                ))}

                {/* Bottom Row */}
                <button
                  type="button"
                  onClick={handleClear}
                  className="h-14 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/70 hover:bg-slate-100 text-xs font-black tracking-wider text-slate-600 transition-all active:scale-95 flex items-center justify-center uppercase"
                >
                  BORRAR
                </button>
                <button
                  type="button"
                  onClick={() => handleKeyPress('0')}
                  className="h-14 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/70 hover:bg-slate-100 text-2xl font-black text-slate-800 transition-all active:scale-95 active:bg-slate-200 flex items-center justify-center shadow-2xs"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="h-14 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/70 hover:bg-slate-100 text-slate-600 transition-all active:scale-95 flex items-center justify-center"
                >
                  <Delete className="w-6 h-6" />
                </button>
              </div>

              <div className="text-[11px] text-slate-400 mt-4 flex items-center gap-1">
                <span>💡 Puedes usar el teclado físico o teclado numérico de tu PC</span>
              </div>
            </div>
          ) : (
            /* Master Key Password Form */
            <div className="w-full max-w-sm flex flex-col items-center my-auto">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-amber-700 flex items-center justify-center mb-4 shadow-sm">
                <Sparkles className="w-7 h-7" />
              </div>

              <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Acceso Llave Maestra
                </h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Introduce la contraseña del Dueño del Sistema para desbloquear todos los apartados
                </p>
              </div>

              <form onSubmit={handleMasterSubmit} className="w-full space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Contraseña Maestra
                  </label>
                  <div className="relative">
                    <input
                      type={showMasterPass ? 'text' : 'password'}
                      value={masterPassword}
                      onChange={(e) => setMasterPassword(e.target.value)}
                      placeholder="FAROPROJECTjl2209"
                      autoFocus
                      className="w-full pl-4 pr-11 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMasterPass(!showMasterPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showMasterPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {masterError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{masterError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isMasterLoading}
                  className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl text-sm transition-all shadow-md shadow-amber-500/20 active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isMasterLoading ? (
                    <span>Verificando...</span>
                  ) : (
                    <>
                      <span>Desbloquear Todo el Sistema</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          <div className="w-full text-center text-xs text-slate-400 mt-4">
            {loginMode === 'PIN' ? (
              <span>
                Nivel de Acceso:{' '}
                <strong className="text-slate-700 font-bold">
                  {selectedUser.role === 'DUEÑO'
                    ? 'Dueño de Negocio (9 Módulos)'
                    : selectedUser.role === 'SUPERADMIN'
                    ? 'Dueño del Sistema (Pase Total)'
                    : 'Empleado (POS & Caja)'}
                </strong>
              </span>
            ) : (
              <span className="text-amber-700 font-semibold">
                ⭐ Modo Superadmin: Acceso a todos los comercios y diagnósticos
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Forgot PIN Recovery Modal */}
      <ForgotPinModal
        isOpen={isForgotPinOpen}
        onClose={() => setIsForgotPinOpen(false)}
        defaultUser={selectedUser}
        onSuccess={() => {
          setIsForgotPinOpen(false);
          setPin('');
        }}
      />
    </div>
  );
};
