// Admin Dashboard Revenue Fix
(function() {
    console.log('🔧 Loading dashboard revenue fix...');

    // Override updateDashboardStats function
    window.updateDashboardStats = async function() {
        try {
            console.log('📊 Updating dashboard stats...');
            
            const token = localStorage.getItem('sapthala_token') || sessionStorage.getItem('sapthala_token');
            
            // Try API first
            try {
                const response = await fetch('/api/dashboard', {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        document.getElementById('totalOrders').textContent = data.totalOrders || 0;
                        document.getElementById('totalRevenue').textContent = '₹' + (data.totalRevenue || 0).toLocaleString();
                        document.getElementById('advanceCollected').textContent = '₹' + (data.advanceCollected || 0).toLocaleString();
                        document.getElementById('pendingOrders').textContent = data.pendingOrders || 0;
                        
                        console.log('✅ Dashboard updated from API:', data);
                        return;
                    }
                }
            } catch (apiError) {
                console.warn('API failed, using fallback:', apiError);
            }
            
            // Fallback: Calculate from orders
            const ordersResponse = await fetch('/api/admin/orders', {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            
            if (ordersResponse.ok) {
                const orders = await ordersResponse.json();
                const orderList = Array.isArray(orders) ? orders : (orders.orders || []);
                
                const totalOrders = orderList.length;
                const totalRevenue = orderList.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
                const advanceCollected = orderList.reduce((sum, o) => sum + (o.advanceAmount || 0), 0);
                const pendingOrders = orderList.filter(o => o.status === 'pending' || o.status === 'in_progress').length;
                
                document.getElementById('totalOrders').textContent = totalOrders;
                document.getElementById('totalRevenue').textContent = '₹' + totalRevenue.toLocaleString();
                document.getElementById('advanceCollected').textContent = '₹' + advanceCollected.toLocaleString();
                document.getElementById('pendingOrders').textContent = pendingOrders;
                
                console.log('✅ Dashboard updated from orders:', {
                    totalOrders,
                    totalRevenue,
                    advanceCollected,
                    pendingOrders
                });
                
                // Update charts if available
                if (typeof updateDashboardCharts === 'function') {
                    updateDashboardCharts(orderList);
                }
            }
            
        } catch (error) {
            console.error('❌ Dashboard update error:', error);
            // Show error state
            document.getElementById('totalOrders').textContent = 'Error';
            document.getElementById('totalRevenue').textContent = 'Error';
            document.getElementById('advanceCollected').textContent = 'Error';
            document.getElementById('pendingOrders').textContent = 'Error';
        }
    };

    // Auto-update on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => window.updateDashboardStats(), 1000);
        });
    } else {
        setTimeout(() => window.updateDashboardStats(), 1000);
    }

    console.log('✅ Dashboard revenue fix loaded');
})();
