/**
 * SAPTHALA Boutique - Authentication Service
 * Handles token management, user validation, and role-based permissions
 * Works seamlessly across Admin, Sub-Admin, Staff, and Super-Admin panels
 */

class AuthService {
    constructor() {
        this.user = null;
        this.token = localStorage.getItem('sapthala_token');
        this.userRole = localStorage.getItem('sapthala_role');
        this.branch = localStorage.getItem('sapthala_branch');
        this.listeners = [];
        this.tokenRefreshInterval = null;

        // Initialize on page load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    /**
     * Initialize authentication state
     */
    async initialize() {
        try {
            if (this.token) {
                // Validate existing token
                const isValid = await this.validateToken();
                if (isValid) {
                    await this.refreshUserData();
                    this.startTokenRefresh();
                } else {
                    this.logout();
                }
            }
        } catch (error) {
            console.warn('Auth initialization warning:', error.message);
        }
    }

    /**
     * Admin/Super-Admin Login
     */
    async adminLogin(username, password) {
        try {
            const response = await fetch('http://localhost:3000/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            this.setAuthentication(data, 'admin');
            return { success: true, data };
        } catch (error) {
            console.error('Admin login error:', error);
            throw error;
        }
    }

    /**
     * Sub-Admin Login
     */
    async subAdminLogin(email, password) {
        try {
            const response = await fetch('http://localhost:3000/api/subadmin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            this.setAuthentication(data, 'subadmin');
            return { success: true, data };
        } catch (error) {
            console.error('Sub-Admin login error:', error);
            throw error;
        }
    }

    /**
     * Staff Login
     */
    async staffLogin(staffId, pin) {
        try {
            const response = await fetch('http://localhost:3000/api/staff/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ staffId, pin })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            this.setAuthentication(data, 'staff');
            return { success: true, data };
        } catch (error) {
            console.error('Staff login error:', error);
            throw error;
        }
    }

    /**
     * Set Authentication State
     */
    setAuthentication(data, role) {
        this.token = data.token;
        this.user = data.user;
        this.userRole = role;
        this.branch = data.user?.branch || data.branch;

        // Persist to localStorage
        localStorage.setItem('sapthala_token', this.token);
        localStorage.setItem('sapthala_role', role);
        localStorage.setItem('sapthala_user', JSON.stringify(this.user));
        if (this.branch) {
            localStorage.setItem('sapthala_branch', this.branch);
        }

        // Notify listeners
        this.notifyListeners('login', { user: this.user, role });
        
        // Start token refresh
        this.startTokenRefresh();
    }

    /**
     * Validate Token
     */
    async validateToken() {
        try {
            if (!this.token) return false;

            const response = await fetch('http://localhost:3000/api/auth/validate', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.ok;
        } catch (error) {
            console.warn('Token validation failed:', error.message);
            return false;
        }
    }

    /**
     * Refresh User Data
     */
    async refreshUserData() {
        try {
            const response = await fetch('http://localhost:3000/api/auth/user', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.user = await response.json();
                localStorage.setItem('sapthala_user', JSON.stringify(this.user));
                this.notifyListeners('user-update', { user: this.user });
            }
        } catch (error) {
            console.warn('User refresh failed:', error.message);
        }
    }

    /**
     * Token Auto-Refresh (every 25 minutes)
     */
    startTokenRefresh() {
        if (this.tokenRefreshInterval) clearInterval(this.tokenRefreshInterval);

        this.tokenRefreshInterval = setInterval(async () => {
            try {
                const response = await fetch('http://localhost:3000/api/auth/refresh', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    this.token = data.token;
                    localStorage.setItem('sapthala_token', this.token);
                }
            } catch (error) {
                console.warn('Token refresh failed:', error.message);
            }
        }, 25 * 60 * 1000); // 25 minutes
    }

    /**
     * Logout
     */
    async logout() {
        try {
            await fetch('http://localhost:3000/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.warn('Logout request failed:', error.message);
        }

        // Clear state
        this.token = null;
        this.user = null;
        this.userRole = null;
        this.branch = null;

        localStorage.removeItem('sapthala_token');
        localStorage.removeItem('sapthala_role');
        localStorage.removeItem('sapthala_user');
        localStorage.removeItem('sapthala_branch');

        if (this.tokenRefreshInterval) {
            clearInterval(this.tokenRefreshInterval);
        }

        this.notifyListeners('logout');
    }

    // ==================== PERMISSIONS & ROLES ====================

    /**
     * Check if user has role
     */
    hasRole(role) {
        if (Array.isArray(role)) {
            return role.includes(this.userRole);
        }
        return this.userRole === role;
    }

    /**
     * Check if user has permission
     */
    hasPermission(permission) {
        if (!this.user?.permissions) return false;
        return this.user.permissions.includes(permission);
    }

    /**
     * Check if user can access branch
     */
    canAccessBranch(branch) {
        if (this.userRole === 'superadmin') return true;
        if (this.userRole === 'admin') return this.branch === branch;
        return false;
    }

    /**
     * Get user's accessible branches
     */
    getAccessibleBranches() {
        if (this.userRole === 'superadmin') return null; // All branches
        return [this.branch];
    }

    /**
     * Is Super Admin
     */
    isSuperAdmin() {
        return this.userRole === 'superadmin';
    }

    /**
     * Is Admin
     */
    isAdmin() {
        return this.userRole === 'admin';
    }

    /**
     * Is Sub-Admin
     */
    isSubAdmin() {
        return this.userRole === 'subadmin';
    }

    /**
     * Is Staff
     */
    isStaff() {
        return this.userRole === 'staff';
    }

    /**
     * Is Authenticated
     */
    isAuthenticated() {
        return !!this.token && !!this.user;
    }

    // ==================== EVENT LISTENERS ====================

    /**
     * Subscribe to auth changes
     */
    subscribe(callback) {
        this.listeners.push(callback);
        // Return unsubscribe function
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) this.listeners.splice(index, 1);
        };
    }

    /**
     * Notify all listeners
     */
    notifyListeners(event, data) {
        this.listeners.forEach(callback => {
            try {
                callback({ event, data, timestamp: new Date() });
            } catch (error) {
                console.error('Auth listener error:', error);
            }
        });
    }

    // ==================== UTILITIES ====================

    /**
     * Get current user
     */
    getUser() {
        return this.user;
    }

    /**
     * Get current role
     */
    getRole() {
        return this.userRole;
    }

    /**
     * Get current branch
     */
    getBranch() {
        return this.branch;
    }

    /**
     * Get token
     */
    getToken() {
        return this.token;
    }

    /**
     * Get auth header
     */
    getAuthHeader() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }
}

// Global instance
const auth = new AuthService();
