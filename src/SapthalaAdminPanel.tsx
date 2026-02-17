import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';

// ================ TYPES & INTERFACES ================
interface Customer {
  name: string;
  phone: string;
  address: string;
}

interface Garment {
  id: string;
  name: string;
  price: number;
  measurements: string[];
  category: string;
  sizes?: string[];
}

interface Order {
  id: string;
  customer: Customer;
  category: string;
  garment: string;
  measurements: Record<string, string | number>;
  design: {
    description: string;
    notes: string;
    images: Array<{ name: string; data: string }>;
  };
  assignedStaff: StaffMember | null;
  deliveryDate: string;
  status: OrderStatus;
  finalPrice: number;
  advanceAmount: number;
  balanceDue: number;
  selectedAddons: string[];
  basePrice: number;
  customAddonAmount: number;
  discount: number;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
  workflowStage: WorkflowStage;
  pdfGenerated: boolean;
  pdfUrl?: string;
}

interface StaffMember {
  id: number;
  name: string;
  role: string;
  phone: string;
  expertise: string[];
  isAvailable: boolean;
  currentTasks: number;
  workflowStages: string[];
}

interface AddonService {
  id: string;
  name: string;
  price: number;
}

interface WorkflowStage {
  id: string;
  name: string;
  status: 'pending' | 'in-progress' | 'completed';
  assignedTo: number | null;
  startedAt?: string;
  completedAt?: string;
}

type OrderStatus = 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELIVERED' | 'CANCELLED' | 'DRAFT';
type TabType = 'dashboard' | 'new-order' | 'orders' | 'staff' | 'reports';

// ================ CONSTANTS & DATA ================
const ADMIN_PASSWORD = 'sapthala@2029';

const WORKFLOW_STAGES = [
  { id: 'dyeing', name: 'Dyeing', icon: '🎨' },
  { id: 'cutting', name: 'Cutting', icon: '✂️' },
  { id: 'stitching', name: 'Stitching', icon: '🧵' },
  { id: 'khakha', name: 'Khakha', icon: '🔧' },
  { id: 'maggam', name: 'Maggam', icon: '✨' },
  { id: 'painting', name: 'Painting', icon: '🎭' },
  { id: 'finishing', name: 'Finishing', icon: '🏁' },
  { id: 'quality-check', name: 'Quality Check', icon: '🔍' },
  { id: 'ready-to-deliver', name: 'Ready to Deliver', icon: '📦' }
];

const STAFF_MEMBERS: StaffMember[] = [
  { id: 1, name: 'Rajesh Kumar', role: 'Dyeing Specialist', phone: '9876543210', expertise: ['Dyeing'], isAvailable: true, currentTasks: 0, workflowStages: ['dyeing'] },
  { id: 2, name: 'Priya Sharma', role: 'Master Cutter', phone: '9876543211', expertise: ['Cutting'], isAvailable: true, currentTasks: 0, workflowStages: ['cutting'] },
  { id: 3, name: 'Amit Patel', role: 'Senior Tailor', phone: '9876543212', expertise: ['Stitching'], isAvailable: true, currentTasks: 0, workflowStages: ['stitching'] },
  { id: 4, name: 'Sneha Desai', role: 'Khakha Expert', phone: '9876543213', expertise: ['Khakha'], isAvailable: true, currentTasks: 0, workflowStages: ['khakha'] },
  { id: 5, name: 'Vikram Singh', role: 'Maggam Artist', phone: '9876543214', expertise: ['Maggam'], isAvailable: true, currentTasks: 0, workflowStages: ['maggam'] },
  { id: 6, name: 'Kavya Reddy', role: 'Painting Artist', phone: '9876543215', expertise: ['Painting'], isAvailable: true, currentTasks: 0, workflowStages: ['painting'] },
  { id: 7, name: 'Ravi Kumar', role: 'Finishing Expert', phone: '9876543216', expertise: ['Finishing'], isAvailable: true, currentTasks: 0, workflowStages: ['finishing'] },
  { id: 8, name: 'Meera Nair', role: 'Quality Controller', phone: '9876543217', expertise: ['Quality Check'], isAvailable: true, currentTasks: 0, workflowStages: ['quality-check'] },
  { id: 9, name: 'Suresh Babu', role: 'Delivery Executive', phone: '9876543218', expertise: ['Delivery'], isAvailable: true, currentTasks: 0, workflowStages: ['ready-to-deliver'] }
];

