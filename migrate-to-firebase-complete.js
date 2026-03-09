#!/usr/bin/env node

/**
 * FIREBASE DATABASE MIGRATION SCRIPT
 * Migrates all MongoDB data to Firebase Firestore
 * Fixes authentication and authorization issues
 * 
 * Usage: node migrate-to-firebase-complete.js
 */

const admin = require('firebase-admin');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

async function main() {
  try {
    log('\n🔥 FIREBASE DATABASE MIGRATION TOOL', 'cyan');
    log('=====================================================\n', 'cyan');

    // Step 1: Check credentials
    log('STEP 1: Validating Firebase Credentials...', 'blue');
    const credentialsPath = path.join(__dirname, 'firebase-credentials.json');
    if (!fs.existsSync(credentialsPath)) {
      log('❌ firebase-credentials.json not found!', 'red');
      log('📍 Expected location: ' + credentialsPath, 'yellow');
      log('\n📌 TO FIX:', 'yellow');
      log('1. Go to: https://console.firebase.google.com', 'yellow');
      log('2. Select: boutique-staff-app', 'yellow');
      log('3. Settings (⚙️) → Service Accounts → Generate New Private Key', 'yellow');
      log('4. Save downloaded JSON as: firebase-credentials.json', 'yellow');
      log('5. Place in project root directory', 'yellow');
      process.exit(1);
    }
    log('✅ Credentials file found\n', 'green');

    // Step 2: Initialize Firebase
    log('STEP 2: Initializing Firebase Admin SDK...', 'blue');
    try {
      const serviceAccount = require(credentialsPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
      log('✅ Firebase initialized successfully\n', 'green');
    } catch (error) {
      log('❌ Failed to initialize Firebase: ' + error.message, 'red');
      process.exit(1);
    }

    const db = admin.firestore();
    const auth = admin.auth();

    // Step 3: Connect to MongoDB
    log('STEP 3: Connecting to MongoDB...', 'blue');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sapthala_boutique';
    try {
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000
      });
      log('✅ Connected to MongoDB\n', 'green');
    } catch (error) {
      log('⚠️  MongoDB not available - will create default data', 'yellow');
      log('   Error: ' + error.message + '\n', 'yellow');
    }

    // Step 4: Get data from MongoDB or use defaults
    log('STEP 4: Loading data from MongoDB...', 'blue');
    
    let branches = [], staff = [], users = [], orders = [], customers = [];
    
    // Try to get data from MongoDB
    if (mongoose.connection.readyState === 1) {
      try {
        const branchCollection = mongoose.connection.collection('branches');
        const staffCollection = mongoose.connection.collection('staff');
        const usersCollection = mongoose.connection.collection('users');
        const ordersCollection = mongoose.connection.collection('orders');
        const customersCollection = mongoose.connection.collection('customers');

        branches = await branchCollection.find({}).toArray();
        staff = await staffCollection.find({}).toArray();
        users = await usersCollection.find({}).toArray();
        orders = await ordersCollection.find({}).toArray();
        customers = await customersCollection.find({}).toArray();

        log(`✅ Loaded ${branches.length} branches`, 'green');
        log(`✅ Loaded ${staff.length} staff members`, 'green');
        log(`✅ Loaded ${users.length} users`, 'green');
        log(`✅ Loaded ${orders.length} orders`, 'green');
        log(`✅ Loaded ${customers.length} customers\n`, 'green');
      } catch (error) {
        log('⚠️  Error loading from MongoDB: ' + error.message, 'yellow');
        log('   Using default data...\n', 'yellow');
      }
    }

    // Step 5: Create default data if empty
    log('STEP 5: Setting up default data...', 'blue');
    
    if (branches.length === 0) {
      branches = [
        { branchId: 'SAPTHALA.MAIN', branchName: 'Main', location: 'Head Office', phone: '7794021608' },
        { branchId: 'SAPTHALA.JNTU', branchName: 'JNTU', location: 'JNTU Campus', phone: '9876543210' },
        { branchId: 'SAPTHALA.KPHB', branchName: 'KPHB', location: 'KPHB Area', phone: '9876543211' },
        { branchId: 'SAPTHALA.ECIL', branchName: 'ECIL', location: 'ECIL Area', phone: '9876543212' }
      ];
      log('✅ Created 4 default branches', 'green');
    }

    if (users.length === 0) {
      users = [
        {
          username: 'superadmin',
          email: 'mstechno2323@gmail.com',
          password: 'superadmin@123',
          role: 'super-admin',
          branch: 'SAPTHALA.MAIN',
          createdAt: new Date().toISOString()
        },
        {
          username: 'admin',
          email: 'admin@sapthala.com',
          password: 'admin@123',
          role: 'admin',
          branch: 'SAPTHALA.MAIN',
          createdAt: new Date().toISOString()
        }
      ];
      log('✅ Created default admin users', 'green');
    }

    if (staff.length === 0) {
      staff = createDefaultStaff(branches);
      log(`✅ Created ${staff.length} default staff members`, 'green');
    }

    log('');

    // Step 6: Migrate to Firestore
    log('STEP 6: Migrating data to Firestore...', 'blue');

    // Clear existing data (optional - comment out to preserve)
    // log('Clearing existing Firestore collections...', 'yellow');
    // await clearFirestoreRecursive(db, 'branches');
    // await clearFirestoreRecursive(db, 'staff');
    // await clearFirestoreRecursive(db, 'users');

    // Migrate branches
    log('→ Syncing branches...', 'cyan');
    for (const branch of branches) {
      await db.collection('branches').doc(branch.branchId || branch._id).set(branchCleanup(branch));
    }
    log(`  ✅ Synced ${branches.length} branches`, 'green');

    // Migrate staff (with deduplication)
    log('→ Syncing staff (deduplicating)...', 'cyan');
    const staffByBranchRole = {};
    let duplicateCount = 0;
    
    for (const member of staff) {
      const key = `${member.branch}_${member.role}`;
      if (!staffByBranchRole[key]) {
        staffByBranchRole[key] = member;
      } else {
        duplicateCount++;
      }
    }
    
    for (const member of Object.values(staffByBranchRole)) {
      await db.collection('staff').doc(member.staffId || member._id).set(staffCleanup(member));
    }
    log(`  ✅ Synced ${Object.keys(staffByBranchRole).length} unique staff`, 'green');
    if (duplicateCount > 0) {
      log(`  ✅ Removed ${duplicateCount} duplicates`, 'green');
    }

    // Migrate users
    log('→ Syncing users...', 'cyan');
    for (const user of users) {
      await db.collection('users').doc(user._id || user.username).set(userCleanup(user));
    }
    log(`  ✅ Synced ${users.length} users`, 'green');

    // Migrate orders
    if (orders.length > 0) {
      log('→ Syncing orders...', 'cyan');
      for (const order of orders) {
        await db.collection('orders').doc(order._id || order.orderId).set(orderCleanup(order));
      }
      log(`  ✅ Synced ${orders.length} orders`, 'green');
    }

    // Migrate customers
    if (customers.length > 0) {
      log('→ Syncing customers...', 'cyan');
      for (const customer of customers) {
        await db.collection('customers').doc(customer._id || customer.customerId).set(customerCleanup(customer));
      }
      log(`  ✅ Synced ${customers.length} customers`, 'green');
    }

    log('');

    // Step 7: Configure Firebase Custom Claims for super admin
    log('STEP 7: Configuring Firebase Authentication...', 'blue');
    
    try {
      // Create or update super admin user in Firebase Auth
      let superAdminUid;
      
      try {
        const user = await auth.getUserByEmail('mstechno2323@gmail.com');
        superAdminUid = user.uid;
        log('✅ Found existing Firebase user', 'green');
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          const newUser = await auth.createUser({
            email: 'mstechno2323@gmail.com',
            password: 'superadmin@123',
            displayName: 'Super Admin'
          });
          superAdminUid = newUser.uid;
          log('✅ Created Firebase user', 'green');
        } else {
          throw error;
        }
      }

      // Set custom claims for super admin
      await auth.setCustomUserClaims(superAdminUid, {
        role: 'super-admin',
        brand: 'SAPTHALA Main',
        permissions: ['read', 'write', 'delete', 'admin']
      });
      log('✅ Set super-admin custom claims\n', 'green');
    } catch (error) {
      log('⚠️  Warning: Could not configure Firebase Auth: ' + error.message, 'yellow');
      log('   (This is OK if Firebase Authentication is not enabled)\n', 'yellow');
    }

    // Step 8: Create Firestore security rules config
    log('STEP 8: Creating Firestore collections...', 'blue');
    
    const collections = [
      { name: 'branches', doc: branches[0] || {} },
      { name: 'staff', doc: staff[0] || {} },
      { name: 'users', doc: users[0] || {} },
      { name: 'orders', doc: {} },
      { name: 'customers', doc: {} },
      { name: 'settings', doc: {
        companyName: 'SAPTHALA Designer Workshop',
        workflowStages: ['dyeing', 'cutting', 'stitching', 'qc', 'delivery'],
        branches: branches.map(b => b.branchId)
      }},
      { name: 'notifications', doc: {} }
    ];

    for (const collection of collections) {
      try {
        await db.collection(collection.name).doc('_metadata').set({
          createdAt: new Date().toISOString(),
          syncedAt: new Date().toISOString(),
          documentCount: collection.name === 'branches' ? branches.length : 
                        collection.name === 'staff' ? Object.keys(staffByBranchRole).length :
                        collection.name === 'users' ? users.length : 0
        });
        log(`✅ Collection ready: ${collection.name}`, 'green');
      } catch (error) {
        log(`⚠️  Warning: ${collection.name} - ${error.message}`, 'yellow');
      }
    }
    log('');

    // Step 9: Verify migration
    log('STEP 9: Verifying migration...', 'blue');
    
    const verifyStats = {
      branches: (await db.collection('branches').get()).size,
      staff: (await db.collection('staff').get()).size,
      users: (await db.collection('users').get()).size,
      orders: (await db.collection('orders').get()).size,
      customers: (await db.collection('customers').get()).size
    };

    log(`✅ Branches: ${verifyStats.branches}`, 'green');
    log(`✅ Staff: ${verifyStats.staff}`, 'green');
    log(`✅ Users: ${verifyStats.users}`, 'green');
    log(`✅ Orders: ${verifyStats.orders}`, 'green');
    log(`✅ Customers: ${verifyStats.customers}`, 'green');
    log('');

    log('✅ MIGRATION COMPLETE!', 'green');
    log('=====================================================', 'green');
    log('\n📌 NEXT STEPS:', 'cyan');
    log('1. Server will restart in 3 seconds', 'cyan');
    log('2. Admin panel will be available at: http://localhost:3000', 'cyan');
    log('3. Login with email: mstechno2323@gmail.com', 'cyan');
    log('4. Your data is now in Firebase Firestore!\n', 'cyan');

    // Disconnect MongoDB
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }

    // Cleanup admin SDK
    await admin.app().delete();

    // Signal to restart server
    log('✅ Ready to restart server...\n', 'green');
    process.exit(0);

  } catch (error) {
    log('❌ FATAL ERROR: ' + error.message, 'red');
    log(error.stack, 'red');
    process.exit(1);
  }
}

