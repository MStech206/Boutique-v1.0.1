// Enhanced Reports Module - Real-time Filtering
// This script enhances the reports section with live filtering capabilities

(function() {
  'use strict';

  // Debounce utility for performance
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Initialize reports enhancements
  function initReportsEnhancements() {
    const searchInput = document.getElementById('reportSearchValue');
    const filterType = document.getElementById('reportFilterType');
    const fromDate = document.getElementById('reportFromDate');
    const toDate = document.getElementById('reportToDate');
    const branchSelect = document.getElementById('reportBranch');

    if (!searchInput || !filterType) {
      console.warn('Reports elements not found');
      return;
    }

    // Remove "Show Reports" button if it exists
    const showReportBtn = document.querySelector('button[onclick="loadReports()"]');
    if (showReportBtn && showReportBtn.textContent.includes('Show Report')) {
      showReportBtn.style.display = 'none';
    }

    // Create debounced filter function
    const debouncedFilter = debounce(() => {
      loadReports();
    }, 300);

    // Add real-time filtering on input
    searchInput.addEventListener('input', debouncedFilter);
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        loadReports();
      }
    });

    // Filter on dropdown changes
    filterType.addEventListener('change', () => {
      searchInput.placeholder = getPlaceholderText(filterType.value);
      if (searchInput.value) {
        loadReports();
      }
    });

    if (fromDate) fromDate.addEventListener('change', loadReports);
    if (toDate) toDate.addEventListener('change', loadReports);
    if (branchSelect) branchSelect.addEventListener('change', loadReports);

    // Set initial placeholder
    searchInput.placeholder = getPlaceholderText(filterType.value);

    console.log('✅ Reports enhancements initialized');
  }

  function getPlaceholderText(filterType) {
    const placeholders = {
      'orderId': 'Enter Order ID...',
      'customer': 'Enter Customer Name...',
      'phone': 'Enter Phone Number...',
      'staff': 'Enter Staff Name...',
      '': 'Search all orders...'
    };
    return placeholders[filterType] || 'Search...';
  }

  // Enhanced loadReports function with better error handling
  window.loadReportsEnhanced = async function() {
    try {
      const fromDate = document.getElementById('reportFromDate')?.value || '';
      const toDate = document.getElementById('reportToDate')?.value || '';
      const branch = document.getElementById('reportBranch')?.value || '';
      const filterType = document.getElementById('reportFilterType')?.value || '';
      const searchValue = document.getElementById('reportSearchValue')?.value?.trim() || '';
      
      const token = localStorage.getItem('sapthala_token') || sessionStorage.getItem('sapthala_token');
      
      // Show loading indicator
      const reportsTable = document.getElementById('reportsTable');
      if (reportsTable) {
        reportsTable.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div><p>Loading reports...</p></div>';
      }

      // Build query parameters
      const params = new URLSearchParams();
      if (filterType && searchValue) {
        params.append('filterBy', filterType);
        params.append('q', searchValue);
      }
      if (branch) params.append('branch', branch);
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

      // Fetch from backend
      const response = await fetch(`/api/reports/orders?${params.toString()}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const orders = data.success ? data.orders : (Array.isArray(data) ? data : []);

      // Display results
      displayReportsEnhanced(orders);

    } catch (error) {
      console.error('Reports error:', error);
      const reportsTable = document.getElementById('reportsTable');
      if (reportsTable) {
        reportsTable.innerHTML = `
          <div style="text-align:center;padding:40px;color:#dc2626;">
            <p>❌ Failed to load reports</p>
            <p style="font-size:14px;color:#6b7280;">${error.message}</p>
            <button onclick="loadReportsEnhanced()" class="btn-primary" style="margin-top:16px;">Retry</button>
          </div>
        `;
      }
    }
  };

  function displayReportsEnhanced(orders) {
    const reportsTable = document.getElementById('reportsTable');
    if (!reportsTable) return;

    if (!orders || orders.length === 0) {
      reportsTable.innerHTML = `
        <div style="text-align:center;padding:40px;">
          <div style="font-size:48px;margin-bottom:16px;">📊</div>
          <p style="color:#6b7280;">No orders found matching your filters</p>
        </div>
      `;
      return;
    }

    // Calculate summary
    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const avgOrderValue = Math.round(totalRevenue / orders.length);

    let html = `
      <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);margin-bottom:20px;">
        <h3 style="margin-bottom:15px;color:#1e293b;display:flex;align-items:center;gap:8px;">
          <span>📊</span> Order Summary
        </h3>
        <div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));">
          <div style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:white;padding:16px;border-radius:8px;">
            <div style="font-size:28px;font-weight:bold;">${orders.length}</div>
            <div style="font-size:14px;opacity:0.9;">Total Orders</div>
          </div>
          <div style="background:linear-gradient(135deg,#10b981,#059669);color:white;padding:16px;border-radius:8px;">
            <div style="font-size:28px;font-weight:bold;">₹${totalRevenue.toLocaleString()}</div>
            <div style="font-size:14px;opacity:0.9;">Total Revenue</div>
          </div>
          <div style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;padding:16px;border-radius:8px;">
            <div style="font-size:28px;font-weight:bold;">₹${avgOrderValue.toLocaleString()}</div>
            <div style="font-size:14px;opacity:0.9;">Avg Order Value</div>
          </div>
        </div>
      </div>
      
      <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
        <h3 style="margin-bottom:15px;color:#1e293b;">📋 Order Details</h3>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr style="background:#f8fafc;border-bottom:2px solid #e5e7eb;">
                <th style="padding:12px;text-align:left;font-weight:600;">Order ID</th>
                <th style="padding:12px;text-align:left;font-weight:600;">Customer</th>
                <th style="padding:12px;text-align:left;font-weight:600;">Phone</th>
                <th style="padding:12px;text-align:center;font-weight:600;">Progress</th>
                <th style="padding:12px;text-align:center;font-weight:600;">Status</th>
                <th style="padding:12px;text-align:right;font-weight:600;">Amount</th>
                <th style="padding:12px;text-align:center;font-weight:600;">Action</th>
              </tr>
            </thead>
            <tbody>
    `;

    orders.forEach(order => {
      const oid = order.orderId || order.id || '';
      const customerName = order.customerName || order.customer?.name || 'Unknown';
      const customerPhone = order.customerPhone || order.customer?.phone || '';
      const amount = order.totalAmount || 0;
      const progress = order.progress || order.progressPercentage || 0;
      const status = order.status || 'pending';
      
      const statusColors = {
        'pending': '#f59e0b',
        'in_progress': '#3b82f6',
        'completed': '#10b981',
        'delivered': '#8b5cf6'
      };
      const statusColor = statusColors[status] || '#6b7280';

      html += `
        <tr style="border-bottom:1px solid #e5e7eb;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
          <td style="padding:12px;font-weight:500;color:#3b82f6;cursor:pointer;" onclick="openOrderDetail('${oid}')">${oid}</td>
          <td style="padding:12px;">${customerName}</td>
          <td style="padding:12px;">${customerPhone}</td>
          <td style="padding:12px;text-align:center;">
            <div style="background:#e5e7eb;border-radius:10px;height:6px;width:80px;position:relative;margin:0 auto;">
              <div style="background:#10b981;height:100%;border-radius:10px;width:${progress}%;"></div>
            </div>
            <small style="color:#6b7280;font-size:11px;">${progress}%</small>
          </td>
          <td style="padding:12px;text-align:center;">
            <span style="display:inline-block;padding:4px 8px;border-radius:6px;font-size:12px;font-weight:600;color:${statusColor};background:${statusColor}22;">${status.toUpperCase()}</span>
          </td>
          <td style="padding:12px;text-align:right;font-weight:500;">₹${amount.toLocaleString()}</td>
          <td style="padding:12px;text-align:center;">
            <button onclick="openOrderDetail('${oid}')" style="padding:6px 12px;background:#3b82f6;color:white;border:0;border-radius:4px;cursor:pointer;font-size:12px;">View</button>
          </td>
        </tr>
      `;
    });

    html += '</tbody></table></div></div>';
    reportsTable.innerHTML = html;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReportsEnhancements);
  } else {
    initReportsEnhancements();
  }

  // Override the original loadReports function
  window.loadReports = window.loadReportsEnhanced;

})();
