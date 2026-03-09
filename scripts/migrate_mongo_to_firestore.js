#!/usr/bin/env node
// scripts/migrate_mongo_to_firestore.js
// Idempotent migration tool: copies Mongo collections to Firestore.
// Usage: node migrate_mongo_to_firestore.js --dry-run --collections=branches,staff

const path = require('path');
const fs = require('fs');
// lightweight arg parsing so the script has no extra dependency
const rawArgs = process.argv.slice(2);
const argv = rawArgs.reduce((acc, cur) => {
  if (!cur) return acc;
  if (cur.startsWith('--')) {
    const [k, v] = cur.replace(/^--/, '').split('=');
    acc[k] = v === undefined ? true : v;
  }
  return acc;
}, {});
const dryRun = !!(argv['dry-run'] || argv['dryrun']);
const collectionsArg = argv.collections || argv.c || 'branches,staff';
const collections = collectionsArg.split(',').map(s=>s.trim()).filter(Boolean);

async function initFirestore() {
  const admin = require('firebase-admin');
  const repoKey = path.join(__dirname, '..', 'Boutique-app', 'super-admin-backend', 'src', 'main', 'resources', 'firebase', 'super-admin-auth.json');
  try {
    // Support emulator mode
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      const proj = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'boutique-staff-app';
      admin.initializeApp({ projectId: proj });
      console.log('⚙️ Using Firestore emulator for migration (FIRESTORE_EMULATOR_HOST detected)');
      return admin.firestore();
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
      admin.initializeApp({ credential: admin.credential.cert(require(process.env.GOOGLE_APPLICATION_CREDENTIALS)) });
    } else if (fs.existsSync(repoKey)) {
      admin.initializeApp({ credential: admin.credential.cert(require(repoKey)) });
    } else {
      throw new Error('Service account JSON not found. Set GOOGLE_APPLICATION_CREDENTIALS or place key at ' + repoKey);
    }
    return admin.firestore();
  } catch (e) {
    throw new Error('Failed to init firestore: ' + (e.message || e));
  }
}

async function initMongo() {
  // Reuse project's database.js which exports connectDB and models
  const dbPath = path.join(__dirname, '..', 'database.js');
  if (!fs.existsSync(dbPath)) throw new Error('database.js not found at ' + dbPath);
  const db = require(dbPath);
  if (typeof db.connectDB === 'function') {
    await db.connectDB();
  }
  return db; // contains models: Branch, Staff, etc.
}

function log(msg) { console.log(msg); }
function warn(msg) { console.warn('WARN:', msg); }

