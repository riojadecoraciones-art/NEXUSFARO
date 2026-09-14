import React, { useState } from 'react';
import { Product, UNIT_TYPE_LABELS } from '../types';
import { X, Scale, Plus } from 'lucide-react';
import { formatARS } from '../utils/currency';

interface WeighProductModalProps {
  product: Product | null;
  onConfirm: (quantity: number) => void;
  onClose: () => void;
}

/**
 * Se abre al tocar en el POS un producto que se vende por Kg/Gramo/Litro/ml
 * en vez de sumarle 1 unidad a ciegas al carrito (1 kg de almendras sueltas
 * por un clic sería un error caro). Pide la cantidad pesada/medida antes de
 * agregarlo, con el subtotal calculado en el momento para que el cajero
 * confirme el número contra la balanza antes de cerrar.
 */
export const WeighProductModal: React.FC<WeighProductModalProps> = ({ product, onConfirm, onClose }) => {
  const [quantityInput, setQuantityInput] = useState<string>('');

  if (!product) return null;

  const unitLabel = UNIT_TYPE_LABELS[product.unitType];
  const quantity = parseFloat(quantityInput.replace(',', '.'));
  const isValid = Number.isFinite(quantity) && quantity > 0;
  const estimatedTotal = isValid ? quantity * product.salePrice : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onConfirm(quantity);
    setQuantityInput('');
  };

  const handleClose = () => {
    setQuantityInput('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 leading-tight truncate">{product.name}</h2>
              <span className="text-xs text-slate-500 font-medium">
                {formatARS(product.salePrice)} / {unitLabel}
              </span>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Cantidad ({unitLabel})</label>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                step="0.001"
                min="0"
                autoFocus
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
                placeholder="0.000"
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xl font-black text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-mono"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 pointer-events-none">
                {unitLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">Stock disponible: {product.stock} {unitLabel}</p>
          </div>

          {isValid && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800">Subtotal</span>
              <span className="text-lg font-black text-emerald-900">{formatARS(estimatedTotal)}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!isValid}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-2xl text-sm transition-all shadow-md shadow-blue-600/20 active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar al Carrito</span>
          </button>
        </form>
      </div>
    </div>
  );
};
