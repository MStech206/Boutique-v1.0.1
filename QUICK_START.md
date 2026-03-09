# 🚀 SAPTHALA BOUTIQUE - QUICK START GUIDE

## ⚡ Launch System (3 Steps)

### Step 1: Run Launch Script
```batch
LAUNCH_SYSTEM.bat
```

### Step 2: Choose Option
Press **1** for Complete System

### Step 3: Access Panels
System will open automatically in your browser!

---

## 🔑 Login Credentials

### Super Admin Panel
**URL:** http://localhost:3000/super-admin
- **Email:** mstechno2323@gmail.com
- **Auth:** Firebase (Use your Firebase account)
- **Access:** Full system control

### Admin Panel
**URL:** http://localhost:3000
- **Username:** admin
- **Password:** sapthala@2029
- **Access:** All branches, orders, staff

### Sub-Admin Panel
**URL:** http://localhost:3000
- **Username:** (created by admin)
- **Password:** (set by admin)
- **Access:** Specific branch only

### Staff Portal
**URL:** http://localhost:3000/staff
- **Staff ID:** (assigned by admin)
- **PIN:** 1234 (default)
- **Access:** Task management

---

## 🔥 First Time Setup

### If Firebase Not Configured:

1. **Run Setup Wizard:**
```batch
node setup-firebase-integration.js
```

2. **Follow Prompts:**
   - Download Firebase credentials
   - Place in project root
   - Complete setup wizard

3. **Launch System:**
```batch
LAUNCH_SYSTEM.bat
```

---

## 📋 Common Tasks

### Create New Order
1. Login to Admin Panel
2. Click "New Order"
3. Fill customer details
4. Add measurements
5. Select workflow stages
6. Submit order

### Assign Staff
1. Login to Admin Panel
2. Go to "Staff Management"
3. Click "Add Staff"
4. Enter details and assign branch
5. Staff can now login to portal

### Create Sub-Admin
1. Login as Admin
2. Go to "Sub-Admin Management"
3. Click "Create Sub-Admin"
4. Assign branch and permissions
5. Share credentials with sub-admin

### View Reports
1. Login to Admin Panel
2. Click "Reports" tab
3. Select report type
4. Apply filters
5. Export or print

---

## 🛠️ Troubleshooting

### Port 3000 Busy?
```batch
LAUNCH_SYSTEM.bat
```
Choose option **C** to kill port 3000

### MongoDB Not Running?
No problem! System uses Firebase automatically.

### Firebase Connection Error?
1. Check `firebase-credentials.json` exists
2. Run: `node setup-firebase-integration.js`
3. Restart system

### Can't Login?
**Admin:** admin / sapthala@2029
**Super Admin:** Use Firebase email
**Staff:** Check with admin for credentials

---

## 📱 Mobile App

### Launch Flutter App:
```batch
LAUNCH_SYSTEM.bat
```
Choose option **7**

### Requirements:
- Flutter SDK installed
- Android Studio or VS Code
- Connected device or emulator

---

## 🔄 Data Management

### Backup Data:
All data automatically synced to Firebase Firestore

### Migrate Data:
```batch
node migrate-to-firebase-complete.js
```

### Reset Admin Password:
```batch
LAUNCH_SYSTEM.bat
```
Choose option **B**

---

## 📊 System Status

### Check Health:
```batch
LAUNCH_SYSTEM.bat
```
Choose option **8**

### Firebase Status:
Visit: http://localhost:3000/api/firebase/status

### Database Status:
- **Primary:** Firebase Firestore
- **Fallback:** MongoDB (if available)

---

## 🎯 Quick Tips

✅ **Always use LAUNCH_SYSTEM.bat** - It handles everything automatically

✅ **Firebase is Primary** - All data syncs to Firebase first

✅ **MongoDB is Fallback** - Used when Firebase unavailable

✅ **Real-time Sync** - Changes appear instantly across all panels

✅ **Offline Support** - System works even without internet

---

## 📞 Need Help?

**Email:** sapthalaredddydesigns@gmail.com
**Phone:** 7794021608

---

## 🎉 You're Ready!

Your system is fully integrated with Firebase and ready to use.

**Happy Managing! 🚀**
