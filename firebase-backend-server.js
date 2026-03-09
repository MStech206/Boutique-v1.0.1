const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const DataFlowService = require('./services/dataFlowService');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();

app.use(cors());
app.use(express.json());

// Auth middleware
const authenticateToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

// ==================== BRANCHES ====================
app.get('/api/public/branches', async (req, res) => {
  try {
    const snapshot = await db.collection('branches').get();
    const branches = snapshot.docs.map(doc => ({
      branchId: doc.id,
      ...doc.data()
    }));
    
    // Remove duplicates
    const uniqueBranches = branches.filter((branch, index, self) => 
      index === self.findIndex(b => b.branchId === branch.branchId)
    );
    
    res.json(uniqueBranches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== STAFF ====================
app.get('/api/staff', async (req, res) => {
  try {
    const { branch } = req.query;
    let query = db.collection('staff');
    
    if (branch) {
      query = query.where('branch', '==', branch);
    }
    
    const snapshot = await query.get();
    const staff = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/staff', async (req, res) => {
  try {
    const staffData = {
      ...req.body,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      availability: 'available'
    };
    
    const docRef = await db.collection('staff').add(staffData);
    res.json({ id: docRef.id, ...staffData, success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/staff/:id', async (req, res) => {
  try {
    await db.collection('staff').doc(req.params.id).update({
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/staff/:id', async (req, res) => {
  try {
    await db.collection('staff').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ORDERS ====================
app.get('/api/admin/orders', async (req, res) => {
  try {
    const { branch } = req.query;
    let query = db.collection('orders').orderBy('createdAt', 'desc');
    
    if (branch) {
      query = query.where('branch', '==', branch);
    }
    
    const snapshot = await query.limit(100).get();
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()
    }));
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/orders/:id', async (req, res) => {
  try {
    const doc = await db.collection('orders').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/orders', async (req, res) => {
  // Server-side validation before creating order
  try {
    DataFlowService.validateOrderPayload(req.body);
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }

  try {
    const orderData = {
      ...req.body,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'pending',
      progress: 0
    };
    
    const docRef = await db.collection('orders').add(orderData);
    res.json({ id: docRef.id, ...orderData, success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== REPORTS ====================
app.get('/api/reports/orders', async (req, res) => {
  try {
    const { branch, filterBy, q } = req.query;
    let query = db.collection('orders');
    
    if (branch) {
      query = query.where('branch', '==', branch);
    }
    
    const snapshot = await query.get();
    let orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()
    }));
    
    // Apply filters
    if (filterBy && q) {
      const searchTerm = q.toLowerCase();
      orders = orders.filter(order => {
        switch (filterBy) {
          case 'orderid':
            return order.orderId?.toLowerCase().includes(searchTerm);
          case 'customer':
            return order.customerName?.toLowerCase().includes(searchTerm);
          case 'phone':
            return order.customerPhone?.includes(q);
          case 'staff':
            return order.assignedStaff?.some(staff => 
              staff.name?.toLowerCase().includes(searchTerm)
            );
          default:
            return true;
        }
      });
    }
    
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== DASHBOARD ====================
app.get('/api/dashboard', async (req, res) => {
  try {
    const ordersSnapshot = await db.collection('orders').get();
    const orders = ordersSnapshot.docs.map(doc => doc.data());
    
    const stats = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
      advanceCollected: orders.reduce((sum, order) => sum + (order.advancePayment || 0), 0),
      pendingOrders: orders.filter(order => order.status === 'pending').length
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== AUTHENTICATION ====================
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Check against Firebase Auth or custom logic
    if (username === 'admin' && password === '1234') {
      const customToken = await admin.auth().createCustomToken('admin', {
        role: 'admin',
        permissions: { canEdit: true, canDelete: true, canViewReports: true, canManageStaff: true }
      });
      
      res.json({
        success: true,
        token: customToken,
        user: { username: 'admin', role: 'admin' }
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CUSTOMERS ====================
app.get('/api/admin/customers', async (req, res) => {
  try {
    const snapshot = await db.collection('customers').get();
    const customers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Firebase Backend Server running on port ${PORT}`);
  console.log(`📊 Admin Panel: http://localhost:${PORT}`);
  console.log(`🔥 Firebase Backend: LIVE`);
});

module.exports = app;