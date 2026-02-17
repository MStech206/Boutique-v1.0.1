// ==================== MAIN APPLICATION TSX ====================

'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { Order, Shop, Toast } from './types/index';
import {
  NotificationService,
  InvoiceService,
  ValidationService,
  FormattingService,
  AnalyticsService
} from './services/index';
import {
  SHOPS,
  GARMENT_CATEGORIES,
  WORKERS,
  PRODUCTION_STAGES,
  ADD_ONS,
  MEASUREMENTS,
  NOTIFICATION_TEMPLATES
} from './config/constants';

// ==================== TOAST PROVIDER ====================

interface ToastContextType {
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: number) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsClosing(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500'
  }[toast.type];

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️'
  };

  return (
    <div
      className={`${bgColor} text-white p-4 rounded-lg shadow-2xl flex items-center gap-3 min-w-[300px] transition-all ${
        isClosing ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'
      }`}
    >
      <span className="text-2xl">{icons[toast.type]}</span>
      <span className="flex-1 text-sm font-semibold">{toast.message}</span>
      <button
        onClick={() => {
          setIsClosing(true);
          setTimeout(() => onRemove(toast.id), 300);
        }}
        className="text-white opacity-75 hover:opacity-100 font-bold"
      >
        ×
      </button>
    </div>
  );
};

const ToastContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      <div className="fixed top-5 right-5 space-y-3 z-50 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>
      {children}
    </ToastContext.Provider>
  );
};

// ==================== LOGIN SCREEN ====================

interface LoginScreenProps {
  onLogin: (shopId: number) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [selectedShop, setSelectedShop] = useState<number>(1);
  const toast = useToast();

