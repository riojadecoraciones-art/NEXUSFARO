import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  Percent,
  Clock,
  AlertTriangle,
  Lock,
  Search,
  Check,
  Tag,
  CreditCard,
  ScanLine,
  Barcode,
  Edit2,
} from 'lucide-react';
import { ProductCategory, Product, Sale } from '../types';
import { ProductImage } from './ProductImage';
import { PaymentModal } from './PaymentModal';
import { ReceiptModal } from './ReceiptModal';
import { ParkedOrdersModal } from './ParkedOrdersModal';
import { CashShiftModal } from './CashShiftModal';
import { formatARS } from '../utils/currency';

export const POSView: React.FC = () => {
  const {
    products,
    categories: appCategories,
    cart,
    addToCart,
    scanBarcodeOrSku,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    taxPercent,
    setTaxPercent,
    orderDiscountPercent,
    setOrderDiscountPercent,
    cartSubtotal,
    cartDiscountAmount,
    cartTax,
    cartTotal,
    activeShift,
    currentUser,
    parkedTickets,
    showToast,
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<string>('Todo');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Modals state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [isParkedModalOpen, setIsParkedModalOpen] = useState<boolean>(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState<boolean>(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  // Discount modal / popover
  const [showDiscountModal, setShowDiscountModal] = useState<boolean>(false);
  const [discountInput, setDiscountInput] = useState<string>('10');

  // Tax rate modal
  const [isTaxModalOpen, setIsTaxModalOpen] = useState<boolean>(false);
  const [taxInput, setTaxInput] = useState<string>(taxPercent.toString());

  useEffect(() => {
    setTaxInput(taxPercent.toString());
  }, [taxPercent]);

  const handleApplyTax = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(taxInput);
    if (isNaN(val) || val < 0 || val > 100) {
      showToast('Ingresa un porcentaje de IVA válido entre 0% y 100%', 'error');
      return;
    }
    setTaxPercent(val);
    setIsTaxModalOpen(false);
    showToast(`Tasa de IVA configurada al ${val}%`, 'success');
  };

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global hardware barcode scanner listener (USB HID Keyboard Emulation)
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if focused on a modal or text input typing normally
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      // Reset buffer if delay between keystrokes is too long (human typing)
      if (timeDiff > 100) {
        barcodeBuffer = '';
      }

      if (e.key === 'Enter') {
        if (barcodeBuffer.length >= 2) {
          e.preventDefault();
          scanBarcodeOrSku(barcodeBuffer);
          barcodeBuffer = '';
        }
        return;
      }

      // Append printable characters to the scanner buffer
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (!isInput || timeDiff < 60) {
          barcodeBuffer += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [scanBarcodeOrSku]);

  const isCajaOpen = activeShift && activeShift.status === 'ABIERTA';
  const canApplyDiscount = currentUser?.role === 'DUEÑO' || currentUser?.canDiscount;

  const categories: string[] = ['Todo', ...appCategories];

  // Filter products by category and search
  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === 'Todo' || product.category === selectedCategory;
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.barcode && product.barcode.includes(searchTerm));
    return matchesCategory && matchesSearch;
  });

  const totalCartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleApplyDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canApplyDiscount) {
      showToast('Tu rol no tiene permiso para aplicar descuentos', 'error');
      return;
    }
    const val = Math.min(100, Math.max(0, parseFloat(discountInput) || 0));
    setOrderDiscountPercent(val);
    setShowDiscountModal(false);
    showToast(val > 0 ? `Descuento de ${val}% aplicado` : 'Descuento eliminado', 'info');
  };

  const handleSaleSuccess = (sale: Sale) => {
    setCompletedSale(sale);
    setIsReceiptModalOpen(true);
  };

  const handleNewSale = () => {
    clearCart();
    setSearchTerm('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  return (
    <div className="flex-1 min-h-0 h-full flex flex-col lg:flex-row overflow-hidden bg-[#f8fafc]">
      
      {/* LEFT / CENTER: Products Catalog */}
      <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden border-r border-slate-200">
        
        {/* Category Pills Bar & Local Search */}
        <div className="p-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xs shrink-0">
          
          {/* Scrollable Categories Bar */}
          <div className="flex items-center gap-2 overflow-x-auto w-full pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-slate-950 text-white shadow-sm'
                      : 'bg-slate-100/90 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Quick inline search with USB scanner autofocus & enter support */}
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (searchTerm.trim()) {
                    const res = scanBarcodeOrSku(searchTerm.trim());
                    if (res.success) {
                      setSearchTerm('');
                    }
                  }
                }
              }}
              placeholder="Buscar en catálogo o disparar láser..."
              className="w-full pl-9 pr-20 py-2 bg-slate-100/90 focus:bg-white text-xs border border-transparent focus:border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 font-medium"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-md">
                <ScanLine className="w-2.5 h-2.5 text-emerald-600" />
                Láser
              </span>
            </div>
          </div>
        </div>

        {/* Product Grid Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {filteredProducts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm">
              <ShoppingBag className="w-12 h-12 text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600">No se encontraron productos</p>
              <p className="text-xs text-slate-400">Intenta con otra categoría o término de búsqueda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.stock <= 0;
                const isLowStock = product.stock > 0 && product.stock <= product.minStock;

                return (
                  <button
                    key={product.id}
                    disabled={isOutOfStock}
                    onClick={() => addToCart(product)}
                    className={`group bg-white rounded-2xl border transition-all text-left flex flex-col overflow-hidden shadow-xs relative ${
                      isOutOfStock
                        ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-400 hover:shadow-md active:scale-[0.98]'
                    }`}
                  >
                    {/* Stock Badge Top Right */}
                    <div className="absolute top-2.5 right-2.5 z-10">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700 border border-red-200 shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          Agotado
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          {product.stock}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {product.stock}
                        </span>
                      )}
                    </div>

                    {/* Image Area with Clean Fallback */}
                    <div className="w-full h-36 bg-slate-50 relative overflow-hidden flex items-center justify-center p-2">
                      <ProductImage
                        src={product.imageUrl}
                        alt={product.name}
                        category={product.category}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    {/* Details */}
                    <div className="p-3.5 flex flex-col justify-between flex-1 bg-white">
                      <div>
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">
                          {product.category}
                        </div>
                        <h3 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-2 leading-tight mt-0.5">
                          {product.name}
                        </h3>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-base sm:text-lg font-black text-slate-900">
                          {formatARS(product.salePrice)}
                        </span>
                        
                        {!isOutOfStock && (
                          <span className="w-7 h-7 rounded-xl bg-slate-100 group-hover:bg-slate-900 group-hover:text-white flex items-center justify-center text-slate-600 transition-colors text-xs font-bold shadow-xs">
                            +
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDEBAR: CART (CARRITO) */}
      <div className="w-full lg:w-96 bg-white flex flex-col h-full border-l border-slate-200 shadow-lg shrink-0">
        
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-slate-900 text-base">
              Carrito ({totalCartItemsCount} {totalCartItemsCount === 1 ? 'producto' : 'productos'})
            </h2>
          </div>

          <div className="flex items-center gap-1">
            {/* Parked Tickets button */}
            <button
              onClick={() => setIsParkedModalOpen(true)}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl relative transition-colors"
              title="Ventas en espera"
            >
              <Clock className="w-4 h-4" />
              {parkedTickets.length > 0 && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {parkedTickets.length}
                </span>
              )}
            </button>

            {/* Clear cart */}
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
                title="Vaciar Carrito"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-100">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-6">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <p className="font-bold text-slate-700 text-sm">El carrito está vacío</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Haz clic en los productos del catálogo o busca por código para comenzar la venta.
              </p>
            </div>
          ) : (
            cart.map((item) => {
              const itemTotal = item.product.salePrice * item.quantity;
              return (
                <div key={item.product.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3 group">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-xs text-slate-900 truncate leading-snug">
                      {item.product.name}
                    </h4>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {formatARS(item.product.salePrice)} / u
                    </div>
                  </div>

                  {/* Qty +/- Controls */}
                  <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1 shrink-0">
                    <button
                      onClick={() => updateCartQuantity(item.product.id, -1)}
                      className="w-6 h-6 rounded-lg bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center text-xs font-bold shadow-xs transition-colors"
                      title={item.quantity === 1 ? 'Eliminar del carrito' : 'Disminuir 1 unidad'}
                    >
                      {item.quantity === 1 ? (
                        <Trash2 className="w-3 h-3 text-rose-500" />
                      ) : (
                        <Minus className="w-3 h-3" />
                      )}
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-slate-900 font-mono">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateCartQuantity(item.product.id, 1)}
                      className="w-6 h-6 rounded-lg bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center text-xs font-bold shadow-xs transition-colors"
                      title="Sumar 1 unidad"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Line Total & Single Item Delete */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right min-w-[52px]">
                      <div className="font-black text-slate-900 text-sm">
                        {formatARS(itemTotal)}
                      </div>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title={`Quitar ${item.product.name} del carrito`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Cart Summary & Checkout */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3 shrink-0">
          
          {/* Subtotal, Tax, Discounts */}
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-medium text-slate-800">{formatARS(cartSubtotal)}</span>
            </div>

            {/* Discount line */}
            <div className="flex justify-between items-center text-emerald-800">
              <button
                onClick={() => canApplyDiscount && setShowDiscountModal(true)}
                disabled={!canApplyDiscount || cart.length === 0}
                className={`flex items-center gap-1 font-semibold hover:underline text-left ${
                  !canApplyDiscount ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                <Tag className="w-3.5 h-3.5 text-emerald-600" />
                <span>Descuento ({orderDiscountPercent}%)</span>
                {!canApplyDiscount && <Lock className="w-3 h-3 text-slate-400" />}
              </button>
              <span className="font-bold">-{formatARS(cartDiscountAmount)}</span>
            </div>

            <div className="flex justify-between items-center text-slate-700">
              <button
                type="button"
                onClick={() => setIsTaxModalOpen(true)}
                className="flex items-center gap-1 font-semibold hover:underline hover:text-blue-600 text-left transition-colors group"
                title="Haga clic para modificar la tasa de IVA"
              >
                <Percent className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
                <span>Impuestos (IVA {taxPercent}%):</span>
                <Edit2 className="w-2.5 h-2.5 text-slate-400 group-hover:text-blue-600" />
              </button>
              <span className="font-medium text-slate-900">{formatARS(cartTax)}</span>
            </div>
          </div>

          {/* Grand Total */}
          <div className="pt-2 border-t border-slate-200/80 flex items-baseline justify-between">
            <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">Total</span>
            <span className="text-3xl font-black text-slate-950 tracking-tight">
              {formatARS(cartTotal)}
            </span>
          </div>

          {/* Warning if Shift Closed */}
          {!isCajaOpen && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block">Caja Cerrada</span>
                <span className="text-[11px] text-amber-800">Abrí la caja para habilitar las ventas.</span>
              </div>
              <button
                onClick={() => setIsCashModalOpen(true)}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] shrink-0"
              >
                Abrir
              </button>
            </div>
          )}

          {/* Big Action Button: COBRAR */}
          <button
            disabled={!isCajaOpen || cart.length === 0}
            onClick={() => setIsPaymentModalOpen(true)}
            className="w-full py-3.5 px-4 bg-slate-950 hover:bg-slate-900 active:scale-[0.99] text-white font-extrabold rounded-2xl text-sm tracking-wider flex items-center justify-center gap-3 shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <span>COBRAR</span>
          </button>
        </div>
      </div>

      {/* MODALS */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={handleSaleSuccess}
      />

      <ReceiptModal
        isOpen={isReceiptModalOpen}
        sale={completedSale}
        onClose={() => setIsReceiptModalOpen(false)}
        onNewSale={handleNewSale}
      />

      <ParkedOrdersModal
        isOpen={isParkedModalOpen}
        onClose={() => setIsParkedModalOpen(false)}
      />

      <CashShiftModal
        isOpen={isCashModalOpen}
        onClose={() => setIsCashModalOpen(false)}
      />

      {/* Discount Selector Dialog */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-xs shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
              <Percent className="w-4 h-4 text-emerald-600" />
              <span>Aplicar Descuento Global</span>
            </h3>

            <div className="flex gap-2 mb-3">
              {[5, 10, 15, 20].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setDiscountInput(pct.toString())}
                  className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700"
                >
                  {pct}%
                </button>
              ))}
            </div>

            <form onSubmit={handleApplyDiscount} className="space-y-3">
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold border border-slate-300 rounded-xl"
                  placeholder="Porcentaje (0-100)"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDiscountModal(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg"
                >
                  Aplicar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Tax / IVA Modifier Dialog */}
      {isTaxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-4">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Modificar Tasa de IVA</h3>
                <p className="text-[11px] text-slate-500">Ajusta el porcentaje impositivo de la venta</p>
              </div>
            </div>

            {/* Presets */}
            <div className="space-y-1.5 mb-4">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Tasas Frecuentes
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '0% (Exento)', val: '0' },
                  { label: '10.5% (Reducido)', val: '10.5' },
                  { label: '21% (General)', val: '21' },
                  { label: '27% (Servicios)', val: '27' },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => setTaxInput(preset.val)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between ${
                      taxInput === preset.val
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{preset.label}</span>
                    {taxInput === preset.val && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleApplyTax} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Porcentaje Personalizado (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    required
                    value={taxInput}
                    onChange={(e) => setTaxInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-base font-bold border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 font-mono text-slate-900"
                    placeholder="21"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">%</span>
                </div>
              </div>

              {/* Real-time Calculation Simulation */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal neto:</span>
                  <span className="font-semibold text-slate-800">${(cartSubtotal - cartDiscountAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-blue-700 font-semibold">
                  <span>IVA estimado ({taxInput || 0}%):</span>
                  <span>
                    ${(((cartSubtotal - cartDiscountAmount) * (parseFloat(taxInput) || 0)) / 100).toFixed(2)}
                  </span>
                </div>
                <div className="pt-1.5 border-t border-slate-200 flex justify-between font-extrabold text-slate-900">
                  <span>Total con IVA:</span>
                  <span>
                    ${(
                      (cartSubtotal - cartDiscountAmount) +
                      ((cartSubtotal - cartDiscountAmount) * (parseFloat(taxInput) || 0)) / 100
                    ).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTaxModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
                >
                  Guardar Tasa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
