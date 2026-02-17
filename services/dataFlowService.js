const { Order, Staff, Customer, Notification, Settings } = require('../database');

/**
 * Data Flow Service - Ensures seamless data synchronization between Admin Panel and Staff Application
 * This service handles real-time data updates and maintains consistency across all platforms
 */
class DataFlowService {
    
    /**
     * Process order creation from admin panel and sync to staff application
     */
    static async processOrderCreation(orderData, adminUser) {
        try {
            console.log('🔄 Processing order creation for staff sync...');
            
            // 1. Create order in database
            const order = new Order(orderData);
            await order.save();
            
            // 2. Auto-assign first task to available staff
            if (order.workflowTasks && order.workflowTasks.length > 0) {
                const firstTask = order.workflowTasks[0];
                const availableStaff = await this.findAvailableStaff(firstTask.stageId, order.branch);
                
                if (availableStaff) {
                    firstTask.status = 'assigned';
                    firstTask.assignedTo = availableStaff._id;
                    firstTask.assignedToName = availableStaff.name;
                    firstTask.updatedAt = new Date();
                    
                    // Update staff workload
                    availableStaff.currentTaskCount += 1;
                    await availableStaff.save();
                    await order.save();
                    
                    // 3. Create notification for staff
                    await this.createStaffNotification({
                        type: 'task_assigned',
                        title: `New ${firstTask.stageName} Task`,
                        message: `Order #${order.orderId} for ${order.customerName} has been assigned to you.`,
                        recipientId: availableStaff._id,
                        orderId: order.orderId,
                        taskId: firstTask.stageId
                    });
                    
                    console.log(`✅ Task auto-assigned to ${availableStaff.name}`);
                } else {
                    // Keep as pending if no staff available
                    firstTask.status = 'pending';
                    await order.save();
                    console.log('⚠️ No available staff found, task kept as pending');
                }
            }
            
            // 4. Update customer record
            await this.updateCustomerRecord(orderData);
            
            // 5. Trigger real-time updates
            await this.broadcastUpdate('order_created', {
                orderId: order.orderId,
                branch: order.branch,
                affectedStaff: order.workflowTasks
                    .filter(t => t.assignedTo)
                    .map(t => t.assignedTo.toString())
            });
            
            return { success: true, order, message: 'Order created and synced to staff application' };
            
        } catch (error) {
            console.error('❌ Order creation processing error:', error);
            throw error;
        }
    }
    
    /**
     * Find available staff for a specific workflow stage and branch
     */
    static async findAvailableStaff(stageId, branch) {
        try {
            const staff = await Staff.findOne({
                workflowStages: stageId,
                branch: branch,
                isAvailable: true
            }).sort({ currentTaskCount: 1 }); // Assign to staff with least workload
            
            return staff;
        } catch (error) {
            console.error('❌ Find available staff error:', error);
            return null;
        }
    }
    
    /**
     * Create staff notification and ensure it reaches the mobile app
     */
    static async createStaffNotification(notificationData) {
        try {
            const notification = new Notification(notificationData);
            await notification.save();
            
            // Trigger real-time notification to staff app
            await this.sendRealTimeNotification(notificationData.recipientId, {
                type: notificationData.type,
                title: notificationData.title,
                message: notificationData.message,
                orderId: notificationData.orderId,
                timestamp: new Date().toISOString()
            });
            
            return notification;
        } catch (error) {
            console.error('❌ Create staff notification error:', error);
            throw error;
        }
    }
    
    /**
     * Update customer record with order information
     */
    static async updateCustomerRecord(orderData) {
        try {
            const customer = await Customer.findOneAndUpdate(
                { phone: orderData.customerPhone },
                {
                    $set: {
                        name: orderData.customerName,
                        phone: orderData.customerPhone,
                        address: orderData.customerAddress || ''
                    },
                    $inc: {
                        totalOrders: 1,
                        totalSpent: orderData.totalAmount || 0
                    },
                    $setOnInsert: {
                        createdAt: new Date()
                    }
                },
                { upsert: true, new: true }
            );
            
            return customer;
        } catch (error) {
            console.error('❌ Update customer record error:', error);
            throw error;
        }
    }
    
