import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  CircleDollarSign,
  ArrowDownRight,
  ArrowUpRight,
  History,
  Lock,
  Unlock,
  Receipt,
  CreditCard,
  Banknote,
  QrCode,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  User as UserIcon,
  FileText,
} from 'lucide-react';
import { CashShiftModal } from './CashShiftModal';

export const CashRegisterView: React.FC = () => {
  const {
    activeShift,
    shiftsHistory,
    cashMovements,
    currentUser,
    sales,
    showToast,
  } = useApp();

  const [isShiftModalOpen, setIsShiftModalOpen] = useState<boolean>(false);
  const [movementType, setMovementType] = useState<'ENTRADA' | 'RETIRO'>('ENTRADA');
  const [movementAmount, setMovementAmount] = useState<string>('');
  const [movementReason, setMovementReason] = useState<string>('');

  const { addCashMovement } = useApp();

  const isOpen = activeShift && activeShift.status === 'ABIERTA';

  const handleQuickMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(movementAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('Ingresa un monto válido mayor a 0', 'error');
      return;
    }
    if (!movementReason.trim()) {
      showToast('Ingresa el motivo del movimiento', 'error');
      return;
    }

    const success = addCashMovement(movementType, amount, movementReason);
    if (success) {
      setMovementAmount('');
      setMovementReason('');
    }
  };

  return (
    <div className="flex-1 p-6 sm:p-8 bg-[#f8fafc] overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Control y Arqueo de Caja
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Gestión de turnos de caja, ingresos/egresos manuales y auditoría de diferencias.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsShiftModalOpen(true)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-98 ${
              isOpen
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isOpen ? (
              <>
                <Lock className="w-4 h-4" />
                <span>CERRAR TURNO (ARQUEO)</span>
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>ABRIR NUEVO TURNO</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <div
        className={`p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${
          isOpen
            ? 'bg-emerald-950 text-white border-emerald-800/80 shadow-emerald-950/20'
            : 'bg-amber-950 text-white border-amber-800/80 shadow-amber-950/20'
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
              isOpen ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
            }`}
          >
            <CircleDollarSign className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  isOpen ? 'bg-emerald-500/30 text-emerald-200' : 'bg-amber-500/30 text-amber-200'
                }`}
              >
                {isOpen ? 'Turno en Curso' : 'Caja Cerrada'}
              </span>
              {isOpen && (
                <span className="text-xs text-emerald-300 font-medium">
                  Cajero: <strong className="text-white">{activeShift.cashierName}</strong>
                </span>
              )}
            </div>
            <h2 className="text-2xl font-black mt-1">
              {isOpen
                ? `$${activeShift.expectedCash.toFixed(2)} en Efectivo Esperado`
                : 'No hay turno activo en esta terminal'}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {isOpen
                ? `Apertura inicial: $${activeShift.initialCash.toFixed(2)} • Ventas en efectivo: $${activeShift.cashSales.toFixed(2)}`
                : 'Abrí la caja para habilitar transacciones en efectivo y tarjetas en el POS.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsShiftModalOpen(true)}
            className="w-full md:w-auto px-5 py-3 bg-white text-slate-950 hover:bg-slate-100 font-bold rounded-2xl text-xs shadow-md transition-all"
          >
            {isOpen ? 'Ver Detalle del Turno' : 'Iniciar Apertura'}
          </button>
        </div>
      </div>

      {/* Grid: 3 KPI Cards for active shift */}
      {isOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-bold text-slate-400 uppercase">Fondo Inicial</div>
            <div className="text-2xl font-black text-slate-900 mt-2">
              ${activeShift.initialCash.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Monto base declarado al abrir</div>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-bold text-slate-400 uppercase">Ventas por Tarjeta / QR</div>
            <div className="text-2xl font-black text-slate-900 mt-2">
              ${(activeShift.cardSales + activeShift.transferSales).toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Ingresos bancarios directos</div>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-bold text-slate-400 uppercase">Movimientos Manuales</div>
            <div className="text-2xl font-black text-slate-900 mt-2 flex items-center gap-2">
              <span className="text-emerald-600 text-lg">+{activeShift.totalIn.toFixed(2)}</span>
              <span className="text-slate-300 font-light">/</span>
              <span className="text-rose-600 text-lg">-{activeShift.totalOut.toFixed(2)}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Entradas y retiros de caja chica</div>
          </div>
        </div>
      )}

      {/* Two Column Section: Quick Movements & History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Register Cash In/Out */}
        {isOpen && (
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CircleDollarSign className="w-5 h-5 text-indigo-600" />
                <span>Registrar Entrada / Retiro</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Registra extracciones para pagos de proveedores o ingresos de cambio a la caja.
              </p>

              <form onSubmit={handleQuickMovement} className="space-y-4 mt-5">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMovementType('ENTRADA')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                      movementType === 'ENTRADA'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                    <span>Entrada (+)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMovementType('RETIRO')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                      movementType === 'RETIRO'
                        ? 'bg-rose-50 text-rose-800 border-rose-300 ring-2 ring-rose-500/20'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4 text-rose-600" />
                    <span>Retiro (-)</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Monto ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={movementAmount}
                    onChange={(e) => setMovementAmount(e.target.value)}
                    className="w-full px-4 py-2.5 text-lg font-black bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Motivo / Concepto</label>
                  <input
                    type="text"
                    placeholder="Ej: Pago de hielo, cambio de billetes chicos, etc."
                    value={movementReason}
                    onChange={(e) => setMovementReason(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-98"
                >
                  Registrar Movimiento en Caja
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Right Column: Shift History & Audit Table */}
        <div className={`${isOpen ? 'lg:col-span-7' : 'lg:col-span-12'} bg-white rounded-3xl border border-slate-200 shadow-xs p-6`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-slate-600" />
                <span>Historial de Arqueos de Caja</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Registro de turnos finalizados y balance de diferencias.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="pb-3 px-3">Cajero / Fecha</th>
                  <th className="pb-3 px-3">Esperado</th>
                  <th className="pb-3 px-3">Contado</th>
                  <th className="pb-3 px-3 text-right">Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shiftsHistory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-400">
                      No hay historial de turnos o arqueos cerrados aún.
                    </td>
                  </tr>
                ) : (
                  shiftsHistory.map((shift) => (
                    <tr key={shift.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{shift.cashierName}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(shift.openedAt).toLocaleDateString()} • {new Date(shift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-slate-600">
                        ${shift.expectedCash.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        ${(shift.countedCash ?? shift.expectedCash).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black">
                        {(shift.difference ?? 0) === 0 ? (
                          <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                            Exacto ($0.00)
                          </span>
                        ) : (shift.difference ?? 0) < 0 ? (
                          <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full text-[10px]">
                            ${(shift.difference ?? 0).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full text-[10px]">
                            +${(shift.difference ?? 0).toFixed(2)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Global Cash Shift Modal */}
      <CashShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
      />
    </div>
  );
};
