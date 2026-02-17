const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { URL } = require('url');

const { connectDB, initializeDefaultData, Order, Customer, User, Staff, Settings, Notification, LoginAttempt, Branch, Vendor } = require('./database');
const PDFService = require('./services/pdfService');
const EnhancedPDFService = require('./services/enhancedPdfService');
const NotificationService = require('./services/notificationService');
const DataFlowService = require('./services/dataFlowService');
const dataFlowRoutes = require('./routes/dataFlowRoutes');
const firebaseIntegrationService = require('./firebase-integration-service');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'sapthala_boutique_secret_2024';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// MIME type middleware - MUST be before static middleware
app.use((req, res, next) => {
  if (req.url.endsWith('.js')) res.type('application/javascript');
  if (req.url.endsWith('.css')) res.type('text/css');
  if (req.url.endsWith('.json')) res.type('application/json');
  if (req.url.endsWith('.png')) res.type('image/png');
  if (req.url.endsWith('.jpg') || req.url.endsWith('.jpeg')) res.type('image/jpeg');
  if (req.url.endsWith('.gif')) res.type('image/gif');
  if (req.url.endsWith('.svg')) res.type('image/svg+xml');
  if (req.url.endsWith('.html')) res.type('text/html');
  next();
});

// Cache-busting middleware for HTML and JS files
app.use((req, res, next) => {
  if (req.url.endsWith('.html') || req.url.endsWith('.js')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// Static file serving with proper MIME types
app.use(express.static('public', { 
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
    if (path.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
  }
}));

app.use('/uploads', express.static('uploads'));
app.use('/pdfs', express.static('pdfs'));
app.use('/img', express.static('img'));
app.use('/invoice-theme', express.static('invoice theme'));
// Fix for image paths - serve without spaces in URL
app.use('/images', express.static('sapthala admin imgs'));
app.use('/sapthala-admin-imgs', express.static('sapthala admin imgs'));

// Serve super-admin-panel React app - CRITICAL FIX
const superAdminPath = path.join(__dirname, 'Boutique-app', 'super-admin-panel', 'dist');
if (fs.existsSync(superAdminPath)) {
  // Serve all assets with correct MIME types
  app.use('/assets', express.static(path.join(superAdminPath, 'assets'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
      if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css; charset=UTF-8');
      res.setHeader('Cache-Control', 'no-store');
    }
  }));
  
  // Serve super-admin index for /super-admin route
  app.get('/super-admin', (req, res) => {
    res.sendFile(path.join(superAdminPath, 'index.html'));
  });
  
  // SPA routing - all /super-admin/* routes go to index.html
  app.get('/super-admin/*', (req, res) => {
    res.sendFile(path.join(superAdminPath, 'index.html'));
  });
  
  console.log('✅ Super Admin Panel React app configured');
}

// Data Flow Routes for seamless admin-staff synchronization
app.use('/api', dataFlowRoutes);

// ==================== ROUTE HANDLERS FOR ADMIN PANEL ====================

// Serve root as admin panel (sapthala-admin-clean preferred)
app.get('/', (req, res) => {
  const cleanAdmin = path.join(__dirname, 'sapthala-admin-clean.html');
  if (fs.existsSync(cleanAdmin)) return res.sendFile(cleanAdmin);
  const fallback = path.join(__dirname, 'admin-panel.html');
  if (fs.existsSync(fallback)) return res.sendFile(fallback);
  return res.status(404).send('Admin panel not found');
});

// Login endpoint - redirect to root
app.get('/login', (req, res) => {
  const cleanAdmin = path.join(__dirname, 'sapthala-admin-clean.html');
  if (fs.existsSync(cleanAdmin)) return res.sendFile(cleanAdmin);
  return res.redirect('/');
});

// Convenience routes
app.get('/admin-panel.html', (req, res) => {
  const cleanAdmin = path.join(__dirname, 'sapthala-admin-clean.html');
  if (fs.existsSync(cleanAdmin)) return res.sendFile(cleanAdmin);
  return res.status(404).send('Admin panel not found');
});

app.get('/admin', (req, res) => {
  return res.redirect('/');
});

// Convenient route: /admin -> admin panel
app.get('/admin', (req, res) => {
  const customAdmin = path.join(__dirname, 'admin-panel.html');
  if (fs.existsSync(customAdmin)) return res.redirect('/admin-panel.html');
  return res.redirect('/');
});

// SPA fallback for admin/sub-admin paths so direct links work
app.get(['/admin/*', '/sub-admin', '/sub-admin/*'], (req, res) => {
  const adminHtml = path.join(__dirname, 'sapthala-admin-clean.html');
  if (fs.existsSync(adminHtml)) return res.sendFile(adminHtml);
  return res.redirect('/');
});

// Staff portal endpoint (supports deep links)
app.get(['/staff', '/staff/*'], (req, res) => {
  const staffPath = path.join(__dirname, 'staff-portal.html');
  if (fs.existsSync(staffPath)) return res.sendFile(staffPath);
  return res.status(404).send('Staff portal not found');
});

// Backwards-compatible aliases for the Super Admin SPA
app.get(['/super-admin-panel', '/superadmin', '/superadmin/*'], (req, res) => {
  return res.redirect('/super-admin');
});

// ==================== FAVICON & STATIC FILES ====================

// Create directories
['uploads', 'pdfs'].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// Catch any unhandled promise rejections - MUST BE FIRST
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION:', reason);
  console.error('Stack:', reason && reason.stack);
});