    /**
     * Process staff task updates and sync back to admin panel
     */
    static async processStaffTaskUpdate(staffId, orderId, stageId, updateData) {
        try {
            console.log(`🔄 Processing staff task update: ${staffId} -> ${orderId} -> ${stageId}`);
            
            const order = await Order.findOne({ orderId });
            if (!order) throw new Error('Order not found');
            
            const taskIndex = order.workflowTasks.findIndex(t => t.stageId === stageId);
            if (taskIndex === -1) throw new Error('Task not found');
            
            const task = order.workflowTasks[taskIndex];
            const staff = await Staff.findOne({ staffId });
            
            // Update task based on action
            task.status = updateData.status;
            task.updatedAt = new Date();
            
            switch (updateData.status) {
                case 'started':
                    task.startedAt = new Date();
                    break;
                    
                case 'paused':
                    task.pausedAt = new Date();
                    if (updateData.notes) {
                        task.notes = (task.notes || '') + `\nPaused: ${updateData.notes}`;
                    }
                    break;
                    
                case 'resumed':
                    task.resumedAt = new Date();
                    break;
                    
                case 'completed':
                    task.completedAt = new Date();
                    if (updateData.notes) {
                        task.notes = (task.notes || '') + `\nCompleted: ${updateData.notes}`;
                    }
                    if (updateData.qualityRating) {
                        task.qualityRating = updateData.qualityRating;
                    }
                    
                    // Calculate time spent
                    if (task.startedAt) {
                        let timeSpent = new Date() - new Date(task.startedAt);
                        if (task.pausedAt && task.resumedAt) {
                            timeSpent -= new Date(task.resumedAt) - new Date(task.pausedAt);
                        }
                        task.timeSpent = Math.round(timeSpent / (1000 * 60)); // in minutes
                    }
                    
                    // Update staff workload
                    if (staff) {
                        staff.currentTaskCount = Math.max(0, staff.currentTaskCount - 1);
                        await staff.save();
                    }
                    
                    // Progress to next stage
                    await this.progressToNextStage(order, stageId);
                    break;
            }
            
            await order.save();
            
            // Broadcast update to admin panel
            await this.broadcastUpdate('task_updated', {
                orderId: order.orderId,
                stageId,
                status: updateData.status,
                staffId,
                staffName: staff?.name,
                timestamp: new Date().toISOString()
            });
            
            return { success: true, message: `Task ${updateData.status} successfully` };
            
        } catch (error) {
            console.error('❌ Staff task update error:', error);
            throw error;
        }
    }
    
    /**
     * Progress order to next workflow stage
     */
    static async progressToNextStage(order, completedStageId) {
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
                
                // Notify admin of completion
                await this.broadcastUpdate('order_completed', {
                    orderId: order.orderId,
                    customerName: order.customerName,
                    branch: order.branch
                });
                
                console.log(`🎉 Order ${order.orderId} completed all stages!`);
                return;
            }
            
