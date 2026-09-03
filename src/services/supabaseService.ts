import { supabase } from '../lib/supabase';
import {
  User,
  Product,
  Sale,
  SaleItem,
  CashShift,
  CashMovement,
  StockMovement,
  ParkedTicket,
  AppAlert,
  FixedExpense,
  StoreInfo,
  StoreTenant,
} from '../types';

// ==========================================
// 1. USERS SERVICE
// ==========================================

export const userService = {
  async getAll(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching users:', error);
      throw error;
    }

    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email || undefined,
      role: row.role,
      roleTitle: row.role_title,
      pin: row.pin,
      avatarUrl: row.avatar_url || '',
      initials: row.initials || '',
      canDiscount: Boolean(row.can_discount),
      canRefund: Boolean(row.can_refund),
      canManageInventory: Boolean(row.can_manage_inventory),
    }));
  },

  async create(user: Omit<User, 'id' | 'initials'> & { id?: string; initials?: string }): Promise<User> {
    const initials =
      user.initials ||
      user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2) ||
      'US';

    const newId = user.id || `usr-${Date.now()}`;

    const { data, error } = await supabase
      .from('users')
      .insert({
        id: newId,
        name: user.name,
        email: user.email || null,
        role: user.role,
        role_title: user.roleTitle,
        pin: user.pin,
        avatar_url: user.avatarUrl || '',
        initials: initials,
        can_discount: user.canDiscount ?? false,
        can_refund: user.canRefund ?? false,
        can_manage_inventory: user.canManageInventory ?? false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      email: data.email || undefined,
      role: data.role,
      roleTitle: data.role_title,
      pin: data.pin,
      avatarUrl: data.avatar_url || '',
      initials: data.initials || '',
      canDiscount: Boolean(data.can_discount),
      canRefund: Boolean(data.can_refund),
      canManageInventory: Boolean(data.can_manage_inventory),
    };
  },

  async update(id: string, updates: Partial<User>): Promise<void> {
    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.email !== undefined) dbUpdates.email = updates.email || null;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.roleTitle !== undefined) dbUpdates.role_title = updates.roleTitle;
    if (updates.pin !== undefined) dbUpdates.pin = updates.pin;
    if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
    if (updates.initials !== undefined) dbUpdates.initials = updates.initials;
    if (updates.canDiscount !== undefined) dbUpdates.can_discount = updates.canDiscount;
    if (updates.canRefund !== undefined) dbUpdates.can_refund = updates.canRefund;
    if (updates.canManageInventory !== undefined) dbUpdates.can_manage_inventory = updates.canManageInventory;

    const { error } = await supabase.from('users').update(dbUpdates).eq('id', id);
    if (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },

  async updatePin(id: string, newPin: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ pin: newPin, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error updating PIN:', error);
      throw error;
    }
  },
};

// ==========================================
// 2. CATEGORIES SERVICE
// ==========================================