// Catch any uncaught exceptions - MUST BE FIRST
process.on('uncaughtException', (error) => {
  console.error('❌ UNCAUGHT EXCEPTION:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

// Connect to MongoDB and initialize data
(async () => {
  try {
    console.log('Starting server initialization...');
    
    // Initialize Firebase Integration Service
    console.log('🔥 Initializing Firebase Integration...');
    const firebaseInitialized = await firebaseIntegrationService.initialize();
    if (firebaseInitialized) {
      console.log('✅ Firebase integration active - all panels connected');
      
      // Auto-sync MongoDB to Firebase if enabled
      if (process.env.AUTO_SYNC_TO_FIREBASE === 'true') {
        console.log('🔄 Auto-sync to Firebase enabled');
        // Sync will happen after MongoDB connection
      }
    } else {
      console.log('⚠️ Firebase integration disabled - using MongoDB only');
    }
    
    if (process.env.SKIP_MONGO === 'true') {
      console.log('⚠️ SKIP_MONGO=true — skipping MongoDB connection and default data initialization');
    } else {
      await connectDB();
      await initializeDefaultData();
      
      // Perform initial sync to Firebase if enabled
      if (firebaseInitialized && process.env.AUTO_SYNC_TO_FIREBASE === 'true') {
        console.log('🔄 Performing initial sync to Firebase...');
        setTimeout(async () => {
          try {
            const syncResult = await firebaseIntegrationService.batchSyncFromMongoDB({
              Order, Staff, Customer, Branch, User
            });
            console.log('✅ Initial Firebase sync completed:', syncResult.results);
          } catch (syncError) {
            console.warn('⚠️ Initial Firebase sync failed:', syncError.message);
          }
        }, 5000); // Delay to ensure server is fully started
      }
    }

    console.log('About to call app.listen()...');
    const server = app.listen(PORT, '127.0.0.1', () => {
      console.log(`🚀 SAPTHALA Boutique Server running on port ${PORT}`);
      console.log(`📱 Admin Panel: http://localhost:${PORT}`);
      console.log(`🔗 API Base: http://localhost:${PORT}/api`);
      console.log(`🗄️ MongoDB: Connected to sapthala_boutique database`);
      console.log(`✅ Server is ready to accept requests`);
      console.log(`🔌 LISTENING ON 127.0.0.1:${PORT}`);
      console.log(`🔔 THIS MESSAGE APPEARS FROM WITHIN THE LISTEN CALLBACK`);
    });
    
    console.log(`🚦 app.listen() returned, server object exists: ${!!server}`);
    console.log(`🔗 Server address info:`, server.address());
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ PORT ${PORT} IS ALREADY IN USE!`);
        console.error(`\n💡 SOLUTION: Run RESTART_SERVER.bat to kill the old process and restart.\n`);
        process.exit(1);
      } else {
        console.error('❌ SERVER ERROR EVENT:', err);
      }
    });
    
    server.on('close', () => {
      console.error('❌ SERVER CLOSED EVENT');
    });
    
    server.on('connection', () => {
      console.log('✅ NEW CONNECTION RECEIVED');
    });
    
    // Keep the process alive using an interval (disabled by default to avoid noisy test output)
    if (process.env.ENABLE_HEARTBEAT === 'true') {
      setInterval(() => {
        console.log(`[HEARTBEAT] Server still alive at ${new Date().toISOString()}`);
      }, 5000);
    }
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();

// Authentication middleware — supports server JWT OR Firebase ID token
// Initialize firebase-admin from GOOGLE_APPLICATION_CREDENTIALS if set, otherwise fall back to repo-default service account.
const adminSdkPath = path.join(__dirname, 'Boutique-app', 'super-admin-backend', 'src', 'main', 'resources', 'firebase', 'super-admin-auth.json');
let firebaseAdmin;
try {
  const admin = require('firebase-admin');
  // Prefer service account via env var for live/production usage
  const envCredPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (envCredPath && fs.existsSync(envCredPath)) {
    const svc = require(envCredPath);
    admin.initializeApp({ credential: admin.credential.cert(svc) });
    firebaseAdmin = admin;
    console.log('✅ Firebase Admin initialized from GOOGLE_APPLICATION_CREDENTIALS');
  } else if (fs.existsSync(adminSdkPath)) {
    const svc = require(adminSdkPath);
    admin.initializeApp({ credential: admin.credential.cert(svc) });
    firebaseAdmin = admin;
    console.log('✅ Firebase Admin initialized from repo service account');
  } else if (process.env.FIRESTORE_EMULATOR_HOST) {
    // Running with Firestore emulator — initialize admin SDK in emulator-friendly mode
    try {
      admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'sapthala-test' });
      firebaseAdmin = admin;
      console.log('✅ Firebase Admin initialized to use Firestore emulator at', process.env.FIRESTORE_EMULATOR_HOST);
    } catch (e) {
      console.warn('⚠️ Failed to initialize firebase-admin for emulator:', e && e.message ? e.message : e);
    }
  } else {
    console.warn('⚠️ Firebase service account not found; Firebase token verification will be unavailable');
  }
} catch (e) {
  console.warn('⚠️ firebase-admin not available — skipping Firebase token verification');
}

// Normalize roles to canonical values ('super-admin','admin','sub-admin')
function canonicalizeRole(r) {
  if (!r) return '';
  const s = String(r).trim().toLowerCase();
  if (/^(super[_\- ]?admin|superadmin|super-admin)$/.test(s)) return 'super-admin';
  if (/^(sub[_\- ]?admin|subadmin|sub-admin)$/.test(s)) return 'sub-admin';
  if (/^admin$/.test(s)) return 'admin';
  return s; // return normalized lowercase fallback
}

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // 1) Try Firebase token verification first (if firebase-admin initialized)
  if (firebaseAdmin) {
    try {
      const decoded = await firebaseAdmin.auth().verifyIdToken(token);
      // Map Firebase email/uid to server User entry
      const email = decoded.email;
      if (email) {
        const user = await User.findOne({ email });
        if (user) {
          req.user = {
            id: user._id,
            username: user.username || email,
            role: canonicalizeRole(user.role || decoded.role || ''),
            email: email,
            permissions: user.permissions || {}
          };
          return next();
        }
      }

      // No mapped server user — try to infer role from Firebase custom claims (graceful fallback)
      const claimsRole = decoded && (decoded.role || decoded.claims && decoded.claims.role);
      if (claimsRole && /super|admin/i.test(String(claimsRole))) {
        // Allow known trusted super-admin emails only (defensive)
        const trusted = ['mstechno2323@gmail.com'];
        if (trusted.includes(email)) {
          req.user = {
            id: null,
            username: email,
            role: canonicalizeRole(claimsRole),
            email,
            permissions: {}
          };
          return next();
        }
      }

      // If token valid but no matching server user → forbidden
      return res.status(403).json({ error: 'Access denied. No mapped user for Firebase token.' });
    } catch (err) {
      // Not a Firebase token or verification failed — fallthrough to JWT verify
      // console.debug('Firebase token verify failed:', err?.message || err);
    }
  }

  // 2) Fallback: existing server JWT (signed with JWT_SECRET)
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    // Ensure role is canonicalized for downstream checks
    if (user && user.role) user.role = canonicalizeRole(user.role);
    req.user = user;
    next();
  });
};

// Helper: escape RegExp for safe regex creation
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Helper: validate staffId format
function validateStaffIdFormat(staffId) {
  if (!staffId || typeof staffId !== 'string') return { valid: false, message: 'staffId required' };
  const s = staffId.trim();
  // Preferred pattern: staff_### (e.g. staff_001)
  const staffPattern = /^staff_\d{3,}$/i;
  // More flexible fallback: starts with letter, 3-32 chars, letters/digits/_/-
  const genericPattern = /^[a-zA-Z][a-zA-Z0-9_-]{2,31}$/;

  if (staffPattern.test(s)) return { valid: true };
  if (genericPattern.test(s)) return { valid: true };
  return { valid: false, message: 'Invalid staffId format. Use "staff_001" or an alphanumeric id starting with a letter (3-32 chars).' };
}

// Health: Firestore connectivity check (authenticated)
app.get('/api/health/firestore', authenticateToken, async (req, res) => {
  try {
    const health = await firebaseIntegrationService.healthCheck();
    if (health.healthy) {
      return res.json({ success: true, message: 'Firestore accessible', ...health });
    } else {
      return res.status(503).json({ success: false, error: health.error });
    }
  } catch (error) {
    console.error('Firestore health check error:', error);
    return res.status(500).json({ success: false, error: 'Health check failed' });
  }
});

// Public Firestore health check (no auth) used by admin UI header
app.get('/api/public/health/firestore', async (req, res) => {
  try {
    const health = await firebaseIntegrationService.healthCheck();
    if (health.healthy) {
      return res.json({ success: true, message: 'Firestore accessible', ...health });
    } else {
      return res.status(503).json({ success: false, error: health.error });
    }
  } catch (error) {
    console.error('Public Firestore health check error:', error);
    return res.status(500).json({ success: false, error: 'Health check failed' });
  }
});

// Firebase Integration Status (for admin panels)
app.get('/api/firebase/status', async (req, res) => {
  try {
    const health = await firebaseIntegrationService.healthCheck();
    res.json({
      integrated: health.healthy,
      status: health.healthy ? 'connected' : 'disconnected',
      details: health
    });
  } catch (error) {
    res.status(500).json({ integrated: false, status: 'error', error: error.message });
  }
});

// Get Orders from Firebase (preferred source - real-time & synced)
app.get('/api/admin/orders/firebase/list', authenticateToken, async (req, res) => {
  try {
    console.log('🔥 Fetching orders from Firebase...');
    
    const branch = req.query.branch || (req.user.role === 'sub-admin' ? req.user.branch : null);
    
    // Fetch from Firebase
    const filters = {};
    if (branch) {
      filters.where = [['branch', '==', branch]];
    }
    filters.orderBy = { field: 'createdAt', direction: 'desc' };
    
    const result = await firebaseIntegrationService.getCollection('orders', filters);
    
    if (!result.success) {
      console.warn('⚠️ Firebase fetch failed, falling back to MongoDB');
      // Fall back to MongoDB
      let matchQuery = {};
      if (branch) matchQuery.branch = branch;
      const mongoOrders = await Order.find(matchQuery).sort({ createdAt: -1 }).select('orderId customerName customerPhone garmentType totalAmount advanceAmount status createdAt deliveryDate workflowTasks branch');
      const formatted = mongoOrders.map(order => ({
        _id: order._id,
        orderId: order.orderId,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        garmentType: order.garmentType,
        totalAmount: order.totalAmount,
        advanceAmount: order.advanceAmount,
        status: order.status,
        createdAt: order.createdAt,
        deliveryDate: order.deliveryDate,
        branch: order.branch,
        workflowTasks: order.workflowTasks || []
      }));
      return res.json({ success: true, source: 'mongodb', orders: formatted });
    }
    
    const orders = result.data || [];
    console.log(`✅ Fetched ${orders.length} orders from Firebase`);
    
    res.json({ 
      success: true, 
      source: 'firebase',
      orders: orders,
      dataSource: 'Firebase Firestore (Real-time)'
    });
  } catch (error) {
    console.error('❌ Firebase orders fetch error:', error);
    // Fallback to MongoDB
    try {
      const branch = req.query.branch || (req.user.role === 'sub-admin' ? req.user.branch : null);
      let matchQuery = {};
      if (branch) matchQuery.branch = branch;
      const orders = await Order.find(matchQuery).sort({ createdAt: -1 });
      const formatted = orders.map(order => ({
        _id: order._id,
        orderId: order.orderId,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        garmentType: order.garmentType,
        totalAmount: order.totalAmount,
        advanceAmount: order.advanceAmount,
        status: order.status,
        createdAt: order.createdAt,
        deliveryDate: order.deliveryDate,
        branch: order.branch,
        workflowTasks: order.workflowTasks || []
      }));
      res.json({ 
        success: true, 
        source: 'mongodb', 
        orders: formatted,
        dataSource: 'MongoDB (Fallback)'
      });
    } catch (mongoError) {
      res.status(500).json({ success: false, error: error.message, fallbackError: mongoError.message });
    }
  }
});

// ==================== SUPER ADMIN ROUTES ====================

// Get all admins (super-admin only)
app.get('/api/super-admin/admins', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'super-admin') {
      return res.status(403).json({ success: false, error: 'Access denied. Super-admin only.' });
    }

    const admins = await User.find({ role: { $in: ['admin', 'sub-admin'] } })
      .select('-password')
      .sort({ createdAt: -1 });
    
    const enrichedAdmins = await Promise.all(admins.map(async (admin) => {
      const branchData = admin.branch ? await Branch.findOne({ branchId: admin.branch }) : null;
      return {
        _id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        branch: admin.branch,
        branchName: branchData?.branchName || admin.branch,
        permissions: admin.permissions,
        isActive: admin.isActive,
        createdAt: admin.createdAt,
        lastLogin: admin.lastLogin
      };
    }));
    
    res.json({ success: true, admins: enrichedAdmins });
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch admins' });
  }
});

// Create admin (super-admin only)
app.post('/api/super-admin/admins', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'super-admin') {
      return res.status(403).json({ success: false, error: 'Access denied. Super-admin only.' });
    }

    const { username, email, password, role, branch, permissions } = req.body;
    
    if (!username || !password || !role) {
      return res.status(400).json({ success: false, error: 'Username, password, and role are required' });
    }

    if (!['admin', 'sub-admin'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Username or email already exists' });
    }

    let branchId = branch;
    if (role === 'sub-admin' && branch) {
      branchId = branch.startsWith('SAPTHALA.') ? branch.toUpperCase() : `SAPTHALA.${branch.replace(/\s+/g, '').toUpperCase()}`;
      
      let branchDoc = await Branch.findOne({ branchId });
      if (!branchDoc) {
        const branchName = branchId.split('.')[1].replace(/([A-Z])/g, ' $1').trim();
        branchDoc = await Branch.create({
          branchId,
          branchName,
          location: `${branchName} Branch`,
          isActive: true,
          createdBy: req.user.id
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await User.create({
      username,
      email,
      password: hashedPassword,
      role,
      branch: branchId,
      permissions: permissions || {
        canEdit: role === 'admin',
        canDelete: role === 'admin',
        canViewReports: true,
        canManageStaff: role === 'admin',
        canManageAdmins: false
      },
      isActive: true,
      createdBy: req.user.id
    });

    console.log(`✅ ${role} created by super-admin: ${username}`);
    
    res.json({ 
      success: true, 
      admin: {
        _id: newAdmin._id,
        username: newAdmin.username,
        email: newAdmin.email,
        role: newAdmin.role,
        branch: newAdmin.branch,
        permissions: newAdmin.permissions
      }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ success: false, error: 'Failed to create admin' });
  }
});

// Update admin (super-admin only)
app.put('/api/super-admin/admins/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'super-admin') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const { username, email, isActive, permissions } = req.body;
    const updateData = {};
    
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (permissions) updateData.permissions = permissions;

    const admin = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
    
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }

    res.json({ success: true, admin });
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({ success: false, error: 'Failed to update admin' });
  }
});

// Delete admin (super-admin only)
app.delete('/api/super-admin/admins/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'super-admin') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const admin = await User.findByIdAndDelete(req.params.id);
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }

    if (admin.branch) {
      await Staff.deleteMany({ branch: admin.branch });
      console.log(`✅ Staff deleted for branch: ${admin.branch}`);
      await Branch.findOneAndDelete({ branchId: admin.branch });
    }

    console.log(`✅ Admin deleted by super-admin: ${admin.username}`);
    res.json({ success: true, message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete admin' });
  }
});

// Get dashboard stats (super-admin only)
app.get('/api/super-admin/dashboard', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'super-admin') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const [totalAdmins, totalBranches, totalOrders, totalStaff, totalRevenue] = await Promise.all([
      User.countDocuments({ role: { $in: ['admin', 'sub-admin'] } }),
      Branch.countDocuments(),
      Order.countDocuments(),
      Staff.countDocuments(),
      Order.aggregate([{ $group: { _id: null, total: { $sum: '$totalAmount' } } }])
    ]);

    res.json({
      success: true,
      stats: {
        totalAdmins,
        totalBranches,
        totalOrders,
        totalStaff,
        totalRevenue: totalRevenue[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
  }
});

// ------------------ Additional Super-Admin endpoints (implemented on Node) ------------------

// Clients (map to Branch + main admin)
app.get('/api/super-admin/clients', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'super-admin') return res.status(403).json({ success: false, error: 'Access denied.' });

    const branches = await Branch.find().sort({ createdAt: -1 });
    const clients = await Promise.all(branches.map(async (br) => {
      const admins = await User.find({ branch: br.branchId, role: { $in: ['admin', 'sub-admin'] } }).select('-password');
      const mainAdmin = admins[0] || null;
      return {
        id: br.branchId,
        boutiqueName: br.branchName,
        name: mainAdmin?.username || 'Main Admin',
        email: br.email || mainAdmin?.email || '',
        address: br.location || '',
        status: br.isActive ? 'Active' : 'Inactive',
        numberOfAdmins: admins.length
      };
    }));

    res.json(clients);
  } catch (err) {
    console.error('Get clients error:', err);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// Create client (creates Branch + a main admin user)
app.post('/api/super-admin/clients', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'super-admin') return res.status(403).json({ success: false, error: 'Access denied.' });

    const { name, email, status = 'Active', boutiqueName, address } = req.body;
    if (!name || !boutiqueName) return res.status(400).json({ error: 'name and boutiqueName are required' });

    const branchId = `SAPTHALA.${boutiqueName.replace(/\s+/g, '').toUpperCase()}`;
    const branch = await Branch.create({ branchId, branchName: boutiqueName, location: address || boutiqueName, email: email || '', isActive: status === 'Active' });

    const hashed = await bcrypt.hash('sapthala@2029', 10);
    const user = await User.create({ username: name.replace(/\s+/g, '').toLowerCase(), email: email || '', password: hashed, role: 'admin', branch: branch.branchId, isActive: true, createdBy: req.user.id });

    res.json({ success: true, client: { id: branch.branchId, boutiqueName: branch.branchName } });
  } catch (err) {
    console.error('Create client error:', err);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// Update client
app.put('/api/super-admin/clients/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'super-admin') return res.status(403).json({ success: false, error: 'Access denied.' });
    const { id } = req.params;
    const { boutiqueName, address, email, status } = req.body;

    const branch = await Branch.findOneAndUpdate({ branchId: id }, { branchName: boutiqueName, location: address, email, isActive: status === 'Active' }, { new: true });
    if (!branch) return res.status(404).json({ error: 'Client not found' });
    res.json({ success: true, client: { id: branch.branchId, boutiqueName: branch.branchName } });
  } catch (err) {
    console.error('Update client error:', err);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// Delete client
app.delete('/api/super-admin/clients/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'super-admin') return res.status(403).json({ success: false, error: 'Access denied.' });
    const { id } = req.params;

    const branch = await Branch.findOneAndDelete({ branchId: id });
    if (!branch) return res.status(404).json({ error: 'Client not found' });

    await User.deleteMany({ branch: id });
    await Staff.deleteMany({ branch: id });

    res.json({ success: true, message: 'Client deleted' });
  } catch (err) {
    console.error('Delete client error:', err);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

// Clients count
app.get('/api/super-admin/clients/count', authenticateToken, async (req, res) => {
  try {
    const count = await Branch.countDocuments();
    res.json({ count });
  } catch (err) {
    console.error('Clients count error:', err);
    res.status(500).json({ error: 'Failed to get clients count' });
  }
});

// Admins count
app.get('/api/super-admin/admins/count', authenticateToken, async (req, res) => {
  try {
    const count = await User.countDocuments({ role: { $in: ['admin', 'sub-admin'] } });
    res.json({ count });
  } catch (err) {
    console.error('Admins count error:', err);
    res.status(500).json({ error: 'Failed to get admins count' });
  }
});

// Users list + count
app.get('/api/super-admin/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});
app.get('/api/super-admin/users/count', authenticateToken, async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.json({ count });
  } catch (err) {
    console.error('Users count error:', err);
    res.status(500).json({ error: 'Failed to get users count' });
  }
});

// Vendors CRUD + count (simple Mongo-backed implementation)
app.get('/api/super-admin/vendors', authenticateToken, async (req, res) => {
  try {
    const vendors = await Vendor.find().sort({ createdAt: -1 });
    res.json(vendors);
  } catch (err) {
    console.error('Get vendors error:', err);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});
app.post('/api/super-admin/vendors', authenticateToken, async (req, res) => {
  try {
    const { name, email, status } = req.body;
    const v = await Vendor.create({ name, email, status: status || 'Active' });
    res.json(v);
  } catch (err) {
    console.error('Create vendor error:', err);
    res.status(500).json({ error: 'Failed to create vendor' });
  }
});
app.put('/api/super-admin/vendors/:id', authenticateToken, async (req, res) => {
  try {
    const updated = await Vendor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Vendor not found' });
    res.json(updated);
  } catch (err) {
    console.error('Update vendor error:', err);
    res.status(500).json({ error: 'Failed to update vendor' });
  }
});
app.delete('/api/super-admin/vendors/:id', authenticateToken, async (req, res) => {
  try {
    await Vendor.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete vendor error:', err);
    res.status(500).json({ error: 'Failed to delete vendor' });
  }
});
app.get('/api/super-admin/vendors/count', authenticateToken, async (req, res) => {
  try {
    const count = await Vendor.countDocuments();
    res.json({ count });
  } catch (err) {
    console.error('Vendors count error:', err);
    res.status(500).json({ error: 'Failed to get vendors count' });
  }
});

// Admins hierarchy (branches + subadmins for a client/branch)
app.get('/api/super-admin/admins/hierarchy/:clientId', authenticateToken, async (req, res) => {
  try {
    const { clientId } = req.params;
    const branch = await Branch.findOne({ branchId: clientId });
    if (!branch) return res.status(404).json({ branches: [] });

    const subAdmins = await User.find({ branch: clientId, role: { $in: ['admin', 'sub-admin'] } }).select('-password');

    res.json({ branches: [{ branch: { id: branch.branchId, name: branch.branchName, location: branch.location }, subAdmins }] });
  } catch (err) {
    console.error('Admins hierarchy error:', err);
    res.status(500).json({ error: 'Failed to fetch admins hierarchy' });
  }
});

// Active admins chart (last 7 days)
app.get('/api/super-admin/dashboard/active-admins-last-7-days', authenticateToken, async (req, res) => {
  try {
    const counts = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setHours(0,0,0,0);
      d.setDate(today.getDate() - i);
      const start = new Date(d);
      const end = new Date(d);
      end.setDate(d.getDate() + 1);

      // Count distinct admin usernames who had successful login attempts on that day
      const usernames = await LoginAttempt.find({ success: true, timestamp: { $gte: start, $lt: end } }).distinct('username');
      // Filter those usernames for admin/sub-admin role
      const adminUsers = await User.find({ username: { $in: usernames }, role: { $in: ['admin', 'sub-admin'] } }).distinct('username');
      counts.push(adminUsers.length);
    }

    res.json(counts);
  } catch (err) {
    console.error('Active admins chart error:', err);
    res.status(500).json({ error: 'Failed to fetch active admins chart' });
  }
});

// ---------------------------------------------------------------------------------------------

// ==================== ADMIN ROUTES ====================

// Get Login Attempts (Admin only)
app.get('/api/admin/login-attempts', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { limit = 50, success } = req.query;
    
    let query = {};
    if (success !== undefined) {
      query.success = success === 'true';
    }

    const attempts = await LoginAttempt.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    const stats = {
      total: await LoginAttempt.countDocuments(),
      successful: await LoginAttempt.countDocuments({ success: true }),
      failed: await LoginAttempt.countDocuments({ success: false }),
      last24Hours: await LoginAttempt.countDocuments({
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    };

    res.json({ attempts, stats });
  } catch (error) {
    console.error('Get login attempts error:', error);
    res.status(500).json({ error: 'Failed to fetch login attempts' });
  }
});

// Admin Login (accepts username + password for server-side auth, or just password for fallback compatibility)
app.post('/api/admin/login', async (req, res) => {
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];
  
  try {
    const { username, password } = req.body;
    
    // Validate required fields
    if (!password) {
      await LoginAttempt.create({
        username: username || 'unknown',
        success: false,
        errorMessage: 'Password is required',
        ipAddress,
        userAgent
      });
      return res.status(400).json({ error: 'Password is required' });
    }
    
    // Search for user by username (admin or sub-admin)
    const searchUsername = username || 'admin';
    const user = await User.findOne({ username: searchUsername });
    
    if (!user) {
      await LoginAttempt.create({
        username: searchUsername,
        success: false,
        errorMessage: 'User not found',
        ipAddress,
        userAgent
      });
      console.warn(`⚠️  User not found: ${searchUsername}`);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Compare password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      await LoginAttempt.create({
        username: searchUsername,
        success: false,
        errorMessage: 'Invalid password',
        ipAddress,
        userAgent
      });
      console.warn(`⚠️  Wrong password for user: ${searchUsername}`);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Ensure role is canonical in token and response
    const normalizedRole = canonicalizeRole(user.role || '');

    const token = jwt.sign(
      { id: user._id, username: user.username, role: normalizedRole, branch: user.branch, permissions: user.permissions },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Log successful login
    await LoginAttempt.create({
      username: searchUsername,
      success: true,
      errorMessage: null,
      ipAddress,
      userAgent
    });

    console.log(`✅ ${normalizedRole} login successful: ${user.username}`);
    res.json({
      success: true,
      token,
      user: { 
        id: user._id, 
        username: user.username, 
        role: normalizedRole, 
        branch: user.branch,
        permissions: user.permissions 
      }
    });
  } catch (error) {
    await LoginAttempt.create({
      username: req.body.username || 'unknown',
      success: false,
      errorMessage: error.message,
      ipAddress,
      userAgent
    });
    console.error('❌ Admin login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== SUB-ADMIN MANAGEMENT ROUTES ====================

// Create Sub-Admin
app.post('/api/admin/sub-admins', authenticateToken, async (req, res) => {
  try {
    // Only main admin can create sub-admins
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only main admin can create sub-admins' });
    }

    const { username, password, branch, permissions } = req.body;
    
    if (!username || !password || !branch) {
      return res.status(400).json({ error: 'Username, password, and branch are required' });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Format branch ID properly: SAPTHALA.BRANCHNAME (uppercase, no spaces)
    const branchId = branch.startsWith('SAPTHALA.') ? branch.toUpperCase() : `SAPTHALA.${branch.replace(/\s+/g, '').toUpperCase()}`;
    
    // Ensure branch exists - create if it doesn't
    let branchDoc = await Branch.findOne({ branchId });
    if (!branchDoc) {
      // Extract branch name from branchId (e.g., "SAPTHALA.JUBILEEHILLS" -> "Jubilee Hills")
      const branchName = branchId.split('.')[1].replace(/([A-Z])/g, ' $1').trim();
      branchDoc = await Branch.create({
        branchId,
        branchName,
        location: `${branchName} Branch`,
        isActive: true,
        createdBy: req.user.id
      });
      console.log(`✅ Branch auto-created: ${branchName} (${branchId})`);
      
      // Auto-create staff for all workflow stages in this branch
      const settings = await Settings.findOne();
      if (settings && settings.workflowStages) {
        for (const stage of settings.workflowStages) {
          const staffId = `${branchId.replace(/\s+/g, '')}_${stage.id}`;
          const staffName = `${stage.name} (${branchName})`;
          await Staff.create({
            staffId,
            name: staffName,
            phone: '9876543210',
            email: `${staffId.toLowerCase()}@sapthala.com`,
            role: stage.name,
            pin: '1234',
            branch: branchId,
            workflowStages: [stage.id],
            skills: stage.requiredSkills || [],
            isAvailable: true
          });
          console.log(`✅ Auto-created staff: ${staffId} for stage ${stage.name}`);
        }
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const subAdmin = new User({
      username,
      password: hashedPassword,
      role: 'sub-admin',
      branch: branchId,
      permissions: {
        canEdit: false,
        canDelete: false,
        canViewReports: true,
        canManageStaff: false,
        branchAccess: [branchId],
        ...permissions
      },
      createdBy: req.user.id
    });

    await subAdmin.save();
    console.log(`✅ Sub-admin created: ${username} for branch ${branchId}`);
    
    res.json({ 
      success: true, 
      subAdmin: {
        id: subAdmin._id,
        username: subAdmin.username,
        branch: subAdmin.branch,
        permissions: subAdmin.permissions
      },
      branch: {
        branchId: branchDoc.branchId,
        branchName: branchDoc.branchName
      }
    });
  } catch (error) {
    console.error('Create sub-admin error:', error);
    res.status(500).json({ error: 'Failed to create sub-admin' });
  }
});

// Get all sub-admins (main admin only)
app.get('/api/admin/sub-admins', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const subAdmins = await User.find({ role: 'sub-admin' })
      .select('-password')
      .sort({ createdAt: -1 });
    
    // Fetch branch details for each sub-admin
    const branchIds = [...new Set(subAdmins.map(sa => sa.branch).filter(Boolean))];
    const branches = await Branch.find({ branchId: { $in: branchIds } }).lean();
    const branchMap = {};
    branches.forEach(b => branchMap[b.branchId] = b);
    
    const enrichedSubAdmins = subAdmins.map(sa => ({
      _id: sa._id,
      username: sa.username,
      role: sa.role,
      branch: sa.branch,
      branchName: branchMap[sa.branch]?.branchName || sa.branch,
      permissions: sa.permissions,
      createdAt: sa.createdAt
    }));
    
    res.json({ success: true, subAdmins: enrichedSubAdmins });
  } catch (error) {
    console.error('Get sub-admins error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch sub-admins' });
  }
});

// Update sub-admin password (main admin only)
app.put('/api/admin/sub-admins/:id/password', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Only main admin can change passwords.' });
    }

    const { newPassword, reason } = req.body;
    
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const subAdmin = await User.findById(req.params.id);
    if (!subAdmin) {
      return res.status(404).json({ error: 'Sub-admin not found' });
    }

    if (subAdmin.role !== 'sub-admin') {
      return res.status(400).json({ error: 'Can only change passwords for sub-admins' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    subAdmin.password = hashedPassword;
    subAdmin.passwordChangedAt = new Date();
    subAdmin.passwordChangedBy = req.user.id;
    await subAdmin.save();

    // Log the password change for audit
    console.log(`🔐 Password changed for sub-admin: ${subAdmin.username} by admin: ${req.user.username}`);
    console.log(`   Reason: ${reason || 'No reason provided'}`);

    // TODO: Send notification to sub-admin about password change
    // await NotificationService.notifyPasswordChange(subAdmin.email, subAdmin.username);

    res.json({ 
      success: true, 
      message: 'Password changed successfully',
      changedAt: subAdmin.passwordChangedAt
    });
  } catch (error) {
    console.error('Change sub-admin password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Delete sub-admin (main admin only)
app.delete('/api/admin/sub-admins/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const subAdmin = await User.findByIdAndDelete(req.params.id);
    if (!subAdmin) {
      return res.status(404).json({ error: 'Sub-admin not found' });
    }

    // Also delete the associated branch and staff if it exists
    if (subAdmin.branch) {
      await Staff.deleteMany({ branch: subAdmin.branch });
      console.log(`✅ Staff deleted for branch: ${subAdmin.branch}`);
      await Branch.findOneAndDelete({ branchId: subAdmin.branch });
      console.log(`✅ Branch deleted: ${subAdmin.branch}`);
    }

    console.log(`✅ Sub-admin deleted: ${subAdmin.username}`);
    res.json({ success: true, message: 'Sub-admin and associated branch deleted successfully' });
  } catch (error) {
    console.error('Delete sub-admin error:', error);
    res.status(500).json({ error: 'Failed to delete sub-admin' });
  }
});

// ==================== BRANCH MANAGEMENT ROUTES ====================

// Get all branches
app.get('/api/branches', authenticateToken, async (req, res) => {
  try {
    const branches = await Branch.find().sort({ createdAt: -1 });
    res.json({ success: true, branches });
  } catch (error) {
    console.error('Get branches error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch branches' });
  }
});

// Public festivals endpoint (returns festival dates)
app.get('/api/festivals', async (req, res) => {
  try {
    const settings = await Settings.findOne();
    if (!settings) return res.json({});
    return res.json({ success: true, festivals: settings.festivalDates || {} });
  } catch (error) {
    console.error('Get festivals error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch festival settings' });
  }
});

// Admin: update festival dates (authenticated)
app.post('/api/admin/festivals', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const newDates = req.body;
    if (!newDates || typeof newDates !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid festival data' });
    }

    const settings = await Settings.findOne();
    if (!settings) {
      // create settings doc
      const created = await Settings.create({ festivalDates: newDates });
      return res.json({ success: true, festivals: created.festivalDates });
    }

    settings.festivalDates = Object.assign({}, settings.festivalDates || {}, newDates);
    settings.updatedAt = new Date();
    await settings.save();
    res.json({ success: true, festivals: settings.festivalDates });
  } catch (error) {
    console.error('Update festivals error:', error);
    res.status(500).json({ success: false, error: 'Failed to update festival settings' });
  }
});

// Public branches endpoint for clients with DISTINCT branches
app.get('/api/public/branches', async (req, res) => {
  try {
    const branches = await Branch.aggregate([
      { $group: { 
        _id: '$branchId',
        branchName: { $first: '$branchName' },
        location: { $first: '$location' }
      }},
      { $sort: { branchName: 1 } }
    ]);
    
    const uniqueBranches = branches.map(b => ({
      branchId: b._id,
      branchName: b.branchName || b._id,
      location: b.location || ''
    }));
    
    res.json(uniqueBranches);
  } catch (error) {
    console.error('Get public branches error:', error);
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

// ------------------ Public Staff Endpoints ------------------
// Get public staff list (no auth required) - RETURNS UNIQUE STAFF ONLY
app.get('/api/staff', async (req, res) => {
  try {
    const { branch } = req.query || {};
    let query = {};

    if (branch) {
      const b = await Branch.findOne({ $or: [ { branchId: branch }, { branchName: branch } ] });
      if (!b) {
        const bLower = (branch || '').toLowerCase();
        const byName = await Branch.findOne({ branchName: { $regex: new RegExp('^' + bLower + '$', 'i') } });
        const byId = await Branch.findOne({ branchId: { $regex: new RegExp('^' + bLower + '$', 'i') } });
        if (byName) query.branch = byName.branchId;
        else if (byId) query.branch = byId.branchId;
        else query.branch = branch;
      } else {
        query.branch = b.branchId;
      }
    }

    // Use aggregation to get UNIQUE staff by staffId
    const staff = await Staff.aggregate([
      { $match: query },
      { $sort: { createdAt: -1 } },
      { $group: { 
        _id: '$staffId',
        doc: { $first: '$$ROOT' }
      }},
      { $replaceRoot: { newRoot: '$doc' } },
      { $sort: { createdAt: -1 } }
    ]);

    const branchIds = Array.from(new Set(staff.map(s => s.branch).filter(Boolean)));
    const branches = await Branch.find({ branchId: { $in: branchIds } }).lean();
    const branchMap = {};
    for (const b of branches) branchMap[b.branchId] = b.branchName;

    const out = staff.map(s => ({
      staffId: s.staffId,
      id: s._id,
      name: s.name,
      phone: s.phone,
      email: s.email || null,
      role: s.role,
      branch: s.branch || null,
      branchName: branchMap[s.branch] || null,
      isAvailable: s.isAvailable || false,
      workflowStages: s.workflowStages || []
    }));
    res.json(out);
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ error: 'Failed to fetch staff list' });
  }
});

// Staff login (public endpoint for simple PIN-based login)
app.post('/api/staff/login', async (req, res) => {
  try {
    const { staffId, pin, branch } = req.body || {};
    if (!staffId || !pin) return res.status(400).json({ error: 'staffId and pin are required' });

    // Allow searching by staffId and optionally branch
    const query = { staffId };
    if (branch) query.branch = branch;

    const staff = await Staff.findOne(query).lean();
    if (!staff) {
      return res.status(401).json({ error: 'Invalid staff credentials' });
    }

    // Simple PIN check (stored as plain for now in default data)
    if ((staff.pin || '1234').toString() !== pin.toString()) {
      return res.status(401).json({ error: 'Invalid staff credentials' });
    }

    // create a lightweight token for session use
    const token = jwt.sign({ id: staff._id, staffId: staff.staffId, name: staff.name, role: staff.role, branch: staff.branch }, JWT_SECRET, { expiresIn: '12h' });

    // remove sensitive fields
    const safeStaff = Object.assign({}, staff);
    delete safeStaff.pin;

    res.json({ success: true, staff: safeStaff, token });
  } catch (error) {
    console.error('Staff login error:', error);
    res.status(500).json({ error: 'Failed to login staff' });
  }
});

// Admin: create staff member for a branch
app.post('/api/staff', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });

    const { staffId, name, phone, email, role, pin = '1234', branch, workflowStages = [], skills = [] } = req.body || {};
    if (!staffId || !name || !branch) return res.status(400).json({ error: 'staffId, name and branch are required' });

    // Validate staffId format
    const sid = (staffId || '').toString().trim();
    const valid = validateStaffIdFormat(sid);
    if (!valid.valid) return res.status(400).json({ error: valid.message });

    // Allow branch to be specified as branchId or branchName
    let branchDoc = await Branch.findOne({ $or: [ { branchId: branch }, { branchName: branch } ] });
    if (!branchDoc) {
      // try case-insensitive search
      const branchLower = (branch || '').toLowerCase();
      const byName = await Branch.findOne({ branchName: { $regex: new RegExp('^' + branchLower + '$', 'i') } });
      const byId = await Branch.findOne({ branchId: { $regex: new RegExp('^' + branchLower + '$', 'i') } });
      if (byName) branchDoc = byName;
      else if (byId) branchDoc = byId;
    }
    if (!branchDoc) return res.status(400).json({ error: 'Branch not found' });

    // Enforce case-insensitive uniqueness of staffId across all branches
    const existing = await Staff.findOne({ staffId: { $regex: new RegExp('^' + escapeRegExp(sid) + '$', 'i') } });
    if (existing) return res.status(400).json({ error: 'Staff with this staffId already exists' });

    const staff = new Staff({ staffId: sid, name, phone, email, role, pin, branch: branchDoc.branchId, workflowStages, skills, isAvailable: true });
    await staff.save();
    console.log(`✅ Admin ${req.user.username} created staff ${staffId} for branch ${branch}`);
    res.json({ success: true, staff });
  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({ error: 'Failed to create staff' });
  }
});

// Update staff (admin only) - supports changing staffId with validation
app.put('/api/staff/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });

    const id = req.params.id;
    const update = req.body || {};

    // If staffId is being updated, validate format and uniqueness
    if (update.staffId) {
      const newId = update.staffId.toString().trim();
      const valid = validateStaffIdFormat(newId);
      if (!valid.valid) return res.status(400).json({ error: valid.message });

      const conflict = await Staff.findOne({ staffId: { $regex: new RegExp('^' + escapeRegExp(newId) + '$', 'i') }, _id: { $ne: id } });
      if (conflict) return res.status(400).json({ error: 'Another staff member with this staffId already exists' });

      update.staffId = newId;
    }

    // If branch is provided, resolve to canonical branchId
    if (update.branch) {
      let branchDoc = await Branch.findOne({ $or: [ { branchId: update.branch }, { branchName: update.branch } ] });
      if (!branchDoc) {
        const bLower = (update.branch || '').toLowerCase();
        const byName = await Branch.findOne({ branchName: { $regex: new RegExp('^' + bLower + '$', 'i') } });
        const byId = await Branch.findOne({ branchId: { $regex: new RegExp('^' + bLower + '$', 'i') } });
        if (byName) branchDoc = byName;
        else if (byId) branchDoc = byId;
      }
      if (!branchDoc) return res.status(400).json({ error: 'Branch not found' });
      update.branch = branchDoc.branchId;
    }

    const updated = await Staff.findByIdAndUpdate(id, update, { new: true });
    if (!updated) return res.status(404).json({ error: 'Staff not found' });
    res.json({ success: true, staff: updated });
  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({ error: 'Failed to update staff' });
  }
});

// ==================== CUSTOMER ENDPOINTS ====================

// Admin: get all customers (admin only) with search functionality
app.get('/api/admin/customers', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { search, name, phone } = req.query;
    let query = {};
    
    // Build search query with LIKE functionality
    if (search) {
      const searchRegex = new RegExp(search, 'i'); // case-insensitive
      query.$or = [
        { name: searchRegex },
        { phone: searchRegex }
      ];
    } else {
      if (name) query.name = new RegExp(name, 'i');
      if (phone) query.phone = new RegExp(phone, 'i');
    }

    const customers = await Customer.find(query).sort({ createdAt: -1 }).lean();
    // Return stable shape
    const out = customers.map(c => ({
      id: c._id,
      name: c.name,
      phone: c.phone,
      email: c.email || null,
      address: c.address || null,
      totalOrders: c.totalOrders || (Array.isArray(c.orders) ? c.orders.length : 0),
      totalSpent: c.totalSpent || 0,
      createdAt: c.createdAt
    }));

    res.json({ success: true, customers: out });
  } catch (error) {
    console.error('Get admin customers error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch customers' });
  }
});

// Public: simple customers list for lightweight clients (no auth)
app.get('/api/public/customers', async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 }).limit(200).lean();
    const out = customers.map(c => ({ name: c.name, phone: c.phone, totalOrders: c.totalOrders || (Array.isArray(c.orders) ? c.orders.length : 0) }));
    res.json(out);
  } catch (error) {
    console.error('Get public customers error:', error);
    res.status(500).json({ error: 'Failed to fetch public customers' });
  }
});

// Generic customers endpoint (tries to be tolerant)
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 }).limit(500).lean();
    res.json({ success: true, customers });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch customers' });
  }
});

// Create branch
app.post('/api/branches', authenticateToken, async (req, res) => {
  try {
    // Allow both platform `super-admin` and regular `admin` to create branches.
    // Previously this blocked `super-admin` and caused the "Add Branch" action to fail.
    if (!['admin', 'super-admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Only main admin or super-admin can create branches' });
    }

    const { branchName, location, phone, email } = req.body;
    
    if (!branchName || !location) {
      return res.status(400).json({ success: false, error: 'Branch name and location are required' });
    }

    const branchId = `SAPTHALA.${branchName.replace(/\s+/g, '').toUpperCase()}`;
    
    const existingBranch = await Branch.findOne({ branchId });
    if (existingBranch) {
      return res.status(400).json({ success: false, error: 'Branch already exists' });
    }

    const branch = new Branch({
      branchId,
      branchName,
      location,
      phone,
      email,
      createdBy: req.user.id
    });

    await branch.save();
    console.log(`✅ Branch created: ${branchName} (${branchId})`);
    // Also mirror branch to Firestore if firebase-admin initialized (emulator or production)
    try {
      if (firebaseAdmin) {
        const fs = firebaseAdmin.firestore();
        await fs.collection('branches').doc(branchId).set({
          branchId,
          branchName,
          location,
          phone: phone || '',
          email: email || '',
          createdBy: req.user.username || req.user.id || null,
          createdAt: new Date()
        });
        console.log(`🔁 Branch mirrored to Firestore: ${branchId}`);
      }
    } catch (e) {
      console.warn('⚠️ Failed to mirror branch to Firestore:', e && e.message ? e.message : e);
    }
    
    res.json({ success: true, branch });
  } catch (error) {
    console.error('Create branch error:', error);
    res.status(500).json({ success: false, error: 'Failed to create branch' });
  }
});

// Update branch
app.put('/api/branches/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const { branchName, location, phone, email, isActive } = req.body;
    
    const branch = await Branch.findByIdAndUpdate(
      req.params.id,
      { branchName, location, phone, email, isActive, updatedAt: new Date() },
      { new: true }
    );
    
    if (!branch) {
      return res.status(404).json({ success: false, error: 'Branch not found' });
    }
    
    res.json({ success: true, branch });
  } catch (error) {
    console.error('Update branch error:', error);
    res.status(500).json({ success: false, error: 'Failed to update branch' });
  }
});

// Delete branch
app.delete('/api/branches/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const branch = await Branch.findByIdAndDelete(req.params.id);
    
    if (!branch) {
      return res.status(404).json({ success: false, error: 'Branch not found' });
    }
    
    res.json({ success: true, message: 'Branch deleted successfully' });
  } catch (error) {
    console.error('Delete branch error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete branch' });
  }
});

// Delete default branches (JNTU, KPHB, MAIN)
app.delete('/api/admin/delete-default-branches', async (req, res) => {
  try {
    const result = await Branch.deleteMany({
      branchId: { $in: ['SAPTHALA.JNTU', 'SAPTHALA.KPHB', 'SAPTHALA.MAIN'] }
    });
    console.log(`✅ Deleted ${result.deletedCount} default branches`);
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Delete default branches error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete branches' });
  }
});

// Get last N orders report
app.get('/api/reports/last-orders-custom', authenticateToken, async (req, res) => {
  try {
    const { limit = 10, branch } = req.query;
    
    let matchQuery = {};
    
    if (req.user.role === 'sub-admin') {
      matchQuery.branch = req.user.branch;
    } else if (branch && branch !== 'all') {
      matchQuery.branch = branch;
    }
    
    const orders = await Order.find(matchQuery)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('orderId customerName customerPhone garmentType totalAmount advanceAmount balanceAmount status createdAt branch workflowTasks');
    
    const totalAmount = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalAdvance = orders.reduce((sum, o) => sum + (o.advanceAmount || 0), 0);
    const totalBalance = orders.reduce((sum, o) => sum + (o.balanceAmount || 0), 0);
    
    res.json({
      success: true,
      orders: orders.map(o => {
        const totalTasks = (o.workflowTasks || []).length;
        const completedTasks = (o.workflowTasks || []).filter(t => t.status === 'completed').length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        return {
          orderId: o.orderId,
          date: o.createdAt,
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          garmentType: o.garmentType,
          totalAmount: o.totalAmount || 0,
          advanceAmount: o.advanceAmount || 0,
          balanceAmount: o.balanceAmount || 0,
          status: o.status,
          branch: o.branch,
          progress: progress,
          progressPercentage: progress,
          totalTasks: totalTasks,
          completedTasks: completedTasks
        };
      }),
      summary: {
        totalOrders: orders.length,
        totalAmount,
        totalAdvance,
        totalBalance
      }
    });
  } catch (error) {
    console.error('Last orders custom report error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate report' });
  }
});

// Get branch-wise summary
app.get('/api/reports/branch-summary', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const branches = await Branch.find({ isActive: true });
    const summary = [];

    for (const branch of branches) {
      const orders = await Order.find({ branch: branch.branchId });
      const totalAmount = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const totalAdvance = orders.reduce((sum, o) => sum + (o.advanceAmount || 0), 0);
      const totalBalance = orders.reduce((sum, o) => sum + (o.balanceAmount || 0), 0);

      summary.push({
        branchId: branch.branchId,
        branchName: branch.branchName,
        location: branch.location,
        totalOrders: orders.length,
        totalAmount,
        totalAdvance,
        totalBalance
      });
    }

    res.json({ success: true, summary });
  } catch (error) {
    console.error('Branch summary error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate branch summary' });
  }
});

// Admin: ensure branch has staff for all workflow stages (idempotent)
app.post('/api/admin/ensure-branch-staff', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
    const { branch } = req.body || {};
    if (!branch) return res.status(400).json({ error: 'branch is required' });

    let branchDoc = await Branch.findOne({ $or: [ { branchId: branch }, { branchName: branch } ] });
    if (!branchDoc) {
      const bLower = (branch || '').toLowerCase();
      const byName = await Branch.findOne({ branchName: { $regex: new RegExp('^' + bLower + '$', 'i') } });
      const byId = await Branch.findOne({ branchId: { $regex: new RegExp('^' + bLower + '$', 'i') } });
      branchDoc = byName || byId;
    }
    if (!branchDoc) return res.status(404).json({ error: 'Branch not found' });

    const settings = await Settings.findOne();
    const stages = (settings && settings.workflowStages) || [];
    const created = [];
    for (const st of stages) {
      const stageId = st.id || (st.name || '').replace(/\s+/g, '-').toLowerCase();
      const existing = await Staff.findOne({ branch: branchDoc.branchId, workflowStages: stageId });
      if (!existing) {
        const staffId = `${branchDoc.branchId.replace(/\s+/g, '')}_${stageId}`;
        const staffName = `${st.name} (${branchDoc.branchName})`;
        const s = await Staff.create({ staffId, name: staffName, phone: '9876543210', email: `${staffId.toLowerCase()}@sapthala.com`, role: st.name, pin: '1234', branch: branchDoc.branchId, workflowStages: [stageId], skills: st.requiredSkills || [], isAvailable: true });
        created.push({ staffId: s.staffId, name: s.name });
      }
    }

    res.json({ success: true, created });
  } catch (error) {
    console.error('Ensure branch staff error:', error);
    res.status(500).json({ error: 'Failed to ensure branch staff' });
  }
});

// Dashboard stats (admin/sub-admin)
app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    let match = {};
    if (req.user.role === 'sub-admin') match.branch = req.user.branch;

    const orders = await Order.find(match).lean();
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const advanceCollected = orders.reduce((s, o) => s + (o.advanceAmount || 0), 0);
    const pendingOrders = orders.filter(o => ['pending','in_progress'].includes(o.status)).length;

    res.json({ success: true, totalOrders, totalRevenue, advanceCollected, pendingOrders });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
  }
});

// Reports: staff performance
app.get('/api/reports/staff-performance', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'sub-admin' || req.user.role === 'admin') {
      const { fromDate, toDate } = req.query;
      const match = {};
      if (req.user.role === 'sub-admin') match.branch = req.user.branch;
      if (fromDate || toDate) match.createdAt = {};
      if (fromDate) match.createdAt.$gte = new Date(fromDate);
      if (toDate) match.createdAt.$lte = new Date(toDate);

      const orders = await Order.find(match).lean();

      const stats = {};
      for (const order of orders) {
        const tasks = Array.isArray(order.workflowTasks) ? order.workflowTasks : [];
        for (const t of tasks) {
          if (!t.assignedTo && !t.assignedToName) continue;
          // assignedTo might be ObjectId or staffId string
          const key = (t.assignedTo && t.assignedTo.toString()) || (t.assignedToName && t.assignedToName.toString()) || 'unassigned';
          stats[key] = stats[key] || { staffIdentifier: key, staffName: t.assignedToName || key, tasksCompleted: 0, totalTime: 0 };
          if (t.status === 'completed') {
            stats[key].tasksCompleted += 1;
            stats[key].totalTime += (t.timeSpent || 0);
          }
        }
      }

      // Map keys to staff objects where possible
      const staffKeys = Object.keys(stats).filter(k => k !== 'unassigned');
      const staffDocs = await Staff.find({ $or: [ { _id: { $in: staffKeys.filter(k => /^[0-9a-fA-F]{24}$/.test(k)).map(k=>k) } }, { staffId: { $in: staffKeys.filter(k => !/^[0-9a-fA-F]{24}$/.test(k)) } } ] }).lean();
      const staffMap = {};
      for (const s of staffDocs) staffMap[(s._id||s.staffId).toString()] = s;

      const out = Object.values(stats).map(s => {
        const doc = staffMap[s.staffIdentifier];
        const name = doc ? (doc.name || doc.staffId) : s.staffName;
        const avgTime = s.tasksCompleted > 0 ? Math.round(s.totalTime / s.tasksCompleted) : 0;
        return { staffId: (doc&&doc.staffId) || s.staffIdentifier, staffName: name, tasksCompleted: s.tasksCompleted, averageTimePerTask: avgTime };
      });

      res.json({ success: true, reports: out });
    } else {
      res.status(403).json({ error: 'Access denied' });
    }
  } catch (error) {
    console.error('Staff performance report error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate staff performance report' });
  }
});

// Reports: orders endpoint expected by admin UI
app.get('/api/reports/orders', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'sub-admin' || req.user.role === 'admin') {
      const { fromDate, toDate } = req.query;
      const match = {};
      if (req.user.role === 'sub-admin') match.branch = req.user.branch;
      if (fromDate || toDate) match.createdAt = {};
      if (fromDate) match.createdAt.$gte = new Date(fromDate);
      if (toDate) match.createdAt.$lte = new Date(toDate);

      const orders = await Order.find(match).sort({ createdAt: -1 }).limit(500).lean();
      const formatted = orders.map(o => ({ orderId: o.orderId, createdAt: o.createdAt, customerName: o.customerName, customerPhone: o.customerPhone, totalAmount: o.totalAmount || 0, status: o.status, branch: o.branch }));
      res.json({ success: true, orders: formatted });
    } else {
      res.status(403).json({ error: 'Access denied' });
    }
  } catch (error) {
    console.error('Reports orders error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch orders report' });
  }
});


// ==================== ENHANCED REPORTS ROUTES ====================

// Get Last 10 Orders Report with Amount Summary
app.get('/api/reports/last-orders', authenticateToken, async (req, res) => {
  try {
    const { limit = 10, branch } = req.query;
    
    let matchQuery = {};
    
    // Branch filtering for sub-admins
    if (req.user.role === 'sub-admin') {
      matchQuery.branch = req.user.branch;
    } else if (branch) {
      matchQuery.branch = branch;
    }
    
    console.log(`📊 Generating last orders report (limit: ${limit})`);
    
    const orders = await Order.find(matchQuery)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('orderId customerName customerPhone garmentType totalAmount advanceAmount createdAt deliveryDate branch status workflowTasks');
    
    console.log(`   Found ${orders.length} orders`);
    
    const totalAmount = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const totalAdvance = orders.reduce((sum, order) => sum + (order.advanceAmount || 0), 0);
    const totalBalance = totalAmount - totalAdvance;
    
    const formattedOrders = orders.map(order => {
      const completedTasks = order.workflowTasks.filter(t => t.status === 'completed').length;
      const totalTasks = order.workflowTasks.length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      return {
        orderId: order.orderId,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        garmentType: order.garmentType,
        totalAmount: order.totalAmount || 0,
        advanceAmount: order.advanceAmount || 0,
        balanceAmount: (order.totalAmount || 0) - (order.advanceAmount || 0),
        status: order.status,
        progress: `${progress}%`,
        createdAt: order.createdAt,
        deliveryDate: order.deliveryDate,
        branch: order.branch
      };
    });
    
    res.json({
      success: true,
      orders: formattedOrders,
      summary: {
        totalOrders: orders.length,
        totalAmount,
        totalAdvance,
        totalBalance,
        averageOrderValue: orders.length > 0 ? Math.round(totalAmount / orders.length) : 0
      }
    });
  } catch (error) {
    console.error('Last orders report error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate last orders report' });
  }
});

// Get Branch-wise Reports
app.get('/api/reports/branch-wise', authenticateToken, async (req, res) => {
  try {
    // Only main admin can see all branches
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { startDate, endDate } = req.query;
    
    let matchQuery = {};
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }
    
    const branchReports = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$branch',
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          totalAdvance: { $sum: '$advanceAmount' },
          avgOrderValue: { $avg: '$totalAmount' },
          orders: { $push: {
            orderId: '$orderId',
            customerName: '$customerName',
            garmentType: '$garmentType',
            totalAmount: '$totalAmount',
            status: '$status',
            createdAt: '$createdAt'
          }}
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);
    
    res.json(branchReports);
  } catch (error) {
    console.error('Branch-wise report error:', error);
    res.status(500).json({ error: 'Failed to generate branch-wise report' });
  }
});

// ==================== ADMIN ORDERS ENDPOINTS (ENHANCED) ====================

// Get all orders (admin view with timeline data) - Firebase-first approach
app.get('/api/admin/orders', authenticateToken, async (req, res) => {
  try {
    const branch = req.query.branch || (req.user.role === 'sub-admin' ? req.user.branch : null);
    
    // Try Firebase first if initialized
    let orders = [];
    let source = 'unknown';
    
    try {
      const filters = {};
      if (branch) {
        filters.where = [['branch', '==', branch]];
      }
      filters.orderBy = { field: 'createdAt', direction: 'desc' };
      
      const result = await firebaseIntegrationService.getCollection('orders', filters);
      if (result.success && result.data) {
        orders = result.data;
        source = 'firebase';
        console.log(`✅ Fetched ${orders.length} orders from Firebase`);
      }
    } catch (firebaseError) {
      console.warn('⚠️ Firebase fetch attempt failed, using MongoDB:', firebaseError.message);
      source = 'mongodb';
    }
    
    // If Firebase fetch failed or no orders, use MongoDB as fallback
    if (orders.length === 0 || source === 'mongodb') {
      let matchQuery = {};
      if (branch) {
        matchQuery.branch = branch;
      }
      
      if (req.query.customer) {
        const customer = await Customer.findById(req.query.customer).catch(() => null);
        if (customer) {
          matchQuery.customerPhone = customer.phone;
        } else {
          matchQuery.customerPhone = req.query.customer;
        }
      }
      
      const mongoOrders = await Order.find(matchQuery)
        .sort({ createdAt: -1 })
        .select('orderId customerName customerPhone customerAddress garmentType totalAmount advanceAmount status createdAt deliveryDate workflowTasks branch');
      
      orders = mongoOrders.map(order => ({
        _id: order._id,
        orderId: order.orderId,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerAddress: order.customerAddress,
        garmentType: order.garmentType,
        totalAmount: order.totalAmount,
        advanceAmount: order.advanceAmount,
        status: order.status,
        createdAt: order.createdAt,
        deliveryDate: order.deliveryDate,
        branch: order.branch,
        workflowTasks: order.workflowTasks || []
      }));
      
      source = 'mongodb';
    }

    res.json(orders);
  } catch (error) {
    console.error('Get admin orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get single order with full timeline
app.get('/api/admin/orders/:orderId', authenticateToken, async (req, res) => {
  try {
    const param = req.params.orderId;
    let order = null;

    // Try to resolve by Mongo _id first
    if (param && /^[0-9a-fA-F]{24}$/.test(param)) {
      order = await Order.findById(param);
    }

    // If not found by _id, try lookup by orderId (e.g., ORD-123...)
    if (!order) {
      order = await Order.findOne({ orderId: param });
    }

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Return full order details with timeline
    res.json({
      _id: order._id,
      orderId: order.orderId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      garmentType: order.garmentType,
      totalAmount: order.totalAmount,
      advanceAmount: order.advanceAmount,
      balanceAmount: (order.totalAmount || 0) - (order.advanceAmount || 0),
      status: order.status,
      createdAt: order.createdAt,
      deliveryDate: order.deliveryDate,
      measurements: order.measurements || {},
      designNotes: order.designNotes || '',
      designImages: order.designImages || [],
      workflowTasks: order.workflowTasks || []
    });
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

// Update order with RBAC checks
app.put('/api/admin/orders/:id', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const updateData = req.body;
    
    // Find the order first
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // RBAC: Check if user can edit this order
    if (req.user.role === 'sub-admin') {
      // Sub-admins can only edit orders from their branch
      if (order.branch !== req.user.branch) {
        return res.status(403).json({ error: 'Access denied. You can only edit orders from your branch.' });
      }
      
      // Sub-admins cannot edit assigned orders (orders with active workflow tasks)
      const hasActiveTask = order.workflowTasks && order.workflowTasks.some(task => 
        task.status === 'assigned' || task.status === 'in_progress'
      );
      
      if (hasActiveTask) {
        return res.status(403).json({ error: 'Cannot edit assigned orders. Only main admin can modify orders with active tasks.' });
      }
    }
    
    // Main admin can edit any order
    if (req.user.role !== 'admin' && req.user.role !== 'sub-admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Update the order
    const updatedOrder = await Order.findByIdAndUpdate(orderId, updateData, { new: true });
    
    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Update customer with RBAC checks
app.put('/api/admin/customers/:id', authenticateToken, async (req, res) => {
  try {
    const customerId = req.params.id;
    const updateData = req.body;
    
    // Find the customer first
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // RBAC: Check if user can edit this customer
    if (req.user.role === 'sub-admin') {
      // Sub-admins cannot edit customers with active orders
      const activeOrders = await Order.find({ 
        customerPhone: customer.phone,
        status: { $in: ['pending', 'in_progress', 'assigned'] }
      });
      
      if (activeOrders.length > 0) {
        return res.status(403).json({ error: 'Cannot edit customers with active orders. Only main admin can modify such customers.' });
      }
    }
    
    // Main admin can edit any customer
    if (req.user.role !== 'admin' && req.user.role !== 'sub-admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Update the customer
    const updatedCustomer = await Customer.findByIdAndUpdate(customerId, updateData, { new: true });
    
    res.json({ success: true, customer: updatedCustomer });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Enhanced Order Creation with Data Flow Service
let orderCreationInProgress = false;

app.post('/api/orders', async (req, res) => {
  try {
    if (orderCreationInProgress) {
      console.log('⚠️ Order creation already in progress, rejecting duplicate request');
      return res.status(429).json({ error: 'Order creation in progress, please wait' });
    }
    
    orderCreationInProgress = true;
    
    console.log('📥 Received order request');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // Validate required fields
    if (!req.body.customer?.name || !req.body.customer?.phone || !req.body.garmentType) {
      orderCreationInProgress = false;
      console.error('❌ Validation failed: Missing required fields');
      return res.status(400).json({ success: false, error: 'Customer name, phone, and garment type are required' });
    }
    
    const orderData = {
      orderId: `ORD-${Date.now()}`,
      customerName: req.body.customer.name,
      customerPhone: req.body.customer.phone,
      customerAddress: req.body.customer?.address || '',
      garmentType: req.body.garmentType,
      measurements: req.body.measurements || {},
      totalAmount: Number(req.body.pricing?.total || 0),
      advanceAmount: Number(req.body.pricing?.advance || 0),
      balanceAmount: Number(req.body.pricing?.balance || 0),
      deliveryDate: req.body.deliveryDate ? new Date(req.body.deliveryDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      branch: req.body.branch || 'SAPTHALA.MAIN',
      status: 'pending',
      currentStage: 'dyeing',
      workflowTasks: [],
      designNotes: req.body.designNotes || '',
      designImages: Array.isArray(req.body.designImages) ? req.body.designImages.map(img => {
        if (typeof img === 'string') return img;
        if (img && img.name) return img.name;
        return '';
      }).filter(Boolean) : []
    };

    console.log('💾 Creating order:', orderData.orderId);
    console.log('Order data:', JSON.stringify(orderData, null, 2));

    const settings = await Settings.findOne();
    if (!settings || !settings.workflowStages || settings.workflowStages.length === 0) {
      console.error('❌ No workflow stages found in settings');
      orderCreationInProgress = false;
      return res.status(500).json({ error: 'Workflow not configured. Please contact administrator.' });
    }

    console.log(`✅ Found ${settings.workflowStages.length} workflow stages`);
    
    // Use requested stages or default workflow (excluding measurements-design)
    let requestedStages = req.body.workflow;
    if (!requestedStages || requestedStages.length === 0) {
      // Default workflow: dyeing → finishing → quality-check → ready-to-deliver
      requestedStages = ['dyeing', 'finishing', 'quality-check', 'ready-to-deliver'];
      console.log('No workflow specified, using default workflow: dyeing → finishing → quality-check → ready-to-deliver');
    }
    console.log('Creating tasks for stages:', requestedStages);
    
    // Create workflow tasks
    requestedStages.forEach((stageId, index) => {
      const stageConfig = settings.workflowStages.find(s => s.id === stageId);
      if (stageConfig) {
        const task = {
          stageId: stageConfig.id,
          stageName: stageConfig.name,
          stageIcon: stageConfig.icon,
          status: index === 0 ? 'pending' : 'waiting',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        if (stageId === 'measurements-design') {
          task.designNotes = req.body.designNotes || 'Pending measurements and design finalization';
          task.measurementsData = req.body.measurements || {};
          task.designImages = orderData.designImages || [];
        }
        
        orderData.workflowTasks.push(task);
        console.log(`   ✅ Created task: ${stageConfig.name} (${index === 0 ? 'pending' : 'waiting'})`);
      } else {
        console.warn(`   ⚠️ Stage not found: ${stageId}`);
      }
    });

    // Ensure at least one task was created
    if (orderData.workflowTasks.length === 0) {
      console.error('❌ No workflow tasks created!');
      orderCreationInProgress = false;
      return res.status(500).json({ success: false, error: 'Failed to create workflow tasks. Please contact administrator.' });
    }
    
    console.log(`✅ Created ${orderData.workflowTasks.length} workflow tasks`);
    
    const order = new Order(orderData);
    
    // Auto-assign first task to available staff - set as PENDING not ASSIGNED
    if (order.workflowTasks.length > 0) {
      const firstTask = order.workflowTasks[0];
      console.log(`🔍 First task: ${firstTask.stageId} - ${firstTask.stageName}`);
      console.log(`   Status will be: pending (staff must accept)`);
      
      // Task is already pending, no auto-assignment
      // Staff will see it in Available Tasks and must accept it
    }
    
    await order.save();
    console.log('✅ Order saved to MongoDB:', order.orderId);
    console.log(`   Order ID: ${order._id}`);
    console.log(`   Workflow tasks: ${order.workflowTasks.length}`);
    console.log(`   First task status: pending (staff must accept)`);
    
    // Sync to Firebase
    try {
      await firebaseIntegrationService.syncOrder(order.toObject());
      console.log('🔥 Order synced to Firebase');
    } catch (firebaseError) {
      console.warn('⚠️ Firebase sync failed (order still saved to MongoDB):', firebaseError.message);
    }
    
    const customer = await Customer.findOneAndUpdate(
      { phone: orderData.customerPhone },
      { 
        $set: { 
          name: orderData.customerName, 
          phone: orderData.customerPhone,
          address: orderData.customerAddress 
        },
        $push: { orders: order._id },
        $inc: { totalOrders: 1, totalSpent: orderData.totalAmount }
      },
      { upsert: true, new: true }
    );
    console.log(`✅ Customer record updated: ${customer.name}`);
    
    // Sync customer to Firebase
    try {
      await firebaseIntegrationService.syncCustomer(customer.toObject());
      console.log('🔥 Customer synced to Firebase');
    } catch (firebaseError) {
      console.warn('⚠️ Firebase customer sync failed:', firebaseError.message);
    }

    console.log('🎉 Order creation completed successfully!');
    
    // Process with Data Flow Service for staff synchronization
    try {
      const dataFlowResult = await DataFlowService.processOrderCreation({
        ...orderData,
        _id: order._id
      }, req.user || { id: 'admin' });
      
      console.log('✅ Data flow processing completed:', dataFlowResult.message);
    } catch (dataFlowError) {
      console.warn('⚠️ Data flow processing failed (order still created):', dataFlowError.message);
    }
    
    res.json({ 
      success: true, 
      order: {
        _id: order._id,
        orderId: order.orderId,
        customerName: order.customerName,
        status: order.status,
        workflowTasks: order.workflowTasks.map(t => ({
          stageId: t.stageId,
          stageName: t.stageName,
          status: t.status,
          assignedToName: t.assignedToName
        }))
      },
      message: 'Order created and synced to staff application'
    });

    // Fire-and-forget: generate themed PDF and send WhatsApp notification to customer
    (async () => {
      try {
        const settings = await Settings.findOne() || { companyName: 'SAPTHALA', phone: '7794021608', email: 'hello@sapthala.com', address: '', defaultTheme: 'default' };
        // Attach theme if provided in request
        const theme = req.body.theme || settings.defaultTheme || 'default';
        const pdfOrder = Object.assign({}, orderData, { theme });

        const result = await EnhancedPDFService.generateAndSavePDFFiles(pdfOrder, settings);
        if (result && result.success) {
          console.log('✅ Themed PDF created for order', order.orderId);
          // Update order with pdf path
          try {
            await Order.findByIdAndUpdate(order._id, { $set: { pdfPath: result.pdfPath || result.htmlPath } });
          } catch (e) { console.warn('Could not update order pdfPath:', e.message); }
        } else {
          console.warn('PDF generation returned error:', result && result.error);
        }

        // Send WhatsApp message (will return wa.me link if Twilio not configured)
        try {
          const message = NotificationService.generateCustomerMessage(orderData, theme);
          const notifyResult = await NotificationService.sendWhatsAppToCustomer(orderData.customerPhone || orderData.customer?.phone, message, result && (result.pdfPath || result.htmlPath));
          console.log('📨 WhatsApp notification result:', notifyResult);
        } catch (e) {
          console.error('❌ Failed to send WhatsApp notification:', e.message);
        }
      } catch (e) {
        console.error('Background PDF/WhatsApp task failed:', e);
      }
    })();
  } catch (error) {
    console.error('❌ Order creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    setTimeout(() => {
      orderCreationInProgress = false;
    }, 2000);
  }
});

// Share an order PDF and optionally send WhatsApp message
app.post('/api/share-order-pdf', async (req, res) => {
  try {
    const { orderData, sendNow = true } = req.body;
    if (!orderData) return res.status(400).json({ success: false, error: 'orderData is required' });

    if (!orderData.orderId) orderData.orderId = `ORD-${Date.now()}`;

    const settings = await Settings.findOne() || { companyName: 'SAPTHALA', phone: '7794021608', email: 'hello@sapthala.com', address: '' };

    // Use enhanced PDF service with theme support
    const result = await EnhancedPDFService.generateAndSavePDFFiles(orderData, settings);
    if (!result.success) return res.status(500).json({ success: false, error: result.error });

    // Upsert order record to set pdfPath
    try {
      const pdfRelative = result.pdfPath || result.htmlPath;
      const update = { $set: { pdfPath: pdfRelative } };
      const order = await Order.findOneAndUpdate({ orderId: orderData.orderId }, update, { upsert: true, new: true, setDefaultsOnInsert: true });
      if (order && (!order.customerPhone || !order.customerName)) {
        order.customerPhone = orderData.customerPhone || order.customer?.phone || order.customerPhone;
        order.customerName = orderData.customerName || order.customer?.name || order.customerName;
        order.garmentType = orderData.garmentType || order.garmentType;
        await order.save();
      }
    } catch (err) {
      console.warn('Failed to update Order with pdfPath:', err.message);
    }

    const message = NotificationService.generateCustomerMessage(orderData);
    let notifyResult = { sent: false, provider: 'wa.me', whatsappUrl: null };
    if (sendNow) {
      notifyResult = await NotificationService.sendWhatsAppToCustomer(orderData.customerPhone || orderData.customer?.phone, message, result.pdfPath || result.htmlPath);
    }

    res.json({ success: true, pdf: result, notify: notifyResult });
  } catch (error) {
    console.error('Share order pdf error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Orders
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ==================== STAFF ROUTES ====================

// Get all staff (with optional branch filter)
app.get('/api/staff', async (req, res) => {
  try {
    const { branch } = req.query;
    const query = branch ? { branch } : {};
    const staff = await Staff.find(query).sort({ createdAt: -1 });
    res.json(staff);
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

// Get single staff
app.get('/api/staff/:id', async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }
    res.json(staff);
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

// Create staff
app.post('/api/staff', async (req, res) => {
  try {
    const { staffId, name, phone, email, role, pin, branch, workflowStages } = req.body;
    
    // Check if staffId already exists
    const existing = await Staff.findOne({ staffId });
    if (existing) {
      return res.status(400).json({ error: 'Staff ID already exists' });
    }
    
    const staff = new Staff({
      staffId,
      name,
      phone,
      email,
      role,
      pin,
      branch: branch || 'SAPTHALA.MAIN',
      workflowStages,
      isAvailable: true,
      currentTaskCount: 0
    });
    
    await staff.save();
    console.log(`✅ Staff created: ${name} (${staffId}) - Branch: ${staff.branch}`);
    
    // Sync to Firebase
    try {
      await firebaseIntegrationService.syncStaff(staff.toObject());
      console.log('🔥 Staff synced to Firebase');
    } catch (firebaseError) {
      console.warn('⚠️ Firebase staff sync failed:', firebaseError.message);
    }
    
    res.json({ success: true, staff });
  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({ error: 'Failed to create staff' });
  }
});

// Update staff
app.put('/api/staff/:id', async (req, res) => {
  try {
    const { staffId, name, phone, email, role, pin, branch, workflowStages } = req.body;
    
    // Check if new staffId conflicts with another staff
    const existing = await Staff.findOne({ staffId, _id: { $ne: req.params.id } });
    if (existing) {
      return res.status(400).json({ error: 'Staff ID already exists' });
    }
    
    const staff = await Staff.findByIdAndUpdate(
      req.params.id,
      { staffId, name, phone, email, role, pin, branch: branch || 'SAPTHALA.MAIN', workflowStages, updatedAt: new Date() },
      { new: true }
    );
    
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }
    
    console.log(`✅ Staff updated: ${name} (${staffId}) - Branch: ${staff.branch}`);
    res.json({ success: true, staff });
  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({ error: 'Failed to update staff' });
  }
});

// Toggle staff availability
app.put('/api/staff/:id/availability', async (req, res) => {
  try {
    const { isAvailable } = req.body;
    
    const staff = await Staff.findByIdAndUpdate(
      req.params.id,
      { isAvailable, updatedAt: new Date() },
      { new: true }
    );
    
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }
    
    console.log(`✅ Staff availability updated: ${staff.name} - ${isAvailable ? 'Available' : 'Busy'}`);
    res.json({ success: true, staff });
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

// Delete staff
app.delete('/api/staff/:id', async (req, res) => {
  try {
    const staff = await Staff.findByIdAndDelete(req.params.id);
    
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }
    
    console.log(`✅ Staff deleted: ${staff.name} (${staff.staffId})`);
    res.json({ success: true, message: 'Staff deleted successfully' });
  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({ error: 'Failed to delete staff' });
  }
});

// Staff Login
app.post('/api/staff/login', async (req, res) => {
  try {
    const { staffId, pin } = req.body;
    
    // Validate input
    if (!staffId || !pin) {
      console.log(`❌ Missing credentials: staffId=${!!staffId}, pin=${!!pin}`);
      return res.status(400).json({ error: 'Staff ID and PIN are required' });
    }

    console.log(`📱 Staff login attempt: ${staffId} with PIN: ${pin}`);
    
    const staff = await Staff.findOne({ staffId });
    
    if (!staff) {
      console.log(`❌ Staff not found: ${staffId}`);
      return res.status(401).json({ error: 'Invalid staff ID or PIN' });
    }

    console.log(`   Staff DB Record: ID=${staff._id}, Name=${staff.name}, PIN=${staff.pin}, Stages=${JSON.stringify(staff.workflowStages)}`);

    // Compare PIN (convert both to string for comparison)
    const staffPin = String(staff.pin).trim();
    const inputPin = String(pin).trim();
    
    if (staffPin !== inputPin) {
      console.log(`❌ Invalid PIN for staff: ${staffId} - Expected: '${staffPin}', Got: '${inputPin}'`);
      return res.status(401).json({ error: 'Invalid staff ID or PIN' });
    }

    // Update last login
    staff.lastLogin = new Date();
    await staff.save();

    const token = jwt.sign(
      { id: staff._id, staffId: staff.staffId, role: 'staff' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const staffResponse = {
      id: staff._id,
      staffId: staff.staffId,
      name: staff.name,
      role: staff.role,
      workflowStages: staff.workflowStages,
      phone: staff.phone || '',
      avatarUrl: staff.avatarUrl || ''
    };

    console.log(`✅ Staff login successful: ${staff.name}`);
    console.log(`   Returning staff data:`, JSON.stringify(staffResponse));

    res.json({
      success: true,
      token,
      staff: staffResponse
    });
  } catch (error) {
    console.error('❌ Staff login error:', error);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// Get Staff Tasks with Enhanced Data Flow
app.get('/api/staff/:staffId/tasks', async (req, res) => {
  try {
    const { staffId } = req.params;
    console.log(`🔍 Getting enhanced tasks for staff: ${staffId}`);
    
    const result = await DataFlowService.getStaffTasks(staffId, true);
    
    console.log(`✅ Returning ${result.myTasks.length} assigned tasks and ${result.availableTasks.length} available tasks`);
    
    // Return in the format expected by the Flutter app and staff portal
    res.json(result.myTasks || []);
  } catch (error) {
    console.error('❌ Get staff tasks error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tasks', myTasks: [], availableTasks: [] });
  }
});

// Get Available Tasks with Enhanced Data Flow
app.get('/api/staff/:staffId/available-tasks', async (req, res) => {
  try {
    const { staffId } = req.params;
    console.log(`🔍 Finding enhanced available tasks for staff: ${staffId}`);
    
    const result = await DataFlowService.getStaffTasks(staffId, true);
    
    console.log(`✅ Returning ${result.availableTasks.length} available tasks for ${result.staff.name}`);
    res.json(result.availableTasks || []);
  } catch (error) {
    console.error('❌ Get available tasks error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch available tasks', availableTasks: [] });
  }
});

// Accept Task with Enhanced Data Flow
app.post('/api/staff/:staffId/accept-task', async (req, res) => {
  try {
    const { staffId } = req.params;
    const { orderId, stageId } = req.body;
    
    console.log(`✅ Processing task acceptance: ${staffId} -> ${orderId} -> ${stageId}`);
    
    const result = await DataFlowService.acceptTask(staffId, orderId, stageId);
    res.json(result);
  } catch (error) {
    console.error('Accept task error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update Task Status with Enhanced Data Flow
app.post('/api/staff/:staffId/update-task', async (req, res) => {
  try {
    const { staffId } = req.params;
    const { orderId, stageId, status, notes, qualityRating } = req.body;
    
    console.log(`🔄 Processing task update: ${staffId} -> ${orderId} -> ${stageId} -> ${status}`);
    
    const updateData = { status, notes, qualityRating };
    const result = await DataFlowService.processStaffTaskUpdate(staffId, orderId, stageId, updateData);
    
    res.json(result);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to progress to next stage
async function progressToNextStage(order, completedStageId) {
  try {
    const settings = await Settings.findOne();
    if (!settings || !settings.workflowStages) return;

    const currentStage = settings.workflowStages.find(s => s.id === completedStageId);
    if (!currentStage) return;

    const nextStage = settings.workflowStages.find(s => s.order === currentStage.order + 1);
    
    if (!nextStage) {
      // All stages completed
      order.status = 'completed';
      order.currentStage = 'completed';
      await order.save();
      console.log(`🎉 Order ${order.orderId} completed all stages!`);
      return;
    }

    // Activate next stage
    const nextTaskIndex = order.workflowTasks.findIndex(t => t.stageId === nextStage.id);
    if (nextTaskIndex !== -1) {
      order.workflowTasks[nextTaskIndex].status = 'pending';
      order.workflowTasks[nextTaskIndex].updatedAt = new Date();
      order.currentStage = nextStage.id;
      await order.save();

      // Auto-assign next task
      const nextStageStaff = await Staff.findOne({
        workflowStages: nextStage.id,
        isAvailable: true
      }).sort({ currentTaskCount: 1 });

      if (nextStageStaff) {
        order.workflowTasks[nextTaskIndex].status = 'assigned';
        order.workflowTasks[nextTaskIndex].assignedTo = nextStageStaff._id;
        order.workflowTasks[nextTaskIndex].assignedToName = nextStageStaff.name;
        order.workflowTasks[nextTaskIndex].updatedAt = new Date();

        nextStageStaff.currentTaskCount += 1;
        await nextStageStaff.save();
        await order.save();

        // Create notification
        await Notification.create({
          type: 'task_assigned',
          title: `New ${nextStage.name} Task`,
          message: `Order #${order.orderId} for ${order.customerName} has been assigned to you.`,
          recipientId: nextStageStaff._id,
          orderId: order.orderId
        });

        console.log(`🔄 Next stage assigned: ${nextStageStaff.name} got ${nextStage.name} for order ${order.orderId}`);
      }
    }
  } catch (error) {
    console.error('Progress to next stage error:', error);
  }
}