const ADDON_SERVICES: AddonService[] = [
  { id: 'a1', name: 'Fall & Pico', price: 150 },
  { id: 'a2', name: 'Saree Knots', price: 500 },
  { id: 'a3', name: 'Hand Embroidery', price: 800 },
  { id: 'a4', name: 'Machine Embroidery', price: 600 },
  { id: 'a5', name: 'Lining', price: 500 },
  { id: 'a6', name: 'Dyeing', price: 400 },
  { id: 'a7', name: 'Can-can', price: 500 },
  { id: 'a8', name: 'Custom Add-on', price: 0 }
];

// Updated measurements based on document
const MEASUREMENTS = {
  'Blouse': {
    'BL': 'Blouse Length',
    'UB': 'Upper Bust',
    'B': 'Bust',
    'W': 'Waist',
    'AH-R': 'Arm Hole Round (Right)',
    'AH-L': 'Arm Hole Round (Left)',
    'SH': 'Shoulder',
    'SL': 'Sleeve Length',
    'SR-R': 'Sleeve Round (Right)',
    'SR-L': 'Sleeve Round (Left)',
    'Bi': 'Bicep Length',
    'B-R': 'Bicep Round (Right)',
    'B-L': 'Bicep Round (Left)',
    'EL': 'Elbow Length',
    'ER-R': 'Elbow Round (Right)',
    'ER-L': 'Elbow Round (Left)',
    'FC': 'Front Cross',
    'BC': 'Back Cross',
    'FN': 'Front Neck Deep',
    'BN': 'Back Neck Deep',
    'CR': 'Collar Round',
    'DP': 'Dart Point',
    'DD': 'Dart Point Distance'
  },
  'Frock': {
    'FL': 'Frock Length',
    'UB': 'Upper Bust',
    'B': 'Bust',
    'W': 'Waist',
    'AH-R': 'Arm Hole Round (Right)',
    'AH-L': 'Arm Hole Round (Left)',
    'SH': 'Shoulder',
    'SL': 'Sleeve Length',
    'SR-R': 'Sleeve Round (Right)',
    'SR-L': 'Sleeve Round (Left)',
    'Bi': 'Bicep Length',
    'B-R': 'Bicep Round (Right)',
    'B-L': 'Bicep Round (Left)',
    'EL': 'Elbow Length',
    'ER-R': 'Elbow Round (Right)',
    'ER-L': 'Elbow Round (Left)',
    'FC': 'Front Cross',
    'BC': 'Back Cross',
    'FN': 'Front Neck Deep',
    'BN': 'Back Neck Deep',
    'CR': 'Collar Round',
    'DP': 'Dart Point',
    'DD': 'Dart Point Distance'
  },
  'Lehenga': {
    'LL': 'Lehenga Length',
    'LW': 'Lehenga Waist',
    'UB': 'Upper Bust',
    'B': 'Bust',
    'W': 'Waist',
    'AH-R': 'Arm Hole Round (Right)',
    'AH-L': 'Arm Hole Round (Left)',
    'SH': 'Shoulder',
    'SL': 'Sleeve Length',
    'SR-R': 'Sleeve Round (Right)',
    'SR-L': 'Sleeve Round (Left)',
    'Bi': 'Bicep Length',
    'B-R': 'Bicep Round (Right)',
    'B-L': 'Bicep Round (Left)',
    'EL': 'Elbow Length',
    'ER-R': 'Elbow Round (Right)',
    'ER-L': 'Elbow Round (Left)',
    'FC': 'Front Cross',
    'BC': 'Back Cross',
    'FN': 'Front Neck Deep',
    'BN': 'Back Neck Deep',
    'CR': 'Collar Round',
    'DP': 'Dart Point',
    'DD': 'Dart Point Distance'
  },
  'Kurta': {
    'KL': 'Kurta Length',
    'ST': 'Slit Length',
    'UB': 'Upper Bust',
    'B': 'Bust',
    'W': 'Waist',
    'HR': 'Hip Round',
    'AH-R': 'Arm Hole Round (Right)',
    'AH-L': 'Arm Hole Round (Left)',
    'SH': 'Shoulder',
    'SL': 'Sleeve Length',
    'SR-R': 'Sleeve Round (Right)',
    'SR-L': 'Sleeve Round (Left)',
    'Bi': 'Bicep Length',
    'B-R': 'Bicep Round (Right)',
    'B-L': 'Bicep Round (Left)',
    'EL': 'Elbow Length',
    'ER-R': 'Elbow Round (Right)',
    'ER-L': 'Elbow Round (Left)',
    'FC': 'Front Cross',
    'BC': 'Back Cross',
    'FN': 'Front Neck Deep',
    'BN': 'Back Neck Deep',
    'CR': 'Collar Round'
  },
  'Suit': {
    'ST': 'Slit Length',
    'UB': 'Upper Bust',
    'B': 'Bust',
    'W': 'Waist',
    'HR': 'Hip Round',
    'AH-R': 'Arm Hole Round (Right)',
    'AH-L': 'Arm Hole Round (Left)',
    'SH': 'Shoulder',
    'SL': 'Sleeve Length',
    'SR-R': 'Sleeve Round (Right)',
    'SR-L': 'Sleeve Round (Left)',
    'Bi': 'Bicep Length',
    'B-R': 'Bicep Round (Right)',
    'B-L': 'Bicep Round (Left)',
    'EL': 'Elbow Length',
    'ER-R': 'Elbow Round (Right)',
    'ER-L': 'Elbow Round (Left)',
    'FC': 'Front Cross',
    'BC': 'Back Cross',
    'FN': 'Front Neck Deep',
    'BN': 'Back Neck Deep',
    'CR': 'Collar Round'
  },
  'Pant': {
    'PL': 'Pant Length',
    'PW': 'Pant Waist',
    'TR': 'Thigh Round',
    'KR': 'Knee Round',
    'AR': 'Ankle Round',
    'BR': 'Bottom Round',
    'CD': 'Crotch Depth'
  }
};

