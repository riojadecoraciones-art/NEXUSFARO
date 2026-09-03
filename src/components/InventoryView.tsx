import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Package,
  Plus,
  SlidersHorizontal,
  Search,
  Filter,
  AlertTriangle,
  ArrowUpRight,
  MoreVertical,
  Edit2,
  Trash2,
  Tags,
  ChevronLeft,
  ChevronRight,
  X,
  History,
  CheckCircle2,
  ShieldAlert,
  Edit3,
  Check,
} from 'lucide-react';
import { Product, ProductCategory } from '../types';
import { ProductImage } from './ProductImage';
import { ProductImageSelector } from './ProductImageSelector';

export const InventoryView: React.FC = () => {
  const {
    products,
    categories,
    adjustStock,
    addStockReceipt,
    quickRestockProduct,
    lowStockProducts,
    setIsNotificationsPanelOpen,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    updateCategory,
    deleteCategory,
    stockMovements,
    currentUser,
    showToast,
  } = useApp();

  const isOwner = currentUser?.role === 'DUEÑO';
  const canManage = isOwner || currentUser?.canManageInventory;

  // Filters state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [stockLevelFilter, setStockLevelFilter] = useState<string>('All');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState<boolean>(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [isMovementHistoryOpen, setIsMovementHistoryOpen] = useState<boolean>(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Forms state
  const [adjustmentStock, setAdjustmentStock] = useState<string>('');
  const [adjustmentReason, setAdjustmentReason] = useState<string>('Corrección de conteo físico');
  const [receiptUnits, setReceiptUnits] = useState<string>('');
  const [receiptSupplier, setReceiptSupplier] = useState<string>('');

  // New product form
  const [newProdName, setNewProdName] = useState<string>('');
  const [newProdSku, setNewProdSku] = useState<string>('');
  const [newProdBarcode, setNewProdBarcode] = useState<string>('');
  const [newProdCategory, setNewProdCategory] = useState<string>(categories[0] || 'Bebidas');
  const [newProdSalePrice, setNewProdSalePrice] = useState<string>('');
  const [newProdCostPrice, setNewProdCostPrice] = useState<string>('');
  const [newProdStock, setNewProdStock] = useState<string>('');
  const [newProdMinStock, setNewProdMinStock] = useState<string>('5');
  const [newProdImage, setNewProdImage] = useState<string>('');

  // Edit product form
  const [editProdName, setEditProdName] = useState<string>('');
  const [editProdSku, setEditProdSku] = useState<string>('');
  const [editProdBarcode, setEditProdBarcode] = useState<string>('');
  const [editProdCategory, setEditProdCategory] = useState<string>('');
  const [editProdSalePrice, setEditProdSalePrice] = useState<string>('');
  const [editProdCostPrice, setEditProdCostPrice] = useState<string>('');
  const [editProdMinStock, setEditProdMinStock] = useState<string>('5');
  const [editProdImage, setEditProdImage] = useState<string>('');

  // Category Management Form
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [editingCategoryOldName, setEditingCategoryOldName] = useState<string | null>(null);
  const [editingCategoryNewName, setEditingCategoryNewName] = useState<string>('');
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  // Filter products
  const filteredProducts = products.filter((prod) => {
    const matchesSearch =
      prod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prod.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (prod.barcode && prod.barcode.includes(searchTerm));

    const matchesCategory = categoryFilter === 'All' || prod.category === categoryFilter;

    let matchesStock = true;
    if (stockLevelFilter === 'In Stock') matchesStock = prod.stock > prod.minStock;
    else if (stockLevelFilter === 'Low Stock') matchesStock = prod.stock > 0 && prod.stock <= prod.minStock;
    else if (stockLevelFilter === 'Out of Stock') matchesStock = prod.stock <= 0;

    return matchesSearch && matchesCategory && matchesStock;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpenAdjust = (prod: Product) => {
    setSelectedProduct(prod);
    setAdjustmentStock(prod.stock.toString());
    setAdjustmentReason('Corrección de conteo físico');
    setIsAdjustModalOpen(true);
  };

  const handleOpenReceipt = (prod: Product) => {
    setSelectedProduct(prod);
    setReceiptUnits('10');
    setReceiptSupplier('Proveedor Principal');
    setIsReceiptModalOpen(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setSelectedProduct(prod);
    setEditProdName(prod.name);
    setEditProdSku(prod.sku);
    setEditProdBarcode(prod.barcode || '');
    setEditProdCategory(prod.category);
    setEditProdSalePrice(prod.salePrice.toString());
    setEditProdCostPrice(prod.costPrice.toString());
    setEditProdMinStock(prod.minStock.toString());
    setEditProdImage(prod.imageUrl);
    setIsEditModalOpen(true);
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const stockVal = parseInt(adjustmentStock, 10);
    if (isNaN(stockVal) || stockVal < 0) {
      showToast('Ingresa una cantidad de stock válida', 'error');
      return;
    }
    adjustStock(selectedProduct.id, stockVal, adjustmentReason);
    setIsAdjustModalOpen(false);
  };

  const handleSaveReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const units = parseInt(receiptUnits, 10);
    if (isNaN(units) || units <= 0) {
      showToast('Ingresa una cantidad mayor a 0', 'error');
      return;
    }
    addStockReceipt(selectedProduct.id, units, `Ingreso de mercadería (${receiptSupplier || 'Proveedor'})`);
    setIsReceiptModalOpen(false);
  };

  const handleSaveNewProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdSku) {
      showToast('Nombre y SKU son requeridos', 'error');
      return;
    }

    addProduct({
      name: newProdName,
      sku: newProdSku,
      barcode: newProdBarcode || undefined,
      category: newProdCategory || categories[0] || 'General',
      salePrice: parseFloat(newProdSalePrice) || 0,
      costPrice: parseFloat(newProdCostPrice) || 0,
      stock: parseInt(newProdStock, 10) || 0,
      minStock: parseInt(newProdMinStock, 10) || 5,
      imageUrl: newProdImage.trim(),
    });

    setIsAddModalOpen(false);
    setNewProdName('');
    setNewProdSku('');
    setNewProdBarcode('');
    setNewProdSalePrice('');
    setNewProdCostPrice('');
    setNewProdStock('');
  };

  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (!editProdName || !editProdSku) {
      showToast('Nombre y SKU son requeridos', 'error');
      return;
    }

    updateProduct(selectedProduct.id, {
      name: editProdName,
      sku: editProdSku,
      barcode: editProdBarcode || undefined,
      category: editProdCategory || selectedProduct.category,
      salePrice: parseFloat(editProdSalePrice) || 0,
      costPrice: parseFloat(editProdCostPrice) || 0,
      minStock: parseInt(editProdMinStock, 10) || 5,
      imageUrl: editProdImage.trim(),
    });

    setIsEditModalOpen(false);
  };

  const handleConfirmDeleteProduct = () => {
    if (!productToDelete) return;
    deleteProduct(productToDelete.id);
    setProductToDelete(null);
    if (isEditModalOpen) setIsEditModalOpen(false);
    if (isAdjustModalOpen) setIsAdjustModalOpen(false);
  };

  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await addCategory(newCategoryName)) {
      setNewCategoryName('');
    }
  };

  const handleSaveRenameCategory = async (oldName: string) => {
    if (await updateCategory(oldName, editingCategoryNewName)) {
      setEditingCategoryOldName(null);
      setEditingCategoryNewName('');
    }
  };

  const handleConfirmDeleteCategory = (catName: string) => {
    deleteCategory(catName);
    setCategoryToDelete(null);
  };

  return (
    <div className="flex-1 p-6 sm:p-8 bg-[#f8fafc] overflow-y-auto space-y-6">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Control de Inventario
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Gestión completa de catálogo, categorías dinámicas, stock y auditoría.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {lowStockProducts.length > 0 && (
            <button
              onClick={() => setIsNotificationsPanelOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-amber-50 border border-amber-300 hover:bg-amber-100 text-xs font-bold text-amber-800 rounded-xl shadow-xs transition-all animate-pulse"
              title="Abrir panel de alertas de stock"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>{lowStockProducts.length} Alertas de Stock</span>
            </button>
          )}

          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 rounded-xl shadow-xs transition-colors"
            title="Administrar y modificar categorías"
          >
            <Tags className="w-4 h-4 text-blue-600" />
            <span>Categorías ({categories.length})</span>
          </button>

          <button
            onClick={() => setIsMovementHistoryOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 rounded-xl shadow-xs transition-colors"
          >
            <History className="w-4 h-4 text-slate-500" />
            <span>Auditoría de Stock</span>
          </button>

          {canManage && (
            <button
              onClick={() => {
                setNewProdCategory(categories[0] || 'Bebidas');
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-md transition-all active:scale-98"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>+ AGREGAR PRODUCTO</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, SKU o código de barra..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
          />
        </div>

        {/* Dropdowns Filters */}
        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 flex-1 md:flex-initial">
            <Tags className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer w-full md:w-auto"
            >
              <option value="All">Todas las Categorías ({products.length})</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat} ({products.filter((p) => p.category === cat).length})
                </option>
              ))}
            </select>
          </div>

          {/* Stock Level Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 flex-1 md:flex-initial">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={stockLevelFilter}
              onChange={(e) => {
                setStockLevelFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer w-full md:w-auto"
            >
              <option value="All">Todos los Estados</option>
              <option value="In Stock">Stock Saludable</option>
              <option value="Low Stock">Stock Mínimo / Crítico</option>
              <option value="Out of Stock">Agotados (0 u.)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Inventory Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Producto</th>
                <th className="py-3.5 px-4">Categoría</th>
                <th className="py-3.5 px-4 text-center">Stock Actual</th>
                <th className="py-3.5 px-4 text-right">Precio Venta</th>
                {isOwner && <th className="py-3.5 px-4 text-right">Costo / Margen</th>}
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={isOwner ? 7 : 6} className="py-12 text-center text-slate-400 font-medium">
                    No se encontraron productos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((prod) => {
                  const isOutOfStock = prod.stock <= 0;
                  const isLowStock = prod.stock > 0 && prod.stock <= prod.minStock;
                  const marginPercent =
                    prod.salePrice > 0 ? Math.round(((prod.salePrice - prod.costPrice) / prod.salePrice) * 100) : 0;

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Product Name & SKU */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 p-0.5">
                            <ProductImage
                              src={prod.imageUrl}
                              alt={prod.name}
                              category={prod.category}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 hover:text-blue-600 transition-colors">
                              {prod.name}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
                              <span>SKU: {prod.sku}</span>
                              {prod.barcode && <span>• {prod.barcode}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {prod.category}
                        </span>
                      </td>

                      {/* Stock Actual */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`font-mono font-extrabold text-sm ${
                              isOutOfStock ? 'text-rose-600' : isLowStock ? 'text-amber-700' : 'text-slate-900'
                            }`}
                          >
                            {prod.stock} u.
                          </span>
                          <span className="text-[10px] text-slate-400">mín. {prod.minStock}</span>
                        </div>
                      </td>

                      {/* Sale Price */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-slate-900 font-mono text-sm">
                          ${prod.salePrice.toFixed(2)}
                        </span>
                      </td>

                      {/* Cost & Margin (Owner Only) */}
                      {isOwner && (
                        <td className="py-3 px-4 text-right">
                          <div className="font-medium text-slate-600 font-mono text-xs">
                            ${prod.costPrice.toFixed(2)}
                          </div>
                          <div className={`text-[10px] font-bold ${marginPercent >= 40 ? 'text-emerald-700' : 'text-slate-500'}`}>
                            {marginPercent}% margen
                          </div>
                        </td>
                      )}

                      {/* Status Badge */}
                      <td className="py-3 px-4 text-center">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                            Agotado
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-200">
                            Stock Bajo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Óptimo
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Receipt quick button */}
                          <button
                            onClick={() => handleOpenReceipt(prod)}
                            className="px-2.5 py-1.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 text-slate-700 font-bold rounded-lg border border-slate-200 transition-colors flex items-center gap-1 text-[11px]"
                            title="Ingreso de mercadería (+ unidades)"
                          >
                            <Plus className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="hidden lg:inline">+ Mercadería</span>
                          </button>

                          {/* Adjust stock button */}
                          <button
                            onClick={() => handleOpenAdjust(prod)}
                            className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200 transition-colors text-[11px]"
                            title="Ajuste manual de stock"
                          >
                            Ajustar
                          </button>

                          {/* Edit product button */}
                          {canManage && (
                            <button
                              onClick={() => handleOpenEdit(prod)}
                              className="p-1.5 bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-700 rounded-lg border border-slate-200 transition-colors"
                              title="Editar producto"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete product button */}
                          {canManage && (
                            <button
                              onClick={() => setProductToDelete(prod)}
                              className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-200 transition-colors"
                              title="Eliminar producto del inventario"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Count Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Mostrando <strong>{paginatedProducts.length}</strong> de <strong>{filteredProducts.length}</strong> productos
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-semibold text-slate-700">
              Página {currentPage} de {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: ADMINISTRAR CATEGORÍAS */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 animate-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Tags className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Administrar Categorías</h3>
                  <span className="text-xs text-slate-500">Agrega, renombra o elimina categorías de productos</span>
                </div>
              </div>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add new category form */}
            <form onSubmit={handleAddCategorySubmit} className="mb-5 flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nombre de la nueva categoría..."
                className="flex-1 px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar</span>
              </button>
            </form>

            {/* List of Categories */}
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {categories.map((cat) => {
                const productCount = products.filter((p) => p.category === cat).length;
                const isEditing = editingCategoryOldName === cat;

                return (
                  <div
                    key={cat}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3"
                  >
                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editingCategoryNewName}
                          onChange={(e) => setEditingCategoryNewName(e.target.value)}
                          className="flex-1 px-2.5 py-1 bg-white border border-blue-400 rounded-lg text-xs font-bold text-slate-900 focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveRenameCategory(cat)}
                          className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          title="Guardar cambio"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingCategoryOldName(null)}
                          className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
                          title="Cancelar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-800">{cat}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
                            {productCount} {productCount === 1 ? 'producto' : 'productos'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingCategoryOldName(cat);
                              setEditingCategoryNewName(cat);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition-colors"
                            title="Renombrar categoría"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {categories.length > 1 && (
                            <button
                              onClick={() => setCategoryToDelete(cat)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors"
                              title="Eliminar categoría"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-4 mt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINAR CATEGORÍA */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">¿Eliminar Categoría "{categoryToDelete}"?</h3>
                <span className="text-xs text-slate-500">Los productos asociados no se eliminarán</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Si eliminas esta categoría, todos los productos que pertenezcan a <strong>"{categoryToDelete}"</strong> serán
              reasignados automáticamente a otra categoría disponible.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleConfirmDeleteCategory(categoryToDelete)}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
              >
                Confirmar Eliminación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINAR PRODUCTO */}
      {productToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">¿Eliminar Producto del Inventario?</h3>
                <span className="text-xs text-slate-500">Esta acción removerá el producto del catálogo</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 p-1 shrink-0 overflow-hidden">
                <ProductImage
                  src={productToDelete.imageUrl}
                  alt={productToDelete.name}
                  category={productToDelete.category}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900">{productToDelete.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  SKU: <strong className="font-mono">{productToDelete.sku}</strong> • Stock actual: <strong>{productToDelete.stock} u.</strong>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              El producto se quitará de la lista de ventas, de las alertas activas y del carrito actual. Se registrará la baja en la auditoría de movimientos.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteProduct}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sí, Eliminar Producto</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR PRODUCTO */}
      {isEditModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 animate-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Editar Producto</h3>
                  <span className="text-xs text-slate-500">Modifica la información general y precios</span>
                </div>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nombre del Producto *</label>
                  <input
                    type="text"
                    required
                    value={editProdName}
                    onChange={(e) => setEditProdName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-700 block mb-1">SKU / Código *</label>
                  <input
                    type="text"
                    required
                    value={editProdSku}
                    onChange={(e) => setEditProdSku(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Código de Barras (Opcional)</label>
                  <input
                    type="text"
                    value={editProdBarcode}
                    onChange={(e) => setEditProdBarcode(e.target.value)}
                    placeholder="7791234567890"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Categoría</label>
                  <select
                    value={editProdCategory}
                    onChange={(e) => setEditProdCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Precio Venta ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editProdSalePrice}
                    onChange={(e) => setEditProdSalePrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Costo ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editProdCostPrice}
                    onChange={(e) => setEditProdCostPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editProdMinStock}
                    onChange={(e) => setEditProdMinStock(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <ProductImageSelector
                imageUrl={editProdImage}
                onChange={setEditProdImage}
                category={editProdCategory || selectedProduct.category}
                productName={editProdName || selectedProduct.name}
              />

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setProductToDelete(selectedProduct)}
                  className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar Producto</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AJUSTE DE STOCK */}
      {isAdjustModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Control de Inventario</span>
                <h3 className="font-extrabold text-base text-slate-900">Ajuste Manual de Stock</h3>
              </div>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 p-0.5 shrink-0 overflow-hidden">
                  <ProductImage
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.name}
                    category={selectedProduct.category}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900">{selectedProduct.name}</div>
                  <div className="text-[11px] text-slate-500">Stock actual: <strong>{selectedProduct.stock} u.</strong></div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nuevo Stock Real</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={adjustmentStock}
                  onChange={(e) => setAdjustmentStock(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-base font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Motivo del Ajuste (Obligatorio)</label>
                <select
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                >
                  <option value="Corrección de conteo físico">Corrección de conteo físico</option>
                  <option value="Merma por vencimiento">Merma por vencimiento</option>
                  <option value="Rotura o daño">Rotura o daño</option>
                  <option value="Consumo interno">Consumo interno</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                {canManage && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdjustModalOpen(false);
                      setProductToDelete(selectedProduct);
                    }}
                    className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar producto
                  </button>
                )}

                <div className="flex gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsAdjustModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
                  >
                    Guardar Ajuste
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INGRESO DE MERCADERÍA */}
      {isReceiptModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase">Recepción de Proveedor</span>
                <h3 className="font-extrabold text-base text-slate-900">Ingreso de Mercadería</h3>
              </div>
              <button onClick={() => setIsReceiptModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReceipt} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 p-0.5 shrink-0 overflow-hidden">
                  <ProductImage
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.name}
                    category={selectedProduct.category}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900">{selectedProduct.name}</div>
                  <div className="text-[11px] text-slate-500">Stock actual: <strong>{selectedProduct.stock} u.</strong></div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Cantidad a Sumar (Unidades)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={receiptUnits}
                  onChange={(e) => setReceiptUnits(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-base font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Proveedor / Factura de Compra</label>
                <input
                  type="text"
                  value={receiptSupplier}
                  onChange={(e) => setReceiptSupplier(e.target.value)}
                  placeholder="Ej. Distribuidora Central, Remito #9822"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-colors"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Sumar al Inventario</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AGREGAR PRODUCTO */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 animate-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-extrabold text-lg text-slate-900">Agregar Nuevo Producto</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nombre del Producto *</label>
                  <input
                    type="text"
                    required
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    placeholder="Ej. Fanta Naranja 500ml"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-700 block mb-1">SKU / Código *</label>
                  <input
                    type="text"
                    required
                    value={newProdSku}
                    onChange={(e) => setNewProdSku(e.target.value)}
                    placeholder="BEB-FAN-500"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Código de Barras (Opcional)</label>
                  <input
                    type="text"
                    value={newProdBarcode}
                    onChange={(e) => setNewProdBarcode(e.target.value)}
                    placeholder="7791234567890"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Categoría</label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Precio Venta ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newProdSalePrice}
                    onChange={(e) => setNewProdSalePrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Costo ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newProdCostPrice}
                    onChange={(e) => setNewProdCostPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Stock Inicial</label>
                  <input
                    type="number"
                    required
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Stock Mínimo (Alerta)</label>
                <input
                  type="number"
                  value={newProdMinStock}
                  onChange={(e) => setNewProdMinStock(e.target.value)}
                  placeholder="5"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <ProductImageSelector
                imageUrl={newProdImage}
                onChange={setNewProdImage}
                category={newProdCategory || categories[0] || 'Bebidas'}
                productName={newProdName || 'Nuevo Producto'}
              />

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
                >
                  Crear Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AUDITORÍA DE MOVIMIENTOS DE STOCK */}
      {isMovementHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl border border-slate-200 animate-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Auditoría de Movimientos de Stock</h3>
                <span className="text-xs text-slate-500">Registro inmutable de ventas, ingresos, ajustes y bajas</span>
              </div>
              <button onClick={() => setIsMovementHistoryOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
              {stockMovements.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-medium">
                  No hay movimientos registrados en esta sesión.
                </div>
              ) : (
                stockMovements.map((mov) => (
                  <div key={mov.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-900">{mov.productName}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {mov.reason} • Responsable: <strong>{mov.userName}</strong>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`font-mono font-bold text-sm ${mov.quantityDelta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {mov.quantityDelta > 0 ? `+${mov.quantityDelta}` : mov.quantityDelta} u.
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {mov.previousStock} → {mov.newStock} u.
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 text-right">
              <button
                onClick={() => setIsMovementHistoryOpen(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
