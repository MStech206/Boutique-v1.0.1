# SAPTHALA Boutique - Complete Database Integration Guide

## 🎯 Overview

This guide provides comprehensive instructions for integrating the unified database services with your **Admin Panel**, **Sub-Admin Panel**, **Staff Application**, and **Super Admin Panel**.

All services work together seamlessly with:
- ✅ Real-time data synchronization
- ✅ Offline support with intelligent caching
- ✅ Role-based access control
- ✅ Automatic token management
- ✅ Performance metrics and analytics

---

## 📦 Service Architecture

### 1. **DatabaseService** (`database-service.js`)
**Purpose:** Core data operations and API communication

**Responsibilities:**
- HTTP requests with automatic retry and timeout
- Response caching for offline support
- Cache invalidation on mutations
- Real-time listener management
- Sync queue for offline operations

**Global Variable:** `db`

**Key Methods:**
```javascript
// Authentication
await db.login(role, credentials)
await db.logout()

// Staff Operations
await db.getStaffList(branch)
await db.createStaff(staffData)
await db.updateStaff(staffId, updates)
await db.deleteStaff(staffId)

// Order Operations
await db.getOrders(filters)
await db.createOrder(orderData)
await db.updateOrder(orderId, updates)
await db.updateOrderStage(orderId, stageId, updateData)

// Task Operations
await db.getStaffTasks(staffId)
await db.acceptTask(staffId, taskId)
await db.updateTaskStatus(staffId, taskId, status)
await db.completeTask(staffId, taskId, completionData)
```

### 2. **AuthService** (`auth-service.js`)
**Purpose:** Authentication, authorization, and role management

**Responsibilities:**
- User login/logout
- Token generation and refresh
- Role-based access control
- Permission checking
- Session management

**Global Variable:** `auth`

**Key Methods:**
```javascript
// Login
await auth.adminLogin(username, password)
await auth.staffLogin(staffId, pin)
await auth.subAdminLogin(email, password)

// Check Permissions
auth.hasRole('admin')                    // Check specific role
auth.hasPermission('manage_staff')       // Check permission
auth.canAccessBranch('SAPTHALA Main')   // Check branch access
auth.isAuthenticated()                   // Is user logged in

// Get User Info
auth.getUser()                           // Get current user
auth.getRole()                           // Get current role
auth.getBranch()                         // Get current branch
auth.getToken()                          // Get JWT token

// Events
auth.subscribe((change) => {            // Listen to auth changes
    if (change.event === 'login') {}
    if (change.event === 'logout') {}
})
```

### 3. **StaffService** (`staff-service.js`)
**Purpose:** All staff-related operations

**Responsibilities:**
- Staff CRUD operations
- Availability management
- Task assignment and tracking
- Performance metrics calculation
- Payment recording

**Global Variable:** `staff`

**Key Methods:**
```javascript
// Staff Management
await staff.createStaff(staffData)
await staff.updateStaff(staffId, updates)
await staff.deleteStaff(staffId)
await staff.getStaff(staffId)

// Retrieval
await staff.getAllStaff(branch)
await staff.getStaffByRole(role, branch)
await staff.getAvailableStaff(role, branch)

// Tasks
await staff.getStaffTasks(staffId, status)
await staff.acceptTask(staffId, taskId)
await staff.updateTaskStatus(staffId, taskId, status, notes)
await staff.completeTask(staffId, taskId, completionData)

// Performance
await staff.getPerformanceMetrics(staffId)
await staff.getTopPerformers(branch, limit)
```

### 4. **OrderService** (`order-service.js`)
**Purpose:** Complete order lifecycle management

**Responsibilities:**
- Order creation and updates
- Stage management (dyeing → cutting → stitching → QC → delivery)
- Staff assignment to stages
- Payment tracking
- Order analytics

**Global Variable:** `orders`

**Key Methods:**
```javascript
// Order Management
await orders.createOrder(orderData)
await orders.updateOrder(orderId, updates)
await orders.updateOrderStatus(orderId, newStatus)
await orders.cancelOrder(orderId, reason)

// Retrieval
await orders.getOrder(orderId)
await orders.getAllOrders(filters)
await orders.getOrdersByBranch(branch)
await orders.getCustomerOrders(customerId)

// Stages
await orders.updateStage(orderId, stageName, stageUpdate)
await orders.assignStaffToStage(orderId, stageName, staffId)
await orders.completeStage(orderId, stageName, completionData)

// Payment
await orders.recordPayment(orderId, amount, method)
await orders.getPaymentStatus(orderId)

// Analytics
await orders.getOrderStats(branch)
await orders.getOverdueOrders(branch)
```

