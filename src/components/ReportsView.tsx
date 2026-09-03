import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { DateRangeFilter } from './DateRangeFilter';
import {
  DateRangeValue,
  DEFAULT_DATE_RANGE,
  DATE_RANGE_PRESET_LABELS,
  computeDateRange,
  isTimestampInRange,
} from '../utils/dateRange';
import {
  BarChart3,
  Download,
  PieChart,
  CreditCard,
  Banknote,
  QrCode,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { sales, products, currentUser, showToast } = useApp();

  const isOwner = currentUser?.role === 'DUEÑO';

  // Antes esto era un acumulado histórico eterno: no había ningún filtro de
  // fecha, pese a que el texto de "Rendimiento por Cajero" ya hablaba de
  // "este período" sin que ese período existiera.
  const [dateRangeValue, setDateRangeValue] = useState<DateRangeValue>(DEFAULT_DATE_RANGE);
  const dateRange = useMemo(() => computeDateRange(dateRangeValue), [dateRangeValue]);
  const periodLabel = DATE_RANGE_PRESET_LABELS[dateRangeValue.preset].toLowerCase();

  const completedSales = useMemo(
    () => sales.filter((s) => s.status === 'COMPLETADA' && isTimestampInRange(s.timestamp, dateRange)),
    [sales, dateRange]
  );

  // Overall Financials
  const totalRevenue = useMemo(() => completedSales.reduce((sum, s) => sum + s.total, 0), [completedSales]);

  // Cost and margin calculation
  const totalEstimatedCost = useMemo(() => {
    return completedSales.reduce((sum, sale) => {
      const saleCost = sale.items.reduce((itemSum, it) => {
        const prod = products.find((p) => p.id === it.productId);
        return itemSum + (prod ? prod.costPrice * it.quantity : 0);
      }, 0);
      return sum + saleCost;
    }, 0);
  }, [completedSales, products]);

  const grossProfit = totalRevenue - totalEstimatedCost;
  const profitMarginPercent = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0.0';

  // Breakdown by payment method
  const methodStats = useMemo(() => {
    const methods: Record<string, { total: number; count: number }> = {
      EFECTIVO: { total: 0, count: 0 },
      TARJETA: { total: 0, count: 0 },
      TRANSFERENCIA_QR: { total: 0, count: 0 },
      MIXTO: { total: 0, count: 0 },
    };

    completedSales.forEach((s) => {
      if (methods[s.paymentMethod]) {
        methods[s.paymentMethod].total += s.total;
        methods[s.paymentMethod].count += 1;
      }
    });

    return methods;
  }, [completedSales]);

  // Cashier stats
  const cashierStats = useMemo(() => {
    const stats: Record<string, { name: string; total: number; count: number }> = {};
    completedSales.forEach((s) => {
      if (!stats[s.cashierId]) {
        stats[s.cashierId] = { name: s.cashierName, total: 0, count: 0 };
      }
      stats[s.cashierId].total += s.total;
      stats[s.cashierId].count += 1;
    });
    return Object.values(stats);
  }, [completedSales]);

  if (!isOwner) {
    return (
      <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900">Acceso Restringido</h2>
        <p className="text-sm text-slate-500 max-w-sm mt-1">
          Los reportes financieros y márgenes de ganancia están reservados exclusivamente para el rol Dueño / Administrador.
        </p>
      </div>
    );
  }

  const handleExport = () => {
    showToast('Reporte generado y descargado en CSV', 'success');
  };

  return (
    <div className="flex-1 p-6 sm:p-8 bg-[#f8fafc] overflow-y-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Reportes y Analítica
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Márgenes, rentabilidad y distribución de ingresos por canal.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <DateRangeFilter value={dateRangeValue} onChange={setDateRangeValue} />
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md transition-all"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Exportar CSV / Excel</span>
          </button>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Ingresos Brutos</span>
          <div className="text-3xl font-black text-slate-900 mt-2">
            ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-emerald-700 font-semibold mt-1 inline-block">
            {completedSales.length} transacciones — {periodLabel}
          </span>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Costo de Mercadería</span>
          <div className="text-3xl font-black text-slate-700 mt-2">
            ${totalEstimatedCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-slate-400 font-medium mt-1 inline-block">
            Costo ponderado de insumos
          </span>
        </div>

        <div className="p-5 bg-gradient-to-br from-emerald-800 to-emerald-950 text-white rounded-2xl shadow-lg">
          <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider block">Ganancia Neta Estimada</span>
          <div className="text-3xl font-black tracking-tight mt-2">
            ${grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs font-bold text-emerald-300 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-4 h-4" />
            <span>Margen de Ganancia: {profitMarginPercent}%</span>
          </div>
        </div>
      </div>

      {/* Methods & Cashiers Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Payment Methods Chart / Cards */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-slate-900">Ventas por Método de Pago</h3>
            <PieChart className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-3">
            {/* Efectivo */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Banknote className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900">Efectivo</div>
                  <div className="text-[11px] text-slate-400">{methodStats.EFECTIVO.count} operaciones</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-sm text-slate-900">
                  ${methodStats.EFECTIVO.total.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-400">
                  {totalRevenue > 0 ? ((methodStats.EFECTIVO.total / totalRevenue) * 100).toFixed(0) : 0}% del total
                </div>
              </div>
            </div>

            {/* Tarjeta */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900">Tarjeta Débito / Crédito</div>
                  <div className="text-[11px] text-slate-400">{methodStats.TARJETA.count} operaciones</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-sm text-slate-900">
                  ${methodStats.TARJETA.total.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-400">
                  {totalRevenue > 0 ? ((methodStats.TARJETA.total / totalRevenue) * 100).toFixed(0) : 0}% del total
                </div>
              </div>
            </div>

            {/* QR / Transf */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900">QR / Billeteras Virtuales</div>
                  <div className="text-[11px] text-slate-400">{methodStats.TRANSFERENCIA_QR.count} operaciones</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-sm text-slate-900">
                  ${methodStats.TRANSFERENCIA_QR.total.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-400">
                  {totalRevenue > 0 ? ((methodStats.TRANSFERENCIA_QR.total / totalRevenue) * 100).toFixed(0) : 0}% del total
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cashier Performance */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-slate-900">Rendimiento por Cajero</h3>
            <BarChart3 className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-3">
            {cashierStats.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No hay ventas registradas por ningún cajero en este período.
              </div>
            ) : (
              cashierStats.map((c, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-slate-900">{c.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {c.count} tickets emitidos • Ticket prom: <strong>${(c.total / (c.count || 1)).toFixed(2)}</strong>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-black text-sm text-slate-900">
                      ${c.total.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-bold">
                      {totalRevenue > 0 ? ((c.total / totalRevenue) * 100).toFixed(0) : 0}% de las ventas
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
