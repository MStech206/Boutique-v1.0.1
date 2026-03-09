# 📄 migrate.js - COPY THIS CODE

## How to Use This File

1. Create new file: `migrate.js`
2. Location: `D:\Boutique 1 issue\Boutique\migrate.js`
3. Copy the code below into it
4. Save it
5. Run: `node migrate.js`

---

## COPY FROM HERE ⬇️

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

## COPY UP TO HERE ⬆️

---

## How to Save

1. Open text editor (Notepad, VS Code, etc.)
2. Paste the code above
3. Save as: `migrate.js`
4. Location: `D:\Boutique 1 issue\Boutique\`
5. Make sure file extension is `.js` (not `.txt`)

---

## Then Run

In terminal, in your project folder:

```bash
node migrate.js
```

That's it!