export const categoryService = {
  async getAll(): Promise<string[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('name')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }

    const defaultCats = [
      'General',
      'Cortinería',
      'Telas & Tapicería',
      'Decoración',
      'Accesorios',
      'Blanquería',
    ];

    if (!data || data.length === 0) {
      // Seed default categories if none exist
      try {
        const rows = defaultCats.map((name) => ({ name }));
        await supabase.from('categories').insert(rows);
      } catch (e) {
        console.warn('Could not seed default categories', e);
      }
      return defaultCats;
    }

    return data.map((c) => c.name);
  },

  async create(name: string): Promise<void> {
    const { error } = await supabase.from('categories').insert({ name: name.trim() });
    if (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  },

  async update(oldName: string, newName: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .update({ name: newName.trim() })
      .eq('name', oldName);

    if (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  },

  async delete(name: string): Promise<void> {
    const { error } = await supabase.from('categories').delete().eq('name', name);
    if (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  },
};

// ==========================================
// 3. PRODUCTS SERVICE
// ==========================================

export const productService = {
  async getAll(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching products:', error);
      throw error;
    }

    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      barcode: row.barcode || undefined,
      category: row.category || 'General',
      salePrice: Number(row.sale_price) || 0,
      costPrice: Number(row.cost_price) || 0,
      stock: Number(row.stock) || 0,
      minStock: Number(row.min_stock) || 5,
      imageUrl: row.image_url || '',
      description: row.description || undefined,
    }));
  },

  async create(product: Omit<Product, 'id'> & { id?: string }): Promise<Product> {
    const id = product.id || `prd-${Date.now()}`;
    const { data, error } = await supabase
      .from('products')
      .insert({
        id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode || null,
        category: product.category || 'General',
        sale_price: product.salePrice,
        cost_price: product.costPrice,
        stock: product.stock,
        min_stock: product.minStock,
        image_url: product.imageUrl || '',
        description: product.description || '',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating product:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      sku: data.sku,
      barcode: data.barcode || undefined,
      category: data.category,
      salePrice: Number(data.sale_price),
      costPrice: Number(data.cost_price),
      stock: Number(data.stock),
      minStock: Number(data.min_stock),
      imageUrl: data.image_url || '',
      description: data.description || undefined,
    };
  },

  async update(id: string, updates: Partial<Product>): Promise<void> {
    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.sku !== undefined) dbUpdates.sku = updates.sku;
    if (updates.barcode !== undefined) dbUpdates.barcode = updates.barcode || null;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.salePrice !== undefined) dbUpdates.sale_price = updates.salePrice;
    if (updates.costPrice !== undefined) dbUpdates.cost_price = updates.costPrice;
    if (updates.stock !== undefined) dbUpdates.stock = updates.stock;
    if (updates.minStock !== undefined) dbUpdates.min_stock = updates.minStock;
    if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
    if (updates.description !== undefined) dbUpdates.description = updates.description;

    const { error } = await supabase.from('products').update(dbUpdates).eq('id', id);
    if (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  },

  async updateStock(id: string, newStock: number): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update({ stock: newStock, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error updating product stock:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  },
};

// ==========================================
// 4. CASH SHIFTS & MOVEMENTS SERVICE
// ==========================================

