import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  History as HistoryIcon,
  Search,
  RotateCcw,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  Banknote,
  QrCode,
  Layers,
  Calendar,
  User as UserIcon,
} from 'lucide-react';
import { Sale } from '../types';

export const HistoryView: React.FC = () => {
  const { sales, refundSale, currentUser, showToast } = useApp();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('All');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState<boolean>(false);
  const [refundReason, setRefundReason] = useState<string>('Devolución por cambio de producto');

  const isOwner = currentUser?.role === 'DUEÑO';
  const canRefund = isOwner || currentUser?.canRefund;

  const filteredSales = sales.filter((sale) => {
    const matchesSearch =
      sale.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.cashierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.items.some((i) => i.productName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesMethod = methodFilter === 'All' || sale.paymentMethod === methodFilter;

    return matchesSearch && matchesMethod;
  });

  const handleOpenRefund = (sale: Sale) => {
    if (!canRefund) {
      showToast('No tienes permiso para anular ventas', 'error');
      return;
    }
    setSelectedSale(sale);
    setRefundReason('Devolución solicitada por el cliente');
    setIsRefundModalOpen(true);
  };

  const handleConfirmRefund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) return;
    const success = refundSale(selectedSale.id, refundReason);
    if (success) {
      setIsRefundModalOpen(false);
      setSelectedSale(null);
    }
  };

  return (
    <div className="flex-1 p-6 sm:p-8 bg-[#f8fafc] overflow-y-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Historial de Ventas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Registro completo de transacciones, tickets emitidos y anulaciones.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs">
          <span>Total Registros: {sales.length}</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por ticket, cajero o producto..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 focus:bg-white text-xs border border-slate-200 focus:border-slate-300 rounded-xl focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl focus:outline-none"
          >
            <option value="All">Todos los Métodos de Pago</option>
            <option value="EFECTIVO">Efectivo</option>
            <option value="TARJETA">Tarjeta</option>
            <option value="TRANSFERENCIA_QR">QR / Transferencia</option>
            <option value="MIXTO">Mixto</option>
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">TICKET</th>
                <th className="py-3.5 px-4">FECHA Y HORA</th>
                <th className="py-3.5 px-4">CAJERO</th>
                <th className="py-3.5 px-4">MÉTODO DE PAGO</th>
                <th className="py-3.5 px-4">ÍTEMS</th>
                <th className="py-3.5 px-4">TOTAL</th>
                <th className="py-3.5 px-4">ESTADO</th>
                <th className="py-3.5 px-4 text-right">ACCIONES</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No se encontraron transacciones con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const isRefunded = sale.status === 'ANULADA_DEVUELTA';
                  const totalUnits = sale.items.reduce((s, i) => s + i.quantity, 0);

                  return (
                    <tr key={sale.id} className={`hover:bg-slate-50/80 transition-colors ${isRefunded ? 'bg-rose-50/30 opacity-75' : ''}`}>
                      
                      {/* Ticket Number */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {sale.ticketNumber}
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(sale.timestamp).toLocaleDateString()}
                      </td>

                      {/* Cashier */}
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {sale.cashierName}
                      </td>

                      {/* Payment Method */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                          {sale.paymentMethod === 'EFECTIVO' && <Banknote className="w-3.5 h-3.5 text-emerald-600" />}
                          {sale.paymentMethod === 'TARJETA' && <CreditCard className="w-3.5 h-3.5 text-blue-600" />}
                          {sale.paymentMethod === 'TRANSFERENCIA_QR' && <QrCode className="w-3.5 h-3.5 text-purple-600" />}
                          {sale.paymentMethod === 'MIXTO' && <Layers className="w-3.5 h-3.5 text-slate-600" />}
                          <span>{sale.paymentMethod}</span>
                        </span>
                      </td>

                      {/* Items count */}
                      <td className="py-3 px-4 font-semibold text-slate-600">
                        {totalUnits} u. ({sale.items.length} prod.)
                      </td>

                      {/* Total */}
                      <td className="py-3 px-4 font-mono font-black text-sm text-slate-900">
                        ${sale.total.toFixed(2)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {isRefunded ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                            <RotateCcw className="w-3 h-3" />
                            Anulada / Devuelta
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Completada
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedSale(sale)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Ver detalle del ticket"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {!isRefunded && canRefund && (
                            <button
                              onClick={() => handleOpenRefund(sale)}
                              className="px-2 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1"
                              title="Anular venta y reingresar stock"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Devolución</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL / DRAWER */}
      {selectedSale && !isRefundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 animate-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Detalle de Transacción</span>
                <h3 className="font-extrabold text-lg text-slate-900">{selectedSale.ticketNumber}</h3>
              </div>
              <button onClick={() => setSelectedSale(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block font-medium">Fecha y Hora:</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {new Date(selectedSale.timestamp).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Cajero:</span>
                  <span className="font-bold text-slate-800">{selectedSale.cashierName}</span>
                </div>
              </div>

              {/* Items List */}
              <div>
                <div className="font-bold text-slate-700 uppercase tracking-wider mb-2 text-[10px]">
                  Ítems Vendidos ({selectedSale.items.length})
                </div>
                <div className="space-y-1.5 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                  {selectedSale.items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{it.productName}</span>
                        <span className="text-slate-400 font-mono ml-1.5">({it.quantity} x ${it.unitPrice.toFixed(2)})</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900">${it.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-1 pt-2 border-t border-slate-200">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>${selectedSale.subtotal.toFixed(2)}</span>
                </div>
                {selectedSale.discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Descuento aplicado:</span>
                    <span>-${selectedSale.discountTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Impuestos (IVA 21%):</span>
                  <span>${selectedSale.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-slate-900 pt-1 border-t border-slate-200">
                  <span>TOTAL COBRADO:</span>
                  <span>${selectedSale.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Refund Info if refunded */}
              {selectedSale.status === 'ANULADA_DEVUELTA' && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-900 text-xs">
                  <div className="font-bold">⚠️ Venta Anulada</div>
                  <div>Anulada por: <strong>{selectedSale.refundedBy}</strong></div>
                  <div>Fecha: {selectedSale.refundedAt ? new Date(selectedSale.refundedAt).toLocaleString() : 'N/A'}</div>
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <button
                onClick={() => setSelectedSale(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REFUND CONFIRMATION MODAL */}
      {isRefundModalOpen && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <RotateCcw className="w-6 h-6" />
              <h3 className="font-black text-lg text-slate-900">Anular Venta / Devolución</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              ¿Estás seguro de anular la venta <strong className="text-slate-900">{selectedSale.ticketNumber}</strong> por un total de <strong className="text-slate-900">${selectedSale.total.toFixed(2)}</strong>?
              <br /><br />
              <span className="text-emerald-700 font-semibold">✓ El stock de los productos vendidos será reintegrado automáticamente al inventario.</span>
            </p>

            <form onSubmit={handleConfirmRefund} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Motivo de la devolución</label>
                <input
                  type="text"
                  required
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRefundModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl shadow-md"
                >
                  Confirmar Devolución y Reingresar Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
