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
  ShieldCheck,
  Crown,
  Briefcase,
  Sparkles,
} from 'lucide-react';
import { ActiveView } from '../types';
import { UserAvatar } from './UserAvatar';

export const Sidebar: React.FC = () => {
  const {
    currentUser,
    activeView,
    setActiveView,
    setIsLoginModalOpen,
    logout,
    activeShift,
    storeInfo,
    isSupportMode,
    setIsSupportModalOpen,
    isImpersonating,
  } = useApp();

  if (!currentUser) return null;

  const isSuperAdmin = currentUser.role === 'SUPERADMIN' || isSupportMode;
  const isOwner = currentUser.role === 'DUEÑO' || isSuperAdmin;
  const isCashier = currentUser.role === 'CAJERO';
  /**
   * Llave Maestra sin ningún negocio elegido para auditar: técnicamente
   * sigue siendo la misma terminal de un comercio real (por eso currentUser
   * ya lee como Dueño de ESE comercio), pero mostrarle por defecto el
   * Dashboard/Inventario/Caja/etc. de ese comercio en particular confunde
   * el rol — Llave Maestra opera la plataforma, no administra un negocio
   * puntual. Al elegir "Asistir a este Negocio" (isImpersonating) estos
   * mismos apartados vuelven a aparecer, ya con los datos reales de ese
   * negocio elegido.
   */
  const hideForBareSuperAdmin = isSuperAdmin && !isImpersonating;

  interface NavItem {
    id: ActiveView;
    label: string;
    icon: React.ElementType;
    visible: boolean;
    badge?: string;
  }

  const allNavItems: NavItem[] = [
    {
      id: 'master_portal',
      label: 'Portal Maestro (Sistema)',
      icon: ShieldCheck,
      visible: isSuperAdmin,
      badge: 'MASTER',
    },
    {
      id: 'dashboard',
      label: 'Panel de Control',
      icon: LayoutDashboard,
      visible: isOwner && !hideForBareSuperAdmin,
    },
    {
      // La Llave Maestra opera la plataforma, no vende en el mostrador de
      // ningún comercio en particular — mostrarle un POS (el de la terminal
      // física de turno, de rebote) no tiene uso real y sólo suma ruido.
      id: 'pos',
      label: 'Punto de Venta',
      icon: ShoppingCart,
      visible: !isSuperAdmin,
    },
    {
      id: 'inventory',
      label: 'Inventario',
      icon: Package,
      // El usuario sintético de la Llave Maestra tiene canManageInventory en
      // true fijo (para que un cajero real con ese permiso vea este ítem sin
      // ser Dueño) — sin el `&& !hideForBareSuperAdmin` afuera del OR, esa
      // bandera dejaba a Inventario visible igual para la Llave Maestra sin
      // auditar nada.
      visible: (isOwner || !!currentUser.canManageInventory) && !hideForBareSuperAdmin,
    },
    {
      id: 'expenses',
      label: 'Gastos Fijos & Negocio',
      icon: ReceiptText,
      visible: isOwner && !hideForBareSuperAdmin,
    },
    {
      id: 'history',
      label: 'Historial',
      icon: History,
      visible: isOwner && !hideForBareSuperAdmin,
    },
    {
      id: 'reports',
      label: 'Reportes',
      icon: BarChart3,
      visible: isOwner && !hideForBareSuperAdmin,
    },
    {
      id: 'cash_register',
      label: 'Control de Caja',
      icon: CircleDollarSign,
      visible: !hideForBareSuperAdmin,
    },
    {
      // Los datos de "Asistir a este Negocio" no incluyen empleados/PIN del
      // cliente (fuera de alcance, dato sensible) — mientras se audita, esto
      // seguiría mostrando el staff propio del operador con el cartel puesto
      // de "viendo a otro comercio", así que se oculta directamente.
      id: 'employees',
      label: 'Empleados & PINs',
      icon: Users,
      visible: isOwner && !isImpersonating && !hideForBareSuperAdmin,
    },
  ];

  const navItems = allNavItems.filter((item) => item.visible);

  return (
    <aside className="w-64 bg-gradient-to-b from-[#f0f5fc] via-[#e7f0fa] to-[#dce8f6] text-slate-800 flex flex-col justify-between shrink-0 h-full border-r border-blue-200/80 z-30 overflow-y-auto scrollbar-none shadow-sm">
      <div className="flex flex-col">
        {/* Top Header Brand */}
        <div className="p-5 pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md ring-2 shrink-0 ${
              isSuperAdmin
                ? 'bg-amber-600 shadow-amber-600/25 ring-amber-400/30'
                : 'bg-blue-600 shadow-blue-600/25 ring-blue-400/30'
            }`}>
              {isSuperAdmin ? <Sparkles className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
            </div>
            <div className="overflow-hidden">
              <div className="font-black text-lg text-slate-900 tracking-tight leading-tight truncate" title={storeInfo.storeName}>
                {storeInfo.storeName || 'FARO POS'}
              </div>
              <div className="text-[11px] text-blue-700 font-semibold truncate">
                {isSuperAdmin ? 'Llave Maestra Activa' : storeInfo.brandSubtitle || 'Gestión Inteligente'}
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
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                isSuperAdmin
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-blue-100 text-blue-700 border-blue-200'
              }`}>
                {isSuperAdmin ? <ShieldCheck className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
              </div>
              <div className="overflow-hidden">
                <div className="font-bold text-xs text-slate-900 truncate" title={storeInfo.branchName}>
                  {storeInfo.branchName || 'Sucursal Principal'}
                </div>
                <div className="text-[10px] font-semibold flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    isSuperAdmin
                      ? 'bg-amber-500 animate-pulse'
                      : isOwner
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-blue-500'
                  }`}></span>
                  <span className="truncate">
                    {isSuperAdmin
                      ? '👑 Llave Maestra Sistema'
                      : isOwner
                      ? '⭐ Acceso Dueño'
                      : '💼 Modo Empleado / POS'}
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
              <span>Diagnósticos y Soporte</span>
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
            const isMasterItem = item.id === 'master_portal';

            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                  isActive
                    ? isMasterItem
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25 font-bold border border-amber-500'
                      : 'bg-blue-600 text-white shadow-md shadow-blue-600/25 font-bold border border-blue-500'
                    : isMasterItem
                    ? 'text-amber-900 bg-amber-50/80 hover:bg-amber-100/80 border border-amber-200/80 font-bold'
                    : 'text-slate-700 hover:text-blue-900 hover:bg-blue-200/50 font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : isMasterItem ? 'text-amber-600' : 'text-blue-600'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 uppercase">
                    {item.badge}
                  </span>
                )}

                {item.id === 'cash_register' && activeShift && activeShift.status === 'ABIERTA' && (
                  <span className={`w-2 h-2 rounded-full shadow-xs ${isActive ? 'bg-emerald-300 ring-2 ring-white/60' : 'bg-emerald-500 ring-2 ring-emerald-400/40'}`}></span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="p-3 border-t border-blue-200/80 space-y-1.5 bg-blue-50/50">
        {/* User Card */}
        <div className="p-2.5 bg-white/80 rounded-xl border border-blue-200/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <UserAvatar
              avatarUrl={currentUser.avatarUrl}
              name={currentUser.name}
              initials={currentUser.initials}
              className="w-8 h-8 rounded-lg border border-slate-200 shadow-2xs"
              fallbackClassName={`text-xs ${
                isSuperAdmin
                  ? 'bg-amber-100 text-amber-800'
                  : currentUser.role === 'DUEÑO'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            />
            <div className="overflow-hidden">
              <div className="font-bold text-xs text-slate-900 truncate leading-tight">
                {currentUser.name}
              </div>
              <div className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">
                {currentUser.roleTitle}
              </div>
            </div>
          </div>

          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${
            isSuperAdmin
              ? 'bg-amber-100 text-amber-800'
              : currentUser.role === 'DUEÑO'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-blue-100 text-blue-800'
          }`}>
            {currentUser.role}
          </span>
        </div>

        {isOwner && !hideForBareSuperAdmin && (
          <button
            onClick={() => setActiveView('settings')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              activeView === 'settings'
                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25 border border-blue-500'
                : 'text-slate-700 hover:text-blue-900 hover:bg-blue-200/50'
            }`}
          >
            <Settings className={`w-4 h-4 ${activeView === 'settings' ? 'text-white' : 'text-blue-600'}`} />
            <span>Configuración del Local</span>
          </button>
        )}

        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold text-slate-700 bg-white/70 hover:bg-white hover:text-blue-900 border border-blue-200/70 transition-colors shadow-2xs"
            title="Cambiar a otro cajero o dueño"
          >
            <span>Cambiar</span>
          </button>

          <button
            onClick={logout}
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50/70 hover:bg-rose-100 border border-rose-200/70 transition-colors shadow-2xs"
            title="Cerrar la sesión actual"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Salir</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
