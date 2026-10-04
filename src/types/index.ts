export type UserRole = 'ADMIN' | 'KASIR';
export type UserStatus = 'Active' | 'Inactive';
export type ProductStatus = 'AVAILABLE' | 'UNAVAILABLE';
export type TransactionStatus = 'Completed' | 'Cancelled';
export type PaymentMethod = 'Cash' | 'QRIS' | 'Debit' | 'Transfer';

export interface User {
  id: number;
  name: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  created_at?: string;
}

export interface StoreProfile {
  name: string;
  address: string;
  phone: string;
  whatsapp: string;
  logo: string | null;
}

export interface Category {
  id: number;
  name: string;
  icon?: string | null;
  product_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: number;
  name: string;
  categoryId: number;
  categoryName: string;
  buyPrice: number | null;
  sellPrice: number;
  profit: number | null;
  imageUrl: string | null;
  icon?: string | null;
  sku: string | null;
  status: ProductStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardSummary {
  totalSales: number;
  totalTransactions: number;
  totalItemsSold: number;
  averageTransaction: number;
}

export interface ChartDataPoint {
  date: string;
  label?: string;
  total: number;
  count: number;
}

export interface TopProduct {
  productName: string;
  categoryName: string;
  totalQty: number;
  totalRevenue: number;
}

export interface RecentTransaction {
  id: number;
  invoice_number?: string;
  invoiceNumber?: string;
  created_at?: string;
  createdAt?: string;
  cashier_name?: string;
  cashierName?: string;
  payment_method?: PaymentMethod;
  paymentMethod?: PaymentMethod;
  total: number;
  status: TransactionStatus;
  itemCount?: number;
}

export interface TransactionItem {
  id: number;
  product_id?: number;
  productId?: number;
  product_name?: string;
  productName?: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface TransactionDetail {
  transaction: {
    id: number;
    invoice_number?: string;
    invoiceNumber?: string;
    created_at?: string;
    createdAt?: string;
    cashier_name?: string;
    cashierName?: string;
    cashier_username?: string;
    cashierUsername?: string;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    payment_method?: PaymentMethod;
    paymentMethod?: PaymentMethod;
    status: TransactionStatus;
  };
  items: TransactionItem[];
  receiptConfig?: {
    header: string;
    address: string;
    footer: string;
    show_cashier: boolean;
    show_datetime: boolean;
  };
  storeProfile?: StoreProfile;
}
