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
import { buildCsv, downloadCsv } from '../utils/csv';
import { formatARS } from '../utils/currency';
import { PaymentMethodType } from '../types';
import {
  BarChart3,
  Download,
  PieChart,
  CreditCard,
  Banknote,
  QrCode,
  ArrowUpRight,
  ShieldAlert,
  Wallet,
  Info,
  AlertTriangle,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { sales, expenses, currentUser, showToast, isSupportMode } = useApp();

  // Igual que en Sidebar.tsx: la Llave Maestra (SUPERADMIN) auditando un
  // negocio ("Asistir a este Negocio") tiene que poder ver sus reportes
  // reales, no sólo el ícono en el menú — antes este chequeo sólo miraba
  // 'DUEÑO' y bloqueaba la pantalla aunque el menú ya lo dejara entrar.
  const isSuperAdmin = currentUser?.role === 'SUPERADMIN' || isSupportMode;
  const isOwner = currentUser?.role === 'DUEÑO' || isSuperAdmin;

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

  // Costo real de lo vendido: item.unitCost es el costo copiado al momento de
  // la venta (ver types.ts), no una referencia en vivo al producto. Antes acá
  // se recalculaba con products.find(...).costPrice — el costo ACTUAL del
  // producto — así que si el costo cambiaba después (nueva compra a otro
  // precio) o el producto se borraba, el margen de ventas viejas quedaba mal
  // calculado con retroactividad, silenciosamente.
  const totalEstimatedCost = useMemo(() => {
    return completedSales.reduce((sum, sale) => {
      const saleCost = sale.items.reduce((itemSum, it) => itemSum + it.unitCost * it.quantity, 0);
      return sum + saleCost;
    }, 0);
  }, [completedSales]);

  const grossProfit = totalRevenue - totalEstimatedCost;
  const profitMarginPercent = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0.0';

  // Gastos fijos efectivamente pagados en el período (misma lógica de "plata
  // que realmente se movió" que las ventas: a diferencia de un sistema
  // contable por devengado, acá "gasto del período" es lo que salió de la
  // caja en esas fechas, no una cuota mensual proyectada de un gasto anual).
  const fixedExpensesPaidInPeriod = useMemo(() => {
    return expenses
      .filter((e) => e.status === 'PAGADO' && e.lastPaidDate && isTimestampInRange(e.lastPaidDate, dateRange))
      .reduce((sum, e) => sum + (e.lastPaidAmount ?? e.amount), 0);
  }, [expenses, dateRange]);

  // Deuda pendiente "ahora", sin importar el período elegido arriba — es una
  // plata que igual vas a tener que pagar, tiene sentido mostrarla siempre.
  const fixedExpensesPending = useMemo(() => {
    return expenses
      .filter((e) => e.status === 'PENDIENTE' || e.status === 'VENCIDO')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const netProfitReal = grossProfit - fixedExpensesPaidInPeriod;
  const netMarginPercent = totalRevenue > 0 ? ((netProfitReal / totalRevenue) * 100).toFixed(1) : '0.0';

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

  const PAYMENT_METHOD_LABELS: Record<PaymentMethodType, string> = {
    EFECTIVO: 'Efectivo',
    TARJETA: 'Tarjeta',
    TRANSFERENCIA_QR: 'Transferencia/QR',
    MIXTO: 'Mixto',
  };

  const handleExport = () => {
    if (completedSales.length === 0) {
      showToast('No hay ventas en el período seleccionado para exportar', 'warning');
      return;
    }

    const headers = ['Ticket', 'Fecha', 'Hora', 'Cajero', 'Método de Pago', 'Subtotal', 'Descuento', 'IVA', 'Total'];
    const rows = completedSales.map((s) => {
      const d = new Date(s.timestamp);
      return [
        s.ticketNumber,
        d.toLocaleDateString('es-AR'),
        d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        s.cashierName,
        PAYMENT_METHOD_LABELS[s.paymentMethod] || s.paymentMethod,
        s.subtotal,
        s.discountTotal,
        s.tax,
        s.total,
      ];
    });

    const ymd = (ms: number) => {
      const d = new Date(ms);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    downloadCsv(
      `ventas_${ymd(dateRange.startMs)}_a_${ymd(dateRange.endMs)}.csv`,
      buildCsv(headers, rows)
    );
    showToast(`Reporte exportado: ${completedSales.length} ventas`, 'success');
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
            {formatARS(totalRevenue)}
          </div>
          <span className="text-xs text-emerald-700 font-semibold mt-1 inline-block">
            {completedSales.length} transacciones — {periodLabel}
          </span>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Costo de Mercadería</span>
          <div className="text-3xl font-black text-slate-700 mt-2">
            {formatARS(totalEstimatedCost)}
          </div>
          <span className="text-xs text-slate-400 font-medium mt-1 inline-block">
            Costo ponderado de insumos
          </span>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Ganancia Bruta</span>
          <div className="text-3xl font-black text-slate-900 mt-2">
            {formatARS(grossProfit)}
          </div>
          <div className="text-xs font-bold text-emerald-700 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-4 h-4" />
            <span>Margen bruto: {profitMarginPercent}%</span>
          </div>
        </div>
      </div>

      {/* ¿Cuánto te queda realmente? — Ganancia Neta después de gastos fijos */}
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white rounded-2xl shadow-lg p-6 sm:p-7">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 text-emerald-200" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-white">¿Cuánto te queda realmente?</h3>
            <p className="text-xs text-emerald-200/90 font-medium mt-0.5">
              Ganancia neta {periodLabel}, ya descontado el costo de mercadería y los gastos fijos que pagaste en ese período.
            </p>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl border border-white/10 divide-y divide-white/10 mb-4">
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-emerald-100/90 font-medium">Ventas totales</span>
            <span className="font-mono font-bold text-white">{formatARS(totalRevenue)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-emerald-100/90 font-medium">− Costo de mercadería vendida</span>
            <span className="font-mono font-bold text-white">{formatARS(totalEstimatedCost)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-emerald-100/90 font-medium">= Ganancia Bruta</span>
            <span className="font-mono font-bold text-white">{formatARS(grossProfit)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-emerald-100/90 font-medium">− Gastos fijos pagados {periodLabel}</span>
            <span className="font-mono font-bold text-white">{formatARS(fixedExpensesPaidInPeriod)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-4">
            <span className="text-white font-extrabold text-sm">Ganancia Neta</span>
            <div className="text-right">
              <div className="font-mono font-black text-2xl text-white">{formatARS(netProfitReal)}</div>
              <div className="text-[11px] font-bold text-emerald-300">Margen neto: {netMarginPercent}%</div>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 text-[11px] text-emerald-100/80 leading-relaxed">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            No incluye impuestos (IVA, Monotributo u otros) — consultá a tu contador para el neto final después de impuestos.
          </span>
        </div>

        {fixedExpensesPending > 0 && (
          <div className="flex items-start gap-2 text-[11px] text-amber-200 leading-relaxed mt-2 bg-amber-500/10 border border-amber-400/20 rounded-lg px-3 py-2.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              Tenés <strong>{formatARS(fixedExpensesPending)}</strong> en gastos fijos pendientes o vencidos, sin pagar todavía — no están descontados arriba porque esa plata aún no salió de la caja.
            </span>
          </div>
        )}
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
                  {formatARS(methodStats.EFECTIVO.total)}
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
                  {formatARS(methodStats.TARJETA.total)}
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
                  {formatARS(methodStats.TRANSFERENCIA_QR.total)}
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
                      {c.count} tickets emitidos • Ticket prom: <strong>{formatARS(c.total / (c.count || 1))}</strong>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-black text-sm text-slate-900">
                      {formatARS(c.total)}
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
