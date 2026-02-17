// Enhanced Admin Panel Functions with Better Error Handling
// This file provides improved loading states and error handling for the admin panel

// Global loading state manager
const LoadingManager = {
    show: function(elementId, message = 'Loading...') {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div style="text-align:center;padding:40px;color:#667eea;">
                    <div style="font-size:48px;margin-bottom:16px;">⏳</div>
                    <div style="font-size:16px;font-weight:600;">${message}</div>
                </div>
            `;
        }
    },
    
    showError: function(elementId, message = 'Failed to load data') {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div style="text-align:center;padding:40px;">
                    <div style="font-size:48px;margin-bottom:16px;color:#ef4444;">⚠️</div>
                    <div style="font-size:16px;font-weight:600;color:#dc2626;margin-bottom:12px;">${message}</div>
                    <button onclick="location.reload()" style="padding:10px 20px;background:#3b82f6;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;">
                        🔄 Retry
                    </button>
                </div>
            `;
        }
    },
    
    showEmpty: function(elementId, message = 'No data available', icon = '📭') {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div style="text-align:center;padding:40px;color:#9ca3af;">
                    <div style="font-size:48px;margin-bottom:16px;">${icon}</div>
                    <div style="font-size:16px;font-weight:600;">${message}</div>
                </div>
            `;
        }
    }
};

// Enhanced Sub-Admins Loading Function
async function loadSubAdmins() {
    const container = document.getElementById('subAdminsList');
    if (!container) return;
    
    LoadingManager.show('subAdminsList', 'Loading sub-admins...');
    
    try {
        const token = localStorage.getItem('sapthala_token') || sessionStorage.getItem('sapthala_token');
        if (!token) {
            LoadingManager.showError('subAdminsList', 'Authentication required. Please login again.');
            return;
        }
        
        const response = await fetch('/api/admin/sub-admins', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 403) {
                LoadingManager.showError('subAdminsList', 'Access denied. Only main admin can view sub-admins.');
                return;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const subAdmins = data.subAdmins || data || [];
        
        if (!Array.isArray(subAdmins) || subAdmins.length === 0) {
            LoadingManager.showEmpty('subAdminsList', 'No sub-admins found. Click "Add Sub-Admin" to create one.', '👨💼');
            return;
        }
        
        // Render sub-admins list
        container.innerHTML = subAdmins.map(subAdmin => `
            <div class="staff-item" style="padding:20px;border-bottom:1px solid #e2e8f0;display:grid;grid-template-columns:60px 1fr auto;gap:20px;align-items:center;">
                <div class="staff-avatar" style="width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:20px;">
                    ${subAdmin.username.charAt(0).toUpperCase()}
                </div>
                <div class="staff-info">
                    <h3 style="margin:0 0 4px 0;font-size:16px;color:#1e293b;">
                        ${subAdmin.username}
                        <span class="role-small" style="font-size:12px;font-weight:700;margin-left:8px;color:#667eea;">SUB-ADMIN</span>
                    </h3>
                    <p style="margin:0;font-size:12px;color:#6b7280;">
                        📍 Branch: ${subAdmin.branchName || subAdmin.branch}
                    </p>
                    <p style="margin:4px 0 0 0;font-size:11px;color:#9ca3af;">
                        Created: ${new Date(subAdmin.createdAt).toLocaleDateString()}
                    </p>
                </div>
                <div class="staff-actions" style="display:flex;gap:8px;">
                    <button class="btn-delete" onclick="deleteSubAdmin('${subAdmin._id}')" style="padding:8px 16px;background:#ef4444;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `).join('');
        
        console.log(`✅ Loaded ${subAdmins.length} sub-admins`);
        
    } catch (error) {
        console.error('❌ Load sub-admins error:', error);
        LoadingManager.showError('subAdminsList', `Failed to load sub-admins: ${error.message}`);
    }
}

// Enhanced Delete Sub-Admin Function
async function deleteSubAdmin(id) {
    if (!confirm('⚠️ Are you sure you want to delete this sub-admin? This will also delete the associated branch.')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('sapthala_token') || sessionStorage.getItem('sapthala_token');
        const response = await fetch(`/api/admin/sub-admins/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        alert('✅ ' + (result.message || 'Sub-admin deleted successfully'));
        loadSubAdmins();
        
    } catch (error) {
        console.error('❌ Delete sub-admin error:', error);
        alert('❌ Failed to delete sub-admin: ' + error.message);
    }
}

console.log('✅ Enhanced admin panel functions loaded');
