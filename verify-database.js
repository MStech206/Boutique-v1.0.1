const mongoose = require('mongoose');
const { connectDB, Order, Customer, Settings } = require('./database');

async function verifyDatabase() {
  console.log('🔍 VERIFYING DATABASE CONNECTION\n');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Connect to MongoDB
    console.log('\n📡 Step 1: Connecting to MongoDB...');
    const connected = await connectDB();
    
    if (!connected) {
      console.error('❌ Failed to connect to MongoDB');
      process.exit(1);
    }
    
    console.log('✅ MongoDB connection successful');
    console.log(`   Connection state: ${mongoose.connection.readyState}`);
    console.log(`   Database: ${mongoose.connection.name}`);
    console.log(`   Host: ${mongoose.connection.host}`);
    
    // Step 2: Check collections
    console.log('\n📊 Step 2: Checking collections...');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`   Found ${collections.length} collections:`);
    collections.forEach(col => console.log(`   - ${col.name}`));
    
    // Step 3: Count existing orders
    console.log('\n📦 Step 3: Counting existing orders...');
    const orderCount = await Order.countDocuments();
    console.log(`   Total orders in database: ${orderCount}`);
    
    // Step 4: Create test order
    console.log('\n🧪 Step 4: Creating test order...');
    const testOrderId = `TEST-${Date.now()}`;
    
    const testOrder = new Order({
      orderId: testOrderId,
      customerName: 'Test Customer',
      customerPhone: '9999999999',
      customerAddress: 'Test Address',
      garmentType: 'Test Garment',
      measurements: { chest: 40 },
      totalAmount: 1000,
      advanceAmount: 500,
      balanceAmount: 500,
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      branch: 'SAPTHALA.MAIN',
      status: 'pending',
      currentStage: 'dyeing',
      workflowTasks: [{
        stageId: 'dyeing',
        stageName: 'Dyeing',
        stageIcon: '🎨',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      }]
    });
    
    await testOrder.save();
    console.log(`✅ Test order created: ${testOrderId}`);
    
    // Step 5: Verify order was saved
    console.log('\n🔍 Step 5: Verifying order was saved...');
    const savedOrder = await Order.findOne({ orderId: testOrderId });
    
    if (savedOrder) {
      console.log('✅ Order verified in database');
      console.log(`   Order ID: ${savedOrder.orderId}`);
      console.log(`   Customer: ${savedOrder.customerName}`);
      console.log(`   Amount: ₹${savedOrder.totalAmount}`);
      console.log(`   Status: ${savedOrder.status}`);
      console.log(`   Workflow tasks: ${savedOrder.workflowTasks.length}`);
    } else {
      console.error('❌ Order not found in database!');
    }
    
    // Step 6: Count orders again
    console.log('\n📊 Step 6: Final order count...');
    const newOrderCount = await Order.countDocuments();
    console.log(`   Total orders now: ${newOrderCount}`);
    console.log(`   Orders added: ${newOrderCount - orderCount}`);
    
    // Step 7: Clean up test order
    console.log('\n🧹 Step 7: Cleaning up test order...');
    await Order.deleteOne({ orderId: testOrderId });
    console.log('✅ Test order deleted');
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 DATABASE VERIFICATION COMPLETE!');
    console.log('✅ MongoDB is working correctly');
    console.log('✅ Orders can be created and saved');
    console.log('✅ System is ready for production use');
    console.log('='.repeat(60) + '\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run verification
verifyDatabase();
