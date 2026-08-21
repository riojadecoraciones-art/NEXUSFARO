import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  ReceiptText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building,
  Zap,
  Droplet,
  Users,
  Wifi,
  FileSpreadsheet,
  Cpu,
  Shield,
  Megaphone,
  Sparkles,
  Edit2,
  Trash2,
  DollarSign,
  Calendar,
  CreditCard,
  ArrowRight,
  TrendingDown,
  Info,
  Check,
  X,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { FixedExpense, ExpenseCategory, ExpenseFrequency, ExpenseStatus, PaymentMethodType } from '../types';

export const ExpensesView: React.FC = () => {
  const {
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    markExpenseAsPaid,
    markExpenseAsPending,
    currentUser,
    activeShift,
    addCashMovement,
    showToast,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('TODAS');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('TODOS');
  
  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [expenseToPay, setExpenseToPay] = useState<FixedExpense | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('TRANSFERENCIA_QR');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [deductFromCashRegister, setDeductFromCashRegister] = useState<boolean>(false);
  const [expenseToDelete, setExpenseToDelete] = useState<FixedExpense | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('ALQUILER');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formFrequency, setFormFrequency] = useState<ExpenseFrequency>('MENSUAL');
  const [formDueDay, setFormDueDay] = useState<number>(10);
  const [formBeneficiary, setFormBeneficiary] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState<ExpenseStatus>('PENDIENTE');

  const CATEGORY_DETAILS: Record<
    ExpenseCategory,
    { label: string; icon: React.ElementType; color: string; bg: string }
  > = {
    ALQUILER: { label: 'Alquiler', icon: Building, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
    LUZ_ELECTRICIDAD: { label: 'Luz / Electricidad', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
    SERVICIOS_AGUA_GAS: { label: 'Agua / Gas / Servicios', icon: Droplet, color: 'text-sky-600', bg: 'bg-sky-50 border-sky-200' },
    SUELDOS_NOMINA: { label: 'Sueldos & Nómina', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
    INTERNET_TELEFONIA: { label: 'Internet & Teléfono', icon: Wifi, color: 'text-cyan-600', bg: 'bg-cyan-50 border-cyan-200' },
    IMPUESTOS_TASAS: { label: 'Impuestos & AFIP', icon: FileSpreadsheet, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
    SOFTWARE_MANTENIMIENTO: { label: 'Software & Sistemas', icon: Cpu, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
    SEGUROS: { label: 'Seguros & ART', icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
    PUBLICIDAD_MARKETING: { label: 'Publicidad & Redes', icon: Megaphone, color: 'text-pink-600', bg: 'bg-pink-50 border-pink-200' },
    LIMPIEZA_INSUMOS: { label: 'Limpieza & Insumos', icon: Sparkles, color: 'text-teal-600', bg: 'bg-teal-50 border-teal-200' },
    OTRO: { label: 'Otros Gastos', icon: ReceiptText, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
  };

  // Metrics
  const totalMonthlyCommitment = useMemo(() => {
    return expenses.reduce((acc, curr) => acc + curr.amount, 0);
  }, [expenses]);

  const totalPaid = useMemo(() => {
    return expenses
      .filter((e) => e.status === 'PAGADO')
      .reduce((acc, curr) => acc + (curr.lastPaidAmount || curr.amount), 0);
  }, [expenses]);

  const totalPending = useMemo(() => {
    return expenses
      .filter((e) => e.status !== 'PAGADO')
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [expenses]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch =
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.beneficiary && e.beneficiary.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.notes && e.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCat =
        selectedCategoryFilter === 'TODAS' || e.category === selectedCategoryFilter;

      const matchesStatus =
        selectedStatusFilter === 'TODOS' || e.status === selectedStatusFilter;

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [expenses, searchTerm, selectedCategoryFilter, selectedStatusFilter]);

  const handleOpenNewModal = () => {
    setEditingExpense(null);
    setFormName('');
    setFormCategory('ALQUILER');
    setFormAmount(0);
    setFormFrequency('MENSUAL');
    setFormDueDay(10);
    setFormBeneficiary('');
    setFormNotes('');
    setFormStatus('PENDIENTE');
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (exp: FixedExpense) => {
    setEditingExpense(exp);
    setFormName(exp.name);
    setFormCategory((exp.category as ExpenseCategory) || 'ALQUILER');
    setFormAmount(exp.amount);
    setFormFrequency(exp.frequency);
    setFormDueDay(exp.dueDay || 10);
    setFormBeneficiary(exp.beneficiary || '');
    setFormNotes(exp.notes || '');
    setFormStatus(exp.status);
    setIsFormModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Por favor ingrese el nombre del gasto', 'warning');
      return;
    }
    if (formAmount <= 0) {
      showToast('El importe debe ser mayor a 0', 'warning');
      return;
    }

    if (editingExpense) {
      updateExpense(editingExpense.id, {
        name: formName.trim(),
        category: formCategory,
        amount: formAmount,
        frequency: formFrequency,
        dueDay: formDueDay,
        beneficiary: formBeneficiary.trim(),
        notes: formNotes.trim(),
        status: formStatus,
      });
    } else {
      addExpense({
        name: formName.trim(),
        category: formCategory,
        amount: formAmount,
        frequency: formFrequency,
        dueDay: formDueDay,
        beneficiary: formBeneficiary.trim(),
        notes: formNotes.trim(),
        status: formStatus,
      });
    }

    setIsFormModalOpen(false);
  };

  const handleOpenPayModal = (exp: FixedExpense) => {
    setExpenseToPay(exp);
    setPaymentAmount(exp.amount);
    setPaymentMethod('TRANSFERENCIA_QR');
    setDeductFromCashRegister(false);
    setIsPayModalOpen(true);
  };

  const handleConfirmPayment = () => {
    if (!expenseToPay) return;

    markExpenseAsPaid(expenseToPay.id, paymentMethod, paymentAmount);

    // If cash register shift is open and user checked option, register withdrawal
    if (deductFromCashRegister && paymentMethod === 'EFECTIVO' && activeShift && activeShift.status === 'ABIERTA') {
      addCashMovement(
        'RETIRO',
        paymentAmount,
        `Pago de Gasto Fijo: ${expenseToPay.name} (${expenseToPay.beneficiary || 'Operativo'})`
      );
    }

    setIsPayModalOpen(false);
    setExpenseToPay(null);
  };

  const handleLoadQuickPresets = () => {
    const presets: Array<Omit<FixedExpense, 'id' | 'createdAt'>> = [
      {
        name: 'Alquiler del Local Comercial',
        category: 'ALQUILER',
        amount: 250000,
        frequency: 'MENSUAL',
        dueDay: 10,
        beneficiary: 'Inmobiliaria / Propietario',
        notes: 'Pago mensual estipulado en contrato de locación.',
        status: 'PENDIENTE',
      },
      {
        name: 'Factura de Luz / Energía Eléctrica',
        category: 'LUZ_ELECTRICIDAD',
        amount: 45000,
        frequency: 'MENSUAL',
        dueDay: 15,
        beneficiary: 'Distribuidora Eléctrica (EDELAR)',
        notes: 'Consumo mensual de salón comercial y vidrieras.',
        status: 'PENDIENTE',
      },
      {
        name: 'Sueldos de Personal & Nómina',
        category: 'SUELDOS_NOMINA',
        amount: 400000,
        frequency: 'MENSUAL',
        dueDay: 5,
        beneficiary: 'Equipo de Ventas y Cajeros',
        notes: 'Liquidación de haberes mensuales.',
        status: 'PENDIENTE',
      },
      {
        name: 'Internet Fibra Óptica 300MB + Telefonía',
        category: 'INTERNET_TELEFONIA',
        amount: 18000,
        frequency: 'MENSUAL',
        dueDay: 12,
        beneficiary: 'Proveedor de Telecomunicaciones',
        notes: 'Conexión para terminales POS, QR y facturación.',
        status: 'PENDIENTE',
      },
      {
        name: 'Monotributo / Impuestos AFIP',
        category: 'IMPUESTOS_TASAS',
        amount: 32000,
        frequency: 'MENSUAL',
        dueDay: 20,
        beneficiary: 'AFIP / Rentas',
        notes: 'Obligaciones tributarias periódicas.',
        status: 'PENDIENTE',
      },
    ];

    presets.forEach((p) => addExpense(p));
    showToast('5 gastos fijos modelo agregados correctamente', 'success');
  };

  return (
    <div className="flex-1 bg-slate-100 flex flex-col overflow-y-auto min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-20 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                <ReceiptText className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Gastos Fijos & Costos del Negocio
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Control exclusivo del Dueño: gestiona alquileres, facturas de luz, sueldos y servicios periódicos.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {expenses.length === 0 && (
              <button
                onClick={handleLoadQuickPresets}
                className="px-4 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-xs"
              >
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Cargar Plantilla de Ejemplo</span>
              </button>
            )}

            <button
              onClick={handleOpenNewModal}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuevo Gasto Fijo</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Monthly Commitments */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Compromiso Total Mensual
              </span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <ReceiptText className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                ${totalMonthlyCommitment.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-medium">
                {expenses.length} gastos fijos configurados
              </div>
            </div>
          </div>

          {/* Paid This Period */}
          <div className="p-5 bg-white rounded-2xl border border-emerald-200/80 shadow-xs flex flex-col justify-between bg-gradient-to-br from-white to-emerald-50/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Total Pagado
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-emerald-700 font-mono tracking-tight">
                ${totalPaid.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-emerald-600 mt-1 font-medium">
                {expenses.filter((e) => e.status === 'PAGADO').length} de {expenses.length} obligaciones al día
              </div>
            </div>
          </div>

          {/* Pending / Due */}
          <div className="p-5 bg-white rounded-2xl border border-amber-200/80 shadow-xs flex flex-col justify-between bg-gradient-to-br from-white to-amber-50/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                Pendiente por Pagar
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-amber-700 font-mono tracking-tight">
                ${totalPending.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-amber-700 mt-1 font-medium">
                {expenses.filter((e) => e.status !== 'PAGADO').length} pagos por liquidar
              </div>
            </div>
          </div>

          {/* Average Daily Expense */}
          <div className="p-5 bg-white rounded-2xl border border-blue-200/80 shadow-xs flex flex-col justify-between bg-gradient-to-br from-white to-blue-50/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                Costo Diario Operativo
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-blue-800 font-mono tracking-tight">
                ${(totalMonthlyCommitment / 30).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-blue-600 mt-1 font-medium">
                Punto de equilibrio diario estimado
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar gasto, beneficiario o nota..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {/* Category Filter */}
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="TODAS">Todas las Categorías</option>
              {Object.entries(CATEGORY_DETAILS).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="PENDIENTE">⏳ Pendientes</option>
              <option value="PAGADO">✅ Pagados</option>
            </select>
          </div>
        </div>

        {/* Expenses List */}
        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <ReceiptText className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">No hay gastos fijos registrados</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Agrega los gastos que tienes como dueño de negocio (ej. alquiler del salón, factura de luz, sueldos del personal, internet o seguros) para llevar un control financiero exacto.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={handleLoadQuickPresets}
                className="px-4 py-2 bg-blue-50 text-blue-700 font-bold rounded-xl text-xs hover:bg-blue-100 transition-colors"
              >
                Cargar Gastos Modelo
              </button>
              <button
                onClick={handleOpenNewModal}
                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition-colors shadow-xs"
              >
                + Crear Gasto Fijo
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExpenses.map((exp) => {
              const catInfo =
                CATEGORY_DETAILS[exp.category as ExpenseCategory] || CATEGORY_DETAILS.OTRO;
              const Icon = catInfo.icon;
              const isPaid = exp.status === 'PAGADO';

              return (
                <div
                  key={exp.id}
                  className={`bg-white rounded-2xl border transition-all p-5 flex flex-col justify-between shadow-xs hover:shadow-md ${
                    isPaid ? 'border-emerald-200/90' : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {/* Top Card Header */}
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${catInfo.bg} ${catInfo.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm leading-tight line-clamp-1">
                            {exp.name}
                          </h3>
                          <span className="text-[11px] font-semibold text-slate-500">
                            {catInfo.label}
                          </span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide shrink-0 ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {isPaid ? 'Pagado' : 'Pendiente'}
                      </span>
                    </div>

                    {/* Amount & Frequency */}
                    <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          Importe
                        </span>
                        <div className="text-xl font-black text-slate-900 font-mono">
                          ${exp.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-600">
                        {exp.frequency}
                      </span>
                    </div>

                    {/* Details: Beneficiary & Due day */}
                    <div className="mt-3 space-y-1 text-xs text-slate-600">
                      {exp.beneficiary && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Beneficiario/Ente:</span>
                          <span className="font-semibold text-slate-800">{exp.beneficiary}</span>
                        </div>
                      )}
                      {exp.dueDay && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Vencimiento:</span>
                          <span className="font-semibold text-slate-800">
                            Día {exp.dueDay} de cada mes
                          </span>
                        </div>
                      )}
                      {exp.notes && (
                        <div className="text-[11px] text-slate-500 italic mt-1 pt-1 border-t border-slate-100 line-clamp-2">
                          "{exp.notes}"
                        </div>
                      )}
                      {isPaid && exp.lastPaidDate && (
                        <div className="text-[10px] text-emerald-700 font-semibold mt-2 pt-1 border-t border-emerald-100 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>
                            Pagado el {new Date(exp.lastPaidDate).toLocaleDateString('es-AR')} • {exp.lastPaidMethod || 'Transferencia'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(exp)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar Gasto"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setExpenseToDelete(exp)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Eliminar Gasto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {isPaid ? (
                      <button
                        onClick={() => markExpenseAsPending(exp.id)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                        <span>Marcar Pendiente</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenPayModal(exp)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-all shadow-xs flex items-center gap-1.5 active:scale-[0.98]"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Registrar Pago</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODAL: ADD / EDIT EXPENSE */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <ReceiptText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {editingExpense ? 'Editar Gasto Fijo' : 'Nuevo Gasto Fijo del Negocio'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Define las obligaciones mensuales para el control del Dueño.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="mt-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del Gasto u Obligación *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Alquiler Local Central, Factura de Luz, Sueldo Cajero..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Category & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Categoría *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-blue-500"
                  >
                    {Object.entries(CATEGORY_DETAILS).map(([key, val]) => (
                      <option key={key} value={key}>
                        {val.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Monto / Importe ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={formAmount || ''}
                    onChange={(e) => setFormAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Frequency & Due Day */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Periodicidad
                  </label>
                  <select
                    value={formFrequency}
                    onChange={(e) => setFormFrequency(e.target.value as ExpenseFrequency)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-blue-500"
                  >
                    <option value="MENSUAL">Mensual (Cada mes)</option>
                    <option value="QUINCENAL">Quincenal (Cada 15 días)</option>
                    <option value="SEMANAL">Semanal</option>
                    <option value="ANUAL">Anual</option>
                    <option value="PAGO_UNICO">Pago Único / Extraordinario</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Día de Vencimiento habitual
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="ej. 10"
                    value={formDueDay || ''}
                    onChange={(e) => setFormDueDay(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Beneficiary & Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Beneficiario / Proveedor / Ente (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="ej. Inmobiliaria Central, EDELAR, AFIP, Empleado..."
                  value={formBeneficiary}
                  onChange={(e) => setFormBeneficiary(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notas u Observaciones
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre número de contrato, medidor, CBU para transferencia..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/20 transition-all active:scale-[0.98]"
                >
                  {editingExpense ? 'Guardar Cambios' : 'Registrar Gasto Fijo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER PAYMENT */}
      {isPayModalOpen && expenseToPay && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Registrar Pago de Gasto</h3>
                  <p className="text-xs text-slate-500">
                    {expenseToPay.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Monto a abonar:</span>
                  <span className="font-mono font-black text-slate-900 text-base">
                    ${expenseToPay.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {expenseToPay.beneficiary && (
                  <div className="flex justify-between items-center text-xs mt-1.5 pt-1.5 border-t border-slate-200/60">
                    <span className="text-slate-500 font-medium">Beneficiario:</span>
                    <span className="font-bold text-slate-800">{expenseToPay.beneficiary}</span>
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Método de Pago Utilizado:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'TRANSFERENCIA_QR', label: 'Transferencia', icon: Wallet },
                    { id: 'EFECTIVO', label: 'Efectivo', icon: DollarSign },
                    { id: 'TARJETA', label: 'Tarjeta / Débito', icon: CreditCard },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as PaymentMethodType)}
                        className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold ring-2 ring-blue-500/20'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[11px]">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Option to deduct from cash register */}
              {paymentMethod === 'EFECTIVO' && activeShift && activeShift.status === 'ABIERTA' && (
                <label className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deductFromCashRegister}
                    onChange={(e) => setDeductFromCashRegister(e.target.checked)}
                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-amber-900 block">
                      Descontar dinero de la Caja Abierta actual
                    </span>
                    <span className="text-[11px] text-amber-700 block mt-0.5">
                      Se creará automáticamente un retiro de caja por ${paymentAmount.toFixed(2)}.
                    </span>
                  </div>
                </label>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-[0.98] flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmar Pago</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE EXPENSE */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-black text-slate-900 text-base mt-3">¿Eliminar Gasto Fijo?</h3>
            <p className="text-xs text-slate-500 mt-1">
              ¿Estás seguro de eliminar <strong>"{expenseToDelete.name}"</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                onClick={() => setExpenseToDelete(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  deleteExpense(expenseToDelete.id);
                  setExpenseToDelete(null);
                }}
                className="px-5 py-2 bg-rose-600 text-white font-bold rounded-xl text-xs hover:bg-rose-700 shadow-xs transition-colors"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
