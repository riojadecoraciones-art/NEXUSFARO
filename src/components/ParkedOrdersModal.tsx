import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Clock, Play, Trash2, X, Plus, AlertCircle, ShoppingBag } from 'lucide-react';

interface ParkedOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ParkedOrdersModal: React.FC<ParkedOrdersModalProps> = ({ isOpen, onClose }) => {
  const {
    parkedTickets,
    parkCurrentTicket,
    resumeParkedTicket,
    deleteParkedTicket,
    cart,
  } = useApp();

  const [customerName, setCustomerName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  const handleParkCurrent = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await parkCurrentTicket(customerName, notes);
    if (success) {
      setCustomerName('');
      setNotes('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Ventas en Espera</h2>
              <span className="text-xs text-slate-500 font-medium">Tickets pausados para reanudar luego</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Option to park current cart if not empty */}
          {cart.length > 0 && (
            <form onSubmit={handleParkCurrent} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>Poner carrito actual en espera ({cart.length} productos)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  placeholder="Nombre / Identificador (ej. Mesa 4)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="px-3 py-2 bg-white text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
                <input
                  type="text"
                  placeholder="Nota (ej. Espera tarjeta)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="px-3 py-2 bg-white text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
              >
                Guardar en Espera y Liberar Carrito
              </button>
            </form>
          )}

          {/* List of currently parked tickets */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tickets en cola ({parkedTickets.length})
            </div>

            {parkedTickets.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs flex flex-col items-center gap-2">
                <ShoppingBag className="w-8 h-8 text-slate-300" />
                <span>No hay ninguna venta en espera en este momento</span>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
                {parkedTickets.map((ticket) => {
                  const totalItemsCount = ticket.items.reduce((sum, i) => sum + i.quantity, 0);
                  const ticketTotal = ticket.items.reduce((sum, i) => sum + (i.product.salePrice * i.quantity), 0);

                  return (
                    <div
                      key={ticket.id}
                      className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <span>{ticket.customerName}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                            {totalItemsCount} u.
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Total: <strong className="text-slate-800">${ticketTotal.toFixed(2)}</strong> • Cajero: {ticket.cashierName}
                        </div>
                        {ticket.notes && (
                          <div className="text-[11px] text-amber-700 mt-1 font-medium italic">
                            Nota: {ticket.notes}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            resumeParkedTicket(ticket.id);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                          title="Reanudar en el Carrito"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Reanudar</span>
                        </button>
                        <button
                          onClick={() => deleteParkedTicket(ticket.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                          title="Eliminar ticket"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 rounded-xl"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
