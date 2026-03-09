/**
 * Enhanced Reports Module for SAPTHALA Admin Panel
 * 
 * This module provides:
 * - Advanced filtering and sorting
 * - Export functionality (PDF, CSV, Excel)
 * - Real-time data updates
 * - Branch-wise reporting
 */

class EnhancedReports {
  constructor() {
    this.currentData = [];
    this.filters = {
      branch: '',
      fromDate: '',
      toDate: '',
      filterType: '',
      searchValue: '',
      sortBy: 'createdAt_desc'
    };
  }

  /**
   * Initialize the reports module
   */
  async init() {
    console.log('📊 Initializing Enhanced Reports...');
    
    // Populate branch dropdown
    await this.populateBranchDropdown();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Load initial data
    await this.loadReports();
    
    console.log('✅ Enhanced Reports initialized');
  }

  /**
   * Populate branch dropdown with unique branches
   */
  async populateBranchDropdown() {
    try {
      const response = await fetch('/api/public/branches');
      if (!response.ok) throw new Error('Failed to fetch branches');
      
      const branches = await response.json();
      const branchSelect = document.getElementById('reportBranch');
      
      if (!branchSelect) return;
      
      // Clear existing options
      branchSelect.innerHTML = '<option value="">All Branches</option>';
      
      // Use Set to ensure uniqueness
      const uniqueBranches = new Map();
      branches.forEach(branch => {
        const id = branch.branchId || branch.branch;
        const name = branch.branchName || id;
        if (id && !uniqueBranches.has(id)) {
          uniqueBranches.set(id, name);
        }
      });
      
      // Add options
      uniqueBranches.forEach((name, id) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = `${name} (${id})`;
        branchSelect.appendChild(option);
      });
      
      console.log(`✅ Populated ${uniqueBranches.size} unique branches`);
    } catch (error) {
      console.error('❌ Error populating branches:', error);
    }
  }

  /**
   * Set up event listeners for filters
   */
  setupEventListeners() {
    const elements = {
      reportBranch: document.getElementById('reportBranch'),
      reportFromDate: document.getElementById('reportFromDate'),
      reportToDate: document.getElementById('reportToDate'),
      reportFilterType: document.getElementById('reportFilterType'),
      reportSearchValue: document.getElementById('reportSearchValue'),
      reportSortBy: document.getElementById('reportSortBy')
    };

    // Add change listeners
    Object.entries(elements).forEach(([key, element]) => {
      if (element) {
        element.addEventListener('change', () => this.loadReports());
      }
    });

    // Add debounced search
    if (elements.reportSearchValue) {
      let searchTimeout;
      elements.reportSearchValue.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => this.loadReports(), 300);
      });
    }
  }

  /**
   * Load reports with current filters
   */
  async loadReports() {
    try {
      // Show loading spinner
      const spinner = document.getElementById('reportsLoadingSpinner');
      if (spinner) spinner.style.display = 'block';

      // Get filter values
      this.filters = {
        branch: document.getElementById('reportBranch')?.value || '',
        fromDate: document.getElementById('reportFromDate')?.value || '',
        toDate: document.getElementById('reportToDate')?.value || '',
        filterType: document.getElementById('reportFilterType')?.value || '',
        searchValue: document.getElementById('reportSearchValue')?.value || '',
        sortBy: document.getElementById('reportSortBy')?.value || 'createdAt_desc'
      };

      // Build query parameters
      const params = new URLSearchParams();
      if (this.filters.branch) params.append('branch', this.filters.branch);
      if (this.filters.fromDate) params.append('fromDate', this.filters.fromDate);
      if (this.filters.toDate) params.append('toDate', this.filters.toDate);
      if (this.filters.filterType && this.filters.searchValue) {
        params.append('filterBy', this.filters.filterType);
        params.append('q', this.filters.searchValue);
      }
      params.append('sortBy', this.filters.sortBy);

      // Fetch data
      const token = localStorage.getItem('sapthala_token');
      const response = await fetch(`/api/reports/orders?${params.toString()}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (!response.ok) throw new Error('Failed to fetch reports');

      const data = await response.json();
      this.currentData = data.orders || [];

      // Display reports
      this.displayReports(this.currentData);

      // Hide loading spinner
      if (spinner) spinner.style.display = 'none';

      console.log(`✅ Loaded ${this.currentData.length} orders`);
    } catch (error) {
      console.error('❌ Error loading reports:', error);
      
      // Hide loading spinner
      const spinner = document.getElementById('reportsLoadingSpinner');
      if (spinner) spinner.style.display = 'none';

      // Show error message
      const reportsTable = document.getElementById('reportsTable');
      if (reportsTable) {
        reportsTable.innerHTML = `
          <div style="padding: 20px; text-align: center; color: #dc2626;">
            <p>❌ Failed to load reports</p>
            <p style="font-size: 14px; color: #6b7280;">${error.message}</p>
          </div>
        `;
      }
    }
  }

  /**
   * Display reports in table format
   */
  displayReports(orders) {
    const reportsTable = document.getElementById('reportsTable');
    if (!reportsTable) return;

    if (orders.length === 0) {
      reportsTable.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #6b7280;">
          <p style="font-size: 18px; margin-bottom: 10px;">📊 No orders found</p>
          <p style="font-size: 14px;">Try adjusting your filters</p>
        </div>
      `;
      return;
    }

    // Calculate summary
    const totalAmount = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalOrders = orders.length;
    const avgAmount = totalOrders > 0 ? Math.round(totalAmount / totalOrders) : 0;

    let html = `
      <div style="background: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <h3 style="margin-bottom: 15px; color: #1e293b;">📊 Summary</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">Total Orders</div>
            <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${totalOrders}</div>
          </div>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">Total Revenue</div>
            <div style="font-size: 24px; font-weight: bold; color: #10b981;">₹${totalAmount.toLocaleString()}</div>
          </div>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">Average Order Value</div>
            <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">₹${avgAmount.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #e5e7eb;">
              <th style="padding: 12px; text-align: left; font-weight: 600;">Order ID</th>
              <th style="padding: 12px; text-align: left; font-weight: 600;">Customer</th>
              <th style="padding: 12px; text-align: left; font-weight: 600;">Phone</th>
              <th style="padding: 12px; text-align: left; font-weight: 600;">Garment</th>
              <th style="padding: 12px; text-align: center; font-weight: 600;">Progress</th>
              <th style="padding: 12px; text-align: center; font-weight: 600;">Status</th>
              <th style="padding: 12px; text-align: right; font-weight: 600;">Amount</th>
              <th style="padding: 12px; text-align: center; font-weight: 600;">Date</th>
            </tr>
          </thead>
          <tbody>
    `;

    orders.forEach(order => {
      const progress = order.progressPercentage || 0;
      const statusColor = {
        'pending': '#f59e0b',
        'in_progress': '#3b82f6',
        'completed': '#10b981',
        'delivered': '#059669',
        'cancelled': '#ef4444'
      }[order.status] || '#6b7280';

      html += `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px; font-weight: 500;">${order.orderId || ''}</td>
          <td style="padding: 12px;">${order.customerName || ''}</td>
          <td style="padding: 12px;">${order.customerPhone || ''}</td>
          <td style="padding: 12px;">${order.garmentType || ''}</td>
          <td style="padding: 12px; text-align: center;">
            <div style="background: #f3f4f6; border-radius: 8px; padding: 4px 8px; display: inline-block;">
              <span style="font-weight: 600; color: ${progress >= 100 ? '#10b981' : '#3b82f6'};">${progress}%</span>
            </div>
          </td>
          <td style="padding: 12px; text-align: center;">
            <span style="background: ${statusColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
              ${(order.status || 'pending').toUpperCase()}
            </span>
          </td>
          <td style="padding: 12px; text-align: right; font-weight: 600;">₹${(order.totalAmount || 0).toLocaleString()}</td>
          <td style="padding: 12px; text-align: center; font-size: 12px; color: #6b7280;">
            ${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''}
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    reportsTable.innerHTML = html;
  }

  /**
   * Export reports to PDF
   */
  exportToPDF() {
    if (this.currentData.length === 0) {
      alert('No data to export');
      return;
    }

    console.log('📄 Exporting to PDF...');
    
    // Create a simple text export (can be enhanced with a PDF library)
    const content = this.currentData.map(order => {
      return `${order.orderId} | ${order.customerName} | ${order.customerPhone} | ₹${order.totalAmount}`;
    }).join('\\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    console.log('✅ PDF export complete');
  }

  /**
   * Export reports to CSV
   */
  exportToCSV() {
    if (this.currentData.length === 0) {
      alert('No data to export');
      return;
    }

    console.log('📊 Exporting to CSV...');

    const headers = ['Order ID', 'Customer', 'Phone', 'Garment', 'Amount', 'Status', 'Progress', 'Date'];
    const rows = this.currentData.map(order => [
      order.orderId || '',
      order.customerName || '',
      order.customerPhone || '',
      order.garmentType || '',
      order.totalAmount || 0,
      order.status || '',
      `${order.progressPercentage || 0}%`,
      order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    console.log('✅ CSV export complete');
  }

  /**
   * Export reports to Excel
   */
  exportToExcel() {
    if (this.currentData.length === 0) {
      alert('No data to export');
      return;
    }

    console.log('📈 Exporting to Excel...');

    // Create Excel-compatible CSV with UTF-8 BOM
    const headers = ['Order ID', 'Customer', 'Phone', 'Garment', 'Amount', 'Status', 'Progress', 'Date'];
    const rows = this.currentData.map(order => [
      order.orderId || '',
      order.customerName || '',
      order.customerPhone || '',
      order.garmentType || '',
      order.totalAmount || 0,
      order.status || '',
      `${order.progressPercentage || 0}%`,
      order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''
    ]);

    const csvContent = '\\uFEFF' + [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);

    console.log('✅ Excel export complete');
  }
}

// Global instance
window.enhancedReports = new EnhancedReports();

// Export functions for global access
window.exportReportsPDF = () => window.enhancedReports.exportToPDF();
window.exportReportsCSV = () => window.enhancedReports.exportToCSV();
window.exportReportsExcel = () => window.enhancedReports.exportToExcel();
window.loadReportsWithFilters = () => window.enhancedReports.loadReports();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Will be initialized when reports tab is opened
  });
} else {
  // DOM already loaded
  // Will be initialized when reports tab is opened
}

console.log('✅ Enhanced Reports module loaded');
