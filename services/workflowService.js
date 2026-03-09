const { Staff, Order, Notification, Settings } = require('../database');

class WorkflowService {
  
  // Auto-assign task to available staff
  static async autoAssignTask(order, stageId) {
    try {
      const settings = await Settings.findOne();
      const stage = settings.workflowStages.find(s => s.id === stageId);
      
      if (!stage) return null;

      // Find available staff with required skills
      const availableStaff = await Staff.find({
        workflowStages: stageId,
        isAvailable: true,
        currentTaskCount: { $lt: 3 } // Max 3 concurrent tasks
      }).sort({ currentTaskCount: 1, rating: -1 });

      if (availableStaff.length === 0) return null;

      const selectedStaff = availableStaff[0];
      
      // Find the task in the order
      const taskIndex = order.workflowTasks.findIndex(t => t.stageId === stageId);
      if (taskIndex === -1) return null;

      // Assign task
      order.workflowTasks[taskIndex].status = 'assigned';
      order.workflowTasks[taskIndex].assignedTo = selectedStaff._id;
      order.workflowTasks[taskIndex].assignedToName = selectedStaff.name;
      order.workflowTasks[taskIndex].updatedAt = new Date();

      // Update staff task count
      selectedStaff.currentTaskCount += 1;
      await selectedStaff.save();
      await order.save();

      // Send notification
      await this.sendTaskNotification(selectedStaff, order, stage, 'assigned');

      return selectedStaff;
    } catch (error) {
      console.error('Auto-assign task error:', error);
      return null;
    }
  }

  // Progress to next workflow stage
  static async progressToNextStage(order, completedStageId) {
    try {
      const settings = await Settings.findOne();
      const currentStage = settings.workflowStages.find(s => s.id === completedStageId);
      
      if (!currentStage) return;

      // Use only the stages actually selected for this order
      const orderStageIds = (order.workflowTasks || []).map(t => t.stageId);
      const orderStages = settings.workflowStages.filter(s => orderStageIds.includes(s.id))
          .sort((a, b) => a.order - b.order);
      const currentIdx = orderStages.findIndex(s => s.id === completedStageId);
      const nextStage = orderStages[currentIdx + 1] || null;
            
      if (!nextStage) {
        // All stages completed
        order.status = 'completed';
        order.currentStage = 'completed';
        await order.save();
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
        await this.autoAssignTask(order, nextStage.id);
      }
    } catch (error) {
      console.error('Progress to next stage error:', error);
    }
  }

  // Send task notification
  static async sendTaskNotification(staff, order, stage, type) {
    try {
      let title, message;
      
      switch (type) {
        case 'assigned':
          title = `New ${stage.name} Task Assigned`;
          message = `Order #${order.orderId} for ${order.customerName} has been assigned to you.`;
          break;
        case 'completed':
          title = `${stage.name} Task Completed`;
          message = `Order #${order.orderId} ${stage.name} stage has been completed.`;
          break;
        default:
          title = 'Task Update';
          message = `Order #${order.orderId} has been updated.`;
      }

      // Save notification to database
      const notification = new Notification({
        type: 'task_assigned',
        title,
        message,
        recipientId: staff._id,
        orderId: order.orderId,
        taskId: `${order.orderId}_${stage.id}`
      });

      await notification.save();

      // Here you would integrate with FCM or WebSocket for real-time notifications
      console.log(`📱 Notification sent to ${staff.name}: ${title}`);
      
      return notification;
    } catch (error) {
      console.error('Send notification error:', error);
    }
  }

  // Get staff notifications
  static async getStaffNotifications(staffId, limit = 10) {
    try {
      const staff = await Staff.findOne({ staffId });
      if (!staff) return [];

      const notifications = await Notification.find({ 
        recipientId: staff._id 
      })
      .sort({ sentAt: -1 })
      .limit(limit);

      return notifications;
    } catch (error) {
      console.error('Get notifications error:', error);
      return [];
    }
  }

  // Mark notification as read
  static async markNotificationRead(notificationId) {
    try {
      await Notification.findByIdAndUpdate(notificationId, {
        isRead: true,
        readAt: new Date()
      });
    } catch (error) {
      console.error('Mark notification read error:', error);
    }
  }

