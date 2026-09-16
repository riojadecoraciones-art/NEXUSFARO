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
  CreditCard,
  Banknote,
  QrCode,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  Wallet,
  Info,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';

// Colores fijos por método de pago — los mismos que ya se usan en el resto
// de la app (PaymentModal, CashRegisterView): cambiar el color acá sin
// cambiarlo en todos lados sería confuso, no más "gráfico".
const METHOD_COLOR: Record<PaymentMethodType, string> = {
  EFECTIVO: '#059669', // emerald-600
  TARJETA: '#2563eb', // blue-600
  TRANSFERENCIA_QR: '#9333ea', // purple-600
  MIXTO: '#64748b', // slate-500
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethodType, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA_QR: 'Transferencia/QR',
  MIXTO: 'Mixto',
};

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

  // Los 5 pasos del puente Ventas -> Ganancia Neta, para dibujarlo como
  // barras (no sólo como filas de texto) — mismo patrón que un "waterfall
  // chart" financiero: los pasos que restan y los totales/subtotales llevan
  // un color distinto, para que se lea de un vistazo qué suma y qué resta.
  const waterfallSteps = useMemo(
    () => [
      { key: 'ventas', label: 'Ventas totales', amount: totalRevenue, isTotal: true },
      { key: 'costo', label: 'Costo de mercadería', amount: -totalEstimatedCost, isTotal: false },
      { key: 'bruta', label: 'Ganancia Bruta', amount: grossProfit, isTotal: true },
      { key: 'gastos', label: `Gastos fijos pagados ${periodLabel}`, amount: -fixedExpensesPaidInPeriod, isTotal: false },
      { key: 'neta', label: 'Ganancia Neta', amount: netProfitReal, isTotal: true },
    ],
    [totalRevenue, totalEstimatedCost, grossProfit, fixedExpensesPaidInPeriod, netProfitReal, periodLabel]
  );
  const maxWaterfallAbs = useMemo(
    () => Math.max(...waterfallSteps.map((s) => Math.abs(s.amount)), 1),
    [waterfallSteps]
  );

  // Tendencia de ventas dentro del período elegido. Se agrupa distinto según
  // qué tan ancho es el rango, para nunca terminar ni con una sola barra
  // (un rango de "hoy" agrupado por día) ni con un muro de cientos de barras
  // ilegibles (un rango personalizado de varios meses agrupado por día).
  const isSingleDayRange = useMemo(
    () => new Date(dateRange.startMs).toDateString() === new Date(dateRange.endMs).toDateString(),
    [dateRange]
  );

  const trendData = useMemo(() => {
    if (isSingleDayRange) {
      const hours = Array.from({ length: 16 }, (_, i) => i + 7); // 7:00 a 22:00
      return hours.map((h) => ({
        key: `h${h}`,
        label: `${h}h`,
        amount: completedSales
          .filter((s) => new Date(s.timestamp).getHours() === h)
          .reduce((sum, s) => sum + s.total, 0),
      }));
    }

    const spanDays = Math.round((dateRange.endMs - dateRange.startMs) / 86400000) + 1;
    const bucketDays = spanDays > 31 ? 7 : 1;

    const buckets: { key: string; label: string; amount: number; fromMs: number; toMs: number }[] = [];
    let cursorMs = dateRange.startMs;
    while (cursorMs <= dateRange.endMs) {
      const from = new Date(cursorMs);
      from.setHours(0, 0, 0, 0);
      const to = new Date(from);
      to.setDate(to.getDate() + bucketDays - 1);
      to.setHours(23, 59, 59, 999);
      const fromLabel = from.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
      const label = bucketDays === 1 ? fromLabel : `${fromLabel}+`;
      buckets.push({ key: from.toISOString(), label, amount: 0, fromMs: from.getTime(), toMs: to.getTime() });
      cursorMs = to.getTime() + 1;
    }

    completedSales.forEach((s) => {
      const t = new Date(s.timestamp).getTime();
      const bucket = buckets.find((b) => t >= b.fromMs && t <= b.toMs);
      if (bucket) bucket.amount += s.total;
    });

    return buckets;
  }, [completedSales, dateRange, isSingleDayRange]);

  const maxTrendAmount = useMemo(() => Math.max(...trendData.map((b) => b.amount), 1), [trendData]);
  const trendHasSales = useMemo(() => trendData.some((b) => b.amount > 0), [trendData]);

  // Breakdown by payment method
  const methodStats = useMemo(() => {
    const methods: Record<PaymentMethodType, { total: number; count: number }> = {
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

  // Sólo los métodos con ventas reales en el período — con MIXTO incluido
  // (antes quedaba afuera de la comparación aunque sí sumara al total).
  const methodBreakdown = useMemo(() => {
    return (Object.keys(methodStats) as PaymentMethodType[])
      .map((key) => ({
        key,
        label: PAYMENT_METHOD_LABELS[key],
        color: METHOD_COLOR[key],
        total: methodStats[key].total,
        count: methodStats[key].count,
      }))
      .filter((m) => m.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [methodStats]);

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
    return Object.values(stats).sort((a, b) => b.total - a.total);
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

      {/* Tendencia de Ventas */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <h3 className="font-extrabold text-base text-slate-900">Tendencia de Ventas</h3>
          </div>
          <span className="text-[11px] text-slate-400 font-semibold">
            {isSingleDayRange ? 'Por hora' : trendData.length > 31 ? 'Por semana' : 'Por día'} — {periodLabel}
          </span>
        </div>

        {!trendHasSales ? (
          <div className="py-14 text-center text-slate-400 text-xs">
            No hay ventas registradas en este período todavía.
          </div>
        ) : (
          <>
            <div className="h-48 flex items-end gap-[3px] sm:gap-1 pt-8 mt-3">
              {trendData.map((bar) => {
                const heightPct = bar.amount > 0 ? Math.max(4, Math.round((bar.amount / maxTrendAmount) * 100)) : 2;
                return (
                  <div key={bar.key} className="group relative flex-1 h-full flex flex-col justify-end items-center min-w-0">
                    <div
                      tabIndex={bar.amount > 0 ? 0 : -1}
                      className="absolute bottom-full mb-1.5 whitespace-nowrap rounded-lg bg-slate-900 text-white text-[10px] font-bold px-2 py-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none z-10 shadow-md"
                    >
                      {formatARS(bar.amount)}
                      <span className="block text-slate-300 font-medium text-[9px]">{bar.label}</span>
                    </div>
                    <div className="w-full max-w-[22px] rounded-t-[4px] bg-blue-600 group-hover:bg-blue-700 transition-colors" style={{ height: `${heightPct}%` }} />
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold mt-2 pt-2 border-t border-slate-100">
              <span>{trendData[0]?.label}</span>
              {trendData.length > 2 && <span>{trendData[Math.floor(trendData.length / 2)]?.label}</span>}
              <span>{trendData[trendData.length - 1]?.label}</span>
            </div>
          </>
        )}
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

        {/* Puente visual Ventas -> Ganancia Neta */}
        <div className="space-y-2.5 mb-5">
          {waterfallSteps.map((step) => {
            const widthPct = Math.max(3, Math.round((Math.abs(step.amount) / maxWaterfallAbs) * 100));
            const barColor = step.isTotal ? 'bg-white' : 'bg-rose-400';
            const isFinal = step.key === 'neta';
            return (
              <div key={step.key} className="group">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className={`font-bold ${isFinal ? 'text-white' : 'text-emerald-100/90'}`}>{step.label}</span>
                  <span className={`font-mono font-black ${isFinal ? 'text-white text-sm' : 'text-white'}`}>
                    {step.amount < 0 ? '−' : ''}{formatARS(Math.abs(step.amount))}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColor} ${isFinal ? 'ring-1 ring-white/40' : ''}`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 mb-4 text-[11px] font-bold">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-white inline-block" />
            <span className="text-emerald-100/90">Suma / total</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
            <span className="text-emerald-100/90">Resta</span>
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

        {/* Payment Methods: barra proporcional + detalle */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-slate-900">Ventas por Método de Pago</h3>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>

          {methodBreakdown.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No hay ventas registradas en este período.
            </div>
          ) : (
            <>
              {/* Barra proporcional part-to-whole */}
              <div className="flex w-full h-3.5 rounded-full overflow-hidden gap-0.5 bg-slate-100">
                {methodBreakdown.map((m) => (
                  <div
                    key={m.key}
                    className="h-full group relative transition-opacity hover:opacity-90"
                    style={{ width: `${(m.total / totalRevenue) * 100}%`, backgroundColor: m.color }}
                    tabIndex={0}
                  >
                    <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 text-white text-[10px] font-bold px-2 py-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none z-10 shadow-md">
                      {formatARS(m.total)}
                      <span className="block text-slate-300 font-medium text-[9px]">{m.label}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {methodBreakdown.map((m) => {
                  const Icon = m.key === 'EFECTIVO' ? Banknote : m.key === 'TARJETA' ? CreditCard : m.key === 'TRANSFERENCIA_QR' ? QrCode : Layers;
                  const pct = totalRevenue > 0 ? ((m.total / totalRevenue) * 100).toFixed(0) : '0';
                  return (
                    <div key={m.key} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${m.color}1a`, color: m.color }}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900">{m.label}</div>
                          <div className="text-[10px] text-slate-400">{m.count} operaciones</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-sm text-slate-900">{formatARS(m.total)}</div>
                        <div className="text-[10px] text-slate-400">{pct}% del total</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
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
              cashierStats.map((c, idx) => {
                const pct = totalRevenue > 0 ? (c.total / totalRevenue) * 100 : 0;
                return (
                  <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-bold text-xs text-slate-900">{c.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {c.count} tickets emitidos • Ticket prom: <strong>{formatARS(c.total / (c.count || 1))}</strong>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-black text-sm text-slate-900">{formatARS(c.total)}</div>
                        <div className="text-[10px] text-emerald-700 font-bold">{pct.toFixed(0)}% de las ventas</div>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.max(2, pct)}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