// Get Staff Notifications
app.get('/api/staff/:staffId/notifications', async (req, res) => {
  try {
    const { staffId } = req.params;
    const staff = await Staff.findOne({ staffId });
    
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    const notifications = await Notification.find({ 
      recipientId: staff._id 
    }).sort({ sentAt: -1 }).limit(10);

    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark Notification as Read
app.post('/api/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndUpdate(id, {
      isRead: true,
      readAt: new Date()
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// ==================== REPORTS ROUTES ====================

// Get Staff Performance Report
app.get('/api/reports/staff-performance', async (req, res) => {
  try {
    const { staffId, startDate, endDate, branch, staff } = req.query;
    
    console.log(`📊 Generating staff performance report`);
    
    let matchQuery = {};
    if (branch) matchQuery.branch = branch;
    if (staffId || staff) {
      const staffDoc = await Staff.findOne({ $or: [{ staffId: staffId || staff }, { name: { $regex: new RegExp(staff || staffId, 'i') } }] });
      if (staffDoc) matchQuery['workflowTasks.assignedTo'] = staffDoc._id;
    }
    
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }
    
    const orders = await Order.find(matchQuery);
    console.log(`   Found ${orders.length} orders`);
    
    const staffReports = {};
    
    orders.forEach(order => {
      order.workflowTasks.forEach(task => {
        if (task.assignedToName && task.status === 'completed') {
          if (!staffReports[task.assignedToName]) {
            staffReports[task.assignedToName] = {
              staffName: task.assignedToName,
              tasksCompleted: 0,
              totalTimeSpent: 0,
              averageTimePerTask: 0,
              tasksByStage: {},
              qualityRatings: [],
              orders: []
            };
          }
          
          const report = staffReports[task.assignedToName];
          report.tasksCompleted++;
          report.totalTimeSpent += task.timeSpent || 0;
          
          if (!report.tasksByStage[task.stageName]) {
            report.tasksByStage[task.stageName] = { count: 0, totalTime: 0 };
          }
          report.tasksByStage[task.stageName].count++;
          report.tasksByStage[task.stageName].totalTime += task.timeSpent || 0;
          
          if (task.qualityRating) {
            report.qualityRatings.push(task.qualityRating);
          }
          
          report.orders.push({
            orderId: order.orderId,
            customerName: order.customerName,
            stageName: task.stageName,
            timeSpent: task.timeSpent || 0,
            completedAt: task.completedAt,
            qualityRating: task.qualityRating
          });
        }
      });
    });
    
    Object.values(staffReports).forEach(report => {
      report.averageTimePerTask = report.tasksCompleted > 0 ? 
        Math.round(report.totalTimeSpent / report.tasksCompleted) : 0;
      report.averageQuality = report.qualityRatings.length > 0 ? 
        (report.qualityRatings.reduce((a, b) => a + b, 0) / report.qualityRatings.length).toFixed(1) : 0;
    });
    
    console.log(`   Generated reports for ${Object.keys(staffReports).length} staff members`);
    
    res.json({
      success: true,
      reports: Object.values(staffReports)
    });
  } catch (error) {
    console.error('Staff performance report error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate staff performance report' });
  }
});

// Get Order Reports with enhanced filtering and sorting
app.get('/api/reports/orders', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, status, branch, orderId, customer, phone, filterBy, q, sortBy = 'createdAt_desc' } = req.query;
    
    let matchQuery = {};
    
    // Branch filtering for sub-admins
    if (req.user.role === 'sub-admin') {
      matchQuery.branch = req.user.branch;
    } else if (branch && branch !== 'all') {
      matchQuery.branch = branch;
    }
    
    // Date filtering
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }
    
    // Dynamic filtering based on filterBy parameter
    if (filterBy && q) {
      const searchRegex = new RegExp(q, 'i');
      switch (filterBy) {
        case 'orderId':
          matchQuery.orderId = searchRegex;
          break;
        case 'customer':
          matchQuery.customerName = searchRegex;
          break;
        case 'phone':
          matchQuery.customerPhone = searchRegex;
          break;
      }
    }
    
    // Legacy filters for backward compatibility
    if (status) matchQuery.status = status;
    if (orderId) matchQuery.orderId = { $regex: new RegExp(orderId, 'i') };
    if (customer) matchQuery.customerName = { $regex: new RegExp(customer, 'i') };
    if (phone) matchQuery.customerPhone = { $regex: new RegExp(phone, 'i') };
    
    // Parse sorting
    const [sortField, sortDirection] = sortBy.split('_');
    const sortOrder = sortDirection === 'desc' ? -1 : 1;
    const sortObj = { [sortField]: sortOrder };
    
    let orders = await Order.find(matchQuery)
      .sort(sortObj)
      .select('orderId customerName customerPhone garmentType totalAmount advanceAmount balanceAmount status createdAt deliveryDate branch workflowTasks');
    
    const orderReports = orders.map(order => {
      const totalTasks = (order.workflowTasks || []).length;
      const completedTasks = (order.workflowTasks || []).filter(t => t.status === 'completed').length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      return {
        orderId: order.orderId || '',
        customerName: order.customerName || '',
        customerPhone: order.customerPhone || '',
        garmentType: order.garmentType || '',
        totalAmount: order.totalAmount || 0,
        status: order.status || 'pending',
        createdAt: order.createdAt,
        deliveryDate: order.deliveryDate,
        progressPercentage: progress,
        completedTasks: completedTasks,
        totalTasks: totalTasks,
        workflowTasks: order.workflowTasks,
        branch: order.branch
      };
    });
    
    res.json({ success: true, orders: orderReports });
  } catch (error) {
    console.error('Order reports error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate order reports' });
  }
});

