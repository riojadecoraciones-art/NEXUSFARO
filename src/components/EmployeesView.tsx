import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Users,
  Shield,
  Key,
  Plus,
  Lock,
  X,
  Edit2,
  Trash2,
  Percent,
  RotateCcw,
  LogIn,
  Mail,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { User, UserRole } from '../types';
import { UserAvatar } from './UserAvatar';

export const EmployeesView: React.FC = () => {
  const {
    users,
    currentUser,
    showToast,
    requestUserSwitch,
    addUser,
    updateUser,
    deleteUser,
    updateUserPin,
  } = useApp();

  const isOwner = currentUser?.role === 'DUEÑO';

  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [pinChangeUser, setPinChangeUser] = useState<User | null>(null);
  const [quickNewPin, setQuickNewPin] = useState<string>('');
  const [quickOwnerPin, setQuickOwnerPin] = useState<string>('');
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleteOwnerPin, setDeleteOwnerPin] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Form states
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<UserRole>('CAJERO');
  const [roleTitle, setRoleTitle] = useState<string>('Cajero');
  const [pin, setPin] = useState<string>('');
  const [canDiscount, setCanDiscount] = useState<boolean>(false);
  const [canRefund, setCanRefund] = useState<boolean>(false);
  const [canManageInventory, setCanManageInventory] = useState<boolean>(false);
  const [ownerPin, setOwnerPin] = useState<string>('');

  const handleOpenAdd = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setRole('CAJERO');
    setRoleTitle('Cajero Turno Mañana');
    setPin('');
    setCanDiscount(false);
    setCanRefund(false);
    setCanManageInventory(false);
    setOwnerPin('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email || '');
    setRole(user.role);
    setRoleTitle(user.roleTitle);
    setCanDiscount(!!user.canDiscount);
    setCanRefund(!!user.canRefund);
    setCanManageInventory(!!user.canManageInventory);
    setOwnerPin('');
    setIsAddModalOpen(true);
  };

  const handleOpenQuickPinChange = (user: User) => {
    setPinChangeUser(user);
    setQuickNewPin('');
    setQuickOwnerPin('');
  };

  const handleSaveQuickPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinChangeUser) return;
    if (quickNewPin.length !== 4 || !/^\d{4}$/.test(quickNewPin)) {
      showToast('El PIN debe tener 4 dígitos numéricos', 'error');
      return;
    }
    if (quickOwnerPin.length !== 4 || !/^\d{4}$/.test(quickOwnerPin)) {
      showToast('Ingresá tu PIN de Dueño para confirmar el cambio', 'error');
      return;
    }

    setIsSaving(true);
    const ok = await updateUserPin(pinChangeUser.id, quickNewPin, { ownerPin: quickOwnerPin });
    setIsSaving(false);
    if (!ok) return;

    setPinChangeUser(null);
    setQuickNewPin('');
    setQuickOwnerPin('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Ingresá un nombre válido', 'error');
      return;
    }
    if (!editingUser && (pin.length !== 4 || !/^\d{4}$/.test(pin))) {
      showToast('Ingresá un PIN numérico de 4 dígitos para el nuevo empleado', 'error');
      return;
    }
    if (ownerPin.length !== 4 || !/^\d{4}$/.test(ownerPin)) {
      showToast('Ingresá tu PIN de Dueño para confirmar el cambio', 'error');
      return;
    }

    setIsSaving(true);
    const ok = editingUser
      ? await updateUser(
          editingUser.id,
          {
            name,
            email: email.trim() || undefined,
            role,
            roleTitle,
            canDiscount,
            canRefund,
            canManageInventory: role === 'DUEÑO' ? true : canManageInventory,
          },
          { ownerPin }
        )
      : await addUser(
          {
            name,
            email: email.trim() || undefined,
            role,
            roleTitle,
            pin,
            avatarUrl: '',
            canDiscount,
            canRefund,
            canManageInventory: role === 'DUEÑO' ? true : canManageInventory,
          },
          { ownerPin }
        );
    setIsSaving(false);
    if (!ok) return;

    setIsAddModalOpen(false);
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingUser) return;
    if (deleteOwnerPin.length !== 4 || !/^\d{4}$/.test(deleteOwnerPin)) {
      showToast('Ingresá tu PIN de Dueño para confirmar', 'error');
      return;
    }

    setIsSaving(true);
    const ok = await deleteUser(deletingUser.id, { ownerPin: deleteOwnerPin });
    setIsSaving(false);
    if (!ok) return;

    setDeletingUser(null);
    setDeleteOwnerPin('');
  };

  return (
    <div className="flex-1 p-6 sm:p-8 bg-[#f8fafc] overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Gestión de Empleados y Permisos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Administra cajeros, supervisores, PINs de acceso seguros y permisos del sistema.
          </p>
        </div>

        {isOwner && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-md transition-all active:scale-98"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>+ AGREGAR EMPLEADO</span>
          </button>
        )}
      </div>

      {/* Security Privacy Notice */}
      <div className="p-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-300 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-black flex items-center gap-2">
              <span>Privacidad y Protección de Claves</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] uppercase font-mono">
                Protegido
              </span>
            </div>
            <p className="text-xs text-blue-100/80 mt-0.5">
              Los PINs están ocultos en la pantalla de inicio. Cualquier alta, edición o borrado de un
              empleado pide confirmar con el PIN de un Dueño, verificado por el servidor.
            </p>
          </div>
        </div>

        <div className="text-xs font-mono text-blue-200 bg-white/10 px-3 py-1.5 rounded-xl shrink-0 flex items-center gap-2">
          <Mail className="w-3.5 h-3.5 text-blue-300" />
          <span>Correo de recuperación: riojadecoraciones@gmail.com</span>
        </div>
      </div>

      {/* Grid of Users */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user) => {
          const isCurrentUser = currentUser?.id === user.id;

          return (
            <div
              key={user.id}
              className={`bg-white rounded-2xl border transition-all p-5 flex flex-col justify-between shadow-xs ${
                isCurrentUser
                  ? 'border-blue-500 ring-2 ring-blue-500/10'
                  : 'border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <div>
                {/* User Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      avatarUrl={user.avatarUrl}
                      name={user.name}
                      initials={user.initials}
                      className="w-12 h-12 rounded-xl border border-slate-200 shadow-xs"
                      fallbackClassName="text-sm bg-slate-900 text-white"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-slate-900 text-base leading-tight">
                          {user.name}
                        </h3>
                        {isCurrentUser && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black rounded-md">
                            TÚ
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{user.roleTitle}</p>
                      {user.email && (
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{user.email}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase ${
                      user.role === 'DUEÑO'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300/60'
                        : 'bg-blue-100 text-blue-900 border border-blue-200'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>

                {/* Permissions Badges */}
                <div className="mt-5 space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Permisos de Operación
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                        user.canDiscount || user.role === 'DUEÑO'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-400 border border-slate-200 line-through'
                      }`}
                    >
                      <Percent className="w-3 h-3" />
                      <span>Descuentos</span>
                    </span>

                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                        user.canRefund || user.role === 'DUEÑO'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-400 border border-slate-200 line-through'
                      }`}
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Anulación / Devolución</span>
                    </span>

                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                        user.canManageInventory || user.role === 'DUEÑO'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-400 border border-slate-200 line-through'
                      }`}
                    >
                      <Shield className="w-3 h-3" />
                      <span>Stock & Catálogo</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* PIN Code & Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                {/*
                  El PIN se guarda hasheado y no se puede mostrar: antes había un
                  botón de "revelar PIN" que exponía la clave de cada empleado en
                  pantalla. Para dar acceso a alguien, se le asigna un PIN nuevo.
                */}
                <div className="flex items-center gap-2">
                  <Key className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-500 font-medium">PIN:</span>
                  <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                    <code className="font-mono font-black text-slate-900 tracking-wider">••••</code>
                    <Lock className="w-3 h-3 text-slate-400 ml-1" />
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {isOwner && (
                    <button
                      onClick={() => handleOpenQuickPinChange(user)}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                      title="Cambiar PIN de este usuario"
                    >
                      <KeyRound className="w-3 h-3 text-slate-500" />
                      <span>Cambiar PIN</span>
                    </button>
                  )}

                  {!isCurrentUser && (
                    <button
                      onClick={() => requestUserSwitch(user.id)}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                      title={`Cambiar a la sesión de ${user.name}`}
                    >
                      <LogIn className="w-3 h-3" />
                      <span>Entrar</span>
                    </button>
                  )}

                  {isOwner && (
                    <button
                      onClick={() => handleOpenEdit(user)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors"
                      title="Editar empleado"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {isOwner && !isCurrentUser && (
                    <button
                      onClick={() => {
                        setDeletingUser(user);
                        setDeleteOwnerPin('');
                      }}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-lg transition-colors"
                      title="Eliminar empleado"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Quick PIN Change */}
      {pinChangeUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-sm shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Cambiar PIN de Acceso</h3>
                  <p className="text-xs text-slate-500">{pinChangeUser.name}</p>
                </div>
              </div>
              <button
                onClick={() => setPinChangeUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickPin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nuevo PIN (4 dígitos numéricos)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  required
                  autoFocus
                  value={quickNewPin}
                  onChange={(e) => setQuickNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-3.5 py-3 font-mono text-center tracking-widest bg-slate-50 border border-slate-300 rounded-xl text-xl font-black text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tu PIN de Dueño (para confirmar)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={quickOwnerPin}
                  onChange={(e) => setQuickOwnerPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-3.5 py-3 font-mono text-center tracking-widest bg-slate-50 border border-slate-300 rounded-xl text-xl font-black text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPinChangeUser(null)}
                  className="flex-1 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Guardando…' : 'Guardar PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete confirmation */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-sm shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Eliminar Empleado</h3>
                  <p className="text-xs text-slate-500">{deletingUser.name}</p>
                </div>
              </div>
              <button
                onClick={() => setDeletingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDelete} className="space-y-4">
              <p className="text-xs text-slate-600">
                Esta acción no se puede deshacer. {deletingUser.name} ya no va a poder ingresar al
                sistema.
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tu PIN de Dueño (para confirmar)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  autoFocus
                  value={deleteOwnerPin}
                  onChange={(e) => setDeleteOwnerPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-3.5 py-3 font-mono text-center tracking-widest bg-slate-50 border border-slate-300 rounded-xl text-xl font-black text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingUser(null)}
                  className="flex-1 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Eliminando…' : 'Eliminar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit User */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl border border-slate-200 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Personal</span>
                <h3 className="font-black text-lg text-slate-900">
                  {editingUser ? 'Editar Empleado' : 'Registrar Nuevo Empleado'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Laura Gómez"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Correo Electrónico (para recuperación de PIN)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ej: empleado@tienda.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              <div className={editingUser ? '' : 'grid grid-cols-2 gap-3'}>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rol</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  >
                    <option value="CAJERO">CAJERO</option>
                    <option value="DUEÑO">DUEÑO / ADMIN</option>
                  </select>
                </div>

                {!editingUser && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">PIN (4 dígitos)</label>
                    <input
                      type="text"
                      maxLength={4}
                      required
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="1234"
                      className="w-full px-3.5 py-2.5 font-mono text-center tracking-widest bg-slate-50 border border-slate-200 rounded-xl text-sm font-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                )}
              </div>
              {editingUser && (
                <p className="text-[11px] text-slate-400 -mt-2">
                  Para cambiar el PIN de este empleado, usá "Cambiar PIN" desde su tarjeta.
                </p>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Título del Cargo</label>
                <input
                  type="text"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="Ej: Cajero Turno Noche, Supervisor"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              {role === 'CAJERO' && (
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="text-xs font-bold text-slate-800">Permisos Operativos</div>

                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canDiscount}
                      onChange={(e) => setCanDiscount(e.target.checked)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <span>Permitir aplicar descuentos manuales en el POS</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canRefund}
                      onChange={(e) => setCanRefund(e.target.checked)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <span>Permitir anular ventas y realizar devoluciones</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canManageInventory}
                      onChange={(e) => setCanManageInventory(e.target.checked)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <span>Permitir ingreso y ajuste de stock en inventario</span>
                  </label>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tu PIN de Dueño (para confirmar este cambio)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={ownerPin}
                  onChange={(e) => setOwnerPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-3.5 py-2.5 font-mono text-center tracking-widest bg-slate-50 border border-slate-200 rounded-xl text-sm font-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-slate-950 hover:bg-slate-900 text-white text-xs font-extrabold rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Guardando…' : 'Guardar Empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