---

## 🚀 Getting Started

### Step 1: Include Service Files

Add these script tags to your HTML (before closing `</body>`):

```html
<!-- Data & Authentication Services -->
<script src="/database-service.js"></script>
<script src="/auth-service.js"></script>
<script src="/staff-service.js"></script>
<script src="/order-service.js"></script>
```

**Order matters!** Services must be loaded in this order.

### Step 2: Wait for Initialization

```javascript
window.addEventListener('load', async () => {
    // Wait for services to initialize (optional but recommended)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('✅ All services ready');
    console.log('Database:', db ? 'Ready' : 'Not loaded');
    console.log('Auth:', auth ? 'Ready' : 'Not loaded');
    console.log('Staff:', staff ? 'Ready' : 'Not loaded');
    console.log('Orders:', orders ? 'Ready' : 'Not loaded');
});
```

### Step 3: Handle Authentication State

```javascript
// Listen to auth state changes
auth.subscribe((change) => {
    switch (change.event) {
        case 'login':
            console.log('User logged in:', change.data.user);
            showMainApp();
            break;
        case 'logout':
            console.log('User logged out');
            showLoginPage();
            break;
        case 'user-update':
            console.log('User updated');
            updateUserProfile(change.data.user);
            break;
    }
});

// Check if already logged in
if (auth.isAuthenticated()) {
    showMainApp();
} else {
    showLoginPage();
}
```

---

## 💼 Integration Examples

### Admin Panel - Create New Order

```javascript
async function createOrderFromForm(formData) {
    try {
        // Validate user can perform this action
        if (!auth.hasPermission('create_order')) {
            throw new Error('You do not have permission to create orders');
        }

        // Prepare order data
        const orderData = {
            customerId: formData.phone,  // Use phone as customer ID
            customerName: formData.name,
            customerPhone: formData.phone,
            customerEmail: formData.email,
            branch: auth.getBranch(),
            items: formData.items,  // Array of garment items
            measurements: formData.measurements,
            designNotes: formData.designNotes,
            totalAmount: formData.totalAmount,
            paymentMethod: formData.paymentMethod,
            deliveryDate: formData.deliveryDate,
            createdBy: auth.getUser().id
        };

        // Create order
        const order = await orders.createOrder(orderData);
        
        console.log('✅ Order created:', order.orderId);
        showNotification('Order created successfully!', 'success');
        
        return order;
    } catch (error) {
        console.error('❌ Create order failed:', error.message);
        showNotification(error.message, 'error');
    }
}
```

### Admin Panel - Manage Staff

```javascript
async function manageStaff() {
    try {
        // Check if admin
        if (!auth.hasRole('admin')) {
            throw new Error('Only admins can manage staff');
        }

        // Get all staff for this branch
        const staff_members = await staff.getAllStaff(auth.getBranch());
        
        // Display in UI
        displayStaffTable(staff_members);
        
        // Subscribe to staff changes
        staff.subscribe('staff-update', (change) => {
            console.log('Staff list updated');
            refreshStaffTable();
        });
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

async function createStaffMember(formData) {
    try {
        const staffData = {
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            role: formData.role,  // dyeing, cutting, stitching, etc.
            branch: auth.getBranch(),
            pin: formData.pin,
            profilePhoto: formData.photo_url,
            stages: [formData.role],
            qualifications: formData.qualifications
        };

        const newStaff = await staff.createStaff(staffData);
        showNotification('Staff member added successfully!', 'success');
        return newStaff;
    } catch (error) {
        console.error('❌ Error:', error.message);
        showNotification(error.message, 'error');
    }
}
```

### Admin Panel - Assign Tasks

```javascript
async function assignOrderToStaff(orderId, stageName) {
    try {
        // Get available staff for this stage
        const availableStaff = await staff.getAvailableStaff(stageName);
        
        if (availableStaff.length === 0) {
            showNotification('No available staff for this stage', 'warning');
            return;
        }

        // Show selection dialog or use first available
        const selectedStaff = availableStaff[0];  // or show dialog
        
        // Assign
        await orders.assignStaffToStage(orderId, stageName, selectedStaff.id);
        
        // Send notification to staff
        console.log(`✅ Assigned ${selectedStaff.name} to ${stageName} stage`);
        
        // Update UI
        refreshOrderDetail(orderId);
    } catch (error) {
        console.error('❌ Assignment failed:', error.message);
    }
}
```

