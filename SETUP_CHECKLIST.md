# SAPTHALA Database Integration - Setup Checklist

## ✅ Pre-Deployment Configuration

### Backend Requirements
- [ ] REST API backend running (Spring Boot or Express)
- [ ] Authentication endpoints:
  - [ ] POST `/api/admin/login` - Returns {token, user}
  - [ ] POST `/api/staff/login` - Returns {token, user}
  - [ ] POST `/api/subadmin/login` - Returns {token, user}
  - [ ] GET `/api/auth/validate` - Validates token
  - [ ] POST `/api/auth/refresh` - Refreshes token
  - [ ] POST `/api/auth/logout` - Clears session

- [ ] Staff endpoints:
  - [ ] GET `/api/staff` - List all staff
  - [ ] GET `/api/staff/:id` - Get staff details
  - [ ] POST `/api/staff` - Create staff
  - [ ] PUT `/api/staff/:id` - Update staff
  - [ ] DELETE `/api/staff/:id` - Delete staff
  - [ ] GET `/api/staff/by-role?role=X` - Get by role
  - [ ] GET `/api/staff/:id/tasks` - Get staff tasks
  - [ ] GET `/api/staff/:id/metrics` - Get performance

- [ ] Order endpoints:
  - [ ] GET `/api/admin/orders` - List all orders
  - [ ] GET `/api/admin/orders/:id` - Get order detail
  - [ ] POST `/api/orders` - Create order
  - [ ] PUT `/api/orders/:id` - Update order
  - [ ] PUT `/api/orders/:id/stages/:stage` - Update stage
  - [ ] GET `/api/dashboard` - Dashboard stats

- [ ] CORS headers configured for frontend domain

### Frontend Setup
- [ ] All service files created:
  - [ ] `database-service.js`
  - [ ] `auth-service.js`
  - [ ] `staff-service.js`
  - [ ] `order-service.js`

- [ ] HTML files updated with service scripts:
  - [ ] Admin panel
  - [ ] Sub-admin panel
  - [ ] Staff application
  - [ ] Super-admin panel

- [ ] Login pages implement auth service:
  - [ ] Username/password validation
  - [ ] Error message display
  - [ ] Loading state
  - [ ] Redirect on success

- [ ] Main app checks authentication:
  - [ ] Verify token validity on load
  - [ ] Redirect to login if not authenticated
  - [ ] Display error if session expired

- [ ] Dashboard displays correct data:
  - [ ] Orders list (with filters)
  - [ ] Staff list (with availability)
  - [ ] Statistics and metrics
  - [ ] Real-time updates working

### Data Validation
- [ ] Staff creation validates:
  - [ ] Name is required and not empty
  - [ ] Phone is required and valid format
  - [ ] Role is from allowed list
  - [ ] Branch exists
  - [ ] PIN is at least 4 digits

- [ ] Order creation validates:
  - [ ] Customer ID/phone is provided
  - [ ] Customer name is provided
  - [ ] At least one item selected
  - [ ] Total amount > 0
  - [ ] Delivery date > today

- [ ] Payment recording validates:
  - [ ] Order exists
  - [ ] Amount > 0
  - [ ] Balance due is calculated correctly

### Authentication & Authorization
- [ ] Role-based access control:
  - [ ] Super-admin can access all branches
  - [ ] Admin can only access own branch
  - [ ] Sub-admin has limited permissions
  - [ ] Staff can only see own tasks

- [ ] Permission checks:
  - [ ] `create_order` - for admin
  - [ ] `manage_staff` - for admin/super-admin
  - [ ] `record_payment` - for admin
  - [ ] `delete_order` - for admin/super-admin
  - [ ] `accept_task` - for staff
  - [ ] `complete_task` - for staff

- [ ] Token management:
  - [ ] Token stored in localStorage
  - [ ] Token refreshed every 25 minutes
  - [ ] Token removed on logout
  - [ ] Token sent in Authorization header

### Real-Time Features
- [ ] Data listeners implemented:
  - [ ] Staff changes trigger refresh
  - [ ] Order changes trigger refresh
  - [ ] Task updates notify assigned staff
  - [ ] Payment changes update UI

- [ ] Offline mode works:
  - [ ] GET requests cached automatically
  - [ ] Mutations queued when offline
  - [ ] Queue synced when online
  - [ ] User notified of offline status

### UI/UX
- [ ] Error messages displayed clearly
- [ ] Loading indicators shown during operations
- [ ] Success messages confirm actions
- [ ] Disable buttons during async operations
- [ ] Confirm before destructive actions
- [ ] Proper form validation messages

### Testing
- [ ] Integration tests pass
- [ ] All API endpoints respond correctly
- [ ] Authentication flow works end-to-end
- [ ] Order creation to completion works
- [ ] Staff task workflow works
- [ ] Payment recording works
- [ ] Offline scenario tested
- [ ] Error scenarios handled

### Security
- [ ] HTTPS enabled in production
- [ ] JWT tokens use strong secret
- [ ] Passwords not logged anywhere
- [ ] API keys not exposed in frontend
- [ ] CORS properly configured
- [ ] SQL injection prevention
- [ ] XSS protection enabled
- [ ] CSRF tokens implemented

### Performance
- [ ] Database queries optimized
- [ ] Indexes created for common queries
- [ ] Caching implemented for GET requests
- [ ] Images optimized and lazy-loaded
- [ ] Bundle size reasonable
- [ ] Load time < 3 seconds
- [ ] API response time < 500ms

