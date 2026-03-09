// Branches Management Module for SAPTHALA Admin Panel
// This module provides complete branch management functionality

const BranchesManager = {
    branches: [],
    
    // Initialize branches management
    async init() {
        console.log(' Branches Manager initialized');
        await this.loadBranches();
    },
    
    // Load all branches
    async loadBranches() {
        const container = document.getElementById('branchesList');
        if (!container) return;
        
        container.innerHTML = `
            <div style="text-align:center;padding:40px;color:#667eea;">
                <div style="font-size:48px;margin-bottom:16px;"></div>
                <div style="font-size:16px;font-weight:600;">Loading branches...</div>
            </div>
        `;
        
        try {
            const token = localStorage.getItem('sapthala_token') || sessionStorage.getItem('sapthala_token');
            if (!token) {
                this.showError(container, 'Authentication required. Please login again.');
                return;
            }
            
            const response = await fetch('/api/branches', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.branches = data.branches || [];
            
            if (this.branches.length === 0) {
                this.showEmpty(container);
                return;
            }
            
            this.renderBranches(container);
            console.log(` Loaded ${this.branches.length} branches`);
            
        } catch (error) {
            console.error(' Load branches error:', error);
            this.showError(container, `Failed to load branches: ${error.message}`);
        }
    },
    
    // Render branches list
    renderBranches(container) {
        container.innerHTML = `
            <div style="display:grid;gap:20px;">
                ${this.branches.map(branch => `
                    <div class="branch-card" style="background:white;padding:24px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);display:grid;grid-template-columns:80px 1fr auto;gap:20px;align-items:center;">
                        <div class="branch-icon" style="width:70px;height:70px;border-radius:12px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;align-items:center;justify-content:center;color:white;font-size:32px;overflow:hidden;">
                            ${branch.logo ? ('<img src="' + branch.logo + '" alt="' + (branch.branchName || '') + '" style="width:100%;height:100%;object-fit:cover;display:block;">') : ('<span>' + ((branch.branchName || 'B').split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()) + '</span>')}
                        </div>
                        <div class="branch-info">
                            <h3 style="margin:0 0 8px 0;font-size:18px;color:#1e293b;">
                                ${branch.branchName}
                                <span style="font-size:12px;font-weight:700;margin-left:12px;padding:4px 12px;background:#e0e7ff;color:#667eea;border-radius:12px;">${branch.branchId}</span>
                            </h3>
                            <p style="margin:0 0 4px 0;font-size:14px;color:#64748b;">
                                 ${branch.location || 'No location specified'}
                            </p>
                            ${branch.phone ? `<p style="margin:0 0 4px 0;font-size:13px;color:#64748b;"> ${branch.phone}</p>` : ''}
                            ${branch.email ? `<p style="margin:0;font-size:13px;color:#64748b;"> ${branch.email}</p>` : ''}
                            <p style="margin:8px 0 0 0;font-size:11px;color:#9ca3af;">
                                Created: ${new Date(branch.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                        <div class="branch-actions" style="display:flex;flex-direction:column;gap:8px;">
                            <span class="badge" style="padding:6px 12px;border-radius:20px;font-size:12px;font-weight:600;text-align:center;${branch.isActive ? 'background:#d1fae5;color:#065f46;' : 'background:#fee2e2;color:#991b1b;'}">
                                ${branch.isActive ? ' Active' : ' Inactive'}
                            </span>
                            <button onclick="BranchesManager.editBranch('${branch._id || branch.branchId}')" style="padding:8px 16px;background:#fbbf24;color:#78350f;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;">
                                 Edit
                            </button>
                            <button onclick="BranchesManager.deleteBranch('${branch._id || branch.branchId}')" style="padding:8px 16px;background:#ef4444;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;">
                                 Delete
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },
    
    // Show empty state
    showEmpty(container) {
        container.innerHTML = `
            <div style="text-align:center;padding:60px 20px;color:#9ca3af;">
                <div style="font-size:64px;margin-bottom:20px;"></div>
                <div style="font-size:16px;font-weight:600;">No branches found</div>
                <p style="margin-top:8px;font-size:14px;">Click "Add Branch" to create your first branch</p>
            </div>
        `;
    },
    
    // Show error
    showError(container, message) {
        container.innerHTML = `
            <div style="text-align:center;padding:40px;">
                <div style="font-size:48px;margin-bottom:16px;color:#ef4444;"></div>
                <div style="font-size:16px;font-weight:600;color:#dc2626;margin-bottom:12px;">${message}</div>
                <button onclick="BranchesManager.loadBranches()" style="padding:10px 20px;background:#3b82f6;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;">
                     Retry
                </button>
            </div>
        `;
    },
    
    // Open add branch modal
                        openAddModal() {
                            const existing = document.getElementById('branchModal');
                            if (existing) existing.remove();
                            this.createModal();
        
        document.getElementById('branchModalTitle').textContent = 'Add New Branch';
        document.getElementById('branchForm').reset();
        document.getElementById('branchId').value = '';
        document.getElementById('branchModal').style.display = 'flex';
    },
    
    // Create modal if it doesn't exist
    createModal() {
        const modalHTML = `
            <div id="branchModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;align-items:center;justify-content:center;">
                <div style="background:white;padding:30px;border-radius:12px;width:90%;max-width:500px;max-height:90vh;overflow-y:auto;">
                    <h3 id="branchModalTitle" style="margin:0 0 20px 0;color:#1e293b;font-size:20px;">Add New Branch</h3>
                    <form id="branchForm" onsubmit="BranchesManager.saveBranch(event)">
                        <div style="margin-bottom:20px;">
                            <label style="display:block;margin-bottom:8px;color:#475569;font-weight:600;font-size:14px;">Branch Name *</label>
                            <input type="text" id="branchName" required placeholder="e.g., Jubilee Hills" style="width:100%;padding:12px;border:2px solid #e2e8f0;border-radius:8px;font-size:14px;">
                        </div>
                        <div style="margin-bottom:20px;">
                            <label style="display:block;margin-bottom:8px;color:#475569;font-weight:600;font-size:14px;">Location *</label>
                            <input type="text" id="branchLocation" required placeholder="e.g., Hyderabad" style="width:100%;padding:12px;border:2px solid #e2e8f0;border-radius:8px;font-size:14px;">
                        </div>
                        <div style="margin-bottom:20px;">
                            <label style="display:block;margin-bottom:8px;color:#475569;font-weight:600;font-size:14px;">Phone</label>
                            <input type="tel" id="branchPhone" placeholder="e.g., 9876543210" style="width:100%;padding:12px;border:2px solid #e2e8f0;border-radius:8px;font-size:14px;">
                        </div>
                        <div style="margin-bottom:20px;">
                            <label style="display:block;margin-bottom:8px;color:#475569;font-weight:600;font-size:14px;">Email</label>
                            <input type="email" id="branchEmail" placeholder="e.g., branch@sapthala.com" style="width:100%;padding:12px;border:2px solid #e2e8f0;border-radius:8px;font-size:14px;">
                        </div>
                        <input type="hidden" id="branchId">
                        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:25px;">
                            <button type="button" onclick="BranchesManager.closeModal()" style="padding:12px 24px;background:#e2e8f0;color:#475569;border:none;border-radius:8px;cursor:pointer;font-weight:600;">Cancel</button>
                            <button type="submit" style="padding:12px 24px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;">Save</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },
    
    // Close modal
    closeModal() {
        document.getElementById('branchModal').style.display = 'none';
    },
    
    // Save branch
    async saveBranch(event) {
        event.preventDefault();
        
        const branchId = document.getElementById('branchId').value;
        const branchData = {
            branchName: document.getElementById('branchName').value,
            location: document.getElementById('branchLocation').value,
            phone: document.getElementById('branchPhone').value,
            email: document.getElementById('branchEmail').value
        };
        
        try {
            const token = localStorage.getItem('sapthala_token') || sessionStorage.getItem('sapthala_token');
            const url = branchId ? `/api/branches/${branchId}` : '/api/branches';
            const method = branchId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(branchData)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save branch');
            }
            
            const result = await response.json();
            alert(' ' + (result.message || 'Branch saved successfully'));
            this.closeModal();
            this.loadBranches();
            
        } catch (error) {
            console.error(' Save branch error:', error);
            alert(' Failed to save branch: ' + error.message);
        }
    },
    
    // Edit branch
    async editBranch(id) {
                                    const branch = this.branches.find(b => b._id === id || b.branchId === id);
        if (!branch) return;
        
                        const existing = document.getElementById('branchModal');
                        if (existing) existing.remove();
                        this.createModal();
        document.getElementById('branchModalTitle').textContent = 'Edit Branch';
        document.getElementById('branchId').value = branch._id;
        document.getElementById('branchName').value = branch.branchName;
        document.getElementById('branchLocation').value = branch.location || '';
        document.getElementById('branchPhone').value = branch.phone || '';
        document.getElementById('branchEmail').value = branch.email || '';
        document.getElementById('branchModal').style.display = 'flex';
    },
    
    // Delete branch
    async deleteBranch(id) {
        if (!confirm(' Are you sure you want to delete this branch? This action cannot be undone.')) {
            return;
        }
        
        try {
            const token = localStorage.getItem('sapthala_token') || sessionStorage.getItem('sapthala_token');
            const response = await fetch(`/api/branches/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete branch');
            }
            
            const result = await response.json();
            alert(' ' + (result.message || 'Branch deleted successfully'));
            this.loadBranches();
            
        } catch (error) {
            console.error(' Delete branch error:', error);
            alert(' Failed to delete branch: ' + error.message);
        }
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('branchesList')) {
            BranchesManager.init();
        }
    });
} else {
    if (document.getElementById('branchesList')) {
        BranchesManager.init();
    }
}

console.log("Branches management module loaded");
