const mongoose = require('mongoose');

// Improve Mongoose buffering behaviour during transient network issues
mongoose.set('bufferTimeoutMS', 20000); // increase default buffering timeout to 20s

// MongoDB connection with retry logic (exponential backoff)
const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sapthala_boutique';
  const maxRetries = 5; // increased retries for stability in flaky environments
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Connecting to MongoDB (attempt ${attempt}/${maxRetries})...`);
      
      await mongoose.connect(mongoURI, {
        connectTimeoutMS: 20000,
        serverSelectionTimeoutMS: 20000,
        socketTimeoutMS: 60000,
        maxPoolSize: 10,
        minPoolSize: 2,
        // disable buffering for critical flows if desired (leave enabled by default)
        // bufferCommands: true
      });
      
      console.log('✅ MongoDB Connected Successfully to sapthala_boutique');
      console.log(`📊 Connection state: ${mongoose.connection.readyState} (1 = connected)`);
      
      // Set up connection event handlers
      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️ MongoDB disconnected');
      });
      
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
      });
      
      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnected');
      });
      
      return true;
    } catch (error) {
      console.error(`❌ MongoDB connection attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        console.error('\n❌ CRITICAL: MongoDB connection failed after all retries');
        console.error('   Please ensure MongoDB is running: net start MongoDB');
        console.error('   Or check connection string in .env file\n');
        // Throw so callers can decide whether to exit or continue in degraded mode
        throw new Error('MongoDB connection failed after all retries');
      }
      
      // Exponential backoff before next retry
      const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
      console.log(`⏳ Waiting ${backoffMs}ms before next MongoDB connection attempt...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
  
  return false;
};

// Staff Schema
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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Order Schema
const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  customerAddress: String,
  garmentType: { type: String, required: true },
  measurements: mongoose.Schema.Types.Mixed,
  totalAmount: { type: Number, required: true },
  advanceAmount: { type: Number, default: 0 },
  balanceAmount: { type: Number, default: 0 },
  deliveryDate: Date,
  branch: { type: String, default: 'SAPTHALA.MAIN' }, // Branch identifier
  status: { 
    type: String, 
    enum: ['pending', 'in_progress', 'completed', 'delivered', 'cancelled'],
    default: 'pending'
  },
  currentStage: { type: String, default: 'dyeing' },
  workflowTasks: [{
    stageId: String,
    stageName: String,
    stageIcon: String,
    status: { 
      type: String, 
      enum: ['waiting', 'pending', 'assigned', 'started', 'paused', 'resumed', 'completed'],
      default: 'waiting'
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    assignedToName: String,
    startedAt: Date,
    pausedAt: Date,
    resumedAt: Date,
    completedAt: Date,
    notes: String,
    images: [String],
    designNotes: String,
    designImages: [String],
    qualityRating: Number,
    timeSpent: Number,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }],
  pdfPath: String,
  whatsappSent: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Customer Schema
const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  address: String,
  email: String,
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
  totalOrders: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// User Schema (for super-admin, admin, sub-admin login)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['super-admin', 'admin', 'sub-admin'], default: 'admin' },
  branch: { type: String }, // For sub-admins
  permissions: {
    canEdit: { type: Boolean, default: true },
    canDelete: { type: Boolean, default: true },
    canViewReports: { type: Boolean, default: true },
    canManageStaff: { type: Boolean, default: true },
    canManageAdmins: { type: Boolean, default: false }, // Only super-admin
    branchAccess: [String] // Array of branch names they can access
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastLogin: Date
});

// Settings Schema
const settingsSchema = new mongoose.Schema({
  companyName: { type: String, default: 'SAPTHALA Designer Workshop' },
  address: String,
  phone: String,
  email: String,
  logoPath: { type: String, default: 'img/sapthala logo.png' },
  // Festival dates stored as { key: { month: Number, day: Number } }
  festivalDates: { type: mongoose.Schema.Types.Mixed, default: {
    independence: { month: 8, day: 15 },
    ugadi: { month: 4, day: 9 },
    holi: { month: 3, day: 25 },
    diwali: { month: 11, day: 4 },
    sankranti: { month: 1, day: 14 },
    ganesh: { month: 9, day: 10 },
    newYear: { month: 1, day: 1 },
    ramadan: { month: 4, day: 10 },
    christmas: { month: 12, day: 25 }
  } },
  workflowStages: [{
    id: String,
    name: String,
    icon: String,
    order: Number,
    requiredSkills: [String],
    estimatedDuration: Number
  }],
  updatedAt: { type: Date, default: Date.now }
});

// Notification Schema
const notificationSchema = new mongoose.Schema({
  type: { type: String, enum: ['task_assigned', 'task_completed', 'order_created'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  recipientType: { type: String, enum: ['staff', 'admin'], default: 'staff' },
  orderId: String,
  taskId: String,
  isRead: { type: Boolean, default: false },
  sentAt: { type: Date, default: Date.now },
  readAt: Date
});

// Login Attempt Schema
const loginAttemptSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: String,
  success: { type: Boolean, required: true },
  errorMessage: String,
  ipAddress: String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now }
});

// Branch Schema
const branchSchema = new mongoose.Schema({
  branchId: { type: String, required: true, unique: true },
  branchName: { type: String, required: true },
  location: { type: String, required: true },
  phone: String,
  email: String,
  // Optional logo URL for branch avatar / icon in admin UI
  logo: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Vendor Schema (simple Mongo-backed vendor collection for Super Admin panel)
const vendorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: String,
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  createdAt: { type: Date, default: Date.now }
});

// Create models
const Staff = mongoose.model('Staff', staffSchema);
const Order = mongoose.model('Order', orderSchema);
const Customer = mongoose.model('Customer', customerSchema);
const User = mongoose.model('User', userSchema);
const Settings = mongoose.model('Settings', settingsSchema);
const Notification = mongoose.model('Notification', notificationSchema);
const LoginAttempt = mongoose.model('LoginAttempt', loginAttemptSchema);
const Branch = mongoose.model('Branch', branchSchema);
const Vendor = mongoose.model('Vendor', vendorSchema);

// Initialize default data
const initializeDefaultData = async () => {
  try {
    // Skip initialization if MongoDB is not connected
    if (mongoose.connection.readyState !== 1) {
      console.log('⏭️ Skipping data initialization (MongoDB not connected)');
      return;
    }

    console.log('🔄 Initializing default data...');

    // Create default super-admin user (username-based)
    const superAdminExists = await User.findOne({ username: 'superadmin' });
    if (!superAdminExists) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('superadmin@2029', 10);
      await User.create({
        username: 'superadmin',
        email: 'superadmin@sapthala.com',
        password: hashedPassword,
        role: 'super-admin',
        permissions: {
          canEdit: true,
          canDelete: true,
          canViewReports: true,
          canManageStaff: true,
          canManageAdmins: true
        }
      });
      console.log('✅ Default super-admin user created');
    }

    // Ensure Firebase-based super-admin (user provided) exists so Firebase login maps to server role
    const firebaseSuperAdminEmail = 'mstechno2323@gmail.com';
    const firebaseSuperAdmin = await User.findOne({ email: firebaseSuperAdminEmail });
    if (!firebaseSuperAdmin) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('superadmin@123', 10);
      await User.create({
        username: 'firebase_superadmin',
        email: firebaseSuperAdminEmail,
        password: hashedPassword,
        role: 'super-admin',
        permissions: {
          canEdit: true,
          canDelete: true,
          canViewReports: true,
          canManageStaff: true,
          canManageAdmins: true
        }
      });
      console.log('✅ Firebase super-admin user created (email mapped)');
    } else if (firebaseSuperAdmin.role !== 'super-admin') {
      firebaseSuperAdmin.role = 'super-admin';
      await firebaseSuperAdmin.save();
      console.log('✅ Updated existing user to super-admin for Firebase email mapping');
    }

    // Create default admin user
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('sapthala@2029', 10);
      await User.create({
        username: 'admin',
        email: 'admin@sapthala.com',
        password: hashedPassword,
        role: 'admin'
      });
      console.log('✅ Default admin user created');
    }

    // Skip default staff creation - will be created per branch below

    // Create default settings
    const settingsExists = await Settings.findOne();
    if (!settingsExists) {
      await Settings.create({
        companyName: 'SAPTHALA Designer Workshop',
        address: 'Your Address Here',
        phone: '7794021608',
        email: 'sapthalaredddydesigns@gmail.com',
        logoPath: '/img/sapthala logo.png',
        workflowStages: [
          { id: 'dyeing', name: 'Dyeing', icon: '🎨', order: 1, requiredSkills: ['Dyeing'], estimatedDuration: 120 },
          { id: 'finishing', name: 'Finishing', icon: '🏁', order: 2, requiredSkills: ['Finishing'], estimatedDuration: 90 },
          { id: 'quality-check', name: 'Quality Check', icon: '🔍', order: 3, requiredSkills: ['Quality Check'], estimatedDuration: 30 },
          { id: 'ready-to-deliver', name: 'Ready to Deliver', icon: '📦', order: 4, requiredSkills: ['Delivery'], estimatedDuration: 15 }
        ]
      });
      console.log('✅ Default settings created');
    }

    // Create default branches if none exist (prevent duplicates)
    try {
      const defaultBranches = [
        { branchId: 'SAPTHALA.MAIN', branchName: 'Main', location: 'Head Office', phone: '7794021608', email: 'sapthalaredddydesigns@gmail.com' },
        { branchId: 'SAPTHALA.JNTU', branchName: 'JNTU', location: 'JNTU Branch', phone: '7794021610', email: 'jntu@sapthala.com' },
        { branchId: 'SAPTHALA.KPHB', branchName: 'KPHB', location: 'KPHB Branch', phone: '7794021611', email: 'kphb@sapthala.com' },
        { branchId: 'SAPTHALA.ECIL', branchName: 'ECIL', location: 'ECIL Branch', phone: '7794021612', email: 'ecil@sapthala.com' }
      ];
      
      for (const br of defaultBranches) {
        const exists = await Branch.findOne({ branchId: br.branchId });
        if (!exists) {
          await Branch.create(br);
          console.log(`✅ Created branch: ${br.branchId}`);
        }
      }
    } catch (err) {
      console.error('Error creating default branches:', err);
    }

    // Ensure each branch has ONE staff member for each workflow stage
    try {
      const allBranches = await Branch.find();
      const settings = await Settings.findOne();
      const stages = (settings && settings.workflowStages) || [];

      for (const br of allBranches) {
        for (const st of stages) {
          const stageId = st.id || st.name.replace(/\s+/g, '-').toLowerCase();
          const staffId = `${br.branchId.replace(/\./g, '_')}_${stageId}`;
          
          const existing = await Staff.findOne({ staffId });
          if (!existing) {
            const staffName = `${st.name} (${br.branchName})`;
            await Staff.create({
              staffId,
              name: staffName,
              phone: '9876543210',
              email: `${staffId.toLowerCase()}@sapthala.com`,
              role: st.name,
              pin: '1234',
              branch: br.branchId,
              workflowStages: [stageId],
              skills: st.requiredSkills || [],
              isAvailable: true
            });
            console.log(`✅ Created staff ${staffId}`);
          }
        }
      }
    } catch (err) {
      console.error('Error ensuring branch staff:', err);
    }

    console.log('🎉 Database initialization completed successfully!');

  } catch (error) {
    console.error('❌ Error initializing default data:', error);
  }
};

// Helper: returns true when Mongoose is connected to MongoDB (readyState === 1)
const isMongoConnected = () => {
  try {
    return mongoose && mongoose.connection && mongoose.connection.readyState === 1;
  } catch (e) {
    return false;
  }
};

module.exports = {
  connectDB,
  initializeDefaultData,
  isMongoConnected,
  Staff,
  Order,
  Customer,
  User,
  Settings,
  Notification,
  LoginAttempt,
  Branch,
  Vendor
};