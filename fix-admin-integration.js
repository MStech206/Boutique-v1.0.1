// Minimal MongoDB Integration Fix for Admin Panel
(function() {
    const API_BASE = window.location.origin;
    const token = localStorage.getItem('sapthala_token');
    
    // Fix 1: Load Dashboard Stats from MongoDB
    async function loadDashboard() {
        try {
            const res = await fetch(`${API_BASE}/api/dashboard`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            const data = await res.json();
            
            document.getElementById('totalOrders').textContent = data.totalOrders || 0;
            document.getElementById('totalRevenue').textContent = `₹${(data.totalRevenue || 0).toLocaleString()}`;
            document.getElementById('advanceCollected').textContent = `₹${(data.advanceCollected || 0).toLocaleString()}`;
            document.getElementById('pendingOrders').textContent = data.pendingOrders || 0;
            
            console.log('✅ Dashboard loaded:', data);
        } catch (e) {
            console.warn('Dashboard load failed:', e);
        }
    }
    
    // Fix 2: Load Unique Branches (No Duplicates)
    async function loadBranches() {
        try {
            const res = await fetch(`${API_BASE}/api/public/branches`);
            const branches = await res.json();
            
            // Remove duplicates using Set
            const unique = [...new Map(branches.map(b => [b.branchId, b])).values()];
            
            // Update all branch dropdowns
            ['reportBranch', 'orderBranch', 'staffBranch', 'staffFilterBranch'].forEach(id => {
                const sel = document.getElementById(id);
                if (!sel) return;
                sel.innerHTML = '<option value="">All Branches</option>';
                unique.forEach(b => {
                    const opt = document.createElement('option');
                    opt.value = b.branchId;
                    opt.textContent = b.branchName || b.branchId;
                    sel.appendChild(opt);
                });
            });
        } catch (e) {
            console.warn('Branches load failed:', e);
        }
    }
    
    // Fix 3: Load Reports with Filters
    async function loadReports() {
        try {
            const token = localStorage.getItem('sapthala_token');
            const branch = document.getElementById('reportBranch')?.value || '';
            const from = document.getElementById('reportFromDate')?.value || '';
            const to = document.getElementById('reportToDate')?.value || '';
            const filter = document.getElementById('reportFilterType')?.value || '';
            const search = document.getElementById('reportSearchValue')?.value || '';
            
            const params = new URLSearchParams();
            if (branch) params.append('branch', branch);
            if (from) params.append('fromDate', from);
            if (to) params.append('toDate', to);
            if (filter && search) {
                params.append('filterBy', filter);
                params.append('q', search);
            }
            
            const res = await fetch(`${API_BASE}/api/reports/orders?${params}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            const data = await res.json();
            const orders = data.orders || data || [];
            
            console.log('✅ Reports loaded:', orders.length, 'orders');
            
            // Display reports
            let html = `<div style="background:white;padding:20px;border-radius:12px;">
                <h3>📊 Order Summary</h3>
                <p>Total Orders: <strong>${orders.length}</strong></p>
                <p>Total Revenue: <strong>₹${orders.reduce((s,o) => s + (o.totalAmount||0), 0).toLocaleString()}</strong></p>
                <table style="width:100%;border-collapse:collapse;margin-top:20px;">
                    <thead><tr style="background:#f8fafc;">
                        <th style="padding:10px;text-align:left;">Order ID</th>
                        <th style="padding:10px;text-align:left;">Customer</th>
                        <th style="padding:10px;text-align:left;">Phone</th>
                        <th style="padding:10px;text-align:right;">Amount</th>
                        <th style="padding:10px;text-align:center;">Status</th>
                    </tr></thead><tbody>`;
            
            orders.forEach(o => {
                html += `<tr style="border-bottom:1px solid #e5e7eb;">
                    <td style="padding:10px;">${o.orderId||''}</td>
                    <td style="padding:10px;">${o.customerName||''}</td>
                    <td style="padding:10px;">${o.customerPhone||''}</td>
                    <td style="padding:10px;text-align:right;">₹${(o.totalAmount||0).toLocaleString()}</td>
                    <td style="padding:10px;text-align:center;">${o.status||'pending'}</td>
                </tr>`;
            });
            
            html += '</tbody></table></div>';
            document.getElementById('reportsTable').innerHTML = html;
            
            // Store for export
            window.currentReportsData = orders;
        } catch (e) {
            console.warn('Reports load failed:', e);
            document.getElementById('reportsTable').innerHTML = '<div style="color:red;padding:20px;">Failed to load reports</div>';
        }
    }
    
    // Fix 4: Load Staff from MongoDB
    async function loadStaff() {
        try {
            const branch = document.getElementById('staffFilterBranch')?.value || '';
            const url = branch ? `${API_BASE}/api/staff?branch=${branch}` : `${API_BASE}/api/staff`;
            const res = await fetch(url);
            const staff = await res.json();
            
            let html = '';
            (staff || []).forEach(s => {
                html += `<div style="padding:20px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <h3 style="margin:0 0 5px 0;">${s.name || s.staffId}</h3>
                        <p style="margin:0;color:#6b7280;font-size:14px;">${s.phone || ''} | ${s.role || ''}</p>
                        <p style="margin:5px 0 0 0;font-size:12px;color:#3b82f6;">${(s.workflowStages||[]).join(', ')}</p>
                    </div>
                    <div>
                        <span style="padding:6px 12px;background:#d1fae5;color:#065f46;border-radius:12px;font-size:12px;font-weight:600;">
                            ${s.branch || ''}
                        </span>
                    </div>
                </div>`;
            });
            
            document.getElementById('staffList').innerHTML = html || '<div style="padding:20px;color:#9ca3af;">No staff found</div>';
        } catch (e) {
            console.warn('Staff load failed:', e);
        }
    }
    
    // Override existing functions
    window.updateDashboardStats = loadDashboard;
    window.loadReportsWithFilters = loadReports;
    window.loadStaff = loadStaff;
    
    // Auto-load on tab switch
    const originalShowTab = window.showTab;
    window.showTab = function(tab) {
        if (originalShowTab) originalShowTab(tab);
        
        if (tab === 'dashboard') loadDashboard();
        else if (tab === 'reports') loadReports();
        else if (tab === 'staff') loadStaff();
    };
    
    // Initialize on load
    document.addEventListener('DOMContentLoaded', () => {
        loadBranches();
        loadDashboard();
    });
    
    // Attach filter change handlers
    setTimeout(() => {
        ['reportBranch', 'reportFromDate', 'reportToDate', 'reportFilterType', 'reportSortBy'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', loadReports);
        });
        
        const searchEl = document.getElementById('reportSearchValue');
        if (searchEl) {
            let timeout;
            searchEl.addEventListener('input', () => {
                clearTimeout(timeout);
                timeout = setTimeout(loadReports, 300);
            });
        }
        
        const staffFilter = document.getElementById('staffFilterBranch');
        if (staffFilter) staffFilter.addEventListener('change', loadStaff);
    }, 1000);
    
    console.log('✅ Admin panel MongoDB integration loaded');
})();
