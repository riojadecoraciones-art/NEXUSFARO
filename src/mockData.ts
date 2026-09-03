import { User, Product, Sale, CashShift, CashMovement, AppAlert } from './types';

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

export const SEED_PRODUCTS: Product[] = [];

export const SEED_SALES: Sale[] = [];

export const SEED_ALERTS: AppAlert[] = [];

