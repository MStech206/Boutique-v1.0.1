# SAPTHALA BOUTIQUE MANAGEMENT SYSTEM
## Firebase-Integrated Multi-Panel Architecture

### 🎯 System Overview

Complete boutique management system with Firebase-first architecture integrating:
- **Super Admin Panel** (React + Firebase Auth)
- **Admin Panel** (HTML + Firebase Sync)
- **Sub-Admin Panel** (HTML + Firebase Sync)
- **Staff Portal** (HTML + Firebase Real-time)
- **Flutter Mobile App** (Firebase Backend)

### 🔥 Firebase Integration

All panels are now integrated with Firebase Firestore for:
- ✅ Real-time data synchronization
- ✅ Centralized authentication
- ✅ Cross-platform data consistency
- ✅ Offline support with MongoDB fallback
- ✅ Automatic data backup

### 🚀 Quick Start

#### 1. Launch the System

```batch
LAUNCH_SYSTEM.bat
```

Choose option **[1] Start Complete System** to launch all panels.

#### 2. Access Panels

**Super Admin Panel** (Firebase Authentication)
- URL: http://localhost:3000/super-admin
- Email: mstechno2323@gmail.com
- Features: Manage all admins, branches, clients, vendors

**Admin Panel** (Username/Password)
- URL: http://localhost:3000
- Username: admin
- Password: sapthala@2029
- Features: Manage orders, staff, customers, reports

**Sub-Admin Panel** (Username/Password)
- URL: http://localhost:3000
- Login with credentials created by main admin
- Features: Branch-specific order management

**Staff Portal** (Staff ID/PIN)
- URL: http://localhost:3000/staff
- Staff ID: (assigned by admin)
- PIN: 1234 (default)
- Features: Task management, workflow tracking

### 📦 Installation & Setup

#### Prerequisites

- Node.js (v14 or higher)
- MongoDB (optional - for fallback)
- Firebase Project with Firestore enabled

#### Step 1: Firebase Setup

1. Run the Firebase setup wizard:
```batch
node setup-firebase-integration.js
```

2. Follow the prompts to:
   - Configure Firebase credentials
   - Set up Firestore database
   - Migrate existing data (if any)

#### Step 2: Install Dependencies

```batch
npm install
```

#### Step 3: Build Super Admin Panel

```batch
cd Boutique-app/super-admin-panel
npm install
npm run build
cd ../..
```

#### Step 4: Start the System

```batch
LAUNCH_SYSTEM.bat
```

### 🗄️ Database Architecture

#### Primary Database: Firebase Firestore

Collections:
- `orders` - All customer orders with workflow tracking
- `staff` - Staff members with availability and skills
- `customers` - Customer information and order history
- `branches` - Branch locations and details
- `users` - Admin and sub-admin accounts
- `settings` - System configuration and workflow stages
- `notifications` - Real-time notifications
- `loginAttempts` - Security audit logs

#### Fallback Database: MongoDB

Automatically used when Firebase is unavailable. Data syncs to Firebase when connection is restored.

### 🔐 Authentication

#### Super Admin (Firebase Auth)
- Email-based authentication
- Full system access
- Manage all admins and branches

#### Admin (JWT)
- Username/password authentication
- Full branch access
- Manage staff and orders

#### Sub-Admin (JWT)
- Username/password authentication
- Branch-specific access
- Limited permissions

#### Staff (PIN)
- Staff ID + PIN authentication
- Task-specific access
- Mobile app support

### 📊 Features by Panel

#### Super Admin Panel
- ✅ Client (Branch) Management
- ✅ Admin & Sub-Admin Management
- ✅ Vendor Management
- ✅ System Analytics
- ✅ User Activity Monitoring
- ✅ Firebase Integration Status

#### Admin Panel
- ✅ Order Management
- ✅ Customer Management
- ✅ Staff Management
- ✅ Branch Management
- ✅ Reports & Analytics
- ✅ Sub-Admin Creation
- ✅ Festival Theme Configuration
- ✅ WhatsApp Integration

