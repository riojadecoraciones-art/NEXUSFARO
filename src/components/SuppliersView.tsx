import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatARS } from '../utils/currency';
import {
  Truck,
  Plus,
  Search,
  MessageCircle,
  Globe,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  Package,
  Clock,
} from 'lucide-react';
import { Supplier } from '../types';

// wa.me necesita el número completo (código de país incluido) sin espacios,
// "+", guiones ni paréntesis. No se valida el formato al guardar — sólo se
// limpia acá, al armar el link, para tolerar cómo lo haya tipeado el Dueño.
const toWhatsAppDigits = (phone: string) => phone.replace(/\D/g, '');

export const SuppliersView: React.FC = () => {
  const {
    suppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    products,
    staleCostProducts,
    showToast,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  const [formName, setFormName] = useState('');
  const [formWhatsappPhone, setFormWhatsappPhone] = useState('');
  const [formWebsiteUrl, setFormWebsiteUrl] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const totalProductsLinked = useMemo(() => products.filter((p) => p.supplierId).length, [products]);

  const filteredSuppliers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return suppliers;
    return suppliers.filter(
      (s) => s.name.toLowerCase().includes(term) || (s.notes && s.notes.toLowerCase().includes(term))
    );
  }, [suppliers, searchTerm]);

  const handleOpenNewModal = () => {
    setEditingSupplier(null);
    setFormName('');
    setFormWhatsappPhone('');
    setFormWebsiteUrl('');
    setFormNotes('');
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormName(supplier.name);
    setFormWhatsappPhone(supplier.whatsappPhone || '');
    setFormWebsiteUrl(supplier.websiteUrl || '');
    setFormNotes(supplier.notes || '');
    setIsFormModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Por favor ingresá el nombre del proveedor', 'warning');
      return;
    }

    const data = {
      name: formName.trim(),
      whatsappPhone: formWhatsappPhone.trim() || undefined,
      websiteUrl: formWebsiteUrl.trim() || undefined,
      notes: formNotes.trim() || undefined,
    };

    if (editingSupplier) {
      updateSupplier(editingSupplier.id, data);
    } else {
      addSupplier(data);
    }

    setIsFormModalOpen(false);
  };

  return (
    <div className="flex-1 bg-slate-100 flex flex-col overflow-y-auto min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-20 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Proveedores</h1>
              <p className="text-xs text-slate-500 font-medium">
                Directorio con acceso directo a WhatsApp o sitio web para consultar precios.
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenNewModal}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo Proveedor</span>
          </button>
        </div>
      </header>

      <main className="p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">{suppliers.length}</div>
              <div className="text-[11px] text-slate-500 font-medium">Proveedores cargados</div>
            </div>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">{totalProductsLinked}</div>
              <div className="text-[11px] text-slate-500 font-medium">Productos vinculados</div>
            </div>
          </div>

          <div
            className={`p-5 bg-white rounded-2xl border shadow-xs flex items-center gap-4 ${
              staleCostProducts.length > 0
                ? 'border-amber-200/90 bg-gradient-to-br from-white to-amber-50/40'
                : 'border-slate-200/80'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                staleCostProducts.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div
                className={`text-2xl font-black ${
                  staleCostProducts.length > 0 ? 'text-amber-700' : 'text-slate-900'
                }`}
              >
                {staleCostProducts.length}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">Costos para revisar</div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar proveedor o nota..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* List */}
        {filteredSuppliers.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Truck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {suppliers.length === 0 ? 'Todavía no hay proveedores cargados' : 'Sin resultados para esa búsqueda'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                {suppliers.length === 0
                  ? 'Cargá tus proveedores para tener su WhatsApp o web a un toque, y vincularlos a los productos que les comprás.'
                  : 'Probá con otro nombre.'}
              </p>
            </div>
            {suppliers.length === 0 && (
              <button
                onClick={handleOpenNewModal}
                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition-colors shadow-xs"
              >
                + Cargar Primer Proveedor
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuppliers.map((supplier) => {
              const linkedProducts = products.filter((p) => p.supplierId === supplier.id);
              const productsToReview = staleCostProducts.filter((p) => p.supplierId === supplier.id);

              return (
                <div
                  key={supplier.id}
                  className={`bg-white rounded-2xl border transition-all p-5 flex flex-col justify-between shadow-xs hover:shadow-md ${
                    productsToReview.length > 0 ? 'border-amber-300' : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border bg-blue-50 border-blue-200 text-blue-600">
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm leading-tight line-clamp-1">
                            {supplier.name}
                          </h3>
                          <span className="text-[11px] font-semibold text-slate-500">
                            {linkedProducts.length} {linkedProducts.length === 1 ? 'producto' : 'productos'}
                          </span>
                        </div>
                      </div>

                      {productsToReview.length > 0 && (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide shrink-0 bg-amber-100 text-amber-800 border border-amber-200">
                          {productsToReview.length} para revisar
                        </span>
                      )}
                    </div>

                    {/* Contact buttons */}
                    <div className="mt-4 flex items-center gap-2">
                      {supplier.whatsappPhone && (
                        <a
                          href={`https://wa.me/${toWhatsAppDigits(supplier.whatsappPhone)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                      {supplier.websiteUrl && (
                        <a
                          href={supplier.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>Sitio Web</span>
                        </a>
                      )}
                      {!supplier.whatsappPhone && !supplier.websiteUrl && (
                        <span className="text-[11px] text-slate-400 italic">Sin datos de contacto</span>
                      )}
                    </div>

                    {supplier.notes && (
                      <div className="text-[11px] text-slate-500 italic mt-3 pt-2 border-t border-slate-100 line-clamp-2">
                        "{supplier.notes}"
                      </div>
                    )}

                    {/* Productos a revisar */}
                    {productsToReview.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-amber-100 space-y-1.5">
                        <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Productos a revisar</span>
                        </div>
                        {productsToReview.slice(0, 4).map((p) => {
                          const days = Math.floor(
                            (Date.now() - new Date(p.costUpdatedAt).getTime()) / (24 * 60 * 60 * 1000)
                          );
                          return (
                            <div key={p.id} className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-700 truncate pr-2">{p.name}</span>
                              <span className="text-amber-700 font-bold shrink-0">
                                {formatARS(p.costPrice)} • {days}d
                              </span>
                            </div>
                          );
                        })}
                        {productsToReview.length > 4 && (
                          <div className="text-[10px] text-amber-600 font-semibold">
                            + {productsToReview.length - 4} más
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleOpenEditModal(supplier)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar Proveedor"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSupplierToDelete(supplier)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Eliminar Proveedor"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODAL: ALTA / EDICIÓN DE PROVEEDOR */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                  </h3>
                  <p className="text-xs text-slate-500">Nombre y contacto directo</p>
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
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Proveedor *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="ej. Distribuidora Central"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: 5493511234567 (con código de país)"
                  value={formWhatsappPhone}
                  onChange={(e) => setFormWhatsappPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Sitio Web (Opcional)</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={formWebsiteUrl}
                  onChange={(e) => setFormWebsiteUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notas</label>
                <textarea
                  rows={2}
                  placeholder="Condiciones de pago, referente de contacto, etc."
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
                  {editingSupplier ? 'Guardar Cambios' : 'Registrar Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ELIMINAR PROVEEDOR */}
      {supplierToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-black text-slate-900 text-base mt-3">¿Eliminar Proveedor?</h3>
            <p className="text-xs text-slate-500 mt-1">
              ¿Estás seguro de eliminar <strong>"{supplierToDelete.name}"</strong>? Los productos que tenía
              asignados no se eliminan, pero pierden ese vínculo.
            </p>
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                onClick={() => setSupplierToDelete(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  deleteSupplier(supplierToDelete.id);
                  setSupplierToDelete(null);
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