// Get Individual Staff Report
app.get('/api/reports/staff/:staffId', async (req, res) => {
  try {
    const { staffId } = req.params;
    const { startDate, endDate } = req.query;
    
    const staff = await Staff.findOne({ staffId });
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }
    
    let matchQuery = { 'workflowTasks.assignedTo': staff._id };
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }
    
    const orders = await Order.find(matchQuery);
    
    const staffTasks = [];
    let totalTimeSpent = 0;
    let completedTasks = 0;
    const qualityRatings = [];
    const stageStats = {};
    
    orders.forEach(order => {
      order.workflowTasks.forEach(task => {
        if (task.assignedTo && task.assignedTo.toString() === staff._id.toString()) {
          staffTasks.push({
            orderId: order.orderId,
            customerName: order.customerName,
            stageName: task.stageName,
            status: task.status,
            timeSpent: task.timeSpent || 0,
            startedAt: task.startedAt,
            completedAt: task.completedAt,
            qualityRating: task.qualityRating,
            notes: task.notes
          });
          
          if (task.status === 'completed') {
            completedTasks++;
            totalTimeSpent += task.timeSpent || 0;
            
            if (task.qualityRating) {
              qualityRatings.push(task.qualityRating);
            }
            
            if (!stageStats[task.stageName]) {
              stageStats[task.stageName] = { count: 0, totalTime: 0 };
            }
            stageStats[task.stageName].count++;
            stageStats[task.stageName].totalTime += task.timeSpent || 0;
          }
        }
      });
    });
    
    const averageTimePerTask = completedTasks > 0 ? Math.round(totalTimeSpent / completedTasks) : 0;
    const averageQuality = qualityRatings.length > 0 ? 
      (qualityRatings.reduce((a, b) => a + b, 0) / qualityRatings.length).toFixed(1) : 0;
    
    res.json({
      staff: {
        staffId: staff.staffId,
        name: staff.name,
        role: staff.role,
        workflowStages: staff.workflowStages
      },
      summary: {
        totalTasks: staffTasks.length,
        completedTasks,
        totalTimeSpent,
        averageTimePerTask,
        averageQuality
      },
      stageStats,
      tasks: staffTasks.sort((a, b) => new Date(b.completedAt || b.startedAt || 0) - new Date(a.completedAt || a.startedAt || 0))
    });
  } catch (error) {
    console.error('Individual staff report error:', error);
    res.status(500).json({ error: 'Failed to generate staff report' });
  }
});

