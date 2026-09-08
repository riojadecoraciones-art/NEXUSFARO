import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  User,
  Product,
  CartItem,
  Sale,
  SaleItem,
  CashShift,
  CashMovement,
  StockMovement,
  ParkedTicket,
  AppAlert,
  ToastState,
  ActiveView,
  PaymentMethodType,
  PaymentDetail,
  FixedExpense,
  StoreInfo,
  MasterAuthConfig,
  StoreTenant,
} from '../types';
import { SEED_USERS, SEED_PRODUCTS, SEED_SALES, SEED_ALERTS } from '../mockData';
import { sounds } from '../utils/soundEffects';
import { hashSecret, isHashed, verifySecret } from '../utils/crypto';
import { supabase } from '../lib/supabase';
import {
  userService,
  categoryService,
  productService,
  cashShiftService,
  saleService,
  stockMovementService,
  fixedExpenseService,
  parkedTicketService,
  appAlertService,
  storeSettingsService,
  storeTenantService,
} from '../services/supabaseService';

interface AppContextType {
  // Supabase Connection & Loading State
  isLoadingData: boolean;
  isSupabaseConnected: boolean;

  // Sesión de la terminal (Supabase Auth).
  // Sin ella la base no devuelve datos: las policies de RLS exigen el rol
  // `authenticated`, así que la anon key por sí sola no alcanza.
  hasTerminalSession: boolean;
  isCheckingTerminalSession: boolean;
  terminalEmail: string | null;
  // Estado de pago del comercio de esta terminal (no aplica a la terminal
  // superadmin, que nunca se autobloquea por esto).
  isCheckingStoreStatus: boolean;
  isStoreSuspended: boolean;
  signInTerminal: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  signOutTerminal: () => Promise<void>;

  // Envío del comprobante por email (Edge Function + Resend).
  sendReceiptEmail: (email: string, sale: Sale) => Promise<{ success: boolean; message: string }>;

  // Auth & Roles
  currentUser: User | null;
  users: User[];
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
  login: (userId: string, pin: string) => Promise<boolean>;
  logout: () => void;
  switchUser: (userId: string, pin: string) => Promise<boolean>;
  /** Abre la pantalla de PIN con ese usuario preseleccionado. Nunca cambia la sesión sin PIN. */
  requestUserSwitch: (userId: string) => void;
  pendingSwitchUserId: string | null;
  clearPendingSwitch: () => void;
  addUser: (userData: Omit<User, 'id' | 'initials'>) => Promise<void>;
  updateUser: (id: string, userData: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<boolean>;
  updateUserPin: (userId: string, newPin: string) => Promise<boolean>;
  requestPinRecovery: (email: string) => { success: boolean; user?: User; message: string };
  /** Restablece el PIN autorizando con la contraseña maestra (no con un código por email). */
  resetPinWithMasterPassword: (
    email: string,
    masterPassword: string,
    newPin: string
  ) => Promise<{ success: boolean; message: string }>;
  isMasterAccessConfigured: boolean;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  canAccessView: (view: ActiveView) => boolean;

  // Products & Inventory
  products: Product[];
  categories: string[];
  stockMovements: StockMovement[];
  adjustStock: (productId: string, newStock: number, reason: string, type?: 'AJUSTE_MERMA' | 'AJUSTE_CONTEO') => Promise<void>;
  addStockReceipt: (productId: string, quantityToAdd: number, reason: string) => Promise<void>;
  quickRestockProduct: (productId: string, quantityToAdd: number) => Promise<void>;
  addProduct: (productData: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, productData: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<boolean>;
  addCategory: (name: string) => Promise<boolean>;
  updateCategory: (oldName: string, newName: string) => Promise<boolean>;
  deleteCategory: (name: string, fallbackCategory?: string) => Promise<boolean>;
  lowStockProducts: Product[];

  // POS & Cart
  cart: CartItem[];
  addToCart: (product: Product) => void;
  scanBarcodeOrSku: (code: string) => { success: boolean; product?: Product; error?: string };
  updateCartQuantity: (productId: string, delta: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  taxPercent: number;
  setTaxPercent: (percent: number) => void;
  orderDiscountPercent: number;
  setOrderDiscountPercent: (percent: number) => void;
  cartSubtotal: number;
  cartDiscountAmount: number;
  cartTax: number;
  cartTotal: number;
  parkedTickets: ParkedTicket[];
  parkCurrentTicket: (customerName?: string, notes?: string) => Promise<boolean>;
  resumeParkedTicket: (ticketId: string) => Promise<void>;
  deleteParkedTicket: (ticketId: string) => Promise<void>;
  confirmSale: (payment: {
    method: PaymentMethodType;
    breakdown: PaymentDetail[];
    amountReceived?: number;
    notes?: string;
  }) => Promise<Sale | null>;

  // Cash Register & Shifts
  activeShift: CashShift | null;
  shiftsHistory: CashShift[];
  cashMovements: CashMovement[];
  openCashShift: (initialCash: number, notes?: string) => Promise<boolean>;
  closeCashShift: (countedCash: number, notes?: string) => Promise<boolean>;
  addCashMovement: (type: 'ENTRADA' | 'RETIRO', amount: number, reason: string) => Promise<boolean>;

  // Sales History & Refunds
  sales: Sale[];
  refundSale: (saleId: string, reason?: string) => Promise<boolean>;

  // Gastos Fijos & Operativos (Para Dueño)
  expenses: FixedExpense[];
  addExpense: (expenseData: Omit<FixedExpense, 'id' | 'createdAt'>) => Promise<void>;
  updateExpense: (id: string, updates: Partial<FixedExpense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<boolean>;
  markExpenseAsPaid: (id: string, paymentMethod?: PaymentMethodType, amount?: number) => Promise<void>;
  markExpenseAsPending: (id: string) => Promise<void>;

  // Sucursal & Datos del Negocio Personalizables
  storeInfo: StoreInfo;
  updateStoreInfo: (updates: Partial<StoreInfo>) => Promise<void>;

  // Acceso Maestro de Soporte Técnico (Para el Dueño del Sistema / Desarrollador)
  masterAuth: MasterAuthConfig;
  isMasterAuthModalOpen: boolean;
  setIsMasterAuthModalOpen: (open: boolean) => void;
  loginMaster: (password: string) => Promise<{ success: boolean; message: string }>;
  updateMasterEmail: (newEmail: string) => { success: boolean; message: string };
  isSupportMode: boolean;
  isSupportModalOpen: boolean;
  setIsSupportModalOpen: (open: boolean) => void;
  activateSupportMode: (password: string) => Promise<boolean>;
  deactivateSupportMode: () => void;
  exportSystemBackup: () => string;
  importSystemBackup: (jsonContent: string) => Promise<boolean>;
  repairSystemDatabase: () => Promise<{ fixedIssues: number; details: string[] }>;

  // Clientes / Negocios Multi-Tenant (Para el Dueño de la Aplicación)
  storeTenants: StoreTenant[];
  createStoreTenant: (tenant: Omit<StoreTenant, 'id' | 'createdAt'>) => Promise<StoreTenant>;
  updateStoreTenant: (id: string, updates: Partial<StoreTenant>) => Promise<void>;
  deleteStoreTenant: (id: string) => Promise<void>;
  provisionStoreTerminal: (
    storeId: string,
    terminalEmail: string
  ) => Promise<{ success: boolean; email?: string; password?: string; message: string }>;
  loginMasterSuperAdmin: (password: string) => Promise<{ success: boolean; message: string }>;
  impersonateStore: (storeId: string) => Promise<void>;
  exitImpersonation: () => Promise<void>;
  isImpersonating: boolean;
  isImpersonationLoading: boolean;

  // Alerts & Notifications Drawer & Toasts
  alerts: AppAlert[];
  unreadAlertsCount: number;
  dismissAlert: (id: string) => Promise<void>;
  markAlertAsRead: (id: string) => Promise<void>;
  markAllAlertsAsRead: () => Promise<void>;
  clearAllAlerts: () => Promise<void>;
  isNotificationsPanelOpen: boolean;
  setIsNotificationsPanelOpen: (open: boolean) => void;
  toasts: ToastState[];
  showToast: (
    message: string,
    type?: 'success' | 'error' | 'warning' | 'info' | 'stock_alert',
    options?: Partial<ToastState>
  ) => void;
  showStockAlertToast: (product: Product, currentStock: number) => void;
  removeToast: (id: string) => void;

  // Reset
  resetToSeedData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

/**
 * Hash PBKDF2 de la contraseña maestra, inyectado en tiempo de build.
 * Se genera con `npm run hash-password` y se guarda en .env.local.
 * Si no está configurado, el acceso maestro queda deshabilitado: no existe
 * ninguna contraseña por defecto ni código de emergencia en el código fuente.
 */
const MASTER_PASSWORD_HASH = import.meta.env.VITE_MASTER_PASSWORD_HASH?.trim() || '';
const IS_MASTER_ACCESS_CONFIGURED = isHashed(MASTER_PASSWORD_HASH);

// Si hay un valor pero no pasa isHashed(), casi siempre es el mismo problema:
// Vite carga .env.local con dotenv-expand, que interpreta "$palabra" (p.ej.
// el "$sha256" del hash) como referencia a otra variable y la borra en
// silencio — el hash llega roto a import.meta.env aunque se haya pegado
// bien en el archivo. "npm run hash-password" ya imprime la línea con los
// "$" escapados para evitar esto; este mensaje distingue ese caso de
// "nunca se configuró nada".
const MASTER_NOT_CONFIGURED_MESSAGE = MASTER_PASSWORD_HASH
  ? 'VITE_MASTER_PASSWORD_HASH está cargado pero no tiene el formato esperado. Esto pasa cuando los "$" del hash no quedaron escapados en .env.local: Vite los interpreta como referencias a otra variable y lo corta en silencio. Volvé a correr "npm run hash-password" y pegá la línea completa que imprime (ya sale con los "$" escapados).'
  : 'El acceso maestro no está configurado en esta instalación. Generá el hash con "npm run hash-password" y cargá VITE_MASTER_PASSWORD_HASH en .env.local.';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 0. Global Loading & Supabase Connection States
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(true);

  // 0.b Sesión de la terminal
  const [hasTerminalSession, setHasTerminalSession] = useState<boolean>(false);
  const [isCheckingTerminalSession, setIsCheckingTerminalSession] = useState<boolean>(true);
  const [terminalEmail, setTerminalEmail] = useState<string | null>(null);
  const [terminalRole, setTerminalRole] = useState<string | null>(null);
  const [isCheckingStoreStatus, setIsCheckingStoreStatus] = useState<boolean>(true);
  const [isStoreSuspended, setIsStoreSuspended] = useState<boolean>(false);

  // 1. Auth & Navigation
  const [users, setUsers] = useState<User[]>(SEED_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(true);
  // Usuario preseleccionado en la pantalla de PIN al pedir un cambio de sesión.
  const [pendingSwitchUserId, setPendingSwitchUserId] = useState<string | null>(null);
  const [activeView, setActiveViewRaw] = useState<ActiveView>('pos');
  // Sin comercio de ejemplo: una instalación nueva no tiene clientes
  // multi-tenant todavía, y no hay que fabricar uno para que la pantalla
  // "se vea llena".
  const [storeTenants, setStoreTenants] = useState<StoreTenant[]>([]);
  const [isImpersonating, setIsImpersonating] = useState<boolean>(false);
  const [isImpersonationLoading, setIsImpersonationLoading] = useState<boolean>(false);

  // 2. Inventory & Products
  const [products, setProducts] = useState<Product[]>(SEED_PRODUCTS);
  const [categories, setCategories] = useState<string[]>([
    'General',
    'Cortinería',
    'Telas & Tapicería',
    'Decoración',
    'Accesorios',
    'Blanquería',
  ]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);

  // 3. Sales & History
  const [sales, setSales] = useState<Sale[]>(SEED_SALES);

  // 4. Cash Shift
  const [activeShift, setActiveShift] = useState<CashShift | null>(null);
  const [shiftsHistory, setShiftsHistory] = useState<CashShift[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);

  // 5. Cart & Parked
  const [cart, setCart] = useState<CartItem[]>([]);
  const [taxPercent, setTaxPercentState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('nexus_tax_percent');
      return saved !== null ? parseFloat(saved) : 21;
    } catch {
      return 21;
    }
  });

  const setTaxPercent = useCallback((percent: number) => {
    const val = Math.max(0, Math.min(100, isNaN(percent) ? 0 : percent));
    setTaxPercentState(val);
    try {
      localStorage.setItem('nexus_tax_percent', String(val));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const [orderDiscountPercent, setOrderDiscountPercent] = useState<number>(0);
  const [parkedTickets, setParkedTickets] = useState<ParkedTicket[]>([]);

  // 6. Gastos Fijos & Operativos
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);

  // 7. Store & Branch Information
  const [storeInfo, setStoreInfo] = useState<StoreInfo>({
    storeName: 'NEXUS FARO',
    branchName: 'Sucursal Principal',
    brandSubtitle: 'Punto de Venta y Gestión',
    cuit: '',
    address: '',
    phone: '',
    email: 'riojadecoraciones@gmail.com',
    receiptFooter: '¡Gracias por su compra!',
  });

  // 8. Acceso Maestro de Soporte Técnico
  // Metadatos del acceso maestro. La contraseña NO se guarda acá: vive
  // únicamente como hash en la variable de entorno VITE_MASTER_PASSWORD_HASH.
  const [masterAuth, setMasterAuth] = useState<MasterAuthConfig>(() => {
    // Limpieza de instalaciones previas que guardaban la contraseña en claro.
    try {
      localStorage.removeItem('rioja_master_auth_v2');
    } catch (e) {
      console.error(e);
    }

    let email = '';
    let lastLoginAt: string | undefined;
    try {
      const saved = localStorage.getItem('nexus_master_meta_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        email = typeof parsed.email === 'string' ? parsed.email : '';
        lastLoginAt = typeof parsed.lastLoginAt === 'string' ? parsed.lastLoginAt : undefined;
      }
    } catch (e) {
      console.error(e);
    }

    return {
      email,
      isRegistered: IS_MASTER_ACCESS_CONFIGURED,
      lastLoginAt,
    };
  });

  useEffect(() => {
    try {
      // Solo metadatos no sensibles: nunca la contraseña ni códigos de verificación.
      localStorage.setItem(
        'nexus_master_meta_v3',
        JSON.stringify({ email: masterAuth.email, lastLoginAt: masterAuth.lastLoginAt })
      );
    } catch (e) {
      console.error(e);
    }
  }, [masterAuth.email, masterAuth.lastLoginAt]);

  const [isSupportMode, setIsSupportMode] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('rioja_support_mode') === 'true';
    } catch {
      return false;
    }
  });
  const [isSupportModalOpen, setIsSupportModalOpen] = useState<boolean>(false);
  const [isMasterAuthModalOpen, setIsMasterAuthModalOpen] = useState<boolean>(false);

  // 9. Alerts, Notification Panel & Toasts
  const [alerts, setAlerts] = useState<AppAlert[]>(SEED_ALERTS);
  const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (
      message: string,
      type: 'success' | 'error' | 'warning' | 'info' | 'stock_alert' = 'success',
      options?: Partial<ToastState>
    ) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const newToast: ToastState = {
        id,
        message,
        type,
        timestamp: Date.now(),
        ...options,
      };

      setToasts((prev) => [...prev, newToast]);

      if (!options?.isPersistent && type !== 'stock_alert') {
        setTimeout(() => {
          removeToast(id);
        }, 4000);
      } else if (type === 'stock_alert' && !options?.isPersistent) {
        setTimeout(() => {
          removeToast(id);
        }, 7000);
      }
    },
    [removeToast]
  );