export const cashShiftService = {
  async getAll(): Promise<CashShift[]> {
    const { data, error } = await supabase
      .from('cash_shifts')
      .select('*')
      .order('opened_at', { ascending: false });

    if (error) {
      console.error('Error fetching cash shifts:', error);
      throw error;
    }

    return (data || []).map((row) => ({
      id: row.id,
      cashierId: row.cashier_id,
      cashierName: row.cashier_name,
      openedAt: row.opened_at,
      closedAt: row.closed_at || undefined,
      status: row.status,
      initialCash: Number(row.initial_cash) || 0,
      cashSales: Number(row.cash_sales) || 0,
      cardSales: Number(row.card_sales) || 0,
      transferSales: Number(row.transfer_sales) || 0,
      totalIn: Number(row.total_in) || 0,
      totalOut: Number(row.total_out) || 0,
      expectedCash: Number(row.expected_cash) || 0,
      countedCash: row.counted_cash !== null ? Number(row.counted_cash) : undefined,
      difference: row.difference !== null ? Number(row.difference) : undefined,
      notes: row.notes || undefined,
    }));
  },

  async getActive(): Promise<CashShift | null> {
    const { data, error } = await supabase
      .from('cash_shifts')
      .select('*')
      .eq('status', 'ABIERTA')
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching active shift:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      cashierId: data.cashier_id,
      cashierName: data.cashier_name,
      openedAt: data.opened_at,
      closedAt: data.closed_at || undefined,
      status: data.status,
      initialCash: Number(data.initial_cash) || 0,
      cashSales: Number(data.cash_sales) || 0,
      cardSales: Number(data.card_sales) || 0,
      transferSales: Number(data.transfer_sales) || 0,
      totalIn: Number(data.total_in) || 0,
      totalOut: Number(data.total_out) || 0,
      expectedCash: Number(data.expected_cash) || 0,
      countedCash: data.counted_cash !== null ? Number(data.counted_cash) : undefined,
      difference: data.difference !== null ? Number(data.difference) : undefined,
      notes: data.notes || undefined,
    };
  },

  async openShift(shift: CashShift): Promise<CashShift> {
    const { data, error } = await supabase
      .from('cash_shifts')
      .insert({
        id: shift.id,
        cashier_id: shift.cashierId,
        cashier_name: shift.cashierName,
        opened_at: shift.openedAt,
        status: 'ABIERTA',
        initial_cash: shift.initialCash,
        cash_sales: 0,
        card_sales: 0,
        transfer_sales: 0,
        total_in: 0,
        total_out: 0,
        expected_cash: shift.initialCash,
        notes: shift.notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error opening cash shift:', error);
      throw error;
    }

    return {
      id: data.id,
      cashierId: data.cashier_id,
      cashierName: data.cashier_name,
      openedAt: data.opened_at,
      closedAt: data.closed_at || undefined,
      status: data.status,
      initialCash: Number(data.initial_cash) || 0,
      cashSales: Number(data.cash_sales) || 0,
      cardSales: Number(data.card_sales) || 0,
      transferSales: Number(data.transfer_sales) || 0,
      totalIn: Number(data.total_in) || 0,
      totalOut: Number(data.total_out) || 0,
      expectedCash: Number(data.expected_cash) || 0,
      countedCash: data.counted_cash !== null ? Number(data.counted_cash) : undefined,
      difference: data.difference !== null ? Number(data.difference) : undefined,
      notes: data.notes || undefined,
    };
  },

  async updateShift(id: string, updates: Partial<CashShift>): Promise<void> {
    const dbUpdates: Record<string, any> = {};

    if (updates.closedAt !== undefined) dbUpdates.closed_at = updates.closedAt;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.cashSales !== undefined) dbUpdates.cash_sales = updates.cashSales;
    if (updates.cardSales !== undefined) dbUpdates.card_sales = updates.cardSales;
    if (updates.transferSales !== undefined) dbUpdates.transfer_sales = updates.transferSales;
    if (updates.totalIn !== undefined) dbUpdates.total_in = updates.totalIn;
    if (updates.totalOut !== undefined) dbUpdates.total_out = updates.totalOut;
    if (updates.expectedCash !== undefined) dbUpdates.expected_cash = updates.expectedCash;
    if (updates.countedCash !== undefined) dbUpdates.counted_cash = updates.countedCash;
    if (updates.difference !== undefined) dbUpdates.difference = updates.difference;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

    const { error } = await supabase.from('cash_shifts').update(dbUpdates).eq('id', id);
    if (error) {
      console.error('Error updating cash shift:', error);
      throw error;
    }
  },

  async getAllMovements(): Promise<CashMovement[]> {
    const { data, error } = await supabase
      .from('cash_movements')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching cash movements:', error);
      throw error;
    }

    return (data || []).map((row) => ({
      id: row.id,
      shiftId: row.shift_id || '',
      timestamp: row.timestamp,
      type: row.type,
      amount: Number(row.amount) || 0,
      reason: row.reason,
      cashierName: row.cashier_name,
    }));
  },

  async addMovement(movement: CashMovement): Promise<CashMovement> {
    const { data, error } = await supabase
      .from('cash_movements')
      .insert({
        id: movement.id,
        shift_id: movement.shiftId || null,
        timestamp: movement.timestamp,
        type: movement.type,
        amount: movement.amount,
        reason: movement.reason,
        cashier_name: movement.cashierName,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding cash movement:', error);
      throw error;
    }

    return {
      id: data.id,
      shiftId: data.shift_id || '',
      timestamp: data.timestamp,
      type: data.type,
      amount: Number(data.amount) || 0,
      reason: data.reason,
      cashierName: data.cashier_name,
    };
  },
};

