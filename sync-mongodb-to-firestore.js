const mongoose = require('mongoose');
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const { connectDB, Order, Customer, Staff, Branch } = require('./database');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, 'Boutique-app', 'super-admin-backend', 'src', 'main', 'resources', 'firebase', 'super-admin-auth.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Firebase service account file not found!');
  console.error(`   Expected at: ${serviceAccountPath}`);
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function syncMongoDBToFirestore() {
  console.log('🔄 SYNCING MONGODB ORDERS TO FIRESTORE\n');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Connect to MongoDB
    console.log('\n📡 Step 1: Connecting to MongoDB...');
    await connectDB();
    
    // Step 2: Get all orders from MongoDB
    console.log('\n📦 Step 2: Fetching orders from MongoDB...');
    const orders = await Order.find().lean();
    console.log(`   Found ${orders.length} orders in MongoDB`);
    
    if (orders.length === 0) {
      console.log('\n⚠️  No orders to sync');
      process.exit(0);
    }
    
    // Step 3: Sync each order to Firestore
    console.log('\n🔄 Step 3: Syncing orders to Firestore...');
    let successCount = 0;
    let errorCount = 0;
    
    for (const order of orders) {
      try {
        // Prepare order data for Firestore (handle undefined values)
        const firestoreOrder = {
          orderId: order.orderId || '',
          customerName: order.customerName || 'Unknown Customer',
          customerPhone: order.customerPhone || '',
          customerAddress: order.customerAddress || '',
          garmentType: order.garmentType || '',
          measurements: order.measurements || {},
          totalAmount: order.totalAmount || 0,
          advanceAmount: order.advanceAmount || 0,
          balanceAmount: order.balanceAmount || 0,
          deliveryDate: order.deliveryDate ? admin.firestore.Timestamp.fromDate(new Date(order.deliveryDate)) : null,
          branch: order.branch || 'SAPTHALA.MAIN',
          status: order.status || 'pending',
          currentStage: order.currentStage || 'dyeing',
          workflowTasks: (order.workflowTasks || []).map(task => ({
            stageId: task.stageId || '',
            stageName: task.stageName || '',
            stageIcon: task.stageIcon || '',
            status: task.status || 'waiting',
            assignedTo: task.assignedTo ? task.assignedTo.toString() : null,
            assignedToName: task.assignedToName || null,
            startedAt: task.startedAt ? admin.firestore.Timestamp.fromDate(new Date(task.startedAt)) : null,
            completedAt: task.completedAt ? admin.firestore.Timestamp.fromDate(new Date(task.completedAt)) : null,
            notes: task.notes || '',
            qualityRating: task.qualityRating || null,
            timeSpent: task.timeSpent || 0,
            createdAt: task.createdAt ? admin.firestore.Timestamp.fromDate(new Date(task.createdAt)) : admin.firestore.Timestamp.now(),
            updatedAt: task.updatedAt ? admin.firestore.Timestamp.fromDate(new Date(task.updatedAt)) : admin.firestore.Timestamp.now()
          })),
          designNotes: order.designNotes || '',
          designImages: order.designImages || [],
          pdfPath: order.pdfPath || null,
          whatsappSent: order.whatsappSent || false,
          createdAt: order.createdAt ? admin.firestore.Timestamp.fromDate(new Date(order.createdAt)) : admin.firestore.Timestamp.now(),
          updatedAt: order.updatedAt ? admin.firestore.Timestamp.fromDate(new Date(order.updatedAt)) : admin.firestore.Timestamp.now(),
          mongoId: order._id.toString()
        };
        
        // Use orderId as document ID in Firestore
        await db.collection('orders').doc(order.orderId).set(firestoreOrder, { merge: true });
        
        successCount++;
        console.log(`   ✅ Synced: ${order.orderId} - ${order.customerName}`);
        
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Failed to sync ${order.orderId}:`, error.message);
      }
    }
    
    // Step 4: Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SYNC SUMMARY');
    console.log('='.repeat(60));
    console.log(`   Total orders in MongoDB: ${orders.length}`);
    console.log(`   Successfully synced: ${successCount}`);
    console.log(`   Failed: ${errorCount}`);
    console.log(`   Success rate: ${Math.round((successCount / orders.length) * 100)}%`);
    
    if (successCount === orders.length) {
      console.log('\n🎉 ALL ORDERS SYNCED SUCCESSFULLY!');
    } else if (successCount > 0) {
      console.log('\n⚠️  PARTIAL SYNC COMPLETED');
    } else {
      console.log('\n❌ SYNC FAILED');
    }
    
    console.log('='.repeat(60) + '\n');
    
    process.exit(errorCount > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('\n❌ SYNC ERROR:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run sync
syncMongoDBToFirestore();