  const showStockAlertToast = useCallback(
    (product: Product, currentStock: number) => {
      const isOut = currentStock === 0;
      const title = isOut ? '🚨 PRODUCTO AGOTADO' : '⚠️ ALERTA DE STOCK MÍNIMO';
      const message = isOut
        ? `"${product.name}" se quedó sin existencias (0 u.).`
        : `"${product.name}" alcanzó el stock mínimo: ${currentStock} u. restantes (Mínimo: ${product.minStock}).`;

      showToast(message, 'stock_alert', {
        title,
        productId: product.id,
        productName: product.name,
        currentStock,
        minStock: product.minStock,
        isPersistent: true,
        actionLabel: 'Ver Panel',
        onAction: () => setIsNotificationsPanelOpen(true),
      });
    },
    [showToast]
  );

  // ==========================================
  // INITIAL DATA LOADER FROM SUPABASE
  // ==========================================

  const loadAllDataFromSupabase = useCallback(async () => {
    setIsLoadingData(true);
    try {
      // 1. Store settings, Users & Store Tenants
      const [fetchedSettings, fetchedUsers, fetchedStores] = await Promise.all([
        storeSettingsService.get().catch((err) => {
          console.warn('Error loading store settings:', err);
          return null;
        }),
        userService.getAll().catch((err) => {
          console.warn('Error loading users:', err);
          return [];
        }),
        storeTenantService.getAll().catch((err) => {
          console.warn('Error loading store tenants:', err);
          return [];
        }),
      ]);

      if (fetchedSettings) {
        setStoreInfo(fetchedSettings);
      }

      // A diferencia de `users` (que necesita al menos una cuenta para poder
      // iniciar sesión), una lista de comercios vacía es un estado válido:
      // se refleja tal cual, sin el guard `length > 0` que antes dejaba a
      // storeTenants trabado en el seed falso para siempre.
      setStoreTenants(fetchedStores || []);

      if (fetchedUsers && fetchedUsers.length > 0) {
        setUsers(fetchedUsers);
      } else {
        // Primer arranque con la tabla vacía: se crea el usuario Dueño.
        // El PIN sale de VITE_SEED_OWNER_PIN o, si no está definido, se genera
        // uno al azar y se muestra una sola vez. Antes había un '1234' fijo
        // escrito en el repositorio, que es una credencial por defecto pública.
        try {
          const envPin = import.meta.env.VITE_SEED_OWNER_PIN?.trim();
          const seedPin =
            envPin && /^\d{4}$/.test(envPin)
              ? envPin
              : String(globalThis.crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(4, '0');

          const defaultUser = await userService.create({
            ...SEED_USERS[0],
            pin: await hashSecret(seedPin),
          });
          setUsers([defaultUser]);

          showToast(
            `Se creó el usuario Dueño. PIN inicial: ${seedPin} — anotalo y cambialo desde Empleados.`,
            'warning',
            { title: 'Primer arranque', isPersistent: true }
          );
        } catch (e) {
          console.warn('Could not seed default user in Supabase', e);
        }
      }

      // 2. Categories & Products
      const [fetchedCategories, fetchedProducts] = await Promise.all([
        categoryService.getAll().catch((err) => {
          console.warn('Error loading categories:', err);
          return ['General', 'Cortinería', 'Telas & Tapicería', 'Decoración', 'Accesorios', 'Blanquería'];
        }),
        productService.getAll().catch((err) => {
          console.warn('Error loading products:', err);
          return [];
        }),
      ]);

      setCategories(fetchedCategories);
      setProducts(fetchedProducts);

      // 3. Sales, Stock movements & Parked tickets
      const [fetchedSales, fetchedStockMovements, fetchedParked] = await Promise.all([
        saleService.getAll().catch((err) => {
          console.warn('Error loading sales:', err);
          return [];
        }),
        stockMovementService.getAll().catch((err) => {
          console.warn('Error loading stock movements:', err);
          return [];
        }),
        parkedTicketService.getAll().catch((err) => {
          console.warn('Error loading parked tickets:', err);
          return [];
        }),
      ]);

      setSales(fetchedSales);
      setStockMovements(fetchedStockMovements);
      setParkedTickets(fetchedParked);

      // 4. Cash shifts & Movements
      const [fetchedShifts, activeShiftData, fetchedMovements] = await Promise.all([
        cashShiftService.getAll().catch((err) => {
          console.warn('Error loading cash shifts:', err);
          return [];
        }),
        cashShiftService.getActive().catch((err) => {
          console.warn('Error loading active shift:', err);
          return null;
        }),
        cashShiftService.getAllMovements().catch((err) => {
          console.warn('Error loading cash movements:', err);
          return [];
        }),
      ]);

      setShiftsHistory(fetchedShifts.filter((s) => s.status === 'CERRADA'));
      setActiveShift(activeShiftData);
      setCashMovements(fetchedMovements);

      // 5. Fixed Expenses & Alerts
      const [fetchedExpenses, fetchedAlerts] = await Promise.all([
        fixedExpenseService.getAll().catch((err) => {
          console.warn('Error loading expenses:', err);
          return [];
        }),
        appAlertService.getAll().catch((err) => {
          console.warn('Error loading alerts:', err);
          return [];
        }),
      ]);

      setExpenses(fetchedExpenses);
      setAlerts(fetchedAlerts);
      setIsSupabaseConnected(true);
    } catch (error) {
      console.error('Failed to load complete dataset from Supabase:', error);
      setIsSupabaseConnected(false);
      showToast('No se pudo sincronizar con Supabase. Verifique la conexión.', 'warning');
    } finally {
      setIsLoadingData(false);
    }
  }, [showToast]);

  // ==========================================
  // SESIÓN DE LA TERMINAL (SUPABASE AUTH)
  // ==========================================

  useEffect(() => {
    let activo = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!activo) return;
        setHasTerminalSession(Boolean(data.session));
        setTerminalEmail(data.session?.user?.email ?? null);
        setTerminalRole((data.session?.user?.app_metadata as Record<string, unknown> | undefined)?.role as string ?? null);
      })
      .catch((e) => {
        console.error('No se pudo leer la sesión de la terminal:', e);
      })
      .finally(() => {
        if (activo) setIsCheckingTerminalSession(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasTerminalSession(Boolean(session));
      setTerminalEmail(session?.user?.email ?? null);
      setTerminalRole((session?.user?.app_metadata as Record<string, unknown> | undefined)?.role as string ?? null);
    });

    return () => {
      activo = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // ==========================================
  // ESTADO DE PAGO DEL COMERCIO
  // ==========================================
  //
  // La terminal superadmin (el operador de la plataforma) nunca se
  // autobloquea por esto — este chequeo es para que un comercio CLIENTE
  // deje de poder entrar si su cuenta quedó SUSPENDIDO.
  useEffect(() => {
    if (!hasTerminalSession) {
      setIsCheckingStoreStatus(false);
      return;
    }
    if (terminalRole === 'superadmin') {
      setIsCheckingStoreStatus(false);
      setIsStoreSuspended(false);
      return;
    }

    let activo = true;
    setIsCheckingStoreStatus(true);
    storeTenantService
      .getOwnStoreStatus()
      .then((res) => {
        if (!activo) return;
        setIsStoreSuspended(res?.status === 'SUSPENDIDO');
      })
      .catch((e) => {
        console.error('No se pudo verificar el estado de pago del comercio:', e);
      })
      .finally(() => {
        if (activo) setIsCheckingStoreStatus(false);
      });

    return () => {
      activo = false;
    };
  }, [hasTerminalSession, terminalRole]);

  const signInTerminal = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.warn('Fallo el acceso de terminal:', error.message);
        const esCredencial = /invalid login credentials/i.test(error.message);
        return {
          success: false,
          message: esCredencial
            ? 'Correo o contraseña incorrectos.'
            : `No se pudo conectar: ${error.message}`,
        };
      }

      setHasTerminalSession(Boolean(data.session));
      setTerminalEmail(data.session?.user?.email ?? null);
      return { success: true, message: 'Terminal activada' };
    },
    []
  );

  const signOutTerminal = useCallback(async () => {
    await supabase.auth.signOut();
    setHasTerminalSession(false);
    setTerminalEmail(null);
    setCurrentUser(null);
    setIsLoginModalOpen(true);
  }, []);

  /**
   * Envía el comprobante de una venta por email.
   *
   * El envío en sí lo hace una Edge Function (send-receipt-email): la clave
   * de Resend no puede vivir en el navegador, porque cualquiera que abra la
   * consola (F12) del cliente podría leerla y mandar correo en nombre del
   * negocio. Acá sólo se arma el pedido con los mismos datos que ya se
   * muestran en el comprobante en pantalla (storeInfo, ya cargado).
   */
  const sendReceiptEmail = useCallback(
    async (email: string, sale: Sale): Promise<{ success: boolean; message: string }> => {
      const { data, error } = await supabase.functions.invoke('send-receipt-email', {
        body: { to: email, sale, storeInfo },
      });

      if (error) {
        console.error('Error invocando send-receipt-email:', error);
        return { success: false, message: 'No se pudo enviar el comprobante. Probá de nuevo.' };
      }
      if (!data?.success) {
        console.error('send-receipt-email respondió sin éxito:', data);
        return { success: false, message: data?.error || 'No se pudo enviar el comprobante.' };
      }

      return { success: true, message: `Comprobante enviado a ${email}` };
    },
    [storeInfo]
  );

  // Los datos se piden recién cuando hay sesión: sin ella el RLS los rechaza.
  useEffect(() => {
    if (!hasTerminalSession) {
      setIsLoadingData(false);
      return;
    }
    loadAllDataFromSupabase();
  }, [hasTerminalSession, loadAllDataFromSupabase]);

  // ==========================================
  // REALTIME SUBSCRIPTIONS
  // ==========================================

  // Mientras se audita otro comercio, estas suscripciones siguen escuchando
  // los cambios del comercio del OPERADOR (su sesión de Supabase nunca
  // cambia). Sin este freno, una venta real en la propia caja del operador
  // pisaría en pantalla los datos del cliente auditado con los suyos. Es un
  // ref (no una dependencia del efecto) para no reconectar el canal cada vez
  // que se entra/sale del modo auditoría.
  const isImpersonatingRef = useRef(isImpersonating);
  useEffect(() => {
    isImpersonatingRef.current = isImpersonating;
  }, [isImpersonating]);

  useEffect(() => {
    if (!hasTerminalSession) return;

    const channel = supabase
      .channel('nexus-db-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        async () => {
          if (isImpersonatingRef.current) return;
          try {
            const freshProducts = await productService.getAll();
            setProducts(freshProducts);
          } catch (e) {
            console.error('Realtime products refresh error:', e);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        async () => {
          if (isImpersonatingRef.current) return;
          try {
            const freshSales = await saleService.getAll();
            setSales(freshSales);
          } catch (e) {
            console.error('Realtime sales refresh error:', e);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cash_shifts' },
        async () => {
          if (isImpersonatingRef.current) return;
          try {
            const [freshShifts, freshActive] = await Promise.all([
              cashShiftService.getAll(),
              cashShiftService.getActive(),
            ]);
            setShiftsHistory(freshShifts.filter((s) => s.status === 'CERRADA'));
            setActiveShift(freshActive);
          } catch (e) {
            console.error('Realtime shifts refresh error:', e);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fixed_expenses' },
        async () => {
          if (isImpersonatingRef.current) return;
          try {
            const freshExpenses = await fixedExpenseService.getAll();
            setExpenses(freshExpenses);
          } catch (e) {
            console.error('Realtime expenses refresh error:', e);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store_settings' },
        async () => {
          if (isImpersonatingRef.current) return;
          try {
            const freshSettings = await storeSettingsService.get();
            setStoreInfo(freshSettings);
          } catch (e) {
            console.error('Realtime settings refresh error:', e);
          }
        }
      )
      // Tickets aparcados: si una caja deja un pedido en espera, la otra tiene
      // que poder retomarlo. Sin esto sólo se veían los del arranque.
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'parked_tickets' },
        async () => {
          if (isImpersonatingRef.current) return;
          try {
            const freshParked = await parkedTicketService.getAll();
            setParkedTickets(freshParked);
          } catch (e) {
            console.error('Realtime parked tickets refresh error:', e);
          }
        }
      )
      // Entradas y retiros de efectivo: afectan el arqueo del turno, que es
      // compartido entre las cajas abiertas.
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cash_movements' },
        async () => {
          if (isImpersonatingRef.current) return;
          try {
            const freshMovements = await cashShiftService.getAllMovements();
            setCashMovements(freshMovements);
          } catch (e) {
            console.error('Realtime cash movements refresh error:', e);
          }
        }
      )
      .subscribe((status) => {
        // Antes esto se suscribía en silencio: si el canal no conectaba, la app
        // seguía andando con datos viejos y nadie se enteraba.
        if (status === 'SUBSCRIBED') {
          console.info('Sincronización en tiempo real activa.');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Sincronización en tiempo real no disponible:', status);
          showToast(
            'Sin sincronización en vivo: los cambios de otras cajas pueden tardar en verse.',
            'warning'
          );
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hasTerminalSession, showToast]);

  // Unread alerts count
  const unreadAlertsCount = useMemo(() => {
    return alerts.filter((a) => !a.read).length;
  }, [alerts]);

  // Derived low stock products
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.stock <= p.minStock);
  }, [products]);

  const canAccessView = (view: ActiveView): boolean => {
    if (!currentUser) return false;
    // Empleados/PIN del comercio auditado no forman parte del snapshot de
    // "Asistir a este Negocio" (dato sensible, fuera de alcance) — sin esto
    // se seguiría viendo el staff propio del operador bajo el cartel de
    // "viendo a otro comercio".
    if (isImpersonating && view === 'employees') return false;
    if (currentUser.role === 'SUPERADMIN' || isSupportMode) return true;
    if (currentUser.role === 'DUEÑO') {
      return view !== 'master_portal';
    }
    // CAJERO (Empleado)
    if (view === 'pos' || view === 'cash_register') return true;
    if (view === 'inventory' && currentUser.canManageInventory) return true;
    return false;
  };

  const setActiveView = (view: ActiveView) => {
    // Volver al Portal Maestro es la forma limpia de "salir" del modo
    // auditoría — si no se hiciera esto, las tarjetas de comercio del Portal
    // mostrarían de rebote los números del comercio auditado en vez de los
    // propios (isImpersonating seguiría activo aunque se navegue afuera).
    if (isImpersonating && view === 'master_portal') {
      exitImpersonation();
      return;
    }
    if (currentUser && !canAccessView(view)) {
      showToast('Acceso restringido: Esta sección no está habilitada para tu perfil', 'warning');
      setActiveViewRaw(currentUser.role === 'DUEÑO' ? 'dashboard' : 'pos');
      return;
    }
    setActiveViewRaw(view);
  };

  /**
   * "Asistir a este Negocio" es de sólo lectura. Sin este chequeo, cada
   * alta/edición/baja seguiría escribiendo de verdad — pero en el comercio
   * del OPERADOR, no en el del cliente que se está mirando, porque la sesión
   * de Supabase nunca cambia (ver impersonateStore). Eso corrompería datos
   * del operador en silencio (ventas fantasma, configuración pisada) sin que
   * nadie se dé cuenta, ya que la pantalla sigue mostrando el nombre del
   * cliente. Se llama al principio de cada función que escribe, mismo
   * patrón que ya usan los chequeos de permiso de deleteProduct/refundSale.
   */
  const blockIfImpersonating = (): boolean => {
    if (!isImpersonating) return false;
    showToast(
      'Modo sólo lectura: no se pueden hacer cambios mientras se audita otro comercio.',
      'warning',
      { title: 'Modo Auditoría de Tienda' }
    );
    return true;
  };

  // ==========================================
  // AUTH FUNCTIONS
  // ==========================================

  /**
   * Verifica el PIN de un usuario contra el hash almacenado.
   *
   * Migración transparente: si la fila todavía guarda el PIN en texto plano
   * (instalaciones anteriores a esta versión), lo compara una única vez y
   * lo reemplaza por su hash en la base. Nadie tiene que reingresar su PIN.
   */
  const verifyUserPin = async (targetUser: User, pin: string): Promise<boolean> => {
    if (isHashed(targetUser.pin)) {
      return verifySecret(pin, targetUser.pin);
    }

    if (targetUser.pin !== pin) return false;

    try {
      const hashed = await hashSecret(pin);
      await userService.updatePin(targetUser.id, hashed);
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? { ...u, pin: hashed } : u)));
    } catch (e) {
      console.error('No se pudo migrar el PIN a formato hash:', e);
    }
    return true;
  };

  const login = async (userId: string, pin: string): Promise<boolean> => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) {
      showToast('Usuario no encontrado', 'error');
      return false;
    }
    if (!(await verifyUserPin(targetUser, pin))) {
      showToast('PIN incorrecto', 'error');
      return false;
    }

    setCurrentUser(targetUser);
    setIsLoginModalOpen(false);
    showToast(`Bienvenido/a, ${targetUser.name} (${targetUser.roleTitle})`, 'success');

    if (targetUser.role === 'SUPERADMIN') {
      setIsSupportMode(true);
      setActiveViewRaw('master_portal');
    } else if (targetUser.role === 'DUEÑO') {
      setActiveViewRaw('dashboard');
    } else {
      setActiveViewRaw('pos');
    }
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    setIsSupportMode(false);
    try {
      sessionStorage.removeItem('rioja_support_mode');
    } catch (e) {
      console.error(e);
    }
    setIsLoginModalOpen(true);
    showToast('Sesión cerrada correctamente', 'info');
  };

  const switchUser = async (userId: string, pin: string): Promise<boolean> => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) {
      showToast('Usuario no encontrado', 'error');
      return false;
    }
    if (!(await verifyUserPin(targetUser, pin))) {
      showToast('PIN incorrecto', 'error');
      return false;
    }

    setCurrentUser(targetUser);
    setIsLoginModalOpen(false);
    showToast(`Sesión cambiada a ${targetUser.name}`, 'info');
    if (targetUser.role === 'SUPERADMIN') {
      setIsSupportMode(true);
      setActiveViewRaw('master_portal');
    } else if (targetUser.role === 'DUEÑO') {
      if (activeView === 'pos' && cart.length === 0) {
        setActiveViewRaw('dashboard');
      }
    } else {
      if (!canAccessView(activeView)) {
        setActiveViewRaw('pos');
      }
    }
    return true;
  };

  /**
   * Solicita un cambio de usuario. NO cambia la sesión por sí solo: abre la
   * pantalla de PIN con el usuario preseleccionado.
   *
   * Antes existía un `switchUserDirect` que cambiaba de sesión sin pedir PIN,
   * con lo cual cualquiera parado frente a la caja podía pasar de Cajero a
   * Dueño desde el menú del navbar. Eso era una escalada de privilegios.
   */
  const requestUserSwitch = (userId: string): void => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) {
      showToast('Usuario no encontrado', 'error');
      return;
    }
    setPendingSwitchUserId(userId);
    setIsLoginModalOpen(true);
  };

  const clearPendingSwitch = useCallback(() => setPendingSwitchUserId(null), []);

  /**
   * Paso 1 del restablecimiento de PIN: identifica al usuario por su email.
   *
   * Antes esto generaba un código de 6 dígitos y lo mostraba en pantalla (y el
   * modal lo autocompletaba), de modo que cualquiera parado frente a la caja
   * podía restablecer el PIN del Dueño en segundos. Como no hay backend de
   * correo, el código se eliminó: ahora el reset se autoriza con la contraseña
   * maestra, que sí es un secreto que el atacante no tiene.
   */
  const requestPinRecovery = (
    email: string
  ): { success: boolean; user?: User; message: string } => {
    const cleanEmail = email.trim().toLowerCase();
    const targetUser = users.find((u) => u.email && u.email.toLowerCase() === cleanEmail);

    if (!targetUser) {
      return {
        success: false,
        message: 'No se encontró ninguna cuenta asociada a este correo electrónico.',
      };
    }

    if (!IS_MASTER_ACCESS_CONFIGURED) {
      return {
        success: false,
        message:
          'El restablecimiento de PIN requiere la contraseña maestra, que no está configurada en esta instalación. ' +
          'Pedile al Dueño que cambie el PIN desde el módulo Empleados.',
      };
    }

    return {
      success: true,
      user: targetUser,
      message: `Para restablecer el PIN de ${targetUser.name} ingresá la contraseña maestra del sistema.`,
    };
  };

  /**
   * Paso 2: aplica el PIN nuevo, autorizado con la contraseña maestra.
   * El PIN se guarda siempre hasheado.
   */
  const resetPinWithMasterPassword = async (
    email: string,
    masterPassword: string,
    newPin: string
  ): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPin = newPin.trim();

    if (cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
      return {
        success: false,
        message: 'El nuevo PIN debe contener exactamente 4 dígitos numéricos.',
      };
    }

    if (!IS_MASTER_ACCESS_CONFIGURED) {
      return { success: false, message: MASTER_NOT_CONFIGURED_MESSAGE };
    }

    const authorized = await verifySecret(masterPassword.trim(), MASTER_PASSWORD_HASH);
    if (!authorized) {
      return {
        success: false,
        message: 'Contraseña maestra incorrecta. El PIN no fue modificado.',
      };
    }

    const targetUser = users.find((u) => u.email && u.email.toLowerCase() === cleanEmail);
    if (!targetUser) {
      return {
        success: false,
        message: 'Usuario no encontrado para aplicar el nuevo PIN.',
      };
    }

    let hashedPin: string;
    try {
      hashedPin = await hashSecret(cleanPin);
    } catch (e) {
      console.error('Error hasheando el PIN:', e);
      return { success: false, message: 'No se pudo procesar el PIN de forma segura.' };
    }

    try {
      await userService.updatePin(targetUser.id, hashedPin);
    } catch (e) {
      console.error('Error updating pin in Supabase:', e);
      return {
        success: false,
        message: 'No se pudo guardar el nuevo PIN en el servidor. Intentá de nuevo.',
      };
    }

    setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? { ...u, pin: hashedPin } : u)));

    if (currentUser?.id === targetUser.id) {
      setCurrentUser((prev) => (prev ? { ...prev, pin: hashedPin } : null));
    }

    showToast(`PIN restablecido con éxito para ${targetUser.name}.`, 'success');
    return {
      success: true,
      message: 'PIN actualizado exitosamente.',
    };
  };

  const updateUserPin = async (userId: string, newPin: string): Promise<boolean> => {
    if (blockIfImpersonating()) return false;
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      showToast('El PIN debe tener 4 dígitos numéricos', 'error');
      return false;
    }

    let hashedPin: string;
    try {
      hashedPin = await hashSecret(newPin);
    } catch (e) {
      console.error('Error hasheando el PIN:', e);
      showToast('No se pudo procesar el PIN de forma segura', 'error');
      return false;
    }

    try {
      await userService.updatePin(userId, hashedPin);
    } catch (e) {
      console.error('Error updating PIN in Supabase:', e);
      showToast('Error al actualizar PIN en el servidor', 'error');
      return false;
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, pin: hashedPin } : u))
    );

    if (currentUser?.id === userId) {
      setCurrentUser((prev) => (prev ? { ...prev, pin: hashedPin } : null));
    }

    showToast('PIN de seguridad actualizado correctamente', 'success');
    return true;
  };

  const addUser = async (userData: Omit<User, 'id' | 'initials'>) => {
    if (blockIfImpersonating()) return;
    const initials = userData.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);

    if (!/^\d{4}$/.test(userData.pin || '')) {
      showToast('El PIN debe tener 4 dígitos numéricos', 'error');
      return;
    }

    let hashedPin: string;
    try {
      hashedPin = await hashSecret(userData.pin);
    } catch (e) {
      console.error('Error hasheando el PIN:', e);
      showToast('No se pudo procesar el PIN de forma segura', 'error');
      return;
    }

    const newUser: User = {
      ...userData,
      pin: hashedPin,
      id: `usr-${Date.now()}`,
      initials: initials || 'U',
      avatarUrl: userData.avatarUrl || '',
    };

    try {
      const created = await userService.create(newUser);
      setUsers((prev) => [...prev, created]);
      showToast(`Empleado ${created.name} registrado con éxito`, 'success');
    } catch (e) {
      console.error('Error inserting user to Supabase:', e);
      setUsers((prev) => [...prev, newUser]);
      showToast(`Empleado registrado localmente`, 'warning');
    }
  };

  const updateUser = async (id: string, userData: Partial<User>) => {
    if (blockIfImpersonating()) return;
    // El PIN nunca se actualiza por esta vía: usá updateUserPin, que lo hashea.
    const { pin, ...safeUserData } = userData;
    if (pin !== undefined && !isHashed(pin)) {
      console.warn('updateUser recibió un PIN en texto plano: se ignoró. Usá updateUserPin.');
    }

    try {
      await userService.update(id, safeUserData);
    } catch (e) {
      console.error('Error updating user in Supabase:', e);
    }

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const updated = { ...u, ...userData };
          if (userData.name) {
            updated.initials = userData.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .substring(0, 2);
          }
          return updated;
        }
        return u;
      })
    );

    if (currentUser?.id === id) {
      setCurrentUser((prev) => (prev ? { ...prev, ...userData } : null));
    }

    showToast('Datos de usuario actualizados correctamente', 'success');
  };

  const deleteUser = async (id: string): Promise<boolean> => {
    if (blockIfImpersonating()) return false;
    if (!currentUser || currentUser.role !== 'DUEÑO') {
      showToast('Solo el dueño puede eliminar cuentas de usuario', 'error');
      return false;
    }

    if (currentUser.id === id) {
      showToast('No puedes eliminar tu propia cuenta de dueño en sesión activa', 'warning');
      return false;
    }

    const targetUser = users.find((u) => u.id === id);
    if (!targetUser) return false;

    try {
      await userService.delete(id);
    } catch (e) {
      console.error('Error deleting user in Supabase:', e);
    }

    setUsers((prev) => prev.filter((u) => u.id !== id));
    showToast(`Empleado ${targetUser.name} eliminado del sistema`, 'info');
    return true;
  };

  // ==========================================
  // CASH SHIFT OPERATIONS
  // ==========================================

  const openCashShift = async (initialCash: number, notes?: string): Promise<boolean> => {
    if (blockIfImpersonating()) return false;
    if (!currentUser) return false;
    if (activeShift && activeShift.status === 'ABIERTA') {
      showToast('Ya existe un turno de caja abierto', 'warning');
      return false;
    }

    const newShift: CashShift = {
      id: `shift-${Date.now()}`,
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      openedAt: new Date().toISOString(),
      status: 'ABIERTA',
      initialCash: Number(initialCash) || 0,
      cashSales: 0,
      cardSales: 0,
      transferSales: 0,
      totalIn: 0,
      totalOut: 0,
      expectedCash: Number(initialCash) || 0,
      notes: notes || '',
    };

    try {
      const created = await cashShiftService.openShift(newShift);
      setActiveShift(created);
    } catch (e) {
      console.error('Error opening shift in Supabase:', e);
      setActiveShift(newShift);
    }

    showToast(`Caja abierta con fondo inicial de $${Number(initialCash).toFixed(2)}`, 'success');
    return true;
  };

  const addCashMovement = async (type: 'ENTRADA' | 'RETIRO', amount: number, reason: string): Promise<boolean> => {
    if (blockIfImpersonating()) return false;
    if (!activeShift || activeShift.status !== 'ABIERTA') {
      showToast('Debes tener la caja abierta para registrar movimientos', 'error');
      return false;
    }
    if (amount <= 0) {
      showToast('El monto debe ser mayor a 0', 'error');
      return false;
    }
    if (!reason.trim()) {
      showToast('El motivo es obligatorio', 'error');
      return false;
    }

    const movement: CashMovement = {
      id: `mov-${Date.now()}`,
      shiftId: activeShift.id,
      timestamp: new Date().toISOString(),
      type,
      amount,
      reason: reason.trim(),
      cashierName: currentUser?.name || 'Cajero',
    };

    const newIn = type === 'ENTRADA' ? activeShift.totalIn + amount : activeShift.totalIn;
    const newOut = type === 'RETIRO' ? activeShift.totalOut + amount : activeShift.totalOut;
    const newExpected = activeShift.initialCash + activeShift.cashSales + newIn - newOut;

    try {
      await Promise.all([
        cashShiftService.addMovement(movement),
        cashShiftService.updateShift(activeShift.id, {
          totalIn: newIn,
          totalOut: newOut,
          expectedCash: newExpected,
        }),
      ]);
    } catch (e) {
      console.error('Error saving cash movement in Supabase:', e);
    }

    setCashMovements((prev) => [movement, ...prev]);
    setActiveShift((prev) => (prev ? { ...prev, totalIn: newIn, totalOut: newOut, expectedCash: newExpected } : null));

    showToast(`${type === 'ENTRADA' ? 'Ingreso' : 'Retiro'} de $${amount.toFixed(2)} registrado`, 'info');
    return true;
  };

  const closeCashShift = async (countedCash: number, notes?: string): Promise<boolean> => {
    if (blockIfImpersonating()) return false;
    if (!activeShift || activeShift.status !== 'ABIERTA') {
      showToast('No hay una caja abierta para cerrar', 'error');
      return false;
    }

    const expected = activeShift.expectedCash;
    const diff = Number(countedCash) - expected;
    const closedAt = new Date().toISOString();

    const closedShift: CashShift = {
      ...activeShift,
      closedAt,
      status: 'CERRADA',
      countedCash: Number(countedCash),
      difference: diff,
      notes: notes || activeShift.notes,
    };

    try {
      await cashShiftService.updateShift(activeShift.id, {
        closedAt,
        status: 'CERRADA',
        countedCash: Number(countedCash),
        difference: diff,
        notes: notes || activeShift.notes,
      });
    } catch (e) {
      console.error('Error closing cash shift in Supabase:', e);
    }

    setShiftsHistory((prev) => [closedShift, ...prev]);
    setActiveShift(null);

    // If difference is significant, create an alert
    if (Math.abs(diff) > 0.01) {
      const isShortage = diff < 0;
      const diffAlert: AppAlert = {
        id: `alt-${Date.now()}`,
        type: 'CAJA_DIFERENCIA',
        title: `Caja cerrada con ${isShortage ? 'faltante' : 'sobrante'}`,
        message: `Turno de ${closedShift.cashierName}: diferencia de ${isShortage ? '-' : '+'}$${Math.abs(diff).toFixed(2)} (Esperado: $${expected.toFixed(2)}, Contado: $${Number(countedCash).toFixed(2)})`,
        timestamp: 'Recién',
        read: false,
        actionRoute: 'cash_register',
        actionLabel: 'AUDITAR',
        severity: 'info',
      };

      try {
        await appAlertService.create(diffAlert);
      } catch (e) {
        console.error('Error saving shift alert in Supabase:', e);
      }

      setAlerts((prev) => [diffAlert, ...prev]);
    }

    showToast(`Caja cerrada exitosamente. Diferencia: ${diff >= 0 ? '+' : ''}$${diff.toFixed(2)}`, 'success');
    return true;
  };

  // ==========================================
  // CART CALCULATIONS
  // ==========================================

  const { cartSubtotal, cartDiscountAmount, cartTax, cartTotal } = useMemo(() => {
    const rawSubtotal = cart.reduce((sum, item) => {
      const itemPrice = item.product.salePrice * item.quantity;
      const itemDisc = item.discountPercent ? (itemPrice * item.discountPercent) / 100 : (item.discountAmount || 0);
      return sum + Math.max(0, itemPrice - itemDisc);
    }, 0);

    const orderDisc = (rawSubtotal * orderDiscountPercent) / 100;
    const subtotalAfterDisc = Math.max(0, rawSubtotal - orderDisc);
    const tax = subtotalAfterDisc * (taxPercent / 100);
    const total = subtotalAfterDisc + tax;

    return {
      cartSubtotal: Number(rawSubtotal.toFixed(2)),
      cartDiscountAmount: Number(orderDisc.toFixed(2)),
      cartTax: Number(tax.toFixed(2)),
      cartTotal: Number(total.toFixed(2)),
    };
  }, [cart, orderDiscountPercent, taxPercent]);

  // Cart Actions
  const addToCart = useCallback((product: Product) => {
    if (product.stock <= 0) {
      showToast(`"${product.name}" está agotado`, 'error');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          showToast(`No hay más stock disponible (${product.stock} u.)`, 'warning');
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, [showToast]);

  const scanBarcodeOrSku = useCallback((code: string): { success: boolean; product?: Product; error?: string } => {
    const clean = code.trim();
    if (!clean) return { success: false, error: 'Código vacío' };

    let found = products.find((p) => p.barcode && p.barcode.trim().toLowerCase() === clean.toLowerCase());

    if (!found) {
      found = products.find((p) => p.sku && p.sku.trim().toLowerCase() === clean.toLowerCase());
    }

    if (!found) {
      found = products.find((p) => p.name.trim().toLowerCase() === clean.toLowerCase());
    }

    if (!found) {
      const candidates = products.filter(
        (p) =>
          (p.barcode && p.barcode.includes(clean)) ||
          p.sku.toLowerCase().includes(clean.toLowerCase())
      );
      if (candidates.length === 1) {
        found = candidates[0];
      }
    }

    if (!found) {
      sounds.playErrorBeep();
      showToast(`Código o SKU no encontrado: "${clean}"`, 'error');
      return { success: false, error: 'No encontrado' };
    }

    if (found.stock <= 0) {
      sounds.playErrorBeep();
      showToast(`⚠️ "${found.name}" está agotado (0 u. en stock)`, 'warning');
      return { success: false, product: found, error: 'Agotado' };
    }

    addToCart(found);
    sounds.playScannerBeep();
    showToast(`✓ ${found.name} agregado al carrito ($${found.salePrice.toFixed(2)})`, 'success');
    return { success: true, product: found };
  }, [products, addToCart, showToast]);

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      const item = prev.find((i) => i.product.id === productId);
      if (!item) return prev;

      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return prev.filter((i) => i.product.id !== productId);
      }
      if (newQty > item.product.stock) {
        showToast(`Stock máximo alcanzado (${item.product.stock} u.)`, 'warning');
        return prev;
      }
      return prev.map((i) => (i.product.id === productId ? { ...i, quantity: newQty } : i));
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setOrderDiscountPercent(0);
  };

  // ==========================================
  // PARK TICKETS
  // ==========================================

  const parkCurrentTicket = async (customerName?: string, notes?: string): Promise<boolean> => {
    if (cart.length === 0) {
      showToast('El carrito está vacío para guardar en espera', 'warning');
      return false;
    }

    const newTicket: ParkedTicket = {
      id: `parked-${Date.now()}`,
      customerName: customerName?.trim() || `Ticket #${parkedTickets.length + 1}`,
      items: [...cart],
      timestamp: new Date().toISOString(),
      cashierName: currentUser?.name || 'Cajero',
      notes: notes || '',
    };

    try {
      await parkedTicketService.create(newTicket);
    } catch (e) {
      console.error('Error saving parked ticket in Supabase:', e);
    }

    setParkedTickets((prev) => [...prev, newTicket]);
    clearCart();
    showToast(`Venta puesta en espera (${newTicket.customerName})`, 'info');
    return true;
  };

  const resumeParkedTicket = async (ticketId: string) => {
    const target = parkedTickets.find((t) => t.id === ticketId);
    if (!target) return;

    if (cart.length > 0) {
      showToast('Ya tienes productos en el carrito. Vacíalo o guárdalo antes.', 'warning');
      return;
    }

    try {
      await parkedTicketService.delete(ticketId);
    } catch (e) {
      console.error('Error deleting parked ticket from Supabase:', e);
    }

    setCart(target.items);
    setParkedTickets((prev) => prev.filter((t) => t.id !== ticketId));
    showToast(`Venta reanudada (${target.customerName})`, 'success');
  };

  const deleteParkedTicket = async (ticketId: string) => {
    if (blockIfImpersonating()) return;
    try {
      await parkedTicketService.delete(ticketId);
    } catch (e) {
      console.error('Error deleting parked ticket from Supabase:', e);
    }

    setParkedTickets((prev) => prev.filter((t) => t.id !== ticketId));
    showToast('Venta en espera eliminada', 'info');
  };

  // ==========================================
  // CONFIRM SALE (Core atomic flow connected to Supabase)
  // ==========================================

  const confirmSale = async (payment: {
    method: PaymentMethodType;
    breakdown: PaymentDetail[];
    amountReceived?: number;
    notes?: string;
  }): Promise<Sale | null> => {
    if (blockIfImpersonating()) return null;
    if (!currentUser) {
      showToast('Debes iniciar sesión para cobrar', 'error');
      return null;
    }
    if (!activeShift || activeShift.status !== 'ABIERTA') {
      showToast('Caja cerrada: Debes abrir la caja para poder cobrar', 'error');
      return null;
    }
    if (cart.length === 0) {
      showToast('El carrito está vacío', 'warning');
      return null;
    }

    // Check stock availability
    for (const item of cart) {
      const prod = products.find((p) => p.id === item.product.id);
      if (!prod || prod.stock < item.quantity) {
        showToast(`Stock insuficiente para "${item.product.name}"`, 'error');
        return null;
      }
    }

    // El número de ticket lo entrega la base (secuencia atómica). Se pide antes
    // de tocar nada: si no hay conexión, la venta no arranca en vez de generar
    // un número que podría chocar con el de otra caja.
    let ticketNumber: string;
    try {
      ticketNumber = await saleService.getNextTicketNumber();
    } catch (e) {
      console.error('No se pudo obtener el número de ticket:', e);
      showToast(
        'No se pudo conectar con el servidor para numerar el ticket. Revisá la conexión e intentá de nuevo.',
        'error'
      );
      return null;
    }

    const timestamp = new Date().toISOString();

    const saleItems: SaleItem[] = cart.map((item) => {
      const itemPrice = item.product.salePrice * item.quantity;
      const itemDisc = item.discountPercent ? (itemPrice * item.discountPercent) / 100 : (item.discountAmount || 0);
      const totalItem = Math.max(0, itemPrice - itemDisc);
      return {
        productId: item.product.id,
        productName: item.product.name,
        sku: item.product.sku,
        quantity: item.quantity,
        unitPrice: item.product.salePrice,
        unitCost: item.product.costPrice,
        discount: itemDisc,
        total: totalItem,
      };
    });

    const changeGiven = payment.amountReceived && payment.amountReceived > cartTotal
      ? Number((payment.amountReceived - cartTotal).toFixed(2))
      : 0;

    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      ticketNumber,
      timestamp,
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      shiftId: activeShift.id,
      items: saleItems,
      subtotal: cartSubtotal,
      discountTotal: cartDiscountAmount,
      discountAppliedBy: orderDiscountPercent > 0 ? `${currentUser.name} (${orderDiscountPercent}%)` : undefined,
      tax: cartTax,
      total: cartTotal,
      paymentMethod: payment.method,
      paymentBreakdown: payment.breakdown,
      amountReceived: payment.amountReceived,
      changeGiven,
      status: 'COMPLETADA',
      notes: payment.notes,
    };

    // 1. Deduct stock atomically and log movements
    const updatedProducts = [...products];
    const newStockMovements: StockMovement[] = [];
    const triggeredAlerts: AppAlert[] = [];
    const productsWarningTriggered: { product: Product; stock: number }[] = [];

    cart.forEach((item) => {
      const prodIdx = updatedProducts.findIndex((p) => p.id === item.product.id);
      if (prodIdx >= 0) {
        const prevStock = updatedProducts[prodIdx].stock;
        const newStock = Math.max(0, prevStock - item.quantity);
        const prod = updatedProducts[prodIdx];

        updatedProducts[prodIdx] = {
          ...prod,
          stock: newStock,
        };

        const movement: StockMovement = {
          id: `stk-${Date.now()}-${item.product.id}`,
          productId: item.product.id,
          productName: item.product.name,
          timestamp,
          type: 'VENTA',
          quantityDelta: -item.quantity,
          previousStock: prevStock,
          newStock,
          reason: `Venta ${ticketNumber}`,
          userName: currentUser.name,
        };

        newStockMovements.push(movement);

        // Trigger stock alerts if threshold breached or reached zero
        if (newStock === 0) {
          triggeredAlerts.push({
            id: `alt-out-${Date.now()}-${item.product.id}`,
            type: 'STOCK_AGOTADO',
            title: `Producto Agotado: ${item.product.name}`,
            message: `El producto se quedó sin unidades tras la venta ${ticketNumber}.`,
            timestamp: 'Recién',
            read: false,
            actionRoute: 'inventory',
            actionLabel: 'REPONER',
            productId: item.product.id,
            productName: item.product.name,
            productSku: prod.sku,
            productImage: prod.imageUrl,
            currentStock: 0,
            minStock: prod.minStock,
            category: prod.category,
            severity: 'critical',
          });
          productsWarningTriggered.push({ product: prod, stock: 0 });
        } else if (newStock <= prod.minStock && prevStock > prod.minStock) {
          triggeredAlerts.push({
            id: `alt-low-${Date.now()}-${item.product.id}`,
            type: 'STOCK_BAJO',
            title: `Stock Crítico: ${item.product.name}`,
            message: `Quedan solo ${newStock} unidades en góndola (Nivel mínimo: ${prod.minStock}).`,
            timestamp: 'Recién',
            read: false,
            actionRoute: 'inventory',
            actionLabel: 'REPONER',
            productId: item.product.id,
            productName: item.product.name,
            productSku: prod.sku,
            productImage: prod.imageUrl,
            currentStock: newStock,
            minStock: prod.minStock,
            category: prod.category,
            severity: 'warning',
          });
          productsWarningTriggered.push({ product: prod, stock: newStock });
        }
      }
    });

    // 2. Update active shift totals
    let cashIncrement = 0;
    let cardIncrement = 0;
    let transferIncrement = 0;

    payment.breakdown.forEach((p) => {
      if (p.method === 'EFECTIVO') cashIncrement += p.amount;
      else if (p.method === 'TARJETA') cardIncrement += p.amount;
      else if (p.method === 'TRANSFERENCIA_QR') transferIncrement += p.amount;
    });

    const newCashSales = activeShift.cashSales + cashIncrement;
    const newCardSales = activeShift.cardSales + cardIncrement;
    const newTransferSales = activeShift.transferSales + transferIncrement;
    const newExpected = activeShift.initialCash + newCashSales + activeShift.totalIn - activeShift.totalOut;

    // 3.a LA VENTA — camino crítico.
    // Antes todo esto iba en un Promise.all cuyo catch sólo hacía console.error:
    // la caja mostraba "Venta registrada", vaciaba el carrito y seguía, aunque
    // no se hubiera guardado nada. Ahora, si la venta no se guarda, no hay venta:
    // el carrito queda intacto para poder reintentar el cobro.
    try {
      await saleService.create(newSale);
    } catch (dbErr) {
      console.error('Error guardando la venta en Supabase:', dbErr);
      showToast(
        'LA VENTA NO SE GUARDÓ. No entregues el producto: revisá la conexión y volvé a cobrar.',
        'error',
        { title: 'Error al registrar la venta', isPersistent: true }
      );
      sounds.playErrorBeep();
      return null;
    }

    // 3.b Efectos secundarios — la venta YA está registrada.
    // Si algo de esto falla no se pierde la venta, pero el inventario o el
    // arqueo pueden quedar desfasados, así que hay que avisarlo en vez de
    // tragarse el error.
    const efectosSecundarios = await Promise.allSettled([
      // Descontar stock
      ...cart.map((item) => {
        const p = updatedProducts.find((x) => x.id === item.product.id);
        return p ? productService.updateStock(p.id, p.stock) : Promise.resolve();
      }),
      // Registrar los movimientos de stock
      ...newStockMovements.map((mov) => stockMovementService.create(mov)),
      // Actualizar los totales del turno
      cashShiftService.updateShift(activeShift.id, {
        cashSales: newCashSales,
        cardSales: newCardSales,
        transferSales: newTransferSales,
        expectedCash: newExpected,
      }),
      // Guardar las alertas de stock disparadas
      ...triggeredAlerts.map((alert) => appAlertService.create(alert)),
    ]);

    const fallidos = efectosSecundarios.filter((r) => r.status === 'rejected');
    if (fallidos.length > 0) {
      console.error(
        `La venta ${ticketNumber} se guardó, pero ${fallidos.length} operación(es) asociada(s) fallaron:`,
        fallidos
      );
      showToast(
        `La venta ${ticketNumber} quedó registrada, pero el stock o el arqueo pueden estar desactualizados. Revisá el inventario.`,
        'warning',
        { title: 'Venta guardada con advertencias', isPersistent: true }
      );
    }

    // 4. Update React State
    setProducts(updatedProducts);
    setStockMovements((prev) => [...newStockMovements, ...prev]);

    if (triggeredAlerts.length > 0) {
      const triggeredIds = triggeredAlerts.map((a) => a.productId).filter(Boolean);
      setAlerts((prev) => [
        ...triggeredAlerts,
        ...prev.filter((a) => !triggeredIds.includes(a.productId)),
      ]);

      productsWarningTriggered.forEach(({ product, stock }) => {
        showStockAlertToast(product, stock);
      });
    }

    setActiveShift((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        cashSales: newCashSales,
        cardSales: newCardSales,
        transferSales: newTransferSales,
        expectedCash: newExpected,
      };
    });

    setSales((prev) => [newSale, ...prev]);

    // 5. Clear cart & feedback
    clearCart();
    sounds.playSaleSuccessSound();
    showToast(`Venta ${ticketNumber} registrada ($${cartTotal.toFixed(2)})`, 'success');

    return newSale;
  };

  // ==========================================
  // REFUND / ANULACIÓN DE VENTA
  // ==========================================

  const refundSale = async (saleId: string, reason?: string): Promise<boolean> => {
    if (blockIfImpersonating()) return false;
    if (!currentUser) return false;
    if (currentUser.role !== 'DUEÑO' && !currentUser.canRefund) {
      showToast('No tienes permiso para realizar devoluciones o anular ventas', 'error');
      return false;
    }

    const sale = sales.find((s) => s.id === saleId);
    if (!sale) {
      showToast('Venta no encontrada', 'error');
      return false;
    }
    if (sale.status === 'ANULADA_DEVUELTA') {
      showToast('Esta venta ya fue anulada previamente', 'warning');
      return false;
    }

    const timestamp = new Date().toISOString();

    // 1. Restock products
    const updatedProducts = [...products];
    const newStockMovements: StockMovement[] = [];

    sale.items.forEach((item) => {
      const idx = updatedProducts.findIndex((p) => p.id === item.productId);
      if (idx >= 0) {
        const prevStock = updatedProducts[idx].stock;
        const newStock = prevStock + item.quantity;
        updatedProducts[idx] = {
          ...updatedProducts[idx],
          stock: newStock,
        };

        newStockMovements.push({
          id: `stk-ref-${Date.now()}-${item.productId}`,
          productId: item.productId,
          productName: item.productName,
          timestamp,
          type: 'DEVOLUCION',
          quantityDelta: item.quantity,
          previousStock: prevStock,
          newStock,
          reason: `Devolución ${sale.ticketNumber}: ${reason || 'Solicitud cliente'}`,
          userName: currentUser.name,
        });
      }
    });

    // 2. Adjust shift totals if active
    let cashRefund = 0;
    let cardRefund = 0;
    let transferRefund = 0;

    if (activeShift) {
      sale.paymentBreakdown.forEach((p) => {
        if (p.method === 'EFECTIVO') cashRefund += p.amount;
        else if (p.method === 'TARJETA') cardRefund += p.amount;
        else if (p.method === 'TRANSFERENCIA_QR') transferRefund += p.amount;
      });
    }

    // 3. Persist refund to Supabase
    try {
      await Promise.all([
        saleService.refund(saleId, currentUser.name, timestamp),
        ...sale.items.map((item) => {
          const p = updatedProducts.find((x) => x.id === item.productId);
          return p ? productService.updateStock(p.id, p.stock) : Promise.resolve();
        }),
        ...newStockMovements.map((mov) => stockMovementService.create(mov)),
        activeShift
          ? cashShiftService.updateShift(activeShift.id, {
              cashSales: Math.max(0, activeShift.cashSales - cashRefund),
              cardSales: Math.max(0, activeShift.cardSales - cardRefund),
              transferSales: Math.max(0, activeShift.transferSales - transferRefund),
              expectedCash:
                activeShift.initialCash +
                Math.max(0, activeShift.cashSales - cashRefund) +
                activeShift.totalIn -
                activeShift.totalOut,
            })
          : Promise.resolve(),
      ]);
    } catch (e) {
      console.error('Error refunding sale in Supabase:', e);
    }

    setProducts(updatedProducts);
    setStockMovements((prev) => [...newStockMovements, ...prev]);

    if (activeShift) {
      setActiveShift((prev) => {
        if (!prev) return null;
        const newCashSales = Math.max(0, prev.cashSales - cashRefund);
        const newCardSales = Math.max(0, prev.cardSales - cardRefund);
        const newTransferSales = Math.max(0, prev.transferSales - transferRefund);
        const newExpected = prev.initialCash + newCashSales + prev.totalIn - prev.totalOut;
        return {
          ...prev,
          cashSales: newCashSales,
          cardSales: newCardSales,
          transferSales: newTransferSales,
          expectedCash: newExpected,
        };
      });
    }

    setSales((prev) =>
      prev.map((s) =>
        s.id === saleId
          ? {
              ...s,
              status: 'ANULADA_DEVUELTA',
              refundedAt: timestamp,
              refundedBy: currentUser.name,
              notes: reason ? `${s.notes ? s.notes + ' | ' : ''}Devolución: ${reason}` : s.notes,
            }
          : s
      )
    );

    showToast(`Venta ${sale.ticketNumber} anulada y stock reintegrado`, 'success');
    return true;
  };

  // ==========================================
  // INVENTORY & PRODUCT MANAGEMENT
  // ==========================================

  const adjustStock = async (
    productId: string,
    newStock: number,
    reason: string,
    type: 'AJUSTE_MERMA' | 'AJUSTE_CONTEO' = 'AJUSTE_CONTEO'
  ) => {
    if (!currentUser) return;
    if (currentUser.role !== 'DUEÑO' && !currentUser.canManageInventory) {
      showToast('No tienes permiso para ajustar inventario', 'error');
      return;
    }

    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const previousStock = prod.stock;
    const safeNewStock = Math.max(0, newStock);
    const delta = safeNewStock - previousStock;

    const movement: StockMovement = {
      id: `stk-adj-${Date.now()}`,
      productId,
      productName: prod.name,
      timestamp: new Date().toISOString(),
      type,
      quantityDelta: delta,
      previousStock,
      newStock: safeNewStock,
      reason,
      userName: currentUser.name,
    };

    try {
      await Promise.all([
        productService.updateStock(productId, safeNewStock),
        stockMovementService.create(movement),
      ]);
    } catch (e) {
      console.error('Error adjusting stock in Supabase:', e);
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: safeNewStock } : p))
    );

    setStockMovements((prev) => [movement, ...prev]);

    if (safeNewStock <= prod.minStock) {
      const isOut = safeNewStock === 0;
      const newAlert: AppAlert = {
        id: `alt-${isOut ? 'out' : 'low'}-${Date.now()}-${prod.id}`,
        type: isOut ? 'STOCK_AGOTADO' : 'STOCK_BAJO',
        title: isOut ? `Producto Agotado: ${prod.name}` : `Stock Crítico: ${prod.name}`,
        message: isOut
          ? `Ajuste manual dejó el producto sin existencias.`
          : `Ajuste manual: quedan ${safeNewStock} u. (Mínimo: ${prod.minStock} u.).`,
        timestamp: 'Recién',
        read: false,
        actionRoute: 'inventory',
        actionLabel: 'REPONER',
        productId: prod.id,
        productName: prod.name,
        productSku: prod.sku,
        productImage: prod.imageUrl,
        currentStock: safeNewStock,
        minStock: prod.minStock,
        category: prod.category,
        severity: isOut ? 'critical' : 'warning',
      };

      try {
        await appAlertService.create(newAlert);
      } catch (e) {
        console.error('Error saving alert in Supabase:', e);
      }

      setAlerts((prev) => [newAlert, ...prev.filter((a) => a.productId !== prod.id)]);
      showStockAlertToast({ ...prod, stock: safeNewStock }, safeNewStock);
    } else {
      setAlerts((prev) => prev.filter((a) => a.productId !== prod.id));
    }

    showToast(`Stock de "${prod.name}" ajustado a ${safeNewStock} u.`, 'success');
  };

  const addStockReceipt = async (productId: string, quantityToAdd: number, reason: string) => {
    if (blockIfImpersonating()) return;
    if (!currentUser) return;
    if (currentUser.role !== 'DUEÑO' && !currentUser.canManageInventory) {
      showToast('No tienes permiso para recibir mercadería', 'error');
      return;
    }

    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const previousStock = prod.stock;
    const newStock = previousStock + quantityToAdd;

    const movement: StockMovement = {
      id: `stk-rec-${Date.now()}`,
      productId,
      productName: prod.name,
      timestamp: new Date().toISOString(),
      type: 'INGRESO',
      quantityDelta: quantityToAdd,
      previousStock,
      newStock,
      reason: reason || 'Ingreso de mercadería / Proveedor',
      userName: currentUser.name,
    };

    try {
      await Promise.all([
        productService.updateStock(productId, newStock),
        stockMovementService.create(movement),
      ]);
    } catch (e) {
      console.error('Error adding stock receipt in Supabase:', e);
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p))
    );

    setStockMovements((prev) => [movement, ...prev]);

    if (newStock > prod.minStock) {
      setAlerts((prev) => prev.filter((a) => a.productId !== prod.id && !a.message.includes(prod.name)));
    }

    showToast(`Se agregaron +${quantityToAdd} unidades a "${prod.name}"`, 'success');
  };

  const quickRestockProduct = async (productId: string, quantityToAdd: number) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const previousStock = prod.stock;
    const newStock = previousStock + quantityToAdd;

    const movement: StockMovement = {
      id: `stk-quick-${Date.now()}`,
      productId,
      productName: prod.name,
      timestamp: new Date().toISOString(),
      type: 'INGRESO',
      quantityDelta: quantityToAdd,
      previousStock,
      newStock,
      reason: 'Reposición rápida desde panel de alertas',
      userName: currentUser?.name || 'Sistema',
    };

    try {
      await Promise.all([
        productService.updateStock(productId, newStock),
        stockMovementService.create(movement),
      ]);
    } catch (e) {
      console.error('Error quick restocking in Supabase:', e);
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p))
    );

    setStockMovements((prev) => [movement, ...prev]);

    if (newStock > prod.minStock) {
      setAlerts((prev) => prev.filter((a) => a.productId !== prod.id));
    } else {
      setAlerts((prev) =>
        prev.map((a) =>
          a.productId === prod.id
            ? {
                ...a,
                currentStock: newStock,
                message: `Quedan ${newStock} u. (Mínimo recomendado: ${prod.minStock} u.).`,
              }
            : a
        )
      );
    }

    setToasts((prev) => prev.filter((t) => t.productId !== productId));

    showToast(
      `✓ Reposición exitosa: +${quantityToAdd} u. en "${prod.name}" (Stock actual: ${newStock} u.)`,
      'success'
    );
  };

  const addProduct = async (productData: Omit<Product, 'id'>) => {
    if (blockIfImpersonating()) return;
    try {
      const created = await productService.create(productData);
      setProducts((prev) => [created, ...prev]);

      if (created.stock <= created.minStock) {
        showStockAlertToast(created, created.stock);
      }

      showToast(`Producto "${created.name}" creado con éxito`, 'success');
    } catch (e) {
      console.error('Error creating product in Supabase:', e);
      showToast('Error al guardar el producto en la base de datos', 'error');
    }
  };

  const updateProduct = async (id: string, productData: Partial<Product>) => {
    if (blockIfImpersonating()) return;
    try {
      await productService.update(id, productData);
    } catch (e) {
      console.error('Error updating product in Supabase:', e);
    }

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, ...productData };
          if (updated.stock <= updated.minStock) {
            if (p.stock > p.minStock) {
              showStockAlertToast(updated, updated.stock);
            }
          } else {
            setAlerts((alertsPrev) => alertsPrev.filter((a) => a.productId !== id));
          }
          return updated;
        }
        return p;
      })
    );
    showToast('Producto actualizado correctamente', 'success');
  };

  const deleteProduct = async (id: string): Promise<boolean> => {
    if (blockIfImpersonating()) return false;
    if (!currentUser) return false;
    if (currentUser.role !== 'DUEÑO' && !currentUser.canManageInventory) {
      showToast('No tienes permiso para eliminar productos', 'error');
      return false;
    }

    const prod = products.find((p) => p.id === id);
    if (!prod) {
      showToast('Producto no encontrado', 'error');
      return false;
    }

    const delMovement: StockMovement = {
      id: `stk-del-${Date.now()}`,
      productId: id,
      productName: prod.name,
      timestamp: new Date().toISOString(),
      type: 'AJUSTE_MERMA',
      quantityDelta: -prod.stock,
      previousStock: prod.stock,
      newStock: 0,
      reason: `Producto eliminado del catálogo por ${currentUser.name}`,
      userName: currentUser.name,
    };

    try {
      await Promise.all([
        productService.delete(id),
        stockMovementService.create(delMovement),
      ]);
    } catch (e) {
      console.error('Error deleting product in Supabase:', e);
    }

    setProducts((prev) => prev.filter((p) => p.id !== id));
    setCart((prev) => prev.filter((item) => item.product.id !== id));
    setAlerts((prev) => prev.filter((a) => a.productId !== id));
    setToasts((prev) => prev.filter((t) => t.productId !== id));
    setStockMovements((prev) => [delMovement, ...prev]);

    showToast(`Producto "${prod.name}" eliminado del inventario`, 'info');
    return true;
  };

  // Category management
  const addCategory = async (name: string): Promise<boolean> => {
    if (blockIfImpersonating()) return false;
    const trimmed = name.trim();
    if (!trimmed) {
      showToast('El nombre de la categoría no puede estar vacío', 'error');
      return false;
    }
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`La categoría "${trimmed}" ya existe`, 'warning');
      return false;
    }

    try {
      await categoryService.create(trimmed);
    } catch (e) {
      console.error('Error creating category in Supabase:', e);
    }

    setCategories((prev) => [...prev, trimmed]);
    showToast(`Categoría "${trimmed}" creada con éxito`, 'success');
    return true;
  };

  const updateCategory = async (oldName: string, newName: string): Promise<boolean> => {
    if (blockIfImpersonating()) return false;
    const trimmed = newName.trim();
    if (!trimmed) {
      showToast('El nombre de la categoría no puede estar vacío', 'error');
      return false;
    }
    if (trimmed.toLowerCase() !== oldName.toLowerCase() && categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`La categoría "${trimmed}" ya existe`, 'warning');
      return false;
    }

    try {
      await categoryService.update(oldName, trimmed);
    } catch (e) {
      console.error('Error updating category in Supabase:', e);
    }

    setCategories((prev) => prev.map((c) => (c === oldName ? trimmed : c)));
    setProducts((prev) =>
      prev.map((p) => (p.category === oldName ? { ...p, category: trimmed } : p))
    );
    setAlerts((prev) =>
      prev.map((a) => (a.category === oldName ? { ...a, category: trimmed } : a))
    );

    showToast(`Categoría "${oldName}" renombrada a "${trimmed}"`, 'success');
    return true;
  };

  const deleteCategory = async (name: string, fallbackCategory: string = 'General'): Promise<boolean> => {
    if (blockIfImpersonating()) return false;
    if (categories.length <= 1) {
      showToast('Debe existir al menos una categoría en el sistema', 'warning');
      return false;
    }

    try {
      await categoryService.delete(name);
    } catch (e) {
      console.error('Error deleting category in Supabase:', e);
    }

    if (!categories.includes(fallbackCategory) && fallbackCategory !== name) {
      setCategories((prev) => [...prev.filter((c) => c !== name), fallbackCategory]);
    } else {
      setCategories((prev) => prev.filter((c) => c !== name));
    }

    const targetFallback = fallbackCategory === name ? (categories.find((c) => c !== name) || 'General') : fallbackCategory;
    setProducts((prev) =>
      prev.map((p) => (p.category === name ? { ...p, category: targetFallback } : p))
    );

    showToast(`Categoría "${name}" eliminada. Productos reasignados a "${targetFallback}"`, 'info');
    return true;
  };

  // ==========================================
  // ALERTS & NOTIFICATIONS
  // ==========================================

  const dismissAlert = async (id: string) => {
    if (blockIfImpersonating()) return;
    try {
      await appAlertService.delete(id);
    } catch (e) {
      console.error('Error deleting alert in Supabase:', e);
    }
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const markAlertAsRead = async (id: string) => {
    if (blockIfImpersonating()) return;
    try {
      await appAlertService.markAsRead(id);
    } catch (e) {
      console.error('Error marking alert as read in Supabase:', e);
    }
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
  };

  const markAllAlertsAsRead = async () => {
    if (blockIfImpersonating()) return;
    try {
      await appAlertService.markAllAsRead();
    } catch (e) {
      console.error('Error marking all alerts as read in Supabase:', e);
    }
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    showToast('Todas las alertas marcadas como leídas', 'info');
  };

  const clearAllAlerts = async () => {
    if (blockIfImpersonating()) return;
    try {
      await appAlertService.clearAll();
    } catch (e) {
      console.error('Error clearing alerts in Supabase:', e);
    }
    setAlerts([]);
    showToast('Historial de alertas limpiado', 'info');
  };

  // ==========================================
  // GASTOS FIJOS & OPERATIVOS HANDLERS
  // ==========================================

  const addExpense = async (expenseData: Omit<FixedExpense, 'id' | 'createdAt'>) => {
    if (blockIfImpersonating()) return;
    try {
      const created = await fixedExpenseService.create(expenseData);
      setExpenses((prev) => [created, ...prev]);
      showToast(`Gasto "${created.name}" agregado con éxito`, 'success');
    } catch (e) {
      console.error('Error adding expense in Supabase:', e);
      showToast('Error al registrar gasto en la base de datos', 'error');
    }
  };

  const updateExpense = async (id: string, updates: Partial<FixedExpense>) => {
    if (blockIfImpersonating()) return;
    try {
      await fixedExpenseService.update(id, updates);
    } catch (e) {
      console.error('Error updating expense in Supabase:', e);
    }
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
    showToast('Gasto actualizado correctamente', 'success');
  };

  const deleteExpense = async (id: string): Promise<boolean> => {
    if (blockIfImpersonating()) return false;
    const target = expenses.find((e) => e.id === id);
    if (!target) return false;

    try {
      await fixedExpenseService.delete(id);
    } catch (e) {
      console.error('Error deleting expense in Supabase:', e);
    }

    setExpenses((prev) => prev.filter((e) => e.id !== id));
    showToast(`Gasto "${target.name}" eliminado`, 'info');
    return true;
  };

  const markExpenseAsPaid = async (id: string, paymentMethod: PaymentMethodType = 'TRANSFERENCIA_QR', amount?: number) => {
    if (blockIfImpersonating()) return;
    const target = expenses.find((e) => e.id === id);
    const paidAmount = amount ?? (target ? target.amount : 0);
    const lastPaidDate = new Date().toISOString();

    try {
      await fixedExpenseService.update(id, {
        status: 'PAGADO',
        lastPaidDate,
        lastPaidAmount: paidAmount,
        lastPaidMethod: paymentMethod,
      });
    } catch (e) {
      console.error('Error marking expense as paid in Supabase:', e);
    }

    setExpenses((prev) =>
      prev.map((e) => {
        if (e.id === id) {
          return {
            ...e,
            status: 'PAGADO',
            lastPaidDate,
            lastPaidAmount: paidAmount,
            lastPaidMethod: paymentMethod,
          };
        }
        return e;
      })
    );
    showToast('Pago de gasto registrado exitosamente', 'success');
  };

  const markExpenseAsPending = async (id: string) => {
    if (blockIfImpersonating()) return;
    try {
      await fixedExpenseService.update(id, { status: 'PENDIENTE' });
    } catch (e) {
      console.error('Error marking expense pending in Supabase:', e);
    }

    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: 'PENDIENTE' } : e))
    );
    showToast('Gasto marcado como pendiente', 'info');
  };

  // ==========================================
  // STORE INFO HANDLERS
  // ==========================================

  const updateStoreInfo = async (updates: Partial<StoreInfo>) => {
    if (blockIfImpersonating()) return;
    try {
      await storeSettingsService.update(updates);
    } catch (e) {
      console.error('Error updating store settings in Supabase:', e);
    }

    setStoreInfo((prev) => ({ ...prev, ...updates }));
    showToast('Información del comercio y sucursal actualizada', 'success');
  };

  // ==========================================
  // MASTER TECH SUPPORT AUTHENTICATION
  // ==========================================

  /**
   * Autenticación maestra de soporte.
   *
   * Se verifica contra el hash PBKDF2 de VITE_MASTER_PASSWORD_HASH. Ya no hay
   * contraseña por defecto ni códigos de emergencia embebidos en el código:
   * el repositorio es público y cualquiera podía leerlos.
   */
  const loginMaster = async (password: string): Promise<{ success: boolean; message: string }> => {
    if (!IS_MASTER_ACCESS_CONFIGURED) {
      showToast(MASTER_NOT_CONFIGURED_MESSAGE, 'error', { isPersistent: true });
      return { success: false, message: MASTER_NOT_CONFIGURED_MESSAGE };
    }

    const authorized = await verifySecret(password.trim(), MASTER_PASSWORD_HASH);
    if (!authorized) {
      showToast('Contraseña maestra incorrecta', 'error');
      return { success: false, message: 'Contraseña inválida' };
    }

    const masterUser: User = {
      id: 'usr-master-superadmin',
      name: 'Dueño del Sistema (Master)',
      email: masterAuth.email || '',
      role: 'SUPERADMIN',
      roleTitle: 'Desarrollador / Llave Maestra',
      pin: '',
      avatarUrl: '',
      initials: 'MS',
      canDiscount: true,
      canRefund: true,
      canManageInventory: true,
    };

    setCurrentUser(masterUser);
    setIsSupportMode(true);
    setMasterAuth((prev) => ({ ...prev, lastLoginAt: new Date().toISOString() }));
    try {
      sessionStorage.setItem('rioja_support_mode', 'true');
    } catch (e) {
      console.error(e);
    }
    setIsLoginModalOpen(false);
    setIsMasterAuthModalOpen(false);
    setActiveViewRaw('master_portal');
    showToast('Acceso Maestro autorizado', 'success', { title: 'Llave Maestra Concedida' });
    return { success: true, message: 'Autenticación exitosa' };
  };

  const loginMasterSuperAdmin = loginMaster;

  // Antes esto sólo tocaba useState: crear/editar/borrar un comercio se
  // perdía al refrescar la página. storeTenantService ya existía completo
  // contra la tabla real `stores` — nunca se llamaba desde acá.
  const createStoreTenant = async (tenantData: Omit<StoreTenant, 'id' | 'createdAt'>): Promise<StoreTenant> => {
    try {
      const created = await storeTenantService.create(tenantData);
      setStoreTenants((prev) => [created, ...prev]);
      showToast(`Comercio "${created.name}" creado con éxito`, 'success');
      return created;
    } catch (e) {
      console.error('Error creating store tenant in Supabase:', e);
      showToast('Error al guardar el comercio en la base de datos', 'error');
      throw e;
    }
  };

  const updateStoreTenant = async (id: string, updates: Partial<StoreTenant>): Promise<void> => {
    try {
      await storeTenantService.update(id, updates);
    } catch (e) {
      console.error('Error updating store tenant in Supabase:', e);
      showToast('Error al actualizar el comercio en la base de datos', 'error');
      return;
    }

    setStoreTenants((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
    showToast('Datos del comercio actualizados', 'info');
  };

  const deleteStoreTenant = async (id: string): Promise<void> => {
    try {
      await storeTenantService.delete(id);
    } catch (e) {
      console.error('Error deleting store tenant in Supabase:', e);
      showToast('Error al eliminar el comercio en la base de datos', 'error');
      return;
    }

    setStoreTenants((prev) => prev.filter((t) => t.id !== id));
    showToast('Comercio eliminado', 'info');
  };

  /**
   * Da de alta la cuenta de terminal de un comercio (Edge Function
   * provision-store-terminal, que corre con la Admin API de Supabase Auth).
   * Automatiza los pasos 2-3 del runbook manual: crear el usuario y
   * taggearlo con su store_id. La contraseña la genera el servidor y viaja
   * una única vez en la respuesta — acá no se guarda en ningún lado.
   */
  const provisionStoreTerminal = async (
    storeId: string,
    terminalEmail: string
  ): Promise<{ success: boolean; email?: string; password?: string; message: string }> => {
    const res = await storeTenantService.provisionTerminal(storeId, terminalEmail);
    if (res.success) {
      setStoreTenants((prev) =>
        prev.map((t) => (t.id === storeId ? { ...t, terminalEmail: res.email } : t))
      );
    }
    return res;
  };

  /**
   * Trae los datos operativos REALES del comercio elegido (ventas, productos,
   * gastos, caja, etc.) vía la Edge Function get-store-snapshot, y recién
   * ahí activa el modo auditoría. Antes esto sólo cambiaba el branding
   * mostrado — la sesión de Supabase seguía siendo la del operador, así que
   * por debajo del cartel de "viendo a otro comercio" se seguían viendo los
   * propios datos. Si el snapshot falla, no se activa nada: mejor dejar al
   * operador donde estaba que mostrarle un estado a medio armar.
   *
   * No trae empleados/PIN del comercio (fuera de alcance a propósito, ver
   * get-store-snapshot). El branding usa los datos reales de store_settings
   * cuando existen, y cae al directorio (stores) si el comercio todavía no
   * cargó su propia configuración — mismo respaldo que ya usaba esta función
   * antes de este cambio.
   */
  const impersonateStore = async (storeId: string): Promise<void> => {
    if (isImpersonationLoading) return;
    const targetTenant = storeTenants.find((t) => t.id === storeId);
    if (!targetTenant) return;

    setIsImpersonationLoading(true);
    const res = await storeTenantService.getOperationalSnapshot(storeId);
    setIsImpersonationLoading(false);

    if (!res.success) {
      const message = (res as { success: false; message: string }).message;
      showToast(message, 'error');
      return;
    }

    const { snapshot } = res;

    setStoreInfo({
      storeName: snapshot.storeInfo?.storeName || targetTenant.name,
      branchName: snapshot.storeInfo?.branchName || targetTenant.branchName,
      // Marca visual fija de seguridad: aunque el resto del branding sea el
      // real del cliente, esto deja inconfundible que se está auditando.
      brandSubtitle: 'Sucursal Auditada por Soporte Maestro',
      cuit: snapshot.storeInfo?.cuit || targetTenant.cuit || '',
      address: snapshot.storeInfo?.address || targetTenant.address || '',
      phone: snapshot.storeInfo?.phone || targetTenant.ownerPhone || '',
      email: snapshot.storeInfo?.email || targetTenant.ownerEmail || '',
      receiptFooter: 'Comprobante no válido como factura',
    });
    setCategories(snapshot.categories);
    setProducts(snapshot.products);
    setSales(snapshot.sales);
    setStockMovements(snapshot.stockMovements);
    setParkedTickets(snapshot.parkedTickets);
    // shiftsHistory sólo guarda los turnos cerrados — el abierto se rastrea
    // aparte en activeShift, mismo criterio que loadAllDataFromSupabase.
    setShiftsHistory(snapshot.cashShifts.filter((s) => s.status === 'CERRADA'));
    setActiveShift(snapshot.activeCashShift);
    setCashMovements(snapshot.cashMovements);
    setExpenses(snapshot.expenses);
    setAlerts(snapshot.alerts);

    setIsImpersonating(true);
    setActiveViewRaw('dashboard');
    showToast(`Auditando sucursal: ${targetTenant.name}`, 'info', {
      title: 'Modo Auditoría de Tienda',
    });
  };

  /**
   * Vuelve a cargar todo desde loadAllDataFromSupabase en vez de reconstruir
   * el estado propio a mano — así se restauran a la vez los datos reales del
   * operador Y su branding real, sin duplicar esa lógica. Antes esto no
   * pasaba: el nombre del negocio se quedaba mal hasta refrescar la página.
   */
  const exitImpersonation = async (): Promise<void> => {
    setIsImpersonating(false);
    setActiveViewRaw('master_portal');
    await loadAllDataFromSupabase();
    showToast('Regresando al Portal Maestro', 'info');
  };

  /**
   * Actualiza sólo el email de contacto del acceso maestro (dato no sensible).
   *
   * La contraseña maestra ya no se puede cambiar desde el navegador: es un
   * secreto de build (VITE_MASTER_PASSWORD_HASH). Antes existían
   * `registerMasterAccount` y `resetMasterPassword`, que permitían registrar o
   * restablecer la llave maestra desde la pantalla de login usando un código
   * fijo embebido en el código fuente. Para rotarla ahora: `npm run hash-password`
   * y actualizar .env.local.
   */
  const updateMasterEmail = (newEmail: string): { success: boolean; message: string } => {
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      showToast('Ingresá un correo electrónico válido', 'error');
      return { success: false, message: 'Correo inválido' };
    }

    setMasterAuth((prev) => ({ ...prev, email: cleanEmail }));
    showToast('Correo de contacto del acceso maestro actualizado', 'success');
    return { success: true, message: 'Correo actualizado' };
  };

  const activateSupportMode = async (password: string): Promise<boolean> => {
    if (!IS_MASTER_ACCESS_CONFIGURED) {
      showToast(MASTER_NOT_CONFIGURED_MESSAGE, 'error', { isPersistent: true });
      return false;
    }

    if (!(await verifySecret(password.trim(), MASTER_PASSWORD_HASH))) {
      showToast('Contraseña maestra inválida', 'error');
      return false;
    }

    setIsSupportMode(true);
    try {
      sessionStorage.setItem('rioja_support_mode', 'true');
    } catch (e) {
      console.error(e);
    }
    showToast('Modo Soporte Maestro activado', 'success');
    return true;
  };

  const deactivateSupportMode = () => {
    setIsSupportMode(false);
    try {
      sessionStorage.removeItem('rioja_support_mode');
    } catch (e) {
      console.error(e);
    }
    showToast('Modo Soporte Técnico finalizado', 'info');
  };

  const exportSystemBackup = (): string => {
    const backupData = {
      exportVersion: '1.2.0',
      exportedAt: new Date().toISOString(),
      storeInfo,
      products,
      categories,
      sales,
      shiftsHistory,
      expenses,
      users,
      stockMovements,
    };
    return JSON.stringify(backupData, null, 2);
  };

  const importSystemBackup = async (jsonContent: string): Promise<boolean> => {
    try {
      const parsed = JSON.parse(jsonContent);
      if (parsed.products && Array.isArray(parsed.products)) setProducts(parsed.products);
      if (parsed.categories && Array.isArray(parsed.categories)) setCategories(parsed.categories);
      if (parsed.sales && Array.isArray(parsed.sales)) setSales(parsed.sales);
      if (parsed.shiftsHistory && Array.isArray(parsed.shiftsHistory)) setShiftsHistory(parsed.shiftsHistory);
      if (parsed.expenses && Array.isArray(parsed.expenses)) setExpenses(parsed.expenses);
      if (parsed.users && Array.isArray(parsed.users)) setUsers(parsed.users);
      if (parsed.storeInfo) setStoreInfo(parsed.storeInfo);
      if (parsed.stockMovements && Array.isArray(parsed.stockMovements)) setStockMovements(parsed.stockMovements);
      showToast('Copia de seguridad restaurada correctamente', 'success');
      return true;
    } catch (err) {
      showToast('Error al leer el archivo JSON de copia de seguridad', 'error');
      return false;
    }
  };

  const repairSystemDatabase = async (): Promise<{ fixedIssues: number; details: string[] }> => {
    const details: string[] = [];
    let fixedIssues = 0;

    const existingCats = new Set(categories);
    let catsAdded = 0;
    for (const p of products) {
      if (p.category && !existingCats.has(p.category)) {
        existingCats.add(p.category);
        catsAdded++;
        try {
          await categoryService.create(p.category);
        } catch (e) {
          console.warn('Could not insert repaired category:', e);
        }
      }
    }
    if (catsAdded > 0) {
      setCategories(Array.from(existingCats));
      details.push(`Se sincronizaron ${catsAdded} categorías presentes en productos.`);
      fixedIssues += catsAdded;
    }

    if (cart.some((c) => !c.product || typeof c.quantity !== 'number' || c.quantity <= 0)) {
      setCart((prev) => prev.filter((c) => c.product && c.quantity > 0));
      details.push('Se eliminaron ítems corruptos del carrito.');
      fixedIssues++;
    }

    setExpenses((prev) =>
      prev.map((e) => {
        if (!e.status) {
          fixedIssues++;
          return { ...e, status: 'PENDIENTE' };
        }
        return e;
      })
    );

    if (details.length === 0) {
      details.push('Base de datos y estados verificados. Todo en orden.');
    }

    showToast(`Diagnóstico completado: ${fixedIssues} ajustes realizados`, 'info');
    return { fixedIssues, details };
  };

  const resetToSeedData = () => {
    setProducts(SEED_PRODUCTS);
    setSales(SEED_SALES);
    setUsers(SEED_USERS);
    setActiveShift(null);
    setCashMovements([]);
    setCart([]);
    setParkedTickets([]);
    setStockMovements([]);
    setExpenses([]);
    setAlerts(SEED_ALERTS);
    setToasts([]);
    showToast('Datos reiniciados al estado semilla', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        isLoadingData,
        isSupabaseConnected,
        hasTerminalSession,
        isCheckingTerminalSession,
        terminalEmail,
        isCheckingStoreStatus,
        isStoreSuspended,
        signInTerminal,
        signOutTerminal,
        sendReceiptEmail,

        currentUser,
        users,
        isLoginModalOpen,
        setIsLoginModalOpen,
        login,
        logout,
        switchUser,
        requestUserSwitch,
        pendingSwitchUserId,
        clearPendingSwitch,
        addUser,
        updateUser,
        deleteUser,
        updateUserPin,
        requestPinRecovery,
        resetPinWithMasterPassword,
        isMasterAccessConfigured: IS_MASTER_ACCESS_CONFIGURED,
        activeView,
        setActiveView,
        canAccessView,

        products,
        categories,
        stockMovements,
        adjustStock,
        addStockReceipt,
        quickRestockProduct,
        addProduct,
        updateProduct,
        deleteProduct,
        addCategory,
        updateCategory,
        deleteCategory,
        lowStockProducts,

        cart,
        addToCart,
        scanBarcodeOrSku,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        taxPercent,
        setTaxPercent,
        orderDiscountPercent,
        setOrderDiscountPercent,
        cartSubtotal,
        cartDiscountAmount,
        cartTax,
        cartTotal,
        parkedTickets,
        parkCurrentTicket,
        resumeParkedTicket,
        deleteParkedTicket,
        confirmSale,

        activeShift,
        shiftsHistory,
        cashMovements,
        openCashShift,
        closeCashShift,
        addCashMovement,

        sales,
        refundSale,

        expenses,
        addExpense,
        updateExpense,
        deleteExpense,
        markExpenseAsPaid,
        markExpenseAsPending,

        storeInfo,
        updateStoreInfo,

        masterAuth,
        isMasterAuthModalOpen,
        setIsMasterAuthModalOpen,

        loginMaster,
        loginMasterSuperAdmin,
        updateMasterEmail,
        isSupportMode,
        isSupportModalOpen,
        setIsSupportModalOpen,
        activateSupportMode,
        deactivateSupportMode,
        exportSystemBackup,
        importSystemBackup,
        repairSystemDatabase,

        storeTenants,
        createStoreTenant,
        updateStoreTenant,
        deleteStoreTenant,
        provisionStoreTerminal,
        impersonateStore,
        exitImpersonation,
        isImpersonating,
        isImpersonationLoading,

        alerts,
        unreadAlertsCount,
        dismissAlert,
        markAlertAsRead,
        markAllAlertsAsRead,
        clearAllAlerts,
        isNotificationsPanelOpen,
        setIsNotificationsPanelOpen,
        toasts,
        showToast,
        showStockAlertToast,
        removeToast,

        resetToSeedData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
