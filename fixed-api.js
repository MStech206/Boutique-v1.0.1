// Include the API file
const api = {
    baseURL: window.location.origin,
    token: localStorage.getItem('sapthala_token'),

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
    },

    async getStaff() {
        return await this.request('/staff');
    },

    async createStaff(staffData) {
        return await this.request('/staff', {
            method: 'POST',
            body: JSON.stringify(staffData)
        });
    },

    async updateStaff(staffId, staffData) {
        return await this.request(`/staff/${staffId}`, {
            method: 'PUT',
            body: JSON.stringify(staffData)
        });
    },

    async deleteStaff(staffId) {
        return await this.request(`/staff/${staffId}`, {
            method: 'DELETE'
        });
    },

    async toggleStaffAvailability(staffId, isAvailable) {
        return await this.request(`/staff/${staffId}/availability`, {
            method: 'PUT',
            body: JSON.stringify({ isAvailable })
        });
    },

    async createOrder(orderData) {
        return await this.request('/orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
    },

    async shareOrderPDF(orderData, sendNow = true) {
        return await this.request('/share-order-pdf', {
            method: 'POST',
            body: JSON.stringify({ orderData, sendNow })
        });
    },

    async getDashboard() {
        return await this.request('/dashboard');
    },

    async getOrders() {
        return await this.request('/admin/orders');
    },

    async getCustomers() {
        return await this.request('/customers');
    }
};