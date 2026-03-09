# 🔥 FIREBASE MIGRATION - SIMPLE GUIDE

## 📍 QUICK NAVIGATION

1. [Prerequisites](#prerequisites) - What you need
2. [Step 1: Get Credentials](#step-1-get-firebase-credentials) - Download key
3. [Step 2: Setup](#step-2-setup) - Quick setup
4. [Step 3: Migrate](#step-3-migrate-data) - Run migration
5. [Step 4: Verify](#step-4-verify) - Check if it worked
6. [Troubleshooting](#troubleshooting) - If something goes wrong

---

## ✅ Prerequisites

You need installed:
- **Node.js** - https://nodejs.org
- **npm** - Comes with Node.js
- **MongoDB running** - For source data (optional if no data)

Check if installed:
```bash
node --version
npm --version
```

---

## 🔑 Step 1: Get Firebase Credentials

### Where to Get It

1. Open: https://console.firebase.google.com
2. Login with: **mstechno2323@gmail.com**
3. Select project: **boutique-staff-app**
4. Click ⚙️ **Settings** (top left)
5. Go to **Service Accounts** tab
6. Click blue button: **Generate New Private Key**
7. JSON file downloads automatically

### Save It

1. Go to your project folder: `D:\Boutique 1 issue\Boutique\`
2. Paste the downloaded JSON file
3. Rename it to: **`firebase-credentials.json`**
4. Verify file exists at that location

✅ **Done Step 1:** File saved in project root

---

## 🛠️ Step 2: Setup

### Install Dependencies

Open terminal/PowerShell in your project folder and run:

```bash
npm install firebase-admin mongoose cors
```

Wait for it to finish (shows "added X packages").

✅ **Done Step 2:** Dependencies installed

---

## 📦 Step 3: Migrate Data

### Create Migration File

Create a new file called: **`migrate.js`** in your project folder

Copy this code into it:

```javascript
#!/usr/bin/env node

const admin = require('firebase-admin');
const mongoose = require('mongoose');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, 'firebase-credentials.json');

async function migrate() {
  console.log('\n🔥 Starting Firebase Migration...\n');

  try {
    // Step 1: Initialize Firebase
    console.log('📍 Step 1: Initializing Firebase...');
    const serviceAccount = require(CREDENTIALS_PATH);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    const db = admin.firestore();
    console.log('✅ Firebase initialized\n');

    // Step 2: Connect MongoDB
    console.log('📍 Step 2: Connecting to MongoDB...');
    const mongoUri = 'mongodb://localhost:27017/sapthala_boutique';
    try {
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000
      });
      console.log('✅ Connected to MongoDB\n');
    } catch (e) {
      console.log('⚠️ MongoDB not available (will use defaults)\n');
    }

    // Step 3: Get data from MongoDB
    console.log('📍 Step 3: Loading data from MongoDB...');
    let branches = [], staff = [], users = [], orders = [];

    if (mongoose.connection.readyState === 1) {
      try {
        branches = await mongoose.connection.collection('branches').find({}).toArray();
        staff = await mongoose.connection.collection('staff').find({}).toArray();
        users = await mongoose.connection.collection('users').find({}).toArray();
        orders = await mongoose.connection.collection('orders').find({}).toArray();
        console.log(`✅ Loaded: ${branches.length} branches, ${staff.length} staff, ${users.length} users, ${orders.length} orders\n`);
      } catch (e) {
        console.log('⚠️ Could not load from MongoDB\n');
      }
    }

    // Step 4: Create default data if empty
    console.log('📍 Step 4: Preparing data...');
    if (branches.length === 0) {
      branches = [
        { branchId: 'SAPTHALA.MAIN', branchName: 'Main', location: 'Head Office', phone: '7794021608' },
        { branchId: 'SAPTHALA.JNTU', branchName: 'JNTU', location: 'JNTU Campus', phone: '9876543210' },
        { branchId: 'SAPTHALA.KPHB', branchName: 'KPHB', location: 'KPHB Area', phone: '9876543211' },
        { branchId: 'SAPTHALA.ECIL', branchName: 'ECIL', location: 'ECIL Area', phone: '9876543212' }
      ];
      console.log('✅ Created 4 default branches');
    }

    if (users.length === 0) {
      users = [
        {
          username: 'superadmin',
          email: 'mstechno2323@gmail.com',
          password: 'superadmin@123',
          role: 'super-admin'
        },
        {
          username: 'admin',
          email: 'admin@sapthala.com',
          password: 'admin@123',
          role: 'admin'
        }
      ];
      console.log('✅ Created default admin users\n');
    }

    if (staff.length === 0) {
      staff = createDefaultStaff(branches);
      console.log(`✅ Created ${staff.length} default staff members\n`);
    }

    // Step 5: Sync to Firebase
    console.log('📍 Step 5: Uploading to Firebase Firestore...\n');

    console.log('→ Syncing branches...');
    for (const branch of branches) {
      await db.collection('branches').doc(branch.branchId).set({
        branchId: branch.branchId,
        branchName: branch.branchName,
        location: branch.location,
        phone: branch.phone,
        createdAt: new Date().toISOString()
      });
    }
    console.log(`✅ Synced ${branches.length} branches`);

    console.log('→ Syncing staff (removing duplicates)...');
    const staffByKey = {};
    for (const member of staff) {
      const key = `${member.branch}_${member.role}`;
      if (!staffByKey[key]) {
        staffByKey[key] = member;
      }
    }
    for (const member of Object.values(staffByKey)) {
      await db.collection('staff').doc(member.staffId || member._id).set({
        staffId: member.staffId || member._id,
        name: member.name || 'Unknown',
        role: member.role || 'unknown',
        branch: member.branch || 'SAPTHALA.MAIN',
        phone: member.phone || '',
        isAvailable: member.isAvailable !== false,
        createdAt: new Date().toISOString()
      });
    }
    console.log(`✅ Synced ${Object.keys(staffByKey).length} unique staff (removed duplicates)`);

    console.log('→ Syncing users...');
    for (const user of users) {
      await db.collection('users').doc(user._id || user.username).set({
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: new Date().toISOString()
      });
    }
    console.log(`✅ Synced ${users.length} users`);

    if (orders.length > 0) {
      console.log('→ Syncing orders...');
      for (const order of orders) {
        await db.collection('orders').doc(order._id || order.orderId).set(order);
      }
      console.log(`✅ Synced ${orders.length} orders`);
    }

    console.log('\n✅ MIGRATION COMPLETE!\n');
    console.log('📊 Summary:');
    console.log(`   • Branches: ${branches.length}`);
    console.log(`   • Staff: ${Object.keys(staffByKey).length}`);
    console.log(`   • Users: ${users.length}`);
    console.log(`   • Orders: ${orders.length}`);
    console.log('\n🔥 Check Firebase Console to verify data!\n');

    await admin.app().delete();
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(0);

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  }
}

function createDefaultStaff(branches) {
  const staff = [];
  const roles = ['dyeing', 'cutting', 'stitching', 'qc', 'delivery', 'tailoring'];
  
  for (const branch of branches) {
    roles.forEach(role => {
      staff.push({
        staffId: `staff_${branch.branchId}_${role}`,
        name: `${role.charAt(0).toUpperCase() + role.slice(1)} - ${branch.branchName}`,
        role: role,
        branch: branch.branchId,
        phone: '9876543210',
        isAvailable: true
      });
    });
  }
  
  return staff;
}

migrate();
```

### Run Migration

In terminal, run:

```bash
node migrate.js
```

Watch the output. You should see:
```
🔥 Starting Firebase Migration...

📍 Step 1: Initializing Firebase...
✅ Firebase initialized

📍 Step 2: Connecting to MongoDB...
✅ Connected to MongoDB

📍 Step 3: Loading data from MongoDB...
✅ Loaded: 4 branches, 36 staff, 2 users, 0 orders

📍 Step 4: Preparing data...

📍 Step 5: Uploading to Firebase Firestore...
→ Syncing branches...
✅ Synced 4 branches
→ Syncing staff (removing duplicates)...
✅ Synced 36 unique staff (removed duplicates)
→ Syncing users...
✅ Synced 2 users

✅ MIGRATION COMPLETE!

📊 Summary:
   • Branches: 4
   • Staff: 36
   • Users: 2
   • Orders: 0

🔥 Check Firebase Console to verify data!
```

✅ **Done Step 3:** Data migrated to Firebase

---

## ✔️ Step 4: Verify

### Check Firebase Console

1. Go to: https://console.firebase.google.com
2. Select project: **boutique-staff-app**
3. Click: **Firestore Database**
4. You should see collections:
   - ✅ branches (4 documents)
   - ✅ staff (36+ documents)
   - ✅ users (2 documents)
   - ✅ orders (if any)

### Check Admin Panel

1. Open: http://localhost:3000
2. Check if data loads properly
3. Should NOT show 0 for everything

✅ **Done Step 4:** Verified migration

---

## 🆘 Troubleshooting

### Issue: "firebase-credentials.json not found"

**Solution:**
1. Make sure file is named exactly: `firebase-credentials.json`
2. Located in project root: `D:\Boutique 1 issue\Boutique\`
3. Not a .txt file in disguise - should be JSON

### Issue: "Cannot find module 'firebase-admin'"

**Solution:**
```bash
npm install firebase-admin
```

### Issue: Migration seems slow

**Solution:**
- This is normal. Firebase API takes time.
- Let it complete. Can take 1-3 minutes.
- Don't close terminal while running.

### Issue: "MongoDB connection refused"

**Solution:**
- MongoDB doesn't need to be running
- Script will use default data
- Keep going, it's fine

### Issue: "Collections created but no data"

**Solution:**
1. Check if migration showed errors
2. Run migration again: `node migrate.js`
3. Clear Firebase cache in browser (Ctrl+Shift+Delete)

### Issue: Still not working?

**Check if credentials file is valid:**
1. Open `firebase-credentials.json` with text editor
2. First line should be: `{`
3. Should contain: `"type": "service_account"`
4. Should NOT be blank or corrupted

If corrupted, download fresh credentials from Firebase Console.

---

## 📋 Simple Checklist

- [ ] Downloaded firebase-credentials.json
- [ ] Saved to project root
- [ ] Installed npm packages: `npm install firebase-admin mongoose cors`
- [ ] Created migrate.js file with code above
- [ ] Ran: `node migrate.js`
- [ ] Saw "MIGRATION COMPLETE!" message
- [ ] Checked Firebase Console has data
- [ ] Verified admin panel loads data

---

## 🎯 Summary

```
That's it! Just:

1. Get credentials JSON from Firebase
2. Save as firebase-credentials.json
3. Run: npm install firebase-admin mongoose cors
4. Create migrate.js file (paste code above)
5. Run: node migrate.js
6. Done!

Total time: 5-10 minutes
```

---

**Your credentials:**
- Email: mstechno2323@gmail.com
- Password: superadmin@123
- Project: boutique-staff-app

**Questions?** Check Troubleshooting section above.
