import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  Wrench,
  X,
  Database,
  Download,
  Upload,
  ShieldCheck,
  RefreshCw,
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  LogOut,
  Sparkles,
  Layers,
  ShoppingBag,
  CircleDollarSign,
  ReceiptText,
  KeyRound,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Send,
} from 'lucide-react';

export const SupportModal: React.FC = () => {
  const {
    isSupportModalOpen,
    setIsSupportModalOpen,
    isSupportMode,
    deactivateSupportMode,
    storeInfo,
    updateStoreInfo,
    masterAuth,
    updateMasterCredentials,
    sendMasterVerificationCode,
    users,
    currentUser,
    switchUserDirect,
    products,
    sales,
    shiftsHistory,
    expenses,
    stockMovements,
    exportSystemBackup,
    importSystemBackup,
    repairSystemDatabase,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'diagnosis' | 'backup' | 'store' | 'users' | 'security'>('diagnosis');
  const [diagnosticResults, setDiagnosticResults] = useState<{ fixedIssues: number; details: string[] } | null>(null);
  const [isRunningDiagnosis, setIsRunningDiagnosis] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editable store info local state
  const [editStoreName, setEditStoreName] = useState(storeInfo.storeName);
  const [editBranchName, setEditBranchName] = useState(storeInfo.branchName);
  const [editSubtitle, setEditSubtitle] = useState(storeInfo.brandSubtitle);
  const [editPhone, setEditPhone] = useState(storeInfo.phone);
  const [editAddress, setEditAddress] = useState(storeInfo.address);
  const [editCuit, setEditCuit] = useState(storeInfo.cuit);

  // Master Security tab local state
  const [newMasterEmail, setNewMasterEmail] = useState(masterAuth.email || 'riojadecoraciones@gmail.com');
  const [newMasterPass, setNewMasterPass] = useState('');
  const [confirmMasterPass, setConfirmMasterPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isSendingSecCode, setIsSendingSecCode] = useState(false);

  if (!isSupportModalOpen) return null;

  const handleRunDiagnosis = () => {
    setIsRunningDiagnosis(true);
    setTimeout(() => {
      const res = repairSystemDatabase();
      setDiagnosticResults(res);
      setIsRunningDiagnosis(false);
    }, 600);
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportSystemBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanStore = (storeInfo.storeName || 'pos').replace(/[^a-zA-Z0-9]/g, '_');
    a.download = `backup_${cleanStore}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Copia de seguridad descargada exitosamente', 'success');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportJsonText(content);
        const ok = importSystemBackup(content);
        if (ok) {
          setIsImporting(false);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleSaveStoreInfo = (e: React.FormEvent) => {
    e.preventDefault();
    updateStoreInfo({
      storeName: editStoreName,
      branchName: editBranchName,
      brandSubtitle: editSubtitle,
      phone: editPhone,
      address: editAddress,
      cuit: editCuit,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shadow-lg">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">Acceso Maestro & Soporte Técnico</h2>
                <span className="px-2.5 py-0.5 bg-amber-500 text-slate-950 font-black text-[10px] rounded-full uppercase tracking-wider">
                  Dev Master
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Panel de asistencia técnica para brindar soporte al cliente: <strong>{storeInfo.storeName}</strong> ({storeInfo.branchName})
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSupportModalOpen(false)}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Support Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-200 bg-slate-50 overflow-x-auto">
          {[
            { id: 'diagnosis', label: 'Diagnóstico & Salud', icon: ShieldCheck },
            { id: 'backup', label: 'Copia de Seguridad & Backup', icon: Database },
            { id: 'store', label: 'Personalización de Sucursal', icon: Building2 },
            { id: 'users', label: 'Asistencia de Usuarios', icon: Users },
            { id: 'security', label: 'Seguridad & Credenciales', icon: KeyRound },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
                  isSel
                    ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl shadow-xs'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-t-xl'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: DIAGNOSIS & HEALTH */}
          {activeTab === 'diagnosis' && (
            <div className="space-y-6">
              {/* Database Overview Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500">Productos</div>
                  <div className="text-xl font-black text-slate-900 font-mono mt-1">
                    {products.length}
                  </div>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500">Ventas Registradas</div>
                  <div className="text-xl font-black text-slate-900 font-mono mt-1">
                    {sales.length}
                  </div>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500">Gastos Fijos</div>
                  <div className="text-xl font-black text-slate-900 font-mono mt-1">
                    {expenses.length}
                  </div>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500">Turnos de Caja</div>
                  <div className="text-xl font-black text-slate-900 font-mono mt-1">
                    {shiftsHistory.length}
                  </div>
                </div>
              </div>

              {/* Automated Diagnostic Tool */}
              <div className="p-5 bg-blue-50/60 rounded-2xl border border-blue-200">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-blue-950 text-sm flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      Diagnóstico y Optimización Automática de Base de Datos
                    </h3>
                    <p className="text-xs text-blue-800/80 mt-1 max-w-lg">
                      Verifica que los stocks, categorías, carritos y estructuras de datos locales del cliente estén sincronizados y sin corrupción.
                    </p>
                  </div>
                  <button
                    onClick={handleRunDiagnosis}
                    disabled={isRunningDiagnosis}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRunningDiagnosis ? 'animate-spin' : ''}`} />
                    <span>{isRunningDiagnosis ? 'Analizando...' : 'Ejecutar Diagnóstico'}</span>
                  </button>
                </div>

                {diagnosticResults && (
                  <div className="mt-4 p-4 bg-white rounded-xl border border-blue-200/80 space-y-2">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>
                        Diagnóstico finalizado ({diagnosticResults.fixedIssues} ajustes realizados):
                      </span>
                    </div>
                    <ul className="text-xs text-slate-600 space-y-1 pl-6 list-disc">
                      {diagnosticResults.details.map((d, idx) => (
                        <li key={idx}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Current Connected Client Info */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  Información de la Instancia Local
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400 block">Comercio:</span>
                    <strong className="text-slate-900">{storeInfo.storeName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Sucursal:</span>
                    <strong className="text-slate-900">{storeInfo.branchName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Email del Dueño:</span>
                    <strong className="text-slate-900">{storeInfo.email || 'riojadecoraciones@gmail.com'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Estado del Modo Soporte:</span>
                    <span className="text-emerald-700 font-bold">● Activo (PIN Maestro validado)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BACKUP & RESTORE */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              {/* Export Backup Card */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Download className="w-4 h-4 text-blue-600" />
                    Descargar Copia de Seguridad Completa (JSON)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-lg">
                    Genera y descarga un archivo `.json` con todo el catálogo de productos, gastos fijos, ventas, historial de caja y configuración de la tienda del cliente.
                  </p>
                </div>
                <button
                  onClick={handleDownloadBackup}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar Backup</span>
                </button>
              </div>

              {/* Import / Restore Backup Card */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Upload className="w-4 h-4 text-emerald-600" />
                    Restaurar Base de Datos desde Archivo JSON
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Carga un archivo de copia de seguridad previo para restaurar el sistema en caso de que el cliente haya tenido un problema o cambiado de equipo.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-2 transition-colors shadow-xs"
                  >
                    <FileCode className="w-4 h-4 text-blue-600" />
                    <span>Seleccionar Archivo .JSON</span>
                  </button>

                  <button
                    onClick={() => setIsImporting(!isImporting)}
                    className="px-3 py-2 text-blue-600 hover:underline text-xs font-bold"
                  >
                    {isImporting ? 'Ocultar editor de texto' : 'O pegar JSON manualmente'}
                  </button>
                </div>

                {isImporting && (
                  <div className="space-y-3 pt-2">
                    <textarea
                      rows={5}
                      placeholder="Pega el contenido JSON del backup aquí..."
                      value={importJsonText}
                      onChange={(e) => setImportJsonText(e.target.value)}
                      className="w-full p-3 font-mono text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button
                      onClick={() => {
                        if (importJsonText.trim()) {
                          importSystemBackup(importJsonText);
                        }
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
                    >
                      Aplicar y Restaurar Datos
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: STORE & BRANCH PERSONALIZATION */}
          {activeTab === 'store' && (
            <form onSubmit={handleSaveStoreInfo} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre del Negocio / Comercio *
                  </label>
                  <input
                    type="text"
                    required
                    value={editStoreName}
                    onChange={(e) => setEditStoreName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre de la Sucursal (Personalizable) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Sucursal Principal, Casa Central, Sucursal Centro..."
                    value={editBranchName}
                    onChange={(e) => setEditBranchName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-bold text-blue-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Subtítulo / Rubro Comercial
                  </label>
                  <input
                    type="text"
                    value={editSubtitle}
                    onChange={(e) => setEditSubtitle(e.target.value)}
                    placeholder="ej. Decoración & Hogar, Indumentaria, Gestión Inteligente..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dirección Física
                  </label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    CUIT / Identificación Fiscal
                  </label>
                  <input
                    type="text"
                    value={editCuit}
                    onChange={(e) => setEditCuit(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/20 transition-all"
                >
                  Guardar Configuración de Sucursal
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: USER IMPERSONATION & ASSISTANCE */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Como soporte técnico, puedes alternar rápidamente a la vista de cualquier usuario del cliente para diagnosticar problemas sin requerir que te ingresen el PIN.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {users.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  return (
                    <div
                      key={u.id}
                      className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                          {u.initials || 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900">{u.name}</div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {u.roleTitle} ({u.role}) • PIN: <span className="font-mono font-bold text-slate-700">{u.pin}</span>
                          </div>
                        </div>
                      </div>

                      {isCurrent ? (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-lg">
                          Sesión Actual
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            switchUserDirect(u.id);
                            showToast(`Sesión cambiada a ${u.name}`, 'info');
                          }}
                          className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-700 font-bold rounded-lg text-xs transition-colors"
                        >
                          Asumir Usuario
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: MASTER SECURITY & CREDENTIALS */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Status Banner */}
              <div className="p-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent rounded-2xl border border-amber-300/60 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-sm">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">
                      Acceso Maestro de Desarrollador Protegido
                    </h3>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-md">
                      FARO PROJECT
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Esta terminal está asegurada con tu <strong>Contraseña Maestra Única</strong>. Te permite acceder al diagnóstico técnico, copias de seguridad de datos y rescate de usuarios.
                  </p>
                </div>
              </div>

              {/* Form: Update Password */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newMasterPass) {
                    showToast('Ingresa la nueva contraseña', 'warning');
                    return;
                  }
                  if (newMasterPass.length < 4) {
                    showToast('La contraseña debe tener al menos 4 caracteres', 'error');
                    return;
                  }
                  if (newMasterPass !== confirmMasterPass) {
                    showToast('Las contraseñas no coinciden', 'error');
                    return;
                  }
                  updateMasterCredentials(newMasterEmail || 'riojadecoraciones@gmail.com', newMasterPass);
                  setNewMasterPass('');
                  setConfirmMasterPass('');
                }}
                className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-slate-600" />
                    Cambiar Contraseña Maestra de Desarrollador
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Nueva Contraseña Maestra *
                    </label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={newMasterPass}
                        onChange={(e) => setNewMasterPass(e.target.value)}
                        placeholder="Ingresa nueva contraseña..."
                        className="w-full px-3.5 py-2.5 pr-10 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Confirmar Contraseña *
                    </label>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={confirmMasterPass}
                      onChange={(e) => setConfirmMasterPass(e.target.value)}
                      placeholder="Repetir nueva contraseña..."
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Actualizar Contraseña Maestra</span>
                  </button>
                </div>
              </form>

              {/* Security Audit Details */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-800">Detalles del Sistema de Seguridad:</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-600">
                  <div>
                    <span className="text-slate-400 block">Último Acceso:</span>
                    <span className="font-medium font-mono text-slate-800">
                      {masterAuth.lastLoginAt ? new Date(masterAuth.lastLoginAt).toLocaleString('es-AR') : 'Sesión activa'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Tipo de Protección:</span>
                    <span className="font-medium text-slate-800">Contraseña Maestra Privada</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Estado de la Base de Datos:</span>
                    <span className="font-medium text-emerald-700 font-bold">Conectada y Encriptada</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Cuenta Maestra: <strong>{masterAuth.email}</strong> (Protegida)</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                deactivateSupportMode();
                setIsSupportModalOpen(false);
              }}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs border border-rose-200 transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Salir del Modo Soporte</span>
            </button>

            <button
              onClick={() => setIsSupportModalOpen(false)}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors"
            >
              Cerrar Panel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
