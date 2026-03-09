/**
 * SAPTHALA Boutique - Order Management Service
 * Complete order lifecycle management from creation to delivery
 * Handles order states, WIP, assignments, and real-time tracking
 */

class OrderService {
    constructor() {
        this.db = window.db || null;
        this.orderCache = new Map();
        this.listeners = new Map();
        
        this.initializeListeners();
    }

    /**
     * Initialize real-time listeners
     */
    initializeListeners() {
        if (this.db) {
            this.db.listen('orders', (update) => {
                this.invalidateCache();
                this.notifyListeners('order', update);
            });
        }
    }

    // ==================== ORDER CREATION ====================

    /**
     * Create new order
     */
    async createOrder(orderData) {
        try {
            // Validate order data
            this.validateOrderData(orderData);

            const order = {
                customerId: orderData.customerId,
                customerName: orderData.customerName,
                customerPhone: orderData.customerPhone,
                customerEmail: orderData.customerEmail || null,
                branch: orderData.branch,
                
                // Order Details
                items: orderData.items || [], // Array of garment items
                measurements: orderData.measurements || {},
                designNotes: orderData.designNotes || '',
                designImages: orderData.designImages || [],
                
                // Pricing
                baseAmount: orderData.baseAmount || 0,
                customizations: orderData.customizations || [],
                discounts: orderData.discounts || [],
                taxAmount: orderData.taxAmount || 0,
                shippingCost: orderData.shippingCost || 0,
                totalAmount: orderData.totalAmount || 0,
                paidAmount: orderData.paidAmount || 0,
                balanceDue: orderData.balanceDue || orderData.totalAmount || 0,
                
                // Dates
                orderDate: new Date(),
                deliveryDate: orderData.deliveryDate || this.calculateDeliveryDate(orderData.items?.length || 1),
                
                // Status
                status: 'pending', // pending, confirmed, in_progress, ready, delivered, cancelled
                stages: this.initializeStages(orderData.items),
                
                // Staff Assignments
                assignedStaff: {},
                
                // Payment
                paymentMethod: orderData.paymentMethod || 'cash',
                paymentStatus: 'pending', // pending, partial, completed
                paymentDetails: [],
                
                // Additional
                notes: orderData.notes || '',
                specialRequests: orderData.specialRequests || [],
                createdBy: orderData.createdBy || 'system',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await this.db.createOrder(order);
            this.invalidateCache();
            return result;
        } catch (error) {
            console.error('Create order error:', error);
            throw error;
        }
    }

    /**
     * Initialize order stages based on items
     */
    initializeStages(items) {
        const stages = {};
        
        const baseStages = ['dyeing', 'cutting', 'stitching', 'finishing', 'qc', 'delivery'];
        
        baseStages.forEach(stage => {
            stages[stage] = {
                name: stage,
                status: 'pending',
                assignedStaff: null,
                startedAt: null,
                completedAt: null,
                notes: '',
                images: []
            };
        });

        return stages;
    }

    /**
     * Calculate delivery date based on customization
     */
    calculateDeliveryDate(itemCount) {
        const baseDate = new Date();
        // Default: 5 days for normal orders, add 2 days per additional item
        const daysToAdd = 5 + (itemCount - 1) * 2;
        baseDate.setDate(baseDate.getDate() + daysToAdd);
        return baseDate;
    }

    // ==================== ORDER RETRIEVAL ====================

    /**
     * Get all orders
     */
    async getAllOrders(filters = {}) {
        try {
            const cacheKey = `all:${JSON.stringify(filters)}`;
            
            if (this.orderCache.has(cacheKey)) {
                return this.orderCache.get(cacheKey);
            }

            const orders = await this.db.getOrders(filters);
            this.orderCache.set(cacheKey, orders);
            return orders;
        } catch (error) {
            console.error('Get all orders error:', error);
            return [];
        }
    }

    /**
     * Get order by ID
     */
    async getOrder(orderId) {
        try {
            if (this.orderCache.has(orderId)) {
                return this.orderCache.get(orderId);
            }

            const order = await this.db.getOrderById(orderId);
            if (order) {
                this.orderCache.set(orderId, order);
            }
            return order;
        } catch (error) {
            console.error('Get order error:', error);
            return null;
        }
    }

    /**
     * Get orders by branch
     */
    async getOrdersByBranch(branch) {
        try {
            return await this.getAllOrders({ branch });
        } catch (error) {
            console.error('Get orders by branch error:', error);
            return [];
        }
    }

    /**
     * Get orders by customer
     */
    async getCustomerOrders(customerId) {
        try {
            return await this.getAllOrders({ customerId });
        } catch (error) {
            console.error('Get customer orders error:', error);
            return [];
        }
    }

    /**
     * Get orders by status
     */
    async getOrdersByStatus(status, branch = null) {
        try {
            const filters = { status };
            if (branch) filters.branch = branch;
            return await this.getAllOrders(filters);
        } catch (error) {
            console.error('Get orders by status error:', error);
            return [];
        }
    }

    /**
     * Search orders
     */
    async searchOrders(query) {
        try {
            const allOrders = await this.getAllOrders();
            const lowerQuery = query.toLowerCase();

            return allOrders.filter(order =>
                order.customerId.includes(query) ||
                order.customerName.toLowerCase().includes(lowerQuery) ||
                order.customerPhone.includes(query)
            );
        } catch (error) {
            console.error('Search orders error:', error);
            return [];
        }
    }

    // ==================== ORDER UPDATES ====================

    /**
     * Update order
     */
    async updateOrder(orderId, updates) {
        try {
            const order = await this.getOrder(orderId);
            if (!order) throw new Error('Order not found');

            // Recalculate amounts if pricing changed
            if (updates.baseAmount || updates.discounts || updates.taxAmount || updates.shippingCost) {
                updates.totalAmount = this.calculateTotal(
                    updates.baseAmount || order.baseAmount,
                    updates.discounts || order.discounts,
                    updates.taxAmount || order.taxAmount,
                    updates.shippingCost || order.shippingCost
                );
                updates.balanceDue = updates.totalAmount - (updates.paidAmount || order.paidAmount);
            }

            const updated = {
                ...order,
                ...updates,
                updatedAt: new Date()
            };

            const result = await this.db.updateOrder(orderId, updated);
            this.invalidateCache();
            this.notifyListeners('update', { orderId, updates });
            return result;
        } catch (error) {
            console.error('Update order error:', error);
            throw error;
        }
    }

    /**
     * Update order status
     */
    async updateOrderStatus(orderId, newStatus) {
        try {
            const validStatuses = ['pending', 'confirmed', 'in_progress', 'ready', 'delivered', 'cancelled'];
            
            if (!validStatuses.includes(newStatus)) {
                throw new Error(`Invalid status: ${newStatus}`);
            }

            const updates = {
                status: newStatus,
                updatedAt: new Date()
            };

            // Add status change timestamp
            const order = await this.getOrder(orderId);
            if (order.statusHistory) {
                updates.statusHistory = [...order.statusHistory, {
                    status: newStatus,
                    changedAt: new Date(),
                    changedBy: auth?.getUser()?.id || 'system'
                }];
            }

            return await this.updateOrder(orderId, updates);
        } catch (error) {
            console.error('Update order status error:', error);
            throw error;
        }
    }

    /**
     * Cancel order
     */
    async cancelOrder(orderId, reason) {
        try {
            const order = await this.getOrder(orderId);
            if (!order) throw new Error('Order not found');

            if (order.status === 'delivered') {
                throw new Error('Cannot cancel delivered order');
            }

            return await this.updateOrder(orderId, {
                status: 'cancelled',
                cancellationReason: reason,
                cancelledAt: new Date(),
                cancelledBy: auth?.getUser()?.id || 'system'
            });
        } catch (error) {
            console.error('Cancel order error:', error);
            throw error;
        }
    }

    // ==================== STAGE MANAGEMENT ====================

    /**
     * Update order stage
     */
    async updateStage(orderId, stageName, stageUpdate) {
        try {
            const order = await this.getOrder(orderId);
            if (!order) throw new Error('Order not found');

            const stages = { ...order.stages };
            stages[stageName] = {
                ...stages[stageName],
                ...stageUpdate,
                updatedAt: new Date()
            };

            const result = await this.db.updateOrderStage(orderId, stageName, stages[stageName]);
            this.invalidateCache();
            this.notifyListeners('stage-update', { orderId, stage: stageName, update: stageUpdate });
            return result;
        } catch (error) {
            console.error('Update stage error:', error);
            throw error;
        }
    }

    /**
     * Assign staff to stage
     */
    async assignStaffToStage(orderId, stageName, staffId) {
        try {
            const stage = {
                assignedStaff: staffId,
                status: 'in_progress',
                startedAt: stageName === 'dyeing' ? new Date() : new Date()
            };

            const result = await this.updateStage(orderId, stageName, stage);
            this.notifyListeners('staff-assigned', { orderId, stage: stageName, staffId });
            return result;
        } catch (error) {
            console.error('Assign staff error:', error);
            throw error;
        }
    }

    /**
     * Mark stage as complete
     */
    async completeStage(orderId, stageName, completionData) {
        try {
            // Upload images if provided
            let imageUrls = [];
            if (completionData.images && completionData.images.length > 0) {
                const uploadResult = await this.db.uploadTaskImages(orderId, completionData.images);
                imageUrls = uploadResult.urls;
            }

            const stageUpdate = {
                status: 'completed',
                completedAt: new Date(),
                notes: completionData.notes,
                images: imageUrls,
                completedBy: auth?.getUser()?.id || 'system'
            };

            const result = await this.updateStage(orderId, stageName, stageUpdate);

            // Check if all stages are complete
            await this.checkAllStagesComplete(orderId);

            this.notifyListeners('stage-complete', { orderId, stage: stageName });
            return result;
        } catch (error) {
            console.error('Complete stage error:', error);
            throw error;
        }
    }

    /**
     * Check if all stages are complete and update order status
     */
    async checkAllStagesComplete(orderId) {
        try {
            const order = await this.getOrder(orderId);
            if (!order) return;

            const allComplete = Object.values(order.stages).every(stage => stage.status === 'completed');
            
            if (allComplete) {
                await this.updateOrderStatus(orderId, 'ready');
            }
        } catch (error) {
            console.error('Check stages complete error:', error);
        }
    }

    // ==================== PAYMENT MANAGEMENT ====================

    /**
     * Record payment
     */
    async recordPayment(orderId, amount, method = 'cash', reference = null) {
        try {
            const order = await this.getOrder(orderId);
            if (!order) throw new Error('Order not found');

            const payment = {
                amount,
                method,
                reference,
                date: new Date(),
                recordedBy: auth?.getUser()?.id || 'system'
            };

            const payments = [...(order.paymentDetails || []), payment];
            const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
            const balanceDue = order.totalAmount - paidAmount;

            const paymentStatus = balanceDue <= 0 ? 'completed' : 
                                  paidAmount > 0 ? 'partial' : 'pending';

            const result = await this.updateOrder(orderId, {
                paymentDetails: payments,
                paidAmount,
                balanceDue,
                paymentStatus
            });

            this.notifyListeners('payment', { orderId, amount, method });
            return result;
        } catch (error) {
            console.error('Record payment error:', error);
            throw error;
        }
    }

    /**
     * Get payment status
     */
    async getPaymentStatus(orderId) {
        try {
            const order = await this.getOrder(orderId);
            if (!order) return null;

            return {
                totalAmount: order.totalAmount,
                paidAmount: order.paidAmount,
                balanceDue: order.balanceDue,
                status: order.paymentStatus,
                history: order.paymentDetails || []
            };
        } catch (error) {
            console.error('Get payment status error:', error);
            return null;
        }
    }

    // ==================== ANALYTICS & REPORTING ====================

    /**
     * Get order statistics
     */
    async getOrderStats(branch = null) {
        try {
            const orders = branch 
                ? await this.getOrdersByBranch(branch)
                : await this.getAllOrders();

            return {
                total: orders.length,
                pending: orders.filter(o => o.status === 'pending').length,
                inProgress: orders.filter(o => o.status === 'in_progress').length,
                ready: orders.filter(o => o.status === 'ready').length,
                delivered: orders.filter(o => o.status === 'delivered').length,
                cancelled: orders.filter(o => o.status === 'cancelled').length,
                totalRevenue: orders.reduce((sum, o) => sum + o.totalAmount, 0),
                averageOrderValue: orders.length > 0 
                    ? orders.reduce((sum, o) => sum + o.totalAmount, 0) / orders.length 
                    : 0
            };
        } catch (error) {
            console.error('Get order stats error:', error);
            return null;
        }
    }

    /**
     * Get overdue orders
     */
    async getOverdueOrders(branch = null) {
        try {
            const orders = branch
                ? await this.getOrdersByBranch(branch)
                : await this.getAllOrders();

            const now = new Date();
            return orders.filter(o => 
                o.status !== 'delivered' && 
                o.status !== 'cancelled' &&
                new Date(o.deliveryDate) < now
            );
        } catch (error) {
            console.error('Get overdue orders error:', error);
            return [];
        }
    }

    // ==================== UTILITIES ====================

    /**
     * Calculate total amount
     */
    calculateTotal(baseAmount, discounts = [], taxAmount = 0, shippingCost = 0) {
        let total = baseAmount;

        // Apply discounts
        const totalDiscount = discounts.reduce((sum, d) => sum + (d.amount || 0), 0);
        total -= totalDiscount;

        // Add tax and shipping
        total += taxAmount + shippingCost;

        return Math.max(0, total); // Ensure non-negative
    }

    /**
     * Validate order data
     */
    validateOrderData(data) {
        if (!data.customerId || data.customerId.trim() === '') {
            throw new Error('Customer ID is required');
        }

        if (!data.customerName || data.customerName.trim() === '') {
            throw new Error('Customer name is required');
        }

        if (!data.customerPhone || data.customerPhone.trim() === '') {
            throw new Error('Customer phone is required');
        }

        if (!data.items || data.items.length === 0) {
            throw new Error('At least one item is required');
        }

        if (!data.totalAmount || data.totalAmount <= 0) {
            throw new Error('Total amount must be greater than 0');
        }

        return true;
    }

    /**
     * Invalidate cache
     */
    invalidateCache() {
        this.orderCache.clear();
    }

    /**
     * Subscribe to changes
     */
    subscribe(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }

        this.listeners.get(event).push(callback);

        return () => {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) callbacks.splice(index, 1);
        };
    }

    /**
     * Notify listeners
     */
    notifyListeners(event, data) {
        const callbacks = this.listeners.get(event) || [];
        callbacks.forEach(cb => {
            try {
                cb({ event, data, timestamp: new Date() });
            } catch (error) {
                console.error('Listener error:', error);
            }
        });
    }
}

// Global instance
const orders = new OrderService();