### Staff App - View and Accept Tasks

```javascript
async function loadStaffDashboard(staffId) {
    try {
        // Get staff info
        const staffInfo = await staff.getStaff(staffId);
        console.log('Logged in as:', staffInfo.name);
        
        // Get pending tasks
        const tasks = await staff.getStaffTasks(staffId, 'pending');
        const inProgressTasks = await staff.getStaffTasks(staffId, 'in-progress');
        
        // Display tasks
        displayTasks('pending', tasks);
        displayTasks('in-progress', inProgressTasks);
        
        // Listen to task updates
        staff.subscribe('task-update', (change) => {
            console.log('Task updated:', change.data);
            loadStaffDashboard(staffId);  // Refresh
        });
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

async function acceptTask(staffId, taskId) {
    try {
        // Accept the task
        await staff.acceptTask(staffId, taskId);
        
        console.log('✅ Task accepted');
        showNotification('Task accepted. Start working!', 'success');
        
        // Refresh UI
        loadStaffDashboard(staffId);
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

async function completeTask(staffId, taskId, completionData) {
    try {
        // Validate required data
        if (!completionData.notes) {
            throw new Error('Please add notes about the work');
        }

        // Complete with images if available
        const result = await staff.completeTask(staffId, taskId, {
            notes: completionData.notes,
            images: completionData.images || [],
            qualityRating: completionData.rating || 5
        });

        console.log('✅ Task completed successfully');
        showNotification('Task completed! Great work!', 'success');
        
        // Get updated performance
        const metrics = await staff.getPerformanceMetrics(staffId);
        console.log('Your performance:', metrics);
        
        // Refresh
        loadStaffDashboard(staffId);
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}
```

### Sub-Admin Panel - Orders Overview

```javascript
async function loadSubAdminDashboard() {
    try {
        // Get only branch data
        if (!auth.hasRole('subadmin')) {
            throw new Error('Access denied');
        }

        const branch = auth.getBranch();
        
        // Get orders for this branch
        const branchOrders = await orders.getOrdersByBranch(branch);
        
        // Get staff for this branch
        const branchStaff = await staff.getAllStaff(branch);
        
        // Get stats
        const stats = await orders.getOrderStats(branch);
        
        // Display dashboard
        displayDashboard({
            orders: branchOrders,
            staff: branchStaff,
            stats: stats
        });
        
        // Subscribe to updates
        orders.subscribe('order-update', () => refreshDashboard());
        staff.subscribe('staff-update', () => refreshDashboard());
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

async function recordPaymentSubAdmin(orderId, amount, method) {
    try {
        // Check if admin can modify payment for this order
        const order = await orders.getOrder(orderId);
        
        if (order.branch !== auth.getBranch()) {
            throw new Error('Cannot modify orders from other branches');
        }

        // Record payment
        await orders.recordPayment(orderId, amount, method);
        
        // Get updated status
        const paymentStatus = await orders.getPaymentStatus(orderId);
        
        console.log('✅ Payment recorded');
        console.log('Balance due:', paymentStatus.balanceDue);
        
        // Update UI
        refreshOrderPayment(orderId);
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}
```

### Super Admin - Multi-Branch View

```javascript
async function loadSuperAdminDashboard() {
    try {
        // Super admin can see everything
        if (!auth.isSuperAdmin()) {
            throw new Error('Only super admins can access this');
        }

        // Get all orders (all branches)
        const allOrders = await orders.getAllOrders();
        
        // Get all staff (all branches)
        const allStaff = await staff.getAllStaff();
        
        // Get analytics
        const analytics = await db.getAnalytics();
        
        // Group by branch
        const byBranch = {};
        allOrders.forEach(order => {
            if (!byBranch[order.branch]) {
                byBranch[order.branch] = [];
            }
            byBranch[order.branch].push(order);
        });
        
        // Display by branch
        displayBranchAnalytics(byBranch, analytics);
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}
```

---

## 🔐 Authentication & Authorization

### Login Implementation

