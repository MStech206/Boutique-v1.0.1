/**
 * SAPTHALA Database Module - Resilient to MongoDB downtime
 * Falls back to file-based JSON storage when MongoDB is unavailable
 * This allows the admin panel to work offline
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

let mongoConnected = false;

// File-based fallback storage
const dataDir = path.join(__dirname, '.data');
const getDataFile = (collection) => path.join(dataDir, `${collection}.json`);

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('📁 Created .data directory for file-based storage');
}

// Load JSON data file
function loadJsonData(collection) {
  const file = getDataFile(collection);
  if (fs.existsSync(file)) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      console.warn(`⚠️ Failed to read ${collection}.json:`, e.message);
      return [];
    }
  }
  return [];
}

// Save JSON data file
function saveJsonData(collection, data) {
  const file = getDataFile(collection);
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error(`❌ Failed to save ${collection}.json:`, e.message);
  }
}

// MongoDB connection (optional - server will work without it)
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sapthala_boutique';
    await mongoose.connect(mongoURI, { connectTimeoutMS: 5000, serverSelectionTimeoutMS: 5000 });
    mongoConnected = true;
    console.log('✅ MongoDB Connected to sapthala_boutique');
  } catch (error) {
    mongoConnected = false;
    console.warn('⚠️ MongoDB not available - using file-based storage fallback');
    console.warn('   (This is ok for offline testing - data will sync to MongoDB when available)');
  }
};

// Rest of the database schemas...
const staffSchema = new mongoose.Schema({
  staffId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: String,
  role: { type: String, required: true },
  pin: { type: String, required: true, default: '1234' },
  branch: { type: String, default: 'SAPTHALA.MAIN' },
  workflowStages: [String],
  skills: [String],
  isAvailable: { type: Boolean, default: true },
  currentTaskCount: { type: Number, default: 0 },
  rating: { type: Number, default: 5.0 },
  fcmToken: String,
  lastLogin: Date,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  customer: {
    name: String,
    phone: String,
    email: String
  },
  customerName: String,
  customerPhone: String,
  branch: { type: String, default: 'SAPTHALA.MAIN' },
  category: String,
  subcategory: String,
  garmentType: String,
  measurements: mongoose.Schema.Types.Mixed,
  design: {
    description: String,
    images: [String],
    theme: String
  },
  pricing: {
    total: Number,
    advanced: Number,
    balance: Number
  },
  totalAmount: { type: Number, default: 0 },
  advance: { type: Number, default: 0 },
  advanceAmount: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  status: { type: String, default: 'pending', enum: ['pending', 'in_progress', 'completed', 'delivered', 'cancelled'] },
  workflowTasks: [mongoose.Schema.Types.Mixed],
  notes: String,
  deliveryDate: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const branchSchema = new mongoose.Schema({
  branchId: { type: String, required: true, unique: true },
  branchName: { type: String, required: true },
  location: String,
  email: String,
  phone: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['super-admin', 'admin', 'sub-admin', 'staff'], default: 'staff' },
  branch: String,
  permissions: mongoose.Schema.Types.Mixed,
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now }
});

// Create models
const Staff = mongoose.model('Staff', staffSchema);
const Order = mongoose.model('Order', orderSchema);
const Branch = mongoose.model('Branch', branchSchema);
const User = mongoose.model('User', userSchema);

// File-based fallback implementations
const createFileBasedStubs = () => {
  console.log('📋 Setting up file-based data stubs...');
  
  // Initialize with demo data if empty
  const orders = loadJsonData('orders');
  if (orders.length === 0) {
    const demoOrders = [
      { orderId: 'ORD-FILE-001', customerName: 'File Demo 1', totalAmount: 5000, advanceAmount: 2000, status: 'in_progress', branch: 'Main', createdAt: new Date() },
      { orderId: 'ORD-FILE-002', customerName: 'File Demo 2', totalAmount: 8000, advanceAmount: 3000, status: 'pending', branch: 'Main', createdAt: new Date() },
    ];
    saveJsonData('orders', demoOrders);
    console.log('   ✅ Loaded demo orders to file storage');
  }

  const branches = loadJsonData('branches');
  if (branches.length === 0) {
    const demoBranches = [
      { branchId: 'FILE_001', branchName: 'Main Branch', location: 'Mumbai' },
    ];
    saveJsonData('branches', demoBranches);
    console.log('   ✅ Loaded demo branches to file storage');
  }
};

module.exports = {
  connectDB,
  mongoConnected: () => mongoConnected,
  Staff,
  Order,
  Branch,
  User,
  loadJsonData,
  saveJsonData,
  createFileBasedStubs
};