// Updated pricing based on document
const GARMENT_TEMPLATES: Record<string, Garment[]> = {
  'Women': [
    // Lehengas
    { id: 'w1', name: 'Kids Lehenga (2-5 Years)', price: 1300, measurements: Object.keys(MEASUREMENTS.Lehenga), category: 'Lehenga' },
    { id: 'w2', name: 'Kids Lehenga (6-8 Years)', price: 2000, measurements: Object.keys(MEASUREMENTS.Lehenga), category: 'Lehenga' },
    { id: 'w3', name: 'Umbrella Lehenga', price: 2200, measurements: Object.keys(MEASUREMENTS.Lehenga), category: 'Lehenga' },
    { id: 'w4', name: 'Pleated Lehenga', price: 2800, measurements: Object.keys(MEASUREMENTS.Lehenga), category: 'Lehenga' },
    { id: 'w5', name: 'Panneled (Kali) Lehenga', price: 3500, measurements: Object.keys(MEASUREMENTS.Lehenga), category: 'Lehenga' },
    { id: 'w6', name: 'Can-Can Lehenga', price: 800, measurements: Object.keys(MEASUREMENTS.Lehenga), category: 'Lehenga' },
    
    // Kurthis
    { id: 'w7', name: 'Plain Kurthi', price: 650, measurements: Object.keys(MEASUREMENTS.Kurta), category: 'Kurta' },
    { id: 'w8', name: 'Lining Kurthi', price: 850, measurements: Object.keys(MEASUREMENTS.Kurta), category: 'Kurta' },
    
    // Suits
    { id: 'w9', name: 'Plain Suit', price: 1150, measurements: Object.keys(MEASUREMENTS.Suit), category: 'Suit' },
    { id: 'w10', name: 'Top with Lining & Plain Pant', price: 1350, measurements: Object.keys(MEASUREMENTS.Suit), category: 'Suit' },
    { id: 'w11', name: 'Full Lining Suit', price: 1600, measurements: Object.keys(MEASUREMENTS.Suit), category: 'Suit' },
    
    // Blouses
    { id: 'w12', name: 'Cross Cut Blouse', price: 850, measurements: Object.keys(MEASUREMENTS.Blouse), category: 'Blouse' },
    { id: 'w13', name: 'Katora Blouse', price: 1200, measurements: Object.keys(MEASUREMENTS.Blouse), category: 'Blouse' },
    { id: 'w14', name: 'Princess Cut Blouse', price: 950, measurements: Object.keys(MEASUREMENTS.Blouse), category: 'Blouse' },
    { id: 'w15', name: 'Padded Blouse', price: 1200, measurements: Object.keys(MEASUREMENTS.Blouse), category: 'Blouse' },
    
    // Instant Sarees
    { id: 'w16', name: 'Instant Saree Stitching', price: 2250, measurements: Object.keys(MEASUREMENTS.Blouse), category: 'Saree' }
  ],
  'Kids': [
    // Frocks
    { id: 'k1', name: 'Kids Frock (2-5 Years)', price: 1350, measurements: Object.keys(MEASUREMENTS.Frock), category: 'Frock' },
    { id: 'k2', name: 'Kids Frock (6-8 Years)', price: 1750, measurements: Object.keys(MEASUREMENTS.Frock), category: 'Frock' },
    { id: 'k3', name: 'Umbrella Frock', price: 2400, measurements: Object.keys(MEASUREMENTS.Frock), category: 'Frock' },
    { id: 'k4', name: 'Pleated Frock', price: 2600, measurements: Object.keys(MEASUREMENTS.Frock), category: 'Frock' },
    { id: 'k5', name: 'Panneled (Kali) Frock', price: 3500, measurements: Object.keys(MEASUREMENTS.Frock), category: 'Frock' },
    { id: 'k6', name: 'Shoulder Panneled Frock', price: 4500, measurements: Object.keys(MEASUREMENTS.Frock), category: 'Frock' }
  ],
  'Ready-made': [
    { id: 'r1', name: 'Ready-made Shirt', price: 500, measurements: [], category: 'Ready-made', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] },
    { id: 'r2', name: 'Ready-made Dress', price: 800, measurements: [], category: 'Ready-made', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] },
    { id: 'r3', name: 'Ready-made Kurta', price: 600, measurements: [], category: 'Ready-made', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] }
  ],
  'Fittings': [
    { id: 'f1', name: 'Blouse Fitting', price: 200, measurements: Object.keys(MEASUREMENTS.Blouse), category: 'Fitting' },
    { id: 'f2', name: 'Dress Fitting', price: 300, measurements: Object.keys(MEASUREMENTS.Frock), category: 'Fitting' },
    { id: 'f3', name: 'Pant Fitting', price: 150, measurements: Object.keys(MEASUREMENTS.Pant), category: 'Fitting' }
  ],
  'Redo-Order': [
    { id: 'rd1', name: 'Redo Previous Order', price: 0, measurements: [], category: 'Redo' }
  ]
};

