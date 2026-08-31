import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Printer, Mail, PlusCircle, CheckCircle, X } from 'lucide-react';
import { Sale } from '../types';

interface ReceiptModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  onNewSale: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  isOpen,
  onClose,
  onNewSale,
}) => {
  useEffect(() => {
    if (isOpen && sale) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    }
  }, [isOpen, sale]);

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-emerald-800 text-white p-6 pb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xs font-semibold text-emerald-200 tracking-wider uppercase">¡Venta Exitosa!</span>
              <h3 className="text-lg font-bold">Comprobante de Venta</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thermal Ticket simulation */}
        <div className="p-6 bg-slate-50 font-mono text-xs text-slate-800 space-y-4 border-b border-slate-200">
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
            <div className="font-extrabold text-base tracking-wider text-slate-900">FARO POS • SUCURSAL 1</div>
            <div className="text-[11px] text-slate-500">Av. Central 1234, Ciudad</div>
            <div className="text-[10px] text-slate-400">CUIT: 30-71829384-9 • IVA Responsable Inscripto</div>
          </div>

          <div className="flex justify-between text-[11px] text-slate-600">
            <span>Ticket: <strong className="text-slate-900">{sale.ticketNumber}</strong></span>
            <span>{new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          <div className="text-[11px] text-slate-600">
            <span>Cajero: <strong className="text-slate-900">{sale.cashierName}</strong></span>
          </div>

          {/* Items Table */}
          <div className="pt-2 border-t border-dashed border-slate-300">
            <div className="grid grid-cols-12 font-bold text-[10px] text-slate-500 uppercase pb-1 mb-1 border-b border-slate-200">
              <span className="col-span-6">Producto</span>
              <span className="col-span-2 text-center">Cant</span>
              <span className="col-span-2 text-right">P.U</span>
              <span className="col-span-2 text-right">Total</span>
            </div>

            <div className="space-y-1.5 py-1">
              {sale.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 text-[11px]">
                  <span className="col-span-6 truncate font-sans text-slate-900">{item.productName}</span>
                  <span className="col-span-2 text-center">{item.quantity}</span>
                  <span className="col-span-2 text-right">${item.unitPrice.toFixed(2)}</span>
                  <span className="col-span-2 text-right font-bold">${item.total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="pt-3 border-t border-dashed border-slate-300 space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>${sale.subtotal.toFixed(2)}</span>
            </div>

            {sale.discountTotal > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Descuento aplicado:</span>
                <span>-${sale.discountTotal.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span>
                IVA {sale.subtotal > 0 && sale.tax > 0 ? `(${((sale.tax / Math.max(0.01, sale.subtotal - sale.discountTotal)) * 100).toFixed(1).replace('.0', '')}%)` : '(0%)'}:
              </span>
              <span>${sale.tax.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-300">
              <span>TOTAL:</span>
              <span>${sale.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method Breakdown */}
          <div className="pt-2 border-t border-dashed border-slate-300 text-[11px] text-slate-600 space-y-0.5">
            <div className="flex justify-between">
              <span>Método de Pago:</span>
              <strong className="text-slate-900 uppercase">{sale.paymentMethod}</strong>
            </div>

            {sale.amountReceived && (
              <>
                <div className="flex justify-between">
                  <span>Monto Recibido:</span>
                  <span>${sale.amountReceived.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-800">
                  <span>Vuelto / Cambio:</span>
                  <span>${(sale.changeGiven || 0).toFixed(2)}</span>
                </div>
              </>
            )}
          </div>

          <div className="text-center pt-2 text-[10px] text-slate-400">
            ¡Gracias por su compra! Conserve este ticket.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-white flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handlePrint}
              className="py-2.5 px-3 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-xs text-slate-700 flex items-center justify-center gap-2 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>
            <button
              onClick={() => alert(`Ticket ${sale.ticketNumber} enviado por email al cliente`)}
              className="py-2.5 px-3 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-xs text-slate-700 flex items-center justify-center gap-2 transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span>Enviar Email</span>
            </button>
          </div>

          <button
            onClick={() => {
              onNewSale();
              onClose();
            }}
            className="w-full py-3 bg-slate-950 hover:bg-slate-900 text-white rounded-xl font-extrabold text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>NUEVA VENTA</span>
          </button>
        </div>
      </div>
    </div>
  );
};
