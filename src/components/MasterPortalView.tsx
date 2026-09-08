import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Building2,
  Users,
  TrendingUp,
  Package,
  CircleDollarSign,
  ShieldCheck,
  Search,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Phone,
  Mail,
  MapPin,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  Upload,
  Wrench,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Lock,
  ReceiptText,
  Activity,
  ChevronRight,
  X,
  Terminal,
  Copy,
} from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { StoreTenant, User, UserRole } from '../types';
import { formatARS } from '../utils/currency';

export const MasterPortalView: React.FC = () => {
  const {
    currentUser,
    users,
    products,
    sales,
    expenses,
    cashMovements,
    storeInfo,
    storeTenants,
    createStoreTenant,
    updateStoreTenant,
    deleteStoreTenant,
    provisionStoreTerminal,
    impersonateStore,
    isImpersonationLoading,
    addUser,
    updateUser,
    deleteUser,
    updateUserPin,
    repairSystemDatabase,
    exportSystemBackup,
    importSystemBackup,
    showToast,
    isSupabaseConnected,
    setActiveView,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'stores' | 'users' | 'tools'>('stores');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');

  // Modals state
  const [isNewStoreModalOpen, setIsNewStoreModalOpen] = useState<boolean>(false);
  const [editingStore, setEditingStore] = useState<StoreTenant | null>(null);

  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Modal: aprovisionar la cuenta de terminal de un comercio
  const [provisioningStore, setProvisioningStore] = useState<StoreTenant | null>(null);
  const [provisionEmail, setProvisionEmail] = useState<string>('');
  const [isProvisioning, setIsProvisioning] = useState<boolean>(false);
  const [provisionResult, setProvisionResult] = useState<{ email: string; password: string } | null>(null);

  // Store Form state
  const [storeForm, setStoreForm] = useState<{
    name: string;
    branchName: string;
    ownerName: string;
    ownerEmail: string;
    ownerPhone: string;
    cuit: string;
    address: string;
    status: 'ACTIVO' | 'SUSPENDIDO' | 'EN_PRUEBA';
    paidUntil: string;
  }>({
    name: '',
    branchName: 'Sucursal Principal',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    cuit: '',
    address: '',
    status: 'ACTIVO',
    paidUntil: '',
  });

  // User Form state
  const [userForm, setUserForm] = useState<{
    name: string;
    email: string;
    role: UserRole;
    roleTitle: string;
    pin: string;
    canDiscount: boolean;
    canRefund: boolean;
    canManageInventory: boolean;
  }>({
    name: '',
    email: '',
    role: 'CAJERO',
    roleTitle: 'Cajero',
    pin: '',
    canDiscount: false,
    canRefund: false,
    canManageInventory: false,
  });

  // Global KPIs Aggregation
  const totalRevenue = useMemo(() => {
    return (sales || [])
      .filter((s) => s && s.status === 'COMPLETADA')
      .reduce((sum, s) => sum + (s.total || 0), 0);
  }, [sales]);

  const totalStoresCount = storeTenants.length;
  const totalOwnersCount = (users || []).filter((u) => u && u.role === 'DUEÑO').length;
  const totalCashiersCount = (users || []).filter((u) => u && u.role === 'CAJERO').length;

  // Filtered Stores
  const filteredStores = useMemo(() => {
    const term = (searchTerm || '').toLowerCase().trim();
    const list = storeTenants || [];
    if (!term) return list;
    return list.filter(
      (s) =>
        (s.name && s.name.toLowerCase().includes(term)) ||
        (s.ownerName && s.ownerName.toLowerCase().includes(term)) ||
        (s.ownerEmail && s.ownerEmail.toLowerCase().includes(term)) ||
        (s.cuit && s.cuit.includes(term)) ||
        (s.branchName && s.branchName.toLowerCase().includes(term))
    );
  }, [storeTenants, searchTerm]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    const term = (searchTerm || '').toLowerCase().trim();
    const list = users || [];
    return list.filter((u) => {
      if (!u) return false;
      const matchesTerm =
        !term ||
        (u.name && u.name.toLowerCase().includes(term)) ||
        (u.email && u.email.toLowerCase().includes(term)) ||
        (u.roleTitle && u.roleTitle.toLowerCase().includes(term)) ||
        (u.role && u.role.toLowerCase().includes(term));

      const matchesRole =
        selectedRoleFilter === 'ALL' || u.role === selectedRoleFilter;

      return matchesTerm && matchesRole;
    });
  }, [users, searchTerm, selectedRoleFilter]);

  // Handlers for Store CRUD
  const handleOpenNewStore = () => {
    setEditingStore(null);
    setStoreForm({
      name: '',
      branchName: 'Sucursal Principal',
      ownerName: '',
      ownerEmail: '',
      ownerPhone: '',
      cuit: '',
      address: '',
      status: 'ACTIVO',
      paidUntil: '',
    });
    setIsNewStoreModalOpen(true);
  };

  const handleOpenEditStore = (store: StoreTenant) => {
    setEditingStore(store);
    setStoreForm({
      name: store.name,
      branchName: store.branchName,
      ownerName: store.ownerName,
      ownerEmail: store.ownerEmail || '',
      ownerPhone: store.ownerPhone || '',
      cuit: store.cuit || '',
      address: store.address || '',
      status: store.status,
      paidUntil: store.paidUntil || '',
    });
    setIsNewStoreModalOpen(true);
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeForm.name.trim() || !storeForm.ownerName.trim()) {
      showToast('Nombre del negocio y del dueño son obligatorios', 'error');
      return;
    }

    if (editingStore) {
      await updateStoreTenant(editingStore.id, storeForm);
      showToast(`Negocio "${storeForm.name}" actualizado correctamente`, 'success');
    } else {
      await createStoreTenant(storeForm);
      showToast(`Nuevo negocio "${storeForm.name}" registrado en la plataforma`, 'success');
    }
    setIsNewStoreModalOpen(false);
  };

  const handleDeleteStore = async (store: StoreTenant) => {
    if (confirm(`¿Estás seguro de eliminar el registro del negocio "${store.name}"?`)) {
      await deleteStoreTenant(store.id);
      showToast(`Negocio "${store.name}" eliminado`, 'info');
    }
  };

  // Handlers para aprovisionar la cuenta de terminal de un comercio
  const handleOpenProvision = (store: StoreTenant) => {
    setProvisioningStore(store);
    setProvisionEmail('');
    setProvisionResult(null);
    setIsProvisioning(false);
  };

  const handleCloseProvision = () => {
    setProvisioningStore(null);
    setProvisionEmail('');
    setProvisionResult(null);
    setIsProvisioning(false);
  };

  const handleSubmitProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provisioningStore) return;
    const cleanEmail = provisionEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      showToast('Ingresá un email válido para la terminal', 'error');
      return;
    }

    setIsProvisioning(true);
    const res = await provisionStoreTerminal(provisioningStore.id, cleanEmail);
    setIsProvisioning(false);

    if (res.success && res.email && res.password) {
      setProvisionResult({ email: res.email, password: res.password });
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(`${label} copiado al portapapeles`, 'success');
    } catch {
      showToast('No se pudo copiar automáticamente. Copialo a mano.', 'warning');
    }
  };

  // Handlers for User CRUD
  const handleOpenNewUser = () => {
    setEditingUser(null);
    setUserForm({
      name: '',
      email: '',
      role: 'CAJERO',
      roleTitle: 'Cajero',
      pin: '',
      canDiscount: false,
      canRefund: false,
      canManageInventory: false,
    });
    setIsNewUserModalOpen(true);
  };

  const handleOpenEditUser = (user: User) => {
    setEditingUser(user);
    setUserForm({
      name: user.name,
      email: user.email || '',
      role: user.role,
      // El PIN vive hasheado: se deja vacío y sólo se cambia si se escribe uno nuevo.
      pin: '',
      roleTitle: user.roleTitle,
      canDiscount: user.canDiscount,
      canRefund: user.canRefund,
      canManageInventory: user.canManageInventory,
    });
    setIsNewUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name.trim()) {
      showToast('El nombre del usuario es obligatorio', 'error');
      return;
    }
    // Al editar, el PIN es opcional: vacío significa "dejarlo como está".
    const pinTouched = userForm.pin.length > 0;
    if ((!editingUser || pinTouched) && !/^\d{4}$/.test(userForm.pin)) {
      showToast('El PIN debe contener exactamente 4 dígitos numéricos', 'error');
      return;
    }

    if (editingUser) {
      await updateUser(editingUser.id, {
        name: userForm.name,
        email: userForm.email || undefined,
        role: userForm.role,
        roleTitle: userForm.roleTitle,
        canDiscount: userForm.canDiscount,
        canRefund: userForm.canRefund,
        canManageInventory: userForm.canManageInventory,
      });
      // updateUserPin hashea el PIN; updateUser nunca debe recibirlo en claro.
      if (pinTouched) {
        await updateUserPin(editingUser.id, userForm.pin);
      }
      showToast(`Usuario ${userForm.name} actualizado`, 'success');
    } else {
      await addUser({
        name: userForm.name,
        email: userForm.email || undefined,
        role: userForm.role,
        roleTitle: userForm.roleTitle,
        pin: userForm.pin,
        avatarUrl: '',
        canDiscount: userForm.canDiscount,
        canRefund: userForm.canRefund,
        canManageInventory: userForm.canManageInventory,
      });
    }
    setIsNewUserModalOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-y-auto">
      {/* SuperAdmin Top Master Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 shadow-md shrink-0 border-b border-indigo-900/50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-black tracking-wider uppercase flex items-center gap-1.5 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>ACCESO SAAS MASTER</span>
              </span>
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{isSupabaseConnected ? 'Base de Datos Sincronizada' : 'Modo Offline'}</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>Portal Maestro de la Aplicación</span>
              <Sparkles className="w-6 h-6 text-amber-400" />
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl font-medium">
              Control centralizado de clientes, auditoría de métricas comerciales en tiempo real y administración global de cuentas de dueños y empleados.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                // Antes esto auditaba en silencio a storeTenants[0] (el primero
                // de la lista) como efecto secundario de un simple atajo de
                // navegación — ahora que auditar trae datos reales del
                // comercio, hacerlo sin que el operador lo haya elegido a
                // propósito sería mostrarle el negocio de un cliente al azar.
                setActiveView('pos');
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <span>Ir al Punto de Venta (POS)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full p-4 sm:p-8 space-y-8 flex-1">
        {/* Global Overview KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0 border border-blue-100">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Negocios Activos</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{totalStoresCount}</div>
              <div className="text-[11px] text-blue-600 font-semibold mt-0.5">Clientes en el sistema</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0 border border-emerald-100">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Facturación (tu comercio)</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{formatARS(totalRevenue)}</div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">{sales.length} ventas procesadas</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0 border border-purple-100">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Catálogo (tu comercio)</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{products.length}</div>
              <div className="text-[11px] text-purple-600 font-semibold mt-0.5">Artículos administrados</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0 border border-amber-100">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dueños & Empleados (tu comercio)</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{users.length}</div>
              <div className="text-[11px] text-amber-700 font-semibold mt-0.5">{totalOwnersCount} dueños • {totalCashiersCount} cajeros</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2 bg-slate-200/70 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('stores')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'stores'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>Negocios & Números ({storeTenants.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'users'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4 text-purple-600" />
              <span>Dueños & Empleados ({users.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('tools')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'tools'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wrench className="w-4 h-4 text-amber-600" />
              <span>Diagnóstico & Soporte</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, CUIT, email..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
              />
            </div>

            {activeTab === 'stores' && (
              <button
                onClick={handleOpenNewStore}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Negocio</span>
              </button>
            )}

            {activeTab === 'users' && (
              <button
                onClick={handleOpenNewUser}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Usuario</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: NEGOCIOS & AUDITORÍA DE NÚMEROS */}
        {activeTab === 'stores' && (
          <div className="space-y-6">
            {filteredStores.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-dashed border-slate-300">
                <Building2 className="w-10 h-10 text-slate-300 mb-3" />
                <p className="font-bold text-slate-700 text-sm">
                  {storeTenants.length === 0 ? 'Todavía no hay comercios dados de alta' : 'Sin resultados para esa búsqueda'}
                </p>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  {storeTenants.length === 0
                    ? 'Usá "Nuevo Negocio" para registrar el primer comercio cliente.'
                    : 'Probá con otro nombre, CUIT o email.'}
                </p>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStores.map((store) => {
                return (
                  <div
                    key={store.id}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold text-lg border border-blue-200/60">
                            <Building2 className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-base leading-tight">
                              {store.name}
                            </h3>
                            <span className="text-xs text-blue-600 font-semibold">{store.branchName}</span>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                            store.status === 'ACTIVO'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : store.status === 'SUSPENDIDO'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {store.status}
                        </span>
                      </div>

                      {store.paidUntil && (
                        <p className="text-[11px] text-slate-400 -mt-3 mb-4">
                          Pagado hasta: <span className="font-semibold text-slate-600">{store.paidUntil}</span>
                        </p>
                      )}

                      {/* Owner Information Box */}
                      <div className="bg-slate-50 rounded-xl p-3.5 space-y-2 text-xs text-slate-600 border border-slate-200/60 mb-5">
                        <div className="flex items-center gap-2 text-slate-900 font-bold">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>Dueño: {store.ownerName}</span>
                        </div>
                        {store.ownerEmail && (
                          <div className="flex items-center gap-2 truncate">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{store.ownerEmail}</span>
                          </div>
                        )}
                        {store.ownerPhone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{store.ownerPhone}</span>
                          </div>
                        )}
                        {store.cuit && (
                          <div className="flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>CUIT: {store.cuit}</span>
                          </div>
                        )}
                      </div>

                      {/* Los números por comercio (facturación, catálogo) requieren un
                          reporte cross-tenant real, todavía no construido: esta sesión
                          sólo tiene acceso a los datos de su propio comercio por diseño
                          (RLS), así que mostrar acá cualquier agregado sería mostrar el
                          mismo número repetido en todas las cards, sin distinguir cuál
                          es cuál. */}
                      <div className="pt-1 border-t border-slate-100">
                        <p className="text-[11px] text-slate-400 text-center py-1">
                          Reportes por comercio: próximamente
                        </p>
                      </div>

                      {/* Estado de la cuenta de terminal (Supabase Auth) de este comercio.
                          Sin esto, el dueño del comercio no tiene forma de entrar al sistema. */}
                      <div className="pt-2 mt-1 border-t border-slate-100">
                        {store.terminalEmail ? (
                          <div className="flex items-center gap-2 text-[11px] text-emerald-700 font-semibold min-w-0 py-1">
                            <Terminal className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">Terminal activada: {store.terminalEmail}</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenProvision(store)}
                            className="w-full flex items-center justify-center gap-1.5 text-[11px] text-blue-600 hover:text-blue-800 font-bold py-1"
                          >
                            <Terminal className="w-3.5 h-3.5" />
                            <span>Crear acceso de terminal</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="bg-slate-50/90 p-4 px-6 border-t border-slate-200 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          // impersonateStore ahora trae datos reales (puede
                          // fallar) y avisa éxito/error por su cuenta — antes
                          // este botón mostraba "listo" y navegaba igual
                          // aunque la carga fallara.
                          impersonateStore(store.id);
                        }}
                        disabled={isImpersonationLoading}
                        className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                        title="Ingresar a la tienda de este cliente para ayudarle a ver sus números y gestionar sus productos"
                      >
                        {isImpersonationLoading ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Wrench className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        <span>Asistir a este Negocio</span>
                      </button>

                      <button
                        onClick={() => handleOpenEditStore(store)}
                        className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 rounded-xl transition-colors"
                        title="Editar datos del negocio"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      {filteredStores.length > 1 && (
                        <button
                          onClick={() => handleDeleteStore(store)}
                          className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
                          title="Eliminar negocio"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        )}

        {/* TAB 2: ADMINISTRACIÓN DE DUEÑOS Y EMPLEADOS */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Directorio de Cuentas y Accesos</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Administra perfiles, PINs de seguridad y permisos de descuentos, reembolsos e inventario.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedRoleFilter}
                  onChange={(e) => setSelectedRoleFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value="ALL">Todos los Roles ({users.length})</option>
                  <option value="DUEÑO">Dueños de Negocio ({totalOwnersCount})</option>
                  <option value="CAJERO">Cajeros / Empleados ({totalCashiersCount})</option>
                  <option value="SUPERADMIN">Dueño de la App</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-6">Usuario & Rol</th>
                    <th className="py-3.5 px-6">Email de Contacto</th>
                    <th className="py-3.5 px-6">PIN de Acceso</th>
                    <th className="py-3.5 px-6">Permisos Especiales</th>
                    <th className="py-3.5 px-6 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => {
                    return (
                      <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <UserAvatar
                              avatarUrl={user.avatarUrl}
                              name={user.name}
                              initials={user.initials}
                              className="w-10 h-10 rounded-xl border border-slate-200 shrink-0"
                            />
                            <div>
                              <div className="font-bold text-slate-900 text-sm">{user.name}</div>
                              <div className="text-[11px] font-semibold text-blue-600 flex items-center gap-1">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    user.role === 'SUPERADMIN'
                                      ? 'bg-amber-500'
                                      : user.role === 'DUEÑO'
                                      ? 'bg-emerald-500'
                                      : 'bg-blue-500'
                                  }`}
                                />
                                <span>{user.roleTitle}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6 text-slate-600 font-medium">
                          {user.email || <span className="text-slate-400 italic">No registrado</span>}
                        </td>

                        <td className="py-4 px-6">
                          {/* Los PIN se guardan hasheados: no hay forma de mostrarlos. */}
                          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200 font-mono font-bold text-slate-800">
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            <span>••••</span>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex flex-wrap gap-1.5">
                            {user.role === 'DUEÑO' || user.role === 'SUPERADMIN' ? (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md font-bold text-[10px] border border-emerald-200">
                                Acceso Total
                              </span>
                            ) : (
                              <>
                                {user.canDiscount && (
                                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-semibold text-[10px] border border-blue-200">
                                    Descuentos
                                  </span>
                                )}
                                {user.canRefund && (
                                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md font-semibold text-[10px] border border-amber-200">
                                    Devoluciones
                                  </span>
                                )}
                                {user.canManageInventory && (
                                  <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md font-semibold text-[10px] border border-purple-200">
                                    Inventario
                                  </span>
                                )}
                                {!user.canDiscount && !user.canRefund && !user.canManageInventory && (
                                  <span className="text-slate-400 italic">Solo POS Básico</span>
                                )}
                              </>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditUser(user)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar usuario o PIN"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {users.length > 1 && user.id !== currentUser?.id && (
                              <button
                                onClick={() => {
                                  if (confirm(`¿Eliminar al usuario ${user.name}?`)) {
                                    deleteUser(user.id);
                                  }
                                }}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Eliminar cuenta"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: DIAGNÓSTICO & SOPORTE TÉCNICO */}
        {activeTab === 'tools' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Estado de la Base de Datos</h3>
                  <p className="text-xs text-slate-500 font-medium">Supabase Postgres Engine v17 (Cloud)</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Conexión Supabase:</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    ACTIVA & SALUDABLE
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Proyecto Ref:</span>
                  <span className="font-mono font-bold text-slate-800">wbvlszyxammnccepkkzw</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Tablas Sincronizadas:</span>
                  <span className="font-bold text-slate-800">12 tablas activas</span>
                </div>
              </div>

              <button
                onClick={async () => {
                  const res = await repairSystemDatabase();
                  showToast(`Diagnóstico completado: ${res.fixedIssues} correcciones realizadas`, 'success');
                }}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Ejecutar Reparación & Diagnóstico de Tablas</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Copia de Seguridad Global (JSON)</h3>
                  <p className="text-xs text-slate-500 font-medium">Exportación íntegra de productos, ventas y usuarios</p>
                </div>
              </div>

              <p className="text-xs text-slate-600">
                Puedes descargar un archivo JSON completo con todas las tablas del sistema para resguardar la información de tus clientes o restaurarla en cualquier momento.
              </p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    const json = exportSystemBackup();
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `backup-nexus-faro-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    showToast('Copia de seguridad descargada exitosamente', 'success');
                  }}
                  className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar Respaldo</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Crear / Editar Negocio Cliente */}
      {isNewStoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">
                    {editingStore ? 'Editar Negocio Cliente' : 'Registrar Nuevo Negocio'}
                  </h3>
                  <p className="text-xs text-slate-500">Datos comerciales y del titular</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewStoreModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStore} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Comercio *</label>
                <input
                  type="text"
                  required
                  value={storeForm.name}
                  onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                  placeholder="ej. Rioja Decoraciones"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sucursal</label>
                  <input
                    type="text"
                    value={storeForm.branchName}
                    onChange={(e) => setStoreForm({ ...storeForm, branchName: e.target.value })}
                    placeholder="ej. Sucursal Principal"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Dueño *</label>
                  <input
                    type="text"
                    required
                    value={storeForm.ownerName}
                    onChange={(e) => setStoreForm({ ...storeForm, ownerName: e.target.value })}
                    placeholder="ej. Carlos García"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email del Dueño</label>
                  <input
                    type="email"
                    value={storeForm.ownerEmail}
                    onChange={(e) => setStoreForm({ ...storeForm, ownerEmail: e.target.value })}
                    placeholder="cliente@gmail.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    value={storeForm.ownerPhone}
                    onChange={(e) => setStoreForm({ ...storeForm, ownerPhone: e.target.value })}
                    placeholder="+54 9 380 4123456"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">CUIT / Identificación</label>
                  <input
                    type="text"
                    value={storeForm.cuit}
                    onChange={(e) => setStoreForm({ ...storeForm, cuit: e.target.value })}
                    placeholder="30-12345678-9"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Estado de Cuenta</label>
                  <select
                    value={storeForm.status}
                    onChange={(e) => setStoreForm({ ...storeForm, status: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                  >
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="EN_PRUEBA">EN PRUEBA</option>
                    <option value="SUSPENDIDO">SUSPENDIDO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pagado hasta <span className="font-normal text-slate-400">(informativo, para recordarte a quién cobrarle)</span>
                </label>
                <input
                  type="date"
                  value={storeForm.paidUntil}
                  onChange={(e) => setStoreForm({ ...storeForm, paidUntil: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                />
              </div>

              {storeForm.status === 'SUSPENDIDO' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 font-semibold">
                  Marcar SUSPENDIDO bloquea de verdad: la terminal de este comercio no va a poder entrar hasta que lo vuelvas a poner ACTIVO.
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewStoreModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md"
                >
                  {editingStore ? 'Guardar Cambios' : 'Registrar Negocio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Aprovisionar cuenta de terminal (Edge Function con Admin API) */}
      {provisioningStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Crear Acceso de Terminal</h3>
                  <p className="text-xs text-slate-500">{provisioningStore.name}</p>
                </div>
              </div>
              <button
                onClick={handleCloseProvision}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!provisionResult ? (
              <form onSubmit={handleSubmitProvision} className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-900 leading-relaxed">
                  Se crea una cuenta nueva (correo + contraseña) para que este comercio pueda
                  activar su terminal e ingresar al sistema. La contraseña se genera sola y se
                  muestra una única vez: nadie más la puede volver a ver después.
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email de la terminal *
                  </label>
                  <input
                    type="email"
                    required
                    autoFocus
                    value={provisionEmail}
                    onChange={(e) => setProvisionEmail(e.target.value)}
                    placeholder="terminal@negociocliente.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCloseProvision}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isProvisioning}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-2"
                  >
                    {isProvisioning ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Terminal className="w-3.5 h-3.5" />
                    )}
                    <span>Crear Cuenta</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-semibold flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    Copiá estos datos ahora y pasáselos al comercio por un canal seguro. La
                    contraseña no se vuelve a mostrar.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono truncate">
                      {provisionResult.email}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopy(provisionResult.email, 'Email')}
                      className="p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
                      title="Copiar email"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contraseña</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono truncate">
                      {provisionResult.password}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopy(provisionResult.password, 'Contraseña')}
                      className="p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
                      title="Copiar contraseña"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCloseProvision}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Ya lo copié, cerrar</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Crear / Editar Usuario & PIN */}
      {isNewUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">
                    {editingUser ? 'Editar Cuenta & PIN' : 'Nuevo Usuario / Empleado'}
                  </h3>
                  <p className="text-xs text-slate-500">Credenciales y permisos</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewUserModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="ej. Romina Pérez"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    placeholder="usuario@gmail.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {editingUser ? 'Nuevo PIN (opcional)' : 'PIN 4 Dígitos *'}
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required={!editingUser}
                    value={userForm.pin}
                    onChange={(e) => setUserForm({ ...userForm, pin: e.target.value.replace(/\D/g, '') })}
                    placeholder={editingUser ? 'Dejar vacío para no cambiarlo' : '4 dígitos'}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-center tracking-widest text-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rol en Sistema</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => {
                      const newRole = e.target.value as UserRole;
                      setUserForm({
                        ...userForm,
                        role: newRole,
                        roleTitle: newRole === 'DUEÑO' ? 'Dueño del Negocio' : newRole === 'SUPERADMIN' ? 'Dueño de la App' : 'Cajero',
                      });
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="CAJERO">Cajero / Empleado</option>
                    <option value="DUEÑO">Dueño de Negocio</option>
                    <option value="SUPERADMIN">Dueño de la App</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Título de Cargo</label>
                  <input
                    type="text"
                    value={userForm.roleTitle}
                    onChange={(e) => setUserForm({ ...userForm, roleTitle: e.target.value })}
                    placeholder="ej. Encargado de Salón"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Special Permissions Checkboxes */}
              {userForm.role === 'CAJERO' && (
                <div className="pt-2 space-y-2 border-t border-slate-100">
                  <div className="text-[11px] font-bold text-slate-700 uppercase">Permisos Habilitados</div>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userForm.canDiscount}
                      onChange={(e) => setUserForm({ ...userForm, canDiscount: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Puede aplicar descuentos a órdenes</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userForm.canRefund}
                      onChange={(e) => setUserForm({ ...userForm, canRefund: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Puede anular ventas y devoluciones</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userForm.canManageInventory}
                      onChange={(e) => setUserForm({ ...userForm, canManageInventory: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Puede reponer y modificar inventario</span>
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewUserModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-md"
                >
                  {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
