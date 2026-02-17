// Admin Panel Enhancements - Complete Functionality
(function() {
    'use strict';

    // Initialize all enhancements on load
    document.addEventListener('DOMContentLoaded', function() {
        initFestivalThemes();
        initReportsFilters();
        initCustomerManagement();
        initSubAdminManagement();
    });

    // ==================== REPORTS SECTION ====================
    window.initReportsFilters = function() {
        const searchInput = document.getElementById('reportSearchValue');
        const filterType = document.getElementById('reportFilterType');
        
        // Trigger search on Enter key
        if (searchInput) {
            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    loadReports();
                }
            });
        }
        
        // Auto-trigger when filter type changes
        if (filterType) {
            filterType.addEventListener('change', function() {
                if (searchInput && searchInput.value.trim()) {
                    loadReports();
                }
            });
        }
    };

    // ==================== CUSTOMER MANAGEMENT ====================
    window.initCustomerManagement = function() {
        // Customer edit functionality will be added via Edit buttons
    };

    window.editCustomer = function(customerId) {
        // Fetch customer data and show edit modal
        fetch(`/api/admin/customers/${customerId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('sapthala_token')}` }
        })
        .then(res => res.json())
        .then(customer => {
            showCustomerEditModal(customer);
        })
        .catch(err => {
            console.error('Failed to load customer:', err);
            alert('Failed to load customer details');
        });
    };

    function showCustomerEditModal(customer) {
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;';
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 16px; max-width: 600px; width: 100%; padding: 30px;" onclick="event.stopPropagation()">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #e5e7eb;">
                    <h2 style="margin: 0; color: #1e293b; font-size: 24px;">✏️ Edit Customer</h2>
                    <button onclick="this.closest('div[style*=fixed]').remove()" style="background: #ef4444; color: white; border: none; border-radius: 50%; width: 36px; height: 36px; cursor: pointer; font-size: 20px; font-weight: bold;">×</button>
                </div>
                
                <form id="editCustomerForm" style="display: grid; gap: 16px;">
                    <div>
                        <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #374151;">Customer Name *</label>
                        <input type="text" id="editCustomerName" value="${customer.name || ''}" required style="width: 100%; padding: 12px; border: 2px solid #d1d5db; border-radius: 8px; font-size: 16px;">
                    </div>
                    
                    <div>
                        <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #374151;">Phone Number *</label>
                        <input type="tel" id="editCustomerPhone" value="${customer.phone || ''}" required style="width: 100%; padding: 12px; border: 2px solid #d1d5db; border-radius: 8px; font-size: 16px;">
                    </div>
                    
                    <div>
                        <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #374151;">Email</label>
                        <input type="email" id="editCustomerEmail" value="${customer.email || ''}" style="width: 100%; padding: 12px; border: 2px solid #d1d5db; border-radius: 8px; font-size: 16px;">
                    </div>
                    
                    <div>
                        <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #374151;">Address</label>
                        <textarea id="editCustomerAddress" rows="3" style="width: 100%; padding: 12px; border: 2px solid #d1d5db; border-radius: 8px; font-size: 16px; resize: vertical;">${customer.address || ''}</textarea>
                    </div>
                    
                    <div style="display: flex; gap: 12px; margin-top: 16px;">
                        <button type="submit" style="flex: 1; padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 16px;">💾 Save Changes</button>
                        <button type="button" onclick="this.closest('div[style*=fixed]').remove()" style="flex: 1; padding: 12px; background: #6b7280; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 16px;">Cancel</button>
                    </div>
                </form>
            </div>
        `;
        
        modal.onclick = () => modal.remove();
        document.body.appendChild(modal);
        
        // Handle form submission
        document.getElementById('editCustomerForm').onsubmit = async function(e) {
            e.preventDefault();
            
            const updatedCustomer = {
                name: document.getElementById('editCustomerName').value,
                phone: document.getElementById('editCustomerPhone').value,
                email: document.getElementById('editCustomerEmail').value,
                address: document.getElementById('editCustomerAddress').value
            };
            
            try {
                const response = await fetch(`/api/admin/customers/${customer.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('sapthala_token')}`
                    },
                    body: JSON.stringify(updatedCustomer)
                });
                
                if (response.ok) {
                    showNotification('✅ Customer updated successfully!');
                    modal.remove();
                    loadCustomers(); // Reload customer list
                } else {
                    throw new Error('Failed to update customer');
                }
            } catch (error) {
                console.error('Update customer error:', error);
                alert('Failed to update customer: ' + error.message);
            }
        };
    }

    // ==================== SUB-ADMIN MANAGEMENT ====================
    window.initSubAdminManagement = function() {
        // Sub-admin password management will be added
    };

    window.viewSubAdminPassword = function(subAdminId) {
        // Show password in modal (admin only)
        fetch(`/api/admin/sub-admins/${subAdminId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('sapthala_token')}` }
        })
        .then(res => res.json())
        .then(data => {
            const subAdmin = data.subAdmin || data;
            showPasswordModal(subAdmin);
        })
        .catch(err => {
            console.error('Failed to load sub-admin:', err);
            alert('Failed to load sub-admin details');
        });
    };

    function showPasswordModal(subAdmin) {
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;';
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 16px; max-width: 500px; width: 100%; padding: 30px;" onclick="event.stopPropagation()">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #e5e7eb;">
                    <h2 style="margin: 0; color: #1e293b; font-size: 24px;">🔐 Sub-Admin Password</h2>
                    <button onclick="this.closest('div[style*=fixed]').remove()" style="background: #ef4444; color: white; border: none; border-radius: 50%; width: 36px; height: 36px; cursor: pointer; font-size: 20px; font-weight: bold;">×</button>
                </div>
                
                <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                    <div style="margin-bottom: 12px;">
                        <strong style="color: #374151;">Username:</strong>
                        <div style="margin-top: 4px; font-size: 16px; color: #1e293b;">${subAdmin.username}</div>
                    </div>
                    <div>
                        <strong style="color: #374151;">Branch:</strong>
                        <div style="margin-top: 4px; font-size: 16px; color: #1e293b;">${subAdmin.branch || 'N/A'}</div>
                    </div>
                </div>
                
                <form id="changePasswordForm" style="display: grid; gap: 16px;">
                    <div>
                        <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #374151;">New Password *</label>
                        <input type="password" id="newPassword" required minlength="8" placeholder="Enter new password (min 8 characters)" style="width: 100%; padding: 12px; border: 2px solid #d1d5db; border-radius: 8px; font-size: 16px;">
                    </div>
                    
                    <div>
                        <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #374151;">Confirm Password *</label>
                        <input type="password" id="confirmPassword" required minlength="8" placeholder="Confirm new password" style="width: 100%; padding: 12px; border: 2px solid #d1d5db; border-radius: 8px; font-size: 16px;">
                    </div>
                    
                    <div>
                        <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #374151;">Reason for Change</label>
                        <textarea id="changeReason" rows="2" placeholder="Optional: Why are you changing the password?" style="width: 100%; padding: 12px; border: 2px solid #d1d5db; border-radius: 8px; font-size: 16px; resize: vertical;"></textarea>
                    </div>
                    
                    <div style="display: flex; gap: 12px; margin-top: 16px;">
                        <button type="submit" style="flex: 1; padding: 12px; background: #ef4444; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 16px;">🔐 Change Password</button>
                        <button type="button" onclick="this.closest('div[style*=fixed]').remove()" style="flex: 1; padding: 12px; background: #6b7280; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 16px;">Cancel</button>
                    </div>
                </form>
            </div>
        `;
        
        modal.onclick = () => modal.remove();
        document.body.appendChild(modal);
        
        // Handle form submission
        document.getElementById('changePasswordForm').onsubmit = async function(e) {
            e.preventDefault();
            
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const reason = document.getElementById('changeReason').value;
            
            if (newPassword !== confirmPassword) {
                alert('Passwords do not match!');
                return;
            }
            
            try {
                const response = await fetch(`/api/admin/sub-admins/${subAdmin._id}/password`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('sapthala_token')}`
                    },
                    body: JSON.stringify({ newPassword, reason })
                });
                
                if (response.ok) {
                    showNotification('✅ Password changed successfully!');
                    modal.remove();
                } else {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to change password');
                }
            } catch (error) {
                console.error('Change password error:', error);
                alert('Failed to change password: ' + error.message);
            }
        };
    }

    // ==================== FESTIVAL THEMES ====================
    window.initFestivalThemes = function() {
        const themeCards = document.querySelectorAll('.theme-card[data-theme]');
        
        themeCards.forEach(card => {
            card.addEventListener('click', function() {
                const theme = this.dataset.theme;
                applyTheme(theme);
                
                // Update active state
                themeCards.forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                
                // Save to localStorage
                localStorage.setItem('sapthala_current_theme', theme);
                
                // Show notification
                showNotification(`✨ ${this.querySelector('h4').textContent} theme applied!`);
            });
        });
        
        // Load saved theme
        const savedTheme = localStorage.getItem('sapthala_current_theme') || 'default';
        const savedCard = document.querySelector(`.theme-card[data-theme="${savedTheme}"]`);
        if (savedCard) {
            savedCard.classList.add('active');
            applyTheme(savedTheme);
        }
    };

    // Apply theme to UI with authentic festival colors
    window.applyTheme = function(themeName) {
        const themes = {
            default: { primary: '#6366f1', secondary: '#8b5cf6', accent: '#ec4899', name: 'Modern Boutique' },
            newYear: { primary: '#FFD700', secondary: '#FFA500', accent: '#FF6347', name: 'New Year Celebration' },
            sankranti: { primary: '#FF6B35', secondary: '#F7931E', accent: '#FDB913', name: 'Makar Sankranti' },
            holi: { primary: '#FF1493', secondary: '#9370DB', accent: '#00CED1', name: 'Holi Festival' },
            ugadi: { primary: '#32CD32', secondary: '#FFD700', accent: '#FF6347', name: 'Ugadi Festival' },
            ramadan: { primary: '#008080', secondary: '#20B2AA', accent: '#FFD700', name: 'Ramadan Kareem' },
            diwali: { primary: '#FF8C00', secondary: '#FFD700', accent: '#DC143C', name: 'Diwali Festival' },
            ganesh: { primary: '#FF6347', secondary: '#FFD700', accent: '#FF4500', name: 'Ganesh Chaturthi' },
            independence: { primary: '#FF9933', secondary: '#FFFFFF', accent: '#138808', name: 'Independence Day' },
            christmas: { primary: '#DC143C', secondary: '#228B22', accent: '#FFD700', name: 'Christmas Festival' }
        };

        const theme = themes[themeName] || themes.default;
        
        // Update header with theme
        const header = document.querySelector('.header');
        if (header) {
            header.style.background = `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 50%, ${theme.accent} 100%)`;
            header.style.transition = 'all 0.5s ease';
        }
        
        // Update sidebar
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.style.background = `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`;
            sidebar.style.transition = 'all 0.5s ease';
        }
        
        // Update stat cards
        document.querySelectorAll('.stat-card').forEach((card, index) => {
            const colors = [theme.primary, theme.secondary, theme.accent, '#6b7280'];
            card.style.background = `linear-gradient(135deg, ${colors[index % colors.length]} 0%, ${colors[(index + 1) % colors.length]} 100%)`;
            card.style.transition = 'all 0.5s ease';
        });
        
        // Update primary buttons
        document.querySelectorAll('.btn-primary').forEach(btn => {
            btn.style.background = `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`;
            btn.style.transition = 'all 0.3s ease';
        });
        
        // Update theme selector
        const selector = document.getElementById('themeSelector');
        if (selector) {
            selector.value = themeName;
        }
        
        // Save theme preference
        localStorage.setItem('sapthala_current_theme', themeName);
        
        console.log(`✨ Theme applied: ${theme.name}`);
    };

    // Enhanced Customer Orders Display with Edit functionality
    window.loadCustomers = async function() {
        try {
            const token = localStorage.getItem('sapthala_token');
            const response = await fetch('/api/admin/customers', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Failed to fetch customers');
            
            const data = await response.json();
            const customers = data.customers || data || [];
            
            displayCustomers(customers);
        } catch (error) {
            console.error('Load customers error:', error);
            document.getElementById('customersList').innerHTML = `
                <div style="padding: 40px; text-align: center; color: #ef4444;">
                    <p style="font-size: 18px; margin-bottom: 10px;">❌ Failed to load customers</p>
                    <p style="font-size: 14px; color: #6b7280;">${error.message}</p>
                </div>
            `;
        }
    };

    function displayCustomers(customers) {
        const container = document.getElementById('customersList');
        
        if (!customers || customers.length === 0) {
            container.innerHTML = `
                <div style="padding: 60px; text-align: center; color: #9ca3af;">
                    <div style="font-size: 48px; margin-bottom: 16px;">👥</div>
                    <h3 style="font-size: 20px; margin-bottom: 8px; color: #6b7280;">No Customers Yet</h3>
                    <p style="font-size: 14px;">Customers will appear here once orders are created</p>
                </div>
            `;
            return;
        }

        let html = `
            <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                <div style="padding: 20px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white;">
                    <h3 style="margin: 0; font-size: 20px;">👥 Customer Management</h3>
                    <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Total Customers: ${customers.length}</p>
                </div>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f8fafc; border-bottom: 2px solid #e5e7eb;">
                                <th style="padding: 16px; text-align: left; font-weight: 600; color: #374151;">Customer Name</th>
                                <th style="padding: 16px; text-align: left; font-weight: 600; color: #374151;">Phone</th>
                                <th style="padding: 16px; text-align: left; font-weight: 600; color: #374151;">Address</th>
                                <th style="padding: 16px; text-align: center; font-weight: 600; color: #374151;">Orders</th>
                                <th style="padding: 16px; text-align: right; font-weight: 600; color: #374151;">Total Spent</th>
                                <th style="padding: 16px; text-align: center; font-weight: 600; color: #374151;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        customers.forEach(customer => {
            const name = customer.name || 'Unknown';
            const phone = customer.phone || 'N/A';
            const address = customer.address || 'No address';
            const orders = customer.totalOrders || 0;
            const spent = customer.totalSpent || 0;

            html += `
                <tr style="border-bottom: 1px solid #e5e7eb; transition: background 0.2s;" 
                    onmouseover="this.style.background='#f8fafc'" 
                    onmouseout="this.style.background='white'">
                    <td style="padding: 16px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px;">
                                ${name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div style="font-weight: 600; color: #1e293b;">${name}</div>
                                <div style="font-size: 12px; color: #64748b;">Customer ID: ${customer.id || 'N/A'}</div>
                            </div>
                        </div>
                    </td>
                    <td style="padding: 16px; color: #374151;">
                        <a href="tel:${phone}" style="color: #3b82f6; text-decoration: none; font-weight: 500;">
                            📱 ${phone}
                        </a>
                    </td>
                    <td style="padding: 16px; color: #64748b; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${address}
                    </td>
                    <td style="padding: 16px; text-align: center;">
                        <span style="display: inline-block; padding: 6px 12px; background: ${orders > 0 ? '#dbeafe' : '#f3f4f6'}; color: ${orders > 0 ? '#1e40af' : '#6b7280'}; border-radius: 12px; font-weight: 600; font-size: 14px;">
                            ${orders} ${orders === 1 ? 'Order' : 'Orders'}
                        </span>
                    </td>
                    <td style="padding: 16px; text-align: right; font-weight: 600; color: #059669; font-size: 16px;">
                        ₹${spent.toLocaleString()}
                    </td>
                    <td style="padding: 16px; text-align: center;">
                        <div style="display: flex; gap: 8px; justify-content: center;">
                            <button onclick="editCustomer('${customer.id}')" 
                                    style="padding: 8px 16px; background: #f59e0b; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s;"
                                    onmouseover="this.style.background='#d97706'; this.style.transform='translateY(-2px)'"
                                    onmouseout="this.style.background='#f59e0b'; this.style.transform='translateY(0)'">
                                ✏️ Edit
                            </button>
                            <button onclick="viewCustomerOrders('${customer.id || customer.phone}')" 
                                    style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s;"
                                    onmouseover="this.style.background='#2563eb'; this.style.transform='translateY(-2px)'"
                                    onmouseout="this.style.background='#3b82f6'; this.style.transform='translateY(0)'">
                                📋 View Orders
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    // View customer orders
    window.viewCustomerOrders = async function(customerId) {
        try {
            const token = localStorage.getItem('sapthala_token');
            const response = await fetch(`/api/admin/orders?customer=${customerId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Failed to fetch orders');
            
            const orders = await response.json();
            showCustomerOrdersModal(orders);
        } catch (error) {
            console.error('View customer orders error:', error);
            alert('Failed to load customer orders: ' + error.message);
        }
    };

    function showCustomerOrdersModal(orders) {
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;';
        
        let html = `
            <div style="background: white; border-radius: 16px; max-width: 900px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 30px;" onclick="event.stopPropagation()">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #e5e7eb;">
                    <h2 style="margin: 0; color: #1e293b; font-size: 24px;">📋 Customer Orders</h2>
                    <button onclick="this.closest('div[style*=fixed]').remove()" style="background: #ef4444; color: white; border: none; border-radius: 50%; width: 36px; height: 36px; cursor: pointer; font-size: 20px; font-weight: bold;">×</button>
                </div>
        `;

        if (!orders || orders.length === 0) {
            html += '<p style="text-align: center; color: #9ca3af; padding: 40px;">No orders found for this customer</p>';
        } else {
            html += '<div style="display: grid; gap: 16px;">';
            orders.forEach(order => {
                html += `
                    <div style="padding: 20px; border: 2px solid #e5e7eb; border-radius: 12px; background: #f8fafc;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                            <div><strong>Order ID:</strong> ${order.orderId}</div>
                            <div><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</div>
                            <div><strong>Garment:</strong> ${order.garmentType}</div>
                            <div><strong>Amount:</strong> ₹${order.totalAmount?.toLocaleString() || 0}</div>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                            <span style="padding: 6px 12px; background: ${order.status === 'completed' ? '#d1fae5' : '#fef3c7'}; color: ${order.status === 'completed' ? '#065f46' : '#92400e'}; border-radius: 8px; font-weight: 600; font-size: 12px; text-transform: uppercase;">
                                ${order.status}
                            </span>
                            <button onclick="openOrderDetail('${order.orderId}')" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                                View Details
                            </button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }

        html += `
                <div style="margin-top: 24px; text-align: center;">
                    <button onclick="this.closest('div[style*=fixed]').remove()" style="padding: 12px 32px; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 16px;">
                        Close
                    </button>
                </div>
            </div>
        `;

        modal.innerHTML = html;
        modal.onclick = () => modal.remove();
        document.body.appendChild(modal);
    }

    // Show notification with undo functionality
    function showNotification(message, type = 'success', undoCallback = null) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            background: linear-gradient(135deg, ${type === 'success' ? '#10b981' : '#ef4444'} 0%, ${type === 'success' ? '#059669' : '#dc2626'} 100%);
            color: white; padding: 16px 24px; border-radius: 12px;
            box-shadow: 0 8px 25px rgba(${type === 'success' ? '16,185,129' : '239,68,68'},0.3);
            font-weight: 600; font-size: 14px;
            transform: translateX(400px); opacity: 0;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex; align-items: center; gap: 12px;
        `;
        
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        notification.appendChild(messageSpan);
        
        if (undoCallback) {
            const undoBtn = document.createElement('button');
            undoBtn.textContent = '↺ Undo';
            undoBtn.style.cssText = `
                background: rgba(255,255,255,0.3); border: 1px solid rgba(255,255,255,0.5);
                color: white; padding: 6px 12px; border-radius: 6px; cursor: pointer;
                font-weight: 700; font-size: 12px; transition: all 0.2s;
            `;
            undoBtn.onmouseover = () => undoBtn.style.background = 'rgba(255,255,255,0.4)';
            undoBtn.onmouseout = () => undoBtn.style.background = 'rgba(255,255,255,0.3)';
            undoBtn.onclick = () => {
                undoCallback();
                notification.remove();
            };
            notification.appendChild(undoBtn);
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 400);
        }, undoCallback ? 5000 : 3000); // Show longer if undo is available
    }
    
    // Store previous theme for undo
    let previousTheme = localStorage.getItem('sapthala_current_theme') || 'default';
    
    // Enhanced theme application with undo
    const originalApplyTheme = window.applyTheme;
    window.applyTheme = function(themeName) {
        const oldTheme = localStorage.getItem('sapthala_current_theme') || 'default';
        previousTheme = oldTheme;
        
        originalApplyTheme(themeName);
        
        const themes = {
            default: 'Modern Boutique',
            newYear: 'New Year Celebration',
            sankranti: 'Makar Sankranti',
            holi: 'Holi Festival',
            ugadi: 'Ugadi Festival',
            ramadan: 'Ramadan Kareem',
            diwali: 'Diwali Festival',
            ganesh: 'Ganesh Chaturthi',
            independence: 'Independence Day',
            christmas: 'Christmas Festival'
        };
        
        showNotification(`✨ ${themes[themeName] || themeName} theme applied!`, 'success', () => {
            originalApplyTheme(previousTheme);
            showNotification(`↺ Theme reverted to ${themes[previousTheme] || previousTheme}`);
        });
    };

    // Show notification
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white; padding: 16px 24px; border-radius: 12px;
            box-shadow: 0 8px 25px rgba(16,185,129,0.3);
            font-weight: 600; font-size: 14px;
            transform: translateX(400px); opacity: 0;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 400);
        }, 3000);
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            if (typeof initFestivalThemes === 'function') {
                initFestivalThemes();
            }
        });
    } else {
        if (typeof initFestivalThemes === 'function') {
            initFestivalThemes();
        }
    }
})();
