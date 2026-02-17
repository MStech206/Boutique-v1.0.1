// ==================== UTILITY FUNCTIONS ====================

import type { Order, NotificationPayload, APIResponse } from '../types';

// ==================== NOTIFICATION SERVICE ====================

export class NotificationService {
  static async sendWhatsApp(payload: NotificationPayload): Promise<APIResponse<{ messageId: string }>> {
    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: payload.recipient,
          message: payload.message,
          orderId: payload.orderId
        })
      });
      
      return await response.json();
    } catch (error) {
      console.error('WhatsApp error:', error);
      return { success: false, error: 'Failed to send WhatsApp', timestamp: new Date() };
    }
  }

  static async sendSMS(payload: NotificationPayload): Promise<APIResponse<{ messageId: string }>> {
    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: payload.recipient,
          message: payload.message,
          orderId: payload.orderId
        })
      });
      
      return await response.json();
    } catch (error) {
      console.error('SMS error:', error);
      return { success: false, error: 'Failed to send SMS', timestamp: new Date() };
    }
  }

  static async sendEmail(payload: NotificationPayload): Promise<APIResponse<{ messageId: string }>> {
    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: payload.recipient,
          subject: payload.subject || 'Order Update',
          message: payload.message,
          orderId: payload.orderId
        })
      });
      
      return await response.json();
    } catch (error) {
      console.error('Email error:', error);
      return { success: false, error: 'Failed to send email', timestamp: new Date() };
    }
  }

  static async sendPushNotification(payload: NotificationPayload): Promise<APIResponse<{ notificationId: string }>> {
    try {
      if (!('Notification' in window)) {
        throw new Error('Push notifications not supported');
      }

      if (Notification.permission === 'granted') {
        const notification = new Notification(payload.subject || 'SAPTHALA Order Update', {
          body: payload.message,
          icon: '✂️',
          badge: '✂️',
          tag: payload.orderId || 'sapthala',
          requireInteraction: true
        });

        notification.onclick = () => window.focus();
      }

      return { success: true, data: { notificationId: Date.now().toString() }, timestamp: new Date() };
    } catch (error) {
      console.error('Push notification error:', error);
      return { success: false, error: 'Failed to send push notification', timestamp: new Date() };
    }
  }

  static async sendMultiple(payloads: NotificationPayload[]): Promise<APIResponse<{ sent: number; failed: number }>> {
    const results = await Promise.all(
      payloads.map(async (payload) => {
        switch (payload.type) {
          case 'whatsapp':
            return this.sendWhatsApp(payload);
          case 'sms':
            return this.sendSMS(payload);
          case 'email':
            return this.sendEmail(payload);
          case 'push':
            return this.sendPushNotification(payload);
          default:
            return { success: false, error: 'Unknown notification type', timestamp: new Date() };
        }
      })
    );

    const sent = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return { success: true, data: { sent, failed }, timestamp: new Date() };
  }
}

// ==================== INVOICE SERVICE ====================