const ORDER_STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  'QUEUED': { bg: '#fef3c7', text: '#92400e' },
  'IN_PROGRESS': { bg: '#dbeafe', text: '#1e40af' },
  'COMPLETED': { bg: '#dcfce7', text: '#166534' },
  'DELIVERED': { bg: '#f3e8ff', text: '#7c3aed' },
  'CANCELLED': { bg: '#fee2e2', text: '#dc2626' },
  'DRAFT': { bg: '#f1f5f9', text: '#475569' }
};

// ================ UTILITY FUNCTIONS ================
const generateOrderId = (): string => `ORD-${Date.now()}`;
const formatPhoneNumber = (phone: string): string => phone.replace(/\D/g, '').slice(-10);
const generateWhatsAppLink = (phone: string, message: string): string => {
  const cleanPhone = formatPhoneNumber(phone);
  return `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
};

// ================ CUSTOM HOOKS ================
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue] as const;
}

function useOrderCalculations(formData: any) {
  return useMemo(() => {
    const basePrice = formData.selectedGarment?.price || 0;
    const addonPrice = formData.selectedAddons.reduce((sum: number, id: string) => {
      const addon = ADDON_SERVICES.find(a => a.id === id);
      return sum + (addon?.price || 0);
    }, 0);
    const subtotal = basePrice + addonPrice + formData.customAddonAmount;
    const finalPrice = Math.max(0, subtotal - formData.discountAmount);
    const balanceDue = Math.max(0, finalPrice - formData.advanceAmount);
    
    return { basePrice, addonPrice, subtotal, finalPrice, balanceDue };
  }, [formData.selectedGarment, formData.selectedAddons, formData.customAddonAmount, formData.discountAmount, formData.advanceAmount]);
}

// ================ PDF GENERATION ================
function generatePDF(order: Order): string {
  const pdfContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>SAPTHALA Invoice - ${order.id}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .header { text-align: center; border-bottom: 3px solid #8b4513; margin-bottom: 30px; padding-bottom: 20px; }
        .logo { font-size: 36px; font-weight: bold; color: #8b4513; margin-bottom: 10px; }
        .company-info { color: #666; font-size: 14px; }
        .invoice-details { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
        .section { background: #f9f9f9; padding: 20px; border-radius: 8px; }
        .section h3 { margin: 0 0 15px 0; color: #8b4513; font-size: 18px; }
        .item-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .total-section { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 20px; border-radius: 8px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #8b4513; color: #666; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">✂️ SAPTHALA BOUTIQUE</div>
        <div class="company-info">
          Professional Tailoring Services<br>
          📞 +91-XXXXXXXXXX | 📧 info@sapthala.com<br>
          📍 Your Address Here
        </div>
      </div>

      <div class="invoice-details">
        <div class="section">
          <h3>📋 Order Information</h3>
          <div><strong>Order ID:</strong> ${order.id}</div>
          <div><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</div>
          <div><strong>Delivery Date:</strong> ${order.deliveryDate}</div>
          <div><strong>Status:</strong> ${order.status}</div>
        </div>
        
        <div class="section">
          <h3>👤 Customer Details</h3>
          <div><strong>Name:</strong> ${order.customer.name}</div>
          <div><strong>Phone:</strong> ${order.customer.phone}</div>
          <div><strong>Address:</strong> ${order.customer.address || 'N/A'}</div>
        </div>
      </div>

      <div class="section">
        <h3>👗 Garment Details</h3>
        <div class="item-row">
          <span><strong>${order.garment}</strong> (${order.category})</span>
          <span>₹${order.basePrice.toLocaleString()}</span>
        </div>
        
        ${order.selectedAddons.length > 0 ? `
          <h4 style="margin: 15px 0 10px 0;">Add-on Services:</h4>
          ${order.selectedAddons.map(addonId => {
            const addon = ADDON_SERVICES.find(a => a.id === addonId);
            return addon ? `<div class="item-row"><span>${addon.name}</span><span>₹${addon.price}</span></div>` : '';
          }).join('')}
        ` : ''}
        
        ${order.customAddonAmount > 0 ? `
          <div class="item-row"><span>Custom Add-on</span><span>₹${order.customAddonAmount}</span></div>
        ` : ''}
        
        ${order.discount > 0 ? `
          <div class="item-row"><span>Discount</span><span style="color: #ef4444;">-₹${order.discount}</span></div>
        ` : ''}
      </div>

      <div class="total-section">
        <div class="item-row" style="font-size: 18px; font-weight: bold;">
          <span>Total Amount:</span>
          <span style="color: #10b981;">₹${order.finalPrice.toLocaleString()}</span>
        </div>
        <div class="item-row">
          <span>Advance Paid (${order.paymentMethod}):</span>
          <span>₹${order.advanceAmount.toLocaleString()}</span>
        </div>
        <div class="item-row" style="font-weight: bold; color: #f59e0b;">
          <span>Balance Due:</span>
          <span>₹${order.balanceDue.toLocaleString()}</span>
        </div>
      </div>

      ${order.assignedStaff ? `
        <div class="section">
          <h3>👨💼 Assigned Staff</h3>
          <div><strong>Name:</strong> ${order.assignedStaff.name}</div>
          <div><strong>Role:</strong> ${order.assignedStaff.role}</div>
          <div><strong>Contact:</strong> ${order.assignedStaff.phone}</div>
        </div>
      ` : ''}

      <div class="footer">
        <div>✂️ Thank you for choosing SAPTHALA BOUTIQUE!</div>
        <div style="margin-top: 10px; font-size: 12px;">
          For any queries, please contact us at the above details.<br>
          <em>Powered by MS Technologies™</em>
        </div>
      </div>
    </body>
    </html>
  `;

  // Create blob and URL for PDF
  const blob = new Blob([pdfContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  // Open in new window for printing/saving
  const printWindow = window.open(url, '_blank', 'width=800,height=600');
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
  
  return url;
}

// ================ WHATSAPP INTEGRATION ================
function sendWhatsAppMessage(order: Order, includePDF: boolean = true) {
  const pdfUrl = includePDF && order.pdfUrl ? `\n\n📄 Invoice: ${order.pdfUrl}` : '';
  
  const message = `✂️ *SAPTHALA BOUTIQUE* - Order Confirmation

🎉 Dear ${order.customer.name},

Your order has been successfully confirmed!

📋 *Order Details:*
• Order ID: ${order.id}
• Garment: ${order.garment}
• Category: ${order.category}

💰 *Payment Summary:*
• Total Amount: ₹${order.finalPrice.toLocaleString()}
• Advance Paid: ₹${order.advanceAmount.toLocaleString()} (${order.paymentMethod})
• Balance Due: ₹${order.balanceDue.toLocaleString()}

📅 *Timeline:*
• Order Date: ${new Date(order.createdAt).toLocaleDateString()}
• Expected Delivery: ${order.deliveryDate}

${order.assignedStaff ? `👨💼 *Assigned Staff:*
• ${order.assignedStaff.name} (${order.assignedStaff.role})
• Contact: ${order.assignedStaff.phone}` : ''}

🏪 *SAPTHALA Boutique*
📞 +91-XXXXXXXXXX
📍 Your Address Here

We'll keep you updated on your order progress!${pdfUrl}

Thank you for choosing SAPTHALA! 🙏

_Powered by MS Technologies™_`;

  const whatsappUrl = generateWhatsAppLink(order.customer.phone, message);
  window.open(whatsappUrl, '_blank');
}

// ================ STAFF ASSIGNMENT LOGIC ================
function assignOrderToStaff(order: Order, workflowStage: string): StaffMember | null {
  // Find available staff for the specific workflow stage
  const availableStaff = STAFF_MEMBERS.filter(staff => 
    staff.workflowStages.includes(workflowStage) && 
    staff.isAvailable && 
    staff.currentTasks < 3 // Max 3 tasks per staff
  );

  if (availableStaff.length === 0) return null;

  // Assign to staff with least current tasks
  const selectedStaff = availableStaff.reduce((prev, current) => 
    prev.currentTasks < current.currentTasks ? prev : current
  );

  // Update staff availability
  selectedStaff.currentTasks += 1;
  if (selectedStaff.currentTasks >= 3) {
    selectedStaff.isAvailable = false;
  }

  return selectedStaff;
}

// ================ MAIN COMPONENT ================
const SapthalaAdminPanel: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useLocalStorage('sapthala_admin_logged_in', false);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [orders, setOrders] = useLocalStorage<Order[]>('sapthala_orders', []);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showLogo, setShowLogo] = useState(false);

  // Login Component
  const LoginScreen = memo(() => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = useCallback(async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setError('');
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (password === ADMIN_PASSWORD) {
        setIsLoggedIn(true);
        setShowLogo(true);
        setError('');
      } else {
        setError('❌ Invalid password');
      }
      setIsLoading(false);
    }, [password]);

    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #8b4513 0%, #a0522d 100%)',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <form onSubmit={handleLogin} style={{
          background: 'white',
          padding: '40px',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          width: '100%',
          maxWidth: '400px'
        }}>
          <div style={{textAlign: 'center', marginBottom: '30px'}}>
            <div style={{color: '#8b4513', fontSize: '32px', fontWeight: 'bold'}}>✂️ SAPTHALA</div>
            <div style={{color: '#666', fontSize: '14px', marginTop: '5px'}}>Boutique Admin Portal</div>
          </div>
          
          <div style={{marginBottom: '20px'}}>
            <label style={{display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#333'}}>
              🔐 Password
            </label>
            <input
              type="password"
              placeholder="Enter password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px',
                opacity: isLoading ? 0.7 : 1
              }}
            />
          </div>

          {error && (
            <div style={{
              background: '#fee2e2',
              color: '#dc2626',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !password}
            style={{
              width: '100%',
              padding: '14px',
              background: isLoading ? '#9ca3af' : '#8b4513',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? '🔄 Logging in...' : '🔓 Login'}
          </button>
        </form>
      </div>
    );
  });

  if (!isLoggedIn) {
    return <LoginScreen />;
  }

  return (
    <div style={{minHeight: '100vh', background: '#f3f4f6', fontFamily: 'system-ui, -apple-system, sans-serif'}}>
      {/* Enhanced Header */}
      <div style={{
        background: 'linear-gradient(135deg, #8b4513 0%, #a0522d 50%, #d2691e 100%)',
        color: 'white',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }}>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <div>
            <div style={{fontSize: '28px', fontWeight: '700', letterSpacing: '1px'}}>✂️ SAPTHALA</div>
            <div style={{fontSize: '14px', opacity: 0.9}}>Professional Boutique Admin Portal</div>
          </div>
        </div>
        
        <button
          onClick={() => {
            setIsLoggedIn(false);
            setShowLogo(false);
            localStorage.clear();
          }}
          style={{
            padding: '10px 20px',
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
        >
          🚪 Logout
        </button>
      </div>

      {/* Navigation Tabs */}
      <div style={{maxWidth: '1280px', margin: '0 auto', padding: '20px'}}>
        <div style={{display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto'}}>
          {[
            {id: 'dashboard', label: '📊 Dashboard'},
            {id: 'new-order', label: '➕ New Order'},
            {id: 'orders', label: '📦 Orders'},
            {id: 'staff', label: '👥 Staff'},
            {id: 'reports', label: '📊 Reports'}
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              style={{
                padding: '12px 24px',
                background: activeTab === tab.id ? 'white' : '#e5e7eb',
                color: activeTab === tab.id ? '#3b82f6' : '#666',
                border: activeTab === tab.id ? '3px solid #3b82f6' : 'none',
                borderRadius: '8px 8px 0 0',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)'}}>
          {activeTab === 'dashboard' && (
            <div>
              <h2 style={{fontSize: '28px', fontWeight: 'bold', marginBottom: '20px', color: '#1e293b'}}>📊 Dashboard</h2>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px'}}>
                <div style={{background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: 'white', padding: '25px', borderRadius: '12px'}}>
                  <div style={{fontSize: '36px', fontWeight: 'bold', marginBottom: '8px'}}>{orders.length}</div>
                  <div style={{fontSize: '16px', opacity: 0.9}}>Total Orders</div>
                </div>
                <div style={{background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', padding: '25px', borderRadius: '12px'}}>
                  <div style={{fontSize: '36px', fontWeight: 'bold', marginBottom: '8px'}}>₹{orders.reduce((sum, o) => sum + o.finalPrice, 0).toLocaleString()}</div>
                  <div style={{fontSize: '16px', opacity: 0.9}}>Total Revenue</div>
                </div>
                <div style={{background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white', padding: '25px', borderRadius: '12px'}}>
                  <div style={{fontSize: '36px', fontWeight: 'bold', marginBottom: '8px'}}>₹{orders.reduce((sum, o) => sum + o.advanceAmount, 0).toLocaleString()}</div>
                  <div style={{fontSize: '16px', opacity: 0.9}}>Advance Collected</div>
                </div>
                <div style={{background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white', padding: '25px', borderRadius: '12px'}}>
                  <div style={{fontSize: '36px', fontWeight: 'bold', marginBottom: '8px'}}>{orders.filter(o => o.status === 'QUEUED' || o.status === 'IN_PROGRESS').length}</div>
                  <div style={{fontSize: '16px', opacity: 0.9}}>Pending Orders</div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'new-order' && (
            <div>
              <h2 style={{fontSize: '28px', fontWeight: 'bold', marginBottom: '20px', color: '#1e293b'}}>➕ Create New Order</h2>
              <div style={{textAlign: 'center', padding: '60px', color: '#666'}}>
                <div style={{fontSize: '64px', marginBottom: '20px'}}>🚧</div>
                <div style={{fontSize: '20px', fontWeight: 'bold', marginBottom: '10px'}}>New Order Form</div>
                <div>Complete order creation system with workflow integration coming soon...</div>
              </div>
            </div>
          )}
          
          {activeTab === 'orders' && (
            <div>
              <h2 style={{fontSize: '28px', fontWeight: 'bold', marginBottom: '20px', color: '#1e293b'}}>📦 Orders Management</h2>
              {orders.length === 0 ? (
                <div style={{textAlign: 'center', padding: '60px', color: '#666'}}>
                  <div style={{fontSize: '64px', marginBottom: '20px'}}>📋</div>
                  <div style={{fontSize: '20px', fontWeight: 'bold', marginBottom: '10px'}}>No Orders Yet</div>
                  <div>Create your first order to get started!</div>
                </div>
              ) : (
                <div>Orders list will be displayed here...</div>
              )}
            </div>
          )}
          
          {activeTab === 'staff' && (
            <div>
              <h2 style={{fontSize: '28px', fontWeight: 'bold', marginBottom: '20px', color: '#1e293b'}}>👥 Staff Management</h2>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px'}}>
                {STAFF_MEMBERS.map(staff => (
                  <div key={staff.id} style={{
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{display: 'flex', alignItems: 'center', marginBottom: '15px'}}>
                      <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        background: staff.isAvailable ? '#10b981' : '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '20px',
                        marginRight: '15px'
                      }}>
                        👤
                      </div>
                      <div>
                        <div style={{fontSize: '18px', fontWeight: 'bold', color: '#1e293b'}}>{staff.name}</div>
                        <div style={{fontSize: '14px', color: '#64748b'}}>{staff.role}</div>
                      </div>
                    </div>
                    <div style={{marginBottom: '15px'}}>
                      <div style={{fontSize: '14px', color: '#64748b', marginBottom: '5px'}}>📞 {staff.phone}</div>
                      <div style={{fontSize: '14px', color: '#64748b'}}>📋 {staff.currentTasks} active tasks</div>
                    </div>
                    <div style={{display: 'flex', gap: '10px'}}>
                      <button
                        onClick={() => window.open(generateWhatsAppLink(staff.phone, `Hi ${staff.name}, this is from SAPTHALA admin.`), '_blank')}
                        style={{
                          flex: 1,
                          padding: '10px',
                          background: '#25d366',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        💬 WhatsApp
                      </button>
                      <button
                        style={{
                          flex: 1,
                          padding: '10px',
                          background: staff.isAvailable ? '#10b981' : '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        {staff.isAvailable ? '✅ Available' : '🔴 Busy'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === 'reports' && (
            <div>
              <h2 style={{fontSize: '28px', fontWeight: 'bold', marginBottom: '20px', color: '#1e293b'}}>📊 Reports & Analytics</h2>
              <div style={{textAlign: 'center', padding: '60px', color: '#666'}}>
                <div style={{fontSize: '64px', marginBottom: '20px'}}>📈</div>
                <div style={{fontSize: '20px', fontWeight: 'bold', marginBottom: '10px'}}>Advanced Reports</div>
                <div>Comprehensive analytics and reporting system coming soon...</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SapthalaAdminPanel;