// ==================== COMMON ROUTES ====================

// Complete Design Phase (Measurements & Design stage)
app.post('/api/staff/:staffId/complete-design', async (req, res) => {
  try {
    const { staffId } = req.params;
    const { orderId, designNotes, designImages } = req.body;
    
    console.log(`📐 Completing design phase for order: ${orderId}`);
    
    const staff = await Staff.findOne({ staffId });
    const order = await Order.findOne({ orderId });
    
    if (!staff || !order) {
      return res.status(404).json({ error: 'Staff or order not found' });
    }

    // Find design task
    const designTaskIndex = order.workflowTasks.findIndex(t => t.stageId === 'measurements-design');
    if (designTaskIndex === -1) {
      return res.status(404).json({ error: 'Design task not found' });
    }

    const designTask = order.workflowTasks[designTaskIndex];
    
    // Update design task
    designTask.status = 'completed';
    designTask.completedAt = new Date();
    designTask.designNotes = designNotes || designTask.designNotes;
    designTask.designImages = designImages || designTask.designImages || [];
    designTask.updatedAt = new Date();
    
    console.log(`✅ Design finalized for ${order.customerName}: ${designNotes}`);
    console.log(`📸 Design images: ${designImages?.length || 0}`);
    
    // Update staff task count
    staff.currentTaskCount = Math.max(0, staff.currentTaskCount - 1);
    
    // Progress to next stage (Dyeing)
    await progressToNextStage(order, 'measurements-design');
    
    await staff.save();
    
    res.json({ 
      success: true, 
      message: 'Design approved and order moved to next stage',
      nextStage: 'Dyeing'
    });
  } catch (error) {
    console.error('Complete design error:', error);
    res.status(500).json({ error: 'Failed to complete design phase' });
  }
});

