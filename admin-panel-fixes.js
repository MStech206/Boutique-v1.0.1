// SAPTHALA ADMIN PANEL - ENHANCED JAVASCRIPT
// This file contains all the fixes and new features

// ==================== FIX 1: ENHANCED LOGIN WITH PROPER ERROR HANDLING ====================
async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    const loginBtn = document.querySelector('.login-btn[type="submit"]');
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="spinner"></span>Logging in...';

    // Clear previous messages
    clearLoginMessages();

    if (!username || !password) {
        showLoginError('Please enter both username and password');
        loginBtn.disabled = false;
        loginBtn.innerHTML = '🚀 Login to Dashboard';
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
            localStorage.setItem('sapthala_logged_in', 'true');
            localStorage.setItem('sapthala_token', data.token);
            localStorage.setItem('sapthala_user', JSON.stringify(data.user));
            
            showLoginSuccess(`Welcome, ${data.user.username}!`);
            
            setTimeout(() => {
                document.getElementById('loginPage').classList.add('hidden');
                document.getElementById('mainApp').classList.remove('hidden');
                updateDashboardStats();
            }, 500);
        } else {
            showLoginError(data.error || 'Login failed. Please check your credentials.');
        }
    } catch (error) {
        console.error('Login error:', error);
        showLoginError('Connection error. Please check if server is running.');
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '🚀 Login to Dashboard';
    }
}

function clearLoginMessages() {
    const err = document.getElementById('loginErrorMsg');
    const ok = document.getElementById('loginSuccessMsg');
    if (err) err.style.display = 'none';
    if (ok) ok.style.display = 'none';
}

function showLoginError(msg) {
    let err = document.getElementById('loginErrorMsg');
    if (!err) {
        err = document.createElement('div');
        err.id = 'loginErrorMsg';
        err.style.cssText = 'color:#dc2626; background:#fee2e2; border:2px solid #dc2626; border-radius:8px; margin-bottom:15px; padding:12px; font-weight:600;';
        document.querySelector('.login-form').prepend(err);
    }
    err.textContent = '❌ ' + msg;
    err.style.display = 'block';
}

function showLoginSuccess(msg) {
    let ok = document.getElementById('loginSuccessMsg');
    if (!ok) {
        ok = document.createElement('div');
        ok.id = 'loginSuccessMsg';
        ok.style.cssText = 'color:#fff; background:#10b981; border-radius:8px; margin-bottom:15px; padding:12px; font-weight:600;';
        document.querySelector('.login-form').prepend(ok);
    }
    ok.textContent = '✅ ' + msg;
    ok.style.display = 'block';
}

// ==================== FIX 2: ORDERS MANAGEMENT - FIX UNDEFINED VALUES ====================
function displayOrders(orders) {
    const ordersList = document.getElementById('ordersList');
    if (!orders || orders.length === 0) {
        ordersList.innerHTML = '<div style="text-align: center; padding: 40px; color: #6b7280;">No orders found</div>';
        return;
    }

    let html = '<div class="orders-list">';
    orders.forEach(order => {
        // Fix undefined values with proper defaults
        const orderId = order.orderId || order.id || 'N/A';
        const customerName = order.customerName || 'Unknown Customer';
        const customerPhone = order.customerPhone || 'No Phone';
        const garmentType = order.garmentType || 'Not Specified';
        const totalAmount = order.totalAmount || order.pricing?.total || 0;
        const status = order.status || 'pending';
        const createdAt = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A';
        const branch = order.branch || 'MAIN';
        
        html += `
            <div class="order-item">
                <div>
                    <strong>${orderId}</strong><br>
                    <small>${createdAt}</small><br>
                    <small style="color: #6366f1;">📍 ${branch}</small>
                </div>
                <div>
                    <strong>${customerName}</strong><br>
                    <small>📱 ${customerPhone}</small>
                </div>
                <div>
                    ${garmentType}<br>
                    <small style="color: #059669; font-weight: bold;">₹${totalAmount.toLocaleString()}</small>
                </div>
                <div>
                    <span class="badge ${status === 'completed' ? 'badge-available' : 'badge-busy'}">
                        ${status.toUpperCase()}
                    </span>
                </div>
            </div>
        `;
    });
    html += '</div>';
    ordersList.innerHTML = html;
}