(async function main(){
  try {
    log('Migration script starting');
    log('Options: dryRun=' + dryRun + ', collections=' + collections.join(','));

    const fsDb = await initFirestore();
    log('Connected to Firestore');

    const db = await (async ()=>{
      try {
        return await initMongo();
      } catch (e) {
        warn('Mongo init failed: ' + e.message);
        throw e;
      }
    })();

    // Helper to upsert document in Firestore (idempotent)
    async function upsertCollection(collectionName, id, data) {
      const ref = fsDb.collection(collectionName).doc(id);
      if (dryRun) {
        log(`[dry-run] would upsert ${collectionName}/${id}: ${JSON.stringify(data)} `);
        return { ok: true, dry: true };
      }
      await ref.set(data, { merge: true });
      return { ok: true, dry: false };
    }

    if (collections.includes('branches')) {
      log('Migrating branches...');
      const Branch = db.Branch;
      if (!Branch) throw new Error('Branch model not found in database.js');
      const branches = await Branch.find().lean();
      log(`Found ${branches.length} branches in MongoDB`);
      let i = 0;
      for (const b of branches) {
        const id = (b.branchId || b._id || ('branch_' + (++i))).toString();
        const payload = {
          branchId: b.branchId || id,
          branchName: b.branchName || b.name || '',
          location: b.location || b.address || '',
          phone: b.phone || '',
          email: b.email || '',
          isActive: !!b.isActive,
          createdAt: b.createdAt || new Date()
        };
        try {
          await upsertCollection('branches', id, payload);
          log(`  -> ${id}`);
        } catch (e) {
          warn('Failed to upsert branch ' + id + ': ' + e.message);
        }
      }
      log('Branches migration step complete');
    }

    if (collections.includes('staff')) {
      log('Migrating staff...');
      const Staff = db.Staff;
      if (!Staff) throw new Error('Staff model not found in database.js');
      const staffList = await Staff.find().lean();
      log(`Found ${staffList.length} staff records in MongoDB`);
      for (const s of staffList) {
        const id = (s.staffId || s._id).toString();
        const payload = {
          staffId: s.staffId || id,
          name: s.name || '',
          phone: s.phone || '',
          email: s.email || '',
          role: s.role || '',
          branch: s.branch || null,
          workflowStages: s.workflowStages || [],
          isAvailable: !!s.isAvailable,
          createdAt: s.createdAt || new Date()
        };
        try {
          await upsertCollection('staff', id, payload);
          log(`  -> ${id}`);
        } catch (e) {
          warn('Failed to upsert staff ' + id + ': ' + e.message);
        }
      }
      log('Staff migration step complete');
    }

    // Orders migration (preserve workflowTasks and nested arrays)
    if (collections.includes('orders')) {
      log('Migrating orders...');
      const Order = db.Order;
      if (!Order) throw new Error('Order model not found in database.js');
      const orders = await Order.find().lean();
      log(`Found ${orders.length} orders in MongoDB`);
      for (const o of orders) {
        const id = (o.orderId || o._id).toString();
        const payload = {
          orderId: o.orderId || id,
          customerName: o.customerName || (o.customer && o.customer.name) || '',
          customerPhone: o.customerPhone || (o.customer && (o.customer.phone || o.customer.whatsapp)) || '',
          customerAddress: o.customerAddress || (o.customer && o.customer.address) || '',
          garmentType: o.garmentType || o.category || '',
          measurements: o.measurements || {},
          totalAmount: o.totalAmount || (o.pricing && o.pricing.total) || 0,
          advanceAmount: o.advanceAmount || (o.pricing && o.pricing.advance) || 0,
          balanceAmount: (o.totalAmount || 0) - (o.advanceAmount || 0),
          deliveryDate: o.deliveryDate || null,
          branch: o.branch || 'SAPTHALA.MAIN',
          status: o.status || 'pending',
          workflowTasks: o.workflowTasks || [],
          designNotes: o.designNotes || o.designDescription || '',
          designImages: o.designImages || [],
          pdfPath: o.pdfPath || '',
          createdAt: o.createdAt || new Date()
        };
        try {
          await upsertCollection('orders', id, payload);
          log(`  -> ${id}`);
        } catch (e) {
          warn('Failed to upsert order ' + id + ': ' + e.message);
        }
      }
      log('Orders migration step complete');
    }

    // Users migration
    if (collections.includes('users')) {
      log('Migrating users...');
      const User = db.User;
      if (!User) throw new Error('User model not found in database.js');
      const users = await User.find().lean();
      log(`Found ${users.length} users in MongoDB`);
      for (const u of users) {
        const id = (u.username || u._id).toString();
        const payload = {
          username: u.username || id,
          email: u.email || '',
          role: u.role || 'customer',
          branch: u.branch || '',
          permissions: u.permissions || {},
          isActive: u.isActive !== undefined ? !!u.isActive : true,
          createdAt: u.createdAt || new Date()
        };
        try {
          await upsertCollection('users', id, payload);
          log(`  -> ${id}`);
        } catch (e) {
          warn('Failed to upsert user ' + id + ': ' + e.message);
        }
      }
      log('Users migration step complete');
    }

    log('Migration finished');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err && err.message ? err.message : err);
    process.exit(2);
  }
})();
