const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const { connectDB, Staff, Branch, Order, User } = require('./database');

// Initialize Firebase Admin
// Support either a service-account JSON path via GOOGLE_APPLICATION_CREDENTIALS or the repo-default path.
const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const defaultPath = path.join(__dirname, 'Boutique-app', 'super-admin-backend', 'src', 'main', 'resources', 'firebase', 'super-admin-auth.json');
const serviceAccountPath = envPath && fs.existsSync(envPath) ? envPath : (fs.existsSync(defaultPath) ? defaultPath : null);

if (!serviceAccountPath) {
  console.error('❌ Firebase service account file not found.');
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service-account JSON path or place the file at:');
  console.error(`  ${defaultPath}`);
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();

async function syncToFirebase() {
  try {
    await connectDB();
    console.log('🔄 Starting Firebase sync...\n');

    // Quick Firestore availability check — provides a clearer error when Firestore is not enabled
    try {
      await db.listCollections();
    } catch (err) {
      if (err && (err.code === 5 || /NOT_FOUND/i.test(err.message || ''))) {
        console.error('\n❌ Firestore appears to be not enabled for the target project or the service account lacks Firestore access.');
        console.error('   - Confirm the service-account JSON (project_id) matches the Firestore project.');
        console.error('   - Enable Firestore in the GCP console: https://console.cloud.google.com/firestore');
        console.error('   - OR run (on a machine with gcloud):');
        console.error("       gcloud firestore databases create --project <PROJECT_ID>");
        console.error('   - Ensure the service-account has roles/firestore.admin or roles/datastore.user.');
        process.exit(2);
      }
      if (err && (err.code === 7 || /permission/i.test(err.message || ''))) {
        console.error('\n❌ Firestore permission error — service account may lack access.');
        console.error('   Grant the service-account the `roles/firestore.admin` role and retry.');
        process.exit(3);
      }
      // rethrow for unexpected errors
      throw err;
    }


    // Sync Branches
    console.log('📍 Syncing Branches...');
    const branches = await Branch.find();
    const uniqueBranches = new Map();
    
    for (const branch of branches) {
      if (!uniqueBranches.has(branch.branchId)) {
        uniqueBranches.set(branch.branchId, branch);
      }
    }

    for (const [branchId, branch] of uniqueBranches) {
      await db.collection('branches').doc(branchId).set({
        branchId: branch.branchId,
        branchName: branch.branchName,
        location: branch.location,
        phone: branch.phone || '',
        email: branch.email || '',
        isActive: branch.isActive !== false,
        createdAt: admin.firestore.Timestamp.fromDate(branch.createdAt || new Date()),
        updatedAt: admin.firestore.Timestamp.fromDate(branch.updatedAt || new Date())
      }, { merge: true });
      console.log(`  ✅ ${branchId} - ${branch.branchName}`);
    }

    // Sync Staff (unique only)
    console.log('\n👥 Syncing Staff...');
    const staff = await Staff.find();
    const uniqueStaff = new Map();
    
    for (const member of staff) {
      if (!uniqueStaff.has(member.staffId)) {
        uniqueStaff.set(member.staffId, member);
      }
    }

    for (const [staffId, member] of uniqueStaff) {
      await db.collection('staff').doc(staffId).set({
        staffId: member.staffId,
        name: member.name,
        phone: member.phone,
        email: member.email || '',
        role: member.role,
        pin: member.pin || '1234',
        branch: member.branch,
        workflowStages: member.workflowStages || [],
        skills: member.skills || [],
        isAvailable: member.isAvailable !== false,
        currentTaskCount: member.currentTaskCount || 0,
        rating: member.rating || 5.0,
        createdAt: admin.firestore.Timestamp.fromDate(member.createdAt || new Date()),
        updatedAt: admin.firestore.Timestamp.fromDate(member.updatedAt || new Date())
      }, { merge: true });
      console.log(`  ✅ ${staffId} - ${member.name} (${member.branch})`);
    }

    // Sync Orders
    console.log('\n📦 Syncing Orders...');
    const orders = await Order.find().limit(100).sort({ createdAt: -1 });
    
    function cleanObject(obj) {
      if (!obj || typeof obj !== 'object') return obj;
      const out = Array.isArray(obj) ? [] : {};
      for (const [k, v] of Object.entries(obj)) {
        if (v === undefined) continue; // skip undefined
        if (v === null) { out[k] = null; continue; }
        if (v instanceof Date) { out[k] = admin.firestore.Timestamp.fromDate(v); continue; }
        if (Array.isArray(v)) { out[k] = v.map(item => cleanObject(item)); continue; }
        if (typeof v === 'object') { out[k] = cleanObject(v); continue; }
        out[k] = v;
      }
      return out;
    }

    for (const order of orders) {
      const workflowTasks = (order.workflowTasks || []).map(task => ({
        stageId: task.stageId,
        stageName: task.stageName,
        stageIcon: task.stageIcon || '',
        status: task.status,
        assignedTo: task.assignedTo ? task.assignedTo.toString() : null,
        assignedToName: task.assignedToName || null,
        startedAt: task.startedAt ? admin.firestore.Timestamp.fromDate(task.startedAt) : null,
        pausedAt: task.pausedAt ? admin.firestore.Timestamp.fromDate(task.pausedAt) : null,
        completedAt: task.completedAt ? admin.firestore.Timestamp.fromDate(task.completedAt) : null,
        notes: task.notes || '',
        qualityRating: task.qualityRating || null,
        timeSpent: task.timeSpent || 0,
        createdAt: task.createdAt ? admin.firestore.Timestamp.fromDate(task.createdAt) : admin.firestore.Timestamp.now(),
        updatedAt: task.updatedAt ? admin.firestore.Timestamp.fromDate(task.updatedAt) : admin.firestore.Timestamp.now()
      }));

      const orderDoc = cleanObject({
        orderId: order.orderId,
        customerName: order.customerName || '',
        customerPhone: order.customerPhone || '',
        customerAddress: order.customerAddress || '',
        garmentType: order.garmentType || '',
        measurements: order.measurements || {},
        totalAmount: order.totalAmount || 0,
        advanceAmount: order.advanceAmount || 0,
        balanceAmount: order.balanceAmount || 0,
        deliveryDate: order.deliveryDate ? admin.firestore.Timestamp.fromDate(order.deliveryDate) : null,
        branch: order.branch || 'SAPTHALA.MAIN',
        status: order.status || 'pending',
        currentStage: order.currentStage || 'dyeing',
        workflowTasks: workflowTasks,
        pdfPath: order.pdfPath || '',
        createdAt: admin.firestore.Timestamp.fromDate(order.createdAt || new Date()),
        updatedAt: admin.firestore.Timestamp.fromDate(order.updatedAt || new Date())
      });

      await db.collection('orders').doc(order.orderId).set(orderDoc, { merge: true });
      console.log(`  ✅ ${order.orderId} - ${order.customerName || '(no customerName)'}`);
    }

    // Sync Users (Admins)
    console.log('\n👤 Syncing Users...');
    const users = await User.find({ role: { $in: ['admin', 'sub-admin'] } });
    
    for (const user of users) {
      // sanitize permissions and any prototype objects
      const permissions = user.permissions && typeof user.permissions.toObject === 'function'
        ? user.permissions.toObject()
        : (user.permissions ? JSON.parse(JSON.stringify(user.permissions)) : {});

      const userDoc = cleanObject({
        username: user.username,
        email: user.email || '',
        role: user.role,
        branch: user.branch || '',
        permissions,
        isActive: user.isActive !== false,
        createdAt: admin.firestore.Timestamp.fromDate(user.createdAt || new Date()),
        lastLogin: user.lastLogin ? admin.firestore.Timestamp.fromDate(user.lastLogin) : null
      });

      await db.collection('users').doc(user._id.toString()).set(userDoc, { merge: true });
      console.log(`  ✅ ${user.username} (${user.role})`);
    }

    console.log('\n✅ Firebase sync completed successfully!');
    console.log(`\nSummary:`);
    console.log(`  Branches: ${uniqueBranches.size}`);
    console.log(`  Staff: ${uniqueStaff.size}`);
    console.log(`  Orders: ${orders.length}`);
    console.log(`  Users: ${users.length}`);

    process.exit(0);
  } catch (error) {
    // Provide actionable diagnostics for common Firestore failures
    if (error && (error.code === 5 || /NOT_FOUND/i.test(error.message || ''))) {
      console.error('\n❌ Firebase sync failed: Firestore not found for the configured project.');
      console.error('   - Check that the service-account JSON (project_id) matches your Firestore project.');
      console.error('   - Enable Firestore in the GCP Console or run `gcloud firestore databases create --project <PROJECT_ID>`');
      console.error('   - If you are using the Firestore emulator for local dev, set the FIRESTORE_EMULATOR_HOST environment variable.');
      process.exit(2);
    }

    if (error && (error.code === 7 || /permission/i.test(error.message || ''))) {
      console.error('\n❌ Firebase sync failed: permission denied.');
      console.error('   - Grant the service-account `roles/firestore.admin` or `roles/datastore.user`.');
      console.error('   - Re-download the service-account JSON and set GOOGLE_APPLICATION_CREDENTIALS accordingly.');
      process.exit(3);
    }

    console.error('❌ Firebase sync error:', error);
    process.exit(1);
  }
}

syncToFirebase();
