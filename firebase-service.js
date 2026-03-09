const admin = require('firebase-admin');

class FirebaseService {
  constructor() {
    if (!admin.apps.length) {
      const serviceAccount = require('./firebase-service-account.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
    this.db = admin.firestore();
  }

  // Staff Operations
  async getStaff(branchId = null) {
    try {
      let query = this.db.collection('staff');
      if (branchId) {
        query = query.where('branchId', '==', branchId);
      }
      
      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting staff:', error);
      throw error;
    }
  }

  async createStaff(staffData) {
    try {
      const docRef = await this.db.collection('staff').add({
        ...staffData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        availability: 'available'
      });
      
      return { id: docRef.id, ...staffData };
    } catch (error) {
      console.error('Error creating staff:', error);
      throw error;
    }
  }

  async updateStaff(staffId, updateData) {
    try {
      await this.db.collection('staff').doc(staffId).update({
        ...updateData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return { id: staffId, ...updateData };
    } catch (error) {
      console.error('Error updating staff:', error);
      throw error;
    }
  }

  async deleteStaff(staffId) {
    try {
      await this.db.collection('staff').doc(staffId).delete();
      return { success: true };
    } catch (error) {
      console.error('Error deleting staff:', error);
      throw error;
    }
  }

  // Order Operations
  async getOrders(branchId = null, limit = 100) {
    try {
      let query = this.db.collection('orders').orderBy('createdAt', 'desc');
      
      if (branchId) {
        query = query.where('branchId', '==', branchId);
      }
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt
      }));
    } catch (error) {
      console.error('Error getting orders:', error);
      throw error;
    }
  }

  async createOrder(orderData) {
    try {
      const docRef = await this.db.collection('orders').add({
        ...orderData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'pending',
        progress: 0
      });
      
      return { id: docRef.id, ...orderData };
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  // Branch Operations
  async getBranches() {
    try {
      const snapshot = await this.db.collection('branches').get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        branchId: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting branches:', error);
      throw error;
    }
  }

  // Customer Operations
  async getCustomers(branchId = null) {
    try {
      let query = this.db.collection('customers');
      if (branchId) {
        query = query.where('branchId', '==', branchId);
      }
      
      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting customers:', error);
      throw error;
    }
  }

  // Reports Operations
  async getOrderReports(filters = {}) {
    try {
      let query = this.db.collection('orders');
      
      if (filters.branchId) {
        query = query.where('branchId', '==', filters.branchId);
      }
      
      if (filters.fromDate) {
        query = query.where('createdAt', '>=', new Date(filters.fromDate));
      }
      
      if (filters.toDate) {
        query = query.where('createdAt', '<=', new Date(filters.toDate));
      }
      
      const snapshot = await query.get();
      let orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt
      }));
      
      // Apply additional filters
      if (filters.filterBy && filters.q) {
        const searchTerm = filters.q.toLowerCase();
        orders = orders.filter(order => {
          switch (filters.filterBy) {
            case 'orderid':
              return order.orderId?.toLowerCase().includes(searchTerm);
            case 'customer':
              return order.customerName?.toLowerCase().includes(searchTerm);
            case 'phone':
              return order.customerPhone?.includes(filters.q);
            case 'staff':
              return order.assignedStaff?.some(staff => 
                staff.name?.toLowerCase().includes(searchTerm)
              );
            default:
              return true;
          }
        });
      }
      
      return orders;
    } catch (error) {
      console.error('Error getting order reports:', error);
      throw error;
    }
  }

  // Dashboard Statistics
  async getDashboardStats(branchId = null) {
    try {
      let ordersQuery = this.db.collection('orders');
      if (branchId) {
        ordersQuery = ordersQuery.where('branchId', '==', branchId);
      }
      
      const ordersSnapshot = await ordersQuery.get();
      const orders = ordersSnapshot.docs.map(doc => doc.data());
      
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      const advanceCollected = orders.reduce((sum, order) => sum + (order.advancePayment || 0), 0);
      const pendingOrders = orders.filter(order => order.status === 'pending').length;
      
      return {
        totalOrders,
        totalRevenue,
        advanceCollected,
        pendingOrders
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      throw error;
    }
  }
}

module.exports = FirebaseService;