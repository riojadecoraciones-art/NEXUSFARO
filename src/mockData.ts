import { User, Product, Sale, CashShift, CashMovement, AppAlert, StoreTenant } from './types';

export const SEED_USERS: User[] = [
  {
    id: 'usr-1',
    name: 'Dueño / Administrador',
    email: 'riojadecoraciones@gmail.com',
    role: 'DUEÑO',
    roleTitle: 'Administrador General',
    // El PIN real se define en el primer arranque (ver AppContext): nunca un valor fijo del repo.
    pin: '',
    avatarUrl: '',
    initials: 'RD',
    canDiscount: true,
    canRefund: true,
    canManageInventory: true,
  },
];

export const SEED_TENANTS: StoreTenant[] = [
  {
    id: 'tenant-1',
    name: 'NEXUS FARO - Rioja Decoraciones',
    branchName: 'Director Superior',
    ownerName: 'Dueño / Administrador',
    ownerEmail: 'riojadecoraciones@gmail.com',
    ownerPhone: '+54 380 4123456',
    cuit: '20-12345678-9',
    address: 'San Nicolás de Bari 450, La Rioja',
    status: 'ACTIVO',
    createdAt: new Date().toISOString(),
  },
];

export const SEED_PRODUCTS: Product[] = [];

export const SEED_SALES: Sale[] = [];

export const SEED_ALERTS: AppAlert[] = [];

