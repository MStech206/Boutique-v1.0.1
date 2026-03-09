const firebaseIntegrationService = require('../firebase-integration-service');
const admin = require('firebase-admin');
 
      const Ts = () => admin.firestore.Timestamp.now();
      const toDate = (v) => {
        if (!v) return null;
        if (typeof v.toDate === 'function') return v.toDate();       // Firestore Timestamp
        if (v.seconds !== undefined) return new Date(v.seconds * 1000); // raw {seconds}
        return new Date(v);
      };
/**
 * Data Flow Service (Firestore-backed)
 * - Migrated from Mongoose → Firestore
 * - Keeps same public API so routes/tests remain compatible
 */
class DataFlowService {

  static _toDate(field) {
    if (!field) return null;
    if (field && typeof field.toDate === 'function') return field.toDate();
    return new Date(field);
  }

  
  static _db(adminId) {
    return adminId
      ? firebaseIntegrationService.forClient(adminId)
      : firebaseIntegrationService;
  }

  static async _getOrder(orderId, adminId) {
    // Orders are stored by orderId field, not as doc ID — query by field
    const db = this._db(adminId);
    const res = await db.getCollection('orders', { where: [['orderId', '==', orderId]], limit: 1 });
    if (res.success && res.data && res.data.length > 0) return res.data[0];
    return null;
  }

 
  static async _setOrder(orderId, data, adminId) {
    const db = this._db(adminId);
    const existing = await db.getCollection('orders', { where: [['orderId', '==', orderId]], limit: 1 });
    const docId = (existing.success && existing.data?.[0]?.id) || orderId;
    return db.setDocument('orders', docId, data);
  }

  static async _getStaffById(staffId, adminId) {
    const db = this._db(adminId);
    const res = await db.getCollection('staff', { where: [['staffId', '==', staffId]], limit: 1 });
    if (res.success && res.data && res.data.length > 0) return res.data[0];
    return null;
  }

  static validateOrderPayload(orderData) {
    if (!orderData) throw new Error('Missing order data');

    const customerName = orderData.customerName || (orderData.customer && orderData.customer.name);
    if (!customerName || String(customerName).trim().length === 0) throw new Error('customerName is required');

    const rawPhone = orderData.customerPhone || (orderData.customer && orderData.customer.phone) || '';
    const digits = String(rawPhone).replace(/\D/g, '');
    if (!digits || digits.length < 10) throw new Error('customerPhone is required and must be at least 10 digits');

    if (!orderData.garmentType || String(orderData.garmentType).trim().length === 0) throw new Error('garmentType is required');

    const total = Number(orderData.totalAmount || (orderData.pricing && orderData.pricing.total) || 0);
    if (!(total > 0)) throw new Error('totalAmount (pricing.total) must be greater than zero');

    const workflow = orderData.workflow || (orderData.workflowTasks && orderData.workflowTasks.length ? orderData.workflowTasks.map(t => t.stageId) : []);
    if (!workflow || workflow.length === 0) throw new Error('At least one workflow stage must be provided');

    const advance = Number(orderData.advanceAmount || (orderData.pricing && orderData.pricing.advance) || 0);
    if (advance < 0) throw new Error('advance must be a non-negative number');
    if (advance > total) throw new Error('advance cannot be greater than total amount');

    return { valid: true };
  }

  /**
   * Find available staff for a stage (Firestore)
   */
  static async findAvailableStaff(stageId, branch) {
    try {
      // Avoid composite-index queries by querying on `workflowStages` only
      // then filtering/sorting in-memory (acceptable for small staff collections / emulator tests).
      const res = await firebaseIntegrationService.getCollection('staff', { where: [['workflowStages', 'array-contains', stageId]] });
      if (!res.success || !Array.isArray(res.data) || res.data.length === 0) return null;

      // Filter by availability and branch
      const candidates = res.data.filter(s => s.isAvailable && (!branch || s.branch === branch));
      if (candidates.length === 0) return null;

      // Pick staff with least currentTaskCount
      candidates.sort((a, b) => (Number(a.currentTaskCount || 0) - Number(b.currentTaskCount || 0)));
      return candidates[0];
    } catch (error) {
      console.error('❌ findAvailableStaff error:', error.message || error);
      return null;
    }
  }