  // Get staff tasks
  static async getStaffTasks(staffId, status = null) {
    try {
      const staff = await Staff.findOne({ staffId });
      if (!staff) return [];

      let query = {
        'workflowTasks.assignedTo': staff._id
      };

      if (status) {
        query['workflowTasks.status'] = status;
      }

      const orders = await Order.find(query);
      
      const tasks = [];
      orders.forEach(order => {
        order.workflowTasks.forEach(task => {
          if (task.assignedTo && task.assignedTo.toString() === staff._id.toString()) {
            if (!status || task.status === status) {
              tasks.push({
                ...task.toObject(),
                orderId: order.orderId,
                customerName: order.customerName,
                customerPhone: order.customerPhone,
                garmentType: order.garmentType,
                deliveryDate: order.deliveryDate,
                totalAmount: order.totalAmount
              });
            }
          }
        });
      });

      return tasks.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    } catch (error) {
      console.error('Get staff tasks error:', error);
      return [];
    }
  }

  // Get available tasks for staff
  static async getAvailableTasksForStaff(staffId) {
    try {
      const staff = await Staff.findOne({ staffId });
      if (!staff) return [];

      const orders = await Order.find({
        'workflowTasks.status': 'pending',
        'workflowTasks.stageId': { $in: staff.workflowStages }
      });

      const availableTasks = [];
      orders.forEach(order => {
        order.workflowTasks.forEach(task => {
          if (task.status === 'pending' && staff.workflowStages.includes(task.stageId)) {
            availableTasks.push({
              ...task.toObject(),
              orderId: order.orderId,
              customerName: order.customerName,
              customerPhone: order.customerPhone,
              garmentType: order.garmentType,
              deliveryDate: order.deliveryDate,
              totalAmount: order.totalAmount
            });
          }
        });
      });

      return availableTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      console.error('Get available tasks error:', error);
      return [];
    }
  }

  // Update task status
  static async updateTaskStatus(orderId, stageId, staffId, newStatus, data = {}) {
    try {
      const order = await Order.findOne({ orderId });
      const staff = await Staff.findOne({ staffId });
      
      if (!order || !staff) return false;

      const taskIndex = order.workflowTasks.findIndex(t => t.stageId === stageId);
      if (taskIndex === -1) return false;

      const task = order.workflowTasks[taskIndex];
      
      // Update task based on status
      task.status = newStatus;
      task.updatedAt = new Date();

      switch (newStatus) {
        case 'assigned':
          task.assignedTo = staff._id;
          task.assignedToName = staff.name;
          staff.currentTaskCount += 1;
          break;
        case 'started':
          task.startedAt = new Date();
          break;
        case 'paused':
          task.pausedAt = new Date();
          if (data.notes) task.notes = (task.notes || '') + `\nPaused: ${data.notes}`;
          break;
        case 'resumed':
          task.resumedAt = new Date();
          break;
        case 'completed':
          task.completedAt = new Date();
          if (data.notes) task.notes = (task.notes || '') + `\nCompleted: ${data.notes}`;
          if (data.qualityRating) task.qualityRating = data.qualityRating;
          if (data.images) task.images = [...(task.images || []), ...data.images];
          
          // Calculate time spent
          if (task.startedAt) {
            let timeSpent = new Date() - new Date(task.startedAt);
            if (task.pausedAt && task.resumedAt) {
              timeSpent -= new Date(task.resumedAt) - new Date(task.pausedAt);
            }
            task.timeSpent = Math.round(timeSpent / (1000 * 60)); // in minutes
          }
          
          staff.currentTaskCount = Math.max(0, staff.currentTaskCount - 1);
          
          // Progress to next stage
          const settings = await Settings.findOne();
          const stage = settings.workflowStages.find(s => s.id === stageId);
          await this.progressToNextStage(order, stageId);
          await this.sendTaskNotification(staff, order, stage, 'completed');
          break;
      }

      await staff.save();
      await order.save();

      return true;
    } catch (error) {
      console.error('Update task status error:', error);
      return false;
    }
  }
}

module.exports = WorkflowService;