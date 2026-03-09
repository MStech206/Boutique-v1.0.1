// MongoDB Integration - Add to sapthala-admin-clean.html before </body>

(function() {
    const API = '';
    
    async function call(endpoint) {
        const token = localStorage.getItem('sapthala_token');
        const res = await fetch(API + endpoint, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        return res.json();
    }
    
    // Override updateDashboardStats to fetch from MongoDB
    window.updateDashboardStats = async function() {
        try {
            const data = await call('/api/dashboard');
            document.getElementById('totalOrders').textContent = data.totalOrders || 0;
            document.getElementById('totalRevenue').textContent = `₹${(data.totalRevenue || 0).toLocaleString()}`;
            document.getElementById('advanceCollected').textContent = `₹${(data.advanceCollected || 0).toLocaleString()}`;
            document.getElementById('pendingOrders').textContent = data.pendingOrders || 0;
            console.log('✅ Dashboard loaded:', data);
        } catch (e) {
            console.error('Dashboard error:', e);
        }
    };
    
    // Auto-load on login
    const originalShowTab = window.showTab;
    window.showTab = function(tab) {
        originalShowTab(tab);
        if (tab === 'dashboard') updateDashboardStats();
    };
})();