// ==========================================
// 5. SALES & SALE ITEMS SERVICE
// ==========================================

export const saleService = {
  async getAll(): Promise<Sale[]> {
    // 1. Fetch sales
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .order('timestamp', { ascending: false });

    if (salesError) {
      console.error('Error fetching sales:', salesError);
      throw salesError;
    }

    if (!salesData || salesData.length === 0) return [];

    // 2. Fetch sale items
    const saleIds = salesData.map((s) => s.id);
    const { data: itemsData, error: itemsError } = await supabase
      .from('sale_items')
      .select('*')
      .in('sale_id', saleIds);

    if (itemsError) {
      console.error('Error fetching sale items:', itemsError);
    }

    const itemsBySaleId = new Map<string, SaleItem[]>();
    (itemsData || []).forEach((row) => {
      const item: SaleItem = {
        productId: row.product_id || '',
        productName: row.product_name,
        sku: row.sku || '',
        quantity: Number(row.quantity) || 1,
        unitPrice: Number(row.unit_price) || 0,
        unitCost: Number(row.unit_cost) || 0,
        discount: Number(row.discount) || 0,
        total: Number(row.total) || 0,
      };
      const list = itemsBySaleId.get(row.sale_id) || [];
      list.push(item);
      itemsBySaleId.set(row.sale_id, list);
    });

    return salesData.map((row) => ({
      id: row.id,
      ticketNumber: row.ticket_number,
      timestamp: row.timestamp,
      cashierId: row.cashier_id,
      cashierName: row.cashier_name,
      shiftId: row.shift_id || '',
      items: itemsBySaleId.get(row.id) || [],
      subtotal: Number(row.subtotal) || 0,
      discountTotal: Number(row.discount_total) || 0,
      discountAppliedBy: row.discount_applied_by || undefined,
      tax: Number(row.tax) || 0,
      total: Number(row.total) || 0,
      paymentMethod: row.payment_method,
      paymentBreakdown: row.payment_breakdown || [],
      amountReceived: row.amount_received !== null ? Number(row.amount_received) : undefined,
      changeGiven: row.change_given !== null ? Number(row.change_given) : undefined,
      status: row.status,
      notes: row.notes || undefined,
      refundedAt: row.refunded_at || undefined,
      refundedBy: row.refunded_by || undefined,
    }));
  },

  /**
   * Pide el próximo número de ticket a la base.
   *
   * Antes se calculaba en el navegador como `TK-${sales.length + 892}`, a
   * partir de las ventas que esa terminal tenía en memoria: con dos cajas
   * abiertas, ambas generaban el mismo número. Ahora lo entrega una secuencia
   * de Postgres, que es atómica.
   */
  async getNextTicketNumber(): Promise<string> {
    const { data, error } = await supabase.rpc('siguiente_numero_ticket');

    if (error) {
      console.error('Error obteniendo el número de ticket:', error);
      throw error;
    }
    if (typeof data !== 'string' || !data) {
      throw new Error('La base no devolvió un número de ticket válido.');
    }

    return data;
  },

  async create(sale: Sale): Promise<Sale> {
    // 1. Insert Sale record
    const { data: insertedSale, error: saleError } = await supabase
      .from('sales')
      .insert({
        id: sale.id,
        ticket_number: sale.ticketNumber,
        timestamp: sale.timestamp,
        cashier_id: sale.cashierId,
        cashier_name: sale.cashierName,
        shift_id: sale.shiftId || null,
        subtotal: sale.subtotal,
        discount_total: sale.discountTotal,
        discount_applied_by: sale.discountAppliedBy || null,
        tax: sale.tax,
        total: sale.total,
        payment_method: sale.paymentMethod,
        payment_breakdown: sale.paymentBreakdown || [],
        amount_received: sale.amountReceived || null,
        change_given: sale.changeGiven || null,
        status: sale.status || 'COMPLETADA',
        notes: sale.notes || null,
      })
      .select()
      .single();

    if (saleError) {
      console.error('Error inserting sale:', saleError);
      throw saleError;
    }

    // 2. Insert Sale Items
    if (sale.items && sale.items.length > 0) {
      const itemsToInsert = sale.items.map((item, idx) => ({
        id: `${sale.id}-item-${idx}`,
        sale_id: sale.id,
        product_id: item.productId || null,
        product_name: item.productName,
        sku: item.sku || null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        unit_cost: item.unitCost,
        discount: item.discount,
        total: item.total,
      }));

      const { error: itemsError } = await supabase.from('sale_items').insert(itemsToInsert);
      if (itemsError) {
        console.error('Error inserting sale items:', itemsError);
        throw itemsError;
      }
    }

    return sale;
  },

  async refund(saleId: string, refundedBy: string, refundedAt: string): Promise<void> {
    const { error } = await supabase
      .from('sales')
      .update({
        status: 'ANULADA_DEVUELTA',
        refunded_by: refundedBy,
        refunded_at: refundedAt,
      })
      .eq('id', saleId);

    if (error) {
      console.error('Error refunding sale:', error);
      throw error;
    }
  },
};