// Get Settings (includes logo path)
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await Settings.findOne();
    res.json(settings || {
      companyName: 'SAPTHALA Designer Workshop',
      logoPath: '/img/sapthala logo.png'
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});


app.get('/', (req, res) => {
  const filePath = path.join(__dirname, 'sapthala-admin-clean.html');
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Admin panel not found - ensure sapthala-admin-clean.html exists');
  }
});

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Serve favicon
app.get('/favicon.ico', (req, res) => {
  // Return empty response with proper cache headers
  res.set({
    'Content-Type': 'image/x-icon',
    'Cache-Control': 'public, max-age=31536000'
  });
  res.status(204).end();
});

// Serve test page
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-page.html'));
});

// Serve super-admin panel
app.get('/super-admin', (req, res) => {
  // First try to serve from built React app (Boutique-app/super-admin-panel/dist)
  const reactDistPath = path.join(__dirname, 'Boutique-app', 'super-admin-panel', 'dist', 'index.html');
  if (fs.existsSync(reactDistPath)) {
    return res.sendFile(reactDistPath);
  }
  
  // Fallback to static super-admin.html
  const fallbackPath = path.join(__dirname, 'super-admin.html');
  if (fs.existsSync(fallbackPath)) {
    return res.sendFile(fallbackPath);
  }
  
  res.status(404).send('Super admin panel not found');
});

