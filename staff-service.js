/**
 * SAPTHALA Boutique - Staff Management Service
 * Comprehensive staff operations for Admin, Sub-Admin, and Staff panels
 * Real-time updates, task management, and performance tracking
 */

class StaffService {
    constructor() {
        this.db = window.db || null;
        this.staffCache = new Map();
        this.taskCache = new Map();
        this.listeners = new Map();
        this.realTimeSync = null;

        this.initializeListeners();
    }

    /**
     * Initialize real-time listeners
     */
    initializeListeners() {
        if (this.db) {
            this.db.listen('staff', (update) => {
                this.invalidateCache();
                this.notifyListeners('staff', update);
            });

            this.db.listen('tasks', (update) => {
                this.invalidateCache();
                this.notifyListeners('tasks', update);
            });
        }
    }

    // ==================== STAFF LIFECYCLE ====================

    /**
     * Create new staff member
     */
    async createStaff(staffData) {
        try {
            // Validate required fields
            this.validateStaffData(staffData);

            const staff = {
                name: staffData.name,
                phone: staffData.phone,
                email: staffData.email || null,
                role: staffData.role, // dyeing, cutting, stitching, khakha, etc.
                branch: staffData.branch,
                pin: staffData.pin,
                profilePhoto: staffData.profilePhoto || null,
                isAvailable: true,
                stages: staffData.stages || [staffData.role], // Which production stages they handle
                qualifications: staffData.qualifications || [],
                joinDate: new Date().toISOString(),
                performance: {
                    tasksCompleted: 0,
                    qualityRating: 5.0,
                    averageTime: 0,
                    successRate: 100
                },
                bankDetails: staffData.bankDetails || null,
                emergencyContact: staffData.emergencyContact || null,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await this.db.createStaff(staff);
            this.invalidateCache();
            return result;
        } catch (error) {
            console.error('Create staff error:', error);
            throw error;
        }
    }

    /**
     * Update staff member
     */
    async updateStaff(staffId, updates) {
        try {
            const staff = await this.db.getStaffById(staffId);
            if (!staff) throw new Error('Staff not found');

            const updated = {
                ...staff,
                ...updates,
                updatedAt: new Date()
            };

            const result = await this.db.updateStaff(staffId, updated);
            this.invalidateCache();
            return result;
        } catch (error) {
            console.error('Update staff error:', error);
            throw error;
        }
    }

    /**
     * Delete staff member
     */
    async deleteStaff(staffId) {
        try {
            await this.db.deleteStaff(staffId);
            this.invalidateCache();
            return true;
        } catch (error) {
            console.error('Delete staff error:', error);
            throw error;
        }
    }

    // ==================== STAFF RETRIEVAL ====================

    /**
     * Get all staff members
     */
    async getAllStaff(branch = null) {
        try {
            const cacheKey = `all:${branch || 'global'}`;
            
            if (this.staffCache.has(cacheKey)) {
                return this.staffCache.get(cacheKey);
            }

            const staff = await this.db.getStaffList(branch);
            this.staffCache.set(cacheKey, staff);
            return staff;
        } catch (error) {
            console.error('Get all staff error:', error);
            return [];
        }
    }

    /**
     * Get staff by ID
     */
    async getStaff(staffId) {
        try {
            if (this.staffCache.has(staffId)) {
                return this.staffCache.get(staffId);
            }

            const staff = await this.db.getStaffById(staffId);
            if (staff) {
                this.staffCache.set(staffId, staff);
            }
            return staff;
        } catch (error) {
            console.error('Get staff error:', error);
            return null;
        }
    }

    /**
     * Get staff by role
     */
    async getStaffByRole(role, branch = null) {
        try {
            const staff = await this.db.getStaffByRole(role, branch);
            return staff || [];
        } catch (error) {
            console.error('Get staff by role error:', error);
            return [];
        }
    }

    /**
     * Get staff by multiple roles
     */
    async getStaffByRoles(roles, branch = null) {
        try {
            const promises = roles.map(role => this.getStaffByRole(role, branch));
            const results = await Promise.all(promises);
            return results.flat();
        } catch (error) {
            console.error('Get staff by roles error:', error);
            return [];
        }
    }

    /**
     * Get available staff for task assignment
     */
    async getAvailableStaff(role, branch = null) {
        try {
            const staff = await this.getStaffByRole(role, branch);
            return staff.filter(s => s.isAvailable && s.tasksInProgress < 5);
        } catch (error) {
            console.error('Get available staff error:', error);
            return [];
        }
    }

    /**
     * Search staff
     */
    async searchStaff(query, branch = null) {
        try {
            const allStaff = await this.getAllStaff(branch);
            const lowerQuery = query.toLowerCase();

            return allStaff.filter(s =>
                s.name.toLowerCase().includes(lowerQuery) ||
                s.phone.includes(query) ||
                s.email?.toLowerCase().includes(lowerQuery)
            );
        } catch (error) {
            console.error('Search staff error:', error);
            return [];
        }
    }

    // ==================== AVAILABILITY & STATUS ====================

    /**
     * Update staff availability
     */
    async setAvailable(staffId, isAvailable) {
        try {
            const staff = await this.getStaff(staffId);
            const result = await this.db.updateStaff(staffId, { isAvailable });
            
            this.staffCache.set(staffId, { ...staff, isAvailable });
            this.notifyListeners('availability', { staffId, isAvailable });
            
            return result;
        } catch (error) {
            console.error('Availability update error:', error);
            throw error;
        }
    }

    /**
     * Toggle staff availability
     */
    async toggleAvailability(staffId) {
        try {
            const staff = await this.getStaff(staffId);
            return await this.setAvailable(staffId, !staff.isAvailable);
        } catch (error) {
            console.error('Toggle availability error:', error);
            throw error;
        }
    }

    /**
     * Update staff location (for delivery staff)
     */
    async updateLocation(staffId, latitude, longitude) {
        try {
            await this.db.updateStaff(staffId, {
                location: {
                    latitude,
                    longitude,
                    updatedAt: new Date()
                }
            });

            this.notifyListeners('location', { staffId, latitude, longitude });
        } catch (error) {
            console.error('Location update error:', error);
            throw error;
        }
    }

    // ==================== TASK MANAGEMENT ====================

    /**
     * Get staff tasks
     */
    async getStaffTasks(staffId, status = null) {
        try {
            const tasks = await this.db.getStaffTasks(staffId, status);
            return tasks || [];
        } catch (error) {
            console.error('Get tasks error:', error);
            return [];
        }
    }

    /**
     * Accept task
     */
    async acceptTask(staffId, taskId) {
        try {
            const result = await this.db.acceptTask(staffId, taskId);
            this.invalidateCache();
            this.notifyListeners('task-accept', { staffId, taskId });
            return result;
        } catch (error) {
            console.error('Accept task error:', error);
            throw error;
        }
    }

    /**
     * Update task status
     */
    async updateTaskStatus(staffId, taskId, status, notes = null) {
        try {
            const result = await this.db.updateTaskStatus(staffId, taskId, status, notes);
            this.invalidateCache();
            this.notifyListeners('task-update', { staffId, taskId, status, notes });
            return result;
        } catch (error) {
            console.error('Update task error:', error);
            throw error;
        }
    }

    /**
     * Complete task with images and notes
     */
    async completeTask(staffId, taskId, completionData) {
        try {
            // Upload images if provided
            if (completionData.images && completionData.images.length > 0) {
                const uploadResult = await this.db.uploadTaskImages(taskId, completionData.images);
                completionData.imageUrls = uploadResult.urls;
            }

            const result = await this.db.completeTask(staffId, taskId, {
                status: 'completed',
                completedAt: new Date(),
                notes: completionData.notes,
                images: completionData.imageUrls || [],
                qualityRating: completionData.qualityRating || 5
            });

            // Update performance metrics
            await this.updatePerformanceMetrics(staffId);

            this.invalidateCache();
            this.notifyListeners('task-complete', { staffId, taskId });
            return result;
        } catch (error) {
            console.error('Complete task error:', error);
            throw error;
        }
    }

    // ==================== PERFORMANCE & METRICS ====================

    /**
     * Get staff metrics
     */
    async getPerformanceMetrics(staffId) {
        try {
            return await this.db.getStaffMetrics(staffId);
        } catch (error) {
            console.error('Get metrics error:', error);
            return null;
        }
    }

    /**
     * Update performance metrics (internal use)
     */
    async updatePerformanceMetrics(staffId) {
        try {
            const tasks = await this.getStaffTasks(staffId);
            const completed = tasks.filter(t => t.status === 'completed').length;
            const ratings = tasks
                .filter(t => t.qualityRating)
                .map(t => t.qualityRating);

            const performance = {
                tasksCompleted: completed,
                qualityRating: ratings.length > 0 
                    ? ratings.reduce((a, b) => a + b) / ratings.length 
                    : 5.0,
                averageTime: this.calculateAverageTime(tasks),
                successRate: completed > 0 ? (completed / tasks.length) * 100 : 0
            };

            await this.db.updateStaff(staffId, { performance });
            this.invalidateCache();
            
            return performance;
        } catch (error) {
            console.error('Update performance error:', error);
        }
    }

    /**
     * Get top performers
     */
    async getTopPerformers(branch = null, limit = 10) {
        try {
            const staff = await this.getAllStaff(branch);
            return staff
                .sort((a, b) => (b.performance?.qualityRating || 0) - (a.performance?.qualityRating || 0))
                .slice(0, limit);
        } catch (error) {
            console.error('Get top performers error:', error);
            return [];
        }
    }

    // ==================== PAYMENT & SALARY ====================

    /**
     * Record payment
     */
    async recordPayment(staffId, amount, type = 'salary') {
        try {
            const staff = await this.getStaff(staffId);
            const payments = staff.payments || [];

            payments.push({
                amount,
                type,
                date: new Date(),
                status: 'completed'
            });

            await this.db.updateStaff(staffId, { payments });
            this.invalidateCache();
            this.notifyListeners('payment', { staffId, amount, type });

            return true;
        } catch (error) {
            console.error('Record payment error:', error);
            throw error;
        }
    }

    /**
     * Get payment history
     */
    async getPaymentHistory(staffId) {
        try {
            const staff = await this.getStaff(staffId);
            return staff?.payments || [];
        } catch (error) {
            console.error('Get payment history error:', error);
            return [];
        }
    }

    // ==================== VALIDATION ====================

    /**
     * Validate staff data
     */
    validateStaffData(data) {
        if (!data.name || data.name.trim() === '') {
            throw new Error('Staff name is required');
        }

        if (!data.phone || data.phone.trim() === '') {
            throw new Error('Phone number is required');
        }

        if (!data.role || data.role.trim() === '') {
            throw new Error('Role is required');
        }

        if (!data.branch || data.branch.trim() === '') {
            throw new Error('Branch is required');
        }

        if (!data.pin || data.pin.toString().length < 4) {
            throw new Error('PIN must be at least 4 digits');
        }

        return true;
    }

    // ==================== UTILITIES ====================

    /**
     * Calculate average task completion time
     */
    calculateAverageTime(tasks) {
        const completed = tasks.filter(t => t.completedAt && t.startedAt);
        if (completed.length === 0) return 0;

        const totalTime = completed.reduce((sum, task) => {
            const time = new Date(task.completedAt) - new Date(task.startedAt);
            return sum + time;
        }, 0);

        return Math.round(totalTime / completed.length / (1000 * 60)); // in minutes
    }

    /**
     * Invalidate cache
     */
    invalidateCache() {
        this.staffCache.clear();
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
const staff = new StaffService();