// ==========================================
// 6. STOCK MOVEMENTS SERVICE
// ==========================================

export const stockMovementService = {
  async getAll(): Promise<StockMovement[]> {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Error fetching stock movements:', error);
      throw error;
    }

    return (data || []).map((row) => ({
      id: row.id,
      productId: row.product_id,
      productName: row.product_name,
      timestamp: row.timestamp,
      type: row.type,
      quantityDelta: Number(row.quantity_delta) || 0,
      previousStock: Number(row.previous_stock) || 0,
      newStock: Number(row.new_stock) || 0,
      reason: row.reason,
      userName: row.user_name,
    }));
  },

  async create(movement: StockMovement): Promise<void> {
    const { error } = await supabase.from('stock_movements').insert({
      id: movement.id,
      product_id: movement.productId,
      product_name: movement.productName,
      timestamp: movement.timestamp,
      type: movement.type,
      quantity_delta: movement.quantityDelta,
      previous_stock: movement.previousStock,
      new_stock: movement.newStock,
      reason: movement.reason,
      user_name: movement.userName,
    });

    if (error) {
      console.error('Error creating stock movement:', error);
      throw error;
    }
  },
};

// ==========================================
// 7. FIXED EXPENSES SERVICE
// ==========================================

export const fixedExpenseService = {
  async getAll(): Promise<FixedExpense[]> {
    const { data, error } = await supabase
      .from('fixed_expenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching fixed expenses:', error);
      throw error;
    }

    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      amount: Number(row.amount) || 0,
      frequency: row.frequency,
      dueDay: row.due_day !== null ? Number(row.due_day) : undefined,
      dueDate: row.due_date || undefined,
      status: row.status,
      lastPaidDate: row.last_paid_date || undefined,
      lastPaidAmount: row.last_paid_amount !== null ? Number(row.last_paid_amount) : undefined,
      lastPaidMethod: row.last_paid_method || undefined,
      beneficiary: row.beneficiary || undefined,
      notes: row.notes || undefined,
      createdAt: row.created_at,
    }));
  },

  async create(expense: Omit<FixedExpense, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): Promise<FixedExpense> {
    const id = expense.id || `exp-${Date.now()}`;
    const createdAt = expense.createdAt || new Date().toISOString();

    const { data, error } = await supabase
      .from('fixed_expenses')
      .insert({
        id,
        name: expense.name,
        category: expense.category,
        amount: expense.amount,
        frequency: expense.frequency,
        due_day: expense.dueDay || null,
        due_date: expense.dueDate || null,
        status: expense.status || 'PENDIENTE',
        last_paid_date: expense.lastPaidDate || null,
        last_paid_amount: expense.lastPaidAmount || null,
        last_paid_method: expense.lastPaidMethod || null,
        beneficiary: expense.beneficiary || null,
        notes: expense.notes || null,
        created_at: createdAt,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating fixed expense:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      category: data.category,
      amount: Number(data.amount) || 0,
      frequency: data.frequency,
      dueDay: data.due_day !== null ? Number(data.due_day) : undefined,
      dueDate: data.due_date || undefined,
      status: data.status,
      lastPaidDate: data.last_paid_date || undefined,
      lastPaidAmount: data.last_paid_amount !== null ? Number(data.last_paid_amount) : undefined,
      lastPaidMethod: data.last_paid_method || undefined,
      beneficiary: data.beneficiary || undefined,
      notes: data.notes || undefined,
      createdAt: data.created_at,
    };
  },

  async update(id: string, updates: Partial<FixedExpense>): Promise<void> {
    const dbUpdates: Record<string, any> = {};

    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.frequency !== undefined) dbUpdates.frequency = updates.frequency;
    if (updates.dueDay !== undefined) dbUpdates.due_day = updates.dueDay;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.lastPaidDate !== undefined) dbUpdates.last_paid_date = updates.lastPaidDate;
    if (updates.lastPaidAmount !== undefined) dbUpdates.last_paid_amount = updates.lastPaidAmount;
    if (updates.lastPaidMethod !== undefined) dbUpdates.last_paid_method = updates.lastPaidMethod;
    if (updates.beneficiary !== undefined) dbUpdates.beneficiary = updates.beneficiary;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

    const { error } = await supabase.from('fixed_expenses').update(dbUpdates).eq('id', id);
    if (error) {
      console.error('Error updating fixed expense:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('fixed_expenses').delete().eq('id', id);
    if (error) {
      console.error('Error deleting fixed expense:', error);
      throw error;
    }
  },
};

