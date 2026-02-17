const mongoose = require('mongoose');

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sapthala_boutique';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB Connected Successfully to sapthala_boutique');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
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
  logoPath: { type: String, default: '/img/sapthala logo.png' },
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
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
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

// Initialize default data
const initializeDefaultData = async () => {
  try {
    console.log('🔄 Initializing default data...');

    // Create default super-admin user
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

    // Create default staff members
    const staffCount = await Staff.countDocuments();
    if (staffCount === 0) {
      const defaultStaff = [
        { staffId: 'staff_002', name: 'Priya Sharma', phone: '9876543211', role: 'Dyeing Specialist', branch: 'SAPTHALA.MAIN', workflowStages: ['dyeing'], skills: ['Dyeing'] },
        { staffId: 'staff_003', name: 'Amit Patel', phone: '9876543212', role: 'Master Cutter', branch: 'SAPTHALA.MAIN', workflowStages: ['cutting'], skills: ['Cutting'] },
        { staffId: 'staff_004', name: 'Sneha Desai', phone: '9876543213', role: 'Senior Tailor', branch: 'SAPTHALA.MAIN', workflowStages: ['stitching'], skills: ['Stitching'] },
        { staffId: 'staff_005', name: 'Vikram Singh', phone: '9876543214', role: 'Khakha Expert', branch: 'SAPTHALA.MAIN', workflowStages: ['khakha'], skills: ['Khakha'] },
        { staffId: 'staff_006', name: 'Kavya Reddy', phone: '9876543215', role: 'Maggam Artist', branch: 'SAPTHALA.MAIN', workflowStages: ['maggam'], skills: ['Maggam'] },
        { staffId: 'staff_007', name: 'Ravi Kumar', phone: '9876543216', role: 'Painting Artist', branch: 'SAPTHALA.MAIN', workflowStages: ['painting'], skills: ['Painting'] },
        { staffId: 'staff_008', name: 'Meera Nair', phone: '9876543217', role: 'Finishing Expert', branch: 'SAPTHALA.MAIN', workflowStages: ['finishing'], skills: ['Finishing'] },
        { staffId: 'staff_009', name: 'Suresh Babu', phone: '9876543218', role: 'Quality Controller', branch: 'SAPTHALA.MAIN', workflowStages: ['quality-check'], skills: ['Quality Check'] },
        { staffId: 'staff_010', name: 'Asha Verma', phone: '9876543219', role: 'Delivery Executive', branch: 'SAPTHALA.MAIN', workflowStages: ['ready-to-deliver'], skills: ['Delivery'] }
      ];
      
      await Staff.insertMany(defaultStaff);
      console.log('✅ Default staff members created');
    }

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

    // Create default branches if none exist
    try {
      const branchCount = await Branch.countDocuments();
      if (branchCount === 0) {
        const defaultBranches = [
          { branchId: 'SAPTHALA.MAIN', branchName: 'Main', location: 'Head Office', phone: '7794021608', email: 'sapthalaredddydesigns@gmail.com' },
          { branchId: 'SAPTHALA.JNTU', branchName: 'JNTU', location: 'JNTU Branch', phone: '7794021610', email: 'jntu@sapthala.com' },
          { branchId: 'SAPTHALA.KHNB', branchName: 'KHNB', location: 'KHNB Branch', phone: '7794021611', email: 'khnb@sapthala.com' }
        ];
        await Branch.insertMany(defaultBranches);
        console.log('✅ Default branches created');
      }
    } catch (err) {
      console.error('Error creating default branches:', err);
    }

    // Ensure each branch has staff for each workflow stage (idempotent)
    try {
      const allBranches = await Branch.find();
      const settings = await Settings.findOne();
      const stages = (settings && settings.workflowStages) || [];

      for (const br of allBranches) {
        for (const st of stages) {
          const stageId = st.id || st.name.replace(/\s+/g, '-').toLowerCase();
          const existing = await Staff.findOne({ branch: br.branchId, workflowStages: stageId });
          if (!existing) {
            const staffId = `${br.branchId.replace(/\s+/g, '')}_${stageId}`;
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
            console.log(`✅ Created staff ${staffId} for branch ${br.branchId} stage ${stageId}`);
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

module.exports = {
  connectDB,
  initializeDefaultData,
  Staff,
  Order,
  Customer,
  User,
  Settings,
  Notification,
  LoginAttempt,
  Branch
};