### Documentation
- [ ] README updated with new setup
- [ ] API documentation complete
- [ ] Database schema documented
- [ ] Architecture diagram updated
- [ ] User guide for each panel created

### Monitoring & Logging
- [ ] Error logging to backend
- [ ] User action logging
- [ ] Performance monitoring setup
- [ ] Alert system for errors
- [ ] Analytics tracking

---

## 🔧 Configuration Values

### Environment Variables (Backend)
```env
# Backend Configuration
DB_TYPE=firestore              # or mongodb
FIREBASE_PROJECT_ID=...
GOOGLE_APPLICATION_CREDENTIALS=/path/to/creds.json

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRY=1h
TOKEN_REFRESH_EXPIRY=7d

# API Configuration
API_PORT=8080
API_CORS_ORIGIN=http://localhost:3000,https://yourdomain.com

# Service Configuration
MAIL_SERVICE_ENABLED=true
MAIL_FROM=noreply@sapthala.com

# Payment Gateway (if needed)
PAYMENT_GATEWAY=payu
PAYU_MERCHANT_KEY=...
PAYU_MERCHANT_SALT=...

# Notification Services
TWILLIO_ACCOUNT_SID=...
TWILLIO_AUTH_TOKEN=...
```

### Frontend Configuration
```javascript
// At top of your main HTML or app.js
const CONFIG = {
    API_BASE_URL: 'http://localhost:8080/api',  // or production URL
    API_TIMEOUT: 10000,  // milliseconds
    TOKEN_REFRESH_INTERVAL: 25 * 60 * 1000,  // 25 minutes
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,  // milliseconds
    CACHE_ENABLED: true,
    OFFLINE_MODE_ENABLED: true,
    DEBUG_MODE: false  // Set to true for console logs
};
```

---

## 🚀 Deployment Steps

### Step 1: Prepare Production Environment
```bash
# Build backend
cd Boutique-backend
mvn clean package -DskipTests

# Build frontend  
npm run build

# Verify all service files exist
ls database-service.js auth-service.js staff-service.js order-service.js
```

### Step 2: Update Configuration
```bash
# Update environment variables
export JWT_SECRET="your-strong-random-secret"
export DB_TYPE="firestore"
export API_CORS_ORIGIN="https://yourdomain.com"
```

### Step 3: Deploy Services
```bash
# Deploy backend (AWS/GCP/Docker)
docker-compose up -d

# Deploy frontend to CDN/server
npm run deploy

# Verify health endpoint
curl https://yourdomain.com/api/health
```

### Step 4: Database Migration
```bash
# Run migrations
npm run migrate

# Seed initial data (optional)
npm run seed:data

# Verify data
npm run verify:data
```

### Step 5: Monitor & Verify
```bash
# Check backend logs
docker logs sapthala-backend

# Test authentication
curl -X POST https://yourdomain.com/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# Verify frontend loads
curl https://yourdomain.com/admin-panel.html
```

---

## 📋 Post-Deployment Checklist

### Day 1 - Core Functionality
- [ ] Admin login works in production
- [ ] Can create orders
- [ ] Can create staff
- [ ] Can assign tasks
- [ ] Staff can accept tasks
- [ ] Real-time updates working
- [ ] Payments processing correctly
- [ ] Error handling working

### Day 2-3 - Extended Features
- [ ] Performance metrics displaying
- [ ] Analytics dashboard working
- [ ] Reports generating correctly
- [ ] Offline mode functioning
- [ ] All permissions enforced
- [ ] No console errors
- [ ] Load time acceptable
- [ ] Mobile responsiveness verified

### Day 4-7 - Optimization
- [ ] Database optimized
- [ ] Cache hit rates good
- [ ] API response times acceptable
- [ ] User feedback positive
- [ ] No critical bugs found
- [ ] Backup and recovery tested
- [ ] Security audit completed

---

## 🆘 Troubleshooting

### Service Not Loading
```javascript
// Check in browser console
console.log('DB Service:', typeof db !== 'undefined' ? 'Loaded ✅' : 'Missing ❌');
console.log('Auth Service:', typeof auth !== 'undefined' ? 'Loaded ✅' : 'Missing ❌');
console.log('Staff Service:', typeof staff !== 'undefined' ? 'Loaded ✅' : 'Missing ❌');
console.log('Order Service:', typeof orders !== 'undefined' ? 'Loaded ✅' : 'Missing ❌');
```

### Login Fails
1. Check `/api/admin/login` endpoint exists
2. Verify credentials are correct
3. Check backend is running
4. Verify CORS is configured
5. Check network tab in DevTools

### Data Not Displaying
1. Check API endpoints return data
2. Verify token is valid
3. Check permissions
4. Clear browser cache
5. Check console for errors

### Real-Time Updates Not Working
1. Check database listeners registered
2. Verify WebSocket connection (if used)
3. Check for JavaScript errors
4. Verify server sends notifications
5. Check network tab

---

## 📞 Support Contacts

- **Backend Issues:** Check Spring Boot logs
- **Database Issues:** Check Firestore/MongoDB logs
- **Frontend Issues:** Check browser console
- **Authentication Issues:** Check JWT implementation
- **Performance Issues:** Use DevTools Network tab

---

Generated: 2026-02-16
Last Updated: 2026-02-16
