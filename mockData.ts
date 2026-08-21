import { User, Product, Sale, CashShift, CashMovement, AppAlert } from './types';

export const SEED_USERS: User[] = [
  {
    id: 'usr-1',
    name: 'Dueño / Administrador',
    email: 'riojadecoraciones@gmail.com',
    role: 'DUEÑO',
    roleTitle: 'Administrador General',
    pin: '1234',
    avatarUrl: '',
    initials: 'RD',
    canDiscount: true,
    canRefund: true,
    canManageInventory: true,
  },
];

export const SEED_PRODUCTS: Product[] = [];

export const SEED_SALES: Sale[] = [];

export const SEED_ALERTS: AppAlert[] = [];
