const express = require('express');
const DataFlowService = require('../services/dataFlowService');
const { Order, Staff, Customer, Notification } = require('../database');

const router = express.Router();

/**
 * Enhanced API Routes for Data Flow Management
 * These routes ensure seamless data synchronization between admin panel and staff application
 */

// ==================== ADMIN PANEL ROUTES ====================

/**
 * Create order with automatic staff assignment and real-time sync
 */
router.post('/admin/orders/create', async (req, res) => {
    try {
        console.log('📥 Admin creating order with staff sync...');
        
        const orderData = {
            orderId: `ORD-${Date.now()}`,
            customerName: req.body.customer?.name || req.body.customerName,
            customerPhone: req.body.customer?.phone || req.body.customerPhone,
            customerAddress: req.body.customer?.address || req.body.customerAddress || '',
            garmentType: req.body.garmentType,
            measurements: req.body.measurements || {},
            totalAmount: Number(req.body.pricing?.total || req.body.totalAmount || 0),
            advanceAmount: Number(req.body.pricing?.advance || req.body.advanceAmount || 0),
            balanceAmount: Number(req.body.pricing?.balance || req.body.balanceAmount || 0),
            deliveryDate: req.body.deliveryDate ? new Date(req.body.deliveryDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            branch: req.body.branch || 'SAPTHALA.MAIN',
            status: 'pending',
            currentStage: 'dyeing',
            workflowTasks: [],
            designNotes: req.body.designNotes || req.body.designDescription || '',
            designImages: Array.isArray(req.body.designImages) ? req.body.designImages : []
        };

        // Create workflow tasks based on selected stages
        const requestedStages = req.body.workflow || ['dyeing', 'cutting', 'stitching', 'finishing', 'quality-check', 'ready-to-deliver'];
        
        const settings = await require('../database').Settings.findOne();
        if (!settings || !settings.workflowStages) {
            return res.status(500).json({ 
                success: false, 
                error: 'Workflow not configured. Please contact administrator.' 
            });
        }

        requestedStages.forEach((stageId, index) => {
            const stageConfig = settings.workflowStages.find(s => s.id === stageId);
            if (stageConfig) {
                orderData.workflowTasks.push({
                    stageId: stageConfig.id,
                    stageName: stageConfig.name,
                    stageIcon: stageConfig.icon,
                    status: index === 0 ? 'pending' : 'waiting',
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }
        });

        // Process order creation with staff sync
        const result = await DataFlowService.processOrderCreation(orderData, req.user);
        
        res.json({
            success: true,
            order: {
                _id: result.order._id,
                orderId: result.order.orderId,
                customerName: result.order.customerName,
                status: result.order.status,
                workflowTasks: result.order.workflowTasks.map(t => ({
                    stageId: t.stageId,
                    stageName: t.stageName,
                    status: t.status,
                    assignedToName: t.assignedToName
                }))
            },
            message: result.message
        });

    } catch (error) {
        console.error('❌ Admin order creation error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to create order' 
        });
    }
});

/**
 * Get real-time order status for admin dashboard
 */
router.get('/admin/orders/status/:orderId', async (req, res) => {
    try {
        const order = await Order.findOne({ orderId: req.params.orderId });
        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        // Calculate progress
        const completedTasks = order.workflowTasks.filter(t => t.status === 'completed').length;
        const totalTasks = order.workflowTasks.length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // Get current active task
        const activeTask = order.workflowTasks.find(t => ['assigned', 'started', 'resumed'].includes(t.status));

        res.json({
            success: true,
            order: {
                orderId: order.orderId,
                status: order.status,
                currentStage: order.currentStage,
                progress: `${progress}%`,
                completedTasks,
                totalTasks,
                activeTask: activeTask ? {
                    stageName: activeTask.stageName,
                    status: activeTask.status,
                    assignedToName: activeTask.assignedToName,
                    startedAt: activeTask.startedAt,
                    updatedAt: activeTask.updatedAt
                } : null,
                workflowTasks: order.workflowTasks.map(t => ({
                    stageId: t.stageId,
                    stageName: t.stageName,
                    status: t.status,
                    assignedToName: t.assignedToName,
                    startedAt: t.startedAt,
                    completedAt: t.completedAt,
                    timeSpent: t.timeSpent,
                    qualityRating: t.qualityRating
                }))
            }
        });

    } catch (error) {
        console.error('❌ Get order status error:', error);
        res.status(500).json({ success: false, error: 'Failed to get order status' });
    }
});

/**
 * Get real-time staff workload for admin monitoring
 */
router.get('/admin/staff/workload', async (req, res) => {
    try {
        const { branch } = req.query;
        
        let query = {};
        if (branch && branch !== 'all') {
            query.branch = branch;
        }

        const staff = await Staff.find(query).select('staffId name role branch workflowStages currentTaskCount isAvailable lastLogin');
        
        // Get active tasks for each staff member
        const staffWithTasks = await Promise.all(staff.map(async (s) => {
            const activeTasks = await Order.find({
                'workflowTasks': {
                    $elemMatch: {
                        assignedTo: s._id,
                        status: { $in: ['assigned', 'started', 'paused', 'resumed'] }
                    }
                }
            }).select('orderId customerName workflowTasks');

            const tasks = [];
            activeTasks.forEach(order => {
                order.workflowTasks.forEach(task => {
                    if (task.assignedTo && task.assignedTo.toString() === s._id.toString() && 
                        ['assigned', 'started', 'paused', 'resumed'].includes(task.status)) {
                        tasks.push({
                            orderId: order.orderId,
                            customerName: order.customerName,
                            stageName: task.stageName,
                            status: task.status,
                            startedAt: task.startedAt
                        });
                    }
                });
            });

            return {
                staffId: s.staffId,
                name: s.name,
                role: s.role,
                branch: s.branch,
                workflowStages: s.workflowStages,
                currentTaskCount: s.currentTaskCount,
                isAvailable: s.isAvailable,
                lastLogin: s.lastLogin,
                activeTasks: tasks
            };
        }));

        res.json({
            success: true,
            staff: staffWithTasks,
            summary: {
                totalStaff: staff.length,
                availableStaff: staff.filter(s => s.isAvailable).length,
                busyStaff: staff.filter(s => s.currentTaskCount > 0).length,
                totalActiveTasks: staff.reduce((sum, s) => sum + s.currentTaskCount, 0)
            }
        });

    } catch (error) {
        console.error('❌ Get staff workload error:', error);
        res.status(500).json({ success: false, error: 'Failed to get staff workload' });
    }
});

// ==================== STAFF APPLICATION ROUTES ====================

/**
 * Get staff tasks with real-time updates
 */
router.get('/staff/:staffId/tasks', async (req, res) => {
    try {
        const { staffId } = req.params;
        const result = await DataFlowService.getStaffTasks(staffId, true);
        
        res.json({
            success: true,
            myTasks: result.myTasks,
            availableTasks: result.availableTasks,
            staff: result.staff
        });

    } catch (error) {
        console.error('❌ Get staff tasks error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Accept available task
 */
router.post('/staff/:staffId/accept-task', async (req, res) => {
    try {
        const { staffId } = req.params;
        const { orderId, stageId } = req.body;
        
        const result = await DataFlowService.acceptTask(staffId, orderId, stageId);
        res.json(result);

    } catch (error) {
        console.error('❌ Accept task error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Update task status (start, pause, resume, complete)
 */
router.post('/staff/:staffId/update-task', async (req, res) => {
    try {
        const { staffId } = req.params;
        const { orderId, stageId, status, notes, qualityRating } = req.body;
        
        const updateData = {
            status,
            notes,
            qualityRating
        };
        
        const result = await DataFlowService.processStaffTaskUpdate(staffId, orderId, stageId, updateData);
        res.json(result);

    } catch (error) {
        console.error('❌ Update task error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get staff notifications
 */
router.get('/staff/:staffId/notifications', async (req, res) => {
    try {
        const { staffId } = req.params;
        
        const staff = await Staff.findOne({ staffId });
        if (!staff) {
            return res.status(404).json({ success: false, error: 'Staff not found' });
        }

        const notifications = await Notification.find({ 
            recipientId: staff._id 
        }).sort({ sentAt: -1 }).limit(20);

        res.json({
            success: true,
            notifications: notifications.map(n => ({
                id: n._id,
                type: n.type,
                title: n.title,
                message: n.message,
                orderId: n.orderId,
                isRead: n.isRead,
                sentAt: n.sentAt,
                readAt: n.readAt
            }))
        });

    } catch (error) {
        console.error('❌ Get notifications error:', error);
        res.status(500).json({ success: false, error: 'Failed to get notifications' });
    }
});

/**
 * Mark notification as read
 */
router.post('/staff/notifications/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        
        await Notification.findByIdAndUpdate(id, {
            isRead: true,
            readAt: new Date()
        });

        res.json({ success: true, message: 'Notification marked as read' });

    } catch (error) {
        console.error('❌ Mark notification read error:', error);
        res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
    }
});

// ==================== REAL-TIME SYNC ROUTES ====================

/**
 * Get recent updates for real-time synchronization
 */
router.get('/sync/updates', async (req, res) => {
    try {
        const { since, branch, staffId } = req.query;
        const sinceDate = since ? new Date(since) : new Date(Date.now() - 5 * 60 * 1000); // Last 5 minutes

        let updates = [];

        // Get recent order updates
        const recentOrders = await Order.find({
            updatedAt: { $gte: sinceDate },
            ...(branch && branch !== 'all' ? { branch } : {})
        }).select('orderId status currentStage workflowTasks updatedAt');

        recentOrders.forEach(order => {
            updates.push({
                type: 'order_updated',
                orderId: order.orderId,
                status: order.status,
                currentStage: order.currentStage,
                updatedAt: order.updatedAt
            });
        });

        // Get recent notifications for specific staff
        if (staffId) {
            const staff = await Staff.findOne({ staffId });
            if (staff) {
                const recentNotifications = await Notification.find({
                    recipientId: staff._id,
                    sentAt: { $gte: sinceDate }
                }).select('type title message orderId sentAt');

                recentNotifications.forEach(notification => {
                    updates.push({
                        type: 'notification',
                        notificationId: notification._id,
                        title: notification.title,
                        message: notification.message,
                        orderId: notification.orderId,
                        sentAt: notification.sentAt
                    });
                });
            }
        }

        res.json({
            success: true,
            updates,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Get sync updates error:', error);
        res.status(500).json({ success: false, error: 'Failed to get updates' });
    }
});

/**
 * Health check for data flow service
 */
router.get('/sync/health', async (req, res) => {
    try {
        const stats = {
            totalOrders: await Order.countDocuments(),
            activeOrders: await Order.countDocuments({ status: { $in: ['pending', 'in_progress'] } }),
            totalStaff: await Staff.countDocuments(),
            availableStaff: await Staff.countDocuments({ isAvailable: true }),
            pendingTasks: await Order.countDocuments({ 'workflowTasks.status': 'pending' }),
            activeTasks: await Order.countDocuments({ 'workflowTasks.status': { $in: ['assigned', 'started', 'resumed'] } }),
            timestamp: new Date().toISOString()
        };

        res.json({
            success: true,
            status: 'healthy',
            stats
        });

    } catch (error) {
        console.error('❌ Health check error:', error);
        res.status(500).json({ success: false, status: 'unhealthy', error: error.message });
    }
});

module.exports = router;