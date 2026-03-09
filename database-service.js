/**
 * SAPTHALA Boutique - Unified Database Service
 * Elegant, centralized data management for all applications
 * Supports Firebase Firestore, REST API fallback, and local caching
 */

class DatabaseService {
    constructor() {
        this.baseURL = window.location?.origin || 'http://localhost:3000';
        this.token = localStorage.getItem('sapthala_token');
        this.cache = new Map();
        this.listeners = new Map();
        this.syncQueue = [];
        this.isSyncing = false;
        this.initialized = false;
        
        // Initialize service
        this.init();
    }

    /**
     * Initialize Database Service
     */
    async init() {
        try {
            // Verify backend connectivity
            await this.healthCheck();
            this.initialized = true;
            console.log('✅ DatabaseService initialized successfully');
            this.startSyncWorker();
        } catch (error) {
            console.warn('⚠️ DatabaseService init warning:', error.message);
            // Continue with fallbacks even if primary fails
        }
    }

    /**
     * Health Check
     */
    async healthCheck() {
        return await this.request('/health', { 
            method: 'GET',
            skipCache: true 
        });
    }

    /**
     * Core HTTP Request Handler
     */
    async request(endpoint, options = {}) {
        const { 
            method = 'GET', 
            body = null, 
            skipCache = false,
            timeout = 10000 
        } = options;

        const cacheKey = `${method}:${endpoint}`;
        
        // Return cached data for GET requests
        if (method === 'GET' && !skipCache && this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const url = `${this.baseURL}/api${endpoint}`;
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(this.token && { 'Authorization': `Bearer ${this.token}` })
            },
            ...(body && { body: JSON.stringify(body) })
        };

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(url, { ...config, signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
                throw new Error(error.error || `HTTP ${response.status}`);
            }

            const data = await response.json();

            // Cache GET responses
            if (method === 'GET') {
                this.cache.set(cacheKey, data);
            }

            return data;
        } catch (error) {
            console.error(`API Error [${method} ${endpoint}]:`, error.message);
            
            // If offline or server error, check local storage fallback
            if (method === 'GET' && this.cache.has(cacheKey)) {
                console.warn('Using cached data due to connection error');
                return this.cache.get(cacheKey);
            }

            throw error;
        }
    }

    /**
     * Set Authentication Token
     */
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('sapthala_token', token);
        } else {
            localStorage.removeItem('sapthala_token');
        }
        this.clearCache(); // Clear cache on token change
    }

    /**
     * Clear Cache
     */
    clearCache() {
        this.cache.clear();
        console.log('Cache cleared');
    }

    // ==================== AUTHENTICATION ====================

    async login(role, credentials) {
        const endpoint = role === 'staff' 
            ? '/staff/login' 
            : '/admin/login';
        
        const data = await this.request(endpoint, {
            method: 'POST',
            body: credentials
        });

        if (data.token) {
            this.setToken(data.token);
        }

        return data;
    }

    async logout() {
        await this.request('/auth/logout', { method: 'POST' }).catch(e => console.warn(e));
        this.setToken(null);
    }

    async validateToken() {
        return await this.request('/auth/validate', { 
            method: 'GET',
            skipCache: true 
        });
    }

    // ==================== STAFF MANAGEMENT ====================

    async getStaffList(branch = null) {
        const query = branch ? `?branch=${encodeURIComponent(branch)}` : '';
        return await this.request(`/staff${query}`);
    }

    async getStaffById(staffId) {
        return await this.request(`/staff/${staffId}`);
    }

    async createStaff(staffData) {
        const data = await this.request('/staff', {
            method: 'POST',
            body: staffData
        });
        this.clearCache();
        this.notifyListeners('staff', 'create', data);
        return data;
    }

    async updateStaff(staffId, staffData) {
        const data = await this.request(`/staff/${staffId}`, {
            method: 'PUT',
            body: staffData
        });
        this.clearCache();
        this.notifyListeners('staff', 'update', data);
        return data;
    }

    async deleteStaff(staffId) {
        await this.request(`/staff/${staffId}`, { method: 'DELETE' });
        this.clearCache();
        this.notifyListeners('staff', 'delete', { staffId });
    }

    async getStaffByRole(role, branch = null) {
        const query = `?role=${encodeURIComponent(role)}${branch ? `&branch=${encodeURIComponent(branch)}` : ''}`;
        return await this.request(`/staff/by-role${query}`);
    }

    async updateStaffAvailability(staffId, isAvailable) {
        const data = await this.request(`/staff/${staffId}/availability`, {
            method: 'PUT',
            body: { isAvailable }
        });
        this.notifyListeners('staff', 'availability', data);
        return data;
    }

    async getStaffMetrics(staffId) {
        return await this.request(`/staff/${staffId}/metrics`);
    }

    // ==================== ORDER MANAGEMENT ====================

    async getOrders(filters = {}) {
        const query = new URLSearchParams(filters).toString();
        const endpoint = query ? `/admin/orders?${query}` : '/admin/orders';
        return await this.request(endpoint);
    }

    async getOrderById(orderId) {
        return await this.request(`/admin/orders/${orderId}`);
    }

    async createOrder(orderData) {
        const data = await this.request('/orders', {
            method: 'POST',
            body: orderData
        });
        this.clearCache();
        this.notifyListeners('orders', 'create', data);
        return data;
    }

    async updateOrder(orderId, orderData) {
        const data = await this.request(`/orders/${orderId}`, {
            method: 'PUT',
            body: orderData
        });
        this.clearCache();
        this.notifyListeners('orders', 'update', data);
        return data;
    }

    async updateOrderStage(orderId, stageId, updateData) {
        const data = await this.request(`/orders/${orderId}/stages/${stageId}`, {
            method: 'PUT',
            body: updateData
        });
        this.notifyListeners('orders', 'stage-update', data);
        return data;
    }

    async getOrdersByBranch(branch) {
        return await this.request(`/admin/orders?branch=${encodeURIComponent(branch)}`);
    }

    async assignOrderToStaff(orderId, stageId, staffId) {
        const data = await this.request(`/orders/${orderId}/assign`, {
            method: 'POST',
            body: { stageId, staffId }
        });
        this.notifyListeners('orders', 'assign', data);
        return data;
    }

    // ==================== STAFF TASKS ====================

    async getStaffTasks(staffId, status = null) {
        const query = status ? `?status=${encodeURIComponent(status)}` : '';
        return await this.request(`/staff/${staffId}/tasks${query}`);
    }

    async getTaskDetail(taskId) {
        return await this.request(`/tasks/${taskId}`);
    }

    async acceptTask(staffId, taskId) {
        const data = await this.request(`/staff/${staffId}/tasks/${taskId}/accept`, {
            method: 'POST'
        });
        this.notifyListeners('tasks', 'accept', data);
        return data;
    }

    async updateTaskStatus(staffId, taskId, status, notes = null) {
        const data = await this.request(`/staff/${staffId}/tasks/${taskId}`, {
            method: 'PUT',
            body: { status, notes }
        });
        this.notifyListeners('tasks', 'update', data);
        return data;
    }

    async completeTask(staffId, taskId, completionData) {
        const data = await this.request(`/staff/${staffId}/tasks/${taskId}/complete`, {
            method: 'POST',
            body: completionData
        });
        this.notifyListeners('tasks', 'complete', data);
        return data;
    }

    async uploadTaskImages(taskId, files) {
        const formData = new FormData();
        files.forEach(file => formData.append('images', file));

        const url = `${this.baseURL}/api/tasks/${taskId}/images`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                ...(this.token && { 'Authorization': `Bearer ${this.token}` })
            },
            body: formData
        });

        if (!response.ok) throw new Error('Upload failed');
        return await response.json();
    }

    // ==================== CUSTOMER MANAGEMENT ====================

    async getCustomers() {
        try {
            return await this.request('/admin/customers');
        } catch {
            return await this.request('/customers');
        }
    }

    async getCustomerById(customerId) {
        return await this.request(`/customers/${customerId}`);
    }

    async searchCustomers(query) {
        return await this.request(`/customers/search?q=${encodeURIComponent(query)}`);
    }

    async getCustomerOrders(customerId) {
        return await this.request(`/customers/${customerId}/orders`);
    }

    // ==================== BRANCH MANAGEMENT ====================

    async getBranches() {
        return await this.request('/branches');
    }

    async getBranchById(branchId) {
        return await this.request(`/branches/${branchId}`);
    }

    async createBranch(branchData) {
        const data = await this.request('/branches', {
            method: 'POST',
            body: branchData
        });
        this.clearCache();
        this.notifyListeners('branches', 'create', data);
        return data;
    }

    async updateBranch(branchId, branchData) {
        const data = await this.request(`/branches/${branchId}`, {
            method: 'PUT',
            body: branchData
        });
        this.clearCache();
        this.notifyListeners('branches', 'update', data);
        return data;
    }

    async deleteBranch(branchId) {
        await this.request(`/branches/${branchId}`, { method: 'DELETE' });
        this.clearCache();
        this.notifyListeners('branches', 'delete', { branchId });
    }

    // ==================== DASHBOARD & ANALYTICS ====================

    async getDashboard(branch = null) {
        const query = branch ? `?branch=${encodeURIComponent(branch)}` : '';
        return await this.request(`/dashboard${query}`, { skipCache: true });
    }

    async getAnalytics(filters = {}) {
        const query = new URLSearchParams(filters).toString();
        const endpoint = query ? `/analytics?${query}` : '/analytics';
        return await this.request(endpoint, { skipCache: true });
    }

    async getReports(reportType, filters = {}) {
        const query = new URLSearchParams({ ...filters, type: reportType }).toString();
        return await this.request(`/reports?${query}`);
    }

    // ==================== PAYMENT & BILLING ====================

    async paymentInitiate(orderId, amount, method) {
        return await this.request('/payments/initiate', {
            method: 'POST',
            body: { orderId, amount, method }
        });
    }

    async paymentVerify(transactionId) {
        return await this.request(`/payments/${transactionId}/verify`);
    }

    async getPaymentStatus(orderId) {
        return await this.request(`/orders/${orderId}/payment-status`);
    }

    // ==================== FILES & UPLOADS ====================

    async uploadFiles(files, purpose = 'general') {
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));
        formData.append('purpose', purpose);

        const url = `${this.baseURL}/api/files/upload`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                ...(this.token && { 'Authorization': `Bearer ${this.token}` })
            },
            body: formData
        });

        if (!response.ok) throw new Error('Upload failed');
        return await response.json();
    }

    // ==================== REAL-TIME LISTENERS ====================

    /**
     * Subscribe to data changes
     * @param {string} resource - Resource type (staff, orders, tasks, etc.)
     * @param {function} callback - Callback function when data changes
     * @returns {function} Unsubscribe function
     */
    listen(resource, callback) {
        if (!this.listeners.has(resource)) {
            this.listeners.set(resource, []);
        }
        this.listeners.get(resource).push(callback);

        // Return unsubscribe function
        return () => {
            const callbacks = this.listeners.get(resource);
            const index = callbacks.indexOf(callback);
            if (index > -1) callbacks.splice(index, 1);
        };
    }

    notifyListeners(resource, event, data) {
        const callbacks = this.listeners.get(resource) || [];
        callbacks.forEach(cb => {
            try {
                cb({ event, data, timestamp: new Date() });
            } catch (error) {
                console.error('Error in listener callback:', error);
            }
        });
    }

    // ==================== SYNC QUEUE ====================

    addToSyncQueue(operation) {
        this.syncQueue.push({
            ...operation,
            timestamp: Date.now(),
            retries: 0
        });
    }

    async startSyncWorker() {
        setInterval(() => this.processSyncQueue(), 5000);
    }

    async processSyncQueue() {
        if (this.isSyncing || this.syncQueue.length === 0) return;

        this.isSyncing = true;
        const maxRetries = 3;

        while (this.syncQueue.length > 0) {
            const operation = this.syncQueue.shift();

            try {
                if (operation.retries < maxRetries) {
                    await this.request(operation.endpoint, {
                        method: operation.method,
                        body: operation.body
                    });
                }
            } catch (error) {
                operation.retries++;
                if (operation.retries < maxRetries) {
                    this.syncQueue.push(operation);
                }
            }
        }

        this.isSyncing = false;
    }

    // ==================== UTILITIES ====================

    isOnline() {
        return navigator.onLine && this.initialized;
    }

    getCache(key) {
        return this.cache.get(key);
    }

    // Export cache for offline use
    exportCache() {
        return JSON.stringify(Array.from(this.cache.entries()));
    }

    // Import cache from offline data
    importCache(jsonData) {
        try {
            const entries = JSON.parse(jsonData);
            entries.forEach(([key, value]) => this.cache.set(key, value));
        } catch (error) {
            console.error('Cache import failed:', error);
        }
    }
}

// Global instance
const db = typeof window !== 'undefined' ? new DatabaseService() : null;
