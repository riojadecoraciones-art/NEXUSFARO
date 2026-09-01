import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Banknote,
  CreditCard,
  QrCode,
  Layers,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { PaymentMethodType, PaymentDetail, Sale } from '../types';
import { formatARS } from '../utils/currency';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (sale: Sale) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { cartTotal, confirmSale, currentUser, showToast } = useApp();

  const [method, setMethod] = useState<PaymentMethodType>('EFECTIVO');
  const [cashReceived, setCashReceived] = useState<string>(cartTotal.toFixed(2));
  
  // Mixed payment states
  const [splitCash, setSplitCash] = useState<string>('0');
  const [splitCard, setSplitCard] = useState<string>('0');
  const [splitQR, setSplitQR] = useState<string>('0');

  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync cashReceived when total changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCashReceived(cartTotal.toFixed(2));
      setSplitCash((cartTotal / 2).toFixed(2));
      setSplitCard((cartTotal / 2).toFixed(2));
      setSplitQR('0');
      setNotes('');
    }
  }, [isOpen, cartTotal]);

  if (!isOpen) return null;

  const cashNum = parseFloat(cashReceived) || 0;
  const changeDue = Math.max(0, cashNum - cartTotal);
  const isCashSufficient = cashNum >= cartTotal;

  // Split calculation
  const mixedSum = (parseFloat(splitCash) || 0) + (parseFloat(splitCard) || 0) + (parseFloat(splitQR) || 0);
  const mixedDiff = Math.abs(mixedSum - cartTotal);
  const isMixedValid = mixedDiff < 0.01;

  const handleQuickCash = (amount: number) => {
    setCashReceived(amount.toFixed(2));
  };

  // Helper for generating smart Argentine Peso bill suggestions
  const getARSSuggestions = (total: number) => {
    const suggestions: number[] = [];
    const denominations = [1000, 2000, 5000, 10000, 20000, 50000, 100000];
    
    // Suggest next rounded multiples
    denominations.forEach((denom) => {
      if (denom > total) {
        suggestions.push(denom);
      } else {
        const ceilMultiple = Math.ceil(total / denom) * denom;
        if (ceilMultiple > total && !suggestions.includes(ceilMultiple)) {
          suggestions.push(ceilMultiple);
        }
      }
    });

    return Array.from(new Set(suggestions)).sort((a, b) => a - b).slice(0, 5);
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);

    let breakdown: PaymentDetail[] = [];

    if (method === 'EFECTIVO') {
      if (!isCashSufficient) {
        showToast('El monto recibido en efectivo es insuficiente', 'error');
        setIsSubmitting(false);
        return;
      }
      breakdown = [{ method: 'EFECTIVO', amount: cartTotal }];
    } else if (method === 'TARJETA') {
      breakdown = [{ method: 'TARJETA', amount: cartTotal }];
    } else if (method === 'TRANSFERENCIA_QR') {
      breakdown = [{ method: 'TRANSFERENCIA_QR', amount: cartTotal }];
    } else if (method === 'MIXTO') {
      if (!isMixedValid) {
        showToast(`La suma de los métodos (${formatARS(mixedSum)}) debe ser igual al total (${formatARS(cartTotal)})`, 'error');
        setIsSubmitting(false);
        return;
      }
      if (parseFloat(splitCash) > 0) breakdown.push({ method: 'EFECTIVO', amount: parseFloat(splitCash) });
      if (parseFloat(splitCard) > 0) breakdown.push({ method: 'TARJETA', amount: parseFloat(splitCard) });
      if (parseFloat(splitQR) > 0) breakdown.push({ method: 'TRANSFERENCIA_QR', amount: parseFloat(splitQR) });
    }

    const sale = await confirmSale({
      method,
      breakdown,
      amountReceived: method === 'EFECTIVO' ? cashNum : undefined,
      notes,
    });

    setIsSubmitting(false);
    if (sale) {
      onSuccess(sale);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">Cobro en Caja</span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Total a Cobrar: <span className="text-emerald-700">{formatARS(cartTotal)}</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Payment Method Selector */}
        <div className="p-6 space-y-6">
          <div>
            <label className="text-xs font-bold tracking-wider text-slate-500 uppercase block mb-2.5">
              Método de Pago
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => setMethod('EFECTIVO')}
                className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl border-2 font-bold text-xs transition-all ${
                  method === 'EFECTIVO'
                    ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                    : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-white hover:border-slate-300'
                }`}
              >
                <Banknote className="w-5 h-5" />
                <span>Efectivo</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('TARJETA')}
                className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl border-2 font-bold text-xs transition-all ${
                  method === 'TARJETA'
                    ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                    : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-white hover:border-slate-300'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span>Tarjeta</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('TRANSFERENCIA_QR')}
                className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl border-2 font-bold text-xs transition-all ${
                  method === 'TRANSFERENCIA_QR'
                    ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                    : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-white hover:border-slate-300'
                }`}
              >
                <QrCode className="w-5 h-5" />
                <span>QR / Transf.</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('MIXTO')}
                className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl border-2 font-bold text-xs transition-all ${
                  method === 'MIXTO'
                    ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                    : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-white hover:border-slate-300'
                }`}
              >
                <Layers className="w-5 h-5" />
                <span>Mixto</span>
              </button>
            </div>
          </div>

          {/* METHOD: EFECTIVO */}
          {method === 'EFECTIVO' && (
            <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Monto Recibido del Cliente (ARS)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">$</span>
                  <input
                    type="number"
                    step="1"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 bg-white border border-slate-300 focus:border-slate-900 rounded-xl text-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>
              </div>

              {/* Quick Cash Buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleQuickCash(cartTotal)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 rounded-lg shadow-xs"
                >
                  Exacto ({formatARS(cartTotal)})
                </button>
                {getARSSuggestions(cartTotal).map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleQuickCash(amt)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 rounded-lg shadow-xs"
                  >
                    {formatARS(amt)}
                  </button>
                ))}
              </div>

              {/* Live Change (Vuelto) calculation */}
              <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500">Vuelto / Cambio a entregar:</div>
                  <div className={`text-2xl font-black ${isCashSufficient ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {formatARS(changeDue)}
                  </div>
                </div>

                {!isCashSufficient && (
                  <div className="text-xs font-bold text-rose-600 flex items-center gap-1.5 bg-rose-50 px-3 py-2 rounded-xl border border-rose-200">
                    <AlertCircle className="w-4 h-4" />
                    <span>Faltan {formatARS(cartTotal - cashNum)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* METHOD: TARJETA */}
          {method === 'TARJETA' && (
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 mx-auto flex items-center justify-center shadow-inner">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">Terminal de Pago Listo</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Acerque o inserte la tarjeta en el dispositivo POS por el monto de <strong className="text-slate-800">{formatARS(cartTotal)}</strong>.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Conexión con POS: OK
              </div>
            </div>
          )}

          {/* METHOD: TRANSFERENCIA / QR */}
          {method === 'TRANSFERENCIA_QR' && (
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-5">
              <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm shrink-0">
                {/* Clean CSS/SVG QR code placeholder representation */}
                <div className="w-28 h-28 bg-slate-900 p-2 rounded-lg flex flex-col justify-between">
                  <div className="flex justify-between">
                    <div className="w-6 h-6 bg-white rounded-xs p-1"><div className="w-full h-full bg-slate-900"></div></div>
                    <div className="w-6 h-6 bg-white rounded-xs p-1"><div className="w-full h-full bg-slate-900"></div></div>
                  </div>
                  <div className="flex justify-center text-white text-[9px] font-mono font-bold tracking-widest">
                    PAGAR
                  </div>
                  <div className="flex justify-between">
                    <div className="w-6 h-6 bg-white rounded-xs p-1"><div className="w-full h-full bg-slate-900"></div></div>
                    <div className="w-6 h-6 bg-white rounded-xs"></div>
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-center sm:text-left">
                <div className="text-xs font-bold text-slate-500 uppercase">Código QR Interoperable</div>
                <div className="font-extrabold text-slate-900 text-lg">Escanear para pagar {formatARS(cartTotal)}</div>
                <p className="text-xs text-slate-600">
                  Compatible con Mercado Pago, MODO, Cuenta DNI, BNA+ o cualquier billetera virtual.
                </p>
                <div className="text-xs font-mono font-bold text-slate-700 pt-1">
                  Alias: <span className="bg-slate-200 px-1.5 py-0.5 rounded">FARO.POS.PAGO</span>
                </div>
              </div>
            </div>
          )}

          {/* METHOD: MIXTO */}
          {method === 'MIXTO' && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-600 mb-2">Dividir total ({formatARS(cartTotal)}) entre métodos:</div>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Efectivo ($)</label>
                  <input
                    type="number"
                    step="1"
                    value={splitCash}
                    onChange={(e) => setSplitCash(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Tarjeta ($)</label>
                  <input
                    type="number"
                    step="1"
                    value={splitCard}
                    onChange={(e) => setSplitCard(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">QR / Transf. ($)</label>
                  <input
                    type="number"
                    step="1"
                    value={splitQR}
                    onChange={(e) => setSplitQR(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-200 text-xs">
                <span className="font-semibold text-slate-500">Suma ingresada: {formatARS(mixedSum)}</span>
                <span className={`font-bold ${isMixedValid ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {isMixedValid ? '✓ Cubre el total exacto' : `Diferencia: ${formatARS(cartTotal - mixedSum)}`}
                </span>
              </div>
            </div>
          )}

          {/* Optional Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Nota / Referencia de la venta (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Factura B, Mesa 2, Cliente habitual..."
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 focus:border-slate-400 rounded-xl focus:outline-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 pt-0 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={
              (method === 'EFECTIVO' && !isCashSufficient) ||
              (method === 'MIXTO' && !isMixedValid) ||
              isSubmitting
            }
            className="px-7 py-3 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-sm tracking-wide shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all active:scale-98"
          >
            <span>CONFIRMAR COBRO</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
