import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { DateRangeFilter } from './DateRangeFilter';
import {
  DateRangeValue,
  DEFAULT_DATE_RANGE,
  DATE_RANGE_PRESET_LABELS,
  DATE_RANGE_PHRASE_DE,
  DATE_RANGE_PHRASE_EN,
  computeDateRange,
  isTimestampInRange,
} from '../utils/dateRange';
import {
  TrendingUp,
  Receipt,
  CreditCard,
  Banknote,
  AlertTriangle,
  RotateCw,
  SlidersHorizontal,
  Radio,
  Package,
  CheckCircle2,
  Lock,
  Unlock,
  Plus,
} from 'lucide-react';
import { formatARS } from '../utils/currency';

export const DashboardView: React.FC = () => {
  const { sales, activeShift, products, alerts, users, currentUser, setActiveView, showToast } = useApp();

  // Antes las métricas sumaban TODO el histórico de ventas aunque el chip del
  // header dijera "Hoy": era decorativo, no filtraba nada. Ahora sí filtra.
  const [dateRangeValue, setDateRangeValue] = useState<DateRangeValue>(DEFAULT_DATE_RANGE);
  const dateRange = useMemo(() => computeDateRange(dateRangeValue), [dateRangeValue]);
  const periodLabel = DATE_RANGE_PRESET_LABELS[dateRangeValue.preset].toLowerCase();

  // Dynamic calculations from real sales, acotadas al período seleccionado
  const completedSales = useMemo(
    () => sales.filter((s) => s.status === 'COMPLETADA' && isTimestampInRange(s.timestamp, dateRange)),
    [sales, dateRange]
  );

  const totalSalesAmount = useMemo(() => {
    return completedSales.reduce((sum, s) => sum + s.total, 0);
  }, [completedSales]);

  const transactionsCount = completedSales.length;

  const averageTicket = useMemo(() => {
    if (transactionsCount === 0) return 0;
    return totalSalesAmount / transactionsCount;
  }, [totalSalesAmount, transactionsCount]);

  const cashInDrawer = activeShift ? activeShift.expectedCash : 0;

  // Real hourly distribution from completed sales
  const hourlyData = useMemo(() => {
    const hours = [
      { label: '8AM', range: [8, 9] },
      { label: '10AM', range: [10, 11] },
      { label: '12PM', range: [12, 13] },
      { label: '2PM', range: [14, 15] },
      { label: '4PM', range: [16, 17] },
      { label: '6PM', range: [18, 19] },
      { label: '8PM', range: [20, 21] },
    ];

    return hours.map((h) => {
      const amount = completedSales
        .filter((s) => {
          const date = new Date(s.timestamp);
          const hour = date.getHours();
          return hour >= h.range[0] && hour <= h.range[1];
        })
        .reduce((sum, s) => sum + s.total, 0);

      return {
        label: h.label,
        amount,
      };
    });
  }, [completedSales]);

  const maxHourlyAmount = useMemo(() => {
    const max = Math.max(...hourlyData.map((h) => h.amount), 1000);
    return max > 0 ? max : 1000;
  }, [hourlyData]);

  // Top selling products calculated dynamically from real sales
  const topProducts = useMemo(() => {
    const counts: Record<string, { name: string; units: number; revenue: number }> = {};
    completedSales.forEach((sale) => {
      sale.items.forEach((item) => {
        if (!counts[item.productId]) {
          counts[item.productId] = { name: item.productName, units: 0, revenue: 0 };
        }
        counts[item.productId].units += item.quantity;
        counts[item.productId].revenue += item.total;
      });
    });

    return Object.values(counts).sort((a, b) => b.units - a.units).slice(0, 4);
  }, [completedSales]);

  const maxProductUnits = useMemo(() => {
    if (topProducts.length === 0) return 10;
    return Math.max(...topProducts.map((p) => p.units), 10);
  }, [topProducts]);

  return (
    <div className="flex-1 p-6 sm:p-8 bg-[#f8fafc] overflow-y-auto space-y-6">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Panel General y Analítica
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Métricas de rendimiento en tiempo real del comercio.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <DateRangeFilter value={dateRangeValue} onChange={setDateRangeValue} />
          <button
            onClick={() => showToast('Métricas sincronizadas en vivo', 'info')}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl shadow-xs transition-colors"
            title="Refrescar métricas"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Card 1: Ventas del Día */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ventas del Período</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {formatARS(totalSalesAmount)}
            </div>
          </div>
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <span>{transactionsCount} {transactionsCount === 1 ? 'operación registrada' : 'operaciones registradas'}</span>
          </div>
        </div>

        {/* Card 2: Ticket Promedio */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ticket Promedio</span>
            <Receipt className="w-4 h-4 text-slate-400" />
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {formatARS(averageTicket)}
            </div>
          </div>
          <div className="text-xs font-medium text-slate-500">
            {transactionsCount > 0
              ? `Calculado en base a ventas ${DATE_RANGE_PHRASE_DE[dateRangeValue.preset]}`
              : `Sin ventas ${DATE_RANGE_PHRASE_EN[dateRangeValue.preset]}`}
          </div>
        </div>

        {/* Card 3: Transacciones */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Transacciones</span>
            <CreditCard className="w-4 h-4 text-slate-400" />
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {transactionsCount}
            </div>
          </div>
          <div className="text-xs font-semibold text-slate-500">
            {transactionsCount > 0 ? 'Tickets emitidos con éxito' : 'Listo para registrar ventas'}
          </div>
        </div>

        {/* Card 4: Efectivo en Caja */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Efectivo en Caja</span>
            <Banknote className={`w-4 h-4 ${activeShift ? 'text-emerald-600' : 'text-slate-400'}`} />
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {formatARS(cashInDrawer)}
            </div>
          </div>
          <div>
            {activeShift ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                <Unlock className="w-3 h-3 text-emerald-600" />
                <span>Turno Activo ({activeShift.cashierName})</span>
              </span>
            ) : (
              <button
                onClick={() => setActiveView('cash_register')}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors"
              >
                <Lock className="w-3 h-3 text-slate-500" />
                <span>Caja Cerrada • Abrir</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Middle Section: Ventas por Hora & Top Productos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Ventas por Hora Chart */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Ventas por Hora</h3>
              <p className="text-xs text-slate-400 mt-0.5">Distribución horaria — {periodLabel}</p>
            </div>
          </div>

          {/* Bar chart representation */}
          <div className="h-56 flex items-end justify-between gap-3 pt-6 pb-2 px-2">
            {hourlyData.map((bar, idx) => {
              const heightPct = bar.amount > 0 ? Math.min(100, Math.max(8, Math.round((bar.amount / maxHourlyAmount) * 100))) : 4;
              const hasSales = bar.amount > 0;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    ${bar.amount}
                  </div>
                  <div className="w-full h-44 bg-slate-100 rounded-t-lg flex items-end overflow-hidden">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-md transition-all duration-500 ${
                        hasSales
                          ? 'bg-emerald-700 group-hover:bg-emerald-800 shadow-xs'
                          : 'bg-slate-200'
                      }`}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">{bar.label}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
            <span>$0</span>
            <span>${(maxHourlyAmount / 2).toFixed(0)}</span>
            <span>${maxHourlyAmount.toFixed(0)}</span>
          </div>
        </div>

        {/* Top Productos Ranking */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Top Productos</h3>
              <p className="text-xs text-slate-400 mt-0.5">Más vendidos — {periodLabel}</p>
            </div>
            <SlidersHorizontal className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-4 my-auto">
            {topProducts.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400">
                <Package className="w-10 h-10 text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600 text-xs">
                  Sin ventas registradas {DATE_RANGE_PHRASE_EN[dateRangeValue.preset]}
                </p>
                <p className="text-[11px] text-slate-400 max-w-[200px] mt-0.5">
                  Los productos más vendidos aparecerán aquí al facturar.
                </p>
              </div>
            ) : (
              topProducts.map((prod, idx) => {
                const pct = Math.min(100, Math.round((prod.units / maxProductUnits) * 100));
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-800">
                      <span className="truncate pr-2">{prod.name}</span>
                      <span className="font-mono shrink-0">{prod.units} u. • {formatARS(prod.revenue)}</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${
                          idx === 0 ? 'bg-slate-950' : idx === 1 ? 'bg-slate-800' : 'bg-slate-500'
                        }`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">{products.length} productos en catálogo</span>
            <button
              onClick={() => setActiveView('inventory')}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              Ver inventario completo →
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Alertas Críticas & Estado en Tiempo Real */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Alertas Críticas */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="font-extrabold text-base text-slate-900">Alertas de Inventario</h3>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-xs ${
              alerts.length > 0 ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {alerts.length} {alerts.length === 1 ? 'Alerta' : 'Alertas'}
            </span>
          </div>

          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="p-6 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col items-center justify-center text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-1.5" />
                <p className="text-xs font-bold text-slate-700">Inventario en estado óptimo</p>
                <p className="text-[11px] text-slate-400 mt-0.5">No hay productos agotados ni alertas de stock mínimo.</p>
              </div>
            ) : (
              alerts.slice(0, 2).map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-all flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0 mt-0.5">
                      {alert.type.includes('STOCK') ? <Package className="w-4 h-4 text-amber-600" /> : <Banknote className="w-4 h-4 text-rose-600" />}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">{alert.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{alert.message}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveView(alert.actionRoute as any || 'inventory')}
                    className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-[11px] font-extrabold text-slate-800 tracking-wider uppercase shrink-0 transition-colors shadow-xs"
                  >
                    {alert.actionLabel || 'REVISAR'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Estado en Tiempo Real (Usuarios y Turno) */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-emerald-600" />
              <h3 className="font-extrabold text-base text-slate-900">Estado del Sistema y Personal</h3>
            </div>
            <button
              onClick={() => setActiveView('employees')}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              Gestionar Personal →
            </button>
          </div>

          <div className="space-y-3">
            {users.map((user) => {
              const isCurrent = currentUser?.id === user.id;
              const hasOpenShift = activeShift && activeShift.cashierId === user.id;

              return (
                <div key={user.id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                      {user.initials || 'U'}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{user.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-semibold">
                            Sesión Activa
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">{user.roleTitle || user.role}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {hasOpenShift ? (
                      <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Caja Abierta</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-400 font-medium text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                        <span>Sin turno</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