export class InvoiceService {
  static generateInvoiceHTML(order: Order, shopName: string, shopAddress: string, shopPhone: string): string {
    const balanceDue = order.total - order.advance;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: white; }
          .invoice-container { max-width: 800px; margin: 0 auto; padding: 30px; background: white; }
          .header { text-align: center; border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { margin: 0; font-size: 36px; color: #1e40af; }
          .header p { margin: 5px 0; color: #666; }
          .invoice-details { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
          .invoice-details div { }
          .invoice-details strong { color: #999; font-size: 12px; display: block; }
          .invoice-details span { font-size: 18px; font-weight: bold; color: #1e40af; }
          .customer-box { background: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #3b82f6; }
          .customer-box p { margin: 5px 0; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .items-table th { text-align: left; padding: 12px; background: #f3f4f6; border-bottom: 2px solid #ddd; font-weight: bold; }
          .items-table td { padding: 12px; border-bottom: 1px solid #eee; }
          .totals-box { background: #dbeafe; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
          .totals-box div { display: flex; justify-content: space-between; margin-bottom: 10px; }
          .balance-due { border-top: 2px solid #60a5fa; padding-top: 15px; color: #dc2626; font-size: 18px; font-weight: bold; }
          .terms { background: #f0fdf4; padding: 15px; border-radius: 8px; font-size: 12px; color: #166534; margin-bottom: 20px; }
          .footer { text-align: center; border-top: 1px solid #ddd; padding-top: 20px; color: #999; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <h1>✂️ SAPTHALA</h1>
            <h2>${shopName}</h2>
            <p>📍 ${shopAddress} | 📞 ${shopPhone}</p>
          </div>

          <div class="invoice-details">
            <div>
              <strong>INVOICE NUMBER</strong>
              <span>${order.invoice}</span>
            </div>
            <div>
              <strong>ORDER ID</strong>
              <span>${order.id}</span>
            </div>
          </div>

          <div class="customer-box">
            <p><strong>${order.customer}</strong></p>
            <p>📱 WhatsApp: ${order.whatsapp} | 📞 Phone: ${order.phone}</p>
            <p>📅 Order Date: ${order.date.toLocaleDateString()} | 🎯 Expected: ${order.expectedDelivery?.toLocaleDateString() || 'TBD'}</p>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>1</td>
                  <td>₹${item.price}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals-box">
            <div>
              <span>Subtotal:</span>
              <span>₹${order.total - order.discount}</span>
            </div>
            ${order.discount > 0 ? `
              <div>
                <span>Discount:</span>
                <span>-₹${order.discount}</span>
              </div>
            ` : ''}
            <div>
              <span>Advance Paid:</span>
              <span style="color: #059669;">✅ ₹${order.advance}</span>
            </div>
            <div class="balance-due">
              <span>Balance Due:</span>
              <span>₹${balanceDue}</span>
            </div>
          </div>

          <div class="terms">
            <p>✅ Professional tailoring with quality assurance</p>
            <p>✅ WhatsApp updates will be provided regularly</p>
            <p>✅ Payment due on final delivery</p>
            <p>✅ Returns accepted within 7 days of delivery</p>
          </div>

          <div class="footer">
            <p>Date: ${new Date().toLocaleDateString()} | Powered by MS Technologies</p>
            <p>Thank you for choosing SAPTHALA! Your satisfaction is our priority.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  static printInvoice(order: Order, shopName: string, shopAddress: string, shopPhone: string): void {
    const html = this.generateInvoiceHTML(order, shopName, shopAddress, shopPhone);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
    }
  }

  static downloadInvoiceAsJSON(order: Order): void {
    const dataStr = JSON.stringify(order, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice_${order.invoice}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
}

// ==================== DATA SERVICE ====================

export class DataService {
  static async fetchOrders(): Promise<APIResponse<any[]>> {
    try {
      const response = await fetch('/api/orders');
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Failed to fetch orders', timestamp: new Date() };
    }
  }

  static async createOrder(order: Order): Promise<APIResponse<Order>> {
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Failed to create order', timestamp: new Date() };
    }
  }

  static async updateOrder(orderId: string, updates: Partial<Order>): Promise<APIResponse<Order>> {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Failed to update order', timestamp: new Date() };
    }
  }

  static async getAnalytics(shopId: number): Promise<APIResponse<any>> {
    try {
      const response = await fetch(`/api/analytics?shopId=${shopId}`);
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Failed to fetch analytics', timestamp: new Date() };
    }
  }
}

// ==================== STORAGE SERVICE ====================

export class StorageService {
  static setItem(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Storage error:', error);
    }
  }

  static getItem(key: string): any {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Storage error:', error);
      return null;
    }
  }

  static removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Storage error:', error);
    }
  }

  static clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Storage error:', error);
    }
  }
}

// ==================== VALIDATION SERVICE ====================

export class ValidationService {
  static isValidPhone(phone: string): boolean {
    return /^[0-9]{10}$/.test(phone.replace(/\D/g, ''));
  }

  static isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  static isValidWhatsApp(whatsapp: string): boolean {
    return /^[0-9]{10}$/.test(whatsapp.replace(/\D/g, ''));
  }

  static isValidOrder(order: Partial<Order>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!order.customer?.trim()) errors.push('Customer name is required');
    if (!order.phone || !this.isValidPhone(order.phone)) errors.push('Valid phone number is required');
    if (!order.whatsapp || !this.isValidWhatsApp(order.whatsapp)) errors.push('Valid WhatsApp number is required');
    if (!order.items || order.items.length === 0) errors.push('At least one item is required');
    if (!order.total || order.total <= 0) errors.push('Valid total amount is required');
    if (!order.advance || order.advance <= 0) errors.push('Advance payment is required');

    return { valid: errors.length === 0, errors };
  }
}

// ==================== FORMATTING SERVICE ====================

export class FormattingService {
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  static formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  }

  static formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.replace(/(\d{5})(\d{5})/, '$1 $2');
  }

  static generateOrderId(): string {
    return 'ORD' + Date.now().toString().slice(-9);
  }

  static generateInvoiceId(): string {
    return 'INV' + Date.now().toString().slice(-8);
  }

  static truncateText(text: string, length: number): string {
    return text.length > length ? text.substring(0, length) + '...' : text;
  }
}

// ==================== ANALYTICS SERVICE ====================

export class AnalyticsService {
  static calculateStats(orders: Order[]) {
    return {
      totalOrders: orders.length,
      pendingOrders: orders.filter(o => o.status === 'pending').length,
      productionOrders: orders.filter(o => o.status === 'production').length,
      completedOrders: orders.filter(o => o.status === 'completed' || o.status === 'delivered').length,
      totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
      totalCollected: orders.reduce((sum, o) => sum + o.advance, 0),
      averageOrderValue: Math.round(orders.reduce((sum, o) => sum + o.total, 0) / (orders.length || 1)),
      collectionRate: orders.length > 0 ? Math.round((orders.reduce((sum, o) => sum + o.advance, 0) / orders.reduce((sum, o) => sum + o.total, 0)) * 100) : 0
    };
  }

  static getOrderTrends(orders: Order[], days: number = 30): Record<string, number> {
    const trends: Record<string, number> = {};
    const now = Date.now();

    for (let i = 0; i < days; i++) {
      const date = new Date(now - i * 86400000);
      const dateStr = date.toLocaleDateString();
      trends[dateStr] = orders.filter(o => o.date.toLocaleDateString() === dateStr).length;
    }

    return trends;
  }

  static getTopItems(orders: Order[]): Array<{ name: string; count: number; revenue: number }> {
    const itemMap: Record<string, { count: number; revenue: number }> = {};

    orders.forEach(order => {
      order.items.forEach(item => {
        if (!itemMap[item.name]) {
          itemMap[item.name] = { count: 0, revenue: 0 };
        }
        itemMap[item.name].count++;
        itemMap[item.name].revenue += item.price;
      });
    });

    return Object.entries(itemMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
}
