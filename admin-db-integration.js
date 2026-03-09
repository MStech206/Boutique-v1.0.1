// MongoDB Integration for Sapthala Admin Panel
const API_BASE = '';

async function apiCall(endpoint) {
    const token = localStorage.getItem('sapthala_token');
    const res = await fetch(API_BASE + endpoint, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    return res.json();
}

// Dashboard
async function updateDashboardStats() {
    try {
        const data = await apiCall('/api/dashboard');
        document.getElementById('totalOrders').textContent = data.totalOrders || 0;
        document.getElementById('totalRevenue').textContent = `₹${(data.totalRevenue || 0).toLocaleString()}`;
        document.getElementById('advanceCollected').textContent = `₹${(data.advanceCollected || 0).toLocaleString()}`;
        document.getElementById('pendingOrders').textContent = data.pendingOrders || 0;
    } catch (e) {
        console.error('Dashboard error:', e);
    }
}

// Orders
async function loadOrders() {
    try {
        const data = await apiCall('/api/reports/orders');
        const tbody = document.querySelector('#ordersTable tbody');
        if (!tbody) return;
        tbody.innerHTML = data.orders.map(o => `
            <tr>
                <td>${o.orderId}</td>
                <td>${o.customerName}</td>
                <td>${o.phone}</td>
                <td>${o.branch}</td>
                <td>${o.status}</td>
                <td>₹${o.totalAmount}</td>
                <td><button onclick="viewOrder('${o.orderId}')">View</button></td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('Orders error:', e);
    }
}

// Branches
async function loadBranches() {
    try {
        const data = await apiCall('/api/public/branches');
        const select = document.getElementById('branchFilter');
        if (!select) return;
        select.innerHTML = '<option value="">All Branches</option>' + 
            data.branches.map(b => `<option value="${b}">${b}</option>`).join('');
    } catch (e) {
        console.error('Branches error:', e);
    }
}

// Staff
async function loadStaff() {
    try {
        const data = await apiCall('/api/staff');
        const tbody = document.querySelector('#staffTable tbody');
        if (!tbody) return;
        tbody.innerHTML = data.staff.map(s => `
            <tr>
                <td>${s.name}</td>
                <td>${s.role}</td>
                <td>${s.branch}</td>
                <td>${s.phone}</td>
                <td>${s.status}</td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('Staff error:', e);
    }
}

// Auto-load on page ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

function init() {
    if (localStorage.getItem('sapthala_logged_in') === 'true') {
        updateDashboardStats();
        loadBranches();
    }
}
