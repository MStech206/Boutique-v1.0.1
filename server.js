require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { URL } = require('url');

const { connectDB, initializeDefaultData, isMongoConnected, Order, Customer, User, Staff, Settings, Notification, LoginAttempt, Branch, Vendor } = require('./database');
const PDFService = require('./services/pdfService');
const EnhancedPDFService = require('./services/enhancedPdfService');
const NotificationService = require('./services/notificationService');
const DataFlowService = require('./services/dataFlowService');
const dataFlowRoutes = require('./routes/dataFlowRoutes');
const firebaseIntegrationService = require('./firebase-integration-service');
     
function clientDB(req) {
  if (!req) return firebaseIntegrationService;
  if (typeof req === 'string') {
    return req ? firebaseIntegrationService.forClient(req) : firebaseIntegrationService;
  }
  // Super-admin: no boutique scope
  if (req.user?.role === 'super-admin') return firebaseIntegrationService;

  // Authenticated user — get adminId from JWT
  const adminId = req.user?.adminId;
  if (adminId) return firebaseIntegrationService.forClient(adminId);

  // Public/staff routes — no token, use boutique hint from query param
  // e.g. /api/staff?adminId=sapthala-designer-workshop
  const hintId = req.query?.adminId || req.body?.adminId;
  if (hintId) return firebaseIntegrationService.forClient(hintId);

  // Only warn when there IS a logged-in user but adminId is missing (real problem)
  if (req.user?.username) {
    console.warn(`⚠️ clientDB: user '${req.user.username}' has no adminId — add adminId field to Firestore /users/${req.user.username}`);
  }
  return firebaseIntegrationService; // flat fallback — safe
} 
// --------- Simple in-memory cache (Map) ---------
// Used to reduce repeated Firestore reads and lighten backend load.
// Cache entries: { value, expires }
const cache = new Map();

function setCache(key, value, ttlMs) {
  const expires = Date.now() + ttlMs;
  cache.set(key, { value, expires });
}

function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function invalidateCache(patterns) {
  if (!Array.isArray(patterns)) patterns = [patterns];
  for (const key of Array.from(cache.keys())) {
    for (const pat of patterns) {
      if (key.includes(pat)) {
        cache.delete(key);
        break;
      }
    }
  }
}

// periodic cleanup of expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expires <= now) cache.delete(key);
  }
}, 5 * 60 * 1000);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'sapthala_boutique_secret_2024';

// Middleware
    app.use(cors({
        origin: '*',
        credentials: true,
        methods: ['GET','POST','PUT','DELETE','OPTIONS'],
        allowedHeaders: ['Content-Type','Authorization']
    }));
app.use(express.json({ limit: '50mb' }));

// simple health check used by mobile app; avoids relying on a 404 from
// hitting the namespace root. Returns 200 when server is alive.
app.get('/api', (req, res) => {
  res.json({ ok: true, server: 'Boutique backend' });
});

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
app.use('/invoice-theme', express.static(path.join(__dirname, 'invoice theme')));
// Fix for image paths - serve without spaces in URL
app.use('/images', express.static('sapthala admin imgs'));
app.use('/sapthala-admin-imgs', express.static('sapthala admin imgs'));