// ==================== FIX 3: STAFF DISPLAY - ENHANCED ====================
function displayStaff(staff) {
    const staffList = document.getElementById('staffList');
    console.log('📋 Displaying staff:', staff.length, 'members');
    
    if (!staff || staff.length === 0) {
        staffList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6b7280; background: white; border-radius: 12px;">
                <div style="font-size: 48px; margin-bottom: 16px;">👥</div>
                <h3>No Staff Members Found</h3>
                <p>Click "Add New Staff" to create your first staff member.</p>
            </div>
        `;
        return;
    }

    const sortedStaff = [...staff].sort((a, b) => {
        const aNum = parseInt((a.staffId || '').replace('staff_', '')) || 999;
        const bNum = parseInt((b.staffId || '').replace('staff_', '')) || 999;
        return aNum - bNum;
    });

    let html = '';
    sortedStaff.forEach((member, index) => {
        const stages = member.workflowStages || [];
        const name = member.name || 'Unknown';
        const staffId = member.staffId || 'N/A';
        const role = member.role || 'Staff';
        const phone = member.phone || 'No phone';
        const email = member.email || '';
        const isAvailable = member.isAvailable !== false;
        
        html += `
            <div class="staff-item">
                <div class="staff-avatar">
                    ${name.charAt(0).toUpperCase()}
                </div>
                <div class="staff-info">
                    <h3>${name} <span class="role-small">(${staffId})</span></h3>
                    <p><strong>${role}</strong></p>
                    <p>📱 ${phone}</p>
                    ${email ? `<p>📧 ${email}</p>` : ''}
                </div>
                <div>
                    ${stages.map(stage => `<span class="stage-tag">${stage.replace('-', ' ').toUpperCase()}</span>`).join('')}
                </div>
                <div>
                    <span class="staff-badge ${isAvailable ? 'badge-available' : 'badge-busy'}">
                        ${isAvailable ? '✅ Available' : '🔴 Busy'}
                    </span>
                </div>
                <div class="staff-actions">
                    <button class="btn-edit" onclick="editStaff('${member._id}')" title="Edit Staff">✏️ Edit</button>
                    <button class="btn-toggle" onclick="toggleStaffAvailability('${member._id}', ${!isAvailable})" title="Toggle Availability">
                        ${isAvailable ? '⏸️ Set Busy' : '▶️ Set Available'}
                    </button>
                    <button class="btn-delete" onclick="deleteStaff('${member._id}')" title="Delete Staff">🗑️ Delete</button>
                </div>
            </div>
        `;
    });
    
    staffList.innerHTML = html;
    console.log('✅ Staff display updated successfully');
}

// ==================== NEW FEATURE: LAST 10 ORDERS REPORT ====================
async function loadLast10OrdersReport() {
    try {
        const token = localStorage.getItem('sapthala_token');
        const response = await fetch('http://localhost:3000/api/reports/last-orders?limit=10', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            displayLast10OrdersReport(data);
        } else {
            console.error('Failed to load last 10 orders report');
        }
    } catch (error) {
        console.error('Error loading last 10 orders report:', error);
    }
}

function displayLast10OrdersReport(data) {
    const container = document.getElementById('last10OrdersReport');
    if (!container) return;
    
    const { orders, summary } = data;
    
    let html = `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px 0;">📊 Last 10 Orders Summary</h3>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
                <div>
                    <div style="font-size: 24px; font-weight: bold;">${summary.totalOrders}</div>
                    <div style="font-size: 12px; opacity: 0.9;">Orders</div>
                </div>
                <div>
                    <div style="font-size: 24px; font-weight: bold;">₹${summary.totalAmount.toLocaleString()}</div>
                    <div style="font-size: 12px; opacity: 0.9;">Total Amount</div>
                </div>
                <div>
                    <div style="font-size: 24px; font-weight: bold;">₹${summary.totalAdvance.toLocaleString()}</div>
                    <div style="font-size: 12px; opacity: 0.9;">Advance Collected</div>
                </div>
                <div>
                    <div style="font-size: 24px; font-weight: bold;">₹${summary.totalBalance.toLocaleString()}</div>
                    <div style="font-size: 12px; opacity: 0.9;">Balance Due</div>
                </div>
            </div>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden;">
            <thead>
                <tr style="background: #667eea; color: white;">
                    <th style="padding: 12px; text-align: left;">Order ID</th>
                    <th style="padding: 12px; text-align: left;">Customer</th>
                    <th style="padding: 12px; text-align: left;">Garment</th>
                    <th style="padding: 12px; text-align: right;">Amount</th>
                    <th style="padding: 12px; text-align: center;">Status</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    orders.forEach(order => {
        html += `
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px;">${order.orderId}</td>
                <td style="padding: 12px;">${order.customerName}</td>
                <td style="padding: 12px;">${order.garmentType}</td>
                <td style="padding: 12px; text-align: right; font-weight: bold; color: #059669;">₹${order.totalAmount.toLocaleString()}</td>
                <td style="padding: 12px; text-align: center;">
                    <span class="badge ${order.status === 'completed' ? 'badge-available' : 'badge-busy'}">
                        ${order.status}
                    </span>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

// Export functions for use in HTML
window.handleLogin = handleLogin;
window.displayOrders = displayOrders;
window.displayStaff = displayStaff;
window.loadLast10OrdersReport = loadLast10OrdersReport;
