export type UserRole = 'DUEÑO' | 'CAJERO';

export interface User {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  roleTitle: string; // e.g. 'Store Manager', 'Cashier', 'Supervisor'
  pin: string; // 4-digit PIN
  avatarUrl: string;
  initials: string;
  canDiscount: boolean;
  canRefund: boolean;
  canManageInventory: boolean;
}

export type ProductCategory = string;

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  category: ProductCategory;
  salePrice: number;
  costPrice: number;
  stock: number;
  minStock: number;
  imageUrl: string;
  description?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discountPercent?: number;
  discountAmount?: number;
}

export type PaymentMethodType = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA_QR' | 'MIXTO';

export interface PaymentDetail {
  method: PaymentMethodType;
  amount: number;
  details?: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  discount: number;
  total: number;
}

export type SaleStatus = 'COMPLETADA' | 'ANULADA_DEVUELTA';

export interface Sale {
  id: string;
  ticketNumber: string;
  timestamp: string;
  cashierId: string;
  cashierName: string;
  shiftId: string;
  items: SaleItem[];
  subtotal: number;
  discountTotal: number;
  discountAppliedBy?: string;
  tax: number;
  total: number;
  paymentMethod: PaymentMethodType;
  paymentBreakdown: PaymentDetail[];
  amountReceived?: number;
  changeGiven?: number;
  status: SaleStatus;
  notes?: string;
  refundedAt?: string;
  refundedBy?: string;
}

export interface ParkedTicket {
  id: string;
  customerName: string;
  items: CartItem[];
  timestamp: string;
  cashierName: string;
  notes?: string;
}

export type CashMovementType = 'ENTRADA' | 'RETIRO';

export interface CashMovement {
  id: string;
  shiftId: string;
  timestamp: string;
  type: CashMovementType;
  amount: number;
  reason: string;
  cashierName: string;
}

export interface CashShift {
  id: string;
  cashierId: string;
  cashierName: string;
  openedAt: string;
  closedAt?: string;
  status: 'ABIERTA' | 'CERRADA';
  initialCash: number; // Fondo inicial
  cashSales: number;
  cardSales: number;
  transferSales: number;
  totalIn: number; // Entradas
  totalOut: number; // Retiros
  expectedCash: number; // initial + cashSales + in - out
  countedCash?: number; // Conteo físico al cerrar
  difference?: number; // counted - expected (positivo = sobrante, negativo = faltante)
  notes?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  timestamp: string;
  type: 'VENTA' | 'DEVOLUCION' | 'INGRESO' | 'AJUSTE_MERMA' | 'AJUSTE_CONTEO';
  quantityDelta: number; // positive or negative
  previousStock: number;
  newStock: number;
  reason: string;
  userName: string;
}

export interface AppAlert {
  id: string;
  type: 'STOCK_BAJO' | 'STOCK_AGOTADO' | 'CAJA_DIFERENCIA' | 'INFO';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionRoute?: string;
  actionLabel?: string;
  productId?: string;
  productName?: string;
  productSku?: string;
  productImage?: string;
  currentStock?: number;
  minStock?: number;
  category?: string;
  severity?: 'critical' | 'warning' | 'info';
}

export interface ToastState {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'stock_alert';
  title?: string;
  productId?: string;
  productName?: string;
  currentStock?: number;
  minStock?: number;
  isPersistent?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  timestamp?: number;
}

export type ExpenseCategory =
  | 'ALQUILER'
  | 'LUZ_ELECTRICIDAD'
  | 'SERVICIOS_AGUA_GAS'
  | 'SUELDOS_NOMINA'
  | 'INTERNET_TELEFONIA'
  | 'IMPUESTOS_TASAS'
  | 'SOFTWARE_MANTENIMIENTO'
  | 'SEGUROS'
  | 'PUBLICIDAD_MARKETING'
  | 'LIMPIEZA_INSUMOS'
  | 'OTRO';

export type ExpenseFrequency = 'MENSUAL' | 'QUINCENAL' | 'SEMANAL' | 'ANUAL' | 'PAGO_UNICO';

export type ExpenseStatus = 'PAGADO' | 'PENDIENTE' | 'VENCIDO';

export interface FixedExpense {
  id: string;
  name: string; // ej. "Alquiler Salón Principal", "Factura de Luz (EDELAR)", "Sueldo Vendedor", "Fibra Óptica 300MB"
  category: ExpenseCategory | string;
  amount: number;
  frequency: ExpenseFrequency;
  dueDay?: number; // Día de vencimiento cada mes (1-31)
  dueDate?: string; // Fecha de próximo vencimiento (YYYY-MM-DD)
  status: ExpenseStatus;
  lastPaidDate?: string;
  lastPaidAmount?: number;
  lastPaidMethod?: PaymentMethodType;
  beneficiary?: string; // Proveedor / Empleado / Ente (ej. 'Inmobiliaria Central', 'EDELAR')
  notes?: string;
  createdAt: string;
}

export interface StoreInfo {
  storeName: string;
  branchName: string;
  brandSubtitle: string;
  cuit: string;
  address: string;
  phone: string;
  email: string;
  receiptFooter: string;
}

export interface MasterAuthConfig {
  email: string;
  isRegistered: boolean;
  password?: string;
  lastVerificationCode?: string;
  lastCodeTimestamp?: number;
  lastLoginAt?: string;
}

export type ActiveView = 
  | 'dashboard' 
  | 'pos' 
  | 'inventory' 
  | 'history' 
  | 'reports' 
  | 'employees' 
  | 'expenses'
  | 'settings'
  | 'cash_register';
