// API Configuration and Integration
class SapthalaAPI {
    constructor() {
        this.baseURL = window.location.origin;
        this.token = localStorage.getItem('sapthala_token');
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
        localStorage.setItem('sapthala_token', token);
    }

    // Remove authentication token
    removeToken() {
        this.token = null;
        localStorage.removeItem('sapthala_token');
    }

    // Make authenticated API request
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}/api${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(this.token && { 'Authorization': `Bearer ${this.token}` })
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Authentication
    async login(password) {
        const data = await this.request('/admin/login', {
            method: 'POST',
            body: JSON.stringify({ password })
        });
        
        if (data.success) {
            this.setToken(data.token);
        }
        
        return data;
    }

    // Dashboard
    async getDashboard() {
        return await this.request('/dashboard');
    }

    // Orders
    async getOrders() {
        return await this.request('/admin/orders');
    }

    async createOrder(orderData) {
        return await this.request('/orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
    }

    async getOrder(orderId) {
        return await this.request(`/admin/orders/${orderId}`);
    }

    async updateOrder(orderId, orderData) {
        return await this.request(`/orders/${orderId}`, {
            method: 'PUT',
            body: JSON.stringify(orderData)
        });
    }

    // Customers
    async getCustomers() {
        return await this.request('/customers');
    }

    async getCustomer(phone) {
        return await this.request(`/customers/${phone}`);
    }

    // Theme
    async getTheme() {
        return await this.request('/theme');
    }

    async setTheme(theme) {
        return await this.request('/theme', {
            method: 'POST',
            body: JSON.stringify({ theme })
        });
    }

    // File Upload
    async uploadFiles(files) {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('images', file);
        });

        return await this.request('/upload', {
            method: 'POST',
            body: formData,
            headers: {
                ...(this.token && { 'Authorization': `Bearer ${this.token}` })
            }
        });
    }

    // WhatsApp
    async sendWhatsApp(phone, message, pdfUrl = null) {
        return await this.request('/send-whatsapp', {
            method: 'POST',
            body: JSON.stringify({ phone, message, pdfUrl })
        });
    }

    // PDF Generation and Sharing
    async shareOrderPDF(orderData, sendNow = true) {
        return await this.request('/share-order-pdf', {
            method: 'POST',
            body: JSON.stringify({ orderData, sendNow })
        });
    }

    // Staff Management
    async getStaff() {
        return await this.request('/staff');
    }

    async createStaff(staffData) {
        return await this.request('/staff', {
            method: 'POST',
            body: JSON.stringify(staffData)
        });
    }

    async updateStaff(staffId, staffData) {
        return await this.request(`/staff/${staffId}`, {
            method: 'PUT',
            body: JSON.stringify(staffData)
        });
    }

    async deleteStaff(staffId) {
        return await this.request(`/staff/${staffId}`, {
            method: 'DELETE'
        });
    }

    async toggleStaffAvailability(staffId, isAvailable) {
        return await this.request(`/staff/${staffId}/availability`, {
            method: 'PUT',
            body: JSON.stringify({ isAvailable })
        });
    }

    // Staff Authentication
    async staffLogin(staffId, pin) {
        return await this.request('/staff/login', {
            method: 'POST',
            body: JSON.stringify({ staffId, pin })
        });
    }

    // Staff Tasks
    async getStaffTasks(staffId) {
        return await this.request(`/staff/${staffId}/tasks`);
    }

    async getAvailableTasks(staffId) {
        return await this.request(`/staff/${staffId}/available-tasks`);
    }

    async acceptTask(staffId, orderId, stageId) {
        return await this.request(`/staff/${staffId}/accept-task`, {
            method: 'POST',
            body: JSON.stringify({ orderId, stageId })
        });
    }

    async updateTaskStatus(staffId, orderId, stageId, status, notes = null, qualityRating = null) {
        return await this.request(`/staff/${staffId}/update-task`, {
            method: 'POST',
            body: JSON.stringify({ orderId, stageId, status, notes, qualityRating })
        });
    }

    async completeDesign(staffId, orderId, designNotes, designImages = []) {
        return await this.request(`/staff/${staffId}/complete-design`, {
            method: 'POST',
            body: JSON.stringify({ orderId, designNotes, designImages })
        });
    }

    // Notifications
    async getStaffNotifications(staffId) {
        return await this.request(`/staff/${staffId}/notifications`);
    }

    async markNotificationRead(notificationId) {
        return await this.request(`/notifications/${notificationId}/read`, {
            method: 'POST'
        });
    }

    // Settings
    async getSettings() {
        return await this.request('/settings');
    }
}

// Initialize API instance
const api = new SapthalaAPI();