```javascript
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        // Detect which login endpoint to use
        const role = selectRole();  // 'admin' or 'staff' or 'subadmin'
        
        let result;
        if (role === 'admin') {
            result = await auth.adminLogin(username, password);
        } else if (role === 'staff') {
            result = await auth.staffLogin(username, password);
        } else if (role === 'subadmin') {
            result = await auth.subAdminLogin(username, password);
        }

        // Auth service automatically:
        // - Stores token in localStorage
        // - Sets up token refresh
        // - Saves user data
        
        console.log('✅ Logged in as:', result.data.user.name);
        showMainApp();
    } catch (error) {
        console.error('❌ Login failed:', error.message);
        showError(error.message);
    }
}

function selectRole() {
    // Could be dropdown, tab, or query parameter
    const tab = document.querySelector('.login-tab.active');
    return tab?.dataset.role || 'admin';
}
```

### Permission Checking

```javascript
// Before any sensitive operation
function checkPermissionBefore(action) {
    const permissionMap = {
        'create_order': 'create_order',
        'manage_staff': 'manage_staff',
        'record_payment': 'record_payment',
        'delete_order': 'delete_order'
    };

    const required = permissionMap[action];
    
    if (!auth.hasPermission(required)) {
        throw new Error(`You don't have permission to ${action}`);
    }
}

// Example usage
try {
    checkPermissionBefore('create_order');
    await orders.createOrder(orderData);
} catch (error) {
    showError(error.message);
}
```

---

## 🔄 Real-Time Data Sync

### Subscribe to Changes

```javascript
// Listen to staff updates
const unsubscribeStaff = staff.subscribe('staff-update', (change) => {
    console.log('Staff changed:', change.data);
    
    // Refresh staff list in UI
    refreshStaffList();
});

// Listen to order updates
const unsubscribeOrders = orders.subscribe('order-update', (change) => {
    console.log('Order changed:', change.data);
    
    // Refresh order in UI
    refreshOrder(change.data.orderId);
});

// Listen to task updates
const unsubscribeTasks = staff.subscribe('task-update', (change) => {
    console.log('Task changed:', change.data);
    
    // Refresh tasks in UI
    refreshTasks();
});

// Unsubscribe when page closes
window.addEventListener('beforeunload', () => {
    unsubscribeStaff();
    unsubscribeOrders();
    unsubscribeTasks();
});
```

### Database-Level Listeners

```javascript
// Listen at database level for any changes
db.listen('orders', (update) => {
    console.log('Order changed:', update.event, update.data);
    // order service automatically does this
});

db.listen('staff', (update) => {
    console.log('Staff changed:', update.event, update.data);
    // staff service automatically does this
});

db.listen('tasks', (update) => {
    console.log('Task changed:', update.event, update.data);
    // all services automatically listen
});
```

---

## 📱 Offline Support

The database service automatically handles offline scenarios:

```javascript
// When offline:
// 1. GET requests return cached data
// 2. Mutations (POST, PUT, DELETE) are queued
// 3. Queue is retried every 5 seconds
// 4. On reconnect, queued operations are synced

// Check if online
if (db.isOnline()) {
    console.log('Online - Real-time sync active');
} else {
    console.log('Offline - Using cache, will sync when online');
}

// Manual cache management
const cache = db.exportCache();
localStorage.setItem('backup_cache', cache);

// Later...
const backup = localStorage.getItem('backup_cache');
db.importCache(backup);
```

---

## ⚠️ Error Handling

### Comprehensive Error Handling

```javascript
async function performWithErrorHandling(operation, operationName) {
    try {
        return await operation();
    } catch (error) {
        console.error(`❌ ${operationName} failed:`, error.message);
        
        // Different handling based on error type
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            // Token expired - redirect to login
            console.log('Session expired, redirecting to login...');
            auth.logout();
            window.location.href = '/login';
            
        } else if (error.message.includes('403') || error.message.includes('Permission')) {
            // Permission denied
            showError('You do not have permission for this action');
            
        } else if (error.message.includes('Network') || error.message.includes('fetch')) {
            // Network error - offline
            showError('Connection lost. Changes will sync when online.', 'warning');
            
            // Auto-retry later
            setTimeout(() => location.reload(), 5000);
            
        } else if (error.message.includes('404')) {
            // Not found
            showError('Resource not found');
            
        } else if (error.message.includes('500')) {
            // Server error
            showError('Server error. Please contact support.');
            
        } else {
            // Generic error
            showError(error.message);
        }
    }
}

