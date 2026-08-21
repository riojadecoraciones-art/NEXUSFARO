import React from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  History,
  BarChart3,
  Users,
  Settings,
  PlusCircle,
  CircleDollarSign,
  LogOut,
  Building2,
  ReceiptText,
  Wrench,
  Edit3,
} from 'lucide-react';
import { ActiveView } from '../types';

export const Sidebar: React.FC = () => {
  const {
    currentUser,
    activeView,
    setActiveView,
    setIsLoginModalOpen,
    activeShift,
    storeInfo,
    isSupportMode,
    setIsSupportModalOpen,
  } = useApp();

  if (!currentUser) return null;

  const isOwner = currentUser.role === 'DUEÑO' || isSupportMode;

  interface NavItem {
    id: ActiveView;
    label: string;
    icon: React.ElementType;
    ownerOnly?: boolean;
  }

  const allNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Panel de Control', icon: LayoutDashboard, ownerOnly: true },
    { id: 'pos', label: 'Punto de Venta', icon: ShoppingCart, ownerOnly: false },
    { id: 'inventory', label: 'Inventario', icon: Package, ownerOnly: true },
    { id: 'expenses', label: 'Gastos Fijos & Negocio', icon: ReceiptText, ownerOnly: true },
    { id: 'history', label: 'Historial', icon: History, ownerOnly: true },
    { id: 'reports', label: 'Reportes', icon: BarChart3, ownerOnly: true },
    { id: 'cash_register', label: 'Control de Caja', icon: CircleDollarSign, ownerOnly: false },
    { id: 'employees', label: 'Empleados', icon: Users, ownerOnly: true },
  ];

  const navItems = allNavItems.filter((item) => !item.ownerOnly || isOwner);

  return (
    <aside className="w-64 bg-gradient-to-b from-[#f0f5fc] via-[#e7f0fa] to-[#dce8f6] text-slate-800 flex flex-col justify-between shrink-0 h-full border-r border-blue-200/80 z-30 overflow-y-auto scrollbar-none shadow-sm">
      <div className="flex flex-col">
        {/* Top Header Brand */}
        <div className="p-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/25 ring-2 ring-blue-400/30 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <div className="font-black text-lg text-slate-900 tracking-tight leading-tight truncate" title={storeInfo.storeName}>
                {storeInfo.storeName || 'FARO POS'}
              </div>
              <div className="text-[11px] text-blue-700 font-semibold truncate">
                {storeInfo.brandSubtitle || 'Gestión Inteligente'}
              </div>
            </div>
          </div>

          {/* Store Branch Card (Personalizable) */}
          <div
            onClick={() => {
              if (isOwner) setActiveView('settings');
            }}
            className={`mt-4 p-3 bg-white/95 rounded-xl border border-blue-200/90 flex items-center justify-between gap-2.5 shadow-2xs transition-all ${
              isOwner ? 'cursor-pointer hover:border-blue-400 hover:bg-white hover:shadow-xs' : ''
            }`}
            title={isOwner ? 'Clic para personalizar sucursal y datos en Configuración' : ''}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <div className="font-bold text-xs text-slate-900 truncate" title={storeInfo.branchName}>
                  {storeInfo.branchName || 'Sucursal Principal'}
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="truncate">
                    {isSupportMode
                      ? 'Soporte Maestro'
                      : isOwner
                      ? 'Acceso Administrador'
                      : 'Terminal Cajero'}
                  </span>
                </div>
              </div>
            </div>
            {isOwner && (
              <Edit3 className="w-3.5 h-3.5 text-blue-400 hover:text-blue-700 shrink-0" />
            )}
          </div>

          {/* Master Support Mode Active Banner */}
          {isSupportMode && (
            <button
              onClick={() => setIsSupportModalOpen(true)}
              className="w-full mt-2.5 px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/50 rounded-lg text-[11px] font-bold text-amber-900 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
            >
              <Wrench className="w-3.5 h-3.5 text-amber-700" />
              <span>Herramientas Soporte</span>
            </button>
          )}

          {/* New Transaction Button */}
          <button
            onClick={() => setActiveView('pos')}
            className="w-full mt-3 py-2.5 px-4 bg-blue-600 text-white hover:bg-blue-700 font-black rounded-xl text-xs tracking-wider flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4 text-blue-100" />
            <span>+ NUEVA VENTA (POS)</span>
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="px-3 space-y-1 mt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 font-bold border border-blue-500'
                    : 'text-slate-700 hover:text-blue-900 hover:bg-blue-200/50 font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-blue-600'}`} />
                  <span>{item.label}</span>
                </div>

                {item.id === 'cash_register' && activeShift && activeShift.status === 'ABIERTA' && (
                  <span className={`w-2 h-2 rounded-full shadow-xs ${isActive ? 'bg-emerald-300 ring-2 ring-white/60' : 'bg-emerald-500 ring-2 ring-emerald-400/40'}`}></span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="p-3 border-t border-blue-200/80 space-y-1 bg-blue-50/50">
        {isOwner && (
          <button
            onClick={() => setActiveView('settings')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeView === 'settings'
                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25 border border-blue-500'
                : 'text-slate-700 hover:text-blue-900 hover:bg-blue-200/50'
            }`}
          >
            <Settings className={`w-4 h-4 ${activeView === 'settings' ? 'text-white' : 'text-blue-600'}`} />
            <span>Configuración</span>
          </button>
        )}

        <button
          onClick={() => setIsLoginModalOpen(true)}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-700 hover:text-blue-900 hover:bg-blue-200/50 transition-colors"
        >
          <LogOut className="w-4 h-4 text-blue-600" />
          <span>Cambiar de Usuario</span>
        </button>
      </div>
    </aside>
  );
};