#### Sub-Admin Panel
- ✅ Branch-specific Orders
- ✅ Customer Management
- ✅ Basic Reports
- ✅ Order Status Updates
- ✅ Limited Staff View

#### Staff Portal
- ✅ Task Assignment
- ✅ Workflow Tracking
- ✅ Quality Check
- ✅ Time Tracking
- ✅ Real-time Notifications
- ✅ Mobile Responsive

### 🔄 Data Synchronization

#### Automatic Sync
- Orders sync to Firebase on creation
- Staff updates sync in real-time
- Customer data syncs on modification
- Branch changes propagate immediately

#### Manual Sync
Run migration script:
```batch
node migrate-to-firebase-complete.js
```

#### Sync Status
Check Firebase integration status:
```
GET /api/firebase/status
```

### 🛠️ Configuration

#### Environment Variables (.env)

```env
# Firebase Configuration
GOOGLE_APPLICATION_CREDENTIALS=./firebase-credentials.json
FIREBASE_PROJECT_ID=your-project-id
USE_FIREBASE=true

# MongoDB Fallback
MONGODB_URI=mongodb://localhost:27017/sapthala_boutique
USE_MONGODB_FALLBACK=true

# Server Configuration
PORT=3000
HOST=127.0.0.1
NODE_ENV=development
JWT_SECRET=sapthala_boutique_secret_2024

# Auto-sync
AUTO_SYNC_TO_FIREBASE=true
SYNC_INTERVAL=300000
```

### 📱 Mobile App (Flutter)

#### Launch Mobile App

```batch
LAUNCH_SYSTEM.bat
```

Choose option **[7] Flutter Mobile App**

#### Features
- Staff authentication
- Task management
- Order tracking
- Real-time updates
- Offline support

### 🧪 Testing

#### System Health Check

```batch
LAUNCH_SYSTEM.bat
```

Choose option **[8] Test System Health**

#### Manual Testing

Test endpoints:
```bash
# Admin Panel
curl http://localhost:3000

# Super Admin
curl http://localhost:3000/super-admin

# Staff Portal
curl http://localhost:3000/staff

# Firebase Status
curl http://localhost:3000/api/firebase/status
```

### 🔧 Troubleshooting

#### Firebase Connection Issues

1. Verify credentials file exists:
```batch
dir firebase-credentials.json
```

2. Check Firebase status:
```
GET /api/firebase/status
```

3. Re-run setup:
```batch
node setup-firebase-integration.js
```

#### Port 3000 Already in Use

```batch
LAUNCH_SYSTEM.bat
```

Choose option **[C] Kill Port 3000**

#### MongoDB Connection Failed

System will automatically use Firebase-only mode. No action required.

### 📝 Default Credentials

#### Super Admin
- Email: mstechno2323@gmail.com
- Auth: Firebase Authentication

#### Admin
- Username: admin
- Password: sapthala@2029

#### Staff
- Staff ID: (varies by branch and role)
- PIN: 1234 (default)

### 🔄 Workflow Stages

Default workflow:
1. **Dyeing** 🎨 - Color application
2. **Finishing** 🏁 - Final touches
3. **Quality Check** 🔍 - Inspection
4. **Ready to Deliver** 📦 - Packaging

### 📊 Reports Available

- Last N Orders Report
- Branch-wise Summary
- Staff Performance
- Revenue Analytics
- Customer Analytics
- Order Status Tracking

### 🎨 Festival Themes

Automatic invoice themes for:
- Independence Day
- Diwali
- Holi
- Christmas
- New Year
- Ramadan
- Ganesh Chaturthi
- Sankranti
- Ugadi

### 🔐 Security Features

- JWT token authentication
- Firebase ID token verification
- Role-based access control (RBAC)
- Login attempt tracking
- Session management
- Password encryption (bcrypt)

### 📞 Support

For issues or questions:
- Email: sapthalaredddydesigns@gmail.com
- Phone: 7794021608

### 📄 License

Proprietary - SAPTHALA Boutique Management System

### 🎉 Version

**v2.0.0** - Firebase-Integrated Multi-Panel System

---

**Built with ❤️ for SAPTHALA Boutique**