// Handle SPA routing for super-admin React app - all /super-admin/* routes
app.get('/super-admin/*', (req, res) => {
  const reactDistPath = path.join(__dirname, 'Boutique-app', 'super-admin-panel', 'dist', 'index.html');
  if (fs.existsSync(reactDistPath)) {
    return res.sendFile(reactDistPath);
  }
  res.status(404).send('Super admin panel not found');
});

// Serve staff portal
app.get('/staff', (req, res) => {
  const filePath = path.join(__dirname, 'staff-portal.html');
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Staff portal not found');
  }
});

// Save PDF endpoint
app.post('/api/save-pdf', async (req, res) => {
  try {
    const { orderId, pdfContent } = req.body;
    
    // Save PDF to file system
    const pdfPath = path.join(__dirname, 'pdfs', `${orderId}.html`);
    fs.writeFileSync(pdfPath, pdfContent);
    
    // Update order with PDF path
    await Order.findOneAndUpdate(
      { orderId },
      { pdfPath: `/pdfs/${orderId}.html` }
    );
    
    res.json({ 
      success: true, 
      pdfUrl: `${req.protocol}://${req.get('host')}/pdfs/${orderId}.html` 
    });
  } catch (error) {
    console.error('Save PDF error:', error);
    res.status(500).json({ error: 'Failed to save PDF' });
  }
});

