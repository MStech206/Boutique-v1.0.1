// This script contains the updated reports functions to be integrated into sapthala-admin-clean.html
// Insert these functions to replace the existing loadReports and displayReports functions

async function loadReportsUpdated() {
    try {
        const filterType = document.getElementById('reportFilterType').value || '';
        const searchValue = document.getElementById('reportSearchValue').value.trim() || '';
        const branch = document.getElementById('reportBranch') ? document.getElementById('reportBranch').value : '';
        const fromDate = document.getElementById('reportFromDate').value;
        const toDate = document.getElementById('reportToDate').value;
        
        const token = localStorage.getItem('sapthala_token') || sessionStorage.getItem('sapthala_token');
        
        try {
            // Map UI filterType to backend parameter name
            let filterParam = '';
            let queryParam = '';
            if (filterType === 'orderId') {
                filterParam = 'orderid';
                queryParam = searchValue;
            } else if (filterType === 'customer') {
                filterParam = 'customer';
                queryParam = searchValue;
            } else if (filterType === 'phone') {
                filterParam = 'phone';
                queryParam = searchValue;
            } else if (filterType === 'staff') {
                filterParam = 'staff';
                queryParam = searchValue;
            }
            
            // Build query string
            const params = new URLSearchParams();
            if (filterParam) params.append('filterBy', filterParam);
            if (queryParam) params.append('q', queryParam);
            if (branch) params.append('branch', branch);
            
            console.log(`Calling: /api/reports/orders?${params.toString()}`);
            const response = await fetch(`/api/reports/orders?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.orders) {
                    displayReportsV2(data.orders);
                    return;
                }
            }
            throw new Error('Backend reports API failed');
            
        } catch (apiError) {
            console.warn('Backend reports API failed:', apiError);
        }
        
        // Fallback: use localStorage
        const orders = JSON.parse(localStorage.getItem('sapthala_orders') || '[]');
        let filteredOrders = orders.filter(order => {
            const orderDate = new Date(order.createdAt);
            if (fromDate && orderDate < new Date(fromDate)) return false;
            if (toDate && orderDate > new Date(toDate)) return false;
            if (branch && order.branch !== branch) return false;
            if (filterType && searchValue) {
                if (filterType === 'orderId' && !order.orderId.toLowerCase().includes(searchValue.toLowerCase())) return false;
                if (filterType === 'customer' && !(order.customer?.name || order.customerName || '').toLowerCase().includes(searchValue.toLowerCase())) return false;
                if (filterType === 'phone' && !(order.customer?.phone || order.customerPhone || '').includes(searchValue)) return false;
            }
            return true;
        });
        
        displayReportsV2(filteredOrders);
    } catch (error) {
        console.error('Reports error:', error);
        document.getElementById('reportsTable').innerHTML = '<div style="color:red;padding:20px;">Failed to load reports: ' + error.message + '</div>';
    }
}

function displayReportsV2(orderReports) {
    orderReports = Array.isArray(orderReports) ? orderReports : [];
    
    let html = `
        <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);margin-bottom:20px;">
            <h3 style="margin-bottom:15px;color:#1e293b;">📊 Order Summary</h3>
            <div style="display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));">
                <div style="display:flex;justify-content:space-between;padding:12px;background:#f8fafc;border-radius:6px;">
                    <span>Total Orders:</span><strong style="color:#3b82f6;">${orderReports.length}</strong>
                </div>
                <div style="display:flex;justify-content:space-between;padding:12px;background:#f8fafc;border-radius:6px;">
                    <span>Total Revenue:</span><strong style="color:#10b981;">₹${(orderReports.reduce((sum, o) => sum + (o.totalAmount || o.pricing?.total || 0), 0)).toLocaleString()}</strong>
                </div>
                <div style="display:flex;justify-content:space-between;padding:12px;background:#f8fafc;border-radius:6px;">
                    <span>Avg Order Value:</span><strong style="color:#f59e0b;">₹${(orderReports.length > 0 ? Math.round(orderReports.reduce((sum, o) => sum + (o.totalAmount || o.pricing?.total || 0), 0) / orderReports.length) : 0).toLocaleString()}</strong>
                </div>
            </div>
        </div>
        
        <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
        <h3 style="margin-bottom:15px;color:#1e293b;">📋 Order Details</h3>
        <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead><tr style="background:#f8fafc;border-bottom:2px solid #e5e7eb;">
                <th style="padding:12px;text-align:left;font-weight:600;">Order ID</th>
                <th style="padding:12px;text-align:left;font-weight:600;">Customer</th>
                <th style="padding:12px;text-align:left;font-weight:600;">Phone</th>
                <th style="padding:12px;text-align:center;font-weight:600;">Progress</th>
                <th style="padding:12px;text-align:left;font-weight:600;">Assigned To</th>
                <th style="padding:12px;text-align:center;font-weight:600;">Status</th>
                <th style="padding:12px;text-align:right;font-weight:600;">Amount</th>
                <th style="padding:12px;text-align:center;font-weight:600;">Action</th>
            </tr></thead>
            <tbody>`;
    
    if (orderReports.length === 0) {
        html += '<tr><td colspan="8" style="padding:24px;text-align:center;color:#9ca3af;">No orders found</td></tr>';
    } else {
        orderReports.forEach(order => {
            const oid = order.orderId || order.id || '';
            const customerName = order.customerName || order.customer?.name || 'Unknown';
            const customerPhone = order.customerPhone || order.customer?.phone || '';
            const amount = order.totalAmount || order.pricing?.total || 0;
            const progress = order.progress || (order.completedTasks && order.totalTasks ? Math.round(order.completedTasks * 100 / order.totalTasks) : 0);
            
            // Get assigned staff info
            let staffHtml = '';
            if (Array.isArray(order.assignedStaff) && order.assignedStaff.length > 0) {
                staffHtml = order.assignedStaff.map(s => `<div style="font-size:12px;padding:2px;color:#3b82f6;"><strong>${s.name || s.staffId}</strong> (${s.role || 'N/A'})</div>`).join('');
            } else {
                staffHtml = '<div style="font-size:12px;color:#9ca3af;">Not assigned</div>';
            }
            
            // Determine status color
            let statusColor = '#9ca3af';
            let statusText = 'Pending';
            if (progress >= 100) {
                statusColor = '#10b981';
                statusText = 'Completed';
            } else if (progress > 0) {
                statusColor = '#f59e0b';
                statusText = 'In Progress';
            }
            
            html += `<tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:12px;font-weight:500;color:#3b82f6;cursor:pointer;" onclick="showOrderWorkflowDetail('${oid}')">${oid}</td>
                <td style="padding:12px;">${customerName}</td>
                <td style="padding:12px;">${customerPhone}</td>
                <td style="padding:12px;text-align:center;">
                    <div style="background:#e5e7eb;border-radius:10px;height:6px;width:80px;position:relative;margin:0 auto;">
                        <div style="background:#10b981;height:100%;border-radius:10px;width:${progress}%;"></div>
                    </div>
                    <small style="color:#6b7280;font-size:11px;">${progress}%</small>
                </td>
                <td style="padding:12px;">${staffHtml}</td>
                <td style="padding:12px;text-align:center;">
                    <span style="display:inline-block;padding:4px 8px;border-radius:6px;font-size:12px;font-weight:600;color:${statusColor};background:${statusColor}22;">${statusText}</span>
                </td>
                <td style="padding:12px;text-align:right;font-weight:500;">₹${amount.toLocaleString()}</td>
                <td style="padding:12px;text-align:center;">
                    <button onclick="showOrderWorkflowDetail('${oid}')" style="padding:4px 8px;background:#3b82f6;color:white;border:0;border-radius:4px;cursor:pointer;font-size:12px;">View</button>
                </td>
            </tr>`;
        });
    }
    
    html += '</tbody></table></div></div>';
    document.getElementById('reportsTable').innerHTML = html;
}