// ==========================================
// 8. PARKED TICKETS SERVICE
// ==========================================

export const parkedTicketService = {
  async getAll(): Promise<ParkedTicket[]> {
    const { data, error } = await supabase
      .from('parked_tickets')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching parked tickets:', error);
      throw error;
    }

    return (data || []).map((row) => ({
      id: row.id,
      customerName: row.customer_name || 'Cliente',
      items: row.items || [],
      timestamp: row.timestamp,
      cashierName: row.cashier_name || '',
      notes: row.notes || undefined,
    }));
  },

  async create(ticket: ParkedTicket): Promise<ParkedTicket> {
    const { data, error } = await supabase
      .from('parked_tickets')
      .insert({
        id: ticket.id,
        customer_name: ticket.customerName,
        items: ticket.items,
        timestamp: ticket.timestamp,
        cashier_name: ticket.cashierName,
        notes: ticket.notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error parking ticket:', error);
      throw error;
    }

    return {
      id: data.id,
      customerName: data.customer_name,
      items: data.items,
      timestamp: data.timestamp,
      cashierName: data.cashier_name,
      notes: data.notes || undefined,
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('parked_tickets').delete().eq('id', id);
    if (error) {
      console.error('Error deleting parked ticket:', error);
      throw error;
    }
  },
};

// ==========================================
// 9. APP ALERTS SERVICE
// ==========================================

export const appAlertService = {
  async getAll(): Promise<AppAlert[]> {
    const { data, error } = await supabase
      .from('app_alerts')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching app alerts:', error);
      throw error;
    }

    return (data || []).map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      timestamp: row.timestamp,
      read: Boolean(row.read),
      actionRoute: row.action_route || undefined,
      actionLabel: row.action_label || undefined,
      productId: row.product_id || undefined,
      productName: row.product_name || undefined,
      productSku: row.product_sku || undefined,
      productImage: row.product_image || undefined,
      currentStock: row.current_stock !== null ? Number(row.current_stock) : undefined,
      minStock: row.min_stock !== null ? Number(row.min_stock) : undefined,
      category: row.category || undefined,
      severity: row.severity || undefined,
    }));
  },

  async create(alert: AppAlert): Promise<void> {
    const { error } = await supabase.from('app_alerts').insert({
      id: alert.id,
      type: alert.type,
      title: alert.title,
      message: alert.message,
      timestamp: alert.timestamp,
      read: alert.read,
      action_route: alert.actionRoute || null,
      action_label: alert.actionLabel || null,
      product_id: alert.productId || null,
      product_name: alert.productName || null,
      product_sku: alert.productSku || null,
      product_image: alert.productImage || null,
      current_stock: alert.currentStock !== undefined ? alert.currentStock : null,
      min_stock: alert.minStock !== undefined ? alert.minStock : null,
      category: alert.category || null,
      severity: alert.severity || 'info',
    });

    if (error) {
      console.error('Error creating app alert:', error);
    }
  },

  async markAsRead(id: string): Promise<void> {
    const { error } = await supabase.from('app_alerts').update({ read: true }).eq('id', id);
    if (error) console.error('Error marking alert as read:', error);
  },

  async markAllAsRead(): Promise<void> {
    const { error } = await supabase.from('app_alerts').update({ read: true }).neq('read', true);
    if (error) console.error('Error marking all alerts as read:', error);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('app_alerts').delete().eq('id', id);
    if (error) console.error('Error deleting alert:', error);
  },

  async clearAll(): Promise<void> {
    const { error } = await supabase.from('app_alerts').delete().neq('id', '');
    if (error) console.error('Error clearing alerts:', error);
  },
};

