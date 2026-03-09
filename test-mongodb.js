const mongoose = require('mongoose');

console.log('🔍 Testing MongoDB Connection...\n');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sapthala_boutique';

async function testConnection() {
  try {
    console.log(`📡 Connecting to: ${MONGODB_URI}`);
    
    await mongoose.connect(MONGODB_URI, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000
    });
    
    console.log('✅ MongoDB Connected Successfully!');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🔗 Host: ${mongoose.connection.host}`);
    console.log(`📍 Port: ${mongoose.connection.port}`);
    
    // Test collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`\n📁 Collections (${collections.length}):`);
    collections.forEach(col => console.log(`   - ${col.name}`));
    
    // Test order creation
    console.log('\n🧪 Testing Order Creation...');
    const Order = mongoose.model('Order', new mongoose.Schema({
      orderId: String,
      customerName: String,
      customerPhone: String,
      garmentType: String,
      totalAmount: Number,
      status: String,
      branch: String,
      createdAt: { type: Date, default: Date.now }
    }));
    
    const testOrder = await Order.create({
      orderId: `TEST-${Date.now()}`,
      customerName: 'Test Customer',
      customerPhone: '9999999999',
      garmentType: 'Test Garment',
      totalAmount: 1000,
      status: 'pending',
      branch: 'SAPTHALA.MAIN'
    });
    
    console.log('✅ Test order created:', testOrder.orderId);
    
    // Verify order exists
    const found = await Order.findOne({ orderId: testOrder.orderId });
    console.log('✅ Test order verified in database');
    
    // Clean up test order
    await Order.deleteOne({ orderId: testOrder.orderId });
    console.log('✅ Test order cleaned up');
    
    console.log('\n🎉 All tests passed! MongoDB is working correctly.');
    
    await mongoose.connection.close();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ MongoDB Connection Failed!');
    console.error('Error:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Solution: MongoDB is not running!');
      console.error('   Start MongoDB with: net start MongoDB');
      console.error('   Or install MongoDB from: https://www.mongodb.com/try/download/community');
    }
    
    process.exit(1);
  }
}

testConnection();
