// ==================== TYPE DEFINITIONS ====================

export interface Shop {
  id: number;
  name: string;
  location: string;
  phone: string;
  email: string;
  logo: string;
  address: string;
}

export interface Garment {
  id: string;
  name: string;
  basePrice: number;
}

export interface Worker {
  id: number;
  name: string;
  role: string;
  phone: string;
  expertise: string[];
  isAvailable?: boolean;
  currentTasks?: number;
}

export interface ProductionStage {
  id: number;
  name: string;
  icon: string;
  color: string;
}

export interface AddOn {
  id: number;
  name: string;
  price: number;
  category?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  measurements?: Record<string, number>;
}

export interface ProductionProgress {
  stageId: number;
  status: 'pending' | 'in-progress' | 'completed';
  assignedTo: number | null;
  completedDate: Date | null;
  notes?: string;
}

export interface Order {
  id: string;
  customer: string;
  phone: string;
  whatsapp: string;
  items: OrderItem[];
  addons: number[];
  total: number;
  advance: number;
  discount: number;
  status: 'pending' | 'production' | 'completed' | 'delivered';
  date: Date;
  invoice: string;
  production: ProductionProgress[];
  expectedDelivery?: Date;
  notes?: string;
}

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export interface NotificationPayload {
  type: 'whatsapp' | 'sms' | 'email' | 'push';
  recipient: string;
  subject?: string;
  message: string;
  orderId?: string;
}

export interface AuthUser {
  id: string;
  shopId: number;
  email: string;
  role: 'admin' | 'manager' | 'staff';
}

export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  productionOrders: number;
  completedOrders: number;
  totalRevenue: number;
  totalCollected: number;
  averageOrderValue: number;
  collectionRate: number;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface UserPreferences {
  darkMode: boolean;
  language: string;
  timezone: string;
  notifications: {
    whatsapp: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
  };
}
