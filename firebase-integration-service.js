const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

/**
 * SAPTHALA BOUTIQUE - UNIFIED FIREBASE SERVICE
 * Integrates Firebase across Super Admin, Admin, Sub-Admin, and Staff panels
 * Provides real-time data synchronization and authentication
 */

class FirebaseIntegrationService {
  constructor() {
    this.db = null;
    this.auth = null;
    this.initialized = false;
    this.collections = {
      orders: 'orders',
      staff: 'staff',
      customers: 'customers',
      branches: 'branches',
      users: 'users',
      settings: 'settings',
      notifications: 'notifications',
      loginAttempts: 'loginAttempts'
    };
  }
  // Returns collection ref — subcollection if adminId given, flat if not
  _resolveRef(collection, adminId = null) {
    if (adminId) {
      return this.db.collection('clients').doc(adminId).collection(collection);
    }
    return this.db.collection(collection); // backward compat — old data untouched
  }

  // Scoped service for a specific client
  forClient(adminId) {
    if (!adminId) return this;
    const scoped = Object.create(this);
    scoped._activeAdminId = adminId;
    return scoped;
  }

  /**
   * Initialize Firebase Admin SDK
   */
  async initialize() {
    if (this.initialized) {
      console.log('✅ Firebase already initialized');
      return true;
    }

    try {
      // Emulator mode: allow using Firestore emulator without service account
      if (process.env.FIRESTORE_EMULATOR_HOST) {
        const proj = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'boutique-staff-app';
        admin.initializeApp({ projectId: proj });
        this.db = admin.firestore();
        this.auth = admin.auth();
        this.initialized = true;
        console.log('✅ Firebase Admin SDK initialized in emulator mode (FIRESTORE_EMULATOR_HOST detected)');
        return true;
      }

      // Check if already initialized
      if (admin.apps.length > 0) {
        this.db = admin.firestore();
        this.auth = admin.auth();
        this.initialized = true;
        console.log('✅ Firebase Admin SDK already initialized');
        return true;
      }

      // 1) Allow JSON credentials via environment variable (useful for CI/CD)
      let serviceAccount = null;
      let credPath = null;

      // Support base64-encoded credentials (GOOGLE_APPLICATION_CREDENTIALS_B64) — useful for CI secrets
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS_B64) {
        try {
          const decoded = Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_B64, 'base64').toString('utf8');
          serviceAccount = JSON.parse(decoded);
          credPath = 'GOOGLE_APPLICATION_CREDENTIALS_B64';
          console.log('✅ Loaded Firebase credentials from GOOGLE_APPLICATION_CREDENTIALS_B64 (decoded)');
        } catch (err) {
          console.warn('⚠️ Failed to parse GOOGLE_APPLICATION_CREDENTIALS_B64:', err.message);
        }
      }

      if (!serviceAccount && process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        try {
          serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
          credPath = 'GOOGLE_APPLICATION_CREDENTIALS_JSON';
          console.log('✅ Loaded Firebase credentials from GOOGLE_APPLICATION_CREDENTIALS_JSON');
        } catch (err) {
          console.warn('⚠️ Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', err.message);
        }
      }

      // 2) Fallback to file-based credential paths
      if (!serviceAccount) {
       const credentialPaths = [
        process.env.GOOGLE_APPLICATION_CREDENTIALS,
        './firebase-credentials.json',
        path.join(__dirname, 'firebase-credentials.json')
      ].filter(Boolean);

        for (const credentialPath of credentialPaths) {
          try {
            if (fs.existsSync(credentialPath)) {
              serviceAccount = require(path.resolve(credentialPath));
              credPath = credentialPath;
              console.log(`✅ Loaded credentials from: ${credPath}`);
              break;
            }
          } catch (err) {
            console.warn(`⚠️ Failed to load credentials from ${credentialPath}:`, err.message);
            // Continue to next path
          }
        }
      }

      // Helpful hint for secret managers
      if (!serviceAccount && process.env.GOOGLE_APPLICATION_CREDENTIALS_SECRET) {
        console.warn('⚠️ GOOGLE_APPLICATION_CREDENTIALS_SECRET is set but not automatically fetched by this process.\n       Set GOOGLE_APPLICATION_CREDENTIALS_B64 with the base64-encoded JSON in CI or runtime environment.');
      }

      if (!serviceAccount) {
        console.warn('⚠️ Firebase credentials not found. Please run Firebase setup.');
        return false;
      }

