// ==================== CONSTANTS ====================

import type { Shop, Garment, Worker, ProductionStage, AddOn } from '../types';

export const SHOPS: Shop[] = [
  {
    id: 1,
    name: 'SAPTHALA Main',
    location: 'Bangalore',
    phone: '9876543210',
    email: 'main@sapthala.com',
    logo: '✂️',
    address: '123 Fashion St, Bangalore, Karnataka 560001'
  },
  {
    id: 2,
    name: 'SAPTHALA Express',
    location: 'Pune',
    phone: '9876543211',
    email: 'express@sapthala.com',
    logo: '✂️',
    address: '456 Style Ave, Pune, Maharashtra 411001'
  },
  {
    id: 3,
    name: 'SAPTHALA Premium',
    location: 'Mumbai',
    phone: '9876543212',
    email: 'premium@sapthala.com',
    logo: '✂️',
    address: '789 Elite Plaza, Mumbai, Maharashtra 400001'
  }
];

export const GARMENT_CATEGORIES: Record<string, Garment[]> = {
  mens: [
    { id: 'm1', name: 'Kurta/Pathani', basePrice: 800 },
    { id: 'm2', name: 'Sherwani', basePrice: 2500 },
    { id: 'm3', name: 'Bandhgala', basePrice: 1500 },
    { id: 'm4', name: 'Shirt/Suit/Blazer', basePrice: 1200 }
  ],
  womens: [
    { id: 'w1', name: 'Blouse', basePrice: 500 },
    { id: 'w2', name: 'Kurti', basePrice: 600 },
    { id: 'w3', name: 'Churidar/Palazzo', basePrice: 700 },
    { id: 'w4', name: 'Lehenga', basePrice: 1500 },
    { id: 'w5', name: 'Gown/Frock', basePrice: 1200 }
  ],
  kids: [
    { id: 'k1', name: 'Kurta', basePrice: 400 },
    { id: 'k2', name: 'Frock', basePrice: 500 },
    { id: 'k3', name: 'Sherwani', basePrice: 800 }
  ]
};

export const WORKERS: Worker[] = [
  {
    id: 1,
    name: 'Raj Kumar',
    role: 'Dyeing',
    phone: '9876543220',
    expertise: ['Color Dyeing', 'Washing'],
    isAvailable: true,
    currentTasks: 3
  },
  {
    id: 2,
    name: 'Priya Singh',
    role: 'Cutting',
    phone: '9876543221',
    expertise: ['Cutting', 'Pattern Making'],
    isAvailable: true,
    currentTasks: 2
  },
  {
    id: 3,
    name: 'Amit Patel',
    role: 'Stitching',
    phone: '9876543222',
    expertise: ['Stitching', 'Assembly'],
    isAvailable: true,
    currentTasks: 4
  },
  {
    id: 4,
    name: 'Neha Sharma',
    role: 'Embroidery',
    phone: '9876543223',
    expertise: ['Embroidery', 'Beading'],
    isAvailable: false,
    currentTasks: 1
  },
  {
    id: 5,
    name: 'Vikram Desai',
    role: 'Quality',
    phone: '9876543224',
    expertise: ['QC', 'Finishing'],
    isAvailable: true,
    currentTasks: 2
  }
];

export const PRODUCTION_STAGES: ProductionStage[] = [
  { id: 1, name: 'Color Dyeing', icon: '🧪', color: 'blue' },
  { id: 2, name: 'Cutting & Stretching', icon: '✂️', color: 'purple' },
  { id: 3, name: 'Stitching', icon: '🪡', color: 'indigo' },
  { id: 4, name: 'Embroidery', icon: '✨', color: 'pink' },
  { id: 5, name: 'Quality Check', icon: '✅', color: 'green' }
];

export const ADD_ONS: AddOn[] = [
  { id: 1, name: 'Can-can', price: 200, category: 'accessories' },
  { id: 2, name: 'Fall & Pico', price: 150, category: 'accessories' },
  { id: 3, name: 'Dyeing Premium', price: 300, category: 'services' },
  { id: 4, name: 'Embroidery Basic', price: 500, category: 'embroidery' },
  { id: 5, name: 'Embroidery Heavy', price: 1500, category: 'embroidery' },
  { id: 6, name: 'Full Lining', price: 400, category: 'accessories' },
  { id: 7, name: 'Pleating', price: 250, category: 'services' },
  { id: 8, name: 'Paneling', price: 350, category: 'services' },
  { id: 9, name: 'Beading Work', price: 1000, category: 'embroidery' }
];

export const MEASUREMENTS = [
  'Length',
  'Shoulder',
  'Chest',
  'Waist',
  'Sleeve',
  'Hip',
  'Armhole',
  'Neckline',
  'Hem'
];

export const API_ENDPOINTS = {
  orders: '/api/orders',
  workers: '/api/workers',
  notifications: '/api/notifications',
  invoice: '/api/invoice',
  whatsapp: '/api/whatsapp',
  analytics: '/api/analytics'
};

export const NOTIFICATION_TEMPLATES = {
  orderCreated: (customerName: string, orderId: string) =>
    `Hello ${customerName}! 👋\n\nYour SAPTHALA tailoring order is confirmed!\n📦 Order ID: ${orderId}\n\nThank you for choosing SAPTHALA! 🙏`,
  
  orderProduction: (customerName: string, stage: string) =>
    `Hi ${customerName}! 🎨\n\nYour order is now in ${stage} stage.\n\nWe'll keep you updated! 👍`,
  
  orderReady: (customerName: string, orderId: string) =>
    `Congratulations ${customerName}! 🎉\n\nYour order ${orderId} is ready for pickup!\n\nThank you! 😊`,
  
  staffAssignment: (workerName: string, orderId: string, stage: string) =>
    `Hi ${workerName},\n\nYou have been assigned to ${stage} for order ${orderId}.\n\nPlease start the process. 👷`,
};