  const handleLogin = () => {
    onLogin(selectedShop);
    toast.addToast(`Welcome to ${SHOPS.find(s => s.id === selectedShop)?.name}!`, 'success');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Branding */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-28 h-28 bg-white rounded-full mb-6 shadow-2xl transform hover:scale-105 transition-transform">
            <span className="text-6xl">✂️</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-2">SAPTHALA</h1>
          <p className="text-xl text-blue-100 font-semibold">Professional Tailoring Management</p>
          <p className="text-sm text-blue-200 mt-3">Admin Dashboard for Boutique Owners</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl p-10 shadow-2xl space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="text-xl">🏪</span> Select Your Shop
            </label>
            <select
              value={selectedShop}
              onChange={(e) => setSelectedShop(Number(e.target.value))}
              className="w-full p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 font-semibold text-lg hover:border-blue-400 transition-colors"
            >
              {SHOPS.map(shop => (
                <option key={shop.id} value={shop.id}>
                  {shop.logo} {shop.name} • {shop.location}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleLogin}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-4 px-6 rounded-lg hover:shadow-xl transition-all text-lg transform hover:scale-105 active:scale-95"
          >
            🚀 Enter Admin Panel
          </button>

          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <p className="text-xs text-blue-700 font-semibold">
              🔒 Secure Login | Multi-Shop Support
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-blue-100 text-sm mt-8 font-semibold">
          Powered by MS Technologies™
        </p>
      </div>
    </div>
  );
};

// ==================== DASHBOARD TAB ====================

interface DashboardTabProps {
  stats: ReturnType<typeof AnalyticsService.calculateStats>;
  orders: Order[];
  shop: Shop;
}

const DashboardTab: React.FC<DashboardTabProps> = ({ stats, orders, shop }) => {
  const topItems = useMemo(() => AnalyticsService.getTopItems(orders), [orders]);

  const StatCard = ({ label, value, icon, color, trend }: any) => (
    <div className={`stat-card relative p-8 rounded-2xl text-white overflow-hidden group`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-90 group-hover:opacity-100 transition-opacity`}></div>
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <span className="text-5xl opacity-80">{icon}</span>
          {trend && <span className="text-sm font-bold text-green-200">↑ {trend}</span>}
        </div>
        <p className="text-sm font-semibold opacity-90 mb-2 tracking-wider">{label}</p>
        <p className="text-4xl font-bold">{value}</p>
      </div>
      <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-300"></div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Greeting Banner */}
      <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full -mr-40 -mt-40"></div>
        <div className="relative z-10">
          <h2 className="text-4xl font-bold mb-2">Welcome back, Admin! 👋</h2>
          <p className="text-blue-100 text-lg">{shop.name} • {FormattingService.formatDate(new Date())}</p>
          <p className="text-blue-200 mt-3">You're managing {stats.totalOrders} orders across all stages</p>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <span className="text-3xl">📊</span> Key Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            label="Total Orders"
            value={stats.totalOrders}
            icon="📦"
            color="from-blue-500 to-blue-600"
            trend={`${stats.totalOrders} active`}
          />
          <StatCard
            label="Pending Orders"
            value={stats.pendingOrders}
            icon="⏳"
            color="from-orange-500 to-orange-600"
            trend={`${stats.pendingOrders} awaiting`}
          />
          <StatCard
            label="In Production"
            value={stats.productionOrders}
            icon="⚙️"
            color="from-purple-500 to-purple-600"
            trend={`${stats.productionOrders} running`}
          />
          <StatCard
            label="Completed"
            value={stats.completedOrders}
            icon="✅"
            color="from-green-500 to-green-600"
            trend={`${stats.completedOrders} done`}
          />
          <StatCard
            label="Total Revenue"
            value={FormattingService.formatCurrency(stats.totalRevenue)}
            icon="💰"
            color="from-emerald-500 to-emerald-600"
          />
          <StatCard
            label="Collection Rate"
            value={`${stats.collectionRate}%`}
            icon="📈"
            color="from-cyan-500 to-cyan-600"
          />
        </div>
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders - Enhanced */}
        <div className="lg:col-span-2 bg-white rounded-2xl card-shadow overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-8 text-white">
            <h3 className="text-3xl font-bold flex items-center gap-3">
              <span>📋</span> Recent Orders
            </h3>
            <p className="text-blue-100 text-sm mt-2">Latest {Math.min(5, orders.length)} orders</p>
          </div>
          <div className="overflow-y-auto max-h-96">
            {orders.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-6xl mb-4">📭</p>
                <p className="text-gray-600 font-semibold">No orders yet</p>
                <p className="text-gray-500 text-sm mt-2">Create your first order to get started</p>
              </div>
            ) : (
              orders.slice(0, 5).map((order, idx) => (
                <div
                  key={order.id}
                  className="p-6 border-b border-gray-100 hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent transition-all duration-300 relative group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{idx + 1 <= 3 ? ['🥇', '🥈', '🥉'][idx] : '📌'}</span>
                        <div>
                          <p className="font-bold text-gray-900 text-lg">{order.customer}</p>
                          <p className="text-xs text-gray-500">{order.id}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 ml-11">{FormattingService.formatDate(order.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 text-lg">{FormattingService.formatCurrency(order.total)}</p>
                      <span className={`inline-block mt-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                        order.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                        order.status === 'production' ? 'bg-purple-100 text-purple-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {order.status === 'pending' ? '⏳ Pending' : order.status === 'production' ? '⚙️ Production' : '✅ Completed'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Stats Sidebar */}
        <div className="space-y-6">
          {/* Average Order Value */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border-2 border-blue-200 card-shadow">
            <h4 className="text-sm font-bold text-blue-600 mb-2 uppercase tracking-widest">Average Order</h4>
            <p className="text-3xl font-bold text-blue-900">{FormattingService.formatCurrency(stats.averageOrderValue)}</p>
            <div className="mt-4 h-2 bg-blue-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 w-3/4"></div>
            </div>
            <p className="text-xs text-blue-600 mt-2">↑ Per order average</p>
          </div>

          {/* Collection Rate */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8 border-2 border-green-200 card-shadow">
            <h4 className="text-sm font-bold text-green-600 mb-2 uppercase tracking-widest">Collection Rate</h4>
            <p className="text-3xl font-bold text-green-900">{stats.collectionRate}%</p>
            <div className="mt-4 h-2 bg-green-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                style={{ width: `${stats.collectionRate}%` }}
              ></div>
            </div>
            <p className="text-xs text-green-600 mt-2">✅ Payment collected</p>
          </div>

          {/* Pending Amount */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-8 border-2 border-orange-200 card-shadow">
            <h4 className="text-sm font-bold text-orange-600 mb-2 uppercase tracking-widest">Pending Amount</h4>
            <p className="text-3xl font-bold text-orange-900">{FormattingService.formatCurrency(stats.totalRevenue - stats.totalCollected)}</p>
            <div className="mt-4 h-2 bg-orange-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-orange-500 to-orange-600"
                style={{ width: `${100 - stats.collectionRate}%` }}
              ></div>
            </div>
            <p className="text-xs text-orange-600 mt-2">⚠️ Due from customers</p>
          </div>
        </div>
      </div>

      {/* Top Items Section */}
      <div className="bg-white rounded-2xl card-shadow overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-white">
          <h3 className="text-3xl font-bold flex items-center gap-3">
            <span>🔝</span> Top Selling Items
          </h3>
          <p className="text-purple-100 text-sm mt-2">Most popular garments this month</p>
        </div>
        <div className="p-8">
          {topItems.length === 0 ? (
            <p className="text-center text-gray-600 py-8">No items sold yet</p>
          ) : (
            <div className="space-y-4">
              {topItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-transparent rounded-xl hover:shadow-md transition-all">
                  <div className="text-3xl font-bold text-purple-600 w-12 text-center">
                    {['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][idx] || `${idx + 1}`}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.count} orders</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-purple-600">{FormattingService.formatCurrency(item.revenue)}</p>
                    <p className="text-xs text-gray-500">revenue</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== ORDERS TAB ====================

interface OrdersTabProps {
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  shop: Shop;
}

const OrdersTab: React.FC<OrdersTabProps> = ({ orders, shop }) => {
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const toast = useToast();

  const sendWhatsAppMessage = async (order: Order) => {
    const message = `Hello ${order.customer}! 👋\n\nYour SAPTHALA tailoring order is confirmed!\n📦 Order ID: ${order.id}\n💰 Total Amount: ${FormattingService.formatCurrency(order.total)}\n💳 Advance Paid: ${FormattingService.formatCurrency(order.advance)}\n⏳ Balance Due: ${FormattingService.formatCurrency(order.total - order.advance)}\n\n📋 Items:\n${order.items.map(i => `• ${i.name} (${FormattingService.formatCurrency(i.price)})`).join('\n')}\n\n📅 Expected Delivery: ${order.expectedDelivery ? FormattingService.formatDate(order.expectedDelivery) : 'To be confirmed'}\n\nThank you for choosing SAPTHALA! 🙏\nPowered by MS Technologies`;
    
    const response = await NotificationService.sendWhatsApp({
      type: 'whatsapp',
      recipient: order.whatsapp,
      message,
      orderId: order.id
    });

    if (response.success) {
      toast.addToast(`WhatsApp message sent to ${order.customer}!`, 'success');
    } else {
      toast.addToast('Failed to send WhatsApp message', 'error');
    }
  };

  const printInvoice = (order: Order) => {
    InvoiceService.printInvoice(order, shop.name, shop.address, shop.phone);
    toast.addToast('Invoice printed successfully!', 'success');
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white">
        <h2 className="text-3xl font-bold">📦 Order Management</h2>
      </div>

      <div className="max-h-screen overflow-y-auto">
        {orders.length === 0 ? (
          <p className="p-6 text-center text-gray-600">No orders yet. Create your first order!</p>
        ) : (
          orders.map(order => (
            <div key={order.id} className="border-b border-gray-200 hover:bg-blue-50 transition-colors">
              <button
                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                className="w-full p-6 flex justify-between items-center text-left"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-bold text-lg text-gray-900">{order.customer}</p>
                      <p className="text-sm text-gray-600">{order.id} • {FormattingService.formatDate(order.date)}</p>
                    </div>
                    <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                      order.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                      order.status === 'production' ? 'bg-purple-100 text-purple-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {order.status === 'pending' ? '⏳ Pending' : order.status === 'production' ? '⚙️ Production' : '✅ Completed'}
                    </span>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className="font-bold text-gray-900">{FormattingService.formatCurrency(order.total)}</p>
                  <p className="text-sm text-green-600">Paid: {FormattingService.formatCurrency(order.advance)}</p>
                </div>
              </button>

              {expandedOrder === order.id && (
                <div className="bg-gray-50 p-6 border-t border-gray-200 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-gray-900 mb-3">👤 Customer Details</h4>
                      <div className="space-y-2 text-sm">
                        <p><strong>Name:</strong> {order.customer}</p>
                        <p><strong>Phone:</strong> {FormattingService.formatPhone(order.phone)}</p>
                        <p><strong>WhatsApp:</strong> {FormattingService.formatPhone(order.whatsapp)}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-3">📋 Order Summary</h4>
                      <div className="space-y-2 text-sm">
                        <p><strong>Invoice:</strong> {order.invoice}</p>
                        <p><strong>Total:</strong> {FormattingService.formatCurrency(order.total)}</p>
                        <p><strong>Balance:</strong> {FormattingService.formatCurrency(order.total - order.advance)}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-900 mb-3">📦 Items</h4>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex justify-between py-2 border-b border-gray-200 last:border-b-0">
                          <span className="text-gray-700">{item.name}</span>
                          <span className="font-bold text-gray-900">{FormattingService.formatCurrency(item.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => sendWhatsAppMessage(order)}
                      className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3 px-4 rounded-lg hover:shadow-lg transition-all"
                    >
                      💬 Send WhatsApp
                    </button>
                    <button
                      onClick={() => printInvoice(order)}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:shadow-lg transition-all"
                    >
                      🖨️ Print Invoice
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ==================== NEW ORDER TAB ====================

interface NewOrderFormData {
  customer: string;
  phone: string;
  whatsapp: string;
  items: typeof GARMENT_CATEGORIES[keyof typeof GARMENT_CATEGORIES][0][];
  measurements: Record<string, number>;
  addons: number[];
  discount: number;
  advance: number;
  selectedCategory: keyof typeof GARMENT_CATEGORIES;
  expectedDelivery: string;
}

interface NewOrderTabProps {
  addOrder: (order: Order) => void;
  shop: Shop;
}

const NewOrderTab: React.FC<NewOrderTabProps> = ({ addOrder, shop: _shop }) => {
  const [step, setStep] = useState<number>(1);
  const [formData, setFormData] = useState<NewOrderFormData>({
    customer: '',
    phone: '',
    whatsapp: '',
    items: [],
    measurements: {},
    addons: [],
    discount: 0,
    advance: 0,
    selectedCategory: 'mens',
    expectedDelivery: ''
  });

  const toast = useToast();

  const calculateTotal = useCallback(() => {
    const itemsTotal = formData.items.reduce((sum, item) => sum + item.basePrice, 0);
    const addonsTotal = formData.addons.reduce((sum, addonId) => {
      const addon = ADD_ONS.find(a => a.id === addonId);
      return sum + (addon?.price || 0);
    }, 0);
    return Math.max(0, itemsTotal + addonsTotal - formData.discount);
  }, [formData.items, formData.addons, formData.discount]);

  const handleCreateOrder = () => {
    const validation = ValidationService.isValidOrder({
      customer: formData.customer,
      phone: formData.phone,
      whatsapp: formData.whatsapp,
      items: formData.items as any,
      total: calculateTotal(),
      advance: formData.advance
    });

    if (!validation.valid) {
      validation.errors.forEach(error => toast.addToast(error, 'error'));
      return;
    }

    const newOrder: Order = {
      id: FormattingService.generateOrderId(),
      customer: formData.customer,
      phone: formData.phone,
      whatsapp: formData.whatsapp,
      items: formData.items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.basePrice,
        measurements: formData.measurements
      })),
      addons: formData.addons,
      total: calculateTotal(),
      advance: formData.advance,
      discount: formData.discount,
      status: 'pending',
      date: new Date(),
      invoice: FormattingService.generateInvoiceId(),
      production: PRODUCTION_STAGES.map(s => ({
        stageId: s.id,
        status: 'pending' as const,
        assignedTo: null,
        completedDate: null
      })),
      expectedDelivery: formData.expectedDelivery ? new Date(formData.expectedDelivery) : undefined
    };

    addOrder(newOrder);
    toast.addToast(`Order ${newOrder.id} created successfully! 🎉`, 'success');

    // Send notifications
    NotificationService.sendWhatsApp({
      type: 'whatsapp',
      recipient: formData.whatsapp,
      message: NOTIFICATION_TEMPLATES.orderCreated(formData.customer, newOrder.id),
      orderId: newOrder.id
    });

    // Reset form
    setStep(1);
    setFormData({
      customer: '',
      phone: '',
      whatsapp: '',
      items: [],
      measurements: {},
      addons: [],
      discount: 0,
      advance: 0,
      selectedCategory: 'mens',
      expectedDelivery: ''
    });
  };

  const steps = [
    { number: 1, label: 'Customer' },
    { number: 2, label: 'Items' },
    { number: 3, label: 'Measurements' },
    { number: 4, label: 'Payment' }
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-green-600 to-green-800 p-6 text-white">
        <h2 className="text-3xl font-bold">➕ Create New Order</h2>
      </div>

      <div className="p-8">
        {/* Progress Bar */}
        <div className="mb-10">
          <div className="flex justify-between mb-6">
            {steps.map(s => (
              <button
                key={s.number}
                onClick={() => step >= s.number && setStep(s.number)}
                className={`w-12 h-12 rounded-full font-bold flex items-center justify-center transition-all ${
                  s.number < step
                    ? 'bg-green-500 text-white'
                    : s.number === step
                    ? 'bg-green-600 text-white border-4 border-green-300'
                    : 'bg-gray-300 text-gray-700'
                }`}
              >
                {s.number < step ? '✓' : s.number}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs font-semibold text-gray-600">
            {steps.map(s => (
              <span key={s.number}>{s.label}</span>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-96 mb-8">
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">👤 Customer Information</h3>
              <input
                type="text"
                placeholder="Full Name *"
                value={formData.customer}
                onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                className="w-full p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 font-semibold"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="tel"
                  placeholder="Phone *"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                />
                <input
                  type="tel"
                  placeholder="WhatsApp *"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  className="p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">📦 Select Items</h3>
              <div className="flex gap-3 mb-6">
                {(Object.keys(GARMENT_CATEGORIES) as Array<keyof typeof GARMENT_CATEGORIES>).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFormData({ ...formData, selectedCategory: cat })}
                    className={`px-6 py-3 rounded-lg font-bold transition-all ${
                      formData.selectedCategory === cat
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {cat === 'mens' ? '👔 Men' : cat === 'womens' ? '👗 Women' : '👧 Kids'}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {GARMENT_CATEGORIES[formData.selectedCategory].map(item => {
                  const isSelected = formData.items.some(i => i.id === item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (isSelected) {
                          setFormData({
                            ...formData,
                            items: formData.items.filter(i => i.id !== item.id)
                          });
                        } else {
                          setFormData({
                            ...formData,
                            items: [...formData.items, item]
                          });
                        }
                      }}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-green-500 bg-green-50 shadow-md'
                          : 'border-gray-300 bg-white hover:border-green-400'
                      }`}
                    >
                      <p className="font-bold text-gray-900">{item.name}</p>
                      <p className="text-sm text-green-600 font-bold mt-1">{FormattingService.formatCurrency(item.basePrice)}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">📏 Measurements (in inches)</h3>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {MEASUREMENTS.map(m => (
                  <div key={m}>
                    <label className="text-xs font-bold text-gray-700 block mb-2">{m}</label>
                    <input
                      type="number"
                      placeholder="0"
                      step="0.25"
                      onChange={(e) => setFormData({
                        ...formData,
                        measurements: { ...formData.measurements, [m]: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-full p-2 border-2 border-gray-300 rounded-lg text-center focus:outline-none focus:border-green-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">💰 Payment & Add-ons</h3>

              {/* Items Cost */}
              <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-300">
                <div className="flex justify-between mb-4">
                  <span className="text-gray-700 font-semibold">Items Subtotal:</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {FormattingService.formatCurrency(formData.items.reduce((sum, item) => sum + item.basePrice, 0))}
                  </span>
                </div>

                {/* Add-ons */}
                <div className="border-t border-blue-300 pt-4 mt-4">
                  <label className="block text-sm font-bold text-gray-700 mb-3">✨ Optional Add-ons</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                    {ADD_ONS.map(addon => {
                      const isSelected = formData.addons.includes(addon.id);
                      return (
                        <button
                          key={addon.id}
                          onClick={() => {
                            if (isSelected) {
                              setFormData({
                                ...formData,
                                addons: formData.addons.filter(a => a !== addon.id)
                              });
                            } else {
                              setFormData({
                                ...formData,
                                addons: [...formData.addons, addon.id]
                              });
                            }
                          }}
                          className={`p-2 text-xs font-bold rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-300 bg-white hover:border-green-400'
                          }`}
                        >
                          {addon.name} (+{FormattingService.formatCurrency(addon.price)})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Discount */}
                <div className="border-t border-blue-300 pt-4 mt-4">
                  <label className="block text-sm font-bold text-gray-700 mb-2">🏷️ Discount (Optional)</label>
                  <input
                    type="number"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                    placeholder="Amount"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 font-bold mb-4"
                  />
                </div>

                {/* Total */}
                <div className="bg-white p-4 rounded-lg mt-4 border-2 border-blue-300">
                  <p className="text-sm text-gray-600 mb-2">📊 Total Amount:</p>
                  <p className="text-3xl font-bold text-blue-600">{FormattingService.formatCurrency(calculateTotal())}</p>
                </div>

                {/* Advance Payment */}
                <div className="border-t border-blue-300 pt-4 mt-4">
                  <label className="block text-sm font-bold text-gray-700 mb-3">💳 Advance Payment (Required) *</label>
                  <input
                    type="number"
                    value={formData.advance}
                    onChange={(e) => setFormData({ ...formData, advance: parseFloat(e.target.value) || 0 })}
                    placeholder="Amount"
                    className="w-full p-4 border-2 border-green-300 rounded-lg focus:outline-none focus:border-green-500 font-bold text-lg mb-4"
                  />
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">⏳ Balance Due:</p>
                    <p className="text-3xl font-bold text-orange-600">
                      {FormattingService.formatCurrency(Math.max(0, calculateTotal() - formData.advance))}
                    </p>
                  </div>
                </div>

                {/* Expected Delivery */}
                <div className="border-t border-blue-300 pt-4 mt-4">
                  <label className="block text-sm font-bold text-gray-700 mb-2">📅 Expected Delivery Date</label>
                  <input
                    type="date"
                    value={formData.expectedDelivery}
                    onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                <p className="text-sm text-green-700">✅ Order will be created and invoice sent via WhatsApp</p>
                <p className="text-sm text-green-700 mt-2">✅ Staff app will be notified for production</p>
                <p className="text-sm text-green-700 mt-2">✅ Customer will receive tracking updates</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-4">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-6 py-3 border-2 border-gray-400 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-colors"
            >
              ← Previous
            </button>
          )}
          {step < 4 && (
            <button
              onClick={() => {
                if (step === 1 && (!formData.customer || !formData.phone || !formData.whatsapp)) {
                  toast.addToast('Please fill in customer details', 'error');
                  return;
                }
                if (step === 2 && formData.items.length === 0) {
                  toast.addToast('Please select at least one item', 'error');
                  return;
                }
                setStep(step + 1);
              }}
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3 rounded-lg hover:shadow-lg transition-all"
            >
              Next →
            </button>
          )}
          {step === 4 && (
            <button
              onClick={handleCreateOrder}
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3 rounded-lg hover:shadow-lg transition-all"
            >
              ✅ Create Order & Send Invoice
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== PRODUCTION TAB ====================

interface ProductionTabProps {
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  shop: Shop;
}

const ProductionTab: React.FC<ProductionTabProps> = ({ orders, setOrders, shop: _shop }) => {
  const toast = useToast();
  const productionOrders = orders.filter(o => o.status === 'production' || o.status === 'pending');

  const updateProductionStage = (orderId: string, stageId: number, status: string) => {
    const updatedOrders = orders.map(order => {
      if (order.id === orderId) {
        return {
          ...order,
          production: order.production.map(p =>
            p.stageId === stageId ? { ...p, status: status as any } : p
          )
        };
      }
      return order;
    });
    setOrders(updatedOrders);
    toast.addToast(`Stage updated to ${status}`, 'success');
  };

  const assignWorker = (orderId: string, stageId: number, workerId: number) => {
    const worker = WORKERS.find(w => w.id === workerId);
    const updatedOrders = orders.map(order => {
      if (order.id === orderId) {
        return {
          ...order,
          production: order.production.map(p =>
            p.stageId === stageId ? { ...p, assignedTo: workerId } : p
          )
        };
      }
      return order;
    });
    setOrders(updatedOrders);
    
    if (worker) {
      toast.addToast(`${PRODUCTION_STAGES.find(s => s.id === stageId)?.name} assigned to ${worker.name}`, 'success');
      
      // Notify worker via WhatsApp
      NotificationService.sendWhatsApp({
        type: 'whatsapp',
        recipient: worker.phone,
        message: NOTIFICATION_TEMPLATES.staffAssignment(worker.name, orderId, PRODUCTION_STAGES.find(s => s.id === stageId)?.name || ''),
        orderId
      });
    }
  };

  return (
    <div className="space-y-6">
      {productionOrders.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-lg">
          <p className="text-2xl text-gray-600">No orders in production</p>
        </div>
      ) : (
        productionOrders.map(order => (
          <div key={order.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-6 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold">{order.customer}</h3>
                  <p className="text-purple-100">{order.id} • {FormattingService.formatCurrency(order.total)}</p>
                </div>
                <span className="px-4 py-2 bg-white text-purple-700 rounded-full font-bold">
                  {order.status === 'pending' ? '⏳ Pending' : '⚙️ Production'}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {PRODUCTION_STAGES.map(stage => {
                const progress = order.production.find(p => p.stageId === stage.id);
                return (
                  <div key={stage.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all">
                    <div className="text-3xl">{stage.icon}</div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{stage.name}</p>
                      {progress?.assignedTo && (
                        <p className="text-xs text-gray-600">Assigned to: {WORKERS.find(w => w.id === progress.assignedTo)?.name}</p>
                      )}
                    </div>

                    <select
                      value={progress?.status || 'pending'}
                      onChange={(e) => updateProductionStage(order.id, stage.id, e.target.value)}
                      className="p-2 border-2 border-gray-300 rounded-lg font-semibold focus:outline-none focus:border-purple-500"
                    >
                      <option value="pending">⏳ Pending</option>
                      <option value="in-progress">⚙️ In Progress</option>
                      <option value="completed">✅ Completed</option>
                    </select>

                    <select
                      value={progress?.assignedTo || ''}
                      onChange={(e) => assignWorker(order.id, stage.id, Number(e.target.value))}
                      className="p-2 border-2 border-gray-300 rounded-lg font-semibold focus:outline-none focus:border-purple-500"
                    >
                      <option value="">Assign Worker</option>
                      {WORKERS.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.role})
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

// ==================== STAFF TAB ====================

const StaffTab: React.FC = () => {
  const toast = useToast();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {WORKERS.map(worker => (
        <div key={worker.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all transform hover:scale-105">
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-6 text-white">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold">{worker.name}</h3>
                <p className="text-indigo-100 mt-1">👷 {worker.role}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                worker.isAvailable ? 'bg-green-400 text-green-900' : 'bg-red-400 text-red-900'
              }`}>
                {worker.isAvailable ? '🟢 Available' : '🔴 Busy'}
              </span>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-gray-700">
              <span className="text-2xl">📞</span>
              <span className="font-semibold">{FormattingService.formatPhone(worker.phone)}</span>
            </div>

            {worker.currentTasks !== undefined && (
              <div className="flex items-center gap-2 text-gray-700">
                <span className="text-2xl">📋</span>
                <span className="font-semibold">{worker.currentTasks} Active Tasks</span>
              </div>
            )}

            <div>
              <p className="text-sm font-bold text-gray-600 mb-2">✨ Expertise:</p>
              <div className="flex flex-wrap gap-2">
                {worker.expertise.map((exp: string) => (
                  <span key={exp} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
                    {exp}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-200">
              <button
                onClick={() => window.open(`https://wa.me/${worker.phone}`, '_blank')}
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-2 px-4 rounded-lg hover:shadow-lg transition-all text-sm"
              >
                💬 WhatsApp
              </button>
              <button
                onClick={() => toast.addToast(`Call initiated to ${worker.name}`, 'success')}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:shadow-lg transition-all text-sm"
              >
                📞 Call
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ==================== MAIN ADMIN PANEL ====================

interface AdminPanelProps {
  shop: Shop;
  onLogout: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ shop, onLogout }) => {
  const [tab, setTab] = useState<'dashboard' | 'orders' | 'new-order' | 'production' | 'staff'>('dashboard');
  const [orders, setOrders] = useState<Order[]>([
    {
      id: 'ORD001',
      customer: 'Rajesh Kumar',
      phone: '9876543210',
      whatsapp: '9876543210',
      items: [{ id: 'm1', name: 'Kurta/Pathani', price: 800 }],
      addons: [],
      total: 800,
      advance: 500,
      discount: 0,
      status: 'pending',
      date: new Date(Date.now() - 86400000),
      invoice: 'INV001',
      production: PRODUCTION_STAGES.map(s => ({ stageId: s.id, status: 'pending' as const, assignedTo: null, completedDate: null }))
    },
    {
      id: 'ORD002',
      customer: 'Priya Singh',
      phone: '9876543211',
      whatsapp: '9876543211',
      items: [{ id: 'w4', name: 'Lehenga', price: 1500 }],
      addons: [4],
      total: 2000,
      advance: 1000,
      discount: 0,
      status: 'production',
      date: new Date(Date.now() - 172800000),
      invoice: 'INV002',
      production: PRODUCTION_STAGES.map(s => ({ stageId: s.id, status: s.id === 1 ? ('completed' as const) : 'pending' as const, assignedTo: s.id === 1 ? 1 : null, completedDate: s.id === 1 ? new Date(Date.now() - 86400000) : null }))
    }
  ]);

  const stats = useMemo(() => AnalyticsService.calculateStats(orders), [orders]);

  const addOrder = useCallback((newOrder: Order) => {
    setOrders(prev => [...prev, newOrder]);
  }, []);

  const tabs = [
    { id: 'dashboard' as const, label: '📊 Dashboard', icon: '📈' },
    { id: 'orders' as const, label: '📦 Orders', icon: '📋' },
    { id: 'new-order' as const, label: '➕ New Order', icon: '✏️' },
    { id: 'production' as const, label: '🏭 Production', icon: '⚙️' },
    { id: 'staff' as const, label: '👥 Staff', icon: '👷' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Modern Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-gray-200 shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            {/* Logo & Shop Info */}
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-lg opacity-75"></div>
                <div className="relative w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-3xl text-white shadow-2xl transform hover:scale-110 transition-transform">
                  ✂️
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {shop.name}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  <span className="flex items-center gap-1">📍 {shop.location}</span>
                  <span className="flex items-center gap-1">📞 {shop.phone}</span>
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="px-8 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-bold hover:shadow-2xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="sticky top-24 z-40 bg-white border-b border-gray-200 shadow-md">
        <div className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-8 py-4 font-bold transition-all relative whitespace-nowrap group ${
                tab === t.id
                  ? 'text-blue-600'
                  : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              {t.label}
              {tab === t.id && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-full"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="page-transition">
          {tab === 'dashboard' && <DashboardTab stats={stats} orders={orders} shop={shop} />}
          {tab === 'orders' && <OrdersTab orders={orders} setOrders={setOrders} shop={shop} />}
          {tab === 'new-order' && <NewOrderTab addOrder={addOrder} shop={shop} />}
          {tab === 'production' && <ProductionTab orders={orders} setOrders={setOrders} shop={shop} />}
          {tab === 'staff' && <StaffTab />}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-lg font-bold">Powered by MS Technologies™</p>
          <p className="text-gray-400 text-sm mt-2">© 2024 SAPTHALA Tailoring Management System. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

// ==================== APP COMPONENT ====================

export default function App(): React.ReactNode {
  const [screen, setScreen] = useState<'login' | 'admin'>('login');
  const [currentShop, setCurrentShop] = useState<Shop | null>(null);

  return (
    <ToastContainer>
      {screen === 'login' ? (
        <LoginScreen
          onLogin={(shopId) => {
            const shop = SHOPS.find(s => s.id === shopId);
            if (shop) {
              setCurrentShop(shop);
              setScreen('admin');
            }
          }}
        />
      ) : currentShop ? (
        <AdminPanel
          shop={currentShop}
          onLogout={() => {
            setScreen('login');
            setCurrentShop(null);
          }}
        />
      ) : null}
    </ToastContainer>
  );
}