// Usage
async function safeCreateOrder(orderData) {
    return await performWithErrorHandling(
        () => orders.createOrder(orderData),
        'Create Order'
    );
}
```

---

## 📊 Performance Metrics

### Getting Staff Performance

```javascript
async function displayStaffPerformance(staffId) {
    try {
        // Get metrics
        const metrics = await staff.getPerformanceMetrics(staffId);
        
        // Display in card
        document.getElementById('tasks-completed').textContent = metrics.tasksCompleted;
        document.getElementById('quality-rating').textContent = (metrics.qualityRating).toFixed(1);
        document.getElementById('avg-time').textContent = metrics.averageTime + ' min';
        document.getElementById('success-rate').textContent = metrics.successRate.toFixed(0) + '%';
    } catch (error) {
        console.error('Error:', error.message);
    }
}

async function getTopPerformers(branch) {
    try {
        const performers = await staff.getTopPerformers(branch, 10);
        
        return performers.map(s => ({
            name: s.name,
            rating: s.performance.qualityRating,
            completed: s.performance.tasksCompleted
        }));
    } catch (error) {
        console.error('Error:', error.message);
        return [];
    }
}
```

### Getting Order Analytics

```javascript
async function displayOrderAnalytics(branch) {
    try {
        // Get stats
        const stats = await orders.getOrderStats(branch);
        
        // Create dashboard
        document.getElementById('total-orders').textContent = stats.total;
        document.getElementById('pending').textContent = stats.pending;
        document.getElementById('in-progress').textContent = stats.inProgress;
        document.getElementById('revenue').textContent = '₹' + stats.totalRevenue;
        document.getElementById('avg-value').textContent = '₹' + stats.averageOrderValue.toFixed(0);
        
        // Get overdue
        const overdue = await orders.getOverdueOrders(branch);
        document.getElementById('overdue-count').textContent = overdue.length;
    } catch (error) {
        console.error('Error:', error.message);
    }
}
```

---

## 🚦 Best Practices

### 1. Always Check Authentication Before Using Services
```javascript
if (!auth.isAuthenticated()) {
    window.location.href = '/login';
    return;
}
```

### 2. Validate Data Before Submitting
```javascript
try {
    staff.validateStaffData(formData);
    const result = await staff.createStaff(formData);
} catch (error) {
    showError(error.message);
}
```

### 3. Use Unsubscribe to Prevent Memory Leaks
```javascript
const unsubscribe = orders.subscribe('order-update', (change) => {
    // Handle change
});

// Clean up
unsubscribe();
```

### 4. Handle Permissions for All Admin Actions
```javascript
if (!auth.hasPermission('manage_staff')) {
    throw new Error('Access denied');
}
```

### 5. Cache User Branch for Quick Access
```javascript
const userBranch = auth.getBranch();
const branchOrders = await orders.getOrdersByBranch(userBranch);
```

### 6. Implement Loading States
```javascript
async function loadData() {
    showLoading(true);
    try {
        const data = await orders.getOrders();
        displayData(data);
    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
}
```

---

## ✅ Testing Checklist

- [ ] Services load without errors
- [ ] Login works for all roles (admin, staff, subadmin, superadmin)
- [ ] Token refresh works automatically
- [ ] Can create, read, update, delete orders
- [ ] Can create, read, update, delete staff
- [ ] Can assign tasks to staff
- [ ] Staff can accept and complete tasks
- [ ] Orders update automatically when staff completes tasks
- [ ] Payment recording works correctly
- [ ] Real-time listeners notify changes
- [ ] Offline mode works with queuing
- [ ] Error messages display clearly
- [ ] Permissions are enforced

---

## 📞 Support & Troubleshooting

### Services Not Loading?
1. Check browser console for errors
2. Verify script SRC paths are correct
3. Ensure scripts are loaded in order
4. Check network tab for failed requests

### Login Failing?
1. Verify backend is running
2. Check token endpoint exists
3. Verify credentials are correct
4. Check localStorage permissions

### Data Not Syncing?
1. Check if online (db.isOnline())
2. Verify token is valid (auth.getToken())
3. Check browser console for errors
4. Try refreshing page

### Offline Data Not syncing?
1. Check browser's Application tab → Storage
2. Verify sync queue has items
3. Check network tab when coming online
4. Manually trigger refresh

---

## 🎓 Next Steps

1. **Update your HTML files** to include the service scripts
2. **Modify login pages** to use auth service
3. **Update order management** to use orders service
4. **Implement staff dashboard** with staff service
5. **Add real-time listeners** for live updates
6. **Test all workflows** with test data
7. **Deploy to production** with monitoring

Good luck! Your SAPTHALA Boutique application is now fully integrated! 🚀