            // Activate next stage
            const nextTaskIndex = order.workflowTasks.findIndex(t => t.stageId === nextStage.id);
            if (nextTaskIndex !== -1) {
                order.workflowTasks[nextTaskIndex].status = 'pending';
                order.workflowTasks[nextTaskIndex].updatedAt = new Date();
                order.currentStage = nextStage.id;
                
                // Auto-assign next task
                const nextStageStaff = await this.findAvailableStaff(nextStage.id, order.branch);
                
                if (nextStageStaff) {
                    order.workflowTasks[nextTaskIndex].status = 'assigned';
                    order.workflowTasks[nextTaskIndex].assignedTo = nextStageStaff._id;
                    order.workflowTasks[nextTaskIndex].assignedToName = nextStageStaff.name;
                    order.workflowTasks[nextTaskIndex].updatedAt = new Date();
                    
                    nextStageStaff.currentTaskCount += 1;
                    await nextStageStaff.save();
                    
                    // Create notification for next staff
                    await this.createStaffNotification({
                        type: 'task_assigned',
                        title: `New ${nextStage.name} Task`,
                        message: `Order #${order.orderId} for ${order.customerName} has been assigned to you.`,
                        recipientId: nextStageStaff._id,
                        orderId: order.orderId,
                        taskId: nextStage.id
                    });
                    
                    console.log(`🔄 Next stage assigned: ${nextStageStaff.name} got ${nextStage.name} for order ${order.orderId}`);
                }
                
                await order.save();
            }
            
        } catch (error) {
            console.error('❌ Progress to next stage error:', error);
        }
    }
    
    /**
     * Send real-time notification to staff mobile app
     */
    static async sendRealTimeNotification(staffId, notificationData) {
        try {
            // In a production environment, this would integrate with:
            // - Firebase Cloud Messaging (FCM) for push notifications
            // - WebSocket connections for real-time updates
            // - SMS notifications as fallback
            
            console.log(`📱 Sending real-time notification to staff ${staffId}:`, notificationData);
            
            // For now, we'll store it in a way that the mobile app can poll
            // In production, implement proper push notification service
            
            return { success: true, message: 'Notification sent' };
            
        } catch (error) {
            console.error('❌ Send real-time notification error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Broadcast updates to all connected clients (admin panels, staff apps)
     */
    static async broadcastUpdate(eventType, data) {
        try {
            console.log(`📡 Broadcasting update: ${eventType}`, data);
            
            // In production, this would use WebSocket connections or Server-Sent Events
            // to push real-time updates to all connected clients
            
            // For now, we'll log the event for debugging
            const updateEvent = {
                type: eventType,
                data,
                timestamp: new Date().toISOString()
            };
            
            // Store recent events for polling-based clients
            // In production, use Redis or similar for better performance
            
            return updateEvent;
            
        } catch (error) {
            console.error('❌ Broadcast update error:', error);
        }
    }
    
    /**
     * Get staff tasks with real-time data
     */
    static async getStaffTasks(staffId, includeAvailable = false) {
        try {
            const staff = await Staff.findOne({ staffId });
            if (!staff) throw new Error('Staff not found');
            
            const staffIdStr = staff._id.toString();
            
            // Get assigned tasks
            const assignedOrders = await Order.find({
                'workflowTasks': {
                    $elemMatch: {
                        assignedTo: staff._id,
                        status: { $in: ['assigned', 'started', 'paused', 'resumed'] }
                    }
                }
            });
            
            const myTasks = [];
            assignedOrders.forEach(order => {
                order.workflowTasks.forEach(task => {
                    if (task.assignedTo && task.assignedTo.toString() === staffIdStr && 
                        ['assigned', 'started', 'paused', 'resumed'].includes(task.status)) {
                        
                        myTasks.push({
                            ...task.toObject(),
                            orderId: order.orderId,
                            customerName: order.customerName,
                            customerPhone: order.customerPhone,
                            garmentType: order.garmentType,
                            deliveryDate: order.deliveryDate,
                            measurements: order.measurements,
                            designNotes: order.designNotes,
                            designImages: order.designImages || []
                        });
                    }
                });
            });
            
            let availableTasks = [];
            if (includeAvailable) {
                // Get available tasks for this staff's workflow stages
                const availableOrders = await Order.find({
                    'workflowTasks': {
                        $elemMatch: {
                            stageId: { $in: staff.workflowStages },
                            status: 'pending',
                            assignedTo: null
                        }
                    }
                });
                
                availableOrders.forEach(order => {
                    order.workflowTasks.forEach(task => {
                        if (task.status === 'pending' && 
                            staff.workflowStages.includes(task.stageId) && 
                            !task.assignedTo) {
                            
                            availableTasks.push({
                                ...task.toObject(),
                                orderId: order.orderId,
                                customerName: order.customerName,
                                customerPhone: order.customerPhone,
                                garmentType: order.garmentType,
                                deliveryDate: order.deliveryDate,
                                measurements: order.measurements,
                                designNotes: order.designNotes,
                                designImages: order.designImages || []
                            });
                        }
                    });
                });
            }
            
            return {
                myTasks,
                availableTasks,
                staff: {
                    id: staff._id,
                    staffId: staff.staffId,
                    name: staff.name,
                    role: staff.role,
                    workflowStages: staff.workflowStages,
                    currentTaskCount: staff.currentTaskCount,
                    isAvailable: staff.isAvailable
                }
            };
            
        } catch (error) {
            console.error('❌ Get staff tasks error:', error);
            throw error;
        }
    }
    
    /**
     * Accept available task and assign to staff
     */
    static async acceptTask(staffId, orderId, stageId) {
        try {
            const staff = await Staff.findOne({ staffId });
            const order = await Order.findOne({ orderId });
            
            if (!staff || !order) {
                throw new Error('Staff or order not found');
            }
            
            const taskIndex = order.workflowTasks.findIndex(t => t.stageId === stageId);
            if (taskIndex === -1) {
                throw new Error('Task not found');
            }
            
            const task = order.workflowTasks[taskIndex];
            if (task.status !== 'pending') {
                throw new Error('Task is not available');
            }
            
            // Assign task to staff
            task.status = 'assigned';
            task.assignedTo = staff._id;
            task.assignedToName = staff.name;
            task.updatedAt = new Date();
            
            // Update staff workload
            staff.currentTaskCount += 1;
            
            await staff.save();
            await order.save();
            
            // Broadcast update
            await this.broadcastUpdate('task_accepted', {
                orderId: order.orderId,
                stageId,
                staffId,
                staffName: staff.name
            });
            
            console.log(`✅ Task accepted: ${staff.name} accepted ${task.stageName} for order ${orderId}`);
            
            return { success: true, message: 'Task accepted successfully' };
            
        } catch (error) {
            console.error('❌ Accept task error:', error);
            throw error;
        }
    }
}

module.exports = DataFlowService;