// ==========================================
// 10. STORE SETTINGS SERVICE
// ==========================================

export const storeSettingsService = {
  async get(): Promise<StoreInfo> {
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (error) {
      console.error('Error fetching store settings:', error);
    }

    if (!data) {
      const defaultInfo: StoreInfo = {
        storeName: 'NEXUS FARO',
        branchName: 'Sucursal Principal',
        brandSubtitle: 'Punto de Venta y Gestión Integral',
        cuit: '',
        address: '',
        phone: '',
        email: 'riojadecoraciones@gmail.com',
        receiptFooter: '¡Gracias por su compra!',
      };

      try {
        await supabase.from('store_settings').insert({
          id: 'default',
          store_name: defaultInfo.storeName,
          branch_name: defaultInfo.branchName,
          brand_subtitle: defaultInfo.brandSubtitle,
          cuit: defaultInfo.cuit,
          address: defaultInfo.address,
          phone: defaultInfo.phone,
          email: defaultInfo.email,
          receipt_footer: defaultInfo.receiptFooter,
        });
      } catch (e) {
        console.warn('Could not insert default store settings:', e);
      }

      return defaultInfo;
    }

    return {
      storeName: data.store_name || 'NEXUS FARO',
      branchName: data.branch_name || 'Sucursal Principal',
      brandSubtitle: data.brand_subtitle || 'Punto de Venta y Gestión',
      cuit: data.cuit || '',
      address: data.address || '',
      phone: data.phone || '',
      email: data.email || 'riojadecoraciones@gmail.com',
      receiptFooter: data.receipt_footer || '¡Gracias por su compra!',
    };
  },

  async update(updates: Partial<StoreInfo>): Promise<void> {
    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.storeName !== undefined) dbUpdates.store_name = updates.storeName;
    if (updates.branchName !== undefined) dbUpdates.branch_name = updates.branchName;
    if (updates.brandSubtitle !== undefined) dbUpdates.brand_subtitle = updates.brandSubtitle;
    if (updates.cuit !== undefined) dbUpdates.cuit = updates.cuit;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.receiptFooter !== undefined) dbUpdates.receipt_footer = updates.receiptFooter;

    const { error } = await supabase
      .from('store_settings')
      .upsert({ id: 'default', ...dbUpdates });

    if (error) {
      console.error('Error updating store settings:', error);
      throw error;
    }
  },
};