  /**
   * Create staff notification (Firestore)
   */
  static async createStaffNotification(notificationData) {
    try {
      const id = `${notificationData.recipientId || 'notif'}_${Date.now()}`;
      const doc = {
        ...notificationData,
        sentAt: new Date(),
      };
      await firebaseIntegrationService.setDocument('notifications', id, doc);

      // Also return the saved notification object for tests
      return { id, ...doc };
    } catch (error) {
      console.error('❌ createStaffNotification error:', error.message || error);
      throw error;
    }
  }

  /**
   * Update customer record in Firestore
   */
  static async updateCustomerRecord(orderData) {
    try {
      const phone = orderData.customerPhone || (orderData.customer && orderData.customer.phone);
      if (!phone) return null;

      const existing = await firebaseIntegrationService.getDocument('customers', phone);
      const totalOrders = (existing.success && existing.data.totalOrders) ? existing.data.totalOrders + 1 : 1;
      const totalSpent = (existing.success && existing.data.totalSpent) ? (existing.data.totalSpent + (orderData.totalAmount || 0)) : (orderData.totalAmount || 0);

      const customerDoc = {
        name: orderData.customerName || (orderData.customer && orderData.customer.name) || '',
        phone,
        address: orderData.customerAddress || '',
        totalOrders,
        totalSpent,
        orders: (existing.success && Array.isArray(existing.data.orders)) ? [...existing.data.orders, orderData.orderId] : [orderData.orderId]
      };

      await firebaseIntegrationService.syncCustomer(customerDoc);
      return customerDoc;
    } catch (error) {
      console.error('❌ updateCustomerRecord error:', error.message || error);
      throw error;
    }
  }

  /**
   * Process order creation (Firestore-backed assignment)
   */
  static async processOrderCreation(orderData, adminUser) {
    try {
      this.validateOrderPayload(orderData);

      // Ensure order exists in Firestore (server.js usually calls syncOrder before this)
      let fbOrder = await this._getOrder(orderData.orderId);
      if (!fbOrder) {
        await firebaseIntegrationService.syncOrder(orderData);
        fbOrder = await this._getOrder(orderData.orderId);
      }

      // Auto-assign first task
      if (fbOrder && Array.isArray(fbOrder.workflowTasks) && fbOrder.workflowTasks.length > 0) {
        const firstTask = fbOrder.workflowTasks[0];
        const availableStaff = await this.findAvailableStaff(firstTask.stageId, fbOrder.branch);

        if (availableStaff) {
          firstTask.status = 'assigned';
          firstTask.assignedTo = availableStaff.staffId || availableStaff.id;
          firstTask.assignedToName = availableStaff.name || availableStaff.staffId;
          firstTask.updatedAt = new Date();

          // persist order update
          await this._setOrder(fbOrder.orderId, { workflowTasks: fbOrder.workflowTasks, status: fbOrder.status });

          // increment staff workload
          const staffDoc = await this._getStaffById(availableStaff.staffId || availableStaff.id);
          const newCount = (staffDoc && staffDoc.currentTaskCount ? staffDoc.currentTaskCount : 0) + 1;
          await firebaseIntegrationService.setDocument('staff', availableStaff.staffId || availableStaff.id, { currentTaskCount: newCount });

          // create notification
          await this.createStaffNotification({
            type: 'task_assigned',
            title: `New ${firstTask.stageName} Task`,
            message: `Order #${fbOrder.orderId} for ${fbOrder.customerName} has been assigned to you.`,
            recipientId: availableStaff.staffId || availableStaff.id,
            orderId: fbOrder.orderId,
            taskId: firstTask.stageId
          });

          console.log(`✅ Task auto-assigned to ${availableStaff.name || availableStaff.staffId}`);
        } else {
          console.log('⚠️ No available staff found for auto-assignment (Firestore)');
        }
      }

      // Update customer record in Firestore
      await this.updateCustomerRecord(orderData);

      // Broadcast event (no-op for now)
      await this.broadcastUpdate('order_created', { orderId: orderData.orderId, branch: orderData.branch });

      return { success: true, message: 'Order processed (Firestore DataFlow)' };
    } catch (error) {
      console.error('❌ processOrderCreation (Firestore) error:', error.message || error);
      throw error;
    }
  }