// Serve super-admin-panel React app - CRITICAL FIX
// Serve super-admin-panel React app - CRITICAL FIX
const superAdminPath = path.join(__dirname, 'Boutique-app', 'super-admin-panel', 'dist');
if (fs.existsSync(superAdminPath)) {
 // ✅ Scope super-admin assets to /super-admin/assets — avoids conflict with boutique admin panel
          app.use('/super-admin/assets', express.static(path.join(superAdminPath, 'assets'), {
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

// Helper: fetch application settings — Firestore first, Mongo fallback
// helper retrieves application settings, with in-memory caching
// options: { req } - optional request object for nocache query param
async function getAppSettings(options = {}) {
  const req = options.req;
  const force = req && req.query && req.query.nocache === '1';
  const cacheKey = 'app_settings';

  if (!force) {
    const cached = getCache(cacheKey);
    if (cached) return cached;
  }

  // Try Firestore
  let settings = null;
  try {
    if (firebaseIntegrationService && firebaseIntegrationService.initialized) {
       const fb = await clientDB(req).getCollection('settings', { limit: 1 });
      if (fb && fb.success && fb.data && fb.data.length > 0) {
        settings = fb.data[0];
      }
    }
  } catch (e) {
    console.warn('⚠️ getAppSettings: Firestore read failed:', e && e.message ? e.message : e);
  }

  // Fallback to MongoDB when connected and if still missing
  if ((!settings || Object.keys(settings).length === 0) && typeof isMongoConnected === 'function' && isMongoConnected()) {
    try {
      const s = await Settings.findOne();
      if (s) settings = s;
    } catch (e) {
      console.warn('⚠️ getAppSettings: MongoDB read failed:', e && e.message ? e.message : e);
    }
  }

  // Cache result (could be null) for 10 minutes
    setCache(cacheKey, settings, 60 * 60 * 1000);

  return settings;
}


// ==================== ROUTE HANDLERS FOR ADMIN PANEL ====================

// Serve root as admin panel (sapthala-admin-clean preferred)
app.get('/', (req, res) => {
  const cleanAdmin = path.join(__dirname, 'sapthala-admin-clean.html');
  if (fs.existsSync(cleanAdmin)) {
    // If running in degraded mode (Firebase not initialized / DB unavailable), inject a small banner and global flag
    if (!firebaseIntegrationService.initialized || !app.locals.dbAvailable) {
      try {
        let html = fs.readFileSync(cleanAdmin, 'utf8');
        const inject = "\n<!-- injected by server: degraded-mode notice -->\n<script>window.__SAPTHALA_DEGRADED_MODE = true;console.warn('SAPTHALA: running in degraded mode (DB or Firebase unavailable)');</script>\n<div id=\"sapthala-server-banner\" style=\"position:fixed;top:0;left:0;right:0;background:#fff7ed;color:#92400e;padding:8px 10px;z-index:99998;text-align:center;font-weight:700;border-bottom:2px solid #fecaca;\">⚠️ Server running in degraded mode — some features (Firebase) may be unavailable. Check server logs.</div>\n";
        // Inject after opening <body> if present, else after </style>
        if (html.indexOf('<body') !== -1) {
          html = html.replace(/<body(.*?)>/i, match => `${match}\n${inject}`);
        } else if (html.indexOf('</style>') !== -1) {
          html = html.replace('</style>', `</style>\n${inject}`);
        } else {
          html = inject + html;
        }
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
      } catch (err) {
        console.warn('Failed to inject degraded-mode banner:', err.message);
        return res.sendFile(cleanAdmin);
      }
    }
    return res.sendFile(cleanAdmin);
  }
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

 
app.get(['/staff', '/staff/*'], (req, res) => {
  const staffPath = path.join(__dirname, 'staff-portal.html');
  if (!fs.existsSync(staffPath)) return res.status(404).send('Staff portal not found');
  const adminId = req.query.adminId || '';
  try {
    let html = fs.readFileSync(staffPath, 'utf8');
    const injection = `<script>window.__SAPTHALA_ADMIN_ID = ${JSON.stringify(adminId)};</script>`;
    html = html.replace('<head>', '<head>\n' + injection);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(html);
  } catch (e) {
    return res.sendFile(staffPath);
  }
});

// ==================== FAVICON & STATIC FILES ====================

// Create directories
['uploads', 'pdfs'].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

     async function sendAdminNotification(adminId, title, body, data = {}) {
    try {
        const db = firebaseIntegrationService.forClient(adminId);
        const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2,6)}`;
        await db.setDocument('notifications', notifId, {
            adminId, title, body, data, read: false, createdAt: new Date()
        });
       invalidateCache([`notifs_${adminId}`]);
        const _pushPayload = { type: 'notification', title, body, data };
        if (data && data.type === 'order_complete') _pushPayload.event = 'order_complete';
        _ssePush(adminId, _pushPayload);
        console.log(`🔔 Notification saved + pushed via SSE: ${title}`);
    } catch(err) {
        console.warn('⚠️ Notification save failed:', err.message);
    }
}

// ── SSE client registry for real-time push ───────────────────────────────
const _sseClients = new Map(); // adminId → Set<res>
function _ssePush(adminId, payload) {
    const clients = _sseClients.get(adminId);
    if (!clients || clients.size === 0) return;
    const msg = `data: ${JSON.stringify(payload)}\n\n`;
    for (const c of [...clients]) {
        try { c.write(msg); } catch(e) { clients.delete(c); }
    }
}
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
      
// Connect to Firebase (Primary Database)
(async () => {
  try {
    console.log('🔥 Starting Firebase initialization...');
    
    const firebaseInitialized = await Promise.race([
    firebaseIntegrationService.initialize(),
    new Promise(resolve => setTimeout(() => resolve(false), 10000))
]);

    // If Firebase is unavailable, fall back to MongoDB so the server still starts in dev.
    if (!firebaseInitialized) {
      console.warn('⚠️ Firebase initialization failed — attempting MongoDB fallback');
      console.warn('⚠️ To enable Firebase, set GOOGLE_APPLICATION_CREDENTIALS or start the Firestore emulator');
      try {
        await connectDB();
        await initializeDefaultData();
        app.locals.dbAvailable = true;
        console.log('✅ MongoDB connected (fallback) — server will start using MongoDB as primary data source');
      } catch (err) {
        // Do NOT exit — start server in degraded mode so UI can show cached/placeholders
        app.locals.dbAvailable = false;
        console.error('⚠️ MongoDB fallback failed:', err.message);
        console.error('⚠️ Starting server in degraded mode: database unavailable (some API endpoints will return 503)');
      }
    } else {
      console.log('✅ Firebase connected successfully');
      console.log('✅ Using Firebase as primary database');
      app.locals.dbAvailable = true;
       const adminSdk = require('firebase-admin');
      const db = firebaseIntegrationService.getDb();
      
      // Optional: Connect MongoDB for backup/migration when explicitly requested
      if (process.env.USE_MONGO_BACKUP === 'true') {
        try {
          await connectDB();
          await initializeDefaultData();
          console.log('✅ MongoDB backup connected');
        } catch (err) {
          console.warn('⚠️ MongoDB backup not available:', err.message);
        }
      }
    }

    // --- CHANGE: Only attempt MongoDB connection when USE_MONGO_BACKUP === 'true'
    if (process.env.USE_MONGO_BACKUP === 'true') {
      try {
        // If not already connected, attempt to connect (helps avoid Mongoose buffering timeouts)
        if (typeof isMongoConnected === 'function' && !isMongoConnected()) {
          console.log('🔁 Attempting MongoDB backup connection (background)...');
          await connectDB();
          await initializeDefaultData();
          console.log('✅ MongoDB backup connection established');
        } else {
          console.log('ℹ️ MongoDB already connected or not required');
        }
      } catch (err) {
        console.warn('⚠️ MongoDB backup connection failed (continuing):', err.message);
        // Do not throw — server should remain up (degraded) so public endpoints can still work
      }
    } else {
      console.log('ℹ️ MongoDB backup disabled — running Firestore-only (set USE_MONGO_BACKUP=true to enable)');
    }

    console.log('About to call app.listen()...');
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 SAPTHALA Boutique Server running on port ${PORT}`);
      console.log(`📱 Admin Panel: http://localhost:${PORT}`);
      console.log(`🔗 API Base: http://localhost:${PORT}/api`);
      console.log(`🔥 Firebase: Connected and Active`);
      console.log(`✅ Server is ready to accept requests`);
      console.log(`🔌 LISTENING ON 0.0.0.0:${PORT}`);
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

// ✅ Reuse the firebase-admin already initialized by firebase-integration-service.js
// Never call initializeApp() again — it will throw "already initialized" error
let firebaseAdmin;
try {
  const admin = require('firebase-admin');
  if (admin.apps.length > 0) {
    // Already initialized by firebase-integration-service.js ✅
    firebaseAdmin = admin;
    console.log('✅ Firebase Admin reused from existing initialization (boutique-staff-app)');
  } else {
    // Fallback: initialize directly (only if integration service failed)
    const adminSdkPath = path.join(__dirname, 'firebase-credentials.json');
    if (fs.existsSync(adminSdkPath)) {
      const svc = require(adminSdkPath);
     admin.initializeApp({
      credential: admin.credential.cert(svc),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${svc.project_id}.appspot.com`
    });
      firebaseAdmin = admin;
      console.log('✅ Firebase Admin initialized from firebase-credentials.json (boutique-staff-app)');
    } else {
      console.warn('⚠️ firebase-credentials.json not found');
    }
  }
} catch (e) {
  console.warn('⚠️ firebase-admin setup error:', e.message);
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
  const token = (authHeader && authHeader.split(' ')[1]) || req.query.token || null;

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
 
  // ✅ PATH 1: Firebase ID token (super-admin React panel)
  if (firebaseAdmin) {
    try {
      const decoded = await firebaseAdmin.auth().verifyIdToken(token);
      const email = decoded.email;
      const uid = decoded.uid;

      // Super-admin trusted email
      const SUPER_ADMIN_EMAILS = ['mstechno2323@gmail.com'];
      if (SUPER_ADMIN_EMAILS.includes(email)) {
        req.user = {
          id: uid, username: email,
          role: 'super-admin', email,
          adminId: decoded.adminId || null,
          permissions: {}
        };
        return next();
      }

      // All other Firebase users — role from custom claims
      const role = canonicalizeRole(decoded.role || '');
      if (!role) {
        return res.status(403).json({ error: 'Access denied. No role assigned.' });
      }
      req.user = {
        id: uid,
        username: decoded.name || email,
        role, email,
        adminId: decoded.adminId || null,
        branch: decoded.branch || null,
        permissions: decoded.permissions || {}
      };
      return next();

    } catch (firebaseErr) {
      // ✅ PATH 2: Not a Firebase token — try Spring Boot / server JWT
      // (boutique admin panel sends JWT signed with JWT_SECRET)
      return jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
          // Log cleanly — no scary stack trace for expected failures
          return res.status(401).json({ error: 'Invalid or expired token' });
        }
        if (user && user.role) user.role = canonicalizeRole(user.role);
        req.user = user;
        return next();
      });
    }
  }

  // Firebase Admin not initialized — fallback to JWT only
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ error: 'Invalid or expired token' });
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

// Public MongoDB health check (no auth) used by admin UI header and CI
app.get('/api/public/health/mongo', async (req, res) => {
  try {
    const healthy = typeof isMongoConnected === 'function' && isMongoConnected();
    if (healthy) return res.json({ success: true, message: 'MongoDB connected' });
    return res.status(503).json({ success: false, message: 'MongoDB not connected' });
  } catch (error) {
    console.error('MongoDB public health check error:', error);
    return res.status(500).json({ success: false, error: 'Health check failed' });
  }
});

// Private/authenticated MongoDB health check (requires admin token)
app.get('/api/health/mongo', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super-admin') return res.status(403).json({ error: 'Access denied' });
    const healthy = typeof isMongoConnected === 'function' && isMongoConnected();
    if (healthy) return res.json({ success: true, message: 'MongoDB connected', readyState: 1 });
    return res.status(503).json({ success: false, message: 'MongoDB not connected', readyState: (typeof mongoose !== 'undefined' && mongoose.connection) ? mongoose.connection.readyState : 0 });
  } catch (error) {
    console.error('MongoDB health check error:', error);
    return res.status(500).json({ success: false, error: 'Health check failed' });
  }
});

// Public last-orders report (no auth) - used for dashboard when user is not authenticated (safe, sanitized)
app.get('/api/public/reports/last-orders', async (req, res) => {
  try {
    // If neither Firebase nor MongoDB are available, return a safe degraded response
    if (!app.locals.dbAvailable && !firebaseIntegrationService.initialized) {
      return res.status(503).json({ success: false, orders: [], error: 'Database unavailable' });
    }

    const limit = Math.min(30, parseInt(req.query.limit || '10', 10));
    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('orderId createdAt totalAmount garmentType status branch')
      .lean();

    const formatted = (orders || []).map(o => ({
      orderId: o.orderId,
      createdAt: o.createdAt,
      totalAmount: o.totalAmount || 0,
      garmentType: o.garmentType || 'Other',
      status: o.status || 'pending',
      branch: o.branch || ''
    }));

    return res.json({ success: true, orders: formatted });
  } catch (error) {
    console.error('Public last-orders error:', error.message || error);
    return res.status(500).json({ success: false, error: 'Failed to fetch public last orders' });
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
    const branch = req.query.branch || (req.user.role === 'sub-admin' ? req.user.branch : null);
    const nocache = req.query.nocache === '1';
    const cacheKey = `orders_list_${branch||'all'}`;
    if (!nocache) {
      const cached = getCache(cacheKey);
      if (cached) return res.json(cached);
    }

    console.log('🔥 Fetching orders from Firebase...');

    // Fetch from Firebase
    const filters = {};
    if (branch) {
      filters.where = [['branch', '==', branch]];
    }
    filters.orderBy = { field: 'createdAt', direction: 'desc' };

     const result = await clientDB(req).getCollection('orders', filters);

    let responseBody;
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
      responseBody = { success: true, source: 'mongodb', orders: formatted };
    } else {
      const orders = result.data || [];
      console.log(`✅ Fetched ${orders.length} orders from Firebase`);
      responseBody = {
        success: true,
        source: 'firebase',
        orders: orders,
        dataSource: 'Firebase Firestore (Real-time)'
      };
    }

    setCache(cacheKey, responseBody, 3 * 60 * 1000);
    return res.json(responseBody);
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
      const responseBody = {
        success: true,
        source: 'mongodb',
        orders: formatted,
        dataSource: 'MongoDB (Fallback)'
      };
      setCache(cacheKey, responseBody,5 * 60 * 1000);
      res.json(responseBody);
    } catch (mongoError) {
      res.status(500).json({ success: false, error: error.message, fallbackError: mongoError.message });
    }
  }
});

// ==================== SUPER ADMIN ROUTES ====================
// ── HELPER ───────────────────────────────────────────────────
                      const db = () => firebaseIntegrationService.getDb();
                      const SUPER_ADMIN_GUARD = (req, res) => {
                        if (req.user.role !== 'super-admin') {
                          res.status(403).json({ success: false, error: 'Access denied. Super-admin only.' });
                          return false;
                        }
                        return true;
                      };

                      // ── CLIENTS ──────────────────────────────────────────────────

                      app.get('/api/super-admin/clients', authenticateToken, async (req, res) => {
                        try {
                          if (!SUPER_ADMIN_GUARD(req, res)) return;
                          const snapshot = await db().collection('clients').get();
                          res.json(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
                        } catch (err) { res.status(500).json({ error: 'Failed to fetch clients' }); }
                      });

                      app.get('/api/super-admin/clients/count', authenticateToken, async (req, res) => {
                        try {
                          if (!SUPER_ADMIN_GUARD(req, res)) return;
                          const snap = await db().collection('clients').count().get();
                          res.json({ count: snap.data().count });
                        } catch (err) { res.status(500).json({ error: 'Failed to get clients count' }); }
                      });

                      app.post('/api/super-admin/clients', authenticateToken, async (req, res) => {
                        try {
                          if (!SUPER_ADMIN_GUARD(req, res)) return;
                          const { boutiqueName, adminEmail, adminPhone, plan, primaryColor, secondaryColor, address, status } = req.body;
                          if (!boutiqueName || !adminEmail) return res.status(400).json({ error: 'boutiqueName and adminEmail are required' });

                          const adminId = boutiqueName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                          const existing = await db().collection('clients').doc(adminId).get();
                          if (existing.exists) return res.status(400).json({ error: 'Client already exists' });

                          const selectedPlan = plan || 'starter';
                          const clientData = {
                            adminId, boutiqueName, adminEmail,
                            adminPhone: adminPhone || '',
                            primaryColor: primaryColor || '#7c183c',
                            secondaryColor: secondaryColor || '#b22234',
                            plan: selectedPlan,
                            status: status || 'active',
                            address: address || '',
                            branchLimit: selectedPlan === 'pro' ? 10 : selectedPlan === 'growth' ? 3 : 1,
                            orderLimitPerMonth: selectedPlan === 'pro' ? 9999 : selectedPlan === 'growth' ? 500 : 100,
                            createdAt: new Date(),
                            createdBy: req.user.email
                          };

                          // ✅ Save client doc in flat /clients/{adminId}
                          await db().collection('clients').doc(adminId).set(clientData);

                          // ✅ Create all required subcollections (matching sapthala-designer-workshop structure)
                          const clientRef = db().collection('clients').doc(adminId);
                          const batch = db().batch();

                          // branches — placeholder so subcollection exists
                          batch.set(clientRef.collection('branches').doc('main'), {
                            branchId: 'main', branchName: boutiqueName + ' Main Branch',
                            adminId, isActive: true, createdAt: new Date()
                          });
                          // orders — empty placeholder
                          batch.set(clientRef.collection('orders').doc('_init'), { _init: true, adminId, createdAt: new Date() });
                          // staff — empty placeholder
                          batch.set(clientRef.collection('staff').doc('_init'), { _init: true, adminId, createdAt: new Date() });
                          // customers — empty placeholder
                          batch.set(clientRef.collection('customers').doc('_init'), { _init: true, adminId, createdAt: new Date() });
                          // settings
                          batch.set(clientRef.collection('settings').doc('general'), {
                            adminId, boutiqueName,
                            primaryColor: clientData.primaryColor,
                            secondaryColor: clientData.secondaryColor,
                            plan: selectedPlan, createdAt: new Date()
                          });
                          // notifications — empty placeholder
                          batch.set(clientRef.collection('notifications').doc('_init'), { _init: true, adminId, createdAt: new Date() });
                          // usage tracker
                          const monthKey = new Date().toISOString().slice(0, 7);
                          batch.set(clientRef.collection('usage').doc(monthKey), {
                            month: monthKey, adminId, reads: 0, writes: 0, ordersCreated: 0, updatedAt: new Date()
                          });

                          await batch.commit();

                          console.log(`✅ Client created with subcollections: ${adminId}`);
                          res.json({ success: true, client: { id: adminId, ...clientData } });
                        } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create client' }); }
                      });

                      app.put('/api/super-admin/clients/:id', authenticateToken, async (req, res) => {
                        try {
                          if (!SUPER_ADMIN_GUARD(req, res)) return;
                          const docRef = db().collection('clients').doc(req.params.id);
                          if (!(await docRef.get()).exists) return res.status(404).json({ error: 'Client not found' });
                          const updates = { ...req.body, updatedAt: new Date() };
                          await docRef.update(updates);
                          res.json({ success: true, client: { id: req.params.id, ...updates } });
                        } catch (err) { res.status(500).json({ error: 'Failed to update client' }); }
                      });

                      app.delete('/api/super-admin/clients/:id', authenticateToken, async (req, res) => {
                        try {
                          if (!SUPER_ADMIN_GUARD(req, res)) return;
                          const docRef = db().collection('clients').doc(req.params.id);
                          if (!(await docRef.get()).exists) return res.status(404).json({ error: 'Client not found' });
                          for (const col of ['branches','boutique_admins','orders','staff','customers','users','usage']) {
                            const sub = await docRef.collection(col).get();
                            if (!sub.empty) { const b = db().batch(); sub.docs.forEach(d => b.delete(d.ref)); await b.commit(); }
                          }
                          await docRef.delete();
                          res.json({ success: true, message: 'Client deleted' });
                        } catch (err) { res.status(500).json({ error: 'Failed to delete client' }); }
                      });

 
                     // ── BOUTIQUE ADMINS — stored in flat /users collection for login ──────────────

                    app.get('/api/super-admin/admins', authenticateToken, async (req, res) => {
                      try {
                        if (!SUPER_ADMIN_GUARD(req, res)) return;
                        const snap = await db().collection('users').get();
                        const admins = snap.docs.map(d => { const data = d.data(); delete data.password; return { id: d.id, ...data }; });
                        res.json({ success: true, admins });
                      } catch (err) { res.status(500).json({ success: false, error: 'Failed to fetch admins' }); }
                    });

                    app.get('/api/super-admin/admins/count', authenticateToken, async (req, res) => {
                      try {
                        if (!SUPER_ADMIN_GUARD(req, res)) return;
                        const snap = await db().collection('users').count().get();
                        res.json({ count: snap.data().count });
                      } catch (err) { res.status(500).json({ error: 'Failed to get admins count' }); }
                    });

                    app.post('/api/super-admin/admins', authenticateToken, async (req, res) => {
                      try {
                        if (!SUPER_ADMIN_GUARD(req, res)) return;
                        const { clientId, name, email, username, password, role, status } = req.body;
                        if (!clientId || !email || !username || !password) {
                          return res.status(400).json({ error: 'clientId, email, username and password are required' });
                        }

                        const clientSnap = await db().collection('clients').doc(clientId).get();
                        if (!clientSnap.exists) return res.status(404).json({ error: 'Client not found' });
                        const clientData = clientSnap.data();

                        // ✅ Check username not already taken
                        const existing = await db().collection('users').where('username', '==', username).limit(1).get();
                        if (!existing.empty) return res.status(400).json({ error: 'Username already exists' });

                        const hashedPassword = await bcrypt.hash(password, 10);

                        const userData = {
                          name: name || '',
                          email,
                          username,
                          password: hashedPassword,
                          role: role || 'admin',
                          status: status || 'Active',
                          clientId,
                          adminId: clientId,
                          boutiqueName: clientData.boutiqueName,
                          isActive: true,
                          createdAt: new Date(),
                          createdBy: req.user.email
                        };

                        // ✅ Save in flat /users/{username} — this allows boutique login
                        await db().collection('users').doc(username).set(userData);

                        console.log(`✅ Admin created in /users: ${username} for client: ${clientId}`);
                        const safeUser = { ...userData }; delete safeUser.password;
                        res.json({ success: true, admin: { id: username, ...safeUser } });
                      } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to create admin' }); }
                    });

                    app.put('/api/super-admin/admins/:adminId', authenticateToken, async (req, res) => {
                      try {
                        if (!SUPER_ADMIN_GUARD(req, res)) return;
                        const { adminId } = req.params;
                        const docRef = db().collection('users').doc(adminId);
                        if (!(await docRef.get()).exists) return res.status(404).json({ error: 'Admin not found' });
                        const updates = { ...req.body, updatedAt: new Date() };
                        delete updates.password; // password change handled separately
                        await docRef.update(updates);
                        res.json({ success: true });
                      } catch (err) { res.status(500).json({ success: false, error: 'Failed to update admin' }); }
                    });

                    app.delete('/api/super-admin/admins/:adminId', authenticateToken, async (req, res) => {
                      try {
                        if (!SUPER_ADMIN_GUARD(req, res)) return;
                        await db().collection('users').doc(req.params.adminId).delete();
                        res.json({ success: true });
                      } catch (err) { res.status(500).json({ success: false, error: 'Failed to delete admin' }); }
                    });

                    app.get('/api/super-admin/admins/hierarchy/:clientId', authenticateToken, async (req, res) => {
                      try {
                        if (!SUPER_ADMIN_GUARD(req, res)) return;
                        const { clientId } = req.params;
                        const clientSnap = await db().collection('clients').doc(clientId).get();
                        if (!clientSnap.exists) return res.status(404).json({ error: 'Client not found' });

                        const [adminsSnap, branchesSnap] = await Promise.all([
                          db().collection('users').where('clientId', '==', clientId).get(),
                          db().collection('clients').doc(clientId).collection('branches').get()
                        ]);

                        const admins = adminsSnap.docs.map(d => { const data = d.data(); delete data.password; return { id: d.id, ...data }; });
                        res.json({
                          client: { id: clientId, ...clientSnap.data() },
                          admins,
                          branches: branchesSnap.docs.map(d => ({ id: d.id, ...d.data() }))
                        });
                      } catch (err) { res.status(500).json({ error: 'Failed to fetch hierarchy' }); }
                    });

                      // ── VENDORS (/vendors flat collection) ───────────────────────

                      app.get('/api/super-admin/vendors', authenticateToken, async (req, res) => {
                        try {
                          if (!SUPER_ADMIN_GUARD(req, res)) return;
                          const snap = await db().collection('vendors').get();
                          res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                        } catch (err) { res.status(500).json({ error: 'Failed to fetch vendors' }); }
                      });

                      app.get('/api/super-admin/vendors/count', authenticateToken, async (req, res) => {
                        try {
                          if (!SUPER_ADMIN_GUARD(req, res)) return;
                          const snap = await db().collection('vendors').count().get();
                          res.json({ count: snap.data().count });
                        } catch (err) { res.status(500).json({ error: 'Failed to get vendors count' }); }
                      });

                      app.post('/api/super-admin/vendors', authenticateToken, async (req, res) => {
                        try {
                          if (!SUPER_ADMIN_GUARD(req, res)) return;
                          const ref = db().collection('vendors').doc();
                          const vendor = { id: ref.id, ...req.body, status: req.body.status || 'Active', createdAt: new Date() };
                          await ref.set(vendor);
                          res.json(vendor);
                        } catch (err) { res.status(500).json({ error: 'Failed to create vendor' }); }
                      });

                      app.put('/api/super-admin/vendors/:id', authenticateToken, async (req, res) => {
                        try {
                          if (!SUPER_ADMIN_GUARD(req, res)) return;
                          const ref = db().collection('vendors').doc(req.params.id);
                          if (!(await ref.get()).exists) return res.status(404).json({ error: 'Vendor not found' });
                          await ref.update({ ...req.body, updatedAt: new Date() });
                          res.json({ success: true });
                        } catch (err) { res.status(500).json({ error: 'Failed to update vendor' }); }
                      });

                      app.delete('/api/super-admin/vendors/:id', authenticateToken, async (req, res) => {
                        try {
                          if (!SUPER_ADMIN_GUARD(req, res)) return;
                          await db().collection('vendors').doc(req.params.id).delete();
                          res.json({ success: true });
                        } catch (err) { res.status(500).json({ error: 'Failed to delete vendor' }); }
                      });

                      // ── USERS (/users flat collection) ────────────────────────────

                      app.get('/api/super-admin/users', authenticateToken, async (req, res) => {
                        try {
                          if (!SUPER_ADMIN_GUARD(req, res)) return;
                          const snap = await db().collection('users').get();
                          res.json(snap.docs.map(d => { const data = d.data(); delete data.password; return { id: d.id, ...data }; }));
                        } catch (err) { res.status(500).json({ error: 'Failed to fetch users' }); }
                      });

                      app.get('/api/super-admin/users/count', authenticateToken, async (req, res) => {
                        try {
                          if (!SUPER_ADMIN_GUARD(req, res)) return;
                          const snap = await db().collection('users').count().get();
                          res.json({ count: snap.data().count });
                        } catch (err) { res.status(500).json({ error: 'Failed to get users count' }); }
                      });

                      // ── DASHBOARD ─────────────────────────────────────────────────

                      app.get('/api/super-admin/dashboard', authenticateToken, async (req, res) => {
                        try {
                          if (!SUPER_ADMIN_GUARD(req, res)) return;
                          const [clientsSnap, vendorsSnap, usersSnap, allClientsSnap] = await Promise.all([
                            db().collection('clients').count().get(),
                            db().collection('vendors').count().get(),
                            db().collection('users').count().get(),
                            db().collection('clients').get()
                          ]);
                          const adminsCountSnap = await db().collection('users').count().get();
                          const totalAdmins = adminsCountSnap.data().count;
                          res.json({ success: true, stats: {
                            totalClients: clientsSnap.data().count,
                            totalAdmins,
                            totalVendors: vendorsSnap.data().count,
                            totalUsers: usersSnap.data().count
                          }});
                        } catch (err) { res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' }); }
                      });

                      app.get('/api/super-admin/dashboard/active-admins-last-7-days', authenticateToken, async (req, res) => {
                        try {
                          if (!SUPER_ADMIN_GUARD(req, res)) return;
                          const counts = [];
                          for (let i = 6; i >= 0; i--) {
                            const start = new Date(); start.setDate(start.getDate() - i); start.setHours(0,0,0,0);
                            const end = new Date(start); end.setDate(start.getDate() + 1);
                            const snap = await db().collection('loginAttempts')
                              .where('success', '==', true).where('timestamp', '>=', start).where('timestamp', '<', end).get();
                            counts.push(new Set(snap.docs.map(d => d.data().username)).size);
                          }
                          res.json(counts);
                        } catch (err) { res.json([0,0,0,0,0,0,0]); }
                      });
                      // ── SUB-ADMINS TOTAL COUNT (across all clients) ───────────────
                    app.get('/api/super-admin/sub-admins/count', authenticateToken, async (req, res) => {
                      try {
                        if (!SUPER_ADMIN_GUARD(req, res)) return;
                        const snap = await db().collection('users')
                          .where('role', '==', 'sub-admin').count().get();
                        res.json({ count: snap.data().count });
                      } catch (err) {
                        console.error('Sub-admins count error:', err);
                        res.status(500).json({ error: 'Failed to get sub-admins count' });
                      }
                    });
                    app.get('/api/super-admin/clients/:clientId/sub-admins', authenticateToken, async (req, res) => {
                    try {
                      if (!SUPER_ADMIN_GUARD(req, res)) return;
                      const { clientId } = req.params;
                      const snap = await db().collection('clients').doc(clientId)
                        .collection('users').where('role', '==', 'sub-admin').get();
                      const subAdmins = snap.docs.map(d => {
                        const data = d.data();
                        delete data.password;
                        return { id: d.id, ...data };
                      });
                      res.json({ success: true, subAdmins });
                    } catch (err) {
                      console.error('Sub-admins list error:', err);
                      res.status(500).json({ error: 'Failed to fetch sub-admins' });
                    }
                  });
                 // GET main-admin — query by adminId (set on all users created via AddAdmin)
                app.get('/api/super-admin/clients/:clientId/main-admin', authenticateToken, async (req, res) => {
                  try {
                    if (!SUPER_ADMIN_GUARD(req, res)) return;
                    const { clientId } = req.params;

                    let doc, data;

                    // Primary: query by adminId field
                    const snap = await db().collection('users')
                    .where('adminId', '==', clientId)
                    .where('role', '==', 'admin')
                    .limit(1).get();

                    if (!snap.empty) {
                      doc  = snap.docs[0];
                      data = doc.data();
                    } else {
                      // Fallback: old docs may use adminId instead of clientId
                      const snap2 = await db().collection('users')
                        .where('adminId', '==', clientId)
                        .where('role', '==', 'admin').limit(1).get();
                      if (!snap2.empty) {
                        doc  = snap2.docs[0];
                        data = doc.data();
                      } else {
                        return res.status(404).json({ error: 'No main admin found' });
                      }
                    }

                    delete data.password;
                    res.json({ success: true, admin: { id: doc.id, username: doc.id, ...data } });
                  } catch (err) {
                    console.error('Main admin fetch error:', err);
                    res.status(500).json({ error: 'Failed to fetch main admin' });
                  }
                });

                // PUT — update username (renames doc) and/or password
                app.put('/api/super-admin/admins/:adminId/details', authenticateToken, async (req, res) => {
                try {
                  if (!SUPER_ADMIN_GUARD(req, res)) return;
                  const { adminId } = req.params;          // current doc ID (= current username)
                  const { username: newUsername, newPassword } = req.body;

                  const oldRef  = db().collection('users').doc(adminId);
                  const oldSnap = await oldRef.get();
                  if (!oldSnap.exists) return res.status(404).json({ error: 'Admin not found' });

                  const updates = { updatedAt: new Date() };
                  if (newPassword && newPassword.trim().length >= 6) {
                    updates.password = await require('bcryptjs').hash(newPassword.trim(), 10);
                  }

                  const trimmed = newUsername?.trim();
                  if (trimmed && trimmed !== adminId) {
                    // Username changed — doc ID must change too (login uses doc ID as username)
                    const taken = await db().collection('users').doc(trimmed).get();
                    if (taken.exists) return res.status(400).json({ error: 'Username already taken' });

                    await db().collection('users').doc(trimmed).set({
                      ...oldSnap.data(), ...updates, username: trimmed
                    });
                    await oldRef.delete();
                  } else {
                    await oldRef.update(updates);
                  }

                  res.json({ success: true });
                } catch (err) {
                  console.error('Update admin details error:', err);
                  res.status(500).json({ error: 'Failed to update admin' });
                }
              });

                    // ── CLIENT ORDERS CHART (orders per day for a given month) ────
                    app.get('/api/super-admin/clients/:clientId/orders-chart', authenticateToken, async (req, res) => {
                      try {
                        if (!SUPER_ADMIN_GUARD(req, res)) return;
                        const { clientId } = req.params;
                        const month = req.query.month || new Date().toISOString().slice(0, 7); // YYYY-MM
                        const [year, mon] = month.split('-').map(Number);
                        const startDate   = new Date(year, mon - 1, 1);
                        const endDate     = new Date(year, mon, 1);
                        const daysInMonth = new Date(year, mon, 0).getDate();

                        const snap = await db()
                          .collection('clients').doc(clientId)
                          .collection('orders')
                          .where('createdAt', '>=', startDate)
                          .where('createdAt', '<',  endDate)
                          .get();

                        const counts = Array(daysInMonth).fill(0);
                        snap.docs.forEach(doc => {
                          const data = doc.data();
                          if (data._init) return; // skip placeholder init docs
                          const ts = data.createdAt;
                          let date;
                          if (ts?.toDate)  date = ts.toDate();
                          else if (ts)     date = new Date(ts);
                          if (date && !isNaN(date.getTime())) {
                            const day = date.getDate();
                            if (day >= 1 && day <= daysInMonth) counts[day - 1]++;
                          }
                        });

                        res.json({ success: true, month, clientId, counts, daysInMonth });
                      } catch (err) {
                        console.error('Orders chart error:', err);
                        res.status(500).json({ error: 'Failed to fetch orders chart' });
                      }
                    });
                    // ── SUB-ADMINS COUNT — summed from each client's subcollection ─
                  app.get('/api/super-admin/sub-admins/count', authenticateToken, async (req, res) => {
                    try {
                      if (!SUPER_ADMIN_GUARD(req, res)) return;

                      const clientsSnap = await db().collection('clients').get();
                      let total = 0;

                      for (const clientDoc of clientsSnap.docs) {
                        const snap = await db()
                          .collection('clients').doc(clientDoc.id)
                          .collection('users')
                          .where('role', '==', 'sub-admin')
                          .count().get();
                        total += snap.data().count;
                      }

                      res.json({ count: total });
                    } catch (err) {
                      console.error('Sub-admins count error:', err);
                      res.status(500).json({ error: 'Failed to get sub-admins count' });
                    }
                  });
                  // ── SUB-ADMINS PER-CLIENT BREAKDOWN ──────────────────────────
                   // ── SUB-ADMINS PER-CLIENT BREAKDOWN ──────────────────────────
                app.get('/api/super-admin/sub-admins/breakdown', authenticateToken, async (req, res) => {
                  try {
                    if (!SUPER_ADMIN_GUARD(req, res)) return;
                    const clientsSnap = await db().collection('clients').get();
                    const breakdown = [];
                    let total = 0;
                    for (const clientDoc of clientsSnap.docs) {
                      const snap = await db()
                        .collection('clients').doc(clientDoc.id)
                        .collection('users')
                        .where('role', '==', 'sub-admin')
                        .count().get();
                      const count = snap.data().count;
                      total += count;
                      breakdown.push({
                        clientId:      clientDoc.id,
                        boutiqueName:  clientDoc.data().boutiqueName || clientDoc.id,
                        subAdminCount: count,
                      });
                    }
                    res.json({ success: true, total, breakdown });
                  } catch (err) {
                    console.error('Sub-admins breakdown error:', err);
                    res.status(500).json({ error: 'Failed to get sub-admins breakdown' });
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
      if (isMongoConnected()) {
        try {
          await LoginAttempt.create({
            username: username || 'unknown',
            success: false,
            errorMessage: 'Password is required',
            ipAddress,
            userAgent
          });
        } catch(e) { console.warn('LoginAttempt write failed:', e.message); }
      }
      return res.status(400).json({ error: 'Password is required' });
    }
    // ✅ Save to Firestore loginAttempts 
        if (firebaseIntegrationService.initialized) {
          try {
            await db().collection('loginAttempts').add({
              username: user.username,
              email: user.email || '',
              adminId: user.adminId || '',
              role: normalizedRole,
              success: true,
              timestamp: new Date(),
              ipAddress,
              userAgent,
            });
            // ✅ Also update lastLogin on the user doc
            await db().collection('users').doc(user.username).update({
              lastLogin: new Date(),
            });
          } catch (e) {
            console.warn('Firestore loginAttempts write failed:', e.message);
          }
        }
    // Search for user by username (admin or sub-admin)
    const searchUsername = username || 'admin';
    let user = null;

      // Firestore is PRIMARY — always read users from Firestore first
          if (firebaseIntegrationService.initialized) {
            try {
              const fbRes = await firebaseIntegrationService.getCollection('users', {
                where: [['username', '==', searchUsername]], limit: 1
              });
              if (fbRes.success && Array.isArray(fbRes.data) && fbRes.data.length > 0) {
                user = fbRes.data[0]; // has adminId from Firestore user doc
              }
            } catch (e) {
              console.warn('Firestore user lookup failed:', e.message);
            }
          }

          // MongoDB fallback only if Firestore didn't find user
          if (!user && isMongoConnected()) {
            try {
              user = await User.findOne({ username: searchUsername });
            } catch (e) {
              console.warn('Mongo user lookup failed:', e.message);
            }
          }

    if (!user) {
      if (isMongoConnected()) {
        try {
          await LoginAttempt.create({
            username: searchUsername,
            success: false,
            errorMessage: 'User not found',
            ipAddress,
            userAgent
          });
        } catch(e){ console.warn('LoginAttempt write failed:', e.message);}        
      }
      console.warn(`⚠️  User not found: ${searchUsername}`);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Compare password
    let isValidPassword = false;
    if (user.password) {
      try {
        isValidPassword = await bcrypt.compare(password, user.password);
      } catch (e) {
        console.warn('bcrypt compare error:', e.message);
      }
    }
    // allow default admin credentials if no user record or password mismatch
            if (!isValidPassword && !user.password) {
          if (searchUsername === 'admin' && password === 'sapthala@2029') {
            isValidPassword = true;
          }
        }

    if (!isValidPassword) {
      if (isMongoConnected()) {
        try {
          await LoginAttempt.create({
            username: searchUsername,
            success: false,
            errorMessage: 'Invalid password',
            ipAddress,
            userAgent
          });
        } catch(e){ console.warn('LoginAttempt write failed:', e.message);}        
      }
      console.warn(`⚠️  Wrong password for user: ${searchUsername}`);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Ensure role is canonical in token and response
    const normalizedRole = canonicalizeRole(user.role || '');

    const token = jwt.sign(
{ id: user._id || user.id, username: user.username, role: normalizedRole, branch: user.branch, permissions: user.permissions, adminId: user.adminId || (normalizedRole === 'admin' ? user.username : null) },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Log successful login
    if (isMongoConnected()) {
      try {
        await LoginAttempt.create({
          username: searchUsername,
          success: true,
          errorMessage: null,
          ipAddress,
          userAgent
        });
      } catch(e){ console.warn('LoginAttempt write failed:', e.message);}      
    }

    console.log(`✅ ${normalizedRole} login successful: ${user.username}`);
    res.json({
      success: true,
      token,
      user: { 
        id: user._id || user.id, 
        username: user.username, 
        role: normalizedRole, 
        branch: user.branch,
        permissions: user.permissions,
         adminId: user.adminId || (normalizedRole === 'admin' ? user.username : null)   
      }
    });
  } catch (error) {
    if (isMongoConnected()) {
      try {
        await LoginAttempt.create({
          username: req.body.username || 'unknown',
          success: false,
          errorMessage: error.message,
          ipAddress,
          userAgent
        });
      } catch(e){ console.warn('LoginAttempt write failed:', e.message);}      
    }
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
   // CHECK: username already exists — Firestore primary
    const existingFb = await firebaseIntegrationService.getCollection('users', {
      where: [['username', '==', username]], limit: 1
    });
    if (existingFb.success && existingFb.data?.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Branchid slug from admin's boutique prefix
    const adminId = req.user.adminId;
    const prefix = adminId ? adminId.toUpperCase().replace(/-/g, '.') : 'SAPTHALA';
    const branchId = branch.includes('.') ? branch.toUpperCase()
      : `${prefix}.${branch.replace(/\s+/g, '').toUpperCase()}`;

    // CHECK: branch exists in Firestore subcollection
    const branchFb = await clientDB(req).getCollection('branches', {
      where: [['branchId', '==', branchId]], limit: 1
    });
    let branchDoc = branchFb.success && branchFb.data?.length > 0 ? branchFb.data[0] : null;

    // Auto-create branch in Firestore if not found
    if (!branchDoc) {
      const branchName = branchId.split('.').slice(1).join(' ').replace(/([A-Z])/g, ' $1').trim() || branchId;
      branchDoc = { branchId, branchName, location: `${branchName} Branch`, isActive: true, adminId };
      await clientDB(req).setDocument('branches', branchId, {
        ...branchDoc,
        createdAt: new Date().toISOString(),
        createdBy: req.user.username
      });
      console.log(`✅ Branch auto-created in Firestore: ${branchId}`);

      // Auto-create staff for workflow stages
      const settings = await getAppSettings({ req });
      if (settings?.workflowStages) {
        for (const stage of settings.workflowStages) {
          const staffId = `${branchId.replace(/\s+/g, '')}_${stage.id}`;
          await clientDB(req).setDocument('staff', staffId, {
            staffId, name: `${stage.name} (${branchDoc.branchName})`,
            phone: '9876543210', role: stage.name, pin: '1234',
            branch: branchId, workflowStages: [stage.id],
            skills: stage.requiredSkills || [], isAvailable: true,
            adminId, createdAt: new Date().toISOString()
          });
        }
      }
    }

    // Hash password and write sub-admin to Firestore /users/{username}
    const hashedPassword = await bcrypt.hash(password, 10);
    const subAdminData = {
      username,
      password: hashedPassword,
      role: 'sub-admin',
      branch: branchId,
      adminId,                      // ← inherits parent admin's boutique slug
      isActive: true,
      permissions: {
        canEdit: false,
        canDelete: false,
        canViewReports: true,
        canManageStaff: false,
        branchAccess: [branchId],
        ...(permissions || {})
      },
      createdBy: req.user.username || 'admin',
      createdAt: new Date().toISOString()
    };

    // Write to flat /users (for login lookup) AND to boutique subcollection
    await firebaseIntegrationService.setDocument('users', username, subAdminData);
    await clientDB(req).setDocument('users', username, subAdminData);

    console.log(`✅ Sub-admin created in Firestore: ${username} for branch ${branchId} (adminId: ${adminId})`);
        invalidateCache([`admin_sub_admins_${adminId}`, `staff_list_${adminId}`, `branches_all`, `public_branches_${adminId}`]);
    res.json({ success: true, subAdmin: { username, branch: branchId, role: 'sub-admin', permissions: subAdminData.permissions } });
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

    const nocache = req.query.nocache === '1';
   const cacheKey = `admin_sub_admins_${req.user.adminId || req.user.username}`;
    if (!nocache) {
      const cached = getCache(cacheKey);
      if (cached) return res.json(cached);
    }

                  let subAdmins = [];

                  // Firestore PRIMARY — read sub-admins scoped to this admin's boutique
                  // Firestore PRIMARY — read sub-admins scoped to this admin's boutique subcollection
                  if (firebaseIntegrationService.initialized) {
                    const db = firebaseIntegrationService.forClient(req.user.adminId || req.user.username);
                    const fbRes = await db.getCollection('users', {
                      where: [['role', '==', 'sub-admin']],
                      limit: 1000
                    });
                    if (fbRes.success && Array.isArray(fbRes.data)) {
                      subAdmins = fbRes.data;
                    }
                  }

                  // MongoDB fallback only if Firestore returned nothing
                  if (subAdmins.length === 0 && isMongoConnected()) {
                    try {
                      subAdmins = await User.find({ role: 'sub-admin' }).select('-password').sort({ createdAt: -1 });
                    } catch(e) { console.warn('Mongo sub-admins fallback failed:', e.message); }
                  }
      
    
    // Fetch branch details for each sub-admin (Mongo branches or Firestore)
    const branchIds = [...new Set(subAdmins.map(sa => sa.branch).filter(Boolean))];
    let branches = [];
    if (branchIds.length === 0) branches = [];
    else
    if (branchIds.length > 0 && firebaseIntegrationService.initialized) {
      const db = firebaseIntegrationService.forClient(req.user.adminId);
      const fbBranchRes = await db.getCollection('branches', { limit: 500 });
      if (fbBranchRes.success && Array.isArray(fbBranchRes.data)) {
        branches = fbBranchRes.data;
      }
    }
    const branchMap = {};
    branches.forEach(b => branchMap[b.branchId] = b);
    
    const enrichedSubAdmins = subAdmins.map(sa => ({
      _id: sa._id || sa.id,
      username: sa.username,
      role: sa.role,
      branch: sa.branch,
      branchName: branchMap[sa.branch]?.branchName || sa.branch,
      permissions: sa.permissions,
      createdAt: sa.createdAt
    }));
    
    const responseBody = { success: true, subAdmins: enrichedSubAdmins };
    setCache(cacheKey, responseBody,5 * 60 * 1000);
    res.json(responseBody);
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

     const db = clientDB(req);
    const snap = await db.getDocument('users', req.params.id);
    if (!snap.success || !snap.data) return res.status(404).json({ error: 'Sub-admin not found' });
    if (snap.data.role !== 'sub-admin') return res.status(400).json({ error: 'Can only change passwords for sub-admins' });
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const changedAt = new Date().toISOString();
    // Update in subcollection + flat collection (needed for login)
    await db.setDocument('users', req.params.id, { password: hashedPassword, passwordChangedAt: changedAt, passwordChangedBy: req.user.username });
    await firebaseIntegrationService.setDocument('users', req.params.id, { password: hashedPassword, passwordChangedAt: changedAt });
    console.log(`🔐 Password changed for sub-admin: ${req.params.id} by ${req.user.username}. Reason: ${reason || 'none'}`);
    res.json({ success: true, message: 'Password changed successfully', changedAt });
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

     const adminId = req.user.adminId || req.user.username;
    if (!adminId) return res.status(400).json({ error: 'adminId missing from token' });
    const db = firebaseIntegrationService.forClient(adminId);
    const snap = await db.getDocument('users', req.params.id);
    if (!snap.success || !snap.data) return res.status(404).json({ error: 'Sub-admin not found' });
    const subAdmin = snap.data;
      // Delete from BOTH flat /users collection AND client subcollection
    await firebaseIntegrationService.deleteDocument('users', req.params.id);
    await db.deleteDocument('users', req.params.id);
    // Cascade: delete staff + branch in same client subcollection
    if (subAdmin.branch) {
      const staffRes = await db.getCollection('staff', { where: [['branch', '==', subAdmin.branch]], limit: 200 });
      for (const s of (staffRes.data || [])) {
        await db.deleteDocument('staff', s.id || s.staffId);
      }
      await db.deleteDocument('branches', subAdmin.branch);
    }
        invalidateCache([`admin_sub_admins_${adminId}`, `branches_all`, `public_branches_${adminId}`, `staff_list_${adminId}`]);
    console.log(`✅ Sub-admin deleted: ${req.params.id}`);
    res.json({ success: true, message: 'Sub-admin and associated branch deleted successfully' });
  } catch (error) {
    console.error('Delete sub-admin error:', error);
    res.status(500).json({ error: 'Failed to delete sub-admin' });
  }
});

// ==================== BRANCH MANAGEMENT ROUTES ====================

// Get all branches — Firestore primary, MongoDB fallback
app.get('/api/branches', authenticateToken, async (req, res) => {
  try {
    const nocache = req.query.nocache === '1';
    const cacheKey = `branches_all_${req.user.adminId || req.user.username}`;
    if (!nocache) {
      const cached = getCache(cacheKey);
      if (cached) return res.json(cached);
    }

    // Prefer Firestore when initialized
    if (firebaseIntegrationService && firebaseIntegrationService.initialized) {
      const db = firebaseIntegrationService.forClient(req.user.adminId || req.user.username);
      const fbRes = await db.getCollection('branches', { orderBy: { field: 'branchName', direction: 'asc' } });
      if (fbRes.success) {
        const branches = (fbRes.data || []).map(d => ({
        branchId: d.branchId || d.id || '',
        branchName: d.branchName || d.name || (d.branch && d.branch.name) || '',
        location: d.location || (d.branch && d.branch.location) || '',
        phone: d.phone || '',
        email: d.email || '',
        isActive: d.isActive !== false,
        createdAt: d.createdAt || null
      }));
        const responseBody = { success: true, branches, dataSource: 'Firebase Firestore (real-time)' };
        setCache(cacheKey, responseBody, 5 * 60 * 1000);
        return res.json(responseBody);
      }
      console.warn('⚠️ Firestore branches fetch failed — falling back to MongoDB:', fbRes.error);
    }

     
    

    return res.status(503).json({ success: false, error: 'No database available' });
  } catch (error) {
    console.error('Get branches error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch branches' });
  }
});

// Public festivals endpoint (returns festival dates)
app.get('/api/festivals', async (req, res) => {
  try {
    const settings = await getAppSettings({ req });
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

    // Read existing settings (Firestore first, Mongo fallback)
    const existingSettings = await getAppSettings({ req });
    
    // If no settings exist anywhere, create in Mongo when available or write to Firestore
    if (!existingSettings) {
      if (typeof isMongoConnected === 'function' && isMongoConnected()) {
        const created = await Settings.create({ festivalDates: newDates });
        // keep Firestore in sync
        if (firebaseIntegrationService && firebaseIntegrationService.initialized) {
          await clientDB(req).setDocument('settings', 'global', created);
        }
        return res.json({ success: true, festivals: created.festivalDates });
      }

      if (firebaseIntegrationService && firebaseIntegrationService.initialized) {
        await clientDB(req).setDocument('settings', 'global', { festivalDates: newDates });
        return res.json({ success: true, festivals: newDates });
      }

      return res.status(500).json({ success: false, error: 'Settings storage not available' });
    }

    // Update MongoDB settings when connected
    if (typeof isMongoConnected === 'function' && isMongoConnected() && existingSettings._id) {
      existingSettings.festivalDates = Object.assign({}, existingSettings.festivalDates || {}, newDates);
      existingSettings.updatedAt = new Date();
      await existingSettings.save();
    }

    // Also update Firestore to keep sources consistent
    if (firebaseIntegrationService && firebaseIntegrationService.initialized) {
      await clientDB(req).setDocument('settings', existingSettings.id || 'global', { festivalDates: newDates });
    }

    return res.json({ success: true, festivals: (existingSettings.festivalDates || {}) });
  } catch (error) {
    console.error('Update festivals error:', error);
    res.status(500).json({ success: false, error: 'Failed to update festival settings' });
  }
});

          // Public branches endpoint for clients with DISTINCT branches
          // GET /api/public/branches — scoped to a client if adminId provided
          app.get('/api/public/branches', async (req, res) => {
            try {
              const { adminId } = req.query;
              const nocache = req.query.nocache === '1';
              const cacheKey = `public_branches_${adminId || 'all'}`;

              if (!nocache) {
                const cached = getCache(cacheKey);
                if (cached) return res.json(cached);
              }

             const resolvedAdminId = adminId || (req.user && req.user.adminId) || (req.user && req.user.username) || null;
              if (!resolvedAdminId) {
                return res.status(400).json({ error: 'adminId query param is required' });
              }

              if (firebaseIntegrationService && firebaseIntegrationService.initialized) {
                const db = firebaseIntegrationService.forClient(resolvedAdminId);
                const fb = await db.getCollection('branches', { orderBy: { field: 'branchName', direction: 'asc' } });
                if (fb.success) {
                  const branches = (fb.data || []).map(d => ({
                    branchId: d.branchId || d.id || '',
                    branchName: d.branchName || d.name || '',
                    location: d.location || '',
                    adminId: resolvedAdminId  
                  }));
                  setCache(cacheKey, branches,  60 * 1000);
                  return res.json(branches);
                }
                console.warn('⚠️ Firestore public branches fetch failed:', fb.error);
              }

              return res.status(503).json({ error: 'No database available' });
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
    // ✅ Get adminId from query OR JWT token OR logged-in username as fallback
    const adminId = req.query.adminId
      || (req.user && req.user.adminId)
      || (req.user && req.user.username)
      || null;
    if (!adminId) return res.status(400).json({ error: 'adminId is required' });

    if (!firebaseIntegrationService || !firebaseIntegrationService.initialized) {
      return res.status(503).json({ error: 'Firebase not initialized' });
    }

    const filters = {};
     const _staffCacheKey = `staff_list_${adminId}_${branch||'all'}`;
    const _staffCached = req.query.nocache !== '1' && getCache(_staffCacheKey);
    if (_staffCached) return res.json(_staffCached);
    if (branch) filters.where = [['branch', '==', branch]];

     
    const fb = await firebaseIntegrationService.forClient(adminId).getCollection('staff', filters);

    if (!fb.success) {
      console.error('❌ Firestore staff fetch failed:', fb.error);
      return res.status(500).json({ error: 'Failed to fetch staff from Firebase', details: fb.error });
    }

    // Deduplicate by staffId (keep first seen)
    const seen = new Map();
    (fb.data || []).forEach(s => {
      const key = s.staffId || s.id || '';
      if (key && !seen.has(key)) seen.set(key, s);
    });

    const out = Array.from(seen.values()).map(s => ({
      staffId:        s.staffId        || s.id || '',
      id:             s._id            || s.id || '',
      name:           s.name           || '',
      phone:          s.phone          || '',
      email:          s.email          || null,
      role:           s.role           || '',
      branch:         s.branch         || null,
      branchName:     s.branchName     || null,
      isAvailable:    s.isAvailable !== undefined ? s.isAvailable : true,
      workflowStages: s.workflowStages || []
    }));
    setCache(_staffCacheKey, out,   5 * 60 * 1000);
    res.json(out);
  } catch (error) {
    console.error('❌ Get staff error:', error);
    res.status(500).json({ error: 'Failed to fetch staff', details: error.message });
  }
});

// Staff login (public endpoint for simple PIN-based login)
// app.post('/api/staff/login', async (req, res) => {
//   try {
//     const { staffId, pin, branch } = req.body || {};
//     if (!staffId || !pin) return res.status(400).json({ error: 'staffId and pin are required' });

//     // Allow searching by staffId and optionally branch
//     const query = { staffId };
//     if (branch) query.branch = branch;

//     const staff = await Staff.findOne(query).lean();
//     if (!staff) {
//       return res.status(401).json({ error: 'Invalid staff credentials' });
//     }

//     // Simple PIN check (stored as plain for now in default data)
//     if ((staff.pin || '1234').toString() !== pin.toString()) {
//       return res.status(401).json({ error: 'Invalid staff credentials' });
//     }

//     // create a lightweight token for session use
//     const token = jwt.sign({ id: staff._id, staffId: staff.staffId, name: staff.name, role: staff.role, branch: staff.branch }, JWT_SECRET, { expiresIn: '12h' });

//     // remove sensitive fields
//     const safeStaff = Object.assign({}, staff);
//     delete safeStaff.pin;

//     res.json({ success: true, staff: safeStaff, token });
//   } catch (error) {
//     console.error('Staff login error:', error);
//     res.status(500).json({ error: 'Failed to login staff' });
//   }
// });

// Admin: create staff member for a branch
      app.post('/api/staff', authenticateToken, async (req, res) => {
        try {
          if (!['admin', 'sub-admin'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
          const adminId = req.user.adminId;
          if (!adminId) return res.status(400).json({ error: 'adminId missing from token' });
          const { staffId, name, phone, email, role, pin = '1234', branch, workflowStages = [], skills = [] } = req.body || {};
          if (!staffId || !name || !branch) return res.status(400).json({ error: 'staffId, name and branch are required' });
          const sid = staffId.toString().trim();
          const valid = validateStaffIdFormat(sid);
          if (!valid.valid) return res.status(400).json({ error: valid.message });
          const db = firebaseIntegrationService.forClient(adminId);
          // Check uniqueness in Firestore
          const existing = await db.getCollection('staff', { where: [['staffId', '==', sid]], limit: 1 });
          if (existing?.data?.length > 0) return res.status(400).json({ error: 'Staff with this staffId already exists' });
          const staffDoc = { staffId: sid, name, phone: phone || '', email: email || '', role: role || 'staff',
            pin, branch, workflowStages, skills, isAvailable: true, adminId, createdAt: new Date() };
          await db.syncStaff(staffDoc);
          console.log(`✅ Staff created: ${name} (${sid}) for ${adminId}`);
            invalidateCache([`staff_list_${adminId}`]);
          res.json({ success: true, staff: staffDoc });
        } catch (error) {
          console.error('Create staff error:', error);
          res.status(500).json({ error: 'Failed to create staff' });
        }
      });

// Update staff (admin only) - supports changing staffId with validation
            app.put('/api/staff/:id', authenticateToken, async (req, res) => {
              try {
                if (!['admin', 'sub-admin'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
                const adminId = req.user.adminId;
                if (!adminId) return res.status(400).json({ error: 'adminId missing from token' });
                const update = { ...req.body, updatedAt: new Date() };
                if (update.staffId) {
                  const sid = update.staffId.toString().trim();
                  const valid = validateStaffIdFormat(sid);
                  if (!valid.valid) return res.status(400).json({ error: valid.message });
                  update.staffId = sid;
                }
                const db = firebaseIntegrationService.forClient(adminId);
                 await db.setDocument('staff', req.params.id, update);
                console.log(`✅ Staff updated: ${req.params.id} for ${adminId}`);
                invalidateCache([`staff_list_${adminId}`]);
                res.json({ success: true });
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
       const _custCacheKey = `customers_admin_${req.user.adminId}`;
    const _custCached = req.query.nocache !== '1' && getCache(_custCacheKey);
    if (_custCached) return res.json(_custCached);

    if ((!isMongoConnected() && firebaseIntegrationService.initialized) || firebaseIntegrationService.initialized) {
     const fbRes = await clientDB(req).getCollection('customers', { orderBy: { field: 'name', direction: 'asc' }, limit: 1000 });
      if (fbRes.success && Array.isArray(fbRes.data) && fbRes.data.length > 0) {
        const out = fbRes.data.map(c => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email || null,
          address: c.address || null,
          totalOrders: c.totalOrders || 0,
          totalSpent: c.totalSpent || 0,
          createdAt: c.createdAt && c.createdAt.toDate ? c.createdAt.toDate() : c.createdAt
        }));
         const _custResp = Array.isArray(out) ? out : out;
        setCache(_custCacheKey, { success: true, customers: out }, 5 * 60 * 1000);
       return res.json(_custResp);
      }
      // if Firestore returned empty or failed, fall through to Mongo if available
      if (!isMongoConnected()) {
        // no mongo either; return empty list instead of error
        return res.json({ success: true, customers: [] });
      }
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
    const _pubCustKey = `customers_public_${req.query.adminId||'all'}`;
    const _pubCustCached = getCache(_pubCustKey);
    if (_pubCustCached) return res.json(_pubCustCached);
    if ((!isMongoConnected() && firebaseIntegrationService.initialized) || firebaseIntegrationService.initialized) {
      const fbRes = await clientDB(req).getCollection('customers', { orderBy: { field: 'name', direction: 'asc' }, limit: 500 });
      if (fbRes.success && Array.isArray(fbRes.data)) {
        const out = fbRes.data.map(c => ({ name: c.name, phone: c.phone, totalOrders: c.totalOrders || 0 }));
        setCache(_pubCustKey, out, 5 * 60 * 1000);
        return res.json(out);
      }
      if (!isMongoConnected()) {
        return res.json([]);
      }
    }

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
    const _custKey2 = `customers_all_${req.query.adminId||'all'}`;
    const _custCached2 = getCache(_custKey2);
    if (_custCached2) return res.json(_custCached2);
    if ((!isMongoConnected() && firebaseIntegrationService.initialized) || firebaseIntegrationService.initialized) {
      const fbRes = await clientDB(req).getCollection('customers', { orderBy: { field: 'name', direction: 'asc' }, limit: 500 });
      if (fbRes.success && Array.isArray(fbRes.data)) {
        const _r = { success: true, customers: fbRes.data };
        setCache(_custKey2, _r, 5 * 60 * 1000);
        return res.json(_r);
      }
      if (!isMongoConnected()) {
        return res.json({ success: true, customers: [] });
      }
    }

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
    if (!['admin', 'super-admin', 'sub-admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    const adminId = req.user.adminId;
    if (!adminId) return res.status(400).json({ success: false, error: 'adminId missing from token' });
    const { branchName, location, phone, email, logo } = req.body;
    if (!branchName || !location) return res.status(400).json({ success: false, error: 'Branch name and location are required' });
    // Prefix from this client's adminId — not hardcoded SAPTHALA
    const prefix = adminId.toUpperCase().replace(/-/g, '.');
    const branchId = `${prefix}.${branchName.replace(/\s+/g, '').toUpperCase()}`;
    const db = firebaseIntegrationService.forClient(adminId);
    // Check uniqueness in subcollection
    const existing = await db.getCollection('branches', { where: [['branchId', '==', branchId]], limit: 1 });
    if (existing?.data?.length > 0) return res.status(400).json({ success: false, error: 'Branch already exists' });
    const branchDoc = { branchId, branchName, location, phone: phone || '', email: email || '', logo: logo || '', adminId, isActive: true, createdBy: req.user.username, createdAt: new Date().toISOString() };
    await db.setDocument('branches', branchId, branchDoc);
    // Auto-create staff for all workflow stages
    const settings = await getAppSettings({ req });
    if (settings?.workflowStages) {
      for (const stage of settings.workflowStages) {
        const staffId = `${branchId}_${stage.id}`;
        const exists = await db.getCollection('staff', { where: [['staffId', '==', staffId]], limit: 1 });
        if (!exists?.data?.length) {
          await db.setDocument('staff', staffId, { staffId, name: `${stage.name} (${branchName})`, phone: '9876543210', role: stage.name, pin: '1234', branch: branchId, workflowStages: [stage.id], skills: [], isAvailable: true, adminId, createdAt: new Date().toISOString() });
        }
      }
    }
    console.log(`✅ Branch created in subcollection: ${branchId} for ${adminId}`);
    invalidateCache(['branches_all', `public_branches_${adminId}`]);
    res.json({ success: true, branch: branchDoc });
  } catch (error) {
    console.error('Create branch error:', error);
    res.status(500).json({ success: false, error: 'Failed to create branch' });
  
  }  
});

// Get single branch by ID
app.get('/api/branches/:id', authenticateToken, async (req, res) => {
  try {
   const adminId = req.user.adminId;
    if (!adminId) return res.status(400).json({ success: false, error: 'adminId missing' });
    const db = firebaseIntegrationService.forClient(adminId);
    // Try doc ID first, then query by branchId field
    const snap = await db.getDocument('branches', req.params.id);
    if (snap.success && snap.data) return res.json({ success: true, branch: snap.data });
    const q = await db.getCollection('branches', { where: [['branchId', '==', req.params.id]], limit: 1 });
    if (!q.data?.length) return res.status(404).json({ success: false, error: 'Branch not found' });
    res.json({ success: true, branch: q.data[0] });
  } catch (error) {
    console.error('Get branch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch branch' });
  }
});

// Update branch
app.put('/api/branches/:id', authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'super-admin'].includes(req.user.role)) return res.status(403).json({ success: false, error: 'Access denied' });
    const adminId = req.user.adminId;
    if (!adminId) return res.status(400).json({ success: false, error: 'adminId missing' });
    const { branchName, location, phone, email, isActive, logo } = req.body;
    const db = firebaseIntegrationService.forClient(adminId);
    const update = { branchName, location, phone: phone || '', email: email || '', logo: logo || '', updatedAt: new Date().toISOString() };
    if (isActive !== undefined) update.isActive = isActive;
    await db.setDocument('branches', req.params.id, update);
    console.log(`✅ Branch updated in subcollection: ${req.params.id} for ${adminId}`);
    invalidateCache(['branches_all', `public_branches_${adminId}`]);
    res.json({ success: true, branch: { branchId: req.params.id, ...update } });
  } catch (error) {
    console.error('Update branch error:', error);
    res.status(500).json({ success: false, error: 'Failed to update branch' });
  } 
});

// Delete branch
app.delete('/api/branches/:id', authenticateToken, async (req, res) => {
   try {
    if (!['admin', 'super-admin'].includes(req.user.role)) return res.status(403).json({ success: false, error: 'Access denied' });
    const adminId = req.user.adminId;
    if (!adminId) return res.status(400).json({ success: false, error: 'adminId missing' });
    const db = firebaseIntegrationService.forClient(adminId);
    // Delete all staff in this branch from subcollection
    const staffRes = await db.getCollection('staff', { where: [['branch', '==', req.params.id]], limit: 200 });
    for (const s of (staffRes.data || [])) await db.deleteDocument('staff', s.id || s.staffId);
    await db.deleteDocument('branches', req.params.id);
    console.log(`✅ Branch + ${staffRes.data?.length || 0} staff deleted from subcollection: ${req.params.id}`);
    invalidateCache(['branches_all', `public_branches_${adminId}`]);
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

    const settings = await getAppSettings({ req });
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

// Dashboard stats (admin/sub-admin) — Firebase first, **MongoDB fallback** and clear dataSource
app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    let match = {};
    if (req.user.role === 'sub-admin') match.branch = req.user.branch;

    // Try Firebase when initialized
    if (firebaseIntegrationService && firebaseIntegrationService.initialized) {
      try {
        const filters = {};
        if (match.branch) filters.where = [['branch', '==', match.branch]];

        const result = await clientDB(req).getCollection('orders', filters);
        if (result.success) {
          const orders = result.data || [];
          const totalOrders = orders.length;
          const totalRevenue = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
          const advanceCollected = orders.reduce((s, o) => s + (o.advanceAmount || 0), 0);
          const pendingOrders = orders.filter(o => ['pending','in_progress'].includes(o.status)).length;

          // Server-side RBAC: redact revenue fields for sub-admins
          if (req.user && req.user.role === 'sub-admin') {
            return res.json({
              success: true,
              totalOrders,
              pendingOrders,
              dataSource: 'Firebase Firestore (real-time)',
              revenueRedacted: true
            });
          }

          return res.json({ success: true, totalOrders, totalRevenue, advanceCollected, pendingOrders, dataSource: 'Firebase Firestore (real-time)' });
        }
        // fall through to MongoDB when firebase fetch failed
        console.warn('⚠️ Firebase dashboard fetch failed — falling back to MongoDB:', result.error);
      } catch (fbErr) {
        console.warn('⚠️ Firebase dashboard fetch error — falling back to MongoDB:', fbErr && fbErr.message ? fbErr.message : fbErr);
      }
    }

    // MongoDB fallback (if available)
    if (typeof isMongoConnected === 'function' && isMongoConnected()) {
      const matchQuery = match.branch ? { branch: match.branch } : {};
      const orders = await Order.find(matchQuery).lean();
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
      const advanceCollected = orders.reduce((s, o) => s + (o.advanceAmount || 0), 0);
      const pendingOrders = orders.filter(o => ['pending','in_progress'].includes(o.status)).length;

      // Server-side RBAC: redact revenue fields for sub-admins
      if (req.user && req.user.role === 'sub-admin') {
        return res.json({ success: true, totalOrders, pendingOrders, dataSource: 'MongoDB (local)', revenueRedacted: true });
      }

      return res.json({ success: true, totalOrders, totalRevenue, advanceCollected, pendingOrders, dataSource: 'MongoDB (local)' });
    }

    // Degraded response when no DB available
    console.warn('⚠️ No database available for dashboard (Firestore not initialized, MongoDB not connected)');
    return res.status(503).json({ success: false, error: 'No database available', totalOrders: 0, totalRevenue: 0, advanceCollected: 0, pendingOrders: 0, dataSource: 'unavailable' });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
  }
});

// Reports: staff performance
app.get('/api/reports/staff-performance', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'sub-admin' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!firebaseIntegrationService || !firebaseIntegrationService.initialized) {
      return res.status(503).json({ success: false, error: 'Firebase not initialized' });
    }

    // ✅ Always get adminId — from JWT claim or query param
    const adminId = req.user.adminId || req.query.adminId || null;
    if (!adminId) {
      return res.status(400).json({ success: false, error: 'adminId is required. Ensure user doc has adminId field in Firestore.' });
    }
    // ✅ Force read from clients/{adminId}/staff subcollection
    const clientFirestore = firebaseIntegrationService.forClient(adminId);

    const { fromDate, toDate, branch } = req.query;

    // Build Firebase filters for orders collection
    const filters = { orderBy: { field: 'createdAt', direction: 'desc' } };
    const where = [];

    if (req.user.role === 'sub-admin') where.push(['branch', '==', req.user.branch]);
    else if (branch && branch.toLowerCase() !== 'all') where.push(['branch', '==', branch]);

    if (fromDate) where.push(['createdAt', '>=', new Date(fromDate)]);
    if (toDate) { const to = new Date(toDate); to.setHours(23,59,59,999); where.push(['createdAt', '<=', to]); }

    if (where.length) filters.where = where;

    // Fetch orders from Firebase
    const fbOrders = await clientFirestore.getCollection('orders', filters);
    if (!fbOrders.success) {
      console.error('❌ Firestore staff-performance orders fetch failed:', fbOrders.error);
      return res.status(500).json({ success: false, error: 'Failed to fetch orders from Firebase', details: fbOrders.error });
    }

    const orders = fbOrders.data || [];

    // Build per-staff stats from workflowTasks
    const stats = {};
    for (const order of orders) {
      const tasks = Array.isArray(order.workflowTasks) ? order.workflowTasks : [];
      for (const t of tasks) {
        if (!t.assignedTo && !t.assignedToName) continue;
        const key = (t.assignedTo && t.assignedTo.toString()) || t.assignedToName || 'unassigned';
        if (!stats[key]) {
          stats[key] = { staffIdentifier: key, staffName: t.assignedToName || key, tasksCompleted: 0, totalTime: 0 };
        }
        if (t.status === 'completed') {
          stats[key].tasksCompleted += 1;
          stats[key].totalTime += (t.timeSpent || 0);
        }
      }
    }

    // Fetch staff from Firebase to enrich name/phone/role
    const staffFilters = {};
    if (req.user.role === 'sub-admin') staffFilters.where = [['branch', '==', req.user.branch]];
    else if (branch && branch.toLowerCase() !== 'all') staffFilters.where = [['branch', '==', branch]];

    const fbStaff = await clientFirestore.getCollection('staff', staffFilters);
    const staffList = fbStaff.success ? (fbStaff.data || []) : [];

    // Build lookup map by staffId and by name
    const staffMap = {};
    staffList.forEach(s => {
      if (s.staffId) staffMap[s.staffId] = s;
      if (s.name)    staffMap[s.name]    = staffMap[s.name] || s;
    });

    const out = Object.values(stats).map(s => {
      const doc = staffMap[s.staffIdentifier] || staffMap[s.staffName] || null;
      const avgTime = s.tasksCompleted > 0 ? Math.round(s.totalTime / s.tasksCompleted) : 0;
      return {
        staffId:            doc ? (doc.staffId || s.staffIdentifier) : s.staffIdentifier,
        staffName:          doc ? (doc.name    || s.staffName)       : s.staffName,
        phone:              doc ? (doc.phone   || null)              : null,
        role:               doc ? (doc.role    || null)              : null,
        branch:             doc ? (doc.branch  || null)              : null,
        tasksCompleted:     s.tasksCompleted,
        averageTimePerTask: avgTime
      };
    });

    res.json({ success: true, reports: out, dataSource: 'Firebase Firestore' });

  } catch (error) {
    console.error('❌ Staff performance report error:', error);
    res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

                          app.get('/api/reports/orders', authenticateToken, async (req, res) => {
                            try {
                              if (req.user.role !== 'sub-admin' && req.user.role !== 'admin') {
                                return res.status(403).json({ error: 'Access denied' });
                              }

                              const { fromDate, toDate, branch, filterBy, q } = req.query;

                              if (!firebaseIntegrationService || !firebaseIntegrationService.initialized) {
                                return res.status(503).json({ success: false, error: 'Firebase not initialized' });
                              }

                              const filters = { orderBy: { field: 'createdAt', direction: 'desc' }, limit: 500 };
                              const where = [];

                              // Branch
                              if (req.user.role === 'sub-admin') where.push(['branch', '==', req.user.branch]);
                              else if (branch && branch.toLowerCase() !== 'all') where.push(['branch', '==', branch]);

                              // Date
                              if (fromDate) where.push(['createdAt', '>=', new Date(fromDate)]);
                              if (toDate) { const to = new Date(toDate); to.setHours(23,59,59,999); where.push(['createdAt', '<=', to]); }

                              if (where.length) filters.where = where;

                              const fbRes = await clientDB(req).getCollection('orders', filters);

                              if (!fbRes.success) {
                                console.error('❌ Firestore reports/orders failed:', fbRes.error);
                                return res.status(500).json({ success: false, error: 'Failed to fetch orders from Firebase', details: fbRes.error });
                              }

                              let orders = fbRes.data || [];

                              // Client-side filters (Firestore can't query nested/text fields)
                              if (filterBy && q && q.trim()) {
                                const sv = q.trim().toLowerCase();
                                orders = orders.filter(o => {
                                  switch (filterBy.toLowerCase()) {
                                    case 'customer': return (o.customerName || '').toLowerCase().includes(sv);
                                    case 'phone':    return (o.customerPhone || '').includes(q.trim());
                                    case 'orderid':  return (o.orderId || '').toLowerCase() === sv;
                                    case 'staff':    return (o.workflowTasks || []).some(t => (t.assignedToName || '').toLowerCase().includes(sv));
                                    default:         return true;
                                  }
                                });
                              }

                              // Format
                              const formatted = orders.map(o => {
                                const tasks = Array.isArray(o.workflowTasks) ? o.workflowTasks : [];
                                const totalTasks = tasks.length;
                                const completedTasks = tasks.filter(t => t.status === 'completed').length;
                                const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                                const seenStaff = new Set();
                                const assignedStaff = [];
                                tasks.forEach(t => {
                                  const name = t.assignedToName || '';
                                  if (name && !seenStaff.has(name)) { seenStaff.add(name); assignedStaff.push({ name, stage: t.stageName || '' }); }
                                });

                                return {
                                  orderId:         o.orderId || o.id || '',
                                  createdAt:       o.createdAt && o.createdAt.toDate ? o.createdAt.toDate() : o.createdAt,
                                  customerName:    o.customerName    || '',
                                  customerPhone:   o.customerPhone   || '',
                                  customerAddress: o.customerAddress || '',
                                  garmentType:     o.garmentType     || '',
                                  totalAmount:     o.totalAmount     || 0,
                                  advanceAmount:   o.advanceAmount   || 0,
                                  balanceAmount:   o.balanceAmount   || 0,
                                  status:          o.status          || 'pending',
                                  branch:          o.branch          || '',
                                  deliveryDate:    o.deliveryDate     || null,
                                  totalTasks,
                                  completedTasks,
                                  progress,
                                  assignedStaff,
                                  workflowTasks: tasks
                                };
                              });

                              // Sub-admin: redact revenue fields
                              if (req.user.role === 'sub-admin') {
                                const redacted = formatted.map(o => {
                                  const c = { ...o };
                                  delete c.totalAmount;
                                  delete c.advanceAmount;
                                  delete c.balanceAmount;
                                  return c;
                                });
                                return res.json({ success: true, orders: redacted, dataSource: 'Firebase Firestore', revenueRedacted: true });
                              }

                              res.json({ success: true, orders: formatted, dataSource: 'Firebase Firestore' });

                            } catch (error) {
                              console.error('❌ Reports orders error:', error);
                              res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
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
    
    // Prefer Firestore when available
    if (firebaseIntegrationService && firebaseIntegrationService.initialized) {
      try {
        const filters = { where: [], orderBy: { field: 'createdAt', direction: 'desc' }, limit: parseInt(limit) };
        if (req.user.role === 'sub-admin') filters.where.push(['branch', '==', req.user.branch]);
        else if (branch) filters.where.push(['branch', '==', branch]);

        const fbRes = await clientDB(req).getCollection('orders', filters);
        if (fbRes.success) {
          const fbOrders = Array.isArray(fbRes.data) ? fbRes.data : [];

          const totalAmount = fbOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
          const totalAdvance = fbOrders.reduce((sum, order) => sum + (order.advanceAmount || 0), 0);
          const totalBalance = totalAmount - totalAdvance;

          const formattedOrders = fbOrders.map(order => {
            const tasks = Array.isArray(order.workflowTasks) ? order.workflowTasks : [];
            const completedTasks = tasks.filter(t => t.status === 'completed').length;
            const totalTasks = tasks.length;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            return {
              orderId: order.orderId || order.id,
              customerName: order.customerName || '',
              customerPhone: order.customerPhone || '',
              garmentType: order.garmentType || '',
              totalAmount: order.totalAmount || 0,
              advanceAmount: order.advanceAmount || 0,
              balanceAmount: (order.totalAmount || 0) - (order.advanceAmount || 0),
              status: order.status || '',
              progress: `${progress}%`,
              createdAt: order.createdAt && order.createdAt.toDate ? order.createdAt.toDate() : order.createdAt,
              deliveryDate: order.deliveryDate && order.deliveryDate.toDate ? order.deliveryDate.toDate() : order.deliveryDate,
              trialDate: order.trialDate && order.trialDate.toDate ? order.trialDate.toDate() : order.trialDate,
              branch: order.branch || ''
            };
          });

          // Redact revenue for sub-admins
          if (req.user.role === 'sub-admin') {
            const redactedOrders = formattedOrders.map(o => { const c = { ...o }; delete c.totalAmount; delete c.advanceAmount; delete c.balanceAmount; return c; });
            return res.json({ success: true, orders: redactedOrders, summary: { totalOrders: formattedOrders.length }, dataSource: 'Firebase Firestore (real-time)', revenueRedacted: true });
          }

          return res.json({ success: true, orders: formattedOrders, summary: { totalOrders: fbOrders.length, totalAmount, totalAdvance, totalBalance, averageOrderValue: fbOrders.length > 0 ? Math.round(totalAmount / fbOrders.length) : 0 }, dataSource: 'Firebase Firestore (real-time)' });
        }
      } catch (e) {
        console.warn('⚠️ Firestore last-orders fetch failed — falling back to MongoDB:', e.message || e);
      }
    }

    // Fallback to MongoDB
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

    if (req.user.role === 'sub-admin') {
      const redacted = formattedOrders.map(o => { const copy = { ...o }; delete copy.totalAmount; delete copy.advanceAmount; delete copy.balanceAmount; return copy; });
      return res.json({ success: true, orders: redacted, summary: { totalOrders: formattedOrders.length }, dataSource: 'MongoDB (local)', revenueRedacted: true });
    }
    
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
// Accepts query params: branch, overdue=true, customerPhone, orderId (all optional; branch auto-set for sub-admins)
app.get('/api/admin/orders', authenticateToken, async (req, res) => {
  try {
    const branch = req.query.branch || (req.user.role === 'sub-admin' ? req.user.branch : null);
    const overdueFlag = req.query.overdue === 'true';
    
    // Try Firebase first if initialized
    let orders = [];
    let source = 'unknown';
    
    if (firebaseIntegrationService && firebaseIntegrationService.initialized) {
      // build filters for firestore
      const filters = { orderBy: { field: 'createdAt', direction: 'desc' }, limit: 1000 };
      // apply branch restriction to firestore as well
      if (branch) {
        filters.where = filters.where || [];
        filters.where.push(['branch', '==', branch]);
      }
      if (overdueFlag) {
        // orders with deliveryDate less than now and pending/not yet completed
        filters.where = filters.where || [];
        filters.where.push(['deliveryDate', '<', new Date()]);
        // we can also filter by status using 'in' which is compatible with a range query
        filters.where.push(['status', 'in', ['pending','assigned','in_progress']]);
      }
      if (req.query.customerPhone) {
        filters.where = filters.where || [];
        filters.where.push(['customerPhone', '==', req.query.customerPhone]);
      }
      if (req.query.orderId) {
        filters.where = filters.where || [];
        filters.where.push(['orderId', '==', req.query.orderId]);
      }
      const fbRes = await clientDB(req).getCollection('orders', filters);
      if (fbRes.success) {
        const fbOrders = Array.isArray(fbRes.data) ? fbRes.data : [];
        if (fbOrders.length > 0) {
          orders = fbOrders.map(o => ({
            _id: o.id,
            orderId: o.orderId || o.id,
            customerName: o.customerName || '',
            customerPhone: o.customerPhone || '',
            customerAddress: o.customerAddress || '',
            garmentType: o.garmentType || '',
            totalAmount: o.totalAmount || 0,
            advanceAmount: o.advanceAmount || 0,
            status: o.status || '',
            createdAt: o.createdAt && o.createdAt.toDate ? o.createdAt.toDate() : o.createdAt,
            deliveryDate: o.deliveryDate && o.deliveryDate.toDate ? o.deliveryDate.toDate() : o.deliveryDate,
           trialDate: o.trialDate && o.trialDate.toDate ? o.trialDate.toDate() : o.trialDate,
            branch: o.branch || '',
            workflowTasks: o.workflowTasks || []
          }));
          source = 'firebase';
        } else {
          source = 'mongodb';
        }
      } else {
        console.warn('⚠️ Firebase orders fetch failed:', fbRes.error);
        source = 'mongodb';
      }
    } else {
      source = 'mongodb';
    }
    
    // If Firebase fetch failed or no orders, use MongoDB as fallback
    if (orders.length === 0 || source === 'mongodb') {
      let matchQuery = {};
      if (branch) {
        matchQuery.branch = branch;
      }
      if (overdueFlag) {
        matchQuery.deliveryDate = { $lt: new Date() };
        matchQuery.status = { $in: ['pending','assigned','in_progress'] };
      }
      // support additional query parameters sent from client
      if (req.query.customerPhone) {
        matchQuery.customerPhone = req.query.customerPhone;
      }
      if (req.query.orderId) {
        // exact match on orderId (e.g. ORD-123)
        matchQuery.orderId = req.query.orderId;
      }

      const mongoOrders = await Order.find(matchQuery)
        .sort({ createdAt: -1 })
        .select('orderId customerName customerPhone customerAddress garmentType totalAmount advanceAmount status createdAt deliveryDate trialDate workflowTasks branch');
      
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
        trialDate: order.trialDate || null,
        branch: order.branch,
        workflowTasks: order.workflowTasks || []
      }));
      
      source = 'mongodb';
    }

   
      // Sub-admins can see per-order payment details (total, advance, balance)
    // but the dashboard aggregate revenue cards are hidden in the frontend
    // if (req.user && req.user.role === 'sub-admin') {
    //   const redacted = orders.map(o => { const c = { ...o }; delete c.totalAmount; delete c.advanceAmount; delete c.balanceAmount; return c; });
    //   return res.json(redacted);
    // }

    // attach overdue flag for convenience
    if (overdueFlag) {
      orders = orders.map(o => ({ ...o, overdue: true }));
    }

    res.json(orders);
  } catch (error) {
    console.error('Get admin orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});
           app.get('/api/admin/notifications', authenticateToken, async (req, res) => {
              try {
                  const isSubAdmin = req.user.role === 'sub-admin';
                  const myBranch = (req.user.branch || '').toString().trim();
                  // All notifications are stored under adminId — sub-admins share the same adminId
                  const cacheKey = isSubAdmin
                      ? `notifs_sub_${req.user.username}`
                      : `notifs_${req.user.adminId}`;
                  const cached = getCache(cacheKey);
                  if (cached) return res.json(cached);

                  const db = firebaseIntegrationService.forClient(req.user.adminId);
                  const result = await db.getCollection('notifications', {
                      where: [['adminId', '==', req.user.adminId]],
                      limit: 50
                  });

                  let notifications = (result.data || [])
                      .filter(n => n.data?.type === 'order_complete'); // only completed orders

                  // Sub-admins: only see notifications for their branch
                  if (isSubAdmin && myBranch) {
                      notifications = notifications.filter(n => {
                          const nb = (n.branch || n.data?.branch || '').toString().trim();
                          return nb === myBranch;
                      });
                  }

                  notifications.sort((a, b) => {
                      const ta = a.createdAt?._seconds || new Date(a.createdAt || 0).getTime() / 1000;
                      const tb = b.createdAt?._seconds || new Date(b.createdAt || 0).getTime() / 1000;
                      return tb - ta;
                  });

                  const resp = { notifications };
                  setCache(cacheKey, resp, 60 * 1000); // 1 min cache — keep fresh
                  res.json(resp);
              } catch(err) { res.status(500).json({ error: err.message }); }
          });
          
          app.get('/api/admin/notifications/stream', authenticateToken, (req, res) => {
            const adminId = req.user && (req.user.role === 'sub-admin' ? req.user.username : (req.user.adminId || req.user.username));
            if (!adminId) return res.status(400).end();
            console.log(`📡 SSE register: ${adminId} role=${req.user.role} branch=${req.user.branch || 'none'}`);
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('X-Accel-Buffering', 'no');
            res.flushHeaders();
            if (!_sseClients.has(adminId)) _sseClients.set(adminId, new Set());
            _sseClients.get(adminId).add(res);
            console.log(`📡 SSE connected: ${adminId} (${_sseClients.get(adminId).size} clients)`);
            const heartbeat = setInterval(() => {
                try { res.write(': heartbeat\n\n'); } catch(e) { clearInterval(heartbeat); }
            }, 25000);
            req.on('close', () => {
                clearInterval(heartbeat);
                _sseClients.get(adminId)?.delete(res);
                console.log(`📡 SSE disconnected: ${adminId}`);
            });
        });

           // Mark one read
            app.put('/api/admin/notifications/:id/read', authenticateToken, async (req, res) => {
                try {
                    const db = firebaseIntegrationService.forClient(req.user.adminId);
                    await db.updateDocument('notifications', req.params.id, { read: true });
                    invalidateCache([`notifs_${req.user.adminId}`, `notifs_sub_${req.user.username}`]);
                    res.json({ success: true });
                } catch(err) { res.status(500).json({ error: err.message }); }
            });

            // WhatsApp sent — update doc + push real-time to admin AND all connected sub-admin SSE channels
            app.put('/api/admin/notifications/:id/whatsapp-sent', authenticateToken, async (req, res) => {
                try {
                    const sentBy = req.user.role === 'sub-admin' ? req.user.username : req.user.adminId;
                    const _db = firebaseIntegrationService.forClient(req.user.adminId);
                    await _db.updateDocument('notifications', req.params.id, {
                        whatsappSent: true,
                        whatsappSentAt: new Date(),
                        whatsappSentBy: sentBy
                    });
                    // Bust cache for admin + sub-admins
                    invalidateCache([`notifs_${req.user.adminId}`, `notifs_sub_`]);
                    // Push real-time update to admin AND all connected SSE clients for this boutique
                    const ssePayload = { type: 'notification', event: 'whatsapp_sent', notifId: req.params.id, sentBy };
                    _ssePush(req.user.adminId, ssePayload);
                    for (const [key] of _sseClients) {
                        if (key !== req.user.adminId && _sseClients.get(key)?.size > 0) {
                            _ssePush(key, ssePayload);
                        }
                    }
                    res.json({ success: true });
                } catch(e) { res.status(500).json({ success: false }); }
            });

            // Mark all read
            app.put('/api/admin/notifications/read-all', authenticateToken, async (req, res) => {
                try {
                    const db = firebaseIntegrationService.forClient(req.user.adminId);
                    const result = await db.getCollection('notifications', {
                        where: [['adminId', '==', req.user.adminId], ['read', '==', false]]
                    });
                    await Promise.all((result.data || []).map(n =>
                        db.updateDocument('notifications', n.id, { read: true })
                    ));
                    invalidateCache([`notifs_${req.user.adminId}`, `notifs_sub_${req.user.username}`]);
                    res.json({ success: true });
                } catch(err) { res.status(500).json({ error: err.message }); }
            });

            // Delete notification
            app.delete('/api/admin/notifications/:id', authenticateToken, async (req, res) => {
                try {
                    const db = firebaseIntegrationService.forClient(req.user.adminId);
                    await db.deleteDocument('notifications', req.params.id);
                    invalidateCache([`notifs_${req.user.adminId}`, `notifs_sub_${req.user.username}`]);
                    res.json({ success: true });
                } catch(err) { res.status(500).json({ error: err.message }); }
            });
// Get single order with full timeline
app.get('/api/admin/orders/:orderId', authenticateToken, async (req, res) => {
  try {
    const param = req.params.orderId;
    let order = null;

    // If Mongo is connected, try using it
    if (isMongoConnected()) {
      // Try to resolve by Mongo _id first
      if (param && /^[0-9a-fA-F]{24}$/.test(param)) {
        order = await Order.findById(param);
      }

      // If not found by _id, try lookup by orderId (e.g., ORD-123...)
      if (!order) {
        order = await Order.findOne({ orderId: param });
      }
    }

    // Firestore fallback when we still have no order and Firebase initialized
    if (!order && firebaseIntegrationService.initialized) {
      let fbRes;
      // attempt by document id first
      try {
        fbRes = await clientDB(req).getDocument('orders', param);
      } catch (e) {
        fbRes = null;
      }
      if (fbRes && fbRes.success && fbRes.data) {
        order = fbRes.data;
      } else {
        // fallback to query by orderId field
        const queryRes = await clientDB(req).getCollection('orders', { where: [['orderId', '==', param]], limit: 1 });
        if (queryRes.success && Array.isArray(queryRes.data) && queryRes.data.length > 0) {
          order = queryRes.data[0];
        }
      }
    }

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // normalize Firestore order if needed
    if (order && !order._id && order.id) {
      order._id = order.id;
    }
    // Firestore timestamps -> JS Date
    if (order && order.createdAt && order.createdAt.toDate) {
      order.createdAt = order.createdAt.toDate();
    }
     if (order && order.deliveryDate && order.deliveryDate.toDate) {
      order.deliveryDate = order.deliveryDate.toDate();
    }
    if (order && order.trialDate && order.trialDate.toDate) {
      order.trialDate = order.trialDate.toDate();
    }

    // RBAC: sub-admins can only view orders from their branch
    if (req.user && req.user.role === 'sub-admin' && order.branch !== req.user.branch) {
      return res.status(403).json({ error: 'Access denied. Order belongs to a different branch.' });
    }

    // Prepare response
    const response = {
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
      trialDate: order.trialDate || null,
      measurements: order.measurements || {},
      designNotes: order.designNotes || '',
      designImages: order.designImages || [],
      workflowTasks: order.workflowTasks || [],
      // new fields
      addons: order.addons || [],
      paymentMode: order.paymentMode || '',
      paymentRemarks: order.paymentRemarks || '',
      stageTimeLimits: order.stageTimeLimits || {}
    };

    // Redact revenue fields for sub-admins
    if (req.user && req.user.role === 'sub-admin') {
      delete response.totalAmount;
      delete response.advanceAmount;
      delete response.balanceAmount;
      response.revenueRedacted = true;
    }

    res.json(response);
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

                  // Update order with RBAC checks
                  app.put('/api/admin/orders/:id', authenticateToken, async (req, res) => {
                    try {
                      const orderId = req.params.id;

                      if (req.user.role !== 'admin' && req.user.role !== 'sub-admin') {
                        return res.status(403).json({ error: 'Access denied' });
                      }

                      if (!firebaseIntegrationService || !firebaseIntegrationService.initialized) {
                        return res.status(503).json({ error: 'Firebase not available' });
                      }

                     const fb = await clientDB(req).getCollection('orders', {
                        where: [['orderId', '==', orderId]]
                      });
                      const existing = fb.success && fb.data && fb.data.length > 0 ? fb.data[0] : null;
                      if (!existing) return res.status(404).json({ error: 'Order not found' });

                      const docId = existing.id || existing._id || orderId;

                      // Safely merge measurements — never wipe existing values with empty object
                      const incomingMeasurements = req.body.measurements || {};
                      const existingMeasurements = existing.measurements || {};
                      const safeMeasurements = Object.keys(incomingMeasurements).length > 0
                        ? { ...existingMeasurements, ...incomingMeasurements }
                        : existingMeasurements;

                      // Handle workflowTasks from selectedWorkflowStages
                      let workflowTasks = existing.workflowTasks || [];
                      if (Array.isArray(req.body.selectedWorkflowStages)) {
                        const stageNames = {
                           'dyeing': 'Dyeing',
                          'cutting': 'Cutting', 'stitching': 'Stitching','khakha':'Khakha', 'maggam': 'Maggam Work',
                          'painting': 'Painting', 'finishing': 'Finishing',
                          'quality-check': 'Quality Check', 'ready-to-deliver': 'Ready to Deliver'
                        };
                        workflowTasks = req.body.selectedWorkflowStages.map(sid => {
                          const ex = (existing.workflowTasks || []).find(t => t.stageId === sid);
                          return ex || { stageId: sid, stageName: stageNames[sid] || sid, status: 'waiting', createdAt: new Date() };
                        });
                      }

                     const { selectedWorkflowStages, measurements, ...restBody } = req.body;
                    const merged = {
                        ...existing,
                        ...restBody,
                        measurements: safeMeasurements,
                        workflowTasks,
                        deliveryDate: restBody.deliveryDate ? new Date(restBody.deliveryDate) : existing.deliveryDate,
                        trialDate: restBody.trialDate ? new Date(restBody.trialDate) : (existing.trialDate || null),
                        updatedAt: new Date()
                    };

                      await clientDB(req).setDocument('orders', docId, merged);
                      console.log(`✅ Order updated in Firestore: ${orderId}`);
                      invalidateCache(['orders_list_', 'public_orders_']);
                      res.json({ success: true, order: merged });

                    } catch (error) {
                      console.error('Update order error:', error);
                      res.status(500).json({ error: 'Failed to update order' });
                    }
                  });
// Sync customer changes to orders
// Supports both new payload ({ id, name, phone, address, oldPhone })
// and legacy ({ customerId, customerData }) format for backward compatibility.
app.post('/api/admin/orders/sync-customer', authenticateToken, async (req, res) => {
  try {
    // normalize request body values
    const customerId = req.body.customerId || req.body.id;
    let customerData = req.body.customerData;
    if (!customerData) {
      customerData = {};
      if (req.body.name) customerData.name = req.body.name;
      if (req.body.phone) customerData.phone = req.body.phone;
      if (req.body.address) customerData.address = req.body.address;
    }
    const oldPhoneFromRequest = req.body.oldPhone;

    if (!customerId || Object.keys(customerData).length === 0) {
      return res.status(400).json({ success: false, error: 'customerId and customerData required' });
    }

    // look up the customer so we can determine existing phone
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    // construct phone filter list (old + new values)
    const phoneFilter = [];
    if (oldPhoneFromRequest) phoneFilter.push(oldPhoneFromRequest);
    if (customerData.phone) phoneFilter.push(customerData.phone);
    // if no phone info provided, fall back to the stored number
    if (phoneFilter.length === 0 && customer.phone) phoneFilter.push(customer.phone);

    const uniquePhones = [...new Set(phoneFilter)];
    const filterQuery = uniquePhones.length === 1
      ? { customerPhone: uniquePhones[0] }
      : { customerPhone: { $in: uniquePhones } };

    // prepare updates
    const updateFields = {};
    if (customerData.name) updateFields.customerName = customerData.name;
    if (customerData.phone) updateFields.customerPhone = customerData.phone;
    if (customerData.address) updateFields.customerAddress = customerData.address;

    const result = await Order.updateMany(filterQuery, { $set: updateFields });

    // sync Firestore orders as well
    if (firebaseIntegrationService.initialized) {
      try {
        // we may need to run multiple small queries since Firestore has limited support
        const phoneClauses = uniquePhones.map(ph => ['customerPhone', '==', ph]);
        for (const clause of phoneClauses) {
          const fbOrders = await clientDB(req).getCollection('orders', { where: [clause] });
          if (fbOrders.success && fbOrders.data) {
            for (const order of fbOrders.data) {
              await clientDB(req).setDocument('orders', order.id, {
                ...order,
                ...updateFields
              });
            }
          }
        }
      } catch (e) {
        console.warn('Firestore sync warning:', e.message);
      }
    }

    res.json({ 
      success: true,
      message: `Updated ${result.modifiedCount || result.n || 0} orders`,
      modifiedCount: result.modifiedCount || result.n || 0
    });
  } catch (error) {
    console.error('Sync customer to orders error:', error);
    res.status(500).json({ success: false, error: 'Failed to sync customer changes' });
  }
});

                    // Get single customer by ID
                      app.get('/api/admin/customers/:id', authenticateToken, async (req, res) => {
                        try {
                          const id = req.params.id;
                          let customer = null;

                          // Try Firestore first — search by phone
                          if (firebaseIntegrationService && firebaseIntegrationService.initialized) {
                            try {
                               const fb = await clientDB(req).getCollection('customers', {
                                where: [['phone', '==', id]]
                              });
                              if (fb.success && fb.data && fb.data.length > 0) customer = fb.data[0];
                            } catch(e) {}
                          }

                           
                          if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });
                          res.json({ success: true, customer });
                        } catch (error) {
                          console.error('Get customer error:', error);
                          res.status(500).json({ success: false, error: 'Failed to fetch customer' });
                        }
                      });

// Update customer with RBAC checks
app.put('/api/admin/customers/:id', authenticateToken, async (req, res) => {
  try {
    const customerId = req.params.id;
    const updateData = req.body;
    
    // If Mongo is disconnected but Firestore is available, perform update there.
    if (!isMongoConnected() && firebaseIntegrationService.initialized) {
      // RBAC checks are skipped for fallback - assume admin
      const fbCustomer = await clientDB(req).getDocument('customers', customerId);
      if (!fbCustomer || !fbCustomer.success) {
        return res.status(404).json({ error: 'Customer not found in firestore' });
      }

      // capture old values so we can propagate changes to orders as well
      const oldPhone = fbCustomer.data.phone;
      const oldName = fbCustomer.data.name;

      // propagate customer change to Firestore
      await clientDB(req).setDocument('customers', customerId, { ...fbCustomer.data, ...updateData });

      // if phone or name changed, update matching orders in Firestore too
      try {
        const changes = {};
        if (updateData.phone && updateData.phone !== oldPhone) {
          changes.customerPhone = updateData.phone;
        }
        if (updateData.name && updateData.name !== oldName) {
          changes.customerName = updateData.name;
        }
        if (Object.keys(changes).length > 0 && oldPhone) {
           const orderList = await clientDB(req).getCollection('orders', { where: [['customerPhone', '==', oldPhone]] });
          if (orderList && orderList.success && Array.isArray(orderList.data)) {
            for (const o of orderList.data) {
              const docId = o.id || o._id || o.orderId;
              if (!docId) continue;
              try {
                await clientDB(req).setDocument('orders', docId, { ...o, ...changes });
              } catch (e) {
                console.warn('Failed to propagate customer update to order', docId, e.message || e);
              }
            }
          }
        }
      } catch (propErr) {
        console.warn('Firestore customer-to-order propagation error:', propErr && propErr.message ? propErr.message : propErr);
      }
      invalidateCache([`customers_admin_`, `customers_public_`, `customers_all_`]);
      return res.json({ success: true, customer: { id: customerId, ...updateData } });
    }

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
    
    // propagate changes to orders if phone or name changed
    try {
      const changes = {};
      if (updateData.phone && updateData.phone !== customer.phone) {
        changes.customerPhone = updateData.phone;
      }
      if (updateData.name && updateData.name !== customer.name) {
        changes.customerName = updateData.name;
      }
      if (Object.keys(changes).length > 0) {
        await Order.updateMany({ customerPhone: customer.phone }, { $set: changes });
        console.log(`✅ Propagated customer update to orders for phone ${customer.phone}`);
      }
    } catch (propErr) {
      console.warn('Failed to propagate customer update to orders:', propErr.message || propErr);
    }

    // also mirror to Firestore if available
    if (firebaseIntegrationService.initialized) {
     await clientDB(req).setDocument('customers', customerId, { ...updatedCustomer.toObject() });
    }
     invalidateCache([`customers_admin_`, `customers_public_`, `customers_all_`, 'orders_list_']);
    res.json({ success: true, customer: updatedCustomer });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Enhanced Order Creation with Data Flow Service
let orderCreationInProgress = false;

app.post('/api/orders', authenticateToken, async (req, res) => {

  try {
    if (orderCreationInProgress) {
      console.log('⚠️ Order creation already in progress, rejecting duplicate request');
      return res.status(429).json({ error: 'Order creation in progress, please wait' });
    }
    
    orderCreationInProgress = true;
    
    console.log('📥 Received order request');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // Validate required fields
    // Support both single order and array of orders
          const isMultiple = Array.isArray(req.body.orders);
          const orderList = isMultiple ? req.body.orders : [req.body];

          if (!isMultiple && (!req.body.customer?.name || !req.body.customer?.phone || !req.body.garmentType)) {
            orderCreationInProgress = false;
            return res.status(400).json({ success: false, error: 'Customer name, phone, and garment type are required' });
          }

          if (isMultiple && orderList.length === 0) {
            orderCreationInProgress = false;
            return res.status(400).json({ success: false, error: 'orders array is empty' });
          }

          // Process all orders in loop
          const groupId = isMultiple ? `GRP-${Date.now()}` : null;
           const results = [];
          let lastOrderData = null;
          for (let _i = 0; _i < orderList.length; _i++) {
            req.body = { ...orderList[_i], linkedOrderGroup: groupId || orderList[_i].linkedOrderGroup };
            // ---- rest of single order logic runs below for each item ----
    
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
      trialDate: req.body.trialDate ? new Date(req.body.trialDate) : null,
      branch: req.body.branch || 'SAPTHALA.MAIN',
      status: 'pending',
      currentStage: null, // will be set after determining workflow
      workflowTasks: [],
      designNotes: req.body.designNotes || '',
      designImages: Array.isArray(req.body.designImages) ? req.body.designImages.map(img => {
        if (typeof img === 'string') return img;
        if (img && img.name) return img.name;
        return '';
      }).filter(Boolean) : [],
      addons: Array.isArray(req.body.addons) ? req.body.addons.map(a => typeof a === 'object' ? a : { name: String(a) }) : [],
      paymentMode: req.body.paymentMode || '',
      paymentRemarks: req.body.paymentRemarks || '',
      stageTimeLimits: req.body.stageTimeLimits || {},
      selectedWorkflowStages: Array.isArray(req.body.workflow) ? req.body.workflow : [],
      adminId: req.user?.adminId || null,

    };

    console.log('💾 Creating order:', orderData.orderId);
    console.log('Order data:', JSON.stringify(orderData, null, 2));

    // Prefer reading workflowStages from Firestore when available, otherwise
    // fall back to MongoDB Settings or use a safe default.
     let settings = null;
    try {
      settings = await getAppSettings({ req }); // uses 30-min cache, zero extra Firestore reads
    } catch (e) {
      console.warn('⚠️ Failed to read settings:', e.message || e);
    }

    // Mongo fallback only when connected
    if (!settings && typeof isMongoConnected === 'function' && isMongoConnected()) {
      try {
        settings = await Settings.findOne();
      } catch (e) {
        console.warn('⚠️ Failed to read settings from MongoDB:', e.message || e);
      }
    }

    // Final fallback default: if settings are missing, use an in-memory default
    if (!settings || !settings.workflowStages || settings.workflowStages.length === 0) {
      console.warn('⚠️ No workflow stages found in settings (Firestore or Mongo). Using built-in default workflow.');
      settings = {
        workflowStages: [
          { id: 'dyeing', name: 'Dyeing', icon: '🎨', order: 1 },
          { id: 'cutting', name: 'Cutting', icon: '✂️', order: 2 },
          { id: 'stitching', name: 'Stitching', icon: '🧵', order: 3 },
          { id: 'khakha', name: 'Khakha', icon: '📐', order: 4 },
          { id: 'maggam', name: 'Maggam Work', icon: '🪡', order: 5 },
          { id: 'painting', name: 'Painting', icon: '🖌️', order: 6 },
          { id: 'finishing', name: 'Finishing', icon: '✨', order: 7 },
          { id: 'quality-check', name: 'Quality Check', icon: '🔍', order: 8 },
          { id: 'ready-to-deliver', name: 'Ready to Deliver', icon: '🚚', order: 9 }
        ]
      };

      // Try to persist default settings to Firestore (best-effort)
      if (firebaseIntegrationService && firebaseIntegrationService.initialized) {
        try {
          await clientDB(req).setDocument('settings', 'default', { workflowStages: settings.workflowStages });
          console.log('✅ Default workflow seeded to Firestore (document: settings/default)');
        } catch (seedErr) {
          console.warn('⚠️ Could not seed default workflow to Firestore:', seedErr && seedErr.message ? seedErr.message : seedErr);
        }
      }
    }

    console.log(`✅ Found ${settings.workflowStages.length} workflow stages`);

    // Use requested stages or default workflow (excluding measurements-design)
                     let requestedStages = Array.isArray(req.body.workflow) ? req.body.workflow : [];
                    if (requestedStages.length === 0) {
                      requestedStages = (settings.workflowStages || []).map(s => s.id);
                      console.log('No workflow specified, using all settings stages:', requestedStages);
                    }
                    // Set currentStage to the actual first stage in the selected workflow
                    orderData.currentStage = requestedStages[0] || 'dyeing';
                    orderData.selectedWorkflowStages = requestedStages;
    console.log('Creating tasks for stages:', requestedStages);

                      // Create workflow tasks
                  requestedStages.forEach((stageId, index) => {
                        const stageConfig = settings.workflowStages.find(s => s.id === stageId);
                        if (stageConfig) {
                          const timeLimitData = (req.body.stageTimeLimits || {})[stageId];
                          const task = {
                            stageId: stageConfig.id,
                            stageName: stageConfig.name,
                            stageIcon: stageConfig.icon,
                            status: index === 0 ? 'pending' : 'waiting',
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            ...(timeLimitData ? {
                              timeLimitMinutes: timeLimitData.minutes,
                              timeLimitDisplay: `${timeLimitData.value} ${timeLimitData.unit}`,
                            } : {})
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

    // Persist the order: Firestore is primary. Persist to Mongo only if backup mode is enabled
    let savedOrderMongo = null;
    let savedToFirestore = false;

    // Save to Firestore (primary) — set createdAt now so the doc is queryable immediately
    if (firebaseIntegrationService && firebaseIntegrationService.initialized) {
      try {
        orderData.createdAt = orderData.createdAt || new Date();
        orderData.updatedAt = new Date();
await clientDB(req).syncOrder(orderData);
        savedToFirestore = true;
        console.log('🔥 Order saved to Firebase (primary):', orderData.orderId);
      } catch (fbErr) {
        console.warn('⚠️ Failed to save order to Firestore:', fbErr.message || fbErr);
      }
    }

    // Persist to MongoDB only when connected
    if (typeof isMongoConnected === 'function' && isMongoConnected()) {
      try {
        const orderModel = new Order(orderData);
        await orderModel.save();
        savedOrderMongo = orderModel;
        console.log('✅ Order saved to MongoDB (backup):', orderModel.orderId);
      } catch (mongoErr) {
        console.warn('⚠️ Failed to persist order to MongoDB backup:', mongoErr.message || mongoErr);
      }
    } else {
      console.log('ℹ️ MongoDB not connected — skipping Mongo persistence for order');
    }

    // Customer upsert — prefer Firestore
    try {
      if (firebaseIntegrationService && firebaseIntegrationService.initialized) {
        const customerDoc = {
          name: orderData.customerName,
          phone: orderData.customerPhone,
          address: orderData.customerAddress || '',
          totalOrders: 1,
          totalSpent: orderData.totalAmount || 0
        };
await clientDB(req).syncCustomer({ ...customerDoc, adminId: req.user?.adminId });
        console.log('🔥 Customer upserted in Firestore');
      }

      if (typeof isMongoConnected === 'function' && isMongoConnected()) {
        const cust = await Customer.findOneAndUpdate(
          { phone: orderData.customerPhone },
          { 
            $set: { name: orderData.customerName, phone: orderData.customerPhone, address: orderData.customerAddress },
            $push: { orders: savedOrderMongo ? savedOrderMongo._id : null },
            $inc: { totalOrders: 1, totalSpent: orderData.totalAmount }
          },
          { upsert: true, new: true }
        );
        console.log('✅ Customer record updated in MongoDB:', cust && cust.name);
      }
    } catch (custErr) {
      console.warn('⚠️ Customer upsert error (non-fatal):', custErr.message || custErr);
    }

    // DataFlowService migrated to Firestore — prefer Firestore, fall back to Mongo if still present
    if (firebaseIntegrationService && firebaseIntegrationService.initialized) {
      try {
        const dataFlowResult = await DataFlowService.processOrderCreation({ ...orderData, _id: savedOrderMongo ? savedOrderMongo._id : null }, req.user || { id: 'admin' });
        console.log('✅ Data flow processing completed (Firestore):', dataFlowResult.message);
      } catch (dataFlowError) {
        console.warn('⚠️ Data flow processing failed (order still created):', dataFlowError.message);
      }
    } else if (typeof isMongoConnected === 'function' && isMongoConnected()) {
      // Legacy path: allow DataFlowService to operate against Mongo if configured (back-compat)
      try {
        const dataFlowResult = await DataFlowService.processOrderCreation({ ...orderData, _id: savedOrderMongo ? savedOrderMongo._id : null }, req.user || { id: 'admin' });
        console.log('✅ Data flow processing completed (Mongo fallback):', dataFlowResult.message);
      } catch (dataFlowError) {
        console.warn('⚠️ Data flow processing failed (order still created):', dataFlowError.message);
      }
    } else {
      console.log('ℹ️ No database available for DataFlowService — skipping assignment');
    }

    // Respond with a Firestore-first representation
    const responseOrder = {
      orderId: orderData.orderId,
      customerName: orderData.customerName,
      status: orderData.status,
      workflowTasks: orderData.workflowTasks.map(t => ({ stageId: t.stageId, stageName: t.stageName, status: t.status, assignedToName: t.assignedToName }))
    };

    results.push({ orderId: orderData.orderId, garmentType: orderData.garmentType, status: 'created' });
  lastOrderData = orderData;
} // end for loop
      invalidateCache(['orders_list_', 'public_orders_']);
      res.json({
        success: true,
        groupId,
        ordersCreated: results.length,
        orders: results,
        order: results[0],
        message: `${results.length} order(s) created`
      });

    // Fire-and-forget: generate themed PDF and send WhatsApp notification to customer
    (async () => {
      try {
        const settings = await getAppSettings({ req }) || { companyName: 'SAPTHALA', phone: '7794021608', email: 'hello@sapthala.com', address: '', defaultTheme: 'default' };
        // Attach theme if provided in request
        const theme = req.body.theme || settings.defaultTheme || 'default';
                const pdfOrder = Object.assign({}, lastOrderData, { theme });

        const result = await EnhancedPDFService.generateAndSavePDFFiles(pdfOrder, settings);
        if (result && result.success) {
                    console.log('✅ Themed PDF created for order', lastOrderData.orderId);
          // Update order with pdf path
          try {
            await Order.findByIdAndUpdate(lastOrderData._id, { $set: { pdfPath: result.pdfPath || result.htmlPath } });
          } catch (e) { console.warn('Could not update order pdfPath:', e.message); }
        } else {
          console.warn('PDF generation returned error:', result && result.error);
        }

        // Send WhatsApp message (will return wa.me link if Twilio not configured)
        try {
         const message = NotificationService.generateCustomerMessage(lastOrderData, theme);
          const waPhone = (lastOrderData.customerPhone || lastOrderData.customer?.phone || '').replace(/\D/g, '');
          const waLink = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
          console.log('📱 WhatsApp share link:', waLink);
          const notifyResult = await NotificationService.sendWhatsAppToCustomer(lastOrderData.customerPhone || lastOrderData.customer?.phone, message, result && (result.pdfPath || result.htmlPath));
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
    }, 500);
  }
});
            const multer = require('multer');
            const cloudinary = require('cloudinary').v2;
            const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

               app.post('/api/upload-image', authenticateToken, imageUpload.single('image'), async (req, res) => {
                try {
                    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

                    // Configure fresh on each request to ensure env vars are loaded
                    cloudinary.config({
                        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                        api_key: process.env.CLOUDINARY_API_KEY,
                        api_secret: process.env.CLOUDINARY_API_SECRET
                    });

                    const adminId = req.user.adminId;

                        // Upload to Cloudinary with auto compression
                        const result = await new Promise((resolve, reject) => {
                            cloudinary.uploader.upload_stream(
                                {
                                    folder: `boutique/${adminId}`,
                                    transformation: [{ width: 600, crop: 'limit', quality: 55, fetch_format: 'auto' }]
                                },
                                (error, result) => error ? reject(error) : resolve(result)
                            ).end(req.file.buffer);
                        });

                        res.json({ url: result.secure_url });
                    } catch (err) {
                        console.error('Image upload error:', err);
                        res.status(500).json({ error: 'Upload failed: ' + err.message });
                    }
                });
                   
// Share an order PDF and optionally send WhatsApp message
                app.post('/api/share-order-pdf', async (req, res) => {
                  try {
                    const { orderData, sendNow = true } = req.body;
                    if (!orderData) return res.status(400).json({ success: false, error: 'orderData is required' });

                    if (!orderData.orderId) orderData.orderId = `ORD-${Date.now()}`;

                    // Normalize customer fields — PDF service needs both flat and nested
                    if (!orderData.customerName && orderData.customer?.name) orderData.customerName = orderData.customer.name;
                    if (!orderData.customerPhone && orderData.customer?.phone) orderData.customerPhone = orderData.customer.phone;
                    if (!orderData.customerAddress && orderData.customer?.address) orderData.customerAddress = orderData.customer.address;
                    if (!orderData.customer) orderData.customer = { name: orderData.customerName || '', phone: orderData.customerPhone || '', address: orderData.customerAddress || '' };

                    // Normalize pricing fields
                    if (!orderData.totalAmount && orderData.pricing?.total) orderData.totalAmount = orderData.pricing.total;
                    if (!orderData.advanceAmount && orderData.pricing?.advance) orderData.advanceAmount = orderData.pricing.advance;
                    if (orderData.balanceAmount == null) orderData.balanceAmount = orderData.pricing?.balance ?? Math.max(0, (orderData.totalAmount || 0) - (orderData.advanceAmount || 0));

                    const settings = await getAppSettings({ req }) || { companyName: 'SAPTHALA', phone: '7794021608', email: 'hello@sapthala.com', address: '' };

                    const result = await EnhancedPDFService.generateAndSavePDFFiles(orderData, settings);
                    if (!result.success) return res.status(500).json({ success: false, error: result.error });

                    // Only persist pdfPath to DB for real orders (not previews with PREV- prefix)
                    const isPreview = String(orderData.orderId).startsWith('PREV-');
                    if (!isPreview) {
                      try {
                        const pdfRelative = result.pdfPath || result.htmlPath;
                        await Order.findOneAndUpdate(
                          { orderId: orderData.orderId },
                          { $set: { pdfPath: pdfRelative } },
                          { new: true }
                        );
                      } catch (err) {
                        console.warn('Failed to update Order with pdfPath:', err.message);
                      }
                    }

                    const message = NotificationService.generateCustomerMessage(orderData);
                    let notifyResult = { sent: false, provider: 'wa.me', whatsappUrl: null };
                    if (sendNow && !isPreview) {
                      notifyResult = await NotificationService.sendWhatsAppToCustomer(orderData.customerPhone, message, result.pdfPath || result.htmlPath);
                    }

                    res.json({ success: true, pdf: result, notify: notifyResult });
                  } catch (error) {
                    console.error('Share order pdf error:', error);
                    res.status(500).json({ success: false, error: error.message });
                  }
                });

// Get Orders — Firestore primary, MongoDB fallback
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
                    const nocache = req.query.nocache === '1';
                    const branch = req.query.branch || '';
                    const phoneFilter = req.query.phone || '';// public endpoint may not filter by branch
    const role = req.user && req.user.role ? req.user.role : 'guest';
    const cacheKey = `public_orders_${branch}_${role}`;
    if (!nocache) {
      const cached = getCache(cacheKey);
      if (cached) return res.json(cached);
    }

    let responseData;
    // Prefer Firestore when initialized
    if (firebaseIntegrationService && firebaseIntegrationService.initialized) {
      try {
        const fb = await clientDB(req).getCollection('orders', { orderBy: { field: 'createdAt', direction: 'desc' }, limit: 1000 });
        if (fb.success) {
                            let data = fb.data || [];
                              if (phoneFilter) {
                                data = data.filter(o =>
                                  o.customerPhone === phoneFilter ||
                                  (o.customer && (o.customer.phone === phoneFilter || o.customer.whatsapp === phoneFilter))
                                );
                              }
                              if (req.user && req.user.role === 'sub-admin') {
            const redacted = data.map(o => { const c = { ...o }; delete c.totalAmount; delete c.advanceAmount; delete c.balanceAmount; return c; });
            responseData = redacted;
          } else {
            responseData = data;
          }
        }
      } catch (e) {
        console.warn('⚠️ Firestore orders fetch error — falling back to MongoDB:', e.message || e);
      }
    }

    // Fallback to MongoDB if no responseData yet
    if (!responseData) {
      const orders = await Order.find().sort({ createdAt: -1 });
      if (req.user && req.user.role === 'sub-admin') {
        const redacted = orders.map(o => { const c = o.toObject ? o.toObject() : { ...o }; delete c.totalAmount; delete c.advanceAmount; delete c.balanceAmount; return c; });
        responseData = redacted;
      } else {
        responseData = orders;
      }
    }

    setCache(cacheKey, responseData, 45 * 1000);
    res.json(responseData);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ==================== STAFF ROUTES ====================

// Get all staff (with optional branch filter) — Firestore primary, MongoDB fallback
// Get single staff
      app.get('/api/staff/:id', authenticateToken, async (req, res) => {
        try {
          const adminId = req.user.adminId;
          if (!adminId) return res.status(400).json({ error: 'adminId missing from token' });
          const db = firebaseIntegrationService.forClient(adminId);
          const result = await db.getCollection('staff', {
            where: [['staffId', '==', req.params.id]], limit: 1
          });
          const staff = result?.data?.[0];
          if (!staff) return res.status(404).json({ error: 'Staff not found' });
          res.json(staff);
        } catch (error) {
          console.error('Get staff error:', error);
          res.status(500).json({ error: 'Failed to fetch staff' });
        }
      });
// Create staff
// app.post('/api/staff',authenticateToken, async (req, res) => {
//   try {
//     const { staffId, name, phone, email, role, pin, branch, workflowStages } = req.body;
    
//     // Check if staffId already exists
//     const existing = await Staff.findOne({ staffId });
//     if (existing) {
//       return res.status(400).json({ error: 'Staff ID already exists' });
//     }
    
//     const staff = new Staff({
//       staffId,
//       name,
//       phone,
//       email,
//       role,
//       pin,
//       branch: branch || 'SAPTHALA.MAIN',
//       workflowStages,
//       isAvailable: true,
//       currentTaskCount: 0
//     });
    
//     await staff.save();
//     console.log(`✅ Staff created: ${name} (${staffId}) - Branch: ${staff.branch}`);
    
//     // Sync to Firebase
//     try {
//        await clientDB(req).syncStaff({ ...staff.toObject(), adminId: req.user?.adminId });
//       console.log('🔥 Staff synced to Firebase');
//     } catch (firebaseError) {
//       console.warn('⚠️ Firebase staff sync failed:', firebaseError.message);
//     }
    
//     res.json({ success: true, staff });
//   } catch (error) {
//     console.error('Create staff error:', error);
//     res.status(500).json({ error: 'Failed to create staff' });
//   }
// });

// Update staff
// app.put('/api/staff/:id',authenticateToken, async (req, res) => {
//   try {
//     const { staffId, name, phone, email, role, pin, branch, workflowStages } = req.body;
    
//     // Check if new staffId conflicts with another staff
//     const existing = await Staff.findOne({ staffId, _id: { $ne: req.params.id } });
//     if (existing) {
//       return res.status(400).json({ error: 'Staff ID already exists' });
//     }
    
//     const staff = await Staff.findByIdAndUpdate(
//       req.params.id,
//       { staffId, name, phone, email, role, pin, branch: branch || 'SAPTHALA.MAIN', workflowStages, updatedAt: new Date() },
//       { new: true }
//     );
    
//     if (!staff) {
//       return res.status(404).json({ error: 'Staff not found' });
//     }
    
//     console.log(`✅ Staff updated: ${name} (${staffId}) - Branch: ${staff.branch}`);
//     res.json({ success: true, staff });
//   } catch (error) {
//     console.error('Update staff error:', error);
//     res.status(500).json({ error: 'Failed to update staff' });
//   }
// });

// Toggle staff availability
          app.put('/api/staff/:id/availability', authenticateToken, async (req, res) => {
            try {
              const { isAvailable } = req.body;
              const adminId = req.user.adminId;
              if (!adminId) return res.status(400).json({ error: 'adminId missing from token' });
              const db = firebaseIntegrationService.forClient(adminId);
              await db.setDocument('staff', req.params.id, { isAvailable, updatedAt: new Date() });
              console.log(`✅ Staff availability updated: ${req.params.id} → ${isAvailable}`);
               invalidateCache([`staff_list_${adminId}`]);
              res.json({ success: true });
            } catch (error) {
              console.error('Update availability error:', error);
              res.status(500).json({ error: 'Failed to update availability' });
            }
          });

        // Delete staff
        app.delete('/api/staff/:id', authenticateToken, async (req, res) => {
          try {
            const adminId = req.user.adminId;
            if (!adminId) return res.status(400).json({ error: 'adminId missing from token' });
            const db = firebaseIntegrationService.forClient(adminId);
            await db.deleteDocument('staff', req.params.id);
            console.log(`✅ Staff deleted: ${req.params.id}`);
             invalidateCache([`staff_list_${adminId}`]);
            res.json({ success: true, message: 'Staff deleted successfully' });
          } catch (error) {
            console.error('Delete staff error:', error);
            res.status(500).json({ error: 'Failed to delete staff' });
          }
        });
            // Staff Login — reads from clients/{adminId}/staff subcollection
            // this endpoint is frequently used by mobile clients which may not
            // always send the tenant ID. We gracefully fall back to the default
            // production tenant and also accept the value from query/header. A
            // dedicated health check is added above so mobile apps can verify
            // connectivity without relying on a 404 on '/api/'.
            app.post('/api/staff/login', async (req, res) => {
              try {
                // prefer explicit body value, then query string, then header
                let { staffId, pin, adminId } = req.body || {};
                if (!adminId) {
                  adminId = req.query.adminId || req.get('x-admin-id') || '';
                }
                // final default if nothing specified
                if (!adminId) {
                  adminId = 'sapthala-designer-workshop';
                }

                if (!staffId || !pin) {
                  return res.status(400).json({ error: 'Staff ID and PIN are required' });
                }
                // at this point adminId will never be blank
                if (!adminId) {
                  return res.status(400).json({ error: 'adminId is required to identify your boutique' });
                }

                console.log(`📱 Staff login attempt: ${staffId} for client: ${adminId}`);

                if (!firebaseIntegrationService || !firebaseIntegrationService.initialized) {
                  return res.status(503).json({ error: 'Database not available. Please try again shortly.' });
                }

                // Scope to the correct client's subcollection: clients/{adminId}/staff
                const db = firebaseIntegrationService.forClient(adminId);
                const fb = await db.getCollection('staff', {
                  where: [['staffId', '==', staffId]],
                  limit: 1
                });

                let staff = null;
                if (fb && fb.success && fb.data && fb.data.length > 0) {
                  staff = fb.data[0];
                }

                if (!staff) {
                  console.log(`❌ Staff not found: ${staffId} in client: ${adminId}`);
                  return res.status(401).json({ error: 'Invalid staff ID or PIN' });
                }

                const staffPin = String(staff.pin || '1234').trim();
                const inputPin = String(pin).trim();

                if (staffPin !== inputPin) {
                  console.log(`❌ Invalid PIN for staff: ${staffId}`);
                  return res.status(401).json({ error: 'Invalid staff ID or PIN' });
                }

                const token = jwt.sign(
                  { id: staff._id || staff.id, staffId: staff.staffId, role: 'staff', adminId },
                  JWT_SECRET,
                  { expiresIn: '24h' }
                );

                console.log(`✅ Staff login successful: ${staff.name} (${adminId})`);
                res.json({
                  success: true,
                  token,
                  staff: {
                    id: staff._id || staff.id,
                    staffId: staff.staffId,
                    name: staff.name,
                    role: staff.role,
                    workflowStages: staff.workflowStages || [],
                    phone: staff.phone || '',
                    avatarUrl: staff.avatarUrl || ''
                  },
                  adminId
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
                const { adminId } = req.query;
                if (!adminId) return res.status(400).json({ error: 'adminId is required' });
                const nocache = req.query.nocache === '1';
                const cacheKey = `staff_tasks_${adminId}_${staffId}`;
                if (!nocache) {
                  const cached = getCache(cacheKey);
                  if (cached) return res.json(cached);
                }
                console.log(`🔍 Getting tasks for staff: ${staffId} (${adminId})`);
                const db = firebaseIntegrationService.forClient(adminId);
                const ordersRes = await db.getCollection('orders', {
                  where: [['workflowTasks', '!=', null]]
                });
                const orders = ordersRes?.data || [];
                const myTasks = [];
                orders.forEach(order => {
                  (order.workflowTasks || []).forEach(task => {
                    if ((task.assignedTo === staffId || task.assignedToStaffId === staffId) && task.status !== 'completed') {
                     
                    myTasks.push({
                        ...task,
                        orderId: order.orderId,
                        customerName: order.customerName || '',
                        garmentType: order.garmentType || '',
                        deliveryDate: (() => {
                        const d = order.deliveryDate;
                        if (!d) return null;
                        if (typeof d.toDate === 'function') return d.toDate().toISOString();           // Firestore Timestamp with method
                        if (d._seconds !== undefined) return new Date(d._seconds * 1000).toISOString();  
                        if (d.seconds !== undefined) return new Date(d.seconds * 1000).toISOString();    
                        if (typeof d === 'string') return d;                                               
                        return new Date(d).toISOString();
                      })(),
                        customerPhone: order.customerPhone || '',
                        measurements: order.measurements || task.measurementsData || {},
                        designNotes: task.designNotes || order.designNotes || '',
                        images: order.designImages || task.designImages || []
                    });
                                        }
                  });
                });
                setCache(cacheKey, myTasks,2 * 60* 1000);
                res.json(myTasks);
              } catch (error) {
                console.error('❌ Get staff tasks error:', error);
                res.status(500).json({ success: false, error: 'Failed to fetch tasks', myTasks: [] });
              }
            });

            app.get('/api/staff/:staffId/available-tasks', async (req, res) => {
              try {
                const { staffId } = req.params;
                const { adminId } = req.query;
                if (!adminId) return res.status(400).json({ error: 'adminId is required' });
                const nocache = req.query.nocache === '1';
                const cacheKey = `staff_available_${adminId}_${staffId}`;
                if (!nocache) {
                  const cached = getCache(cacheKey);
                  if (cached) return res.json(cached);
                }
                console.log(`🔍 Getting available tasks for staff: ${staffId} (${adminId})`);

                // Get staff's assigned workflow stages
                const db = firebaseIntegrationService.forClient(adminId);
                const staffRes = await db.getCollection('staff', { where: [['staffId', '==', staffId]], limit: 1 });
                const staff = staffRes?.data?.[0];
                if (!staff) return res.status(404).json({ error: 'Staff not found' });
                const myStages = staff.workflowStages || [];

                 const branch = staff.branch || req.query.branch || null;
                const orderWhere = branch
                  ? [['workflowTasks', '!=', null], ['branch', '==', branch]]
                  : [['workflowTasks', '!=', null]];
                const ordersRes = await db.getCollection('orders', { where: orderWhere });
                const orders = ordersRes?.data || [];
                const availableTasks = [];
                orders.forEach(order => {
                  (order.workflowTasks || []).forEach(task => {
                    if (myStages.includes(task.stageId) && task.status === 'pending' && !task.assignedTo) {
                     
                  availableTasks.push({
                      ...task,
                      orderId: order.orderId,
                      customerName: order.customerName || '',
                      garmentType: order.garmentType || '',
                      deliveryDate: (() => { const d = order.deliveryDate; if (!d) return null; if (typeof d.toDate === 'function') return d.toDate().toISOString(); if (d._seconds !== undefined) 
                      return new Date(d._seconds * 1000).toISOString(); if (d.seconds !== undefined) 
                      return new Date(d.seconds * 1000).toISOString(); if (typeof d === 'string') 
                      return d; return new Date(d).toISOString(); })(),                      
                    customerPhone: order.customerPhone || '',
                      measurements: order.measurements || task.measurementsData || {},
                      designNotes: task.designNotes || order.designNotes || '',
                      images: order.designImages || task.designImages || []
                  });
                    }
                  });
                });
                setCache(cacheKey, availableTasks,2 * 60  * 1000);
                res.json(availableTasks);
              } catch (error) {
                console.error('❌ Get available tasks error:', error);
                res.status(500).json({ success: false, error: 'Failed to fetch available tasks', availableTasks: [] });
              }
            });
// Accept Task with Enhanced Data Flow
app.post('/api/staff/:staffId/accept-task', authenticateToken, async (req, res) => {
  try {
    const { staffId } = req.params;
    const { orderId, stageId } = req.body;
    const adminId = req.user.adminId;
    if (!adminId) return res.status(400).json({ error: 'adminId missing from token' });
    console.log(`✅ Task acceptance: ${staffId} -> ${orderId} -> ${stageId} (${adminId})`);
    const db = firebaseIntegrationService.forClient(adminId);
    const orderRes = await db.getCollection('orders', { where: [['orderId', '==', orderId]], limit: 1 });
    const order = orderRes?.data?.[0];
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
          const now = new Date().toISOString();
const tasks = (order.workflowTasks || []).map(t =>
    t.stageId === stageId
      ? { ...t, status: 'assigned', assignedTo: staffId, assignedToStaffId: staffId, assignedAt: now, updatedAt: now }
      : t
  );
  const docId = order.id || order._id || orderId;
  await db.updateDocument('orders', docId, { workflowTasks: tasks });
          invalidateCache([
      `staff_tasks_${adminId}`,
      `staff_tasks_${adminId}_${staffId}`,
      `staff_available_${adminId}`,
      `staff_available_${adminId}_${staffId}`
    ]);
      console.log(`✅ Task assigned: ${stageId} → ${staffId} on order ${orderId} (${adminId})`);
     res.json({ success: true });
  } catch (error) {
    console.error('Accept task error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

          app.post('/api/staff/:staffId/update-task', authenticateToken, async (req, res) => {
  try {
    const { staffId } = req.params;
    const { orderId, stageId, status, notes, qualityRating } = req.body;
    const adminId = req.user.adminId;
    if (!adminId) return res.status(400).json({ error: 'adminId missing from token' });

    console.log(`🔄 Task update: ${staffId} -> ${orderId} -> ${stageId} -> ${status} (${adminId})`);

    const db = firebaseIntegrationService.forClient(adminId);
    const orderRes = await db.getCollection('orders', { where: [['orderId', '==', orderId]], limit: 1 });
    const order = orderRes?.data?.[0];
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    // FIX 1: fallback to orderId if order.id is missing
    const docId = order.id || order.orderId;
    if (!docId) return res.status(500).json({ success: false, error: 'Order document ID missing' });

    console.log(`🔍 docId: ${docId}, orderId: ${order.orderId}`);

    const now = new Date().toISOString();

    const targetIdx = (order.workflowTasks || []).findIndex(t => t.stageId === stageId);
    if (targetIdx === -1) return res.status(404).json({ success: false, error: 'Task not found for stageId: ' + stageId });

    // FIX 2: safe serializer that handles Firestore Timestamps, Dates, and strings
    const safeSerialize = (val) => {
      if (!val) return val;
      if (typeof val === 'string') return val;
      if (val instanceof Date) return val.toISOString();
      if (val && typeof val.toDate === 'function') return val.toDate().toISOString(); // Firestore Timestamp
      return val;
    };

    const serializeTask = (t) => {
      const s = { ...t };
      ['createdAt', 'updatedAt', 'startedAt', 'completedAt', 'pausedAt', 'resumedAt', 'assignedAt'].forEach(f => {
        s[f] = safeSerialize(s[f]);
      });
      return s;
    };

    // Build updated tasks array
    const tasks = (order.workflowTasks || []).map((t, i) => {
      const base = serializeTask(t); // FIX 3: serialize ALL tasks, not just the target
      if (i !== targetIdx) return base;
      const updated = { ...base, status, notes: notes || base.notes, qualityRating: qualityRating || base.qualityRating, updatedAt: now };
      if (status === 'started' && !base.startedAt) updated.startedAt = now;
      if (status === 'paused')                     updated.pausedAt  = now;
      if (status === 'resumed')                    updated.startedAt = base.startedAt || now;
      if (status === 'completed') {
        updated.completedAt = now;
        updated.timeSpent = base.startedAt ? Math.round((Date.now() - new Date(base.startedAt).getTime()) / 60000) : 0;
      }
      return updated;
    });

    if (status === 'completed') {
      // Find next task that is still waiting or pending AFTER the completed one
      const nextIdx = (order.workflowTasks || []).findIndex(
        (t, i) => i > targetIdx && (t.status === 'waiting' || t.status === 'pending')
      );

      let nextStageId = null;
      if (nextIdx !== -1) {
        tasks[nextIdx] = { ...tasks[nextIdx], status: 'pending', updatedAt: now };
        nextStageId = order.workflowTasks[nextIdx].stageId;
      }

      const updatePayload = {
        workflowTasks: tasks,
        currentStage: nextStageId || 'completed',
        status: nextStageId ? 'in_progress' : 'completed',
        updatedAt: now,
      };

      console.log(`🔍 Writing to docId: ${docId} — currentStage: ${updatePayload.currentStage}, nextStage: ${nextStageId}`);
      const updateResult = await db.updateDocument('orders', docId, updatePayload);
      console.log(`🔍 updateDocument result:`, JSON.stringify(updateResult));

      // FIX 4: invalidate all cache key variants
      invalidateCache([
        `staff_tasks_${adminId}`,
        `staff_available_${adminId}`,
        `staff_available_${adminId}_${staffId}`,
        `orders_list_`
      ]);

      console.log(`✅ Stage completed: ${stageId} → next: ${nextStageId || 'completed'} on order ${orderId} (${adminId})`);
             try {
    if (!nextStageId) {
        const _branch = order.branch || '';
        await sendAdminNotification(
            adminId,
            '🎉 Order Fully Completed!',
            `Order #${orderId} — ${order.customerName || 'Customer'} is ready for delivery (Branch: ${_branch || '—'})`,
            {
                type: 'order_complete',
                orderId,
                customerName: order.customerName || '',
                customerPhone: order.customerPhone || '',
                branch: _branch
            }
        );
    }
} catch(e) { console.warn('Notification trigger error:', e.message); }
      return res.json({ success: true, nextStage: nextStageId, currentStage: nextStageId || 'completed' });
    }

    // Non-completed status update
    const updateResult = await db.updateDocument('orders', docId, { workflowTasks: tasks, updatedAt: now });
    console.log(`🔍 updateDocument result (${status}):`, JSON.stringify(updateResult));

invalidateCache([`staff_tasks_${adminId}`, `staff_tasks_${adminId}_${staffId}`, `staff_available_${adminId}`, `staff_available_${adminId}_${staffId}`]);
    console.log(`✅ Task ${status}: ${stageId} on order ${orderId} (${adminId})`);
    return res.json({ success: true });

  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// Helper function to progress to next stage
      async function progressToNextStage(order, completedStageId, db) {
        try {
          const settings = order._settings || await getAppSettings({});
          if (!settings || !settings.workflowStages) return;

          const currentStage = settings.workflowStages.find(s => s.id === completedStageId);
          if (!currentStage) return;

          const nextStage = settings.workflowStages.find(s => s.order === (currentStage.order + 1));
          const tasks = (order.workflowTasks || []).map(t => ({ ...t }));

          if (!nextStage) {
            // All stages done
            if (db) await db.updateDocument('orders', order.id || order.orderId, { status: 'completed', currentStage: 'completed', updatedAt: new Date() });
            console.log(`🎉 Order ${order.orderId} fully completed`);
            return;
          }

          // Activate next stage — staff picks it up from Available Tasks
          const nextIdx = tasks.findIndex(t => t.stageId === nextStage.id);
          if (nextIdx !== -1) {
            tasks[nextIdx].status = 'pending';
            tasks[nextIdx].updatedAt = new Date();
            if (db) await db.updateDocument('orders', order.id || order.orderId, {
              workflowTasks: tasks, currentStage: nextStage.id, updatedAt: new Date()
            });
            console.log(`▶️ Next stage '${nextStage.name}' set to pending — awaiting staff pickup`);
          }
        } catch (error) {
          console.error('progressToNextStage error:', error);
        }
      }

        

// ==================== REPORTS ROUTES ====================

// Get Staff Performance Report
// Get Individual Staff Report
          app.get('/api/reports/staff/:staffId', async (req, res) => {
            try {
              const { staffId } = req.params;
              const { startDate, endDate, adminId } = req.query;

              if (!adminId) return res.status(400).json({ error: 'adminId is required' });

              const db = firebaseIntegrationService.forClient(adminId);

              // Fetch staff from Firestore subcollection
              const staffRes = await db.getCollection('staff', {
                where: [['staffId', '==', staffId]], limit: 1
              });
              const staff = staffRes?.data?.[0];
              if (!staff) return res.status(404).json({ error: 'Staff not found' });

              // Fetch orders from Firestore subcollection
              const ordersFilters = { where: [['workflowTasks', '!=', null]] };
              if (startDate) ordersFilters.where.push(['createdAt', '>=', new Date(startDate)]);
              if (endDate)   ordersFilters.where.push(['createdAt', '<=', new Date(endDate)]);
              const ordersRes = await db.getCollection('orders', ordersFilters);
              const orders = ordersRes?.data || [];

              const staffTasks = [];
              let totalTimeSpent = 0, completedTasks = 0;
              const qualityRatings = [], stageStats = {};

              orders.forEach(order => {
                (order.workflowTasks || []).forEach(task => {
                  if (task.assignedTo === staffId || task.assignedToStaffId === staffId || task.assignedToName === staff.name) {
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
                      if (task.qualityRating) qualityRatings.push(task.qualityRating);
                      if (!stageStats[task.stageName]) stageStats[task.stageName] = { count: 0, totalTime: 0 };
                      stageStats[task.stageName].count++;
                      stageStats[task.stageName].totalTime += task.timeSpent || 0;
                    }
                  }
                });
              });

              res.json({
                staff: { staffId: staff.staffId, name: staff.name, role: staff.role, workflowStages: staff.workflowStages },
                summary: {
                  totalTasks: staffTasks.length,
                  completedTasks,
                  totalTimeSpent,
                  averageTimePerTask: completedTasks > 0 ? Math.round(totalTimeSpent / completedTasks) : 0,
                  averageQuality: qualityRatings.length > 0 ? (qualityRatings.reduce((a, b) => a + b, 0) / qualityRatings.length).toFixed(1) : 0
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
app.post('/api/staff/:staffId/complete-design', authenticateToken, async (req, res) => {
  try {
    const { staffId } = req.params;
    const { orderId, designNotes, designImages } = req.body;
    const adminId = req.user.adminId;
    if (!adminId) return res.status(400).json({ error: 'adminId missing from token' });
    console.log(`📐 Completing design for order: ${orderId} by ${staffId} (${adminId})`);
    const db = firebaseIntegrationService.forClient(adminId);
    const orderRes = await db.getCollection('orders', { where: [['orderId', '==', orderId]], limit: 1 });
    const order = orderRes?.data?.[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const tasks = (order.workflowTasks || []).map(t =>
      t.stageId === 'measurements-design'
        ? { ...t, status: 'completed', completedAt: new Date(), designNotes: designNotes || t.designNotes,
            designImages: designImages || t.designImages || [], updatedAt: new Date() }
        : t
    );
    const docId = order.id || order._id || orderId;
      await db.updateDocument('orders', docId, { workflowTasks: tasks, updatedAt: new Date() });
      await progressToNextStage({ ...order, workflowTasks: tasks, id: docId }, 'measurements-design', db);
      invalidateCache([`staff_tasks_${adminId}`, `staff_available_${adminId}`]);
      res.json({ success: true, message: 'Design approved and order moved to next stage', nextStage: 'Dyeing' });
        } catch (error) {
    console.error('Complete design error:', error);
    res.status(500).json({ error: 'Failed to complete design phase' });
  }
});

// Get Settings (includes logo path)
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await getAppSettings({ req });
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

// Serve quick access super admin panel
app.get('/super-admin-quick', (req, res) => {
  const quickPath = path.join(__dirname, 'super-admin-quick.html');
  if (fs.existsSync(quickPath)) {
    return res.sendFile(quickPath);
  }
  res.status(404).send('Quick access panel not found');
});

// Handle SPA routing for super-admin React app - all /super-admin/* routes
app.get('/super-admin/*', (req, res) => {
  const reactDistPath = path.join(__dirname, 'Boutique-app', 'super-admin-panel', 'dist', 'index.html');
  if (fs.existsSync(reactDistPath)) {
    return res.sendFile(reactDistPath);
  }
  res.status(404).send('Super admin panel not found');
});

// // Serve staff portal
// app.get('/staff', (req, res) => {
//   const filePath = path.join(__dirname, 'staff-portal.html');
//   if (fs.existsSync(filePath)) {
//     res.sendFile(filePath);
//   } else {
//     res.status(404).send('Staff portal not found');
//   }
// });

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

const settings = await getAppSettings({ req }) || { companyName: 'SAPTHALA', phone: '7794021608', email: 'hello@sapthala.com', address: '' };
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