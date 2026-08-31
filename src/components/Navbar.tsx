import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Search,
  Bell,
  UserCheck,
  CircleDollarSign,
  AlertTriangle,
  Package,
  CheckCircle2,
  X,
  ChevronDown,
  ScanLine,
  Barcode,
  Users,
  LogOut,
  KeyRound,
  Shield,
  Database,
} from 'lucide-react';
import { formatARS } from '../utils/currency';

interface NavbarProps {
  onSearchChange?: (term: string) => void;
  searchTerm?: string;
  searchPlaceholder?: string;
  onOpenCashModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSearchChange,
  searchTerm: controlledSearchTerm,
  searchPlaceholder = 'Buscar producto, código de barras o SKU (Pistola Láser USB)...',
  onOpenCashModal,
}) => {
  const {
    currentUser,
    users,
    activeShift,
    alerts,
    unreadAlertsCount,
    lowStockProducts,
    setActiveView,
    activeView,
    setIsLoginModalOpen,
    switchUserDirect,
    logout,
    isNotificationsPanelOpen,
    setIsNotificationsPanelOpen,
    scanBarcodeOrSku,
    isLoadingData,
    isSupabaseConnected,
  } = useApp();

  const [internalTerm, setInternalTerm] = useState<string>('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const currentTerm = controlledSearchTerm !== undefined ? controlledSearchTerm : internalTerm;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!currentUser) return null;

  const lowStockCount = lowStockProducts.length;

  const handleInputChange = (val: string) => {
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setInternalTerm(val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const codeToScan = currentTerm.trim();
      if (!codeToScan) return;

      // Switch to POS if not currently in POS view
      if (activeView !== 'pos') {
        setActiveView('pos');
      }

      const result = scanBarcodeOrSku(codeToScan);
      if (result.success) {
        // Clear search input for next scan
        handleInputChange('');
      }
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
      {/* Left: View Title or Search Bar with USB Barcode Scanner Support */}
      <div className="flex items-center gap-4 flex-1 max-w-2xl">
        <div className="relative w-full group">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-blue-600 transition-colors" />
          <input
            type="text"
            value={currentTerm}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-24 py-2 bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-sm text-slate-800 placeholder-slate-400 rounded-xl border border-transparent focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15 transition-all font-medium shadow-2xs"
          />

          {/* Barcode scanner status indicator badge & clear button */}
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-auto">
            {currentTerm ? (
              <button
                onClick={() => handleInputChange('')}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/60"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}

            <span
              className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-bold tracking-tight select-none cursor-default"
              title="Lector de código de barras USB listo para escanear"
            >
              <ScanLine className="w-3 h-3 text-emerald-600 animate-pulse" />
              <span>Láser USB</span>
            </span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Low Stock Warning Pill - Persistent Alert Indicator */}
        {lowStockCount > 0 && (
          <button
            onClick={() => setIsNotificationsPanelOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border border-amber-500/30 transition-all animate-pulse"
            title="Ver productos con stock mínimo o agotados"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="hidden md:inline">{lowStockCount} en stock crítico</span>
            <span className="md:hidden">{lowStockCount}</span>
          </button>
        )}

        {/* Supabase Connection Status Pill */}
        <div
          className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            isLoadingData
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : isSupabaseConnected
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200/90'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
          title={
            isLoadingData
              ? 'Sincronizando con Supabase...'
              : isSupabaseConnected
              ? 'Conectado a la base de datos Supabase (NEXUS FARO)'
              : 'Sin conexión a Supabase'
          }
        >
          <Database
            className={`w-3.5 h-3.5 ${
              isLoadingData
                ? 'text-blue-500 animate-spin'
                : isSupabaseConnected
                ? 'text-emerald-600'
                : 'text-rose-600'
            }`}
          />
          <span className="text-[11px] font-bold">
            {isLoadingData ? 'Sincronizando...' : isSupabaseConnected ? 'Supabase Nube' : 'Sin Conexión'}
          </span>
        </div>

        {/* Cash Shift Status Badge */}
        <button
          onClick={() => setActiveView('cash_register')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            activeShift && activeShift.status === 'ABIERTA'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
          }`}
          title="Ver o gestionar el turno de caja"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              activeShift && activeShift.status === 'ABIERTA'
                ? 'bg-emerald-500 animate-pulse'
                : 'bg-amber-500'
            }`}
          />
          <span>
            {activeShift && activeShift.status === 'ABIERTA'
              ? `Caja Abierta • ${formatARS(activeShift.expectedCash)}`
              : 'Caja Cerrada (Abrir)'}
          </span>
        </button>

        {/* Persistent Notifications Drawer Trigger Button */}
        <button
          onClick={() => setIsNotificationsPanelOpen(true)}
          className={`relative p-2 rounded-xl transition-all ${
            isNotificationsPanelOpen
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="Abrir Centro de Alertas y Notificaciones"
        >
          <Bell className="w-5 h-5" />
          {alerts.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white shadow-xs">
              {unreadAlertsCount > 0 ? unreadAlertsCount : alerts.length}
            </span>
          )}
        </button>

        {/* User Switch Button & Avatar */}
        <div className="h-7 w-[1px] bg-slate-200 mx-1" />

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2.5 p-1 pl-2.5 pr-2 rounded-xl hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all text-left group"
            title="Opciones de usuario y cambio rápido de cuenta"
          >
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-900 group-hover:text-slate-950 flex items-center justify-end gap-1">
                <span>{currentUser.name}</span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium">{currentUser.roleTitle}</div>
            </div>

            {currentUser.avatarUrl && currentUser.avatarUrl.trim() !== '' ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-xs"
              />
            ) : (
              <div className={`w-9 h-9 rounded-xl text-white font-bold flex items-center justify-center text-xs shadow-xs ${
                currentUser.role === 'SUPERADMIN'
                  ? 'bg-amber-600'
                  : currentUser.role === 'DUEÑO'
                  ? 'bg-slate-900'
                  : 'bg-blue-600'
              }`}>
                {currentUser.initials || 'U'}
              </div>
            )}

            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
          </button>

          {/* User Quick Switch Dropdown */}
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sesión Actual</div>
                <div className="font-bold text-slate-900 text-sm mt-0.5 flex items-center justify-between">
                  <span>{currentUser.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    currentUser.role === 'SUPERADMIN'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : currentUser.role === 'DUEÑO'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {currentUser.role}
                  </span>
                </div>
                <div className="text-xs text-slate-500">{currentUser.roleTitle}</div>
              </div>

              <div className="p-2 border-b border-slate-100">
                <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>Cambiar de Usuario (Rápido)</span>
                </div>

                <div className="mt-1 space-y-1">
                  {users.map((user) => {
                    const isCurrent = user.id === currentUser.id;
                    return (
                      <button
                        key={user.id}
                        onClick={() => {
                          switchUserDirect(user.id);
                          setIsUserMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors text-xs ${
                          isCurrent
                            ? 'bg-slate-100 font-bold text-slate-900'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {user.avatarUrl && user.avatarUrl.trim() !== '' ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.name}
                              referrerPolicy="no-referrer"
                              className="w-7 h-7 rounded-lg object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[10px]">
                              {user.initials}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-slate-900 leading-tight">{user.name}</div>
                            <div className="text-[10px] text-slate-500">{user.roleTitle}</div>
                          </div>
                        </div>

                        {isCurrent ? (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Activo</span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold">Probar</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-2 space-y-1">
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsLoginModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <KeyRound className="w-4 h-4 text-slate-500" />
                  <span>Ingresar con Teclado PIN</span>
                </button>

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