  /**
   * Get tasks for a staff member (reads orders and filters tasks client-side)
   */
   static async getStaffTasks(staffId, includeAvailable = false, adminId = null) {
    try {
      const staff = await this._getStaffById(staffId, adminId);
      if (!staff) throw new Error('Staff not found');
      const db = this._db(adminId);
      const fbRes = await db.getCollection('orders', { orderBy: { field: 'createdAt', direction: 'desc' }, limit: 1000 });
      const orders = fbRes.success ? fbRes.data : [];

      const myTasks = [];
      const availableTasks = [];

      for (const order of orders) {
        const tasks = Array.isArray(order.workflowTasks) ? order.workflowTasks : [];
        for (const task of tasks) {
          if (task.assignedTo && String(task.assignedTo) === String(staffId) && ['assigned', 'started', 'paused', 'resumed'].includes(task.status)) {
            myTasks.push({ ...task, orderId: order.orderId, orderDetails: { customerName: order.customerName, garmentType: order.garmentType, measurements: order.measurements || {} } });
          }

          if (includeAvailable && task.status === 'pending' && (!task.assignedTo) && Array.isArray(staff.workflowStages) && staff.workflowStages.includes(task.stageId)) {
            availableTasks.push({ ...task, orderId: order.orderId, orderDetails: { customerName: order.customerName, garmentType: order.garmentType } });
          }
        }
      }

      return { myTasks, availableTasks, staff };
    } catch (error) {
      console.error('❌ getStaffTasks (Firestore) error:', error.message || error);
      throw error;
    }
  }

  /**
   * Accept task (Firestore)
   */
   static async acceptTask(staffId, orderId, stageId, adminId = null) {
    try {
      const staff = await this._getStaffById(staffId, adminId);
      const order = await this._getOrder(orderId, adminId);
      if (!staff || !order) throw new Error('Staff or order not found');
      const idx = (order.workflowTasks || []).findIndex(t => t.stageId === stageId);
      if (idx === -1) throw new Error('Task not found');
      const task = order.workflowTasks[idx];
      if (task.status !== 'pending') throw new Error('Task is not available');
      task.status = 'assigned';
      task.assignedTo = staffId;
      task.assignedToName = staff.name || staffId;
       task.assignedAt = Ts();
      task.updatedAt = Ts();
      await this._setOrder(orderId, { workflowTasks: order.workflowTasks }, adminId);
      const newCount = (staff.currentTaskCount || 0) + 1;
     
      await this._db(adminId).setDocument('staff', staff.id || staffId, { currentTaskCount: newCount });
      await this.broadcastUpdate('task_accepted', { orderId, stageId, staffId, staffName: staff.name });

      return { success: true, message: 'Task accepted successfully' };
    } catch (error) {
      console.error('❌ acceptTask (Firestore) error:', error.message || error);
      throw error;
    }
  }

  /**
   * Process staff task update (started/paused/resumed/completed) — Firestore implementation
   */
 
