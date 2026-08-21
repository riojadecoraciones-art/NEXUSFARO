import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Settings as SettingsIcon,
  Store,
  Users,
  Printer,
  RotateCcw,
  ShieldCheck,
  Plus,
  Lock,
  Volume2,
  CheckCircle2,
  Percent,
  Building2,
  Wrench,
  ReceiptText,
  Save,
  Mail,
  Phone,
} from 'lucide-react';
import { User, UserRole } from '../types';

export const SettingsView: React.FC = () => {
  const {
    users,
    currentUser,
    showToast,
    taxPercent,
    setTaxPercent,
    resetToSeedData,
    addUser,
    storeInfo,
    updateStoreInfo,
    setIsSupportModalOpen,
    setActiveView,
  } = useApp();

  const isOwner = currentUser?.role === 'DUEÑO';

  // Store Settings state connected to storeInfo
  const [storeName, setStoreName] = useState<string>(storeInfo.storeName);
  const [branchName, setBranchName] = useState<string>(storeInfo.branchName);
  const [brandSubtitle, setBrandSubtitle] = useState<string>(storeInfo.brandSubtitle || '');
  const [cuit, setCuit] = useState<string>(storeInfo.cuit);
  const [address, setAddress] = useState<string>(storeInfo.address);
  const [phone, setPhone] = useState<string>(storeInfo.phone || '');
  const [email, setEmail] = useState<string>(storeInfo.email || '');
  const [receiptFooter, setReceiptFooter] = useState<string>(storeInfo.receiptFooter || '');
  const [storeTaxPercent, setStoreTaxPercent] = useState<string>(taxPercent.toString());

  useEffect(() => {
    setStoreName(storeInfo.storeName);
    setBranchName(storeInfo.branchName);
    setBrandSubtitle(storeInfo.brandSubtitle || '');
    setCuit(storeInfo.cuit);
    setAddress(storeInfo.address);
    setPhone(storeInfo.phone || '');
    setEmail(storeInfo.email || '');
    setReceiptFooter(storeInfo.receiptFooter || '');
  }, [storeInfo]);

  // Hardware toggles
  const [autoPrint, setAutoPrint] = useState<boolean>(true);
  const [soundFx, setSoundFx] = useState<boolean>(true);
  const [openDrawerOnCash, setOpenDrawerOnCash] = useState<boolean>(true);

  // New cashier modal/form state
  const [isAddUserOpen, setIsAddUserOpen] = useState<boolean>(false);
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserPin, setNewUserPin] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('CAJERO');
  const [newUserDiscount, setNewUserDiscount] = useState<boolean>(false);
  const [newUserRefund, setNewUserRefund] = useState<boolean>(false);

  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(storeTaxPercent);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      setTaxPercent(val);
    }
    
    updateStoreInfo({
      storeName: storeName.trim() || 'FARO POS',
      branchName: branchName.trim() || 'Sucursal Principal',
      brandSubtitle: brandSubtitle.trim(),
      cuit: cuit.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim(),
      receiptFooter: receiptFooter.trim(),
    });

    showToast('Configuración del comercio y sucursal guardadas con éxito', 'success');
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || newUserPin.length !== 4) {
      showToast('Ingresa un nombre y PIN de 4 dígitos', 'error');
      return;
    }

    addUser({
      name: newUserName,
      email: newUserEmail || undefined,
      role: newUserRole,
      roleTitle: newUserRole === 'DUEÑO' ? 'Dueño / Administrador' : 'Cajero',
      pin: newUserPin,
      canDiscount: newUserRole === 'DUEÑO' ? true : newUserDiscount,
      canRefund: newUserRole === 'DUEÑO' ? true : newUserRefund,
      canManageInventory: newUserRole === 'DUEÑO',
    });

    setIsAddUserOpen(false);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPin('');
  };

  const handleResetData = () => {
    if (window.confirm('¿Desea limpiar y reiniciar el sistema a su estado inicial vacío?')) {
      resetToSeedData();
    }
  };

  return (
    <div className="flex-1 p-6 sm:p-8 bg-[#f8fafc] overflow-y-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Configuración del Sistema
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Personalización de sucursal, datos comerciales, gastos fijos y soporte técnico.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Master Support Mode Trigger Button */}
          <button
            onClick={() => setIsSupportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl shadow-xs transition-colors"
          >
            <Wrench className="w-4 h-4" />
            <span>Portal Maestro de Soporte</span>
          </button>

          <button
            onClick={handleResetData}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Limpiar Datos Demo</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Business & Branch Details */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Store Info & Branch Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-base text-slate-900">
                  Personalización de Sucursal y Comercio
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                Personalizable por Cliente
              </span>
            </div>

            <form onSubmit={handleSaveStore} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nombre Comercial (Fantasía) *</label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="ej. Rioja Decoraciones, Supermarket..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-blue-500 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nombre de la Sucursal (Personalizable) *
                  </label>
                  <input
                    type="text"
                    required
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="ej. Sucursal Principal, Casa Central, Salón Centro..."
                    className="w-full px-3 py-2 border border-blue-300 bg-blue-50/40 rounded-xl text-xs focus:outline-none focus:border-blue-600 font-bold text-blue-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Subtítulo / Rubro</label>
                  <input
                    type="text"
                    value={brandSubtitle}
                    onChange={(e) => setBrandSubtitle(e.target.value)}
                    placeholder="ej. Decoración & Hogar, Indumentaria..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">CUIT / Identificación Fiscal</label>
                  <input
                    type="text"
                    value={cuit}
                    onChange={(e) => setCuit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Dirección de la Sucursal</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="ej. +54 380 442-1234"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pie de Ticket Térmico</label>
                  <input
                    type="text"
                    value={receiptFooter}
                    onChange={(e) => setReceiptFooter(e.target.value)}
                    placeholder="¡Gracias por su compra!"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tasa de IVA Predeterminada (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={storeTaxPercent}
                      onChange={(e) => setStoreTaxPercent(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold font-mono focus:outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 text-right">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 ml-auto"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Datos de Sucursal</span>
                </button>
              </div>
            </form>
          </div>

          {/* Quick Shortcuts: Gastos Fijos & Negocio */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-6 rounded-2xl border border-blue-800 shadow-xs flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ReceiptText className="w-5 h-5 text-blue-300" />
                <h3 className="font-black text-base">Gastos Fijos & Costos del Negocio</h3>
              </div>
              <p className="text-xs text-blue-200/90 mt-1 max-w-md">
                Controla alquileres, facturas de luz, sueldos de empleados y obligaciones periódicas del dueño.
              </p>
            </div>
            <button
              onClick={() => setActiveView('expenses')}
              className="px-4 py-2 bg-white text-blue-950 hover:bg-blue-50 font-black text-xs rounded-xl transition-all shrink-0 shadow-md"
            >
              Ir a Gastos Fijos
            </button>
          </div>

          {/* Hardware & Peripherals */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <Printer className="w-5 h-5 text-slate-700" />
              <h3 className="font-extrabold text-base text-slate-900">Periféricos e Impresión</h3>
            </div>

            <div className="space-y-3 text-xs">
              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-900 block">Impresión Automática de Ticket</span>
                  <span className="text-slate-500 text-[11px]">Abre el diálogo de impresión al confirmar cada venta</span>
                </div>
                <input
                  type="checkbox"
                  checked={autoPrint}
                  onChange={(e) => setAutoPrint(e.target.checked)}
                  className="w-4 h-4 rounded text-slate-900"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-900 block">Apertura Automática de Gaveta (Cajón de Dinero)</span>
                  <span className="text-slate-500 text-[11px]">Envía pulso RJ11 al cobrar en efectivo</span>
                </div>
                <input
                  type="checkbox"
                  checked={openDrawerOnCash}
                  onChange={(e) => setOpenDrawerOnCash(e.target.checked)}
                  className="w-4 h-4 rounded text-slate-900"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-900 block">Efectos de Sonido POS</span>
                  <span className="text-slate-500 text-[11px]">Sonido de confirmación al escanear y cobrar</span>
                </div>
                <input
                  type="checkbox"
                  checked={soundFx}
                  onChange={(e) => setSoundFx(e.target.checked)}
                  className="w-4 h-4 rounded text-slate-900"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Users & Role Permissions */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-base text-slate-900">Usuarios y Permisos</h3>
              </div>

              {isOwner && (
                <button
                  onClick={() => setIsAddUserOpen(true)}
                  className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuevo Cajero</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    {u.avatarUrl && u.avatarUrl.trim() !== '' ? (
                      <img
                        src={u.avatarUrl}
                        alt={u.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover border border-slate-300"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                        {u.initials || 'U'}
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{u.name}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            u.role === 'DUEÑO'
                              ? 'bg-slate-900 text-white'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {u.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {u.email || u.roleTitle || 'PIN Protegido'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 text-[10px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Descuentos: {u.canDiscount ? 'Habilitado' : 'Bloqueado'}
                    </span>
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Anulaciones: {u.canRefund ? 'Habilitado' : 'Bloqueado'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: CREAR CAJERO */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <h3 className="font-extrabold text-base text-slate-900 mb-4">Agregar Nuevo Cajero / Usuario</h3>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Ej. Lucas García"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">PIN de Acceso (4 dígitos)</label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={newUserPin}
                    onChange={(e) => setNewUserPin(e.target.value)}
                    placeholder="4444"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-center font-bold tracking-widest text-base focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Rol en el Sistema</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none"
                  >
                    <option value="CAJERO">CAJERO</option>
                    <option value="DUEÑO">DUEÑO</option>
                  </select>
                </div>
              </div>

              {newUserRole === 'CAJERO' && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-700 text-[11px] uppercase">Permisos de Cajero</div>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newUserDiscount}
                      onChange={(e) => setNewUserDiscount(e.target.checked)}
                      className="rounded text-slate-900"
                    />
                    <span>Permitir aplicar descuentos en el POS</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newUserRefund}
                      onChange={(e) => setNewUserRefund(e.target.checked)}
                      className="rounded text-slate-900"
                    />
                    <span>Permitir anular ventas y devoluciones</span>
                  </label>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 border border-slate-200 font-bold text-slate-600 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-950 text-white font-bold rounded-xl shadow-xs"
                >
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

