import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Store, Check, Delete, KeyRound, Mail, ShieldAlert, X, Wrench, Building2 } from 'lucide-react';
import { User } from '../types';
import { ForgotPinModal } from './ForgotPinModal';

export const LoginScreen: React.FC = () => {
  const {
    users,
    login,
    isLoginModalOpen,
    setIsLoginModalOpen,
    currentUser,
    storeInfo,
    setIsMasterAuthModalOpen,
    setIsSupportModalOpen,
    isSupportMode,
  } = useApp();
  const [selectedUserId, setSelectedUserId] = useState<string>(() => users[0]?.id || 'usr-1');
  const [pin, setPin] = useState<string>('');
  const [errorAnimation, setErrorAnimation] = useState<boolean>(false);
  const [isForgotPinOpen, setIsForgotPinOpen] = useState<boolean>(false);

  const selectedUser = users.find((u) => u.id === selectedUserId) || users[0] || {
    id: 'usr-1',
    name: 'Dueño / Administrador',
    email: 'riojadecoraciones@gmail.com',
    role: 'DUEÑO',
    roleTitle: 'Administrador General',
    pin: '1234',
    initials: 'RD',
    canDiscount: true,
    canRefund: true,
    canManageInventory: true,
  };

  if (!isLoginModalOpen && currentUser) {
    return null;
  }

  const handleKeyPress = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        // Attempt login
        setTimeout(() => {
          const success = login(selectedUser.id, newPin);
          if (!success) {
            setErrorAnimation(true);
            setTimeout(() => {
              setPin('');
              setErrorAnimation(false);
            }, 600);
          } else {
            setPin('');
          }
        }, 150);
      }
    }
  };

  const handleClear = () => {
    setPin('');
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleOpenMasterPortal = () => {
    if (isSupportMode) {
      setIsSupportModalOpen(true);
    } else {
      setIsMasterAuthModalOpen(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[580px] animate-in zoom-in-95 duration-200">
        
        {/* Left Side: Select User */}
        <div className="w-full md:w-5/12 bg-slate-50/70 p-6 sm:p-8 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col justify-between">
          <div>
            {/* Header Brand */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-md shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <h1 className="text-lg font-black tracking-tight text-slate-900 leading-tight truncate">
                  {storeInfo.storeName || 'FARO POS'}
                </h1>
                <div className="text-xs font-bold text-blue-600 truncate">
                  {storeInfo.branchName || 'Sucursal Principal'}
                </div>
              </div>
            </div>

            {/* Section Title */}
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                SELECCIONAR USUARIO
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Terminal Protegido</span>
            </div>

            {/* Users List */}
            <div className="space-y-3">
              {users.map((user) => {
                const isSelected = selectedUser.id === user.id;
                return (
                  <button
                    key={user.id}
                    onClick={() => {
                      setSelectedUserId(user.id);
                      setPin('');
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-slate-900 bg-white shadow-md ring-2 ring-slate-900/10'
                        : 'border-slate-200 bg-white/60 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      {user.avatarUrl && user.avatarUrl.trim() !== '' ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-sm"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-base">
                          {user.initials}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-slate-900 text-base">{user.name}</div>
                        <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`inline-block w-2 h-2 rounded-full ${
                              user.role === 'DUEÑO' ? 'bg-emerald-500' : 'bg-blue-500'
                            }`}
                          />
                          {user.roleTitle}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}

              {/* Security notice & Recover PIN action */}
              <div className="pt-3 space-y-2">
                <button
                  type="button"
                  onClick={() => setIsForgotPinOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-blue-700 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200 rounded-xl transition-colors shadow-xs"
                >
                  <KeyRound className="w-4 h-4 text-blue-600" />
                  <span>¿Olvidaste tu PIN? Recuperar clave</span>
                </button>

                {/* Developer / Master Technical Support Button */}
                <button
                  type="button"
                  onClick={handleOpenMasterPortal}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 text-[11px] font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors"
                >
                  <Wrench className="w-3.5 h-3.5 text-slate-400" />
                  <span>Acceso de Soporte Técnico (Desarrollador)</span>
                </button>

                <div className="mt-2 p-3 bg-slate-100/70 border border-slate-200/80 rounded-xl text-[11px] text-slate-500 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>Los PINs de acceso son privados y solo el Dueño puede gestionarlos en el panel de empleados.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 text-center text-xs text-slate-400">
            {storeInfo.storeName} • {storeInfo.branchName}
          </div>
        </div>

        {/* Right Side: Keypad */}
        <div className="w-full md:w-7/12 p-6 sm:p-10 flex flex-col justify-between items-center bg-white relative">
          <div className="w-full flex justify-between items-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Seguridad PIN 4 Dígitos
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

          <div className="w-full max-w-xs flex flex-col items-center my-auto">
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Ingresar PIN</h2>
              <p className="text-sm text-slate-500 mt-1 font-medium">
                Bienvenido/a, <span className="font-bold text-slate-900">{selectedUser.name}</span>
              </p>
            </div>

            {/* PIN Dots Indicator */}
            <div className={`flex items-center justify-center gap-4 mb-8 ${errorAnimation ? 'animate-shake' : ''}`}>
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
            <div className="grid grid-cols-3 gap-3 w-full">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeyPress(num.toString())}
                  className="h-16 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-100 text-2xl font-bold text-slate-800 transition-all active:scale-95 active:bg-slate-200 flex items-center justify-center shadow-sm"
                >
                  {num}
                </button>
              ))}
              
              {/* Bottom Row */}
              <button
                type="button"
                onClick={handleClear}
                className="h-16 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-100 text-xs font-bold tracking-wider text-slate-600 transition-all active:scale-95 flex items-center justify-center uppercase"
              >
                CLEAR
              </button>
              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                className="h-16 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-100 text-2xl font-bold text-slate-800 transition-all active:scale-95 active:bg-slate-200 flex items-center justify-center shadow-sm"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="h-16 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-100 text-slate-600 transition-all active:scale-95 flex items-center justify-center"
              >
                <Delete className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="w-full text-center text-xs text-slate-400 mt-6">
            Rol actual: <span className="font-semibold text-slate-700">{selectedUser.role}</span> ({selectedUser.roleTitle})
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