      static async processStaffTaskUpdate(staffId, orderId, stageId, updateData, adminId = null) {
        try {
          const order = await this._getOrder(orderId, adminId);
          if (!order) throw new Error('Order not found');
          const taskIndex = (order.workflowTasks || []).findIndex(t => t.stageId === stageId);
          if (taskIndex === -1) throw new Error('Task not found');
          const staff = await this._getStaffById(staffId, adminId);
          if (!staff) throw new Error('Staff not found');
          const task = order.workflowTasks[taskIndex];
          if (!task.assignedTo && ['started','resumed'].includes(updateData.status)) {
            task.assignedTo = staffId;
            task.assignedToName = staff.name;
            staff.currentTaskCount = (staff.currentTaskCount || 0) + 1;
 
            await this._db(adminId).setDocument('staff', staff.id || staffId, { currentTaskCount: staff.currentTaskCount });
          }
          if (task.assignedTo && String(task.assignedTo) !== String(staffId)) {
            throw new Error('Staff is not assigned to this task');
          }
          task.status = updateData.status;
          task.updatedAt = Ts();
          if (updateData.notes) task.notes = updateData.notes;
          if (updateData.qualityRating) task.qualityRating = updateData.qualityRating;
          if (updateData.status === 'started') task.startedAt = Ts();
          if (updateData.status === 'paused') task.pausedAt = Ts();
          if (updateData.status === 'resumed') task.resumedAt = Ts();
          if (updateData.status === 'completed') {
            task.completedAt = Ts();
            if (task.startedAt) task.timeSpent = Math.round((Date.now() - toDate(task.startedAt).getTime()) / 60000);
            staff.currentTaskCount = Math.max(0, (staff.currentTaskCount || 0) - 1);
            await this._db(adminId).setDocument('staff', staff.id || staffId, { currentTaskCount: staff.currentTaskCount });
            await this.progressToNextStage(order, stageId, adminId);
          }
          await this._setOrder(orderId, { workflowTasks: order.workflowTasks }, adminId);

      await this.broadcastUpdate('task_updated', { orderId, stageId, status: updateData.status, staffId, staffName: staff.name });

      return { success: true, message: `Task ${updateData.status} successfully` };
    } catch (error) {
      console.error('❌ processStaffTaskUpdate (Firestore) error:', error.message || error);
      throw error;
    }
  }

  /**
   * Progress to next workflow stage (Firestore)
   */
  
        static async progressToNextStage(order, completedStageId, adminId = null) {
          try {
            const db = this._db(adminId);
            const fbSettings = await db.getCollection('settings', { limit: 1 });
            const settings = (fbSettings.success && fbSettings.data?.length > 0) ? fbSettings.data[0] : null;
            if (!settings || !Array.isArray(settings.workflowStages)) return;

            const normalize = v => String(v || '').trim().toLowerCase();
            const currentStage = settings.workflowStages.find(s => normalize(s.id) === normalize(completedStageId));
            if (!currentStage) return;

            const nextStage = settings.workflowStages.find(s => Number(s.order) === Number(currentStage.order) + 1);
            if (!nextStage) {
              await this._setOrder(order.orderId, { status: 'completed', currentStage: 'completed' }, adminId);
              await this.broadcastUpdate('order_completed', { orderId: order.orderId });
              return;
            }

            const nextTaskIndex = (order.workflowTasks || []).findIndex(t => normalize(t.stageId) === normalize(nextStage.id));
            if (nextTaskIndex === -1) return;

            // Just set to pending — NO auto-assignment, staff picks up from Available Tasks
            order.workflowTasks[nextTaskIndex].status = 'pending';
                  order.workflowTasks[nextTaskIndex].updatedAt = Ts();
            order.currentStage = nextStage.id;

            await this._setOrder(order.orderId, { workflowTasks: order.workflowTasks, currentStage: order.currentStage }, adminId);
            console.log(`▶️ Stage '${nextStage.name}' set to pending for order ${order.orderId}`);
    } catch (error) {
      console.error('❌ Progress to next stage error (Firestore):', error.message || error);
    }
  }

  static async sendRealTimeNotification(staffId, notificationData) {
    try {
      // Store notification in Firestore so staff app can pick it up
      await this.createStaffNotification({ recipientId: staffId, ...notificationData });
      return { success: true, message: 'Notification queued' };
    } catch (error) {
      console.error('❌ sendRealTimeNotification (Firestore) error:', error.message || error);
      return { success: false, error: error.message };
    }
  }

  static async broadcastUpdate(eventType, data) {
    try {
      console.log(`📡 Broadcasting update: ${eventType}`, data);
      // Persist a recent event so polling clients can read it if needed
      const id = `event_${Date.now()}`;
      await firebaseIntegrationService.setDocument('events', id, { type: eventType, data, timestamp: new Date() });
      return { type: eventType, data, timestamp: new Date().toISOString() };
    } catch (error) {
      console.error('❌ broadcastUpdate (Firestore) error:', error.message || error);
    }
  }
}

module.exports = DataFlowService;