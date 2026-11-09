export interface Product {
  id: string;
  name: string;
  category: string;
  size: string;
  color: string;
  price: number; // PVP final (€)
  unitCost: number; // Coste total por unidad (€)
  stock: number;
  // Multichannel & Boutique features
  channel?: string; // 'TikTok & WhatsApp', 'Solo TikTok Shop', 'Solo WhatsApp', 'Venta Física'
  rackLocation?: string; // Perchero / Ubicación
  notes?: string;
  createdAt?: string;
}

export interface CartItem {
  productId: string;
  name: string;
  category?: string;
  size?: string;
  color?: string;
  quantity: number;
  price: number;
  unitCost: number;
  total?: number;
  costTotal?: number;
}

export interface Sale {
  id: string;
  date: string;
  payment: 'Bizum' | 'Transferencia' | 'Tarjeta' | 'Efectivo' | 'TikTok Shop' | 'WhatsApp' | 'Otro' | string;
  comment: string;
  items: CartItem[];
  total: number;
}

export interface PurchaseLine {
  productId: string;
  name: string;
  quantity: number;
  unitCost: number;
}

export interface Purchase {
  id: string;
  supplier: string;
  invoice: string;
  date: string;
  notes: string;
  base: number;
  iva: number;
  recargo: number;
  other: number;
  total: number;
  lines: PurchaseLine[];
  createdAt: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  supplier: string;
  invoice: string;
  description: string;
  amount: number;
  iva: number;
  createdAt: string;
}

export interface FiscalTask {
  id: string;
  text: string;
  dueDate: string;
  model: string;
  completed: boolean;
  system: boolean;
}

export interface Note {
  id: string;
  text: string;
  dueDate: string;
  category: string;
  completed: boolean;
  createdAt: string;
}

export interface AppData {
  schema: 2;
  products: Product[];
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
  notes: Note[];
  fiscalTasks: FiscalTask[];
  rentaChecks: number[];
  createdAt: string;
}

export type PageId = 'resumen' | 'inventario' | 'ventas' | 'finanzas' | 'fiscalidad' | 'recordatorios' | 'copias';