// Send WhatsApp message (uses Twilio if configured, otherwise returns wa.me link)
app.post('/api/send-whatsapp', async (req, res) => {
  try {
    const { phone, message, pdfUrl } = req.body;
    console.log('📨 POST /api/send-whatsapp payload:', { phone, hasMessage: !!message, pdfUrlPresent: !!pdfUrl });

    if (!phone || !message) return res.status(400).json({ success: false, error: 'phone and message are required' });

    const notifyResult = await NotificationService.sendWhatsAppToCustomer(phone, message, pdfUrl);
    console.log('📤 notifyResult:', JSON.stringify(notifyResult));
    res.json(notifyResult);
  } catch (error) {
    console.error('Send WhatsApp error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Dev-only internal tests (enable by setting ENABLE_DEV_TESTS=true)
if (process.env.ENABLE_DEV_TESTS === 'true') {
  app.get('/_dev/run-tests', async (req, res) => {
    const results = { timestamp: new Date().toISOString(), checks: [] };
    try {
      const staffCount = await Staff.countDocuments();
      results.checks.push({ name: 'staff_count', value: staffCount });

      const staff = await Staff.findOne({ staffId: 'staff_005' });
      results.checks.push({ name: 'staff_005_exists', present: !!staff, staff: staff ? { id: staff._id, name: staff.name, staffId: staff.staffId } : null });

      const sampleOrder = {
        orderId: `ORD-DEV-${Date.now()}`,
        customerName: 'Dev Tester',
        customerPhone: '+919111222333',
        garmentType: 'Shirt',
        measurements: { chest: 38 },
        totalAmount: 999, advanceAmount: 100, deliveryDate: new Date().toISOString()
      };

      const settings = await Settings.findOne() || { companyName: 'SAPTHALA', phone: '7794021608', email: 'hello@sapthala.com', address: '' };
      const pdfRes = await PDFService.generateAndSavePDFFiles(sampleOrder, settings);
      results.checks.push({ name: 'generate_pdf', success: pdfRes.success, pdf: pdfRes });

      // Upsert an Order to test db update
      const o = await Order.findOneAndUpdate({ orderId: sampleOrder.orderId }, { $set: { pdfPath: pdfRes.pdfPath || pdfRes.htmlPath, customerName: sampleOrder.customerName, customerPhone: sampleOrder.customerPhone } }, { upsert: true, new: true });
      results.checks.push({ name: 'order_upsert', orderId: o.orderId, pdfPath: o.pdfPath });

      res.json({ success: true, results });
    } catch (err) {
      console.error('Dev tests error:', err);
      res.status(500).json({ success: false, error: err.message, results });
    }
  });
}



// Serve PDF files
app.get('/pdfs/:orderId.html', (req, res) => {
  const { orderId } = req.params;
  
  // In production, retrieve PDF from database or file system
  // For now, generate on-the-fly
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>SAPTHALA Invoice - ${orderId}</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 0; 
          padding: 20px; 
          background: #f5f5f5;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }
        .message {
          background: white;
          padding: 40px;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          text-align: center;
          max-width: 500px;
        }
        .icon { font-size: 64px; margin-bottom: 20px; }
        h1 { color: #8b4513; margin-bottom: 16px; }
        p { color: #666; line-height: 1.6; margin-bottom: 24px; }
        .btn {
          display: inline-block;
          padding: 12px 24px;
          background: #8b4513;
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: bold;
          margin: 8px;
        }
        .btn:hover { background: #6d3410; }
      </style>
    </head>
    <body>
      <div class="message">
        <div class="icon">📄</div>
        <h1>SAPTHALA Invoice</h1>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p>Your invoice is ready! Please contact us to receive your complete invoice PDF.</p>
        <a href="https://wa.me/7794021608?text=Hi, I need the invoice for order ${orderId}" class="btn">📱 WhatsApp Us</a>
        <a href="tel:7794021608" class="btn">📞 Call Us</a>
        <p style="margin-top: 24px; font-size: 14px; color: #999;">
          📧 Email: sapthalaredddydesigns@gmail.com<br>
          📱 Phone: 7794021608
        </p>
      </div>
    </body>
    </html>
  `);
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;
