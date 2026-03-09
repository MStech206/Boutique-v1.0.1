/**
 * MongoDB → Firestore Migration Script
 * Safely migrates collections with sanitization & dry-run support
 * 
 * Usage:
 *   node scripts/migrate-mongo-to-firestore.js --dry-run       # Preview changes
 *   node scripts/migrate-mongo-to-firestore.js --collections=branches,staff  # Specific collections
 *   node scripts/migrate-mongo-to-firestore.js --live          # Actual migration
 */

const path = require('path');
const fs = require('fs');

// Parse CLI args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isLive = args.includes('--live');
const collectionsArg = args.find(a => a.startsWith('--collections='));
const targetCollections = collectionsArg ? collectionsArg.split('=')[1].split(',') : ['branches', 'staff', 'orders'];

console.log(`
🚀 MongoDB → Firestore Migration Tool
${'='.repeat(50)}
Mode: ${isDryRun ? '🔍 DRY-RUN' : isLive ? '⚡ LIVE' : '📋 PREVIEW'}
Target collections: ${targetCollections.join(', ')}
${'='.repeat(50)}
`);

// Load MongoDB
const dbPath = path.join(__dirname, '..', 'database.js');
let mongoDb;
try {
  mongoDb = require(dbPath);
} catch (e) {
  console.error('❌ Failed to load MongoDB:', e.message);
  process.exit(1);
}

const { Branch, Order, Staff } = mongoDb;

// Load Firestore
let firebaseAdmin;
try {
  const admin = require('firebase-admin');
  const adminSdkPath = path.join(__dirname, '..', 'Boutique-app', 'super-admin-backend', 'src', 'main', 'resources', 'firebase', 'super-admin-auth.json');
  
  if (fs.existsSync(adminSdkPath)) {
    const svc = require(adminSdkPath);
    admin.initializeApp({ credential: admin.credential.cert(svc) });
    firebaseAdmin = admin;
    console.log('✅ Firebase Admin initialized\n');
  } else {
    console.error('❌ Firebase service account not found at:', adminSdkPath);
    process.exit(1);
  }
} catch (e) {
  console.error('❌ Firebase initialization failed:', e.message);
  process.exit(1);
}

// Sanitize helper: convert MongoDB objects to Firestore-compatible format
function sanitizeForFirestore(obj) {
  if (obj === null || obj === undefined) return null;
  if (obj instanceof Date) return admin.firestore.Timestamp.fromDate(obj);
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object' && value._id) {
      // Convert MongoDB ObjectId to string
      sanitized[key] = value._id.toString();
    } else if (value instanceof Date) {
      sanitized[key] = admin.firestore.Timestamp.fromDate(value);
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeForFirestore(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

const stats = { total: 0, migrated: 0, failed: 0, skipped: 0 };

(async function migrate() {
  try {
    const db = firebaseAdmin.firestore();

    // Migration plan for each collection
    const migrations = {
      branches: {
        mongoModel: Branch,
        firestoreCollection: 'branches',
        keyField: 'branchId',
      },
      staff: {
        mongoModel: Staff,
        firestoreCollection: 'staff',
        keyField: 'staffId',
      },
      orders: {
        mongoModel: Order,
        firestoreCollection: 'orders',
        keyField: 'orderId',
      },
    };

    // Process each target collection
    for (const collName of targetCollections) {
      const migration = migrations[collName];
      if (!migration) {
        console.warn(`⚠️ Unknown collection: ${collName}`);
        continue;
      }

      console.log(`\n📦 Processing ${collName}...`);

      try {
        // Fetch all MongoDB docs
        const mongoDocs = await migration.mongoModel.find().lean().exec();
        console.log(`   Found ${mongoDocs.length} documents in MongoDB`);

        if (mongoDocs.length === 0) {
          console.log('   ⏭️ Skipping (no documents)');
          stats.skipped += 0;
          continue;
        }

        // Process each doc
        for (const doc of mongoDocs) {
          try {
            const docId = doc[migration.keyField] || doc._id?.toString();
            const sanitized = sanitizeForFirestore(doc);

            console.log(`   - ${docId}: ${JSON.stringify(sanitized).substring(0, 60)}...`);

            if (!isDryRun) {
              // Write to Firestore
              await db.collection(migration.firestoreCollection).doc(docId).set(sanitized, { merge: true });
              console.log(`     ✅ Migrated`);
              stats.migrated++;
            } else {
              console.log(`     🔍 [DRY-RUN] Would migrate`);
            }
            stats.total++;
          } catch (docErr) {
            console.error(`   ❌ Document failed: ${docErr.message}`);
            stats.failed++;
          }
        }
      } catch (colErr) {
        console.error(`❌ Collection migration failed: ${colErr.message}`);
      }
    }

    // Summary
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📊 Migration Summary${isDryRun ? ' [DRY-RUN]' : ''}`);
    console.log(`${'='.repeat(50)}`);
    console.log(`Total documents: ${stats.total}`);
    console.log(`Migrated: ${stats.migrated}`);
    console.log(`Failed: ${stats.failed}`);
    console.log(`Skipped: ${stats.skipped}`);

    if (isDryRun) {
      console.log('\n💡 This was a dry-run. Run with --live to actually migrate:');
      console.log('   node scripts/migrate-mongo-to-firestore.js --live');
    } else if (isLive) {
      console.log('\n✅ Migration complete! Your data is now in Firestore.');
    }

    process.exit(stats.failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  }
})();
