import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { AppAlert } from '../types';
import { ProductImage } from './ProductImage';
import {
  X,
  Bell,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Package,
  ArrowRight,
  Plus,
  Trash2,
  CheckCheck,
  Search,
  Check,
} from 'lucide-react';

export const NotificationDrawer: React.FC = () => {
  const {
    isNotificationsPanelOpen,
    setIsNotificationsPanelOpen,
    alerts,
    unreadAlertsCount,
    lowStockProducts,
    dismissAlert,
    markAlertAsRead,
    markAllAlertsAsRead,
    clearAllAlerts,
    quickRestockProduct,
    setActiveView,
    currentUser,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | 'stock' | 'cash' | 'read'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customRestockId, setCustomRestockId] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState<number>(10);

  // Filter alerts based on active tab and search query
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      // Tab filter
      if (activeTab === 'stock' && alert.type !== 'STOCK_BAJO' && alert.type !== 'STOCK_AGOTADO') {
        return false;
      }
      if (activeTab === 'cash' && alert.type !== 'CAJA_DIFERENCIA') {
        return false;
      }
      if (activeTab === 'read' && !alert.read) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = alert.title.toLowerCase().includes(query);
        const matchesMessage = alert.message.toLowerCase().includes(query);
        const matchesSku = alert.productSku?.toLowerCase().includes(query) || false;
        return matchesTitle || matchesMessage || matchesSku;
      }

      return true;
    });
  }, [alerts, activeTab, searchQuery]);

  const stockAlertsCount = useMemo(() => {
    return alerts.filter((a) => a.type === 'STOCK_BAJO' || a.type === 'STOCK_AGOTADO').length;
  }, [alerts]);

  const cashAlertsCount = useMemo(() => {
    return alerts.filter((a) => a.type === 'CAJA_DIFERENCIA').length;
  }, [alerts]);

  if (!isNotificationsPanelOpen) return null;

  const handleNavigateToInventory = (sku?: string) => {
    setIsNotificationsPanelOpen(false);
    setActiveView('inventory');
  };

  const handleQuickRestock = (productId: string, amount: number) => {
    quickRestockProduct(productId, amount);
    setCustomRestockId(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        onClick={() => setIsNotificationsPanelOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg bg-white border-l border-slate-200 text-slate-900 shadow-2xl flex flex-col transition-all duration-300 animate-in slide-in-from-right">
          
          {/* Header */}
          <div className="p-5 border-b border-slate-200 bg-slate-50/90 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                    Centro de Alertas & Notificaciones
                    {unreadAlertsCount > 0 && (
                      <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-100 border border-rose-200 text-rose-700">
                        {unreadAlertsCount} nuevas
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Avisos en tiempo real de stock mínimo, caja y operaciones
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsNotificationsPanelOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
                title="Cerrar panel (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Subheader action bar */}
            <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-slate-200">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por producto o código SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>

              {alerts.length > 0 && (
                <div className="flex items-center gap-1">
                  {unreadAlertsCount > 0 && (
                    <button
                      onClick={markAllAlertsAsRead}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                      title="Marcar todas como leídas"
                    >
                      <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span className="hidden sm:inline">Leídas</span>
                    </button>
                  )}
                  <button
                    onClick={clearAllAlerts}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-xs transition-colors"
                    title="Limpiar todas las alertas"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                Todas ({alerts.length})
              </button>
              <button
                onClick={() => setActiveTab('stock')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'stock'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                Stock Crítico ({stockAlertsCount})
              </button>
              <button
                onClick={() => setActiveTab('cash')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'cash'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                Caja ({cashAlertsCount})
              </button>
              <button
                onClick={() => setActiveTab('read')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'read'
                    ? 'bg-slate-800 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                Historial Leídas
              </button>
            </div>
          </div>

          {/* Alert List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8fafc]">
            {filteredAlerts.length === 0 ? (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-3 shadow-xs">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  {searchQuery ? 'No hay alertas con ese término' : 'Inventario y Caja al Día'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed font-medium">
                  {searchQuery
                    ? 'Intenta con otro nombre de producto o código SKU.'
                    : 'No hay alertas pendientes en esta categoría. El sistema te notificará automáticamente cuando un producto alcance su stock mínimo.'}
                </p>
                {lowStockProducts.length > 0 && (
                  <button
                    onClick={() => setActiveTab('stock')}
                    className="mt-4 px-3.5 py-2 bg-rose-50 border border-rose-200 text-rose-800 hover:bg-rose-100 rounded-xl text-xs font-bold transition-colors shadow-xs"
                  >
                    Ver {lowStockProducts.length} productos en stock mínimo
                  </button>
                )}
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const isOutOfStock = alert.type === 'STOCK_AGOTADO' || alert.currentStock === 0;
                const isLowStock = alert.type === 'STOCK_BAJO';
                const isCashAlert = alert.type === 'CAJA_DIFERENCIA';

                let cardStyle = 'bg-white border-slate-200 text-slate-900';
                let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
                let iconWrapperStyle = 'bg-slate-100 text-slate-600 border-slate-200';
                let IconComponent = Bell;

                if (isOutOfStock) {
                  cardStyle = alert.read
                    ? 'bg-white/80 border-rose-200/80 text-slate-800'
                    : 'bg-white border-rose-300 shadow-sm ring-1 ring-rose-100';
                  badgeStyle = 'bg-rose-100 text-rose-800 border-rose-200';
                  iconWrapperStyle = 'bg-rose-50 text-rose-600 border-rose-200';
                  IconComponent = AlertOctagon;
                } else if (isLowStock) {
                  cardStyle = alert.read
                    ? 'bg-white/80 border-amber-200/80 text-slate-800'
                    : 'bg-white border-amber-300 shadow-sm ring-1 ring-amber-100';
                  badgeStyle = 'bg-amber-100 text-amber-900 border-amber-200';
                  iconWrapperStyle = 'bg-amber-50 text-amber-600 border-amber-200';
                  IconComponent = AlertTriangle;
                } else if (isCashAlert) {
                  cardStyle = alert.read
                    ? 'bg-white/80 border-blue-200/80 text-slate-800'
                    : 'bg-white border-blue-300 shadow-sm ring-1 ring-blue-100';
                  badgeStyle = 'bg-blue-100 text-blue-800 border-blue-200';
                  iconWrapperStyle = 'bg-blue-50 text-blue-600 border-blue-200';
                  IconComponent = AlertCircleIcon;
                }

                const currentStock = alert.currentStock ?? 0;
                const minStock = alert.minStock ?? 1;

                return (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-2xl border transition-all duration-200 ${cardStyle} ${
                      alert.read ? 'opacity-80' : ''
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {alert.productName ? (
                          <div className="w-12 h-12 rounded-xl bg-slate-50 overflow-hidden border border-slate-200 shrink-0 relative p-1">
                            <ProductImage
                              src={alert.productImage}
                              alt={alert.productName || 'Producto'}
                              category={alert.category || 'General'}
                              className="w-full h-full object-contain"
                            />
                            {isOutOfStock && (
                              <div className="absolute inset-0 bg-rose-600/80 backdrop-blur-2xs flex items-center justify-center text-[10px] font-extrabold text-white">
                                0 u.
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${iconWrapperStyle}`}
                          >
                            <IconComponent className="w-5 h-5" />
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${badgeStyle}`}>
                              {isOutOfStock ? 'AGOTADO' : isLowStock ? 'STOCK MÍNIMO' : 'ALERTA CAJA'}
                            </span>
                            {alert.category && (
                              <span className="text-[11px] text-slate-500 font-semibold">{alert.category}</span>
                            )}
                            <span className="text-[11px] text-slate-400">• {alert.timestamp}</span>
                          </div>

                          <h4 className="text-sm font-bold text-slate-900 mt-1 leading-snug">
                            {alert.title}
                          </h4>
                          {alert.productSku && (
                            <p className="text-[11px] font-mono font-medium text-slate-500 mt-0.5">
                              SKU: {alert.productSku}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Top right actions */}
                      <div className="flex items-center gap-1">
                        {!alert.read && (
                          <button
                            onClick={() => markAlertAsRead(alert.id)}
                            className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Marcar como leída"
                          >
                            <CheckCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => dismissAlert(alert.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Descartar alerta"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Alert Message */}
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed font-medium">
                      {alert.message}
                    </p>

                    {/* Stock Meter if it's a product alert */}
                    {(isOutOfStock || isLowStock) && alert.productId && (
                      <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                          <span className="text-slate-500">Nivel de Stock:</span>
                          <span
                            className={`font-bold ${
                              isOutOfStock ? 'text-rose-600' : 'text-amber-700'
                            }`}
                          >
                            {currentStock} de {minStock} u. mínimas
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isOutOfStock
                                ? 'w-0'
                                : currentStock <= minStock / 2
                                ? 'bg-rose-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.max(4, Math.min(100, (currentStock / minStock) * 100))}%` }}
                          />
                        </div>

                        {/* Quick Restock Action Buttons */}
                        <div className="mt-3 pt-2.5 border-t border-slate-200">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-[11px] text-slate-600 font-bold">Reponer al instante:</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleQuickRestock(alert.productId!, 5)}
                                className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-0.5 shadow-xs"
                                title="Agregar 5 unidades"
                              >
                                <Plus className="w-3 h-3" /> 5 u.
                              </button>
                              <button
                                onClick={() => handleQuickRestock(alert.productId!, 10)}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-600 border border-blue-200 text-blue-700 hover:text-white rounded-lg text-[11px] font-bold transition-colors flex items-center gap-0.5 shadow-xs"
                                title="Agregar 10 unidades"
                              >
                                <Plus className="w-3 h-3" /> 10 u.
                              </button>
                              <button
                                onClick={() => handleQuickRestock(alert.productId!, 25)}
                                className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-0.5 shadow-xs"
                                title="Agregar 25 unidades"
                              >
                                <Plus className="w-3 h-3" /> 25 u.
                              </button>
                              <button
                                onClick={() =>
                                  setCustomRestockId(
                                    customRestockId === alert.productId ? null : alert.productId!
                                  )
                                }
                                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-colors shadow-xs"
                              >
                                Personalizado
                              </button>
                            </div>
                          </div>

                          {/* Custom Amount Sub-form */}
                          {customRestockId === alert.productId && (
                            <div className="mt-2.5 p-2 bg-white rounded-xl border border-slate-300 flex items-center gap-2 animate-in fade-in shadow-sm">
                              <span className="text-xs text-slate-700 font-bold">Cantidad a sumar:</span>
                              <input
                                type="number"
                                min="1"
                                max="1000"
                                value={customAmount}
                                onChange={(e) => setCustomAmount(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-20 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 text-center font-bold focus:outline-none focus:border-blue-500"
                              />
                              <button
                                onClick={() => handleQuickRestock(alert.productId!, customAmount)}
                                className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Confirmar (+{customAmount})
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Card Footer Navigation */}
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleNavigateToInventory(alert.productSku)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 py-1 px-2.5 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        Gestionar en Inventario
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
            <button
              onClick={() => {
                setIsNotificationsPanelOpen(false);
                setActiveView('inventory');
              }}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-slate-200"
            >
              <Package className="w-4 h-4 text-blue-600" />
              Abrir Gestión de Inventario
            </button>

            <button
              onClick={() => setIsNotificationsPanelOpen(false)}
              className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-md"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function AlertCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}