// ==========================================
// 11. STORE TENANTS SERVICE (SUPERADMIN SAAS)
// ==========================================

export const storeTenantService = {
  async getAll(): Promise<StoreTenant[]> {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching stores:', error);
      return [];
    }

    if (!data || data.length === 0) {
      // Seed default initial store
      const defaultStore: StoreTenant = {
        id: 'store-1',
        name: 'Rioja Decoraciones',
        branchName: 'Sucursal Principal',
        ownerName: 'Dueño / Administrador',
        ownerEmail: 'riojadecoraciones@gmail.com',
        ownerPhone: '+54 380 442-1234',
        cuit: '30-71829384-9',
        address: 'Av. San Martín 450, La Rioja',
        status: 'ACTIVO',
        createdAt: new Date().toISOString(),
      };
      try {
        await supabase.from('stores').insert({
          id: defaultStore.id,
          name: defaultStore.name,
          branch_name: defaultStore.branchName,
          owner_name: defaultStore.ownerName,
          owner_email: defaultStore.ownerEmail,
          owner_phone: defaultStore.ownerPhone,
          cuit: defaultStore.cuit,
          address: defaultStore.address,
          status: defaultStore.status,
        });
      } catch (e) {
        console.warn('Could not insert default store:', e);
      }
      return [defaultStore];
    }

    return data.map((row) => ({
      id: row.id,
      name: row.name,
      branchName: row.branch_name || 'Sucursal Principal',
      ownerName: row.owner_name,
      ownerEmail: row.owner_email || undefined,
      ownerPhone: row.owner_phone || undefined,
      cuit: row.cuit || undefined,
      address: row.address || undefined,
      status: row.status || 'ACTIVO',
      createdAt: row.created_at,
    }));
  },

  async create(tenant: Omit<StoreTenant, 'id' | 'createdAt'>): Promise<StoreTenant> {
    const id = `store-${Date.now()}`;
    const { data, error } = await supabase
      .from('stores')
      .insert({
        id,
        name: tenant.name,
        branch_name: tenant.branchName || 'Sucursal Principal',
        owner_name: tenant.ownerName,
        owner_email: tenant.ownerEmail || null,
        owner_phone: tenant.ownerPhone || null,
        cuit: tenant.cuit || null,
        address: tenant.address || null,
        status: tenant.status || 'ACTIVO',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating store tenant:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      branchName: data.branch_name,
      ownerName: data.owner_name,
      ownerEmail: data.owner_email || undefined,
      ownerPhone: data.owner_phone || undefined,
      cuit: data.cuit || undefined,
      address: data.address || undefined,
      status: data.status,
      createdAt: data.created_at,
    };
  },

  async update(id: string, updates: Partial<StoreTenant>): Promise<void> {
    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.branchName !== undefined) dbUpdates.branch_name = updates.branchName;
    if (updates.ownerName !== undefined) dbUpdates.owner_name = updates.ownerName;
    if (updates.ownerEmail !== undefined) dbUpdates.owner_email = updates.ownerEmail;
    if (updates.ownerPhone !== undefined) dbUpdates.owner_phone = updates.ownerPhone;
    if (updates.cuit !== undefined) dbUpdates.cuit = updates.cuit;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.status !== undefined) dbUpdates.status = updates.status;

    const { error } = await supabase.from('stores').update(dbUpdates).eq('id', id);
    if (error) {
      console.error('Error updating store tenant:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('stores').delete().eq('id', id);
    if (error) {
      console.error('Error deleting store tenant:', error);
      throw error;
    }
  },
};