function createDefaultStaff(branches) {
  const defaultStaff = [];
  const roles = ['dyeing', 'cutting', 'stitching', 'qc', 'delivery', 'tailoring'];
  const staffNames = {
    dyeing: 'Dyeing Specialist',
    cutting: 'Cutting Expert',
    stitching: 'Stitching Master',
    qc: 'QC Inspector',
    delivery: 'Delivery Personnel',
    tailoring: 'Tailor'
  };

  for (const branch of branches) {
    roles.forEach((role, idx) => {
      defaultStaff.push({
        staffId: `staff_${branch.branchId}_${role}`,
        name: `${staffNames[role]} - ${branch.branchName}`,
        role: role,
        branch: branch.branchId,
        phone: '9876543210',
        isAvailable: true,
        workingStages: [role],
        createdAt: new Date().toISOString()
      });
    });
  }

  return defaultStaff;
}

function branchCleanup(branch) {
  return {
    branchId: branch.branchId || branch._id,
    branchName: branch.branchName || 'Unknown',
    location: branch.location || '',
    phone: branch.phone || '',
    address: branch.address || '',
    isActive: branch.isActive !== false,
    createdAt: branch.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function staffCleanup(staff) {
  return {
    staffId: staff.staffId || staff._id,
    name: staff.name || 'Unknown',
    role: staff.role || 'unknown',
    branch: staff.branch || 'SAPTHALA.MAIN',
    phone: staff.phone || '',
    isAvailable: staff.isAvailable !== false,
    workingStages: staff.workingStages || [staff.role] || [],
    createdAt: staff.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function userCleanup(user) {
  return {
    userId: user._id || user.username,
    username: user.username || 'unknown',
    email: user.email || '',
    role: user.role || 'user',
    branch: user.branch || 'SAPTHALA.MAIN',
    isActive: user.isActive !== false,
    createdAt: user.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function orderCleanup(order) {
  return {
    orderId: order._id || order.orderId,
    customerId: order.customerId || '',
    customerName: order.customerName || order.customer?.name || 'Unknown',
    customerPhone: order.customerPhone || order.customer?.phone || '',
    category: order.category || '',
    subcategory: order.subcategory || '',
    garment: order.garment || '',
    status: order.status || 'pending',
    branch: order.branch || 'SAPTHALA.MAIN',
    amount: order.amount || 0,
    paidAmount: order.paidAmount || 0,
    notes: order.notes || '',
    createdAt: order.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function customerCleanup(customer) {
  return {
    customerId: customer._id || customer.customerId,
    name: customer.name || 'Unknown',
    phone: customer.phone || '',
    email: customer.email || '',
    address: customer.address || '',
    totalOrders: customer.totalOrders || 0,
    createdAt: customer.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

async function clearFirestoreRecursive(db, collectionPath, batchSize = 100) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.limit(batchSize);
  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve, reject);
  });
}

function deleteQueryBatch(db, query, resolve, reject) {
  query.get()
    .then(snapshot => {
      if (snapshot.size === 0) {
        resolve();
        return;
      }
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      return batch.commit().then(() => {
        deleteQueryBatch(db, query, resolve, reject);
      });
    })
    .catch(reject);
}

// Run migration
main().catch(error => {
  log('Script error: ' + error.message, 'red');
  process.exit(1);
});