      // Validate private_key format (common source of errors when copying JSON)
      if (serviceAccount.private_key && !/BEGIN\s+PRIVATE\s+KEY/.test(serviceAccount.private_key)) {
        console.error('❌ Invalid Firebase service account private_key format. It must include "BEGIN PRIVATE KEY" header.');
        console.error('   Suggestion: re-download the service-account JSON from Firebase Console and set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_APPLICATION_CREDENTIALS_JSON.');
        return false;
      }

      // Initialize Firebase Admin
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${serviceAccount.project_id}.firebaseio.com`
      });

      this.db = admin.firestore();
      this.auth = admin.auth();
      this.initialized = true;

      console.log('✅ Firebase Admin SDK initialized successfully');
      console.log(`   Project: ${serviceAccount.project_id}`);
      console.log(`   Credentials: ${credPath}`);

      return true;
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error.message);
      return false;
    }
  }

  /**
   * Get Firestore database instance
   */
  getDb() {
    if (!this.initialized) {
      throw new Error('Firebase not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Get Firebase Auth instance
   */
  getAuth() {
    if (!this.initialized) {
      throw new Error('Firebase not initialized. Call initialize() first.');
    }
    return this.auth;
  }

  /**
   * Verify Firebase ID token
   */
  async verifyToken(idToken) {
    if (!this.initialized || !this.auth) {
      const msg = 'Firebase not initialized';
      console.warn(`⚠️ verifyToken skipped: ${msg}`);
      return { success: false, error: msg };
    }

    try {
      const decodedToken = await this.auth.verifyIdToken(idToken);
      return {
        success: true,
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create or update document in Firestore
   */
  async setDocument(collection, docId, data) {
    if (!this.initialized || !this.db) {
      const msg = 'Firebase not initialized';
      console.warn(`⚠️ setDocument skipped: ${msg}`);
      return { success: false, error: msg };
    }

    try {
const docRef = this._resolveRef(collection, this._activeAdminId || null).doc(docId);
      await docRef.set({
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      return { success: true, docId };
    } catch (error) {
      console.error(`Error setting document in ${collection}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get document from Firestore
   */
  async getDocument(collection, docId) {
    if (!this.initialized || !this.db) {
      const msg = 'Firebase not initialized';
      console.warn(`⚠️ getDocument skipped: ${msg}`);
      return { success: false, error: msg };
    }

    try {
const doc = await this._resolveRef(collection, this._activeAdminId || null).doc(docId).get();
      
      if (!doc.exists) {
        return { success: false, error: 'Document not found' };
      }

      return {
        success: true,
        data: { id: doc.id, ...doc.data() }
      };
    } catch (error) {
      console.error(`Error getting document from ${collection}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all documents from a collection
   */
  async getCollection(collection, filters = {}) {
    if (!this.initialized || !this.db) {
      const msg = 'Firebase not initialized';
      console.warn(`⚠️ getCollection skipped: ${msg}`);
      return { success: false, error: msg, data: [] };
    }

    try {
let query = this._resolveRef(collection, this._activeAdminId || null);

      // Apply filters
      if (filters.where) {
        filters.where.forEach(([field, operator, value]) => {
          query = query.where(field, operator, value);
        });
      }

      if (filters.orderBy) {
        query = query.orderBy(filters.orderBy.field, filters.orderBy.direction || 'asc');
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const snapshot = await query.get();
      const documents = [];

      snapshot.forEach(doc => {
        documents.push({ id: doc.id, ...doc.data() });
      });

      return { success: true, data: documents };
    } catch (error) {
      console.error(`Error getting collection ${collection}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete document from Firestore
   */
  async deleteDocument(collection, docId) {
    if (!this.initialized || !this.db) {
      const msg = 'Firebase not initialized';
      console.warn(`⚠️ deleteDocument skipped: ${msg}`);
      return { success: false, error: msg };
    }

    try {
      await this._resolveRef(collection, this._activeAdminId || null).doc(docId).delete();
      return { success: true };
    } catch (error) {
      console.error(`Error deleting document from ${collection}:`, error.message);
      return { success: false, error: error.message };
    }
  }
  async updateDocument(collection, docId, data) {
    if (!this.initialized || !this.db) {
      const msg = 'Firebase not initialized';
      console.warn(`⚠️ updateDocument skipped: ${msg}`);
      return { success: false, error: msg };
    }
    try {
      const docRef = this._resolveRef(collection, this._activeAdminId || null).doc(docId);
      await docRef.update({
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return { success: true, docId };
    } catch (error) {
      console.error(`Error updating document in ${collection}:`, error.message);
      return { success: false, error: error.message };
    }
  }
  /**
   * Sync order to Firebase
   */
  async syncOrder(order) {
    try {
      const orderId = order.orderId || order._id.toString();
      const orderData = {
        orderId: order.orderId,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerAddress: order.customerAddress || '',
        garmentType: order.garmentType,
        measurements: order.measurements || {},
        totalAmount: order.totalAmount || 0,
        advanceAmount: order.advanceAmount || 0,
        balanceAmount: order.balanceAmount || 0,
        deliveryDate: order.deliveryDate ? admin.firestore.Timestamp.fromDate(new Date(order.deliveryDate)) : null,
        branch: order.branch || 'SAPTHALA.MAIN',
        status: order.status || 'pending',
        currentStage: order.currentStage || 'dyeing',
              workflowTasks: order.workflowTasks || [],
                addons: Array.isArray(order.addons) ? order.addons : [],
                stageTimeLimits: order.stageTimeLimits || {},
                paymentMode: order.paymentMode || '',
                paymentRemarks: order.paymentRemarks || '',
        designNotes: order.designNotes || '',
        designImages: order.designImages || [],
        pdfPath: order.pdfPath || '',
        whatsappSent: order.whatsappSent || false,
        createdAt: order.createdAt ? admin.firestore.Timestamp.fromDate(new Date(order.createdAt)) : admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await this.setDocument(this.collections.orders, orderId, orderData);
      console.log(`✅ Order synced to Firebase: ${orderId}`);
      
      return { success: true, orderId };
    } catch (error) {
      console.error('Error syncing order to Firebase:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync staff to Firebase
   */
  async syncStaff(staff) {
    try {
      const staffId = staff.staffId || staff._id.toString();
      const staffData = {
        staffId: staff.staffId,
        name: staff.name,
        phone: staff.phone,
        email: staff.email || '',
        role: staff.role,
        pin: staff.pin || '1234',
        branch: staff.branch || 'SAPTHALA.MAIN',
        workflowStages: staff.workflowStages || [],
        skills: staff.skills || [],
        isAvailable: staff.isAvailable !== undefined ? staff.isAvailable : true,
        currentTaskCount: staff.currentTaskCount || 0,
        rating: staff.rating || 5.0,
        fcmToken: staff.fcmToken || '',
        lastLogin: staff.lastLogin ? admin.firestore.Timestamp.fromDate(new Date(staff.lastLogin)) : null,
        createdAt: staff.createdAt ? admin.firestore.Timestamp.fromDate(new Date(staff.createdAt)) : admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await this.setDocument(this.collections.staff, staffId, staffData);
      console.log(`✅ Staff synced to Firebase: ${staffId}`);
      
      return { success: true, staffId };
    } catch (error) {
      console.error('Error syncing staff to Firebase:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync customer to Firebase
   */
  async syncCustomer(customer) {
    try {
      const customerId = customer.phone; // Use phone as unique ID
      const customerData = {
        name: customer.name,
        phone: customer.phone,
        address: customer.address || '',
        email: customer.email || '',
        totalOrders: customer.totalOrders || 0,
        totalSpent: customer.totalSpent || 0,
        orders: customer.orders || [],
        createdAt: customer.createdAt ? admin.firestore.Timestamp.fromDate(new Date(customer.createdAt)) : admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await this.setDocument(this.collections.customers, customerId, customerData);
      console.log(`✅ Customer synced to Firebase: ${customerId}`);
      
      return { success: true, customerId };
    } catch (error) {
      console.error('Error syncing customer to Firebase:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync branch to Firebase
   */
  async syncBranch(branch) {
    try {
      const branchId = branch.branchId;
      const branchData = {
        branchId: branch.branchId,
        branchName: branch.branchName,
        location: branch.location,
        phone: branch.phone || '',
        email: branch.email || '',
        isActive: branch.isActive !== undefined ? branch.isActive : true,
        createdBy: branch.createdBy ? branch.createdBy.toString() : '',
        createdAt: branch.createdAt ? admin.firestore.Timestamp.fromDate(new Date(branch.createdAt)) : admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await this.setDocument(this.collections.branches, branchId, branchData);
      console.log(`✅ Branch synced to Firebase: ${branchId}`);
      
      return { success: true, branchId };
    } catch (error) {
      console.error('Error syncing branch to Firebase:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync user to Firebase
   */
  async syncUser(user) {
    try {
      const userId = user.username;
      const userData = {
        username: user.username,
        email: user.email || '',
        role: user.role,
        branch: user.branch || '',
        adminId: user.adminId || null,   
        permissions: user.permissions || {},
        isActive: user.isActive !== undefined ? user.isActive : true,
        createdBy: user.createdBy ? user.createdBy.toString() : '',
        lastLogin: user.lastLogin ? admin.firestore.Timestamp.fromDate(new Date(user.lastLogin)) : null,
        createdAt: user.createdAt ? admin.firestore.Timestamp.fromDate(new Date(user.createdAt)) : admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await this.setDocument(this.collections.users, userId, userData);
      console.log(`✅ User synced to Firebase: ${userId}`);
      
      return { success: true, userId };
    } catch (error) {
      console.error('Error syncing user to Firebase:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Real-time listener for orders
   */
  listenToOrders(callback) {
    if (!this.initialized) {
      console.error('Firebase not initialized');
      return null;
    }

    return this.db.collection(this.collections.orders)
      .orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
        const orders = [];
        snapshot.forEach(doc => {
          orders.push({ id: doc.id, ...doc.data() });
        });
        callback(orders);
      }, error => {
        console.error('Error listening to orders:', error.message);
      });
  }

  /**
   * Real-time listener for staff
   */
  listenToStaff(callback, branch = null) {
    if (!this.initialized) {
      console.error('Firebase not initialized');
      return null;
    }

    let query = this.db.collection(this.collections.staff);
    
    if (branch) {
      query = query.where('branch', '==', branch);
    }

    return query.onSnapshot(snapshot => {
      const staff = [];
      snapshot.forEach(doc => {
        staff.push({ id: doc.id, ...doc.data() });
      });
      callback(staff);
    }, error => {
      console.error('Error listening to staff:', error.message);
    });
  }

  /**
   * Batch sync from MongoDB to Firebase
   */
  async batchSyncFromMongoDB(mongoModels) {
    if (!this.initialized || !this.db) {
      const msg = 'Firebase not initialized';
      console.warn(`⚠️ batchSyncFromMongoDB skipped: ${msg}`);
      return { success: false, error: msg, results: null };
    }

    const results = {
      orders: 0,
      staff: 0,
      customers: 0,
      branches: 0,
      users: 0,
      errors: []
    };

    try {
      // Sync orders
      if (mongoModels.Order) {
        const orders = await mongoModels.Order.find().lean();
        for (const order of orders) {
          const result = await this.syncOrder(order);
          if (result.success) results.orders++;
          else results.errors.push(`Order ${order.orderId}: ${result.error}`);
        }
      }

      // Sync staff
      if (mongoModels.Staff) {
        const staff = await mongoModels.Staff.find().lean();
        for (const member of staff) {
          const result = await this.syncStaff(member);
          if (result.success) results.staff++;
          else results.errors.push(`Staff ${member.staffId}: ${result.error}`);
        }
      }

      // Sync customers
      if (mongoModels.Customer) {
        const customers = await mongoModels.Customer.find().lean();
        for (const customer of customers) {
          const result = await this.syncCustomer(customer);
          if (result.success) results.customers++;
          else results.errors.push(`Customer ${customer.phone}: ${result.error}`);
        }
      }

      // Sync branches
      if (mongoModels.Branch) {
        const branches = await mongoModels.Branch.find().lean();
        for (const branch of branches) {
          const result = await this.syncBranch(branch);
          if (result.success) results.branches++;
          else results.errors.push(`Branch ${branch.branchId}: ${result.error}`);
        }
      }

      // Sync users
      if (mongoModels.User) {
        const users = await mongoModels.User.find().lean();
        for (const user of users) {
          const result = await this.syncUser(user);
          if (result.success) results.users++;
          else results.errors.push(`User ${user.username}: ${result.error}`);
        }
      }

      console.log('✅ Batch sync completed:', results);
      return { success: true, results };
    } catch (error) {
      console.error('❌ Batch sync failed:', error.message);
      return { success: false, error: error.message, results };
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      if (!this.initialized) {
        return { healthy: false, error: 'Not initialized' };
      }

      // Try to list collections
      const collections = await this.db.listCollections();
      
      return {
        healthy: true,
        initialized: this.initialized,
        collectionsCount: collections.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
const firebaseService = new FirebaseIntegrationService();

module.exports = firebaseService;
