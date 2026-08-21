import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  CircleDollarSign,
  ArrowDownRight,
  ArrowUpRight,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  X,
  History,
  Calculator,
} from 'lucide-react';

interface CashShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CashShiftModal: React.FC<CashShiftModalProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    activeShift,
    openCashShift,
    closeCashShift,
    addCashMovement,
    cashMovements,
    shiftsHistory,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'status' | 'movement' | 'close' | 'history'>('status');

  // Open Shift Form state
  const [initialCashInput, setInitialCashInput] = useState<string>('100.00');
  const [openNotes, setOpenNotes] = useState<string>('');

  // Movement Form state
  const [movementType, setMovementType] = useState<'ENTRADA' | 'RETIRO'>('RETIRO');
  const [movementAmount, setMovementAmount] = useState<string>('');
  const [movementReason, setMovementReason] = useState<string>('');

  // Close Shift Form state
  const [countedCashInput, setCountedCashInput] = useState<string>('');
  const [closeNotes, setCloseNotes] = useState<string>('');

  if (!isOpen) return null;

  const isShiftOpen = activeShift && activeShift.status === 'ABIERTA';

  const handleOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(initialCashInput);
    if (isNaN(amount) || amount < 0) {
      showToast('Ingresa un monto válido para el fondo inicial', 'error');
      return;
    }
    const success = openCashShift(amount, openNotes);
    if (success) {
      setActiveTab('status');
      onClose();
    }
  };

  const handleAddMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(movementAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('Ingresa un monto mayor a 0', 'error');
      return;
    }
    if (!movementReason.trim()) {
      showToast('El motivo es obligatorio', 'error');
      return;
    }

    const success = addCashMovement(movementType, amount, movementReason);
    if (success) {
      setMovementAmount('');
      setMovementReason('');
      setActiveTab('status');
    }
  };

  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    const counted = parseFloat(countedCashInput);
    if (isNaN(counted) || counted < 0) {
      showToast('Ingresa el conteo físico de efectivo', 'error');
      return;
    }

    const success = closeCashShift(counted, closeNotes);
    if (success) {
      setCountedCashInput('');
      setCloseNotes('');
      onClose();
    }
  };

  // Close shift difference calculation
  const countedNum = parseFloat(countedCashInput) || 0;
  const expectedNum = activeShift ? activeShift.expectedCash : 0;
  const difference = countedNum - expectedNum;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                isShiftOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              <CircleDollarSign className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Control y Arqueo de Caja</h2>
              <div className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isShiftOpen ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                <span>
                  Estado: <strong>{isShiftOpen ? 'TURNO ABIERTO' : 'CAJA CERRADA'}</strong>
                </span>
                {isShiftOpen && (
                  <span>• Cajero: <strong>{activeShift.cashierName}</strong></span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation if Open */}
        {isShiftOpen ? (
          <div className="flex border-b border-slate-200 px-6 bg-slate-50/50">
            <button
              onClick={() => setActiveTab('status')}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
                activeTab === 'status'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Resumen en Vivo
            </button>
            <button
              onClick={() => setActiveTab('movement')}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
                activeTab === 'movement'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Registrar Movimiento
            </button>
            <button
              onClick={() => setActiveTab('close')}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
                activeTab === 'close'
                  ? 'border-rose-600 text-rose-700'
                  : 'border-transparent text-slate-500 hover:text-rose-600'
              }`}
            >
              Cierre y Arqueo
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
                activeTab === 'history'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Historial de Cierres
            </button>
          </div>
        ) : (
          <div className="px-6 pt-4">
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900">
                <p className="font-bold">La caja se encuentra cerrada.</p>
                <p className="mt-0.5 text-amber-800">
                  Para habilitar el cobro de ventas en el POS, debes ingresar el fondo inicial y realizar la apertura de turno.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6">
          {/* VIEW: OPEN SHIFT (WHEN CLOSED) */}
          {!isShiftOpen && (
            <form onSubmit={handleOpenShift} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Fondo Inicial de Caja (Efectivo disponible para vuelto)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={initialCashInput}
                    onChange={(e) => setInitialCashInput(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Notas de apertura (opcional)
                </label>
                <input
                  type="text"
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  placeholder="Ej. Billetes chicos de $10 y $20 en gaveta"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-md flex items-center gap-2"
                >
                  <Unlock className="w-4 h-4" />
                  <span>ABRIR CAJA Y HABILITAR POS</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 1: RESUMEN EN VIVO (WHEN OPEN) */}
          {isShiftOpen && activeTab === 'status' && (
            <div className="space-y-6">
              {/* Highlighted Expected Cash Box */}
              <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl shadow-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                    Efectivo Esperado en Gaveta
                  </span>
                  <div className="text-3xl font-black tracking-tight mt-1">
                    ${activeShift.expectedCash.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">
                    Fondo ($ {activeShift.initialCash.toFixed(2)}) + Ventas ($ {activeShift.cashSales.toFixed(2)}) + Entradas ($ {activeShift.totalIn.toFixed(2)}) - Retiros ($ {activeShift.totalOut.toFixed(2)})
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('close')}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shrink-0 flex items-center gap-1.5"
                >
                  <Lock className="w-4 h-4" />
                  <span>Cerrar Caja</span>
                </button>
              </div>

              {/* Grid of details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-semibold">Fondo Inicial</div>
                  <div className="text-lg font-bold text-slate-800">${activeShift.initialCash.toFixed(2)}</div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-semibold">Ventas Efectivo</div>
                  <div className="text-lg font-bold text-emerald-700">+${activeShift.cashSales.toFixed(2)}</div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-semibold">Ventas Tarjeta</div>
                  <div className="text-lg font-bold text-blue-700">${activeShift.cardSales.toFixed(2)}</div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-semibold">Ventas QR/Transf.</div>
                  <div className="text-lg font-bold text-purple-700">${activeShift.transferSales.toFixed(2)}</div>
                </div>
              </div>

              {/* Movements Summary */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-[11px] text-slate-500 font-semibold block">Entradas / Ingresos</span>
                    <span className="text-sm font-bold text-emerald-700">+${activeShift.totalIn.toFixed(2)}</span>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div>
                    <span className="text-[11px] text-slate-500 font-semibold block">Retiros / Gastos</span>
                    <span className="text-sm font-bold text-rose-700">-${activeShift.totalOut.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('movement')}
                  className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 px-3 py-1.5 rounded-xl transition-colors"
                >
                  + Registrar Movimiento
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: REGISTRAR MOVIMIENTO (WHEN OPEN) */}
          {isShiftOpen && activeTab === 'movement' && (
            <form onSubmit={handleAddMovement} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMovementType('RETIRO')}
                  className={`p-3.5 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    movementType === 'RETIRO'
                      ? 'border-rose-600 bg-rose-50 text-rose-800'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4 text-rose-600" />
                  <span>Retiro / Salida (Gasto)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMovementType('ENTRADA')}
                  className={`p-3.5 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    movementType === 'ENTRADA'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                  <span>Entrada / Ingreso Efectivo</span>
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Monto ($)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={movementAmount}
                    onChange={(e) => setMovementAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-bold text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Motivo Obligatorio (ej. Pago a Proveedor Panadería, Compra de Artículos de Limpieza)
                </label>
                <input
                  type="text"
                  required
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  placeholder="Detalla el motivo del movimiento..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('status')}
                  className="px-4 py-2.5 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  Guardar Movimiento
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: CIERRE Y ARQUEO (WHEN OPEN) */}
          {isShiftOpen && activeTab === 'close' && (
            <form onSubmit={handleCloseShift} className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 block">Efectivo Teórico Esperado:</span>
                  <span className="text-2xl font-black text-slate-900">${activeShift.expectedCash.toFixed(2)}</span>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div>Ventas Totales: <strong>${(activeShift.cashSales + activeShift.cardSales + activeShift.transferSales).toFixed(2)}</strong></div>
                  <div>Apertura: {new Date(activeShift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Conteo Físico Real de Efectivo (Ingresa lo que hay en la gaveta)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={countedCashInput}
                    onChange={(e) => setCountedCashInput(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 bg-white border-2 border-slate-900 rounded-xl text-xl font-black text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Dynamic Difference Display */}
              {countedCashInput !== '' && (
                <div
                  className={`p-4 rounded-2xl border flex items-center justify-between ${
                    Math.abs(difference) < 0.01
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : difference > 0
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {Math.abs(difference) < 0.01 ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-600" />
                    )}
                    <div>
                      <div className="font-bold text-xs">
                        {Math.abs(difference) < 0.01
                          ? 'Arqueo Perfecto (Sin diferencias)'
                          : difference > 0
                          ? `Sobrante de Caja: +$${difference.toFixed(2)}`
                          : `Faltante de Caja: -$${Math.abs(difference).toFixed(2)}`}
                      </div>
                      <div className="text-[11px] opacity-80">
                        Esperado: ${expectedNum.toFixed(2)} | Contado: ${countedNum.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Observaciones de Cierre (opcional)
                </label>
                <input
                  type="text"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="Ej. Faltaron monedas de 50 centavos..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('status')}
                  className="px-4 py-2.5 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg flex items-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>CONFIRMAR CIERRE DE CAJA</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: HISTORIAL DE CIERRES */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Cierres Anteriores Registrados ({shiftsHistory.length})
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
                {shiftsHistory.map((shift) => (
                  <div
                    key={shift.id}
                    className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5"
                  >
                    <div className="flex justify-between items-center font-bold text-slate-900">
                      <span>Cajero: {shift.cashierName}</span>
                      <span className="text-[11px] text-slate-500 font-normal">
                        {new Date(shift.openedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-200/80">
                      <div>Esperado: <strong>${shift.expectedCash.toFixed(2)}</strong></div>
                      <div>Contado: <strong>${(shift.countedCash || 0).toFixed(2)}</strong></div>
                      <div>
                        Diferencia:{' '}
                        <strong
                          className={
                            (shift.difference || 0) < 0
                              ? 'text-rose-600 font-bold'
                              : (shift.difference || 0) > 0
                              ? 'text-emerald-700 font-bold'
                              : 'text-slate-800'
                          }
                        >
                          {(shift.difference || 0) >= 0 ? '+' : ''}
                          ${(shift.difference || 0).toFixed(2)}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
