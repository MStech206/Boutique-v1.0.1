# DATABASE AND CHARTS FIX GUIDE

## Problem
- Database not connected
- Charts not showing on dashboard
- Data not displaying properly

## Solution

### Quick Fix (Recommended)
Run this command:
```bash
FIX_DATABASE_AND_CHARTS.bat
```

This will:
1. ✅ Start MongoDB service
2. ✅ Test database connection
3. ✅ Start the server
4. ✅ Open admin panel with working charts

### Manual Fix

#### Step 1: Start MongoDB
```bash
net start MongoDB
```

#### Step 2: Test Connection
```bash
node test-mongodb.js
```

Expected output:
```
✅ MongoDB connected successfully
✅ Database: sapthala_boutique
```

#### Step 3: Fix Database and Create Sample Data
```bash
node fix-database-and-charts.js
```

This will:
- Connect to MongoDB
- Verify collections
- Create sample orders if database is empty
- Prepare chart data

#### Step 4: Start Server
```bash
node server.js
```

Expected output:
```
🚀 SAPTHALA Boutique Server running on port 3000
📱 Admin Panel: http://localhost:3000
🗄️ MongoDB: Connected to sapthala_boutique database
```

#### Step 5: Open Admin Panel
```
http://localhost:3000
```

## Verification

### Check Database Connection
1. Open admin panel
2. Look for "Firestore: connected" or "MongoDB: connected" in header
3. Dashboard should show:
   - Total Orders count
   - Total Revenue
   - Advance Collected
   - Pending Orders

### Check Charts
1. Scroll down on dashboard
2. You should see two charts:
   - 📈 Revenue Trend (line chart)
   - 🍰 Order Categories (pie chart)

## Troubleshooting

### MongoDB Not Starting
```bash
# Check if MongoDB is installed
mongod --version

# If not installed, install MongoDB Community Edition
# Download from: https://www.mongodb.com/try/download/community
```

### Port 3000 Already in Use
```bash
# Kill existing process
KILL_PORT_3000.bat

# Or manually:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Charts Still Not Showing
1. Clear browser cache (Ctrl + Shift + Delete)
2. Hard refresh (Ctrl + F5)
3. Check browser console (F12) for errors
4. Ensure Chart.js is loaded:
   ```javascript
   console.log(typeof Chart)  // Should show "function"
   ```

### No Data in Database
```bash
# Create test orders
node create-test-orders.js

# Or use the batch file
CREATE_TEST_ORDERS.bat
```

## Expected Results

### Dashboard Stats
- Total Orders: 3+ (with sample data)
- Total Revenue: ₹6,500+
- Advance Collected: ₹3,000+
- Pending Orders: 1+

### Charts
- Revenue Trend: Shows daily revenue for last 7 days
- Order Categories: Shows distribution of orders by garment type

## Additional Commands

### Check Database Status
```bash
node -e "require('./database').connectDB().then(() => console.log('✅ Connected')).catch(e => console.error('❌', e.message))"
```

### View All Orders
```bash
node -e "require('./database').connectDB().then(async () => { const {Order} = require('./database'); const orders = await Order.find(); console.log(orders); process.exit(0); })"
```

### Reset Database (CAUTION)
```bash
node reset-db.js
```

## Support

If issues persist:
1. Check server logs for errors
2. Verify MongoDB is running: `net start MongoDB`
3. Ensure port 3000 is available
4. Check firewall settings

## Success Indicators

✅ MongoDB service running
✅ Server started on port 3000
✅ Admin panel loads
✅ Dashboard shows statistics
✅ Charts display properly
✅ Orders tab shows data
✅ No console errors (F12)

---

**Last Updated**: December 2024
**Version**: 2.1
