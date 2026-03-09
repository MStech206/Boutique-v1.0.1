const firebaseIntegrationService = require('../firebase-integration-service');
const { connectDB, Order } = require('../database');

// Usage: node scripts/reconcile-orders-firestore-mongo.js [--fix]
(async function reconcile() {
  const doFix = process.argv.includes('--fix');

  console.log('🔎 Reconcile: Firestore <-> MongoDB orders');

  // Initialize Firebase (best-effort)
  const fbReady = await firebaseIntegrationService.initialize();
  if (!fbReady) {
    console.error('❌ Firebase not initialized. Aborting reconciliation.');
    process.exit(1);
  }

  // Ensure MongoDB connection (best-effort)
  try {
    await connectDB();
  } catch (err) {
    console.warn('⚠️ MongoDB not available — reconciliation will only check Firestore:', err.message);
  }

  // Fetch Firestore orders
  const fbResult = await firebaseIntegrationService.getCollection('orders', { orderBy: { field: 'createdAt', direction: 'desc' }, limit: 10000 });
  if (!fbResult.success) {
    console.error('❌ Failed to read orders from Firestore:', fbResult.error);
    process.exit(1);
  }
  const fbOrders = fbResult.data || [];
  const fbIds = new Set(fbOrders.map(o => String(o.orderId || o.id || '').trim()).filter(Boolean));

  // Fetch MongoDB orders (if available)
  let mongoOrders = [];
  try {
    mongoOrders = await Order.find().select('orderId createdAt').lean();
  } catch (err) {
    console.warn('⚠️ Could not read MongoDB orders:', err.message);
  }
  const mongoIds = new Set((mongoOrders || []).map(o => String(o.orderId || '').trim()).filter(Boolean));

  // Compute diffs
  const onlyInFirestore = [...fbIds].filter(id => !mongoIds.has(id));
  const onlyInMongo = [...mongoIds].filter(id => !fbIds.has(id));

  console.log(`
  ✅ Firestore orders: ${fbIds.size}
  ✅ MongoDB orders:   ${mongoIds.size}
  ➕ Only in Firestore: ${onlyInFirestore.length}
  ➖ Only in MongoDB:   ${onlyInMongo.length}
  `);

  if (onlyInMongo.length === 0 && onlyInFirestore.length === 0) {
    console.log('🎉 No differences detected — Firestore and MongoDB orders are in sync.');
    process.exit(0);
  }

  if (!doFix) {
    console.log('Run with --fix to attempt automatic reconciliation (writes missing documents to Firestore).');
    if (onlyInMongo.length > 0) console.log('Examples (missing in Firestore):', onlyInMongo.slice(0, 10));
    if (onlyInFirestore.length > 0) console.log('Examples (missing in MongoDB):', onlyInFirestore.slice(0, 10));
    process.exit(0);
  }

  // Fix mode: push missing MongoDB orders to Firestore
  console.log('🔧 Fix mode enabled — syncing missing MongoDB orders to Firestore...');
  for (const id of onlyInMongo) {
    try {
      const o = await Order.findOne({ orderId: id }).lean();
      if (!o) continue;
      const syncRes = await firebaseIntegrationService.syncOrder(o);
      if (syncRes.success) {
        console.log(`   ✅ Synced ${id} -> Firestore`);
      } else {
        console.warn(`   ⚠️ Failed to sync ${id}:`, syncRes.error);
      }
    } catch (err) {
      console.error(`   ❌ Error syncing ${id}:`, err.message);
    }
  }

  console.log('🔁 Re-checking differences after fix...');
  // Re-run check quickly
  const fbResult2 = await firebaseIntegrationService.getCollection('orders', { limit: 10000 });
  const fbIds2 = new Set((fbResult2.data || []).map(o => String(o.orderId || o.id || '').trim()).filter(Boolean));
  const onlyInMongo2 = [...mongoIds].filter(id => !fbIds2.has(id));
  console.log(`   Remaining orders missing in Firestore: ${onlyInMongo2.length}`);

  console.log('✅ Reconciliation complete');
  process.exit(0);
})();